import {
  ATTRIBUTES,
  BACKGROUNDS,
  DESTINY,
  LIFE_RULE,
  MARTIAL_STAGES,
  MIND_ART,
  NIGHT_TALK,
  ROAD_TRIALS,
  BLOOD_CHOICES,
  CAO_ENCOUNTERS,
  CAO_QUESTIONS,
  FISHING_PREPARATIONS,
  FIVE_ANIMAL_PLAY,
  FIVE_ANIMAL_ASPECTS,
  OBSERVATION_CHOICES,
  QINGQING_BOOK,
  RETURN_SPRING_BREW,
  SHEN_DAILY_ACTIONS,
  SHEN_DAILY_RULES,
  SHEN_JOBS,
  TREASURE_FISH_CHOICES,
  TEMPLE_ENCOUNTERS,
  VOWS,
  WORLD_FACTS,
  allocateJadeBonus,
  canStudyQingQing,
  getBackground,
  getCaoEncounter,
  getFiveAnimalAspect,
  getTempleEncounter,
  getVow,
  resolveLadyChoice,
  resolveNightTalk,
  resolveBloodChoice,
  resolveCaoAnswer,
  resolveFirstAlchemy,
  resolveFishingPreparation,
  resolveFiveAnimalBreakthrough,
  resolveMedicalBreakthrough,
  resolveObservationChoice,
  resolveRoadTrial,
  resolveShenDailyAction,
  resolveShenJob,
  resolveTreasureFishChoice,
  canLearnFishingRod,
  reallocateExistingAttributes,
  templeTaskCost,
} from "./wudao-core.mjs";
import {
  P0_STAKES,
  createFirstBattle,
  createP0State,
  getBodyBreakthroughBoard,
  getDiagnosisBoard,
  getP0Item,
  getP0Skill,
  grantSpringRainNeedles,
  migrateP0State,
  resolveApeLegacy,
  resolveBodyBreakthrough,
  resolveDiagnosisAction,
  resolveFirstBattleAction,
  resolveIngredientSource,
  resolveMidAutumnTravel,
  resolveMonkeyTest,
  resolveMonkeyConflict,
  resolveMonkeyWine,
  resolvePurpleDragonAlchemy,
  resolveStakeTraining,
  resolveThirdLadyTreatment,
  resolveWoundTreatment,
  chooseStake,
} from "./wudao-p0-core.mjs";

const STORAGE_KEY = "wudao-high-martial-v1";
const app = document.querySelector("#app");

function createInitialState() {
  return {
    version: 4,
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
    inventory: [],
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
    martialStage: "mortal",
    skills: [],
    shenChapterStarted: false,
    shenOriginalVersion: 2,
    shenJob: null,
    caoIdentitySeen: false,
    caoFavor: 0,
    bloodChoice: null,
    bloodLoss: 0,
    observationChoice: null,
    effectiveInsight: 0,
    caoAnswers: [],
    alchemyProgress: 0,
    medicalLevel: 0,
    gatheringProgress: 0,
    qingQingStudied: false,
    fiveAnimalBook: false,
    fiveAnimalLevel: 0,
    fiveAnimalProgress: 0,
    fiveAnimalAspect: null,
    shenAttributeGains: 0,
    shenDay: 1,
    shenLocation: "danroom",
    shenTimeLeft: SHEN_DAILY_RULES.slotsPerDay,
    shenStamina: SHEN_DAILY_RULES.startStamina,
    shenSatiety: SHEN_DAILY_RULES.startSatiety,
    shenDayLog: [],
    shenDayStart: null,
    shenFocus: { medicine: 0, martial: 0 },
    medicalProgress: 0,
    shenMeetingSeen: false,
    shenFuContact: false,
    shenSilver: 0,
    shenFishingPrep: [],
    fishingLevel: 0,
    riverFishStage: 0,
    releasedRiverFish: false,
    treasureFishCaught: false,
    treasureFishShared: false,
    wangFavor: 0,
    fishingRodMethod: false,
    alchemyLevel: 0,
    alchemyPills: 0,
    alchemyFailures: 0,
    shenLastAlchemyChoice: null,
    effectiveAlchemyInsight: 0,
    shenTendency: null,
    shenDeathNode: null,
    shenDeathReason: null,
    shenOutcome: null,
    shenChapterComplete: false,
    p0: createP0State(),
    events: [],
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || ![2, 3, 4].includes(saved.version) || !saved.screen) return null;
    const migrated = { ...createInitialState(), ...saved, version: 4, p0: migrateP0State(saved.p0) };
    if (migrated.p0.started && saved.p0?.items?.return_spring_pill === undefined) migrated.p0.items.return_spring_pill = Number(saved.alchemyPills || 0);
    if (saved.version === 2 && saved.shenChapterComplete && saved.fiveAnimalBook) {
      migrated.screen = "fiveAnimalReward";
      migrated.shenChapterComplete = false;
      migrated.shenOriginalVersion = 2;
      migrated.skills = migrated.skills.filter((skill) => skill !== FIVE_ANIMAL_PLAY.id);
    }
    return migrated;
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

function shenAttributePool() {
  return 3 + Number(state.shenAttributeGains || 0);
}

function p0ClockText() {
  const clock = state.p0?.clock || createP0State().clock;
  const segments = { dawn: "卯时", morning: "辰时", afternoon: "申时", evening: "酉时", night: "亥时" };
  return `大曜${clock.year}年八月${clock.day}日 · ${segments[clock.segment] || "夜"}`;
}

function p0RelationLabel(id) {
  const relation = state.p0?.relationships?.[id];
  if (!relation) return "尚未相识";
  return `情分 ${relation.favor} · 信任 ${relation.trust} · 人情债 ${relation.debt}`;
}

function reallocateShenAttributes(focus) {
  const attributes = reallocateExistingAttributes(shenAttributePool(), focus);
  attributes.constitution -= Number(state.bloodLoss || 0);
  return attributes;
}

function beginShenDay() {
  state.shenTimeLeft = SHEN_DAILY_RULES.slotsPerDay;
  state.shenStamina = SHEN_DAILY_RULES.startStamina;
  state.shenSatiety = SHEN_DAILY_RULES.startSatiety;
  state.shenDayLog = [];
  state.shenDayStart = {
    potential: state.potential,
    attributes: structuredClone(state.attributes),
    fiveAnimalLevel: state.fiveAnimalLevel,
    fiveAnimalProgress: state.fiveAnimalProgress,
    fiveAnimalAspect: state.fiveAnimalAspect,
    shenAttributeGains: state.shenAttributeGains,
    medicalLevel: state.medicalLevel,
    medicalProgress: state.medicalProgress,
    gatheringProgress: state.gatheringProgress,
    alchemyProgress: state.alchemyProgress,
    shenFocus: structuredClone(state.shenFocus),
    skills: structuredClone(state.skills),
    shenStamina: state.shenStamina,
    shenSatiety: state.shenSatiety,
    shenTimeLeft: state.shenTimeLeft,
  };
}

function restoreShenDay() {
  if (!state.shenDayStart) return;
  Object.assign(state, structuredClone(state.shenDayStart));
  state.shenDayLog = ["你记得透支而死的滋味，重新安排这一天。"];
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
    items.push(["天明 · 紫金河", state.roadTrial === "dive" ? "顺流抵达东湖" : "官道受阻", "shifted"]);
  }
  if (state.shenChapterStarted) {
    const shenDetail = state.shenChapterComplete
      ? state.alchemyPills ? "首炉回春丹已成" : "此路暂止"
      : state.fishingRodMethod ? "王五传下打鱼杆法"
        : state.treasureFishCaught ? "黄金钱鳘上岸"
          : state.shenMeetingSeen ? "曹青迁往东门药铺"
            : state.qingQingStudied ? "丹房求生" : state.bloodChoice ? "取血炼丹" : "无职可领";
    items.push([state.shenLocation === "pharmacy" ? "金陵 · 东门药铺" : "金陵 · 沈家丹房", shenDetail, state.shenChapterComplete ? "shifted" : "current"]);
  }
  if (state.p0?.started) {
    const p0Detail = state.p0.complete
      ? "神猿遗迹已见"
      : state.p0.legacyOutcome ? "水洞残势入眼"
        : state.p0.monkeyOutcome ? "灵猴已经认路"
          : state.p0.bodyProgress ? "锻体一重"
            : state.p0.stakeId ? `${P0_STAKES[state.p0.stakeId]?.name || "桩功"}入门`
              : state.p0.battleOutcome ? "长街夜战已决"
                : state.p0.treatmentOutcome ? "三夫人病局已定" : "三夫人病危";
    items.push([state.p0.location === "ruined_temple" ? "金陵东郊 · 破庙" : "金陵东门 · 医武之路", p0Detail, state.p0.complete ? "shifted" : "current"]);
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
  const stage = MARTIAL_STAGES.find((item) => item.id === state.martialStage) || MARTIAL_STAGES[0];
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
          <div><span>境界</span><strong>${state.martialStage === "body" ? "锻体一重" : stage.name}</strong></div>
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
          ${state.backgroundId === "mystery" ? `<div><strong>半块家传玉佩</strong><span>可把自身所得重分五维 · 当前总点 ${shenAttributePool()}</span></div><div><strong>一封血书</strong><span>指向金龙会万鲤堂孙不离</span></div>` : ""}
          ${state.completedTempleTasks.includes("traveler_relic") ? `<div><strong>金陵东郊残图</strong><span>标出破庙外的旧路</span></div>` : ""}
          ${state.completedTempleTasks.includes("shen_promise") ? `<div><strong>沈字铜钱</strong><span>可作为金陵沈家信物</span></div>` : ""}
          ${state.mindArt ? `<div><strong>${MIND_ART.name}</strong><span>${MIND_ART.rank} · 龙青鱼所授</span></div>` : ""}
          ${state.roadTrial === "dive" ? `<div><strong>紫金河水路</strong><span>鱼跃龙门诀可缩短往返沈家的路程</span></div>` : ""}
          ${state.inventory.includes(QINGQING_BOOK.id) ? `<div><strong>${QINGQING_BOOK.name}</strong><span>${state.qingQingStudied ? `已研习 · 医术 ${state.medicalLevel}级 ${state.medicalProgress}%` : "曹青所授 · 尚未研习"}</span></div>` : ""}
          ${state.fiveAnimalBook ? `<div><strong>${FIVE_ANIMAL_PLAY.name}</strong><span>${state.fiveAnimalLevel ? `${state.fiveAnimalLevel}级 ${state.fiveAnimalProgress}% · ${escapeHtml(getFiveAnimalAspect(state.fiveAnimalAspect)?.name || "已入门")}` : "基础健体功 · 尚未练成"}</span></div>` : ""}
          ${state.fishingRodMethod ? `<div><strong>《打鱼杆法》</strong><span>王五所授 · 抄水拍鱼、劈浪戳鱼</span></div>` : ""}
          ${state.inventory.includes("return_spring_pills") && !state.p0?.started ? `<div><strong>${Number(state.alchemyPills || 0)}枚下品回春丹</strong><span>亲手炼成 · 止血补气</span></div>` : ""}
          ${state.inventory.includes("hundred_pills_notes") ? `<div><strong>《百丹注解》</strong><span>曹青所授 · 再成三丹可换武功</span></div>` : ""}
          ${Object.entries(state.p0?.items || {}).filter(([, quantity]) => Number(quantity) > 0).map(([id, quantity]) => {
            const item = getP0Item(id);
            return item ? `<div><strong>${escapeHtml(item.name)}${Number(quantity) > 1 ? ` ×${Number(quantity)}` : ""}</strong><span>${escapeHtml(item.description)}</span></div>` : "";
          }).join("")}
          ${Object.entries(state.p0?.skills || {}).map(([id, progress]) => {
            const skill = getP0Skill(id);
            return skill ? `<div><strong>${escapeHtml(skill.name)}</strong><span>${escapeHtml(progress.stage === "learned" ? "已经入门" : "只得残线")} · ${Number(progress.progress || 0)}%</span></div>` : "";
          }).join("")}
          ${(state.p0?.wounds || []).map((wound) => `<div><strong>${wound.bodyPart === "leg" ? "腿伤" : wound.bodyPart === "shoulder" ? "肩伤" : "肋下刀伤"}</strong><span>伤势 ${Number(wound.severity || 0)} · 尚未痊愈</span></div>`).join("")}
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
    roadTrial: "天明 · 紫金河",
    roadResult: "武学初试 · 去路已开",
    ending: "金陵道 · 第一夜终",
    gameDeath: "命灯熄灭 · 残灯回照",
    quietDeparture: "天明 · 擦肩而过",
    shenArrival: "金陵东湖 · 沈家侧门",
    shenJobs: "沈家外院 · 营生分配",
    caoArrival: "沈家后院 · 炼药房",
    caoFate: "逆天改命 · 曹青奇遇",
    bloodDemand: "丹炉之前 · 取血炼药",
    danObservation: "血气亏空 · 去留一念",
    caoExamFire: "丹师考验 · 火候",
    caoExamIngredients: "丹师考验 · 药序",
    caoExamMotive: "虎口求生 · 最后一问",
    qingQingReward: "酉时三刻 · 青青册",
    qingQingStudy: "次日寅时 · 曹青考校",
    fiveAnimalReward: "沈家后院 · 五禽戏",
    shenDaily: "丹房起居 · 自择一日",
    fiveAnimalChoice: "五兽灵光 · 一戏初成",
    shenMeeting: "沈家内宅 · 密会",
    shenFuChoice: "沈家内堂 · 十两银子",
    shenPharmacy: "金陵东门 · 沈氏药铺",
    shenErrand: "曹青差事 · 钓鱼时机",
    fishingPrep: "半日奔波 · 补齐条件",
    riverFishing: "紫金河 · 垂钓",
    riverCatch: "紫金河 · 第一尾鱼",
    wangEncounter: "紫金河 · 渔翁",
    treasureFish: "珍馐宝鱼 · 黄金钱鳘",
    treasureShare: "河岸分鱼 · 王五",
    wangTeaching: "宝鱼气血 · 打鱼杆法",
    caoReturn: "东门药铺 · 夜归",
    caoGuidance: "好感四十 · 曹青指点",
    alchemyLesson: "回春丹 · 正式传授",
    firstAlchemy: "第一炉丹 · 亲手开炉",
    alchemyFailure: "药材焦坏 · 次日重试",
    shenDeath: "命灯熄灭 · 曹青杀机",
    shenChapterEnding: "东门药铺 · 首炉丹成",
    thirdLadySummons: "金陵东门 · 沈府夜召",
    thirdLadyDiagnosis: "沈家内宅 · 帘后问脉",
    purpleDragonFormula: "三夫人病局 · 换血之方",
    purpleDragonAlchemy: "东门药铺 · 一炉换血丹",
    thirdLadyTreatment: "沈家内宅 · 封穴换血",
    needleInheritance: "白栀云 · 春风化雨针",
    p0Death: "命灯熄灭 · 旧局回照",
    firstNeedleAmbush: "金陵长街 · 雨夜刀光",
    firstKillAftermath: "针下留命 · 去留一念",
    apprenticeshipOffer: "东门药铺 · 曹青问徒",
    stakeChoice: "医武同源 · 两门桩功",
    stakeTraining: "东门后院 · 一夜站桩",
    bodyBreakthrough: "未入门尽头 · 锻体第一关",
    midAutumnWarning: "八月十四 · 月将圆",
    midAutumnDeparture: "八月十四 · 重返破庙",
    templeOfferingSource: "金陵东郊 · 贡品有主",
    monkeyTest: "破庙檐上 · 灵猴试客",
    monkeyConflict: "庙后林间 · 群猴围攻",
    monkeyWineChoice: "百果酒香 · 一瓢一念",
    apeWaterCave: "庙后水洞 · 神猿残势",
    p0Missed: "机缘窗闭 · 此路已失",
    p0JourneyEnd: "八月十五 · 月落东郊",
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
    <div class="notice-block"><strong>武道并非只写在人物卡上</strong><br />从钟山到沈家还有很长一段路。以你的脚力和干粮，走官道很可能撑不到东湖；紫金河却能让这门水行心法立刻派上用场。</div>
    <div class="action-list">${actionCard({ action: "to-road-trial", title: "下山前往紫金河", description: "选择顺流游往东湖，或沿更远的官道步行。", source: "天明", meta: "武学初试", kind: "special" })}</div>
  `);
}

function renderRoadTrial() {
  return gameShell(`
    ${sceneHeader("钟山脚下 · 紫金河", "官道漫长，水路直通沈家所在的东湖", "你的体力与干粮都已见底。鱼跃龙门诀能让你在水中身法提高、消耗降低。")}
    <div class="action-list">
      ${actionCard({ action: "road-trial", value: "dive", title: ROAD_TRIALS.dive.title, description: "运转江鲤行波图，沿紫金河半游半漂直抵东湖。", source: "鱼跃龙门诀", meta: ROAD_TRIALS.dive.reward, kind: "special" })}
      ${actionCard({ action: "road-trial", value: "detour", title: ROAD_TRIALS.detour.title, description: "不下水，以当前脚力继续走漫长陆路。", source: "陆路", meta: ROAD_TRIALS.detour.reward })}
    </div>
  `);
}

function renderRoadResult() {
  const result = state.roadTrialResult;
  return gameShell(`
    ${sceneHeader("紫金河 · 去路已定", result?.title || "沿路而行", result?.result || "你平安离开破庙。")}
    <div class="encounter-ledger"><div><span>选择</span><strong>${escapeHtml(result?.title || "未知")}</strong><p>${escapeHtml(result?.condition || "")}</p></div><div><span>结果</span><strong>${escapeHtml(result?.reward || "平安")}</strong><p>${state.roadTrial === "dive" ? "新心法已经真正改变了可走的道路。" : "安全与错过同时成立。"}</p></div></div>
    <div class="action-list">${actionCard({ action: "continue-road", title: "沿官道望向金陵城", description: "城门、沈家、漕帮与追查血书的人，都在前方。", source: "第一夜", meta: "告一段落", kind: "special" })}</div>
  `);
}

function renderEnding() {
  const hasShenToken = state.completedTempleTasks.includes("shen_promise");
  const reachedShenByRiver = state.roadTrial === "dive";
  const canEnterShen = hasShenToken && reachedShenByRiver;
  const routes = [
    ["shen", "持沈字铜钱前往沈家", "沿紫金河抵达东湖，用老太爷旧诺换一份沈家营生。", "沈家 · 外院"],
    ["offering", "等到初一再回破庙", "按晴日、辰时与根骨条件，追索神秘贡品。", "破庙 · 地级奇遇"],
    ["linan", "沿漕帮水路去临安", "寻找龙青鱼留下的重逢条件，也踏入漕帮权争。", "漕帮 · 人物线"],
  ];
  return gameShell(`
    ${sceneHeader("金陵道 · 晨雾", state.departed ? "你独自走向金陵" : "第一夜之后，江湖终于向你张开", state.departed ? "你保住两盏命灯，也失去了一个永不再来的名字。" : "你仍是未入门的少年，却已经有了一门心法、一段关系和几条会彼此牵动的去路。")}
    <div class="wudao-ending-grid">
      <div><span>人物</span><strong>${escapeHtml(state.name)}</strong><p>${escapeHtml(getBackground(state.backgroundId)?.name)} · ${escapeHtml(getVow(state.vowId)?.title)}</p></div>
      <div><span>命灯</span><strong>${state.lives} / ${LIFE_RULE.lives}</strong><p>${state.lastDeathChoice ? "已经用死亡确认过一次实力差距" : "尚未熄灭"}</p></div>
      <div><span>武学</span><strong>${state.mindArt ? MIND_ART.name : "无"}</strong><p>${state.roadTrial === "dive" ? "已在紫金河亲手运用" : state.mindArt ? "尚未选择水路" : "青衣来客已成过路人"}</p></div>
      <div><span>关系</span><strong>${escapeHtml(state.relationship || "无")}</strong><p>${state.relationship ? "临安重逢条件已出现" : "今夜未与任何势力结缘"}</p></div>
    </div>
    <div class="next-hooks">
      ${routes.map(([id, title, description, meta]) => actionCard({ action: "choose-route", value: id, title, description, source: state.nextRoute === id ? "已定" : "去路", meta, kind: state.nextRoute === id ? "special" : "" })).join("")}
    </div>
    ${state.nextRoute ? `<div class="notice-block"><strong>下一程已定</strong><br />晨雾散去后，你将沿这条路继续。</div>` : ""}
    ${state.nextRoute === "shen" ? `<div class="action-list">${actionCard({ action: "start-shen-chapter", title: "持铜钱叩响沈家侧门", description: canEnterShen ? "你已顺紫金河抵达东湖，可以把破庙墙后的旧诺换成一份营生。" : !hasShenToken ? "你没有能让侧门开启的沈字铜钱。" : "官道路远，当前体力与干粮不足以在今日抵达沈家。", source: "金陵沈家", meta: canEnterShen ? "进入下一段" : !hasShenToken ? "缺少沈字铜钱" : "需要紫金河水路", kind: canEnterShen ? "special" : "", disabled: !canEnterShen })}</div>` : ""}
    <div class="button-row"><button class="secondary-button" data-action="restart">另起一世</button></div>
  `);
}

/* Removed pre-source-verification Shen plot. Kept in git history only; this block is inert.
function renderLegacyShenArrival() {
  return gameShell(`
    ${sceneHeader("金陵城 · 辰时", "城门内的药香，比晨雾更早醒来", "沈家药铺占了半条青石街。正门接诊、东门卸药，只有最窄的西巷侧门不挂匾额。")}
    <div class="world-ledger shen-world-ledger">
      <article class="world-fact"><span>沈家</span><strong>以药立足的金陵世家</strong><p>城中三成药铺向沈家拿药，外院管买卖，内院握丹方。一个家族的规矩，也是一条生计。</p></article>
      <article class="world-fact"><span>沈字铜钱</span><strong>不是银钱，是一份旧诺</strong><p>铜钱边缘有三道火纹，与黑水涧铜匣残片上的丹纹完全相合。</p></article>
      <article class="world-fact"><span>你的身份</span><strong>无师门的未入门少年</strong><p>正门不会为你开。侧门是否认这枚铜钱，决定你能否把奇遇变成真正的门路。</p></article>
    </div>
    <div class="action-list">${actionCard({ action: "enter-shen-gate", title: "走进西巷，敲三下侧门", description: "不报家门，先把沈字铜钱扣在门环下。", source: "沈氏承诺", meta: "信物将被核验", kind: "special" })}</div>
  `);
}

function renderLegacyShenGate() {
  return gameShell(`
    ${sceneHeader("沈家侧门", "门后的人先看铜钱，再看你的手", "一名青衫女子用药布托起铜钱。她叫沈砚秋，掌外院丹房差事，也负责辨认所有来路不明的旧诺。")}
    <div class="npc-reveal-card shen-npc-card"><div class="reveal-seal">沈<br />砚<br />秋</div><div><span>沈家 · 丹房执事</span><h2>她要判断你是否值得兑现旧诺</h2><p>“铜钱是真的。你从哪里得来，又想让沈家替你做什么？”</p></div></div>
    <div class="action-list">
      ${actionCard({ action: "shen-gate-choice", value: "truth", title: "如实说出破庙墙缝", description: "说明敲墙一千次和黑水涧铜匣残片，不编造铜钱主人的身份。", source: "坦白", meta: "信任 +2", kind: "special" })}
      ${actionCard({ action: "shen-gate-choice", value: "silent", title: "只谈铜钱，不谈身世", description: "承认铜钱来自破庙，但保留血书和玉佩的秘密。", source: "谨慎", meta: "信任 +1" })}
      ${actionCard({ action: "shen-gate-choice", value: "bluff", title: "自称沈氏远亲", description: "试图用半块玉佩和旧诺拼出一个并不存在的宗族身份。", source: "冒险", meta: "谎言会被族谱核对", kind: "danger" })}
    </div>
  `);
}

function shenGateResultText() {
  const results = {
    truth: "沈砚秋对照铜匣丹纹，确认你没有编造。她收起审视，把你当成可谈条件的陌生人。",
    silent: "沈砚秋没有追问血书，只提醒你：沈家兑现的是铜钱，不是你没说出口的秘密。",
    bluff: "沈砚秋合上族谱，当面点破谎言。铜钱仍然有效，但从此每一句话都要多过她一道疑心。",
  };
  return results[state.shenGateChoice] || "铜钱尚未核验。";
}

function shenBaseInvestigationPoints() {
  if (state.shenTrust >= 2) return 3;
  if (state.shenTrust < 0) return 1;
  return 2;
}

function renderLegacyShenBriefing() {
  return gameShell(`
    ${sceneHeader("沈家外院", "一枚旧诺，只能换一件事", shenGateResultText())}
    <div class="shen-trust-strip"><span>沈砚秋信任</span><strong>${state.shenTrust}</strong><p>${state.shenTrust >= 2 ? "多给一刻查验时间" : state.shenTrust >= 1 ? "按常例给两刻查验" : "受人盯守，只能查验一处"}</p></div>
    <div class="story-copy"><p>沈家可以给你五十两银，也可以让你在外院药库挑一份凡药。你却要求一份能接近武道的差事。</p><p>沈砚秋沉默片刻，递来一块青炉木牌：午时前替她看守最偏僻的乙字号丹房，开炉取出三枚养筋丹。做成之后，才有资格谈武学。</p></div>
    <div class="notice-block"><strong>差事报酬</strong><br />进入沈家药阁一次；若丹药无损，再从基础锻体法、洗髓药或药库门路中择一。</div>
    <div class="action-list">${actionCard({ action: "accept-shen-errand", title: "接下乙字号青炉差事", description: "距离午时只有一炷香。逆天改命已经在木牌背面显出一层血色。", source: "沈家差事", meta: "丹房死局", kind: "special" })}</div>
  `);
}

function shenMissingLabel(missing = []) {
  const labels = {
    ledger: "需查药材簿",
    waterway: "需查冷水槽",
    mind_art: "需鱼跃龙门诀",
    death_memory: "需亲历一次死局",
    last_lamp: "仅余一盏命灯",
  };
  return missing.map((item) => labels[item] || item).join(" · ");
}

function renderShenSolutionCard(id, kind = "") {
  const solution = resolveShenSolution(id, {
    clues: state.shenClues,
    hasMindArt: state.mindArt === MIND_ART.id,
    deathMemory: state.shenDeathMemory,
    lives: state.lives,
  });
  if (!solution) return "";
  return actionCard({
    action: "shen-solution",
    value: id,
    title: solution.title,
    description: solution.description,
    source: id === "ignite" ? "照令行事" : id === "bait" ? "借死局设局" : "破局方案",
    meta: solution.available ? (id === "ignite" ? "命灯 -1 · 获得完整死因" : solution.reward) : shenMissingLabel(solution.missing),
    kind,
    disabled: !solution.available,
  });
}

function renderLegacyShenInvestigation() {
  const visibleIgnite = state.lives > 1 && !state.shenDeathMemory;
  return gameShell(`
    ${sceneHeader("乙字号丹房 · 午时前", "门、药与风道，至少有一处在等你送命", "沈砚秋离开后，外门药童搬来三筐药材。命格只显示午时结果：经脉封死，丹火爆燃，无人开门。")}
    <div class="shen-investigation-meter"><span>剩余查验时间</span><strong>${state.shenInvestigationPoints}</strong><p>每查一处消耗一刻；已看过的细节会留在记忆里。</p></div>
    <div class="quest-grid shen-clue-grid">
      ${SHEN_CLUES.map((clue) => {
        const found = state.shenClues.includes(clue.id);
        return `<article class="quest-card ${found ? "completed" : ""}"><span>${escapeHtml(clue.location)}</span><h2>${escapeHtml(clue.name)}</h2><p>${escapeHtml(found ? clue.description : "表面没有异常，需要亲手查验。")}</p><small>${escapeHtml(found ? clue.unlock : "消耗一刻查验时间")}</small>${found ? `<div class="quest-state">已记住</div>` : `<button class="inline-button" data-action="investigate-shen-clue" data-value="${clue.id}" ${state.shenInvestigationPoints <= 0 ? "disabled" : ""}>查验此处</button>`}</article>`;
      }).join("")}
    </div>
    ${state.shenDeathMemory ? `<div class="ghost-memory">你记得药烟先锁住四肢，门闩随后从外落下，最后才是丹火爆燃。换药人一定会在你倒下后回来收走药包。</div>` : ""}
    <div class="panel-title">当前可行命途</div>
    <div class="action-list">
      ${renderShenSolutionCard("procedure")}
      ${renderShenSolutionCard("waterway", "special")}
      ${state.shenDeathMemory ? renderShenSolutionCard("bait", "special") : ""}
      ${visibleIgnite ? renderShenSolutionCard("ignite", "danger") : ""}
    </div>
  `);
}

function renderLegacyShenDeath() {
  return gameShell(`
    ${sceneHeader("乙字号丹房 · 午时", "药烟没有杀你，真正的死局在烟后面", "青炉点燃后，伏脉藤粉随回风槽灌入小室。四肢失去知觉时，门闩从外面落下。")}
    <div class="death-cause"><span>完整死因</span><strong>伏脉烟锁经 → 外门封死 → 丹火爆燃</strong></div>
    <div class="death-verdict"><span>剩余命灯</span><strong>${state.lives}</strong><p>这一次，你看清换药、改风和封门是同一套安排。</p></div>
    <div class="notice-block"><strong>新增破局条件</strong><br />可以在毒发前改风；也可以照常开炉、伪装毒发，等换药人回来回收证据。</div>
    <div class="button-row"><button class="primary-button" data-action="return-shen-death">借残灯回到一炷香前</button></div>
  `);
}

function renderLegacyShenReturn() {
  return gameShell(`
    ${sceneHeader("一炷香前", "青炉未燃，门闩还在你手边", "沈砚秋刚刚离开，三筐药材仍放在原位。身体没有伤，死亡的每一息却都在记忆里。")}
    <div class="cause-chain">
      <div class="cause-node"><span class="cause-status">已知</span><span>伏脉藤粉藏在炉衣里，点火后随回风槽扩散</span></div>
      <div class="cause-node"><span class="cause-status">已知</span><span>外面有人等药烟生效，再落下门闩</span></div>
      <div class="cause-node"><span class="cause-status">可利用</span><span>换药人会在爆炉前折返，收走能追查来路的药包</span></div>
    </div>
    <div class="action-list">${actionCard({ action: "reenter-shen-danroom", title: "带着完整死因重新入局", description: `已查到的线索保留；查验时间恢复为${shenBaseInvestigationPoints()}刻。`, source: "双灯照命", meta: "命途已改变", kind: "special" })}</div>
  `);
}

function renderLegacyShenResolution() {
  const outcome = SHEN_SOLUTIONS[state.shenOutcome];
  return gameShell(`
    ${sceneHeader("沈家丹房 · 午时", outcome?.title || "死局已破", outcome?.result || "青炉平稳熄灭。")}
    <div class="encounter-ledger">
      <div><span>破局层级</span><strong>${state.shenOutcome === "bait" ? "借局反制" : state.shenOutcome === "waterway" ? "改局救人" : "守规避劫"}</strong><p>${escapeHtml(state.shenStanding || "沈家记下了你的名字")}</p></div>
      <div><span>所得</span><strong>${escapeHtml(outcome?.reward || "丹房平安")}</strong><p>当前潜能 ${state.potential}</p></div>
    </div>
    <div class="notice-block"><strong>沈砚秋的判断</strong><br />“你不是靠运气活下来的。铜钱兑的是旧诺，接下来的报酬，是你自己挣的。”</div>
    <div class="action-list">${actionCard({ action: "continue-shen-reward", title: "进入沈家药阁", description: "基础锻体法、补根秘药与长期门路，只能选择一项。", source: "差事报酬", meta: "三选一", kind: "special" })}</div>
  `);
}

function renderLegacyShenReward() {
  return gameShell(`
    ${sceneHeader("沈家药阁", "把这一场死局，换成一份真正的成长", "沈砚秋只许你带走一项。选择会改变境界、属性或今后能进入的地方。")}
    <div class="reward-choice-grid">
      ${Object.values(SHEN_REWARDS).map((reward) => {
        const status = getShenReward(reward.id, state.potential);
        return actionCard({ action: "choose-shen-reward", value: reward.id, title: reward.name, description: reward.description, source: reward.type, meta: status.available ? reward.effect : `还缺潜能 ${status.missingPotential}`, kind: reward.id === "five_animals" ? "special" : "", disabled: !status.available });
      }).join("")}
    </div>
  `);
}

function renderLegacyShenAftermath() {
  const trials = {
    five_animals: {
      title: "药架正朝一名学徒倒下",
      description: "沉胯如熊，双臂托住装满石臼的木架。刚学会的整劲必须现在就用。",
      action: "以熊桩托住药架",
      result: "锻体之力第一次救下旁人",
    },
    marrow_powder: {
      title: "灰池里还有一名昏迷药童",
      description: "残烟仍会侵蚀经脉。洗髓散补起的根骨，让你有机会把人背出来。",
      action: "屏息穿过残烟救人",
      result: "根骨抵住了伏脉余烟",
    },
    herb_token: {
      title: "被换掉的药包来自沈家药库",
      description: "持青木药牌进入库房，对照今日出库簿，追查伏脉藤经过的每一道手。",
      action: "持药牌核查出库批号",
      result: "取得伏脉藤药路批号",
    },
  };
  const trial = trials[state.shenReward];
  return gameShell(`
    ${sceneHeader("沈家外院 · 余波未平", trial?.title || "所得必须经得起眼前事", trial?.description || "沈家仍在清点丹房损失。")}
    <div class="notice-block"><strong>方才所得</strong><br />${escapeHtml(SHEN_REWARDS[state.shenReward]?.name || "沈家报酬")}：${escapeHtml(SHEN_REWARDS[state.shenReward]?.effect || "")}</div>
    <div class="action-list">${actionCard({ action: "use-shen-reward", title: trial?.action || "处理丹房余波", description: "不把所得留在人物卡上，现在就用它改变眼前的结果。", source: "立即运用", meta: trial?.result || "沈家记名", kind: "special" })}</div>
  `);
}

function renderLegacyShenChapterEnding() {
  const reward = SHEN_REWARDS[state.shenReward];
  const outcome = SHEN_SOLUTIONS[state.shenOutcome];
  return gameShell(`
    ${sceneHeader("金陵城 · 日过午时", state.martialStage === "body" ? "你终于跨过武道的第一道门槛" : "你从沈家带走了一条更长的路", state.martialStage === "body" ? "五禽桩运转一周，筋骨第一次生出超越凡人的整劲。" : "没有立刻突破，并不代表这场死局没有改变你。")}
    <div class="wudao-ending-grid shen-ending-grid">
      <div><span>丹房死局</span><strong>${escapeHtml(outcome?.title || "已破")}</strong><p>${escapeHtml(state.shenStanding || "沈家记名")}</p></div>
      <div><span>所得</span><strong>${escapeHtml(reward?.name || "无")}</strong><p>${state.shenRewardUsed ? `已亲手运用 · 潜能再增五十` : escapeHtml(reward?.effect || "")}</p></div>
      <div><span>境界</span><strong>${state.martialStage === "body" ? "锻体一重" : "未入门"}</strong><p>${state.skills.includes("five_animals") ? "已习得五禽桩" : "仍可继续积累潜能"}</p></div>
      <div><span>命灯</span><strong>${state.lives} / ${LIFE_RULE.lives}</strong><p>${state.shenDeathMemory ? "记得丹火焚身的完整过程" : "没有用死亡换取答案"}</p></div>
    </div>
    <div class="next-hooks shen-next-hooks">
      <div><span>丹房内应</span><strong>木七只是一只手</strong><p>递出伏脉藤的人仍藏在沈家药路上。</p></div>
      <div><span>血书旧债</span><strong>万鲤堂孙不离</strong><p>金龙会的人已经进城寻找半块玉佩。</p></div>
      <div><span>初一将至</span><strong>破庙神秘贡品</strong><p>晴日、辰时和根骨条件仍在等待。</p></div>
    </div>
    <div class="notice-block"><strong>金陵篇继续</strong><br />你已从无名耗材变成沈家愿意记住的差事人，也第一次有能力决定下一场危机怎么发生。</div>
    <div class="button-row"><button class="secondary-button" data-action="restart">另起一世</button></div>
  `);
}

*/
function shenRequirementText(job) {
  const names = { strength: "力道", agility: "身法", constitution: "根骨", insight: "悟性", basic_skill: "基础武功", arithmetic: "算术" };
  const status = resolveShenJob(job.id, state.attributes, {
    hasBasicSkill: state.skills.length > 0,
    hasArithmetic: state.inventory.includes("arithmetic"),
  });
  return status.missing.map((id) => names[id] || id).join("、");
}

function renderShenArrival() {
  return gameShell(`
    ${sceneHeader("金陵东郊 · 东湖岸", "你拖着饥饿的身体，站到沈家侧门前", "若非鱼跃龙门诀让你顺紫金河而下，剩余干粮根本撑不到这里。朱漆侧门与石狮，已经比破庙高出另一个世界。")}
    <div class="world-ledger shen-world-ledger">
      <article class="world-fact"><span>沈家</span><strong>金陵本地豪强</strong><p>家宅、田产与护院自成规矩。信物能让他们履行旧诺，却不能让他们白养一个人。</p></article>
      <article class="world-fact"><span>沈字铜钱</span><strong>老太爷留下的一次承诺</strong><p>门房认得铜钱，不敢赶你走，但承诺只保证给一口饭和一份营生。</p></article>
      <article class="world-fact"><span>眼下处境</span><strong>饥饿 · 体力将尽</strong><p>你还没有踏入炼体，五维力量全来自怀中玉佩，任何一份差事都可能高于你的能力。</p></article>
    </div>
    <div class="action-list">${actionCard({ action: "present-shen-token", title: "把沈字铜钱交给门房", description: "门房验过旧物，转身去请外院管事。", source: "沈氏承诺", meta: "获得一次营生分配", kind: "special" })}</div>
  `);
}

function renderShenJobs() {
  return gameShell(`
    ${sceneHeader("沈家外院", "沈家不养闲人", "八字胡管事摆出四份营生。逆天改命把要求与待遇一并显出，可你的身体连最低门槛都够不到。")}
    <div class="quest-grid shen-clue-grid">
      ${SHEN_JOBS.map((job) => {
        const status = resolveShenJob(job.id, state.attributes, { hasBasicSkill: state.skills.length > 0, hasArithmetic: state.inventory.includes("arithmetic") });
        return `<article class="quest-card ${status.available ? "completed" : ""}"><span>沈家营生</span><h2>${escapeHtml(job.name)}</h2><p>${escapeHtml(job.pay)}</p><small>${status.available ? "当前可以胜任" : `尚缺：${escapeHtml(shenRequirementText(job))}`}</small><div class="quest-state">${status.available ? "可领" : "不可领"}</div></article>`;
      }).join("")}
    </div>
    <div class="notice-block"><strong>管事的处置</strong><br />肩不能挑，手不能提，连跑腿和算账也做不了。沈家不能毁诺，后院曹医师那里正缺一个“做轻巧活”的药童。</div>
    <div class="action-list">${actionCard({ action: "accept-danroom-job", title: "接过杂役衣与两个白面馒头", description: "周围家丁听到“曹医师”三个字，望向你的眼神像在看一个死人。", source: "唯一去处", meta: "曹医师炼药房", kind: "danger" })}</div>
  `);
}

function renderCaoArrival() {
  return gameShell(`
    ${sceneHeader("沈家后院 · 炼药房", "五名药童守着丹炉，没有一个人像能活过冬天", "他们面色惨白、眼眶发黑。穿灰黑长袍的曹医师枯瘦如柴，只看一眼，便说从未见过你这样孱弱却还活着的人。")}
    <div class="npc-reveal-card shen-npc-card"><div class="reveal-seal">曹<br />青</div><div><span>沈家客卿 · 医师</span><h2>下人传言：进他丹房的人很少活过三个月</h2><p>他不问铜钱怎么来的，只在估量你还能取几次血。</p></div></div>
    <div class="action-list">${actionCard({ action: "inspect-cao-fate", title: "对曹医师发动逆天改命", description: "先看清这个人身上的固定奇遇，再决定该逃、该告发，还是该设法取信。", source: "唯一命格", meta: "看见三条因果", kind: "special" })}</div>
  `);
}

function renderCaoFate() {
  return gameShell(`
    ${sceneHeader("曹青 · 固定奇遇", "庞不凡、血灵丹经与毒师传承", "曹青只是化名。他的真名、所盗禁书和好感门槛同时浮现，但知道秘密不等于现在有能力利用。")}
    <div class="quest-grid shen-clue-grid">
      ${CAO_ENCOUNTERS.map((encounter) => `<article class="quest-card"><span>${escapeHtml(encounter.rank)}</span><h2>${escapeHtml(encounter.name)}</h2><p>${escapeHtml(encounter.condition)}</p><small>${escapeHtml(encounter.result)}</small></article>`).join("")}
    </div>
    <div class="notice-block"><strong>眼下最可行的路</strong><br />药王谷远在北地，泄密会先招来曹青追杀。你只能先靠近“毒师传承”的二十点好感门槛。</div>
    <div class="action-list">${actionCard({ action: "face-blood-demand", title: "吃下两个馒头，等曹青开炉", description: "曹青把一把带红锈的菜刀丢到你脚边：取一碗血来。", source: "丹房死局", meta: "必须选择", kind: "danger" })}</div>
  `);
}

function renderBloodDemand() {
  return gameShell(`
    ${sceneHeader("丹炉之前", "曹青要用你的血炼这一炉愈灵丹", "其他药童同时松了口气。反抗、拒绝或服从，逆天改命已经标出各自结果。")}
    <div class="action-list">
      ${Object.values(BLOOD_CHOICES).map((choice) => {
        const result = resolveBloodChoice(choice.id, state.lives);
        const deadly = choice.outcome === "death";
        return actionCard({ action: "blood-choice", value: choice.id, title: choice.title, description: choice.description, source: deadly ? "杀机" : "忍耐", meta: result.available ? choice.forecast : "仅余一盏命灯 · 不可重试", kind: deadly ? "danger" : "special", disabled: !result.available });
      }).join("")}
    </div>
  `);
}

function renderDanObservation() {
  const insightReady = state.attributes.insight >= 3;
  return gameShell(`
    ${sceneHeader("沈家丹房 · 申时", "血已经倒进丹炉，你仍有一次让曹青记住你的机会", "手臂敷了止血药，身体虚弱。其他药童已经离开，曹青却没有阻止任何人旁观。")}
    <div class="shen-investigation-meter"><span>当前悟性</span><strong>${state.attributes.insight}</strong><p>鱼跃龙门诀的“潜流于渊”会让与水相关的炼丹判定再加二。</p></div>
    ${!insightReady ? `<div class="action-list">${actionCard({ action: "reallocate-insight", title: "把玉佩三点全部转到悟性", description: "暂时放弃力道和身法，把唯一能调动的力量用于记住火候、药序与水量。", source: "逆天改命", meta: "悟性变为三", kind: "special" })}</div>` : ""}
    <div class="action-list">
      ${actionCard({ action: "observation-choice", value: "rest", title: OBSERVATION_CHOICES.rest.title, description: "保住眼前体力，但曹青此后只把你当成普通取血药童。", source: "安全", meta: "奇遇：不堪大用" })}
      ${actionCard({ action: "observation-choice", value: "watch", title: OBSERVATION_CHOICES.watch.title, description: "即使无力站稳，也盯住每一次加水、投药与换火。", source: "求生", meta: insightReady ? "有效悟性五 · 进入丹师考验" : "需要先把悟性提高到三", kind: "special", disabled: !insightReady })}
    </div>
  `);
}

function renderCaoExamFire() {
  return gameShell(`
    ${sceneHeader("丹炉熄火", CAO_QUESTIONS.fire.prompt, "曹青早已不看丹炉，只在观察你是否真的记住了他的动作。")}
    <div class="action-list">
      ${actionCard({ action: "cao-answer", value: "fire:forget", title: "承认没有记住", description: "曹青不会杀你，但也不会再给你第二次机会。", source: "退路", meta: "不堪大用" })}
      ${actionCard({ action: "cao-answer", value: "fire:stew", title: "文火慢炖，再以大火收汁", description: "把烹饪猜法当成炼丹答案。", source: "错误", meta: state.lives > 1 ? "会被一掌打死" : "仅余一盏命灯", kind: "danger", disabled: state.lives <= 1 })}
      ${actionCard({ action: "cao-answer", value: "fire:strong_slow_strong", title: "先大火，转文火，最后再以大火收丹", description: "完整复述刚才三次火候变化。", source: "悟性判定", meta: "曹青好感 +5", kind: "special" })}
    </div>
  `);
}

function renderCaoExamIngredients() {
  return gameShell(`
    ${sceneHeader("丹师考验 · 第二问", CAO_QUESTIONS.ingredients.prompt, "第一问让曹青第一次正眼看你；现在要证明那不是一次走运。")}
    <div class="action-list">
      ${actionCard({ action: "cao-answer", value: "ingredients:guess", title: "只说记住了朱砂与银汞", description: "遗漏水量、草药次序和百息间隔。", source: "错误", meta: state.lives > 1 ? "曹青认定你在糊弄" : "仅余一盏命灯", kind: "danger", disabled: state.lives <= 1 })}
      ${actionCard({ action: "cao-answer", value: "ingredients:recite_order", title: "从半炉水开始，逐项复述投药与加水", description: "不懂药性便直说不懂，只把亲眼所见一项不漏地说出。", source: "记忆", meta: "曹青好感 +7", kind: "special" })}
    </div>
  `);
}

function renderCaoExamMotive() {
  return gameShell(`
    ${sceneHeader("丹师考验 · 最后一问", CAO_QUESTIONS.motive.prompt, "这不是收徒邀请，而是曹青用来排查沈家或北地探子的陷阱。")}
    <div class="action-list">
      ${actionCard({ action: "cao-answer", value: "motive:learn", title: "跪求他传授岐黄之术", description: "表现得过于急切，会让曹青认定你是来试探他的暗子。", source: "图谋不轨", meta: state.lives > 1 ? "银针穿眉 · 死亡" : "仅余一盏命灯", kind: "danger", disabled: state.lives <= 1 })}
      ${actionCard({ action: "cao-answer", value: "motive:survive", title: "我只是想活命，没有别的奢求", description: "承认自己的弱小与处境，不索取、不装忠诚。", source: "同病相怜", meta: "曹青好感 +8", kind: "special" })}
    </div>
  `);
}

function renderShenDeath() {
  return gameShell(`
    ${sceneHeader("沈家丹房", "你把曹青当成了可以正面违逆的人", state.shenDeathReason || "灰袍只动了一瞬，你便失去了知觉。")}
    <div class="death-cause"><span>死因</span><strong>${escapeHtml(state.shenDeathReason || "实力差距")}</strong></div>
    <div class="death-verdict"><span>剩余命灯</span><strong>${state.lives}</strong><p>回照只能让你改选，不能让一个未入门少年挡下曹青。</p></div>
    <div class="button-row"><button class="primary-button" data-action="return-shen-death">回到刚才的选择前</button></div>
  `);
}

function renderQingQingReward() {
  return gameShell(`
    ${sceneHeader("酉时三刻 · 炼药房", "虎口求生", "曹青相信你只是想活下去，也认可你确实记住了整炉丹。他丢来一本自己早年写下的入门医书。")}
    <div class="encounter-ledger"><div><span>随机奇遇</span><strong>虎口求生</strong><p>潜能 +180 · 曹青好感 20</p></div><div><span>所得</span><strong>${QINGQING_BOOK.name}</strong><p>炼丹进度 61% · 需要悟性三方可研习</p></div></div>
    <div class="notice-block"><strong>曹青的规矩</strong><br />每天炼丹都可以来旁观、搭手。若是不堪大用，仍要继续献血。</div>
    <div class="action-list">${actionCard({ action: "study-qingqing", title: "用潜能研习《青青册》", description: "把书中的草药辨认、舌苔脉象与基础医术变成真正掌握的知识。", source: "一夜苦读", meta: `潜能 -${QINGQING_BOOK.studyCost} · 医术入门`, kind: "special" })}</div>
  `);
}

function renderQingQingStudy() {
  return gameShell(`
    ${sceneHeader("次日寅时", "曹青在院中摆出形似虎熊的古怪架势", "他察觉你从门缝偷看，没有赶人，只冷声问起昨夜那本书。")}
    <div class="encounter-ledger"><div><span>${QINGQING_BOOK.name}</span><strong>一级 · 初学乍练</strong><p>医术入门，采集已有基础</p></div><div><span>曹青好感</span><strong>${state.caoFavor}</strong><p>二十点只够得到粗浅医药传授</p></div></div>
    <div class="action-list">${actionCard({ action: "take-qingqing-test", title: "接受草药、舌苔与脉象考校", description: "答出书中基础问题；超出范围的针灸穴位则坦言尚未学到。", source: "医术判定", meta: "曹青好感 +10", kind: "special" })}</div>
  `);
}

function renderFiveAnimalReward() {
  return gameShell(`
    ${sceneHeader("沈家后院", "曹青把一册《五禽戏》丢到你手里", "他警告你身体孱弱，昨夜失血后仍不休息，再这样下去活不过一年。随后传下一门没有杀伤力的健体术。")}
    <div class="mind-art-card"><span>基础健体功</span><h2>${FIVE_ANIMAL_PLAY.name}</h2><p>${FIVE_ANIMAL_PLAY.description}</p><ul><li>虎势：练筋骨整劲</li><li>熊势：稳下盘气血</li><li>其余三势仍需继续研习</li></ul></div>
    <div class="notice-block"><strong>尚未突破</strong><br />得到功法不等于已经炼成。你仍是未入门，只是终于有了一条可以自己走的炼体之路。</div>
    <div class="action-list">${actionCard({ action: "begin-shen-cycle", title: "收好两册书，安排留在丹房的第一天", description: "读医书、练五禽或休养，都要占去一个时段；身体再次垮掉，曹青不会为你停炉。", source: "沈家立足", meta: "三段白昼 · 体力四 · 饱腹四", kind: "special" })}</div>
  `);
}

function shenDailyStatusHtml() {
  return `
    <div class="shen-cycle-status">
      <div><span>今日</span><strong>第${state.shenDay}日</strong><p>${state.shenLocation === "pharmacy" ? "东门药铺" : "沈家丹房"}</p></div>
      <div><span>剩余时段</span><strong>${state.shenTimeLeft}</strong><p>每项事务占一段白昼</p></div>
      <div><span>体力</span><strong>${state.shenStamina}/${SHEN_DAILY_RULES.maxStamina}</strong><p>降到零会昏厥</p></div>
      <div><span>饱腹</span><strong>${state.shenSatiety}/${SHEN_DAILY_RULES.maxSatiety}</strong><p>降到零不能再行动</p></div>
    </div>
  `;
}

function renderShenDaily() {
  const breakthrough = resolveFiveAnimalBreakthrough({ medicalLevel: state.medicalLevel, insight: state.attributes.insight, potential: state.potential });
  const medicine = resolveMedicalBreakthrough(state.medicalProgress, state.potential);
  const location = state.shenLocation === "pharmacy" ? "金陵东门 · 沈氏药铺后院" : "沈家后院 · 丹房偏屋";
  const exhausted = state.shenTimeLeft <= 0;
  return gameShell(`
    ${sceneHeader(location, state.shenLocation === "pharmacy" ? "曹青把药铺后院交给你打理" : "曹青炼他的丹，你得先把自己练成有用的人", state.shenLocation === "pharmacy" ? "医术二级会让你看出下一次外出差事的真正价值；在那以前，每一段白昼仍要自己安排。" : "《青青册》能让你留下，《五禽戏》能让你活久一点。饥饿与失血却不会因为有了秘籍便消失。")}
    ${shenDailyStatusHtml()}
    <div class="skill-progress-grid">
      <div><span>《青青册》</span><strong>${state.medicalLevel}级 ${state.medicalProgress}%</strong><div class="progress-track"><i style="width:${Math.min(100, state.medicalProgress)}%"></i></div><p>${state.medicalLevel >= 2 ? "医术二级 · 已能辨认离院时机" : "再读到十七分，可用潜能贯通二级"}</p></div>
      <div><span>《五禽戏》</span><strong>${state.fiveAnimalLevel}级 ${state.fiveAnimalProgress}%</strong><div class="progress-track"><i style="width:${Math.min(100, state.fiveAnimalProgress)}%"></i></div><p>${state.fiveAnimalLevel ? `${getFiveAnimalAspect(state.fiveAnimalAspect)?.name || "一戏"}已成 · 属性总点 ${shenAttributePool()}` : "医术一、悟性三、潜能五百方可入门"}</p></div>
      <div><span>丹理</span><strong>${state.alchemyProgress}%</strong><div class="progress-track"><i style="width:${Math.min(100, state.alchemyProgress)}%"></i></div><p>好感四十后，曹青才会正式传授</p></div>
    </div>
    ${state.shenDayLog.length ? `<div class="result-log">${state.shenDayLog.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>` : ""}
    ${!state.fiveAnimalLevel ? `<div class="action-list">${actionCard({ action: "breakthrough-five-animals", title: "用五百潜能贯通《五禽戏》", description: "医术让你看懂吐纳与架势；把悟性集中到三点，才能抓住五兽灵光。", source: "奇术入门", meta: breakthrough.available ? "潜能 -500 · 选择一戏" : `尚缺：${breakthrough.missing.join("、")}`, kind: "special", disabled: !breakthrough.available })}</div>` : ""}
    ${state.medicalLevel === 1 && state.medicalProgress >= 17 ? `<div class="action-list">${actionCard({ action: "breakthrough-medicine", title: "用一百六十六潜能贯通《青青册》二级", description: "把已经读懂的脉象、药理与采集知识连成一体。", source: "医术突破", meta: medicine.available ? "医术二级 · 采集一级" : "潜能不足", kind: "special", disabled: !medicine.available })}</div>` : ""}
    <div class="daily-action-grid">
      ${Object.values(SHEN_DAILY_ACTIONS).map((action) => {
        const status = resolveShenDailyAction(action.id, { timeLeft: state.shenTimeLeft, stamina: state.shenStamina, satiety: state.shenSatiety, fiveAnimalLevel: state.fiveAnimalLevel });
        const unsafeLastLamp = status.dangerous && state.lives <= 1;
        const delta = [action.stamina ? `体力 ${action.stamina > 0 ? "+" : ""}${action.stamina}` : "", action.satiety ? `饱腹 ${action.satiety > 0 ? "+" : ""}${action.satiety}` : ""].filter(Boolean).join(" · ");
        return actionCard({ action: "shen-daily-action", value: action.id, title: action.name, description: action.description, source: action.focus === "medicine" ? "医道" : action.focus === "martial" ? "练体" : "起居", meta: unsafeLastLamp ? "仅余一灯 · 不可透支" : delta, kind: action.focus ? "special" : "", disabled: !status.available || unsafeLastLamp });
      }).join("")}
    </div>
    ${exhausted ? `<div class="action-list">${state.shenDay === 1 && !state.shenMeetingSeen ? actionCard({ action: "close-first-day", title: "跟曹青去沈家内宅", description: "晚饭刚端上来，曹青便说家主有事相商，要你一同前去。", source: "曹青吩咐", meta: "沈家密会", kind: "special" }) : actionCard({ action: "next-shen-day", title: "收束今日，睡到天明", description: "保住今日所得，恢复体力与时段。", source: "起居有常", meta: `第${state.shenDay + 1}日`, kind: "special" })}</div>` : ""}
    ${state.shenLocation === "pharmacy" && state.medicalLevel >= 2 ? `<div class="action-list">${actionCard({ action: "take-herb-errand", title: "接下返回沈家取药草与杂物的差事", description: "医术二级让你看出：这是离开药铺、顺路准备紫金河奇遇的最好时机。", source: "曹青差事", meta: "钓鱼时机", kind: "special" })}</div>` : ""}
  `);
}

function renderFiveAnimalChoice() {
  return gameShell(`
    ${sceneHeader("五兽灵光", "第一次完整演完五禽，你要把这一点增长落在哪一戏", "这点属性属于你自己，也会进入逆天改命此后可以重新分配的总数。原本的求道之路，最看重猿戏带来的悟性。")}
    <div class="quest-grid five-aspect-grid">${FIVE_ANIMAL_ASPECTS.map((aspect) => `<article class="quest-card"><span>${escapeHtml(aspect.name)}</span><h2>${escapeHtml(ATTRIBUTES.find((item) => item.id === aspect.attribute)?.name || aspect.attribute)} +1</h2><p>${escapeHtml(aspect.effect)}</p><button data-action="choose-five-aspect" data-value="${escapeHtml(aspect.id)}">把灵光交给${escapeHtml(aspect.name)}</button></article>`).join("")}</div>
  `);
}

function renderShenMeeting() {
  return gameShell(`
    ${sceneHeader("沈家内宅 · 夜", "曹青第一次把你带进沈家真正议事的房间", "沿路家丁都向他低头。曹青说，他第一次取血时总会给药童一次旁观机会；别人不敢争，你却只是想求一条活路。")}
    <div class="world-ledger shen-meeting-ledger">
      <article class="world-fact"><span>曹青的打算</span><strong>离开沈家，迁入东门药铺</strong><p>以后沈家的药材与差事，由你代为传话联络。</p></article>
      <article class="world-fact"><span>沈家密议</span><strong>金龙会四堂回岛</strong><p>万鲤、怒蛟、巨鲸、神龟四堂齐聚，沈家认为水路将有大事。</p></article>
      <article class="world-fact"><span>三个月后</span><strong>百舸争流大典</strong><p>漕帮让各路年轻武人同船竞渡，划船、护船与破坏对手皆在考校之内。</p></article>
    </div>
    <div class="notice-block"><strong>遥远门槛</strong><br />大典最普通的船夫也须炼骨。你连锻体都未踏入，但这条水路已第一次出现在眼前。</div>
    <div class="action-list">${actionCard({ action: "leave-shen-meeting", title: "依曹青吩咐退出内堂", description: "门外，先前把你当废物的沈福已经搬来椅子，笑得比谁都恭敬。", source: "沈家总管", meta: "十两见面礼", kind: "special" })}</div>
  `);
}

function renderShenFuChoice() {
  return gameShell(`
    ${sceneHeader("沈家内堂门外", "沈福把十两银子塞进你手里", "逆天改命让你看见他在秦淮河畔藏着一处宅子。曹青很快就会出来，你如何处理这包银子，会决定他是否把你当成能替自己办事的人。")}
    <div class="action-list">
      ${actionCard({ action: "shenfu-choice", value: "report", title: "收下银子，待曹青出来后如实交代", description: "不假清高，也不向曹青隐瞒；同时记住沈福这条能进厨房、找护院的门路。", source: "坦诚", meta: "银子十两 · 曹青好感 39", kind: "special" })}
      ${actionCard({ action: "shenfu-choice", value: "hide", title: "收下银子，对曹青只字不提", description: "你得到钱，却让曹青确认你不能代他与沈家往来。", source: "私心", meta: "失去药铺与指点门路", kind: "danger" })}
    </div>
  `);
}

function renderShenPharmacy() {
  return gameShell(`
    ${sceneHeader("金陵东门 · 沈氏药铺", "曹青连夜搬出了沈家", "前铺卖药，后院炼丹。曹青给你一间硬板床，也把与沈家往来的杂事一并交到你手里。")}
    <div class="encounter-ledger"><div><span>曹青好感</span><strong>${state.caoFavor}</strong><p>距离正式指点只差一点</p></div><div><span>沈福门路</span><strong>${state.shenFuContact ? "可以办事" : "已经断掉"}</strong><p>可找走船护院，也能从灶房取酒与面团</p></div></div>
    <div class="action-list">${actionCard({ action: "enter-pharmacy-day", title: "在药铺醒来，继续安排修习", description: "先把《青青册》推到医术二级，才看得懂曹青下一道差事的价值。", source: "新居", meta: "第2日", kind: "special" })}</div>
  `);
}

function renderShenErrand() {
  return gameShell(`
    ${sceneHeader("东门药铺 · 辰时", "曹青让你回沈家取走遗下的药草和杂物", "他以为这只是一次跑腿。你却知道，今天可以自由穿过沈家与紫金河之间，也是凑齐黄金钱鳘全部条件的唯一窗口。")}
    <div class="fate-forecast"><span>医术二级 · 看见时机</span><strong>若直接搬完东西回来，安稳无事；若把半日用来准备钓鱼，可能赶在天黑前带回另一条路。</strong></div>
    <div class="action-list">
      ${actionCard({ action: "start-fishing-prep", title: "借差事准备紫金河一行", description: "蚯蚓、鱼竿、钓鱼手艺、酒与面团缺一不可。", source: "珍馐宝鱼", meta: "开始补齐五项条件", kind: "special" })}
      ${actionCard({ action: "abandon-fishing", title: "只取药草，立刻返回药铺", description: "保住曹青的信任，却永久错过本周的黄金钱鳘与王五。", source: "安稳", meta: "水陆奇遇关闭" })}
    </div>
  `);
}

function renderFishingPrep() {
  const ready = FISHING_PREPARATIONS.every((item) => state.shenFishingPrep.includes(item.id)) && state.mindArt === MIND_ART.id;
  return gameShell(`
    ${sceneHeader("沈家至紫金河 · 半日", "把黄金钱鳘从传闻变成可以触发的奇遇", "每一项准备都要亲手完成。逆天改命只能告诉你条件，不能替你挖饵、学手艺或游过急流。")}
    <div class="quest-grid fishing-condition-grid">
      ${FISHING_PREPARATIONS.map((item) => {
        const status = resolveFishingPreparation(item.id, { completed: state.shenFishingPrep, hasContact: state.shenFuContact, potential: state.potential });
        const done = state.shenFishingPrep.includes(item.id);
        return `<article class="quest-card ${done ? "completed" : status.available ? "" : "locked"}"><span>${done ? "已满足" : "待准备"}</span><h2>${escapeHtml(item.name)}</h2><p>${escapeHtml(item.condition)}</p><small>${escapeHtml(item.result)}</small><button data-action="fishing-prep" data-value="${escapeHtml(item.id)}" ${!status.available ? "disabled" : ""}>${done ? "已经完成" : "现在去办"}</button></article>`;
      }).join("")}
      <article class="quest-card ${state.mindArt === MIND_ART.id ? "completed" : "locked"}"><span>${state.mindArt === MIND_ART.id ? "已满足" : "尚缺"}</span><h2>紫金河水路</h2><p>需要能逆流游到第三段河湾。</p><small>《鱼跃龙门诀》可降低体力消耗并提高水中身法。</small></article>
    </div>
    <div class="action-list">${actionCard({ action: "enter-purple-river", title: "抱紧包裹，顺紫金河游向钓点", description: "所有条件已齐，晌午前还能赶到芦苇荡外。", source: "鱼跃龙门诀", meta: ready ? "条件齐备" : `已满足 ${state.shenFishingPrep.length + (state.mindArt === MIND_ART.id ? 1 : 0)}/5`, kind: "special", disabled: !ready })}</div>
  `);
}

function renderRiverFishing() {
  const fortuneReady = state.attributes.fortune >= shenAttributePool();
  return gameShell(`
    ${sceneHeader("金陵东郊 · 紫金河", state.riverFishStage === 0 ? "十文铜钱沉入河底，你第一次把浮子甩进急流" : "普通鲫鱼已经离开，摆渡老翁也消失在芦苇后", state.riverFishStage === 0 ? "鱼跃龙门诀让你越过两段河湾。现在没有刀剑，只有水声、烈日和一根会不会动的浮子。" : "天色已经偏西。若宝鱼真与福缘有关，现在就是把所有可调属性压到福缘上的时候。")}
    <div class="river-stage"><div class="river-glyph">水<br />鱼<br />竿</div><div><span>钓鱼 ${state.fishingLevel}级</span><strong>${state.riverFishStage === 0 ? "先学会等" : fortuneReady ? "福缘已尽数调动" : "宝鱼仍未出现"}</strong><p>${state.riverFishStage === 0 ? "浮子第一次轻点时不要急，等它连续摆动再起竿。" : `当前福缘 ${state.attributes.fortune}，可调属性总数 ${shenAttributePool()}。`}</p></div></div>
    <div class="action-list">
      ${state.riverFishStage === 0 ? actionCard({ action: "cast-first-line", title: "耐住性子，等浮子连续摆动再起竿", description: "一尾二斤多的鲫鱼终于破水而出。", source: "钓鱼判定", meta: "钓鱼经验 +1%", kind: "special" }) : ""}
      ${state.riverFishStage === 1 && !fortuneReady ? actionCard({ action: "reallocate-fortune", title: "把全部已有属性重分到福缘", description: "暂时放下力道、悟性和身法，只为让今天剩下的运气集中到这一竿。", source: "逆天改命", meta: `福缘变为 ${shenAttributePool()}`, kind: "special" }) : ""}
      ${state.riverFishStage === 1 ? actionCard({ action: "cast-treasure-line", title: "重新挂饵，等那一点金色咬钩", description: "浮子猛地没入水下，河中亮起铜钱般的金鳞。", source: "珍馐宝鱼", meta: fortuneReady ? "黄金钱鳘上钩" : "需要先集中福缘", kind: "special", disabled: !fortuneReady }) : ""}
    </div>
  `);
}

function renderRiverCatch() {
  return gameShell(`
    ${sceneHeader("紫金河岸", "第一尾只是普通鲫鱼", "你没有鱼篓。船桨拨水声从芦苇后传来，一个戴草笠的黝黑老翁正笑你不懂得用鲜鱼吊汤。")}
    <div class="action-list">
      ${actionCard({ action: "river-catch-choice", value: "release", title: "把鲫鱼放回河里", description: "承认自己要等的不是这一尾，同时告诉老翁：有人说此地有一桩机缘。", source: "放生", meta: "老翁驻足", kind: "special" })}
      ${actionCard({ action: "river-catch-choice", value: "keep", title: "没有鱼篓也把鲫鱼留在岸边", description: "老翁摇头离去；鱼会坏掉，但宝鱼的条件仍未失效。", source: "贪一口鲜", meta: "王五好感不增" })}
    </div>
  `);
}

function renderWangEncounter() {
  return gameShell(`
    ${sceneHeader("紫金河 · 芦苇荡", "摆渡老翁说，五十里河道里哪有什么命中机缘", "他不信，却记住了你。等船影再度隐入芦苇，你终于可以不受旁人注视地改换福缘。")}
    <div class="npc-reveal-card"><div class="reveal-seal">渔<br />翁</div><div><span>安庆镇摆渡人</span><h2>姓名尚未相告</h2><p>手里只有船桨与鱼竿，肩背却比沈家大多数家丁更稳。</p></div></div>
    <div class="action-list">${actionCard({ action: "wait-for-treasure", title: "让老翁离开，继续守住这根浮子", description: "普通鱼已经证明钓法无误，剩下只看福缘。", source: "长线等待", meta: "可重分福缘", kind: "special" })}</div>
  `);
}

function renderTreasureFish() {
  return gameShell(`
    ${sceneHeader("黄金钱鳘上钩", "不到一尺的宝鱼，爆发出不逊常人的力道", "鱼竿几乎脱手，你半个身体已经被拖进河里。老翁的船又从芦苇后出现，高声让你沿岸游走，不要与鱼拔河。")}
    <div class="action-list">${Object.values(TREASURE_FISH_CHOICES).map((choice) => {
      const status = resolveTreasureFishChoice(choice.id, state.lives);
      return actionCard({ action: "treasure-fish-choice", value: choice.id, title: choice.title, description: choice.result, source: choice.outcome === "death" ? "落水" : choice.outcome === "miss" ? "保命" : "王五指点", meta: status.available ? (choice.outcome === "catch" ? "合力擒鱼" : choice.outcome === "death" ? "死亡回照" : "机缘结束") : "仅余一灯 · 不可重试", kind: choice.outcome === "death" ? "danger" : choice.outcome === "catch" ? "special" : "", disabled: !status.available });
    }).join("")}</div>
  `);
}

function renderTreasureShare() {
  return gameShell(`
    ${sceneHeader("紫金河岸 · 申时", "黄金钱鳘躺在岸上，鱼颈留着老翁那一竿的伤口", "没有他，你保不住鱼，也未必保得住命。逆天改命同时显出：眼前人名叫王五，六十好感便愿传一门自己磨了四十年的杆法。")}
    <div class="action-list">
      ${actionCard({ action: "share-treasure-fish", value: "share", title: "生火烤鱼，与王五一同分食", description: "承认这一尾鱼是两个人的收获。你吃下能承受的部分，把余下都留给他。", source: "互惠互利", meta: "王五好感 60 · 力道 +1 · 潜能 +500", kind: "special" })}
      ${actionCard({ action: "share-treasure-fish", value: "gift", title: "把整尾宝鱼送给王五", description: "王五会记住这份情，也愿传杆法；你却得不到宝鱼的一点力道与五百潜能。", source: "赠鱼", meta: "王五好感 70" })}
      ${actionCard({ action: "share-treasure-fish", value: "keep", title: "谢过援手，独自带走宝鱼", description: "你得到宝鱼，却永远失去王五的杆法与这一条水上关系。", source: "独吞", meta: "力道 +1 · 潜能 +500 · 无传功", kind: "danger" })}
    </div>
  `);
}

function renderWangTeaching() {
  const status = canLearnFishingRod({ strength: state.attributes.strength, insight: state.attributes.insight, hasWaterMindArt: state.mindArt === MIND_ART.id, favor: state.wangFavor });
  return gameShell(`
    ${sceneHeader("紫金河岸 · 宝鱼气血", "热流在脏腑里奔涌，两个时辰不散便会变成内伤", "王五提起鱼竿：竿可作棍，也可作鞭。正好用他的《打鱼杆法》把这股气血宣泄出去。")}
    <div class="skill-gate-board"><div><span>王五好感</span><strong>${state.wangFavor}/60</strong></div><div><span>力道</span><strong>${state.attributes.strength}/3</strong></div><div><span>水行悟性</span><strong>${status.effectiveInsight}/2</strong></div></div>
    <div class="action-list">
      ${state.attributes.strength < 3 ? actionCard({ action: "reallocate-strength", title: "把已有属性重分到力道", description: "宝鱼与五禽所得都已写入自身，现在可把全部点数调来稳住鱼竿。", source: "逆天改命", meta: `力道变为 ${shenAttributePool()}`, kind: "special" }) : ""}
      ${actionCard({ action: "learn-fishing-rod", title: "跟王五学抄水拍鱼、劈浪戳鱼", description: "鱼跃龙门诀补足水行悟性，宝鱼气血则让你可以不停挥杆。", source: "基础武学", meta: status.available ? "学会《打鱼杆法》" : "条件尚未齐备", kind: "special", disabled: !status.available })}
    </div>
  `);
}

function renderCaoReturn() {
  return gameShell(`
    ${sceneHeader("沈氏药铺 · 入夜", "曹青还在灯下等你", state.fishingRodMethod ? "他看见你湿透的衣袍和银柳木鱼竿，只问了一句：这一下午，去钓鱼了？" : "你带着宝鱼的热气回来，却没有一门能解释晚归、也没有一项新本事能让他重新评价你。")}
    <div class="action-list">
      ${state.fishingRodMethod ? actionCard({ action: "cao-return-choice", value: "truth", title: "如实说出黄金钱鳘与王五，并演示杆法", description: "不隐瞒晚归，也不夸大这门基础功夫。曹青会亲眼判断你说的是真是假。", source: "实话", meta: "曹青好感越过四十", kind: "special" }) : ""}
      ${actionCard({ action: "cao-return-choice", value: "hide", title: "只交回药材，不解释这一下午", description: "曹青不再追问，也不再把炼丹与武功交到你手里。", source: "止步", meta: "保住药童身份" })}
    </div>
  `);
}

function renderCaoGuidance() {
  return gameShell(`
    ${sceneHeader("药铺后院 · 灯下", "曹青看完两式杆法，反而让你把《青青册》和《五禽戏》拿来", "这门杆法只是渔人的基础功夫，却证明你渴望武道、愿意争机缘，也没有向他藏着新得的本事。")}
    <div class="encounter-ledger"><div><span>曹青好感</span><strong>${state.caoFavor}</strong><p>四十以上 · 正式开放指点</p></div><div><span>宝鱼见闻</span><strong>水中灵兽</strong><p>武夫之外，江河山野也有宝鱼、灵兽与凶禽</p></div></div>
    <div class="action-list">${actionCard({ action: "accept-cao-guidance", title: "先问两遍五禽戏，再请教一遍《青青册》", description: "曹青指出五禽关窍，也提醒你医术为本、体术为辅；明日正式跟他学炼回春丹。", source: "循序请教", meta: "五禽 +16% · 医书二级 15%", kind: "special" })}</div>
  `);
}

function renderAlchemyLesson() {
  const effective = state.attributes.insight + (state.mindArt === MIND_ART.id ? 2 : 0);
  return gameShell(`
    ${sceneHeader("东门药铺 · 次日丹房", "曹青点燃炉火，第一次把每一种药材和火候都讲给你听", "回春丹用三七、丹参与苎麻根等药材，是最基础的疗伤丹之一。真正的门槛不是背方子，而是把水、火、药序同时握住。")}
    <div class="skill-gate-board"><div><span>医术</span><strong>${state.medicalLevel}/2</strong></div><div><span>曹青好感</span><strong>${state.caoFavor}/40</strong></div><div><span>当前有效悟性</span><strong>${effective}/7</strong></div></div>
    ${effective >= 7 ? `<div class="trigger-block"><span class="trigger-label">天资聪颖</span>五点已有属性尽数化作悟性，鱼跃龙门诀再加两点。曹青只演示一遍，你也能把每个动作重新放回脑海。</div>` : ""}
    <div class="action-list">
      ${effective < 7 ? actionCard({ action: "reallocate-alchemy-insight", title: "把五禽与宝鱼所得一并重分到悟性", description: "已有五点属性尽数集中，鱼跃龙门诀再为水火判定补足两点。", source: "逆天改命", meta: `悟性 ${shenAttributePool()} + 心法 2`, kind: "special" }) : ""}
      ${actionCard({ action: "learn-return-spring", title: "记下回春丹方与整炉火候", description: "在曹青半日演示中令炼丹术正式入门，然后要求亲手试一炉。", source: "正式传授", meta: effective >= 7 ? "炼丹一级 · 回春丹方" : "有效悟性需要七", kind: "special", disabled: effective < 7 })}
    </div>
  `);
}

function renderFirstAlchemy() {
  return gameShell(`
    ${sceneHeader("第一炉回春丹", "曹青已经退到一旁，现在由你亲手起火、投药、收丹", "纸上得来终觉浅。你只有一份药材，若把刚才的三次换火简化，药性就会在炉中分离。")}
    <div class="action-list">${Object.values(RETURN_SPRING_BREW.choices).map((choice) => actionCard({ action: "first-alchemy", value: choice.id, title: choice.title, description: choice.result, source: choice.outcome === "success" ? "完整复现" : "冒险省步", meta: choice.outcome === "success" ? "六枚下品回春丹" : "烧坏本炉 · 次日重试", kind: choice.outcome === "success" ? "special" : "danger" })).join("")}</div>
  `);
}

function renderAlchemyFailure() {
  return gameShell(`
    ${sceneHeader("丹炉熄火", "这一炉没有成丹", RETURN_SPRING_BREW.choices[state.shenLastAlchemyChoice]?.result || "药材已经不能再用。")}
    <div class="death-verdict alchemy-failure-card"><span>烧坏药材</span><strong>${state.alchemyFailures}</strong><p>曹青没有杀你，只让你把错误从头说一遍。明日沈家会再送来一份药材，但今天的时辰已经过去。</p></div>
    <div class="button-row"><button class="primary-button" data-action="retry-alchemy">记住错处，次日再开一炉</button></div>
  `);
}

function renderShenChapterEnding() {
  const success = state.alchemyPills === RETURN_SPRING_BREW.successPills;
  const tendency = state.shenTendency === "medicine" ? "丹医立足" : "水陆求道";
  return gameShell(`
    ${sceneHeader(success ? "东门药铺 · 丹香初成" : "金陵东门 · 路在眼前断开", success ? "六枚下品回春丹滚入木盘，曹青许你三丹换一门真正武功" : "你仍活着，却没有把这一次机缘走到炼丹炉前", success ? `这一程更偏向“${tendency}”。但你亲手得到的另一条路不会消失：紫金河仍认你的鱼竿，曹青也已经认你的丹。` : "安全可以保住药童身份，却换不来王五的杆法、曹青的指点或下一层武功承诺。")}
    <div class="wudao-ending-grid shen-ending-grid">
      <div><span>丹医所得</span><strong>${success ? "六枚下品回春丹" : `医术 ${state.medicalLevel}级`}</strong><p>${success ? `炼丹 ${state.alchemyLevel}级 ${state.alchemyProgress}% · 《百丹注解》` : "尚未完成第一炉"}</p></div>
      <div><span>水陆所得</span><strong>${state.fishingRodMethod ? "《打鱼杆法》" : "尚无武学"}</strong><p>${state.treasureFishCaught ? `黄金钱鳘 · 王五好感 ${state.wangFavor}` : "黄金钱鳘已经错过"}</p></div>
      <div><span>曹青好感</span><strong>${state.caoFavor}</strong><p>${success ? "江湖知音 · 可以继续请教" : "未越过传艺门槛"}</p></div>
      <div><span>五维总点</span><strong>${shenAttributePool()}</strong><p>五禽一戏 +1 · 宝鱼力道 ${state.treasureFishShared ? "+1" : "未得"}</p></div>
    </div>
    <div class="next-hooks shen-next-hooks">
      <div><span>曹青承诺</span><strong>再掌握三种丹药</strong><p>达到回春丹的品质，便传一招真正武功。</p></div>
      <div><span>江湖大典</span><strong>三个月后 · 百舸争流</strong><p>炼骨才够当船夫；你已先得水路与杆法。</p></div>
      <div><span>血书来客</span><strong>万鲤堂 · 孙不离</strong><p>沈家密会只揭开了金龙会的第一层。</p></div>
    </div>
    <div class="button-row">
      ${success && !state.p0.started ? `<button class="primary-button" data-action="start-p0-journey">拆开沈府夜送的急帖</button>` : ""}
      ${success && state.p0.started && !state.p0.complete ? `<button class="primary-button" data-action="continue-p0-journey">循着旧行录继续赶路</button>` : ""}
      <button class="secondary-button" data-action="restart">另起一世</button>
    </div>
  `);
}

function renderThirdLadySummons() {
  return gameShell(`
    ${sceneHeader(p0ClockText(), "沈府的青篷马车停在药铺门前", "来人只递上一枚内宅腰牌：三夫人白栀云练功后昏厥，沈家请曹青立刻入府。曹青把药箱推给你，说今夜由你先看。")}
    <div class="encounter-ledger">
      <div><span>你能带去的本事</span><strong>医术二级 · 炼丹二级</strong><p>能查脉象，也能亲手开炉。</p></div>
      <div><span>病势</span><strong>四刻</strong><p>每多查一处，帘后之人的气息便弱一分。</p></div>
      <div><span>沈府旧账</span><strong>互不信任</strong><p>救人可换门路；误诊也会记在你名下。</p></div>
    </div>
    <div class="action-list">
      ${actionCard({ action: "third-lady-summons", value: "accept", title: "背上药箱，随车入沈府", description: "亲自判断病因，再决定是否接下这条命。", source: "限时病局", meta: "开启帘后问脉", kind: "special" })}
      ${actionCard({ action: "third-lady-summons", value: "decline", title: "留在药铺，不碰沈家内宅", description: "保住眼前安稳；三夫人的病和她手里的针法从此与你无关。", source: "避事", meta: "永久错过" })}
    </div>
  `);
}

function renderThirdLadyDiagnosis() {
  const board = getDiagnosisBoard(state.p0);
  const observations = board.observations.length ? board.observations : ["尚未得到可以落笔的见闻"];
  const did = (id) => state.p0.diagnosisActions.includes(id);
  return gameShell(`
    ${sceneHeader("沈家内宅 · 暖阁", "青纱帘后，白栀云的呼吸时断时续", "她并无外伤，手指却每隔数息便反扣掌心。你只有几刻时间判断：这是急病，还是练功留下的暗伤。")}
    <div class="skill-gate-board">
      <div><span>病势余刻</span><strong>${board.dangerClock}</strong></div>
      <div><span>当前判断</span><strong>${board.diagnosis === "deviation" ? "经脉逆行" : "尚无定论"}</strong></div>
      <div><span>白栀云</span><strong>${escapeHtml(p0RelationLabel("bai_zhiyun"))}</strong></div>
    </div>
    <div class="encounter-ledger">${observations.map((text, index) => `<div><span>见闻 ${index + 1}</span><strong>${escapeHtml(text)}</strong><p>${index ? "可与先前迹象互相印证。" : "这是你亲眼所得，并非传闻。"}</p></div>`).join("")}</div>
    <div class="action-list">
      ${actionCard({ action: "diagnose-third-lady", value: "observe", title: "先看呼吸与指节", description: "不触碰病人，从气息和痉挛寻找第一处异常。", source: "望诊", meta: did("observe") ? "已经查过" : "耗去一刻", disabled: did("observe") })}
      ${actionCard({ action: "diagnose-third-lady", value: "pulse", title: "隔帘按住腕脉", description: "用《青青册》的脉理分辨三处经脉是否逆行。", source: "医术二级", meta: did("pulse") ? "已经查过" : "耗去一刻", kind: "special", disabled: did("pulse") || state.medicalLevel < 2 })}
      ${actionCard({ action: "diagnose-third-lady", value: "ask_manual", title: "请她交出练功残页", description: "病因若来自功法，残页会比口述更可靠；她未必肯把秘密给一个外人。", source: "信任十", meta: did("ask_manual") ? "已经查过" : state.p0.relationships.bai_zhiyun.trust >= 10 ? "可以开口" : "仍被戒备", disabled: did("ask_manual") || state.p0.relationships.bai_zhiyun.trust < 10 })}
      ${actionCard({ action: "conclude-third-lady", title: "落笔：不是急病，是强练功法所致", description: "以呼吸错乱和经脉逆行互相印证，停止继续查问，立刻寻换血之法。", source: "病因确证", meta: board.canConclude ? "结论成立" : "还缺相互印证的见闻", kind: "special", disabled: !board.canConclude })}
    </div>
  `);
}

function renderPurpleDragonFormula() {
  const trust = state.p0.relationships.bai_zhiyun.trust;
  return gameShell(`
    ${sceneHeader("帘后残页 · 紫龙换血法", "要救她，先炼一枚紫龙换血丹", "紫鳞草引血，血藤芯束药，定脉砂压住逆行经脉。三味药都不在你手里；取药的路，会决定谁欠谁。")}
    <div class="action-list">
      ${actionCard({ action: "choose-ingredient-source", value: "cao", title: "请曹青打开私藏药匣", description: "用你在丹房和紫金河挣来的情分换三味药，不花银子。", source: "曹青情分", meta: state.caoFavor >= 40 ? `好感 ${state.caoFavor}` : "情分不足", kind: "special", disabled: state.caoFavor < 40 })}
      ${actionCard({ action: "choose-ingredient-source", value: "shen", title: "让白栀云调沈家秘库", description: "药由沈家出，但你会亲眼看见秘库钥印，她也会更防着你。", source: "内宅权限", meta: trust >= 10 ? "猜疑增加" : "尚不肯开库", disabled: trust < 10 })}
      ${actionCard({ action: "choose-ingredient-source", value: "merchant", title: "连夜去鬼市买齐三味药", description: "不欠人情，也不让沈家看见取药过程；六两银子当场结清。", source: "银货两讫", meta: `${state.shenSilver}/6 两`, disabled: state.shenSilver < 6 })}
    </div>
  `);
}

function renderPurpleDragonAlchemy() {
  return gameShell(`
    ${sceneHeader("沈府偏房 · 子时", "三味药只够开一炉", "紫鳞草最烈，早一息会冲散血藤，晚一息又压不住病势。曹青守门，不会替你动手。")}
    <div class="encounter-ledger">
      <div><span>紫鳞草</span><strong>一份</strong><p>引动衰弱气血。</p></div><div><span>血藤芯</span><strong>一份</strong><p>约束换血药力。</p></div><div><span>定脉砂</span><strong>一份</strong><p>压住逆行经脉。</p></div>
    </div>
    <div class="action-list">
      ${actionCard({ action: "brew-purple-dragon", value: "strict", title: "按残页逐息换火", description: "不抢时间，三次退火都完整做完，让药力稳定相合。", source: "丹医同用", meta: "稳定换血丹", kind: "special" })}
      ${actionCard({ action: "brew-purple-dragon", value: "rush", title: "猛火抢回一刻病势", description: "可以更快成丹，但紫鳞草的躁性会留在丹中。", source: "险炼", meta: "药力躁烈", kind: "danger" })}
      ${actionCard({ action: "brew-purple-dragon", value: "substitute", title: "减去一次退火，强行收丹", description: "省下时辰，却会让三味药在炉中各走各路。", source: "省步", meta: "极易焦结", kind: "danger" })}
    </div>
  `);
}

function renderThirdLadyTreatment() {
  const quality = { stable: "药性稳定", volatile: "药力躁烈", failed: "本炉焦结" }[state.p0.pillQuality] || "尚无成丹";
  const hasPill = Number(state.p0.items.purple_dragon_blood_pill || 0) > 0;
  return gameShell(`
    ${sceneHeader("丑时一刻 · 暖阁", "白栀云的脉象已经弱到第四次停顿", `木盒里的结果是：${quality}。换血丹只能推开死门，若经脉没有先被封住，药力也可能把人送进去。`)}
    <div class="action-list">
      ${actionCard({ action: "treat-third-lady", value: "seal_then_pill", title: "先以银针封住三处逆脉，再送丹换血", description: "把医术和炼丹合成一条救法，先控制经脉，再引药力通行。", source: "完整救法", meta: hasPill ? "可施行" : "没有成丹", kind: "special", disabled: !hasPill })}
      ${actionCard({ action: "treat-third-lady", value: "pill_direct", title: "直接喂下换血丹", description: "争抢最后几息，但把药力冲击全部留给病人承担。", source: "抢救", meta: hasPill ? "只能暂稳" : "没有成丹", kind: "danger", disabled: !hasPill })}
      ${actionCard({ action: "treat-third-lady", value: "withdraw", title: "收起药箱，承认此局无力再救", description: "你能活着离开沈府；白栀云和她掌握的针法都会从这条路上消失。", source: "止损", meta: "永久错过" })}
    </div>
  `);
}

function renderNeedleInheritance() {
  const outcome = state.p0.treatmentOutcome;
  const result = outcome === "saved" ? "经脉归位，气息渐稳" : outcome === "saved_with_aftereffect" ? "性命保住，躁毒仍留在血中" : "病势暂时压住";
  return gameShell(`
    ${sceneHeader("天将明 · 沈府暖阁", result, "白栀云让侍女取来一只乌木针匣。她说这套春风化雨针既能救人，也能截脉制敌；今夜的人情，不该只用银子还。")}
    <div class="encounter-ledger"><div><span>白栀云</span><strong>${escapeHtml(p0RelationLabel("bai_zhiyun"))}</strong><p>她记得你怎样判断、怎样用药。</p></div><div><span>春风化雨针</span><strong>医针亦是杀针</strong><p>拿到手后，下一场夜战就能亲自使用。</p></div></div>
    <div class="action-list">${actionCard({ action: "receive-spring-needles", title: "接过针匣，记下封穴与穿喉两路手法", description: "银针入手，救人的次序和杀人的分寸都要由你决定。", source: "白栀云传艺", meta: "获得武学与针匣", kind: "special" })}</div>
  `);
}

function renderP0Death() {
  const memory = state.p0.deathMemory.at(-1);
  return gameShell(`
    ${sceneHeader("一盏命灯碎裂", state.p0.deathReason || "这一条路走到了死处", "火光退回灯芯，疼痛却没有退。你仍记得最后一眼看见的招式、呼吸和错处。")}
    <div class="death-verdict"><span>带回的死中见闻</span><strong>${escapeHtml(memory || "强行前进并不能替代看清条件")}</strong><p>剩余命灯 ${state.lives}。回到最近因果节点后，这段记忆不会消失。</p></div>
    <div class="button-row"><button class="primary-button" data-action="return-p0-death">循着残灯回到死前</button></div>
  `);
}

function renderFirstNeedleAmbush() {
  const battle = state.p0.battle || createFirstBattle();
  const roundTwo = battle.round >= 2;
  return gameShell(`
    ${sceneHeader("东门长街 · 夜雨", "蒙面刀客从药铺檐影里压低右肩", "他挡住回路，不问姓名。雨水在右手刀锋上发亮，可你已经知道：能看见的未必是真正杀招。")}
    <div class="battle-intent"><span>对手意图</span><strong>${escapeHtml(battle.enemyIntent)}</strong><p>${battle.observedFeint ? "你已看破右肩只是诱饵，真正短刃藏在左袖。" : battle.darkness ? "灯已熄灭，他的步法慢了一瞬。" : battle.enemyWounded ? "右腕中针，但左袖仍可递刀。" : "尚未看破虚实。"}</p></div>
    ${state.p0.wounds.length ? `<div class="death-verdict"><span>带伤应战</span><strong>肋下见血</strong><p>再失手会让之后的站桩与突破更难。</p></div>` : ""}
    <div class="action-list">
      ${!roundTwo ? actionCard({ action: "first-battle-action", value: "observe", title: "让开半步，只看肩、胯与袖口", description: "放弃先手，用一轮换取对真正杀招的判断。", source: "观招", meta: "看破虚招", kind: "special" }) : ""}
      ${!roundTwo ? actionCard({ action: "first-battle-action", value: "extinguish", title: "飞针打灭街边灯笼", description: "不与刀锋相碰，先改变雨夜里的视野和步速。", source: "借势", meta: "进入第二轮" }) : ""}
      ${!roundTwo || !battle.enemyWounded ? actionCard({ action: "first-battle-action", value: "needle_wrist", title: "银针先取持刀手腕", description: "春风针第一次用于实战；制住明处的刀，却未必制住暗处杀招。", source: "新武学", meta: "立即兑现", kind: "special" }) : ""}
      ${roundTwo ? actionCard({ action: "first-battle-action", value: "seal", title: "封住肩井与曲池，留他一命", description: "以针截断发力，换一个可以开口的活口。", source: "制伏", meta: "留下口供", kind: "special" }) : ""}
      ${roundTwo ? actionCard({ action: "first-battle-action", value: "kill", title: "穿喉一针，不给第二次出刀", description: "你第一次亲手决定让一个人死。此后曹青看你的眼神也会不同。", source: "杀招", meta: "第一次杀人", kind: "danger" }) : ""}
      ${roundTwo && !battle.playerWounded ? actionCard({ action: "first-battle-action", value: "reckless", title: "趁看破虚招强追一步", description: "你能避开左袖短刃的要害，却会被回锋割开肋下；带伤仍可继续决胜。", source: "负伤抢势", meta: "留下肋下刀伤", kind: "danger" }) : ""}
      ${!roundTwo && state.lives > 1 ? actionCard({ action: "first-battle-action", value: "reckless", title: "迎着右手刀光抢攻", description: "把全部注意都交给明处刀锋，试着一针定胜负。", source: "死局", meta: "必死 · 可带回见闻", kind: "danger" }) : ""}
      ${actionCard({ action: "first-battle-action", value: "flee", title: "翻过药铺矮墙，带针匣离开", description: "不查刀客来路，保住性命和刚得到的针法。", source: "退路", meta: "安全离开" })}
    </div>
  `);
}

function renderFirstKillAftermath() {
  const outcomes = {
    killed: ["刀客仰面倒进雨水", "你没有收回最后一针。第一条人命已经落在自己手上。"],
    subdued: ["刀客四肢僵住，仍能开口", "活口可能交代来路，也会让幕后之人知道你会留手。"],
    escaped: ["身后的刀声渐远", "你保住性命，却不知道是谁要杀药铺里的人。"],
  };
  const [title, subtitle] = outcomes[state.p0.battleOutcome] || ["雨夜已经过去", "你带着针匣回到药铺。"];
  return gameShell(`
    ${sceneHeader("长街夜战 · 已决", title, subtitle)}
    <div class="encounter-ledger"><div><span>你的选择</span><strong>${state.p0.battleOutcome === "killed" ? "杀死" : state.p0.battleOutcome === "subdued" ? "制伏" : "脱身"}</strong><p>活口、死尸和逃路各会留下不同痕迹；曹青与幕后之人都会据此重新看你。</p></div><div><span>春风化雨针</span><strong>已经实战</strong><p>从医针变成了真正能决定生死的手段。</p></div></div>
    <div class="action-list">${actionCard({ action: "return-after-battle", title: "带着夜战结果回东门药铺", description: "曹青还亮着灯。他会问清楚每一针落在何处。", source: "回去见师", meta: "决定师徒路", kind: "special" })}</div>
  `);
}

function renderApprenticeshipOffer() {
  return gameShell(`
    ${sceneHeader("东门药铺 · 黎明", "曹青听完夜战，只问你愿不愿真正入他的门", "五禽戏只能健体，打鱼杆法也只是渔人手艺。若想跨进锻体，他愿传一门桩功；从此你也要替他担一部分仇怨。")}
    <div class="action-list">
      ${actionCard({ action: "apprenticeship-choice", value: "accept", title: "跪下奉茶，认曹青为师", description: "得到通往锻体的桩功，也把师门仇怨和规矩一起接下。", source: "师徒", meta: "选择一门桩功", kind: "special" })}
      ${actionCard({ action: "apprenticeship-choice", value: "decline", title: "只谢传艺，不入师门", description: "保留医术、针法和自由，但失去这次锻体引路。", source: "独行", meta: "师徒缘止" })}
    </div>
  `);
}

function renderStakeChoice() {
  return gameShell(`
    ${sceneHeader("药铺后院 · 两张旧图", "曹青只让你从两门桩功里选一门", "枯木桩收伤纳药，定海桩借水稳身。今日养出的气血习性，八月十五赶回破庙时便会显出分别。")}
    <div class="action-list">${Object.values(P0_STAKES).map((stake) => actionCard({ action: "choose-stake", value: stake.id, title: stake.name, description: stake.description, source: stake.id === "deadwood_stake" ? "守伤纳药" : "借水定身", meta: stake.travelBenefit, kind: "special" })).join("")}</div>
  `);
}

function renderStakeTraining() {
  const stake = P0_STAKES[state.p0.stakeId];
  const treatableWound = state.p0.wounds.some((wound) => Number(wound.severity || 0) <= 2);
  return gameShell(`
    ${sceneHeader("后院石坪 · 月过中天", `第一夜只练${stake?.name || "桩功"}`, stake?.description || "曹青以竹梢敲正你的肩胯，让呼吸领着气血走。")}
    <div class="skill-gate-board"><div><span>潜能</span><strong>${state.potential}/120</strong></div><div><span>伤势</span><strong>${state.p0.wounds.length ? "带伤" : "无碍"}</strong></div><div><span>修行所得</span><strong>入门三成</strong></div></div>
    <div class="action-list">${actionCard({ action: "train-stake", title: "用一百二十潜能记住呼吸、肩胯与落足", description: "这一夜把桩架写进身体，往后才能靠它冲开锻体第一关。", source: "首次修炼", meta: "潜能 -120", kind: "special", disabled: state.potential < 120 })}</div>
    ${treatableWound ? `<div class="action-list">
      ${actionCard({ action: "treat-p0-wound", value: "needles", title: "先以春风针封住伤口周围气血", description: "用医术二级清创封穴，不耗丹药，但要把今夜站桩往后推一刻。", source: "医针治伤", meta: "清除轻中伤", kind: "special" })}
      ${actionCard({ action: "treat-p0-wound", value: "return_spring", title: "服下一枚亲手炼成的回春丹", description: "以成丹补回血气，先把肋下或腿上的伤势稳住。", source: "下品回春丹", meta: `余 ${Number(state.p0.items.return_spring_pill || 0)} 枚`, disabled: Number(state.p0.items.return_spring_pill || 0) < 1 })}
    </div>` : ""}
  `);
}

function renderBodyBreakthrough() {
  const board = getBodyBreakthroughBoard(state.p0, { potential: state.potential });
  return gameShell(`
    ${sceneHeader("鸡鸣之前 · 气血撞关", "未入门与锻体之间，只隔着一次敢不敢让全身气血同时醒来", "曹青让你按桩功呼吸缓推，不许抢在吐纳之前催血。那场夜战留下的生死感，此刻正好用来辨认极限。")}
    <div class="skill-gate-board">${board.checks.map((check) => `<div><span>${escapeHtml(check.label)}</span><strong>${check.met ? "已具备" : "尚欠缺"}</strong></div>`).join("")}</div>
    <div class="action-list">
      ${actionCard({ action: "body-breakthrough", value: "steady", title: "让桩功领着气血，一寸寸推过四肢", description: "按曹青所教稳步撞关，不抢快，不绕过旧伤。", source: "稳破", meta: "潜能 -200 · 踏入锻体", kind: "special", disabled: !board.available })}
      ${state.lives > 1 ? actionCard({ action: "body-breakthrough", value: "force", title: "趁血热强催全身，抢在一息内破关", description: "不让桩功领路，直接让气血冲撞旧伤和心脉。", source: "死局", meta: "必死 · 可带回见闻", kind: "danger", disabled: !board.available }) : ""}
    </div>
  `);
}

function renderMidAutumnWarning() {
  return gameShell(`
    ${sceneHeader("八月十四 · 黄昏", "沈家铜钱在袖中忽然发烫", "你想起三个月前破庙供桌上的陌生贡品：当时条件所示，八月十五才看得见供物从何而来。那扇窗只开一日。")}
    <div class="encounter-ledger"><div><span>日期</span><strong>八月十四</strong><p>明日之前抵达破庙，才能撞见贡品主人。</p></div><div><span>新境界</span><strong>锻体一重</strong><p>第一次用新身体赶一段真正决定机缘的路。</p></div><div><span>可走水路</span><strong>鱼跃龙门诀</strong><p>旧武学和新桩功会共同改变赶路结果。</p></div></div>
    <div class="action-list">${actionCard({ action: "prepare-mid-autumn", title: "收好针匣与干粮，今夜便走", description: "不等明日开城门，把一天的机缘窗握在自己手里。", source: "旧奇遇回响", meta: "选择赶路路线", kind: "special" })}</div>
  `);
}

function renderMidAutumnDeparture() {
  return gameShell(`
    ${sceneHeader(p0ClockText(), "从金陵东门到破庙，有四种走法", "官道稳却慢，山路近却伤腿，紫金河最快但要敢在夜水里行气。你也可以留到明日，只是机缘不会等人。")}
    <div class="action-list">
      ${actionCard({ action: "mid-autumn-travel", value: "water", title: "借紫金河夜水直下东郊", description: "以鱼跃龙门诀借流行气；定海桩还能让你到岸时气血不乱。", source: "水路", meta: state.mindArt === MIND_ART.id ? "准时抵达" : "缺少水行心法", kind: "special", disabled: state.mindArt !== MIND_ART.id })}
      ${actionCard({ action: "mid-autumn-travel", value: "mountain", title: "翻过东郊乱石岭抄近路", description: "早晨可到，但湿石会留下腿伤；枯木桩能把伤势压轻。", source: "山路", meta: "准时 · 可能带伤" })}
      ${actionCard({ action: "mid-autumn-travel", value: "road", title: "等城门开后走东郊官道", description: "最安全，也最慢；赶到时太阳已经偏西。", source: "官道", meta: "迟到" })}
      ${actionCard({ action: "mid-autumn-travel", value: "delay", title: "先在药铺休整一日", description: "伤和疲惫都不会增加，但八月十五的窗口会彻底关闭。", source: "休整", meta: "永久错过" })}
    </div>
  `);
}

function renderTempleOfferingSource() {
  const fresh = state.p0.travelOutcome === "on_time_fresh";
  return gameShell(`
    ${sceneHeader("八月十五 · 破庙", "供桌上的鲜桃还沾着露水", fresh ? "定海桩让你从夜水上岸后仍气息平稳。檐角传来瓦片轻响，一团灰影正把贡品往庙后搬。" : "你及时赶到，也看见了供物并非香客所留：一只灰猴抱着桃子跃上残檐，回头看了你一眼。")}
    <div class="action-list">${actionCard({ action: "follow-offering", title: "不碰供桌，循着瓦上的桃汁追去", description: "先看清贡品主人和庙后的路，再决定取不取机缘。", source: "见闻", meta: "发现檐上猴群", kind: "special" })}</div>
  `);
}

function renderMonkeyTest() {
  return gameShell(`
    ${sceneHeader("破庙后檐 · 古橡树", "七八只灰猴围着一只缺耳老猴", "老猴没有立刻逃。它把一枚青果放在瓦上，又看向你的手，像是在等你先说明来意。")}
    <div class="action-list">
      ${actionCard({ action: "monkey-test", value: "share_peach", title: "把最后的山桃掰开，一半放在瓦上", description: "用破庙里曾救过你性命的食物，换猴群把你当成客人。", source: "山桃", meta: `${state.peaches}/1 枚`, kind: "special", disabled: state.peaches < 1 })}
      ${actionCard({ action: "monkey-test", value: "trade", title: "留下一两碎银，不伸手抢青果", description: "猴子不认银钱，但认得你愿意留下东西再取东西。", source: "交换", meta: `${state.shenSilver}/1 两`, disabled: state.shenSilver < 1 })}
      ${actionCard({ action: "monkey-test", value: "grab", title: "趁老猴转头，直接夺走青果", description: "能立刻拿到眼前东西，也会让整片山林都把你当贼。", source: "强取", meta: "猴群敌对", kind: "danger" })}
    </div>
  `);
}

function renderMonkeyConflict() {
  const deadwood = state.p0.stakeId === "deadwood_stake";
  const sea = state.p0.stakeId === "sea_stilling_stake";
  return gameShell(`
    ${sceneHeader("破庙后林 · 尖啸四起", "你刚抓住青果，石块与枯枝便从树冠一齐落下", "灵猴不与你比力气，只在枝头轮番追打。猴儿酒和水洞已经无望；现在要决定的是怎样从这场围攻里退走。")}
    <div class="battle-intent"><span>猴群意图</span><strong>逼你离开破庙后山，并记住你的气味</strong><p>树冠太密，银针无法一次压住所有方向。你新学的桩功会决定能否稳住退路。</p></div>
    <div class="action-list">
      ${deadwood ? actionCard({ action: "monkey-conflict", value: "root_and_endure", title: "以枯木桩收紧呼吸，护住头脸硬退", description: "肩背会挨一记石块，却不让伤势乱了气血。", source: "神农枯木桩", meta: "轻伤退走", kind: "special" }) : ""}
      ${sea ? actionCard({ action: "monkey-conflict", value: "anchor_and_withdraw", title: "借湿地定住双足，一步一退", description: "定海桩把滑泥中的重心钉稳，让你不被猴群逼下山坡。", source: "沧澜定海桩", meta: "无伤退走", kind: "special" }) : ""}
      ${actionCard({ action: "monkey-conflict", value: "flee", title: "抱头冲下湿滑山坡", description: "最快离开猴群，却会在乱石间扭伤一条腿。", source: "夺路", meta: "腿伤二级", kind: "danger" })}
    </div>
  `);
}

function renderMonkeyWineChoice() {
  return gameShell(`
    ${sceneHeader("古橡树洞 · 百果香", "缺耳老猴拖出一只封泥小瓮", "酒气里有山泉、青果和多年沉积的药力。老猴先舔了一口，把瓮推到你面前；怎么分这瓮酒，它都会记住。")}
    <div class="action-list">
      ${actionCard({ action: "monkey-wine", value: "share", title: "只取一囊，其余推回猴群中间", description: "带走一份猴儿酒，也让老猴看见你愿意分利。", source: "分酒", meta: "猴儿酒 ×1 · 情分增加", kind: "special" })}
      ${actionCard({ action: "monkey-wine", value: "drink", title: "当场饮下一盏，以新成锻体化开药力", description: "不把酒带走，直接让百果热流洗过筋骨。", source: "炼体", meta: "体魄 +1" })}
      ${actionCard({ action: "monkey-wine", value: "keep", title: "把小瓮全部收入行囊", description: "得到两份猴儿酒；老猴不会翻脸，却会记下你一滴未留。", source: "独占", meta: "猴儿酒 ×2 · 情分下降", kind: "danger" })}
    </div>
  `);
}

function renderApeWaterCave() {
  return gameShell(`
    ${sceneHeader("庙后猴道 · 山泉水洞", "猴群拨开藤蔓，露出一面满是挥臂凹痕的石壁", "这些不是文字，也不是完整招式。每一道凹痕都像有巨猿曾在水压下挥棒，肩、脊、胯连成一线。你可以先记，也可以立刻仿。")}
    <div class="action-list">
      ${actionCard({ action: "ape-legacy", value: "observe", title: "逐道比对水痕，只记发力轮廓", description: "不冒险伤身，把神猿残势作为以后寻完整传承的线索。", source: "静观", meta: "获得残刻拓痕", kind: "special" })}
      ${actionCard({ action: "ape-legacy", value: "imitate", title: "站进齐腰泉水，照石痕挥出第一式", description: "以锻体身躯亲试残势，能多记一分，也会扭伤尚不习惯的肩背。", source: "亲试", meta: "残势进度 +10 · 轻伤", kind: "danger" })}
    </div>
  `);
}

function renderP0Missed() {
  const monkeyConflictText = {
    endured: "枯木桩护住气血，你只带着肩背轻伤退到山下；猴群仍带走了酒瓮和秘密。",
    withdrew_unhurt: "定海桩让你在湿坡上稳步退开，没有受伤；猴群却再也不许你接近后山。",
    fled_wounded: "你冲下湿坡扭伤一条腿，猴群则带着酒瓮和秘密远离破庙。",
  }[state.p0.missedDetail];
  const reasons = {
    third_lady: ["沈府暖阁的灯在天明前熄灭", "你没有接下或完成那场病局。白栀云、紫龙换血丹与春风化雨针都从此路消失。"],
    treatment: ["换血没有救回帘后之人", "沈家封了暖阁，也封住了你继续追问针法与练功残页的门。"],
    apprenticeship: ["曹青收回了两张桩功图", "你仍有针法和医术，却没有人替你指出锻体第一关。"],
    travel: ["破庙供桌只剩干涸桃汁", "你来迟一步。猴群和它们藏在山后的路已经不见。"],
    monkeys: ["尖啸声从一棵树传向另一棵树", monkeyConflictText || "从你强取青果的那一刻起，猴群便带着酒瓮和秘密远离破庙。"],
  };
  const [title, subtitle] = reasons[state.p0.missedReason] || ["这一条机缘已经合拢", "你保住了现有所得，也看清一次错过会带走什么。"];
  return gameShell(`
    ${sceneHeader("机缘已失", title, subtitle)}
    <div class="button-row"><button class="primary-button" data-action="finish-p0-missed">把这次错过写进行录</button></div>
  `);
}

function renderP0JourneyEnd() {
  const legacy = state.p0.legacyOutcome ? "神猿残势" : "未见神猿遗迹";
  const relation = state.p0.relationships.temple_monkeys;
  return gameShell(`
    ${sceneHeader("八月十五 · 月落东郊", state.p0.complete ? "破庙不再只是你活过第一夜的地方" : "这一程停在了机缘门外", state.p0.complete ? "你从病榻学会用医术定因果，从雨夜学会用针决定生死，又用一门桩功赶回旧地。猴群认得你，水洞也留下了下一门武学的方向。" : "你仍保有此前所有武学与关系，但没能把这一串机缘走到水洞深处。")}
    <div class="wudao-ending-grid shen-ending-grid">
      <div><span>医道结果</span><strong>${state.p0.treatmentOutcome === "saved" ? "白栀云脱险" : state.p0.treatmentOutcome || "未成"}</strong><p>${escapeHtml(p0RelationLabel("bai_zhiyun"))}</p></div>
      <div><span>夜战结果</span><strong>${state.p0.battleOutcome === "killed" ? "第一次杀人" : state.p0.battleOutcome === "subdued" ? "留下活口" : state.p0.battleOutcome === "escaped" ? "保命脱身" : "未经历"}</strong><p>${state.p0.skills.spring_rain_needles ? "春风化雨针已经实战" : "针法未得"}</p></div>
      <div><span>武道进境</span><strong>${state.martialStage === "body" ? "锻体一重" : "未入门"}</strong><p>${escapeHtml(P0_STAKES[state.p0.stakeId]?.name || "未选桩功")}</p></div>
      <div><span>破庙新缘</span><strong>${legacy}</strong><p>灵猴情分 ${relation.favor} · 信任 ${relation.trust}</p></div>
    </div>
    <div class="next-hooks"><div><span>水洞石痕</span><strong>神猿挥棒只余半式</strong><p>若要补全，须先找到能承受山泉水压的兵器。</p></div><div><span>刀客来路</span><strong>东门夜杀并非偶遇</strong><p>${state.p0.battleOutcome === "subdued" ? "活口仍能追问。" : "死人和逃路都留下了不同线索。"}</p></div><div><span>沈家内宅</span><strong>练功残页另有来处</strong><p>白栀云为何强练此功，尚未说完。</p></div></div>
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
  shenArrival: renderShenArrival,
  shenJobs: renderShenJobs,
  caoArrival: renderCaoArrival,
  caoFate: renderCaoFate,
  bloodDemand: renderBloodDemand,
  danObservation: renderDanObservation,
  caoExamFire: renderCaoExamFire,
  caoExamIngredients: renderCaoExamIngredients,
  caoExamMotive: renderCaoExamMotive,
  qingQingReward: renderQingQingReward,
  qingQingStudy: renderQingQingStudy,
  fiveAnimalReward: renderFiveAnimalReward,
  shenDaily: renderShenDaily,
  fiveAnimalChoice: renderFiveAnimalChoice,
  shenMeeting: renderShenMeeting,
  shenFuChoice: renderShenFuChoice,
  shenPharmacy: renderShenPharmacy,
  shenErrand: renderShenErrand,
  fishingPrep: renderFishingPrep,
  riverFishing: renderRiverFishing,
  riverCatch: renderRiverCatch,
  wangEncounter: renderWangEncounter,
  treasureFish: renderTreasureFish,
  treasureShare: renderTreasureShare,
  wangTeaching: renderWangTeaching,
  caoReturn: renderCaoReturn,
  caoGuidance: renderCaoGuidance,
  alchemyLesson: renderAlchemyLesson,
  firstAlchemy: renderFirstAlchemy,
  alchemyFailure: renderAlchemyFailure,
  shenDeath: renderShenDeath,
  shenChapterEnding: renderShenChapterEnding,
  thirdLadySummons: renderThirdLadySummons,
  thirdLadyDiagnosis: renderThirdLadyDiagnosis,
  purpleDragonFormula: renderPurpleDragonFormula,
  purpleDragonAlchemy: renderPurpleDragonAlchemy,
  thirdLadyTreatment: renderThirdLadyTreatment,
  needleInheritance: renderNeedleInheritance,
  p0Death: renderP0Death,
  firstNeedleAmbush: renderFirstNeedleAmbush,
  firstKillAftermath: renderFirstKillAftermath,
  apprenticeshipOffer: renderApprenticeshipOffer,
  stakeChoice: renderStakeChoice,
  stakeTraining: renderStakeTraining,
  bodyBreakthrough: renderBodyBreakthrough,
  midAutumnWarning: renderMidAutumnWarning,
  midAutumnDeparture: renderMidAutumnDeparture,
  templeOfferingSource: renderTempleOfferingSource,
  monkeyTest: renderMonkeyTest,
  monkeyConflict: renderMonkeyConflict,
  monkeyWineChoice: renderMonkeyWineChoice,
  apeWaterCave: renderApeWaterCave,
  p0Missed: renderP0Missed,
  p0JourneyEnd: renderP0JourneyEnd,
};

function screenMode() {
  if (["gameDeath", "shenDeath", "p0Death"].includes(state.screen)) return "death";
  if (["encounterReward", "mindArt", "roadResult", "ending", "quietDeparture", "qingQingReward", "fiveAnimalReward", "shenPharmacy", "alchemyFailure", "shenChapterEnding", "needleInheritance", "firstKillAftermath", "midAutumnWarning", "p0Missed", "p0JourneyEnd"].includes(state.screen)) return "settlement";
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

function handleShenDeath(reason, node) {
  if (state.lives <= 1) return;
  state.lives -= 1;
  state.shenDeathReason = reason;
  state.shenDeathNode = node;
  state.lastDeathChoice = reason;
  track("shen_death", { node, lives: state.lives });
  moveTo("shenDeath");
}

function moveP0(screen, node, previousStatus = "complete", currentStatus = "active") {
  const previous = state.p0.node;
  if (previous && previous !== node) state.p0.eventStates[previous] = { status: previousStatus };
  state.p0.eventStates[node] = { status: currentStatus };
  state.p0.node = node;
  state.p0.resumeScreen = screen;
  moveTo(screen);
}

function handleP0Death(reason, memory, node) {
  if (state.lives <= 1) return;
  state.lives -= 1;
  state.p0.deathReason = reason;
  state.p0.deathNode = node;
  state.p0.deathMemory = [...state.p0.deathMemory, memory];
  state.lastDeathChoice = reason;
  track("p0_death", { node, lives: state.lives });
  moveTo("p0Death");
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
    if (state.screen !== "ending") return;
    if (!["shen", "offering", "linan"].includes(value)) return;
    state.nextRoute = value;
    track("next_route", { route: value });
    refresh();
  },
  /* Removed pre-source-verification handlers. The original-event flow below is authoritative.
  "start-shen-chapter": () => {
    if (state.screen !== "ending" || state.nextRoute !== "shen" || !state.completedTempleTasks.includes("shen_promise")) return;
    state.shenChapterStarted = true;
    track("shen_chapter_started");
    moveTo("shenArrival");
  },
  "enter-shen-gate": () => {
    if (state.screen !== "shenArrival") return;
    moveTo("shenGate");
  },
  "shen-gate-choice": (value) => {
    if (state.screen !== "shenGate" || state.shenGateChoice || !["truth", "silent", "bluff"].includes(value)) return;
    const trust = { truth: 2, silent: 1, bluff: -1 }[value];
    state.shenGateChoice = value;
    state.shenTrust = trust;
    state.shenInvestigationPoints = trust >= 2 ? 3 : trust < 0 ? 1 : 2;
    track("shen_gate_choice", { choice: value, trust });
    moveTo("shenBriefing");
  },
  "accept-shen-errand": () => {
    if (state.screen !== "shenBriefing") return;
    moveTo("shenInvestigation");
  },
  "investigate-shen-clue": (value) => {
    if (state.screen !== "shenInvestigation" || state.shenInvestigationPoints <= 0 || state.shenClues.includes(value)) return;
    const clue = getShenClue(value);
    if (!clue) return;
    state.shenClues.push(value);
    state.shenInvestigationPoints -= 1;
    track("shen_clue", { clue: value, remaining: state.shenInvestigationPoints });
    refresh();
  },
  "shen-solution": (value) => {
    if (state.screen !== "shenInvestigation" || state.shenOutcome) return;
    const solution = resolveShenSolution(value, {
      clues: state.shenClues,
      hasMindArt: state.mindArt === MIND_ART.id,
      deathMemory: state.shenDeathMemory,
      lives: state.lives,
    });
    if (!solution?.available) return;
    if (value === "ignite") {
      state.lives -= 1;
      state.shenDeathMemory = true;
      state.lastDeathChoice = solution.forecast;
      track("shen_death", { lives: state.lives });
      return moveTo("shenDeath");
    }
    state.shenOutcome = value;
    state.shenStanding = solution.relation;
    state.potential += solution.potential;
    track("shen_solution", { solution: value, potential: solution.potential });
    moveTo("shenResolution");
  },
  "return-shen-death": () => {
    if (state.screen !== "shenDeath" || state.lives <= 0 || !state.shenDeathMemory) return;
    state.shenInvestigationPoints = shenBaseInvestigationPoints();
    moveTo("shenReturn");
  },
  "reenter-shen-danroom": () => {
    if (state.screen !== "shenReturn") return;
    moveTo("shenInvestigation");
  },
  "continue-shen-reward": () => {
    if (state.screen !== "shenResolution" || !state.shenOutcome) return;
    moveTo("shenReward");
  },
  "choose-shen-reward": (value) => {
    if (state.screen !== "shenReward" || state.shenReward) return;
    const reward = getShenReward(value, state.potential);
    if (!reward?.available) return;
    if (value === "five_animals") {
      state.potential -= reward.cost;
      state.martialStage = "body";
      if (!state.skills.includes(value)) state.skills.push(value);
    } else if (value === "marrow_powder") {
      state.attributes = { ...state.attributes, constitution: state.attributes.constitution + 1 };
    } else if (value === "herb_token") {
      state.potential += reward.potential;
      if (!state.inventory.includes(value)) state.inventory.push(value);
    }
    state.shenReward = value;
    track("shen_reward", { reward: value });
    moveTo("shenAftermath");
  },
  "use-shen-reward": () => {
    if (state.screen !== "shenAftermath" || !state.shenReward || state.shenRewardUsed) return;
    state.shenRewardUsed = state.shenReward;
    state.potential += 50;
    if (state.shenReward === "herb_token" && !state.inventory.includes("shen_batch_clue")) {
      state.inventory.push("shen_batch_clue");
    }
    state.shenChapterComplete = true;
    track("shen_reward_used", { reward: state.shenReward });
    moveTo("shenChapterEnding");
  },
  */
  "start-shen-chapter": () => {
    if (state.screen !== "ending" || state.nextRoute !== "shen" || !state.completedTempleTasks.includes("shen_promise") || state.roadTrial !== "dive") return;
    state.shenChapterStarted = true;
    state.shenOriginalVersion = 2;
    track("shen_original_started");
    moveTo("shenArrival");
  },
  "present-shen-token": () => {
    if (state.screen !== "shenArrival") return;
    moveTo("shenJobs");
  },
  "accept-danroom-job": () => {
    if (state.screen !== "shenJobs") return;
    state.shenJob = "danroom";
    moveTo("caoArrival");
  },
  "inspect-cao-fate": () => {
    if (state.screen !== "caoArrival") return;
    state.caoIdentitySeen = true;
    moveTo("caoFate");
  },
  "face-blood-demand": () => {
    if (state.screen !== "caoFate") return;
    moveTo("bloodDemand");
  },
  "blood-choice": (value) => {
    if (state.screen !== "bloodDemand" || state.bloodChoice) return;
    const choice = resolveBloodChoice(value, state.lives);
    if (!choice?.available) return;
    if (choice.outcome === "death") {
      return handleShenDeath(choice.forecast, "bloodDemand");
    }
    state.bloodChoice = value;
    state.bloodLoss = 1;
    state.attributes = { ...state.attributes, constitution: state.attributes.constitution - 1 };
    track("cao_blood_choice", { choice: value });
    moveTo("danObservation");
  },
  "reallocate-insight": () => {
    if (state.screen !== "danObservation") return;
    state.allocationId = "insight";
    state.attributes = allocateJadeBonus("insight");
    state.attributes.constitution -= state.bloodLoss;
    refresh();
  },
  "observation-choice": (value) => {
    if (state.screen !== "danObservation" || state.observationChoice) return;
    const result = resolveObservationChoice(value, state.attributes, state.mindArt === MIND_ART.id);
    if (!result || (value === "watch" && result.effectiveInsight < 3)) return;
    state.observationChoice = value;
    state.effectiveInsight = result.effectiveInsight;
    track("cao_observation", { choice: value, insight: result.effectiveInsight });
    if (result.outcome === "neglected") {
      state.shenOutcome = "neglected";
      state.shenChapterComplete = true;
      return moveTo("shenChapterEnding");
    }
    moveTo("caoExamFire");
  },
  "cao-answer": (value) => {
    const [questionId, answerId] = value.split(":");
    const screens = { fire: "caoExamFire", ingredients: "caoExamIngredients", motive: "caoExamMotive" };
    if (state.screen !== screens[questionId] || state.caoAnswers.includes(questionId)) return;
    const result = resolveCaoAnswer(questionId, answerId, state.effectiveInsight);
    if (!result?.available) return;
    if (result.outcome === "death") {
      const reasons = {
        fire: "你胡乱回答火候，曹青认定你在戏弄他，一掌震断心脉。",
        ingredients: "你遗漏大半药序却强作肯定，曹青不再容你开口。",
        motive: "你急于拜师，曹青认定你是沈家或北地派来的探子，银针穿眉。",
      };
      return handleShenDeath(reasons[questionId], screens[questionId]);
    }
    if (result.outcome === "neglected") {
      state.shenOutcome = "neglected";
      state.shenChapterComplete = true;
      return moveTo("shenChapterEnding");
    }
    state.caoAnswers.push(questionId);
    if (questionId === "fire") {
      state.caoFavor += 5;
      return moveTo("caoExamIngredients");
    }
    if (questionId === "ingredients") {
      state.caoFavor += 7;
      return moveTo("caoExamMotive");
    }
    state.caoFavor += 8;
    state.potential += 180;
    state.alchemyProgress = 61;
    state.shenOutcome = "tiger_escape";
    if (!state.inventory.includes(QINGQING_BOOK.id)) state.inventory.push(QINGQING_BOOK.id);
    track("cao_tiger_escape", { favor: state.caoFavor });
    moveTo("qingQingReward");
  },
  "return-shen-death": () => {
    if (state.screen !== "shenDeath" || !state.shenDeathNode || state.lives <= 0) return;
    const node = state.shenDeathNode;
    state.shenDeathNode = null;
    state.shenDeathReason = null;
    if (node === "shenDaily") restoreShenDay();
    moveTo(node);
  },
  "study-qingqing": () => {
    if (state.screen !== "qingQingReward" || state.qingQingStudied) return;
    const status = canStudyQingQing(state.attributes.insight, state.potential);
    if (!status.available) return;
    state.potential -= QINGQING_BOOK.studyCost;
    state.qingQingStudied = true;
    state.medicalLevel = 1;
    state.gatheringProgress = 66;
    track("qingqing_studied");
    moveTo("qingQingStudy");
  },
  "take-qingqing-test": () => {
    if (state.screen !== "qingQingStudy" || !state.qingQingStudied || state.fiveAnimalBook) return;
    state.caoFavor += 10;
    state.fiveAnimalBook = true;
    track("five_animal_received", { favor: state.caoFavor });
    moveTo("fiveAnimalReward");
  },
  "begin-shen-cycle": () => {
    if (state.screen !== "fiveAnimalReward" || !state.fiveAnimalBook) return;
    state.shenDay = 1;
    state.shenLocation = "danroom";
    beginShenDay();
    track("shen_cycle_started");
    moveTo("shenDaily");
  },
  "breakthrough-five-animals": () => {
    if (state.screen !== "shenDaily" || state.fiveAnimalLevel) return;
    const status = resolveFiveAnimalBreakthrough({ medicalLevel: state.medicalLevel, insight: state.attributes.insight, potential: state.potential });
    if (!status.available) return;
    state.potential -= status.cost;
    state.fiveAnimalLevel = 1;
    state.fiveAnimalProgress = 0;
    track("five_animal_breakthrough", { cost: status.cost });
    moveTo("fiveAnimalChoice");
  },
  "choose-five-aspect": (value) => {
    if (state.screen !== "fiveAnimalChoice" || state.fiveAnimalAspect) return;
    const aspect = getFiveAnimalAspect(value);
    if (!aspect) return;
    state.fiveAnimalAspect = value;
    state.shenAttributeGains += 1;
    state.attributes = { ...state.attributes, [aspect.attribute]: Number(state.attributes[aspect.attribute] || 0) + 1 };
    state.shenDayLog.push(`${aspect.name}初成：${aspect.effect}。`);
    state.shenFocus.martial += 1;
    if (!state.skills.includes(FIVE_ANIMAL_PLAY.id)) state.skills.push(FIVE_ANIMAL_PLAY.id);
    track("five_animal_aspect", { aspect: value });
    moveTo("shenDaily");
  },
  "shen-daily-action": (value) => {
    if (state.screen !== "shenDaily") return;
    const action = resolveShenDailyAction(value, { timeLeft: state.shenTimeLeft, stamina: state.shenStamina, satiety: state.shenSatiety, fiveAnimalLevel: state.fiveAnimalLevel });
    if (!action?.available || (action.dangerous && state.lives <= 1)) return;
    state.shenTimeLeft -= 1;
    state.shenStamina = action.nextStamina;
    state.shenSatiety = action.nextSatiety;
    if (action.medicalProgress) state.medicalProgress += action.medicalProgress;
    if (action.fiveAnimalProgress) state.fiveAnimalProgress += action.fiveAnimalProgress;
    if (action.alchemyProgress) state.alchemyProgress = Math.min(99, state.alchemyProgress + action.alchemyProgress);
    if (action.focus) state.shenFocus[action.focus] += 1;
    const gains = [];
    if (action.medicalProgress) gains.push(`《青青册》进度 +${action.medicalProgress}%`);
    if (action.fiveAnimalProgress) gains.push(`《五禽戏》进度 +${action.fiveAnimalProgress}%`);
    if (action.alchemyProgress) gains.push(`丹理 +${action.alchemyProgress}%`);
    if (!gains.length) gains.push(`体力 ${state.shenStamina}，饱腹 ${state.shenSatiety}`);
    state.shenDayLog.push(`${action.name}：${gains.join("，")}。`);
    track("shen_daily_action", { action: value, day: state.shenDay });
    if (action.dangerous) return handleShenDeath("失血后的身体经不起连续透支，你在丹房门外倒下，再没有醒来。", "shenDaily");
    refresh();
  },
  "breakthrough-medicine": () => {
    if (state.screen !== "shenDaily" || state.medicalLevel !== 1) return;
    const status = resolveMedicalBreakthrough(state.medicalProgress, state.potential);
    if (!status.available) return;
    state.potential -= status.cost;
    state.medicalLevel = 2;
    state.medicalProgress = 0;
    state.gatheringProgress = 133;
    state.shenFocus.medicine += 1;
    state.shenDayLog.push("《青青册》贯通二级：医术二级，采集一级三十三分。");
    track("medicine_level_two", { cost: status.cost });
    refresh();
  },
  "close-first-day": () => {
    if (state.screen !== "shenDaily" || state.shenDay !== 1 || state.shenTimeLeft > 0 || state.shenMeetingSeen) return;
    state.shenMeetingSeen = true;
    moveTo("shenMeeting");
  },
  "leave-shen-meeting": () => {
    if (state.screen !== "shenMeeting") return;
    moveTo("shenFuChoice");
  },
  "shenfu-choice": (value) => {
    if (state.screen !== "shenFuChoice" || !["report", "hide"].includes(value)) return;
    state.shenSilver = 10;
    if (value === "hide") {
      state.shenOutcome = "silver_hidden";
      state.shenChapterComplete = true;
      track("shenfu_silver", { choice: value });
      return moveTo("shenChapterEnding");
    }
    state.shenFuContact = true;
    state.caoFavor += 9;
    state.shenLocation = "pharmacy";
    state.shenDay = 2;
    beginShenDay();
    track("shenfu_silver", { choice: value, favor: state.caoFavor });
    moveTo("shenPharmacy");
  },
  "enter-pharmacy-day": () => {
    if (state.screen !== "shenPharmacy") return;
    moveTo("shenDaily");
  },
  "next-shen-day": () => {
    if (state.screen !== "shenDaily" || state.shenTimeLeft > 0) return;
    state.shenDay += 1;
    beginShenDay();
    moveTo("shenDaily");
  },
  "take-herb-errand": () => {
    if (state.screen !== "shenDaily" || state.shenLocation !== "pharmacy" || state.medicalLevel < 2) return;
    moveTo("shenErrand");
  },
  "start-fishing-prep": () => {
    if (state.screen !== "shenErrand") return;
    moveTo("fishingPrep");
  },
  "abandon-fishing": () => {
    if (state.screen !== "shenErrand") return;
    state.shenOutcome = "fishing_abandoned";
    state.shenChapterComplete = true;
    moveTo("shenChapterEnding");
  },
  "fishing-prep": (value) => {
    if (state.screen !== "fishingPrep") return;
    const preparation = resolveFishingPreparation(value, { completed: state.shenFishingPrep, hasContact: state.shenFuContact, potential: state.potential });
    if (!preparation?.available) return;
    state.shenFishingPrep.push(value);
    state.potential += Number(preparation.potential || 0);
    if (value === "fishing_skill") state.fishingLevel = 1;
    track("fishing_preparation", { preparation: value, potential: preparation.potential || 0 });
    refresh();
  },
  "enter-purple-river": () => {
    if (state.screen !== "fishingPrep" || !FISHING_PREPARATIONS.every((item) => state.shenFishingPrep.includes(item.id)) || state.mindArt !== MIND_ART.id) return;
    state.riverFishStage = 0;
    moveTo("riverFishing");
  },
  "cast-first-line": () => {
    if (state.screen !== "riverFishing" || state.riverFishStage !== 0) return;
    moveTo("riverCatch");
  },
  "river-catch-choice": (value) => {
    if (state.screen !== "riverCatch" || !["release", "keep"].includes(value)) return;
    state.releasedRiverFish = value === "release";
    moveTo("wangEncounter");
  },
  "wait-for-treasure": () => {
    if (state.screen !== "wangEncounter") return;
    state.riverFishStage = 1;
    moveTo("riverFishing");
  },
  "reallocate-fortune": () => {
    if (state.screen !== "riverFishing" || state.riverFishStage !== 1) return;
    state.attributes = reallocateShenAttributes("fortune");
    refresh();
  },
  "cast-treasure-line": () => {
    if (state.screen !== "riverFishing" || state.riverFishStage !== 1 || state.attributes.fortune < shenAttributePool()) return;
    moveTo("treasureFish");
  },
  "treasure-fish-choice": (value) => {
    if (state.screen !== "treasureFish") return;
    const choice = resolveTreasureFishChoice(value, state.lives);
    if (!choice?.available) return;
    if (choice.outcome === "death") return handleShenDeath(choice.result, "treasureFish");
    if (choice.outcome === "miss") {
      state.shenOutcome = "treasure_fish_missed";
      state.shenChapterComplete = true;
      return moveTo("shenChapterEnding");
    }
    state.treasureFishCaught = true;
    moveTo("treasureShare");
  },
  "share-treasure-fish": (value) => {
    if (state.screen !== "treasureShare" || !["share", "gift", "keep"].includes(value)) return;
    if (value === "share" || value === "keep") {
      state.potential += 500;
      state.shenAttributeGains += 1;
      state.attributes = { ...state.attributes, strength: Number(state.attributes.strength || 0) + 1 };
    }
    if (value === "share") {
      state.treasureFishShared = true;
      state.wangFavor = 60;
      state.shenFocus.martial += 2;
      track("treasure_fish_shared", { favor: 60 });
      return moveTo("wangTeaching");
    }
    if (value === "gift") {
      state.wangFavor = 70;
      track("treasure_fish_gifted", { favor: 70 });
      return moveTo("wangTeaching");
    }
    state.wangFavor = 0;
    state.shenOutcome = "treasure_fish_kept";
    track("treasure_fish_kept");
    moveTo("caoReturn");
  },
  "reallocate-strength": () => {
    if (state.screen !== "wangTeaching") return;
    state.attributes = reallocateShenAttributes("strength");
    refresh();
  },
  "learn-fishing-rod": () => {
    if (state.screen !== "wangTeaching") return;
    const status = canLearnFishingRod({ strength: state.attributes.strength, insight: state.attributes.insight, hasWaterMindArt: state.mindArt === MIND_ART.id, favor: state.wangFavor });
    if (!status.available) return;
    state.fishingRodMethod = true;
    state.fiveAnimalProgress = Math.max(state.fiveAnimalProgress, 14);
    state.shenFocus.martial += 1;
    if (!state.skills.includes("fishing_rod_method")) state.skills.push("fishing_rod_method");
    track("fishing_rod_learned");
    moveTo("caoReturn");
  },
  "cao-return-choice": (value) => {
    if (state.screen !== "caoReturn" || !["truth", "hide"].includes(value)) return;
    if (value === "hide" || !state.fishingRodMethod) {
      state.shenOutcome = "cao_distrust";
      state.shenChapterComplete = true;
      return moveTo("shenChapterEnding");
    }
    state.caoFavor += 2;
    track("cao_rod_demonstration", { favor: state.caoFavor });
    moveTo("caoGuidance");
  },
  "accept-cao-guidance": () => {
    if (state.screen !== "caoGuidance" || state.caoFavor < 40) return;
    state.fiveAnimalProgress = Math.max(30, state.fiveAnimalProgress + 16);
    state.medicalProgress = Math.max(15, state.medicalProgress + 15);
    state.shenFocus.medicine += 1;
    state.shenFocus.martial += 1;
    track("cao_guidance");
    moveTo("alchemyLesson");
  },
  "reallocate-alchemy-insight": () => {
    if (state.screen !== "alchemyLesson") return;
    state.attributes = reallocateShenAttributes("insight");
    state.effectiveAlchemyInsight = state.attributes.insight + (state.mindArt === MIND_ART.id ? 2 : 0);
    refresh();
  },
  "learn-return-spring": () => {
    if (state.screen !== "alchemyLesson") return;
    const effectiveInsight = state.attributes.insight + (state.mindArt === MIND_ART.id ? 2 : 0);
    if (state.medicalLevel < 2 || state.caoFavor < 40 || effectiveInsight < 7) return;
    state.effectiveAlchemyInsight = effectiveInsight;
    state.alchemyLevel = 1;
    state.alchemyProgress = 54;
    state.shenFocus.medicine += 2;
    if (!state.inventory.includes("return_spring_recipe")) state.inventory.push("return_spring_recipe");
    track("alchemy_learned", { effectiveInsight });
    moveTo("firstAlchemy");
  },
  "first-alchemy": (value) => {
    if (state.screen !== "firstAlchemy") return;
    const result = resolveFirstAlchemy(value, { medicalLevel: state.medicalLevel, caoFavor: state.caoFavor, effectiveInsight: state.effectiveAlchemyInsight });
    if (!result?.available) return;
    state.shenLastAlchemyChoice = value;
    if (result.outcome === "failure") {
      state.alchemyFailures += 1;
      track("alchemy_failure", { choice: value, failures: state.alchemyFailures });
      return moveTo("alchemyFailure");
    }
    state.alchemyPills = result.pills;
    state.alchemyLevel = 2;
    state.alchemyProgress = 12;
    state.caoFavor = 49;
    state.shenFocus.medicine += 2;
    state.shenTendency = state.shenFocus.medicine >= state.shenFocus.martial ? "medicine" : "martial";
    state.shenOutcome = "first_alchemy";
    state.shenChapterComplete = true;
    if (!state.inventory.includes("return_spring_pills")) state.inventory.push("return_spring_pills");
    if (!state.inventory.includes("hundred_pills_notes")) state.inventory.push("hundred_pills_notes");
    track("first_alchemy_success", { pills: result.pills, tendency: state.shenTendency });
    moveTo("shenChapterEnding");
  },
  "retry-alchemy": () => {
    if (state.screen !== "alchemyFailure") return;
    state.shenDay += 1;
    moveTo("firstAlchemy");
  },
  "start-p0-journey": () => {
    if (state.screen !== "shenChapterEnding" || state.alchemyPills !== RETURN_SPRING_BREW.successPills || state.p0.started) return;
    state.p0 = createP0State();
    state.p0.started = true;
    state.p0.items.return_spring_pill = Number(state.alchemyPills || 0);
    state.p0.eventStates.third_lady_summons = { status: "active" };
    state.p0.relationships.cao_qing.favor = state.caoFavor;
    state.p0.relationships.cao_qing.trust = Math.max(45, state.caoFavor - 4);
    track("third_lady_arc_started");
    moveP0("thirdLadySummons", "third_lady_summons");
  },
  "continue-p0-journey": () => {
    if (state.screen !== "shenChapterEnding" || !state.p0.started) return;
    moveTo(state.p0.resumeScreen || "thirdLadySummons");
  },
  "third-lady-summons": (value) => {
    if (state.screen !== "thirdLadySummons" || !["accept", "decline"].includes(value)) return;
    if (value === "decline") {
      state.p0.missedReason = "third_lady";
      track("third_lady_declined");
      return moveP0("p0Missed", "third_lady_missed", "missed");
    }
    state.p0.relationships.bai_zhiyun.trust = 10;
    state.p0.relationships.bai_zhiyun.suspicion = 5;
    track("third_lady_summons_accepted");
    moveP0("thirdLadyDiagnosis", "third_lady_diagnosis");
  },
  "diagnose-third-lady": (value) => {
    if (state.screen !== "thirdLadyDiagnosis") return;
    const result = resolveDiagnosisAction(value, state.p0, { medicalLevel: state.medicalLevel });
    if (!result?.available) return;
    state.p0 = result.state;
    track("third_lady_diagnosis", { action: value, evidence: result.evidence.id });
    refresh();
  },
  "conclude-third-lady": () => {
    if (state.screen !== "thirdLadyDiagnosis" || !getDiagnosisBoard(state.p0).canConclude) return;
    state.p0.hypotheses.third_lady = { status: "confirmed", answer: "强练残缺功法导致经脉逆行" };
    moveP0("purpleDragonFormula", "purple_dragon_formula");
  },
  "choose-ingredient-source": (value) => {
    if (state.screen !== "purpleDragonFormula") return;
    const result = resolveIngredientSource(value, state.p0, { caoFavor: state.caoFavor, silver: state.shenSilver });
    if (!result?.available) return;
    state.p0 = result.state;
    state.shenSilver -= Number(result.costSilver || 0);
    track("purple_dragon_ingredients", { source: value, silver: result.costSilver || 0 });
    moveP0("purpleDragonAlchemy", "purple_dragon_alchemy");
  },
  "brew-purple-dragon": (value) => {
    if (state.screen !== "purpleDragonAlchemy") return;
    const result = resolvePurpleDragonAlchemy(value, state.p0, { medicalLevel: state.medicalLevel, alchemyLevel: state.alchemyLevel });
    if (!result?.available) return;
    state.p0 = result.state;
    track("purple_dragon_alchemy", { choice: value, quality: result.outcome });
    moveP0("thirdLadyTreatment", "third_lady_treatment");
  },
  "treat-third-lady": (value) => {
    if (state.screen !== "thirdLadyTreatment") return;
    const result = resolveThirdLadyTreatment(value, state.p0);
    if (!result?.available) return;
    state.p0 = result.state;
    track("third_lady_treatment", { choice: value, outcome: result.outcome });
    if (["failed", "missed"].includes(result.outcome)) {
      state.p0.missedReason = "treatment";
      return moveP0("p0Missed", "third_lady_missed", result.outcome === "failed" ? "failed" : "missed");
    }
    moveP0("needleInheritance", "needle_inheritance");
  },
  "receive-spring-needles": () => {
    if (state.screen !== "needleInheritance" || state.p0.skills.spring_rain_needles) return;
    state.p0 = grantSpringRainNeedles(state.p0).state;
    if (!state.skills.includes("spring_rain_needles")) state.skills.push("spring_rain_needles");
    state.p0.battle = createFirstBattle();
    state.p0.checkpoint = null;
    state.p0.checkpoint = structuredClone(state.p0);
    track("spring_rain_needles_received");
    moveP0("firstNeedleAmbush", "first_needle_ambush");
  },
  "first-battle-action": (value) => {
    if (state.screen !== "firstNeedleAmbush") return;
    const result = resolveFirstBattleAction(value, state.p0.battle, { hasNeedles: Number(state.p0.items.spring_rain_needles || 0) > 0 });
    if (!result?.available) return;
    if (result.outcome === "death") return handleP0Death(result.cause, result.memory, "firstNeedleAmbush");
    state.p0.battle = result.battle;
    if (result.outcome === "round") {
      track("first_battle_round", { action: value, round: result.battle.round });
      return refresh();
    }
    if (result.outcome === "wounded") {
      if (!state.p0.wounds.some((wound) => wound.id === result.wound.id)) state.p0.wounds.push(result.wound);
      track("first_battle_wound", { wound: result.wound.id });
      return refresh();
    }
    state.p0.battleOutcome = result.outcome;
    state.p0.firstKill = result.outcome === "killed";
    state.p0.firstKillChoice = result.outcome;
    track("first_battle_resolved", { outcome: result.outcome });
    moveP0("firstKillAftermath", "first_kill_aftermath");
  },
  "return-p0-death": () => {
    if (state.screen !== "p0Death" || !state.p0.checkpoint || state.lives <= 0) return;
    const memories = [...state.p0.deathMemory];
    const node = state.p0.deathNode;
    state.p0 = migrateP0State(structuredClone(state.p0.checkpoint));
    state.p0.deathMemory = memories;
    state.p0.deathNode = null;
    state.p0.deathReason = null;
    if (node === "firstNeedleAmbush") state.p0.battle = createFirstBattle();
    track("p0_death_return", { node });
    moveP0(node, node === "firstNeedleAmbush" ? "first_needle_ambush" : "body_breakthrough");
  },
  "return-after-battle": () => {
    if (state.screen !== "firstKillAftermath" || !state.p0.battleOutcome) return;
    moveP0("apprenticeshipOffer", "apprenticeship_offer");
  },
  "apprenticeship-choice": (value) => {
    if (state.screen !== "apprenticeshipOffer" || !["accept", "decline"].includes(value)) return;
    if (value === "decline") {
      state.p0.missedReason = "apprenticeship";
      return moveP0("p0Missed", "apprenticeship_refused", "missed");
    }
    state.p0.apprentice = true;
    track("cao_apprenticeship", { battleOutcome: state.p0.battleOutcome });
    moveP0("stakeChoice", "stake_choice");
  },
  "choose-stake": (value) => {
    if (state.screen !== "stakeChoice") return;
    const result = chooseStake(value, state.p0);
    if (!result) return;
    state.p0 = result.state;
    if (!state.skills.includes(value)) state.skills.push(value);
    track("stake_chosen", { stake: value });
    moveP0("stakeTraining", "stake_training");
  },
  "treat-p0-wound": (value) => {
    if (state.screen !== "stakeTraining") return;
    const result = resolveWoundTreatment(value, state.p0, { medicalLevel: state.medicalLevel });
    if (!result?.available) return;
    state.p0 = result.state;
    if (result.treatment === "pill") state.alchemyPills = Math.max(0, state.alchemyPills - 1);
    track("p0_wound_treated", { method: result.treatment });
    refresh();
  },
  "train-stake": () => {
    if (state.screen !== "stakeTraining") return;
    const result = resolveStakeTraining(state.p0, { potential: state.potential });
    if (!result?.available) return;
    state.p0 = result.state;
    state.potential -= result.potentialCost;
    state.p0.checkpoint = null;
    state.p0.checkpoint = structuredClone(state.p0);
    track("stake_trained", { stake: state.p0.stakeId, cost: result.potentialCost });
    moveP0("bodyBreakthrough", "body_breakthrough");
  },
  "body-breakthrough": (value) => {
    if (state.screen !== "bodyBreakthrough") return;
    const result = resolveBodyBreakthrough(value, state.p0, { potential: state.potential });
    if (!result?.available) return;
    if (result.outcome === "death") return handleP0Death(result.cause, result.memory, "bodyBreakthrough");
    state.p0 = result.state;
    state.potential -= result.potentialCost;
    state.martialStage = "body";
    track("body_breakthrough", { stake: state.p0.stakeId, cost: result.potentialCost });
    moveP0("midAutumnWarning", "mid_autumn_warning");
  },
  "prepare-mid-autumn": () => {
    if (state.screen !== "midAutumnWarning" || state.martialStage !== "body") return;
    moveP0("midAutumnDeparture", "mid_autumn_departure");
  },
  "mid-autumn-travel": (value) => {
    if (state.screen !== "midAutumnDeparture") return;
    const result = resolveMidAutumnTravel(value, state.p0, { hasWaterMindArt: state.mindArt === MIND_ART.id });
    if (!result?.available) return;
    state.p0 = result.state;
    track("mid_autumn_travel", { route: value, outcome: result.outcome });
    if (!result.onTime) {
      state.p0.missedReason = "travel";
      return moveP0("p0Missed", "mid_autumn_missed", "expired");
    }
    moveP0("templeOfferingSource", "temple_offering_source");
  },
  "follow-offering": () => {
    if (state.screen !== "templeOfferingSource") return;
    moveP0("monkeyTest", "monkey_test");
  },
  "monkey-test": (value) => {
    if (state.screen !== "monkeyTest") return;
    const result = resolveMonkeyTest(value, state.p0, { peaches: state.peaches, silver: state.shenSilver });
    if (!result?.available) return;
    state.p0 = result.state;
    state.peaches -= result.peachCost;
    state.shenSilver -= result.silverCost;
    track("monkey_test", { choice: value, outcome: result.outcome });
    if (result.outcome === "hostile") {
      return moveP0("monkeyConflict", "monkey_conflict");
    }
    moveP0("monkeyWineChoice", "monkey_wine_choice");
  },
  "monkey-conflict": (value) => {
    if (state.screen !== "monkeyConflict") return;
    const result = resolveMonkeyConflict(value, state.p0);
    if (!result?.available) return;
    state.p0 = result.state;
    state.p0.missedReason = "monkeys";
    state.p0.missedDetail = result.outcome;
    track("monkey_conflict", { choice: value, outcome: result.outcome });
    moveP0("p0Missed", "mid_autumn_missed", "failed");
  },
  "monkey-wine": (value) => {
    if (state.screen !== "monkeyWineChoice") return;
    const result = resolveMonkeyWine(value, state.p0);
    if (!result?.available) return;
    state.p0 = result.state;
    if (result.bodyGain) {
      state.shenAttributeGains += result.bodyGain;
      state.attributes = { ...state.attributes, constitution: Number(state.attributes.constitution || 0) + result.bodyGain };
    }
    track("monkey_wine", { choice: value, outcome: result.outcome });
    moveP0("apeWaterCave", "ape_water_cave");
  },
  "ape-legacy": (value) => {
    if (state.screen !== "apeWaterCave") return;
    const result = resolveApeLegacy(value, state.p0);
    if (!result?.available) return;
    state.p0 = result.state;
    if (!state.skills.includes("ape_legacy_clue")) state.skills.push("ape_legacy_clue");
    track("ape_legacy", { choice: value, outcome: result.outcome });
    moveP0("p0JourneyEnd", "p0_journey_end");
  },
  "finish-p0-missed": () => {
    if (state.screen !== "p0Missed") return;
    state.p0.journeyClosed = true;
    moveP0("p0JourneyEnd", "p0_journey_end");
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
