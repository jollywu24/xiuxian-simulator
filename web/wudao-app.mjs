import {
  ATTRIBUTES,
  BACKGROUNDS,
  DESTINY,
  MIND_ART,
  NIGHT_TALK,
  TEMPLE_ENCOUNTERS,
  VOWS,
  allocateJadeBonus,
  bureauConsequence,
  getBackground,
  getTempleEncounter,
  getVow,
  resolveLadyChoice,
  resolveNightTalk,
  templeTaskCost,
} from "./wudao-core.mjs";

const STORAGE_KEY = "wudao-novel-route-v1";
const app = document.querySelector("#app");

function createInitialState() {
  return {
    version: 1,
    screen: "landing",
    realName: "陈玄",
    gameName: "陈司命",
    backgroundId: "mystery",
    vowId: "path",
    destinyRevealed: false,
    allocationId: "balanced",
    attributes: allocateJadeBonus("balanced"),
    lives: 2,
    potential: 0,
    peaches: 3,
    fireMinutes: 120,
    completedTempleTasks: [],
    templeLog: [],
    forumChoice: null,
    ladyStage: "first",
    ladyChoiceLog: [],
    ladyFavor: 0,
    relationship: null,
    mindArt: null,
    realitySynced: false,
    bureauChoice: null,
    bureauResult: null,
    events: [],
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || saved.version !== 1 || !saved.screen) return null;
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
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
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

function journalHtml() {
  const items = [
    ["现实 · 江海大学", state.destinyRevealed ? "《武道》已无法卸载" : "暑假宿舍，只剩陈玄一人", "current"],
    ["天武四年 · 金陵东郊", state.completedTempleTasks.length ? `破庙奇遇 ${state.completedTempleTasks.length}/3` : "初入江湖", state.completedTempleTasks.length ? "shifted" : ""],
  ];
  if (state.ladyChoiceLog.length) items.push(["寅时 · 青衣来客", state.relationship ? `龙青鱼 · ${state.relationship}` : "奇遇仍在变化", state.relationship ? "shifted" : "current"]);
  if (state.mindArt) items.push(["现实同步", state.realitySynced ? "鱼跃龙门诀已经生效" : "尚未亲自验证", state.realitySynced ? "shifted" : "current"]);
  return `
    <div class="panel-title">两界纪事</div>
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
          <div class="wudao-avatar">司命</div>
          <div><h3>${escapeHtml(state.gameName)}</h3><p>${escapeHtml(background?.name)} · 十六岁</p></div>
        </div>
        <div class="panel-title">人物状态</div>
        <div class="status-grid compact-status">
          <div><span>称号</span><strong>${escapeHtml(vow?.title)}</strong></div>
          <div><span>境界</span><strong>无</strong></div>
          <div><span>命数</span><strong>${state.lives}</strong></div>
          <div><span>潜能</span><strong>${state.potential}</strong></div>
        </div>
      </div>
      <div>
        <div class="panel-title">五维</div>
        <div class="attribute-mini-list">
          ${ATTRIBUTES.map((attribute) => `<div><span>${escapeHtml(attribute.name)}</span><strong>${state.attributes[attribute.id] || 0}</strong></div>`).join("")}
        </div>
        ${state.destinyRevealed ? `<div class="destiny-mini"><span>专属命格</span><strong>${DESTINY.name}</strong><p>${DESTINY.effect}</p></div>` : ""}
      </div>
      <div>
        <div class="panel-title">随身所得</div>
        <div class="inventory-list">
          ${state.backgroundId === "mystery" ? `<div><strong>半块家传玉佩</strong><span>可重分配三点五维加成</span></div><div><strong>一封血书</strong><span>指向金龙会万鲤堂孙不离</span></div>` : ""}
          ${state.completedTempleTasks.includes("traveler_relic") ? `<div><strong>金陵东郊残图</strong><span>已经解锁破庙外道路</span></div>` : ""}
          ${state.completedTempleTasks.includes("shen_promise") ? `<div><strong>沈字铜钱</strong><span>可作为金陵沈家信物</span></div>` : ""}
          ${state.mindArt ? `<div><strong>${MIND_ART.name}</strong><span>${MIND_ART.rank} · 龙青鱼所授</span></div>` : ""}
        </div>
      </div>
    </div>
  `;
}

function gameShell(content) {
  return `
    <main class="game-shell">
      <header class="topbar">
        <div class="brand-mini"><span class="brand-seal">武</span><span>武道</span></div>
        <div class="mode-badge">${modeLabel()}</div>
        <div class="resource-row"><div class="resource"><span>命数</span><strong>${state.lives}</strong></div><div class="resource"><span>潜能</span><strong>${state.potential}</strong></div></div>
      </header>
      <div class="game-grid">
        <aside class="panel timeline-panel">${journalHtml()}</aside>
        <section class="scene-panel">${content}</section>
        <aside class="panel character-panel">${characterPanelHtml()}</aside>
      </div>
    </main>
  `;
}

function sceneHeader(eyebrow, title, subtitle = "") {
  return `<header class="scene-head"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1 class="scene-title">${escapeHtml(title)}</h1>${subtitle ? `<p class="scene-subtitle">${escapeHtml(subtitle)}</p>` : ""}</header>`;
}

function modeLabel() {
  const map = {
    templeWake: "天武四年 · 子时三刻",
    fateSight: "金陵东郊 · 无名破庙",
    allocation: "命格运转 · 五维重分",
    templeTasks: "固定奇遇 · 破庙",
    forum: "现实 · 江海大学宿舍",
    ladyArrival: "天武四年 · 寅时二刻",
    ladyPressure: "偶发奇遇 · 因爱成恨",
    ladyTest: "偶发奇遇 · 危局未解",
    nightTalk: "偶发奇遇 · 破庙夜话",
    encounterReward: "奇遇结局 · 鱼跃龙门",
    mindArt: "心法灌顶 · 江鲤行波",
    realitySync: "现实 · 超凡初证",
    bureauDoor: "现实 · 武道局登门",
    ending: "现实与武道 · 双线初启",
    gameDeath: "武道人物 · 此命已尽",
    quietDeparture: "偶发奇遇 · 擦肩而过",
  };
  return map[state.screen] || "武道";
}

function renderLanding() {
  return setupShell(`
    <div class="title-lockup wudao-title">
      <div class="fate-ring"><span class="fate-glyph">武</span></div>
      <p class="eyebrow">现实 · 江海大学 · 盛夏</p>
      <h1>武道</h1>
      <p class="subtitle">一款无法卸载的文字游戏。<br />一个只有两条命的真实江湖。</p>
      <div class="button-row">
        <button class="primary-button" data-action="new-game">点开陌生图标</button>
        ${savedState && savedState.screen !== "landing" ? `<button class="secondary-button" data-action="continue-game">继续 · ${escapeHtml(savedState.gameName)}</button>` : ""}
      </div>
    </div>
  `, true);
}

function renderRealityIntro() {
  return setupShell(`
    <p class="eyebrow">暑假第一日 · 江海大学男生宿舍</p>
    <h1 class="setup-title">退掉一局游戏后，平板自己黑了</h1>
    <div class="world-ledger">
      <article class="world-fact"><span>现实身份</span><strong>陈玄 · 江海大学学生</strong><p>本地长大，父母早逝，靠房租和游戏代练生活。这个暑假，他独自留在空宿舍。</p></article>
      <article class="world-fact"><span>屏幕异象</span><strong>刀剑相击的血红图标</strong><p>没有安装记录，没有厂商署名。图标下面只有两个字：武道。</p></article>
      <article class="world-fact"><span>唯一说明</span><strong>你的选择将成为真实人生</strong><p>它不索要银钱，只询问智慧、勇气，以及是否愿意踏进一个陌生江湖。</p></article>
    </div>
    <div class="button-row"><button class="primary-button" data-action="enter-creation">进入武道</button></div>
  `);
}

function renderCharacterDraft() {
  return setupShell(`
    <p class="eyebrow">武道人物 · 第一步</p>
    <h1 class="setup-title">先莫问去路，且忆来处</h1>
    <p class="subtitle">身世决定你在江湖里最先拥有的东西，也决定什么会追在你身后。</p>
    <div class="origin-grid wudao-origin-grid">
      ${BACKGROUNDS.map((item) => `
        <button class="origin-card ${state.backgroundId === item.id ? "selected" : ""}" data-action="select-background" data-value="${item.id}">
          <span class="origin-icon">${item.id === "mystery" ? "谜" : item.id === "clan" ? "门" : item.id === "common" ? "市" : "生"}</span>
          <strong>${escapeHtml(item.name)}</strong><p>${escapeHtml(item.summary)}</p>
          <span class="origin-tag">所得：${escapeHtml(item.gain)}</span><span class="origin-cost">代价：${escapeHtml(item.cost)}</span>
        </button>
      `).join("")}
    </div>
    <div class="field-row wudao-name-field"><label for="game-name">江湖姓名</label><input id="game-name" data-field="game-name" maxlength="8" value="${escapeHtml(state.gameName)}" /></div>
    <div class="button-row"><button class="primary-button" data-action="to-vow" ${state.backgroundId && state.gameName.trim() ? "" : "disabled"}>写下初心</button></div>
  `);
}

function renderVow() {
  return setupShell(`
    <p class="eyebrow">武道人物 · 第二步</p>
    <h1 class="setup-title">江湖路远，你为何执剑？</h1>
    <div class="action-list vow-list">
      ${VOWS.map((item) => actionCard({ action: "select-vow", value: item.id, title: item.name, description: item.effect, source: item.title, meta: state.vowId === item.id ? "已选" : "选择" , kind: state.vowId === item.id ? "special" : "" })).join("")}
    </div>
    <div class="button-row"><button class="ghost-button" data-action="back-creation">返回身世</button><button class="primary-button" data-action="reveal-destiny">抽取命格</button></div>
  `);
}

function renderDestiny() {
  return setupShell(`
    <p class="eyebrow">专属命格 · 代价已经标明</p>
    <h1 class="setup-title">逆天改命</h1>
    <div class="destiny-reveal-card">
      <span class="destiny-rank">${DESTINY.rank}</span>
      <strong>${DESTINY.name}</strong>
      <p>${DESTINY.effect}</p>
      <div class="danger-note"><span>代价</span>${DESTINY.cost}</div>
    </div>
    <div class="quote-block">你原本分配的二十点五维被全部抹去。屏幕上只剩五个零，以及一句话：<strong>“看见命运，不等于有力气抓住它。”</strong></div>
    <div class="button-row"><button class="primary-button" data-action="confirm-destiny">接受代价，查看人物卡</button></div>
  `);
}

function renderCharacterSheet() {
  const background = getBackground(state.backgroundId);
  const vow = getVow(state.vowId);
  return setupShell(`
    <p class="eyebrow">武道人物 · 生死名册</p>
    <h1 class="setup-title">${escapeHtml(state.gameName)}，十六岁，尚未习武</h1>
    <div class="birth-sheet wudao-sheet">
      <div class="wudao-sheet-seal">司<br />命</div>
      <div class="birth-details">
        <h2>${escapeHtml(state.gameName)}</h2><p class="birth-meta">${escapeHtml(background.name)} · ${escapeHtml(vow.title)}</p>
        <div class="birth-facts">
          <div><span>境界</span><strong>无</strong></div><div><span>实战经验</span><strong>零</strong></div>
          <div><span>命格</span><strong>${DESTINY.name}</strong></div><div><span>可用命数</span><strong>二</strong></div>
          <div><span>随身物</span><strong>${state.backgroundId === "mystery" ? "半块玉佩、一封血书" : background.gain}</strong></div><div><span>初心</span><strong>${vow.name}</strong></div>
        </div>
        <div class="attribute-sheet">${ATTRIBUTES.map((item) => `<div><span>${item.name}</span><strong>0</strong></div>`).join("")}</div>
      </div>
    </div>
    <div class="button-row"><button class="ghost-button" data-action="back-vow">改写初心</button><button class="primary-button" data-action="start-wudao">选择金陵城外 · 破庙夜雨</button></div>
  `);
}

function renderTempleWake() {
  return gameShell(`
    ${sceneHeader("天武四年八月初二 · 子时三刻", "你是被冷醒的", "金陵城东郊，无名破庙。屋外大雨，火光只够再撑一个时辰。")}
    <div class="temple-scene">
      <div class="temple-glyphs" aria-hidden="true"><span>雨</span><span>火</span><span>庙</span></div>
      <div class="story-copy">
        <p>湿透的旧青衫贴在身上。你背靠长满青苔的砖墙，气血尚存，体力却几乎见底。</p>
        <p>供桌、蒲团和漏雨的瓦檐都没有异样。唯一能交互的东西，是将熄的篝火。</p>
        <div class="danger-note"><span>当前状态</span>饥饿：无法靠休息恢复体力。体力耗尽后，气血会开始下降。</div>
      </div>
    </div>
    <div class="action-list">${actionCard({ action: "search-fire", title: "拨亮篝火，检查供桌", description: "先解决饥饿，再判断这座破庙有没有别的出路。", source: "生存", meta: "发现山桃", kind: "special" })}</div>
  `);
}

function renderFateSight() {
  return gameShell(`
    ${sceneHeader("无名破庙 · 火光渐稳", "吃下山桃后，你终于看清整座庙", "破庙仍然破败，但命格眼中的因果开始发亮。")}
    <div class="story-copy"><p>你从供桌后找出四枚山桃，吃下一枚，体力终于不再流失。破庙的小地图随之展开。</p><p>当你凝神注视供桌、东北角墙体和那几枚来历不明的贡品时，金色因果线从眼前浮起。</p></div>
    <div class="fate-forecast"><span>是否发动专属命格</span><strong>查看当前场景全部固定奇遇及触发条件</strong></div>
    <div class="action-list">${actionCard({ action: "use-destiny", title: "发动逆天改命", description: "提前知道奖励与条件，但没有任何条件会因此自动完成。", source: "专属命格", meta: "显露因果", kind: "special" })}</div>
  `);
}

function renderAllocation() {
  if (state.backgroundId !== "mystery") {
    return gameShell(`
      ${sceneHeader("命格运转 · 五维归零", "你没有可以重新分配的装备加成", "逆天改命能挪动已有属性，却不能凭空创造属性。破庙里的条件仍要以凡人之身完成。")}
      <div class="danger-note"><span>当前五维</span>根骨、悟性、身法、力道、福缘全部为零。沈氏承诺会消耗更多时间与山桃。</div>
      <div class="button-row"><button class="primary-button" data-action="confirm-allocation">以凡人之身追逐奇遇</button></div>
    `);
  }
  const choices = [
    ["strength", "尽数转为力道", "力道三。敲墙最快，也最适合当前破庙。"],
    ["balanced", "保留均衡加成", "根骨、身法、力道各一。稳妥，但耗时更久。"],
    ["fortune", "尽数转为福缘", "福缘三。可能影响未来奇遇，却无法缓解眼前体力。"],
  ];
  return gameShell(`
    ${sceneHeader("命格运转 · 家传玉佩", "三个装备加成，可以被重新分配", "基础五维仍是零；你只能挪动玉佩暂时提供的三点。")}
    <div class="action-list">
      ${choices.map(([id, title, description]) => actionCard({ action: "allocate-jade", value: id, title, description, source: "五维重分", meta: state.allocationId === id ? "当前" : "选择", kind: state.allocationId === id ? "special" : "" })).join("")}
    </div>
    <div class="button-row"><button class="primary-button" data-action="confirm-allocation">以此分配追逐奇遇</button></div>
  `);
}

function templeEncounterCard(item) {
  const completed = state.completedTempleTasks.includes(item.id);
  const locked = item.id === "mysterious_offering";
  const cost = templeTaskCost(item.id, state.attributes);
  const status = completed ? "已得" : locked ? "时机未到" : cost ? `${cost.minutes} 分钟${cost.peaches ? ` · 山桃 ${cost.peaches}` : ""}` : "";
  return `
    <article class="quest-card ${completed ? "completed" : ""} ${locked ? "locked" : ""}">
      <div class="quest-top"><span>${escapeHtml(item.rank)}级奇遇</span><strong>${escapeHtml(item.name)}</strong></div>
      <p><b>条件：</b>${escapeHtml(item.condition)}</p><p><b>可见所得：</b>${escapeHtml(item.reward)}</p>
      <button data-action="temple-task" data-value="${item.id}" ${completed || locked ? "disabled" : ""}>${completed ? "已经取得" : locked ? "记下条件" : `执行 · ${escapeHtml(status)}`}</button>
    </article>
  `;
}

function renderTempleTasks() {
  const canLeave = state.completedTempleTasks.includes("traveler_relic") && state.completedTempleTasks.includes("shen_promise");
  return gameShell(`
    ${sceneHeader("逆天改命 · 固定奇遇", "命运把答案写出来，代价仍要你亲手支付", "这些奇遇只会被一人取走。现在离开，它们也可能永远消失。")}
    <div class="quest-grid">${TEMPLE_ENCOUNTERS.map(templeEncounterCard).join("")}</div>
    ${state.templeLog.length ? `<div class="result-log">${state.templeLog.map((entry) => `<p>${escapeHtml(entry)}</p>`).join("")}</div>` : ""}
    <div class="button-row"><button class="primary-button" data-action="leave-temple" ${canLeave ? "" : "disabled"}>带着残图与铜钱，暂离武道</button></div>
  `);
}

function renderForum() {
  return gameShell(`
    ${sceneHeader("现实 · 江海大学宿舍", "梦里的疲惫与饥饿，一起回到了身体里", "《武道》已经从平板转移到你正在注视的设备；它没有卸载按钮。")}
    <div class="story-copy"><p>睡醒后，你的手臂像真的敲过一千次墙，胃里也残留着破庙中的饥火。搜索引擎最前端，多出一个此前绝不存在的“武”字论坛。</p></div>
    <div class="forum-board">
      <div class="forum-alert"><strong>置顶 · 新人必读</strong><p>人物在武道中的武功、属性和境界会同步现实。初始只有两条命：第一次死亡，重建人物时属性减半；第二次死亡，现实也会死亡。</p></div>
      <div><strong>第三批资格已经发放</strong><p>龙国武道局招募新人；民间势力也在高价收购银两、命格与奇遇消息。</p></div>
      <div><strong>奇遇为何最珍贵</strong><p>多数奇遇只能被触发一次，没人知道条件与奖励。你恰好拥有唯一例外。</p></div>
    </div>
    <p class="choice-prompt">专属命格一旦暴露，你会得到保护，也可能失去选择奇遇归属的自由。</p>
    <div class="action-list">
      ${actionCard({ action: "forum-plan", value: "hide", title: "隐藏逆天改命", description: "不在论坛发言，不加入任何组织，先独自验证这份能力。", source: "谨慎", meta: "小说主线", kind: "special" })}
      ${actionCard({ action: "forum-plan", value: "official", title: "准备向武道局部分登记", description: "只承认自己看见过异常征兆，不公开全部触发条件。", source: "交换", meta: "获得保护" })}
      ${actionCard({ action: "forum-plan", value: "guild", title: "联系民间天下会", description: "用奇遇情报换资源，但把命格交给逐利者估价。", source: "冒险", meta: "高风险" })}
    </div>
  `);
}

function forecastBlock() {
  return `<div class="fate-forecast"><span>逆天改命</span><strong>人物偶发奇遇：根据选择显示后续结局与生死条件</strong></div>`;
}

function renderLadyArrival() {
  return gameShell(`
    ${sceneHeader("天武四年八月初二 · 寅时二刻", "再回破庙，篝火旁多了一名青衣妇人", "她没有受伤，也没有求救。她只是心情极坏，而且武功高得足以随手杀你。")}
    <div class="story-copy"><p>你醒来时，她已经坐在火光另一侧。绝艳面容覆着寒霜，见你多看一眼，便讥讽天下男子都一样贪色。</p><p>你不知道她是谁，只知道她提到“要饭的”和一个令她失望的人时，杀意会突然变重。</p></div>
    ${forecastBlock()}
    <div class="action-list">
      ${state.lives > 1 ? actionCard({ action: "lady-choice", value: "retort", title: "反唇相讥", description: "指出她不该把旁人的过错迁怒于陌生人。", source: "预测：死亡", meta: "先天以下挡不住一掌", kind: "danger" }) : ""}
      ${actionCard({ action: "lady-choice", value: "silent", title: "沉默避让", description: "等到天亮，各走各路，不再与她产生交集。", source: "预测：安全", meta: "失去全部后续" })}
      ${actionCard({ action: "lady-choice", value: "deny_beggar", title: "只说：我不是乞丐", description: "不讨好，也不反击，看看这句话为什么会令她失控。", source: "预测：因爱成恨", meta: "进入后续奇遇", kind: "special" })}
    </div>
  `);
}

function renderLadyPressure() {
  return gameShell(`
    ${sceneHeader("偶发奇遇 · 危机", "她掐住你的脖颈，逼你承认自己卑贱", "你终于明白：她真正痛恨的不是乞丐，而是某个出身帮会、如今贪权变心的人。")}
    <div class="story-copy"><p>在你即将窒息时，她松开手，却没有放你离开。她又问了一遍：你是不是乞丐，是不是天下最卑贱的人？</p></div>
    ${forecastBlock()}
    <div class="action-list">
      ${state.lives > 1 ? actionCard({ action: "lady-pressure", value: "defy", title: "宁死不屈", description: "再次否认，让她把这一掌落下来。", source: "预测：死亡", meta: "失去一条命", kind: "danger" }) : ""}
      ${actionCard({ action: "lady-pressure", value: "yield", title: "先顺着她的话活下来", description: "承认身份，观察她为什么会因此又哭又笑。", source: "预测：继续", meta: "看见真正伤口", kind: "special" })}
    </div>
  `);
}

function renderLadyTest() {
  return gameShell(`
    ${sceneHeader("偶发奇遇 · 因爱成恨", "她想用你证明：陆连山能做的，她也能做", "这不是温柔邀约，而是一场由背叛、愤怒和报复驱动的试探。")}
    <div class="story-copy"><p>她突然换了神色，向你许诺庇护与亲近，仿佛只要你点头，便能立刻摆脱无名小卒的处境。</p><p>逆天改命却给出冰冷结论：你当前根骨远远不够，顺势攀附只会让她在清醒后杀你灭口。</p></div>
    ${forecastBlock()}
    <div class="action-list">
      ${state.lives > 1 ? actionCard({ action: "lady-test", value: "exploit", title: "接受这条捷径", description: "利用她的失意换取庇护，不问清醒后的代价。", source: "预测：死亡", meta: "条件不满足", kind: "danger" }) : ""}
      ${actionCard({ action: "lady-test", value: "refuse", title: "拒绝成为报复别人的工具", description: "劝她不要让今夜的决定，永远受那个负心人支配。", source: "预测：破庙夜话", meta: "关系转机", kind: "special" })}
    </div>
  `);
}

function renderNightTalk() {
  return gameShell(`
    ${sceneHeader("破庙夜话 · 火将熄", "卸下身份后，她只是一个无人倾诉的失意人", "她坐回篝火边，第一次提到陆连山：少时相识，门当户对，成婚之后却故人心变。")}
    <div class="story-copy"><p>你没有追问她的地位，也没有打断她。临近天亮，她忽然问：为这样一个人伤心，自己是不是很愚蠢？</p></div>
    <div class="action-list">
      ${NIGHT_TALK.map((choice) => actionCard({ action: "night-talk", value: choice.id, title: choice.title, description: choice.description, source: choice.insight, meta: `可能好感 +${choice.favor}`, kind: choice.id === "sincere" ? "special" : "" })).join("")}
    </div>
  `);
}

function renderGameDeath() {
  return gameShell(`
    ${sceneHeader("武道人物 · 死亡", "你甚至没看清她如何出掌", "人物气血归零。现实中的心跳仍在，但第二次死亡将没有这种幸运。")}
    <div class="death-verdict"><span>剩余命数</span><strong>${state.lives}</strong><p>${state.lives > 0 ? "重返武道后，开局属性将承受死亡惩罚。你仍记得逆天改命显示过的结局。" : "人物与现实同时终止。"}</p></div>
    <div class="button-row"><button class="primary-button" data-action="return-after-death" ${state.lives > 0 ? "" : "disabled"}>记住死因，再回寅时破庙</button></div>
  `);
}

function renderQuietDeparture() {
  return gameShell(`
    ${sceneHeader("破庙 · 天将明", "你们没有再说一句话", "她在雨停后离开。没有姓名、没有心法，也没有第二次相见的约定。")}
    <div class="story-copy"><p>这是一条安全命途。逆天改命让你提前知道它不会带来灾祸，也不会带来任何关系。</p></div>
    <div class="button-row"><button class="primary-button" data-action="return-to-lady">回看另一条因果</button></div>
  `);
}

function renderEncounterReward() {
  return gameShell(`
    ${sceneHeader("偶发奇遇完成 · 地级", "龙青鱼记住了她的‘野鬼少侠’", "天亮前，她终于说出姓名，也留下了日后在临安重逢的约定。")}
    <div class="npc-reveal-card"><div class="reveal-seal">青鱼</div><div><span>漕帮帮主夫人</span><h2>龙青鱼</h2><p>丈夫陆连山由丐帮起势，却在权位与感情之间背弃旧诺。她今夜离开漕帮，并非遭人追杀，而是不愿在帮中显露软弱。</p></div></div>
    <div class="encounter-ledger"><div><span>关系</span><strong>${escapeHtml(state.relationship)}</strong><p>龙青鱼好感 ${state.ladyFavor}。临安城开放“重逢”奇遇。</p></div><div><span>所得</span><strong>鱼跃龙门诀</strong><p>潜能一千五百，并获得可在现实生效的特殊心法。</p></div></div>
    <div class="button-row"><button class="primary-button" data-action="receive-mind-art">接受灌顶</button></div>
  `);
}

function renderMindArt() {
  return gameShell(`
    ${sceneHeader("江鲤行波图 · 识海", "一条青鲤逆流而上，第一次看见龙门", "龙青鱼的指尖点在眉心。她的武功你学不了，但这门由她独创的心法恰好不受门派限制。")}
    <article class="mind-art-card"><span>${MIND_ART.rank}</span><h2>${MIND_ART.name}</h2><p>${MIND_ART.source}</p><ul>${MIND_ART.traits.map((trait) => `<li>${escapeHtml(trait)}</li>`).join("")}</ul></article>
    <div class="button-row"><button class="primary-button" data-action="close-wudao">离开武道，验证心法</button></div>
  `);
}

function renderRealitySync() {
  return gameShell(`
    ${sceneHeader("现实 · 宿舍盥洗间", "文字里的心法，真的刻进了你的记忆", "你放满洗手池，将脸埋进水里，默念江鲤行波图。")}
    <div class="sync-trial"><span>00:00</span><strong>窒息感正在消失</strong><p>一分钟、三分钟、五分钟。水不再像阻断呼吸的墙，更像一股可以借力的缓流。</p></div>
    <div class="quote-block"><strong>现实同步成立。</strong>《武道》中的武功、属性与境界，都能成为现实中的超凡力量。</div>
    <div class="action-list">${actionCard({ action: "confirm-sync", title: "从水中抬头", description: "接受这不是梦，也接受人物死亡可能波及现实。", source: "超凡初证", meta: "鱼跃龙门诀生效", kind: "special" })}</div>
  `);
}

function renderBureauDoor() {
  return gameShell(`
    ${sceneHeader("现实 · 深夜敲门", "门外两人出示了龙国武道局证件", "于可心负责新人接洽，林毅是她的队长。他们知道陈玄刚获得第三批《武道》资格。")}
    <div class="npc-duo"><div><strong>于可心</strong><span>态度温和 · 主动说明登记规则</span></div><div><strong>林毅</strong><span>观察敏锐 · 已注意到你的异常疲惫</span></div></div>
    <p class="choice-prompt">他们暂时不知道“逆天改命”。你必须决定，登记到什么程度。</p>
    <div class="action-list">
      ${actionCard({ action: "bureau-choice", value: "conceal", title: "只登记鱼跃龙门诀", description: "承认获得心法和现实同步，不解释如何在第一夜找到地级奇遇。", source: "保密", meta: "保留主动权", kind: "special" })}
      ${actionCard({ action: "bureau-choice", value: "partial", title: "承认能看见部分奇遇征兆", description: "换取官方保护，但把能力描述成不稳定的直觉。", source: "交换", meta: "进入关注名单" })}
      ${actionCard({ action: "bureau-choice", value: "reveal", title: "公开逆天改命", description: "让武道局调集资深玩家保护你，也接受能力被征用的可能。", source: "公开", meta: "保护最高 · 自由最低", kind: "danger" })}
    </div>
  `);
}

function renderEnding() {
  const result = state.bureauResult;
  return gameShell(`
    ${sceneHeader("第一夜结束 · 两界同时天亮", result.title, result.effect)}
    <div class="end-summary wudao-ending-grid">
      <div><span>武道身份</span><strong>${escapeHtml(state.gameName)}</strong><p>${escapeHtml(getBackground(state.backgroundId).name)} · ${escapeHtml(getVow(state.vowId).title)}</p></div>
      <div><span>破庙所得</span><strong>残图与沈字铜钱</strong><p>金陵沈家与东郊地图已经成为下一步去处。</p></div>
      <div><span>人物因果</span><strong>龙青鱼 · ${escapeHtml(state.relationship)}</strong><p>临安“重逢”奇遇已经留下入口。</p></div>
      <div><span>现实所得</span><strong>${MIND_ART.name}</strong><p>水下闭气已亲手验证，超凡不再只是文字。</p></div>
    </div>
    <div class="notice-block"><strong>仍在逼近的风险</strong><br />${escapeHtml(result.risk)}</div>
    <div class="next-hooks"><div><span>金陵沈家</span><strong>丹房差事</strong></div><div><span>初一或十五</span><strong>神秘贡品</strong></div><div><span>临安城</span><strong>与龙青鱼重逢</strong></div></div>
    <div class="button-row"><button class="ghost-button" data-action="restart-story">重走第一夜</button></div>
  `);
}

const renderers = {
  landing: renderLanding,
  realityIntro: renderRealityIntro,
  characterDraft: renderCharacterDraft,
  vow: renderVow,
  destiny: renderDestiny,
  characterSheet: renderCharacterSheet,
  templeWake: renderTempleWake,
  fateSight: renderFateSight,
  allocation: renderAllocation,
  templeTasks: renderTempleTasks,
  forum: renderForum,
  ladyArrival: renderLadyArrival,
  ladyPressure: renderLadyPressure,
  ladyTest: renderLadyTest,
  nightTalk: renderNightTalk,
  gameDeath: renderGameDeath,
  quietDeparture: renderQuietDeparture,
  encounterReward: renderEncounterReward,
  mindArt: renderMindArt,
  realitySync: renderRealitySync,
  bureauDoor: renderBureauDoor,
  ending: renderEnding,
};

function screenMode(screen) {
  if (["realityIntro", "characterDraft", "vow", "destiny", "characterSheet"].includes(screen)) return "neutral";
  if (["forum", "realitySync", "bureauDoor", "ending"].includes(screen)) return "reality";
  if (screen === "gameDeath") return "death";
  if (["encounterReward", "mindArt"].includes(screen)) return "settlement";
  return screen === "landing" ? "neutral" : "simulation";
}

function render() {
  document.body.dataset.mode = screenMode(state.screen);
  app.innerHTML = (renderers[state.screen] || renderLanding)();
  saveState();
}

const handlers = {
  "new-game": () => {
    clearState();
    state = createInitialState();
    moveTo("realityIntro");
  },
  "continue-game": () => {
    if (!savedState) return;
    state = structuredClone(savedState);
    render();
  },
  "enter-creation": () => moveTo("characterDraft"),
  "select-background": ({ value }) => {
    if (!getBackground(value)) return;
    state.backgroundId = value;
    render();
  },
  "to-vow": () => {
    if (!state.backgroundId || !state.gameName.trim()) return;
    state.gameName = state.gameName.trim();
    moveTo("vow");
  },
  "back-creation": () => moveTo("characterDraft"),
  "select-vow": ({ value }) => {
    if (!getVow(value)) return;
    state.vowId = value;
    render();
  },
  "reveal-destiny": () => {
    state.destinyRevealed = true;
    track("destiny_revealed");
    moveTo("destiny");
  },
  "confirm-destiny": () => moveTo("characterSheet"),
  "back-vow": () => moveTo("vow"),
  "start-wudao": () => {
    track("wudao_entered", { background: state.backgroundId, vow: state.vowId });
    moveTo("templeWake");
  },
  "search-fire": () => moveTo("fateSight"),
  "use-destiny": () => moveTo("allocation"),
  "allocate-jade": ({ value }) => {
    if (!["strength", "balanced", "fortune"].includes(value)) return;
    state.allocationId = value;
    state.attributes = allocateJadeBonus(value);
    render();
  },
  "confirm-allocation": () => {
    if (state.backgroundId !== "mystery") {
      state.attributes = Object.fromEntries(ATTRIBUTES.map((attribute) => [attribute.id, 0]));
      state.allocationId = "none";
    }
    moveTo("templeTasks");
  },
  "temple-task": ({ value }) => {
    if (state.screen !== "templeTasks" || state.completedTempleTasks.includes(value)) return;
    const encounter = getTempleEncounter(value);
    const cost = templeTaskCost(value, state.attributes);
    if (!encounter || !cost) return;
    if (state.peaches < cost.peaches) return;
    state.peaches -= cost.peaches;
    state.fireMinutes = Math.max(15, state.fireMinutes - cost.minutes);
    state.potential += 50;
    state.completedTempleTasks.push(value);
    state.templeLog.push(encounter.result);
    track("temple_encounter_completed", { encounter: value, cost });
    render();
  },
  "leave-temple": () => {
    if (!["traveler_relic", "shen_promise"].every((id) => state.completedTempleTasks.includes(id))) return;
    moveTo("forum");
  },
  "forum-plan": ({ value }) => {
    if (!["hide", "official", "guild"].includes(value)) return;
    state.forumChoice = value;
    track("forum_plan_chosen", { choice: value });
    moveTo("ladyArrival");
  },
  "lady-choice": ({ value }) => handleLadyChoice("first", value),
  "lady-pressure": ({ value }) => handleLadyChoice("pressure", value),
  "lady-test": ({ value }) => handleLadyChoice("test", value),
  "return-after-death": () => {
    if (state.lives <= 0) return;
    state.ladyStage = "first";
    moveTo("ladyArrival");
  },
  "return-to-lady": () => moveTo("ladyArrival"),
  "night-talk": ({ value }) => {
    const result = resolveNightTalk(value, 20);
    if (!result) return;
    state.ladyFavor = result.totalFavor;
    state.relationship = result.relation;
    state.mindArt = result.reward?.id || null;
    state.potential += 1500;
    track("lady_encounter_completed", { choice: value, favor: result.totalFavor });
    moveTo("encounterReward");
  },
  "receive-mind-art": () => moveTo("mindArt"),
  "close-wudao": () => moveTo("realitySync"),
  "confirm-sync": () => {
    state.realitySynced = true;
    track("reality_sync_confirmed", { mindArt: state.mindArt });
    moveTo("bureauDoor");
  },
  "bureau-choice": ({ value }) => {
    const result = bureauConsequence(value);
    if (!result) return;
    state.bureauChoice = value;
    state.bureauResult = result;
    track("bureau_registration_decided", { choice: value });
    moveTo("ending");
  },
  "restart-story": () => {
    clearState();
    state = createInitialState();
    moveTo("realityIntro");
  },
};

function handleLadyChoice(stage, value) {
  const result = resolveLadyChoice(stage, value);
  if (!result) return;
  state.ladyChoiceLog.push({ stage, choice: value, outcome: result.outcome });
  track("lady_choice", { stage, choice: value, outcome: result.outcome });
  if (result.outcome === "death") {
    state.lives -= 1;
    moveTo("gameDeath");
  } else if (result.outcome === "depart") {
    moveTo("quietDeparture");
  } else if (result.outcome === "pressure") {
    state.ladyStage = "pressure";
    moveTo("ladyPressure");
  } else if (result.outcome === "test") {
    state.ladyStage = "test";
    moveTo("ladyTest");
  } else if (result.outcome === "talk") {
    state.ladyStage = "talk";
    moveTo("nightTalk");
  }
}

app.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target || target.disabled) return;
  handlers[target.dataset.action]?.({ value: target.dataset.value, target });
});

app.addEventListener("input", (event) => {
  if (event.target.dataset.field === "game-name") state.gameName = event.target.value;
});

window.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea")) return;
  const number = Number(event.key);
  if (!Number.isInteger(number) || number < 1) return;
  const actions = [...app.querySelectorAll(".action-card:not(:disabled)")];
  actions[number - 1]?.click();
});

render();
