import {
  APPEARANCES,
  ORIGINS,
  RARITY,
  deriveSettlementTraits,
  generateOpeningSets,
  getAppearance,
  getOpeningTrait,
  getOrigin,
  getSettlementTrait,
  scoreSettlement,
  uniqueTags,
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
    version: 1,
    seed,
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
    mineChoice: null,
    timeline: {
      omen: "known",
      feast: "unknown",
      mine: "hidden",
      blackSun: "future",
    },
    events: [],
  };
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved?.version !== 1 || !saved?.screen) return null;
    return saved;
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

function triggerOpening(group) {
  const trait = openingTraitForGroup(group);
  if (!trait || state.triggeredOpeningTraits.includes(trait.id)) return null;
  state.triggeredOpeningTraits.push(trait.id);
  track("opening_trait_triggered", { trait: trait.id });
  return { name: trait.name, text: trait.trigger };
}

function modeForScreen(screen) {
  if (["sim1Morning", "sim1Eve", "sim1Feast", "sim2Feast", "sim2Road", "mine"].includes(screen)) {
    return "simulation";
  }
  if (["deathRecap", "realityDeath", "omen"].includes(screen)) return "death";
  if (["settlement", "traitDraw"].includes(screen)) return "settlement";
  if (["realityHub", "realityReturn", "realityPlan", "realityResolution"].includes(screen)) {
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
    mine: "第 2 次模拟 · 乌铜矿底",
    realityDeath: "现实 · 命途断绝",
    ending: "纵向切片 · 命途暂止",
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
  const feast = feastStatus === "shifted"
    ? ["第七日 · 晚宴", "已偏转：原定死因被越过", "shifted"]
    : feastStatus === "death"
      ? ["第七日 · 晚宴", "模拟死亡：中毒后遭补刀", "death"]
      : feastStatus === "known"
        ? ["第七日 · 晚宴", "已知危机：井水投毒", "current"]
        : ["第七日 · 晚宴", "酉时后将发生什么？", ""];
  const mine = mineStatus === "revealed"
    ? ["第三月 · 乌铜矿", "日核异象：新因果显露", "current"]
    : mineStatus === "approaching"
      ? ["第三月 · 乌铜矿", "新的未来正在逼近", "current"]
      : ["第三月 · 乌铜矿", "一场尚未发生的矿难", ""];
  return `
    <div class="panel-title">命途时间线</div>
    <div class="timeline-list">
      ${timelineItem("现实锚点", state.timeline.feast === "shifted" ? "晚宴后的新现实" : "太虚元年三月初三", "current")}
      ${timelineItem(...feast)}
      ${timelineItem(...mine)}
      ${timelineItem("第七年 · 黑日", "归尘门上下无一生还", "")}
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
        <div class="panel-title">先天词条</div>
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
      </div>
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
          <div class="resource"><span>天妒</span><strong>${state.envy}</strong></div>
          <div class="resource"><span>偏差</span><strong>${state.deviation}</strong></div>
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
      <p class="eyebrow">Playable concept demo</p>
      <h1>太虚命盘</h1>
      <p class="subtitle">七年后，归尘门上下无一生还。<br />你能带回的，只有上一条命留下的一件东西。</p>
      <div class="rule-line"><span>试命</span><span>带回</span><span>改命</span></div>
      <div class="button-row">
        <button class="primary-button" data-action="new-game">新建命途</button>
        ${hasSave ? `<button class="secondary-button" data-action="continue-game">继续 · ${escapeHtml(savedState.character?.name || "未完命途")}</button>` : ""}
      </div>
      <p class="screen-note">一段约 10～15 分钟的浏览器纵向切片 · 进度自动保存在本机</p>
    </div>
  `, { narrow: true });
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
      <p>命笺印色与人物剪影</p>
    </button>
  `).join("");
  const pronouns = PRONOUNS.map((item) => `
    <button class="select-tile ${state.character.pronoun === item.id ? "selected" : ""}" data-action="select-pronoun" data-value="${item.id}">
      <strong>${item.name}</strong><p>剧情称谓</p>
    </button>
  `).join("");
  const canContinue = Boolean(state.character.name.trim() && state.character.origin && state.character.appearance);
  return setupShell(`
    <p class="eyebrow">Step 01 · 自建主角</p>
    <h1 class="setup-title">这一世，你是谁？</h1>
    <p class="subtitle" style="margin:0;text-align:left">现实与模拟始终只由这名自建角色经历。其他人会同行、拒绝、隐瞒，但不会成为替代主角。</p>

    <div class="form-section">
      <div class="section-label"><strong>姓名</strong><span>1～8 个汉字或字符</span></div>
      <div class="text-field">
        <label for="character-name">写入命盘的名字</label>
        <input id="character-name" maxlength="8" autocomplete="off" value="${escapeHtml(state.character.name)}" placeholder="例如：沈砚" data-field="name" />
      </div>
    </div>

    <div class="form-section">
      <div class="section-label"><strong>称谓</strong><span>不影响能力</span></div>
      <div class="option-grid">${pronouns}</div>
    </div>

    <div class="form-section">
      <div class="section-label"><strong>凡俗出身</strong><span>提供一项早期调查入口</span></div>
      <div class="option-grid">${originCards}</div>
    </div>

    <div class="form-section">
      <div class="section-label"><strong>命笺印色</strong><span>Demo 外观预设</span></div>
      <div class="option-grid">${appearanceCards}</div>
    </div>

    <div class="button-row">
      <button class="ghost-button" data-action="back-landing">返回</button>
      <button class="primary-button" data-action="to-traits" data-role="creator-continue" ${canContinue ? "" : "disabled"}>让命盘观我先天</button>
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
    <p class="eyebrow">Step 02 · 先天六签</p>
    <h1 class="setup-title">命盘不许人尽得其愿</h1>
    <p class="subtitle" style="margin:0;text-align:left">根骨、才性、因果各取一枚。左侧稳定，右侧高波动；稀有不等于没有代价。</p>
    <div class="trait-groups">${groups}</div>

    ${state.rerollConfirm ? `
      <div class="inline-confirm">
        <p><strong>舍弃眼前六签？</strong><br><span>将整组重抽，旧结果不可恢复。</span></p>
        <div><button class="text-button" data-action="cancel-reroll">取消</button><button class="secondary-button" data-action="confirm-reroll">确认重抽</button></div>
      </div>
    ` : ""}

    <div class="button-row">
      <button class="ghost-button" data-action="request-reroll" ${state.rerollUsed ? "disabled" : ""}>重掷六签 · ${state.rerollUsed ? "已用尽" : "1/1"}</button>
      <button class="primary-button" data-action="to-birth-sheet" ${complete ? "" : "disabled"}>收下三枚先天词条</button>
    </div>
  `);
}

function renderBirthSheet() {
  const origin = getOrigin(state.character.origin);
  const appearance = getAppearance(state.character.appearance);
  return setupShell(`
    <p class="eyebrow">Step 03 · 初命笺</p>
    <h1 class="setup-title">此身落印，世界方生</h1>
    <div class="birth-sheet">
      <div>${avatarHtml("large")}</div>
      <div class="birth-details">
        <h2>${escapeHtml(state.character.name)}</h2>
        <p class="birth-meta">${escapeHtml(origin.name)} · ${escapeHtml(appearance.name)}印 · 归尘门外门新弟子</p>
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
      <button class="primary-button" data-action="confirm-character">落印，入世</button>
    </div>
    <p class="screen-note">确认后将固定本局世界种子：${escapeHtml(state.seed)}</p>
  `);
}

function renderOmen() {
  return setupShell(`
    <div class="title-lockup">
      <p class="eyebrow">祖师洞 · 一息之后</p>
      <h1 class="setup-title">黑日悬山</h1>
      <div class="omen-block">太虚七年，护山阵反转。<br />归尘门上下，无一生还。</div>
      <p class="subtitle">你看见裴照雪折剑，闻青禾倒在丹房门前。最后一刻，一轮没有温度的黑日从祖师洞中升起。</p>
      <p class="subtitle">再睁眼，案上那滴墨还没有落下。</p>
      <div class="button-row"><button class="primary-button" data-action="wake-reality">记住这场死，睁眼</button></div>
    </div>
  `, { narrow: true });
}

function renderRealityHub() {
  return gameShell(`
    ${sceneHeader("现实 · 祖师洞外", "只有你记得七年后的尸山", "现实只过去一息。残破命盘嵌入识海，三点命火在盘面缓慢燃烧。")}
    <div class="story-copy">
      <p>你仍是刚入门三日的外门弟子。若现在冲进议事堂高喊灭门，没有人会相信一个新人的噩梦。</p>
      <div class="quote-block">命盘只给出一句说明：<strong>“试一条命，留一件真。”</strong></div>
      <p>第一次模拟只能推到第七日。那之前，宗门会举行接风晚宴。</p>
    </div>
    <div class="action-list">
      ${actionCard({ action: "start-sim1", title: "消耗 1 命火，试命至第七日", description: "模拟死亡不会结束周目；你可以带回一项结算成果。", source: "太虚命盘", meta: "命火 3 → 2", kind: "special" })}
    </div>
  `);
}

function renderTriggerBlocks() {
  return state.latestTriggers.map((trigger) => `
    <div class="trigger-block"><span class="trigger-label">先天词条触发 · ${escapeHtml(trigger.name)}</span>${escapeHtml(trigger.text)}</div>
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
    ${sceneHeader(`第 1 世结算 · ${state.rating}等`, "这一生，只能带回一件东西", "确定答案解决眼前，未知词条塑造以后。三者互斥。")}
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
        <p>放弃道行与确证，从“${poolTags.map(tagName).join("、")}”词池中抽取三枚，再带回一枚后天词条。</p>
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
  if (type === "dao") return "你将失去「酉时换水」与本次词条抽取。";
  if (type === "certainty") return "你将失去「灵息逆转」与本次词条抽取。";
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
      <p class="screen-note">点击一枚命痕带回现实 · 稀有度表示规则影响，不等于无条件更强</p>
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
    <div class="notice-block">模拟死亡会留下成果；现实死亡只会结束当前命途。Demo 已在危险行动前保存现实锚点。</div>
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
      ${actionCard({ action: "fast-forward-feast", title: "按已验证方案快速处理晚宴", description: "仍由你执行关键动作，其余已知过程压缩结算。", source: state.reward ? state.reward.name : "已知命途", meta: "数日 → 一刻", kind: "special" })}
    </div>
  `);
}

function renderSim2Road() {
  return gameShell(`
    ${sceneHeader("第 2 次模拟 · 第三月", "旧死因已越过，未来第一次向后展开", "晚宴之后，宗门派人前往乌铜矿处理一次小规模塌方。上一世的你没活到今天。")}
    <div class="fate-stamp">旧死因已越过</div>
    <div class="story-copy">
      <p>矿井任务需要一名同伴。你仍只控制自己；同行者会按性格行动，也可能拒绝你的命令。</p>
    </div>
    <div class="action-list">
      ${actionCard({ action: "choose-companion", value: "wen", title: "邀请闻青禾同行", description: "她能辨毒、救人，也会优先寻找失踪兄长的线索。", source: "同伴", meta: "医术 · 关系" })}
      ${actionCard({ action: "choose-companion", value: "pei", title: "请求裴照雪同行", description: "她擅长正面战斗，但不会容忍你无证据指控师门。", source: "同伴", meta: "剑术 · 内门" })}
      ${actionCard({ action: "choose-companion", value: "alone", title: "独自下矿", description: "行动隐秘，出现危险时也无人替你收尾。", source: "独行", meta: "隐匿 · 高风险" })}
    </div>
  `);
}

function renderMine() {
  const companionNames = { wen: "闻青禾", pei: "裴照雪", alone: "无人" };
  return gameShell(`
    ${sceneHeader("第 2 次模拟 · 乌铜矿底", "矿难不是意外", `同行：${companionNames[state.companion]}。塌方深处没有矿石，只有一座被凿开的古阵。`)}
    <div class="story-copy">
      <p>黑色圆核悬在阵心，没有温度，却让所有影子朝它倾斜。它与七年后悬在归尘门上空的黑日一模一样。</p>
      <div class="omen-block">日核每跳动一次，祖师洞方向便传来一次回声。</div>
      <p>井外响起脚步。有人一直在等归尘门亲手挖出它。</p>
    </div>
    <div class="action-list">
      ${actionCard({ action: "resolve-mine", value: "rescue", title: "先救被压住的矿工", description: "保住证人，放弃第一时间追查日核。", source: "守护", meta: "关系线索" })}
      ${actionCard({ action: "resolve-mine", value: "follow", title: "熄灯，跟上井外接头人", description: "让日核暂时留在原地，追查谁在等待矿难。", source: "调查", meta: "势力线索" })}
      ${actionCard({ action: "resolve-mine", value: "touch", title: "以神识触碰日核", description: "直接确认它与黑日的关系，也可能立刻惊醒某种存在。", source: "高风险试探", meta: "必死风险 · 核心真相", kind: "danger" })}
    </div>
  `);
}

function endingClue() {
  const map = {
    rescue: "获救矿工说，塌方前有人从井底念出了开山祖师的名讳。",
    follow: "接头人的袖口同样缝着赤线，但他交出的不是敌宗令牌，而是一枚归尘门旧印。",
    touch: "日核中传来一句话：‘六十年已满，把我的弟子带回来。’",
  };
  return map[state.mineChoice] || "晚宴灭口与矿难都指向祖师洞。";
}

function renderEnding() {
  const rewardType = { dao: "道行", certainty: "确证", trait: "后天词条" }[state.reward?.type] || "未知";
  return gameShell(`
    ${sceneHeader("Demo 完成 · 新因果显露", "你越过了第一种死法", "但晚宴灭口、乌铜矿与七年后的黑日，正在同一条因果链上收紧。")}
    <div class="story-copy">
      <div class="notice-block"><strong>矿底新发现</strong><br>${escapeHtml(endingClue())}</div>
      <p>命盘把第三月钉进时间线。下一次模拟，你可以为了日核而来；也可以回到更早处，换一种结算看看现实会如何偏转。</p>
    </div>
    <div class="end-summary">
      <div class="summary-block"><span>唯一主角</span><strong>${escapeHtml(state.character.name)} · ${escapeHtml(getOrigin(state.character.origin)?.name)}</strong></div>
      <div class="summary-block"><span>第一世带回</span><strong>${rewardType} · ${escapeHtml(state.reward?.name)}</strong></div>
      <div class="summary-block"><span>已改写</span><strong>第七日晚宴 · 原定死亡已偏转</strong></div>
    </div>
    <div class="button-row">
      <button class="secondary-button" data-action="retry-settlement">保留角色，改选第一次结算</button>
      <button class="primary-button" data-action="new-game">重新建立角色</button>
    </div>
    <p class="screen-note">纵向切片到此结束 · 当前命途仍保存在浏览器</p>
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
    creator: renderCreator,
    openingTraits: renderOpeningTraits,
    birthSheet: renderBirthSheet,
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
    mine: renderMine,
    ending: renderEnding,
  };
  app.innerHTML = (renderers[state.screen] || renderLanding)();
  const pageLabel = modeLabel();
  document.title = pageLabel === "太虚命盘" ? "太虚命盘 · 可玩 Demo" : `${pageLabel} · 太虚命盘`;
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
  track("settlement_selected", { type });
  moveTo("realityReturn");
}

const handlers = {
  "new-game": () => {
    clearSave();
    state = createInitialState(freshSeed());
    state.screen = "creator";
    render();
  },
  "continue-game": () => {
    if (!savedState) return;
    state = structuredClone(savedState);
    render();
  },
  "back-landing": () => moveTo("landing"),
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
    track("payoff_first_used", { reward: state.reward.type, route: value });
    track("fixed_death_changed");
    moveTo("realityResolution");
  },
  "retry-reality": () => moveTo("realityPlan"),
  "start-sim2": () => {
    if (state.flames < 1) return;
    state.flames -= 1;
    state.simulationCount = 2;
    track("second_simulation_started");
    moveTo("sim2Feast");
  },
  "fast-forward-feast": () => {
    track("old_death_bypassed");
    moveTo("sim2Road");
  },
  "choose-companion": ({ value }) => {
    state.companion = value;
    moveTo("mine");
  },
  "resolve-mine": ({ value }) => {
    state.mineChoice = value;
    state.timeline.mine = "revealed";
    addClue(endingClue());
    track("mine_hook_reached", { choice: value });
    moveTo("ending");
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
    state.mineChoice = null;
    state.timeline.feast = "death";
    state.timeline.mine = "hidden";
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
