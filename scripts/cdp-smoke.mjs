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
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || "Page evaluation failed");
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

async function text() {
  return evaluate(`document.querySelector("#app")?.innerText || ""`);
}

async function snapshot(label) {
  return evaluate(`(() => ({
    label: ${JSON.stringify(label)},
    mode: document.body.dataset.mode,
    title: document.querySelector("h1")?.textContent?.trim() || "",
    viewport: [innerWidth, innerHeight],
    scrollWidth: document.documentElement.scrollWidth,
    actions: [...document.querySelectorAll("[data-action]")].map((item) => [item.dataset.action, item.dataset.value]),
    text: document.querySelector("#app")?.innerText?.slice(0, 600) || ""
  }))()`);
}

async function screenshot(name) {
  await new Promise((resolve) => setTimeout(resolve, 350));
  const result = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(path.join(os.tmpdir(), name), Buffer.from(result.data, "base64"));
}

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await evaluate(`localStorage.clear(); location.reload(); true`);
await new Promise((resolve) => setTimeout(resolve, 300));

const checkpoints = [];
checkpoints.push(await snapshot("landing"));
assert.equal(checkpoints.at(-1).title, "武道");
assert.ok(checkpoints.at(-1).scrollWidth <= 1280);
assert.doesNotMatch(checkpoints.at(-1).text, /太虚命盘|归尘门|黑日|Demo|P0|P1|P2|测试|原型/);

await click("new-game");
assert.match(await text(), /江海大学男生宿舍/);
assert.match(await text(), /陈玄/);
await screenshot("wudao-reality-intro-desktop.png");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileIntro = await snapshot("intro-mobile");
assert.ok(mobileIntro.scrollWidth <= 390);
await screenshot("wudao-reality-intro-mobile.png");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

await click("enter-creation");
await click("select-background", "mystery");
assert.match(await text(), /半块玉佩/);
await click("to-vow");
await click("select-vow", "path");
await click("reveal-destiny");
assert.match(await text(), /逆天改命/);
assert.match(await text(), /五维基础属性全部归零/);
await click("confirm-destiny");
assert.match(await text(), /陈司命/);
assert.match(await text(), /可用命数/);
await screenshot("wudao-character-sheet.png");

await click("start-wudao");
assert.match(await text(), /你是被冷醒的/);
await click("search-fire");
await click("use-destiny");
await click("allocate-jade", "strength");
await click("confirm-allocation");
assert.equal(await evaluate(`document.querySelectorAll(".quest-card").length`), 3);
assert.match(await text(), /旅人遗物/);
assert.match(await text(), /沈氏承诺/);
assert.match(await text(), /神秘贡品/);
await screenshot("wudao-temple-encounters-desktop.png");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileTasks = await snapshot("temple-tasks-mobile");
assert.ok(mobileTasks.scrollWidth <= 390);
await screenshot("wudao-temple-encounters-mobile.png");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await click("temple-task", "traveler_relic");
await click("temple-task", "shen_promise");
assert.match(await text(), /金陵东郊残图/);
assert.match(await text(), /沈字铜钱/);
await click("leave-temple");

assert.match(await text(), /初始只有两条命/);
assert.match(await text(), /武道局/);
await click("forum-plan", "hide");
const ladyBeforeReveal = await text();
assert.match(ladyBeforeReveal, /青衣妇人/);
assert.doesNotMatch(ladyBeforeReveal, /龙青鱼|漕帮帮主夫人/);
await screenshot("wudao-lady-arrival-desktop.png");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileLady = await snapshot("lady-mobile");
assert.ok(mobileLady.scrollWidth <= 390);
await screenshot("wudao-lady-arrival-mobile.png");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

await click("lady-choice", "retort");
assert.equal((await snapshot("death")).mode, "death");
assert.match(await text(), /剩余命数/);
assert.match(await text(), /1/);
await click("return-after-death");
await click("lady-choice", "deny_beggar");
await click("lady-pressure", "yield");
await click("lady-test", "refuse");
assert.match(await text(), /陆连山/);
await click("night-talk", "sincere");
assert.match(await text(), /漕帮帮主夫人/);
assert.match(await text(), /龙青鱼/);
assert.match(await text(), /莫逆之交/);
assert.match(await text(), /鱼跃龙门诀/);
await screenshot("wudao-encounter-reward.png");

await click("receive-mind-art");
assert.equal(await evaluate(`document.querySelectorAll(".mind-art-card li").length`), 3);
await click("close-wudao");
assert.match(await text(), /现实同步成立/);
await click("confirm-sync");
assert.match(await text(), /于可心/);
assert.match(await text(), /林毅/);
await click("bureau-choice", "conceal");

checkpoints.push(await snapshot("ending"));
assert.match(checkpoints.at(-1).text, /只登记鱼跃龙门诀/);
assert.match(await text(), /丹房差事/);
assert.match(await text(), /神秘贡品/);
assert.match(await text(), /与龙青鱼重逢/);
assert.doesNotMatch(await text(), /太虚命盘|归尘门|黑日|Demo|P0|P1|P2|测试|原型/);
await screenshot("wudao-ending-desktop.png");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileEnding = await snapshot("ending-mobile");
assert.ok(mobileEnding.scrollWidth <= 390);
await screenshot("wudao-ending-mobile.png");

const saved = JSON.parse(await evaluate(`localStorage.getItem("wudao-novel-route-v1")`));
assert.equal(saved.backgroundId, "mystery");
assert.equal(saved.vowId, "path");
assert.equal(saved.lives, 1);
assert.equal(saved.potential, 1600);
assert.equal(saved.relationship, "莫逆之交");
assert.equal(saved.mindArt, "carp_dragon_gate");
assert.equal(saved.realitySynced, true);
assert.equal(saved.bureauChoice, "conceal");

await evaluate(`location.reload(); true`);
await new Promise((resolve) => setTimeout(resolve, 250));
assert.match(await text(), /只登记鱼跃龙门诀/);
assert.deepEqual(pageErrors, []);

process.stdout.write(`${JSON.stringify({ ok: true, checkpoints, saved: {
  background: saved.backgroundId,
  vow: saved.vowId,
  lives: saved.lives,
  potential: saved.potential,
  relationship: saved.relationship,
  mindArt: saved.mindArt,
  bureau: saved.bureauChoice,
} }, null, 2)}\n`);

socket.close();
