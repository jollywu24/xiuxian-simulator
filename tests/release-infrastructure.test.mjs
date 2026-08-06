import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  RELEASE_CONTRACT_VERSION,
  RELEASE_CRITICAL_RESOURCES,
} from "../scripts/release-contract.mjs";
import {
  collectOrphanRuntimeAssets,
  collectPublishedAssetFiles,
  collectRuntimeAssetReferences,
  collectRuntimeCacheVersions,
  verifyLocalRelease,
} from "../scripts/verify-release-assets.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = path.join(repositoryRoot, "web");

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

test("runtime and critical release resources resolve through one contract", () => {
  const report = verifyLocalRelease(webRoot);
  assert.equal(report.ok, true);
  assert.equal(report.contractVersion, RELEASE_CONTRACT_VERSION);
  assert.equal(report.criticalResources, RELEASE_CRITICAL_RESOURCES.length);
  assert.ok(report.runtimeAssets >= 30);
  assert.ok(collectRuntimeAssetReferences(webRoot).every((resource) => !resource.includes("/UI_Renderings/")));
  assert.deepEqual(collectOrphanRuntimeAssets(webRoot), []);
  assert.ok(collectPublishedAssetFiles(webRoot).every((resource) => !resource.includes("/UI_Renderings/")));
});

test("runtime modules and entry assets share one cache version", () => {
  const versions = collectRuntimeCacheVersions(webRoot);
  assert.equal(versions.length, 1, `mixed runtime cache versions: ${versions.join(", ")}`);
  const index = read("web/index.html");
  const [version] = versions;
  assert.match(index, new RegExp(`styles\\.css\\?v=${version.replace(".", "\\.")}`));
  assert.match(index, new RegExp(`wudao-app\\.mjs\\?v=${version.replace(".", "\\.")}`));
});

test("debug state interface is opt-in and exposes the stamped build", () => {
  const index = read("web/index.html");
  const app = read("web/wudao-app.mjs");
  assert.match(index, /data-build-sha="dev"/);
  assert.match(app, /dataset\.buildSha \|\| "dev"/);
  assert.match(app, /get\("debug"\) !== "1"/);
  assert.match(app, /delete window\.WudaoDebug/);
  assert.match(app, /Object\.defineProperty\(window, "WudaoDebug"/);
  assert.match(app, /DEBUG_PROTOCOL_VERSION = 1/);
  assert.match(app, /status: debugStatus/);
  assert.match(app, /commands,/);
  assert.match(app, /dataset\.appReady = "true"/);
  assert.match(app, /buildSha: BUILD_SHA/);
});

test("automated verification owns the browser and gates Pages deployment", () => {
  const verification = read(".github/workflows/test-web.yml");
  const deployment = read(".github/workflows/pages.yml");
  const packageJson = JSON.parse(read("package.json"));

  assert.equal(packageJson.scripts.verify, "node scripts/run-quality-gate.mjs release");
  assert.equal(packageJson.scripts["verify:quick"], "node scripts/run-quality-gate.mjs quick");
  assert.equal(packageJson.scripts.serve, "node scripts/serve-web.mjs");
  assert.equal(packageJson.scripts["test:browser"], "node scripts/run-browser-regression.mjs all");
  assert.equal(packageJson.scripts["smoke:online"], "node scripts/run-browser-regression.mjs online");
  assert.match(verification, /workflow_call:/);
  assert.match(verification, /fetch-depth: 2/);
  assert.match(verification, /npm run verify/);
  assert.match(deployment, /quality:\s*\n\s+uses: \.\/\.github\/workflows\/test-web\.yml/);
  assert.match(deployment, /deploy:\s*\n\s+needs: quality/);
  assert.match(deployment, /node scripts\/smoke-deployed\.mjs/);
  assert.match(deployment, /npm run smoke:online/);
});

test("published artifact is stamped and smoke-tests critical resources", () => {
  const deployment = read(".github/workflows/pages.yml");
  const deploymentSmoke = read("scripts/smoke-deployed.mjs");

  assert.match(deployment, /data-build-sha=\\?"dev\\?"/);
  assert.match(deployment, /steps\.deployment\.outputs\.page_url/);
  assert.match(deployment, /EXPECTED_BUILD_SHA: \$\{\{ steps\.build\.outputs\.short_sha \}\}/);
  assert.match(deploymentSmoke, /RELEASE_CRITICAL_RESOURCES/);
  for (const resource of RELEASE_CRITICAL_RESOURCES) {
    assert.ok(fs.existsSync(path.join(webRoot, resource.path)), `critical resource is absent locally: ${resource.path}`);
  }
});
