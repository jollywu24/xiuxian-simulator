import { resolvePaperDollLayers } from "./paperdoll-system.mjs?v=20260806.5";

const PAPER_DOLL_CANVAS = Object.freeze({ width: 1024, height: 1536 });
const imageCache = new Map();

function versionedAsset(asset, version) {
  if (!asset) return null;
  const separator = asset.includes("?") ? "&" : "?";
  return `${asset}${separator}v=${encodeURIComponent(version)}`;
}

function loadImage(asset, version) {
  const source = versionedAsset(asset, version);
  if (!imageCache.has(source)) {
    imageCache.set(source, new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`无法读取人物部件：${asset}`));
      image.src = source;
    }));
  }
  return imageCache.get(source);
}

function makeBuffer(canvas) {
  const buffer = document.createElement("canvas");
  buffer.width = canvas.width;
  buffer.height = canvas.height;
  return buffer;
}

async function drawLayer(context, canvas, layer, version) {
  const image = await loadImage(layer.asset, version);
  if (!layer.maskAsset) {
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return;
  }

  const mask = await loadImage(layer.maskAsset, version);
  const buffer = makeBuffer(canvas);
  const bufferContext = buffer.getContext("2d");
  bufferContext.drawImage(image, 0, 0, buffer.width, buffer.height);
  bufferContext.globalCompositeOperation = "destination-out";
  bufferContext.drawImage(mask, 0, 0, buffer.width, buffer.height);
  bufferContext.globalCompositeOperation = "source-over";
  context.drawImage(buffer, 0, 0);
}

export async function renderPaperDollCanvas(canvas, composition, { assetVersion = "1" } = {}) {
  if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError("Paper doll target must be a canvas.");
  const token = String(Number(canvas.dataset.renderToken || 0) + 1);
  canvas.dataset.renderToken = token;
  canvas.dataset.renderReady = "false";
  canvas.dataset.renderError = "";
  canvas.width = PAPER_DOLL_CANVAS.width;
  canvas.height = PAPER_DOLL_CANVAS.height;

  const context = canvas.getContext("2d", { alpha: true });
  context.clearRect(0, 0, canvas.width, canvas.height);
  const stagedCanvas = makeBuffer(canvas);
  const stagedContext = stagedCanvas.getContext("2d", { alpha: true });
  const layers = [...(composition?.layers || [])].sort((left, right) => left.z - right.z);
  for (const layer of layers) {
    if (!layer?.asset) continue;
    await drawLayer(stagedContext, stagedCanvas, layer, assetVersion);
    if (canvas.dataset.renderToken !== token) return false;
  }

  context.drawImage(stagedCanvas, 0, 0);
  canvas.dataset.layerIds = JSON.stringify(layers.map((layer) => layer.id));
  canvas.dataset.maskedLayerIds = JSON.stringify(layers.filter((layer) => layer.maskAsset).map((layer) => layer.id));
  canvas.dataset.renderReady = "true";
  return true;
}

export async function renderPaperDollCanvases(root, { assetVersion = "1" } = {}) {
  const canvases = [...root.querySelectorAll("canvas[data-paper-doll-plan]")];
  return Promise.all(canvases.map(async (canvas) => {
    let composition = null;
    try {
      composition = JSON.parse(decodeURIComponent(canvas.dataset.paperDollPlan));
      await renderPaperDollCanvas(canvas, composition, { assetVersion });
      canvas.dataset.renderFallback = "false";
      canvas.closest(".paper-doll-composition")?.classList.remove("has-render-error");
      return true;
    } catch (error) {
      const originalError = error?.message || "人物形象未能绘成";
      const wrapper = canvas.closest(".paper-doll-composition");
      try {
        const fallback = resolvePaperDollLayers({ appearance: { body: composition?.appearance?.body || "male" } });
        await renderPaperDollCanvas(canvas, fallback, { assetVersion });
        canvas.dataset.renderFallback = "true";
        canvas.dataset.renderError = originalError;
        const message = wrapper?.querySelector(".paper-doll-render-error");
        if (message) message.textContent = "个别装束未能绘成，已换回默认样式";
      } catch (fallbackError) {
        canvas.dataset.renderReady = "false";
        canvas.dataset.renderFallback = "false";
        canvas.dataset.renderError = `${originalError}；${fallbackError?.message || "默认形象也未能绘成"}`;
      }
      wrapper?.classList.add("has-render-error");
      return false;
    }
  }));
}
