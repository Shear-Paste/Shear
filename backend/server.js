const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const storageDir = path.join(__dirname, "storage");
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
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
      const content = typeof payload.content === "string" ? payload.content : null;
      const password = typeof payload.password === "string" ? payload.password : "";
      if (!content) {
        return sendJson(res, 400, { error: "Missing content" });
      }

      const textHash = sha256Hex(content);
      const existingPlainPath = path.join(storageDir, `${textHash}.md`);
      const existingMarkerPath = path.join(storageDir, `${textHash}.json`);
      if (fs.existsSync(existingPlainPath) || fs.existsSync(existingMarkerPath)) {
        return sendJson(res, 200, -1);
      }
      const trimmedPwd = password.trim();
      let storageHash = textHash;
      let filePath;
      if (trimmedPwd.length > 0) {
        storageHash = sha256Hex(textHash + trimmedPwd);
        filePath = path.join(storageDir, `${storageHash}.md`);
        try {
          fs.writeFileSync(filePath, content, { encoding: "utf8" });
        } catch (e) {
          return sendJson(res, 500, { error: "Store failed" });
        }
        const markerPath = path.join(storageDir, `${textHash}.json`);
        try {
          fs.writeFileSync(markerPath, JSON.stringify({ protected: true }), { encoding: "utf8" });
        } catch (e) {
          // If marker write fails, rollback content write to avoid orphaned secret content
          try { fs.unlinkSync(filePath); } catch (_) {}
          return sendJson(res, 500, { error: "Store failed" });
        }
      } else {
        filePath = path.join(storageDir, `${storageHash}.md`);
        try {
          fs.writeFileSync(filePath, content, { encoding: "utf8" });
        } catch (e) {
          return sendJson(res, 500, { error: "Store failed" });
        }
      }
      return sendJson(res, 200, { hash: textHash });
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
      const hash = typeof payload.hash === "string" ? payload.hash : "";
      const password = typeof payload.password === "string" ? payload.password : "";
      if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
        return sendJson(res, 400, { error: "Invalid hash" });
      }
      const plainPath = path.join(storageDir, `${hash}.md`);
      if (fs.existsSync(plainPath)) {
        try {
          const content = fs.readFileSync(plainPath, "utf8");
          return sendJson(res, 200, content);
        } catch (e) {
          return sendJson(res, 500, { error: "Read failed" });
        }
      }
      const markerPath = path.join(storageDir, `${hash}.json`);
      if (fs.existsSync(markerPath)) {
        const composite = sha256Hex(hash + (password || ""));
        const compositePath = path.join(storageDir, `${composite}.md`);
        if (!fs.existsSync(compositePath)) {
          return sendJson(res, 200, -1);
        }
        try {
          const content = fs.readFileSync(compositePath, "utf8");
          return sendJson(res, 200, content);
        } catch (e) {
          return sendJson(res, 500, { error: "Read failed" });
        }
      }
      return sendJson(res, 404, { error: "Not found" });
    } catch (e) {
      return sendJson(res, 500, { error: "Server error" });
    }
  }

  if (req.method === "GET" && pathname.startsWith("/api/clipboards/")) {
    const hash = pathname.split("/").pop();
    if (!hash || !/^[a-f0-9]{64}$/i.test(hash)) {
      return sendJson(res, 400, { error: "Invalid hash" });
    }
    const filePath = path.join(storageDir, `${hash}.md`);
    if (!fs.existsSync(filePath)) {
      return sendJson(res, 404, { error: "Not found" });
    }
    try {
      const content = fs.readFileSync(filePath, "utf8");
      return sendJson(res, 200, { content });
    } catch (e) {
      return sendJson(res, 500, { error: "Read failed" });
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
