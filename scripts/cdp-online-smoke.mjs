import assert from "node:assert/strict";

const port = Number(process.argv[2] || 9225);
const expectedBuildSha = process.env.EXPECTED_BUILD_SHA || "";
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const tab = tabs.find((item) => item.type === "page" && /^https?:\/\//.test(item.url));
if (!tab) throw new Error(`No deployed browser page found on debugging port ${port}`);

const baseUrl = new URL(tab.url);
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

async function waitFor(expression, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastValue;
  while (Date.now() < deadline) {
    lastValue = await evaluate(expression);
    if (lastValue) return lastValue;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for: ${expression}; last value: ${JSON.stringify(lastValue)}`);
}

async function navigate(search) {
  const url = new URL(baseUrl);
  url.search = search;
  pageErrors.length = 0;
  await send("Page.navigate", { url: url.href });
  await waitFor(`document.documentElement.dataset.appReady === "true"`);
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
    return true;
  })()`);
}

await send("Page.enable");
await send("Runtime.enable");

await navigate(`?build=${encodeURIComponent(expectedBuildSha || "online")}`);
assert.equal(await evaluate(`typeof window.WudaoDebug`), "undefined");
if (expectedBuildSha) {
  assert.equal(await evaluate(`document.documentElement.dataset.buildSha`), expectedBuildSha);
}
assert.ok(await evaluate(`document.querySelector("#app")?.childElementCount > 0`));
assert.ok(await evaluate(`document.styleSheets.length > 0`));
await click("new-journey");
await click("enter-creation");
assert.equal(await evaluate(`document.querySelectorAll(".origin-choice-card").length`), 3);
assert.deepEqual(
  await evaluate(`[...document.querySelectorAll(".origin-creation-step b")].map((item) => item.textContent.trim())`),
  ["出身", "容貌", "天赋", "属性"],
);
assert.equal(await evaluate(`document.querySelector(".origin-choice-card.selected")?.dataset.value`), "shen_branch");
assert.equal(await evaluate(`document.querySelector(".origin-confirm-button")?.textContent.trim()`), "确认出身");
assert.match(
  await evaluate(`getComputedStyle(document.querySelector('[data-value="streetborn"] .origin-card-art')).backgroundImage`),
  /origin-streetborn-v1\.webp/,
);
assert.equal(await evaluate(`document.querySelectorAll(".origin-card-copy > span").length`), 1);
assert.equal(await evaluate(`document.documentElement.scrollWidth <= document.documentElement.clientWidth`), true);

await send("Emulation.setDeviceMetricsOverride", {
  width: 844,
  height: 390,
  deviceScaleFactor: 1,
  mobile: true,
});
assert.equal(await evaluate(`document.documentElement.scrollWidth <= 844`), true);
assert.equal(await evaluate(`document.querySelectorAll(".origin-choice-card").length`), 3);

await navigate(`?debug=1&build=${encodeURIComponent(expectedBuildSha || "online")}`);
const status = JSON.parse(await evaluate(`JSON.stringify(window.WudaoDebug?.status())`));
assert.equal(status.protocolVersion, 1);
assert.equal(status.ready, true);
if (expectedBuildSha) assert.equal(status.buildSha, expectedBuildSha);
assert.equal(typeof status.screen, "string");
assert.deepEqual(pageErrors, []);

socket.close();
process.stdout.write(`${JSON.stringify({
  ok: true,
  buildSha: status.buildSha,
  debugProtocol: status.protocolVersion,
  responsive: "844x390",
  screen: status.screen,
  url: baseUrl.href,
})}\n`);
