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
  BLOOD_CHOICES,
  CAO_ENCOUNTERS,
  FISHING_PREPARATIONS,
  FIVE_ANIMAL_PLAY,
  FIVE_ANIMAL_ASPECTS,
  QINGQING_BOOK,
  RETURN_SPRING_BREW,
  SHEN_DAILY_ACTIONS,
  SHEN_DAILY_RULES,
  SHEN_JOBS,
  TEMPLE_ENCOUNTERS,
  TEMPLE_OPENING_ACTIONS,
  VOWS,
  WORLD_FACTS,
  allocateJadeBonus,
  canInspectTempleWall,
  canStudyQingQing,
  canLearnFishingRod,
  createTempleOpeningState,
  getCaoEncounter,
  getFiveAnimalAspect,
  resolveLadyChoice,
  resolveNightTalk,
  resolveBloodChoice,
  resolveCaoAnswer,
  resolveFirstAlchemy,
  resolveFishingPreparation,
  resolveFiveAnimalBreakthrough,
  resolveMedicalBreakthrough,
  resolveObservationChoice,
  resolveRoadTrial,
  resolveShenJob,
  resolveShenDailyAction,
  resolveTreasureFishChoice,
  resolveTempleOpeningAction,
  reallocateExistingAttributes,
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

test("the ruined-temple opening turns three concrete survival actions into the first discovery", () => {
  assert.deepEqual(TEMPLE_OPENING_ACTIONS.map((item) => item.id), ["tend_fire", "check_belongings", "eat_peach"]);
  let opening = createTempleOpeningState();
  assert.equal(canInspectTempleWall(opening), false);
  for (const id of TEMPLE_OPENING_ACTIONS.map((item) => item.id)) {
    const result = resolveTempleOpeningAction(opening, id);
    assert.equal(result.available, true);
    assert.match(result.outcome, /你/);
    opening = result.state;
  }
  assert.equal(canInspectTempleWall(opening), true);
  assert.equal(resolveTempleOpeningAction(opening, "eat_peach").available, false);
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
  assert.equal(resolveRoadTrial("dive", true).potential, 0);
  assert.equal(resolveRoadTrial("detour", false).potential, 0);
  assert.match(ROAD_TRIALS.dive.result, /紫金河|沈家/);
  assert.equal(resolveRoadTrial("missing", true), null);
});

test("the original Shen route assigns the hero to the danroom because every ordinary job is out of reach", () => {
  assert.deepEqual(SHEN_JOBS.map((item) => item.id), ["guard", "laborer", "runner", "clerk"]);
  const strength = allocateJadeBonus("strength");
  assert.equal(resolveShenJob("guard", strength, {}).available, false);
  assert.ok(resolveShenJob("guard", strength, {}).missing.includes("basic_skill"));
  assert.equal(resolveShenJob("laborer", strength, {}).available, false);
  assert.equal(resolveShenJob("runner", strength, {}).available, false);
  assert.equal(resolveShenJob("clerk", strength, {}).available, false);
  assert.equal(resolveShenJob("missing", strength, {}), null);
});

test("Cao Qing exposes the three original fixed encounters and forces a blood choice", () => {
  assert.deepEqual(CAO_ENCOUNTERS.map((item) => item.id), ["traitor", "blood_scripture", "poison_legacy"]);
  assert.match(getCaoEncounter("traitor").result, /不死不休/);
  assert.equal(getCaoEncounter("missing"), null);
  assert.deepEqual(Object.keys(BLOOD_CHOICES), ["fight", "comply", "refuse"]);
  assert.equal(resolveBloodChoice("fight", 2).available, true);
  assert.equal(resolveBloodChoice("fight", 1).available, false);
  assert.equal(resolveBloodChoice("comply", 1).outcome, "observe");
});

test("insight, observation and honest survival reproduce Cao Qing's original examination", () => {
  const insight = allocateJadeBonus("insight");
  const watched = resolveObservationChoice("watch", insight, true);
  assert.equal(watched.effectiveInsight, 5);
  assert.equal(resolveCaoAnswer("fire", "strong_slow_strong", watched.effectiveInsight).outcome, "continue");
  assert.equal(resolveCaoAnswer("fire", "stew", watched.effectiveInsight).outcome, "death");
  assert.equal(resolveCaoAnswer("fire", "forget", watched.effectiveInsight).outcome, "neglected");
  assert.equal(resolveCaoAnswer("ingredients", "recite_order", watched.effectiveInsight).outcome, "continue");
  assert.equal(resolveCaoAnswer("motive", "learn", watched.effectiveInsight).outcome, "death");
  assert.equal(resolveCaoAnswer("motive", "survive", watched.effectiveInsight).outcome, "continue");
});

test("the original reward chain is Qingqing study followed by an untrained Five Animal Play manual", () => {
  assert.equal(QINGQING_BOOK.studyCost, 85);
  assert.equal(canStudyQingQing(2, 1780).available, false);
  assert.equal(canStudyQingQing(3, 84).available, false);
  assert.equal(canStudyQingQing(3, 1780).available, true);
  assert.equal(FIVE_ANIMAL_PLAY.name, "《五禽戏》");
  assert.match(FIVE_ANIMAL_PLAY.description, /没有杀伤力|继续修炼/);
});

test("the Shen daily loop spends real time, stamina and satiety for five distinct actions", () => {
  assert.deepEqual(Object.keys(SHEN_DAILY_ACTIONS), ["qingqing", "five_animals", "observe", "meal", "rest"]);
  const study = resolveShenDailyAction("qingqing", { timeLeft: 3, stamina: 4, satiety: 4, fiveAnimalLevel: 0 });
  assert.equal(study.available, true);
  assert.equal(study.nextStamina, 3);
  assert.equal(study.nextSatiety, 3);
  assert.equal(study.medicalProgress, 17);
  assert.equal(resolveShenDailyAction("five_animals", { timeLeft: 3, stamina: 4, satiety: 4, fiveAnimalLevel: 0 }).available, false);
  assert.equal(resolveShenDailyAction("meal", { timeLeft: 1, stamina: 2, satiety: 1, fiveAnimalLevel: 0 }).nextSatiety, SHEN_DAILY_RULES.maxSatiety);
  assert.equal(resolveShenDailyAction("qingqing", { timeLeft: 1, stamina: 1, satiety: 1, fiveAnimalLevel: 1 }).dangerous, true);
  assert.equal(resolveShenDailyAction("missing", {}), null);
});

test("Five Animal Play must be unlocked before one of five attribute aspects is chosen", () => {
  assert.equal(resolveFiveAnimalBreakthrough({ medicalLevel: 1, insight: 3, potential: 499 }).available, false);
  assert.equal(resolveFiveAnimalBreakthrough({ medicalLevel: 1, insight: 3, potential: 500 }).available, true);
  assert.equal(FIVE_ANIMAL_ASPECTS.length, 5);
  assert.deepEqual(FIVE_ANIMAL_ASPECTS.map((item) => item.attribute), ["strength", "constitution", "agility", "insight", "fortune"]);
  assert.equal(getFiveAnimalAspect("ape").attribute, "insight");
  assert.equal(getFiveAnimalAspect("missing"), null);
});

test("Qingqing progress and potential jointly unlock medicine level two", () => {
  assert.equal(resolveMedicalBreakthrough(16, 1000).available, false);
  assert.equal(resolveMedicalBreakthrough(17, 165).available, false);
  assert.equal(resolveMedicalBreakthrough(17, 166).available, true);
});

test("the fishing window exposes four preparations with real contact and potential gates", () => {
  assert.deepEqual(FISHING_PREPARATIONS.map((item) => item.id), ["worms", "rod", "fishing_skill", "bait"]);
  assert.equal(resolveFishingPreparation("worms", {}).available, true);
  assert.equal(resolveFishingPreparation("fishing_skill", { hasContact: false, potential: 50 }).available, false);
  assert.equal(resolveFishingPreparation("fishing_skill", { hasContact: true, potential: 49 }).available, false);
  assert.equal(resolveFishingPreparation("fishing_skill", { hasContact: true, potential: 50 }).available, true);
  assert.equal(resolveFishingPreparation("rod", { completed: ["rod"] }).available, false);
});

test("the treasure fish can kill, be abandoned or unlock Wang Wu's rod method", () => {
  assert.equal(resolveTreasureFishChoice("pull", 2).outcome, "death");
  assert.equal(resolveTreasureFishChoice("pull", 1).available, false);
  assert.equal(resolveTreasureFishChoice("cut", 1).outcome, "miss");
  assert.equal(resolveTreasureFishChoice("follow", 1).outcome, "catch");
  assert.equal(canLearnFishingRod({ strength: 3, insight: 0, hasWaterMindArt: true, favor: 60 }).available, true);
  assert.equal(canLearnFishingRod({ strength: 2, insight: 3, hasWaterMindArt: true, favor: 60 }).available, false);
});

test("five earned attribute points plus the water mind art meet the first alchemy gate", () => {
  const attributes = reallocateExistingAttributes(5, "insight");
  assert.equal(attributes.insight, 5);
  const success = resolveFirstAlchemy("replay", { medicalLevel: 2, caoFavor: 41, effectiveInsight: 7 });
  assert.equal(success.available, true);
  assert.equal(success.pills, RETURN_SPRING_BREW.successPills);
  assert.equal(resolveFirstAlchemy("rush", { medicalLevel: 2, caoFavor: 41, effectiveInsight: 7 }).outcome, "failure");
  assert.equal(resolveFirstAlchemy("replay", { medicalLevel: 1, caoFavor: 41, effectiveInsight: 7 }).available, false);
});
