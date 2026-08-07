import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const port = Number(process.argv[2] || 9225);
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const tab = tabs.find((item) => item.type === "page" && /^https?:\/\/(127\.0\.0\.1|localhost)/.test(item.url));
if (!tab) throw new Error(`No browser page found on debugging port ${port}`);

const origin = new URL(tab.url).origin;
const socket = new WebSocket(tab.webSocketDebuggerUrl);
const pending = new Map();
const pageErrors = [];
let messageId = 0;

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") {
    pageErrors.push(message.params?.exceptionDetails?.exception?.description || "Unknown page exception");
  }
  if (!message.id || !pending.has(message.id)) return;
  const operation = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) operation.reject(new Error(message.error.message));
  else operation.resolve(message.result);
});

await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || "Page evaluation failed");
  return result.result.value;
}

async function waitFor(expression, label, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function click(action, value = null) {
  const selector = value == null
    ? `[data-action="${action}"]`
    : `[data-action="${action}"][data-value="${value}"]`;
  await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) throw new Error(${JSON.stringify(`Missing element ${selector}`)});
    if (element.disabled) throw new Error(${JSON.stringify(`Disabled element ${selector}`)});
    element.click();
    return true;
  })()`);
}

async function waitForPaperDoll() {
  await waitFor(
    `document.querySelector('.appearance-preview canvas[data-paper-doll-plan]')?.dataset.renderReady === 'true'`,
    "appearance paper doll",
  );
}

async function screenshot(name) {
  const output = path.resolve(".tmp/browser-regression", name);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(output, Buffer.from(result.data, "base64"));
}

async function canvasHash() {
  return evaluate(`(() => {
    const source = document.querySelector('.appearance-preview canvas[data-paper-doll-plan]');
    const sample = document.createElement('canvas');
    sample.width = 128; sample.height = 192;
    sample.getContext('2d').drawImage(source, 0, 0, 128, 192);
    const bytes = sample.getContext('2d').getImageData(0, 0, 128, 192).data;
    let hash = 2166136261;
    for (const byte of bytes) { hash ^= byte; hash = Math.imul(hash, 16777619); }
    return hash >>> 0;
  })()`);
}

async function canvasRegionHash({ x, y, width, height, outside = false }) {
  return evaluate(`(() => {
    const source = document.querySelector('.appearance-preview canvas[data-paper-doll-plan]');
    const context = source.getContext('2d');
    const bytes = context.getImageData(0, 0, source.width, source.height).data;
    const rect = ${JSON.stringify({ x, y, width, height })};
    let hash = 2166136261;
    for (let py = 0; py < source.height; py += 2) {
      for (let px = 0; px < source.width; px += 2) {
        const inside = px >= rect.x && px < rect.x + rect.width && py >= rect.y && py < rect.y + rect.height;
        if (${outside ? "true" : "false"} ? inside : !inside) continue;
        const offset = (py * source.width + px) * 4;
        for (let channel = 0; channel < 4; channel += 1) {
          hash ^= bytes[offset + channel];
          hash = Math.imul(hash, 16777619);
        }
      }
    }
    return hash >>> 0;
  })()`);
}

await send("Runtime.enable");
await send("Page.enable");
await send("Storage.clearDataForOrigin", { origin, storageTypes: "local_storage" });
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: `${origin}/?appearance-regression=1` });
await waitFor(`document.readyState === 'complete' && Boolean(document.querySelector('#app')?.innerText?.trim())`, "game start");
await click("new-journey");
await click("enter-creation");
await click("to-appearance");
await waitForPaperDoll();

assert.equal(await evaluate(`document.querySelectorAll('.appearance-ring-control').length`), 11);
assert.equal(await evaluate(`document.querySelectorAll('.appearance-ring-control button:disabled').length`), 0);
assert.equal(await evaluate(`document.documentElement.scrollWidth <= 1280 && document.documentElement.scrollHeight <= 720`), true);

const desktopGeometry = await evaluate(`(() => {
  const box = (selector) => {
    const rect = document.querySelector(selector).getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height, center: rect.left + rect.width / 2 };
  };
  return {
    hat: box('[data-appearance-part="hat"]'),
    figure: box('.appearance-preview .paper-doll-composition'),
    identity: box('.appearance-identity-controls'),
    firstLeft: box('[data-appearance-part="frontHair"]'),
    lastLeft: box('[data-appearance-part="backAccessory"]'),
    footer: box('.appearance-footer'),
    controls: [...document.querySelectorAll('.appearance-ring-control')].map((item) => box('[data-appearance-part="' + item.dataset.appearancePart + '"]')),
  };
})()`);
assert.ok(desktopGeometry.hat.bottom + 4 <= desktopGeometry.figure.top, JSON.stringify(desktopGeometry));
assert.ok(Math.abs(desktopGeometry.figure.center - 640) < 2, JSON.stringify(desktopGeometry));
assert.ok(desktopGeometry.figure.top >= 155 && desktopGeometry.figure.top <= 175, JSON.stringify(desktopGeometry));
assert.ok(desktopGeometry.firstLeft.top >= desktopGeometry.identity.bottom, JSON.stringify(desktopGeometry));
assert.ok(desktopGeometry.lastLeft.bottom <= desktopGeometry.footer.top, JSON.stringify(desktopGeometry));
assert.equal(new Set(desktopGeometry.controls.map((item) => item.width.toFixed(1))).size, 1);
assert.equal(new Set(desktopGeometry.controls.map((item) => item.height.toFixed(1))).size, 1);

const featureRois = {
  eyes: { x: 382, y: 266, width: 260, height: 102 },
  brows: { x: 380, y: 228, width: 264, height: 91 },
  mouth: { x: 422, y: 376, width: 180, height: 90 },
  nose: { x: 452, y: 288, width: 120, height: 134 },
  faceShape: { x: 366, y: 160, width: 292, height: 362 },
};
const fixedFaceRoi = { x: 440, y: 300, width: 144, height: 150 };
const fixedHeadRoi = { x: 440, y: 190, width: 144, height: 190 };
for (const part of ["frontHair", "backHair", "eyes", "brows", "mouth", "nose", "faceShape", "faceAccessory", "backAccessory", "clothing", "hat"]) {
  const previousHash = await canvasHash();
  const fixedFaceBefore = ["frontHair", "backHair"].includes(part) ? await canvasRegionHash(fixedFaceRoi) : null;
  const fixedHeadBefore = part === "clothing" ? await canvasRegionHash(fixedHeadRoi) : null;
  const outsideBefore = featureRois[part] ? await canvasRegionHash({ ...featureRois[part], outside: true }) : null;
  await click("step-appearance", `${part}:1`);
  await waitForPaperDoll();
  const currentHash = await canvasHash();
  assert.notEqual(currentHash, previousHash, `${part} did not change rendered pixels`);
  if (fixedFaceBefore != null) {
    assert.equal(await canvasRegionHash(fixedFaceRoi), fixedFaceBefore, `${part} moved or repainted the fixed face`);
  }
  if (fixedHeadBefore != null) {
    assert.equal(await canvasRegionHash(fixedHeadRoi), fixedHeadBefore, "clothing changed fixed head pixels");
  }
  if (outsideBefore != null) {
    assert.equal(
      await canvasRegionHash({ ...featureRois[part], outside: true }),
      outsideBefore,
      `${part} changed pixels outside its facial ROI`,
    );
  }
  assert.equal(
    await evaluate(`document.querySelector('[data-appearance-part="${part}"] small')?.textContent.trim()`),
    "2 / 2",
  );
  await click("step-appearance", `${part}:-1`);
  await waitForPaperDoll();
  assert.equal(await canvasHash(), previousHash, `${part} did not restore the deterministic base image`);
}
for (const part of ["frontHair", "backHair", "eyes", "brows", "mouth", "nose", "faceShape", "faceAccessory", "backAccessory", "clothing", "hat"]) {
  await click("step-appearance", `${part}:1`);
  await waitForPaperDoll();
}
await screenshot("appearance-desktop-1280x720.png");

await send("Emulation.setDeviceMetricsOverride", { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
await evaluate(`new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
const landscapeGeometry = await evaluate(`(() => {
  const hat = document.querySelector('[data-appearance-part="hat"]').getBoundingClientRect();
  const figure = document.querySelector('.appearance-preview .paper-doll-composition').getBoundingClientRect();
  return { hatBottom: hat.bottom, figureTop: figure.top, figureCenter: figure.left + figure.width / 2, footerBottom: document.querySelector('.appearance-footer').getBoundingClientRect().bottom };
})()`);
assert.ok(landscapeGeometry.hatBottom + 2 <= landscapeGeometry.figureTop, JSON.stringify(landscapeGeometry));
assert.ok(Math.abs(landscapeGeometry.figureCenter - 422) < 2, JSON.stringify(landscapeGeometry));
assert.ok(landscapeGeometry.footerBottom <= 390, JSON.stringify(landscapeGeometry));
assert.equal(await evaluate(`document.documentElement.scrollWidth <= 844 && document.documentElement.scrollHeight <= 390`), true);
await screenshot("appearance-phone-landscape-844x390.png");

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await evaluate(`new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
assert.equal(await evaluate(`getComputedStyle(document.querySelector('.landscape-required')).display`), "flex");
assert.equal(await evaluate(`getComputedStyle(document.querySelector('#app')).visibility`), "hidden");
assert.deepEqual(pageErrors, []);

process.stdout.write(`${JSON.stringify({ ok: true, suite: "appearance", changedParts: 11, desktopGeometry, landscapeGeometry })}\n`);
socket.close();
