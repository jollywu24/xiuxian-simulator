import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStaticWebServer, listen } from "./static-web-server.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = path.join(repositoryRoot, "web");
const port = Number(process.env.PORT || process.argv[2] || 8080);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid port: ${process.env.PORT || process.argv[2]}`);
}

const server = createStaticWebServer(webRoot);
await listen(server, port);
process.stdout.write(`http://127.0.0.1:${port}/\n`);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => server.close(() => process.exit(0)));
}
