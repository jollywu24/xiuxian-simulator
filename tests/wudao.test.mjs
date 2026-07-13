import test from "node:test";
import assert from "node:assert/strict";

import {
  ATTRIBUTES,
  BACKGROUNDS,
  DESTINY,
  LADY_STAGES,
  LIFE_RULE,
  MARTIAL_STAGES,
  MIND_ART,
  NIGHT_TALK,
  ROAD_TRIALS,
  SHEN_CLUES,
  SHEN_REWARDS,
  SHEN_SOLUTIONS,
  TEMPLE_ENCOUNTERS,
  VOWS,
  WORLD_FACTS,
  allocateJadeBonus,
  getShenClue,
  getShenReward,
  resolveLadyChoice,
  resolveNightTalk,
  resolveRoadTrial,
  resolveShenSolution,
  templeTaskCost,
} from "../web/wudao-core.mjs";

test("the first release establishes one self-contained high-martial world", () => {
  assert.equal(WORLD_FACTS.length, 3);
  assert.deepEqual(WORLD_FACTS.map((item) => item.id), ["dynasty", "jianghu", "martial"]);
  assert.match(WORLD_FACTS[1].summary, /山门|世家|帮会/);
  assert.match(WORLD_FACTS[2].summary, /宗师/);
  assert.deepEqual(MARTIAL_STAGES.map((item) => item.id), ["mortal", "body", "breath", "meridian", "master"]);
});

test("character creation ties possessions and debts to the martial world", () => {
  assert.equal(ATTRIBUTES.length, 5);
  assert.equal(BACKGROUNDS.length, 4);
  assert.equal(VOWS.length, 5);
  assert.ok(BACKGROUNDS.some((item) => item.id === "mystery" && /玉佩/.test(item.gain)));
  assert.ok(BACKGROUNDS.every((item) => item.gain && item.cost));
  assert.equal(DESTINY.name, "逆天改命");
  assert.match(DESTINY.cost, /五维基础属性全部归零/);
});

test("two in-world fate lamps explain death and return without another world", () => {
  assert.equal(LIFE_RULE.lives, 2);
  assert.match(LIFE_RULE.effect, /因果节点/);
  assert.match(LIFE_RULE.effect, /此生终结/);
});

test("jade bonuses can be reallocated to solve the wall encounter faster", () => {
  const strength = allocateJadeBonus("strength");
  const balanced = allocateJadeBonus("balanced");
  const fortune = allocateJadeBonus("fortune");
  assert.equal(Object.values(strength).reduce((sum, value) => sum + value, 0), 3);
  assert.equal(strength.strength, 3);
  assert.equal(fortune.fortune, 3);
  assert.ok(templeTaskCost("shen_promise", strength).minutes < templeTaskCost("shen_promise", balanced).minutes);
});

test("the ruined temple exposes two actionable encounters and one timed mystery", () => {
  assert.equal(TEMPLE_ENCOUNTERS.length, 3);
  assert.deepEqual(TEMPLE_ENCOUNTERS.map((item) => item.id), [
    "traveler_relic",
    "shen_promise",
    "mysterious_offering",
  ]);
  assert.equal(templeTaskCost("mysterious_offering", allocateJadeBonus("strength")), null);
  assert.ok(TEMPLE_ENCOUNTERS.every((item) => item.condition && item.reward));
});

test("defy fate forecasts distinct survival and relationship outcomes", () => {
  assert.equal(LADY_STAGES.first.length, 3);
  assert.equal(resolveLadyChoice("first", "retort").outcome, "death");
  assert.equal(resolveLadyChoice("first", "silent").outcome, "depart");
  assert.equal(resolveLadyChoice("first", "deny_beggar").outcome, "pressure");
  assert.equal(resolveLadyChoice("pressure", "yield").outcome, "test");
  assert.equal(resolveLadyChoice("test", "refuse").outcome, "talk");
  assert.equal(resolveLadyChoice("missing", "refuse"), null);
});

test("night talk choices change favor while the faithful route grants the mind art", () => {
  const results = NIGHT_TALK.map((choice) => resolveNightTalk(choice.id, 20));
  assert.deepEqual(results.map((result) => result.totalFavor), [45, 47, 50]);
  assert.equal(results[0].relation, "红颜知己");
  assert.equal(results[2].relation, "莫逆之交");
  assert.equal(results[2].reward.id, MIND_ART.id);
});

test("the newly learned mind art immediately changes the road through the same world", () => {
  assert.equal(resolveRoadTrial("dive", false), null);
  assert.equal(resolveRoadTrial("dive", true).potential, 100);
  assert.equal(resolveRoadTrial("detour", false).potential, 0);
  assert.match(ROAD_TRIALS.dive.result, /沈氏丹纹/);
  assert.equal(resolveRoadTrial("missing", true), null);
});

test("the Shen danroom offers limited investigation and distinct ways through the same crisis", () => {
  assert.deepEqual(SHEN_CLUES.map((item) => item.id), ["ledger", "waterway", "door_lock"]);
  assert.deepEqual(Object.keys(SHEN_SOLUTIONS), ["ignite", "procedure", "waterway", "bait"]);
  assert.match(getShenClue("door_lock").description, /外面落下|重复/);
  assert.equal(getShenClue("missing"), null);

  const procedureLocked = resolveShenSolution("procedure", { clues: [] });
  assert.equal(procedureLocked.available, false);
  assert.deepEqual(procedureLocked.missing, ["ledger"]);
  assert.equal(resolveShenSolution("procedure", { clues: ["ledger"] }).available, true);

  assert.equal(resolveShenSolution("waterway", { clues: ["waterway"], hasMindArt: false }).available, false);
  const waterwayOpen = resolveShenSolution("waterway", { clues: ["waterway"], hasMindArt: true });
  assert.equal(waterwayOpen.available, true);
  assert.equal(waterwayOpen.relation, "丹房救火人");
});

test("a fate lamp reveals the deepest Shen counterplay but can never spend the last lamp", () => {
  assert.equal(resolveShenSolution("ignite", { lives: 2 }).available, true);
  const lastLamp = resolveShenSolution("ignite", { lives: 1 });
  assert.equal(lastLamp.available, false);
  assert.ok(lastLamp.missing.includes("last_lamp"));

  const baitLocked = resolveShenSolution("bait", { hasMindArt: true, deathMemory: false });
  assert.equal(baitLocked.available, false);
  assert.ok(baitLocked.missing.includes("death_memory"));
  const baitOpen = resolveShenSolution("bait", { hasMindArt: true, deathMemory: true });
  assert.equal(baitOpen.available, true);
  assert.equal(baitOpen.outcome, "takeover");
  assert.equal(baitOpen.potential, 450);
});

test("Shen rewards create three exclusive growth directions", () => {
  assert.deepEqual(Object.keys(SHEN_REWARDS), ["five_animals", "marrow_powder", "herb_token"]);
  assert.equal(getShenReward("five_animals", 299).available, false);
  assert.equal(getShenReward("five_animals", 299).missingPotential, 1);
  assert.equal(getShenReward("five_animals", 300).available, true);
  assert.equal(getShenReward("marrow_powder", 0).attribute, "constitution");
  assert.equal(getShenReward("herb_token", 0).potential, 100);
  assert.equal(getShenReward("missing", 999), null);
});
