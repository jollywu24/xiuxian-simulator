import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  COMBAT_LAB_MAX_ENERGY,
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

function finishEnemyTurn(session) {
  let current = session;
  const actions = [];
  while (current.status === "fighting" && current.turn.phase === "enemy") {
    const resolved = resolveCombatLabEnemyAction(current);
    assert.equal(resolved.available, true);
    if (resolved.action) actions.push(resolved.action);
    current = resolved.session;
  }
  return { session: current, actions };
}

test("失败与得手有损会在敌方反击中精确兑现", () => {
  const fatalSetup = createCombatLabSession({
    fateSeed: "seed-3",
    attributes: { insight: 0 },
  });
  const fatalAttempt = resolveCombatLabAction(fatalSetup, "needle_wrist");
  assert.equal(fatalAttempt.result.evaluation.tier, "failure");
  assert.equal(fatalAttempt.session.battle.vitality.player.current, 12);
  assert.equal(fatalAttempt.session.pendingConsequences.length, 1);
  assert.equal(fatalAttempt.session.pendingConsequences[0].damage, 12);
  assert.equal(fatalAttempt.session.pendingConsequences[0].causeId, "left_sleeve_blade");

  const fatalEnemyTurn = endCombatLabPlayerTurn(fatalAttempt.session).session;
  const fatalReaction = resolveCombatLabEnemyAction(fatalEnemyTurn);
  assert.equal(fatalReaction.action.kind, "reaction");
  assert.equal(fatalReaction.impact.playerDamage, 12);
  assert.equal(fatalReaction.session.status, "death");
  assert.equal(fatalReaction.session.result.causeId, "left_sleeve_blade");

  const costlySetup = createCombatLabSession({
    fateSeed: "seed-14",
    attributes: { insight: 5 },
  });
  const costlyAttempt = resolveCombatLabAction(costlySetup, "observe");
  assert.equal(costlyAttempt.result.evaluation.tier, "costly");
  const costlyEnemyTurn = endCombatLabPlayerTurn(costlyAttempt.session).session;
  const costlyReaction = resolveCombatLabEnemyAction(costlyEnemyTurn);
  assert.equal(costlyReaction.impact.playerDamage, 2);
  assert.equal(costlyReaction.session.battle.vitality.player.current, 10);
  assert.equal(costlyReaction.session.wounds[0].severity, 1);
  assert.equal(costlyReaction.session.wounds[0].bodyPart, "torso");
});

test("我方回合拥有三点气机，连续行动后才交给敌方", () => {
  const session = createCombatLabSession();
  const actions = getCombatLabActions(session);
  assert.equal(session.turn.phase, "player");
  assert.equal(session.turn.energy, COMBAT_LAB_MAX_ENERGY);
  assert.equal(actions.find((action) => action.id === "observe").energyCost, 1);
  assert.equal(actions.find((action) => action.id === "needle_wrist").energyCost, 2);
  assert.ok(actions.every((action) => action.evaluation));
  assert.ok(actions.every((action) => action.impactPreview));

  const observed = resolveCombatLabAction(session, "observe");
  assert.equal(observed.available, true);
  assert.equal(observed.session.turn.round, 1);
  assert.equal(observed.session.turn.phase, "player");
  assert.equal(observed.session.turn.energy, 2);
  assert.equal(observed.session.battle.knownFacts.includes("left_sleeve_blade"), true);

  const needled = resolveCombatLabAction(observed.session, "needle_wrist");
  assert.equal(needled.session.turn.energy, 0);
  assert.equal(needled.session.turn.phase, "player");
  assert.ok(needled.session.battle.vitality.enemy.current < needled.session.battle.vitality.enemy.max);
  assert.equal(needled.session.battle.vitality.player.current, needled.session.battle.vitality.player.max);
});

test("六个身位节点真实改变距离、路径、气机与脱身条件", () => {
  const session = createCombatLabSession();
  const board = getCombatLabBattleBoard(session);
  assert.equal(board.nodes.length, 6);
  assert.equal(board.playerNode.id, "alley_entrance");
  assert.deepEqual(getCombatLabPositionPath("alley_entrance", "pharmacy_wall"), ["alley_entrance", "eave_pillar", "pharmacy_wall"]);

  const move = getCombatLabActions(session).find((action) => action.id === "move_pharmacy_wall");
  assert.equal(move.energyCost, 2);
  assert.equal(move.evaluation.available, true);
  const moved = resolveCombatLabAction(session, move.id);
  assert.equal(moved.session.positions.player, "pharmacy_wall");
  assert.equal(moved.session.turn.energy, 1);

  const flee = getCombatLabActions(moved.session).find((action) => action.id === "flee");
  assert.equal(flee.evaluation.available, false);
  assert.match(flee.evaluation.reason, /气机不足/);
  assert.equal(getCombatLabRecommendations(session, "position:eave_pillar")[0].id, "move_eave_pillar");
});

test("移动风险读取敌方预告，推荐动作不重复且敌方节点不可误选", () => {
  const session = createCombatLabSession();
  const move = getCombatLabActions(session).find((action) => action.id === "move_eave_pillar");
  assert.notEqual(move.evaluation.rating, "safe");
  assert.match(move.enemyPhasePreview, /4点气血/);

  const recommendations = getCombatLabRecommendations(session, "position:eave_pillar");
  assert.equal(new Set(recommendations.map((action) => action.id)).size, recommendations.length);
  assert.equal(recommendations[0].id, "move_eave_pillar");

  const board = getCombatLabBattleBoard(session);
  assert.equal(board.nodes.find((node) => node.id === "eave_pillar").playerSelectable, true);
  assert.equal(board.nodes.find((node) => node.id === "rooftop").playerSelectable, false);
  assert.equal(board.units.find((unit) => unit.id === "roof_crossbow").vitality, null);
  assert.equal(board.units.find((unit) => unit.id === "black_leader").vitality, null);
});

test("敌方行动阶段按刀客、弩手、头目顺序真正结算", () => {
  let session = createCombatLabSession();
  session = resolveCombatLabAction(session, "observe").session;
  session = resolveCombatLabAction(session, "needle_wrist").session;
  const ended = endCombatLabPlayerTurn(session);
  assert.equal(ended.available, true);
  assert.equal(ended.session.turn.phase, "enemy");
  assert.deepEqual(ended.session.turn.enemyQueue.map((entry) => entry.unitId), ["night_assailant", "roof_crossbow", "black_leader"]);

  const resolved = finishEnemyTurn(ended.session);
  assert.deepEqual(resolved.actions.map((entry) => entry.unitId), ["night_assailant", "roof_crossbow", "black_leader"]);
  assert.equal(resolved.session.turn.round, 2);
  assert.equal(resolved.session.turn.phase, "player");
  assert.equal(resolved.session.turn.energy, COMBAT_LAB_MAX_ENERGY);
  assert.equal(resolved.session.positions.night_assailant, "eave_pillar");
  assert.equal(resolved.session.enemyState.crossbowAimed, true);
  assert.equal(resolved.session.enemyState.leaderCharge, 1);
  assert.equal(resolved.session.history.filter((entry) => entry.phase === "enemy").length, 3);
});

test("解决刀客后仍结算已经形成的远程威胁", () => {
  let session = createCombatLabSession();
  session = resolveCombatLabAction(session, "observe").session;
  session = resolveCombatLabAction(session, "needle_wrist").session;
  session = finishEnemyTurn(endCombatLabPlayerTurn(session).session).session;

  const sealPreview = getCombatLabActions(session).find((action) => action.id === "seal");
  assert.match(sealPreview.enemyPhasePreview, /4点气血/);
  assert.doesNotMatch(sealPreview.enemyPhasePreview, /5点气血/);

  const sealed = resolveCombatLabAction(session, "seal");
  assert.equal(sealed.session.status, "fighting");
  assert.equal(sealed.session.pendingOutcome.outcome, "subdued");
  const supportTurn = endCombatLabPlayerTurn(sealed.session).session;
  assert.deepEqual(supportTurn.turn.enemyQueue.map((entry) => entry.unitId), ["roof_crossbow", "black_leader"]);

  const resolved = finishEnemyTurn(supportTurn);
  assert.equal(resolved.session.status, "finished");
  assert.equal(resolved.session.result.outcome, "subdued");
  assert.equal(resolved.session.battle.vitality.player.current, 8);
  assert.deepEqual(resolved.actions.map((entry) => entry.unitId), ["roof_crossbow", "black_leader"]);
});

test("灭灯和遮挡会让远程预告在敌方阶段落空", () => {
  const session = createCombatLabSession({ fateSeed: "seed-2" });
  const extinguished = resolveCombatLabAction(session, "extinguish");
  assert.equal(extinguished.available, true);
  assert.equal(extinguished.session.battle.darkness, true);
  assert.equal(extinguished.session.positions.player, "eave_pillar");
  const ended = endCombatLabPlayerTurn(extinguished.session).session;
  const crossbow = ended.turn.enemyQueue.find((entry) => entry.unitId === "roof_crossbow");
  assert.equal(crossbow.kind, "miss");
  assert.equal(crossbow.damage, 0);
  const resolved = finishEnemyTurn(ended);
  assert.equal(resolved.session.enemyState.crossbowAimed, false);
});

test("命灯回照发生在敌方真实出手后，并保留左袖见闻", () => {
  let session = createCombatLabSession();
  session = resolveCombatLabAction(session, "reckless").session;
  session = endCombatLabPlayerTurn(session).session;
  const death = resolveCombatLabEnemyAction(session);
  assert.equal(death.session.status, "death");
  assert.equal(death.session.lives, 1);
  assert.equal(death.action.unitId, "night_assailant");

  const rewound = rewindCombatLabDeath(death.session);
  assert.equal(rewound.available, true);
  assert.equal(rewound.session.battle.knownFacts.includes("left_sleeve_blade"), true);
  assert.equal(rewound.session.turn.round, 1);
  assert.equal(rewound.session.turn.energy, COMBAT_LAB_MAX_ENERGY);
  assert.equal(getCombatLabActions(rewound.session).some((action) => action.id === "reckless"), false);
});

test("调整命盘会重建战局且继续使用固定因果", () => {
  const session = createCombatLabSession();
  const changed = restartCombatLab(session, {
    fateSeed: "seed-3",
    attributes: { insight: 1 },
    wounds: [{ id: "leg_cut", bodyPart: "leg", severity: 2 }],
  });
  assert.equal(changed.setup.fateSeed, "seed-3");
  assert.equal(changed.setup.attributes.insight, 1);
  assert.equal(changed.wounds[0].bodyPart, "leg");
  assert.equal(changed.turn.round, 1);
  assert.equal(changed.positions.player, "alley_entrance");
  assert.ok(changed.battle.vitality.player.current < changed.battle.vitality.player.max);
});

test("手机演武页面具备视口、独立样式与模块入口", () => {
  const html = fs.readFileSync(new URL("../web/combat.html", import.meta.url), "utf8");
  assert.match(html, /width=device-width/);
  assert.match(html, /combat-lab\.css/);
  assert.match(html, /combat-lab\.mjs/);
  assert.match(html, /jinling-rain-ambush\.webp/);
  assert.doesNotMatch(html, /wudao-app\.mjs/);
  assert.doesNotMatch(html, /id="combat-lab" aria-live/);
  assert.match(html, /id="combat-status"/);
  for (const asset of [
    "jinling-rain-ambush.webp",
    "portrait-chen-siming.webp",
    "portrait-masked-blade.webp",
    "portrait-roof-crossbow.webp",
    "portrait-black-leader.webp",
  ]) {
    assert.equal(fs.existsSync(new URL(`../web/assets/combat/${asset}`, import.meta.url)), true);
  }
});
