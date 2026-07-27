import test from "node:test";
import assert from "node:assert/strict";

import {
  EQUIPMENT_CAPACITY,
  actionTargetValue,
  applyDamageReduction,
  calculateDamageRange,
  createEquipmentBoard,
  createEquipmentState,
  damageForTier,
  deriveCharacterStats,
  equipEquipmentItem,
  migrateEquipmentState,
  unequipEquipmentSlot,
} from "../web/character-system.mjs";

function characterState(patch = {}) {
  return {
    attributes: { constitution: 1, insight: 0, agility: 1, strength: 1, fortune: 0 },
    martialStage: "mortal",
    equipment: createEquipmentState(),
    characterVitals: { health: null, qi: null },
    mindArt: null,
    p0: { wounds: [] },
    ...patch,
  };
}

test("装备行囊有稳定容量、品质、槽位与十二件初始装备", () => {
  const board = createEquipmentBoard(characterState());
  assert.equal(board.capacity, EQUIPMENT_CAPACITY);
  assert.equal(board.used, 12);
  assert.equal(board.slots.length, 9);
  assert.equal(board.slots.find((slot) => slot.id === "body").item.id, "patched_martial_coat");
  assert.equal(board.items.find((item) => item.id === "family_jade_charm").qualityInfo.name, "秘宝");
});

test("装备迁移丢弃未知物品与错误槽位，不污染存档", () => {
  const migrated = migrateEquipmentState({
    owned: ["goosewing_short_saber", "river_bamboo_staff", "spring_rain_needle_case", "unknown_item"],
    slots: {
      head: "goosewing_short_saber",
      meleeMain: "river_bamboo_staff",
      meleeOff: "goosewing_short_saber",
      rangedMain: "spring_rain_needle_case",
      rangedOff: "spring_rain_needle_case",
    },
  });
  assert.deepEqual(migrated.owned, ["goosewing_short_saber", "river_bamboo_staff", "spring_rain_needle_case"]);
  assert.equal(migrated.slots.head, null);
  assert.equal(migrated.slots.meleeMain, "river_bamboo_staff");
  assert.equal(migrated.slots.meleeOff, null);
  assert.equal(migrated.slots.rangedMain, "spring_rain_needle_case");
  assert.equal(migrated.slots.rangedOff, null);
});

test("单手与双手兵刃遵守同一套槽位占用规则", () => {
  const base = createEquipmentState();
  const offhand = equipEquipmentItem(base, "goosewing_short_saber", { slotId: "meleeOff", attributes: { constitution: 1 } });
  assert.equal(offhand.available, true);
  assert.equal(offhand.state.slots.meleeOff, "goosewing_short_saber");

  const staff = equipEquipmentItem(offhand.state, "river_bamboo_staff", { attributes: { constitution: 1 } });
  assert.equal(staff.available, true);
  assert.equal(staff.state.slots.meleeMain, "river_bamboo_staff");
  assert.equal(staff.state.slots.meleeOff, null);

  const removed = unequipEquipmentSlot(staff.state, "meleeMain");
  assert.equal(removed.available, true);
  assert.equal(removed.state.slots.meleeMain, null);
});

test("装备需求会读取五维，不能只靠界面绕过", () => {
  const blocked = equipEquipmentItem(createEquipmentState(), "iron_scale_vest", {
    attributes: { constitution: 1 },
  });
  assert.equal(blocked.available, false);
  assert.match(blocked.reason, /根骨需达到2/);

  const equipped = equipEquipmentItem(createEquipmentState(), "iron_scale_vest", {
    attributes: { constitution: 2 },
  });
  assert.equal(equipped.available, true);
  assert.equal(equipped.state.slots.body, "iron_scale_vest");
});

test("人物五维、境界、伤势和装备共同生成气血、防御与减伤，聚气后才生成真气", () => {
  const stats = deriveCharacterStats({
    attributes: { constitution: 1, insight: 0, agility: 1, strength: 1, fortune: 0 },
    stageId: "mortal",
    equipment: createEquipmentState(),
    wounds: [],
  });
  assert.deepEqual(stats.health, { current: 16, max: 16 });
  assert.equal(stats.defense, 2);
  assert.equal(stats.reduction, 1);
  assert.equal(stats.qi.available, false);

  const advanced = deriveCharacterStats({
    attributes: { constitution: 3, insight: 2, agility: 4, strength: 4, fortune: 1 },
    stageId: "body",
    equipment: createEquipmentState(),
    martial: {
      learned: { fish_leap_art: { mastery: "skilled", progress: 60 } },
      loadout: { heart: "fish_leap_art", body: null },
    },
    wounds: [{ id: "rib", severity: 2 }],
  });
  assert.equal(advanced.health.max, 20);
  assert.equal(advanced.qi.available, false);
  assert.equal(advanced.qi.max, 0);
  assert.equal(advanced.defense, 4);
  assert.equal(advanced.reduction, 1);

  const qiStage = deriveCharacterStats({
    attributes: { constitution: 3, insight: 2, agility: 4, strength: 4, fortune: 1 },
    stageId: "qi",
    equipment: createEquipmentState(),
    martial: {
      learned: { fish_leap_art: { mastery: "skilled", progress: 60 } },
      loadout: { heart: "fish_leap_art", body: null },
    },
    wounds: [],
  });
  assert.equal(qiStage.qi.available, true);
  assert.equal(qiStage.qi.max, 6);
});

test("兵刃、主属性、境界、招式威力与真气强化进入同一伤害区间", () => {
  const range = calculateDamageRange({
    attributes: { strength: 4, agility: 2 },
    stageId: "body",
    equipment: createEquipmentState(),
    kind: "melee",
    techniquePower: 1,
    qiBoost: 2,
  });
  assert.deepEqual({ min: range.min, max: range.max }, { min: 9, max: 11 });
  assert.equal(damageForTier(range, "great"), 11);
  assert.equal(damageForTier(range, "success"), 10);
  assert.equal(damageForTier(range, "costly"), 9);
  assert.equal(damageForTier(range, "failure"), 0);
});

test("防御进入命中目标值，减伤在命中后结算并受穿透抵消", () => {
  assert.equal(actionTargetValue(3, 2), 9);
  assert.deepEqual(applyDamageReduction(8, 3, 1), {
    raw: 8,
    final: 6,
    prevented: 2,
    effectiveReduction: 2,
  });
  assert.equal(applyDamageReduction(1, 8, 0).final, 1);
});
