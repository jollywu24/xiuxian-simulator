import {
  FATE_MARKS,
  FATE_PATHS,
  INFO_LEVELS,
  ageMemories,
  availableTheses,
  createMemory,
  deriveFateMarks,
  evaluatePathConditions,
  evaluateThesis,
  getActionDepth,
  getMasteryStage,
  upsertMemory,
} from "./game-core.mjs";

const STORAGE_KEY = "taixu-fateplate-demo-v2";
const app = document.querySelector("#app");

const FIXED_RESULTS = {
  poison_delay: {
    name: "毒脉耐受",
    type: "身体抗性",
    description: "固化本世完整毒发经历。现实中可承受一剂乌舌草，保留四十息行动。",
  },
  registry_copy: {
    name: "名册摹写",
    type: "特殊技艺",
    description: "固化本世对名册笔迹与朱点的记忆，可无误复写一次身份批注。",
  },
  wen_trust: {
    name: "闭息配药",
    type: "协作技艺",
    description: "固化与闻青禾反复配药的手法，现实中能用共同技艺快速取得她的信任。",
  },
  well_access: {
    name: "外院水务章程",
    type: "制度技艺",
    description: "固化本世抄录的水务流程，可合法冻结一次晚宴用水。",
  },
};

function createInitialState() {
  return {
    version: 4,
    screen: "landing",
    name: "沈砚",
    flames: 3,
    strain: 0,
    simulationCount: 0,
    mastery: 0,
    thesisId: null,
    targetPath: "feign",
    runAction: null,
    feastAction: null,
    runTags: [],
    lastTrial: null,
    memories: [],
    marks: [],
    fixedResults: [],
    preparations: [],
    flags: [],
    history: [],
    deviation: 0,
    anchorEstablished: false,
    endingChoice: null,
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved?.version === 4 ? { ...createInitialState(), ...saved } : null;
  } catch {
    return null;
  }
}

let savedState = loadState();
let state = savedState ? structuredClone(savedState) : createInitialState();

function saveState() {
  if (state.screen === "landing") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  savedState = structuredClone(state);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addHistory(text) {
  if (!state.history.includes(text)) state.history.push(text);
}

function addMemory(memory) {
  state.memories = upsertMemory(state.memories, memory);
}

function modeForScreen(screen) {
  if (["trialBrief", "simObserve", "simDecision"].includes(screen)) return "simulation";
  if (screen === "recap" && state.lastTrial?.endedBy === "death") return "death";
  if (["settlement", "markDraw"].includes(screen)) return "settlement";
  if (screen === "landing") return "neutral";
  return "reality";
}

function screenLabel() {
  const labels = {
    realityHub: "现实 · 祖师洞外",
    trialBrief: "太虚命盘 · 试命命题",
    simObserve: `第 ${state.simulationCount + 1} 次模拟 · 晚宴前夜`,
    simDecision: `第 ${state.simulationCount + 1} 次模拟 · 收束点`,
    recap: state.lastTrial?.endedBy === "death" ? "模拟死亡 · 命题复盘" : "主动收束 · 命题复盘",
    settlement: "此世结算 · 两种人生方向",
    markDraw: "化劫 · 命痕显化",
    fateBoard: "现实 · 命途条件板",
    pathOutcome: "现实 · 命局偏转",
    tracked: "现实 · 接管灭口链",
    takeover: "现实 · 反向名单",
    anchor: "现实 · 锚点抉择",
    final: "P0 原型完成",
  };
  return labels[state.screen] || "太虚命盘";
}

function actionCard({ action, value, title, description, source, meta, kind = "", disabled = false }) {
  return `<button class="action-card ${kind}" data-action="${escapeHtml(action)}"${value ? ` data-value="${escapeHtml(value)}"` : ""}${disabled ? " disabled" : ""}>
    <span><span class="action-title">${escapeHtml(title)}</span><span class="action-description"><span class="action-source">${escapeHtml(source)}</span>${escapeHtml(description)}</span></span>
    <span class="action-meta">${escapeHtml(meta)}</span>
  </button>`;
}

function setupShell(content) {
  return `<main class="setup-shell"><section class="setup-card narrow">${content}</section></main>`;
}

function sceneHeader(eyebrow, title, subtitle) {
  return `<header class="scene-head"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1 class="scene-title">${escapeHtml(title)}</h1><p class="scene-subtitle">${escapeHtml(subtitle)}</p></header>`;
}

function timelinePanel() {
  const items = [
    ["现实锚点", state.anchorEstablished ? "晚宴后新现实" : "祖师洞外，墨滴未落", "current"],
    ["第一次受劫", state.simulationCount ? "已看清投毒与补刀" : "晚宴结果未知", state.simulationCount ? "death" : ""],
    ["命途掌控", getMasteryStage(state.mastery), state.mastery >= 4 ? "shifted" : ""],
    ["七年黑日", "完整游戏长线目标", ""],
  ];
  return `<aside class="panel timeline-panel"><div class="panel-title">命途进度</div><div class="timeline-list">
    ${items.map(([title, copy, kind]) => `<div class="timeline-item ${kind}"><span class="timeline-dot"></span><div><h4>${escapeHtml(title)}</h4><p>${escapeHtml(copy)}</p></div></div>`).join("")}
  </div></aside>`;
}

function memoryPanel() {
  const memories = [...state.memories].slice(-5).reverse();
  return `<aside class="panel character-panel"><div class="panel-title">见闻账 · 自动保留</div>
    <div class="character-head"><div class="brand-seal">命</div><div><h3>${escapeHtml(state.name)}</h3><p>现实相识四日 · 模拟记忆 ${state.memories.length} 条</p></div></div>
    <div class="intel-list">${memories.length ? memories.map((memory) => `<div class="intel-card intel-${memory.level}"><span class="intel-level">${escapeHtml(INFO_LEVELS[memory.level]?.label || memory.level)}</span><strong>${escapeHtml(memory.title)}</strong><span>${escapeHtml(memory.detail)}</span></div>`).join("") : '<p class="empty-state">亲历的对话、时间、地点与死亡过程都会自动记在这里，不占结算名额。</p>'}</div>
    ${state.marks.length ? `<div class="panel-title subsection">后天命痕</div><div class="compact-traits">${state.marks.map((id) => { const mark = FATE_MARKS.find((item) => item.id === id); return `<div class="compact-trait"><strong>${escapeHtml(mark?.family)} · ${escapeHtml(mark?.name)}</strong><span>${escapeHtml(mark?.effect)}</span></div>`; }).join("")}</div>` : ""}
  </aside>`;
}

function gameShell(content) {
  return `<main class="game-shell"><header class="topbar"><div class="brand-mini"><span class="brand-seal">太</span><span>太虚命盘</span></div><div class="mode-badge">${escapeHtml(screenLabel())}</div><div class="resource-row"><div class="resource"><span>命火</span><strong>${state.flames}</strong></div><div class="resource"><span>心神负担</span><strong>${state.strain}</strong></div><div class="resource"><span>掌控</span><strong>${escapeHtml(getMasteryStage(state.mastery))}</strong></div></div></header><div class="game-grid">${timelinePanel()}<section class="scene-panel">${content}</section>${memoryPanel()}</div></main>`;
}

function renderLanding() {
  return setupShell(`<div class="title-lockup"><div class="fate-ring"><span class="fate-glyph">命</span></div><p class="eyebrow">修仙人生模拟 Roguelite · P0</p><h1 class="setup-title">太虚命盘</h1><p class="subtitle">把每次死亡炼成破局条件，最终亲手接管灭门因果。</p><div class="rule-line"><span>试命命题</span><span>记忆全留</span><span>接管死局</span></div><label class="quick-name"><span>命主姓名</span><input data-field="name" maxlength="12" value="${escapeHtml(state.name)}" /></label><div class="button-row"><button class="primary-button" data-action="new-game">从祖师洞醒来</button>${savedState ? `<button class="secondary-button" data-action="continue-game">继续 · ${escapeHtml(savedState.name)}</button>` : ""}</div><p class="screen-note">约 10～15 分钟 · 无需安装依赖 · 自动存档</p></div>`);
}

function thesisCards() {
  const available = availableTheses(state);
  return available.map((thesis) => actionCard({
    action: "choose-thesis",
    value: thesis.id,
    title: thesis.title,
    description: thesis.summary,
    source: state.memories.some((item) => item.id === thesis.id) ? "复验旧命题" : "新命题",
    meta: "浅层试命免费",
    kind: thesis.id === "kill_list" ? "special" : "",
  })).join("");
}

function renderRealityHub() {
  return gameShell(`${sceneHeader("现实 · 祖师洞外", "七年后的尸山，只过去了一息", "你不需要立刻拯救宗门。先用一条可能的人生，回答一个足够具体的问题。")}
    <div class="story-copy"><div class="omen-block">太虚七年，黑日悬山。<br>归尘门上下，无一生还。</div><p>命盘没有索要命火。它只在盘面浮出一条规则：<strong>浅层实验免费，真正写回现实才消耗命火。</strong></p><div class="quote-block">本次试命要验证什么？</div></div><div class="action-list">${thesisCards()}</div>`);
}

function currentThesis() {
  return availableTheses(state).find((item) => item.id === state.thesisId) || null;
}

function renderTrialBrief() {
  const thesis = currentThesis();
  return gameShell(`${sceneHeader(`第 ${state.simulationCount + 1} 次模拟 · 入盘前`, "先立命题，再押上一段人生", "死亡不会替你发线索；这一世只负责验证你亲自提出的问题。")}
    <div class="thesis-focus"><span>本世命题</span><h2>${escapeHtml(thesis?.title)}</h2><p>${escapeHtml(thesis?.summary)}</p></div>
    <div class="notice-block"><strong>带回规则</strong><br>所有亲历信息默认保留。结算只决定：固化本世所得，或将本世之劫炼成命痕。</div>
    <div class="action-list">${actionCard({ action: "start-trial", title: "从当前锚点进入第七日前夜", description: "稳定掌握的日常被压缩，只亲历与命题有关的关键场景。", source: "浅层试命", meta: "命火 0", kind: "special" })}</div>`);
}

function trialActions() {
  if (state.thesisId === "poison_source") return [
    ["watch", "守在水井暗处", "观察酉时换水与人员动线。", "观命"],
    ["taste", "亲自试毒", "让少量井水入口，记录完整毒发过程。", "借劫"],
    ["ask_wen", "请闻青禾分段验水", "用一段前世才有的默契试着建立现实不会存在的配合。", "守命"],
  ];
  if (state.thesisId === "kill_list") return [
    ["roster", "倒地后盯住名册", "核对朱点、补刀顺序与身份玉牌。", "观命"],
    ["feign", "提前练习伪造气绝", "让补刀者以为你已死，观察他的确认流程。", "藏锋"],
    ["protect", "把闻青禾推离朱点位置", "观察名单会不会追着人变动。", "守命"],
  ];
  return [
    ["watch", "让换水计划失败后旁观", "不急着抓人，等待第二套命令出现。", "观命"],
    ["roster", "伪造水务冻结文书", "用制度漏洞迫使幕后者改走名册流程。", "藏锋"],
    ["protect", "只撤走一桌弟子", "留下可控缺口，观察敌人如何修补计划。", "借劫"],
  ];
}

function renderSimObserve() {
  return gameShell(`${sceneHeader("模拟 · 第七日酉时", "同一个选择，可以走到不同深度", "大部分行动都能尝试；命痕与固命成果决定你能在危险里多看几步。")}
    <div class="story-copy"><p>晚宴前，柴房杂役推着水桶穿过外院。闻青禾在丹房门口与你擦肩而过——你记得她曾在另一世为你守过整夜，但这一世她只认识你四天。</p></div>
    <div class="action-list">${trialActions().map(([id, title, description, source]) => { const depth = getActionDepth({ action: id, marks: state.marks, fixedResults: state.fixedResults }); return actionCard({ action: "trial-action", value: id, title, description: `${description} ${depth.detail}`, source, meta: `${depth.label} · 深度 ${depth.depth}` }); }).join("")}</div>`);
}

function renderSimDecision() {
  const depth = getActionDepth({ action: state.runAction, marks: state.marks, fixedResults: state.fixedResults });
  return gameShell(`${sceneHeader("模拟 · 命题已有答案", "现在离开，还是再看一步？", "主动收束保住成果；继续到死亡能看见更深机制，却会加重心神负担。")}
    <div class="story-copy"><p>你已经取得足以回答命题的观察。盘面边缘开始收拢，但晚宴中的蒙面人尚未真正出现。</p><div class="notice-block"><strong>${escapeHtml(depth.label)}</strong><br>${escapeHtml(depth.detail)}</div></div>
    <div class="action-list">
      ${actionCard({ action: "end-trial", value: "active", title: "主动收束此世", description: "稳定保留本轮见闻，可照常固命或化劫；不增加心神负担。", source: "收束", meta: "少看一层机制", kind: "special" })}
      ${actionCard({ action: "choose-feast", value: "feign", title: "佯装毒发，等补刀者靠近", description: "尝试记住确认死亡、核对名单与复命的全过程。", source: "藏锋", meta: "死亡风险", kind: "danger" })}
      ${actionCard({ action: "choose-feast", value: "endure", title: "继续饮毒，完整观察峰值", description: "让身体走完毒发过程，用死亡换取精确窗口。", source: "借劫", meta: "死亡风险", kind: "danger" })}
      ${actionCard({ action: "choose-feast", value: "warn", title: "在倒下前护住身边的人", description: "观察敌人是否会调整名单，也让闻青禾看见你的选择。", source: "守命", meta: "死亡风险", kind: "danger" })}
    </div>`);
}

function renderRecap() {
  const trial = state.lastTrial;
  const died = trial?.endedBy === "death";
  return gameShell(`${sceneHeader(died ? "此命已尽" : "此世已收束", died ? "你不是被毒死的" : "你带着答案主动离开", died ? "短刃刺入心脉之前，你完成了这次实验。" : "没有死亡发奖，只有你亲手验证过的结论。")}
    ${died ? '<div class="death-cause"><span>直接死因</span><strong>四肢失力后，被蒙面人按名册补刀</strong></div>' : ""}
    <div class="trial-report"><div><span>命题结论</span><strong>${escapeHtml(trial?.verdict)}</strong></div><div><span>错误判断</span><strong>${escapeHtml(trial?.mistake)}</strong></div><div><span>仍缺条件</span><strong>${escapeHtml(trial?.missing)}</strong></div></div>
    <div class="notice-block"><strong>记忆自动保留</strong><br>本轮对话、时辰、人物行为与${died ? "死亡过程" : "主动收束前的观察"}已经写入见闻账，不需要在结算中购买。</div>
    <div class="button-row"><button class="primary-button" data-action="to-settlement">${died ? "把这一世的劫炼成选择" : "结算本世成果"}</button></div>`);
}

function fixedResultForRun() {
  if (state.runAction === "taste" || state.feastAction === "endure") return ["poison_delay", FIXED_RESULTS.poison_delay];
  if (state.runAction === "roster" || state.thesisId === "kill_list") return ["registry_copy", FIXED_RESULTS.registry_copy];
  if (state.runAction === "ask_wen" || state.runAction === "protect" || state.feastAction === "warn") return ["wen_trust", FIXED_RESULTS.wen_trust];
  return ["well_access", FIXED_RESULTS.well_access];
}

function renderSettlement() {
  const [fixedId, fixed] = fixedResultForRun();
  const cost = 1;
  return gameShell(`${sceneHeader("此世结算", "固化此世所得，还是将此世之劫炼入命中？", "信息从不参与名额竞争。你只决定这段人生以什么形式改变现实中的自己。")}
    <div class="settlement-grid two-way">
      <button class="settlement-card" data-action="take-fixed" data-value="${fixedId}"${state.flames < cost ? " disabled" : ""}><span class="settlement-type">固命 · 带回此世得到什么</span><h3>${escapeHtml(fixed.name)}</h3><p>${escapeHtml(fixed.description)}</p><div class="settlement-facts"><span>${escapeHtml(fixed.type)} · 结果完全可见</span><span>写回现实：命火 -${cost}</span></div></button>
      <button class="settlement-card" data-action="open-marks"${state.flames < cost ? " disabled" : ""}><span class="settlement-type">化劫 · 带回此世成为什么</span><h3>后天命痕</h3><p>根据本世行为、死法与选择，生成三枚命痕候选。命痕改变行动深度，不是隐藏按钮的钥匙。</p><div class="settlement-facts"><span>观命 / 藏锋 / 守命 / 借劫</span><span>写回现实：命火 -${cost}</span></div></button>
    </div>`);
}

function markCandidates() {
  return deriveFateMarks({ tags: state.runTags, existing: state.marks });
}

function renderMarkDraw() {
  return gameShell(`${sceneHeader("化劫 · 命痕显化", "这一世把你变成了什么", "候选来自真实行为。它们让同一个行动走得更深，也各自留下代价。")}
    <div class="draw-grid">${markCandidates().map((mark) => `<button class="settlement-card compact" data-action="take-mark" data-value="${mark.id}"><span class="settlement-type">${escapeHtml(mark.family)}</span><h3>${escapeHtml(mark.name)}</h3><p>${escapeHtml(mark.effect)}</p><div class="settlement-facts"><span>代价：${escapeHtml(mark.cost)}</span><span>写回现实：命火 -1</span></div></button>`).join("")}</div>`);
}

function pathCard(path) {
  if (path.hidden) return `<article class="fate-path hidden-path"><span class="path-stage">尚未看破</span><h3>？？？</h3><p>还有一条能够接管名单的高阶命途。</p><div class="condition-list"><span>隐藏条件：3 项</span></div></article>`;
  const missing = path.conditions.filter((condition) => !condition.met).length;
  return `<article class="fate-path ${path.enabled ? "path-ready" : ""} ${state.targetPath === path.id ? "path-target" : ""}"><span class="path-stage">${escapeHtml(path.stage)} · ${path.enabled ? "条件已齐" : `缺 ${missing} 项`}</span><h3>${escapeHtml(path.name)}</h3><p>${escapeHtml(path.description)}</p><div class="condition-list">${path.conditions.map((condition) => `<span class="${condition.met ? "met" : "missing"}">${condition.met ? "已满足" : "未满足"} · ${escapeHtml(condition.label)}</span>`).join("")}</div><div class="path-actions"><button class="ghost-button" data-action="target-path" data-value="${path.id}">${state.targetPath === path.id ? "当前目标" : "设为目标"}</button><button class="primary-button" data-action="execute-path" data-value="${path.id}"${path.enabled ? "" : " disabled"}>执行命途</button></div></article>`;
}

function renderFateBoard() {
  const paths = FATE_PATHS.map((path) => evaluatePathConditions(path.id, state));
  const needList = !state.memories.some((item) => item.id === "kill_list");
  return gameShell(`${sceneHeader("现实 · 命途条件板", "你想让晚宴以什么形式发生？", "命盘只展示亲历后看得见的分支、明显缺口与代价；完整攻略仍需要你用命验证。")}
    <div class="single-life"><span>单向前世关系</span><p>你记得闻青禾在模拟中替你闭气、验脉，甚至看着你死去；现实中的她只认识你四天。直接说出秘密会令她恐惧，温和复现共同技艺则能建立信任。</p></div>
    <div class="prep-row">
      <button class="secondary-button" data-action="prepare" data-value="well_access"${state.preparations.includes("well_access") ? " disabled" : ""}>制度漏洞 · 申请冻结晚宴用水</button>
      <button class="secondary-button" data-action="prepare" data-value="trusted_partner"${state.preparations.includes("trusted_partner") ? " disabled" : ""}>前世关系 · 请闻青禾配合假死</button>
    </div>
    <div class="fate-board">${paths.map(pathCard).join("")}</div>
    <h2 class="section-title">继续试命</h2><p class="section-copy">${needList ? "假死追凶仍缺少对补刀名单的理解。用下一段人生验证它。" : "你也可以复验旧命题，观察不同构筑能走到什么深度。"}</p><div class="action-list">${thesisCards()}</div>`);
}

function renderPathOutcome() {
  const type = state.flags.includes("avoided") ? "avoid" : "replace";
  if (type === "avoid") return gameShell(`${sceneHeader("现实 · 晚宴之后", "你活了下来，但死局仍在", "避开事件只完成了避劫。其他人仍然中毒，幕后者也没有暴露。")}
    <div class="notice-block"><strong>掌控提升：避劫</strong><br>你证明了自己能活，但这不是你最终想要的结果。</div><div class="action-list">${actionCard({ action: "back-board", title: "回到命途条件板", description: "继续补齐能够保护他人、追踪幕后者的条件。", source: "不建立锚点", meta: "现实尚可改写", kind: "special" })}</div>`);
  return gameShell(`${sceneHeader("现实 · 晚宴用水已冻结", "你救下所有人，敌人却没有停手", "宋无咎按水务章程封存井水。夜里，外院以疫病为名被整体封锁。")}
    <div class="story-copy"><p>你第一次清楚地看见：投毒只是方便集中祭品的手段。宗门名册、身份玉牌与封锁条例才是死局真正的骨架。</p></div><div class="notice-block"><strong>掌控提升：破劫</strong><br>你阻止了当前伤害，也亲历了敌人的替代方案。旧时序已经过期，但因果仍然有效。</div><div class="action-list">${actionCard({ action: "back-board", title: "带着替代方案回到条件板", description: "把“阻止计划”升级为“允许计划发生并追踪计划”。", source: "世界线偏转", meta: "偏差 +1", kind: "special" })}</div>`);
}

function renderTracked() {
  return gameShell(`${sceneHeader("现实 · 假死之后", "补刀者把你的死讯带进了旧库", "闻青禾在七息内替你封住心脉。蒙面人完成错误确认后，用旧印向幕后者发送了结果。")}
    <div class="cause-chain"><div class="cause-node"><span class="cause-status">夺法</span><span>敌方联络口令：“残灯已净”</span></div><div class="cause-node"><span class="cause-status">夺法</span><span>以名册朱点熄灭作为死亡回执</span></div><div class="cause-node"><span class="cause-status">看破</span><span>只有被宗门正式承认身份的人，才会被祭阵锁定</span></div><div class="cause-node"><span class="cause-status">可接管</span><span>修改弟子名册，就能替换灭口计划的目标与结果</span></div></div>
    <div class="notice-block"><strong>掌控提升：借劫</strong><br>你没有阻止晚宴发生，而是让敌人的毒、名单和联络流程替你打开幕后链条。</div><div class="action-list">${actionCard({ action: "to-takeover", title: "接管整套灭口计划", description: "不只发送假情报，还要决定名单锁定谁、暴露谁。", source: "反向名单", meta: "进入驭劫", kind: "special" })}</div>`);
}

function renderTakeover() {
  return gameShell(`${sceneHeader("现实 · 旧库名册前", "宗门本身就是阵法的一部分", "身份玉牌表面用于门禁，真实作用是锁定弟子位置与寿元。你现在握住了这条制度的笔。")}
    <div class="bottom-rule"><span>底层规则</span><strong>祭阵只能收割被宗门正式承认身份的人。</strong><p>因此逐出、假死、改名、替换玉牌、篡改名册与登记客卿都能成为破法。</p></div>
    <div class="action-list">
      ${actionCard({ action: "takeover-plan", value: "expose", title: "保留杂役身份，反写幕后执事为补刀目标", description: "让补刀者沿原计划找到自己的上级，并把全套名单留作证据。", source: "制度漏洞", meta: "保护外院 · 暴露幕后", kind: "special" })}
      ${actionCard({ action: "takeover-plan", value: "guest", title: "把接头人登记为临时客卿", description: "让祭阵的身份锁定第一次反噬操作者，同时向幕后者发送“残灯已净”。", source: "借敌之劫", meta: "反制祭阵 · 偏差更高", kind: "danger" })}
    </div>`);
}

function renderAnchor() {
  return gameShell(`${sceneHeader("现实 · 新命局已经发生", "你要接受这个不完美的现实吗？", "建立锚点意味着此前选择被固化：死去的人无法再挽回，错过的关系与机会永久关闭。")}
    <div class="trial-report"><div><span>保住</span><strong>外院弟子、闻青禾与下毒杂役</strong></div><div><span>接管</span><strong>下毒渠道、补刀名单、联络口令与假回执</strong></div><div><span>仍未解决</span><strong>宗门为何要以正式身份锁定祭品</strong></div></div>
    <div class="action-list">${actionCard({ action: "finish", value: "anchor", title: "消耗 1 命火，建立新锚点", description: "接受当前损失。此后的模拟都从晚宴已被接管的新现实开始。", source: "不可逆战略选择", meta: `命火 ${state.flames} → ${Math.max(0, state.flames - 1)}`, kind: "special", disabled: state.flames < 1 })}${actionCard({ action: "finish", value: "open", title: "暂不建立锚点", description: "保留继续修改晚宴的可能，但深层未来仍无法稳定进入。", source: "不固化现实", meta: "命火不变" })}</div>`);
}

function renderFinal() {
  return gameShell(`${sceneHeader("新版 P0 纵向切片完成", "你不再是晚宴里的受害者", "你用两段可能的人生完成实验，把经历写回现实，并把敌人的灭口机制变成了自己的工具。")}
    <div class="end-summary"><div class="summary-block"><span>掌控层级</span><strong>${escapeHtml(getMasteryStage(state.mastery))}</strong></div><div class="summary-block"><span>模拟记忆</span><strong>${state.memories.length} 条全部保留</strong></div><div class="summary-block"><span>人生写回</span><strong>${state.fixedResults.length} 项固命 / ${state.marks.length} 枚命痕</strong></div></div>
    <div class="path-recap"><h2>本轮命途</h2>${state.history.map((item, index) => `<p><span>${index + 1}</span>${escapeHtml(item)}</p>`).join("")}</div>
    <div class="notice-block"><strong>完整游戏的下一问</strong><br>晚宴只是宗门制度的一次运转。外门抄经、身份玉牌、年度体检、矿役与同门结契，都在为七年后的祭阵登记祭品。</div>
    <div class="button-row"><button class="secondary-button" data-action="restart">重新试一条命途</button></div>`);
}

const renderers = {
  landing: renderLanding,
  realityHub: renderRealityHub,
  trialBrief: renderTrialBrief,
  simObserve: renderSimObserve,
  simDecision: renderSimDecision,
  recap: renderRecap,
  settlement: renderSettlement,
  markDraw: renderMarkDraw,
  fateBoard: renderFateBoard,
  pathOutcome: renderPathOutcome,
  tracked: renderTracked,
  takeover: renderTakeover,
  anchor: renderAnchor,
  final: renderFinal,
};

function moveTo(screen) {
  state.screen = screen;
  render();
}

function finishTrial(endedBy) {
  const report = evaluateThesis({ thesisId: state.thesisId, action: state.runAction, feastAction: state.feastAction, endedBy });
  report.memories.forEach(addMemory);
  state.lastTrial = { ...report, endedBy, thesisId: state.thesisId };
  state.simulationCount += 1;
  state.mastery = Math.max(state.mastery, 1);
  if (endedBy === "death") {
    state.strain += 2;
    state.runTags.push("death");
    addHistory(`第 ${state.simulationCount} 世死亡，验证“${currentThesis()?.title}”`);
  } else {
    state.runTags.push("close");
    addHistory(`第 ${state.simulationCount} 世主动收束，带着答案离开`);
  }
  moveTo("recap");
}

function spendFlame() {
  if (state.flames < 1) return false;
  state.flames -= 1;
  return true;
}

const handlers = {
  "new-game": () => {
    const name = document.querySelector('[data-field="name"]')?.value.trim();
    state = createInitialState();
    state.name = name || "沈砚";
    addHistory("在祖师洞亲历七年后的黑日灭门");
    moveTo("realityHub");
  },
  "continue-game": () => {
    if (!savedState) return;
    state = structuredClone(savedState);
    render();
  },
  "choose-thesis": (button) => {
    if (!availableTheses(state).some((item) => item.id === button.dataset.value)) return;
    state.thesisId = button.dataset.value;
    moveTo("trialBrief");
  },
  "start-trial": () => {
    state.runAction = null;
    state.feastAction = null;
    state.runTags = [];
    moveTo("simObserve");
  },
  "trial-action": (button) => {
    if (state.screen !== "simObserve") return;
    state.runAction = button.dataset.value;
    const tagMap = {
      watch: ["observe"], taste: ["taste", "poison"], ask_wen: ["ally", "protect"],
      roster: ["roster", "observe"], feign: ["feign", "deceive"], protect: ["protect", "ally"],
    };
    state.runTags.push(...(tagMap[state.runAction] || []));
    moveTo("simDecision");
  },
  "end-trial": () => finishTrial("active"),
  "choose-feast": (button) => {
    state.feastAction = button.dataset.value;
    const tagMap = { feign: ["feign", "deceive"], endure: ["endure", "poison"], warn: ["warn", "protect", "ally"] };
    state.runTags.push(...(tagMap[state.feastAction] || []));
    finishTrial("death");
  },
  "to-settlement": () => moveTo("settlement"),
  "take-fixed": (button) => {
    if (!spendFlame() || !FIXED_RESULTS[button.dataset.value]) return;
    if (!state.fixedResults.includes(button.dataset.value)) state.fixedResults.push(button.dataset.value);
    addHistory(`固命：${FIXED_RESULTS[button.dataset.value].name}`);
    state.mastery = Math.max(state.mastery, 2);
    moveTo("fateBoard");
  },
  "open-marks": () => {
    if (state.flames < 1) return;
    moveTo("markDraw");
  },
  "take-mark": (button) => {
    const mark = markCandidates().find((item) => item.id === button.dataset.value);
    if (!mark || !spendFlame()) return;
    state.marks.push(mark.id);
    addHistory(`化劫：炼成${mark.family}命痕“${mark.name}”`);
    state.mastery = Math.max(state.mastery, 2);
    moveTo("fateBoard");
  },
  prepare: (button) => {
    const id = button.dataset.value;
    if (!["well_access", "trusted_partner"].includes(id) || state.preparations.includes(id)) return;
    state.preparations.push(id);
    addHistory(id === "well_access" ? "利用水务章程取得冻结晚宴用水的权限" : "用单向前世记忆重新赢得闻青禾的信任");
    render();
  },
  "target-path": (button) => {
    state.targetPath = button.dataset.value;
    render();
  },
  "execute-path": (button) => {
    const path = evaluatePathConditions(button.dataset.value, state);
    if (!path.enabled) return;
    if (path.id === "avoid") {
      state.flags.push("avoided");
      state.mastery = Math.max(state.mastery, 2);
      addHistory("现实避宴：自己活下，但未能保护其他人");
      moveTo("pathOutcome");
    } else if (path.id === "replace") {
      state.flags = state.flags.filter((item) => item !== "avoided");
      state.mastery = Math.max(state.mastery, 3);
      state.deviation += 1;
      state.memories = ageMemories(state.memories, ["well_timing"]);
      addMemory(createMemory({ id: "fallback_plan", title: "替代灭口方案", detail: "投毒失败后，宗门以疫病流程封锁外院并逐户核牌。", level: "verified", source: "现实亲历" }));
      addHistory("现实破劫：冻结井水，逼出替代灭口方案");
      moveTo("pathOutcome");
    } else if (path.id === "feign") {
      state.flags.push("enemy_contact", "false_report");
      state.mastery = Math.max(state.mastery, 4);
      addMemory(createMemory({ id: "registry_rule", title: "正式身份锁定", detail: "祭阵只能追索被宗门正式承认、且玉牌登记仍有效的人。", level: "verified", source: "现实假死追凶" }));
      addMemory(createMemory({ id: "enemy_contact", title: "敌方联络口令", detail: "蒙面人以“残灯已净”报告名单目标全部死亡。", level: "verified", source: "现实截获" }));
      addHistory("现实借劫：假死骗过补刀者，截获复命口令");
      moveTo("tracked");
    } else if (path.id === "reverse") {
      moveTo("takeover");
    }
  },
  "back-board": () => moveTo("fateBoard"),
  "to-takeover": () => moveTo("takeover"),
  "takeover-plan": (button) => {
    state.endingChoice = button.dataset.value;
    state.mastery = 5;
    state.deviation += button.dataset.value === "guest" ? 2 : 1;
    state.memories = ageMemories(state.memories, ["poison_source", "well_timing"]);
    addHistory(button.dataset.value === "guest" ? "现实驭劫：把接头人登记为客卿，让身份锁定反噬操作者" : "现实驭劫：反写幕后执事为补刀目标，保留完整证据链");
    moveTo("anchor");
  },
  finish: (button) => {
    if (button.dataset.value === "anchor") {
      if (!spendFlame()) return;
      state.anchorEstablished = true;
      addHistory("消耗命火建立新锚点，接受晚宴后的现实为未来起点");
    } else {
      addHistory("暂不建立锚点，保留继续修改晚宴的可能");
    }
    moveTo("final");
  },
  restart: () => {
    localStorage.removeItem(STORAGE_KEY);
    savedState = null;
    state = createInitialState();
    render();
  },
};

app.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  handlers[button.dataset.action]?.(button);
});

app.addEventListener("input", (event) => {
  if (event.target.matches('[data-field="name"]')) state.name = event.target.value.slice(0, 12);
});

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input") || !/^[1-9]$/.test(event.key)) return;
  const actions = [...document.querySelectorAll(".action-card:not(:disabled)")];
  actions[Number(event.key) - 1]?.click();
});

function render() {
  document.body.dataset.mode = modeForScreen(state.screen);
  const renderer = renderers[state.screen] || renderLanding;
  app.innerHTML = renderer();
  saveState();
  window.scrollTo({ top: 0, behavior: "instant" });
}

render();
