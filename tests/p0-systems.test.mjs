import test from "node:test";
import assert from "node:assert/strict";

import {
  P0_ARCS,
  P0_CONTENT_NODES,
  P0_ITEMS,
  P0_LOCATIONS,
  P0_NPCS,
  P0_SKILLS,
  applyEffects,
  chooseStake,
  createFirstBattle,
  createP0State,
  createDeathRecord,
  evaluateConditions,
  getAssailantPlotBoard,
  getBodyBreakthroughBoard,
  getDiagnosisBoard,
  getFirstBattleActions,
  getSceneActions,
  grantSpringRainNeedles,
  migrateP0State,
  recordDeath,
  resolveApeLegacy,
  resolveBodyBreakthrough,
  resolveDiagnosisAction,
  resolveFirstBattleAction,
  resolveAssailantCounterAction,
  resolveAssailantTrace,
  resolveIngredientSource,
  resolveMidAutumnTravel,
  resolveMonkeyTest,
  resolveMonkeyConflict,
  resolveMonkeyWine,
  resolvePurpleDragonAlchemy,
  resolveStakeTraining,
  resolveThirdLadyTreatment,
  resolveWoundTreatment,
  validateP0Content,
} from "../web/wudao-p0-core.mjs";

function preparedMedicineState() {
  let p0 = createP0State();
  p0.relationships.bai_zhiyun.trust = 10;
  p0 = resolveIngredientSource("cao", p0, { caoFavor: 49 }).state;
  return p0;
}

function trainedState(stakeId = "sea_stilling_stake") {
  let p0 = createP0State();
  p0.battleOutcome = "killed";
  p0 = chooseStake(stakeId, p0).state;
  return resolveStakeTraining(p0, { potential: 500 }).state;
}

function battleContext(overrides = {}) {
  return {
    hasNeedles: true,
    canRiskDeath: true,
    attributes: { constitution: 0, insight: 5, agility: 0, strength: 0, fortune: 0 },
    playerStage: "mortal",
    skills: { spring_rain_needles: { stage: "skilled", progress: 60 } },
    wounds: [],
    knownFacts: [],
    ...overrides,
  };
}

test("P0内容目录的篇章、跳转和首次兑现均通过校验", () => {
  const result = validateP0Content();
  assert.deepEqual(result, { ok: true, errors: [], nodeCount: 26, arcCount: 3 });
});

test("版本4存档缺少的版本5字段会由嵌套状态补齐", () => {
  const migrated = migrateP0State({ started: true, relationships: { bai_zhiyun: { favor: 7 } }, clock: { day: 15 } });
  assert.equal(migrated.relationships.bai_zhiyun.favor, 7);
  assert.equal(migrated.relationships.bai_zhiyun.suspicion, 5);
  assert.equal(migrated.clock.day, 15);
  assert.equal(migrated.clock.year, 427);
  assert.deepEqual(migrated.wounds, []);
  assert.deepEqual(migrated.activeMartial, { foundation: null, technique: null, stance: null });
  assert.equal(migrated.assailantPlot.stage, "unknown");
  assert.deepEqual(migrated.deathRecords, []);
});

test("P0状态可完整写入JSON，且所有集合都有稳定默认值", () => {
  const p0 = createP0State();
  assert.deepEqual(JSON.parse(JSON.stringify(p0)), p0);
  assert.equal(p0.node, "third_lady_summons");
  assert.equal(p0.dangerClock, 4);
  assert.deepEqual(p0.wounds, []);
});

test("通用条件同时支持字段、物品、武学、见闻和关系", () => {
  const p0 = createP0State();
  p0.items.monkey_wine = 1;
  p0.skills.spring_rain_needles = { stage: "learned", progress: 0 };
  p0.evidence.push("breath_disorder");
  p0.relationships.cao_qing.trust = 45;
  const checks = evaluateConditions([
    { type: "field", path: "medical", operator: "gte", value: 2 },
    { type: "item", id: "monkey_wine", quantity: 1 },
    { type: "skill", id: "spring_rain_needles" },
    { type: "evidence", id: "breath_disorder" },
    { type: "relation", npc: "cao_qing", dimension: "trust", value: 40 },
  ], { medical: 2, p0 });
  assert.ok(checks.every((check) => check.met));
});

test("带ID的通用效果不会重复发放物品或关系", () => {
  const effect = { id: "one_gift", type: "addItem", itemId: "monkey_wine", quantity: 1 };
  const once = applyEffects(createP0State(), [effect]).state;
  const twice = applyEffects(once, [effect]).state;
  assert.equal(twice.items.monkey_wine, 1);
  assert.equal(twice.appliedEffects.filter((id) => id === "one_gift").length, 1);
});

test("三夫人诊断需要两条相互印证的见闻且消耗病势时间", () => {
  let p0 = createP0State();
  const observe = resolveDiagnosisAction("observe", p0, { medicalLevel: 2 });
  assert.equal(observe.available, true);
  p0 = observe.state;
  assert.equal(getDiagnosisBoard(p0).canConclude, false);
  const pulse = resolveDiagnosisAction("pulse", p0, { medicalLevel: 2 });
  p0 = pulse.state;
  const board = getDiagnosisBoard(p0);
  assert.equal(board.canConclude, true);
  assert.equal(board.dangerClock, 2);
  assert.equal(board.diagnosis, "deviation");
});

test("医术不足和信任不足会限制更深的诊断动作", () => {
  const p0 = createP0State();
  assert.equal(resolveDiagnosisAction("pulse", p0, { medicalLevel: 1 }).available, false);
  assert.equal(resolveDiagnosisAction("ask_manual", p0, { medicalLevel: 2 }).available, false);
  p0.relationships.bai_zhiyun.trust = 10;
  assert.equal(resolveDiagnosisAction("ask_manual", p0, { medicalLevel: 2 }).available, true);
});

test("换血丹药材可由人情、沈家库房或银钱取得，并支付不同代价", () => {
  const p0 = createP0State();
  p0.relationships.bai_zhiyun.trust = 10;
  const cao = resolveIngredientSource("cao", p0, { caoFavor: 49, silver: 0 });
  const shen = resolveIngredientSource("shen", p0, { caoFavor: 0, silver: 0 });
  const merchant = resolveIngredientSource("merchant", p0, { caoFavor: 0, silver: 6 });
  assert.equal(cao.costSilver, 0);
  assert.equal(cao.state.relationships.cao_qing.trust, 48);
  assert.equal(shen.state.relationships.bai_zhiyun.suspicion, 10);
  assert.equal(merchant.costSilver, 6);
  assert.ok([cao, shen, merchant].every((result) => result.state.items.purple_scale_herb === 1));
});

test("换血丹炼制区分稳定、躁烈和失败三种品质", () => {
  const p0 = preparedMedicineState();
  const stable = resolvePurpleDragonAlchemy("strict", p0, { medicalLevel: 2, alchemyLevel: 2 });
  const volatile = resolvePurpleDragonAlchemy("rush", p0, { medicalLevel: 2, alchemyLevel: 2 });
  const failed = resolvePurpleDragonAlchemy("substitute", p0, { medicalLevel: 2, alchemyLevel: 2 });
  assert.equal(stable.outcome, "stable");
  assert.equal(volatile.outcome, "volatile");
  assert.equal(failed.outcome, "failed");
  assert.equal(failed.state.items.purple_dragon_blood_pill || 0, 0);
});

test("先封穴再服稳定换血丹才得到完整救治与三维关系回报", () => {
  let p0 = preparedMedicineState();
  p0 = resolvePurpleDragonAlchemy("strict", p0, { medicalLevel: 2, alchemyLevel: 2 }).state;
  const result = resolveThirdLadyTreatment("seal_then_pill", p0);
  assert.equal(result.outcome, "saved");
  assert.equal(result.state.relationships.bai_zhiyun.favor, 30);
  assert.equal(result.state.relationships.bai_zhiyun.trust, 35);
  assert.equal(result.state.relationships.bai_zhiyun.debt, 40);
});

test("春风化雨针同时成为随身物和可用武学", () => {
  const result = grantSpringRainNeedles(createP0State());
  assert.equal(result.state.items.spring_rain_needles, 1);
  assert.equal(result.state.skills.spring_rain_needles.stage, "skilled");
  assert.equal(result.state.activeMartial.technique, "spring_rain_needles");
});

test("第一次遭遇刀客时贸然出手会死亡并留下可利用记忆", () => {
  const battle = createFirstBattle();
  const result = resolveFirstBattleAction("reckless", battle, { hasNeedles: true });
  assert.equal(result.outcome, "death");
  assert.match(result.memory, /左袖/);
});

test("看破虚招后可选择制伏、杀死或离开，真实改变结果", () => {
  const context = battleContext();
  const observed = resolveFirstBattleAction("observe", createFirstBattle(), context).battle;
  assert.equal(resolveFirstBattleAction("seal", observed, context).outcome, "subdued");
  assert.equal(resolveFirstBattleAction("kill", observed, context).outcome, "killed");
  assert.equal(resolveFirstBattleAction("flee", observed, context).outcome, "escaped");
});

test("战斗失误会留下限制修炼的部位伤势", () => {
  const context = battleContext();
  const roundTwo = resolveFirstBattleAction("observe", createFirstBattle(), context).battle;
  const result = resolveFirstBattleAction("reckless", roundTwo, context);
  assert.equal(result.outcome, "wounded");
  assert.equal(result.wound.bodyPart, "torso");
  assert.ok(result.wound.tags.includes("limits_training"));
});

test("夜战胜算真实读取对应属性、境界、针法熟练与已知破绽", () => {
  const battle = createFirstBattle();
  const low = getFirstBattleActions(battle, battleContext({ attributes: { insight: 1 } })).find((action) => action.id === "observe").evaluation;
  const high = getFirstBattleActions(battle, battleContext({ attributes: { insight: 5, strength: 9 } })).find((action) => action.id === "observe").evaluation;
  assert.equal(low.rating, "dangerous");
  assert.equal(high.rating, "safe");
  assert.equal(high.score, getFirstBattleActions(battle, battleContext({ attributes: { insight: 5, strength: 0 } })).find((action) => action.id === "observe").evaluation.score);

  const observed = resolveFirstBattleAction("observe", battle, battleContext()).battle;
  const skilled = getFirstBattleActions(observed, battleContext()).find((action) => action.id === "seal").evaluation;
  const untrained = getFirstBattleActions(observed, battleContext({ skills: { spring_rain_needles: { stage: "known", progress: 0 } } })).find((action) => action.id === "seal").evaluation;
  const sameStage = getFirstBattleActions(observed, battleContext({ playerStage: "body" })).find((action) => action.id === "seal").evaluation;
  const woundedFlee = getFirstBattleActions(observed, battleContext({ wounds: [{ id: "leg_cut", bodyPart: "leg", severity: 2 }] })).find((action) => action.id === "flee").evaluation;
  const healthyFlee = getFirstBattleActions(observed, battleContext()).find((action) => action.id === "flee").evaluation;
  assert.equal(skilled.available, true);
  assert.equal(untrained.available, false);
  assert.ok(sameStage.score > skilled.score);
  assert.ok(woundedFlee.score < healthyFlee.score);
  assert.ok(skilled.reasons.some((reason) => /看破左袖/.test(reason)));
});

test("同一套动作与对象协议连续驱动夜战、追查和反向计划", () => {
  const battleActions = getSceneActions("first_needle_ambush", { round: 1, hasOpening: false, canRiskDeath: true });
  const traceActions = getSceneActions("assailant_trace", { battleOutcome: "killed" });
  const counterActions = getSceneActions("assailant_counterplan", { plotReady: true });
  assert.ok([battleActions, traceActions, counterActions].every((actions) => actions.every((action) => action.id && action.verb && action.objectId && action.intent)));
  assert.ok(traceActions.some((action) => action.id === "search_sleeves"));
  assert.ok(counterActions.some((action) => action.id === "send_false_report"));
});

test("不同夜战结果打开不同追查入口，齐备条件后可接管敌人回报", () => {
  for (const [outcome, actionId] of [["subdued", "question_captive"], ["killed", "search_sleeves"], ["escaped", "follow_rain_marks"]]) {
    const p0 = createP0State();
    p0.battleOutcome = outcome;
    const traced = resolveAssailantTrace(actionId, p0, battleContext({ attributes: { insight: 5, agility: 5 } }));
    assert.equal(traced.outcome, "seen_through");
    assert.equal(getAssailantPlotBoard(traced.state).ready, true);
  }
  const p0 = createP0State();
  p0.battleOutcome = "killed";
  const traced = resolveAssailantTrace("search_sleeves", p0, battleContext()).state;
  const countered = resolveAssailantCounterAction("send_false_report", traced, battleContext());
  assert.equal(countered.outcome, "false_report");
  assert.ok(countered.state.evidence.includes("assailant_channel_controlled"));
  const abandoned = resolveAssailantTrace("leave_trace", p0, battleContext());
  assert.equal(abandoned.outcome, "abandoned");
  assert.equal(abandoned.continueTo, "result");
});

test("战斗意图产生不同长期结果，护人会改变关系而毁签不会", () => {
  const p0 = createP0State();
  p0.assailantPlot.stage = "seen_through";
  p0.assailantPlot.clues = ["target_needle_holder", "signal_medicine_returned", "fish_scale_token", "rain_report_window"];
  p0.items.fish_scale_token = 1;
  const guarded = resolveAssailantCounterAction("warn_bai", p0, battleContext()).state;
  const hidden = resolveAssailantCounterAction("destroy_channel", p0, battleContext()).state;
  assert.equal(guarded.relationships.bai_zhiyun.trust, p0.relationships.bai_zhiyun.trust + 8);
  assert.equal(hidden.relationships.bai_zhiyun.trust, p0.relationships.bai_zhiyun.trust);
  assert.equal(hidden.items.fish_scale_token, 0);
});

test("死劫履历记录地点、死因与见闻，重复死因只累计次数", () => {
  const record = createDeathRecord({ id: "left_sleeve_blade", location: "东门长街", cause: "左袖短刃穿心", insight: "真正杀招藏在左袖", returnedTo: "刀客现身之前", round: 1 });
  const once = recordDeath(createP0State(), record);
  const twice = recordDeath(once, record);
  assert.equal(twice.deathRecords.length, 1);
  assert.equal(twice.deathRecords[0].count, 2);
  assert.deepEqual(twice.deathMemory, ["真正杀招藏在左袖"]);
  const battle = createFirstBattle({ knownFacts: ["left_sleeve_blade"] });
  const reckless = getFirstBattleActions(battle, battleContext()).find((action) => action.id === "reckless");
  assert.equal(reckless.evaluation.rating, "fatal");
});

test("轻中伤可以用春风针或回春丹真正清除", () => {
  const wounded = createP0State();
  wounded.wounds.push({ id: "left_rib_cut", bodyPart: "torso", severity: 2, tags: ["limits_training"] });
  wounded.skills.spring_rain_needles = { stage: "learned", progress: 0 };
  wounded.items.return_spring_pill = 2;
  const needles = resolveWoundTreatment("needles", wounded, { medicalLevel: 2 });
  const pill = resolveWoundTreatment("return_spring", wounded, { medicalLevel: 0 });
  assert.deepEqual(needles.state.wounds, []);
  assert.deepEqual(pill.state.wounds, []);
  assert.equal(pill.state.items.return_spring_pill, 1);
});

test("两门桩功会写入不同武学，并在首次修炼后推进日期", () => {
  const deadwood = trainedState("deadwood_stake");
  const sea = trainedState("sea_stilling_stake");
  assert.equal(deadwood.skills.deadwood_stake.stage, "learned");
  assert.equal(sea.skills.sea_stilling_stake.stage, "learned");
  assert.equal(sea.clock.day, 14);
  assert.equal(sea.stakeProgress, 1);
});

test("锻体突破检查桩功、潜能、伤势和生死见闻", () => {
  const p0 = trainedState();
  const board = getBodyBreakthroughBoard(p0, { potential: 200 });
  assert.equal(board.available, true);
  const success = resolveBodyBreakthrough("steady", p0, { potential: 200 });
  const death = resolveBodyBreakthrough("force", p0, { potential: 200 });
  assert.equal(success.outcome, "success");
  assert.equal(success.potentialCost, 200);
  assert.equal(death.outcome, "death");
});

test("八月十五赶路有准时、迟到、带伤和错过四类结果", () => {
  const p0 = trainedState();
  assert.equal(resolveMidAutumnTravel("water", p0, { hasWaterMindArt: true }).onTime, true);
  assert.equal(resolveMidAutumnTravel("road", p0, {}).outcome, "late");
  const mountain = resolveMidAutumnTravel("mountain", p0, {}).state.wounds[0];
  assert.equal(mountain.id, "mountain_sprain");
  assert.equal(mountain.severity, 3);
  assert.equal(resolveMidAutumnTravel("delay", p0, {}).outcome, "missed");
});

test("不同桩功在山路和水路立即兑现不同优势", () => {
  const deadwood = resolveMidAutumnTravel("mountain", trainedState("deadwood_stake"), {}).state;
  const sea = resolveMidAutumnTravel("water", trainedState("sea_stilling_stake"), { hasWaterMindArt: true });
  assert.equal(deadwood.wounds[0].severity, 1);
  assert.equal(sea.outcome, "on_time_fresh");
});

test("两门桩功在灵猴围攻中开放不同的退路", () => {
  const deadwood = trainedState("deadwood_stake");
  deadwood.monkeyOutcome = "hostile";
  const sea = trainedState("sea_stilling_stake");
  sea.monkeyOutcome = "hostile";
  const endured = resolveMonkeyConflict("root_and_endure", deadwood);
  const anchored = resolveMonkeyConflict("anchor_and_withdraw", sea);
  assert.equal(endured.outcome, "endured");
  assert.equal(endured.state.wounds[0].severity, 1);
  assert.equal(anchored.outcome, "withdrew_unhurt");
  assert.deepEqual(anchored.state.wounds, []);
  assert.equal(resolveMonkeyConflict("anchor_and_withdraw", deadwood).available, false);
});

test("灵猴会记住馈赠、交易或抢夺，并据此开放酒与水洞", () => {
  const friend = resolveMonkeyTest("share_peach", createP0State(), { peaches: 1, silver: 0 });
  const hostile = resolveMonkeyTest("grab", createP0State(), { peaches: 0, silver: 0 });
  assert.equal(friend.outcome, "friend");
  assert.equal(hostile.outcome, "hostile");
  assert.equal(resolveMonkeyWine("share", hostile.state).available, false);
  const wine = resolveMonkeyWine("share", friend.state);
  const legacy = resolveApeLegacy("observe", wine.state);
  assert.equal(wine.state.items.monkey_wine, 1);
  assert.equal(legacy.state.skills.ape_legacy_clue.stage, "known");
  assert.equal(legacy.state.complete, true);
});

test("所有面向玩家的P0名称与描述均留在大曜江湖之内", () => {
  const visibleText = [
    ...P0_ITEMS.flatMap((item) => [item.name, item.description]),
    ...P0_SKILLS.flatMap((skill) => [skill.name, skill.description, ...(skill.moves || [])]),
    ...P0_NPCS.flatMap((npc) => [npc.name, npc.knownAs]),
    ...P0_LOCATIONS.map((location) => location.name),
    ...P0_ARCS.map((arc) => arc.title),
    ...P0_CONTENT_NODES.map((node) => node.title),
  ].filter(Boolean).join("\n");
  assert.doesNotMatch(visibleText, /现实|论坛|武道局|其他玩家|排行榜|Demo|原型|测试进度/);
});
