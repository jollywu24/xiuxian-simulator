import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createFirstBattle, createP0State } from "../web/wudao-p0-core.mjs";

const port = Number(process.argv[2] || 9225);
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const tab = tabs.find((item) => item.type === "page" && /^https?:\/\/(127\.0\.0\.1|localhost)/.test(item.url));
if (!tab) throw new Error(`No browser page found on debugging port ${port}`);
const pageOrigin = new URL(tab.url).origin;
const storageId = { securityOrigin: pageOrigin, isLocalStorage: true };

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

async function writeSave(value) {
  await send("DOMStorage.setDOMStorageItem", { storageId, key: "wudao-high-martial-v1", value: JSON.stringify(value) });
}

async function reloadWithSave(value) {
  await writeSave(value);
  await send("Page.reload", { ignoreCache: false });
  await new Promise((resolve) => setTimeout(resolve, 250));
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
    sceneId: document.querySelector("[data-scene-id]")?.dataset.sceneId || "",
    hotspotCount: document.querySelectorAll(".scene-hotspot").length,
    actorLabels: [...document.querySelectorAll(".scene-actor .scene-marker-label")].map((item) => item.textContent.trim()),
    routeNodeCount: document.querySelectorAll(".route-node").length,
    dockCount: document.querySelectorAll(".dock-drawer").length,
    splitView: (() => {
      const stage = document.querySelector(".scene-experience")?.getBoundingClientRect();
      const narrative = document.querySelector(".narrative-deck")?.getBoundingClientRect();
      return Boolean(stage && narrative && Math.abs(stage.top - narrative.top) < 8 && narrative.left >= stage.right - 2);
    })(),
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
const desktopTasks = await snapshot("temple-tasks-desktop");
assert.equal(desktopTasks.dockCount, 2);
assert.equal(desktopTasks.splitView, true);
await screenshot("wudao-temple-encounters-desktop.png");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileTasks = await snapshot("temple-tasks-mobile");
assert.ok(mobileTasks.scrollWidth <= 390);
assert.equal(mobileTasks.sceneId, "ruined_temple");
assert.ok(mobileTasks.hotspotCount >= 4);
assert.ok(mobileTasks.routeNodeCount >= 2);
assert.equal(mobileTasks.splitView, false);
await screenshot("wudao-temple-encounters-mobile.png");
await send("Emulation.setDeviceMetricsOverride", { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
const landscapeTasks = await snapshot("temple-tasks-landscape");
assert.ok(landscapeTasks.scrollWidth <= 844);
assert.equal(landscapeTasks.splitView, true);
assert.equal(landscapeTasks.dockCount, 2);
assert.equal(await evaluate(`(() => { const drawer = document.querySelector(".character-panel"); drawer.querySelector("summary").click(); return drawer.open; })()`), true);
await evaluate(`document.querySelector(".timeline-panel summary").click()`);
assert.equal(await evaluate(`document.querySelector(".timeline-panel").open && !document.querySelector(".character-panel").open`), true);
await screenshot("wudao-temple-encounters-landscape.png");
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
assert.deepEqual(mobileLady.actorLabels, ["青衣妇人"]);
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
const roadVisual = await snapshot("road-visual");
assert.equal(roadVisual.sceneId, "purple_gold_river");
assert.ok(roadVisual.routeNodeCount >= 4);
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
assert.equal((await snapshot("shen-side-gate")).sceneId, "shen_side_gate");
await click("present-shen-token");
assert.equal(await evaluate(`document.querySelectorAll(".quest-card").length`), 4);
assert.match(await text(), /外院护卫/);
assert.match(await text(), /不可领/);
await click("accept-danroom-job");
assert.match(await text(), /曹医师/);
assert.match(await text(), /五名药童/);
assert.equal((await snapshot("shen-danroom")).sceneId, "shen_danroom");
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

const preP0StoredItems = await send("DOMStorage.getDOMStorageItems", { storageId });
const preP0Entry = preP0StoredItems.entries.find(([key]) => key === "wudao-high-martial-v1");
if (!preP0Entry) throw new Error("Missing save before version 3 migration check");
const versionThreeSave = JSON.parse(preP0Entry[1]);
versionThreeSave.version = 3;
delete versionThreeSave.p0;
await reloadWithSave(versionThreeSave);
assert.match(await text(), /六枚下品回春丹/);
assert.ok(await evaluate(`Boolean(document.querySelector('[data-action="start-p0-journey"]'))`));

await click("start-p0-journey");
assert.match(await text(), /三夫人白栀云练功后昏厥/);
assert.match(await text(), /病势\s*四刻/);
const mobileSummons = await snapshot("third-lady-summons-mobile");
assert.ok(mobileSummons.scrollWidth <= 390);
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

await click("third-lady-summons", "accept");
assert.match(await text(), /尚无定论/);
assert.equal(await evaluate(`document.querySelector('[data-action="conclude-third-lady"]').disabled`), true);
await click("diagnose-third-lady", "observe");
await click("diagnose-third-lady", "pulse");
assert.match(await text(), /经脉逆行/);
assert.match(await text(), /呼吸与脉搏并不同步/);
assert.equal(await evaluate(`document.querySelector('[data-action="conclude-third-lady"]').disabled`), false);
await click("conclude-third-lady");
assert.match(await text(), /紫龙换血丹/);
assert.equal(await evaluate(`document.querySelectorAll('[data-action="choose-ingredient-source"]:not(:disabled)').length`), 3);
await click("choose-ingredient-source", "cao");
await click("brew-purple-dragon", "strict");
assert.match(await text(), /药性稳定/);
await click("treat-third-lady", "seal_then_pill");
assert.match(await text(), /经脉归位，气息渐稳/);
assert.match(await text(), /情分 30 · 信任 35 · 人情债 40/);
await click("receive-spring-needles");
assert.match(await text(), /当前运用\s*春风化雨针/);
assert.equal(await evaluate(`document.querySelector('[data-action="first-battle-action"][data-value="reckless"]')`), null);
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileBattle = await snapshot("first-battle-mobile");
assert.ok(mobileBattle.scrollWidth <= 390);
assert.match(mobileBattle.text, /稳妥 · 悟性/);
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await click("first-battle-action", "observe");
assert.match(await text(), /左袖短刃才是真正杀招/);
assert.match(await text(), /胜算：?稳妥|稳妥 · 悟性/);
await click("first-battle-action", "kill");
assert.match(await text(), /第一条人命/);
await click("read-night-trace");
assert.match(await text(), /左袖夹层|尸身左袖/);
assert.equal(await evaluate(`document.querySelectorAll('[data-action="assailant-trace"]').length`), 2);
await click("assailant-trace", "search_sleeves");
assert.match(await text(), /鱼鳞铜签/);
assert.match(await text(), /四项条件已经齐备/);
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileCounterplan = await snapshot("assailant-counterplan-mobile");
assert.ok(mobileCounterplan.scrollWidth <= 390);
assert.match(mobileCounterplan.text, /照暗语送出“药已回炉”/);
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await click("assailant-counterplan", "send_false_report");
assert.match(await text(), /假消息已经沿旧路送出/);
await click("finish-assailant-plot");
assert.match(await text(), /回报渠道暂时为你所用/);
await click("apprenticeship-choice", "accept");
assert.match(await text(), /神农枯木桩/);
assert.match(await text(), /沧澜定海桩/);
await click("choose-stake", "sea_stilling_stake");
await click("train-stake");
assert.match(await text(), /一次真正的生死见闻\s*已具备/);
assert.equal(await evaluate(`document.querySelector('[data-action="body-breakthrough"][data-value="force"]')`), null);
await click("body-breakthrough", "steady");
assert.match(await text(), /锻体一重/);
await click("prepare-mid-autumn");
assert.match(await text(), /从金陵东门到破庙，有四种走法/);
await click("mid-autumn-travel", "water");
assert.match(await text(), /定海桩让你从夜水上岸后仍气息平稳/);
await click("follow-offering");
assert.match(await text(), /缺耳老猴/);
await click("monkey-test", "share_peach");
await click("monkey-wine", "share");
assert.match(await text(), /神猿残势/);
await click("ape-legacy", "observe");
assert.match(await text(), /破庙不再只是你活过第一夜的地方/);
assert.match(await text(), /白栀云脱险/);
assert.match(await text(), /第一次杀人/);
assert.match(await text(), /锻体一重/);
assert.match(await text(), /神猿残势/);
assert.doesNotMatch(await text(), /现实|论坛|武道局|其他玩家|其它玩家|太虚命盘|归尘门|黑日|Demo|P0|P1|P2|测试|原型/);
await screenshot("wudao-p0-ending-desktop.png");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileP0Ending = await snapshot("p0-ending-mobile");
assert.ok(mobileP0Ending.scrollWidth <= 390);
await screenshot("wudao-p0-ending-mobile.png");

const storedItems = await send("DOMStorage.getDOMStorageItems", { storageId: { securityOrigin: pageOrigin, isLocalStorage: true } });
const savedEntry = storedItems.entries.find(([key]) => key === "wudao-high-martial-v1");
if (!savedEntry) throw new Error("Missing local save after complete flow");
const saved = JSON.parse(savedEntry[1]);
assert.equal(saved.backgroundId, "mystery");
assert.equal(saved.vowId, "path");
assert.equal(saved.version, 5);
assert.equal(saved.lives, 1);
assert.equal(saved.potential, 1209);
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
assert.equal(saved.martialStage, "body");
assert.deepEqual(saved.skills, ["five_animal_play", "fishing_rod_method", "spring_rain_needles", "sea_stilling_stake", "ape_legacy_clue"]);
assert.equal(saved.p0.complete, true);
assert.equal(saved.p0.treatmentOutcome, "saved");
assert.equal(saved.p0.battleOutcome, "killed");
assert.equal(saved.p0.assailantPlot.outcome, "false_report");
assert.ok(saved.p0.evidence.includes("assailant_channel_controlled"));
assert.equal(saved.p0.activeMartial.technique, "spring_rain_needles");
assert.equal(saved.p0.activeMartial.stance, "sea_stilling_stake");
assert.equal(saved.p0.stakeId, "sea_stilling_stake");
assert.equal(saved.p0.bodyProgress, 1);
assert.equal(saved.p0.travelOutcome, "on_time_fresh");
assert.equal(saved.p0.monkeyOutcome, "friend");
assert.equal(saved.p0.legacyOutcome, "observed");
assert.equal(saved.p0.items.monkey_wine, 1);

const versionFourSave = structuredClone(saved);
versionFourSave.version = 4;
delete versionFourSave.p0.activeMartial;
delete versionFourSave.p0.battleHistory;
delete versionFourSave.p0.deathRecords;
delete versionFourSave.p0.assailantPlot;
await reloadWithSave(versionFourSave);
assert.match(await text(), /破庙不再只是你活过第一夜的地方/);
assert.match(await text(), /死劫履历\s*0 次/);

const treatmentFailureSave = structuredClone(saved);
treatmentFailureSave.screen = "thirdLadyTreatment";
treatmentFailureSave.lives = 2;
treatmentFailureSave.p0 = createP0State();
treatmentFailureSave.p0.started = true;
treatmentFailureSave.p0.node = "third_lady_treatment";
treatmentFailureSave.p0.pillQuality = "volatile";
treatmentFailureSave.p0.items.purple_dragon_blood_pill = 1;
await reloadWithSave(treatmentFailureSave);
await click("treat-third-lady", "pill_direct");
assert.match(await text(), /换血没有救回帘后之人/);

const deathBranchSave = structuredClone(saved);
deathBranchSave.screen = "firstNeedleAmbush";
deathBranchSave.lives = 2;
deathBranchSave.p0 = createP0State();
deathBranchSave.p0.started = true;
deathBranchSave.p0.node = "first_needle_ambush";
deathBranchSave.p0.items.spring_rain_needles = 1;
deathBranchSave.p0.skills.spring_rain_needles = { stage: "learned", progress: 0 };
deathBranchSave.p0.battle = createFirstBattle();
deathBranchSave.p0.checkpoint = structuredClone(deathBranchSave.p0);
await reloadWithSave(deathBranchSave);
await click("first-battle-action", "reckless");
assert.match(await text(), /东门长街 · 死劫履历/);
assert.match(await text(), /左袖/);
await click("return-p0-death");
assert.match(await text(), /蒙面刀客/);
assert.equal(await evaluate(`document.querySelector('[data-action="first-battle-action"][data-value="reckless"]')`), null);

const abandonedTraceSave = structuredClone(saved);
abandonedTraceSave.screen = "firstKillAftermath";
abandonedTraceSave.p0 = createP0State();
abandonedTraceSave.p0.started = true;
abandonedTraceSave.p0.node = "first_kill_aftermath";
abandonedTraceSave.p0.battleOutcome = "killed";
await reloadWithSave(abandonedTraceSave);
await click("read-night-trace");
await click("assailant-trace", "leave_trace");
assert.match(await text(), /保全自身，放弃追查/);
await click("finish-assailant-plot");
assert.match(await text(), /曹青听完夜战/);

for (const branch of [
  { stakeId: "deadwood_stake", action: "root_and_endure", expected: /枯木桩护住气血.*肩背轻伤/ },
  { stakeId: "sea_stilling_stake", action: "anchor_and_withdraw", expected: /定海桩让你在湿坡上稳步退开，没有受伤/ },
]) {
  const conflictSave = structuredClone(saved);
  conflictSave.screen = "monkeyConflict";
  conflictSave.p0 = createP0State();
  conflictSave.p0.started = true;
  conflictSave.p0.node = "monkey_conflict";
  conflictSave.p0.stakeId = branch.stakeId;
  conflictSave.p0.monkeyOutcome = "hostile";
  await reloadWithSave(conflictSave);
  await click("monkey-conflict", branch.action);
  assert.match(await text(), branch.expected);
}

const lateTravelSave = structuredClone(saved);
lateTravelSave.screen = "midAutumnDeparture";
lateTravelSave.p0 = createP0State();
lateTravelSave.p0.started = true;
lateTravelSave.p0.node = "mid_autumn_departure";
lateTravelSave.p0.stakeId = "sea_stilling_stake";
await reloadWithSave(lateTravelSave);
await click("mid-autumn-travel", "road");
assert.match(await text(), /破庙供桌只剩干涸桃汁/);

await reloadWithSave(saved);

await send("Page.reload", { ignoreCache: false });
await new Promise((resolve) => setTimeout(resolve, 250));
assert.match(await text(), /白栀云脱险/);
assert.match(await text(), /神猿残势/);
assert.match(await text(), /锻体一重/);
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
