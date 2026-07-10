import assert from "node:assert/strict";
import fs from "node:fs";

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

async function screenshot(path) {
  await new Promise((resolve) => setTimeout(resolve, 650));
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(path, Buffer.from(result.data, "base64"));
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

await click("new-game");
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

for (const group of ["root", "talent", "fate"]) {
  await clickSelector(`[data-action="select-opening-trait"][data-group="${group}"]`);
}
await click("to-birth-sheet");
assert.match(await evaluate(`document.querySelector(".birth-details")?.innerText || ""`), /沈砚/);
await click("confirm-character");
await click("wake-reality");
await click("start-sim1");
await click("sim-morning", "well");
await click("sim-eve", "watch");
await click("sim-feast", "feign");

checkpoints.push(await snapshot("death"));
assert.equal(checkpoints.at(-1).mode, "death");
assert.match(checkpoints.at(-1).text, /你不是被毒死的/);
assert.match(checkpoints.at(-1).text, /先天词条触发/);
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
await click("resolve-mine", "touch");

checkpoints.push(await snapshot("ending"));
assert.match(checkpoints.at(-1).text, /你越过了第一种死法/);
assert.match(checkpoints.at(-1).text, /六十年已满/);
await screenshot("/tmp/taixu-ending.png");

const saved = JSON.parse(await evaluate(`localStorage.getItem("taixu-fateplate-demo-v1")`));
assert.equal(saved.character.name, "沈砚");
assert.equal(saved.reward.type, "certainty");
assert.equal(saved.timeline.feast, "shifted");
assert.equal(saved.timeline.mine, "revealed");
assert.equal(saved.flames, 2);

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
await click("choose-companion", "pei");
await click("resolve-mine", "rescue");
await click("retry-settlement");
await click("choose-settlement", "dao");
await click("confirm-settlement");
await click("go-reality-plan");
await click("reality-action", "special");
const daoPayoff = await evaluate(`document.querySelector("#app")?.innerText || ""`);
assert.match(daoPayoff, /灵息逆转|反击|赤纹腰牌/);
assert.equal(JSON.parse(await evaluate(`localStorage.getItem("taixu-fateplate-demo-v1")`)).reward.type, "dao");
await screenshot("/tmp/taixu-dao-payoff.png");
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
