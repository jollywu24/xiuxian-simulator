import {
  APPEARANCES,
  BUILD_PATHS,
  CORE_NPCS,
  INTEL_LEVELS,
  ORIGINS,
  RARITY,
  ageIntel,
  createCycleLegacy,
  createIntel,
  createMineBattle,
  createRealityAnchor,
  deriveBuildSynergies,
  deriveSettlementTraits,
  deriveTraitSynergies,
  evaluateFinaleOptions,
  evaluateNpcAlliance,
  generateOpeningSets,
  getAppearance,
  getBuildPath,
  getCoreNpc,
  getIntel,
  getOpeningTrait,
  getOrigin,
  getSettlementTrait,
  migrateSaveData,
  resolveCompanionOffer,
  resolveFinalEnding,
  resolveMineBattleTurn,
  restoreRealityAnchor,
  scoreSettlement,
  uniqueTags,
  upsertIntel,
} from "./game-core.mjs";

const STORAGE_KEY = "taixu-fateplate-demo-v1";
const app = document.querySelector("#app");
const querySeed = new URLSearchParams(window.location.search).get("seed");

const GROUP_LABELS = {
  root: ["根骨", "身体与灵根"],
  talent: ["才性", "你如何理解世界"],
  fate: ["因果", "力量总会标出代价"],
};

const PRONOUNS = [
  { id: "he", name: "他" },
  { id: "she", name: "她" },
  { id: "none", name: "不标注" },
];

function freshSeed() {
  return querySeed || `demo-${Date.now().toString(36)}`;
}

function createInitialState(seed = freshSeed()) {
  return {
    version: 3,
    seed,
    cycle: 1,
    inheritedLegacy: null,
    completedEndings: [],
    screen: "landing",
    character: {
      name: "",
      pronoun: "none",
      appearance: "pine",
      origin: null,
    },
    openingDrawIndex: 0,
    openingSets: generateOpeningSets(seed, 0),
    openingSelected: {},
    rerollUsed: false,
    rerollConfirm: false,
    initialEnvy: 0,
    flames: 3,
    envy: 0,
    deviation: 0,
    simulationCount: 0,
    actionTags: [],
    clues: [],
    firstSimulationClues: [],
    triggeredOpeningTraits: [],
    latestTriggers: [],
    morningChoice: null,
    eveChoice: null,
    feastChoice: null,
    rating: "丙",
    pendingSettlement: null,
    settlementCandidates: [],
    reward: null,
    acquiredTraits: [],
    realRoute: null,
    realOutcome: null,
    companion: null,
    companionOffer: null,
    activeSynergies: [],
    intel: [],
    mineEntry: null,
    mineInvestigation: null,
    battle: null,
    mineChoice: null,
    mineOutcome: null,
    companionAct: null,
    p1Carry: null,
    p1RealityChoice: null,
    p1Payoff: null,
    p1Path: [],
    buildId: null,
    buildSynergies: [],
    npcStates: {
      pei: { state: "cautious", allied: false, fate: "仍在内门值守" },
      wen: { state: "cautious", allied: false, fate: "仍在追查兄长" },
      song: { state: "cautious", allied: false, fate: "封存建宗旧档" },
      ayen: { state: "captive", allied: false, fate: "被关在外门地牢" },
    },
    archiveChoice: null,
    year5Choice: null,
    realityAnchor: null,
    realityDeaths: 0,
    p2Path: [],
    finaleOptions: [],
    endingId: null,
    endingResult: null,
    legacyCandidate: null,
    prologueChoice: null,
    timeline: {
      omen: "known",
      feast: "unknown",
      mine: "hidden",
      archive: "hidden",
      siege: "hidden",
      blackSun: "future",
    },
    events: [],
  };
}

function migrateSavedState(saved) {
  if (!saved?.seed) return null;
  const migrated = migrateSaveData(saved, createInitialState(saved.seed));
  if (!migrated) return null;
  migrated.activeSynergies = migrated.activeSynergies?.length
    ? migrated.activeSynergies
    : deriveTraitSynergies(Object.values(migrated.openingSelected || {}), migrated.acquiredTraits || []);
  return migrated;
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return migrateSavedState(saved);
  } catch {
    return null;
  }
}

let savedState = loadSavedState();
let state = createInitialState(savedState?.seed || freshSeed());

function saveState() {
  if (state.screen === "landing") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  savedState = structuredClone(state);
}

function clearSave() {
  localStorage.removeItem(STORAGE_KEY);
  savedState = null;
}

function track(name, data = {}) {
  state.events ??= [];
  state.events.push({ name, at: Date.now(), ...data });
  console.info(`[太虚命盘] ${name}`, data);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function selectedOpeningTraits() {
  return ["root", "talent", "fate"]
    .map((group) => getOpeningTrait(state.openingSelected[group]))
    .filter(Boolean);
}

function openingTraitForGroup(group) {
  return getOpeningTrait(state.openingSelected[group]);
}

function addTags(...tags) {
  state.actionTags = uniqueTags([...state.actionTags, ...tags]);
}

function addClue(clue) {
  if (!state.clues.includes(clue)) state.clues.push(clue);
}

function addIntel(record) {
  state.intel = upsertIntel(state.intel || [], record);
}

function refreshIntel() {
  state.intel = ageIntel(state.intel || [], state.deviation);
}

function refreshSynergies() {
  state.activeSynergies = deriveTraitSynergies(
    Object.values(state.openingSelected || {}),
    state.acquiredTraits || [],
  );
}

function confirmedIntelIds() {
  return (state.intel || [])
    .filter((record) => record.status === "confirmed")
    .map((record) => record.id);
}

function alliedNpcIds() {
  return Object.entries(state.npcStates || {})
    .filter(([, npcState]) => npcState.allied)
    .map(([id]) => id);
}

function updateNpcState(id, updates) {
  state.npcStates[id] = {
    ...(state.npcStates[id] || { state: "cautious", allied: false, fate: "命途未定" }),
    ...updates,
  };
}

function initializeP2NpcStates() {
  for (const npc of CORE_NPCS) {
    const result = evaluateNpcAlliance({
      npcId: npc.id,
      confirmedIntelIds: confirmedIntelIds(),
      buildId: state.buildId,
      p1Companion: state.companionOffer?.accepted ? state.companion : null,
      p1Choice: state.mineChoice,
      archiveChoice: state.archiveChoice,
      year5Choice: state.year5Choice,
    });
    if (result.allied || !state.npcStates[npc.id]?.allied) {
      updateNpcState(npc.id, {
        allied: result.allied,
        state: result.state,
        reason: result.reason,
      });
    }
  }
}

function refreshBuildSynergies() {
  state.buildSynergies = deriveBuildSynergies({
    buildId: state.buildId,
    openingTraitIds: Object.values(state.openingSelected || {}),
    acquiredTraitIds: state.acquiredTraits || [],
    confirmedIntelIds: confirmedIntelIds(),
    alliedNpcIds: alliedNpcIds(),
  });
}

function establishRealityAnchor(screen) {
  state.realityAnchor = createRealityAnchor(state, screen);
}

function triggerOpening(group) {
  const trait = openingTraitForGroup(group);
  if (!trait || state.triggeredOpeningTraits.includes(trait.id)) return null;
  state.triggeredOpeningTraits.push(trait.id);
  track("opening_trait_triggered", { trait: trait.id });
  return { name: trait.name, text: trait.trigger };
}

function modeForScreen(screen) {
  if ([
    "sim1Morning",
    "sim1Eve",
    "sim1Feast",
    "sim2Feast",
    "sim2Road",
    "companionResult",
    "mineApproach",
    "mineInvestigation",
    "mineBattle",
    "mineAftermath",
  ].includes(screen)) {
    return "simulation";
  }
  if (["deathRecap", "realityDeath", "omen", "mineDefeat", "p2RealityDeath", "finale"].includes(screen)) return "death";
  if (["settlement", "traitDraw", "mineReturn"].includes(screen)) return "settlement";
  if ([
    "realityHub",
    "realityReturn",
    "realityPlan",
    "realityResolution",
    "p1RealityPlan",
    "ending",
    "p2Interlude",
    "buildChoice",
    "year1Approach",
    "year1Archive",
    "year1Resolution",
    "year5Hub",
    "year5Crisis",
    "blackSunPrep",
    "finalSummary",
    "cycleOpening",
  ].includes(screen)) {
    return "reality";
  }
  return "neutral";
}

function modeLabel() {
  const map = {
    realityHub: "现实 · 太虚元年三月初三",
    realityReturn: "现实 · 锚点未动",
    realityPlan: "现实 · 第七日酉时前",
    realityResolution: "现实 · 第七日晚宴",
    sim1Morning: "第 1 次模拟 · 第三日",
    sim1Eve: "第 1 次模拟 · 第六日",
    sim1Feast: "第 1 次模拟 · 第七日晚宴",
    deathRecap: "第 1 次模拟 · 此命已尽",
    settlement: "命盘结算 · 第 1 世",
    traitDraw: "命痕显化 · 第 1 世",
    sim2Feast: "第 2 次模拟 · 第七日",
    sim2Road: "第 2 次模拟 · 第三月",
    companionResult: "第 2 次模拟 · 同伴回应",
    mineApproach: "第 2 次模拟 · 乌铜矿入口",
    mineInvestigation: "第 2 次模拟 · 矿底封井层",
    mineBattle: "第 2 次模拟 · 守核傀儡",
    mineDefeat: "第 2 次模拟 · 矿底死亡",
    mineAftermath: "第 2 次模拟 · 日核近前",
    mineReturn: "命盘结算 · 第 2 世",
    p1RealityPlan: "现实 · 第三月矿难前",
    realityDeath: "现实 · 命途断绝",
    ending: "现实 · 乌铜矿余波",
    p2Interlude: "命盘深处 · 七年因果",
    buildChoice: "现实 · 第一年前",
    year1Approach: "现实 · 第一年冬",
    year1Archive: "现实 · 建宗密库",
    p2RealityDeath: "现实 · 命途断绝",
    year1Resolution: "现实 · 第一锚点已改写",
    year5Hub: "现实 · 第五年秋",
    year5Crisis: "现实 · 护山阵争夺",
    blackSunPrep: "现实 · 第七年蚀日前",
    finale: "现实 · 黑日终局",
    finalSummary: "太虚七年 · 尘埃落定",
    cycleOpening: `第 ${state.cycle || 2} 世 · 命痕继承`,
  };
  return map[state.screen] || "太虚命盘";
}

function rarityClass(rarity) {
  return `rarity-${rarity}`;
}

function rarityLabel(rarity) {
  return RARITY[rarity]?.label || rarity;
}

function setupShell(content, { narrow = false } = {}) {
  return `
    <main class="setup-shell">
      <section class="setup-card ${narrow ? "narrow" : ""}">
        ${content}
      </section>
    </main>
  `;
}

function avatarHtml(size = "small") {
  const appearance = getAppearance(state.character.appearance) || APPEARANCES[0];
  const name = state.character.name || "无名";
  return `
    <div
      class="avatar-${size}"
      style="--avatar-accent:${appearance.accent}"
      data-mark="${escapeHtml(appearance.mark)}"
      aria-label="${escapeHtml(name)}的命笺剪影"
    >${escapeHtml(name.slice(0, 1))}</div>
  `;
}

function traitCardHtml(trait, { selected = false, action = null, group = null, revealed = false, index = 0 } = {}) {
  const actionAttrs = action
    ? `data-action="${action}" data-id="${trait.id}" ${group ? `data-group="${group}"` : ""}`
    : "";
  const tagHtml = (trait.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("");
  const source = trait.source
    ? `<p class="trait-source">来自：${escapeHtml(trait.source)}</p>`
    : `<p class="trait-cost"><strong>代价</strong> · ${escapeHtml(trait.cost)}</p>`;
  return `
    <button
      type="button"
      class="trait-card ${rarityClass(trait.rarity)} ${selected ? "selected" : ""} ${revealed ? "revealed" : ""}"
      style="--delay:${index * 110}ms"
      ${actionAttrs}
    >
      <span class="trait-topline">
        <span class="trait-name">${escapeHtml(trait.name)}</span>
        <span class="rarity-badge">${rarityLabel(trait.rarity)}色</span>
      </span>
      <p class="trait-effect">${escapeHtml(trait.effect)}</p>
      ${source}
      <span class="tag-row">${tagHtml}</span>
    </button>
  `;
}

function actionCard({ action, value = "", title, description, source = "", meta = "", kind = "", disabled = false }) {
  return `
    <button
      type="button"
      class="action-card ${kind}"
      data-action="${action}"
      data-value="${escapeHtml(value)}"
      ${disabled ? "disabled" : ""}
    >
      <span>
        <span class="action-title">${source ? `<span class="action-source">${escapeHtml(source)}</span>` : ""}${title}</span>
        <span class="action-description">${description}</span>
      </span>
      <span class="action-meta">${meta}</span>
    </button>
  `;
}

function timelineHtml() {
  const feastStatus = state.timeline.feast;
  const mineStatus = state.timeline.mine;
  const archiveStatus = state.timeline.archive;
  const siegeStatus = state.timeline.siege;
  const feast = feastStatus === "shifted"
    ? ["第七日 · 晚宴", "已偏转：原定死因被越过", "shifted"]
    : feastStatus === "death"
      ? ["第七日 · 晚宴", "模拟死亡：中毒后遭补刀", "death"]
      : feastStatus === "known"
        ? ["第七日 · 晚宴", "已知危机：井水投毒", "current"]
        : ["第七日 · 晚宴", "酉时后将发生什么？", ""];
  const mine = mineStatus === "shifted"
    ? ["第三月 · 乌铜矿", "已偏转：旧确证开始过期", "shifted"]
    : mineStatus === "revealed"
    ? ["第三月 · 乌铜矿", "日核异象：新因果显露", "current"]
    : mineStatus === "approaching"
      ? ["第三月 · 乌铜矿", "新的未来正在逼近", "current"]
      : ["第三月 · 乌铜矿", "一场尚未发生的矿难", ""];
  const archive = archiveStatus === "shifted"
    ? ["第一年冬 · 旧档案", "已确认：宗门以弟子寿元续阵", "shifted"]
    : archiveStatus === "approaching"
      ? ["第一年冬 · 旧档案", "建宗密库即将封死", "current"]
      : ["第一年冬 · 旧档案", "闻青禾原定在此后失踪", ""];
  const siege = siegeStatus === "shifted"
    ? ["第五年秋 · 祭阵准备", "已偏转：护山阵外环被改写", "shifted"]
    : siegeStatus === "approaching"
      ? ["第五年秋 · 祭阵准备", "赤霞宗攻山，祭阵开始蓄力", "current"]
      : ["第五年秋 · 祭阵准备", "敌宗与内应都在等待日核", ""];
  const blackSun = state.timeline.blackSun === "resolved"
    ? ["第七年 · 黑日", "终局已定", "shifted"]
    : state.timeline.blackSun === "current"
      ? ["第七年 · 黑日", "护山阵正在反转", "death"]
      : ["第七年 · 黑日", "归尘门上下无一生还", ""];
  const revealedItems = [feast];
  if (mineStatus !== "hidden") revealedItems.push(mine);
  if (archiveStatus !== "hidden") revealedItems.push(archive);
  if (siegeStatus !== "hidden") revealedItems.push(siege);
  revealedItems.push(blackSun);
  return `
    <div class="panel-title">命途时间线</div>
    <div class="timeline-list">
      ${timelineItem("现实锚点", state.timeline.feast === "shifted" ? "晚宴后的新现实" : "太虚元年三月初三", "current")}
      ${revealedItems.map((item) => timelineItem(...item)).join("")}
    </div>
  `;
}

function timelineItem(title, description, status = "") {
  return `
    <div class="timeline-item ${status}">
      <span class="timeline-dot" aria-hidden="true"></span>
      <span><h4>${title}</h4><p>${description}</p></span>
    </div>
  `;
}

function characterPanelHtml() {
  const origin = getOrigin(state.character.origin);
  const opening = selectedOpeningTraits();
  const acquired = state.acquiredTraits.map(getSettlementTrait).filter(Boolean);
  const reward = state.reward;
  return `
    <div class="panel-body">
      <div>
        <div class="character-head">
          ${avatarHtml("small")}
          <div>
            <h3>${escapeHtml(state.character.name || "无名")}</h3>
            <p>${escapeHtml(origin?.name || "尚未定出身")} · 外门抄经弟子</p>
          </div>
        </div>
        <div class="panel-title">先天命签</div>
        <div class="compact-traits">
          ${opening.map(compactTraitHtml).join("")}
        </div>
      </div>
      <div>
        <div class="panel-title">本世带回</div>
        ${reward ? rewardHtml(reward) : `<p class="empty-state">命盘尚未留下现实成果。</p>`}
        ${acquired.length ? `<div class="panel-title" style="margin-top:18px">后天命痕</div>${acquired.map(compactTraitHtml).join("")}` : ""}
      </div>
      <div>
        <div class="panel-title">已知线索</div>
        <div class="clue-list">
          ${state.clues.length
            ? state.clues.slice(-4).map((clue) => `<div class="clue-item"><strong>命盘记录</strong><span>${escapeHtml(clue)}</span></div>`).join("")
            : `<p class="empty-state">未知仍多于已知。</p>`}
        </div>
        ${state.intel?.length ? `
          <div class="panel-title" style="margin-top:18px">因果情报</div>
          <div class="intel-list">${state.intel.slice(-4).map(intelCardHtml).join("")}</div>
        ` : ""}
        ${state.buildId ? `
          <div class="panel-title" style="margin-top:18px">修行路数</div>
          <div class="reward-item"><strong>${escapeHtml(getBuildPath(state.buildId)?.name)}</strong><span>${escapeHtml(getBuildPath(state.buildId)?.effect)}</span></div>
        ` : ""}
        ${state.p2Path?.length ? `
          <div class="panel-title" style="margin-top:18px">核心人物</div>
          <div class="npc-mini-list">${CORE_NPCS.map(npcMiniHtml).join("")}</div>
        ` : ""}
      </div>
    </div>
  `;
}

function npcMiniHtml(npc) {
  const npcState = state.npcStates?.[npc.id] || {};
  const label = npcState.allied ? "同行" : npcState.state === "hostile" ? "对立" : npcState.state === "captive" ? "受困" : "观望";
  return `<div class="npc-mini ${npcState.allied ? "allied" : ""}"><strong>${escapeHtml(npc.name)}</strong><span>${escapeHtml(label)} · ${escapeHtml(npcState.fate || npc.motive)}</span></div>`;
}

function intelCardHtml(record) {
  const level = INTEL_LEVELS[record.status] || INTEL_LEVELS.rumor;
  return `
    <div class="intel-card intel-${record.status}">
      <span class="intel-level">${escapeHtml(level.label)}</span>
      <strong>${escapeHtml(record.title)}</strong>
      <span>${escapeHtml(record.detail)}</span>
    </div>
  `;
}

function intelBoardHtml() {
  if (!state.intel?.length) return `<p class="empty-state">命盘尚未记录可分级的因果情报。</p>`;
  return `
    <div class="intel-board">
      ${state.intel.map((record) => `
        <article class="intel-row intel-${record.status}">
          <div><span class="intel-level">${escapeHtml(INTEL_LEVELS[record.status]?.label || record.status)}</span><strong>${escapeHtml(record.title)}</strong></div>
          <p>${escapeHtml(record.detail)}</p>
          <small>来源：${escapeHtml(record.source)}</small>
        </article>
      `).join("")}
    </div>
  `;
}

function compactTraitHtml(trait) {
  return `
    <div class="compact-trait ${rarityClass(trait.rarity)}">
      <strong>${escapeHtml(trait.name)}</strong>
      <span>${escapeHtml(trait.effect)}</span>
    </div>
  `;
}

function rewardHtml(reward) {
  return `
    <div class="reward-item">
      <strong>${escapeHtml(reward.name)}</strong>
      <span>${escapeHtml(reward.description)}</span>
    </div>
  `;
}

function gameShell(sceneHtml) {
  return `
    <main class="game-shell">
      <header class="topbar">
        <div class="brand-mini"><span class="brand-seal">命</span><span>太虚命盘</span></div>
        <div class="mode-badge">${modeLabel()}</div>
        <div class="resource-row">
          <div class="resource"><span>命火</span><strong>${state.flames}</strong></div>
          ${state.envy > 0 ? `<div class="resource"><span>天妒</span><strong>${state.envy}</strong></div>` : ""}
          ${state.deviation > 0 ? `<div class="resource"><span>偏差</span><strong>${state.deviation}</strong></div>` : ""}
        </div>
      </header>
      <div class="game-grid">
        <aside class="panel timeline-panel">${timelineHtml()}</aside>
        <section class="scene-panel">${sceneHtml}</section>
        <aside class="panel character-panel">${characterPanelHtml()}</aside>
      </div>
    </main>
  `;
}

function sceneHeader(eyebrow, title, subtitle = "") {
  return `
    <header class="scene-head">
      <p class="eyebrow">${eyebrow}</p>
      <h1 class="scene-title">${title}</h1>
      ${subtitle ? `<p class="scene-subtitle">${subtitle}</p>` : ""}
    </header>
  `;
}

function renderLanding() {
  const hasSave = Boolean(savedState && savedState.screen !== "landing");
  return setupShell(`
    <div class="title-lockup">
      <div class="fate-ring"><span class="fate-glyph">命</span></div>
      <p class="eyebrow">大虞北境 · 照夜山</p>
      <h1>太虚命盘</h1>
      <p class="subtitle">春雨封山，归尘门再开山门。<br />你是今日入籍的外门弟子之一。</p>
      <div class="button-row">
        <button class="primary-button" data-action="new-game">翻开山门旧事</button>
        ${hasSave ? `<button class="secondary-button" data-action="continue-game">续读 · ${escapeHtml(savedState.character?.name || "无名弟子")}</button>` : ""}
      </div>
    </div>
  `, { narrow: true });
}

function renderWorldIntro() {
  return setupShell(`
    <p class="eyebrow">入山之前 · 你所知道的世道</p>
    <h1 class="setup-title">凡人仰望仙山，仙门俯看人间</h1>
    <div class="world-ledger">
      <article class="world-fact"><span>大虞</span><h2>山河由朝廷与仙门共治</h2><p>凡人缴纳田税，仙门镇守妖祟。若测出灵根，便有机会用一生换一条长生路。</p></article>
      <article class="world-fact"><span>归尘门</span><h2>照夜山上的小宗门</h2><p>门中不过数百人，护着山下三镇。它不以剑法闻名，却从未让山外邪祟越过山门。</p></article>
      <article class="world-fact"><span>外门弟子</span><h2>最靠近仙途，也最无足轻重</h2><p>新弟子先抄经、挑水、服矿役，百日后才授引气诀。能留下姓名，才算真正入门。</p></article>
    </div>
    <div class="event-docket"><span>今日</span><strong>太虚元年 · 三月初三</strong><p>春试最后一日。掌簿执事摊开入籍簿，等你写下自己的名字。</p></div>
    <div class="button-row"><button class="ghost-button" data-action="back-landing">合上旧事</button><button class="primary-button" data-action="to-creator">填写外门名牒</button></div>
  `);
}

function renderCreator() {
  const originCards = ORIGINS.map((origin) => `
    <button class="origin-card ${state.character.origin === origin.id ? "selected" : ""}" data-action="select-origin" data-value="${origin.id}">
      <span class="origin-head"><span class="origin-icon">${origin.icon}</span><strong>${origin.name}</strong></span>
      <p>${origin.description}</p>
    </button>
  `).join("");
  const appearanceCards = APPEARANCES.map((appearance) => `
    <button class="appearance-card ${state.character.appearance === appearance.id ? "selected" : ""}" data-action="select-appearance" data-value="${appearance.id}">
      <span class="appearance-head"><span class="appearance-swatch" style="color:${appearance.accent};border-color:${appearance.accent}">${appearance.mark}</span><strong>${appearance.name}</strong></span>
      <p>身份玉牌落印时映出的灵光</p>
    </button>
  `).join("");
  const pronouns = PRONOUNS.map((item) => `
    <button class="select-tile ${state.character.pronoun === item.id ? "selected" : ""}" data-action="select-pronoun" data-value="${item.id}">
      <strong>${item.name}</strong><p>同门如何称呼你</p>
    </button>
  `).join("");
  const canContinue = Boolean(state.character.name.trim() && state.character.origin && state.character.appearance);
  return setupShell(`
    <p class="eyebrow">归尘门 · 外门入籍簿</p>
    <h1 class="setup-title">请留下你的名牒</h1>
    <p class="subtitle" style="margin:0;text-align:left">这张薄纸将决定同门怎样称呼你、你从何处来，以及身份玉牌上会留下什么印色。</p>

    <div class="form-section">
      <div class="section-label"><strong>姓名</strong><span>1～8 个汉字或字符</span></div>
      <div class="text-field">
        <label for="character-name">写入命盘的名字</label>
        <input id="character-name" maxlength="8" autocomplete="off" value="${escapeHtml(state.character.name)}" placeholder="例如：沈砚" data-field="name" />
      </div>
    </div>

    <div class="form-section">
      <div class="section-label"><strong>称谓</strong><span>写入同门名册</span></div>
      <div class="option-grid">${pronouns}</div>
    </div>

    <div class="form-section">
      <div class="section-label"><strong>凡俗出身</strong><span>入山前赖以谋生的本事</span></div>
      <div class="option-grid">${originCards}</div>
    </div>

    <div class="form-section">
      <div class="section-label"><strong>玉牌印色</strong><span>灵光会随你一同入门</span></div>
      <div class="option-grid">${appearanceCards}</div>
    </div>

    <div class="button-row">
      <button class="ghost-button" data-action="back-world">返回山门简牍</button>
      <button class="primary-button" data-action="to-traits" data-role="creator-continue" ${canContinue ? "" : "disabled"}>到照骨镜前验身</button>
    </div>
  `);
}

function renderOpeningTraits() {
  const groups = state.openingSets.map((set) => {
    const [label, description] = GROUP_LABELS[set.group];
    return `
      <section class="trait-group">
        <div class="trait-group-head"><h3>${label}</h3><span>${description}</span></div>
        <div class="trait-pair">
          ${traitCardHtml(set.choices[0], { selected: state.openingSelected[set.group] === set.choices[0].id, action: "select-opening-trait", group: set.group })}
          <span class="or-mark">或</span>
          ${traitCardHtml(set.choices[1], { selected: state.openingSelected[set.group] === set.choices[1].id, action: "select-opening-trait", group: set.group })}
        </div>
      </section>
    `;
  }).join("");
  const complete = Object.keys(state.openingSelected).length === 3;
  return setupShell(`
    <p class="eyebrow">山门春试 · 照骨镜</p>
    <h1 class="setup-title">镜中六签，只许各取其一</h1>
    <p class="subtitle" style="margin:0;text-align:left">镜光依次照见你的根骨、才性与因果。每一份天赋都带着自己的代价。</p>
    <div class="trait-groups">${groups}</div>

    ${state.rerollConfirm ? `
      <div class="inline-confirm">
        <p><strong>舍弃眼前六签？</strong><br><span>将整组重抽，旧结果不可恢复。</span></p>
        <div><button class="text-button" data-action="cancel-reroll">取消</button><button class="secondary-button" data-action="confirm-reroll">确认重抽</button></div>
      </div>
    ` : ""}

    <div class="button-row">
      <button class="ghost-button" data-action="request-reroll" ${state.rerollUsed ? "disabled" : ""}>重掷六签 · ${state.rerollUsed ? "已用尽" : "1/1"}</button>
      <button class="primary-button" data-action="to-birth-sheet" ${complete ? "" : "disabled"}>收下三签，封入玉牌</button>
    </div>
  `);
}

function renderBirthSheet() {
  const origin = getOrigin(state.character.origin);
  const appearance = getAppearance(state.character.appearance);
  const mortalTie = {
    herbalist: "山下药田仍欠着一季春税",
    hunter: "旧猎弓留在山门外的松树下",
    scholar: "落第文章还压在行囊最底层",
    caravan: "失散商队的下落至今不明",
  }[state.character.origin];
  return setupShell(`
    <p class="eyebrow">归尘门 · 外门名牒</p>
    <h1 class="setup-title">从今日起，山门记得你的名字</h1>
    <div class="birth-sheet">
      <div>${avatarHtml("large")}</div>
      <div class="birth-details">
        <h2>${escapeHtml(state.character.name)}</h2>
        <p class="birth-meta">${escapeHtml(origin.name)} · ${escapeHtml(appearance.name)}印</p>
        <div class="birth-facts">
          <div><span>身份</span><strong>归尘门外门新弟子</strong></div>
          <div><span>境界</span><strong>凡身 · 尚未引气</strong></div>
          <div><span>持有</span><strong>身份玉牌、粗布道袍、抄经一卷</strong></div>
          <div><span>凡俗牵挂</span><strong>${escapeHtml(mortalTie)}</strong></div>
        </div>
        <div class="chosen-traits">
          ${selectedOpeningTraits().map((trait) => `
            <div class="chosen-trait-line ${rarityClass(trait.rarity)}">
              <strong>${escapeHtml(trait.name)}</strong>
              <span>${escapeHtml(trait.effect)} · 代价：${escapeHtml(trait.cost)}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
    <div class="button-row">
      <button class="ghost-button" data-action="back-traits">重新选择</button>
      <button class="primary-button" data-action="confirm-character">确认名牒，入外院</button>
    </div>
  `);
}

function renderArrival() {
  const origin = getOrigin(state.character.origin);
  return setupShell(`
    <p class="eyebrow">太虚元年三月初六 · 黄昏</p>
    <h1 class="setup-title">藏经阁西墙传来一声闷响</h1>
    <div class="event-docket"><span>地点</span><strong>归尘门 · 外院藏经阁</strong><p>入门第三日，你被派来归还虫蛀经卷。春雨打湿窗纸，一页残经忽然被风卷进西墙后的窄缝。</p></div>
    <div class="story-copy"><p>墙后本该是封死的祖师洞。石门却开了一线，冷风里带着陈年香灰味。你的${escapeHtml(origin?.name)}经历告诉你：这阵风不是从山腹里吹出来的。</p></div>
    <div class="action-list">
      ${actionCard({ action: "enter-ancestral-cave", value: "follow", title: "提灯追进石门", description: "那页残经上有你的名字。你想在别人发现前把它取回来。", source: "循迹", meta: "独自入洞", kind: "special" })}
      ${actionCard({ action: "enter-ancestral-cave", value: "inspect", title: "先检查门缝与香灰", description: "不贸然跨过石门，先判断最近是否有人来过。", source: `出身·${escapeHtml(origin?.name)}`, meta: "谨慎查验" })}
      ${actionCard({ action: "enter-ancestral-cave", value: "report", title: "去值房禀报石门异动", description: "按门规行事，却可能让掌簿执事先一步封住现场。", source: "门规", meta: "寻求见证" })}
    </div>
  `);
}

function renderOmen() {
  const entryCopy = {
    follow: "你追着残经跨过石门。纸页落在一面裂开的青铜圆盘上，你的名字正从盘心慢慢渗出。",
    inspect: "香灰只有一层脚印：进洞的人赤足，却没有留下离开的痕迹。你沿脚印找到一面裂开的青铜圆盘。",
    report: "值房无人应门。等你带着巡夜木牌回来，石门已经大开，残经贴在一面裂开的青铜圆盘上。",
  }[state.prologueChoice] || "石门后没有祖师像，只有一面裂开的青铜圆盘。";
  return setupShell(`
    <div class="title-lockup">
      <p class="eyebrow">祖师洞 · 封门已久</p>
      <p class="subtitle">${escapeHtml(entryCopy)}</p>
      <p class="subtitle">指尖碰到盘沿的刹那，春雨声消失了。你从自己的身体里坠下去，一口气越过七年。</p>
      <h1 class="setup-title">黑日悬山</h1>
      <div class="omen-block">太虚七年，护山阵反转。<br />归尘门上下，无一生还。</div>
      <p class="subtitle">你看见裴照雪折剑，闻青禾倒在丹房门前。最后一刻，一轮没有温度的黑日从祖师洞中升起。</p>
      <p class="subtitle">再睁眼，案上那滴墨还没有落下。</p>
      <div class="button-row"><button class="primary-button" data-action="wake-reality">记住这场死，睁眼</button></div>
    </div>
  `, { narrow: true });
}

function renderRealityHub() {
  const inherited = state.cycle > 1 && state.inheritedLegacy;
  return gameShell(`
    ${sceneHeader("现实 · 祖师洞外", "只有你记得七年后的尸山", "现实只过去一息。残破命盘嵌入识海，三点命火在盘面缓慢燃烧。")}
    <div class="story-copy">
      <p>你仍是刚入门三日的外门弟子。若现在冲进议事堂高喊灭门，没有人会相信一个新人的噩梦。</p>
      <div class="quote-block">命盘只给出一句说明：<strong>“试一条命，留一件真。”</strong></div>
      <p>第一次模拟只能推到第七日。那之前，宗门会举行接风晚宴。</p>
      ${inherited ? `<div class="notice-block"><strong>前世遗痕 · ${escapeHtml(state.inheritedLegacy.name)}</strong><br>你不必再从“晚宴是否危险”开始猜；可以直接验证换水时序与旧印。</div>` : ""}
    </div>
    <div class="action-list">
      ${inherited ? actionCard({ action: "start-sim1-informed", title: "沿前世遗痕直达晚宴前夜", description: "越过已经看清的晨间琐事，直接从酉时换水与名册旧印切入。", source: "前世遗痕", meta: "命火 3 → 2", kind: "special" }) : ""}
      ${actionCard({ action: "start-sim1", title: "燃起 1 点命火，试命至第七日", description: "即使死在推演之中，你仍会带着一项所得醒来。", source: "太虚命盘", meta: "命火 3 → 2", kind: "special" })}
    </div>
  `);
}

function renderTriggerBlocks() {
  return state.latestTriggers.map((trigger) => `
    <div class="trigger-block"><span class="trigger-label">先天命签 · ${escapeHtml(trigger.name)}</span>${escapeHtml(trigger.text)}</div>
  `).join("");
}

function renderSim1Morning() {
  const originAction = originMorningAction();
  return gameShell(`
    ${sceneHeader("第 1 次模拟 · 第三日", "你决定先把这条命用在哪里", "第七日晚宴之前，你只有两次完整行动机会。")}
    <div class="story-copy">
      <p>晨钟过后，外院恢复了寻常喧闹。井边有人打水，丹房正在清点晚宴药材，演武坪则有空位可供吐纳。</p>
      <p>你知道七年后的结局，却不知道七日后会发生什么。</p>
    </div>
    <div class="action-list">
      ${actionCard({ action: "sim-morning", value: "well", title: "检查外院水井", description: "观察井绳、水痕和来往杂役。", source: "调查", meta: "半日 · 风险低" })}
      ${actionCard({ action: "sim-morning", value: "dan", title: "去丹房帮闻青禾清点药材", description: "接近毒理线索，并建立一段早期关系。", source: "关系", meta: "半日 · 风险低" })}
      ${actionCard({ action: "sim-morning", value: "train", title: "在演武坪打磨引气诀", description: "为未知危险准备最直接的自保手段。", source: "修炼", meta: "一日 · 错过井边动静" })}
      ${actionCard({ action: "sim-morning", value: `origin-${state.character.origin}`, title: originAction.title, description: originAction.description, source: `出身·${getOrigin(state.character.origin)?.name}`, meta: originAction.meta, kind: "special" })}
    </div>
  `);
}

function originMorningAction() {
  return {
    herbalist: { title: "闻一遍晚宴将用的药材与井水", description: "用药农经验寻找气味相冲之处。", meta: "半日 · 毒理线索" },
    hunter: { title: "沿井边泥地辨认夜间足迹", description: "找出不属于外院杂役的来路。", meta: "半日 · 动线线索" },
    scholar: { title: "借抄经之便查阅夜班名册", description: "比对字迹、纸张和临时换班记录。", meta: "半日 · 文书线索" },
    caravan: { title: "向山下送货人打听近日药价", description: "从异常收购中倒查谁在备毒。", meta: "半日 · 黑市线索" },
  }[state.character.origin] || { title: "沿外院走访一圈", description: "用凡俗经验寻找不协调之处。", meta: "半日 · 调查" };
}

function morningResultCopy() {
  const map = {
    well: "你在井栏上发现了新磨损，却还无法判断它来自哪一天。水面映着自己，平静得令人不安。",
    dan: "闻青禾让你把乌舌草单独入柜。她说这药不致死，只会让人四肢失力。",
    train: "你把引气诀运转了整整九周天。修为没有突破，但经脉记住了逆行灵息时的刺痛。",
    "origin-herbalist": "你在井水之外闻到极淡的乌舌草气味。它尚未入水，更像有人提前试过药量。",
    "origin-hunter": "井边有一双刻意倒着走的脚印。来人想让追踪者误判他的离开方向。",
    "origin-scholar": "夜班名册的最后一行墨色更新，换班批注却用了内门议事堂的青檀纸。",
    "origin-caravan": "送货人说乌舌草三日前忽然涨价，有人拿归尘门旧印一次扫空了库存。",
  };
  return map[state.morningChoice] || "你度过了半日。";
}

function renderSim1Eve() {
  return gameShell(`
    ${sceneHeader("第 1 次模拟 · 第六日", "晚宴前夜，有人不想让你看见明天", "你已经做出第一步。现在要决定如何度过酉时。")}
    <div class="story-copy">
      <p>${morningResultCopy()}</p>
      ${renderTriggerBlocks()}
      <p>傍晚，夜班名册忽然换了人。一个平日负责柴房的杂役接过水桶，低头避开所有人的目光。</p>
    </div>
    <div class="action-list">
      ${actionCard({ action: "sim-eve", value: "watch", title: "独自守在井边暗处", description: "不惊动任何人，观察酉时后的人员动线。", source: "隐匿", meta: "一夜 · 风险中" })}
      ${actionCard({ action: "sim-eve", value: "ask", title: "请闻青禾提前验水", description: "借丹房关系查毒，但可能打草惊蛇。", source: "毒理", meta: "一刻 · 风险中" })}
      ${actionCard({ action: "sim-eve", value: "prepare", title: "继续吐纳，准备晚宴应变", description: "放弃调查，确保毒发时还能多行动一刻。", source: "修炼", meta: "一夜 · 情报缺失" })}
    </div>
  `);
}

function eveResultCopy() {
  const map = {
    watch: "你守到酉时，看见那名杂役推来一只没有归尘门印记的水桶。墙外还有第二个人接应。",
    ask: "闻青禾只来得及确认井水在酉时前无毒。等她取来验毒针，水面已经恢复平静。",
    prepare: "你将灵息压入丹田，反复练习逆转周天。窗外有人推桶经过，你没有起身。",
  };
  return map[state.eveChoice] || "夜色压低了外院的屋檐。";
}

function renderSim1Feast() {
  return gameShell(`
    ${sceneHeader("第 1 次模拟 · 第七日晚宴", "杯中水清得没有一丝异样", "百余名外门弟子举杯，执事在堂前宣读新入门名册。")}
    <div class="story-copy">
      <p>${eveResultCopy()}</p>
      ${renderTriggerBlocks()}
      <p>第一口水入喉，丹田忽然一沉。不是杀人的剧毒——它只想让所有人失去行动能力。</p>
    </div>
    <div class="action-list">
      ${actionCard({ action: "sim-feast", value: "drink", title: "继续饮下，观察毒性完整发作", description: "主动用这一命确认药性和袭击时机。", source: "高风险试探", meta: "必死风险 · 情报更多", kind: "danger" })}
      ${actionCard({ action: "sim-feast", value: "warn", title: "掀桌示警，护住身边弟子", description: "让更多人保持警觉，但立刻暴露自己。", source: "守护", meta: "必死风险 · 关系标签", kind: "danger" })}
      ${actionCard({ action: "sim-feast", value: "feign", title: "佯装毒发，盯住入门名册", description: "放弃反抗，等真正的杀手靠近。", source: "欺瞒", meta: "必死风险 · 真相更多", kind: "danger" })}
    </div>
  `);
}

function renderDeathRecap() {
  const extra = state.eveChoice === "watch"
    ? "你亲眼看见：酉时有人换入一桶外来井水。"
    : state.eveChoice === "ask"
      ? "闻青禾确认：酉时前井水仍然无毒。"
      : "你确认乌舌草只负责让人失去行动。";
  return gameShell(`
    ${sceneHeader("第 1 次模拟 · 此命已尽", "你不是被毒死的", "短刃刺进心脉之前，你终于看清杀手并非无差别屠戮。")}
    <div class="story-copy">${renderTriggerBlocks()}</div>
    <div class="death-cause"><span>直接死因</span><strong>失去行动能力后，被蒙面人以短刃刺中心脉</strong></div>
    <div class="cause-chain">
      <div class="cause-node"><span class="cause-status">亲历</span><span>酉时前，外院井水仍无明显异常</span></div>
      <div class="cause-node"><span class="cause-status">本世发现</span><span>${escapeHtml(extra)}</span></div>
      <div class="cause-node"><span class="cause-status">新确认</span><span>蒙面人拿着名册，只补杀接触过祖师洞异象的人</span></div>
      <div class="cause-node unknown"><span class="cause-status">仍未知</span><span>是谁下令灭口？晚宴与七年后的黑日有何关系？</span></div>
    </div>
    <div class="notice-block"><strong>下一次可改变：</strong>提前盯井、压制毒性、追查药材，或故意等补刀者靠近。</div>
    <div class="button-row"><button class="primary-button" data-action="to-settlement">收束此命，进入结算</button></div>
  `);
}

function renderSettlement() {
  const pending = state.pendingSettlement;
  const poolTags = state.actionTags.filter((tag) => ["poison", "observe", "survival", "protect", "deceive"].includes(tag));
  return gameShell(`
    ${sceneHeader(`第 1 世结算 · ${state.rating}等`, "这一生，只能带回一件东西", "确定所得能解眼前之急，未知命痕会改变往后的路。三者只能取一。")}
    <div class="settlement-grid">
      <button class="settlement-card" data-action="choose-settlement" data-value="dao">
        <span class="settlement-type">道行 · 完全可见</span>
        <h3>灵息逆转</h3>
        <p>毒发时强行逆行周天，可压制毒素三个行动阶段，并保留一次反击。</p>
        <div class="settlement-facts"><span>现实用途：饮毒作饵、正面反杀</span><span>代价：天妒 +1</span></div>
      </button>
      <button class="settlement-card" data-action="choose-settlement" data-value="certainty">
        <span class="settlement-type">确证 · 完全可见</span>
        <h3>酉时换水</h3>
        <p>确认晚宴井水在酉时被外来水桶替换，可提前蹲守、验毒或截人。</p>
        <div class="settlement-facts"><span>现实用途：蹲守外院水井</span><span>代价：不增加战力</span></div>
      </button>
      <button class="settlement-card" data-action="choose-settlement" data-value="trait">
        <span class="settlement-type">命痕 · 候选未知</span>
        <h3>${state.rating}等抽取</h3>
        <p>放弃道行与确证，让此世的“${poolTags.map(tagName).join("、")}”经历凝成三枚命痕，再择一枚带回。</p>
        <div class="settlement-facts"><span>规格：3 抽 1 · 至少一枚蓝色</span><span>代价：结果未知</span></div>
      </button>
    </div>
    ${pending ? `
      <div class="inline-confirm">
        <p><strong>${pending === "trait" ? "凝结本世命痕？" : "带回这项成果？"}</strong><br><span>${settlementConfirmText(pending)}</span></p>
        <div><button class="text-button" data-action="cancel-settlement">再想想</button><button class="primary-button" data-action="confirm-settlement">确认，其他皆舍</button></div>
      </div>
    ` : ""}
  `);
}

function settlementConfirmText(type) {
  if (type === "dao") return "你将失去「酉时换水」与本次命痕显化。";
  if (type === "certainty") return "你将失去「灵息逆转」与本次命痕显化。";
  return "你将放弃「灵息逆转」与「酉时换水」，候选显化后不可改回。";
}

function renderTraitDraw() {
  return gameShell(`
    ${sceneHeader(`命痕显化 · ${state.rating}等`, "你舍弃了答案，留下这一世如何活过", "候选来自真实行为。只能取一枚，其余随本世消散。")}
    <div class="draw-stage">
      <div class="draw-tags">${["中毒", "观察", "求生"].map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
      <div class="draw-grid">
        ${state.settlementCandidates.map((trait, index) => traitCardHtml(trait, { action: "take-trait", revealed: true, index })).join("")}
      </div>
      <p class="screen-note">三枚命痕只能留下一枚；其余将随这段未来一同散去。</p>
    </div>
  `);
}

function renderRealityReturn() {
  return gameShell(`
    ${sceneHeader("现实 · 墨滴尚未落下", "你从死亡中睁眼", "心脉完好，晚宴尚有四日。只有带回的那一件成果变成了现实。")}
    <div class="story-copy">
      <div class="ghost-memory">短刃刺入心脉的触感仍在。蒙面人低头核对名册，袖口有一道赤线。</div>
      <div class="notice-block"><strong>本世带回 · ${escapeHtml(state.reward.name)}</strong><br>${escapeHtml(state.reward.description)}</div>
      <p>命盘上的第一次死亡凝成墨点。你没有自动获胜——接下来必须亲手把这项成果用在第七日。</p>
    </div>
    <div class="action-list">
      ${actionCard({ action: "go-reality-plan", title: "推进到第七日酉时前", description: "现实行动会真正改变时间线。现实死亡将结束当前命途。", source: "现实行动", meta: "四日 · 不可撤回", kind: "special" })}
    </div>
  `);
}

function specialRealityAction() {
  if (state.reward.type === "dao") {
    return {
      value: "special",
      source: "道行·灵息逆转",
      title: "饮毒作饵，压住毒性等杀手靠近",
      description: "让对方以为名单已经清空，再保留一次反击。",
      meta: "高风险 · 腰牌线索",
    };
  }
  if (state.reward.type === "certainty") {
    return {
      value: "special",
      source: "确证·酉时换水",
      title: "提前蹲守水井，截住换水杂役",
      description: "在毒水进入外院前抓人，并追问他为何下手。",
      meta: "风险中 · 人质线索",
    };
  }
  const trait = getSettlementTrait(state.reward.id);
  const byRoute = {
    bait: ["故意饮水，拖延毒发后尾随杀手", "用延后的毒性换取完整接头路线。", "高风险 · 接头线索"],
    observe: ["藏上梁木，等名册与补刀者同时出现", "不碰井水，专门看清谁在核对死亡名单。", "风险中 · 名册线索"],
    trace: ["从乌舌草药性反查山下供货人", "在晚宴前截断药材线，并追到白石镇黑市。", "风险低 · 黑市线索"],
    protect: ["守在闻青禾身边，替她挡下补刀", "让本该倒下的人保持清醒，共同抓住袭击者。", "高风险 · 关系线索"],
  };
  const chosen = byRoute[trait?.route] || byRoute.observe;
  return { value: "special", source: `后天·${trait?.name || "命痕"}`, title: chosen[0], description: chosen[1], meta: chosen[2] };
}

function renderRealityPlan() {
  const special = specialRealityAction();
  return gameShell(`
    ${sceneHeader("现实 · 第七日酉时前", "同一个晚宴，这次你先落子", "上一世的水痕、毒发和短刃都尚未发生。")}
    <div class="story-copy">
      <div class="ghost-memory">这里曾是你的死地。井栏、长桌和窗棂的位置，一寸都没有变。</div>
      <p>你可以使用带回成果，也可以选择更安全但失去线索的办法。若直接上报而证据不足，幕后者可能立即改变计划。</p>
    </div>
    <div class="action-list">
      ${actionCard({ action: "reality-action", value: special.value, title: special.title, description: special.description, source: special.source, meta: special.meta, kind: "special" })}
      ${actionCard({ action: "reality-action", value: "swap", title: "趁无人时偷偷换掉井水", description: "能救下外院，却会让下毒者和幕后接头人消失。", source: "通用破法", meta: "风险低 · 线索较少" })}
      ${actionCard({ action: "reality-action", value: "report", title: "直接上报宋无咎，要求封锁晚宴", description: "你没有足够证据。若判断错误，现实里没有结算可救你。", source: "现实冒险", meta: "风险极高 · 可能死亡", kind: "danger" })}
    </div>
  `);
}

function realOutcomeCopy() {
  if (state.realRoute === "swap") {
    return {
      title: "外院无人中毒，但你只改掉了结果",
      body: "晚宴平安结束。下毒杂役没有出现，蒙面人也从未来过。你救下了所有人，却没能证明自己为何知道井水有问题。",
      clue: "幕后者发现计划失效，已转入未知路线。",
      reaction: "闻青禾看着被换掉的水桶，只问了一句：‘你到底提前看见了什么？’",
    };
  }
  if (state.reward.type === "dao") {
    return {
      title: "毒发如约而至，倒下的人却没有失去反击",
      body: "你任由乌舌草压住四肢，再以灵息逆转强行撑开经脉。补刀者俯身核对名册时，你一掌击碎他的面罩。",
      clue: "赤纹腰牌：袭击者与赤霞宗外堂有关。",
      reaction: "裴照雪按住你的肩：‘你连他何时低头都算好了。告诉我，这不是巧合。’",
    };
  }
  if (state.reward.type === "certainty") {
    return {
      title: "酉时，提桶的人走进了你等候的位置",
      body: "你没有阻止他走近井栏，而是在外来水桶落地时封住退路。那名杂役跪地求饶：他的家人被扣在白石镇。",
      clue: "下毒杂役的家人被囚于白石镇废染坊。",
      reaction: "宋无咎盯着你写下的时辰：‘分毫不差。你从哪里得到这条消息？’",
    };
  }
  const trait = getSettlementTrait(state.reward.id);
  const outcomes = {
    bait: ["毒意慢了一步，你因此跟上了本该看不见的人", "你佯装踉跄离席，借迟发的一刻尾随补刀者，看见他在后山把名册交给一名赤衣道人。", "后山接头人佩有赤霞宗外堂腰牌。", "闻青禾替你切脉后脸色发白：‘这毒早该让你站不起来。’"],
    observe: ["名册翻到你的名字时，你仍藏在梁上", "补刀者在空席前停步，翻开青檀纸名册。你看清页角盖着内门议事堂的暗印。", "灭口名册使用归尘门内门专用青檀纸。", "裴照雪接过你拓下的暗印，第一次没有反驳你。"],
    trace: ["一缕乌舌草余香，把你带到山下黑市", "你没有等晚宴开始，而是循着药性追到白石镇。供货人承认，有人用归尘门旧印一次买走三年份量。", "大量乌舌草由持归尘门旧印者购入。", "闻青禾看着账目沉默良久：‘这个印，只在宗门旧库。’"],
    protect: ["这一世，闻青禾没有倒在丹房门前", "你替她挡下补刀，借护命执念吊住一息。她随即以银针封住袭击者经脉。", "袭击者知道闻青禾兄长失踪的内情。", "闻青禾把染血银针收起：‘你的命不是拿来替我浪费的。下一次，叫上我。’"],
  };
  const chosen = outcomes[trait?.route] || outcomes.observe;
  return { title: chosen[0], body: chosen[1], clue: chosen[2], reaction: chosen[3] };
}

function renderRealityResolution() {
  const outcome = state.realOutcome || realOutcomeCopy();
  return gameShell(`
    ${sceneHeader("现实 · 预知兑现", outcome.title, "原定死因已经偏转。命盘第一次承认：现实可以被改变。")}
    <div class="story-copy">
      <div class="ghost-memory">上一世：你倒在长桌下，蒙面人核对名册后以短刃补刀。</div>
      <p>${escapeHtml(outcome.body)}</p>
      <div class="fate-stamp">预知兑现</div>
      <div class="notice-block"><strong>新确证</strong><br>${escapeHtml(outcome.clue)}</div>
      <p>“${escapeHtml(outcome.reaction)}”</p>
      <p>命盘时间线上，“晚宴投毒”被朱砂划去。更远处，第三月的乌铜矿第一次显出轮廓。</p>
    </div>
    <div class="action-list">
      ${actionCard({ action: "start-sim2", title: "建立新锚点，启动第 2 次模拟", description: "快速越过已掌握的晚宴，追到第三月的新未来。", source: "太虚命盘", meta: `命火 ${state.flames} → ${Math.max(0, state.flames - 1)}`, kind: "special" })}
    </div>
  `);
}

function renderRealityDeath() {
  return gameShell(`
    ${sceneHeader("现实 · 命途断绝", "现实没有结算", "宋无咎要求你拿出证据。消息泄露后，晚宴取消，杀手却在当夜找上了你。")}
    <div class="death-cause"><span>现实死因</span><strong>无证据示警打草惊蛇，当夜遭未知术法灭口</strong></div>
    <div class="notice-block">模拟中的死亡会留下所得；现实中的死亡只会截断命途。幸而命盘在你冒险前钉下了一道回命锚。</div>
    <div class="button-row">
      <button class="primary-button" data-action="retry-reality">读取现实锚点</button>
      <button class="ghost-button" data-action="new-game">重新建立角色</button>
    </div>
  `);
}

function renderSim2Feast() {
  return gameShell(`
    ${sceneHeader("第 2 次模拟 · 第七日", "旧死法仍在这里，却已经不再是谜", "命盘允许你快速处理完全掌握的内容。成果不会替你自动行动。")}
    <div class="story-copy">
      <div class="ghost-memory">第一次模拟：井水投毒 → 四肢失力 → 蒙面人按名册补刀。</div>
      <p>这一世，你已经带着现实里的新安排进入模拟。酉时将至，所有人和物都来到熟悉位置。</p>
    </div>
    <div class="action-list">
      ${actionCard({ action: "fast-forward-feast", title: "按已验证方案处理晚宴", description: "你亲手落下关键一子，其余已经看清的过程由盘面一笔带过。", source: state.reward ? state.reward.name : "已知命途", meta: "数日 → 一刻", kind: "special" })}
    </div>
  `);
}

function renderSim2Road() {
  return gameShell(`
    ${sceneHeader("第 2 次模拟 · 第三月", "旧死因已越过，未来第一次向后展开", "晚宴之后，宗门派人前往乌铜矿处理一次小规模塌方。上一世的你没活到今天。")}
    <div class="fate-stamp">旧死因已越过</div>
    <div class="story-copy">
      <p>矿井任务需要一名同伴。你仍只控制自己；同行者会根据证据、动机和底线决定是否加入，也可能拒绝你的要求。</p>
      <div class="notice-block"><strong>情报不是通行证</strong><br>闻青禾关心失踪者与药毒，裴照雪只接受能证明有人布置矿难的证据。</div>
    </div>
    <div class="action-list">
      ${actionCard({ action: "choose-companion", value: "wen", title: "邀请闻青禾同行", description: "她能辨毒、救人，也会优先寻找失踪兄长的线索。", source: "同伴", meta: "医术 · 关系" })}
      ${actionCard({ action: "choose-companion", value: "pei", title: "请求裴照雪同行", description: "她擅长正面战斗，但不会容忍你无证据指控师门。", source: "同伴", meta: "剑术 · 内门" })}
      ${actionCard({ action: "choose-companion", value: "alone", title: "独自下矿", description: "行动隐秘，出现危险时也无人替你收尾。", source: "独行", meta: "隐匿 · 高风险" })}
    </div>
  `);
}

function renderCompanionResult() {
  const offer = state.companionOffer;
  const companionNames = { wen: "闻青禾", pei: "裴照雪", alone: "独自行动" };
  return gameShell(`
    ${sceneHeader("第 2 次模拟 · 山门石阶", offer?.accepted ? `${companionNames[offer.companion]}答应同行` : `${companionNames[offer?.companion]}拒绝同行`, offer?.accepted ? "对方愿意与你并肩下山，也把自己的底线说在了前面。" : "这份拒绝说明：你还没有拿出足以让对方承担风险的证据。")}
    <div class="story-copy">
      <p>${escapeHtml(offer?.reason || "你决定独自行动。")}</p>
      <div class="notice-block"><strong>同伴底线</strong><br>${escapeHtml(offer?.boundary || "没有同伴援护。")}</div>
      ${!offer?.accepted ? `<p>你把这次拒绝记进命盘，改为独自下矿。日后若带回对应确证，可以重新审视这段关系。</p>` : ""}
    </div>
    <div class="action-list">
      ${actionCard({ action: "to-mine-approach", title: "前往乌铜矿", description: offer?.accepted ? "同行者会在自己的底线内提供一次援护。" : "无人同行，仍可依靠调查与已知情报。", source: "第三月", meta: offer?.accepted ? "同伴加入" : "独行" , kind: "special" })}
    </div>
  `);
}

function synergySummaryHtml() {
  if (!state.activeSynergies?.length) {
    return `<p class="empty-state">当前先天命签与后天命痕尚未彼此呼应；你仍可依靠现场情报破局。</p>`;
  }
  return `<div class="synergy-list">${state.activeSynergies.map((synergy) => `
    <div class="synergy-card">
      <span>命签相应 · ${escapeHtml(synergySourceText(synergy))}</span><strong>${escapeHtml(synergy.name)}</strong>
      <p>${escapeHtml(synergy.effect)}</p><small>代价：${escapeHtml(synergy.cost)}</small>
    </div>
  `).join("")}</div>`;
}

function synergySourceText(synergy) {
  const opening = selectedOpeningTraits().find((trait) => synergy.openingAny.includes(trait.id));
  const acquired = (state.acquiredTraits || [])
    .map(getSettlementTrait)
    .find((trait) => trait && synergy.acquiredAny.includes(trait.id));
  return [opening?.name, acquired?.name].filter(Boolean).join(" × ") || "未成章法";
}

function renderMineApproach() {
  const ventSynergy = state.activeSynergies?.find((synergy) => synergy.unlock === "vent");
  return gameShell(`
    ${sceneHeader("第 2 次模拟 · 乌铜矿入口", "矿难之前，入口已经在说谎", "矿册写着小规模塌方，井口却站着不属于矿场的守卫；旧风井还有新鲜药味。")}
    <div class="story-copy">
      ${intelBoardHtml()}
      <h2 class="section-title">当前命签相应</h2>
      ${synergySummaryHtml()}
    </div>
    <div class="action-list">
      ${actionCard({ action: "choose-mine-entry", value: "main", title: "持宗门任务牌走正井", description: "身份最稳妥，但守核傀儡拥有完整双重护印；天妒越高，对方准备越充分。", source: "正面入口", meta: "护印 2 · 可带同伴" })}
      ${actionCard({ action: "choose-mine-entry", value: "drain", title: "沿废弃排水道切入封井层", description: "根据旧矿图绕开守卫，先调查再接敌；地图可能已受偏差影响。", source: "情报入口", meta: "护印 1 · 情报风险" })}
      ${ventSynergy ? actionCard({ action: "choose-mine-entry", value: "vent", title: "循药性进入旧风井", description: ventSynergy.effect, source: `联动·${ventSynergy.name}`, meta: "护印 1 · 心蚀代价", kind: "special" }) : ""}
    </div>
  `);
}

function renderMineInvestigation() {
  const routeCopy = {
    main: "你以任务牌进入正井，守卫放行得太快，像是刻意等归尘门弟子下去。",
    drain: "排水道旧图少了一段岔路。偏差已经改动未来，但岩壁上的封井钟索仍在。",
    vent: "药性联动指出一条未记入矿册的风脉。你贴着毒尘爬行，也避开了第一层护印。",
  }[state.mineEntry];
  return gameShell(`
    ${sceneHeader("第 2 次模拟 · 封井层", "先看懂规则，再决定是否出手", routeCopy)}
    <div class="story-copy">
      <p>塌方后方传来规律的三声钟响。石门内，一具守核傀儡每次抬膝，关节暗印都会先于灵力亮起。</p>
      <div class="notice-block"><strong>可验证的传闻</strong><br>矿工说“三响封井”；但只有亲自核对钟索、名册或傀儡膝印，才能把它升级为确证。</div>
    </div>
    <div class="action-list">
      ${actionCard({ action: "investigate-mine", value: "bell", title: "伏在钟索旁记录膝印与三次钟响", description: "确认守核傀儡发动封脉前的征兆与反制时机。", source: "现场调查", meta: "获得确证 · 战斗反制" })}
      ${actionCard({ action: "investigate-mine", value: "ledger", title: "比对封井名册与旧矿图", description: "确认每次矿难都由归尘门旧印签发，并找出护印供能位置。", source: "文书调查", meta: "获得确证 · 削弱护印" })}
      ${actionCard({ action: "investigate-mine", value: "rush", title: "趁守卫换班直接闯入", description: "不花时间验证传闻，以现有判断进入战斗。", source: "抢先行动", meta: "仅有传闻 · 保留先手", kind: "danger" })}
    </div>
  `);
}

function mineIntentLabel(intent) {
  return {
    seal: "封脉 · 锁死下一次行动",
    burst: "日核震击 · 天妒越高伤害越强",
    drag: "牵引 · 把人拖向阵眼",
  }[intent] || "未知杀招";
}

function renderMineBattle() {
  const battle = state.battle;
  const intent = battle.intents[battle.intentIndex];
  const canRead = battle.insight > 0 || battle.intelStatus === "confirmed";
  const intentCopy = canRead
    ? mineIntentLabel(intent)
    : battle.intelStatus === "stale"
      ? `旧确证推测：${mineIntentLabel(intent)}（未来已偏移）`
      : "征兆未明；先观察可确认下一式";
  const availableSynergy = state.activeSynergies?.find((synergy) => ["feign", "intent", "vent"].includes(synergy.unlock));
  const companionAvailable = state.companionOffer?.accepted && state.companion !== "alone";
  return gameShell(`
    ${sceneHeader("第 2 次模拟 · 守核傀儡", "它不知疲倦，每一道杀招却都循着固定印诀", "护印保护核心；你必须先读懂杀招，再决定观察、反制、借力或强攻。")}
    <div class="battle-layout">
      <section class="battle-status">
        <div><span>你的心志</span><strong>${battle.resolve}</strong></div>
        <div><span>傀儡护印</span><strong>${battle.enemyWard}</strong></div>
        <div><span>核心完整</span><strong>${battle.enemyHealth}</strong></div>
        <div><span>回合</span><strong>${battle.turn}/${battle.maxTurns}</strong></div>
      </section>
      <div class="intent-panel ${canRead ? "known" : "uncertain"}"><span>敌方意图</span><strong>${escapeHtml(intentCopy)}</strong></div>
      ${battle.enemyPrepared ? `<div class="notice-block"><strong>天妒反噬</strong><br>你多次带回强力成果，幕后者更早感知命盘；“日核震击”会造成额外伤害。</div>` : ""}
      <div class="battle-log">${battle.log.slice(-4).map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>
    </div>
    <div class="action-list">
      ${actionCard({ action: "battle-action", value: "observe", title: "守势观察征兆", description: "本回合不受反击，并确认可用于下一回合反制的意图。", source: "观察", meta: "获得洞察" })}
      ${actionCard({ action: "battle-action", value: "counter", title: "按确证抢断口令与膝印", description: battle.intelStatus === "stale" ? "过期确证可能已经失真；未先观察时反制会落空。" : "一次性拆除两层护印；需要确证或本轮洞察。", source: battle.intelStatus === "stale" ? "过期确证" : "情报反制", meta: battle.counterUsed ? "已使用" : "限 1 次", disabled: battle.counterUsed })}
      ${availableSynergy ? actionCard({ action: "battle-action", value: "synergy", title: `发动联动·${availableSynergy.name}`, description: availableSynergy.effect, source: "命痕相应", meta: battle.synergyUsed ? "已使用" : availableSynergy.cost, disabled: battle.synergyUsed, kind: "special" }) : ""}
      ${companionAvailable ? actionCard({ action: "battle-action", value: "companion", title: `请求${state.companion === "wen" ? "闻青禾" : "裴照雪"}制造窗口`, description: "同伴按自己的专长提供一次援护，不接受直接控制。", source: "同伴", meta: battle.companionUsed ? "已行动" : "限 1 次", disabled: battle.companionUsed }) : ""}
      ${actionCard({ action: "battle-action", value: "strike", title: "强攻护印或核心", description: "推进最快，但若未在本回合击破核心，将承受当前杀招。", source: "战斗", meta: "造成 1 点破坏", kind: "danger" })}
    </div>
  `);
}

function renderMineDefeat() {
  return gameShell(`
    ${sceneHeader("第 2 次模拟 · 矿底死亡", "你不是输给修为，而是晚看懂了一步", "封脉暗印锁住经络，日核把你的影子拖进阵眼。命盘保留了死亡前最后一个动作。")}
    <div class="death-cause"><span>直接死因</span><strong>守核傀儡膝印亮起后，下一式必然封脉</strong></div>
    <div class="cause-chain">
      <div class="cause-node"><span class="cause-status">已确认</span><span>膝印先亮，杀招后发；观察一回合即可安全反制</span></div>
      <div class="cause-node"><span class="cause-status">可行动</span><span>把这条确证带回现实，可提前拆除傀儡护印</span></div>
      <div class="cause-node unknown"><span class="cause-status">仍未知</span><span>日核为何只回应归尘门旧印与祖师名讳？</span></div>
    </div>
    <div class="action-list">
      ${actionCard({ action: "carry-mine-defeat", title: "带回确证·膝印先于封脉", description: "这条命没有白死。现实中可在傀儡苏醒前破坏膝印。", source: "第 2 世结算", meta: "只留一件真", kind: "special" })}
    </div>
  `);
}

function renderMineAftermath() {
  return gameShell(`
    ${sceneHeader("第 2 次模拟 · 日核近前", "矿难不是意外，是一次交接", "傀儡停转。日核每跳动一次，祖师洞方向便传来一次回声；矿工、接头人和核心只能先追一处。")}
    <div class="story-copy">
      <div class="omen-block">“六十年已满，把我的弟子带回来。”</div>
      <p>闻青禾听见塌方后有人求救；裴照雪看见接头人袖口赤线；日核则正在记住你的气息。</p>
    </div>
    <div class="action-list">
      ${actionCard({ action: "resolve-mine", value: "rescue", title: "先救矿工并查失踪名册", description: "保住证人，确认被困者中有闻青禾失踪的兄长。", source: "守护", meta: "同伴线 · 现实救援" })}
      ${actionCard({ action: "resolve-mine", value: "follow", title: "让日核留在原地，追上赤线接头人", description: "取得归尘门旧印与下一次交接时辰；若闻青禾同行，她会自行留下救人。", source: "调查", meta: "势力线 · 同伴自主" })}
      ${actionCard({ action: "resolve-mine", value: "touch", title: "以神识触碰日核", description: "直接确认祖师口令，代价是天妒上升且日核提前记住你。", source: "高风险试探", meta: "核心真相 · 天妒 +1", kind: "danger" })}
    </div>
  `);
}

function renderMineReturn() {
  return gameShell(`
    ${sceneHeader("命盘结算 · 第 2 世", "矿底只允许你带回一件真", "守核傀儡、塌方与接头人都随模拟消散；亲自确认的行动窗口留在命盘上。")}
    <div class="story-copy">
      <div class="fate-stamp">确证带回</div>
      <div class="notice-block"><strong>${escapeHtml(state.p1Carry?.name)}</strong><br>${escapeHtml(state.p1Carry?.description)}</div>
      <p>${escapeHtml(state.companionAct || "你独自完成了这次选择。")}</p>
      <p>现实仍在第三月矿难之前。这项成果会立刻改变入井安排，但一旦现实偏转，模拟中的精确时序也可能过期。</p>
    </div>
    <div class="action-list">
      ${actionCard({ action: "to-p1-reality", title: "回到现实，兑现矿底确证", description: "趁矿难尚未发生，立刻把上一条命换来的时机写进现实。", source: "太虚命盘", meta: "现实锚点 · 矿难前", kind: "special" })}
    </div>
  `);
}

function renderP1RealityPlan() {
  return gameShell(`
    ${sceneHeader("现实 · 乌铜矿任务下发前", "答案有用，但照抄答案会让未来失真", "你知道一个精确窗口，也知道第一次改命已经让部分旧确证过期。")}
    <div class="story-copy">
      ${intelBoardHtml()}
      <div class="notice-block"><strong>本世带回 · ${escapeHtml(state.p1Carry?.name)}</strong><br>${escapeHtml(state.p1Carry?.description)}</div>
    </div>
    <div class="action-list">
      ${actionCard({ action: "p1-reality-action", value: "precision", title: "只改动确证指向的一个关键动作", description: "提前换班、拆膝印或调走受困者，让矿难照常暴露但不再按原方式伤人。", source: "情报破局", meta: "偏差 +1 · 保留证据", kind: "special" })}
      ${actionCard({ action: "p1-reality-action", value: "force", title: "以命盘力量强行封闭整座矿井", description: "最直接地避免伤亡，却惊动幕后者、失去现场证据，并让天妒继续上升。", source: "力量破局", meta: "天妒 +1 · 证据流失", kind: "danger" })}
    </div>
  `);
}

function renderEnding() {
  const precise = state.p1RealityChoice === "precision";
  return gameShell(`
    ${sceneHeader("现实 · 乌铜矿余波", precise ? "你没有比对手更强，只是比他早知道一步" : "矿难被压住，幕后者也提前看见了你", precise ? "确证改变了行动规则；新的偏差又让这条确证不再是永真答案。" : "力量救下了眼前的人，却烧掉了追查因果的现场。")}
    <div class="story-copy">
      <div class="fate-stamp">预知兑现</div>
      <p>${escapeHtml(state.p1Payoff)}</p>
      <div class="notice-block"><strong>为什么确证会过期</strong><br>你已经改变换班、封井或傀儡苏醒条件。模拟中“第三响”的精确顺序不再可靠，但膝印、旧印与祖师口令之间的因果仍可继续追查。</div>
      ${intelBoardHtml()}
    </div>
    <div class="end-summary">
      <div class="summary-block"><span>旧情报如何改变行动</span><strong>${escapeHtml(state.p1Carry?.name)}让你在杀招成立前动手</strong></div>
      <div class="summary-block"><span>同伴不是工具</span><strong>${escapeHtml(state.companionAct || state.companionOffer?.boundary || "本轮独行")}</strong></div>
      <div class="summary-block"><span>下一阶段目标</span><strong>追查归尘门旧印、开山祖师与六十年献祭周期</strong></div>
    </div>
    <div class="path-recap"><h2>本轮路径复盘</h2>${state.p1Path.map((item, index) => `<p><span>${index + 1}</span>${escapeHtml(item)}</p>`).join("")}</div>
    <div class="button-row">
      <button class="secondary-button" data-action="retry-settlement">保留角色，改选第一次结算</button>
      <button class="primary-button" data-action="continue-p2">追查旧印背后的七年因果</button>
    </div>
  `);
}

function npcDossierGridHtml() {
  return `<div class="npc-dossier-grid">${CORE_NPCS.map((npc) => {
    const npcState = state.npcStates?.[npc.id] || {};
    return `
      <article class="npc-dossier ${npcState.allied ? "allied" : ""}">
        <div><span>${npcState.allied ? "已结盟" : npcState.state === "hostile" ? "对立" : npcState.state === "captive" ? "受困" : "观望"}</span><strong>${escapeHtml(npc.name)}</strong></div>
        <p><b>动机</b>${escapeHtml(npc.motive)}</p>
        <p><b>独占线索</b>${escapeHtml(npc.clue)}</p>
        <p><b>底线</b>${escapeHtml(npc.boundary)}</p>
        <small>${escapeHtml(npcState.reason || npcState.fate || "尚未建立足够信任")}</small>
      </article>
    `;
  }).join("")}</div>`;
}

function buildSynergyGridHtml() {
  if (!state.buildSynergies?.length) {
    return `<p class="empty-state">当前法门尚未与命痕、确证或同伴彼此呼应；你仍可凭基础本领推进。</p>`;
  }
  return `<div class="synergy-list">${state.buildSynergies.map((synergy) => `
    <div class="synergy-card"><span>法门相应</span><strong>${escapeHtml(synergy.name)}</strong><p>${escapeHtml(synergy.effect)}</p></div>
  `).join("")}</div>`;
}

function renderP2Interlude() {
  return gameShell(`
    ${sceneHeader("命盘深处 · 第三月之后", "改掉一场矿难，还没有改掉制造矿难的宗门", "命盘上的墨线延伸到七年之后。四个人分别握着阵图、尸骨、旧档和山外暗线；没有任何人会无条件听命于你。")}
    <div class="story-copy">
      <div class="notice-block"><strong>命盘翻过已知岁月</strong><br>晚宴与矿难已经看清，盘面不再重复旧事。新的墨迹停在第一年冬、第五年秋与第七年黑日。</div>
      ${npcDossierGridHtml()}
    </div>
    <div class="action-list">
      ${actionCard({ action: "to-build-choice", title: "用两世所得，择定一门七年法门", description: "观命、拆阵、潜行或聚众，只能择一门修到足以撬动宗门。", source: "长期准备", meta: "推进至第一年", kind: "special" })}
    </div>
  `);
}

function renderBuildChoice() {
  return gameShell(`
    ${sceneHeader("现实 · 第一年前", "七年只够把一种方法练到足以撼动宗门", "你必须择一门法：看清因果、拆毁祭阵、潜入暗处，或把众人连成一条退路。")}
    <div class="build-grid">
      ${BUILD_PATHS.map((build) => `
        <button class="build-card" data-action="choose-build" data-value="${build.id}">
          <span>${escapeHtml(build.discipline)}</span><h2>${escapeHtml(build.name)}</h2>
          <p>${escapeHtml(build.effect)}</p><small>代价：${escapeHtml(build.cost)}</small>
        </button>
      `).join("")}
    </div>
  `);
}

function renderYear1Approach() {
  const build = getBuildPath(state.buildId);
  return gameShell(`
    ${sceneHeader("现实 · 第一年冬", "闻青禾失踪的那一夜，建宗密库提前封门", `你已修成${build?.name}。上一条未来里，闻青禾在调查历代尸骨后消失。`)}
    <div class="story-copy">
      <p>你已把现实锚点钉在密库封门前。宋无咎带着钥匙，闻青禾带着尸骨药性记录，地牢里的阿厌则知道敌宗如何称呼这座祭阵。</p>
      <div class="notice-block"><strong>现实风险</strong><br>这不是模拟。若无证据公开指控长老，你会在当夜被命盘封口；死亡后只能读取此现实锚点。</div>
      ${buildSynergyGridHtml()}
    </div>
    <div class="action-list">
      ${actionCard({ action: "enter-year1-archive", title: "在密库封门前亲自介入", description: "选择从尸骨、旧档或阿厌的敌语切入。", source: "现实锚点", meta: "第一年冬", kind: "special" })}
    </div>
  `);
}

function renderYear1Archive() {
  const shadow = state.buildId === "shadow_crossing";
  const poisonSynergy = state.buildSynergies.some((synergy) => synergy.id === "poison_reads_life");
  return gameShell(`
    ${sceneHeader("现实 · 建宗密库", "同一批弟子的名字，同时出现在入门册与阵材账上", "门外巡夜长老正在靠近。你只能先把一条证据链做实。")}
    <div class="action-list">
      ${actionCard({ action: "archive-action", value: "bones", title: "与闻青禾检验历代无名尸骨", description: "从残毒与骨龄证明失踪弟子被炼成阵材。", source: poisonSynergy ? "联动·毒理观命" : "闻青禾", meta: poisonSynergy ? "无需官方文书" : "获得尸骨确证" })}
      ${actionCard({ action: "archive-action", value: "audit", title: "让宋无咎打开建宗原始账册", description: "给他一个可控的止祭方案，换取建宗契约与长老签印。", source: "宋无咎", meta: "稳定优先 · 获得旧档" })}
      ${actionCard({ action: "archive-action", value: "free_ayen", title: "释放阿厌，让她翻译祭阵敌语", description: "她会交出山外暗线，但从此不接受归尘门拘束。", source: shadow ? "联动·无影渡" : "交易", meta: "阿厌自由 · 潜行路线" })}
      ${actionCard({ action: "archive-action", value: "accuse", title: "直接召集弟子公开指控长老", description: "现有证据尚未形成公开证词链；幕后者会在当夜夺回命盘。", source: "现实冒险", meta: "现实死亡风险", kind: "danger" })}
    </div>
  `);
}

function renderP2RealityDeath() {
  return gameShell(`
    ${sceneHeader("现实 · 命途断绝", "现实死亡不会给你结算", "你把尚未成链的证据公开。宋无咎被调离，长老当夜以封盘术切断你的心脉。")}
    <div class="death-cause"><span>现实死因</span><strong>无替代方案地惊动祭阵维护者，命盘被定位并反噬</strong></div>
    <div class="notice-block"><strong>最近现实锚点</strong><br>第一年冬 · 建宗密库封门前。读取后，现实死亡之后的变化不会保留。</div>
    <div class="button-row">
      <button class="primary-button" data-action="retry-p2-anchor">读取现实锚点</button>
      <button class="ghost-button" data-action="new-game">散去此世，另起一命</button>
    </div>
  `);
}

function renderYear1Resolution() {
  const copy = {
    bones: "闻青禾从尸骨残毒中辨出同一种延寿丹渣。她没有失踪，而是把历代死者姓名逐一抄在丹房门上。",
    audit: "宋无咎交出建宗契约：归尘门每六十年献祭一代弟子，为开山祖师续命。他要求你先证明宗门解散后众人仍能活。",
    free_ayen: "阿厌念出阵图上的敌语：那不是赤霞宗法门，而是归尘门故意泄出的假藏宝图。她带走牢门钥匙，只承诺在终局前再帮一次。",
  }[state.archiveChoice];
  return gameShell(`
    ${sceneHeader("现实 · 第一年冬", "宗门不是被敌人毁掉，而是按时收割自己", "第一次，黑日灭门从预言变成了有签名、有材料、有周期的制度。")}
    <div class="story-copy">
      <p>${escapeHtml(copy)}</p>
      <div class="notice-block"><strong>新确证 · 六十年延寿祭阵</strong><br>晚宴灭口、乌铜矿日核、历代尸骨与护山阵反转属于同一条献祭链。</div>
      ${npcDossierGridHtml()}
    </div>
    <div class="action-list">
      ${actionCard({ action: "advance-year5", title: "让命盘推演四年，直至赤霞宗攻山", description: "此后四年的修行与结盟化作盘上墨痕；法门、同伴和确证共同决定第五年的局面。", source: "命盘推演", meta: "第一年 → 第五年", kind: "special" })}
    </div>
  `);
}

function renderYear5Hub() {
  return gameShell(`
    ${sceneHeader("现实 · 第五年秋", "敌宗攻山只是祭阵需要的一场烟幕", "赤霞宗以为山下封着飞升遗宝；长老则准备借死伤提前给日核蓄力。")}
    <div class="story-copy">
      <p>裴照雪控制护山阵外环，宋无咎掌握换防名册，阿厌知道敌宗口令，闻青禾已经在组织伤员撤离。你只能把一条方案设为主轴。</p>
      <h2 class="section-title">已相互呼应的法门与命痕</h2>${buildSynergyGridHtml()}
    </div>
    <div class="action-list">
      ${actionCard({ action: "to-year5-crisis", title: "进入祭阵准备争夺", description: "决定谁控制外环、谁保存证据、谁获得自由。", source: "第五年锚点", meta: "关键现实行动", kind: "special" })}
    </div>
  `);
}

function renderYear5Crisis() {
  return gameShell(`
    ${sceneHeader("现实 · 护山阵外环", "四个人都愿意行动，但不会选择同一种未来", "外环只够执行一条主方案；其余人会按照自己的底线处理伤员、证据与退路。")}
    <div class="action-list">
      ${actionCard({ action: "year5-action", value: "pei", title: "把阵图确证交给裴照雪，由她控制外环", description: "最稳地保护门人并取得阵心位置；她也会封死夺盘续世的邪路。", source: "裴照雪", meta: "秩序 · 阵心确证" })}
      ${actionCard({ action: "year5-action", value: "song", title: "与宋无咎伪造换防，暗中抽空祭阵", description: "保留撤离秩序和建宗证词，但让一部分长老逃离。", source: "宋无咎", meta: "调度 · 证据链" })}
      ${actionCard({ action: "year5-action", value: "ayen", title: "兑现自由承诺，让阿厌从敌宗侧反转外环", description: "开放山外撤离与夺盘路线；偏差提高，未来时序更不可靠。", source: "阿厌", meta: "自由 · 偏差 +1" })}
      ${actionCard({ action: "year5-action", value: "force", title: "以命盘力量正面压住护山阵", description: "无需任何人同意，但天妒提高，终局黑日会更早锁定你。", source: "强行改命", meta: "天妒 +1", kind: "danger" })}
    </div>
  `);
}

function renderBlackSunPrep() {
  return gameShell(`
    ${sceneHeader("现实 · 第七年蚀日前", "你终于拥有的不是答案，而是一套可以同时行动的人与证据", "黑日仍会按时升起；区别在于祭品、阵眼、退路和见证者都已被你改写。")}
    <div class="story-copy">
      ${npcDossierGridHtml()}
      <div class="finale-preview">${state.finaleOptions.map((option) => `
        <div class="finale-preview-item ${option.enabled ? "enabled" : "locked"}"><span>${option.enabled ? "可执行" : "未满足"}</span><strong>${escapeHtml(option.name)}</strong><p>${escapeHtml(option.reason)}</p></div>
      `).join("")}</div>
    </div>
    <div class="action-list">
      ${actionCard({ action: "face-black-sun", title: "让第七年如约到来", description: "进入现实终局；只有已满足条件的方案可以执行。", source: "最终现实锚点", meta: "第七年蚀日", kind: "danger" })}
    </div>
  `);
}

function renderFinale() {
  return gameShell(`
    ${sceneHeader("现实 · 第七年黑日", "护山阵反转，整座山开始向祖师洞输送寿元", "这一次你不是来阻止事件发生，而是决定它最终成为哪一种历史。")}
    <div class="omen-block">黑日悬山 · 祭阵收割开始</div>
    <div class="finale-grid">
      ${state.finaleOptions.map((option) => `
        <button class="finale-card ${option.enabled ? "" : "locked"}" data-action="choose-ending" data-value="${option.id}" ${option.enabled ? "" : "disabled"}>
          <span>${option.enabled ? "方案成立" : "条件不足"}</span><h2>${escapeHtml(option.name)}</h2>
          <p>${escapeHtml(option.reason)}</p><small>代价：${escapeHtml(option.cost)}</small>
        </button>
      `).join("")}
    </div>
  `);
}

function renderFinalSummary() {
  const ending = state.endingResult;
  const confirmed = state.intel.filter((record) => record.status === "confirmed").length;
  const stale = state.intel.filter((record) => record.status === "stale").length;
  const build = getBuildPath(state.buildId);
  return gameShell(`
    ${sceneHeader("太虚七年 · 尘埃落定", ending.name, ending.epitaph)}
    <div class="story-copy"><div class="fate-stamp">${escapeHtml(ending.name)}</div><p>${escapeHtml(ending.consequence)}</p><div class="notice-block"><strong>结局代价</strong><br>${escapeHtml(ending.cost)}</div></div>
    <div class="final-summary-grid">
      <div><span>命主</span><strong>${escapeHtml(state.character.name)}</strong><p>命途曾在现实断裂 ${state.realityDeaths} 次，皆从锚点续回</p></div>
      <div><span>两世带回</span><strong>${escapeHtml(state.reward?.name)} / ${escapeHtml(state.p1Carry?.name)}</strong><p>模拟死亡留下成果，现实死亡只读取锚点</p></div>
      <div><span>情报账</span><strong>${confirmed} 条确证 / ${stale} 条过期</strong><p>传闻与过期确证仍留作因果线索</p></div>
      <div><span>七年法门</span><strong>${escapeHtml(build?.name)}</strong><p>${escapeHtml(build?.cost)}</p></div>
      <div><span>命盘代价</span><strong>天妒 ${state.envy} · 偏差 ${state.deviation}</strong><p>强力与改写都真实改变终局</p></div>
      <div><span>现实锚点</span><strong>第三月 / 第一年 / 第五年 / 第七年</strong><p>每一道锚点都留着你的选择</p></div>
    </div>
    ${npcDossierGridHtml()}
    <div class="path-recap"><h2>命途复盘</h2>${[...state.p1Path, ...state.p2Path].map((item, index) => `<p><span>${index + 1}</span>${escapeHtml(item)}</p>`).join("")}</div>
    <div class="legacy-card"><span>下一世可继承</span><strong>${escapeHtml(state.legacyCandidate?.name)}</strong><p>${escapeHtml(state.legacyCandidate?.effect)}</p></div>
    <div class="button-row"><button class="primary-button" data-action="start-new-cycle">携带命痕，再开第 ${state.cycle + 1} 世</button><button class="ghost-button" data-action="new-game">散去旧痕，另起一命</button></div>
  `);
}

function renderCycleOpening() {
  const legacy = state.inheritedLegacy;
  const reaction = {
    wen: "闻青禾第一次见你，却下意识把药箱往你这边推了一寸。",
    pei: "裴照雪看见断阵残印后按住剑柄：‘这道伤……像是我亲手留下的。’",
    ayen: "地牢深处的阿厌抬头望向你：‘你身上有祭盘主人的味道。离我远点。’",
  }[legacy?.npcReaction];
  return gameShell(`
    ${sceneHeader(`第 ${state.cycle} 世 · 命痕继承`, "世界重新落墨，但有一处没有擦干净", "你仍是此命之主；上一世终局只留下一枚能够改变早期因果的命痕。")}
    <div class="story-copy"><div class="legacy-card"><span>继承命痕</span><strong>${escapeHtml(legacy?.name)}</strong><p>${escapeHtml(legacy?.effect)}</p></div><p>${escapeHtml(reaction)}</p></div>
    <div class="action-list">${actionCard({ action: "begin-cycle-two", title: "带着前世记忆回到祖师洞外", description: "你可以越过已经看清的盲查，直接从晚宴时序或旧印入口开始试命。", source: "前世遗痕", meta: "早期因果已改变", kind: "special" })}</div>
  `);
}

function tagName(tag) {
  return {
    poison: "中毒",
    observe: "观察",
    survival: "求生",
    protect: "守护",
    deceive: "欺瞒",
    combat: "战斗",
  }[tag] || tag;
}

function render() {
  const mode = modeForScreen(state.screen);
  document.body.dataset.mode = mode;
  const renderers = {
    landing: renderLanding,
    worldIntro: renderWorldIntro,
    creator: renderCreator,
    openingTraits: renderOpeningTraits,
    birthSheet: renderBirthSheet,
    arrival: renderArrival,
    omen: renderOmen,
    realityHub: renderRealityHub,
    sim1Morning: renderSim1Morning,
    sim1Eve: renderSim1Eve,
    sim1Feast: renderSim1Feast,
    deathRecap: renderDeathRecap,
    settlement: renderSettlement,
    traitDraw: renderTraitDraw,
    realityReturn: renderRealityReturn,
    realityPlan: renderRealityPlan,
    realityResolution: renderRealityResolution,
    realityDeath: renderRealityDeath,
    sim2Feast: renderSim2Feast,
    sim2Road: renderSim2Road,
    companionResult: renderCompanionResult,
    mineApproach: renderMineApproach,
    mineInvestigation: renderMineInvestigation,
    mineBattle: renderMineBattle,
    mineDefeat: renderMineDefeat,
    mineAftermath: renderMineAftermath,
    mineReturn: renderMineReturn,
    p1RealityPlan: renderP1RealityPlan,
    ending: renderEnding,
    p2Interlude: renderP2Interlude,
    buildChoice: renderBuildChoice,
    year1Approach: renderYear1Approach,
    year1Archive: renderYear1Archive,
    p2RealityDeath: renderP2RealityDeath,
    year1Resolution: renderYear1Resolution,
    year5Hub: renderYear5Hub,
    year5Crisis: renderYear5Crisis,
    blackSunPrep: renderBlackSunPrep,
    finale: renderFinale,
    finalSummary: renderFinalSummary,
    cycleOpening: renderCycleOpening,
  };
  app.innerHTML = (renderers[state.screen] || renderLanding)();
  const pageLabel = modeLabel();
  document.title = pageLabel === "太虚命盘" ? "太虚命盘" : `${pageLabel} · 太虚命盘`;
  if (state.screen !== "landing") saveState();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function moveTo(screen) {
  state.screen = screen;
  render();
}

function setReward(type) {
  if (state.reward) return;
  if (type === "dao") {
    state.reward = {
      type: "dao",
      id: "reverse_breath",
      name: "灵息逆转",
      description: "毒发时逆行周天，压制毒性并保留一次反击。",
    };
    state.envy += 1;
  } else if (type === "certainty") {
    state.reward = {
      type: "certainty",
      id: "water_swap",
      name: "确证·酉时换水",
      description: "晚宴井水在酉时由外来水桶替换。可据此提前蹲守。",
    };
  }
  state.timeline.feast = "known";
  state.pendingSettlement = null;
  refreshSynergies();
  track("settlement_selected", { type });
  moveTo("realityReturn");
}

const handlers = {
  "new-game": () => {
    clearSave();
    state = createInitialState(freshSeed());
    state.screen = "worldIntro";
    render();
  },
  "continue-game": () => {
    if (!savedState) return;
    state = structuredClone(savedState);
    render();
  },
  "back-landing": () => moveTo("landing"),
  "to-creator": () => moveTo("creator"),
  "back-world": () => moveTo("worldIntro"),
  "select-pronoun": ({ value }) => {
    state.character.pronoun = value;
    render();
  },
  "select-origin": ({ value }) => {
    state.character.origin = value;
    render();
  },
  "select-appearance": ({ value }) => {
    state.character.appearance = value;
    render();
  },
  "to-traits": () => {
    if (!state.character.name.trim() || !state.character.origin) return;
    state.character.name = state.character.name.trim();
    moveTo("openingTraits");
  },
  "select-opening-trait": ({ id, group }) => {
    state.openingSelected[group] = id;
    render();
  },
  "request-reroll": () => {
    if (state.rerollUsed) return;
    state.rerollConfirm = true;
    render();
  },
  "cancel-reroll": () => {
    state.rerollConfirm = false;
    render();
  },
  "confirm-reroll": () => {
    if (state.rerollUsed) return;
    state.openingDrawIndex = 1;
    state.openingSets = generateOpeningSets(state.seed, 1);
    state.openingSelected = {};
    state.rerollUsed = true;
    state.rerollConfirm = false;
    track("opening_traits_rerolled");
    render();
  },
  "to-birth-sheet": () => {
    if (Object.keys(state.openingSelected).length !== 3) return;
    moveTo("birthSheet");
  },
  "back-traits": () => moveTo("openingTraits"),
  "confirm-character": () => {
    state.initialEnvy = selectedOpeningTraits().some((trait) => ["heaven_hates_genius", "reckless_insight"].includes(trait.id)) ? 1 : 0;
    state.envy = state.initialEnvy;
    track("character_confirmed", {
      origin: state.character.origin,
      traits: selectedOpeningTraits().map((trait) => trait.id),
    });
    moveTo("arrival");
  },
  "enter-ancestral-cave": ({ value }) => {
    if (state.screen !== "arrival" || !["follow", "inspect", "report"].includes(value)) return;
    state.prologueChoice = value;
    track("ancestral_cave_entered", { approach: value });
    moveTo("omen");
  },
  "wake-reality": () => {
    track("omen_seen");
    moveTo("realityHub");
  },
  "start-sim1": () => {
    if (state.flames < 1) return;
    state.flames -= 1;
    state.simulationCount = 1;
    state.timeline.feast = "unknown";
    track("simulation_started", { index: 1 });
    moveTo("sim1Morning");
  },
  "start-sim1-informed": () => {
    if (state.screen !== "realityHub" || state.cycle < 2 || !state.inheritedLegacy || state.flames < 1) return;
    state.flames -= 1;
    state.simulationCount = 1;
    state.timeline.feast = "known";
    state.morningChoice = "cycle-memory";
    addTags("observe", "deceive");
    addClue("继承命痕让你直接记起：酉时换水，补刀者按名册行动。 ");
    addIntel(createIntel({ id: "feast_timing", title: "晚宴投毒时序", detail: "酉时换水后，蒙面人按名册补刀。", status: "confirmed", source: `第 ${state.cycle} 世前世遗痕`, gainedAtDeviation: 0, expiresAtDeviation: 1 }));
    state.latestTriggers = [triggerOpening("root")].filter(Boolean);
    track("cycle_memory_early_route_used", { legacy: state.inheritedLegacy.id });
    moveTo("sim1Eve");
  },
  "sim-morning": ({ value }) => {
    if (state.screen !== "sim1Morning") return;
    state.morningChoice = value;
    if (value === "well") {
      addTags("poison", "observe");
      addClue("井栏存在新磨损，换水可能并非日常事务。 ");
    } else if (value === "dan") {
      addTags("poison", "protect");
      addClue("乌舌草只会使人失去行动，不会直接致死。 ");
    } else if (value === "train") {
      addTags("survival", "combat");
    } else {
      addTags("observe", "poison");
      addClue(morningResultCopy());
    }
    state.latestTriggers = [triggerOpening("root")].filter(Boolean);
    moveTo("sim1Eve");
  },
  "sim-eve": ({ value }) => {
    if (state.screen !== "sim1Eve") return;
    state.eveChoice = value;
    if (value === "watch") {
      addTags("observe", "deceive");
      addClue("酉时有人推来一桶没有归尘门印记的水。 ");
    } else if (value === "ask") {
      addTags("poison", "protect", "observe");
      addClue("闻青禾确认酉时前井水仍然无毒。 ");
    } else {
      addTags("survival", "combat");
    }
    state.latestTriggers = [triggerOpening("talent")].filter(Boolean);
    moveTo("sim1Feast");
  },
  "sim-feast": ({ value }) => {
    if (state.screen !== "sim1Feast") return;
    state.feastChoice = value;
    addTags("poison", "observe", "survival");
    if (value === "warn") addTags("protect");
    if (value === "feign") addTags("deceive");
    state.latestTriggers = [triggerOpening("fate")].filter(Boolean);
    addClue("蒙面人按入门名册补杀接触过祖师洞异象的人。 ");
    state.rating = scoreSettlement(state.actionTags, state.clues.length);
    state.firstSimulationClues = [...state.clues];
    state.timeline.feast = "death";
    track("first_death_shown", { rating: state.rating, tags: state.actionTags });
    moveTo("deathRecap");
  },
  "to-settlement": () => moveTo("settlement"),
  "choose-settlement": ({ value }) => {
    if (state.screen !== "settlement") return;
    state.pendingSettlement = value;
    render();
  },
  "cancel-settlement": () => {
    state.pendingSettlement = null;
    render();
  },
  "confirm-settlement": () => {
    if (state.screen !== "settlement") return;
    const type = state.pendingSettlement;
    if (type === "trait") {
      state.settlementCandidates = deriveSettlementTraits({
        seed: state.seed,
        tags: state.actionTags,
        rating: state.rating,
      });
      state.pendingSettlement = null;
      track("settlement_selected", { type: "trait", candidates: state.settlementCandidates.map((trait) => trait.id) });
      moveTo("traitDraw");
      return;
    }
    setReward(type);
  },
  "take-trait": ({ id }) => {
    if (state.screen !== "traitDraw" || state.reward) return;
    const trait = getSettlementTrait(id);
    if (!trait || !state.settlementCandidates.some((candidate) => candidate.id === id)) return;
    state.acquiredTraits = [id];
    state.reward = {
      type: "trait",
      id,
      name: trait.name,
      description: trait.effect,
    };
    state.envy += RARITY[trait.rarity].rank >= 3 ? 2 : 1;
    refreshSynergies();
    state.timeline.feast = "known";
    track("trait_extracted", { id });
    moveTo("realityReturn");
  },
  "go-reality-plan": () => moveTo("realityPlan"),
  "reality-action": ({ value }) => {
    if (state.screen !== "realityPlan") return;
    if (value === "report") {
      track("reality_death", { route: "report" });
      moveTo("realityDeath");
      return;
    }
    state.realRoute = value;
    state.realOutcome = realOutcomeCopy();
    state.timeline.feast = "shifted";
    state.timeline.mine = "approaching";
    state.deviation += 1;
    state.flames += 1;
    addClue(state.realOutcome.clue);
    addIntel(createIntel({
      id: "feast_timing",
      title: "晚宴投毒时序",
      detail: "酉时换水后，蒙面人按名册补刀。",
      status: "confirmed",
      source: "第 1 次模拟亲历",
      gainedAtDeviation: 0,
      expiresAtDeviation: 1,
    }));
    const payoffIntel = state.reward.type === "certainty"
      ? createIntel({ id: "poisoner_family", title: "废染坊囚徒", detail: "下毒杂役的家人被囚，闻青禾认为这与失踪者有关。", status: "confirmed", source: "现实蹲守", gainedAtDeviation: state.deviation, expiresAtDeviation: 3 })
      : state.reward.type === "dao"
        ? createIntel({ id: "red_token", title: "赤纹腰牌", detail: "补刀者携带赤霞宗外堂凭证，但腰牌来源仍可能被伪造。", status: "confirmed", source: "现实反杀", gainedAtDeviation: state.deviation, expiresAtDeviation: 3 })
        : createIntel({ id: "trait_trace", title: "命痕追迹", detail: state.realOutcome.clue, status: "confirmed", source: "命痕兑现", gainedAtDeviation: state.deviation, expiresAtDeviation: 2 });
    addIntel(payoffIntel);
    addIntel(createIntel({
      id: "mine_collapse",
      title: "第三月乌铜矿塌方",
      detail: "宗门记录称其为小事故，但有人提前收走了封井名册。",
      status: "rumor",
      source: "偏转后的任务简报",
      gainedAtDeviation: state.deviation,
    }));
    refreshIntel();
    track("payoff_first_used", { reward: state.reward.type, route: value });
    track("fixed_death_changed");
    moveTo("realityResolution");
  },
  "retry-reality": () => moveTo("realityPlan"),
  "start-sim2": () => {
    if (state.flames < 1) return;
    state.flames -= 1;
    state.simulationCount = 2;
    refreshSynergies();
    if (!getIntel(state.intel, "mine_collapse")) {
      addIntel(createIntel({ id: "mine_collapse", title: "第三月乌铜矿塌方", detail: "矿难报告与现场准备不符。", status: "rumor", source: "宗门任务简报", gainedAtDeviation: state.deviation }));
    }
    track("second_simulation_started");
    moveTo("sim2Feast");
  },
  "fast-forward-feast": () => {
    track("old_death_bypassed");
    moveTo("sim2Road");
  },
  "choose-companion": ({ value }) => {
    if (state.screen !== "sim2Road" || !["wen", "pei", "alone"].includes(value)) return;
    const offer = resolveCompanionOffer({
      companion: value,
      intel: state.intel,
      clues: state.clues,
      rewardType: state.reward?.type,
      acquiredTraitIds: state.acquiredTraits,
    });
    state.companionOffer = offer;
    state.companion = offer.accepted ? offer.companion : "alone";
    state.p1Path.push(offer.accepted ? `${value === "wen" ? "闻青禾" : value === "pei" ? "裴照雪" : "无人"}同行` : `${value === "wen" ? "闻青禾" : "裴照雪"}因证据不足拒绝，改为独行`);
    track("companion_offer_resolved", { requested: value, accepted: offer.accepted });
    moveTo("companionResult");
  },
  "to-mine-approach": () => {
    if (state.screen !== "companionResult") return;
    moveTo("mineApproach");
  },
  "choose-mine-entry": ({ value }) => {
    if (state.screen !== "mineApproach" || !["main", "drain", "vent"].includes(value)) return;
    if (value === "vent" && !state.activeSynergies.some((synergy) => synergy.unlock === "vent")) return;
    state.mineEntry = value;
    const labels = { main: "持任务牌走正井", drain: "沿废弃排水道切入", vent: "以药性联动进入旧风井" };
    state.p1Path.push(labels[value]);
    track("mine_entry_selected", { entry: value, deviation: state.deviation });
    moveTo("mineInvestigation");
  },
  "investigate-mine": ({ value }) => {
    if (state.screen !== "mineInvestigation" || !["bell", "ledger", "rush"].includes(value)) return;
    state.mineInvestigation = value;
    if (value !== "rush") {
      addIntel(createIntel({
        id: "guardian_cadence",
        title: value === "bell" ? "傀儡封脉征兆" : "封井护印供能位",
        detail: value === "bell" ? "三响之后，傀儡膝印会先亮；此时口令反制必定生效。" : "名册旧印向膝部护印供能，截断一次即可拆除双层防护。",
        status: "confirmed",
        source: value === "bell" ? "封井层现场观察" : "封井名册与旧矿图互证",
        gainedAtDeviation: state.deviation,
        expiresAtDeviation: state.deviation + 1,
      }));
    } else {
      addIntel(createIntel({ id: "guardian_cadence", title: "傀儡封脉征兆", detail: "矿工传闻第三响后会封井，准确时机未知。", status: "rumor", source: "矿工传闻", gainedAtDeviation: state.deviation }));
    }
    state.battle = createMineBattle({
      seed: state.seed,
      entry: state.mineEntry,
      envy: state.envy,
      intelStatus: getIntel(state.intel, "guardian_cadence")?.status || "rumor",
    });
    state.p1Path.push(value === "rush" ? "未验证传闻便闯入" : value === "bell" ? "亲历确认傀儡杀招征兆" : "用文书确认护印规则");
    track("mine_intel_checked", { method: value, status: state.battle.intelStatus });
    moveTo("mineBattle");
  },
  "battle-action": ({ value }) => {
    if (state.screen !== "mineBattle" || !state.battle) return;
    const synergyIds = state.activeSynergies.map((synergy) => synergy.id);
    const wasSynergyUsed = state.battle.synergyUsed;
    state.battle = resolveMineBattleTurn(state.battle, value, {
      synergyIds,
      companion: state.companion,
    });
    if (value === "synergy" && !wasSynergyUsed && state.activeSynergies.some((synergy) => synergy.id === "borrowed_stillness")) {
      state.envy += 1;
    }
    track("mine_battle_action", { action: value, outcome: state.battle.outcome });
    if (state.battle.outcome === "won") {
      state.p1Path.push("用情报、联动或同伴窗口击破守核傀儡");
      moveTo("mineAftermath");
    } else if (state.battle.outcome === "lost") {
      addIntel(createIntel({
        id: "guardian_knee",
        title: "膝印先于封脉",
        detail: "守核傀儡膝印会先亮，现实中可在杀招成立前拆除。",
        status: "confirmed",
        source: "第 2 次模拟死亡回溯",
        gainedAtDeviation: state.deviation,
        expiresAtDeviation: state.deviation + 1,
      }));
      moveTo("mineDefeat");
    } else {
      render();
    }
  },
  "carry-mine-defeat": () => {
    if (state.screen !== "mineDefeat") return;
    state.p1Carry = { id: "guardian_knee", name: "确证·膝印先于封脉", description: "守核傀儡在封脉前必先点亮膝印，可提前拆除。" };
    state.mineOutcome = "defeat";
    state.p1Path.push("矿底死亡，但带回可执行的膝印确证");
    track("mine_death_intel_carried");
    moveTo("mineReturn");
  },
  "resolve-mine": ({ value }) => {
    if (state.screen !== "mineAftermath" || !["rescue", "follow", "touch"].includes(value)) return;
    state.mineChoice = value;
    state.mineOutcome = value;
    state.timeline.mine = "revealed";
    const carry = {
      rescue: { id: "shift_roster", name: "确证·受困者换班名册", description: "矿难前一刻调走第三班，可救出闻青禾兄长并保留活证人。", detail: "第三班并非临时入井，而是被旧印点名送入封井层。" },
      follow: { id: "handoff_time", name: "确证·赤线交接时辰", description: "接头人会在封井钟第二响交出归尘门旧印，可提前布控。", detail: "赤线接头人使用归尘门旧印签发矿难名册。" },
      touch: { id: "founder_phrase", name: "确证·祖师唤核口令", description: "念出“六十年已满”会令日核停跳一息，也会让它记住施术者。", detail: "日核回应开山祖师名讳与六十年周期。" },
    }[value];
    state.p1Carry = { id: carry.id, name: carry.name, description: carry.description };
    addIntel(createIntel({ id: carry.id, title: carry.name.replace("确证·", ""), detail: carry.detail, status: "confirmed", source: "第 2 次模拟矿底亲历", gainedAtDeviation: state.deviation, expiresAtDeviation: state.deviation + 1 }));
    if (value === "touch") state.envy += 1;
    if (state.companion === "wen" && state.companionOffer?.accepted) {
      state.companionAct = value === "follow"
        ? "闻青禾拒绝放弃仍活着的矿工，与你分头行动并救出了兄长。"
        : "闻青禾按自己的判断先稳住伤者，再把证词交给你。";
    } else if (state.companion === "pei" && state.companionOffer?.accepted) {
      state.companionAct = value === "touch"
        ? "裴照雪拒绝让你独自承受日核回望，以剑意替你截断一半反噬。"
        : "裴照雪控制住投降者，坚持先留活口再追查旧印。";
    } else {
      state.companionAct = "你独自完成选择，没有人替你收束另一条线索。";
    }
    state.p1Path.push(value === "rescue" ? "保住受困者与换班名册" : value === "follow" ? "追踪赤线接头人并取得交接时辰" : "触碰日核并确认祖师口令");
    track("mine_hook_reached", { choice: value });
    moveTo("mineReturn");
  },
  "to-p1-reality": () => {
    if (state.screen !== "mineReturn" || !state.p1Carry) return;
    moveTo("p1RealityPlan");
  },
  "p1-reality-action": ({ value }) => {
    if (state.screen !== "p1RealityPlan" || !["precision", "force"].includes(value)) return;
    state.p1RealityChoice = value;
    state.deviation += 1;
    if (value === "precision") {
      const payoff = {
        guardian_knee: "你在傀儡苏醒前凿断膝印。它仍按旧口令抬腿，却再也无法完成封脉；矿工亲眼看见旧印如何驱动傀儡。",
        shift_roster: "你只调换第三班，让矿难照常暴露。闻青禾在塌方前带兄长离井，宋无咎则当场扣下伪造换班名册的人。",
        handoff_time: state.companion === "wen"
          ? "第二声封井钟响时，你按住接头人的手；闻青禾没有服从追击要求，而是按自己的判断救出矿工。旧印、赤线与活证人都留了下来。"
          : state.companion === "pei"
            ? "第二声封井钟响时，裴照雪从暗处按住接头人的手。旧印与赤线同时成为活证，对方准备好的傀儡还未启动。"
            : "第二声封井钟响时，你独自截住接头人并夺下旧印。无人替你守住另一侧，仍有一名同谋逃离。",
        founder_phrase: "日核第一次跳动前，你念出祖师口令令它停滞一息。众人撤出封井层，也都听见祖师洞传来的回应。",
      };
      state.p1Payoff = payoff[state.p1Carry.id] || "你在确证指向的时机动手，矿难仍然发生，却失去了原本的杀人规则。";
      addIntel(createIntel({ id: "mine_old_seal", title: "归尘门旧印参与封井", detail: "矿难名册、守核傀儡与祖师洞使用同源旧印。", status: "confirmed", source: "现实精准布控", gainedAtDeviation: state.deviation, expiresAtDeviation: null }));
      state.p1Path.push("用带回确证精准改动一个关键动作，保留现场证据");
    } else {
      state.envy += 1;
      state.p1Payoff = "你以命盘力量压住整座矿井，所有矿工活着离开；日核与伪造名册却被幕后者提前转移。你赢了结果，失去了能继续追查的现场。";
      addIntel(createIntel({ id: "mine_evacuated", title: "矿难已被强行中止", detail: "人员获救，但日核去向与交接时序只能重新调查。", status: "rumor", source: "现实封矿结果", gainedAtDeviation: state.deviation }));
      state.p1Path.push("用力量强行封矿，救人但失去现场证据");
    }
    refreshIntel();
    state.timeline.mine = "shifted";
    track("p1_payoff_used", { route: value, carry: state.p1Carry.id, deviation: state.deviation, envy: state.envy });
    moveTo("ending");
  },
  "continue-p2": () => {
    if (state.screen !== "ending") return;
    initializeP2NpcStates();
    state.timeline.archive = "approaching";
    state.p2Path.push("矿难之后，决定继续追查七年献祭链");
    track("complete_demo_continued");
    moveTo("p2Interlude");
  },
  "to-build-choice": () => {
    if (state.screen !== "p2Interlude") return;
    moveTo("buildChoice");
  },
  "choose-build": ({ value }) => {
    if (state.screen !== "buildChoice" || state.buildId || !getBuildPath(value)) return;
    state.buildId = value;
    refreshBuildSynergies();
    state.p2Path.push(`择定七年法门：${getBuildPath(value).name}`);
    state.timeline.archive = "approaching";
    establishRealityAnchor("year1Approach");
    track("build_selected", { build: value });
    moveTo("year1Approach");
  },
  "enter-year1-archive": () => {
    if (state.screen !== "year1Approach") return;
    moveTo("year1Archive");
  },
  "archive-action": ({ value }) => {
    if (state.screen !== "year1Archive" || !["bones", "audit", "free_ayen", "accuse"].includes(value)) return;
    if (value === "accuse") {
      state.realityDeaths += 1;
      state.p2Path.push("第一年无证据公开指控，现实死亡");
      track("p2_reality_death", { anchor: "year1Approach" });
      moveTo("p2RealityDeath");
      return;
    }
    state.archiveChoice = value;
    addIntel(createIntel({
      id: "sacrifice_ledger",
      title: "六十年延寿祭阵",
      detail: "历代弟子尸骨、日核与护山阵共同为开山祖师续命。",
      status: "confirmed",
      source: value === "bones" ? "尸骨残毒与丹房账册" : value === "audit" ? "建宗原始账册" : "阿厌翻译的祭阵敌语",
      gainedAtDeviation: state.deviation,
      expiresAtDeviation: null,
    }));
    if (value === "audit") {
      addIntel(createIntel({ id: "founding_deed", title: "建宗献祭契约", detail: "掌门与长老代代签印，知晓第七年收割。", status: "confirmed", source: "宋无咎开启的建宗密档", gainedAtDeviation: state.deviation, expiresAtDeviation: null }));
      updateNpcState("song", { allied: true, state: "allied", fate: "交出旧档并准备秘密撤离", reason: "你给出了止祭后的秩序方案。" });
    } else if (value === "bones") {
      updateNpcState("wen", { allied: true, state: "allied", fate: "公开历代死者姓名并组织救治", reason: "尸骨确证与兄长命运形成完整证据链。" });
    } else {
      updateNpcState("ayen", { allied: true, state: "allied", fate: "重获自由并提供山外暗线", reason: "你兑现自由承诺，没有要求她加入归尘门。" });
    }
    state.timeline.archive = "shifted";
    state.p2Path.push(value === "bones" ? "与闻青禾确认历代弟子被炼成阵材" : value === "audit" ? "与宋无咎取得建宗献祭契约" : "释放阿厌并翻译祭阵敌语");
    initializeP2NpcStates();
    refreshBuildSynergies();
    track("archive_truth_confirmed", { route: value });
    moveTo("year1Resolution");
  },
  "retry-p2-anchor": () => {
    if (state.screen !== "p2RealityDeath") return;
    const deaths = state.realityDeaths;
    const restored = restoreRealityAnchor(state.realityAnchor);
    if (!restored) return;
    state = restored;
    state.realityDeaths = deaths;
    state.p2Path.push("读取第一年现实锚点，保留死亡教训但撤销现实后果");
    track("reality_anchor_restored", { deaths });
    render();
  },
  "advance-year5": () => {
    if (state.screen !== "year1Resolution") return;
    state.timeline.siege = "approaching";
    refreshBuildSynergies();
    establishRealityAnchor("year5Hub");
    state.p2Path.push("命盘推演四年修行，抵达第五年祭阵争夺");
    moveTo("year5Hub");
  },
  "to-year5-crisis": () => {
    if (state.screen !== "year5Hub") return;
    moveTo("year5Crisis");
  },
  "year5-action": ({ value }) => {
    if (state.screen !== "year5Crisis" || !["pei", "song", "ayen", "force"].includes(value)) return;
    state.year5Choice = value;
    addIntel(createIntel({ id: "array_heart", title: "护山阵阵心位置", detail: "日核只是钥匙；真正的收割主脉位于祖师洞与议事堂之间。", status: "confirmed", source: value === "pei" ? "裴照雪控制外环后实测" : value === "song" ? "换防名册与阵图互证" : value === "ayen" ? "敌宗侧反向口令" : "命盘正面压阵后的灵流回响", gainedAtDeviation: state.deviation, expiresAtDeviation: null }));
    if (value === "pei") {
      updateNpcState("pei", { allied: true, state: "allied", fate: "控制护山阵外环并保住投降者", reason: "阵图与献祭契约证明了师门制度有罪。" });
    } else if (value === "song") {
      updateNpcState("song", { allied: true, state: "allied", fate: "伪造换防并保存建宗证词", reason: "秘密撤离方案满足了他的稳定底线。" });
    } else if (value === "ayen") {
      updateNpcState("ayen", { allied: true, state: "allied", fate: "从敌宗侧反转外环后离开山门", reason: "自由承诺被兑现，她完成最后一次交易。" });
      state.deviation += 1;
      refreshIntel();
    } else {
      state.envy += 1;
    }
    if (state.npcStates.wen.allied) updateNpcState("wen", { fate: "按自己的判断组织伤员与尸骨证人撤离" });
    initializeP2NpcStates();
    refreshBuildSynergies();
    state.timeline.siege = "shifted";
    state.finaleOptions = evaluateFinaleOptions({
      confirmedIntelIds: confirmedIntelIds(),
      alliedNpcIds: alliedNpcIds(),
      buildId: state.buildId,
      envy: state.envy,
      deviation: state.deviation,
      archiveChoice: state.archiveChoice,
      year5Choice: state.year5Choice,
    });
    state.p2Path.push(value === "pei" ? "让裴照雪控制护山阵外环" : value === "song" ? "与宋无咎伪造换防抽空祭阵" : value === "ayen" ? "让阿厌从敌宗侧反转外环" : "以命盘力量正面压阵");
    track("year5_array_shifted", { route: value, options: state.finaleOptions.filter((option) => option.enabled).map((option) => option.id) });
    moveTo("blackSunPrep");
  },
  "face-black-sun": () => {
    if (state.screen !== "blackSunPrep" || !state.finaleOptions.some((option) => option.enabled)) return;
    state.timeline.blackSun = "current";
    establishRealityAnchor("finale");
    moveTo("finale");
  },
  "choose-ending": ({ value }) => {
    if (state.screen !== "finale" || state.endingResult) return;
    const context = {
      confirmedIntelIds: confirmedIntelIds(),
      alliedNpcIds: alliedNpcIds(),
      buildId: state.buildId,
      envy: state.envy,
      deviation: state.deviation,
      archiveChoice: state.archiveChoice,
      year5Choice: state.year5Choice,
    };
    const ending = resolveFinalEnding(value, context);
    if (!ending) return;
    state.endingId = value;
    state.endingResult = ending;
    state.legacyCandidate = createCycleLegacy(value);
    state.completedEndings = uniqueTags([...(state.completedEndings || []), value]);
    state.timeline.blackSun = "resolved";
    state.p2Path.push(`第七年终局：${ending.name}`);
    track("formal_ending_reached", { ending: value });
    moveTo("finalSummary");
  },
  "start-new-cycle": () => {
    if (state.screen !== "finalSummary" || !state.legacyCandidate) return;
    const nextCycle = state.cycle + 1;
    const legacy = structuredClone(state.legacyCandidate);
    const character = structuredClone(state.character);
    const openingSelected = structuredClone(state.openingSelected);
    const completedEndings = [...state.completedEndings];
    const next = createInitialState(`${state.seed}:cycle:${nextCycle}`);
    next.cycle = nextCycle;
    next.inheritedLegacy = legacy;
    next.completedEndings = completedEndings;
    next.character = character;
    next.openingSelected = openingSelected;
    next.envy = legacy.envy || 0;
    next.initialEnvy = next.envy;
    next.screen = "cycleOpening";
    const legacyIntel = {
      safe_route: createIntel({ id: "safe_route", title: "山外安全撤离图", detail: "黑日升起前可从废弃驿道撤出伤员与典籍。", status: "confirmed", source: "余烬山图", gainedAtDeviation: 0, expiresAtDeviation: null }),
      old_seal_memory: createIntel({ id: "old_seal_memory", title: "归尘门旧印记忆", detail: "晚宴名册、矿难与祭阵使用同源旧印。", status: "confirmed", source: "断阵残印", gainedAtDeviation: 0, expiresAtDeviation: 1 }),
      founder_echo: createIntel({ id: "founder_echo", title: "祖师口令回声", detail: "你记得“六十年已满”，但不确定下一世的时序。", status: "rumor", source: "黑日命痕", gainedAtDeviation: 0 }),
    }[legacy.openingIntel];
    if (legacyIntel) next.intel = [legacyIntel];
    state = next;
    track("new_cycle_started", { cycle: nextCycle, legacy: legacy.id });
    render();
  },
  "begin-cycle-two": () => {
    if (state.screen !== "cycleOpening" || !state.inheritedLegacy) return;
    state.p2Path = [`第 ${state.cycle} 世继承：${state.inheritedLegacy.name}`];
    moveTo("realityHub");
  },
  "retry-settlement": () => {
    state.screen = "settlement";
    state.flames = 2;
    state.envy = state.initialEnvy;
    state.deviation = 0;
    state.simulationCount = 1;
    state.pendingSettlement = null;
    state.settlementCandidates = [];
    state.reward = null;
    state.acquiredTraits = [];
    state.realRoute = null;
    state.realOutcome = null;
    state.companion = null;
    state.companionOffer = null;
    state.activeSynergies = [];
    state.intel = [];
    state.mineEntry = null;
    state.mineInvestigation = null;
    state.battle = null;
    state.mineChoice = null;
    state.mineOutcome = null;
    state.companionAct = null;
    state.p1Carry = null;
    state.p1RealityChoice = null;
    state.p1Payoff = null;
    state.p1Path = [];
    state.buildId = null;
    state.buildSynergies = [];
    state.npcStates = createInitialState(state.seed).npcStates;
    state.archiveChoice = null;
    state.year5Choice = null;
    state.realityAnchor = null;
    state.realityDeaths = 0;
    state.p2Path = [];
    state.finaleOptions = [];
    state.endingId = null;
    state.endingResult = null;
    state.legacyCandidate = null;
    state.timeline.feast = "death";
    state.timeline.mine = "hidden";
    state.timeline.archive = "hidden";
    state.timeline.siege = "hidden";
    state.timeline.blackSun = "future";
    state.clues = [...state.firstSimulationClues];
    track("settlement_retry_started");
    render();
  },
};

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target || target.disabled) return;
  const action = target.dataset.action;
  const handler = handlers[action];
  if (!handler) return;
  handler({ ...target.dataset });
});

app.addEventListener("input", (event) => {
  const field = event.target.dataset.field;
  if (field === "name") {
    state.character.name = event.target.value.slice(0, 8);
    const continueButton = app.querySelector('[data-role="creator-continue"]');
    if (continueButton) continueButton.disabled = !(state.character.name.trim() && state.character.origin);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea")) return;
  const number = Number(event.key);
  if (number >= 1 && number <= 4) {
    const actions = [...app.querySelectorAll(".action-card:not(:disabled)")];
    actions[number - 1]?.click();
  }
});

render();
