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

test("人物只绘制当前人工验收过的完整半身组合", () => {
  const composition = resolvePaperDollLayers({
    appearance: {
      body: "female",
      hat: 2,
      clothing: 2,
    },
  });
  assert.equal(composition.appearance.body, "female");
  assert.equal(composition.appearance.hat, 1);
  assert.deepEqual(composition.layers.map((layer) => layer.kind), ["base"]);
  assert.equal(composition.layers[0].asset, "./assets/appearance/rig-v3/female-look-2-v1.webp");
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
  assert.equal(layers[0].asset, "./assets/appearance/rig-v3/male-look-1-v1.webp");
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

test("正式容貌资源只包含四套已人工验收的半身组合", () => {
  assert.equal(PAPER_DOLL_RUNTIME_ASSETS.length, 4);
  assert.deepEqual(PAPER_DOLL_RUNTIME_ASSETS, [
    "./assets/appearance/rig-v3/male-look-1-v1.webp",
    "./assets/appearance/rig-v3/male-look-2-v1.webp",
    "./assets/appearance/rig-v3/female-look-1-v1.webp",
    "./assets/appearance/rig-v3/female-look-2-v1.webp",
  ]);
  assert.ok(PAPER_DOLL_RUNTIME_ASSETS.every((asset) => asset.endsWith(".webp")));
});
