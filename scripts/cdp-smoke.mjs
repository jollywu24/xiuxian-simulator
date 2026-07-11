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
  const request = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || "Evaluation failed");
  return result.result.value;
}

async function click(action, value = null) {
  const selector = value === null ? `[data-action="${action}"]` : `[data-action="${action}"][data-value="${value}"]`;
  return evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error(${JSON.stringify(`Missing ${selector}`)}); if (el.disabled) throw new Error(${JSON.stringify(`Disabled ${selector}`)}); el.click(); return document.querySelector("h1")?.textContent || ""; })()`);
}

async function snapshot() {
  return evaluate(`(() => ({ title: document.querySelector("h1")?.textContent?.trim() || "", mode: document.body.dataset.mode, text: document.querySelector("#app")?.innerText || "", width: innerWidth, scrollWidth: document.documentElement.scrollWidth }))()`);
}

async function screenshot(name) {
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(path.join(os.tmpdir(), name), Buffer.from(result.data, "base64"));
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await evaluate(`localStorage.clear(); location.reload(); true`);
await new Promise((resolve) => setTimeout(resolve, 250));

let view = await snapshot();
assert.equal(view.title, "太虚命盘");
assert.ok(view.scrollWidth <= view.width);

await click("new-game");
await click("choose-thesis", "poison_source");
await click("start-trial");
await click("trial-action", "taste");
await click("choose-feast", "feign");
view = await snapshot();
assert.equal(view.mode, "death");
assert.match(view.text, /命题结论/);
assert.match(view.text, /记忆自动保留/);
const deathStyles = await evaluate(`(() => ({
  bodyColor: getComputedStyle(document.body).color,
  bodyBackground: getComputedStyle(document.body).backgroundColor,
  titleColor: getComputedStyle(document.querySelector(".scene-title")).color,
  panelBackground: getComputedStyle(document.querySelector(".scene-panel")).backgroundColor
}))()`);
assert.equal(deathStyles.bodyColor, "rgb(234, 223, 218)");
assert.equal(deathStyles.bodyBackground, "rgb(22, 15, 16)");
assert.equal(deathStyles.titleColor, deathStyles.bodyColor);
await screenshot("taixu-p0-death.png");

await click("to-settlement");
view = await snapshot();
assert.equal(view.mode, "settlement");
assert.match(view.text, /固命/);
assert.match(view.text, /化劫/);
assert.doesNotMatch(view.text, /确证 ·/);
await screenshot("taixu-p0-settlement.png");
await click("take-fixed", "poison_delay");

await click("prepare", "well_access");
await click("prepare", "trusted_partner");
view = await snapshot();
assert.match(view.text, /命途条件板/);
assert.match(view.text, /单向前世关系/);
assert.match(view.text, /未满足 · 看懂补刀名单/);
await screenshot("taixu-p0-fate-board.png");

await click("choose-thesis", "kill_list");
await click("start-trial");
await click("trial-action", "roster");
await click("choose-feast", "feign");
await click("to-settlement");
await click("open-marks");
await click("take-mark", "crisis_gaze");

view = await snapshot();
assert.match(view.text, /条件已齐/);
await click("execute-path", "feign");
view = await snapshot();
assert.match(view.text, /接管灭口链/);
assert.match(view.text, /残灯已净/);
assert.match(view.text, /借劫/);
await screenshot("taixu-p0-borrow-calamity.png");

await click("to-takeover");
view = await snapshot();
assert.match(view.text, /祭阵只能收割被宗门正式承认身份的人/);
await click("takeover-plan", "expose");
await click("finish", "anchor");

view = await snapshot();
assert.match(view.text, /P0 纵向切片完成/);
assert.match(view.text, /驭劫/);
assert.match(view.text, /全部保留/);
await screenshot("taixu-p0-final.png");

const saved = JSON.parse(await evaluate(`localStorage.getItem("taixu-fateplate-demo-v2")`));
assert.equal(saved.version, 4);
assert.equal(saved.mastery, 5);
assert.equal(saved.anchorEstablished, true);
assert.equal(saved.simulationCount, 2);
assert.equal(saved.flames, 0);
assert.ok(saved.memories.some((item) => item.id === "kill_list"));
assert.ok(saved.memories.some((item) => item.id === "enemy_contact"));

await evaluate(`location.reload(); true`);
await new Promise((resolve) => setTimeout(resolve, 200));
assert.match((await snapshot()).text, /P0 纵向切片完成/);

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await evaluate(`location.reload(); true`);
await new Promise((resolve) => setTimeout(resolve, 200));
view = await snapshot();
assert.ok(view.scrollWidth <= view.width);
assert.match(view.text, /本轮命途/);
await screenshot("taixu-p0-final-mobile.png");

assert.deepEqual(pageErrors, []);
socket.close();
console.log("CDP smoke passed: proposition → death → fixed fate → proposition → fate mark → takeover → anchor");
