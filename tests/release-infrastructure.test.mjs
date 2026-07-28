import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const webRoot = path.join(repositoryRoot, "web");

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return [target];
  });
}

test("runtime asset references resolve to published files", () => {
  const sources = sourceFiles(webRoot).filter((file) => [".css", ".html", ".mjs"].includes(path.extname(file)));
  const references = new Set();
  for (const source of sources) {
    const contents = fs.readFileSync(source, "utf8");
    for (const match of contents.matchAll(/\.\/assets\/[^"'`()\s?]+\.(?:jpeg|jpg|png|svg|webp|woff2)/gi)) {
      references.add(match[0]);
    }
  }
  assert.ok(references.size >= 30, "expected the test to cover the current runtime asset set");
  for (const reference of references) {
    const target = path.join(webRoot, reference.replace(/^\.\//, ""));
    assert.ok(fs.existsSync(target), `missing published asset: ${reference}`);
    assert.ok(fs.statSync(target).size > 0, `empty published asset: ${reference}`);
  }
});

test("runtime modules and entry assets share one cache version", () => {
  const sources = sourceFiles(webRoot).filter((file) => [".html", ".mjs"].includes(path.extname(file)));
  const versions = new Set();
  for (const source of sources) {
    const contents = fs.readFileSync(source, "utf8");
    for (const match of contents.matchAll(/\?v=([0-9]+\.[0-9]+)/g)) versions.add(match[1]);
  }
  assert.equal(versions.size, 1, `mixed runtime cache versions: ${[...versions].join(", ")}`);
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
  assert.match(app, /buildSha: BUILD_SHA/);
});

test("automated verification owns the browser and gates Pages deployment", () => {
  const verification = read(".github/workflows/test-web.yml");
  const deployment = read(".github/workflows/pages.yml");
  const packageJson = JSON.parse(read("package.json"));

  assert.equal(packageJson.scripts["test:browser"], "node scripts/run-browser-regression.mjs all");
  assert.match(verification, /workflow_call:/);
  assert.match(verification, /npm test/);
  assert.match(verification, /npm run validate:content/);
  assert.match(verification, /npm run test:browser/);
  assert.match(deployment, /quality:\s*\n\s+uses: \.\/\.github\/workflows\/test-web\.yml/);
  assert.match(deployment, /deploy:\s*\n\s+needs: quality/);
});

test("published artifact is stamped and smoke-tests critical resources", () => {
  const deployment = read(".github/workflows/pages.yml");
  const requiredPublishedResources = [
    "styles.css",
    "wudao-app.mjs",
    "combat.html",
    "assets/scenes/ruined-temple-stage-v3.webp",
    "assets/character/chen-siming-paperdoll.png",
    "assets/inventory/inventory-backdrop.png",
    "assets/martial/martial-screen-backdrop.webp",
  ];

  assert.match(deployment, /data-build-sha=\\?"dev\\?"/);
  assert.match(deployment, /steps\.deployment\.outputs\.page_url/);
  assert.match(deployment, /data-build-sha=\\?"\$\{SHORT_SHA\}\\?"/);
  for (const resource of requiredPublishedResources) {
    assert.ok(fs.existsSync(path.join(webRoot, resource)), `critical resource is absent locally: ${resource}`);
    assert.ok(deployment.includes(resource), `post-deploy smoke omits: ${resource}`);
  }
});
