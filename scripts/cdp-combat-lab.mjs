import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const port = Number(process.argv[2] || 9225);
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const tab = tabs.find((item) => item.type === "page" && /^https?:\/\/(127\.0\.0\.1|localhost)/.test(item.url));
if (!tab) throw new Error(`No local browser page found on debugging port ${port}`);

const pageOrigin = new URL(tab.url).origin;
const socket = new WebSocket(tab.webSocketDebuggerUrl);
const pageErrors = [];
const pending = new Map();
let id = 0;

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") {
    pageErrors.push(message.params?.exceptionDetails?.exception?.description || "Unknown page exception");
  }
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const messageId = ++id;
    pending.set(messageId, { resolve, reject });
    socket.send(JSON.stringify({ id: messageId, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || "Page evaluation failed");
  return result.result.value;
}

async function navigate() {
  await send("Page.navigate", { url: `${pageOrigin}/combat.html?qa=${Date.now()}` });
  await new Promise((resolve) => setTimeout(resolve, 450));
}

async function setViewport(width, height, mobile) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
  await new Promise((resolve) => setTimeout(resolve, 180));
}

async function snapshot(label) {
  return evaluate(`(() => ({
    label: ${JSON.stringify(label)},
    title: document.title,
    heading: document.querySelector("h1")?.textContent?.trim() || "",
    text: document.querySelector("#combat-lab")?.innerText || "",
    viewport: [innerWidth, innerHeight],
    scrollWidth: document.documentElement.scrollWidth,
    actionIds: [...document.querySelectorAll("[data-action-id]")].map((item) => item.dataset.actionId),
    actionCount: document.querySelectorAll("[data-action-id]").length,
    disabledCount: document.querySelectorAll("[data-action-id]:disabled").length,
    settingsCount: document.querySelectorAll("[data-setting]").length,
    deathVisible: Boolean(document.querySelector(".death-board")),
    outcomeVisible: Boolean(document.querySelector(".outcome-board"))
  }))()`);
}

async function clickAction(actionId) {
  await evaluate(`(() => {
    const button = document.querySelector(${JSON.stringify(`[data-action-id="${actionId}"]`)});
    if (!button) throw new Error(${JSON.stringify(`Missing action ${actionId}`)});
    if (button.disabled) throw new Error(${JSON.stringify(`Disabled action ${actionId}`)});
    button.click();
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 180));
}

async function clickCommand(command) {
  await evaluate(`(() => {
    const button = document.querySelector(${JSON.stringify(`[data-command="${command}"]`)});
    if (!button) throw new Error(${JSON.stringify(`Missing command ${command}`)});
    button.click();
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 180));
}

async function screenshot(name) {
  await new Promise((resolve) => setTimeout(resolve, 350));
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const target = path.join(os.tmpdir(), name);
  fs.writeFileSync(target, Buffer.from(result.data, "base64"));
  return target;
}

await send("Page.enable");
await send("Runtime.enable");

await setViewport(1280, 720, false);
await navigate();
const desktop = await snapshot("desktop");
assert.equal(desktop.title, "武道 · 东门雨夜演武");
assert.match(desktop.heading, /左袖藏锋/);
assert.ok(desktop.scrollWidth <= 1280);
assert.ok(desktop.actionIds.includes("observe"));
assert.ok(desktop.actionIds.includes("reckless"));
assert.ok(desktop.settingsCount >= 9);
const desktopShot = await screenshot("wudao-combat-lab-desktop.png");

await clickAction("observe");
const observed = await snapshot("observed");
assert.match(observed.text, /左袖杀招已经看清/);
assert.ok(observed.actionIds.includes("seal"));
assert.ok(observed.actionIds.includes("kill"));
await clickAction("seal");
const subdued = await snapshot("subdued");
assert.equal(subdued.outcomeVisible, true);
assert.match(subdued.text, /留得活口/);

await setViewport(390, 844, true);
await navigate();
const portrait = await snapshot("portrait");
assert.ok(portrait.scrollWidth <= 390);
assert.ok(portrait.actionCount >= 5);
const portraitShot = await screenshot("wudao-combat-lab-portrait.png");

await clickAction("reckless");
const death = await snapshot("death");
assert.equal(death.deathVisible, true);
assert.match(death.text, /命灯碎裂/);
await clickCommand("rewind");
const rewound = await snapshot("rewound");
assert.match(rewound.text, /左袖杀招已经看清|死中见闻/);
assert.equal(rewound.actionIds.includes("reckless"), false);
const rewindShot = await screenshot("wudao-combat-lab-rewind.png");

await setViewport(844, 390, true);
await navigate();
const landscape = await snapshot("landscape");
assert.ok(landscape.scrollWidth <= 844);
assert.ok(landscape.actionCount >= 5);
const landscapeShot = await screenshot("wudao-combat-lab-landscape.png");

assert.deepEqual(pageErrors, []);
socket.close();

console.log(JSON.stringify({
  ok: true,
  checkpoints: [desktop, observed, subdued, portrait, death, rewound, landscape],
  screenshots: [desktopShot, portraitShot, rewindShot, landscapeShot],
}, null, 2));
