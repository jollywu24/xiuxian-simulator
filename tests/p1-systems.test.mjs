import test from "node:test";
import assert from "node:assert/strict";

import {
  P1_ARCS,
  P1_CONTENT_NODES,
  buildM4JianghuTrace,
  completeM4,
  createM4State,
  getDirtyMoneyBoard,
  getM4OutcomeBoard,
  getM4TrackingActions,
  migrateM4State,
  resolveBaiInstruction,
  resolveCaoDeparture,
  resolveDirtyMoneyChoice,
  resolveM4Outcome,
  resolveM4Tracking,
  resolveM4Training,
  resolveMoneyInquiry,
  resolveOldHouseChoice,
  validateP1Content,
} from "../web/wudao-p1-core.mjs";

function investigated(aid = "sealed_letter") {
  let m4 = resolveCaoDeparture(aid, createM4State()).state;
  m4 = resolveMoneyInquiry("inspect_seal", m4).state;
  m4 = resolveMoneyInquiry("compare_tally", m4).state;
  m4 = resolveMoneyInquiry("question_source", m4).state;
  return m4;
}

function tracked(disposition = "trap") {
  let m4 = investigated();
  m4 = resolveDirtyMoneyChoice(disposition, m4, { baiTrust: 30 }).state;
  m4 = resolveM4Tracking("countermark", m4, {
    fateSeed: "m4-tested-seed",
    attributes: { insight: 8 },
    assailantChannelControlled: true,
  }).state;
  return resolveOldHouseChoice("search_drawer", m4, { baiTrust: 30 }).state;
}

test("M4内容包以一个局面、十一节点和最多三种核心内容变体通过校验", () => {
  assert.equal(P1_ARCS.length, 1);
  assert.equal(P1_CONTENT_NODES.length, 11);
  assert.deepEqual(validateP1Content(), { ok: true, errors: [], nodeCount: 11, arcCount: 1 });
  assert.ok(P1_ARCS[0].solutionMatrix.length >= 3);
  assert.ok(P1_ARCS[0].solutionMatrix.filter((route) => route.kind === "noncombat").length >= 2);
  assert.ok(P1_ARCS[0].coreVariants.length <= 3);
});

test("M4默认状态可序列化，旧存档迁移会补齐联系人和钱匣来源结构", () => {
  const migrated = migrateM4State({ started: true, dirtyMoney: { holder: "chen_siming" }, contacts: { shen_fu: { status: "missing" } } });
  assert.deepEqual(JSON.parse(JSON.stringify(migrated)), migrated);
  assert.equal(migrated.dirtyMoney.holder, "chen_siming");
  assert.equal(migrated.dirtyMoney.legality, "suspected_illicit");
  assert.equal(migrated.contacts.shen_fu.status, "missing");
  assert.ok(migrated.contacts.shen_fu.permissions.includes("side_gate"));
});

test("曹青离场会真实关闭指点、药库和担保，只留下一个临别帮助", () => {
  const result = resolveCaoDeparture("enemy_warning", createM4State());
  assert.equal(result.available, true);
  assert.equal(result.state.cao.status, "away");
  assert.deepEqual(result.state.cao.permissions, { guidance: false, medicine: false, guarantee: false });
  assert.deepEqual(result.state.contacts.cao_qing.permissions, []);
  assert.equal(result.state.cao.partingAid, "enemy_warning");
  assert.equal(resolveCaoDeparture("sealed_letter", result.state).available, false);
});

test("钱匣至少查明两处疑点才能处置，来源和知情者不会随银钱转手消失", () => {
  let m4 = resolveCaoDeparture("medicine_key", createM4State()).state;
  m4 = resolveMoneyInquiry("inspect_seal", m4).state;
  assert.equal(getDirtyMoneyBoard(m4).canDecide, false);
  m4 = resolveMoneyInquiry("compare_tally", m4).state;
  assert.equal(getDirtyMoneyBoard(m4).canDecide, true);
  const hidden = resolveDirtyMoneyChoice("hide", m4, {});
  assert.equal(hidden.state.dirtyMoney.holder, "chen_siming");
  assert.ok(hidden.state.dirtyMoney.knownBy.includes("shen_fu"));
  assert.ok(hidden.state.dirtyMoney.knownBy.includes("chen_siming"));
  assert.ok(hidden.state.dirtyMoney.evidence.includes("snake_seal"));
});

test("上交需要人物担保，设局需要完整调查，分赃会提高贪念与暴露", () => {
  let partial = resolveCaoDeparture("medicine_key", createM4State()).state;
  partial = resolveMoneyInquiry("inspect_seal", partial).state;
  partial = resolveMoneyInquiry("compare_tally", partial).state;
  assert.equal(resolveDirtyMoneyChoice("report", partial, { baiTrust: 0 }).available, false);
  assert.equal(resolveDirtyMoneyChoice("trap", partial, { baiTrust: 0 }).available, false);
  const shared = resolveDirtyMoneyChoice("share", partial, {});
  assert.equal(shared.available, true);
  assert.equal(shared.state.dirtyMoney.playerClaim, "half_share");
  assert.ok(shared.state.shenFu.greed > partial.shenFu.greed);
  assert.ok(shared.state.dirtyMoney.exposure > 0);
});

test("同一追踪状态与行动使用固定因果骰，能力会改变修正和因果键", () => {
  let m4 = investigated("enemy_warning");
  m4 = resolveDirtyMoneyChoice("trap", m4, { baiTrust: 30 }).state;
  const base = getM4TrackingActions(m4, { fateSeed: "fixed", attributes: { insight: 2 } }).find((action) => action.id === "countermark");
  const repeat = getM4TrackingActions(m4, { fateSeed: "fixed", attributes: { insight: 2 } }).find((action) => action.id === "countermark");
  const prepared = getM4TrackingActions(m4, { fateSeed: "fixed", attributes: { insight: 2 }, assailantChannelControlled: true }).find((action) => action.id === "countermark");
  assert.deepEqual(base.check, repeat.check);
  assert.notEqual(base.check.causalKey, prepared.check.causalKey);
  assert.equal(prepared.modifier, base.modifier + 1);
});

test("追踪失败仍会找到下一处局面，只增加假线、警觉和残缺证据", () => {
  let m4 = investigated("medicine_key");
  m4 = resolveDirtyMoneyChoice("refuse", m4, {}).state;
  let failure;
  for (let index = 0; index < 200 && !failure; index += 1) {
    const result = resolveM4Tracking("shadow_steps", m4, { fateSeed: `failure-${index}`, attributes: { agility: 0 } });
    if (result.outcome === "failure") failure = result;
  }
  assert.ok(failure);
  assert.equal(failure.state.locationStates.qinhuai_old_house, "watched");
  assert.equal(failure.state.tracking.falseTrail, true);
  assert.ok(failure.state.evidence.includes("torn_account_page"));
});

test("旧宅选择会在七杀线索、收货活证和白栀云支援之间形成代价", () => {
  let m4 = investigated();
  m4 = resolveDirtyMoneyChoice("trap", m4, { baiTrust: 30 }).state;
  m4 = resolveM4Tracking("countermark", m4, { fateSeed: "old-house", attributes: { insight: 8 } }).state;
  const searched = resolveOldHouseChoice("search_drawer", m4, { baiTrust: 30 });
  const watched = resolveOldHouseChoice("watch_door", m4, { baiTrust: 30 });
  const messaged = resolveOldHouseChoice("send_bai_message", m4, { baiTrust: 30 });
  assert.equal(searched.state.sevenKillClue, true);
  assert.ok(watched.state.evidence.includes("collector_token"));
  assert.ok(messaged.state.dirtyMoney.knownBy.includes("bai_zhiyun"));
});

test("控制、揭发、放走和杀死都是独立可达结局，但只生成三种核心内容变体", () => {
  const m4 = tracked();
  const context = { baiTrust: 30, baiDebt: 40, martialStage: "body", hasKillingMethod: true };
  const board = getM4OutcomeBoard(m4, context);
  assert.ok(board.options.every((option) => option.available));
  const outcomes = Object.fromEntries(board.options.map((option) => [option.id, resolveM4Outcome(option.id, m4, context).state]));
  assert.equal(outcomes.control.outcome, "controlled");
  assert.equal(outcomes.expose.outcome, "exposed");
  assert.equal(outcomes.release.outcome, "released");
  assert.equal(outcomes.kill.outcome, "killed");
  assert.deepEqual(new Set(Object.values(outcomes).map((state) => state.contentVariant)), new Set(["controlled", "exposed", "broken"]));
});

test("沈福结局会关闭或替换真实门路，而不是只改变结算文案", () => {
  const m4 = tracked();
  const context = { baiTrust: 30, baiDebt: 40, martialStage: "body", hasKillingMethod: true };
  const controlled = resolveM4Outcome("control", m4, context).state;
  const exposed = resolveM4Outcome("expose", m4, context).state;
  const released = resolveM4Outcome("release", m4, context).state;
  const killed = resolveM4Outcome("kill", m4, context).state;
  assert.deepEqual(controlled.contacts.shen_fu.permissions, ["conditional_side_gate", "risky_goods"]);
  assert.equal(exposed.contacts.replacement, "bai_steward");
  assert.deepEqual(released.contacts.shen_fu.permissions, []);
  assert.equal(killed.locationStates.shen_side_gate, "sealed");
  assert.notEqual(controlled.shenIdentity, exposed.shenIdentity);
});

test("白栀云授武依赖旧账与救命关系，并在下一场闭门试势立即兑现", () => {
  let m4 = tracked();
  m4 = resolveM4Outcome("expose", m4, { baiTrust: 30, baiDebt: 40, martialStage: "body", hasKillingMethod: true }).state;
  const learned = resolveBaiInstruction("receive", m4, { baiTrust: 30, baiDebt: 40 });
  assert.equal(learned.available, true);
  assert.equal(learned.state.baiInstruction, true);
  const trained = resolveM4Training("apply_to_stake", learned.state, { stakeId: "sea_stilling_stake" });
  assert.equal(trained.available, true);
  assert.equal(trained.outcome, "water_formula");
});

test("章末江湖留痕逐句带来源，并由真实结局和训练状态生成", () => {
  let m4 = tracked();
  m4 = resolveM4Outcome("control", m4, { baiTrust: 30, martialStage: "body", hasKillingMethod: true }).state;
  m4 = resolveBaiInstruction("receive", m4, { baiTrust: 30 }).state;
  m4 = resolveM4Training("seal_old_blade", m4, {}).state;
  const completed = completeM4(m4);
  assert.equal(completed.available, true);
  const trace = buildM4JianghuTrace(completed.state);
  assert.ok(trace.length >= 5 && trace.length <= 8);
  assert.ok(trace.every((entry) => entry.text && entry.source));
  assert.ok(trace.some((entry) => entry.text.includes("沈福")));
  assert.deepEqual(completed.state.jianghuTrace, trace);
});
