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
    playerVitalityCount: document.querySelectorAll(".fighter-hud .hp-track").length,
    playerVitalityValue: Number(document.querySelector(".fighter-hud [role='meter']")?.getAttribute("aria-valuenow") || 0),
    enemyUnitCount: document.querySelectorAll(".enemy-unit").length,
    enemyVitalityValues: [...document.querySelectorAll(".enemy-unit [role='meter']")].map((item) => Number(item.getAttribute("aria-valuenow"))),
    intentStepCount: document.querySelectorAll(".intent-thread li").length,
    objectiveVisible: Boolean(document.querySelector(".battle-objective")),
    environmentCount: document.querySelectorAll("[data-environment-id]").length,
    selectedEnvironment: document.querySelector("[data-environment-id].selected")?.dataset.environmentId || "",
    selectedTarget: document.querySelector(".enemy-unit.selected")?.dataset.targetId || "",
    arsenalVisible: document.querySelector(".arsenal-sheet")?.classList.contains("open") || false,
    effectVisible: Boolean(document.querySelector(".combat-effects")),
    sceneAssetLoaded: getComputedStyle(document.querySelector(".scene-art")).backgroundImage.includes("jinling-rain-ambush"),
    deathVisible: Boolean(document.querySelector(".outcome-panel.death")),
    outcomeVisible: Boolean(document.querySelector(".outcome-panel.victory"))
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

async function clickEnvironment(environmentId) {
  await evaluate(`(() => {
    const button = document.querySelector(${JSON.stringify(`[data-environment-id="${environmentId}"]`)});
    if (!button) throw new Error(${JSON.stringify(`Missing environment ${environmentId}`)});
    button.click();
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 180));
}

async function clickTarget(targetId) {
  await evaluate(`(() => {
    const button = document.querySelector(${JSON.stringify(`.enemy-unit[data-target-id="${targetId}"]`)});
    if (!button) throw new Error(${JSON.stringify(`Missing target ${targetId}`)});
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
assert.equal(desktop.title, "武道 · 金陵雨巷");
assert.match(desktop.heading, /东门伏杀/);
assert.ok(desktop.scrollWidth <= 1280);
assert.ok(desktop.actionIds.includes("observe"));
assert.ok(desktop.actionIds.includes("reckless"));
assert.ok(desktop.settingsCount >= 9);
assert.equal(desktop.playerVitalityCount, 1);
assert.equal(desktop.enemyUnitCount, 3);
assert.deepEqual(desktop.enemyVitalityValues, [18, 8, 24]);
assert.equal(desktop.intentStepCount, 2);
assert.equal(desktop.objectiveVisible, true);
assert.equal(desktop.environmentCount, 3);
assert.equal(desktop.sceneAssetLoaded, true);
const desktopShot = await screenshot("wudao-combat-lab-desktop.png");

await clickAction("observe");
const observed = await snapshot("observed");
assert.match(observed.text, /左袖藏刃|破绽/);
assert.ok(observed.playerVitalityValue <= desktop.playerVitalityValue);
assert.ok(observed.actionIds.includes("seal"));
assert.ok(observed.actionIds.includes("kill"));
assert.equal(observed.effectVisible, true);
const effectShot = await screenshot("wudao-combat-lab-effect.png");
await new Promise((resolve) => setTimeout(resolve, 820));
await clickAction("needle_wrist");
const needleStrike = await snapshot("needle-strike");
assert.equal(needleStrike.effectVisible, true);
assert.ok(needleStrike.enemyVitalityValues[0] < observed.enemyVitalityValues[0]);
const needleShot = await screenshot("wudao-combat-lab-needle.png");
await new Promise((resolve) => setTimeout(resolve, 820));
await clickAction("seal");
await new Promise((resolve) => setTimeout(resolve, 820));
const subdued = await snapshot("subdued");
assert.equal(subdued.outcomeVisible, true);
assert.match(subdued.text, /留下活口/);

await setViewport(390, 844, true);
await navigate();
const portrait = await snapshot("portrait");
assert.ok(portrait.scrollWidth <= 390);
assert.ok(portrait.actionCount >= 5);
assert.equal(portrait.playerVitalityCount, 1);
assert.equal(portrait.enemyUnitCount, 3);
await clickTarget("roof_crossbow");
const crossbowFocus = await snapshot("crossbow-focus");
assert.equal(crossbowFocus.selectedTarget, "roof_crossbow");
assert.equal(crossbowFocus.selectedEnvironment, "street_lantern");
await clickEnvironment("street_lantern");
await clickEnvironment("street_lantern");
const lanternFocus = await snapshot("lantern-focus");
assert.equal(lanternFocus.selectedEnvironment, "street_lantern");
assert.match(lanternFocus.text, /利用灯笼/);
assert.match(lanternFocus.text, /银针灭灯/);
await clickCommand("toggle-arsenal");
const arsenal = await snapshot("arsenal");
assert.equal(arsenal.arsenalVisible, true);
const arsenalShot = await screenshot("wudao-combat-lab-arsenal.png");
await clickCommand("toggle-arsenal");
const portraitShot = await screenshot("wudao-combat-lab-portrait.png");

await navigate();
await clickAction("reckless");
const death = await snapshot("death");
assert.equal(death.deathVisible, true);
assert.match(death.text, /命灯碎裂/);
await new Promise((resolve) => setTimeout(resolve, 820));
await clickCommand("rewind");
const rewound = await snapshot("rewound");
assert.match(rewound.text, /左袖藏刃/);
assert.equal(rewound.actionIds.includes("reckless"), false);
const rewindShot = await screenshot("wudao-combat-lab-rewind.png");

await setViewport(844, 390, true);
await navigate();
const landscape = await snapshot("landscape");
assert.ok(landscape.scrollWidth <= 844);
assert.ok(landscape.actionCount >= 5);
assert.equal(landscape.playerVitalityCount, 1);
assert.equal(landscape.enemyUnitCount, 3);
const landscapeShot = await screenshot("wudao-combat-lab-landscape.png");

assert.deepEqual(pageErrors, []);
socket.close();

console.log(JSON.stringify({
  ok: true,
  checkpoints: [desktop, observed, needleStrike, subdued, portrait, crossbowFocus, lanternFocus, arsenal, death, rewound, landscape],
  screenshots: [desktopShot, effectShot, needleShot, portraitShot, arsenalShot, rewindShot, landscapeShot],
}, null, 2));
