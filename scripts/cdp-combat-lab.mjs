import assert from "node:assert/strict";

const port = Number(process.argv[2] || 9225);
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const tab = tabs.find((item) => item.type === "page" && /^https?:\/\/(127\.0\.0\.1|localhost)/.test(item.url));
if (!tab) throw new Error(`No local browser page found on debugging port ${port}`);

const origin = new URL(tab.url).origin;
const socket = new WebSocket(tab.webSocketDebuggerUrl);
const pending = new Map();
const pageErrors = [];
let id = 0;

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") pageErrors.push(message.params?.exceptionDetails?.exception?.description || "Unknown page exception");
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
  const response = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || "Page evaluation failed");
  return response.result.value;
}

async function waitFor(expression, timeout = 8000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function setViewport(width, height, mobile) {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
}

async function navigate() {
  await send("Page.navigate", { url: `${origin}/combat.html?qa=${Date.now()}` });
  await waitFor('document.querySelector(".command-deck")');
}

async function click(selector) {
  await evaluate(`(() => { const button = document.querySelector(${JSON.stringify(selector)}); if (!button) throw new Error(${JSON.stringify(`Missing ${selector}`)}); if (button.disabled) throw new Error(${JSON.stringify(`Disabled ${selector}`)}); button.click(); })()`);
  await new Promise((resolve) => setTimeout(resolve, 30));
}

const clickAction = (id) => click(`[data-action-id="${id}"]`);
const clickCommand = (id) => click(`[data-command="${id}"]`);
const clickEncounter = (id) => click(`[data-encounter-id="${id}"]`);

async function snapshot(label) {
  return evaluate(`(() => {
    const rect = (selector) => { const value = document.querySelector(selector)?.getBoundingClientRect(); return value ? { top: value.top, bottom: value.bottom, left: value.left, right: value.right } : null; };
    const styleSize = (selector) => { const node = document.querySelector(selector); return node ? Number.parseFloat(getComputedStyle(node).fontSize || "0") : 0; };
    return {
      label: ${JSON.stringify(label)},
      width: innerWidth,
      height: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      encounter: document.querySelector(".command-deck")?.dataset.encounter || "",
      heading: document.querySelector("h1")?.textContent?.trim() || "",
      text: document.querySelector("#combat-lab")?.innerText || "",
      settings: document.querySelectorAll("[data-setting]").length,
      phase: document.querySelector(".turn-bar")?.dataset.phase || "",
      round: Number(document.querySelector(".turn-bar")?.dataset.round || 0),
      energy: Number(document.querySelector(".turn-bar")?.dataset.energy || 0),
      enemyUnits: document.querySelectorAll(".enemy-unit").length,
      enemyHp: [...document.querySelectorAll(".enemy-unit [role=meter]")].map((node) => Number(node.getAttribute("aria-valuenow"))),
      actions: [...document.querySelectorAll("[data-action-id]")].map((node) => node.dataset.actionId),
      recommended: [...document.querySelectorAll(".recommended-actions [data-action-id]")].map((node) => node.dataset.actionId),
      forecasts: [...document.querySelectorAll(".action-forecast")].map((node) => node.textContent.trim()),
      ratings: [...document.querySelectorAll(".recommended-actions .action-risk b")].map((node) => node.textContent.trim()),
      outcome: Boolean(document.querySelector(".outcome-panel.victory")),
      death: Boolean(document.querySelector(".outcome-panel.death")),
      pursuit: Boolean(document.querySelector(".pursuit-status")),
      pursuitEnemyMeters: document.querySelectorAll(".pursuit-stage .enemy-unit [role=meter]").length,
      positionMapDisplay: document.querySelector(".position-map") ? getComputedStyle(document.querySelector(".position-map")).display : "none",
      actionRects: [...document.querySelectorAll(".recommended-actions .context-action")].map((node) => { const value = node.getBoundingClientRect(); return { top: value.top, bottom: value.bottom }; }),
      scene: rect(".scene-art"),
      rail: rect(".enemy-rail"),
      enemyTextSize: styleSize(".unit-copy small"),
      forecastTextSize: styleSize(".action-copy .action-forecast"),
    };
  })()`);
}

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });

await setViewport(1280, 720, false);
await navigate();
const desktop = await snapshot("desktop");
assert.equal(desktop.encounter, "rain_ambush");
assert.equal(desktop.settings, 0);
assert.deepEqual(desktop.enemyHp, [18, 8, 12]);
assert.deepEqual(desktop.ratings.every((label) => ["条件占优", "条件相持", "条件不利", "已知死局", "不可用"].includes(label)), true);
assert.ok(desktop.forecasts.every((text) => /收势后：若此刻收势/.test(text)));
assert.ok(desktop.scrollWidth <= desktop.width);

await clickAction("observe");
await clickAction("extinguish");
await waitFor('document.querySelector(".turn-bar")?.dataset.round === "2"');
await clickAction("needle_wrist");
await clickCommand("end-turn");
await waitFor('document.querySelector(".turn-bar")?.dataset.round === "3"');
await clickAction("needle_wrist");
await clickCommand("end-turn");
await waitFor('document.querySelector(".turn-bar")?.dataset.round === "4"');
const finisherReady = await snapshot("finisher-ready");
assert.ok(finisherReady.enemyHp[0] <= 9);
assert.ok(finisherReady.actions.includes("seal"));
await clickAction("seal");
await waitFor('document.querySelector(".outcome-panel.victory")');
const subdued = await snapshot("subdued");
assert.equal(subdued.outcome, true);
assert.match(subdued.text, /留下活口|刀客被生擒/);

await setViewport(390, 844, true);
await navigate();
const portraitGate = await evaluate(`(() => ({
  gateDisplay: getComputedStyle(document.querySelector(".landscape-required")).display,
  appVisibility: getComputedStyle(document.querySelector("#combat-lab")).visibility,
  text: document.querySelector(".landscape-required")?.innerText || ""
}))()`);
assert.equal(portraitGate.gateDisplay, "flex");
assert.equal(portraitGate.appVisibility, "hidden");
assert.match(portraitGate.text, /请横置设备/);

await setViewport(844, 390, true);
await navigate();
const landscape = await snapshot("landscape");
assert.ok(landscape.scrollWidth <= 844);
assert.ok(landscape.enemyTextSize >= 10);
assert.ok(landscape.forecastTextSize >= 10);
assert.ok(landscape.actionRects.length === 3 && landscape.actionRects.every((entry) => entry.bottom <= 390), JSON.stringify(landscape.actionRects));

await setViewport(1280, 720, false);
await navigate();
await clickEncounter("wang_zhuo_east_lake");
const pursuit = await snapshot("pursuit");
assert.equal(pursuit.encounter, "wang_zhuo_east_lake");
assert.match(pursuit.heading, /柳巷尾随/);
assert.equal(pursuit.pursuit, true);
assert.equal(pursuit.pursuitEnemyMeters, 0);
assert.match(pursuit.text, /身份线索/);
assert.match(pursuit.text, /同行去向/);
assert.match(pursuit.text, /对方警觉/);
await clickAction("observe_tail");
await clickAction("send_yan_ahead");
await clickAction("observe_tail");
await waitFor('/河岸截命/.test(document.querySelector("h1")?.textContent || "")');
const riverbank = await snapshot("riverbank");
assert.equal(riverbank.pursuit, false);
assert.equal(riverbank.enemyUnits, 2);
assert.deepEqual(riverbank.enemyHp, [26, 10]);
assert.ok(riverbank.actions.includes("companion_pin"));
assert.ok(riverbank.actions.includes("needle_wang"));

assert.deepEqual(pageErrors, []);
socket.close();
console.log(JSON.stringify({ ok: true, checkpoints: [desktop, finisherReady, subdued, landscape, pursuit, riverbank].map(({ label, encounter, round, enemyHp, pursuit: tail }) => ({ label, encounter, round, enemyHp, pursuit: tail })) }, null, 2));
