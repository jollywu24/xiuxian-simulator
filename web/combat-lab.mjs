import {
  COMBAT_LAB_DEFAULTS,
  COMBAT_LAB_ENCOUNTERS,
  advanceCombatLabCampaign,
  createCombatLabSession,
  endCombatLabPlayerTurn,
  getCombatLabActions,
  getCombatLabBattleBoard,
  getCombatLabRecommendations,
  restartCombatLab,
  resolveCombatLabAction,
  resolveCombatLabEnemyAction,
  rewindCombatLabDeath,
} from "./combat-lab-core.mjs?v=20260731.2";

const root = document.querySelector("#combat-lab");
const liveRegion = document.querySelector("#combat-status");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const debugToolsVisible = new URLSearchParams(window.location.search).has("debug");

const ATTRIBUTE_LABELS = {
  constitution: "根骨",
  insight: "悟性",
  agility: "身法",
  strength: "力道",
  fortune: "福缘",
};

const STAGE_LABELS = {
  mortal: "未入门",
  body: "锻体",
  qi: "聚气",
  meridian: "通脉",
  master: "宗师",
};

const ENVIRONMENT_COPY = {
  street_lantern: {
    name: "灯笼",
    panelTitle: "利用灯笼",
    hint: "灯火既能照见刀路，也会替屋脊弩手标出你的身形。",
  },
  eave_pillar: {
    name: "檐柱",
    panelTitle: "借用檐柱",
    hint: "檐柱可以遮断直线杀招，也会限制自己的腾挪。",
  },
  pharmacy_wall: {
    name: "矮墙",
    panelTitle: "踏上矮墙",
    hint: "翻墙可脱身，借墙反跃则会把退路换成一次强攻。",
  },
};

const ENVIRONMENT_POSITIONS = {
  street_lantern: { x: 17, y: 25, icon: "lantern" },
  eave_pillar: { x: 33, y: 42, icon: "post" },
  pharmacy_wall: { x: 77, y: 59, icon: "gate" },
};

const TARGET_SCENE_POSITIONS = {
  night_assailant: { x: 65, y: 35 },
  roof_crossbow: { x: 75, y: 12 },
  black_leader: { x: 88, y: 28 },
  poison_blade: { x: 76, y: 58 },
  dock_crossbow: { x: 88, y: 12 },
};

const FACT_COPY = {
  left_sleeve_blade: {
    title: "左袖藏刃",
    detail: "贴身前已知真正杀招，刀客伤害降低。",
  },
  wang_chain_blade: {
    title: "袖底回链",
    detail: "王卓正手只是引线，回链会从左腕袖底折返。",
  },
  dock_crossbow_reinforcement: {
    title: "芦苇援弩",
    detail: "第二轮后援弩会从小舟现身，必须提前取得遮挡。",
  },
  poison_ticks_after_enemy_phase: {
    title: "蛇毒入脉",
    detail: "蛇毒会在敌方阶段后持续损耗气血。",
  },
  fatal_wound_deadline: {
    title: "致命伤限期",
    detail: "致命伤必须在本轮敌方行动结束前稳定。",
  },
};

const OUTCOME_LABELS = {
  subdued: "留下活口",
  killed: "针下取命",
  escaped: "脱身离去",
  released: "放线追踪",
  protected_escape: "护人撤离",
  death: "命灯碎裂",
};

const EDGE_LABELS = {
  intact_captive: "活口与口供完整",
  intact_token: "左袖凭证无损",
  unseen_exit: "退路未被看破",
  bloodied_finish: "带伤结束",
  marked_escape: "留下追踪标记",
  protected_retreat: "同伴与线索安全撤离",
};

let session = createCombatLabSession();
let selectedEnvironment = null;
let selectedTarget = getCombatLabBattleBoard(session).meta.primaryEnemyId;
let selectedPosition = null;
let selectedContext = null;
let arsenalOpen = false;
let settingsOpen = false;
let visualState = {
  animating: false,
  previousVitality: null,
  effect: null,
  enemyUnitId: null,
};
let effectTimer = null;

function announce(message) {
  if (!liveRegion || !message) return;
  liveRegion.textContent = "";
  requestAnimationFrame(() => {
    liveRegion.textContent = String(message);
  });
}

function motionDuration(milliseconds) {
  return reducedMotion.matches ? 0 : milliseconds;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function signed(value) {
  const number = Number(value || 0);
  return number >= 0 ? `+${number}` : `${number}`;
}

function clampPercent(current, maximum) {
  return Math.max(0, Math.min(100, (Number(current || 0) / Math.max(1, Number(maximum || 1))) * 100));
}

function isWangBattle() {
  return session.encounterId === "wang_zhuo_east_lake";
}

function defaultTarget(board = getCombatLabBattleBoard(session)) {
  return board.meta.primaryEnemyId || board.units.find((unit) => unit.active && !unit.defeated)?.id || board.units[0]?.id || null;
}

function environmentDetails(entry) {
  return {
    ...(ENVIRONMENT_COPY[entry?.id] || {}),
    ...(entry || {}),
    ...(ENVIRONMENT_POSITIONS[entry?.id] || {}),
  };
}

function focusId() {
  if (selectedPosition) return `position:${selectedPosition}`;
  if (selectedEnvironment) return selectedEnvironment;
  if (selectedContext) return selectedContext;
  const board = getCombatLabBattleBoard(session);
  return selectedTarget && selectedTarget !== board.meta.primaryEnemyId ? `target:${selectedTarget}` : "default";
}

function factMemory(board) {
  const factId = [...(board.knownFacts || [])].reverse().find((id) => FACT_COPY[id]);
  return factId ? { id: factId, ...FACT_COPY[factId] } : null;
}

function iconSvg(id) {
  const icons = {
    eye: '<path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
    lantern: '<path d="M8 3h8M7 6h10l1 3v8l-2 3H8l-2-3V9l1-3Z"/><path d="M9 9h6M9 17h6M12 20v2"/>',
    needles: '<path d="m5 19 12-12M8 21 20 9M3 16 15 4"/><circle cx="16.5" cy="4.5" r="1"/><circle cx="20.5" cy="8.5" r="1"/><circle cx="4.5" cy="15.5" r="1"/>',
    fire: '<path d="M12 22c4 0 7-2.8 7-6.5 0-3-1.8-5.5-4.8-8.5.2 3-1.3 4.2-2.4 5.2.1-4.3-2.4-7-4.5-9.2.2 4.3-2.3 6.2-2.3 10.5C5 18.8 8.2 22 12 22Z"/><path d="M9.2 18.3c0 2 1.2 3.7 2.8 3.7 1.8 0 3-1.4 3-3.4 0-1.4-.8-2.7-2.2-4.2 0 1.5-.7 2.4-1.4 3.1-.2-1.5-.9-2.6-1.7-3.5-.1 1.7-.5 2.8-.5 4.3Z"/>',
    shadow: '<path d="M4 19c2.5-5.5 5.5-8.5 9-9 3-.4 5.4 1 7 4-3.2-.5-5.6.2-7.2 2.2C10.5 19 7.6 20 4 19Z"/><path d="M5 6h7M8 3v6"/>',
    impact: '<path d="m4 20 5.5-5.5M14.5 9.5 20 4M7 4l2.5 5.5M14.5 14.5 20 17M12 2v4M2 12h4M18 12h4M12 18v4"/>',
    escape: '<path d="M4 20 20 4M8 4h12v12"/><path d="M4 8v12h12"/>',
    blade: '<path d="m4 20 3-6L17 4l3 3-10 10-6 3Z"/><path d="m14 7 3 3M5 19l-2 2"/>',
    bow: '<path d="M6 3c7 2 7 16 0 18M18 3c-7 2-7 16 0 18M6 12h12"/><path d="m14 9 4 3-4 3"/>',
    command: '<path d="m12 3 3 6 6 .8-4.5 4.4 1.1 6.3L12 17.6l-5.6 2.9 1.1-6.3L3 9.8 9 9l3-6Z"/>',
    bag: '<path d="M8 7h8l3 5v8H5v-8l3-5Z"/><path d="M9 7V4h6v3M9 13h6"/>',
    stance: '<circle cx="12" cy="5" r="2"/><path d="m12 7-2 5 3 3-2 6M10 12l-5 3M13 15l6 3"/>',
    chain: '<path d="M7 8.5 5.5 10a3 3 0 0 0 4.2 4.2l2-2M17 15.5l1.5-1.5a3 3 0 0 0-4.2-4.2l-2 2"/><path d="m8.5 15.5 7-7"/>',
    ally: '<circle cx="9" cy="8" r="3"/><path d="M3.5 20c.4-4 2.2-6 5.5-6s5.1 2 5.5 6M17 7v8M13 11h8"/>',
    rope: '<path d="M4 8c3-4 6 4 9 0s6 4 7 0M4 16c3-4 6 4 9 0s6 4 7 0"/>',
    crowd: '<circle cx="7" cy="8" r="2"/><circle cx="17" cy="8" r="2"/><circle cx="12" cy="6" r="2"/><path d="M3 19c0-3 1.3-5 4-5s4 2 4 5M13 19c0-3 1.3-5 4-5s4 2 4 5M8 17c0-3 1.3-5 4-5s4 2 4 5"/>',
    healing: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/>',
    guard: '<path d="M12 3 20 6v5c0 5-3.2 8.4-8 10-4.8-1.6-8-5-8-10V6l8-3Z"/>',
    fate: '<circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16M7 7l10 10M17 7 7 17"/>',
    rod: '<path d="M5 21 17 4M16 4c3 2 4 5 3 9M19 13c-1 1-2 1-3 0"/>',
    water: '<path d="M3 9c2 2 4 2 6 0s4-2 6 0 4 2 6 0M3 15c2 2 4 2 6 0s4-2 6 0 4 2 6 0"/>',
    gate: '<path d="M5 21V5h14v16M8 21V9h8v12M3 21h18"/>',
    post: '<path d="M9 3h6l1 18H8L9 3ZM6 7h12"/>',
    awning: '<path d="M3 9h18L18 4H6L3 9ZM5 9v11M19 9v11M3 20h18"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[id] || icons.blade}</svg>`;
}

function riskClass(entry) {
  if (entry.evaluation.rating === "fatal" || entry.evaluation.rating === "dangerous") return "danger";
  if (entry.evaluation.rating === "safe") return "safe";
  return "viable";
}

function woundLabel(wound) {
  const parts = {
    leg: "腿侧",
    arm: "手臂",
    shoulder: "肩臂",
    torso: "肋下",
  };
  const levels = { 1: "轻伤", 2: "重伤", 3: "致命伤" };
  return `${parts[wound.bodyPart] || "身上"}${levels[Number(wound.severity || 1)] || "带伤"}`;
}

function hpBarHtml({ label, vitality, side, portrait, previous }) {
  const current = Math.max(0, Number(vitality.current || 0));
  const maximum = Math.max(1, Number(vitality.max || 1));
  const currentPercent = clampPercent(current, maximum);
  const previousPercent = clampPercent(previous?.current ?? current, previous?.max ?? maximum);
  return `
    <div class="fighter-hud ${escapeHtml(side)}" style="--hp-current:${currentPercent}%;--hp-lag:${Math.max(currentPercent, previousPercent)}%">
      ${portrait ? `<img src="${escapeHtml(portrait)}" alt="" />` : ""}
      <div class="fighter-hud-copy">
        <div><strong>${escapeHtml(label)}</strong><b>${current}<i>/</i>${maximum}</b></div>
        <div class="hp-track" role="meter" aria-label="${escapeHtml(`${label}气血`)}" aria-valuemin="0" aria-valuemax="${maximum}" aria-valuenow="${current}">
          <span class="hp-lag"></span>
          <span class="hp-current"></span>
        </div>
      </div>
    </div>
  `;
}

function unitRailHtml(board) {
  return `
    <div class="enemy-rail" aria-label="敌方单位">
      ${board.units.map((unit) => {
        const hasVitality = board.meta.presentation !== "pursuit" && Boolean(unit.vitality);
        const percent = hasVitality ? clampPercent(unit.current, unit.max) : 0;
        const previousEnemy = hasVitality
          ? visualState.previousVitality?.enemies?.[unit.id] || (unit.id === board.meta.primaryEnemyId ? visualState.previousVitality?.enemy : null)
          : null;
        const lagPercent = hasVitality ? clampPercent(previousEnemy?.current ?? unit.current, previousEnemy?.max ?? unit.max) : 0;
        const selected = selectedTarget === unit.id;
        const icon = unit.icon || (unit.id === "roof_crossbow" ? "bow" : unit.id === "black_leader" ? "command" : "blade");
        const primary = unit.primary || unit.id === board.meta.primaryEnemyId;
        const initials = [...unit.name].slice(0, 2).join("");
        return `
          <button type="button" class="enemy-unit ${selected ? "selected" : ""} ${primary ? "active" : "support"} ${visualState.enemyUnitId === unit.id ? "acting" : ""} ${unit.acted ? "acted" : ""} ${unit.defeated ? "defeated" : ""}" data-target-id="${escapeHtml(unit.id)}" aria-pressed="${selected}">
            <span class="unit-portrait">${unit.portrait ? `<img src="${escapeHtml(unit.portrait)}" alt="" />` : `<b class="portrait-fallback">${escapeHtml(initials)}</b>`}${iconSvg(icon)}</span>
            <span class="unit-copy">
              <span><strong>${escapeHtml(unit.name)}</strong>${hasVitality ? `<b>${Number(unit.current)}<i>/</i>${Number(unit.max)}</b>` : `<em class="unit-role">${escapeHtml(unit.role)}</em>`}</span>
              ${hasVitality ? `<span class="unit-hp" style="--unit-hp-current:${percent}%;--unit-hp-lag:${Math.max(percent, lagPercent)}%" role="meter" aria-label="${escapeHtml(`${unit.name}气血`)}" aria-valuemin="0" aria-valuemax="${Number(unit.max)}" aria-valuenow="${Number(unit.current)}">
                <i class="unit-hp-lag"></i>
                <i class="unit-hp-current"></i>
              </span>` : '<span class="unit-threat-line" aria-hidden="true"></span>'}
              <small><b>${unit.intentOrder ? `${Number(unit.intentOrder)}·` : ""}</b>${escapeHtml(unit.intent)}<em>${escapeHtml(`${unit.nodeName}·${unit.distance}${unit.stageId ? `·${STAGE_LABELS[unit.stageId] || unit.stageId}` : ""}`)}</em></small>
            </span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function effectHtml() {
  const effect = visualState.effect;
  if (!effect) return "";
  const fragments = [];
  if (effect.enemyDamage > 0) fragments.push(`<span class="float-number enemy-damage">−${Number(effect.enemyDamage)}</span>`);
  if (effect.playerDamage > 0) fragments.push(`<span class="float-number player-damage">−${Number(effect.playerDamage)}</span>`);
  if (effect.status) fragments.push(`<span class="brush-status">${escapeHtml(effect.status)}</span>`);
  if (effect.actionId === "needle_wrist" || effect.actionId?.includes("needle") || effect.actionId?.includes("subdue")) fragments.push('<i class="needle-flight"></i><i class="impact-spark"></i>');
  if (effect.actionId === "extinguish") fragments.push('<i class="lantern-flare"></i>');
  if (effect.enemyPhase) fragments.push('<i class="enemy-action-pulse"></i>');
  return `<div class="combat-effects ${escapeHtml(effect.outcome || "")} ${effect.enemyPhase ? "enemy-action-effect" : ""}" aria-hidden="true">${fragments.join("")}</div>`;
}

function positionMapHtml(board) {
  const nodes = new Map(board.nodes.map((node) => [node.id, node]));
  const occupied = new Map();
  for (const unit of board.units) {
    if (!unit.nodeId || unit.defeated) continue;
    occupied.set(unit.nodeId, [...(occupied.get(unit.nodeId) || []), { name: unit.name, side: "enemy" }]);
  }
  for (const ally of board.allies || []) {
    const nodeId = ally.nodeId || board.positions?.[ally.id];
    if (!nodeId || ally.defeated) continue;
    occupied.set(nodeId, [...(occupied.get(nodeId) || []), { name: ally.name, side: "ally" }]);
  }
  return `
    <div class="position-map" aria-label="${escapeHtml(board.meta.mapLabel || "战场身位图")}">
      <span class="position-map-title">身位</span>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${(board.links || []).map(([from, to]) => {
          const a = nodes.get(from);
          const b = nodes.get(to);
          if (!a || !b) return "";
          return `<line x1="${Number(a.x)}" y1="${Number(a.y)}" x2="${Number(b.x)}" y2="${Number(b.y)}" />`;
        }).join("")}
      </svg>
      ${board.nodes.map((node) => {
        const isPlayer = board.positions.player === node.id;
        const occupants = occupied.get(node.id) || [];
        const enemy = occupants.some((entry) => entry.side === "enemy");
        const ally = occupants.some((entry) => entry.side === "ally");
        const occupantNames = occupants.map((entry) => entry.name).join("、");
        const selected = selectedPosition === node.id;
        const content = `<i></i><span>${escapeHtml(node.shortName)}</span>${isPlayer ? "<b>你</b>" : occupantNames ? `<b>${escapeHtml(occupantNames)}</b>` : ""}`;
        const label = escapeHtml(`${node.name}${isPlayer ? "，你在此处" : occupantNames ? `，${occupantNames}在此处` : ""}`);
        return node.playerSelectable
          ? `<button type="button" class="position-node ${isPlayer ? "player-position" : ""} ${enemy ? "enemy-position" : ""} ${ally ? "ally-position" : ""} ${selected ? "selected" : ""}" style="--node-x:${Number(node.x)}%;--node-y:${Number(node.y)}%" data-position-id="${escapeHtml(node.id)}" aria-pressed="${selected}" aria-label="${label}">${content}</button>`
          : `<span class="position-node fixed-position ${enemy ? "enemy-position" : ""} ${ally ? "ally-position" : ""}" style="--node-x:${Number(node.x)}%;--node-y:${Number(node.y)}%" aria-label="${label}">${content}</span>`;
      }).join("")}
    </div>
  `;
}

function sceneHtml(board) {
  const battle = session.battle;
  const targetUnit = board.units.find((entry) => entry.id === selectedTarget) || board.units[0];
  const targetIntent = targetUnit?.intent || battle.enemyIntent || "敌人正在重新寻找出手机会";
  const targetNode = new Map(board.nodes.map((node) => [node.id, node]));
  const visibleTargets = board.units.filter((unit) => !unit.defeated && unit.active !== false);
  const environments = board.environment.map(environmentDetails);
  const sceneImage = board.meta.sceneImage || "./assets/combat/jinling-rain-ambush.webp";
  return `
    <section class="battle-stage ${escapeHtml(board.meta.sceneClass || "")} ${board.meta.presentation === "pursuit" ? "pursuit-stage" : ""} ${battle.darkness ? "darkened" : ""} ${session.status !== "fighting" ? "settled" : ""} ${session.turn.phase === "enemy" ? "enemy-phase" : "player-phase"}" style="--scene-image:url('${escapeHtml(sceneImage)}')">
      <header class="stage-heading">
        <div>
          <span>${escapeHtml(board.meta.location)}</span>
          <h1>${escapeHtml(board.meta.stageLabel || board.meta.title)}</h1>
        </div>
        <nav>
          <a href="./index.html">返回江湖</a>
          <button type="button" data-command="restart">重演此局</button>
        </nav>
      </header>
      <nav class="encounter-switch" aria-label="选择战局">
        ${COMBAT_LAB_ENCOUNTERS.map((entry) => `<button type="button" data-encounter-id="${escapeHtml(entry.id)}" class="${entry.id === board.meta.encounterId ? "current" : ""}" aria-current="${entry.id === board.meta.encounterId ? "page" : "false"}"><span>${escapeHtml(entry.location)}</span><strong>${escapeHtml(entry.title)}</strong></button>`).join("")}
      </nav>
      ${unitRailHtml(board)}
      <div class="scene-art" style="--scene-image:url('${escapeHtml(sceneImage)}')">
        <div class="scene-vignette"></div>
        ${["rain-ambush", "willow-tail"].includes(board.meta.sceneClass) ? '<div class="rain-layer"></div>' : '<div class="mist-layer"></div>'}
        ${visibleTargets.map((unit, index) => {
          const node = targetNode.get(unit.nodeId) || { x: 52 + index * 12, y: 42 + index * 5 };
          const point = unit.id === "wang_zhuo"
            ? board.stage?.id === "willow_tail" ? { x: 88, y: 15 } : { x: 62, y: 15 }
            : TARGET_SCENE_POSITIONS[unit.id] || { x: Math.min(90, Number(node.x) + 8), y: Math.max(12, Number(node.y) - 14) };
          return `<button type="button" class="target-hotspot dynamic-target ${unit.primary || unit.id === board.meta.primaryEnemyId ? "primary-target" : "support-target"} ${selectedTarget === unit.id ? "selected" : ""}" style="--hotspot-x:${Number(point.x)}%;--hotspot-y:${Number(point.y)}%;--hotspot-shift:${index * 9}px" data-target-id="${escapeHtml(unit.id)}" aria-label="选择${escapeHtml(unit.name)}"><span>${escapeHtml(unit.intent)}</span></button>`;
        }).join("")}
        ${environments.map((entry, index) => {
          const node = targetNode.get(entry.nodeId);
          const x = Number(entry.x ?? node?.x ?? 15 + index * 18);
          const y = Math.min(60, Number(entry.y ?? node?.y ?? 55));
          const spent = ["out", "spent", "collapsed", "cut", "used"].includes(entry.state);
          const label = entry.id === "street_lantern" && entry.state === "out" ? "灯灭" : entry.name;
          return `<button type="button" class="environment-hotspot dynamic-environment ${selectedEnvironment === entry.id ? "selected" : ""} ${spent ? "spent" : ""}" style="--environment-x:${x}%;--environment-y:${y}%" data-environment-id="${escapeHtml(entry.id)}" aria-pressed="${selectedEnvironment === entry.id}">${iconSvg(entry.icon || "stance")}<span>${escapeHtml(label)}</span></button>`;
        }).join("")}
        <div class="intent-thread">
          <span>${session.turn.phase === "enemy" ? "正在出手" : "敌方预告"}</span>
          <strong>${escapeHtml(targetIntent)}</strong><small>${escapeHtml(targetUnit?.intentDetail || "敌人正在等待你的破绽。")}</small>
          <ol>
            ${board.intent.sequence.slice(0, 3).map((step, index) => `<li class="${index === 0 ? "current" : ""}"><b>${index + 1}</b><span>${escapeHtml(step)}</span></li>`).join("")}
          </ol>
        </div>
        ${positionMapHtml(board)}
        ${effectHtml()}
      </div>
    </section>
  `;
}

function contextActionHtml(entry, index) {
  const unavailable = !entry.evaluation.available;
  const impact = entry.impactPreview || {};
  const damage = impact.success || entry.successPreview || entry.evaluation.reason || "改变战局";
  const forecast = [entry.positionPreview, entry.enemyPhasePreview ? `收势后：${entry.enemyPhasePreview}` : null].filter(Boolean).join(" · ");
  return `
    <button type="button" class="context-action ${riskClass(entry)} ${index === 0 ? "primary" : ""}" data-action-id="${escapeHtml(entry.id)}" ${unavailable || visualState.animating ? "disabled" : ""}>
      <span class="action-icon">${iconSvg(entry.display.icon)}</span>
      <span class="action-copy">
        <strong>${escapeHtml(entry.display.title)} <i class="energy-cost">${"◆".repeat(Number(entry.energyCost || 0))}</i>${entry.qiCost ? `<i class="qi-cost">真气−${Number(entry.qiCost)}</i>` : ""}</strong>
        <small>${escapeHtml(entry.display.consequence)}</small>
        <small class="action-forecast">${escapeHtml(forecast)}</small>
      </span>
      <span class="action-risk">
        <b>${escapeHtml(entry.evaluation.ratingLabel)}</b>
        <small>${escapeHtml(damage)}</small>
      </span>
      <i class="action-arrow">→</i>
    </button>
  `;
}

function allActionHtml(entry) {
  const unavailable = !entry.evaluation.available;
  const icon = entry.icon || (entry.intent === "身位" ? "stance" : entry.objectId === "street_lantern" ? "lantern" : entry.objectId === "pharmacy_wall" ? "escape" : entry.skillId ? "needles" : "blade");
  return `
    <button type="button" class="arsenal-action ${riskClass(entry)}" data-action-id="${escapeHtml(entry.id)}" ${unavailable || visualState.animating ? "disabled" : ""}>
      <span>${iconSvg(icon)}</span>
      <span>
        <small>${escapeHtml(entry.intent)} · ${escapeHtml(entry.objectName)} · ${"◆".repeat(Number(entry.energyCost || 0))}${entry.qiCost ? ` · 真气−${Number(entry.qiCost)}` : ""}</small>
        <strong>${escapeHtml(entry.title)}</strong>
        <p>${escapeHtml(entry.evaluation.available ? entry.positionPreview || entry.successPreview : entry.evaluation.reason)}；${escapeHtml(entry.riskPreview)}；${escapeHtml(entry.enemyPhasePreview || "")}</p>
      </span>
      <b>${escapeHtml(entry.evaluation.available ? entry.evaluation.ratingLabel : "不可用")}</b>
    </button>
  `;
}

function consequenceHtml(result) {
  const consequences = result.consequences;
  if (!consequences) return "";
  const trust = consequences.relationships?.yan_jinghong?.trust;
  if (session.encounterId === "rain_ambush") {
    const assailant = {
      captive: "刀客被生擒",
      corpse: "刀客已死",
      escaped: "刀客脱离追查",
    }[consequences.assailant] || "刀客后果已记录";
    const channel = {
      testimony: "口供与毒囊",
      token: "尸证与鱼鳞铜签",
      rain_trace: "雨中逃踪",
    }[consequences.reportChannel] || "后续线索";
    return `
      <dl class="consequence-grid">
        <div><dt>刀客</dt><dd>${escapeHtml(assailant)}</dd></div>
        <div><dt>所得</dt><dd>${escapeHtml(channel)}</dd></div>
        <div><dt>证据</dt><dd>${Number(consequences.evidence?.length || 0)} 件 · 警戒 ${Number(consequences.alert || 0)}</dd></div>
        <div><dt>伤势</dt><dd>${Number(consequences.wounds?.length || 0)} 处</dd></div>
      </dl>
    `;
  }
  const disposition = {
    captive: "王卓被生擒",
    corpse: "王卓已死",
    tracked: "王卓带标逃走",
    escaped: "王卓脱离追查",
  }[consequences.wangZhuo] || "敌方后果已记录";
  const ally = {
    safe: "燕惊鸿安全",
    engaged: "燕惊鸿仍在战局",
    abandoned: "燕惊鸿被独自留下",
  }[consequences.yanJinghong] || "同伴状态已记录";
  return `
    <dl class="consequence-grid">
      <div><dt>王卓</dt><dd>${escapeHtml(disposition)}</dd></div>
      <div><dt>同伴</dt><dd>${escapeHtml(ally)}${trust == null ? "" : ` · 信任 ${Number(trust)}`}</dd></div>
      <div><dt>证据</dt><dd>${Number(consequences.evidence?.length || 0)} 件 · 警戒 ${Number(consequences.alert || 0)}</dd></div>
      <div><dt>余患</dt><dd>${consequences.poison === "active" ? "蛇毒未清" : "无持续蛇毒"} · ${Number(consequences.wounds?.length || 0)} 处伤势</dd></div>
    </dl>
  `;
}

function outcomeHtml(board) {
  const result = session.result;
  if (!result) return "";
  if (result.outcome === "death") {
    return `
      <section class="outcome-panel death">
        <span>${escapeHtml(OUTCOME_LABELS.death)}</span>
        <strong>${escapeHtml(result.cause)}</strong>
        <p>${escapeHtml(result.memory || "疼痛不会随回照消失。")}</p>
        ${session.lives > 0
          ? '<button type="button" data-command="rewind">循残灯回到战斗开始前</button>'
          : '<button type="button" data-command="restart">重整命盘，再入此战</button>'}
      </section>
    `;
  }
  return `
    <section class="outcome-panel victory">
      <span>${escapeHtml(OUTCOME_LABELS[result.outcome])}</span>
      <strong>${escapeHtml(result.text)}</strong>
      <p>${escapeHtml(EDGE_LABELS[result.edge] || "伤势、关系、证据与敌方警戒已经写入战后结果。")}</p>
      ${consequenceHtml(result)}
      ${board.meta.encounterId === "rain_ambush" ? '<button type="button" data-command="continue-campaign">带着当前结果赶往柳巷</button>' : ""}
      <button type="button" data-command="restart">按当前命盘重开此局</button>
    </section>
  `;
}

function settingsHtml() {
  if (!debugToolsVisible) return "";
  const needle = session.setup.skills?.spring_rain_needles || { stage: "known" };
  const dangerFact = isWangBattle() ? "wang_chain_blade" : "left_sleeve_blade";
  const knownDanger = session.setup.knownFacts.includes(dangerFact);
  const baseWound = session.setup.wounds[0];
  const hasDeadwoodStake = ["learned", "entered", "skilled", "mastered"]
    .includes(session.setup.skills?.deadwood_stake?.stage);
  const stake = hasDeadwoodStake ? "deadwood" : "sea";
  const trust = Number(session.setup.relationships?.yan_jinghong?.trust ?? 58);
  const seedOptions = isWangBattle()
    ? [["east-lake-0", "平稳水势"], ["east-lake-7", "同伴得势"], ["east-lake-13", "毒刃逼命"], ["east-lake-19", "险中求生"]]
    : [["seed-0", "平稳"], ["seed-2", "上吉"], ["seed-14", "有损"], ["seed-3", "凶险"]];
  if (!seedOptions.some(([value]) => value === session.setup.fateSeed)) {
    seedOptions.unshift([session.setup.fateSeed, "承接前局"]);
  }
  return `
    <details class="fate-settings" ${settingsOpen ? "open" : ""}>
      <summary><span>命盘</span><strong>调整入局条件</strong></summary>
      <div class="setting-body">
        <div class="setting-grid">
          ${Object.entries(ATTRIBUTE_LABELS).map(([id, label]) => `
            <label>
              <span>${escapeHtml(label)} <b>${Number(session.setup.attributes[id] || 0)}</b></span>
              <input type="range" min="0" max="5" step="1" value="${Number(session.setup.attributes[id] || 0)}" data-setting="attribute" data-key="${escapeHtml(id)}" />
            </label>
          `).join("")}
        </div>
        <div class="select-grid">
          <label><span>自身境界</span><select data-setting="stage">
            <option value="mortal" ${session.setup.playerStage === "mortal" ? "selected" : ""}>未入门</option>
            <option value="body" ${session.setup.playerStage === "body" ? "selected" : ""}>锻体</option>
            ${isWangBattle() ? `<option value="qi" ${session.setup.playerStage === "qi" ? "selected" : ""}>聚气</option>` : ""}
          </select></label>
          <label><span>春风化雨针</span><select data-setting="needles">
            <option value="known" ${needle.stage === "known" ? "selected" : ""}>只知招名</option>
            <option value="learned" ${needle.stage === "learned" ? "selected" : ""}>入门</option>
            <option value="skilled" ${needle.stage === "skilled" ? "selected" : ""}>熟练</option>
            <option value="mastered" ${needle.stage === "mastered" ? "selected" : ""}>精通</option>
          </select></label>
          <label><span>固定因果</span><select data-setting="seed">
            ${seedOptions.map(([value, label]) => `<option value="${escapeHtml(value)}" ${session.setup.fateSeed === value ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}
          </select></label>
          <label><span>既有伤势</span><select data-setting="wound">
            <option value="none" ${!baseWound ? "selected" : ""}>无伤</option>
            <option value="leg" ${baseWound?.bodyPart === "leg" ? "selected" : ""}>腿部重伤</option>
            <option value="shoulder" ${baseWound?.bodyPart === "shoulder" ? "selected" : ""}>肩臂重伤</option>
            <option value="torso" ${baseWound?.bodyPart === "torso" ? "selected" : ""}>肋下重伤</option>
          </select></label>
          ${isWangBattle() ? `<label><span>护体桩功</span><select data-setting="stake">
            <option value="sea" ${stake === "sea" ? "selected" : ""}>沧澜定海桩</option>
            <option value="deadwood" ${stake === "deadwood" ? "selected" : ""}>神农枯木桩</option>
          </select></label>
          <label><span>燕惊鸿信任</span><select data-setting="yan-trust">
            <option value="35" ${trust < 45 ? "selected" : ""}>存疑</option>
            <option value="58" ${trust >= 45 && trust < 70 ? "selected" : ""}>互信</option>
            <option value="78" ${trust >= 70 ? "selected" : ""}>托付后背</option>
          </select></label>` : ""}
        </div>
        <label class="fact-toggle">
          <input type="checkbox" data-setting="known-danger" ${knownDanger ? "checked" : ""} />
          <span><strong>带着死中见闻入场</strong><small>${isWangBattle() ? "提前知道王卓正手是引线，真正杀招从袖底回链。" : "提前知道右手是诱饵，真正杀招藏在左袖。"}</small></span>
        </label>
        ${isWangBattle() ? `<label class="fact-toggle"><input type="checkbox" data-setting="antidote" ${Number(session.setup.items?.antidote || 0) > 0 ? "checked" : ""} /><span><strong>携带一份解毒散</strong><small>中毒后可耗费一点行动，移除持续蛇毒。</small></span></label>` : ""}
        <button type="button" class="reset-fate" data-command="reset-defaults">恢复此战默认命盘</button>
      </div>
    </details>
  `;
}

function historyHtml(board) {
  if (!session.history.length) return "";
  return `
    <details class="battle-history">
      <summary>${escapeHtml(board.meta.historyLabel || "战斗行录")} <span>${session.history.length}</span></summary>
      <ol>
        ${session.history.map((entry) => `
          <li>
            <span>${entry.round ? `第${Number(entry.round)}轮${entry.stageRound ? `／幕内${Number(entry.stageRound)}` : ""} · ${entry.phase === "enemy" ? "敌方" : entry.phase === "upkeep" ? "持续" : "我方"}` : entry.phase === "campaign" ? "承接前局" : "回照"}</span>
            <strong>${escapeHtml(entry.intent || "因果回转")}</strong>
            <p>${escapeHtml(entry.text)}</p>
            ${entry.position ? `<small>身位：${escapeHtml(entry.position)}${entry.energyCost ? ` · 行动 −${Number(entry.energyCost)}` : ""}</small>` : ""}
            ${entry.impact ? `<small>气血：你 −${Number(entry.impact.playerDamage || 0)}，敌方 −${Number(entry.impact.enemyDamage || 0)}</small>` : ""}
            ${entry.check ? `<small>骰面 ${Number(entry.check.roll)} ${escapeHtml(signed(entry.check.modifier))} = ${Number(entry.check.total)} · ${escapeHtml(entry.check.tierLabel)}</small>` : ""}
          </li>
        `).join("")}
      </ol>
    </details>
  `;
}

function turnBarHtml(board) {
  const playerPhase = session.turn.phase === "player";
  const currentEnemy = session.turn.enemyQueue[session.turn.enemyCursor];
  const currentUnit = currentEnemy ? board.units.find((unit) => unit.id === currentEnemy.unitId) : null;
  return `
    <div class="turn-bar ${playerPhase ? "player-turn" : "enemy-turn"}" data-phase="${escapeHtml(session.turn.phase)}" data-round="${Number(session.turn.round)}" data-energy="${Number(session.turn.energy)}">
      <div class="turn-label"><span>第${Number(session.turn.round)}轮</span><strong>${playerPhase ? "我方行动" : "敌方行动"}</strong></div>
      <div class="energy-pool" aria-label="本轮行动 ${Number(session.turn.energy)} / ${Number(session.turn.maxEnergy)}">
        <span>行动</span>
        ${Array.from({ length: session.turn.maxEnergy }, (_, index) => `<i class="${index < session.turn.energy ? "filled" : ""}">◆</i>`).join("")}
        ${board.combat.maxQi ? `<b class="qi-pool">真气 ${Number(board.combat.qi)}/${Number(board.combat.maxQi)}</b>` : ""}
        <b class="guard-pool">防御 ${Number(board.combat.defense)} · 减伤 ${Number(board.combat.reduction)}</b>
      </div>
      ${playerPhase
        ? `<button type="button" data-command="end-turn" ${visualState.animating ? "disabled" : ""}>收势迎敌${board.intent.threat ? ` · 预计−${Number(board.intent.threat)}` : ""}</button>`
        : `<span class="enemy-now">${currentUnit ? `${escapeHtml(currentUnit.name)} · ${escapeHtml(currentEnemy.label)}` : "敌招结算"}</span>`}
    </div>
  `;
}

function enemyPhaseHtml(board) {
  const cursor = session.turn.enemyCursor;
  return `
    <div class="enemy-phase-panel">
      <span>敌方依次出手</span>
      <strong>${escapeHtml(session.turn.enemyQueue[cursor]?.label || "雨势暂歇")}</strong>
      <ol>
        ${session.turn.enemyQueue.map((intent, index) => {
          const unit = board.units.find((entry) => entry.id === intent.unitId);
          const state = index < cursor ? "done" : index === cursor ? "current" : "pending";
          return `<li class="${state}"><b>${Number(intent.order)}</b><span>${escapeHtml(unit?.name || "敌人")}<small>${escapeHtml(intent.label)} · ${escapeHtml(intent.detail)}</small></span></li>`;
        }).join("")}
      </ol>
    </div>
  `;
}

function allyPanelHtml(board) {
  if (!board.allies?.length) return "";
  return `
    <div class="ally-rail" aria-label="同行之人">
      ${board.allies.map((ally) => {
        const trust = board.ledger?.relationships?.[ally.id]?.trust;
        const safe = board.conditions?.allySafe;
        const guarded = board.conditions?.allyGuard;
        const active = ally.active !== false && !ally.defeated;
        const nodeName = board.nodes.find((node) => node.id === (ally.nodeId || board.positions?.[ally.id]))?.shortName || "战场外";
        const state = safe ? "已脱离威胁" : guarded ? "处于保护中" : active ? "可响应协作" : "暂未参战";
        return `<button type="button" class="ally-card ${selectedContext === `ally:${ally.id}` ? "selected" : ""}" data-focus-id="ally:${escapeHtml(ally.id)}" aria-pressed="${selectedContext === `ally:${ally.id}`}">
          <span class="ally-mark">${iconSvg(ally.icon || "ally")}</span>
          <span><small>同行 · ${escapeHtml(nodeName)}</small><strong>${escapeHtml(ally.name)}</strong><em>${escapeHtml(state)}${trust == null ? "" : ` · 信任 ${Number(trust)}`}</em></span>
          ${ally.max ? `<b>${Number(ally.current)}<i>/</i>${Number(ally.max)}</b>` : ""}
        </button>`;
      }).join("")}
    </div>
  `;
}

function battleStateHtml(board) {
  const entries = [];
  for (const status of board.statuses || []) {
    entries.push({ id: `status:${status.id}`, icon: status.id === "snake_venom" ? "healing" : "stance", title: status.label || status.id, detail: status.duration == null ? "持续生效" : `余 ${Number(status.duration)} 轮` , danger: status.tickDamage > 0 });
  }
  for (const wound of board.wounds || []) {
    const fatal = Number(wound.severity || 0) >= 3 && !wound.stabilized;
    entries.push({ id: fatal ? "status:fatal_wound" : `wound:${wound.id}`, icon: fatal ? "healing" : "guard", title: woundLabel(wound), detail: fatal ? `止血期限 ${Number(wound.countdown ?? 1)} 轮` : wound.stabilized ? "已稳定" : "影响判定", danger: fatal });
  }
  if (Number(board.ledger?.alert || 0) > 0) entries.push({ id: null, icon: "eye", title: `敌方警戒 ${Number(board.ledger.alert)}`, detail: "会促使增援提前", danger: Number(board.ledger.alert) >= 2 });
  if (board.ledger?.evidence?.length) entries.push({ id: null, icon: "bag", title: `证据 ${board.ledger.evidence.length} 件`, detail: "战后保留", danger: false });
  if (!entries.length) return "";
  return `<div class="battle-state-strip" aria-label="当前状态">${entries.map((entry) => {
    const content = `${iconSvg(entry.icon)}<span><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.detail)}</small></span>`;
    return entry.id
      ? `<button type="button" class="state-chip ${entry.danger ? "danger" : ""} ${selectedContext === entry.id ? "selected" : ""}" data-focus-id="${escapeHtml(entry.id)}" aria-pressed="${selectedContext === entry.id}">${content}</button>`
      : `<span class="state-chip ${entry.danger ? "danger" : ""}">${content}</span>`;
  }).join("")}</div>`;
}

function pursuitStatusHtml(board) {
  if (board.meta.presentation !== "pursuit" || !board.pursuit) return "";
  const identity = Math.min(board.pursuit.identityGoal, board.pursuit.identityProgress);
  return `
    <div class="pursuit-status" aria-label="尾随进展">
      <div><span>身份线索</span><strong>${identity}<i>/</i>${board.pursuit.identityGoal}</strong><small>${identity >= board.pursuit.identityGoal ? "已经看清来者身份" : "继续观察步法、暗号或兵刃"}</small></div>
      <div><span>同行去向</span><strong>${board.pursuit.allySafe ? "已脱身" : "仍在视线"}</strong><small>${board.pursuit.allySafe ? "燕惊鸿已离开尾随者视野" : "必须先替燕惊鸿断开追踪"}</small></div>
      <div><span>对方警觉</span><strong>${board.pursuit.alert}</strong><small>${board.pursuit.tailPressure > 1 ? "尾随者正在逼近" : "尚未确认你已察觉"}</small></div>
    </div>
  `;
}

function commandDeckHtml(board) {
  const previous = visualState.previousVitality;
  const currentFocus = focusId();
  const recommendations = getCombatLabRecommendations(session, currentFocus);
  const allActions = getCombatLabActions(session);
  const environment = selectedEnvironment ? environmentDetails(board.environment.find((entry) => entry.id === selectedEnvironment)) : null;
  const target = board.units.find((entry) => entry.id === selectedTarget) || board.units[0];
  const wounds = board.wounds?.length ? board.wounds.map(woundLabel).join(" · ") : "无伤";
  const memory = factMemory(board) || (board.conditions.observedFeint ? { title: "左袖藏刃", detail: "真正杀招已经被看破。" } : null);
  const position = selectedPosition ? board.nodes.find((node) => node.id === selectedPosition) : null;
  const allyId = selectedContext?.startsWith("ally:") ? selectedContext.slice(5) : null;
  const ally = board.allies?.find((entry) => entry.id === allyId);
  const statusId = selectedContext?.startsWith("status:") ? selectedContext.slice(7) : null;
  const status = board.statuses?.find((entry) => entry.id === statusId);
  const fatalWound = statusId === "fatal_wound";
  const contextTitle = position
    ? `移向${position.shortName}`
    : environment?.panelTitle
      || (ally ? `与${ally.name}协作` : status ? `处理${status.label}` : fatalWound ? "稳定致命伤" : `应对${target?.name || "眼前敌势"}`);
  const contextHint = environment?.hint
    || (ally ? "同伴每轮只响应一次明确协作，信任会决定她是否把后背交给你。" : status ? "持续状态会在敌方阶段后结算，拖延本身就是代价。" : fatalWound ? "致命伤若未在倒计时结束前稳定，会直接导致死亡。" : `${target?.name || "敌人"}位于${target?.nodeName || "战场"}；先读意图，再决定强攻、借势、护人或撤离。`);
  const contextLabel = position ? `身位：${position.shortName}` : selectedEnvironment ? `环境：${environment?.name}` : ally ? "同伴协作" : status || fatalWound ? "紧急状态" : "当前交锋";
  return `
    <section class="command-deck" data-encounter="${escapeHtml(board.meta.encounterId)}">
      <div class="player-panel">
        ${hpBarHtml({
          label: `${board.meta.playerName || "陈司命"} · ${STAGE_LABELS[board.meta.playerStageId] || board.meta.playerStageId}`,
          vitality: board.vitality.player,
          side: "player",
          portrait: "./assets/combat/portrait-chen-siming.webp",
          previous: previous?.player,
        })}
        <div class="battle-objective">
          <span>此战所求</span>
          <strong>${escapeHtml(board.objective)}</strong>
          <small>你在${escapeHtml(board.playerNode?.shortName || "战场")}${target ? ` · 关注${escapeHtml(target.name)}在${escapeHtml(target.nodeName)} · ${escapeHtml(target.distance)}` : ""} · ${escapeHtml(wounds)}</small>
        </div>
        ${allyPanelHtml(board)}
        ${pursuitStatusHtml(board)}
        ${battleStateHtml(board)}
        ${memory ? `<div class="battle-memory"><span>因果见闻</span><strong>${escapeHtml(memory.title)}</strong><small>${escapeHtml(memory.detail)}</small></div>` : ""}
        ${turnBarHtml(board)}
      </div>
      ${outcomeHtml(board)}
      ${session.status === "fighting" && session.turn.phase === "player" ? `
        <div class="context-heading">
          <span>${escapeHtml(contextLabel)}</span>
          <strong>${escapeHtml(contextTitle)}</strong>
          <p>${escapeHtml(position ? `从${board.playerNode?.shortName || "当前身位"}出发；移动、出招与环境行动共用三点行动。` : contextHint)}</p>
        </div>
        <div class="recommended-actions">
          ${recommendations.map(contextActionHtml).join("")}
        </div>
        <p class="causal-note">相同战况下因果不变；改变身位、伤势或已知破绽，结果才会改变。</p>
        <button type="button" class="open-arsenal" data-command="toggle-arsenal" aria-expanded="${arsenalOpen}">
          <span>${iconSvg("blade")}${iconSvg("stance")}${iconSvg("bag")}${iconSvg("escape")}</span>
          <strong>全部手段 <b>${allActions.length}</b></strong>
          <i>→</i>
        </button>
      ` : session.status === "fighting" ? enemyPhaseHtml(board) : ""}
      ${settingsHtml()}
      ${historyHtml(board)}
      <div class="life-strip"><span>命灯</span><strong>${"●".repeat(session.lives)}${"○".repeat(2 - session.lives)}</strong></div>
    </section>
    <aside class="arsenal-sheet ${arsenalOpen ? "open" : ""}" aria-hidden="${!arsenalOpen}">
      <button type="button" class="sheet-backdrop" data-command="toggle-arsenal" aria-label="收起全部手段" tabindex="-1"></button>
      <section role="dialog" aria-modal="true" aria-label="全部手段" tabindex="-1">
        <header>
          <div><span>全部手段</span><strong>从招式、身法、环境与退路中择一</strong></div>
          <button type="button" data-command="toggle-arsenal" aria-label="收起">${iconSvg("close")}</button>
        </header>
        <div class="arsenal-list">${allActions.map(allActionHtml).join("")}</div>
      </section>
    </aside>
  `;
}

function render() {
  const board = getCombatLabBattleBoard(session);
  const currentTarget = board.units.find((unit) => unit.id === selectedTarget);
  if (!currentTarget || currentTarget.defeated || currentTarget.active === false) selectedTarget = defaultTarget(board);
  if (selectedEnvironment && !board.environment.some((entry) => entry.id === selectedEnvironment)) selectedEnvironment = null;
  if (selectedPosition && !board.nodes.some((entry) => entry.id === selectedPosition)) selectedPosition = null;
  root.classList.remove("hp-settled");
  root.innerHTML = `
    <main class="combat-shell ${visualState.animating ? "fx-active" : ""} ${session.turn.phase === "enemy" ? "resolving-enemy-turn" : "resolving-player-turn"}">
      ${sceneHtml(board)}
      ${commandDeckHtml(board)}
    </main>
  `;
  if (visualState.animating) {
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("hp-settled")));
  }
}

function resetInterface() {
  selectedEnvironment = null;
  selectedTarget = defaultTarget();
  selectedPosition = null;
  selectedContext = null;
  arsenalOpen = false;
  visualState = { animating: false, previousVitality: null, effect: null, enemyUnitId: null };
  if (effectTimer) clearTimeout(effectTimer);
}

function setArsenalOpen(open) {
  arsenalOpen = open;
  render();
  queueMicrotask(() => {
    const target = open ? root.querySelector(".arsenal-sheet > section") : root.querySelector(".open-arsenal");
    target?.focus();
  });
}

function startResolvedEffect(resolved, previousVitality, knownBefore, actionId, onDone = null) {
  const result = resolved.result;
  const knownAfter = Number(result.battle.knownFacts?.length || 0) + (result.battle.observedFeint ? 1 : 0);
  const impact = result.impact || {};
  const status = result.outcome === "death"
    ? "死局"
    : result.outcome === "subdued"
      ? "制伏"
      : result.outcome === "killed"
        ? "取命"
        : knownAfter > knownBefore
          ? "破绽"
          : actionId === "extinguish"
            ? "灯灭"
            : "";
  visualState = {
    animating: true,
    previousVitality,
    enemyUnitId: null,
    effect: {
      actionId,
      playerDamage: Number(impact.playerDamage || 0),
      enemyDamage: Number(impact.enemyDamage || 0),
      outcome: result.outcome,
      status,
    },
  };
  announce(result.text || result.battle.lastResult);
  render();
  effectTimer = setTimeout(() => {
    visualState = { animating: false, previousVitality: null, effect: null, enemyUnitId: null };
    render();
    if (onDone) onDone();
  }, motionDuration(760));
}

function resolveNextEnemyAction() {
  if (session.status !== "fighting" || session.turn.phase !== "enemy") {
    visualState = { animating: false, previousVitality: null, effect: null, enemyUnitId: null };
    render();
    return;
  }
  const before = getCombatLabBattleBoard(session);
  const resolved = resolveCombatLabEnemyAction(session);
  if (!resolved.available) return;
  session = resolved.session;
  if (resolved.completed) {
    visualState = { animating: false, previousVitality: null, effect: null, enemyUnitId: null };
    render();
    announce(session.result?.text || "敌方行动已经结束。");
    return;
  }
  visualState = {
    animating: true,
    previousVitality: before.vitality,
    enemyUnitId: resolved.action.unitId,
    effect: {
      actionId: resolved.action.id,
      enemyPhase: true,
      playerDamage: Number(resolved.impact?.playerDamage || 0),
      enemyDamage: 0,
      outcome: session.status === "death" ? "death" : "enemy-action",
      status: resolved.action.label,
    },
  };
  announce(resolved.text);
  render();
  effectTimer = setTimeout(() => {
    visualState = { animating: false, previousVitality: null, effect: null, enemyUnitId: null };
    if (session.status === "death") render();
    else resolveNextEnemyAction();
  }, motionDuration(720));
}

function startEnemyTurn() {
  if (visualState.animating || session.status !== "fighting" || session.turn.phase !== "player") return;
  const ended = endCombatLabPlayerTurn(session);
  if (!ended.available) return;
  session = ended.session;
  arsenalOpen = false;
  selectedPosition = null;
  visualState = { animating: false, previousVitality: null, effect: null, enemyUnitId: null };
  render();
  effectTimer = setTimeout(resolveNextEnemyAction, motionDuration(360));
}

function performAction(actionId) {
  if (visualState.animating || session.turn.phase !== "player") return;
  const before = getCombatLabBattleBoard(session);
  const knownBefore = Number(session.battle.knownFacts?.length || 0) + (session.battle.observedFeint ? 1 : 0);
  const resolved = resolveCombatLabAction(session, actionId);
  if (!resolved.available) return;
  session = resolved.session;
  arsenalOpen = false;
  selectedContext = null;
  if (actionId === "extinguish") selectedEnvironment = "street_lantern";
  if (actionId.startsWith("move_")) selectedPosition = resolved.session.positions.player;
  startResolvedEffect(resolved, before.vitality, knownBefore, actionId, () => {
    if (session.status === "fighting" && session.turn.energy === 0) startEnemyTurn();
  });
}

function updateSetup(patch, focusSelector = null) {
  settingsOpen = root.querySelector(".fate-settings")?.open ?? settingsOpen;
  session = restartCombatLab(session, patch);
  resetInterface();
  render();
  if (focusSelector) queueMicrotask(() => root.querySelector(focusSelector)?.focus());
}

root.addEventListener("toggle", (event) => {
  if (event.target.matches(".fate-settings")) settingsOpen = event.target.open;
}, true);

root.addEventListener("click", (event) => {
  const encounterButton = event.target.closest("[data-encounter-id]");
  if (encounterButton) {
    const encounterId = encounterButton.dataset.encounterId;
    session = encounterId === "rain_ambush"
      ? createCombatLabSession(COMBAT_LAB_DEFAULTS)
      : createCombatLabSession({ encounterId });
    resetInterface();
    announce(`${COMBAT_LAB_ENCOUNTERS.find((entry) => entry.id === encounterId)?.title || "战局"}已经展开。`);
    render();
    return;
  }

  const focusButton = event.target.closest("[data-focus-id]");
  if (focusButton) {
    selectedContext = selectedContext === focusButton.dataset.focusId ? null : focusButton.dataset.focusId;
    selectedEnvironment = null;
    selectedPosition = null;
    arsenalOpen = false;
    render();
    return;
  }

  const positionButton = event.target.closest("[data-position-id]");
  if (positionButton) {
    selectedPosition = selectedPosition === positionButton.dataset.positionId ? null : positionButton.dataset.positionId;
    selectedEnvironment = null;
    selectedContext = null;
    arsenalOpen = false;
    render();
    return;
  }

  const environmentButton = event.target.closest("[data-environment-id]");
  if (environmentButton) {
    const id = environmentButton.dataset.environmentId;
    selectedEnvironment = selectedEnvironment === id ? null : id;
    selectedPosition = null;
    selectedContext = null;
    arsenalOpen = false;
    render();
    return;
  }

  const targetButton = event.target.closest("[data-target-id]");
  if (targetButton) {
    selectedTarget = targetButton.dataset.targetId;
    selectedEnvironment = null;
    selectedPosition = null;
    selectedContext = null;
    arsenalOpen = false;
    render();
    return;
  }

  const action = event.target.closest("[data-action-id]");
  if (action) {
    performAction(action.dataset.actionId);
    return;
  }

  const command = event.target.closest("[data-command]")?.dataset.command;
  if (!command) return;
  if (command === "toggle-arsenal") {
    setArsenalOpen(!arsenalOpen);
    return;
  }
  if (command === "end-turn") {
    startEnemyTurn();
    return;
  }
  if (command === "rewind") {
    const rewound = rewindCombatLabDeath(session);
    if (rewound.available) {
      session = rewound.session;
      resetInterface();
      announce("命灯回照完成，死中见闻仍在。");
    }
  }
  if (command === "continue-campaign") {
    const advanced = advanceCombatLabCampaign(session);
    if (advanced.available) {
      session = advanced.session;
      resetInterface();
      announce("雨巷留下的伤势、证据与警戒已经带入柳巷。 ");
    }
  }
  if (command === "restart") {
    session = restartCombatLab(session);
    resetInterface();
  }
  if (command === "reset-defaults") {
    session = createCombatLabSession(session.encounterId === "rain_ambush"
      ? COMBAT_LAB_DEFAULTS
      : { encounterId: session.encounterId });
    resetInterface();
  }
  render();
});

root.addEventListener("input", (event) => {
  const setting = event.target.dataset.setting;
  if (setting !== "attribute") return;
  const value = event.target.closest("label")?.querySelector("span b");
  if (value) value.textContent = event.target.value;
});

root.addEventListener("change", (event) => {
  const setting = event.target.dataset.setting;
  const focusSelector = setting === "attribute"
    ? `[data-setting="attribute"][data-key="${event.target.dataset.key}"]`
    : `[data-setting="${setting}"]`;
  if (setting === "attribute") updateSetup({ attributes: { [event.target.dataset.key]: Number(event.target.value) } }, focusSelector);
  if (setting === "stage") updateSetup({ playerStage: event.target.value }, focusSelector);
  if (setting === "seed") updateSetup({ fateSeed: event.target.value }, focusSelector);
  if (setting === "needles") {
    const stage = event.target.value;
    const progress = { known: 0, learned: 20, skilled: 60, mastered: 100 }[stage];
    updateSetup({ skills: { spring_rain_needles: { stage, progress } } }, focusSelector);
  }
  if (setting === "stake") {
    const value = event.target.value;
    updateSetup({
      skills: {
        sea_stilling_stake: { stage: value === "deadwood" ? "known" : "learned", progress: value === "deadwood" ? 0 : 20 },
        deadwood_stake: { stage: value === "sea" ? "known" : "learned", progress: value === "sea" ? 0 : 20 },
      },
    }, focusSelector);
  }
  if (setting === "yan-trust") {
    updateSetup({ relationships: { yan_jinghong: { ...(session.setup.relationships?.yan_jinghong || {}), trust: Number(event.target.value) } } }, focusSelector);
  }
  if (setting === "wound") {
    const bodyPart = event.target.value;
    updateSetup({
      wounds: bodyPart === "none"
        ? []
        : [{ id: `existing_${bodyPart}_wound`, type: "cut", bodyPart, severity: 2, tags: ["existing"] }],
    }, focusSelector);
  }
  if (setting === "known-danger") {
    const factId = isWangBattle() ? "wang_chain_blade" : "left_sleeve_blade";
    const retained = session.setup.knownFacts.filter((entry) => entry !== factId);
    updateSetup({ knownFacts: event.target.checked ? [...retained, factId] : retained }, focusSelector);
  }
  if (setting === "antidote") {
    updateSetup({ items: { ...(session.setup.items || {}), antidote: event.target.checked ? 1 : 0 } }, focusSelector);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target.matches("input, select, textarea")) return;
  if (event.key === "Tab" && arsenalOpen) {
    const focusable = [root.querySelector(".arsenal-sheet.open > section"), ...root.querySelectorAll(".arsenal-sheet.open > section button:not(:disabled)")].filter(Boolean);
    if (!focusable.length) return;
    const current = focusable.indexOf(document.activeElement);
    const next = event.shiftKey
      ? current <= 0 ? focusable.length - 1 : current - 1
      : current === focusable.length - 1 ? 0 : current + 1;
    event.preventDefault();
    focusable[next].focus();
    return;
  }
  if (event.key === "Escape" && arsenalOpen) {
    setArsenalOpen(false);
    return;
  }
  if (session.turn.phase !== "player" || visualState.animating) return;
  const index = Number(event.key) - 1;
  if (index < 0) return;
  const actions = arsenalOpen
    ? getCombatLabActions(session)
    : getCombatLabRecommendations(session, focusId());
  if (index >= actions.length) return;
  performAction(actions[index].id);
});

render();
