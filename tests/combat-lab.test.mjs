import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  createCombatLabSession,
  getCombatLabActions,
  getCombatLabBattleBoard,
  getCombatLabRecommendations,
  restartCombatLab,
  resolveCombatLabAction,
  rewindCombatLabDeath,
} from "../web/combat-lab-core.mjs";

test("独立演武入口直接读取现有夜战动作与判定", () => {
  const session = createCombatLabSession();
  const actions = getCombatLabActions(session);
  assert.ok(actions.some((action) => action.id === "observe"));
  assert.ok(actions.some((action) => action.id === "reckless"));
  assert.ok(actions.every((action) => action.evaluation));
  assert.ok(actions.every((action) => action.impactPreview));
  assert.deepEqual(getCombatLabBattleBoard(session).vitality.player, { current: 12, max: 12 });

  const observed = resolveCombatLabAction(session, "observe");
  assert.equal(observed.available, true);
  assert.equal(observed.session.battle.round, 2);
  assert.equal(observed.session.battle.knownFacts.includes("left_sleeve_blade"), true);
  assert.equal(getCombatLabBattleBoard(observed.session).intent.sequence.length, 2);
});

test("新版战场同时公开三名敌方单位与环境情境行动", () => {
  const session = createCombatLabSession();
  const board = getCombatLabBattleBoard(session);
  assert.deepEqual(board.units.map((entry) => entry.id), ["night_assailant", "roof_crossbow", "black_leader"]);
  assert.equal(board.units[0].current, board.vitality.enemy.current);
  assert.equal(board.units[1].intent, "瞄准");
  assert.deepEqual(
    getCombatLabRecommendations(session, "street_lantern").map((entry) => entry.display.title),
    ["银针灭灯", "踢翻灯笼", "借影观敌"],
  );
  assert.deepEqual(
    getCombatLabRecommendations(session, "pharmacy_wall").map((entry) => entry.display.title),
    ["翻墙脱身", "蹬墙观势", "蹬墙反跃"],
  );
});

test("命灯回照保留左袖见闻并移除重复必死选择", () => {
  const session = createCombatLabSession();
  const death = resolveCombatLabAction(session, "reckless");
  assert.equal(death.session.status, "death");
  assert.equal(death.session.lives, 1);

  const rewound = rewindCombatLabDeath(death.session);
  assert.equal(rewound.available, true);
  assert.equal(rewound.session.battle.knownFacts.includes("left_sleeve_blade"), true);
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
  assert.equal(changed.battle.round, 1);
  assert.ok(changed.battle.vitality.player.current < changed.battle.vitality.player.max);
});

test("手机演武页面具备视口、独立样式与模块入口", () => {
  const html = fs.readFileSync(new URL("../web/combat.html", import.meta.url), "utf8");
  assert.match(html, /width=device-width/);
  assert.match(html, /combat-lab\.css/);
  assert.match(html, /combat-lab\.mjs/);
  assert.match(html, /jinling-rain-ambush\.webp/);
  assert.doesNotMatch(html, /wudao-app\.mjs/);
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
