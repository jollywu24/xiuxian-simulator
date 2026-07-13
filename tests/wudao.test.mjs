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
  TEMPLE_ENCOUNTERS,
  VOWS,
  WORLD_FACTS,
  allocateJadeBonus,
  resolveLadyChoice,
  resolveNightTalk,
  resolveRoadTrial,
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
