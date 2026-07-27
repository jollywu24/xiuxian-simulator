import test from "node:test";
import assert from "node:assert/strict";

import {
  MARTIAL_CATEGORIES,
  MARTIAL_DEFINITIONS,
  MARTIAL_GRADES,
  MARTIAL_MASTERIES,
  MARTIAL_SLOTS,
  MARTIAL_TECHNIQUE_SUBTYPES,
  breakthroughMartial,
  compatibleMartialSlots,
  createMartialState,
  equipMartial,
  getMartialBoard,
  getMartialBreakthroughBoard,
  getMartialCombatBonuses,
  hasMartialNarrativeUse,
  heartMasteryQiBonus,
  martialIsCarried,
  martialSkillsForCombat,
  martialWeaponRequirements,
  migrateMartialState,
  trainMartial,
  unequipMartial,
} from "../web/martial-system.mjs";

function learnedState(id = "spring_rain_needles", mastery = "beginner", progress = 0, experience = 400) {
  const state = createMartialState();
  state.experience = experience;
  state.known = [id];
  state.inheritances = [id];
  state.learned[id] = { mastery, progress, unlockedNodes: [], firstUseNodes: ["first_use"], gradeOverride: null };
  return state;
}

test("武学目录固定为四类、五档品阶、五档造诣和六个携带位", () => {
  assert.deepEqual(MARTIAL_CATEGORIES.map((entry) => entry.name), ["心法", "招式", "轻功", "锻体"]);
  assert.deepEqual(Object.values(MARTIAL_GRADES).map((entry) => entry.name), ["粗浅", "寻常", "上乘", "绝学", "镇派"]);
  assert.deepEqual(Object.values(MARTIAL_MASTERIES).map((entry) => entry.name), ["未入门", "入门", "熟练", "精通", "圆满"]);
  assert.equal(MARTIAL_SLOTS.length, 6);
  assert.equal(MARTIAL_SLOTS.filter((entry) => entry.category === "technique").length, 3);
  assert.deepEqual(MARTIAL_TECHNIQUE_SUBTYPES.map((entry) => entry.name), ["全部", "剑法", "刀法", "拳掌", "枪棍", "暗器"]);
  assert.equal(MARTIAL_DEFINITIONS.every((entry) => MARTIAL_CATEGORIES.some((category) => category.id === entry.category)), true);
});

test("版本6旧状态会无损迁移现有心法、针法、杆法、五禽和桩功", () => {
  const migrated = migrateMartialState(null, {
    potential: 1680,
    mindArt: "carp_dragon_gate",
    roadTrial: "dive",
    fiveAnimalBook: true,
    fiveAnimalLevel: 1,
    fiveAnimalProgress: 47,
    fishingRodMethod: true,
    p0: {
      skills: {
        spring_rain_needles: { stage: "skilled", progress: 60 },
        sea_stilling_stake: { stage: "learned", progress: 30 },
        ape_legacy_clue: { stage: "known", progress: 10 },
      },
      activeMartial: { foundation: "carp_dragon_gate", technique: "spring_rain_needles", stance: "sea_stilling_stake" },
      stakeId: "sea_stilling_stake",
      stakeProgress: 1,
      battleOutcome: "subdued",
    },
  });
  assert.equal(migrated.experience, 1680);
  assert.equal(migrated.learned.spring_rain_needles.mastery, "skilled");
  assert.equal(migrated.learned.fish_leap_art.mastery, "skilled");
  assert.equal(migrated.learned.five_animal_play.progress, 47);
  assert.equal(migrated.loadout.heart, "fish_leap_art");
  assert.equal(migrated.loadout.body, "sea_stilling_stake");
  assert.equal(migrated.loadout.technique1, "fishing_rod_method");
  assert.equal(migrated.loadout.technique2, "spring_rain_needles");
  assert.equal(migrated.learned.ape_legacy_clue.mastery, "unlearned");
});

test("研习固定消耗四十阅历并增加十点修为，不能随机失败或溢出", () => {
  const state = learnedState("spring_rain_needles", "beginner", 95, 80);
  const trained = trainMartial("spring_rain_needles", state);
  assert.equal(trained.available, true);
  assert.equal(trained.cost, 40);
  assert.equal(trained.gain, 10);
  assert.equal(trained.state.experience, 40);
  assert.equal(trained.state.learned.spring_rain_needles.progress, 100);
  const capped = trainMartial("spring_rain_needles", trained.state);
  assert.equal(capped.available, false);
  assert.match(capped.reason, /突破/);
});

test("突破逐项检查阅历、修为和真实使用条件", () => {
  const state = learnedState("spring_rain_needles", "beginner", 100, 80);
  state.learned.spring_rain_needles.firstUseNodes = [];
  const locked = getMartialBreakthroughBoard("spring_rain_needles", state, {});
  assert.equal(locked.available, false);
  assert.equal(locked.requirements.find((entry) => entry.label === "至少实际使用一次").met, false);
  state.learned.spring_rain_needles.firstUseNodes.push("first_needle_ambush");
  const result = breakthroughMartial("spring_rain_needles", state, {});
  assert.equal(result.available, true);
  assert.equal(result.state.experience, 0);
  assert.equal(result.state.learned.spring_rain_needles.mastery, "skilled");
  assert.equal(result.state.learned.spring_rain_needles.progress, 0);
});

test("招式有空位时自动携带，指定已有位置时明确完成替换", () => {
  let state = learnedState("spring_rain_needles");
  for (const id of ["fishing_rod_method"]) {
    state.known.push(id);
    state.inheritances.push(id);
    state.learned[id] = { mastery: "beginner", progress: 0, unlockedNodes: [], firstUseNodes: [], gradeOverride: null };
  }
  const first = equipMartial(state, "spring_rain_needles");
  assert.equal(first.available, true);
  assert.equal(first.slotId, "technique1");
  const second = equipMartial(first.state, "fishing_rod_method");
  assert.equal(second.slotId, "technique2");
  const replacement = equipMartial(second.state, "spring_rain_needles", "technique2");
  assert.equal(replacement.available, true);
  assert.equal(replacement.replacedId, "fishing_rod_method");
  assert.equal(replacement.state.loadout.technique1, null);
  assert.equal(replacement.state.loadout.technique2, "spring_rain_needles");

  second.state.loadout.technique3 = "spring_rain_needles";
  second.state.loadout.technique1 = "fishing_rod_method";
  second.state.loadout.technique2 = "spring_rain_needles";
  const normalized = migrateMartialState(second.state);
  assert.equal(Object.values(normalized.loadout).filter((id) => id === "spring_rain_needles").length, 1);
});

test("卸下只改变携带状态，已学武学和非战斗知识仍保留", () => {
  const state = learnedState("spring_rain_needles");
  const equipped = equipMartial(state, "spring_rain_needles", "technique1").state;
  assert.equal(martialIsCarried(equipped, "spring_rain_needles"), true);
  assert.equal(hasMartialNarrativeUse(equipped, "stop_bleeding", { sudden: true }), true);
  const removed = unequipMartial(equipped, "technique1");
  assert.equal(removed.available, true);
  assert.equal(removed.state.learned.spring_rain_needles.mastery, "beginner");
  assert.equal(hasMartialNarrativeUse(removed.state, "stop_bleeding"), true);
  assert.equal(hasMartialNarrativeUse(removed.state, "stop_bleeding", { sudden: true }), false);
});

test("战斗只读取携带武学，且未满足兵器要求时给出明确缺口", () => {
  const state = learnedState("spring_rain_needles", "skilled", 60);
  state.loadout.technique1 = "spring_rain_needles";
  assert.deepEqual(martialSkillsForCombat(state).spring_rain_needles, { stage: "skilled", progress: 60 });
  assert.equal(martialWeaponRequirements(state, { slots: { rangedMain: null } }).spring_rain_needles, "需要：针");
  assert.equal(martialWeaponRequirements(state, { slots: { rangedMain: "spring_rain_needle_case" } }).spring_rain_needles, undefined);
  state.loadout.technique1 = null;
  assert.equal(martialSkillsForCombat(state).spring_rain_needles, undefined);
});

test("锻体携带提供身体规则，心法造诣只在聚气公式中提供上限修正", () => {
  const state = learnedState("deadwood_stake", "beginner");
  state.loadout.body = "deadwood_stake";
  assert.deepEqual(getMartialCombatBonuses(state, { wounds: [] }), { health: 4, defense: 0, reduction: 0 });
  assert.deepEqual(getMartialCombatBonuses(state, { wounds: [{ severity: 1 }] }), { health: 4, defense: 0, reduction: 1 });
  state.known.push("fish_leap_art");
  state.learned.fish_leap_art = { mastery: "expert", progress: 0, unlockedNodes: [], firstUseNodes: [], gradeOverride: null };
  state.loadout.heart = "fish_leap_art";
  assert.equal(heartMasteryQiBonus(state), 2);
});

test("武学界面按分类与招式子类过滤，并返回六个携带位置", () => {
  const state = migrateMartialState(null, {
    potential: 100,
    mindArt: "carp_dragon_gate",
    fishingRodMethod: true,
    p0: { skills: { spring_rain_needles: { stage: "skilled", progress: 60 } } },
  });
  const allTechniques = getMartialBoard(state, { category: "technique", subtype: "all" });
  const hiddenWeapons = getMartialBoard(state, { category: "technique", subtype: "hidden_weapon" });
  assert.equal(allTechniques.items.length, 2);
  assert.deepEqual(hiddenWeapons.items.map((entry) => entry.id), ["spring_rain_needles"]);
  assert.equal(allTechniques.slots.length, 6);
  assert.deepEqual(compatibleMartialSlots("fish_leap_art"), ["heart"]);
});
