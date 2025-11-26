const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const requestTimestamps = new Map();

const storageDir = path.join(__dirname, "storage");
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const unusedIdsPath = path.join(storageDir, "unused_ids.json");

function getUnusedId() {
  if (fs.existsSync(unusedIdsPath)) {
    try {
      const content = fs.readFileSync(unusedIdsPath, "utf8");
      const ids = JSON.parse(content);
      if (Array.isArray(ids) && ids.length > 0) {
        const id = ids.shift(); // Use the first one
        fs.writeFileSync(unusedIdsPath, JSON.stringify(ids), "utf8");
        return id;
      }
    } catch (e) {
      console.error("Failed to read unused IDs", e);
    }
  }
  return null;
}

function recycleId(id) {
  let ids = [];
  if (fs.existsSync(unusedIdsPath)) {
    try {
      const content = fs.readFileSync(unusedIdsPath, "utf8");
      ids = JSON.parse(content);
      if (!Array.isArray(ids)) ids = [];
    } catch (e) {
      ids = [];
    }
  }
  ids.push(id);
  try {
    fs.writeFileSync(unusedIdsPath, JSON.stringify(ids), "utf8");
  } catch (e) {
    console.error("Failed to save unused ID", e);
  }
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function sha256Hex(str) {
  return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

function generateUid() {
  const files = fs.readdirSync(storageDir).filter(f => f !== "unused_ids.json");
  const uidNum = files.length;
  const binaryUid = uidNum.toString(2).padStart(48, '0');
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
  let uid = '';
  for (let i = 0; i < 48; i += 6) {
    const chunk = binaryUid.substring(i, i + 6);
    const charIndex = parseInt(chunk, 2);
    uid += chars[charIndex];
  }
  const uidArray = uid.split('');
  return uidArray.join('');
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (req.method === "POST" && pathname === "/api/clipboards") {
    try {
      const raw = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(raw || "{}");
      } catch (_) {
        return sendJson(res, 400, { error: "Invalid JSON" });
      }
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      const now = Date.now();
      const lastRequestTime = requestTimestamps.get(ip);

      if (lastRequestTime && now - lastRequestTime < 60000) {
        return sendJson(res, 429, { error: "Too many requests. Please wait a minute." });
      }

      const { content, password, access } = payload;
      if (!content || content.length < 20 || content.length > 100000) {
        return sendJson(res, 400, { error: "Content length must be between 20 and 100000 characters" });
      }

      requestTimestamps.set(ip, now);

      const uid = getUnusedId() || generateUid();
      const filePath = path.join(storageDir, `${uid}.json`);

      const data = {
        content,
        pwd: password ? sha256Hex(password) : "",
        access: access ? sha256Hex(access) : "",
      };

      try {
        fs.writeFileSync(filePath, JSON.stringify(data), { encoding: "utf8" });
        return sendJson(res, 200, { hash: uid });
      } catch (e) {
        return sendJson(res, 500, { error: "Store failed" });
      }
    } catch (e) {
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  if (req.method === "POST" && pathname === "/api/clipboards/edit") {
    try {
      const raw = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(raw || "{}");
      } catch (_) {
        return sendJson(res, 400, { error: "Invalid JSON" });
      }
      const { hash, access } = payload;
      if (!hash || !/^[a-zA-Z0-9-_]{8}$/.test(hash)) {
        return sendJson(res, 400, { error: "Invalid hash" });
      }

      const filePath = path.join(storageDir, `${hash}.json`);
      if (!fs.existsSync(filePath)) {
        return sendJson(res, 404, { error: "Not found" });
      }

      try {
        const fileContent = fs.readFileSync(filePath, "utf8");
        const data = JSON.parse(fileContent);

        if (data.access && data.access === sha256Hex(access)) {
          return sendJson(res, 200, 1); // Success
        } else {
          return sendJson(res, 200, 0); // Incorrect access password
        }
      } catch (e) {
        return sendJson(res, 500, { error: "Edit failed" });
      }
    } catch (e) {
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  if (req.method === "POST" && pathname === "/api/clipboards/save") {
    try {
      const raw = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(raw || "{}");
      } catch (_) {
        return sendJson(res, 400, { error: "Invalid JSON" });
      }
      const { hash, content, access } = payload;
      if (!hash || !/^[a-zA-Z0-9-_]{8}$/.test(hash)) {
        return sendJson(res, 400, { error: "Invalid hash" });
      }

      const filePath = path.join(storageDir, `${hash}.json`);
      if (!fs.existsSync(filePath)) {
        return sendJson(res, 404, { error: "Not found" });
      }

      try {
        const fileContent = fs.readFileSync(filePath, "utf8");
        const data = JSON.parse(fileContent);

        if (data.access && data.access === sha256Hex(access)) {
          data.content = content;
          fs.writeFileSync(filePath, JSON.stringify(data), { encoding: "utf8" });
          return sendJson(res, 200, 1); // Success
        } else {
          return sendJson(res, 200, 0); // Incorrect access password
        }
      } catch (e) {
        return sendJson(res, 500, { error: "Save failed" });
      }
    } catch (e) {
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  if (req.method === "POST" && pathname === "/api/clipboards/delete") {
    try {
      const raw = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(raw || "{}");
      } catch (_) {
        return sendJson(res, 400, { error: "Invalid JSON" });
      }
      const { hash, access } = payload;
      if (!hash || !/^[a-zA-Z0-9-_]{8}$/.test(hash)) {
        return sendJson(res, 400, { error: "Invalid hash" });
      }

      const filePath = path.join(storageDir, `${hash}.json`);
      if (!fs.existsSync(filePath)) {
        return sendJson(res, 404, { error: "Not found" });
      }

      try {
        const fileContent = fs.readFileSync(filePath, "utf8");
        const data = JSON.parse(fileContent);

        if (data.access && data.access === sha256Hex(access)) {
          fs.unlinkSync(filePath);
          recycleId(hash);
          return sendJson(res, 200, 1); // Success
        } else {
          return sendJson(res, 200, 0); // Incorrect access password
        }
      } catch (e) {
        return sendJson(res, 500, { error: "Delete failed" });
      }
    } catch (e) {
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  if (req.method === "POST" && pathname === "/api/clipboards/view") {
    try {
      const raw = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(raw || "{}");
      } catch (_) {
        return sendJson(res, 400, { error: "Invalid JSON" });
      }
      const { hash, password } = payload;
      if (!hash || !/^[a-zA-Z0-9-_]{8}$/.test(hash)) {
        return sendJson(res, 400, { error: "Invalid hash" });
      }

      const filePath = path.join(storageDir, `${hash}.json`);
      if (!fs.existsSync(filePath)) {
        return sendJson(res, 404, { error: "Not found" });
      }

      try {
        const fileContent = fs.readFileSync(filePath, "utf8");
        const data = JSON.parse(fileContent);

        if (data.pwd) {
          if (!password || data.pwd !== sha256Hex(password)) {
            return sendJson(res, 200, -1); // Password required or incorrect
          }
        }

        return sendJson(res, 200, { content: data.content });
      } catch (e) {
        return sendJson(res, 500, { error: "Read failed" });
      }
    } catch (e) {
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  if (req.method === "GET" && pathname.startsWith("/api/clipboards/")) {
    const uid = pathname.split("/").pop();
    if (!uid || !/^[a-zA-Z0-9-_]{8}$/.test(uid)) {
      return sendJson(res, 400, { error: "Invalid hash" });
    }
    const filePath = path.join(storageDir, `${uid}.json`);
    if (!fs.existsSync(filePath)) {
      return sendJson(res, 404, { error: "Not found" });
    }
    try {
      const fileContent = fs.readFileSync(filePath, "utf8");
      const data = JSON.parse(fileContent);
      return sendJson(res, 200, { content: data.content });
    } catch (e) {
      return sendJson(res, 500, { error: "Read failed" });
    }
  }

  if (req.method === "GET" && pathname === "/api/stats") {
    try {
      const files = fs.readdirSync(storageDir).filter(f => f !== "unused_ids.json");
      return sendJson(res, 200, { count: files.length });
    } catch (e) {
      return sendJson(res, 500, { error: "Stats failed" });
    }
  }

  if (req.method === "GET" && pathname === "/") {
    return sendJson(res, 200, { ok: true });
  }

  res.writeHead(404, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify({ error: "Route not found" }));
});

server.listen(8080, () => {
  console.log("API server http://localhost:8080");
});
