import assert from "node:assert/strict";
import test from "node:test";

import { createEquipmentState, equipEquipmentItem } from "../web/character-system.mjs";
import {
  PAPER_DOLL_RUNTIME_ASSETS,
  paperDollVisibleItemIds,
  resolvePaperDollLayers,
} from "../web/paperdoll-system.mjs";

test("人物按固定层级绘制当前底像、衣装与容貌部件", () => {
  const composition = resolvePaperDollLayers({
    appearance: {
      body: "female",
      hat: 2,
      frontHair: 2,
      eyes: 2,
      faceAccessory: 2,
      backAccessory: 2,
      clothing: 2,
    },
  });
  assert.equal(composition.appearance.body, "female");
  assert.equal(composition.appearance.hat, 2);
  assert.deepEqual(composition.layers.map((layer) => layer.kind), [
    "backAccessory", "base", "eyes", "frontHair", "faceAccessory", "hatFront",
  ]);
  assert.equal(composition.layers[1].asset, "./assets/appearance/rig-v4/female-clothing-2-v1.webp");
  assert.ok(composition.layers.filter((layer) => layer.kind !== "base").every((layer) => layer.source === "image"));
  assert.ok(composition.layers.every((layer) => layer.href == null));
});

test("每一类非默认容貌都产生可见图层", () => {
  const appearance = Object.fromEntries([
    ["body", "male"],
    ...["hat", "frontHair", "backHair", "eyes", "brows", "mouth", "nose", "faceShape", "faceAccessory", "backAccessory", "clothing"]
      .map((part) => [part, 2]),
  ]);
  const layers = resolvePaperDollLayers({ appearance }).layers;
  assert.equal(layers[0].kind, "backAccessory");
  assert.equal(layers.filter((layer) => layer.kind === "base").length, 1);
  assert.equal(layers.filter((layer) => layer.kind !== "base").length, 10);
  assert.equal(layers.at(-1).kind, "hatFront");
  assert.ok(layers.every((layer) => layer.asset?.endsWith(".webp")));
});

test("更换装备只改变装备状态，不进入人物外观层", () => {
  const initial = createEquipmentState();
  const equipped = equipEquipmentItem(initial, "traveler_straw_hat", { attributes: { constitution: 2 } });
  assert.equal(equipped.available, true);
  assert.deepEqual(paperDollVisibleItemIds(equipped.state), []);
  const before = resolvePaperDollLayers({ appearance: { hat: 2 }, equipment: initial }).layers;
  const after = resolvePaperDollLayers({ appearance: { hat: 2 }, equipment: equipped.state }).layers;
  assert.deepEqual(after, before);
});

test("正式容貌资源全部来自分层 rig v4", () => {
  assert.equal(PAPER_DOLL_RUNTIME_ASSETS.length, 24);
  assert.equal(new Set(PAPER_DOLL_RUNTIME_ASSETS).size, 24);
  assert.ok(PAPER_DOLL_RUNTIME_ASSETS.every((asset) => asset.startsWith("./assets/appearance/rig-v4/")));
  assert.ok(PAPER_DOLL_RUNTIME_ASSETS.every((asset) => asset.endsWith(".webp")));
});
