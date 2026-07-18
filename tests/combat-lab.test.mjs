import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  COMBAT_LAB_ENCOUNTERS,
  COMBAT_LAB_MAX_ENERGY,
  advanceCombatLabCampaign,
  createCombatLabSession,
  endCombatLabPlayerTurn,
  getCombatLabActions,
  getCombatLabBattleBoard,
  getCombatLabPositionPath,
  getCombatLabRecommendations,
  resolveCombatLabAction,
  resolveCombatLabEnemyAction,
  restartCombatLab,
  rewindCombatLabDeath,
} from "../web/combat-lab-core.mjs";

function finishEnemyPhase(session) {
  let current = session;
  const actions = [];
  let guard = 0;
  while (current.status === "fighting" && current.turn.phase === "enemy") {
    assert.ok(guard++ < 20, "enemy phase should terminate");
    const resolved = resolveCombatLabEnemyAction(current);
    assert.equal(resolved.available, true);
    if (resolved.action) actions.push(resolved.action);
    current = resolved.session;
  }
  return { session: current, actions };
}

function endTurn(session) {
  const started = endCombatLabPlayerTurn(session);
  assert.equal(started.available, true);
  return finishEnemyPhase(started.session);
}

function prepareRainFinisher() {
  let session = createCombatLabSession();
  session = resolveCombatLabAction(session, "observe").session;
  session = resolveCombatLabAction(session, "extinguish").session;
  session = endTurn(session).session;
  session = resolveCombatLabAction(session, "needle_wrist").session;
  session = endTurn(session).session;
  session = resolveCombatLabAction(session, "needle_wrist").session;
  session = endTurn(session).session;
  return session;
}

test("雨巷与东湖都从统一战斗引擎创建", () => {
  for (const encounterId of ["rain_ambush", "wang_zhuo_east_lake"]) {
    const session = createCombatLabSession({ encounterId });
    assert.equal(session.engine, "dayao-combat-v1");
    assert.equal(session.encounterId, encounterId);
    assert.equal(session.turn.energy, COMBAT_LAB_MAX_ENERGY);
    assert.doesNotThrow(() => JSON.stringify(session));
  }
  assert.deepEqual(COMBAT_LAB_ENCOUNTERS.map((entry) => entry.id), ["rain_ambush", "wang_zhuo_east_lake"]);
});

test("终结技必须先看破刀路并把十八点气血压到九点以下", () => {
  const fresh = createCombatLabSession();
  assert.equal(fresh.battle.participants.enemies.night_assailant.max, 18);
  for (const id of ["seal", "kill"]) {
    const action = getCombatLabActions(fresh).find((entry) => entry.id === id);
    assert.equal(action.evaluation.available, false);
    assert.match(action.evaluation.reason, /看破|迟滞/);
  }

  let opened = resolveCombatLabAction(fresh, "observe").session;
  opened = endTurn(opened).session;
  for (const id of ["seal", "kill"]) {
    const action = getCombatLabActions(opened).find((entry) => entry.id === id);
    assert.equal(action.evaluation.available, false);
    assert.match(action.evaluation.reason, /气血仍足/);
  }

  const pressured = prepareRainFinisher();
  assert.ok(pressured.battle.participants.enemies.night_assailant.current <= 9);
  assert.equal(getCombatLabActions(pressured).find((entry) => entry.id === "seal").evaluation.available, true);
  assert.equal(getCombatLabActions(pressured).find((entry) => entry.id === "kill").evaluation.available, true);
});

test("气血、伤势和远程余威会在收势后真实结算", () => {
  let session = prepareRainFinisher();
  const before = session.battle.participants.player.current;
  session = resolveCombatLabAction(session, "seal").session;
  assert.equal(session.status, "fighting");
  assert.equal(session.pendingOutcome.outcome, "subdued");
  const completed = endTurn(session);
  assert.equal(completed.session.status, "finished");
  assert.equal(completed.session.result.outcome, "subdued");
  assert.equal(completed.session.result.consequences.assailant, "captive");
  assert.ok(completed.session.battle.participants.player.current <= before);
  assert.deepEqual(completed.actions.map((entry) => entry.unitId), ["night_assailant", "roof_crossbow", "black_leader"]);
  assert.equal(completed.session.result.consequences.enemyDisposition.night_assailant, "withdrawn");
  assert.equal(completed.session.result.consequences.enemyDisposition.roof_crossbow, "withdrawn");
});

test("行动风险与收势后的敌方预告是两层信息", () => {
  const session = createCombatLabSession();
  const move = getCombatLabActions(session).find((entry) => entry.id === "move_eave_pillar");
  assert.equal(move.evaluation.rating, "safe");
  assert.equal(move.evaluation.ratingLabel, "条件占优");
  assert.match(move.enemyPhasePreview, /若此刻收势/);
  assert.notEqual(move.enemyPhasePreview.length, 0);

  const recommended = getCombatLabRecommendations(session, "position:eave_pillar");
  assert.equal(recommended[0].id, "move_eave_pillar");
  assert.equal(new Set(recommended.map((entry) => entry.id)).size, recommended.length);
});

test("六节点路径、移动耗气和敌方行动顺序真实生效", () => {
  let session = createCombatLabSession();
  const board = getCombatLabBattleBoard(session);
  assert.equal(board.nodes.length, 6);
  assert.deepEqual(getCombatLabPositionPath("alley_entrance", "pharmacy_wall"), ["alley_entrance", "eave_pillar", "pharmacy_wall"]);

  const move = getCombatLabActions(session).find((entry) => entry.id === "move_pharmacy_wall");
  assert.equal(move.energyCost, 2);
  session = resolveCombatLabAction(session, move.id).session;
  assert.equal(session.positions.player, "pharmacy_wall");
  assert.equal(session.turn.energy, 1);

  const started = endCombatLabPlayerTurn(session).session;
  assert.deepEqual(started.turn.enemyQueue.map((entry) => entry.unitId), ["night_assailant", "roof_crossbow", "black_leader"]);
  const ended = finishEnemyPhase(started);
  assert.equal(ended.session.turn.round, 2);
  assert.equal(ended.session.turn.energy, COMBAT_LAB_MAX_ENERGY);
});

test("灭灯会让屋脊弩手失去锁定", () => {
  const extinguished = resolveCombatLabAction(createCombatLabSession(), "extinguish").session;
  assert.equal(extinguished.battle.conditions.darkness, true);
  const started = endCombatLabPlayerTurn(extinguished).session;
  const crossbow = started.turn.enemyQueue.find((entry) => entry.unitId === "roof_crossbow");
  assert.equal(crossbow.label, "失去视线");
  assert.equal((crossbow.effects || []).some((entry) => entry.type === "damage"), false);
});

test("相同状态与行动的因果骰固定，改变条件才改变因果键", () => {
  const session = createCombatLabSession();
  const first = resolveCombatLabAction(session, "observe");
  const repeated = resolveCombatLabAction(restartCombatLab(session), "observe");
  assert.equal(first.result.check.roll, repeated.result.check.roll);
  assert.equal(first.result.check.causalKey, repeated.result.check.causalKey);

  const changed = restartCombatLab(session, { attributes: { insight: 4 } });
  const changedResult = resolveCombatLabAction(changed, "observe");
  assert.notEqual(first.result.check.causalKey, changedResult.result.check.causalKey);
});

test("死局消耗命灯并在回照后保留死因见闻", () => {
  const attempt = resolveCombatLabAction(createCombatLabSession({ fateSeed: "seed-3", attributes: { strength: 0 } }), "reckless");
  assert.equal(attempt.session.status, "death");
  assert.equal(attempt.session.lives, 1);
  assert.equal(attempt.session.result.causeId, "left_sleeve_blade");
  const rewound = rewindCombatLabDeath(attempt.session);
  assert.equal(rewound.available, true);
  assert.equal(rewound.session.battle.knownFacts.includes("left_sleeve_blade"), true);
  const remembered = getCombatLabActions(rewound.session).find((entry) => entry.id === "reckless");
  assert.equal(remembered.evaluation.rating === "fatal", false);
  assert.ok(remembered.evaluation.reasons.some((reason) => /看破|迟滞/.test(reason)));
});

test("最后一盏命灯熄灭后不能回照", () => {
  const attempt = resolveCombatLabAction(createCombatLabSession({ lives: 1, fateSeed: "seed-3", attributes: { strength: 0 } }), "reckless");
  assert.equal(attempt.session.status, "death");
  assert.equal(attempt.session.lives, 0);
  assert.equal(rewindCombatLabDeath(attempt.session).available, false);
});

test("柳巷用追逐语义呈现身份、同伴和警觉而非首领血条", () => {
  const session = createCombatLabSession({ encounterId: "wang_zhuo_east_lake" });
  const board = getCombatLabBattleBoard(session);
  assert.equal(board.meta.presentation, "pursuit");
  assert.deepEqual(board.pursuit, { identityProgress: 0, identityGoal: 2, allySafe: false, alert: 0, tailPressure: 0 });
  assert.equal(board.stage.id, "willow_tail");
  assert.equal(board.allies[0].id, "yan_jinghong");
  assert.ok(getCombatLabActions(session).some((entry) => entry.id === "observe_tail"));
});

test("雨巷战果会把伤势、证据、警戒和关系带入柳巷", () => {
  let session = prepareRainFinisher();
  session = resolveCombatLabAction(session, "seal").session;
  session = endTurn(session).session;
  const advanced = advanceCombatLabCampaign(session);
  assert.equal(advanced.available, true);
  assert.equal(advanced.session.encounterId, "wang_zhuo_east_lake");
  assert.deepEqual(advanced.session.wounds, session.wounds);
  assert.ok(advanced.session.battle.ledger.evidence.includes("rain_ambush_captive"));
  assert.equal(advanced.session.battle.ledger.outcomes[0].encounterId, "rain_ambush");
  assert.ok(advanced.session.battle.ledger.relationships.yan_jinghong.trust > 58);
});

test("手机演武页隐藏调试命盘并保留正式恢复入口", () => {
  const html = fs.readFileSync(new URL("../web/combat.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../web/combat-lab.mjs", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../web/combat-lab.css", import.meta.url), "utf8");
  assert.match(html, /width=device-width/);
  assert.match(html, /class="boot-fallback"/);
  assert.match(html, /id="combat-status"/);
  assert.match(app, /URLSearchParams\(window\.location\.search\)\.has\("debug"\)/);
  assert.match(app, /if \(!debugToolsVisible\) return ""/);
  assert.match(app, /pursuit-status/);
  assert.match(css, /@media \(max-width: 540px\)[\s\S]*\.position-map\s*\{\s*display: none/);
  assert.match(css, /\.action-copy \.action-forecast[\s\S]*font-size: 10px/);
});
