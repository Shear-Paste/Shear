const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname);

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let filePath = path.join(root, url.pathname === "/" ? "index.html" : url.pathname);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.stat(filePath, (err, stat) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not found");
    }
    if (stat.isDirectory()) filePath = path.join(filePath, "index.html");
    fs.readFile(filePath, (e, data) => {
      if (e) {
        res.writeHead(500);
        return res.end("Error");
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
      res.end(data);
    });
  });
});

server.listen(5173, () => {
  console.log("Frontend http://localhost:5173");
});