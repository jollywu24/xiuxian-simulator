import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  createCombatLabSession,
  getCombatLabActions,
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

  const observed = resolveCombatLabAction(session, "observe");
  assert.equal(observed.available, true);
  assert.equal(observed.session.battle.round, 2);
  assert.equal(observed.session.battle.knownFacts.includes("left_sleeve_blade"), true);
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
});

test("手机演武页面具备视口、独立样式与模块入口", () => {
  const html = fs.readFileSync(new URL("../web/combat.html", import.meta.url), "utf8");
  assert.match(html, /width=device-width/);
  assert.match(html, /combat-lab\.css/);
  assert.match(html, /combat-lab\.mjs/);
  assert.doesNotMatch(html, /wudao-app\.mjs/);
});
