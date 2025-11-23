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
      if (!content) {
        return sendJson(res, 400, { error: "Missing content" });
      }

      const hash = crypto.createHash("sha256").update(content, "utf8").digest("hex");
      const filePath = path.join(storageDir, `${hash}.md`);
      try {
        fs.writeFileSync(filePath, content, { encoding: "utf8" });
      } catch (e) {
        return sendJson(res, 500, { error: "Store failed" });
      }
      return sendJson(res, 200, { hash });
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