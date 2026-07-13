import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const port = Number(process.argv[2] || 9225);
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const tab = tabs.find((item) => item.type === "page" && /^https?:\/\/(127\.0\.0\.1|localhost)/.test(item.url));
if (!tab) throw new Error(`No browser page found on debugging port ${port}`);
const pageOrigin = new URL(tab.url).origin;

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
await send("DOMStorage.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send("Storage.clearDataForOrigin", { origin: pageOrigin, storageTypes: "local_storage" });
await send("Page.reload", { ignoreCache: true });
await new Promise((resolve) => setTimeout(resolve, 300));

const checkpoints = [];
checkpoints.push(await snapshot("landing"));
assert.equal(checkpoints.at(-1).title, "武道");
assert.ok(checkpoints.at(-1).scrollWidth <= 1280);
assert.match(checkpoints.at(-1).text, /大曜四百二十七年/);
assert.doesNotMatch(checkpoints.at(-1).text, /现实|论坛|武道局|其他玩家|其它玩家|太虚命盘|归尘门|黑日|Demo|P0|P1|P2|测试|原型/);

await click("new-journey");
assert.match(await text(), /大曜天下/);
assert.match(await text(), /门派、世家与帮会|山门传武/);
assert.match(await text(), /宗师/);
assert.doesNotMatch(await text(), /现实|论坛|武道局|其他玩家|其它玩家/);
await screenshot("wudao-world-intro-desktop.png");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileIntro = await snapshot("intro-mobile");
assert.ok(mobileIntro.scrollWidth <= 390);
await screenshot("wudao-world-intro-mobile.png");
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
assert.match(await text(), /两灯皆灭，此生终结/);
assert.match(await text(), /未入门/);
await screenshot("wudao-character-sheet.png");

await click("start-journey");
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
await click("meet-lady");

const ladyBeforeReveal = await text();
assert.match(ladyBeforeReveal, /青衣妇人/);
assert.doesNotMatch(ladyBeforeReveal, /龙青鱼|漕帮帮主夫人/);
assert.doesNotMatch(ladyBeforeReveal, /现实|论坛|武道局|其他玩家|其它玩家/);
await screenshot("wudao-lady-arrival-desktop.png");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileLady = await snapshot("lady-mobile");
assert.ok(mobileLady.scrollWidth <= 390);
await screenshot("wudao-lady-arrival-mobile.png");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

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
await click("to-road-trial");
assert.match(await text(), /紫金河/);
await click("road-trial", "dive");
assert.match(await text(), /顺紫金河|东湖/);
assert.match(await text(), /缩短路程/);
await click("continue-road");

checkpoints.push(await snapshot("ending"));
assert.match(checkpoints.at(-1).text, /第一夜之后/);
assert.match(await text(), /沈字铜钱/);
assert.match(await text(), /神秘贡品/);
assert.match(await text(), /临安/);
assert.doesNotMatch(await text(), /现实|论坛|武道局|其他玩家|其它玩家|太虚命盘|归尘门|黑日|Demo|P0|P1|P2|测试|原型/);
await click("choose-route", "shen");
assert.match(await text(), /下一程已定/);
await screenshot("wudao-ending-desktop.png");

await click("start-shen-chapter");
assert.match(await text(), /东湖岸/);
assert.match(await text(), /老太爷留下的一次承诺/);
await click("present-shen-token");
assert.equal(await evaluate(`document.querySelectorAll(".quest-card").length`), 4);
assert.match(await text(), /外院护卫/);
assert.match(await text(), /不可领/);
await click("accept-danroom-job");
assert.match(await text(), /曹医师/);
assert.match(await text(), /五名药童/);
await click("inspect-cao-fate");
assert.match(await text(), /庞不凡/);
assert.match(await text(), /药王叛徒/);
assert.match(await text(), /血灵丹经/);
await click("face-blood-demand");
assert.equal(await evaluate(`document.querySelector('[data-action="blood-choice"][data-value="fight"]').disabled`), false);
await click("blood-choice", "comply");
assert.match(await text(), /继续观看/);
await click("reallocate-insight");
assert.match(await text(), /当前悟性\s*3/);
await click("observation-choice", "watch");
await click("cao-answer", "fire:strong_slow_strong");
await click("cao-answer", "ingredients:recite_order");
await click("cao-answer", "motive:survive");
assert.match(await text(), /虎口求生/);
assert.match(await text(), /青青册/);
assert.match(await text(), /曹青好感 20/);
await screenshot("wudao-shen-qingqing-desktop.png");
await click("study-qingqing");
assert.match(await text(), /医术入门/);
await click("take-qingqing-test");
assert.match(await text(), /五禽戏/);
assert.match(await text(), /尚未突破/);
await click("begin-shen-cycle");
assert.match(await text(), /剩余时段/);
assert.equal(await evaluate(`document.querySelectorAll('[data-action="shen-daily-action"]').length`), 5);
assert.match(await text(), /医术一、悟性三、潜能五百方可入门/);
await click("breakthrough-five-animals");
assert.equal(await evaluate(`document.querySelectorAll('[data-action="choose-five-aspect"]').length`), 5);
await click("choose-five-aspect", "ape");
assert.match(await text(), /猿戏初成/);
await click("shen-daily-action", "qingqing");
await click("shen-daily-action", "five_animals");
await click("shen-daily-action", "observe");
assert.equal((await snapshot("daily-death")).mode, "death");
assert.match(await text(), /剩余命灯\s*1/);
await click("return-shen-death");
assert.match(await text(), /医术一、悟性三、潜能五百方可入门/);
assert.match(await text(), /潜能\s*1695/);
await click("breakthrough-five-animals");
await click("choose-five-aspect", "ape");
await click("shen-daily-action", "qingqing");
await click("shen-daily-action", "five_animals");
assert.equal(await evaluate(`document.querySelector('[data-action="shen-daily-action"][data-value="qingqing"]').disabled`), true);
await click("shen-daily-action", "meal");
assert.match(await text(), /剩余时段\s*0/);
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileDaily = await snapshot("shen-daily-mobile");
assert.ok(mobileDaily.scrollWidth <= 390);
await screenshot("wudao-shen-daily-mobile.png");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await click("close-first-day");
assert.match(await text(), /金龙会四堂回岛/);
assert.match(await text(), /百舸争流大典/);
await click("leave-shen-meeting");
await click("shenfu-choice", "report");
assert.match(await text(), /曹青好感\s*39/);
assert.match(await text(), /沈福门路/);
await click("enter-pharmacy-day");
await click("breakthrough-medicine");
assert.match(await text(), /医术二级/);
await click("take-herb-errand");
assert.match(await text(), /钓鱼时机/);
await click("start-fishing-prep");
assert.equal(await evaluate(`document.querySelectorAll('[data-action="fishing-prep"]').length`), 4);
await click("fishing-prep", "worms");
await click("fishing-prep", "rod");
await click("fishing-prep", "fishing_skill");
await click("fishing-prep", "bait");
assert.match(await text(), /条件齐备/);
await screenshot("wudao-fishing-conditions-desktop.png");
await click("enter-purple-river");
await click("cast-first-line");
assert.match(await text(), /普通鲫鱼/);
await click("river-catch-choice", "release");
assert.match(await text(), /摆渡老翁/);
await click("wait-for-treasure");
await click("reallocate-fortune");
await click("cast-treasure-line");
assert.match(await text(), /黄金钱鳘/);
await click("treasure-fish-choice", "follow");
await click("share-treasure-fish", "share");
assert.match(await text(), /王五好感\s*60/);
await click("reallocate-strength");
await click("learn-fishing-rod");
assert.match(await text(), /曹青还在灯下等你/);
await click("cao-return-choice", "truth");
assert.match(await text(), /曹青好感\s*41/);
await click("accept-cao-guidance");
assert.match(await text(), /当前有效悟性/);
await click("reallocate-alchemy-insight");
assert.match(await text(), /天资聪颖/);
await click("learn-return-spring");
assert.match(await text(), /第一炉回春丹/);
await click("first-alchemy", "rush");
assert.match(await text(), /这一炉没有成丹/);
assert.match(await text(), /烧坏药材\s*1/);
await click("retry-alchemy");
await click("first-alchemy", "replay");
assert.match(await text(), /六枚下品回春丹/);
assert.match(await text(), /打鱼杆法/);
assert.match(await text(), /百丹注解/);
assert.doesNotMatch(await text(), /现实|论坛|武道局|其他玩家|其它玩家|太虚命盘|归尘门|黑日|Demo|P0|P1|P2|测试|原型/);
await screenshot("wudao-shen-ending-desktop.png");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileEnding = await snapshot("shen-ending-mobile");
assert.ok(mobileEnding.scrollWidth <= 390);
await screenshot("wudao-shen-ending-mobile.png");

const storedItems = await send("DOMStorage.getDOMStorageItems", { storageId: { securityOrigin: pageOrigin, isLocalStorage: true } });
const savedEntry = storedItems.entries.find(([key]) => key === "wudao-high-martial-v1");
if (!savedEntry) throw new Error("Missing local save after complete flow");
const saved = JSON.parse(savedEntry[1]);
assert.equal(saved.backgroundId, "mystery");
assert.equal(saved.vowId, "path");
assert.equal(saved.lives, 1);
assert.equal(saved.potential, 1529);
assert.equal(saved.relationship, "莫逆之交");
assert.equal(saved.mindArt, "carp_dragon_gate");
assert.equal(saved.roadTrial, "dive");
assert.equal(saved.nextRoute, "shen");
assert.equal(saved.shenChapterComplete, true);
assert.equal(saved.shenOutcome, "first_alchemy");
assert.equal(saved.caoFavor, 49);
assert.equal(saved.alchemyProgress, 12);
assert.equal(saved.alchemyLevel, 2);
assert.equal(saved.alchemyPills, 6);
assert.equal(saved.alchemyFailures, 1);
assert.equal(saved.medicalLevel, 2);
assert.equal(saved.qingQingStudied, true);
assert.equal(saved.fiveAnimalBook, true);
assert.equal(saved.fiveAnimalLevel, 1);
assert.equal(saved.fiveAnimalProgress, 30);
assert.equal(saved.fiveAnimalAspect, "ape");
assert.equal(saved.treasureFishCaught, true);
assert.equal(saved.treasureFishShared, true);
assert.equal(saved.wangFavor, 60);
assert.equal(saved.fishingRodMethod, true);
assert.equal(saved.attributes.insight, 5);
assert.equal(saved.attributes.constitution, -1);
assert.equal(saved.martialStage, "mortal");
assert.deepEqual(saved.skills, ["five_animal_play", "fishing_rod_method"]);

await send("Page.reload", { ignoreCache: false });
await new Promise((resolve) => setTimeout(resolve, 250));
assert.match(await text(), /曹青好感/);
assert.match(await text(), /五禽戏/);
assert.match(await text(), /六枚下品回春丹/);
assert.deepEqual(pageErrors, []);

process.stdout.write(`${JSON.stringify({ ok: true, checkpoints, saved: {
  background: saved.backgroundId,
  vow: saved.vowId,
  lives: saved.lives,
  potential: saved.potential,
  relationship: saved.relationship,
  mindArt: saved.mindArt,
  roadTrial: saved.roadTrial,
  nextRoute: saved.nextRoute,
  shenOutcome: saved.shenOutcome,
  caoFavor: saved.caoFavor,
  martialStage: saved.martialStage,
} }, null, 2)}\n`);

socket.close();
