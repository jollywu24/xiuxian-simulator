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

async function waitForExpression(expression, timeout = 7000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  throw new Error(`Timed out waiting for: ${expression}`);
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
    supportThreatCount: document.querySelectorAll(".enemy-unit .unit-threat-line").length,
    intentStepCount: document.querySelectorAll(".intent-thread li").length,
    positionNodeCount: document.querySelectorAll(".position-node").length,
    selectablePositionNodeCount: document.querySelectorAll("[data-position-id]").length,
    playerPosition: document.querySelector("[data-position-id].player-position")?.dataset.positionId || "",
    turn: (() => {
      const bar = document.querySelector(".turn-bar");
      return bar ? { phase: bar.dataset.phase, round: Number(bar.dataset.round), energy: Number(bar.dataset.energy) } : null;
    })(),
    objectiveVisible: Boolean(document.querySelector(".battle-objective")),
    environmentCount: document.querySelectorAll("[data-environment-id]").length,
    selectedEnvironment: document.querySelector("[data-environment-id].selected")?.dataset.environmentId || "",
    selectedTarget: document.querySelector(".enemy-unit.selected")?.dataset.targetId || "",
    arsenalVisible: document.querySelector(".arsenal-sheet")?.classList.contains("open") || false,
    arsenalDialog: document.querySelector(".arsenal-sheet [role='dialog']")?.getAttribute("aria-modal") || "",
    actionForecasts: [...document.querySelectorAll(".recommended-actions .action-forecast")].map((item) => ({ text: item.textContent.trim(), visible: Boolean(item.offsetWidth || item.offsetHeight) })),
    effectVisible: Boolean(document.querySelector(".combat-effects")),
    sceneAssetLoaded: getComputedStyle(document.querySelector(".scene-art")).backgroundImage.includes("jinling-rain-ambush"),
    deathVisible: Boolean(document.querySelector(".outcome-panel.death")),
    outcomeVisible: Boolean(document.querySelector(".outcome-panel.victory")),
    mobileLayout: (() => {
      const rect = (element) => {
        const value = element?.getBoundingClientRect();
        return value ? { top: value.top, right: value.right, bottom: value.bottom, left: value.left } : null;
      };
      const rail = document.querySelector(".enemy-rail");
      const scene = document.querySelector(".scene-art");
      const positionMap = rect(document.querySelector(".position-map"));
      const actions = [...document.querySelectorAll(".recommended-actions .context-action")].map(rect);
      const targets = [...document.querySelectorAll(".target-hotspot")].map((element) => ({ id: element.dataset.targetId, rect: rect(element) }));
      const environments = [...document.querySelectorAll(".environment-hotspot")].map((element) => ({ id: element.dataset.environmentId, rect: rect(element) }));
      const overlaps = (a, b) => a && b && Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
      return {
        rail: rect(rail),
        scene: rect(scene),
        railFits: rail ? rail.scrollWidth <= rail.clientWidth : false,
        recommendedActions: actions,
        sceneControlOverlaps: targets.flatMap((target) => environments.filter((environment) => overlaps(target.rect, environment.rect)).map((environment) => target.id + ":" + environment.id)),
        positionMapOverlaps: [...targets, ...environments].filter((control) => overlaps(control.rect, positionMap)).map((control) => control.id)
      };
    })()
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

async function clickPosition(positionId) {
  await evaluate(`(() => {
    const button = document.querySelector(${JSON.stringify(`[data-position-id="${positionId}"]`)});
    if (!button) throw new Error(${JSON.stringify(`Missing position ${positionId}`)});
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
assert.deepEqual(desktop.enemyVitalityValues, [18]);
assert.equal(desktop.supportThreatCount, 2);
assert.equal(desktop.intentStepCount, 3);
assert.equal(desktop.positionNodeCount, 6);
assert.equal(desktop.selectablePositionNodeCount, 4);
assert.equal(desktop.playerPosition, "alley_entrance");
assert.deepEqual(desktop.turn, { phase: "player", round: 1, energy: 3 });
assert.equal(desktop.objectiveVisible, true);
assert.equal(desktop.environmentCount, 3);
assert.equal(desktop.sceneAssetLoaded, true);
assert.equal(desktop.actionForecasts.length, 3);
assert.ok(desktop.actionForecasts.every((entry) => entry.visible && /若此刻收势/.test(entry.text)));
assert.deepEqual(desktop.mobileLayout.sceneControlOverlaps, []);
assert.deepEqual(desktop.mobileLayout.positionMapOverlaps, []);
const desktopShot = await screenshot("wudao-combat-lab-desktop.png");

await clickAction("observe");
const observed = await snapshot("observed");
assert.match(observed.text, /左袖藏刃|破绽/);
assert.equal(observed.playerVitalityValue, desktop.playerVitalityValue);
assert.deepEqual(observed.turn, { phase: "player", round: 1, energy: 2 });
assert.equal(observed.effectVisible, true);
const effectShot = await screenshot("wudao-combat-lab-effect.png");
await new Promise((resolve) => setTimeout(resolve, 820));
await clickAction("needle_wrist");
const needleStrike = await snapshot("needle-strike");
assert.equal(needleStrike.effectVisible, true);
assert.ok(needleStrike.enemyVitalityValues[0] < observed.enemyVitalityValues[0]);
const needleShot = await screenshot("wudao-combat-lab-needle.png");
await waitForExpression('document.querySelector(".turn-bar")?.dataset.phase === "player" && document.querySelector(".turn-bar")?.dataset.round === "2"');
const secondRound = await snapshot("second-round");
assert.deepEqual(secondRound.turn, { phase: "player", round: 2, energy: 3 });
assert.equal(secondRound.playerPosition, "alley_entrance");
assert.match(secondRound.text, /弩手|瞄准/);
await clickAction("seal");
await waitForExpression('Boolean(document.querySelector(".outcome-panel.victory"))');
const subdued = await snapshot("subdued");
assert.equal(subdued.outcomeVisible, true);
assert.match(subdued.text, /留下活口/);
assert.ok(subdued.playerVitalityValue < secondRound.playerVitalityValue);

await setViewport(390, 844, true);
await navigate();
const portrait = await snapshot("portrait");
assert.ok(portrait.scrollWidth <= 390);
assert.ok(portrait.actionCount >= 5);
assert.equal(portrait.playerVitalityCount, 1);
assert.equal(portrait.enemyUnitCount, 3);
assert.equal(portrait.positionNodeCount, 6);
assert.equal(portrait.selectablePositionNodeCount, 4);
assert.deepEqual(portrait.turn, { phase: "player", round: 1, energy: 3 });
assert.ok(portrait.mobileLayout.rail.bottom <= portrait.mobileLayout.scene.top);
assert.equal(portrait.mobileLayout.railFits, true);
assert.deepEqual(portrait.mobileLayout.sceneControlOverlaps, []);
assert.deepEqual(portrait.mobileLayout.positionMapOverlaps, []);
assert.equal(portrait.mobileLayout.recommendedActions.length, 3);
assert.ok(portrait.mobileLayout.recommendedActions.every((action) => action.bottom <= 780));
assert.ok(portrait.actionForecasts.every((entry) => entry.visible));
const sliderFocus = await evaluate(`(() => {
  const details = document.querySelector(".fate-settings");
  details.open = true;
  const input = document.querySelector('[data-setting="attribute"][data-key="insight"]');
  input.focus();
  input.value = "4";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  const preservedDuringInput = document.activeElement === input && input.isConnected;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return new Promise((resolve) => queueMicrotask(() => {
    const replacement = document.querySelector('[data-setting="attribute"][data-key="insight"]');
    resolve({
      preservedDuringInput,
      detailsOpen: document.querySelector(".fate-settings")?.open || false,
      focusRestored: document.activeElement === replacement,
      value: replacement?.value || ""
    });
  }));
})()`);
assert.deepEqual(sliderFocus, { preservedDuringInput: true, detailsOpen: true, focusRestored: true, value: "4" });
await evaluate(`(() => {
  document.querySelector(".fate-settings").open = false;
  window.scrollTo(0, 0);
  return true;
})()`);
await clickPosition("eave_pillar");
const positionFocus = await snapshot("position-focus");
assert.ok(positionFocus.actionIds.includes("move_eave_pillar"));
await clickAction("move_eave_pillar");
await new Promise((resolve) => setTimeout(resolve, 820));
const moved = await snapshot("moved");
assert.equal(moved.playerPosition, "eave_pillar");
assert.deepEqual(moved.turn, { phase: "player", round: 1, energy: 2 });
await clickTarget("roof_crossbow");
const crossbowFocus = await snapshot("crossbow-focus");
assert.equal(crossbowFocus.selectedTarget, "roof_crossbow");
assert.equal(crossbowFocus.selectedEnvironment, "");
assert.match(crossbowFocus.text, /应对屋脊弩手/);
await clickEnvironment("street_lantern");
const lanternFocus = await snapshot("lantern-focus");
assert.equal(lanternFocus.selectedEnvironment, "street_lantern");
assert.match(lanternFocus.text, /利用灯笼/);
assert.match(lanternFocus.text, /银针灭灯/);
await clickCommand("toggle-arsenal");
const arsenal = await snapshot("arsenal");
assert.equal(arsenal.arsenalVisible, true);
assert.equal(arsenal.arsenalDialog, "true");
const arsenalShot = await screenshot("wudao-combat-lab-arsenal.png");
await clickCommand("toggle-arsenal");
const portraitShot = await screenshot("wudao-combat-lab-portrait.png");

await navigate();
await clickAction("reckless");
await waitForExpression('Boolean(document.querySelector(".outcome-panel.death"))');
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
assert.equal(landscape.positionNodeCount, 6);
assert.equal(landscape.selectablePositionNodeCount, 4);
assert.deepEqual(landscape.mobileLayout.sceneControlOverlaps, []);
assert.deepEqual(landscape.mobileLayout.positionMapOverlaps, []);
assert.equal(landscape.mobileLayout.recommendedActions.length, 3);
assert.ok(landscape.mobileLayout.recommendedActions.every((action) => action.bottom <= 390));
assert.ok(landscape.actionForecasts.every((entry) => entry.visible));
const landscapeShot = await screenshot("wudao-combat-lab-landscape.png");

assert.deepEqual(pageErrors, []);
socket.close();

console.log(JSON.stringify({
  ok: true,
  checkpoints: [desktop, observed, needleStrike, secondRound, subdued, portrait, positionFocus, moved, crossbowFocus, lanternFocus, arsenal, death, rewound, landscape],
  screenshots: [desktopShot, effectShot, needleShot, portraitShot, arsenalShot, rewindShot, landscapeShot],
}, null, 2));
