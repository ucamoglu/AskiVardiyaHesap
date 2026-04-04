const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "";
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

function resolvePath(urlPath) {
  const cleanPath = decodeURIComponent((urlPath || "/").split("?")[0]);
  const relativePath = cleanPath === "/" ? "index.html" : cleanPath.replace(/^\/+/, "");
  return path.join(ROOT, relativePath);
}

function createRequestHandler() {
  return (req, res) => {
    const filePath = resolvePath(req.url);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Not found");
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      res.statusCode = 200;
      res.setHeader("Content-Type", MIME_TYPES[ext] || "application/octet-stream");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.end(data);
    });
  };
}

function startServer(host) {
  return new Promise((resolve) => {
    const server = http.createServer(createRequestHandler());
    server.on("error", (err) => {
      resolve({ ok: false, host, err });
    });
    server.listen(PORT, host, () => {
      resolve({ ok: true, host, server });
    });
  });
}

async function main() {
  const hosts = HOST ? [HOST] : ["127.0.0.1", "::1"];
  const results = [];

  for (const host of hosts) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await startServer(host));
  }

  const started = results.filter((item) => item.ok);
  if (!started.length) {
    const firstError = results[0]?.err;
    if (firstError?.code === "EADDRINUSE") {
      console.error(`Port ${PORT} zaten kullanimda. Baska bir port dene: PORT=8081 node serve.js`);
      return;
    }
    console.error(`Sunucu baslatilamadi: ${firstError ? firstError.message : "bilinmeyen hata"}`);
    return;
  }

  started.forEach(({ host }) => {
    console.log(`Server running at http://${host}:${PORT}`);
  });
  if (!HOST) {
    console.log(`Tarayici icin deneyebilirsin: http://localhost:${PORT}`);
  }
}

main();
