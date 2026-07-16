import {
  COMBAT_LAB_DEFAULTS,
  createCombatLabSession,
  getCombatLabActions,
  getCombatLabBattleBoard,
  getCombatLabRecommendations,
  restartCombatLab,
  resolveCombatLabAction,
  rewindCombatLabDeath,
} from "./combat-lab-core.mjs?v=20260716.5";

const root = document.querySelector("#combat-lab");

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

const OUTCOME_LABELS = {
  subdued: "留下活口",
  killed: "针下取命",
  escaped: "脱身离去",
  death: "命灯碎裂",
};

const EDGE_LABELS = {
  intact_captive: "活口与口供完整",
  intact_token: "左袖凭证无损",
  unseen_exit: "退路未被看破",
  bloodied_finish: "带伤结束",
};

let session = createCombatLabSession();
let selectedEnvironment = null;
let selectedTarget = "night_assailant";
let arsenalOpen = false;
let visualState = {
  animating: false,
  previousVitality: null,
  effect: null,
};
let effectTimer = null;

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

function rangeLabel(range) {
  return range === "close" ? "贴身" : range === "far" ? "远离" : "适中";
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
        const percent = clampPercent(unit.current, unit.max);
        const previousEnemy = unit.id === "night_assailant" ? visualState.previousVitality?.enemy : null;
        const lagPercent = clampPercent(previousEnemy?.current ?? unit.current, previousEnemy?.max ?? unit.max);
        const selected = selectedTarget === unit.id;
        const icon = unit.id === "roof_crossbow" ? "bow" : unit.id === "black_leader" ? "command" : "blade";
        return `
          <button type="button" class="enemy-unit ${selected ? "selected" : ""} ${unit.active ? "active" : "support"}" data-target-id="${escapeHtml(unit.id)}" aria-pressed="${selected}">
            <span class="unit-portrait"><img src="${escapeHtml(unit.portrait)}" alt="" />${iconSvg(icon)}</span>
            <span class="unit-copy">
              <span><strong>${escapeHtml(unit.name)}</strong><b>${Number(unit.current)}<i>/</i>${Number(unit.max)}</b></span>
              <span class="unit-hp" style="--unit-hp-current:${percent}%;--unit-hp-lag:${Math.max(percent, lagPercent)}%" role="meter" aria-label="${escapeHtml(`${unit.name}气血`)}" aria-valuemin="0" aria-valuemax="${Number(unit.max)}" aria-valuenow="${Number(unit.current)}">
                <i class="unit-hp-lag"></i>
                <i class="unit-hp-current"></i>
              </span>
              <small>${escapeHtml(unit.intent)}</small>
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
  if (effect.actionId === "needle_wrist") fragments.push('<i class="needle-flight"></i><i class="impact-spark"></i>');
  if (effect.actionId === "extinguish") fragments.push('<i class="lantern-flare"></i>');
  return `<div class="combat-effects ${escapeHtml(effect.outcome || "")}" aria-hidden="true">${fragments.join("")}</div>`;
}

function sceneHtml(board) {
  const battle = session.battle;
  const knownSleeve = battle.knownFacts.includes("left_sleeve_blade") || battle.observedFeint;
  const lantern = board.environment.find((entry) => entry.id === "street_lantern");
  const targetIntent = board.units.find((entry) => entry.id === selectedTarget)?.intent || battle.enemyIntent;
  return `
    <section class="battle-stage ${battle.darkness ? "darkened" : ""} ${session.status !== "fighting" ? "settled" : ""}">
      <header class="stage-heading">
        <div>
          <span>金陵 · 雨巷</span>
          <h1>东门伏杀</h1>
        </div>
        <nav>
          <a href="./index.html">返回江湖</a>
          <button type="button" data-command="restart">重演此局</button>
        </nav>
      </header>
      ${unitRailHtml(board)}
      <div class="scene-art">
        <div class="scene-vignette"></div>
        <div class="rain-layer"></div>
        <button type="button" class="target-hotspot blade-target ${selectedTarget === "night_assailant" ? "selected" : ""}" data-target-id="night_assailant" aria-label="选择蒙面刀客">
          <span>${knownSleeve ? "左袖藏刃" : "逼近试探"}</span>
        </button>
        <button type="button" class="target-hotspot crossbow-target ${selectedTarget === "roof_crossbow" ? "selected" : ""}" data-target-id="roof_crossbow" aria-label="选择屋脊弩手">
          <span>${battle.darkness ? "失去视线" : "瞄准"}</span>
        </button>
        <button type="button" class="target-hotspot leader-target ${selectedTarget === "black_leader" ? "selected" : ""}" data-target-id="black_leader" aria-label="选择黑衣头目">
          <span>蓄势</span>
        </button>
        <button type="button" class="environment-hotspot lantern-spot ${selectedEnvironment === "street_lantern" ? "selected" : ""} ${lantern?.state === "out" ? "spent" : ""}" data-environment-id="street_lantern" aria-pressed="${selectedEnvironment === "street_lantern"}">
          ${iconSvg("lantern")}<span>${lantern?.state === "out" ? "灯灭" : "灯笼"}</span>
        </button>
        <button type="button" class="environment-hotspot pillar-spot ${selectedEnvironment === "eave_pillar" ? "selected" : ""}" data-environment-id="eave_pillar" aria-pressed="${selectedEnvironment === "eave_pillar"}">
          <span>檐柱</span>
        </button>
        <button type="button" class="environment-hotspot wall-spot ${selectedEnvironment === "pharmacy_wall" ? "selected" : ""}" data-environment-id="pharmacy_wall" aria-pressed="${selectedEnvironment === "pharmacy_wall"}">
          <span>矮墙</span>
        </button>
        <div class="intent-thread">
          <span>敌招</span>
          <strong>${escapeHtml(targetIntent)}</strong>
          <ol>
            ${board.intent.sequence.map((step, index) => `<li class="${index === 0 ? "current" : ""}"><b>${index + 1}</b>${escapeHtml(step)}</li>`).join("")}
          </ol>
        </div>
        ${effectHtml()}
      </div>
    </section>
  `;
}

function contextActionHtml(entry, index) {
  const unavailable = !entry.evaluation.available;
  const impact = entry.impactPreview;
  const damage = impact.success;
  return `
    <button type="button" class="context-action ${riskClass(entry)} ${index === 0 ? "primary" : ""}" data-action-id="${escapeHtml(entry.id)}" ${unavailable || visualState.animating ? "disabled" : ""}>
      <span class="action-icon">${iconSvg(entry.display.icon)}</span>
      <span class="action-copy">
        <strong>${escapeHtml(entry.display.title)}</strong>
        <small>${escapeHtml(entry.display.consequence)}</small>
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
  return `
    <button type="button" class="arsenal-action ${riskClass(entry)}" data-action-id="${escapeHtml(entry.id)}" ${unavailable || visualState.animating ? "disabled" : ""}>
      <span>${iconSvg(entry.objectId === "street_lantern" ? "lantern" : entry.objectId === "pharmacy_wall" ? "escape" : entry.skillId ? "needles" : "blade")}</span>
      <span>
        <small>${escapeHtml(entry.intent)} · ${escapeHtml(entry.objectName)}</small>
        <strong>${escapeHtml(entry.title)}</strong>
        <p>${escapeHtml(entry.successPreview)}；${escapeHtml(entry.riskPreview)}</p>
      </span>
      <b>${escapeHtml(entry.evaluation.available ? entry.evaluation.ratingLabel : "不可用")}</b>
    </button>
  `;
}

function outcomeHtml() {
  const result = session.result;
  if (!result) return "";
  if (result.outcome === "death") {
    return `
      <section class="outcome-panel death">
        <span>${escapeHtml(OUTCOME_LABELS.death)}</span>
        <strong>${escapeHtml(result.cause)}</strong>
        <p>${escapeHtml(result.memory || "疼痛不会随回照消失。")}</p>
        ${session.lives > 0
          ? '<button type="button" data-command="rewind">循残灯回到刀客现身之前</button>'
          : '<button type="button" data-command="restart">重整命盘，再入雨夜</button>'}
      </section>
    `;
  }
  return `
    <section class="outcome-panel victory">
      <span>${escapeHtml(OUTCOME_LABELS[result.outcome])}</span>
      <strong>${escapeHtml(result.text)}</strong>
      <p>${escapeHtml(EDGE_LABELS[result.edge] || "这一手已经改变雨夜留下的人、物与追查入口。")}</p>
      <button type="button" data-command="restart">按当前命盘重开此局</button>
    </section>
  `;
}

function settingsHtml() {
  const needle = session.setup.skills.spring_rain_needles;
  const knownSleeve = session.setup.knownFacts.includes("left_sleeve_blade");
  const baseWound = session.setup.wounds[0];
  return `
    <details class="fate-settings">
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
          </select></label>
          <label><span>春风化雨针</span><select data-setting="needles">
            <option value="known" ${needle.stage === "known" ? "selected" : ""}>只知招名</option>
            <option value="learned" ${needle.stage === "learned" ? "selected" : ""}>入门</option>
            <option value="skilled" ${needle.stage === "skilled" ? "selected" : ""}>熟练</option>
            <option value="mastered" ${needle.stage === "mastered" ? "selected" : ""}>精通</option>
          </select></label>
          <label><span>固定因果</span><select data-setting="seed">
            <option value="seed-0" ${session.setup.fateSeed === "seed-0" ? "selected" : ""}>平稳</option>
            <option value="seed-2" ${session.setup.fateSeed === "seed-2" ? "selected" : ""}>上吉</option>
            <option value="seed-14" ${session.setup.fateSeed === "seed-14" ? "selected" : ""}>有损</option>
            <option value="seed-3" ${session.setup.fateSeed === "seed-3" ? "selected" : ""}>凶险</option>
          </select></label>
          <label><span>既有伤势</span><select data-setting="wound">
            <option value="none" ${!baseWound ? "selected" : ""}>无伤</option>
            <option value="leg" ${baseWound?.bodyPart === "leg" ? "selected" : ""}>腿部重伤</option>
            <option value="shoulder" ${baseWound?.bodyPart === "shoulder" ? "selected" : ""}>肩臂重伤</option>
            <option value="torso" ${baseWound?.bodyPart === "torso" ? "selected" : ""}>肋下重伤</option>
          </select></label>
        </div>
        <label class="fact-toggle">
          <input type="checkbox" data-setting="known-sleeve" ${knownSleeve ? "checked" : ""} />
          <span><strong>带着死中见闻入场</strong><small>提前知道右手是诱饵，真正杀招藏在左袖。</small></span>
        </label>
      </div>
    </details>
  `;
}

function historyHtml() {
  if (!session.history.length) return "";
  return `
    <details class="battle-history">
      <summary>雨夜行录 <span>${session.history.length}</span></summary>
      <ol>
        ${session.history.map((entry) => `
          <li>
            <span>${entry.round ? `第 ${Number(entry.round)} 手` : "回照"}</span>
            <strong>${escapeHtml(entry.intent || "因果回转")}</strong>
            <p>${escapeHtml(entry.text)}</p>
            ${entry.impact ? `<small>气血：你 −${Number(entry.impact.playerDamage || 0)}，刀客 −${Number(entry.impact.enemyDamage || 0)}</small>` : ""}
            ${entry.check ? `<small>骰面 ${Number(entry.check.roll)} ${escapeHtml(signed(entry.check.modifier))} = ${Number(entry.check.total)} · ${escapeHtml(entry.check.tierLabel)}</small>` : ""}
          </li>
        `).join("")}
      </ol>
    </details>
  `;
}

function commandDeckHtml(board) {
  const previous = visualState.previousVitality;
  const focusId = selectedEnvironment || (selectedTarget === "roof_crossbow" ? "street_lantern" : "default");
  const recommendations = getCombatLabRecommendations(session, focusId);
  const allActions = getCombatLabActions(session);
  const environment = selectedEnvironment ? ENVIRONMENT_COPY[selectedEnvironment] : null;
  const target = board.units.find((entry) => entry.id === selectedTarget) || board.units[0];
  const wounds = session.wounds.length ? session.wounds.map(woundLabel).join(" · ") : "无伤";
  const contextTitle = environment?.panelTitle || (selectedTarget === "night_assailant" ? "应对眼前刀势" : `压制${target.name}`);
  const contextHint = environment?.hint || (selectedTarget === "night_assailant"
    ? "先读敌招，再决定识破、借势、强攻或脱身。"
    : `${target.name}尚未进入贴身交锋；先改变环境或处理挡路刀客。`);
  return `
    <section class="command-deck">
      <div class="player-panel">
        ${hpBarHtml({
          label: `陈司命 · ${STAGE_LABELS[session.setup.playerStage]}`,
          vitality: board.vitality.player,
          side: "player",
          portrait: "./assets/combat/portrait-chen-siming.webp",
          previous: previous?.player,
        })}
        <div class="battle-objective">
          <span>此战所求</span>
          <strong>${escapeHtml(board.objective)}</strong>
          <small>目标：${escapeHtml(target.name)} · ${escapeHtml(rangeLabel(session.battle.range))} · ${escapeHtml(wounds)}</small>
        </div>
      </div>
      ${outcomeHtml()}
      ${session.status === "fighting" ? `
        <div class="context-heading">
          <span>${selectedEnvironment ? `已选：${escapeHtml(environment.name)}` : "当前交锋"}</span>
          <strong>${escapeHtml(contextTitle)}</strong>
          <p>${escapeHtml(contextHint)}</p>
        </div>
        <div class="recommended-actions">
          ${recommendations.map(contextActionHtml).join("")}
        </div>
        <button type="button" class="open-arsenal" data-command="toggle-arsenal" aria-expanded="${arsenalOpen}">
          <span>${iconSvg("blade")}${iconSvg("stance")}${iconSvg("bag")}${iconSvg("escape")}</span>
          <strong>全部手段 <b>${allActions.length}</b></strong>
          <i>→</i>
        </button>
      ` : ""}
      ${settingsHtml()}
      ${historyHtml()}
      <div class="life-strip"><span>命灯</span><strong>${"●".repeat(session.lives)}${"○".repeat(2 - session.lives)}</strong></div>
    </section>
    <aside class="arsenal-sheet ${arsenalOpen ? "open" : ""}" aria-hidden="${!arsenalOpen}">
      <button type="button" class="sheet-backdrop" data-command="toggle-arsenal" aria-label="收起全部手段"></button>
      <section>
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
  root.innerHTML = `
    <main class="combat-shell ${visualState.animating ? "fx-active" : ""}">
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
  selectedTarget = "night_assailant";
  arsenalOpen = false;
  visualState = { animating: false, previousVitality: null, effect: null };
  if (effectTimer) clearTimeout(effectTimer);
}

function startResolvedEffect(resolved, previousVitality, knownBefore) {
  const result = resolved.result;
  const actionId = result.battle.history.at(-1)?.actionId || "";
  const knownAfter = result.battle.knownFacts.includes("left_sleeve_blade") || result.battle.observedFeint;
  const impact = result.impact || {};
  const status = result.outcome === "death"
    ? "死局"
    : result.outcome === "subdued"
      ? "制伏"
      : result.outcome === "killed"
        ? "取命"
        : !knownBefore && knownAfter
          ? "破绽"
          : actionId === "extinguish"
            ? "灯灭"
            : "";
  visualState = {
    animating: true,
    previousVitality,
    effect: {
      actionId,
      playerDamage: Number(impact.playerDamage || 0),
      enemyDamage: Number(impact.enemyDamage || 0),
      outcome: result.outcome,
      status,
    },
  };
  render();
  effectTimer = setTimeout(() => {
    visualState = { animating: false, previousVitality: null, effect: null };
    render();
  }, 900);
}

function performAction(actionId) {
  if (visualState.animating) return;
  const before = getCombatLabBattleBoard(session);
  const knownBefore = session.battle.knownFacts.includes("left_sleeve_blade") || session.battle.observedFeint;
  const resolved = resolveCombatLabAction(session, actionId);
  if (!resolved.available) return;
  session = resolved.session;
  arsenalOpen = false;
  if (actionId === "extinguish") selectedEnvironment = "street_lantern";
  startResolvedEffect(resolved, before.vitality, knownBefore);
}

function updateSetup(patch) {
  session = restartCombatLab(session, patch);
  resetInterface();
  render();
}

root.addEventListener("click", (event) => {
  const environmentButton = event.target.closest("[data-environment-id]");
  if (environmentButton) {
    const id = environmentButton.dataset.environmentId;
    selectedEnvironment = selectedEnvironment === id ? null : id;
    arsenalOpen = false;
    render();
    return;
  }

  const targetButton = event.target.closest("[data-target-id]");
  if (targetButton) {
    selectedTarget = targetButton.dataset.targetId;
    selectedEnvironment = selectedTarget === "roof_crossbow" ? "street_lantern" : null;
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
    arsenalOpen = !arsenalOpen;
    render();
    return;
  }
  if (command === "rewind") {
    const rewound = rewindCombatLabDeath(session);
    if (rewound.available) {
      session = rewound.session;
      resetInterface();
    }
  }
  if (command === "restart") {
    session = restartCombatLab(session);
    resetInterface();
  }
  if (command === "reset-defaults") {
    session = createCombatLabSession(COMBAT_LAB_DEFAULTS);
    resetInterface();
  }
  render();
});

root.addEventListener("input", (event) => {
  const setting = event.target.dataset.setting;
  if (setting !== "attribute") return;
  updateSetup({
    attributes: {
      [event.target.dataset.key]: Number(event.target.value),
    },
  });
});

root.addEventListener("change", (event) => {
  const setting = event.target.dataset.setting;
  if (setting === "stage") updateSetup({ playerStage: event.target.value });
  if (setting === "seed") updateSetup({ fateSeed: event.target.value });
  if (setting === "needles") {
    const stage = event.target.value;
    const progress = { known: 0, learned: 20, skilled: 60, mastered: 100 }[stage];
    updateSetup({ skills: { spring_rain_needles: { stage, progress } } });
  }
  if (setting === "wound") {
    const bodyPart = event.target.value;
    updateSetup({
      wounds: bodyPart === "none"
        ? []
        : [{ id: `existing_${bodyPart}_wound`, type: "cut", bodyPart, severity: 2, tags: ["existing"] }],
    });
  }
  if (setting === "known-sleeve") {
    updateSetup({ knownFacts: event.target.checked ? ["left_sleeve_blade"] : [] });
  }
});

document.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target.matches("input, select, textarea")) return;
  if (event.key === "Escape" && arsenalOpen) {
    arsenalOpen = false;
    render();
    return;
  }
  const index = Number(event.key) - 1;
  if (index < 0) return;
  const actions = arsenalOpen
    ? getCombatLabActions(session)
    : getCombatLabRecommendations(session, selectedEnvironment || "default");
  if (index >= actions.length) return;
  performAction(actions[index].id);
});

render();
