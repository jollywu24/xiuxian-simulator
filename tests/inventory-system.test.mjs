import test from "node:test";
import assert from "node:assert/strict";

import {
  INVENTORY_CAPACITY,
  createInventoryBoard,
  formatSilver,
  getInventoryItems,
  getInventoryUseState,
} from "../web/inventory-core.mjs";

function inventoryState(overrides = {}) {
  return {
    screen: "templeWake",
    backgroundId: "mystery",
    peaches: 3,
    hungerLevel: 2,
    shenSilver: 0,
    alchemyPills: 0,
    templeOpening: { belongingsChecked: false, peachEaten: false },
    completedTempleTasks: [],
    inventory: [],
    p0: { started: false, items: {}, wounds: [] },
    ...overrides,
  };
}

test("陌生开局不会提前泄露随身物，查身后才进入行囊", () => {
  const hidden = getInventoryItems(inventoryState());
  assert.deepEqual(hidden, []);

  const known = getInventoryItems(inventoryState({
    templeOpening: { belongingsChecked: true, peachEaten: true },
    peaches: 2,
    completedTempleTasks: ["traveler_relic", "shen_promise"],
    inventory: ["qingqing_book", "return_spring_pills", "hundred_pills_notes"],
    alchemyPills: 6,
  }));

  assert.deepEqual(known.map((item) => item.id), [
    "family_jade",
    "blood_letter",
    "mountain_peach",
    "shen_token",
    "east_map",
    "return_spring_pill",
    "qingqing_book",
    "hundred_pills_notes",
  ]);
  assert.equal(known.find((item) => item.id === "mountain_peach")?.quantity, 2);
  assert.equal(known.find((item) => item.id === "return_spring_pill")?.quantity, 6);
});

test("新篇章物品与旧行囊别名只形成一个物品堆叠", () => {
  const items = getInventoryItems(inventoryState({
    screen: "stakeTraining",
    templeOpening: { belongingsChecked: true, peachEaten: true },
    peaches: 1,
    inventory: ["return_spring_pills"],
    alchemyPills: 6,
    p0: {
      started: true,
      items: { return_spring_pill: 5, purple_dragon_blood_pill: 1, spring_rain_needles: 1 },
      wounds: [],
    },
  }));

  assert.equal(items.filter((item) => item.id === "return_spring_pill").length, 1);
  assert.equal(items.find((item) => item.id === "return_spring_pill")?.quantity, 5);
  assert.equal(items.find((item) => item.id === "purple_dragon_blood_pill")?.quality, "rare");
});

test("分类板保留固定二十四格，并让分类标题与选择同步", () => {
  const state = inventoryState({
    screen: "thirdLadyTreatment",
    templeOpening: { belongingsChecked: true, peachEaten: true },
    peaches: 2,
    inventory: ["return_spring_pills"],
    alchemyPills: 6,
    p0: {
      started: true,
      items: { return_spring_pill: 6, purple_scale_herb: 2, blood_vine_core: 1 },
      wounds: [],
    },
  });
  const all = createInventoryBoard(state, { category: "all", selectedId: "return_spring_pill" });
  const medicine = createInventoryBoard(state, { category: "medicine" });

  assert.equal(all.capacity, INVENTORY_CAPACITY);
  assert.equal(all.usedSlots, 6);
  assert.equal(all.selected?.id, "return_spring_pill");
  assert.equal(all.selectedQuality?.name, "良品");
  assert.equal(medicine.category.name, "丹药");
  assert.deepEqual(medicine.filteredItems.map((item) => item.id), ["mountain_peach", "return_spring_pill"]);
});

test("只有可直接使用的物品显示使用状态，且条件来自当前伤饥", () => {
  const hungry = inventoryState({
    templeOpening: { belongingsChecked: true, peachEaten: true },
    peaches: 2,
    hungerLevel: 2,
  });
  assert.deepEqual(getInventoryUseState("mountain_peach", hungry), {
    visible: true,
    available: true,
    reason: "当前状态可使用",
    action: "eat_peach",
  });
  assert.equal(getInventoryUseState("mountain_peach", { ...hungry, hungerLevel: 0 }).available, false);
  assert.equal(getInventoryUseState("family_jade", hungry).visible, false);

  const wounded = inventoryState({
    screen: "stakeTraining",
    p0: {
      started: true,
      items: { return_spring_pill: 2 },
      wounds: [{ id: "rib_cut", severity: 2 }],
    },
  });
  assert.equal(getInventoryUseState("return_spring_pill", wounded).available, true);
  assert.equal(getInventoryUseState("return_spring_pill", { ...wounded, screen: "wangBattle" }).available, false);
});

test("银两资源条只呈现真实持有数", () => {
  assert.equal(formatSilver(0), "0两");
  assert.equal(formatSilver(12), "12两");
  assert.equal(formatSilver(12.43), "12两 430文");
});
