export const RELEASE_CONTRACT_VERSION = 10;

export const RELEASE_ENTRY_RESOURCES = Object.freeze([
  { path: "index.html", contentType: "text/html", minBytes: 256 },
  { path: "styles.css", contentType: "text/css", minBytes: 1024 },
  { path: "appearance.css", contentType: "text/css", minBytes: 1024 },
  { path: "wudao-app.mjs", contentType: "text/javascript", minBytes: 1024 },
  { path: "combat.html", contentType: "text/html", minBytes: 256 },
]);

export const RELEASE_CRITICAL_ASSETS = Object.freeze([
  { path: "assets/origins/shen-west-courtyard-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/origins/qinhuai-fish-market-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/creation-v1/origin-shen-branch-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/creation-v1/origin-streetborn-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/creation-v1/origin-mystery-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/scenes/ruined-temple-stage-v3.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/creation-v1/appearance-jiangnan-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v2/male-clothing-1-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v2/male-clothing-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v2/male-head-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v2/female-clothing-1-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v2/female-clothing-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v2/female-head-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v3/male-look-1-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v3/male-look-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v3/female-look-1-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v3/female-look-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/male-base-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/male-clothing-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/male-back-accessory-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/male-back-hair-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/male-brows-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/male-eyes-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/male-face-accessory-v1.webp", contentType: "image/webp", minBytes: 1 },
  { path: "assets/appearance/rig-v4/male-face-shape-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/male-front-hair-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/male-hat-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/male-mouth-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/male-nose-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/female-base-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/female-clothing-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/female-back-accessory-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/female-back-hair-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/female-brows-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/female-eyes-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/female-face-accessory-v1.webp", contentType: "image/webp", minBytes: 1 },
  { path: "assets/appearance/rig-v4/female-face-shape-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/female-front-hair-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/female-hat-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/female-mouth-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v4/female-nose-2-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v5-psd/male-base-c1-v1.webp", contentType: "image/webp", minBytes: 1024 },
  { path: "assets/appearance/rig-v5-psd/female-base-c1-v1.webp", contentType: "image/webp", minBytes: 1024 },
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
