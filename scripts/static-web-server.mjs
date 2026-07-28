import { readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
]);

export function createStaticWebServer(webRoot) {
  const resolvedWebRoot = path.resolve(webRoot);
  return http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const target = path.resolve(resolvedWebRoot, `.${pathname}`);
      const relative = path.relative(resolvedWebRoot, target);
      if (relative.startsWith("..") || path.isAbsolute(relative)) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      const targetStat = await stat(target);
      if (!targetStat.isFile()) {
        response.writeHead(404).end("Not found");
        return;
      }
      const body = request.method === "HEAD" ? null : await readFile(target);
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-length": targetStat.size,
        "content-type": MIME_TYPES.get(path.extname(target).toLowerCase()) || "application/octet-stream",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
}

export function listen(server, port = 0, host = "127.0.0.1") {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve(server.address()));
  });
}
