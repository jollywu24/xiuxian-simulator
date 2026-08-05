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

test("人物由同一母版派生的衣服底像与头部变体合成", () => {
  const composition = resolvePaperDollLayers({
    appearance: {
      body: "female",
      hat: 2,
      clothing: 2,
    },
  });
  assert.equal(composition.appearance.body, "female");
  assert.deepEqual(composition.layers.map((layer) => layer.kind), ["base", "hatFront"]);
  assert.ok(composition.layers.some((layer) => layer.kind === "base" && layer.asset === "./assets/appearance/rig-v2/female-clothing-2-v1.webp"));
  assert.equal(composition.layers.at(-1).asset, "./assets/appearance/rig-v2/female-head-2-v1.webp");
  assert.ok(composition.layers.every((layer) => !layer.maskAsset));
  assert.ok(composition.layers.filter((layer) => layer.kind !== "base").every((layer) => layer.source === "image"));
  assert.ok(composition.layers.every((layer) => layer.href == null));
});

test("未开放的独立五官和发型不生成伪组件", () => {
  const layers = resolvePaperDollLayers({}).layers;
  assert.equal(layers.some((layer) => layer.kind === "hatFront"), false);
  assert.equal(layers.some((layer) => layer.kind === "faceAccessory"), false);
  assert.equal(layers.some((layer) => layer.kind === "backAccessory"), false);
  assert.deepEqual(layers.map((layer) => layer.kind), ["base"]);
  assert.equal(layers[0].asset, "./assets/appearance/rig-v2/male-clothing-1-v1.webp");
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

test("正式容貌资源只包含已经同源验收的衣服与头部变体", () => {
  assert.equal(PAPER_DOLL_RUNTIME_ASSETS.length, 6);
  assert.deepEqual(PAPER_DOLL_RUNTIME_ASSETS.slice(0, 4), [
    "./assets/appearance/rig-v2/male-clothing-1-v1.webp",
    "./assets/appearance/rig-v2/male-clothing-2-v1.webp",
    "./assets/appearance/rig-v2/female-clothing-1-v1.webp",
    "./assets/appearance/rig-v2/female-clothing-2-v1.webp",
  ]);
  assert.ok(PAPER_DOLL_RUNTIME_ASSETS.includes("./assets/appearance/rig-v2/male-head-2-v1.webp"));
  assert.ok(PAPER_DOLL_RUNTIME_ASSETS.includes("./assets/appearance/rig-v2/female-head-2-v1.webp"));
  assert.ok(PAPER_DOLL_RUNTIME_ASSETS.every((asset) => asset.endsWith(".webp")));
});
