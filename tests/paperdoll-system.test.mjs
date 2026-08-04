import assert from "node:assert/strict";
import test from "node:test";

import {
  createEquipmentState,
  equipEquipmentItem,
} from "../web/character-system.mjs";
import {
  PAPER_DOLL_RUNTIME_ASSETS,
  paperDollVisibleItemIds,
  resolvePaperDollLayers,
} from "../web/paperdoll-system.mjs";

test("人物由底像与十一类容貌层按稳定顺序合成", () => {
  const composition = resolvePaperDollLayers({
    appearance: {
      body: "female",
      hat: 3,
      frontHair: 2,
      backHair: 2,
      eyes: 2,
      brows: 2,
      mouth: 2,
      nose: 2,
      faceShape: 2,
      backAccessory: 2,
      clothing: 2,
      faceAccessory: 2,
    },
  });
  assert.equal(composition.appearance.body, "female");
  assert.deepEqual(composition.layers.map((layer) => layer.kind), [
    "backAccessory", "backHair", "base", "clothing", "faceShape", "eyes", "brows", "nose", "mouth", "frontHair", "faceAccessory", "hatFront",
  ]);
  assert.ok(composition.layers.some((layer) => layer.kind === "base" && layer.asset === "./assets/appearance/rig-v1/female-base-v4.webp"));
  assert.equal(composition.layers.at(-1).asset, "./assets/appearance/rig-v1/female-hat-3-front-v3.webp");
  assert.deepEqual(composition.layers.filter((layer) => layer.maskAsset).map((layer) => layer.kind), ["backHair", "frontHair"]);
  assert.ok(composition.layers.filter((layer) => layer.maskAsset).every((layer) => layer.maskAsset === "./assets/appearance/rig-v1/female-hat-3-hair-mask-v3.webp"));
  assert.ok(composition.layers.filter((layer) => layer.kind !== "base").every((layer) => layer.source === "image"));
  assert.ok(composition.layers.every((layer) => layer.href == null));
});

test("无帽无脸饰无后背时不渲染空部件但其它类别保留", () => {
  const layers = resolvePaperDollLayers({}).layers;
  assert.equal(layers.some((layer) => layer.kind === "hatFront"), false);
  assert.equal(layers.some((layer) => layer.kind === "faceAccessory"), false);
  assert.equal(layers.some((layer) => layer.kind === "backAccessory"), false);
  assert.deepEqual(layers.map((layer) => layer.kind), [
    "backHair", "base", "clothing", "faceShape", "eyes", "brows", "nose", "mouth", "frontHair",
  ]);
  assert.ok(layers.some((layer) => layer.kind === "frontHair" && layer.source === "image"));
  assert.ok(layers.some((layer) => layer.kind === "faceShape" && layer.source === "image"));
  assert.ok(layers.some((layer) => layer.kind === "clothing" && layer.source === "image"));
  assert.ok(layers.every((layer) => !layer.maskAsset));
});

test("更换装备只改变装备状态，不进入人物外观层", () => {
  const initial = createEquipmentState();
  const equipped = equipEquipmentItem(initial, "traveler_straw_hat", {
    attributes: { constitution: 2 },
  });
  assert.equal(equipped.available, true);
  assert.deepEqual(paperDollVisibleItemIds(equipped.state), []);
  const before = resolvePaperDollLayers({ appearance: { hat: 2 }, equipment: initial }).layers;
  const after = resolvePaperDollLayers({ appearance: { hat: 2 }, equipment: equipped.state }).layers;
  assert.deepEqual(after, before);
});

test("正式分层容貌资源包含透明锚点与全部手绘组件", () => {
  assert.equal(PAPER_DOLL_RUNTIME_ASSETS.length, 46);
  assert.deepEqual(PAPER_DOLL_RUNTIME_ASSETS.slice(0, 2), [
    "./assets/appearance/rig-v1/male-base-v4.webp",
    "./assets/appearance/rig-v1/female-base-v4.webp",
  ]);
  assert.ok(PAPER_DOLL_RUNTIME_ASSETS.includes("./assets/appearance/rig-v1/male-hat-3-front-v3.webp"));
  assert.ok(PAPER_DOLL_RUNTIME_ASSETS.includes("./assets/appearance/rig-v1/male-hat-3-hair-mask-v3.webp"));
  assert.ok(PAPER_DOLL_RUNTIME_ASSETS.includes("./assets/appearance/rig-v1/female-faceAccessory-2-v3.webp"));
  assert.ok(PAPER_DOLL_RUNTIME_ASSETS.includes("./assets/appearance/rig-v1/female-clothing-2-v3.webp"));
  assert.ok(PAPER_DOLL_RUNTIME_ASSETS.every((asset) => asset.endsWith(".webp")));
});
