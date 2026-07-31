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

test("纸娃娃始终保留人物底图，容貌页可以关闭全部装备层", () => {
  const composition = resolvePaperDollLayers({
    appearance: { body: "female", face: 4, hair: 3, skin: 2 },
    equipment: createEquipmentState(),
    includeEquipment: false,
  });
  assert.equal(composition.appearance.body, "female");
  assert.deepEqual(composition.layers.map((layer) => layer.kind), ["base"]);
  assert.match(composition.layers[0].asset, /female-3-v1\.webp$/);
});

test("装备槽决定当前穿戴层，更换头部装备不会重画人物底图", () => {
  const initial = createEquipmentState();
  assert.deepEqual(paperDollVisibleItemIds(initial), ["rain_hood"]);

  const withHat = equipEquipmentItem(initial, "traveler_straw_hat", {
    attributes: { constitution: 2 },
  });
  assert.equal(withHat.available, true);
  const composition = resolvePaperDollLayers({
    appearance: { body: "male", hair: 5 },
    equipment: withHat.state,
  });
  assert.deepEqual(composition.layers.map((layer) => layer.itemId), [null, "traveler_straw_hat"]);
  assert.match(composition.layers[0].asset, /male-5-v1\.webp$/);
  assert.match(composition.layers[1].asset, /traveler-straw-hat-v1\.webp$/);
});

test("乌鳞短甲与沈府护腕分别作为身体和腕部透明层叠加", () => {
  let equipment = createEquipmentState();
  equipment = equipEquipmentItem(equipment, "iron_scale_vest", {
    attributes: { constitution: 2 },
  }).state;
  equipment = equipEquipmentItem(equipment, "shen_guard_bracers", {
    attributes: { constitution: 2 },
  }).state;
  const layers = resolvePaperDollLayers({ equipment }).layers;
  assert.deepEqual(layers.map((layer) => layer.kind), ["base", "body", "wrist", "head"]);
  assert.deepEqual(paperDollVisibleItemIds(equipment), [
    "iron_scale_vest",
    "shen_guard_bracers",
    "rain_hood",
  ]);
});

test("正式纸娃娃资源都是可发布的静态 WebP 路径", () => {
  assert.equal(PAPER_DOLL_RUNTIME_ASSETS.length, 4);
  assert.ok(PAPER_DOLL_RUNTIME_ASSETS.every((path) => /^\.\/assets\/paperdoll\/.+-v1\.webp$/.test(path)));
});
