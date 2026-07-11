import test from "node:test";
import assert from "node:assert/strict";

import {
  ATTRIBUTES,
  BACKGROUNDS,
  DESTINY,
  LADY_STAGES,
  MIND_ART,
  NIGHT_TALK,
  TEMPLE_ENCOUNTERS,
  VOWS,
  allocateJadeBonus,
  bureauConsequence,
  resolveLadyChoice,
  resolveNightTalk,
  templeTaskCost,
} from "../web/wudao-core.mjs";

test("character creation preserves the novel route ingredients", () => {
  assert.equal(ATTRIBUTES.length, 5);
  assert.equal(BACKGROUNDS.length, 4);
  assert.equal(VOWS.length, 5);
  assert.ok(BACKGROUNDS.some((item) => item.id === "mystery" && /玉佩/.test(item.gain)));
  assert.equal(DESTINY.name, "逆天改命");
  assert.match(DESTINY.cost, /五维基础属性全部归零/);
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

test("bureau registration keeps protection and freedom in tension", () => {
  const conceal = bureauConsequence("conceal");
  const reveal = bureauConsequence("reveal");
  assert.match(conceal.effect, /不知道你能看见全部奇遇条件/);
  assert.match(reveal.risk, /优先为他人寻找奇遇/);
  assert.equal(bureauConsequence("missing"), null);
});
