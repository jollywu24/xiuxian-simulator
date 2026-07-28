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
  await new Promise((resolve) => setTimeout(resolve, 650));
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

async function clickSceneBlank() {
  return evaluate(`(() => {
    const canvas = document.querySelector(".scene-canvas");
    if (!canvas) throw new Error("Missing scene canvas");
    canvas.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    return true;
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
    sceneBackground: (() => {
      const canvas = document.querySelector(".scene-canvas");
      return canvas ? getComputedStyle(canvas).backgroundImage : "";
    })(),
    sceneCropFraction: (() => {
      const canvas = document.querySelector(".scene-canvas");
      const aspect = Number(canvas?.dataset.sceneAspect || 0);
      const rect = canvas?.getBoundingClientRect();
      if (!aspect || !rect?.height) return 0;
      const canvasAspect = rect.width / rect.height;
      return canvasAspect < aspect ? 1 - canvasAspect / aspect : 1 - aspect / canvasAspect;
    })(),
    hotspotCount: document.querySelectorAll(".scene-hotspot").length,
    sceneMarkers: (() => {
      const canvas = document.querySelector(".scene-canvas");
      const rect = canvas?.getBoundingClientRect();
      const positions = {};
      canvas?.querySelectorAll(".scene-hotspot").forEach((marker) => {
        const markerRect = marker.getBoundingClientRect();
        positions[marker.dataset.value] = rect?.width && rect?.height
          ? [(markerRect.left + markerRect.width / 2 - rect.left) / rect.width, (markerRect.top + markerRect.height / 2 - rect.top) / rect.height]
          : [0, 0];
      });
      return { aligned: canvas?.dataset.markersAligned === "true", positions };
    })(),
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
    actorPositions: (() => {
      const canvas = document.querySelector(".scene-canvas")?.getBoundingClientRect();
      return Object.fromEntries([...document.querySelectorAll(".scene-canvas .scene-actor")].map((actor) => {
        const rect = actor.getBoundingClientRect();
        return [actor.dataset.value, canvas?.width && canvas?.height
          ? [(rect.left + rect.width / 2 - canvas.left) / canvas.width, (rect.top + rect.height / 2 - canvas.top) / canvas.height]
          : [0, 0]];
      }));
    })(),
    routeNodeCount: document.querySelectorAll(".route-node").length,
    dockCount: document.querySelectorAll(".utility-dock > *").length,
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
    inventoryView: (() => {
      const overlay = document.querySelector(".inventory-screen");
      const rect = overlay?.getBoundingClientRect();
      const tabs = [...document.querySelectorAll(".inventory-category-tabs button")];
      const slots = [...document.querySelectorAll(".inventory-item-slot")];
      const occupied = slots.filter((slot) => !slot.classList.contains("empty"));
      const box = (selector) => {
        const target = document.querySelector(selector)?.getBoundingClientRect();
        return target ? [target.left, target.top, target.width, target.height] : [0, 0, 0, 0];
      };
      return {
        visible: Boolean(overlay),
        rect: rect ? [rect.left, rect.top, rect.width, rect.height] : [0, 0, 0, 0],
        topbarRect: box(".inventory-topbar"),
        catalogRect: box(".inventory-catalog"),
        detailRect: box(".inventory-detail"),
        gridRect: box(".inventory-grid"),
        firstSlotRect: box(".inventory-item-slot"),
        heading: document.querySelector(".inventory-catalog-heading h1")?.textContent?.trim() || "",
        capacity: document.querySelector(".inventory-catalog-heading strong")?.textContent?.replace(/\\s+/g, " ").trim() || "",
        categoryTabs: tabs.length,
        categoryTabText: tabs.map((tab) => tab.textContent.trim()),
        categoryLabels: tabs.map((tab) => tab.getAttribute("aria-label")),
        slots: slots.length,
        occupied: occupied.length,
        slotText: occupied.map((slot) => slot.textContent.replace(/\\s+/g, " ").trim()),
        selected: document.querySelector(".inventory-item-slot.selected")?.getAttribute("aria-label") || "",
        detail: document.querySelector(".inventory-detail")?.innerText?.slice(0, 800) || "",
        silver: document.querySelector(".inventory-silver")?.innerText?.replace(/\\s+/g, " ").trim() || "",
        useVisible: Boolean(document.querySelector('[data-action="use-inventory-item"]')),
        useDisabled: Boolean(document.querySelector('[data-action="use-inventory-item"]')?.disabled),
        overflowX: overlay ? overlay.scrollWidth - overlay.clientWidth : 0,
        overflowY: overlay ? overlay.scrollHeight - overlay.clientHeight : 0,
      };
    })(),
    characterView: (() => {
      const overlay = document.querySelector(".character-screen");
      const rect = overlay?.getBoundingClientRect();
      const box = (selector) => {
        const target = document.querySelector(selector)?.getBoundingClientRect();
        return target ? [target.left, target.top, target.width, target.height] : [0, 0, 0, 0];
      };
      const slots = [...document.querySelectorAll(".character-equipment-slot")];
      const bagSlots = [...document.querySelectorAll(".character-bag-item")];
      const sectionTabs = [...document.querySelectorAll(".character-section-tabs button")];
      return {
        visible: Boolean(overlay),
        rect: rect ? [rect.left, rect.top, rect.width, rect.height] : [0, 0, 0, 0],
        topbarRect: box(".character-screen .inventory-topbar"),
        leftRect: box(".character-left-panel"),
        paperdollRect: box(".character-paperdoll"),
        bagRect: box(".character-equipment-bag"),
        name: document.querySelector(".character-profile-copy h1")?.textContent?.trim() || "",
        realm: document.querySelector(".character-realm")?.textContent?.replace(/\\s+/g, " ").trim() || "",
        health: document.querySelector(".vital-row.health")?.textContent?.replace(/\\s+/g, " ").trim() || "",
        qi: document.querySelector(".vital-row.qi")?.textContent?.replace(/\\s+/g, " ").trim() || "",
        attributes: [...document.querySelectorAll(".attribute-medallion")].map((entry) => entry.textContent.replace(/\\s+/g, " ").trim()),
        defense: document.querySelector(".character-defense-row")?.textContent?.replace(/\\s+/g, " ").trim() || "",
        equipmentSlots: slots.length,
        equipmentSlotSizes: slots.map((entry) => {
          const slotRect = entry.getBoundingClientRect();
          return [Math.round(slotRect.width * 10) / 10, Math.round(slotRect.height * 10) / 10];
        }),
        sectionTabRects: sectionTabs.map((entry) => {
          const tabRect = entry.getBoundingClientRect();
          return [Math.round(tabRect.left * 10) / 10, Math.round(tabRect.top * 10) / 10, Math.round(tabRect.width * 10) / 10, Math.round(tabRect.height * 10) / 10];
        }),
        sectionTabBackgrounds: sectionTabs.map((entry) => getComputedStyle(entry).backgroundImage),
        bagSlots: bagSlots.length,
        occupiedBagSlots: bagSlots.filter((entry) => !entry.classList.contains("empty")).length,
        bagSlotSizes: bagSlots.map((entry) => {
          const slotRect = entry.getBoundingClientRect();
          return [Math.round(slotRect.width * 10) / 10, Math.round(slotRect.height * 10) / 10];
        }),
        equipmentDetail: document.querySelector(".character-equipment-detail")?.innerText?.replace(/\\s+/g, " ").trim() || "",
        equipmentDetailAction: document.querySelector(".character-equipment-detail footer button")?.dataset.action || "",
        equipmentDetailButton: document.querySelector(".character-equipment-detail footer button")?.textContent?.trim() || "",
        equipmentDetailDisabled: Boolean(document.querySelector(".character-equipment-detail footer button")?.disabled),
        equipmentDetailQualityColor: getComputedStyle(document.querySelector(".character-equipment-detail header small") || document.body).color,
        equipmentDetailNameColor: getComputedStyle(document.querySelector(".character-equipment-detail h2") || document.body).color,
        equipmentDetailBaseColor: getComputedStyle(document.querySelector(".character-equipment-detail-art .inventory-quality-base") || document.body).backgroundColor,
        profileText: document.querySelector(".character-profile-copy")?.textContent?.replace(/\\s+/g, " ").trim() || "",
        heroBackground: getComputedStyle(document.querySelector(".character-hero") || document.body).backgroundImage,
        overflowX: overlay ? overlay.scrollWidth - overlay.clientWidth : 0,
        overflowY: overlay ? overlay.scrollHeight - overlay.clientHeight : 0,
      };
    })(),
    martialView: (() => {
      const overlay = document.querySelector(".martial-screen");
      const rect = overlay?.getBoundingClientRect();
      const box = (selector) => {
        const target = document.querySelector(selector)?.getBoundingClientRect();
        return target ? [target.left, target.top, target.width, target.height] : [0, 0, 0, 0];
      };
      return {
        visible: Boolean(overlay),
        rect: rect ? [rect.left, rect.top, rect.width, rect.height] : [0, 0, 0, 0],
        listRect: box(".martial-library"),
        loadoutRect: box(".martial-loadout"),
        detailRect: box(".martial-detail"),
        figureRect: box(".martial-figure"),
        slotSizes: [...document.querySelectorAll(".martial-slot")].map((entry) => {
          const box = entry.getBoundingClientRect();
          return [Math.round(box.width), Math.round(box.height)];
        }),
        backdrop: overlay ? getComputedStyle(overlay).backgroundImage : "",
        emblemBackground: getComputedStyle(document.querySelector(".martial-emblem") || document.body).backgroundImage,
        libraryTitle: document.querySelector(".martial-library-title")?.textContent?.trim() || "",
        silver: document.querySelector(".martial-silver")?.textContent?.replace(/\\s+/g, " ").trim() || "",
        categories: document.querySelectorAll(".martial-category-tabs button").length,
        subtypes: document.querySelectorAll(".martial-subtype-tabs button").length,
        listItems: document.querySelectorAll(".martial-list-item").length,
        loadoutSlots: document.querySelectorAll(".martial-slot").length,
        selected: document.querySelector(".martial-list-item.selected")?.dataset.value || "",
        selectedName: document.querySelector(".martial-detail h1")?.textContent?.trim() || "",
        mastery: document.querySelector(".martial-detail-head p")?.textContent?.replace(/\\s+/g, " ").trim() || "",
        progress: document.querySelector(".martial-cultivation header strong")?.textContent?.replace(/\\s+/g, " ").trim() || "",
        equipAction: document.querySelector(".martial-loadout-action [data-action='equip-martial'], .martial-loadout-action [data-action='confirm-replace-martial']")?.textContent?.trim() || "",
        trainDisabled: Boolean(document.querySelector("[data-action='train-martial']")?.disabled),
        overflowX: overlay ? overlay.scrollWidth - overlay.clientWidth : 0,
        overflowY: overlay ? overlay.scrollHeight - overlay.clientHeight : 0,
      };
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
await send("Network.enable");
await send("Network.clearBrowserCache");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await send("Storage.clearDataForOrigin", { origin: pageOrigin, storageTypes: "local_storage" });
await send("Page.navigate", { url: testUrl });
await new Promise((resolve) => setTimeout(resolve, 1000));

const checkpoints = [];
checkpoints.push(await snapshot("landing"));
assert.equal(checkpoints.at(-1).title, "武道");
assert.ok(checkpoints.at(-1).scrollWidth <= 1280);
assert.match(await evaluate(`document.querySelector('script[type="module"]')?.src || ""`), /wudao-app\.mjs\?v=20260728\.1/);
assert.match(await evaluate(`document.querySelector('link[rel="stylesheet"]')?.href || ""`), /styles\.css\?v=20260728\.1/);
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
await evaluate(`new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
const referenceOpening = await snapshot("opening-reference-1672x941");
assert.ok(referenceOpening.scrollWidth <= 1672);
assert.ok(referenceOpening.scrollHeight <= 941);
assert.ok(referenceOpening.shellRatio > 1.775 && referenceOpening.shellRatio < 1.779);
assert.ok(referenceOpening.sceneShare > 0.66 && referenceOpening.sceneShare < 0.672);
assert.ok(referenceOpening.topbarScale > 0.039 && referenceOpening.topbarScale < 0.042);
assert.ok(referenceOpening.openingActionScale[0] > 0.265 && referenceOpening.openingActionScale[0] < 0.285);
assert.ok(referenceOpening.openingActionScale[1] > 0.043 && referenceOpening.openingActionScale[1] < 0.047);
assert.equal(referenceOpening.currentChoicesVisible, true);
assert.match(referenceOpening.sceneBackground, /ruined-temple-stage-v3\.webp/);
assert.ok(referenceOpening.sceneCropFraction < 0.01);
assert.equal(referenceOpening.sceneMarkers.aligned, true);
assert.ok(referenceOpening.sceneMarkers.positions.embers[0] > 0.50 && referenceOpening.sceneMarkers.positions.embers[0] < 0.54, JSON.stringify(referenceOpening.sceneMarkers));
assert.ok(referenceOpening.sceneMarkers.positions.embers[1] > 0.71 && referenceOpening.sceneMarkers.positions.embers[1] < 0.74);
assert.ok(referenceOpening.sceneMarkers.positions.offering_table[0] > 0.24 && referenceOpening.sceneMarkers.positions.offering_table[0] < 0.27);
assert.ok(referenceOpening.sceneMarkers.positions.offering_table[1] > 0.48 && referenceOpening.sceneMarkers.positions.offering_table[1] < 0.51);
assert.ok(referenceOpening.sceneMarkers.positions.patched_wall[0] > 0.53 && referenceOpening.sceneMarkers.positions.patched_wall[0] < 0.56);
assert.ok(referenceOpening.sceneMarkers.positions.patched_wall[1] > 0.39 && referenceOpening.sceneMarkers.positions.patched_wall[1] < 0.43);
assert.ok(referenceOpening.sceneMarkers.positions.doorway[0] > 0.75 && referenceOpening.sceneMarkers.positions.doorway[0] < 0.79);
assert.ok(referenceOpening.sceneMarkers.positions.doorway[1] > 0.42 && referenceOpening.sceneMarkers.positions.doorway[1] < 0.46);
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
await clickSceneBlank();
const blankClosedInspection = await snapshot("opening-wall-inspection-blank-closed");
assert.equal(blankClosedInspection.sceneInspection.visible, false);
assert.equal(blankClosedInspection.sceneInspection.selectedId, "");
assert.equal(blankClosedInspection.sceneInspection.lineVisible, false);
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
await evaluate(`new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
const phoneLandscapeOpening = await snapshot("opening-phone-landscape");
assert.ok(phoneLandscapeOpening.scrollWidth <= 844);
assert.ok(phoneLandscapeOpening.scrollHeight <= 390);
assert.equal(phoneLandscapeOpening.splitView, true);
assert.ok(phoneLandscapeOpening.sceneRatio > 1.25 && phoneLandscapeOpening.sceneRatio < 1.3);
assert.equal(phoneLandscapeOpening.currentChoicesVisible, true);
assert.equal(phoneLandscapeOpening.sceneMarkers.aligned, true);
assert.match(phoneLandscapeOpening.sceneBackground, /ruined-temple-stage-v3\.webp/);
assert.ok(phoneLandscapeOpening.sceneCropFraction < 0.02);
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
await clickSceneBlank();
assert.equal((await snapshot("opening-wall-inspection-phone-blank-closed")).sceneInspection.visible, false);
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
await click("open-inventory");
const openingInventory = await snapshot("opening-full-inventory");
assert.equal(openingInventory.inventoryView.visible, true);
assert.ok(Math.abs(openingInventory.inventoryView.rect[0]) < 1);
assert.ok(Math.abs(openingInventory.inventoryView.rect[1]) < 1);
assert.ok(Math.abs(openingInventory.inventoryView.rect[2] - 1280) < 2);
assert.ok(Math.abs(openingInventory.inventoryView.rect[3] - 720) < 2);
assert.equal(openingInventory.inventoryView.heading, "全部物品");
assert.equal(openingInventory.inventoryView.capacity, "3 / 24");
assert.equal(openingInventory.inventoryView.categoryTabs, 6);
assert.deepEqual(openingInventory.inventoryView.categoryTabText, ["", "", "", "", "", ""]);
assert.deepEqual(openingInventory.inventoryView.categoryLabels, ["全部物品", "丹药", "材料", "兵具", "信物", "线索"]);
assert.equal(openingInventory.inventoryView.slots, 24);
assert.equal(openingInventory.inventoryView.occupied, 3);
assert.ok(openingInventory.inventoryView.slotText.every((entry) => /^\d+$/.test(entry)));
assert.match(openingInventory.inventoryView.selected, /半块家传玉佩/);
assert.match(openingInventory.inventoryView.detail, /半块家传玉佩/);
assert.doesNotMatch(openingInventory.inventoryView.detail, /来处|来源/);
assert.equal(openingInventory.inventoryView.silver, "银两 0两");
assert.equal(openingInventory.inventoryView.useVisible, false);
assert.ok(openingInventory.inventoryView.overflowX <= 1, JSON.stringify(openingInventory.inventoryView));
assert.ok(openingInventory.inventoryView.overflowY <= 1, JSON.stringify(openingInventory.inventoryView));
await click("select-inventory-item", "mountain_peach");
const peachInventory = await snapshot("opening-peach-inventory");
assert.match(peachInventory.inventoryView.detail, /山桃/);
assert.equal(peachInventory.inventoryView.useVisible, true);
assert.equal(peachInventory.inventoryView.useDisabled, true);
assert.match(peachInventory.inventoryView.detail, /腹中暂且不饥/);
await click("inventory-category", "medicine");
const medicineInventory = await snapshot("opening-medicine-inventory");
assert.equal(medicineInventory.inventoryView.heading, "丹药");
assert.equal(medicineInventory.inventoryView.occupied, 1);
assert.equal(medicineInventory.inventoryView.capacity, "3 / 24");
await screenshot("wudao-full-inventory-desktop.png");
await click("close-inventory");
assert.equal((await snapshot("opening-inventory-closed")).inventoryView.visible, false);
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
await click("open-character");
const landscapeCharacter = await snapshot("character-phone-landscape");
assert.equal(landscapeCharacter.characterView.visible, true);
assert.ok(Math.abs(landscapeCharacter.characterView.rect[2] - 844) < 2, JSON.stringify(landscapeCharacter.characterView));
assert.ok(Math.abs(landscapeCharacter.characterView.rect[3] - 390) < 2, JSON.stringify(landscapeCharacter.characterView));
assert.equal(landscapeCharacter.characterView.name, "陈司命");
assert.match(landscapeCharacter.characterView.realm, /境界/);
assert.match(landscapeCharacter.characterView.health, /气血/);
assert.match(landscapeCharacter.characterView.qi, /真气/);
assert.equal(landscapeCharacter.characterView.attributes.length, 5);
assert.equal(landscapeCharacter.characterView.equipmentSlots, 9);
assert.equal(new Set(landscapeCharacter.characterView.equipmentSlotSizes.map((entry) => entry.join("x"))).size, 1, JSON.stringify(landscapeCharacter.characterView.equipmentSlotSizes));
assert.equal(landscapeCharacter.characterView.sectionTabRects.length, 3);
assert.ok(landscapeCharacter.characterView.sectionTabBackgrounds.every((entry) => /gradient/.test(entry)), JSON.stringify(landscapeCharacter.characterView.sectionTabBackgrounds));
assert.ok(landscapeCharacter.characterView.sectionTabRects[2][1] + landscapeCharacter.characterView.sectionTabRects[2][3] < 390, JSON.stringify(landscapeCharacter.characterView.sectionTabRects));
assert.equal(landscapeCharacter.characterView.bagSlots, 24);
assert.equal(landscapeCharacter.characterView.occupiedBagSlots, 12);
assert.ok(landscapeCharacter.characterView.bagSlotSizes.every(([width, height]) => height > width), JSON.stringify(landscapeCharacter.characterView.bagSlotSizes));
assert.doesNotMatch(landscapeCharacter.characterView.profileText, /潜能|命灯/);
assert.match(landscapeCharacter.characterView.heroBackground, /chen-siming-paperdoll/);
assert.ok(landscapeCharacter.characterView.overflowX <= 1, JSON.stringify(landscapeCharacter.characterView));
assert.ok(landscapeCharacter.characterView.overflowY <= 1, JSON.stringify(landscapeCharacter.characterView));
const headBeforeEquipmentDetail = await evaluate(`document.querySelector(".slot-head")?.getAttribute("aria-label") || ""`);
await click("inspect-character-equipment", "traveler_straw_hat");
const equipmentDetail = await snapshot("character-equipment-detail");
assert.ok(equipmentDetail.characterView.equipmentDetail.length > 0);
assert.equal(equipmentDetail.characterView.equipmentDetailAction, "confirm-equip-character-item");
assert.equal(equipmentDetail.characterView.equipmentDetailButton, "替换");
assert.equal(equipmentDetail.characterView.equipmentDetailQualityColor, equipmentDetail.characterView.equipmentDetailNameColor);
assert.equal(equipmentDetail.characterView.equipmentDetailQualityColor, equipmentDetail.characterView.equipmentDetailBaseColor);
assert.equal(await evaluate(`document.querySelector(".slot-head")?.getAttribute("aria-label") || ""`), headBeforeEquipmentDetail);
await click("confirm-equip-character-item", "traveler_straw_hat");
assert.match(await evaluate(`document.querySelector(".slot-head")?.getAttribute("aria-label") || ""`), /江行斗笠/);
assert.equal(await evaluate(`Boolean(document.querySelector(".character-equipment-detail"))`), false);
await click("inspect-character-equipment", "traveler_straw_hat|head");
assert.equal((await snapshot("character-equipped-detail")).characterView.equipmentDetailAction, "confirm-unequip-character-item");
await click("confirm-unequip-character-item", "head");
assert.match(await evaluate(`document.querySelector(".slot-head")?.getAttribute("aria-label") || ""`), /未装备/);
await click("inspect-character-equipment", "iron_scale_vest");
const blockedReplacementDetail = await snapshot("character-blocked-replacement-detail");
assert.equal(blockedReplacementDetail.characterView.equipmentDetailButton, "替换");
assert.equal(blockedReplacementDetail.characterView.equipmentDetailDisabled, true);
await click("close-character-equipment-detail");
await screenshot("wudao-character-phone-landscape.png");
await click("close-character");
await click("open-inventory");
const landscapeInventory = await snapshot("inventory-phone-landscape");
assert.equal(landscapeInventory.inventoryView.visible, true);
assert.ok(Math.abs(landscapeInventory.inventoryView.rect[2] - 844) < 2, JSON.stringify(landscapeInventory.inventoryView));
assert.ok(Math.abs(landscapeInventory.inventoryView.rect[3] - 390) < 2, JSON.stringify(landscapeInventory.inventoryView));
assert.ok(landscapeInventory.inventoryView.overflowX <= 1);
assert.ok(landscapeInventory.inventoryView.overflowY <= 1);
assert.ok(landscapeInventory.scrollWidth <= 844);
assert.ok(landscapeInventory.scrollHeight <= 390);
await screenshot("wudao-full-inventory-phone-landscape.png");
await click("inventory-switch", "martial");
await evaluate(`new Promise((resolve) => requestAnimationFrame(resolve))`);
const emptyMartialLandscape = await snapshot("martial-empty-phone-landscape");
assert.equal(emptyMartialLandscape.martialView.visible, true);
assert.ok(Math.abs(emptyMartialLandscape.martialView.rect[2] - 844) < 2, JSON.stringify(emptyMartialLandscape.martialView));
assert.ok(Math.abs(emptyMartialLandscape.martialView.rect[3] - 390) < 2, JSON.stringify(emptyMartialLandscape.martialView));
assert.equal(emptyMartialLandscape.martialView.categories, 4);
assert.equal(emptyMartialLandscape.martialView.loadoutSlots, 6);
assert.ok(emptyMartialLandscape.martialView.overflowX <= 1);
assert.ok(emptyMartialLandscape.martialView.overflowY <= 1);
assert.ok(emptyMartialLandscape.scrollWidth <= 844);
assert.ok(emptyMartialLandscape.scrollHeight <= 390);
await screenshot("wudao-martial-empty-phone-landscape.png");
await click("close-martial");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
await click("temple-task", "traveler_relic");
await click("temple-task", "shen_promise");
await click("open-inventory");
assert.match((await snapshot("inventory-with-temple-relics")).inventoryView.detail, /山桃|半块家传玉佩/);
assert.match(await evaluate(`document.querySelector('[aria-label^="金陵东郊残图"]')?.getAttribute("aria-label") || ""`), /金陵东郊残图/);
assert.match(await evaluate(`document.querySelector('[aria-label^="沈字铜钱"]')?.getAttribute("aria-label") || ""`), /沈字铜钱/);
await click("close-inventory");
await click("meet-lady");

const ladyBeforeReveal = await text();
assert.match(ladyBeforeReveal, /青衣妇人/);
assert.doesNotMatch(ladyBeforeReveal, /龙青鱼|漕帮帮主夫人/);
assert.doesNotMatch(ladyBeforeReveal, /现实|论坛|武道局|其他玩家|其它玩家/);
const ladyStage = await snapshot("lady-stage-desktop");
assert.match(ladyStage.sceneBackground, /ruined-temple-lady-stage-v3\.webp/);
assert.ok(ladyStage.sceneCropFraction < 0.02);
assert.ok(ladyStage.actorPositions.green_lady[0] > 0.74 && ladyStage.actorPositions.green_lady[0] < 0.77);
assert.ok(ladyStage.actorPositions.green_lady[1] > 0.46 && ladyStage.actorPositions.green_lady[1] < 0.5);
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
assert.match(await text(), /医术一、悟性三、阅历五百方可入门/);
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
assert.match(await text(), /医术一、悟性三、阅历五百方可入门/);
assert.match(await text(), /阅历\s*1695/);
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
assert.match(await text(), /当前携带\s*打鱼杆法／春风化雨针/);
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
await click("first-battle-action", "reckless");
await click("end-first-battle-turn");
assert.match(await text(), /第 3 轮/);
await click("first-battle-action", "reckless");
await click("end-first-battle-turn");
assert.match(await text(), /第 4 轮/);
await click("first-battle-action", "reckless");
await click("end-first-battle-turn");
assert.match(await text(), /第 5 轮/);
assert.equal(await evaluate(`document.querySelector('[data-action="first-battle-action"][data-value="kill"]')?.disabled === false`), true);
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
if (await evaluate(`Boolean(document.querySelector('[data-action="treat-p0-wound"][data-value="needles"]'))`)) {
  await click("treat-p0-wound", "needles");
}
await click("train-stake");
assert.match(await text(), /一次真正的生死见闻\s*已具备/);
assert.equal(await evaluate(`document.querySelector('[data-action="body-breakthrough"][data-value="force"]')`), null);
await click("body-breakthrough", "steady");
assert.match(await text(), /锻体一重/);
assert.equal(JSON.parse(await evaluate(`localStorage.getItem("wudao-high-martial-v1")`)).characterVitals.health > 0, true);
assert.match(await text(), /燕惊鸿/);
await click("enter-wang-encounter");
assert.match(await text(), /身份线索/);
assert.match(await text(), /尾随/);
await click("wang-battle-action", "observe_tail");
await click("wang-battle-action", "send_yan_ahead");
if (await evaluate(`Boolean(document.querySelector('[data-action="wang-battle-action"][data-value="observe_tail"]'))`)) {
  await click("wang-battle-action", "observe_tail");
}
assert.match(await text(), /王卓在东湖岸边抖开锁链刀/);
await click("wang-battle-action", "cut_skiff_loose");
let wangState = JSON.parse(await evaluate(`localStorage.getItem("wudao-high-martial-v1")`));
if (!wangState.p0.wangBattle.battle.conditions.escapeRoute) {
  await click("wang-battle-action", "read_chain");
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
assert.equal(saved.version, 7);
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
assert.equal(saved.martial.experience, saved.potential);
assert.equal(saved.martial.loadout.heart, "fish_leap_art");
const savedTechniques = [saved.martial.loadout.technique1, saved.martial.loadout.technique2, saved.martial.loadout.technique3].filter(Boolean);
assert.ok(savedTechniques.includes("spring_rain_needles"));
assert.ok(savedTechniques.includes("fishing_rod_method"));
assert.equal(saved.martial.loadout.body, "sea_stilling_stake");
assert.equal(saved.p0.complete, true);
assert.equal(saved.p0.treatmentOutcome, "saved");
assert.equal(saved.p0.battleOutcome, "killed");
assert.equal(saved.p0.wangOutcome, "protected_escape");
assert.equal(saved.p0.wangConsequences.yanJinghong, "safe");
assert.ok(saved.p0.relationships.yan_jinghong.trust >= 58);
assert.equal(saved.p0.assailantPlot.outcome, "false_report");
assert.ok(saved.p0.evidence.includes("assailant_channel_controlled"));
assert.equal(saved.p0.activeMartial.technique, savedTechniques[0]);
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

const inventoryUseSave = structuredClone(saved);
inventoryUseSave.screen = "stakeTraining";
inventoryUseSave.shenSilver = 12.43;
inventoryUseSave.peaches = 3;
inventoryUseSave.templeOpening = { ...inventoryUseSave.templeOpening, belongingsChecked: true, peachEaten: true };
inventoryUseSave.completedTempleTasks = ["traveler_relic", "shen_promise"];
inventoryUseSave.inventory = ["qingqing_book", "hundred_pills_notes", "return_spring_pills"];
inventoryUseSave.alchemyPills = 2;
inventoryUseSave.p0 = createP0State();
inventoryUseSave.p0.started = true;
inventoryUseSave.p0.items = {
  ...inventoryUseSave.p0.items,
  return_spring_pill: 6,
  purple_scale_herb: 2,
  blood_vine_core: 2,
  calm_pulse_sand: 3,
  purple_dragon_blood_pill: 1,
  spring_rain_needles: 6,
  fish_scale_token: 2,
  monkey_wine: 1,
  ape_relief_rubbing: 1,
};
inventoryUseSave.p0.wounds = [{ id: "inventory_rib_cut", bodyPart: "ribs", severity: 2 }];
await reloadWithSave(inventoryUseSave);
await send("Emulation.setDeviceMetricsOverride", { width: 1672, height: 941, deviceScaleFactor: 1, mobile: false });
await click("open-inventory");
await click("select-inventory-item", "return_spring_pill");
const usablePillInventory = await snapshot("inventory-usable-pill");
assert.equal(usablePillInventory.inventoryView.useVisible, true);
assert.equal(usablePillInventory.inventoryView.useDisabled, false);
assert.equal(usablePillInventory.inventoryView.capacity, "16 / 24");
assert.equal(usablePillInventory.inventoryView.occupied, 16);
assert.ok(Math.abs(usablePillInventory.inventoryView.topbarRect[3] - 68) < 2);
assert.ok(Math.abs(usablePillInventory.inventoryView.catalogRect[2] - 1080) < 3);
assert.ok(Math.abs(usablePillInventory.inventoryView.gridRect[0] - 80) < 5);
assert.ok(Math.abs(usablePillInventory.inventoryView.gridRect[1] - 259) < 8);
assert.ok(Math.abs(usablePillInventory.inventoryView.firstSlotRect[2] - 144) < 8);
assert.match(usablePillInventory.inventoryView.detail, /下品回春丹/);
assert.doesNotMatch(usablePillInventory.inventoryView.detail, /来处|来源/);
await screenshot("wudao-inventory-reference-1672x941.png");
await click("use-inventory-item", "return_spring_pill");
const usedPillState = JSON.parse(await evaluate(`localStorage.getItem("wudao-high-martial-v1")`));
assert.equal(usedPillState.p0.items.return_spring_pill, 5);
assert.equal(usedPillState.p0.wounds.length, 0);
assert.equal(usedPillState.alchemyPills, 5);
assert.match(await evaluate(`document.querySelector(".inventory-feedback")?.textContent || ""`), /回春丹 -1 · 伤势稳定/);
await screenshot("wudao-full-inventory-used-pill.png");
await click("close-inventory");
await click("open-character");
const characterReference = await snapshot("character-reference-1672x941");
assert.equal(characterReference.characterView.visible, true);
assert.ok(Math.abs(characterReference.characterView.topbarRect[3] - 68) < 2);
assert.ok(Math.abs(characterReference.characterView.leftRect[2] - 513) < 5, JSON.stringify(characterReference.characterView));
assert.ok(Math.abs(characterReference.characterView.paperdollRect[2] - 563) < 5, JSON.stringify(characterReference.characterView));
assert.ok(Math.abs(characterReference.characterView.bagRect[2] - 595) < 5, JSON.stringify(characterReference.characterView));
assert.equal(characterReference.characterView.equipmentSlots, 9);
assert.equal(new Set(characterReference.characterView.equipmentSlotSizes.map((entry) => entry.join("x"))).size, 1, JSON.stringify(characterReference.characterView.equipmentSlotSizes));
assert.equal(characterReference.characterView.bagSlots, 24);
assert.match(characterReference.characterView.defense, /防御.*减伤/);
assert.doesNotMatch(characterReference.characterView.profileText, /潜能|命灯/);
assert.ok(characterReference.characterView.overflowX <= 1);
assert.ok(characterReference.characterView.overflowY <= 1);
await screenshot("wudao-character-reference-1672x941.png");
await click("close-character");
await click("open-martial");
const martialReference = await snapshot("martial-reference-1672x941");
assert.equal(martialReference.martialView.visible, true);
assert.equal(martialReference.martialView.categories, 4);
assert.equal(martialReference.martialView.loadoutSlots, 6);
assert.ok(martialReference.martialView.listItems >= 1);
assert.equal(martialReference.martialView.libraryTitle, "所学武学");
assert.match(martialReference.martialView.silver, /银两/);
assert.match(martialReference.martialView.backdrop, /martial-screen-backdrop\.webp/);
assert.match(martialReference.martialView.emblemBackground, /martial-emblem-atlas\.webp/);
assert.ok(Math.abs(martialReference.martialView.listRect[2] / 1672 - 0.314) < 0.01, JSON.stringify(martialReference.martialView));
assert.ok(Math.abs(martialReference.martialView.loadoutRect[2] / 1672 - 0.36) < 0.01, JSON.stringify(martialReference.martialView));
assert.ok(Math.abs(martialReference.martialView.detailRect[2] / 1672 - 0.326) < 0.01, JSON.stringify(martialReference.martialView));
assert.ok(martialReference.martialView.figureRect[2] > 590 && martialReference.martialView.figureRect[3] > 860, JSON.stringify(martialReference.martialView));
assert.equal(new Set(martialReference.martialView.slotSizes.map((entry) => entry.join("x"))).size, 1, JSON.stringify(martialReference.martialView.slotSizes));
assert.ok(martialReference.martialView.overflowX <= 1);
assert.ok(martialReference.martialView.overflowY <= 1);
assert.match(martialReference.martialView.mastery, /入门|熟练|精通|圆满/);
await click("martial-category", "technique");
await click("martial-subtype", "hidden_weapon");
await click("select-martial", "spring_rain_needles");
const techniqueReference = await snapshot("martial-technique-reference-1672x941");
assert.equal(techniqueReference.martialView.subtypes, 6);
assert.equal(techniqueReference.martialView.listItems, 1);
assert.equal(techniqueReference.martialView.selectedName, "春风化雨针");
assert.match(techniqueReference.martialView.progress, /熟练 · 60／100/);
await click("martial-node-detail", "seal_wrist");
assert.match(await evaluate(`document.querySelector(".martial-node-tip")?.innerText || ""`), /主动 · 入门.*封腕/s);
await screenshot("wudao-martial-reference-1672x941.png");
await click("close-martial-node");
const martialBeforeTraining = JSON.parse(await evaluate(`localStorage.getItem("wudao-high-martial-v1")`));
await click("train-martial", "spring_rain_needles");
const martialAfterTraining = JSON.parse(await evaluate(`localStorage.getItem("wudao-high-martial-v1")`));
assert.equal(martialAfterTraining.martial.experience, martialBeforeTraining.martial.experience - 40);
assert.equal(martialAfterTraining.martial.learned.spring_rain_needles.progress, 70);
await click("unequip-martial", "spring_rain_needles");
assert.equal(Object.values(JSON.parse(await evaluate(`localStorage.getItem("wudao-high-martial-v1")`)).martial.loadout).includes("spring_rain_needles"), false);
await click("equip-martial", "spring_rain_needles");
assert.equal(Object.values(JSON.parse(await evaluate(`localStorage.getItem("wudao-high-martial-v1")`)).martial.loadout).includes("spring_rain_needles"), true);
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
const martialDesktop = await snapshot("martial-desktop-1280x720");
assert.ok(martialDesktop.martialView.overflowX <= 1);
assert.ok(martialDesktop.martialView.overflowY <= 1);
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const martialPortrait = await snapshot("martial-phone-portrait");
assert.equal(martialPortrait.martialView.visible, true);
assert.ok(martialPortrait.martialView.overflowX <= 1);
assert.ok(martialPortrait.scrollWidth <= 390);
await click("close-martial");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

const versionFiveSave = structuredClone(saved);
versionFiveSave.version = 5;
delete versionFiveSave.equipment;
delete versionFiveSave.characterVitals;
await reloadWithSave(versionFiveSave);
const migratedVersionSeven = JSON.parse(await evaluate(`localStorage.getItem("wudao-high-martial-v1")`));
assert.equal(migratedVersionSeven.version, 7);
assert.equal(migratedVersionSeven.equipment.owned.length, 12);
assert.equal(Object.keys(migratedVersionSeven.equipment.slots).length, 9);
assert.deepEqual(migratedVersionSeven.characterVitals, { health: null, qi: null });
assert.ok(migratedVersionSeven.martial);
assert.equal(migratedVersionSeven.martial.experience, migratedVersionSeven.potential);

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
failedCheckSave.attributes = { constitution: 0, insight: -5, agility: 0, strength: 0, fortune: 0 };
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
