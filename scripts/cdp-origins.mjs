import assert from "node:assert/strict";
import { DEFAULT_APPEARANCE } from "../web/appearance-core.mjs";

const port = Number(process.argv[2] || 9225);
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const tab = tabs.find((item) => item.type === "page" && /^https?:\/\/(127\.0\.0\.1|localhost)/.test(item.url));
if (!tab) throw new Error(`No browser page found on debugging port ${port}`);

const pageOrigin = new URL(tab.url).origin;
const storageId = { securityOrigin: pageOrigin, isLocalStorage: true };
const socket = new WebSocket(tab.webSocketDebuggerUrl);
const pending = new Map();
const pageErrors = [];
let messageId = 0;

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") {
    pageErrors.push(message.params?.exceptionDetails?.exception?.description || "Unknown page exception");
  }
  if (!message.id || !pending.has(message.id)) return;
  const operation = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) operation.reject(new Error(message.error.message));
  else operation.resolve(message.result);
});

await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || "Page evaluation failed");
  return result.result.value;
}

async function waitForApp() {
  await new Promise((resolve) => setTimeout(resolve, 100));
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const ready = await evaluate(`document.readyState === "complete" && Boolean(document.querySelector("#app")?.innerText?.trim())`);
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Timed out waiting for the game to render");
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

async function pageText() {
  return evaluate(`document.querySelector("#app")?.innerText || ""`);
}

async function currentSave() {
  return JSON.parse(await evaluate(`localStorage.getItem("wudao-high-martial-v1")`));
}

async function clearAndNavigate(seed) {
  await send("Storage.clearDataForOrigin", { origin: pageOrigin, storageTypes: "local_storage" });
  await send("Page.navigate", { url: `${pageOrigin}/?seed=${encodeURIComponent(seed)}` });
  await waitForApp();
}

async function writeSaveAndReload(save) {
  for (const key of [
    "wudao-high-martial-v1-checksum",
    "wudao-high-martial-v1-backup",
    "wudao-high-martial-v1-backup-checksum",
  ]) {
    await send("DOMStorage.removeDOMStorageItem", { storageId, key });
  }
  await send("DOMStorage.setDOMStorageItem", {
    storageId,
    key: "wudao-high-martial-v1",
    value: JSON.stringify(save),
  });
  await send("Page.reload", { ignoreCache: false });
  await waitForApp();
}

async function createCharacter(originId) {
  await click("new-journey");
  await click("enter-creation");
  assert.equal(await evaluate(`document.querySelectorAll(".origin-choice-card").length`), 3);
  const selectionText = await pageText();
  assert.doesNotMatch(selectionText, /人物车卡|旧债|债务|Demo|原型|随身之物|暗处风声/);
  if (originId === "shen_branch") assert.doesNotMatch(selectionText, /沈家/);
  await click("select-background", originId);
  await click("to-appearance");
  assert.deepEqual(
    await evaluate(`[...document.querySelectorAll(".appearance-ring-control")].map((item) => item.dataset.appearancePart)`),
    ["hat", "frontHair", "backHair", "eyes", "brows", "mouth", "nose", "faceShape", "faceAccessory", "backAccessory", "clothing"],
  );
  assert.equal(await evaluate(`document.querySelectorAll('.appearance-identity-controls input[type="range"]').length`), 0);
  assert.equal(await evaluate(`Boolean(document.querySelector('[data-appearance-part="clothing"]'))`), true);
  await click("confirm-appearance");
  await click("select-vow", "path");
  await click("start-journey");
}

async function finishSharedTemple(originId, casketChoice) {
  await click("temple-area", "rear");
  await click("inspect-scene-object", "patched_wall");
  await click("temple-object-action", "patched_wall|inspect_wall");
  await click("inspect-scene-object", "patched_wall");
  await click("temple-object-action", "patched_wall|sound_wall");
  await click("inspect-scene-object", "patched_wall");
  await click("temple-casket-action", casketChoice);
  if (casketChoice === "inspect_casket") {
    await click("inspect-scene-object", "patched_wall");
    await click("temple-casket-action", "take_casket_intact");
  }
  await click("inspect-scene-object", "blood_trail");
  await click("temple-object-action", "blood_trail|follow_blood_trail");
  await click("inspect-scene-actor", "injured_porter");
  await click("temple-porter-action", "rescue_porter");
  assert.match(await pageText(), /青衣妇人/);
  await click("temple-lady-response", "show_evidence");
  await click("temple-crisis", "hold_door");
  assert.match(await pageText(), /乌沉药匣|受伤脚夫/);
  assert.match(await pageText(), /龙青鱼/);
  await click("accept-temple-outcome");
  await click("to-road-trial");
  await click("road-trial", "dive");
  await click("continue-road");
  await click("choose-route", "shen");
  await click("start-shen-chapter");
}

async function verifyPersonalEvent(originId, expectedTitle, firstChoice) {
  const save = await currentSave();
  save.screen = "shenMeeting";
  save.shenMeetingSeen = true;
  save.originPrologue.personalEventComplete = false;
  await writeSaveAndReload(save);
  await click("leave-shen-meeting");
  assert.match(await pageText(), expectedTitle);
  await click("origin-personal-choice", firstChoice);
  const after = await currentSave();
  assert.equal(after.screen, "shenFuChoice");
  assert.equal(after.originPrologue.personalEventComplete, true);
  assert.ok(after.originEchoes.length >= 2);
}

await send("Page.enable");
await send("Runtime.enable");
await send("DOMStorage.enable");
await send("Network.clearBrowserCache");

await send("Emulation.setDeviceMetricsOverride", { width: 844, height: 390, deviceScaleFactor: 1, mobile: true });
await clearAndNavigate("origin-shen");
await click("new-journey");
await click("enter-creation");
assert.ok(await evaluate(`document.documentElement.scrollWidth <= 844`));
assert.equal(await evaluate(`document.querySelectorAll(".origin-choice-card").length`), 3);
assert.deepEqual(
  await evaluate(`[...document.querySelectorAll(".origin-creation-step b")].map((item) => item.textContent.trim())`),
  ["出身", "容貌", "天赋", "属性"],
);
assert.equal(await evaluate(`document.querySelector(".origin-choice-card.selected")?.dataset.value`), "shen_branch");
assert.equal(await evaluate(`document.querySelector(".origin-confirm-button")?.textContent.trim()`), "确认出身");
assert.equal(await evaluate(`document.querySelector('[data-field="hero-name"]')`), null);
assert.equal(await evaluate(`document.querySelectorAll(".origin-card-copy > span").length`), 1);
assert.equal(await evaluate(`document.querySelector(".origin-choice-card.selected .origin-card-copy > span")?.textContent.includes("小时候读过书")`), true);
assert.equal(await evaluate(`document.querySelectorAll(".origin-choice-card:not(.selected) .origin-card-copy > span").length`), 0);
await click("select-background", "streetborn");
assert.equal(await evaluate(`document.querySelectorAll(".origin-card-copy > span").length`), 1);
assert.equal(await evaluate(`document.querySelector(".origin-choice-card.selected .origin-card-copy > span")?.textContent.includes("给鱼贩看过摊")`), true);
assert.equal(await evaluate(`getComputedStyle(document.querySelector(".origin-selection-screen")).backgroundImage.includes("appearance-jiangnan-v1.webp")`), true);
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await clearAndNavigate("origin-shen");

await createCharacter("shen_branch");
assert.match(await pageText(), /有人在雨里点了你的名/);
assert.match(await evaluate(`getComputedStyle(document.querySelector(".scene-canvas")).backgroundImage`), /shen-west-courtyard-v1\.webp/);
await click("origin-prologue-choice", "study_token");
await click("origin-prologue-choice", "request_writ");
await click("origin-prologue-choice", "buy_oilcloth");
await click("origin-prologue-choice", "follow_cart_tracks");
assert.match(await pageText(), /先看清这座庙/);
await finishSharedTemple("shen_branch", "inspect_casket");
await click("open-knowledge");
assert.equal(await evaluate(`document.querySelectorAll(".knowledge-categories button").length`), 3);
assert.deepEqual(await evaluate(`[...document.querySelectorAll(".knowledge-categories strong")].map((node) => node.textContent.trim())`), ["全部", "人", "事"]);
assert.equal(await evaluate(`document.querySelectorAll(".knowledge-list-item").length`), 5);
assert.doesNotMatch(await pageText(), /完成度|待验证|未知总量/);
await click("knowledge-category", "person");
assert.equal(await evaluate(`document.querySelectorAll(".knowledge-list-item").length`), 1);
assert.match(await pageText(), /龙青鱼/);
await click("knowledge-category", "event");
await click("select-knowledge", "purple_river_night_boat");
await click("knowledge-related", "place|purple_gold_river|river");
assert.equal(await evaluate(`document.querySelector(".route-board")?.open`), true);
await click("open-knowledge-entry", "purple_river_night_boat");
assert.match(await pageText(), /沿紫金河下水后/);
await click("close-knowledge");
assert.match(await pageText(), /封条还在/);
await click("origin-return-choice", "report_trace");
assert.match(await pageText(), /旁支的名字/);
await click("enter-origin-danroom");
assert.match(await pageText(), /旁支腰牌/);
let shenSave = await currentSave();
assert.equal(shenSave.version, 13);
assert.deepEqual(shenSave.appearance, DEFAULT_APPEARANCE);
assert.equal(shenSave.originId, "shen_branch");
assert.equal(shenSave.originPrologue.taskState, "costly_success");
assert.ok(shenSave.originAccess.includes("shen_side_door_writ"));
assert.ok(shenSave.originKnowledge.includes("box_changed_hands"));
await verifyPersonalEvent("shen_branch", /旁谱缺名/, "trace_missing_name");

await clearAndNavigate("origin-street");
await createCharacter("streetborn");
assert.match(await pageText(), /鱼市收摊以后/);
assert.match(await evaluate(`getComputedStyle(document.querySelector(".scene-canvas")).backgroundImage`), /qinhuai-fish-market-v1\.webp/);
await click("origin-prologue-choice", "help_fisher");
await click("origin-prologue-choice", "inspect_cargo_tag");
await click("origin-prologue-choice", "take_advance");
await click("origin-prologue-choice", "take_fisher_route");
assert.match(await pageText(), /先看清这座庙/);
await finishSharedTemple("streetborn", "open_casket");
assert.match(await pageText(), /红绳已断/);
await click("origin-delivery-choice", "trade_knowledge");
assert.match(await pageText(), /一趟跑腿替你换来/);
await click("enter-origin-danroom");
assert.match(await pageText(), /鱼市药气/);
const streetSave = await currentSave();
assert.equal(streetSave.originId, "streetborn");
assert.equal(streetSave.originPrologue.taskState, "failed_forward");
assert.ok(streetSave.originContacts.old_fisher >= 2);
assert.ok(streetSave.originKnowledge.includes("package_contains_cargo_tokens"));
assert.ok(streetSave.originAccess.includes("shen_medicine_cargo_route"));
await verifyPersonalEvent("streetborn", /鱼市催信/, "answer_fish_market");

const legacy = {
  version: 7,
  screen: "shenMeeting",
  name: "陈司命",
  backgroundId: "clan",
  attributes: { constitution: 1, insight: 1, agility: 0, strength: 1, fortune: 0 },
};
await writeSaveAndReload(legacy);
const migrated = await currentSave();
assert.equal(migrated.version, 13);
assert.deepEqual(migrated.appearance, DEFAULT_APPEARANCE);
assert.equal(migrated.originId, "shen_branch");
assert.equal(migrated.originPrologue.completed, true);
assert.equal(migrated.screen, "shenMeeting");

assert.deepEqual(pageErrors, []);
process.stdout.write(`${JSON.stringify({
  ok: true,
  origins: ["shen_branch", "streetborn", "mystery"],
  saveVersion: 13,
  responsive: "844x390",
})}\n`);
socket.close();
