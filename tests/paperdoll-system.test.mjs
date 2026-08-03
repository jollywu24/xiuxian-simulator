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
      hat: 5,
      frontHair: 3,
      backHair: 2,
      eyes: 4,
      brows: 2,
      mouth: 3,
      nose: 2,
      faceShape: 4,
      backAccessory: 3,
      clothing: 7,
      faceAccessory: 2,
    },
  });
  assert.equal(composition.appearance.body, "female");
  assert.deepEqual(composition.layers.map((layer) => layer.kind), [
    "backAccessory", "backHair", "base", "clothing", "faceShape", "eyes", "brows", "nose", "mouth", "frontHair", "faceAccessory", "hat",
  ]);
  assert.equal(composition.layers[2].asset, "./assets/appearance/layered/female-base-v2.webp");
  assert.match(composition.layers.at(-1).href, /parts-v1\.svg#hat-5$/);
});

test("无帽无脸饰无后背时不渲染空部件但其它类别保留", () => {
  const layers = resolvePaperDollLayers({}).layers;
  assert.equal(layers.some((layer) => layer.kind === "hat"), false);
  assert.equal(layers.some((layer) => layer.kind === "faceAccessory"), false);
  assert.equal(layers.some((layer) => layer.kind === "backAccessory"), false);
  assert.deepEqual(layers.map((layer) => layer.kind), [
    "backHair", "base", "clothing", "faceShape", "eyes", "brows", "nose", "mouth", "frontHair",
  ]);
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

test("正式分层容貌资源包含两张底像与一个部件图集", () => {
  assert.deepEqual(PAPER_DOLL_RUNTIME_ASSETS, [
    "./assets/appearance/layered/male-base-v2.webp",
    "./assets/appearance/layered/female-base-v2.webp",
    "./assets/appearance/layered/parts-v1.svg",
  ]);
});
