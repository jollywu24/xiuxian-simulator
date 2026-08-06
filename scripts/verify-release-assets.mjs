import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  RELEASE_CONTRACT_VERSION,
  RELEASE_CRITICAL_RESOURCES,
  RUNTIME_SOURCE_EXTENSIONS,
} from "./release-contract.mjs";
import { APPEARANCE_RUNTIME_ASSETS } from "../web/appearance-core.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function sourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : [target];
  });
}

export function collectRuntimeAssetReferences(webRoot) {
  const sources = sourceFiles(webRoot).filter((file) => RUNTIME_SOURCE_EXTENSIONS.includes(path.extname(file)));
  const references = new Set();
  for (const source of sources) {
    const contents = fs.readFileSync(source, "utf8");
    for (const match of contents.matchAll(/(?:\.\/)?assets\/[^"'`()\s?]+\.(?:jpeg|jpg|png|svg|webp|woff2)/gi)) {
      if (!match[0].includes("${")) references.add(match[0].replace(/^\.\//, ""));
    }
  }
  for (const asset of APPEARANCE_RUNTIME_ASSETS) references.add(asset.replace(/^\.\//, ""));
  return [...references].sort();
}

export function collectPublishedAssetFiles(webRoot) {
  const assetsRoot = path.join(webRoot, "assets");
  return sourceFiles(assetsRoot)
    .filter((file) => path.extname(file).toLowerCase() !== ".md")
    .map((file) => path.relative(webRoot, file).split(path.sep).join("/"))
    .sort();
}

export function collectOrphanRuntimeAssets(webRoot) {
  const references = new Set(collectRuntimeAssetReferences(webRoot));
  for (const resource of RELEASE_CRITICAL_RESOURCES) {
    if (resource.path.startsWith("assets/")) references.add(resource.path);
  }
  return collectPublishedAssetFiles(webRoot).filter((resourcePath) => !references.has(resourcePath));
}

export function collectRuntimeCacheVersions(webRoot) {
  const sources = sourceFiles(webRoot).filter((file) => [".html", ".mjs"].includes(path.extname(file)));
  const versions = new Set();
  for (const source of sources) {
    const contents = fs.readFileSync(source, "utf8");
    for (const match of contents.matchAll(/\?v=([0-9]{8}\.[0-9]+)/g)) versions.add(match[1]);
  }
  return [...versions].sort();
}

function validateFile(webRoot, resource) {
  const target = path.resolve(webRoot, resource.path);
  const relative = path.relative(webRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Release resource leaves web root: ${resource.path}`);
  }
  if (!fs.existsSync(target)) throw new Error(`Missing release resource: ${resource.path}`);
  const size = fs.statSync(target).size;
  if (size < resource.minBytes) {
    throw new Error(`Release resource is too small (${size} bytes): ${resource.path}`);
  }
  return { path: resource.path, size };
}

export function verifyLocalRelease(webRoot = path.join(repositoryRoot, "web")) {
  const critical = RELEASE_CRITICAL_RESOURCES.map((resource) => validateFile(webRoot, resource));
  const runtimeAssets = collectRuntimeAssetReferences(webRoot);
  const publishedAssets = collectPublishedAssetFiles(webRoot);
  const designRenderingDirectory = path.join(webRoot, "assets", "UI_Renderings");
  if (fs.existsSync(designRenderingDirectory)) {
    throw new Error("Design rendering directory must not be published: assets/UI_Renderings");
  }
  if (runtimeAssets.length < 30) {
    throw new Error(`Expected at least 30 runtime assets, found ${runtimeAssets.length}`);
  }
  for (const resourcePath of runtimeAssets) {
    if (resourcePath.includes("/UI_Renderings/")) {
      throw new Error(`Design rendering is referenced by runtime code: ${resourcePath}`);
    }
    validateFile(webRoot, { path: resourcePath, minBytes: 1 });
  }
  const orphanAssets = collectOrphanRuntimeAssets(webRoot);
  if (orphanAssets.length) {
    throw new Error(`Orphan release assets: ${orphanAssets.join(", ")}`);
  }
  const cacheVersions = collectRuntimeCacheVersions(webRoot);
  if (cacheVersions.length !== 1) {
    throw new Error(`Runtime cache version drift: ${cacheVersions.join(", ") || "none"}`);
  }
  const index = fs.readFileSync(path.join(webRoot, "index.html"), "utf8");
  const [cacheVersion] = cacheVersions;
  if (!index.includes(`styles.css?v=${cacheVersion}`) || !index.includes(`wudao-app.mjs?v=${cacheVersion}`)) {
    throw new Error(`Entry resources do not use runtime cache version ${cacheVersion}`);
  }
  return {
    ok: true,
    contractVersion: RELEASE_CONTRACT_VERSION,
    cacheVersion,
    criticalResources: critical.length,
    runtimeAssets: runtimeAssets.length,
    publishedAssets: publishedAssets.length,
    orphanAssets: orphanAssets.length,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${JSON.stringify(verifyLocalRelease())}\n`);
}
