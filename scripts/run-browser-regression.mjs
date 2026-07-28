import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStaticWebServer, listen } from "./static-web-server.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = path.join(repositoryRoot, "web");
const suite = process.argv[2] || "all";
const suites = {
  main: ["scripts/cdp-smoke.mjs"],
  origins: ["scripts/cdp-origins.mjs"],
  combat: ["scripts/cdp-combat-lab.mjs"],
  online: ["scripts/cdp-online-smoke.mjs"],
  all: ["scripts/cdp-smoke.mjs", "scripts/cdp-origins.mjs", "scripts/cdp-combat-lab.mjs"],
};

if (!suites[suite]) {
  throw new Error(`Unknown browser regression suite: ${suite}`);
}

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
const externalSiteUrl = process.env.BROWSER_BASE_URL?.trim() || "";
if (suite === "online" && !externalSiteUrl) {
  throw new Error("BROWSER_BASE_URL is required for the online browser smoke.");
}
const sitePort = externalSiteUrl ? 0 : await reservePort();
const devToolsPort = await reservePort();
const profileDirectory = await mkdtemp(path.join(os.tmpdir(), "wudao-browser-regression-"));
const server = externalSiteUrl ? null : createStaticWebServer(webRoot);
let browser;

try {
  if (server) {
    await listen(server, sitePort);
  }
  const siteUrl = externalSiteUrl || `http://127.0.0.1:${sitePort}/`;
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
    remote: Boolean(externalSiteUrl),
    siteUrl,
    suite,
  })}\n`);
} finally {
  await stopBrowser(browser);
  if (server) await new Promise((resolve) => server.close(resolve));
  await removeTemporaryProfile(profileDirectory);
}
