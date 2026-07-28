import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = path.join(repositoryRoot, "web");
const suite = process.argv[2] || "all";
const suites = {
  main: ["scripts/cdp-smoke.mjs"],
  combat: ["scripts/cdp-combat-lab.mjs"],
  all: ["scripts/cdp-smoke.mjs", "scripts/cdp-combat-lab.mjs"],
};

if (!suites[suite]) {
  throw new Error(`Unknown browser regression suite: ${suite}`);
}

const mimeTypes = new Map([
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

function resolveBrowserExecutable() {
  const explicit = process.env.CHROME_BIN?.trim();
  if (explicit) {
    if (!fs.existsSync(explicit)) throw new Error(`CHROME_BIN does not exist: ${explicit}`);
    return explicit;
  }

  const localAppData = process.env.LOCALAPPDATA || "";
  const programFiles = process.env.PROGRAMFILES || "C:\\Program Files";
  const programFilesX86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
  const absoluteCandidates = process.platform === "win32"
    ? [
        path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
        path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
        path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
        path.join(programFiles, "Microsoft", "Edge", "Application", "msedge.exe"),
        path.join(programFilesX86, "Microsoft", "Edge", "Application", "msedge.exe"),
      ]
    : [
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
      ];
  const absoluteMatch = absoluteCandidates.find((candidate) => candidate && fs.existsSync(candidate));
  if (absoluteMatch) return absoluteMatch;

  const commandCandidates = process.platform === "win32"
    ? ["chrome.exe", "msedge.exe"]
    : ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];
  const locator = process.platform === "win32" ? "where.exe" : "which";
  for (const command of commandCandidates) {
    const result = spawnSync(locator, [command], { encoding: "utf8", windowsHide: true });
    const resolved = result.status === 0 ? result.stdout.trim().split(/\r?\n/)[0] : "";
    if (resolved) return resolved;
  }
  throw new Error("Chrome or Edge was not found. Set CHROME_BIN to the browser executable.");
}

async function reservePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  await new Promise((resolve) => server.close(resolve));
  if (!port) throw new Error("Unable to reserve a local port.");
  return port;
}

function createStaticServer() {
  return http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
      let pathname = decodeURIComponent(requestUrl.pathname);
      if (pathname.endsWith("/")) pathname += "index.html";
      const target = path.resolve(webRoot, `.${pathname}`);
      const relative = path.relative(webRoot, target);
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
        "content-type": mimeTypes.get(path.extname(target).toLowerCase()) || "application/octet-stream",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
}

async function waitForDevTools(port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Browser DevTools did not start on port ${port}: ${lastError?.message || "timeout"}`);
}

function runRegressionScript(script, devToolsPort) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(repositoryRoot, script), String(devToolsPort)], {
      cwd: repositoryRoot,
      env: process.env,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with ${code ?? signal}`));
    });
  });
}

async function stopBrowser(browser) {
  if (!browser || browser.exitCode !== null) return;
  browser.kill();
  await Promise.race([
    new Promise((resolve) => browser.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  if (browser.exitCode === null) {
    browser.kill("SIGKILL");
    await Promise.race([
      new Promise((resolve) => browser.once("exit", resolve)),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  }
}

async function removeTemporaryProfile(profileDirectory) {
  const tempRoot = path.resolve(os.tmpdir());
  const resolvedProfile = path.resolve(profileDirectory);
  if (path.relative(tempRoot, resolvedProfile).startsWith("..")) {
    throw new Error(`Refusing to remove browser profile outside the temp directory: ${resolvedProfile}`);
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await rm(resolvedProfile, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
}

const browserExecutable = resolveBrowserExecutable();
const sitePort = await reservePort();
const devToolsPort = await reservePort();
const profileDirectory = await mkdtemp(path.join(os.tmpdir(), "wudao-browser-regression-"));
const server = createStaticServer();
let browser;

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(sitePort, "127.0.0.1", resolve);
  });
  const siteUrl = `http://127.0.0.1:${sitePort}/`;
  browser = spawn(browserExecutable, [
    "--headless=new",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-extensions",
    "--no-default-browser-check",
    "--no-first-run",
    "--no-sandbox",
    `--remote-debugging-port=${devToolsPort}`,
    `--user-data-dir=${profileDirectory}`,
    siteUrl,
  ], {
    cwd: repositoryRoot,
    stdio: ["ignore", "ignore", "inherit"],
    windowsHide: true,
  });
  await waitForDevTools(devToolsPort);
  for (const script of suites[suite]) {
    await runRegressionScript(script, devToolsPort);
  }
  process.stdout.write(`${JSON.stringify({
    ok: true,
    browser: path.basename(browserExecutable),
    siteUrl,
    suite,
  })}\n`);
} finally {
  await stopBrowser(browser);
  await new Promise((resolve) => server.close(resolve));
  await removeTemporaryProfile(profileDirectory);
}
