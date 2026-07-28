import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const syntaxTargets = [
  "web/wudao-app.mjs",
  "web/origin-core.mjs",
  "web/wudao-core.mjs",
  "web/wudao-p0-core.mjs",
  "web/combat-engine.mjs",
  "scripts/run-browser-regression.mjs",
  "scripts/static-web-server.mjs",
  "scripts/serve-web.mjs",
  "scripts/cdp-smoke.mjs",
  "scripts/cdp-origins.mjs",
  "scripts/cdp-online-smoke.mjs",
  "scripts/verify-release-assets.mjs",
  "scripts/smoke-deployed.mjs",
];

const steps = [
  ...syntaxTargets.map((target) => ({
    name: `JavaScript syntax (${target})`,
    command: process.execPath,
    args: ["--check", target],
  })),
  { name: "Rule and contract tests", command: process.execPath, args: ["--test"] },
  { name: "Story content validation", command: process.execPath, args: ["scripts/validate-p0-content.mjs"] },
  { name: "Release resource contract", command: process.execPath, args: ["scripts/verify-release-assets.mjs"] },
  { name: "Self-starting browser regression", command: process.execPath, args: ["scripts/run-browser-regression.mjs", "all"] },
];

function runStep(step) {
  process.stdout.write(`quality: ${step.name}\n`);
  return new Promise((resolve, reject) => {
    const child = spawn(step.command, step.args, {
      cwd: repositoryRoot,
      env: process.env,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${step.name} failed with ${code ?? signal}`));
    });
  });
}

for (const step of steps) await runStep(step);
process.stdout.write(`${JSON.stringify({ ok: true, steps: steps.length })}\n`);
