import {
  ATTRIBUTES,
  BACKGROUNDS,
  DESTINY,
  LIFE_RULE,
  MARTIAL_STAGES,
  MIND_ART,
  NIGHT_TALK,
  ROAD_TRIALS,
  TEMPLE_ENCOUNTERS,
  VOWS,
  WORLD_FACTS,
  allocateJadeBonus,
  getBackground,
  getTempleEncounter,
  getVow,
  resolveLadyChoice,
  resolveNightTalk,
  resolveRoadTrial,
  templeTaskCost,
} from "./wudao-core.mjs";

const STORAGE_KEY = "wudao-high-martial-v1";
const app = document.querySelector("#app");

function createInitialState() {
  return {
    version: 2,
    screen: "landing",
    name: "陈司命",
    backgroundId: "mystery",
    vowId: "path",
    destinyRevealed: false,
    allocationId: "balanced",
    attributes: allocateJadeBonus("balanced"),
    lives: LIFE_RULE.lives,
    potential: 0,
    peaches: 3,
    fireMinutes: 120,
    completedTempleTasks: [],
    templeLog: [],
    ladyChoiceLog: [],
    ladyFavor: 0,
    relationship: null,
    mindArt: null,
    roadTrial: null,
    roadTrialResult: null,
    nextRoute: null,
    lastDeathChoice: null,
    departed: false,
    events: [],
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || saved.version !== 2 || !saved.screen) return null;
    return { ...createInitialState(), ...saved };
  } catch {
    return null;
  }
}

let savedState = loadState();
let state = savedState || createInitialState();

function saveState() {
  if (state.screen === "landing") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  savedState = structuredClone(state);
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
  savedState = null;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function track(name, data = {}) {
  state.events.push({ name, at: Date.now(), ...data });
}

function moveTo(screen) {
  state.screen = screen;
  saveState();
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
}

function refresh() {
  saveState();
  render();
}

function setupShell(content, narrow = false) {
  return `<main class="setup-shell"><section class="setup-card ${narrow ? "narrow" : ""}">${content}</section></main>`;
}

function actionCard({ action, value = "", title, description, source = "", meta = "", kind = "", disabled = false }) {
  return `
    <button type="button" class="action-card ${kind}" data-action="${escapeHtml(action)}" data-value="${escapeHtml(value)}" ${disabled ? "disabled" : ""}>
      <span>
        <span class="action-title">${source ? `<span class="action-source">${escapeHtml(source)}</span>` : ""}${escapeHtml(title)}</span>
        <span class="action-description">${escapeHtml(description)}</span>
      </span>
      <span class="action-meta">${escapeHtml(meta)}</span>
    </button>
  `;
}

function sceneHeader(eyebrow, title, subtitle = "") {
  return `<header class="scene-head"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1 class="scene-title">${escapeHtml(title)}</h1>${subtitle ? `<p class="scene-subtitle">${escapeHtml(subtitle)}</p>` : ""}</header>`;
}

function journalHtml() {
  const items = [
    ["大曜 · 金陵道", state.destinyRevealed ? "命格已醒" : "无名少年初入江湖", "current"],
    ["东郊 · 无名破庙", state.completedTempleTasks.length ? `已取奇遇 ${state.completedTempleTasks.length}/3` : "寒夜求生", state.completedTempleTasks.length ? "shifted" : ""],
  ];
  if (state.ladyChoiceLog.length) {
    items.push(["寅时 · 青衣来客", state.relationship ? `龙青鱼 · ${state.relationship}` : state.departed ? "擦肩而过" : "杀机未定", state.relationship ? "shifted" : "current"]);
  }
  if (state.roadTrial) {
    items.push(["天明 · 黑水涧", state.roadTrial === "dive" ? "涧底丹纹" : "绕山而行", "shifted"]);
  }
  return `
    <div class="panel-title">江湖行录</div>
    <div class="timeline-list">
      ${items.map(([title, detail, status]) => `
        <div class="timeline-item ${status}"><span class="timeline-dot" aria-hidden="true"></span><span><h4>${escapeHtml(title)}</h4><p>${escapeHtml(detail)}</p></span></div>
      `).join("")}
    </div>
  `;
}

function characterPanelHtml() {
  const background = getBackground(state.backgroundId);
  const vow = getVow(state.vowId);
  return `
    <div class="panel-body">
      <div>
        <div class="character-head">
          <div class="wudao-avatar">命</div>
          <div><h3>${escapeHtml(state.name)}</h3><p>${escapeHtml(background?.name)} · 十六岁</p></div>
        </div>
        <div class="panel-title">人物状态</div>
        <div class="status-grid compact-status">
          <div><span>初心</span><strong>${escapeHtml(vow?.title)}</strong></div>
          <div><span>境界</span><strong>${MARTIAL_STAGES[0].name}</strong></div>
          <div><span>命灯</span><strong>${state.lives}</strong></div>
          <div><span>潜能</span><strong>${state.potential}</strong></div>
        </div>
      </div>
      <div>
        <div class="panel-title">五维</div>
        <div class="attribute-mini-list">
          ${ATTRIBUTES.map((attribute) => `<div><span>${escapeHtml(attribute.name)}</span><strong>${state.attributes[attribute.id] || 0}</strong></div>`).join("")}
        </div>
        ${state.destinyRevealed ? `<div class="destiny-mini"><span>唯一命格</span><strong>${DESTINY.name}</strong><p>${DESTINY.effect}</p></div>` : ""}
      </div>
      <div>
        <div class="panel-title">随身所得</div>
        <div class="inventory-list">
          ${state.backgroundId === "mystery" ? `<div><strong>半块家传玉佩</strong><span>可重分三点五维加成</span></div><div><strong>一封血书</strong><span>指向金龙会万鲤堂孙不离</span></div>` : ""}
          ${state.completedTempleTasks.includes("traveler_relic") ? `<div><strong>金陵东郊残图</strong><span>标出破庙外的旧路</span></div>` : ""}
          ${state.completedTempleTasks.includes("shen_promise") ? `<div><strong>沈字铜钱</strong><span>可作为金陵沈家信物</span></div>` : ""}
          ${state.mindArt ? `<div><strong>${MIND_ART.name}</strong><span>${MIND_ART.rank} · 龙青鱼所授</span></div>` : ""}
          ${state.roadTrial === "dive" ? `<div><strong>铜匣残片</strong><span>刻有沈氏丹房纹记</span></div>` : ""}
        </div>
      </div>
    </div>
  `;
}

function gameShell(content) {
  return `
    <main class="game-shell">
      <header class="topbar">
        <div class="brand-mini"><span class="brand-seal">武</span><span>大曜江湖</span></div>
        <div class="mode-badge">${escapeHtml(modeLabel())}</div>
        <div class="resource-row"><div class="resource"><span>命灯</span><strong>${state.lives}</strong></div><div class="resource"><span>潜能</span><strong>${state.potential}</strong></div></div>
      </header>
      <div class="game-grid">
        <aside class="panel timeline-panel">${journalHtml()}</aside>
        <section class="scene-panel">${content}</section>
        <aside class="panel character-panel">${characterPanelHtml()}</aside>
      </div>
    </main>
  `;
}

function modeLabel() {
  const labels = {
    templeWake: "大曜四百二十七年 · 子时三刻",
    fateSight: "金陵东郊 · 无名破庙",
    allocation: "命格运转 · 五维重分",
    templeTasks: "固定奇遇 · 破庙",
    ladyArrival: "寅时二刻 · 夜雨将至",
    ladyPressure: "人物奇遇 · 因爱成恨",
    ladyTest: "人物奇遇 · 杀机未解",
    nightTalk: "人物奇遇 · 破庙夜话",
    encounterReward: "奇遇结局 · 鱼跃龙门",
    mindArt: "心法灌顶 · 江鲤行波",
    roadTrial: "天明 · 黑水涧",
    roadResult: "武学初试 · 去路已开",
    ending: "金陵道 · 第一夜终",
    gameDeath: "命灯熄灭 · 残灯回照",
    quietDeparture: "天明 · 擦肩而过",
  };
  return labels[state.screen] || "大曜江湖";
}

function renderLanding() {
  return setupShell(`
    <div class="title-lockup wudao-title">
      <div class="fate-ring"><span class="fate-glyph">武</span></div>
      <p class="eyebrow">大曜四百二十七年 · 江湖将雨</p>
      <h1>武道</h1>
      <p class="subtitle">山门守一峰，世家镇一城，帮会争一江。<br />你只有两盏命灯，要从金陵城外的破庙活到天明。</p>
      <div class="button-row">
        <button class="primary-button" data-action="new-journey">入此江湖</button>
        ${savedState && savedState.screen !== "landing" ? `<button class="secondary-button" data-action="continue-journey">继续 · ${escapeHtml(savedState.name)}</button>` : ""}
      </div>
    </div>
  `, true);
}

function renderWorldIntro() {
  return setupShell(`
    <p class="eyebrow">大曜天下 · 金陵道</p>
    <h1 class="setup-title">这里的刀剑，不只决定胜负</h1>
    <p class="subtitle">谁守道路、谁传武功、谁控制盐粮，谁就能决定一方人的活法。</p>
    <div class="world-ledger">
      ${WORLD_FACTS.map((fact) => `<article class="world-fact"><span>${escapeHtml(fact.name)}</span><strong>${escapeHtml(fact.id === "dynasty" ? "城内有法，城外看刀" : fact.id === "jianghu" ? "门派、世家与帮会" : "一人之力，可镇一方")}</strong><p>${escapeHtml(fact.summary)}</p></article>`).join("")}
    </div>
    <div class="notice-block"><strong>你所在之地</strong><br />金陵是东南水陆汇聚的大城。城外三十里，一座废弃山神庙正漏着雨；你的故事从那里开始。</div>
    <div class="button-row"><button class="primary-button" data-action="enter-creation">选择此生来处</button></div>
  `);
}

function renderCharacterDraft() {
  return setupShell(`
    <p class="eyebrow">人物车卡 · 来处</p>
    <h1 class="setup-title">你是谁，又欠江湖什么？</h1>
    <p class="subtitle">出身既是第一份家底，也是最早追上你的债。</p>
    <div class="origin-grid wudao-origin-grid">
      ${BACKGROUNDS.map((item) => `
        <button class="origin-card ${state.backgroundId === item.id ? "selected" : ""}" data-action="select-background" data-value="${item.id}">
          <span class="origin-icon">${item.id === "mystery" ? "谜" : item.id === "clan" ? "门" : item.id === "common" ? "市" : "孤"}</span>
          <strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.summary)}</p>
          <span class="origin-tag">所得：${escapeHtml(item.gain)}</span><span class="origin-cost">代价：${escapeHtml(item.cost)}</span>
        </button>
      `).join("")}
    </div>
    <div class="field-row wudao-name-field"><label for="hero-name">姓名</label><input id="hero-name" data-field="hero-name" maxlength="8" value="${escapeHtml(state.name)}" /></div>
    <div class="button-row"><button class="primary-button" data-action="to-vow" ${state.backgroundId && state.name.trim() ? "" : "disabled"}>写下初心</button></div>
  `);
}

function renderVow() {
  return setupShell(`
    <p class="eyebrow">人物车卡 · 初心</p>
    <h1 class="setup-title">江湖路远，你为何执剑？</h1>
    <p class="subtitle">初心不会替你赢，却会在某些人面前改变你能说的话。</p>
    <div class="action-list vow-list">
      ${VOWS.map((item) => actionCard({ action: "select-vow", value: item.id, title: item.name, description: item.effect, source: item.title, meta: state.vowId === item.id ? "当前" : "选择" })).join("")}
    </div>
  `);
}

function renderDestiny() {
  return setupShell(`
    <p class="eyebrow">人物车卡 · 命格</p>
    <h1 class="setup-title">两盏命灯旁，浮出四个血字</h1>
    <div class="encounter-reveal">
      <div class="reveal-seal">逆<br />天<br />改<br />命</div>
      <div>
        <h2>${DESTINY.name}</h2>
        <p>${DESTINY.effect}</p>
        ${state.destinyRevealed ? `<div class="notice-block"><strong>代价</strong><br />${escapeHtml(DESTINY.cost)}</div><div class="notice-block"><strong>${LIFE_RULE.name}</strong><br />${escapeHtml(LIFE_RULE.effect)}</div>` : `<p class="empty-state">命格仍被一层血色薄雾遮住。</p>`}
      </div>
    </div>
    <div class="button-row">
      ${state.destinyRevealed ? `<button class="primary-button" data-action="confirm-destiny">接受此命</button>` : `<button class="primary-button" data-action="reveal-destiny">触碰命灯</button>`}
    </div>
  `);
}

function renderCharacterSheet() {
  const background = getBackground(state.backgroundId);
  const vow = getVow(state.vowId);
  return setupShell(`
    <p class="eyebrow">人物车卡 · 已定</p>
    <h1 class="setup-title">${escapeHtml(state.name)}</h1>
    <div class="birth-sheet">
      <div class="wudao-sheet-seal">${escapeHtml(state.name.slice(-2))}</div>
      <div class="birth-facts">
        <div><span>年龄</span><strong>十六</strong><p>初入金陵道</p></div>
        <div><span>出身</span><strong>${escapeHtml(background?.name)}</strong><p>${escapeHtml(background?.cost)}</p></div>
        <div><span>初心</span><strong>${escapeHtml(vow?.title)}</strong><p>${escapeHtml(vow?.name)}</p></div>
        <div><span>武境</span><strong>未入门</strong><p>先从锻体开始</p></div>
        <div><span>命格</span><strong>${DESTINY.name}</strong><p>见奇遇 · 改五维</p></div>
        <div><span>命灯</span><strong>二</strong><p>两灯皆灭，此生终结</p></div>
      </div>
    </div>
    <div class="notice-block"><strong>眼下处境</strong><br />你在金陵城外的破庙醒来。没有境界，没有师门，腹中空空；怀里的玉佩正散出最后一点暖意。</div>
    <div class="button-row"><button class="primary-button" data-action="start-journey">睁开眼睛</button></div>
  `);
}

function renderTempleWake() {
  return gameShell(`
    ${sceneHeader("金陵东郊 · 无名破庙", "你是被冷醒的", "破瓦漏下月光，篝火将熄。庙外有狼嚎，腹中像压着一块烧红的铁。")}
    <div class="temple-scene">
      <div class="temple-glyphs"><span>火</span><span>雨</span><span>山</span></div>
      <div class="story-copy"><p>供桌上没有神像，只摆着几枚新鲜山桃。东北角墙体颜色略深，像被人重新砌过。</p><p>这不是传说中的高手开局。今夜最先要赢的，是寒冷和饥饿。</p></div>
    </div>
    <div class="action-list">${actionCard({ action: "search-fire", title: "拨亮余火，吃下一枚山桃", description: "先稳住体温和饥饿，再检查破庙里不合常理的地方。", source: "生存", meta: "山桃 -1 · 篝火两刻" })}</div>
  `);
}

function renderFateSight() {
  return gameShell(`
    ${sceneHeader("命格初醒", "视野里浮出三道淡金因果", "一项属于火，一项藏在墙后，还有一项要等到并不存在的时辰。")}
    <div class="quest-grid">
      ${TEMPLE_ENCOUNTERS.map((item) => `<article class="quest-card ${item.id === "mysterious_offering" ? "locked" : ""}"><span>${escapeHtml(item.rank)}级奇遇</span><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.condition)}</p><small>${escapeHtml(item.id === "mysterious_offering" ? "时日未到，只能记住条件" : item.reward)}</small></article>`).join("")}
    </div>
    <div class="notice-block"><strong>玉佩余力：三点</strong><br />根骨、身法、力道各一点。逆天改命可以重新分配它们，但不能凭空增加力量。</div>
    <div class="action-list">${actionCard({ action: "use-destiny", title: "重分玉佩余力", description: "决定用更少时间砸开墙，保持均衡，或把三点都押给福缘。", source: DESTINY.name, meta: "三点五维" })}</div>
  `);
}

function renderAllocation() {
  const choices = [
    ["strength", "三点尽归力道", "更快敲开墙体，不消耗山桃。"],
    ["balanced", "根骨、身法、力道各一", "保留均衡，但敲墙更慢并消耗一枚山桃。"],
    ["fortune", "三点尽归福缘", "为后续偶发奇遇下注，眼下敲墙代价最高。"],
  ];
  return gameShell(`
    ${sceneHeader("逆天改命 · 五维重分", "把三点玉佩余力押在今夜", "命格允许你改变已有力量的去处，却不会替你支付代价。")}
    <div class="attribute-sheet">${ATTRIBUTES.map((attribute) => `<div><span>${escapeHtml(attribute.name)}</span><strong>${state.attributes[attribute.id] || 0}</strong><small>${escapeHtml(attribute.description)}</small></div>`).join("")}</div>
    <div class="action-list">
      ${choices.map(([id, title, description]) => actionCard({ action: "allocate-jade", value: id, title, description, source: state.allocationId === id ? "已选" : "分配", meta: id === "strength" ? "破墙最优" : id === "balanced" ? "稳妥" : "赌奇遇", kind: state.allocationId === id ? "special" : "" })).join("")}
    </div>
    <div class="button-row"><button class="primary-button" data-action="confirm-allocation">看清全部条件</button></div>
  `);
}

function renderTempleTasks() {
  return gameShell(`
    ${sceneHeader("固定奇遇 · 无名破庙", "条件已经看见，代价仍要亲手支付", "先后顺序会消耗篝火、山桃与体力。今夜只有两项能立刻完成。")}
    <div class="quest-grid">
      ${TEMPLE_ENCOUNTERS.map((item) => {
        const done = state.completedTempleTasks.includes(item.id);
        const locked = item.id === "mysterious_offering";
        const cost = templeTaskCost(item.id, state.attributes);
        const meta = locked ? "时日未到" : done ? "已完成" : `${cost.minutes}分钟${cost.peaches ? ` · 山桃 ${cost.peaches}` : ""}`;
        return `<article class="quest-card ${locked ? "locked" : ""} ${done ? "completed" : ""}"><span>${escapeHtml(item.rank)}级奇遇</span><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.condition)}</p><small>${escapeHtml(done ? item.result : item.reward)}</small>${locked || done ? `<div class="quest-state">${escapeHtml(meta)}</div>` : `<button class="inline-button" data-action="temple-task" data-value="${item.id}">${escapeHtml(meta)} · 立即行动</button>`}</article>`;
      }).join("")}
    </div>
    ${state.templeLog.length ? `<div class="notice-block"><strong>今夜所得</strong><br />${state.templeLog.map(escapeHtml).join("；")}</div>` : ""}
    <div class="action-list">${actionCard({ action: "meet-lady", title: "守着余火等到寅时", description: "庙外雨声渐密。有人踩着泥水，停在了门外。", source: "继续", meta: "人物奇遇将至", kind: state.completedTempleTasks.length ? "special" : "" })}</div>
  `);
}

function ladyChoices(stage, action) {
  const options = stage === "first" ? [
    ["retort", "反唇相讥", "指出她把旁人的过错迁怒于你。", "聚气境以下死亡", "danger"],
    ["silent", "沉默避让", "让出篝火另一侧，天亮后各走各路。", "安全 · 永失后续", ""],
    ["deny_beggar", "只说：我不是乞丐", "不讨好，也不因她的威势否认自己。", "进入后续", "special"],
  ] : stage === "pressure" ? [
    ["defy", "宁死不屈", "再次顶撞，不肯退让半步。", "聚气境以下死亡", "danger"],
    ["yield", "顺着她的话活下来", "暂认乞丐，听清她真正恨的是谁。", "她会说出更多", "special"],
  ] : [
    ["exploit", "利用她的失意攀附", "把她这一夜的脆弱当作飞黄腾达的捷径。", "条件不足 · 死亡", "danger"],
    ["refuse", "拒绝成为报复工具", "告诉她：不该用另一个人的背叛决定今晚。", "破庙夜话", "special"],
  ];
  return options.filter(([, , , , kind]) => !(kind === "danger" && state.lives <= 1)).map(([id, title, description, meta, kind]) => actionCard({ action, value: id, title, description, source: "逆天改命", meta, kind })).join("");
}

function renderLadyArrival() {
  return gameShell(`
    ${sceneHeader("寅时二刻 · 破庙门开", "一个青衣妇人走进雨里仅剩的火光", "她没有受伤，身后也没有追兵。湿透的斗篷下，气息却压得你几乎不敢呼吸。")}
    <div class="encounter-stage">
      <div class="encounter-weather"><span>雨</span><span>火</span><span>杀</span></div>
      <div class="story-copy"><p>她扫过你的破衣、山桃核和墙边碎砖，冷笑一声：“年纪轻轻，便活成了个乞丐。”</p><p>命格在每一句回答旁，写出了你可能迎来的结局。</p></div>
    </div>
    <div class="action-list">${ladyChoices("first", "lady-choice")}</div>
  `);
}

function renderLadyPressure() {
  return gameShell(`
    ${sceneHeader("因爱成恨", "她的掌风压灭了半边火苗", "你只否认了乞丐二字，她却像从这句话里听见了另一个人的声音。")}
    <div class="story-copy"><p>“不是乞丐？”她盯着你，怒意后面藏着被人抛下的狼狈，“这世上身份、誓言、夫妻情分，又有几样是真的？”</p></div>
    <div class="action-list">${ladyChoices("pressure", "lady-pressure")}</div>
  `);
}

function renderLadyTest() {
  return gameShell(`
    ${sceneHeader("杀机未解", "陆连山三个字，终于从她口中落下", "漕帮水路上的权势、夫妻间的旧誓，以及一场背叛，在雨夜里拧成了同一个结。")}
    <div class="story-copy"><p>她并非需要救命。她想证明自己仍能让人趋之若鹜，也想用一个陌生人的选择报复那个变心的人。</p></div>
    <div class="action-list">${ladyChoices("test", "lady-test")}</div>
  `);
}

function renderNightTalk() {
  return gameShell(`
    ${sceneHeader("破庙夜话", "你推回她递来的酒，只替篝火添了块木头", "杀机第一次退去。现在决定结果的不是境界，而是你是否真的听懂了她。")}
    <div class="story-copy"><p>她说起漕帮，说起与陆连山一同从小船打到千帆听令，也说起权势如何一点点换掉了旧日之人。</p></div>
    <div class="action-list">${NIGHT_TALK.map((item) => actionCard({ action: "night-talk", value: item.id, title: item.title, description: item.description, source: item.insight, meta: `好感 +${item.favor}`, kind: item.id === "sincere" ? "special" : "" })).join("")}</div>
  `);
}

function renderGameDeath() {
  return gameShell(`
    ${sceneHeader("命灯熄灭", "你甚至没看清她如何出掌", "气血断绝的一刻，胸前一盏无形命灯替你碎了。死前的恐惧与判断，全都留在记忆里。")}
    <div class="death-verdict"><span>剩余命灯</span><strong>${state.lives}</strong><p>${state.lives > 0 ? "残灯回照，可返回青衣妇人进门之前。" : "两灯皆灭，此生终结。"}</p></div>
    <div class="notice-block"><strong>已知死因</strong><br />${escapeHtml(state.lastDeathChoice || "实力差距过大，正面激怒聚气境武者。")}</div>
    <div class="button-row">${state.lives > 0 ? `<button class="primary-button" data-action="return-after-death">借残灯回照</button>` : `<button class="primary-button" data-action="restart">另起一世</button>`}</div>
  `);
}

function renderQuietDeparture() {
  return gameShell(`
    ${sceneHeader("天明 · 雨停", "你活了下来，也永远错过了这一场人物奇遇", "青衣妇人没有再看你。天色发白时，她踏雨向西，身影很快消失。")}
    <div class="encounter-ledger"><div><span>所得</span><strong>平安</strong><p>命灯未损，关系未立。</p></div><div><span>错过</span><strong>身份未知</strong><p>命格确认：此后再无相遇条件。</p></div></div>
    <div class="action-list">${actionCard({ action: "accept-departure", title: "带着破庙所得前往金陵", description: "有些奇遇允许拒绝；活下来，本身也是一个结果。", source: "去路", meta: "结束今夜", kind: "special" })}</div>
  `);
}

function renderEncounterReward() {
  return gameShell(`
    ${sceneHeader("天色将明", "青衣妇人终于说出自己的名字", "她叫龙青鱼，漕帮帮主夫人。昨夜坐在你对面的，是足以调动半条大江船队的人。")}
    <div class="npc-reveal-card"><div class="reveal-seal">龙<br />青<br />鱼</div><div><span>漕帮 · 帮主夫人</span><h2>${escapeHtml(state.relationship)}</h2><p>她记住了你没有趁虚而入，也记住了你如何说出她不愿承认的真相。</p></div></div>
    <div class="encounter-ledger"><div><span>关系</span><strong>${escapeHtml(state.relationship)}</strong><p>龙青鱼好感 ${state.ladyFavor}，临安重逢条件已经出现。</p></div><div><span>所得</span><strong>${MIND_ART.name}</strong><p>潜能一千五百，并获得一门水行心法。</p></div></div>
    <div class="button-row"><button class="primary-button" data-action="receive-mind-art">接受灌顶</button></div>
  `);
}

function renderMindArt() {
  return gameShell(`
    ${sceneHeader("心法灌顶", "鱼跃龙门诀", "龙青鱼并指点在你眉心。江鲤行波图化作一段陌生而完整的行气记忆。")}
    <article class="mind-art-card"><span>${escapeHtml(MIND_ART.rank)}</span><h2>${escapeHtml(MIND_ART.name)}</h2><p>${escapeHtml(MIND_ART.source)}</p><ul>${MIND_ART.traits.map((trait) => `<li>${escapeHtml(trait)}</li>`).join("")}</ul></article>
    <div class="notice-block"><strong>武道并非只写在人物卡上</strong><br />庙后黑水涧挡着去往金陵的近路。刚得到的心法，立刻就有一次亲手验证的机会。</div>
    <div class="action-list">${actionCard({ action: "to-road-trial", title: "前往庙后黑水涧", description: "选择潜入涧底，或沿更远的山道绕行。", source: "天明", meta: "武学初试", kind: "special" })}</div>
  `);
}

function renderRoadTrial() {
  return gameShell(`
    ${sceneHeader("天明 · 黑水涧", "近路沉在三丈深的寒水下面", "石阶在对岸继续，水面看不见桥。新得的心法能让你下潜，但涧底有什么仍是未知。")}
    <div class="action-list">
      ${actionCard({ action: "road-trial", value: "dive", title: ROAD_TRIALS.dive.title, description: "运转江鲤行波图，从水下寻找旧路，也承担未知风险。", source: "鱼跃龙门诀", meta: ROAD_TRIALS.dive.reward, kind: "special" })}
      ${actionCard({ action: "road-trial", value: "detour", title: ROAD_TRIALS.detour.title, description: "不试新功，沿山脊多走半日。", source: "稳妥", meta: ROAD_TRIALS.detour.reward })}
    </div>
  `);
}

function renderRoadResult() {
  const result = state.roadTrialResult;
  return gameShell(`
    ${sceneHeader("黑水涧 · 去路已开", result?.title || "沿路而行", result?.result || "你平安离开破庙。")}
    <div class="encounter-ledger"><div><span>选择</span><strong>${escapeHtml(result?.title || "未知")}</strong><p>${escapeHtml(result?.condition || "")}</p></div><div><span>结果</span><strong>${escapeHtml(result?.reward || "平安")}</strong><p>${state.roadTrial === "dive" ? "新心法已经真正改变了可走的道路。" : "安全与错过同时成立。"}</p></div></div>
    <div class="action-list">${actionCard({ action: "continue-road", title: "沿官道望向金陵城", description: "城门、沈家、漕帮与追查血书的人，都在前方。", source: "第一夜", meta: "告一段落", kind: "special" })}</div>
  `);
}

function renderEnding() {
  const routes = [
    ["shen", "持沈字铜钱进城", "前往金陵沈家，追查丹房差事与铜匣残片。", "沈家 · 丹房"],
    ["offering", "等到初一再回破庙", "按晴日、辰时与根骨条件，追索神秘贡品。", "破庙 · 地级奇遇"],
    ["linan", "沿漕帮水路去临安", "寻找龙青鱼留下的重逢条件，也踏入漕帮权争。", "漕帮 · 人物线"],
  ];
  return gameShell(`
    ${sceneHeader("金陵道 · 晨雾", state.departed ? "你独自走向金陵" : "第一夜之后，江湖终于向你张开", state.departed ? "你保住两盏命灯，也失去了一个永不再来的名字。" : "你仍是未入门的少年，却已经有了一门心法、一段关系和几条会彼此牵动的去路。")}
    <div class="wudao-ending-grid">
      <div><span>人物</span><strong>${escapeHtml(state.name)}</strong><p>${escapeHtml(getBackground(state.backgroundId)?.name)} · ${escapeHtml(getVow(state.vowId)?.title)}</p></div>
      <div><span>命灯</span><strong>${state.lives} / ${LIFE_RULE.lives}</strong><p>${state.lastDeathChoice ? "已经用死亡确认过一次实力差距" : "尚未熄灭"}</p></div>
      <div><span>武学</span><strong>${state.mindArt ? MIND_ART.name : "无"}</strong><p>${state.roadTrial === "dive" ? "已在黑水涧亲手运用" : state.mindArt ? "尚未冒险下水" : "青衣来客已成过路人"}</p></div>
      <div><span>关系</span><strong>${escapeHtml(state.relationship || "无")}</strong><p>${state.relationship ? "临安重逢条件已出现" : "今夜未与任何势力结缘"}</p></div>
    </div>
    <div class="next-hooks">
      ${routes.map(([id, title, description, meta]) => actionCard({ action: "choose-route", value: id, title, description, source: state.nextRoute === id ? "已定" : "去路", meta, kind: state.nextRoute === id ? "special" : "" })).join("")}
    </div>
    ${state.nextRoute ? `<div class="notice-block"><strong>下一程已定</strong><br />晨雾散去后，你将沿这条路继续。</div>` : ""}
    <div class="button-row"><button class="secondary-button" data-action="restart">另起一世</button></div>
  `);
}

const renderers = {
  landing: renderLanding,
  worldIntro: renderWorldIntro,
  characterDraft: renderCharacterDraft,
  vow: renderVow,
  destiny: renderDestiny,
  characterSheet: renderCharacterSheet,
  templeWake: renderTempleWake,
  fateSight: renderFateSight,
  allocation: renderAllocation,
  templeTasks: renderTempleTasks,
  ladyArrival: renderLadyArrival,
  ladyPressure: renderLadyPressure,
  ladyTest: renderLadyTest,
  nightTalk: renderNightTalk,
  gameDeath: renderGameDeath,
  quietDeparture: renderQuietDeparture,
  encounterReward: renderEncounterReward,
  mindArt: renderMindArt,
  roadTrial: renderRoadTrial,
  roadResult: renderRoadResult,
  ending: renderEnding,
};

function screenMode() {
  if (state.screen === "gameDeath") return "death";
  if (["encounterReward", "mindArt", "roadResult", "ending", "quietDeparture"].includes(state.screen)) return "settlement";
  if (["landing", "worldIntro", "characterDraft", "vow", "destiny", "characterSheet"].includes(state.screen)) return "neutral";
  return "simulation";
}

function render() {
  document.body.dataset.mode = screenMode();
  const renderer = renderers[state.screen] || renderLanding;
  app.innerHTML = renderer();
}

function handleDeath(choice) {
  if (state.lives <= 1) return;
  state.lives -= 1;
  state.lastDeathChoice = choice?.forecast || "正面激怒远强于自己的武者";
  track("death", { choice: choice?.id, lives: state.lives });
  moveTo("gameDeath");
}

const handlers = {
  "new-journey": () => {
    clearState();
    state = createInitialState();
    moveTo("worldIntro");
  },
  "continue-journey": () => {
    state = savedState ? structuredClone(savedState) : createInitialState();
    render();
  },
  "enter-creation": () => moveTo("characterDraft"),
  "select-background": (value) => {
    if (!BACKGROUNDS.some((item) => item.id === value)) return;
    state.backgroundId = value;
    refresh();
  },
  "to-vow": () => {
    if (!state.name.trim() || !getBackground(state.backgroundId)) return;
    moveTo("vow");
  },
  "select-vow": (value) => {
    if (!VOWS.some((item) => item.id === value)) return;
    state.vowId = value;
    moveTo("destiny");
  },
  "reveal-destiny": () => {
    state.destinyRevealed = true;
    refresh();
  },
  "confirm-destiny": () => moveTo("characterSheet"),
  "start-journey": () => moveTo("templeWake"),
  "search-fire": () => {
    if (state.peaches > 0) state.peaches -= 1;
    moveTo("fateSight");
  },
  "use-destiny": () => moveTo("allocation"),
  "allocate-jade": (value) => {
    if (!["strength", "balanced", "fortune"].includes(value)) return;
    state.allocationId = value;
    state.attributes = allocateJadeBonus(value);
    refresh();
  },
  "confirm-allocation": () => moveTo("templeTasks"),
  "temple-task": (value) => {
    if (state.completedTempleTasks.includes(value) || value === "mysterious_offering") return;
    const encounter = getTempleEncounter(value);
    const cost = templeTaskCost(value, state.attributes);
    if (!encounter || !cost || state.peaches < cost.peaches) return;
    state.fireMinutes = Math.max(0, state.fireMinutes - cost.minutes);
    state.peaches -= cost.peaches;
    state.potential += 50;
    state.completedTempleTasks.push(value);
    state.templeLog.push(`${encounter.name}：${encounter.reward}`);
    track("temple_encounter", { id: value, cost });
    refresh();
  },
  "meet-lady": () => moveTo("ladyArrival"),
  "lady-choice": (value) => {
    const choice = resolveLadyChoice("first", value);
    if (!choice) return;
    state.ladyChoiceLog.push(value);
    if (choice.outcome === "death") return handleDeath(choice);
    if (choice.outcome === "depart") {
      state.departed = true;
      return moveTo("quietDeparture");
    }
    moveTo("ladyPressure");
  },
  "lady-pressure": (value) => {
    const choice = resolveLadyChoice("pressure", value);
    if (!choice) return;
    state.ladyChoiceLog.push(value);
    if (choice.outcome === "death") return handleDeath(choice);
    state.ladyFavor = 20;
    moveTo("ladyTest");
  },
  "lady-test": (value) => {
    const choice = resolveLadyChoice("test", value);
    if (!choice) return;
    state.ladyChoiceLog.push(value);
    if (choice.outcome === "death") return handleDeath(choice);
    moveTo("nightTalk");
  },
  "night-talk": (value) => {
    const result = resolveNightTalk(value, state.ladyFavor);
    if (!result) return;
    state.ladyChoiceLog.push(value);
    state.ladyFavor = result.totalFavor;
    state.relationship = result.relation;
    state.potential += 1500;
    state.mindArt = result.reward?.id || null;
    track("lady_encounter", { choice: value, relation: result.relation });
    moveTo("encounterReward");
  },
  "return-after-death": () => moveTo("ladyArrival"),
  "accept-departure": () => moveTo("ending"),
  "receive-mind-art": () => moveTo("mindArt"),
  "to-road-trial": () => moveTo("roadTrial"),
  "road-trial": (value) => {
    const result = resolveRoadTrial(value, state.mindArt === MIND_ART.id);
    if (!result) return;
    state.roadTrial = value;
    state.roadTrialResult = result;
    state.potential += result.potential;
    track("road_trial", { choice: value });
    moveTo("roadResult");
  },
  "continue-road": () => moveTo("ending"),
  "choose-route": (value) => {
    if (!["shen", "offering", "linan"].includes(value)) return;
    state.nextRoute = value;
    track("next_route", { route: value });
    refresh();
  },
  restart: () => {
    clearState();
    state = createInitialState();
    render();
  },
};

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target || target.disabled) return;
  handlers[target.dataset.action]?.(target.dataset.value || "");
});

app.addEventListener("input", (event) => {
  if (event.target.dataset.field !== "hero-name") return;
  state.name = event.target.value.slice(0, 8);
  saveState();
  const button = app.querySelector('[data-action="to-vow"]');
  if (button) button.disabled = !state.name.trim() || !state.backgroundId;
});

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea") || !/^[1-9]$/.test(event.key)) return;
  const actions = [...app.querySelectorAll(".action-card:not(:disabled), .inline-button:not(:disabled)")];
  actions[Number(event.key) - 1]?.click();
});

render();
