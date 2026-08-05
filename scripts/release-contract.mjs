export const RELEASE_CONTRACT_VERSION = 6;

export const RELEASE_ENTRY_RESOURCES = Object.freeze([
  { path: "index.html", contentType: "text/html", minBytes: 256 },
  { path: "styles.css", contentType: "text/css", minBytes: 1024 },
  { path: "wudao-app.mjs", contentType: "text/javascript", minBytes: 1024 },
  { path: "combat.html", contentType: "text/html", minBytes: 256 },
]);

export const RELEASE_CRITICAL_ASSETS = Object.freeze([
  { path: "assets/origins/shen-west-courtyard-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/origins/qinhuai-fish-market-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/origins/cards/clan-branch-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/origins/cards/streetborn-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/origins/cards/mystery-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/scenes/ruined-temple-stage-v3.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/appearance-courtyard-v2.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v2/male-clothing-1-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v2/male-clothing-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v2/male-head-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v2/female-clothing-1-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v2/female-clothing-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v2/female-head-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/inventory/inventory-backdrop.png", contentType: "image/png", minBytes: 1024 },
  { path: "assets/martial/martial-screen-backdrop.webp", contentType: "image/webp", minBytes: 1024 },
]);

export const RELEASE_CRITICAL_RESOURCES = Object.freeze([
  ...RELEASE_ENTRY_RESOURCES,
  ...RELEASE_CRITICAL_ASSETS,
]);

export const RUNTIME_SOURCE_EXTENSIONS = Object.freeze([".css", ".html", ".mjs"]);

export function cacheBustedUrl(baseUrl, resourcePath, buildSha = "") {
  const base = new URL(baseUrl);
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  const target = new URL(resourcePath, base);
  if (buildSha) target.searchParams.set("build", buildSha);
  return target;
}
