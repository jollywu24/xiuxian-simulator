import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createP0State } from "../web/wudao-p0-core.mjs";

const port = Number(process.argv[2] || 9225);
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const tab = tabs.find((item) => item.type === "page" && /^https?:\/\/(127\.0\.0\.1|localhost)/.test(item.url));
if (!tab) throw new Error(`No browser page found on debugging port ${port}`);
const pageOrigin = new URL(tab.url).origin;
const testUrl = `${pageOrigin}/?seed=seed-2`;
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
    scrollHeight: document.documentElement.scrollHeight,
    sceneId: document.querySelector("[data-scene-id]")?.dataset.sceneId || "",
    hotspotCount: document.querySelectorAll(".scene-hotspot").length,
    sceneInspection: (() => {
      const shell = document.querySelector(".world-stage-shell")?.getBoundingClientRect();
      const stage = document.querySelector(".scene-experience")?.getBoundingClientRect();
      const panel = document.querySelector("[data-scene-inspection]");
      const rect = panel?.getBoundingClientRect();
      const line = document.querySelector("[data-scene-inspection-line]");
      return {
        visible: Boolean(panel?.classList.contains("is-visible")),
        text: panel?.innerText?.trim() || "",
        selectedId: document.querySelector(".scene-hotspot.selected")?.dataset.value || "",
        lineVisible: Boolean(line?.classList.contains("is-visible")),
        withinScene: Boolean(stage && rect && rect.left >= stage.left - 1 && rect.right <= stage.right + 1 && rect.top >= stage.top - 1 && rect.bottom <= stage.bottom + 1),
        widthScale: shell?.width && rect ? rect.width / shell.width : 0,
        heightScale: shell?.width && rect ? rect.height / shell.width : 0,
      };
    })(),
    sceneFeedback: document.querySelector(".scene-float-feedback")?.textContent?.trim() || "",
    fireKindled: Boolean(document.querySelector(".scene-canvas.fire-kindled")),
    openingFeed: (() => {
      const deck = document.querySelector(".narrative-deck")?.getBoundingClientRect();
      const anchor = document.querySelector("[data-feed-anchor]")?.getBoundingClientRect();
      return {
        contextLines: document.querySelectorAll(".opening-feed-context .narration-line").length,
        choiceRecords: document.querySelectorAll(".opening-feed .player-choice").length,
        outcomeLines: document.querySelectorAll(".opening-feed .outcome-line").length,
        currentChoices: document.querySelectorAll("[data-narrative-current] .choice-entry").length,
        nextLabel: document.querySelector(".narrative-next-heading")?.textContent?.trim() || "",
        anchorRatio: deck && anchor ? (anchor.top - deck.top) / deck.height : 0,
      };
    })(),
    actorLabels: [...document.querySelectorAll(".scene-actor .scene-marker-label")].map((item) => item.textContent.trim()),
    routeNodeCount: document.querySelectorAll(".route-node").length,
    dockCount: document.querySelectorAll(".dock-drawer").length,
    narrativeHistoryCount: document.querySelectorAll(".narrative-entry").length,
    choiceConditionCount: document.querySelectorAll(".choice-condition").length,
    narrativeOverflow: (() => {
      const narrative = document.querySelector(".narrative-deck");
      return narrative ? narrative.scrollWidth - narrative.clientWidth : 0;
    })(),
    splitView: (() => {
      const stage = document.querySelector(".scene-experience")?.getBoundingClientRect();
      const narrative = document.querySelector(".narrative-deck")?.getBoundingClientRect();
      return Boolean(stage && narrative && Math.abs(stage.top - narrative.top) < 8 && narrative.left >= stage.right - 2);
    })(),
    sceneRatio: (() => {
      const scene = document.querySelector(".scene-canvas")?.getBoundingClientRect();
      return scene?.height ? scene.width / scene.height : 0;
    })(),
    shellRatio: (() => {
      const shell = document.querySelector(".world-stage-shell")?.getBoundingClientRect();
      return shell?.height ? shell.width / shell.height : 0;
    })(),
    sceneShare: (() => {
      const stage = document.querySelector(".scene-experience")?.getBoundingClientRect();
      const narrative = document.querySelector(".narrative-deck")?.getBoundingClientRect();
      return stage && narrative ? stage.width / (stage.width + narrative.width) : 0;
    })(),
    topbarScale: (() => {
      const shell = document.querySelector(".world-stage-shell")?.getBoundingClientRect();
      const topbar = document.querySelector(".topbar")?.getBoundingClientRect();
      return shell?.width && topbar ? topbar.height / shell.width : 0;
    })(),
    openingActionScale: (() => {
      const shell = document.querySelector(".world-stage-shell")?.getBoundingClientRect();
      const action = document.querySelector(".opening-action-list .action-card")?.getBoundingClientRect();
      return shell?.width && action ? [action.width / shell.width, action.height / shell.width] : [0, 0];
    })(),
    currentChoicesVisible: (() => {
      const narrative = document.querySelector(".narrative-deck")?.getBoundingClientRect();
      const choices = [...document.querySelectorAll("[data-narrative-current] .choice-entry")];
      return Boolean(narrative && choices.length && choices.every((item) => {
        const rect = item.getBoundingClientRect();
        return rect.top >= narrative.top - 1 && rect.bottom <= narrative.bottom + 1;
      }));
    })(),
    actions: [...document.querySelectorAll("[data-action]")].map((item) => [item.dataset.action, item.dataset.value]),
    currentText: document.querySelector("[data-narrative-current]")?.innerText?.slice(0, 1200) || "",
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
await send("Page.navigate", { url: testUrl });
await new Promise((resolve) => setTimeout(resolve, 300));

const checkpoints = [];
checkpoints.push(await snapshot("landing"));
assert.equal(checkpoints.at(-1).title, "武道");
assert.ok(checkpoints.at(-1).scrollWidth <= 1280);
assert.match(await evaluate(`document.querySelector('script[type="module"]')?.src || ""`), /wudao-app\.mjs\?v=20260722\.6/);
assert.match(await evaluate(`document.querySelector('link[rel="stylesheet"]')?.href || ""`), /styles\.css\?v=20260722\.6/);
assert.match(checkpoints.at(-1).text, /大曜四百二十七年/);
assert.doesNotMatch(checkpoints.at(-1).text, /现实|论坛|武道局|其他玩家|其它玩家|太虚命盘|归尘门|黑日|Demo|P0|P1|P2|测试|原型/);

await click("new-journey");
assert.match(await text(), /你是被冷醒的/);
assert.match(await text(), /夜雨/);
assert.match(await text(), /亥时/);
assert.match(await text(), /扒开炭灰，寻找火种/);
assert.match(await text(), /摸索自己身上的东西/);
assert.match(await text(), /爬向供桌，拿那枚山桃/);
assert.doesNotMatch(await text(), /行录/);
assert.doesNotMatch(await text(), /现实|论坛|武道局|其他玩家|其它玩家/);
await screenshot("wudao-temple-opening-desktop.png");
await send("Emulation.setDeviceMetricsOverride", { width: 1672, height: 941, deviceScaleFactor: 1, mobile: false });
const referenceOpening = await snapshot("opening-reference-1672x941");
assert.ok(referenceOpening.scrollWidth <= 1672);
assert.ok(referenceOpening.scrollHeight <= 941);
assert.ok(referenceOpening.shellRatio > 1.775 && referenceOpening.shellRatio < 1.779);
assert.ok(referenceOpening.sceneShare > 0.66 && referenceOpening.sceneShare < 0.672);
assert.ok(referenceOpening.topbarScale > 0.039 && referenceOpening.topbarScale < 0.042);
assert.ok(referenceOpening.openingActionScale[0] > 0.265 && referenceOpening.openingActionScale[0] < 0.285);
assert.ok(referenceOpening.openingActionScale[1] > 0.043 && referenceOpening.openingActionScale[1] < 0.047);
assert.equal(referenceOpening.currentChoicesVisible, true);
await screenshot("wudao-temple-opening-reference-1672x941.png");
await click("inspect-scene-object", "patched_wall");
await evaluate(`new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
const inspectedWall = await snapshot("opening-wall-inspection-1672x941");
assert.equal(inspectedWall.sceneInspection.visible, true);
assert.equal(inspectedWall.sceneInspection.selectedId, "patched_wall");
assert.equal(inspectedWall.sceneInspection.lineVisible, true);
assert.equal(inspectedWall.sceneInspection.withinScene, true);
assert.ok(inspectedWall.sceneInspection.widthScale > 0.23 && inspectedWall.sceneInspection.widthScale < 0.245);
assert.ok(inspectedWall.sceneInspection.heightScale > 0.105 && inspectedWall.sceneInspection.heightScale < 0.118);
assert.match(inspectedWall.sceneInspection.text, /所见\s*新砌暗墙/);
assert.match(inspectedWall.sceneInspection.text, /墙灰颜色更深，新旧砖缝对不上。墙后是空的。/);
assert.match(inspectedWall.sceneInspection.text, /悟性 · 已察觉/);
await screenshot("wudao-temple-wall-inspection-1672x941.png");
await click("inspect-scene-object", "patched_wall");
assert.equal((await snapshot("opening-wall-inspection-closed")).sceneInspection.visible, false);
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 622, deviceScaleFactor: 1, mobile: false });
const shortDesktopOpening = await snapshot("opening-short-desktop");
assert.ok(shortDesktopOpening.scrollWidth <= 1280);
assert.ok(shortDesktopOpening.scrollHeight <= 622);
assert.equal(shortDesktopOpening.splitView, true);
assert.ok(shortDesktopOpening.sceneRatio > 1.25 && shortDesktopOpening.sceneRatio < 1.3);
assert.equal(shortDesktopOpening.currentChoicesVisible, true);
await screenshot("wudao-temple-opening-short-desktop.png");
await send("Emulation.setDeviceMetricsOverride", { width: 1024, height: 498, deviceScaleFactor: 1, mobile: false });
const scaledDesktopOpening = await snapshot("opening-scaled-desktop");
assert.ok(scaledDesktopOpening.scrollWidth <= 1024);
assert.ok(scaledDesktopOpening.scrollHeight <= 498);
assert.equal(scaledDesktopOpening.splitView, true);
assert.equal(scaledDesktopOpening.currentChoicesVisible, true);
await screenshot("wudao-temple-opening-scaled-desktop.png");
await send("Emulation.setDeviceMetricsOverride", { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
const phoneLandscapeOpening = await snapshot("opening-phone-landscape");
assert.ok(phoneLandscapeOpening.scrollWidth <= 844);
assert.ok(phoneLandscapeOpening.scrollHeight <= 390);
assert.equal(phoneLandscapeOpening.splitView, true);
assert.ok(phoneLandscapeOpening.sceneRatio > 1.25 && phoneLandscapeOpening.sceneRatio < 1.3);
assert.equal(phoneLandscapeOpening.currentChoicesVisible, true);
await screenshot("wudao-temple-opening-phone-landscape.png");
await click("inspect-scene-object", "patched_wall");
await evaluate(`new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
const phoneLandscapeInspection = await snapshot("opening-wall-inspection-phone-landscape");
assert.equal(phoneLandscapeInspection.sceneInspection.visible, true);
assert.equal(phoneLandscapeInspection.sceneInspection.lineVisible, true);
assert.equal(phoneLandscapeInspection.sceneInspection.withinScene, true);
assert.ok(phoneLandscapeInspection.scrollWidth <= 844);
assert.ok(phoneLandscapeInspection.scrollHeight <= 390);
await screenshot("wudao-temple-wall-inspection-phone-landscape.png");
await click("inspect-scene-object", "patched_wall");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileOpening = await snapshot("opening-mobile");
assert.ok(mobileOpening.scrollWidth <= 390);
assert.equal(mobileOpening.sceneId, "ruined_temple");
assert.equal(mobileOpening.dockCount, 3);
await screenshot("wudao-temple-opening-mobile.png");
await send("Emulation.setDeviceMetricsOverride", { width: 1672, height: 941, deviceScaleFactor: 1, mobile: false });
await click("temple-opening", "tend_fire");
await evaluate(`new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
const fireChoiceFlow = await snapshot("temple-fire-choice-flow");
assert.equal(fireChoiceFlow.sceneFeedback, "火势 +28");
assert.equal(fireChoiceFlow.fireKindled, true);
assert.equal(fireChoiceFlow.openingFeed.contextLines, 3);
assert.equal(fireChoiceFlow.openingFeed.choiceRecords, 1);
assert.equal(fireChoiceFlow.openingFeed.outcomeLines, 2);
assert.equal(fireChoiceFlow.openingFeed.currentChoices, 2);
assert.equal(fireChoiceFlow.openingFeed.nextLabel, "接下来");
assert.ok(fireChoiceFlow.openingFeed.anchorRatio > 0.18 && fireChoiceFlow.openingFeed.anchorRatio < 0.34);
assert.match(await text(), /火星先咬住枯草/);
assert.match(await text(), /阎王手里抢回几分暖意/);
assert.doesNotMatch(await evaluate(`document.querySelector(".narrative-deck")?.innerText || ""`), /火势\s*12\s*[→-]\s*40/);
await screenshot("wudao-temple-choice-flow-1672x941.png");
await send("Emulation.setDeviceMetricsOverride", { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
const phoneLandscapeChoiceFlow = await snapshot("temple-fire-choice-flow-phone-landscape");
assert.ok(phoneLandscapeChoiceFlow.scrollWidth <= 844);
assert.ok(phoneLandscapeChoiceFlow.scrollHeight <= 390);
assert.equal(phoneLandscapeChoiceFlow.splitView, true);
assert.equal(phoneLandscapeChoiceFlow.openingFeed.choiceRecords, 1);
assert.equal(phoneLandscapeChoiceFlow.openingFeed.currentChoices, 2);
assert.equal(phoneLandscapeChoiceFlow.currentChoicesVisible, true);
await screenshot("wudao-temple-choice-flow-phone-landscape.png");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await click("temple-opening", "check_belongings");
assert.match(await text(), /一封染暗的血书/);
const belongingsChoiceFlow = await snapshot("temple-belongings-choice-flow");
assert.equal(belongingsChoiceFlow.openingFeed.choiceRecords, 2);
assert.equal(belongingsChoiceFlow.openingFeed.outcomeLines, 4);
assert.equal(belongingsChoiceFlow.openingFeed.currentChoices, 1);
await click("temple-opening", "eat_peach");
assert.match(await text(), /刀绞似的痛压了下去/);
const peachChoiceFlow = await snapshot("temple-peach-choice-flow");
assert.equal(peachChoiceFlow.openingFeed.choiceRecords, 3);
assert.equal(peachChoiceFlow.openingFeed.outcomeLines, 6);
assert.equal(peachChoiceFlow.openingFeed.currentChoices, 1);
await click("inspect-temple-wall");
assert.match(await text(), /你看见了东西，却拿不到/);
assert.match(await text(), /火势不足/);
await click("use-destiny");
assert.match(await text(), /逆天改命/);
assert.match(await text(), /五维基础归零/);
await click("allocate-jade", "strength");
await click("confirm-allocation");
assert.match(await text(), /等火将弱，扯下供桌旧布/);
assert.match(await text(), /按空响处，一次次敲开砖墙/);
assert.match(await text(), /追查贡桌上的新鲜山桃/);
const desktopTasks = await snapshot("temple-tasks-desktop");
assert.equal(desktopTasks.dockCount, 3);
assert.equal(desktopTasks.splitView, true);
assert.ok(desktopTasks.narrativeOverflow <= 1);
await screenshot("wudao-temple-encounters-desktop.png");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileTasks = await snapshot("temple-tasks-mobile");
assert.ok(mobileTasks.scrollWidth <= 390);
assert.equal(mobileTasks.sceneId, "ruined_temple");
assert.ok(mobileTasks.hotspotCount >= 4);
assert.equal(mobileTasks.routeNodeCount, 0);
assert.equal(mobileTasks.splitView, false);
await screenshot("wudao-temple-encounters-mobile.png");
await send("Emulation.setDeviceMetricsOverride", { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
const landscapeTasks = await snapshot("temple-tasks-landscape");
assert.ok(landscapeTasks.scrollWidth <= 844);
assert.equal(landscapeTasks.splitView, true);
assert.equal(landscapeTasks.dockCount, 3);
await screenshot("wudao-temple-encounters-landscape.png");
assert.equal(await evaluate(`(() => { const drawer = document.querySelector(".character-panel"); drawer.querySelector("summary").click(); return drawer.open; })()`), true);
await evaluate(`document.querySelector(".inventory-panel summary").click()`);
assert.equal(await evaluate(`document.querySelector(".inventory-panel").open && !document.querySelector(".character-panel").open`), true);
await evaluate(`document.querySelector(".martial-panel summary").click()`);
assert.equal(await evaluate(`document.querySelector(".martial-panel").open && !document.querySelector(".inventory-panel").open`), true);
await screenshot("wudao-temple-drawers-landscape.png");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await click("temple-task", "traveler_relic");
await click("temple-task", "shen_promise");
await evaluate(`document.querySelector(".inventory-panel summary").click()`);
assert.match(await text(), /金陵东郊残图/);
assert.match(await text(), /沈字铜钱/);
await evaluate(`document.querySelector(".inventory-panel summary").click()`);
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
assert.ok(await evaluate(`document.querySelectorAll(".narrative-entry").length > 0`));
assert.match(await evaluate(`document.querySelector(".narrative-entry:last-child .player-choice")?.innerText || ""`), /我不是乞丐/);
await evaluate(`document.querySelector(".narrative-deck").scrollTop = 0`);
await screenshot("wudao-narrative-history-desktop.png");
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
assert.match(checkpoints.at(-1).currentText, /第一夜之后/);
assert.ok(checkpoints.at(-1).narrativeOverflow <= 1);
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
const lockedTrustChoice = await evaluate(`(() => {
  const action = document.querySelector('[data-action="conclude-third-lady"]');
  const entry = action?.closest(".choice-entry");
  const condition = entry?.querySelector(".choice-condition");
  condition?.querySelector("summary")?.click();
  return {
    unavailable: entry?.classList.contains("unavailable") || false,
    status: condition?.querySelector(".condition-status")?.textContent || "",
    open: condition?.open || false,
    detail: condition?.innerText || "",
  };
})()`);
assert.equal(lockedTrustChoice.unavailable, true);
assert.equal(lockedTrustChoice.open, true);
assert.match(lockedTrustChoice.status, /条件未满足/);
assert.match(lockedTrustChoice.detail, /病因确证|相互印证/);
assert.ok(await evaluate(`document.querySelectorAll(".choice-entry.special").length > 0`));
await screenshot("wudao-choice-conditions-desktop.png");
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
assert.ok(await evaluate(`Boolean(document.querySelector('[data-action="first-battle-action"][data-value="reckless"]'))`));
const observeCondition = await evaluate(`(() => {
  const entry = document.querySelector('[data-action="first-battle-action"][data-value="observe"]')?.closest(".choice-entry");
  const details = entry?.querySelector(".choice-condition");
  details?.querySelector("summary")?.click();
  return { open: details?.open || false, text: details?.innerText || "" };
})()`);
assert.equal(observeCondition.open, true);
assert.match(observeCondition.text, /因果骰 1D10/);
assert.match(observeCondition.text, /目标 7/);
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileBattle = await snapshot("first-battle-mobile");
assert.ok(mobileBattle.scrollWidth <= 390);
assert.match(mobileBattle.currentText, /条件占优 · 悟性/);
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
const battleStartSave = JSON.parse(await evaluate(`localStorage.getItem("wudao-high-martial-v1")`));
await click("first-battle-action", "observe");
assert.match(await text(), /左袖短刃|左袖反刺/);
assert.match(await text(), /因果骰 · 大成/);
assert.match(await text(), /目标 7/);
const firstObserveCheck = JSON.parse(await evaluate(`localStorage.getItem("wudao-high-martial-v1")`)).p0.battle.history.at(-1).check;
assert.equal(firstObserveCheck.tier, "great");
await reloadWithSave(battleStartSave);
await click("first-battle-action", "observe");
const repeatedObserveCheck = JSON.parse(await evaluate(`localStorage.getItem("wudao-high-martial-v1")`)).p0.battle.history.at(-1).check;
assert.deepEqual(repeatedObserveCheck, firstObserveCheck);
await screenshot("wudao-battle-check-result-desktop.png");
await click("first-battle-action", "extinguish");
assert.match(await text(), /第 2 轮/);
await click("first-battle-action", "needle_wrist");
await click("end-first-battle-turn");
assert.match(await text(), /第 3 轮/);
await click("first-battle-action", "needle_wrist");
await click("end-first-battle-turn");
assert.match(await text(), /第 4 轮/);
await click("first-battle-action", "kill");
assert.match(await text(), /第一条人命/);
assert.match(await text(), /判定结果\s*大成/);
assert.match(await text(), /左袖夹层没有受损/);
assert.match(await evaluate(`document.querySelector(".narrative-entry:last-child")?.innerText || ""`), /因果骰掷出.*判定为大成/);
await click("read-night-trace");
assert.match(await text(), /左袖夹层|尸身左袖/);
assert.equal(await evaluate(`document.querySelectorAll('[data-action="assailant-trace"]').length`), 2);
await click("assailant-trace", "search_sleeves");
assert.match(await text(), /鱼鳞铜签/);
assert.match(await text(), /四项条件已经齐备/);
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileCounterplan = await snapshot("assailant-counterplan-mobile");
assert.ok(mobileCounterplan.scrollWidth <= 390);
assert.match(mobileCounterplan.currentText, /照暗语送出“药已回炉”/);
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
assert.match(await text(), /燕惊鸿/);
await click("enter-wang-encounter");
assert.match(await text(), /身份线索/);
assert.match(await text(), /尾随/);
await click("wang-battle-action", "observe_tail");
await click("wang-battle-action", "send_yan_ahead");
await click("wang-battle-action", "observe_tail");
assert.match(await text(), /王卓在东湖岸边抖开锁链刀/);
await click("wang-battle-action", "cut_skiff_loose");
let wangState = JSON.parse(await evaluate(`localStorage.getItem("wudao-high-martial-v1")`));
if (!wangState.p0.wangBattle.battle.conditions.escapeRoute) {
  await click("end-wang-battle-turn");
  await click("wang-battle-action", "cut_skiff_loose");
  wangState = JSON.parse(await evaluate(`localStorage.getItem("wudao-high-martial-v1")`));
}
assert.equal(wangState.p0.wangBattle.battle.conditions.escapeRoute, true);
if (wangState.p0.wangBattle.turn.energy < 3) await click("end-wang-battle-turn");
await click("wang-battle-action", "escort_retreat");
assert.match(await text(), /护人撤离|燕惊鸿带着卷宗离开/);
await click("continue-after-wang");
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

await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await click("begin-m4");
assert.match(await text(), /曹青把炉火压低|今夜便要离开金陵/);
assert.match(await text(), /药库 · 指点 · 师父担保/);
await click("m4-cao-aid", "sealed_letter");
assert.match(await text(), /沉木钱匣/);
assert.match(await text(), /沈福/);
await click("m4-inquiry", "inspect_seal");
await click("m4-inquiry", "compare_tally");
await click("m4-inquiry", "question_source");
assert.match(await text(), /蛇纹火漆/);
assert.match(await text(), /口供矛盾/);
await click("m4-finish-inquiry");
assert.match(await text(), /上交|分赃|藏匿|设局|拒绝/);
await click("m4-money-choice", "trap");
assert.match(await text(), /沈福在试探你|毒蛇帮的人也在看他/);

await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileM4TrackingChoice = await snapshot("m4-tracking-choice-mobile");
assert.ok(mobileM4TrackingChoice.scrollWidth <= 390);
assert.equal(mobileM4TrackingChoice.sceneId, "qinhuai_night_lane");
await screenshot("wudao-m4-tracking-choice-mobile.png");
await send("Emulation.setDeviceMetricsOverride", { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
const landscapeM4TrackingChoice = await snapshot("m4-tracking-choice-landscape");
assert.ok(landscapeM4TrackingChoice.scrollWidth <= 844);
assert.equal(landscapeM4TrackingChoice.splitView, true);
assert.ok(landscapeM4TrackingChoice.choiceConditionCount >= 4);
await screenshot("wudao-m4-tracking-choice-landscape.png");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

await click("m4-tracking", "countermark");
assert.match(await text(), /因果骰/);
assert.match(await text(), /沿账页墨痕进入秦淮旧宅/);
await click("m4-tracking-continue");
assert.match(await text(), /七道拓痕的旧刀匣/);
assert.equal((await snapshot("m4-old-house-desktop")).sceneId, "qinhuai_old_house");
await click("m4-old-house", "search_drawer");
assert.match(await text(), /受控联系人|揭发／交人|放走|杀死/);
await click("m4-outcome", "expose");
assert.match(await text(), /侧门不再认沈福的笑脸/);
assert.match(await text(), /白栀云内宅口信/);
assert.doesNotMatch(await text(), /inner_house_witness|bai_steward|conditional_side_gate|risky_goods/);
await click("m4-continue-echo");
assert.match(await text(), /白栀云没有带侍女/);
await click("m4-bai-instruction", "receive");
assert.match(await text(), /三诀必须立刻落进身体/);
await click("m4-training", "apply_to_stake");
assert.match(await text(), /江湖留痕/);
assert.match(await text(), /曹青离开金陵以后/);
assert.match(await text(), /七道刀痕已经入册/);
assert.match(await text(), /受内宅约束的证人/);
assert.doesNotMatch(await text(), /inner_house_witness|bai_steward|conditional_side_gate|risky_goods/);
assert.doesNotMatch(await text(), /原著|失败推进|人物权限|一幕内兑现|后续回响|凭空出现/);
await screenshot("wudao-m4-ending-desktop.png");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobileM4Ending = await snapshot("m4-ending-mobile");
assert.ok(mobileM4Ending.scrollWidth <= 390);
await screenshot("wudao-m4-ending-mobile.png");

const storedItems = await send("DOMStorage.getDOMStorageItems", { storageId: { securityOrigin: pageOrigin, isLocalStorage: true } });
const savedEntry = storedItems.entries.find(([key]) => key === "wudao-high-martial-v1");
if (!savedEntry) throw new Error("Missing local save after complete flow");
const saved = JSON.parse(savedEntry[1]);
assert.equal(saved.backgroundId, "mystery");
assert.equal(saved.vowId, "path");
assert.equal(saved.version, 5);
assert.equal(saved.fateSeed, "seed-2");
assert.ok(Array.isArray(saved.narrativeLog));
assert.ok(saved.narrativeLog.length > 0 && saved.narrativeLog.length <= 64);
assert.ok(saved.narrativeLog.every((entry) => entry.title && entry.choice && Array.isArray(entry.lines)));
assert.ok(saved.p0.battleHistory.some((entry) => entry.check?.die === "1D10" && entry.check?.tier === "great"));
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
assert.equal(saved.p0.wangOutcome, "protected_escape");
assert.equal(saved.p0.wangConsequences.yanJinghong, "safe");
assert.ok(saved.p0.relationships.yan_jinghong.trust >= 58);
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
assert.equal(saved.m4.complete, true);
assert.equal(saved.m4.cao.status, "away");
assert.equal(saved.m4.cao.partingAid, "sealed_letter");
assert.equal(saved.m4.dirtyMoney.disposition, "trap");
assert.equal(saved.m4.outcome, "exposed");
assert.equal(saved.m4.contacts.shen_fu.status, "closed");
assert.equal(saved.m4.contacts.replacement, "bai_steward");
assert.equal(saved.m4.shenIdentity, "inner_house_witness");
assert.equal(saved.m4.sevenKillClue, true);
assert.equal(saved.m4.baiInstruction, true);
assert.equal(saved.m4.trainingOutcome, "water_formula");
assert.ok(saved.m4.jianghuTrace.length >= 5 && saved.m4.jianghuTrace.length <= 8);
assert.ok(saved.m4.jianghuTrace.every((entry) => entry.text && entry.source));

const versionFourSave = structuredClone(saved);
versionFourSave.version = 4;
versionFourSave.screen = "p0JourneyEnd";
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
deathBranchSave.p0.battle = null;
deathBranchSave.p0.checkpoint = structuredClone(deathBranchSave.p0);
await reloadWithSave(deathBranchSave);
await click("first-battle-action", "reckless");
assert.match(await text(), /东门长街 · 死劫履历/);
assert.match(await text(), /左袖/);
await click("return-p0-death");
assert.match(await text(), /蒙面刀客/);
assert.ok(await evaluate(`Boolean(document.querySelector('[data-action="first-battle-action"][data-value="reckless"]'))`));

const finalLampSave = structuredClone(deathBranchSave);
finalLampSave.lives = 1;
await reloadWithSave(finalLampSave);
await click("first-battle-action", "reckless");
assert.match(await text(), /双灯俱灭/);
assert.match(await text(), /这一世无法再回照/);
assert.ok(await evaluate(`Boolean(document.querySelector('[data-action="restart"]'))`));
assert.equal(await evaluate(`document.querySelectorAll('[data-action="return-p0-death"]').length`), 0);

const failedCheckSave = structuredClone(saved);
failedCheckSave.fateSeed = "seed-4";
failedCheckSave.screen = "firstNeedleAmbush";
failedCheckSave.lives = 2;
failedCheckSave.attributes = { constitution: 0, insight: 0, agility: 0, strength: 0, fortune: 0 };
failedCheckSave.martialStage = "mortal";
failedCheckSave.p0 = createP0State();
failedCheckSave.p0.started = true;
failedCheckSave.p0.node = "first_needle_ambush";
failedCheckSave.p0.items.spring_rain_needles = 1;
failedCheckSave.p0.skills.spring_rain_needles = { stage: "skilled", progress: 60 };
failedCheckSave.p0.activeMartial.technique = "spring_rain_needles";
failedCheckSave.p0.battle = null;
failedCheckSave.p0.checkpoint = structuredClone(failedCheckSave.p0);
await reloadWithSave(failedCheckSave);
await click("first-battle-action", "observe");
assert.match(await text(), /因果骰 · 失手/);
await click("end-first-battle-turn");
assert.match(await text(), /第 2 轮|敌方落招/);
const failedCheckState = JSON.parse(await evaluate(`localStorage.getItem("wudao-high-martial-v1")`));
assert.equal(failedCheckState.screen, "firstNeedleAmbush");
assert.equal(failedCheckState.p0.battle.turn.round, 2);
assert.equal(failedCheckState.p0.wounds[0].severity, 2);
assert.ok(await evaluate(`document.querySelectorAll('[data-action="first-battle-action"]:not(:disabled)').length > 0`));
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
assert.ok((await snapshot("failed-check-mobile")).scrollWidth <= 390);
await screenshot("wudao-battle-check-failure-mobile.png");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

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
assert.match(await text(), /江湖留痕/);
assert.match(await text(), /七道刀痕已经入册/);
assert.match(await text(), /白栀云的卸力三诀/);
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
  m4Outcome: saved.m4.outcome,
  m4Training: saved.m4.trainingOutcome,
} }, null, 2)}\n`);

socket.close();
