// Minimal static file server for local testing of the public/ directory.
import { createServer } from "http";
import { readFile, stat } from "fs/promises";
import { extname, join } from "path";

const ROOT = new URL("../public/", import.meta.url);
const PORT = process.env.PORT || 8080;

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
};

createServer(async (req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";

  const filePath = new URL("." + urlPath, ROOT);

  try {
    const info = await stat(filePath);
    if (info.isDirectory()) throw new Error("dir");
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[extname(filePath.pathname)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}).listen(PORT, () => console.log(`Serving public/ at http://localhost:${PORT}`));
