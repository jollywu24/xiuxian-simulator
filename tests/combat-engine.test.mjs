import test from "node:test";
import assert from "node:assert/strict";

import {
  applyWound,
  createBattle,
  evaluateCombatAction,
  getAvailableCombatActions,
  getBattleView,
  getRecommendedCombatActions,
  resolveCombatAction,
  resolveEnemyAction,
  restartBattle,
  rewindBattle,
  startEnemyPhase,
} from "../web/combat-engine.mjs";
import { WANG_ZHUO_ENCOUNTER } from "../web/combat-encounters.mjs";

function finishEnemyPhase(session) {
  let current = session;
  const actions = [];
  let guard = 0;
  while (current.status === "fighting" && current.turn.phase === "enemy") {
    assert.ok(guard++ < 12, "enemy phase should terminate");
    const resolved = resolveEnemyAction(current, WANG_ZHUO_ENCOUNTER);
    assert.equal(resolved.available, true);
    if (resolved.action) actions.push(resolved.action);
    current = resolved.session;
  }
  return { session: current, actions };
}

function enterRiver(context = {}) {
  let session = createBattle(WANG_ZHUO_ENCOUNTER, context);
  for (const actionId of ["observe_tail", "send_yan_ahead", "observe_tail"]) {
    if (session.battle.stageId !== "willow_tail") break;
    const resolved = resolveCombatAction(session, actionId, WANG_ZHUO_ENCOUNTER);
    assert.equal(resolved.available, true);
    session = resolved.session;
  }
  assert.equal(session.battle.stageId, "riverbank");
  return session;
}

function resolvePlayerAction(session, actionId) {
  const resolved = resolveCombatAction(session, actionId, WANG_ZHUO_ENCOUNTER);
  assert.equal(resolved.available, true, actionId);
  return resolved.session;
}

function strongWangContext() {
  return {
    fateSeed: "natural-0",
    attributes: { constitution: 5, insight: 5, agility: 5, strength: 5, fortune: 5 },
    skills: {
      spring_rain_needles: { stage: "mastered", progress: 100 },
      fish_leap_art: { stage: "mastered", progress: 100 },
      fishing_rod_method: { stage: "mastered", progress: 100 },
      sea_stilling_stake: { stage: "mastered", progress: 100 },
    },
    knownFacts: ["wang_chain_blade"],
  };
}

function prepareNaturalWangFinish() {
  let session = enterRiver(strongWangContext());
  session = resolvePlayerAction(session, "read_chain");
  session = resolvePlayerAction(session, "companion_pin");
  session = finishEnemyPhase(startEnemyPhase(session, WANG_ZHUO_ENCOUNTER).session).session;
  session = resolvePlayerAction(session, "companion_pin");
  session = resolvePlayerAction(session, "rod_trip_blade");
  session = finishEnemyPhase(startEnemyPhase(session, WANG_ZHUO_ENCOUNTER).session).session;
  for (let index = 0; index < 4; index += 1) {
    session = resolvePlayerAction(session, "needle_wang");
    session = finishEnemyPhase(startEnemyPhase(session, WANG_ZHUO_ENCOUNTER).session).session;
  }
  assert.ok(session.battle.participants.enemies.wang_zhuo.current <= 9);
  assert.equal(session.battle.conditions.weakPoint, true);
  return session;
}

test("通用战斗状态使用三点气机且保持JSON可序列化", () => {
  for (const entries of [
    WANG_ZHUO_ENCOUNTER.participants,
    WANG_ZHUO_ENCOUNTER.nodes,
    WANG_ZHUO_ENCOUNTER.environment,
    WANG_ZHUO_ENCOUNTER.stages,
    WANG_ZHUO_ENCOUNTER.actions,
  ]) {
    assert.equal(new Set(entries.map((entry) => entry.id)).size, entries.length);
  }
  const session = createBattle(WANG_ZHUO_ENCOUNTER);
  assert.equal(session.engine, "dayao-combat-v1");
  assert.equal(session.turn.energy, 3);
  assert.equal(session.turn.phase, "player");
  assert.equal(session.battle.stageId, "willow_tail");
  assert.equal(session.battle.participants.player.max, 20);
  assert.equal(JSON.parse(JSON.stringify(session)).encounterId, "wang_zhuo_east_lake");

  const view = getBattleView(session, WANG_ZHUO_ENCOUNTER);
  assert.equal(view.enemies.length, 1);
  assert.equal(view.allies[0].id, "yan_jinghong");
  assert.equal(view.nodes.length, 6);

  const partial = createBattle(WANG_ZHUO_ENCOUNTER, {
    skills: { spring_rain_needles: { stage: "mastered" } },
    relationships: { yan_jinghong: { trust: 72 } },
  });
  assert.equal(partial.setup.skills.spring_rain_needles.progress, 60);
  assert.equal(partial.battle.ledger.relationships.yan_jinghong.favor, 48);
});

test("柳巷目标完成后进入河岸阶段并重置气机与空间", () => {
  const session = enterRiver();
  assert.equal(session.turn.energy, 3);
  assert.equal(session.turn.stageRound, 1);
  assert.equal(session.positions.player, "bank_entry");
  assert.equal(session.battle.objective.includes("聚气境"), true);
  assert.deepEqual(
    getBattleView(session, WANG_ZHUO_ENCOUNTER).enemies.map((entry) => entry.id),
    ["wang_zhuo", "poison_blade"],
  );
});

test("武学熟练、境界差、优势和夹击只进入一次行动公式", () => {
  const base = enterRiver();
  base.battle.conditions.weakPoint = true;
  base.positions.player = "shallow_water";
  base.battle.participants.enemies.wang_zhuo.statuses.push({ id: "off_balance", label: "失衡", duration: 1 });

  const learned = structuredClone(base);
  learned.setup.skills.spring_rain_needles.stage = "learned";
  const learnedEval = evaluateCombatAction(learned, "needle_wang", WANG_ZHUO_ENCOUNTER);
  const skilledEval = evaluateCombatAction(base, "needle_wang", WANG_ZHUO_ENCOUNTER);
  const mastered = structuredClone(base);
  mastered.setup.skills.spring_rain_needles.stage = "mastered";
  const masteredEval = evaluateCombatAction(mastered, "needle_wang", WANG_ZHUO_ENCOUNTER);

  assert.equal(skilledEval.score - learnedEval.score, 1);
  assert.equal(masteredEval.score - skilledEval.score, 1);
  assert.equal(skilledEval.advantage, true);
  assert.equal(skilledEval.disadvantage, true);
  assert.ok(skilledEval.advantageReasons.length >= 2);
  assert.equal(skilledEval.score, 2);

  const unrelated = structuredClone(base);
  unrelated.setup.attributes.strength = 5;
  assert.equal(evaluateCombatAction(unrelated, "needle_wang", WANG_ZHUO_ENCOUNTER).score, skilledEval.score);

  const unknown = structuredClone(base);
  unknown.setup.skills.spring_rain_needles.stage = "known";
  assert.equal(evaluateCombatAction(unknown, "needle_wang", WANG_ZHUO_ENCOUNTER).available, false);

  const namedOnly = enterRiver({ skills: { fish_leap_art: { stage: "known" } } });
  assert.equal(evaluateCombatAction(namedOnly, "cut_skiff_loose", WANG_ZHUO_ENCOUNTER).advantage, false);
});

test("轻重伤只按相关部位产生一档或两档惩罚", () => {
  const base = enterRiver();
  const action = getAvailableCombatActions(base, WANG_ZHUO_ENCOUNTER).find((entry) => entry.id === "rod_trip_blade");
  assert.equal(action.evaluation.available, true);

  const light = applyWound(base, "player", { id: "arm_light", type: "cut", bodyPart: "arm", severity: 1 });
  const heavy = applyWound(base, "player", { id: "arm_heavy", type: "cut", bodyPart: "arm", severity: 2 });
  assert.equal(evaluateCombatAction(light, "rod_trip_blade", WANG_ZHUO_ENCOUNTER).score, action.evaluation.score - 1);
  assert.equal(evaluateCombatAction(heavy, "rod_trip_blade", WANG_ZHUO_ENCOUNTER).score, action.evaluation.score - 2);

  heavy.battle.conditions.weakPoint = true;
  assert.equal(evaluateCombatAction(heavy, "needle_wang", WANG_ZHUO_ENCOUNTER).available, false);
});

test("改命换势真实重分属性并耗尽整轮气机", () => {
  const session = createBattle(WANG_ZHUO_ENCOUNTER);
  const totalBefore = Object.values(session.setup.attributes).reduce((total, value) => total + value, 0);
  const resolved = resolveCombatAction(session, "fate_to_insight", WANG_ZHUO_ENCOUNTER);
  assert.equal(resolved.available, true);
  assert.equal(resolved.session.turn.energy, 0);
  assert.equal(resolved.session.setup.attributes.insight, 4);
  assert.equal(Object.values(resolved.session.setup.attributes).reduce((total, value) => total + value, 0), totalBefore);
});

test("同伴每轮只提供一次关系行动并抵消一次夹击", () => {
  let session = enterRiver();
  session.battle.conditions.steadyFooting = true;
  const before = evaluateCombatAction(session, "rod_trip_blade", WANG_ZHUO_ENCOUNTER);
  assert.equal(before.disadvantage, true);

  const companion = resolveCombatAction(session, "companion_pin", WANG_ZHUO_ENCOUNTER);
  session = companion.session;
  assert.equal(session.battle.conditions.allyEngaged, true);
  const after = evaluateCombatAction(session, "rod_trip_blade", WANG_ZHUO_ENCOUNTER);
  assert.equal(after.disadvantageReasons.some((reason) => reason.includes("夹击")), false);
  assert.equal(after.score, before.score + 2);
  assert.equal(evaluateCombatAction(session, "companion_pin", WANG_ZHUO_ENCOUNTER).available, false);
});

test("毒刃在敌方阶段附加持续蛇毒，解毒散会真实消耗", () => {
  let session = enterRiver();
  session.positions.player = "willow_root";
  session.positions.wang_zhuo = "bank_entry";
  session.battle.participants.enemies.wang_zhuo.active = false;
  session.battle.participants.enemies.poison_blade.statuses.push({ id: "off_balance", label: "失衡", duration: 1 });
  const ended = startEnemyPhase(session, WANG_ZHUO_ENCOUNTER).session;
  const resolved = finishEnemyPhase(ended);
  session = resolved.session;
  assert.ok(resolved.actions.some((entry) => entry.kind === "poison"));
  assert.equal(session.battle.participants.player.statuses.some((entry) => entry.id === "snake_venom"), true);
  assert.equal(session.battle.participants.enemies.poison_blade.statuses.some((entry) => entry.id === "off_balance"), false);
  assert.ok(session.history.some((entry) => entry.actionId === "status_tick"));

  const antidote = resolveCombatAction(session, "use_antidote", WANG_ZHUO_ENCOUNTER);
  assert.equal(antidote.available, true);
  assert.equal(antidote.session.battle.participants.player.statuses.some((entry) => entry.id === "snake_venom"), false);
  assert.equal(antidote.session.setup.items.antidote, 0);
  assert.equal(restartBattle(antidote.session, WANG_ZHUO_ENCOUNTER).setup.items.antidote, 1);
});

test("致命伤保留一轮处理窗口，包扎后仍作为长期伤势留下", () => {
  let session = enterRiver({ attributes: { constitution: 5 }, knownFacts: [] });
  session.positions.player = "mooring_post";
  session.positions.wang_zhuo = "mooring_post";
  session.battle.participants.enemies.poison_blade.active = false;
  const firstEnemyPhase = finishEnemyPhase(startEnemyPhase(session, WANG_ZHUO_ENCOUNTER).session);
  session = firstEnemyPhase.session;
  const fatal = session.wounds.find((entry) => entry.id === "wang_chain_torso");
  assert.ok(fatal);
  assert.equal(fatal.severity, 3);
  assert.equal(fatal.countdown, 1);
  assert.equal(session.status, "fighting");

  const bound = resolveCombatAction(session, "bind_fatal_wound", WANG_ZHUO_ENCOUNTER);
  assert.equal(bound.available, true);
  assert.equal(bound.session.wounds.find((entry) => entry.id === fatal.id).stabilized, true);
  const nextEnemyPhase = finishEnemyPhase(startEnemyPhase(bound.session, WANG_ZHUO_ENCOUNTER).session).session;
  assert.equal(nextEnemyPhase.status, "fighting");
  assert.ok(nextEnemyPhase.wounds.some((entry) => entry.id === fatal.id));

  let multiple = enterRiver({ attributes: { constitution: 5 } });
  multiple = applyWound(multiple, "player", { id: "slow_fatal", type: "cut", bodyPart: "torso", severity: 3, countdown: 2 });
  multiple = applyWound(multiple, "player", { id: "urgent_fatal", type: "pierce", bodyPart: "leg", severity: 3, countdown: 1 });
  multiple.battle.participants.enemies.wang_zhuo.active = false;
  multiple.battle.participants.enemies.poison_blade.active = false;
  multiple = finishEnemyPhase(startEnemyPhase(multiple, WANG_ZHUO_ENCOUNTER).session).session;
  assert.equal(multiple.status, "death");
  assert.equal(multiple.result.causeId, "unstabilized_urgent_fatal");
  assert.equal(multiple.wounds.find((entry) => entry.id === "slow_fatal").countdown, 1);
});

test("松动船索会作为机关重创包抄者而不是只换文案", () => {
  let session = enterRiver();
  session.setup.attributes.fortune = 5;
  session.battle.fortuneOpportunity = true;
  const armed = resolveCombatAction(session, "arm_boat_rope", WANG_ZHUO_ENCOUNTER);
  assert.equal(armed.available, true);
  session = armed.session;
  session.positions.player = "wet_stones";
  session.positions.poison_blade = "willow_root";
  session.battle.participants.enemies.wang_zhuo.active = false;
  const before = session.battle.participants.enemies.poison_blade.current;
  const resolved = finishEnemyPhase(startEnemyPhase(session, WANG_ZHUO_ENCOUNTER).session);
  assert.ok(resolved.actions.some((entry) => entry.kind === "trap"));
  assert.ok(resolved.session.battle.participants.enemies.poison_blade.current < before);
  assert.equal(resolved.session.battle.environment.find((entry) => entry.id === "loose_rope").state, "spent");
});

test("第二轮援弩入场，多名敌人仍只产生一次夹击劣势", () => {
  let session = enterRiver();
  session.battle.participants.enemies.wang_zhuo.active = false;
  session.battle.participants.enemies.poison_blade.active = false;
  session.turn.stageRound = 2;
  const resolved = finishEnemyPhase(startEnemyPhase(session, WANG_ZHUO_ENCOUNTER).session);
  assert.ok(resolved.actions.some((entry) => entry.kind === "reinforce"));
  assert.equal(resolved.session.battle.participants.enemies.dock_crossbow.active, true);

  const crowded = structuredClone(resolved.session);
  crowded.battle.participants.enemies.wang_zhuo.active = true;
  crowded.battle.participants.enemies.poison_blade.active = true;
  crowded.battle.conditions.weakPoint = true;
  const evaluation = evaluateCombatAction(crowded, "needle_wang", WANG_ZHUO_ENCOUNTER);
  assert.equal(evaluation.disadvantage, true);
  assert.equal(evaluation.disadvantageReasons.filter((reason) => /夹击|多人/.test(reason)).length, 1);
  assert.equal(evaluation.score, 2);
});

test("生擒首领后仍结算已经形成的援弩，随后输出长期总账", () => {
  let session = enterRiver({ attributes: { insight: 5 }, skills: { spring_rain_needles: { stage: "mastered", progress: 100 } } });
  session.battle.conditions.weakPoint = true;
  session.battle.conditions.steadyFooting = true;
  session.battle.conditions.allyEngaged = true;
  session.positions.player = "mooring_post";
  session.battle.participants.enemies.wang_zhuo.current = 8;
  session.battle.participants.enemies.dock_crossbow.active = true;
  session.battle.participants.enemies.poison_blade.current = 2;
  const beforeHp = session.battle.participants.player.current;

  const subdued = resolveCombatAction(session, "subdue_wang", WANG_ZHUO_ENCOUNTER);
  assert.equal(subdued.available, true);
  assert.equal(subdued.session.pendingOutcome.outcome, "subdued");
  const support = startEnemyPhase(subdued.session, WANG_ZHUO_ENCOUNTER).session;
  assert.ok(support.turn.enemyQueue.some((entry) => entry.kind === "parting_shot"));
  const completed = finishEnemyPhase(support);
  assert.equal(completed.session.status, "finished");
  assert.equal(completed.session.result.outcome, "subdued");
  assert.ok(completed.session.battle.participants.player.current < beforeHp);
  assert.equal(completed.session.result.consequences.wangZhuo, "captive");
  assert.ok(completed.session.result.consequences.evidence.includes("wang_zhuo_testimony"));
  assert.ok(completed.session.result.consequences.relationships.yan_jinghong.trust > 58);
});

test("杀、擒、放线与护人撤离均是可达的独立结局", () => {
  const finishState = prepareNaturalWangFinish();
  for (const [actionId, expected] of [
    ["subdue_wang", "subdued"],
    ["kill_wang", "killed"],
    ["release_wang", "released"],
  ]) {
    let session = structuredClone(finishState);
    const resolved = resolveCombatAction(session, actionId, WANG_ZHUO_ENCOUNTER);
    assert.equal(resolved.available, true, actionId);
    assert.equal(resolved.session.pendingOutcome?.outcome, expected, actionId);
    const completed = finishEnemyPhase(startEnemyPhase(resolved.session, WANG_ZHUO_ENCOUNTER).session).session;
    assert.equal(completed.result.outcome, expected, actionId);
  }

  let retreat = enterRiver(strongWangContext());
  retreat = resolvePlayerAction(retreat, "cut_skiff_loose");
  retreat = resolvePlayerAction(retreat, "read_chain");
  retreat = finishEnemyPhase(startEnemyPhase(retreat, WANG_ZHUO_ENCOUNTER).session).session;
  retreat = resolvePlayerAction(retreat, "escort_retreat");
  retreat = finishEnemyPhase(startEnemyPhase(retreat, WANG_ZHUO_ENCOUNTER).session).session;
  assert.equal(retreat.result.outcome, "protected_escape");
  assert.equal(retreat.result.consequences.yanJinghong, "safe");
});

test("命灯回照保留死因见闻、累计重复死因且不复制战利品", () => {
  let session = createBattle(WANG_ZHUO_ENCOUNTER);
  const death = resolveCombatAction(session, "intercept_tail", WANG_ZHUO_ENCOUNTER);
  assert.equal(death.session.status, "death");
  assert.equal(death.session.lives, 1);
  assert.equal(death.session.result.causeId, "wang_chain_blade");
  assert.equal(death.session.deathRecords[0].count, 1);

  const rewound = rewindBattle(death.session, WANG_ZHUO_ENCOUNTER);
  assert.equal(rewound.available, true);
  session = rewound.session;
  assert.equal(session.battle.knownFacts.includes("wang_chain_blade"), true);
  assert.equal(getAvailableCombatActions(session, WANG_ZHUO_ENCOUNTER).some((entry) => entry.id === "intercept_tail"), false);
  assert.deepEqual(session.battle.ledger.evidence, []);
});

test("推荐行动去重并始终限制为三项", () => {
  const session = enterRiver();
  const recommendations = getRecommendedCombatActions(session, WANG_ZHUO_ENCOUNTER, "ally:yan_jinghong");
  assert.equal(recommendations.length, 3);
  assert.equal(new Set(recommendations.map((entry) => entry.id)).size, 3);
  assert.ok(recommendations.some((entry) => ["companion_pin", "protect_yan"].includes(entry.id)));

  const usedCompanion = resolveCombatAction(session, "companion_pin", WANG_ZHUO_ENCOUNTER).session;
  const afterUse = getRecommendedCombatActions(usedCompanion, WANG_ZHUO_ENCOUNTER, "ally:yan_jinghong");
  assert.ok(afterUse.every((entry) => entry.evaluation.available));
  assert.equal(afterUse.some((entry) => entry.id === "companion_pin"), false);
});
