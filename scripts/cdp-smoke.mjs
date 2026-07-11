import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const port = Number(process.argv[2] || 9225);
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const tab = tabs.find((item) => item.type === "page");
if (!tab) throw new Error(`No browser page found on debugging port ${port}`);

const socket = new WebSocket(tab.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const pageErrors = [];

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
  const result = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || "Page evaluation failed");
  }
  return result.result.value;
}

async function click(action, value = null) {
  const selector = value === null
    ? `[data-action="${action}"]`
    : `[data-action="${action}"][data-value="${value}"]`;
  return evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) throw new Error(${JSON.stringify(`Missing element: ${selector}`)});
    if (element.disabled) throw new Error(${JSON.stringify(`Disabled element: ${selector}`)});
    element.click();
    return document.querySelector("h1")?.textContent?.trim() || "";
  })()`);
}

async function clickSelector(selector) {
  return evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) throw new Error(${JSON.stringify(`Missing element: ${selector}`)});
    element.click();
    return true;
  })()`);
}

async function snapshot(label) {
  const value = await evaluate(`(() => ({
    label: ${JSON.stringify(label)},
    mode: document.body.dataset.mode,
    title: document.querySelector("h1")?.textContent?.trim() || "",
    actions: [...document.querySelectorAll("[data-action]")].map((item) => item.dataset.action),
    viewport: [window.innerWidth, window.innerHeight],
    scrollWidth: document.documentElement.scrollWidth,
    text: document.querySelector("#app")?.innerText?.slice(0, 500) || ""
  }))()`);
  return value;
}

async function screenshot(filePath) {
  await new Promise((resolve) => setTimeout(resolve, 650));
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const outputPath = path.join(os.tmpdir(), path.basename(filePath));
  fs.writeFileSync(outputPath, Buffer.from(result.data, "base64"));
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 720,
  deviceScaleFactor: 1,
  mobile: false,
});
await evaluate(`localStorage.clear(); location.reload(); true`);
await new Promise((resolve) => setTimeout(resolve, 300));

const checkpoints = [];
checkpoints.push(await snapshot("landing"));
assert.equal(checkpoints.at(-1).title, "太虚命盘");
assert.ok(checkpoints.at(-1).scrollWidth <= checkpoints.at(-1).viewport[0]);
assert.doesNotMatch(checkpoints.at(-1).text, /Demo|P0|P1|P2|Playable|自动保存|测试/);

await click("new-game");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /凡人仰望仙山/);
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /归尘门/);
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /外门弟子/);
await screenshot("/tmp/taixu-world-intro.png");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileWorldIntro = await snapshot("world-intro-mobile");
assert.ok(mobileWorldIntro.scrollWidth <= mobileWorldIntro.viewport[0]);
await screenshot("/tmp/taixu-world-intro-mobile.png");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await click("to-creator");
await evaluate(`(() => {
  const field = document.querySelector('[data-field="name"]');
  field.value = "沈砚";
  field.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
})()`);
await click("select-origin", "herbalist");
await click("select-appearance", "cinnabar");
await click("to-traits");
assert.equal(await evaluate(`document.querySelectorAll(".trait-group").length`), 3);
await screenshot("/tmp/taixu-opening-traits.png");

const openingChoices = {
  root: "iron_bones",
  talent: "perfect_memory",
  fate: "debt_of_kindness",
};
for (const [group, traitId] of Object.entries(openingChoices)) {
  await clickSelector(`[data-action="select-opening-trait"][data-group="${group}"][data-id="${traitId}"]`);
}
await click("to-birth-sheet");
assert.match(await evaluate(`document.querySelector(".birth-details")?.innerText || ""`), /沈砚/);
assert.match(await evaluate(`document.querySelector(".birth-facts")?.innerText || ""`), /凡身 · 尚未引气/);
await screenshot("/tmp/taixu-character-sheet.png");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileCharacterSheet = await snapshot("character-sheet-mobile");
assert.ok(mobileCharacterSheet.scrollWidth <= mobileCharacterSheet.viewport[0]);
await screenshot("/tmp/taixu-character-sheet-mobile.png");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await click("confirm-character");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /藏经阁西墙传来一声闷响/);
await screenshot("/tmp/taixu-first-event.png");
await click("enter-ancestral-cave", "follow");
await click("wake-reality");
await click("start-sim1");
await click("sim-morning", "well");
await click("sim-eve", "watch");
await click("sim-feast", "feign");

checkpoints.push(await snapshot("death"));
assert.equal(checkpoints.at(-1).mode, "death");
assert.match(checkpoints.at(-1).text, /你不是被毒死的/);
assert.match(checkpoints.at(-1).text, /先天命签/);
await screenshot("/tmp/taixu-death.png");

await click("to-settlement");
checkpoints.push(await snapshot("settlement"));
assert.equal(checkpoints.at(-1).mode, "settlement");
assert.match(checkpoints.at(-1).text, /灵息逆转/);
assert.match(checkpoints.at(-1).text, /酉时换水/);
assert.match(checkpoints.at(-1).text, /命痕/);
await screenshot("/tmp/taixu-settlement.png");

await click("choose-settlement", "certainty");
await click("confirm-settlement");
await click("go-reality-plan");
await click("reality-action", "special");

checkpoints.push(await snapshot("payoff"));
assert.equal(checkpoints.at(-1).mode, "reality");
assert.match(checkpoints.at(-1).text, /预知兑现/);
assert.match(checkpoints.at(-1).text, /家人被囚/);
await screenshot("/tmp/taixu-payoff.png");

await click("start-sim2");
await click("fast-forward-feast");
await click("choose-companion", "wen");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /答应同行/);
await click("to-mine-approach");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /过期确证/);
await click("choose-mine-entry", "drain");
await click("investigate-mine", "bell");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /敌方意图/);
await screenshot("/tmp/taixu-p1-battle-desktop.png");
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
const mobileBattle = await snapshot("battle-mobile");
assert.ok(mobileBattle.scrollWidth <= mobileBattle.viewport[0]);
assert.ok(mobileBattle.actions.includes("battle-action"));
await screenshot("/tmp/taixu-p1-battle-mobile.png");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 720,
  deviceScaleFactor: 1,
  mobile: false,
});
await click("battle-action", "companion");
await click("battle-action", "counter");
await click("battle-action", "strike");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /矿难不是意外，是一次交接/);
await click("resolve-mine", "follow");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /拒绝放弃仍活着的矿工/);
await click("to-p1-reality");
await click("p1-reality-action", "precision");

checkpoints.push(await snapshot("ending"));
assert.match(checkpoints.at(-1).text, /确证会过期/);
assert.match(await evaluate(`document.querySelector(".path-recap")?.innerText || ""`), /本轮路径复盘/);
await screenshot("/tmp/taixu-ending.png");
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
const mobileEnding = await snapshot("ending-mobile");
assert.ok(mobileEnding.scrollWidth <= mobileEnding.viewport[0]);
assert.match(mobileEnding.text, /确证会过期/);
await screenshot("/tmp/taixu-p1-ending-mobile.png");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 720,
  deviceScaleFactor: 1,
  mobile: false,
});

const saved = JSON.parse(await evaluate(`localStorage.getItem("taixu-fateplate-demo-v1")`));
assert.equal(saved.version, 3);
assert.equal(saved.character.name, "沈砚");
assert.equal(saved.reward.type, "certainty");
assert.equal(saved.timeline.feast, "shifted");
assert.equal(saved.timeline.mine, "shifted");
assert.equal(saved.flames, 2);
assert.ok(saved.intel.some((item) => item.status === "stale"));

await evaluate(`location.reload(); true`);
await new Promise((resolve) => setTimeout(resolve, 250));
await click("continue-game");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /路径复盘/);

await click("retry-settlement");
await click("choose-settlement", "trait");
await click("confirm-settlement");
assert.equal(await evaluate(`document.querySelectorAll('[data-action="take-trait"]').length`), 3);
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /候选来自真实行为/);
await screenshot("/tmp/taixu-trait-draw.png");
await clickSelector('[data-action="take-trait"]');
await click("go-reality-plan");
await click("reality-action", "special");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /预知兑现/);
assert.equal(JSON.parse(await evaluate(`localStorage.getItem("taixu-fateplate-demo-v1")`)).reward.type, "trait");
await screenshot("/tmp/taixu-trait-payoff.png");

await click("start-sim2");
await click("fast-forward-feast");
await click("choose-companion", "wen");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /拒绝同行/);
await click("to-mine-approach");
assert.match(await evaluate(`document.querySelector(".synergy-list")?.innerText || ""`), /过目不忘 × 末声入耳/);
await click("choose-mine-entry", "main");
await click("investigate-mine", "rush");
await click("battle-action", "synergy");
await click("battle-action", "strike");
await click("battle-action", "strike");
await click("resolve-mine", "rescue");
await click("to-p1-reality");
await click("p1-reality-action", "force");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /失去了能继续追查的现场/);
await click("retry-settlement");
await click("choose-settlement", "dao");
await click("confirm-settlement");
await click("go-reality-plan");
await click("reality-action", "special");
const daoPayoff = await evaluate(`document.querySelector("#app")?.innerText || ""`);
assert.match(daoPayoff, /灵息逆转|反击|赤纹腰牌/);
assert.equal(JSON.parse(await evaluate(`localStorage.getItem("taixu-fateplate-demo-v1")`)).reward.type, "dao");
await screenshot("/tmp/taixu-dao-payoff.png");
await click("start-sim2");
await click("fast-forward-feast");
await click("choose-companion", "pei");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /答应同行/);
await click("to-mine-approach");
await click("choose-mine-entry", "main");
await click("investigate-mine", "rush");
await click("battle-action", "counter");
await click("battle-action", "strike");
await click("battle-action", "strike");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /膝印先于封脉/);
await click("carry-mine-defeat");
await click("to-p1-reality");
await click("p1-reality-action", "precision");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /凿断膝印/);

const p1V2Save = JSON.parse(await evaluate(`localStorage.getItem("taixu-fateplate-demo-v1")`));
p1V2Save.version = 2;
p1V2Save.screen = "ending";
await evaluate(`localStorage.setItem("taixu-fateplate-demo-v1", ${JSON.stringify(JSON.stringify(p1V2Save))}); location.reload(); true`);
await new Promise((resolve) => setTimeout(resolve, 250));
await click("continue-game");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /四个人分别握着阵图、尸骨、旧档和山外暗线/);

await click("to-build-choice");
await click("choose-build", "seal_breaker");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /现实锚点/);
await click("enter-year1-archive");
await click("archive-action", "accuse");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /现实死亡不会给你结算/);
await click("retry-p2-anchor");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /建宗密库提前封门/);
await click("enter-year1-archive");
await click("archive-action", "audit");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /六十年延寿祭阵/);
await click("advance-year5");
await click("to-year5-crisis");
await screenshot("/tmp/taixu-p2-year5-desktop.png");
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
const mobileYear5 = await snapshot("year5-mobile");
assert.ok(mobileYear5.scrollWidth <= mobileYear5.viewport[0]);
assert.ok(mobileYear5.actions.includes("year5-action"));
await screenshot("/tmp/taixu-p2-year5-mobile.png");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 720,
  deviceScaleFactor: 1,
  mobile: false,
});
await click("year5-action", "ayen");
assert.equal(await evaluate(`document.querySelectorAll(".finale-preview-item.enabled").length`), 3);
await click("face-black-sun");
const finaleBaseSave = await evaluate(`localStorage.getItem("taixu-fateplate-demo-v1")`);

await click("choose-ending", "sever");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /斩祖散门/);
assert.match(await evaluate(`document.querySelector(".final-summary-grid")?.innerText || ""`), /现实断裂 1 次/);
await screenshot("/tmp/taixu-p2-sever-ending.png");
await send("Emulation.setDeviceMetricsOverride", {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
});
const mobileFinal = await snapshot("final-mobile");
assert.ok(mobileFinal.scrollWidth <= mobileFinal.viewport[0]);
assert.match(mobileFinal.text, /太虚七年/);
assert.doesNotMatch(await evaluate(`document.querySelector("#app")?.innerText || ""`), /Demo|P0|P1|P2|Playable|自动保存|测试|构筑|二周目/);
await screenshot("/tmp/taixu-p2-final-mobile.png");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1280,
  height: 720,
  deviceScaleFactor: 1,
  mobile: false,
});

await evaluate(`localStorage.setItem("taixu-fateplate-demo-v1", ${JSON.stringify(finaleBaseSave)}); location.reload(); true`);
await new Promise((resolve) => setTimeout(resolve, 250));
await click("continue-game");
await click("choose-ending", "exile");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /携火离山/);

await evaluate(`localStorage.setItem("taixu-fateplate-demo-v1", ${JSON.stringify(finaleBaseSave)}); location.reload(); true`);
await new Promise((resolve) => setTimeout(resolve, 250));
await click("continue-game");
await click("choose-ending", "seize");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /夺盘续世/);
await click("start-new-cycle");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /黑日命痕/);
await click("begin-cycle-two");
assert.equal(await evaluate(`document.querySelectorAll('[data-action="start-sim1-informed"]').length`), 1);
await click("start-sim1-informed");
assert.match(await evaluate(`document.querySelector("#app")?.innerText || ""`), /晚宴前夜，有人不想让你看见明天/);
assert.deepEqual(pageErrors, []);

process.stdout.write(`${JSON.stringify({ ok: true, checkpoints, saved: {
  name: saved.character.name,
  reward: saved.reward,
  flames: saved.flames,
  envy: saved.envy,
  deviation: saved.deviation,
  timeline: saved.timeline,
} }, null, 2)}\n`);

socket.close();
