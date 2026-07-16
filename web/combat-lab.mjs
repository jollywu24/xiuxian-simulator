import {
  COMBAT_LAB_DEFAULTS,
  createCombatLabSession,
  getCombatLabActions,
  restartCombatLab,
  resolveCombatLabAction,
  rewindCombatLabDeath,
} from "./combat-lab-core.mjs";

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

const OUTCOME_LABELS = {
  subdued: "留得活口",
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
let settingsExpanded = window.innerWidth > 880;

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

function checkHtml(check, text = "") {
  if (!check) return text ? `<div class="result-strip"><span>战果</span><strong>${escapeHtml(text)}</strong></div>` : "";
  return `
    <div class="check-board ${escapeHtml(check.tier)}">
      <span>因果骰 · ${escapeHtml(check.tierLabel)}</span>
      <div class="check-numbers">
        <b>${Number(check.roll)}</b>
        <i>${escapeHtml(signed(check.modifier))}</i>
        <em>${Number(check.total)}</em>
      </div>
      <p>骰面 ${Number(check.roll)}，行动修正 ${escapeHtml(signed(check.modifier))}，合计 ${Number(check.total)}；目标 ${Number(check.target)}。${escapeHtml(text)}</p>
    </div>
  `;
}

function actionHtml(entry, index) {
  const evaluation = entry.evaluation;
  const kind = evaluation.rating === "fatal" || evaluation.rating === "dangerous"
    ? "danger"
    : evaluation.rating === "safe"
      ? "special"
      : "";
  const detail = evaluation.available
    ? `${evaluation.check ? `因果骰 ${evaluation.check.die} · 修正 ${signed(evaluation.check.modifier)} · 目标 ${evaluation.check.target}；` : ""}${evaluation.reasons.join("；")}`
    : evaluation.reason;
  return `
    <article class="choice ${escapeHtml(kind)} ${evaluation.available ? "" : "unavailable"}">
      <button type="button" data-action-id="${escapeHtml(entry.id)}" ${evaluation.available ? "" : "disabled"}>
        <span class="choice-number">${index + 1}</span>
        <span class="choice-copy">
          <small>${escapeHtml(entry.intent)} · ${escapeHtml(entry.objectName)}</small>
          <strong>${escapeHtml(entry.title)}</strong>
          <p>${escapeHtml(entry.description)}</p>
          <span class="choice-preview">得手：${escapeHtml(entry.successPreview)} · 风险：${escapeHtml(entry.riskPreview)}</span>
        </span>
        <span class="risk-mark">${escapeHtml(evaluation.available ? evaluation.ratingLabel : "不可用")}</span>
      </button>
      <details>
        <summary>查看判定依据</summary>
        <p>${escapeHtml(detail)}</p>
      </details>
    </article>
  `;
}

function settingHtml() {
  const needle = session.setup.skills.spring_rain_needles;
  const knownSleeve = session.setup.knownFacts.includes("left_sleeve_blade");
  const baseWound = session.setup.wounds[0];
  return `
    <details class="fate-settings" ${settingsExpanded ? "open" : ""}>
      <summary>
        <span>命盘推演</span>
        <strong>调整入场条件</strong>
      </summary>
      <div class="setting-body">
        <div class="setting-grid">
          ${Object.entries(ATTRIBUTE_LABELS).map(([id, label]) => `
            <label class="range-setting">
              <span>${escapeHtml(label)} <b>${Number(session.setup.attributes[id] || 0)}</b></span>
              <input type="range" min="0" max="5" step="1" value="${Number(session.setup.attributes[id] || 0)}" data-setting="attribute" data-key="${escapeHtml(id)}" />
            </label>
          `).join("")}
        </div>
        <div class="select-grid">
          <label>
            <span>自身境界</span>
            <select data-setting="stage">
              <option value="mortal" ${session.setup.playerStage === "mortal" ? "selected" : ""}>未入门</option>
              <option value="body" ${session.setup.playerStage === "body" ? "selected" : ""}>锻体</option>
            </select>
          </label>
          <label>
            <span>春风化雨针</span>
            <select data-setting="needles">
              <option value="known" ${needle.stage === "known" ? "selected" : ""}>只知招名</option>
              <option value="learned" ${needle.stage === "learned" ? "selected" : ""}>入门</option>
              <option value="skilled" ${needle.stage === "skilled" ? "selected" : ""}>熟练</option>
              <option value="mastered" ${needle.stage === "mastered" ? "selected" : ""}>精通</option>
            </select>
          </label>
          <label>
            <span>固定因果</span>
            <select data-setting="seed">
              <option value="seed-0" ${session.setup.fateSeed === "seed-0" ? "selected" : ""}>平稳</option>
              <option value="seed-2" ${session.setup.fateSeed === "seed-2" ? "selected" : ""}>上吉</option>
              <option value="seed-14" ${session.setup.fateSeed === "seed-14" ? "selected" : ""}>有损</option>
              <option value="seed-3" ${session.setup.fateSeed === "seed-3" ? "selected" : ""}>凶险</option>
            </select>
          </label>
          <label>
            <span>既有伤势</span>
            <select data-setting="wound">
              <option value="none" ${!baseWound ? "selected" : ""}>无伤</option>
              <option value="leg" ${baseWound?.bodyPart === "leg" ? "selected" : ""}>腿部重伤</option>
              <option value="shoulder" ${baseWound?.bodyPart === "shoulder" ? "selected" : ""}>肩臂重伤</option>
              <option value="torso" ${baseWound?.bodyPart === "torso" ? "selected" : ""}>肋下重伤</option>
            </select>
          </label>
        </div>
        <label class="fact-toggle">
          <input type="checkbox" data-setting="known-sleeve" ${knownSleeve ? "checked" : ""} />
          <span><strong>带着死中见闻入场</strong><small>提前知道右手是诱饵，真正杀招藏在左袖。</small></span>
        </label>
      </div>
    </details>
  `;
}

function sceneHtml() {
  const battle = session.battle;
  const knownSleeve = battle.knownFacts.includes("left_sleeve_blade") || battle.observedFeint;
  const finished = session.status !== "fighting";
  return `
    <section class="scene-column">
      <div class="scene-frame ${knownSleeve ? "known" : ""} ${finished ? "settled" : ""}">
        <div class="rain rain-one"></div>
        <div class="rain rain-two"></div>
        <div class="eave"></div>
        <div class="lantern ${battle.darkness ? "out" : ""}"><i></i></div>
        <div class="fighter player"><i></i><span>陈司命</span></div>
        <div class="fighter enemy ${battle.enemyWounded ? "wounded" : ""}"><i></i><span>蒙面刀客</span></div>
        <div class="blade-line"></div>
        <div class="scene-caption">
          <span>金陵东门 · 夜雨</span>
          <strong>${finished ? "雨声替这一战收尾" : "刀光先亮，杀意随后"}</strong>
        </div>
      </div>
      <div class="battle-status">
        <div><span>你</span><strong>${escapeHtml(STAGE_LABELS[session.setup.playerStage])}</strong></div>
        <div><span>刀客</span><strong>锻体</strong></div>
        <div><span>距离</span><strong>${battle.range === "mid" ? "适中" : escapeHtml(battle.range)}</strong></div>
        <div><span>命灯</span><strong>${"●".repeat(session.lives)}${"○".repeat(2 - session.lives)}</strong></div>
      </div>
      ${settingHtml()}
      <div class="scene-links">
        <a href="./index.html">返回江湖正篇</a>
        <button type="button" data-command="reset-defaults">还原人物</button>
      </div>
    </section>
  `;
}

function outcomeHtml() {
  const result = session.result;
  if (!result) return "";
  if (result.outcome === "death") {
    return `
      <section class="death-board">
        <span>${escapeHtml(OUTCOME_LABELS.death)}</span>
        <strong>${escapeHtml(result.cause)}</strong>
        <p>${escapeHtml(result.memory || "疼痛不会随回照消失。")}</p>
        ${checkHtml(result.check)}
        ${session.lives > 0
          ? `<button type="button" class="primary-command" data-command="rewind">循残灯回到刀客现身之前</button>`
          : `<button type="button" class="primary-command" data-command="restart">重整命盘，再入雨夜</button>`}
      </section>
    `;
  }
  return `
    <section class="outcome-board">
      <span>战局已决 · ${escapeHtml(OUTCOME_LABELS[result.outcome])}</span>
      <strong>${escapeHtml(result.text)}</strong>
      <p>${escapeHtml(EDGE_LABELS[result.edge] || "选择已经改变这一夜留下的人、物与追查入口。")}</p>
      ${checkHtml(result.check)}
      <button type="button" class="primary-command" data-command="restart">按当前命盘重开此局</button>
    </section>
  `;
}

function historyHtml() {
  if (!session.history.length) return "";
  return `
    <details class="battle-history">
      <summary>回看此局行录 <span>${session.history.length}</span></summary>
      <ol>
        ${session.history.map((entry) => `
          <li>
            <span>${entry.round ? `第 ${Number(entry.round)} 轮` : "回照"}</span>
            <strong>${escapeHtml(entry.intent || "因果回转")}</strong>
            <p>${escapeHtml(entry.text)}</p>
            ${entry.check ? `<small>骰面 ${Number(entry.check.roll)} ${escapeHtml(signed(entry.check.modifier))} = ${Number(entry.check.total)} · ${escapeHtml(entry.check.tierLabel)}</small>` : ""}
          </li>
        `).join("")}
      </ol>
    </details>
  `;
}

function battleHtml() {
  const battle = session.battle;
  const actions = getCombatLabActions(session);
  const knownSleeve = battle.knownFacts.includes("left_sleeve_blade") || battle.observedFeint;
  const wounds = session.wounds.length ? session.wounds.map(woundLabel).join(" · ") : "无伤";
  return `
    <section class="battle-column">
      <header class="battle-heading">
        <div>
          <span>东门雨夜 · 春风针初战</span>
          <h1>刀光逼近，左袖藏锋</h1>
        </div>
        <button type="button" data-command="restart">重开此局</button>
      </header>
      <div class="intent-board ${knownSleeve ? "known" : "uncertain"}">
        <span>第 ${Number(battle.round)} 轮 · 对手意图</span>
        <strong>${escapeHtml(battle.enemyIntent)}</strong>
        <p>${knownSleeve
          ? "左袖杀招已经看清；现在可以留活口、取命，或脱身。"
          : battle.darkness
            ? "灯已熄灭，他的步法慢了一瞬。"
            : battle.enemyWounded
              ? "右腕中针，但左袖仍可递刀。"
              : "后手未明。观察、借势与抢攻会读取不同五维和战场条件。"}</p>
      </div>
      <div class="condition-row">
        <span>当前运用<strong>春风化雨针</strong></span>
        <span>身体状况<strong>${escapeHtml(wounds)}</strong></span>
        <span>固定因果<strong>${escapeHtml(session.setup.fateSeed)}</strong></span>
      </div>
      ${session.status === "fighting"
        ? battle.lastCheck
          ? checkHtml(battle.lastCheck, battle.lastResult)
          : battle.lastResult
            ? checkHtml(null, battle.lastResult)
            : ""
        : ""}
      ${outcomeHtml()}
      ${session.status === "fighting" ? `
        <div class="action-heading">
          <div><span>选择下一手</span><strong>数字键 1—9 亦可出手</strong></div>
          <small>行动会读取对应属性、武学、境界差、优势与伤势。</small>
        </div>
        <div class="action-list">${actions.map(actionHtml).join("")}</div>
      ` : ""}
      ${historyHtml()}
    </section>
  `;
}

function render() {
  root.innerHTML = `
    <div class="combat-shell">
      ${sceneHtml()}
      ${battleHtml()}
    </div>
  `;
}

function updateSetup(patch) {
  session = restartCombatLab(session, patch);
  render();
}

root.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action-id]");
  if (action) {
    const resolved = resolveCombatLabAction(session, action.dataset.actionId);
    if (resolved.available) {
      session = resolved.session;
      render();
      window.scrollTo({ top: 0 });
    }
    return;
  }

  const command = event.target.closest("[data-command]")?.dataset.command;
  if (command === "rewind") {
    const rewound = rewindCombatLabDeath(session);
    if (rewound.available) session = rewound.session;
  }
  if (command === "restart") session = restartCombatLab(session);
  if (command === "reset-defaults") session = createCombatLabSession(COMBAT_LAB_DEFAULTS);
  if (command) {
    render();
    window.scrollTo({ top: 0 });
  }
});

root.addEventListener("toggle", (event) => {
  if (event.target.matches(".fate-settings")) settingsExpanded = event.target.open;
}, true);

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
  const index = Number(event.key) - 1;
  const actions = getCombatLabActions(session);
  if (index < 0 || index >= actions.length) return;
  const resolved = resolveCombatLabAction(session, actions[index].id);
  if (!resolved.available) return;
  session = resolved.session;
  render();
});

render();
