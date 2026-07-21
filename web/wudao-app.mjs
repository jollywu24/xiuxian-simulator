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
} from "./wudao-core.mjs?v=20260721.1";
import { getRoutePresentation, getScenePresentation } from "./wudao-scenes.mjs?v=20260721.1";
import {
  P0_STAKES,
  createDeathRecord,
  createP0State,
  evaluateCombatAction,
  getAssailantPlotBoard,
  getBodyBreakthroughBoard,
  getDiagnosisBoard,
  getP0Item,
  getP0Skill,
  getSceneActions,
  grantSpringRainNeedles,
  migrateP0State,
  recordDeath,
  resolveApeLegacy,
  resolveBodyBreakthrough,
  resolveDiagnosisAction,
  resolveAssailantCounterAction,
  resolveAssailantTrace,
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
} from "./wudao-p0-core.mjs?v=20260721.1";
import {
  M4_EVIDENCE,
  M4_METHOD,
  canReceiveBaiInstruction,
  completeM4,
  createM4State,
  getDirtyMoneyBoard,
  getM4OutcomeBoard,
  getM4TrackingActions,
  migrateM4State,
  resolveBaiInstruction,
  resolveCaoDeparture,
  resolveDirtyMoneyChoice,
  resolveM4Outcome,
  resolveM4Tracking,
  resolveM4Training,
  resolveMoneyInquiry,
  resolveOldHouseChoice,
} from "./wudao-p1-core.mjs?v=20260721.1";
import {
  advanceCombatLabCampaign,
  createCombatLabSession,
  endCombatLabPlayerTurn,
  getCombatLabActions,
  getCombatLabBattleBoard,
  getCombatLabRecommendations,
  restartCombatLab,
  resolveCombatLabAction,
  resolveCombatLabEnemyAction,
} from "./combat-lab-core.mjs?v=20260721.1";

const STORAGE_KEY = "wudao-high-martial-v1";
const app = document.querySelector("#app");
const COMBAT_ATTRIBUTE_NAMES = { constitution: "根骨", insight: "悟性", agility: "身法", strength: "力道", fortune: "福缘" };
const COMBAT_STAGE_NAMES = { mortal: "未入门", body: "锻体", qi: "聚气", meridian: "通脉", master: "宗师" };
const COMBAT_CHECK_LABELS = { great: "大成", success: "得手", costly: "得手有损", failure: "失手" };

function freshFateSeed() {
  const fixedSeed = new URLSearchParams(window.location.search).get("seed");
  if (fixedSeed) return fixedSeed.slice(0, 120);
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  if (globalThis.crypto?.getRandomValues) {
    const values = globalThis.crypto.getRandomValues(new Uint32Array(2));
    return `${values[0].toString(16)}-${values[1].toString(16)}`;
  }
  return `dayao-${Date.now()}`;
}

function legacyFateSeed(saved) {
  return [
    "legacy",
    saved?.name || "陈司命",
    saved?.backgroundId || "mystery",
    saved?.events?.[0]?.at || 4270812,
  ].join("-");
}

function createInitialState() {
  return {
    version: 5,
    screen: "landing",
    name: "陈司命",
    backgroundId: "mystery",
    vowId: "path",
    fateSeed: freshFateSeed(),
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
    narrativeLog: [],
    p0: createP0State(),
    m4: createM4State(),
    events: [],
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || ![2, 3, 4, 5].includes(saved.version) || !saved.screen) return null;
    const migrated = { ...createInitialState(), ...saved, version: 5, p0: migrateP0State(saved.p0), m4: migrateM4State(saved.m4) };
    migrated.fateSeed = saved.fateSeed || legacyFateSeed(saved);
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

function p0SkillStageLabel(progress = {}) {
  if (progress.stage === "mastered" || Number(progress.progress || 0) >= 100) return "精通";
  if (progress.stage === "skilled" || Number(progress.progress || 0) >= 60) return "熟练";
  if (progress.stage === "learned") return "入门";
  return "只得残线";
}

function m4Context() {
  const bai = state.p0?.relationships?.bai_zhiyun || {};
  return {
    fateSeed: state.fateSeed,
    attributes: state.attributes,
    baiTrust: Number(bai.trust || 0),
    baiDebt: Number(bai.debt || 0),
    hasWaterMindArt: state.mindArt === MIND_ART.id,
    stakeId: state.p0?.stakeId || null,
    fishingRodMethod: Boolean(state.fishingRodMethod || state.p0?.skills?.fishing_rod_method),
    assailantChannelControlled: Boolean(state.p0?.evidence?.includes("assailant_channel_controlled")),
    martialStage: state.martialStage,
    hasKillingMethod: Boolean(state.p0?.skills?.spring_rain_needles && state.p0?.battleOutcome),
  };
}

function m4EvidenceName(id) {
  return M4_EVIDENCE[id]?.name || id;
}

function m4TrackingGradeLabel(grade) {
  return { great: "大成", success: "得手", costly: "得手有损", failure: "失手但局面继续" }[grade] || "尚未落定";
}

const M4_IDENTITY_LABELS = Object.freeze({
  cao_apprentice: "曹青门下药童",
  dangerous_variable: "握有旧账的危险人物",
  inner_house_witness: "受内宅约束的证人",
  unsettled_loose_end: "沈家眼中的未结旧账",
  suspected_killer: "受沈家怀疑的凶案涉身者",
});

const M4_PERMISSION_LABELS = Object.freeze({
  side_gate: "侧门通行",
  kitchen: "灶房取物",
  boat_guard: "走船护院引见",
  conditional_side_gate: "有条件的侧门通行",
  risky_goods: "危险货路",
});

function m4IdentityLabel(identity) {
  return M4_IDENTITY_LABELS[identity] || "沈家眼中的陌生人";
}

function m4KnownPersonLabel(id) {
  return { shen_fu: "沈福", chen_siming: "你", bai_zhiyun: "白栀云" }[id] || "未知知情者";
}

function p0CombatContext() {
  const knownFacts = state.p0.deathRecords.some((record) => record.id === "left_sleeve_blade") ? ["left_sleeve_blade"] : [];
  return {
    attributes: state.attributes,
    playerStage: state.martialStage,
    skills: state.p0.skills,
    wounds: state.p0.wounds,
    knownFacts,
    canRiskDeath: state.lives > 1,
    hasNeedles: Number(state.p0.items.spring_rain_needles || 0) > 0,
    battleEdge: state.p0.battleEdge,
    fateSeed: state.fateSeed,
  };
}

function createP0CombatSession(knownFacts = p0CombatContext().knownFacts) {
  return createCombatLabSession({
    ...p0CombatContext(),
    knownFacts,
    lives: state.lives,
  });
}

function isP0CombatSession(battle) {
  return Boolean(battle?.setup && battle?.turn && battle?.positions && Array.isArray(battle?.history));
}

function ensureP0CombatSession() {
  if (!isP0CombatSession(state.p0.battle)) state.p0.battle = createP0CombatSession();
  return state.p0.battle;
}

function syncP0CombatSession(session) {
  state.p0.battle = session;
  state.p0.wounds = structuredClone(session.wounds || []);
  state.p0.battleHistory = (session.history || []).map((entry) => ({
    battleId: session.battle?.id || "first_needle_ambush",
    round: entry.round,
    phase: entry.phase,
    action: entry.actionId,
    unitId: entry.unitId || null,
    intent: entry.intent,
    result: entry.outcome,
    rating: entry.rating || null,
    check: entry.check || null,
    impact: entry.impact || null,
    position: entry.position || null,
  }));
}

function wangKnownFacts() {
  return state.p0.deathRecords
    .map((record) => record.id)
    .filter((id) => ["wang_chain_blade", "poison_ticks_after_enemy_phase", "fatal_wound_deadline", "dock_poison_bolt"].includes(id));
}

function createWangCombatSession() {
  const carried = advanceCombatLabCampaign(state.p0.battle);
  const base = carried.available
    ? carried.session
    : createCombatLabSession({ encounterId: "wang_zhuo_east_lake" });
  return restartCombatLab(base, {
    fateSeed: `${state.fateSeed}:east-lake`,
    lives: state.lives,
    attributes: state.attributes,
    playerStage: state.martialStage,
    skills: state.p0.skills,
    wounds: state.p0.wounds,
    knownFacts: [...new Set([...(base.setup?.knownFacts || []), ...wangKnownFacts()])],
    relationships: { yan_jinghong: state.p0.relationships.yan_jinghong },
  });
}

function ensureWangCombatSession() {
  if (!isP0CombatSession(state.p0.wangBattle)) state.p0.wangBattle = createWangCombatSession();
  return state.p0.wangBattle;
}

function syncWangCombatSession(session) {
  state.p0.wangBattle = session;
  state.p0.wounds = structuredClone(session.wounds || []);
}

function resolveFullEnemyPhase(session) {
  let next = session;
  const texts = [];
  if (next.status === "fighting" && next.turn.phase === "player") {
    const started = endCombatLabPlayerTurn(next);
    if (!started?.available) return { available: false, session: next, texts };
    next = started.session;
  }
  for (let guard = 0; guard < 20 && next.status === "fighting" && next.turn.phase === "enemy"; guard += 1) {
    const resolved = resolveCombatLabEnemyAction(next);
    if (!resolved?.available) break;
    next = resolved.session;
    if (resolved.text) texts.push(resolved.text);
    if (resolved.completed) break;
  }
  return { available: true, session: next, texts };
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

function actionCard({ action, value = "", title, description, source = "", meta = "", detail = "", kind = "", disabled = false }) {
  const tone = disabled ? "unavailable" : kind === "special" ? "important" : kind === "danger" ? "danger" : "available";
  const status = disabled ? "条件未满足" : kind === "special" ? "重要选择" : kind === "danger" ? "高风险" : "可以尝试";
  const conditionLead = source || (disabled ? "尚有缺口" : "行动条件");
  const conditionDetail = detail || [
    source ? `关联：${source}` : "",
    meta ? `当前：${meta}` : "",
    disabled ? "此刻不能执行，但可以查看缺少的条件。" : "当前条件允许尝试；结果仍由行动本身决定。",
  ].filter(Boolean).join("；");
  return `
    <div class="choice-entry ${escapeHtml(kind)} ${disabled ? "unavailable" : ""}">
      <button type="button" class="action-card ${escapeHtml(kind)}" data-action="${escapeHtml(action)}" data-value="${escapeHtml(value)}" data-choice-title="${escapeHtml(title)}" data-choice-source="${escapeHtml(source)}" data-choice-meta="${escapeHtml(meta)}" data-choice-kind="${escapeHtml(kind)}" ${disabled ? "disabled" : ""}>
        <span>
          <span class="action-title">${escapeHtml(title)}</span>
          <span class="action-description">${escapeHtml(description)}</span>
        </span>
        <span class="action-meta">${escapeHtml(meta)}</span>
      </button>
      <details class="choice-condition ${tone}">
        <summary><span class="condition-status">${escapeHtml(status)}</span><strong>${escapeHtml(conditionLead)}</strong><i aria-hidden="true">＋</i></summary>
        <div><span>判定说明</span><p>${escapeHtml(conditionDetail)}</p>${meta ? `<small>${escapeHtml(meta)}</small>` : ""}</div>
      </details>
    </div>
  `;
}

function sceneHeader(eyebrow, title, subtitle = "") {
  return `<header class="scene-head"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1 class="scene-title">${escapeHtml(title)}</h1>${subtitle ? `<p class="scene-subtitle">${escapeHtml(subtitle)}</p>` : ""}</header>`;
}

function sceneMarkerState(value) {
  return ["available", "completed", "danger", "special", "locked", "known", "unknown", "allied"].includes(value) ? value : "known";
}

function narrativeHistoryHtml() {
  const records = Array.isArray(state.narrativeLog) ? state.narrativeLog.slice(-14) : [];
  if (!records.length) return "";
  return `
    <section class="narrative-history" aria-label="此前经过">
      <div class="narrative-history-heading"><span>此前</span><strong>已经发生</strong></div>
      ${records.map((record) => `
        <article class="narrative-entry ${record.choiceKind === "special" ? "important" : record.choiceKind === "danger" ? "danger" : ""}">
          <span class="narrative-context">${escapeHtml(record.context)}</span>
          <h2>${escapeHtml(record.title)}</h2>
          ${(record.lines || []).map((line) => line.type === "dialogue"
            ? `<p class="dialogue-line"><strong>${escapeHtml(line.speaker || "人物")}</strong>${escapeHtml(line.text)}</p>`
            : `<p class="narration-line">${escapeHtml(line.text)}</p>`).join("")}
          <p class="player-choice"><strong>你</strong><span>${escapeHtml(record.choice)}</span>${record.choiceSource ? `<small>${escapeHtml(record.choiceSource)}</small>` : ""}</p>
        </article>
      `).join("")}
    </section>
  `;
}

function sceneVisualHtml() {
  const scene = getScenePresentation(state.screen, state);
  if (!scene) return "";
  const route = getRoutePresentation(state.screen, state);
  const routeById = Object.fromEntries((route?.nodes || []).map((node) => [node.id, node]));
  const routeEdges = (route?.edges || []).map((edge) => {
    const from = routeById[edge.from];
    const to = routeById[edge.to];
    if (!from || !to) return "";
    return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"></line>`;
  }).join("");

  return `
    <section class="scene-experience" aria-label="${escapeHtml(scene.title)}">
      <div class="scene-canvas tone-${escapeHtml(scene.tone)}" data-scene-id="${escapeHtml(scene.id)}" role="img" aria-label="${escapeHtml(scene.alt)}" style="--scene-image:url('${escapeHtml(scene.image)}')">
        <div class="scene-vignette" aria-hidden="true"></div>
        ${scene.hotspots.map((hotspot) => `
          <button type="button" class="scene-hotspot ${sceneMarkerState(hotspot.state)}" data-action="inspect-scene-object" data-value="${escapeHtml(hotspot.id)}" style="--marker-x:${hotspot.x}%;--marker-y:${hotspot.y}%" aria-label="查看${escapeHtml(hotspot.label)}">
            <span class="scene-hotspot-ring" aria-hidden="true"></span><span class="scene-marker-label">${escapeHtml(hotspot.label)}</span>
          </button>
        `).join("")}
        ${scene.actors.map((actor) => `
          <button type="button" class="scene-actor ${sceneMarkerState(actor.state)} actor-${escapeHtml(actor.kind)}" data-action="inspect-scene-actor" data-value="${escapeHtml(actor.id)}" style="--marker-x:${actor.x}%;--marker-y:${actor.y}%" aria-label="查看${escapeHtml(actor.label)}">
            <span class="actor-silhouette" aria-hidden="true"></span><span class="scene-marker-label">${escapeHtml(actor.label)}</span>
          </button>
        `).join("")}
        <div class="scene-player" style="--marker-x:${scene.player.x}%;--marker-y:${scene.player.y}%" aria-label="${escapeHtml(scene.player.label)}在此"><span aria-hidden="true">命</span><b>${escapeHtml(scene.player.label)}</b></div>
      </div>
      <div class="scene-inspection" data-scene-inspection aria-live="polite"><span>眼前</span><strong>${escapeHtml(scene.title)}</strong><p>${escapeHtml(scene.summary)}</p></div>
      ${route ? `
        <details class="route-board">
          <summary><span><small>行路图</small><strong>${escapeHtml(route.title)}</strong></span><i>展开</i></summary>
          <div class="route-map" data-route-map>
            <svg class="route-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${routeEdges}</svg>
            ${route.nodes.map((node) => `
              <button type="button" class="route-node ${["current", "reached", "known", "locked"].includes(node.status) ? node.status : "known"}" data-action="inspect-route-node" data-value="${escapeHtml(node.id)}" style="--node-x:${node.x}%;--node-y:${node.y}%">
                <span aria-hidden="true"></span><b>${escapeHtml(node.label)}</b>
              </button>
            `).join("")}
          </div>
          <p class="route-caption">${escapeHtml(route.summary)}</p>
        </details>
      ` : ""}
    </section>
  `;
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
              : state.p0.assailantPlot?.outcome ? "夜袭回报已经改写"
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
            return skill ? `<div><strong>${escapeHtml(skill.name)}</strong><span>${escapeHtml(p0SkillStageLabel(progress))} · ${Number(progress.progress || 0)}%</span></div>` : "";
          }).join("")}
          ${(state.p0?.wounds || []).map((wound) => `<div><strong>${wound.bodyPart === "leg" ? "腿伤" : wound.bodyPart === "shoulder" ? "肩伤" : "肋下刀伤"}</strong><span>伤势 ${Number(wound.severity || 0)} · 尚未痊愈</span></div>`).join("")}
          ${(state.p0?.deathRecords || []).map((record) => `<div><strong>死劫 · ${escapeHtml(record.location)}</strong><span>${escapeHtml(record.cause)} · 已记住：${escapeHtml(record.insight)}</span></div>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function gameShell(content) {
  const visual = sceneVisualHtml();
  return `
    <main class="game-shell ${visual ? "world-stage-shell" : "story-stage-shell"}">
      <header class="topbar">
        <div class="brand-mini"><span class="brand-seal">武</span><span>大曜江湖</span></div>
        <div class="mode-badge">${escapeHtml(modeLabel())}</div>
        <div class="resource-row"><div class="resource"><span>命灯</span><strong>${state.lives}</strong></div><div class="resource"><span>潜能</span><strong>${state.potential}</strong></div></div>
      </header>
      <div class="game-grid">
        <section class="scene-panel ${visual ? "has-visual-scene" : "narrative-only"}">${visual}<div class="narrative-deck">${narrativeHistoryHtml()}<section class="narrative-current" data-narrative-current>${content}</section></div></section>
      </div>
      <nav class="utility-dock" aria-label="随身册">
        <details class="dock-drawer timeline-panel">
          <summary><span class="dock-glyph" aria-hidden="true">行</span><strong>行录</strong></summary>
          <div class="dock-sheet">${journalHtml()}</div>
        </details>
        <details class="dock-drawer character-panel">
          <summary><span class="dock-glyph" aria-hidden="true">命</span><strong>人物</strong></summary>
          <div class="dock-sheet">${characterPanelHtml()}</div>
        </details>
      </nav>
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
    assailantTrace: "东门长街 · 雨中回报",
    assailantCounterplan: "东水门 · 借局反制",
    assailantPlotResult: "旧局易手 · 因果已改",
    apprenticeshipOffer: "东门药铺 · 曹青问徒",
    stakeChoice: "医武同源 · 两门桩功",
    stakeTraining: "东门后院 · 一夜站桩",
    bodyBreakthrough: "未入门尽头 · 锻体第一关",
    yanJinghongArrival: "柳巷晚市 · 官面暗差",
    wangBattle: "柳巷至东湖 · 尾随截命",
    wangAftermath: "东湖夜色 · 战果已定",
    midAutumnWarning: "八月十四 · 月将圆",
    midAutumnDeparture: "八月十四 · 重返破庙",
    templeOfferingSource: "金陵东郊 · 贡品有主",
    monkeyTest: "破庙檐上 · 灵猴试客",
    monkeyConflict: "庙后林间 · 群猴围攻",
    monkeyWineChoice: "百果酒香 · 一瓢一念",
    apeWaterCave: "庙后水洞 · 神猿残势",
    p0Missed: "机缘窗闭 · 此路已失",
    p0JourneyEnd: "八月十五 · 月落东郊",
    caoDeparture: "八月十六 · 师父离城",
    shenFuOffer: "沈家侧门 · 沉木钱匣",
    dirtyMoneyChoice: "不义之财 · 去处未定",
    shenFuReckoning: "沈福再至 · 竭泽而渔",
    m4Tracking: "秦淮夜巷 · 追踪已落定",
    sevenKillHouse: "秦淮旧宅 · 七道刀痕",
    shenFuConfrontation: "月黑风高 · 旧路将断",
    m4WorldEcho: "沈家门路 · 立刻回响",
    baiReturn: "白栀云 · 夜来授武",
    m4Training: "离城之前 · 闭门试势",
    m4JourneyEnd: "独自行路 · 江湖留痕",
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

function combatCheckResultHtml(check, resultText = "") {
  if (!check) return resultText ? `<div class="battle-log"><p><strong>结果：</strong>${escapeHtml(resultText)}</p></div>` : "";
  const modifier = Number(check.modifier || 0);
  const signedModifier = modifier >= 0 ? `+${modifier}` : `${modifier}`;
  return `
    <div class="combat-check-result ${escapeHtml(check.tier || "failure")}">
      <span>因果骰 · ${escapeHtml(check.tierLabel || COMBAT_CHECK_LABELS[check.tier] || "落定")}</span>
      <strong><b>${Number(check.roll || 0)}</b><i>${escapeHtml(signedModifier)}</i><em>${Number(check.total || 0)}</em></strong>
      <p>骰面 ${Number(check.roll || 0)}，行动修正 ${escapeHtml(signedModifier)}，合计 ${Number(check.total || 0)}；目标 ${Number(check.target || 0)}。${escapeHtml(resultText)}</p>
    </div>
  `;
}

function combatVitalityBarHtml(label, stage, vitality, side) {
  const current = Math.max(0, Number(vitality.current || 0));
  const maximum = Math.max(1, Number(vitality.max || 1));
  const percent = Math.max(0, Math.min(100, Math.round((current / maximum) * 100)));
  const condition = percent <= 25 ? "critical" : percent <= 50 ? "wounded" : "";
  return `
    <div class="combat-vitality-card ${escapeHtml(side)} ${condition}">
      <div><span>${escapeHtml(label)} · ${escapeHtml(stage)}</span><strong><b>${current}</b><i>/</i>${maximum}</strong></div>
      <div class="combat-vitality-track" role="meter" aria-label="${escapeHtml(`${label}气血`)}" aria-valuemin="0" aria-valuemax="${maximum}" aria-valuenow="${current}"><i style="width:${percent}%"></i></div>
    </div>
  `;
}

function renderP0Death() {
  const memory = state.p0.deathMemory.at(-1);
  const record = state.p0.deathRecords.at(-1);
  const canReturn = state.lives > 0;
  return gameShell(`
    ${sceneHeader(canReturn ? "一盏命灯碎裂" : "双灯俱灭", state.p0.deathReason || "这一条路走到了死处", canReturn ? "火光退回灯芯，疼痛却没有退。你仍记得最后一眼看见的招式、呼吸和错处。" : "最后一点灯火沉入黑暗。这一世已无路可回，但走错的路仍留在你心里。")}
    ${record?.check ? combatCheckResultHtml(record.check, record.cause) : ""}
    <div class="death-verdict"><span>${record ? escapeHtml(`${record.location} · 死劫履历`) : "带回的死中见闻"}</span><strong>${escapeHtml(memory || "强行前进并不能替代看清条件")}</strong><p>${record ? `死因：${escapeHtml(record.cause)}` : ""}剩余命灯 ${state.lives}。${canReturn ? "回到最近因果节点后，这段记忆不会消失，也会直接改变可见胜算。" : "命灯已经耗尽，这一世无法再回照。"}</p></div>
    <div class="button-row">${canReturn ? `<button class="primary-button" data-action="return-p0-death">循着残灯回到死前</button>` : `<button class="primary-button" data-action="restart">另起一世</button>`}</div>
  `);
}

function p0CombatActionHtml(entry, actionName = "first-battle-action") {
  const evaluation = entry.evaluation || {};
  const attribute = entry.attribute ? COMBAT_ATTRIBUTE_NAMES[entry.attribute] : entry.intent === "身位" ? "身位" : "局势";
  const check = evaluation.check;
  const die = check?.die ?? check?.roll;
  const detail = evaluation.available
    ? `${check ? `因果骰 ${die}，行动修正 ${check.modifier >= 0 ? `+${check.modifier}` : check.modifier}，目标 ${check.target}；` : ""}依据：${(evaluation.reasons || []).join("；")}`
    : evaluation.reason;
  return actionCard({
    action: actionName,
    value: entry.id,
    title: entry.title,
    description: `${entry.description} 兑现：${entry.successPreview}；风险：${entry.riskPreview}。${entry.enemyPhasePreview || entry.impactPreview?.enemyPhase || "敌方将按预告行动"}。`,
    source: `${entry.intent} · ${entry.objectName || "战场"} · 气机 ${Number(entry.energyCost || 0)}`,
    meta: evaluation.available ? `${evaluation.ratingLabel} · ${attribute}` : "不可用",
    detail,
    kind: ["fatal", "dangerous"].includes(evaluation.rating) ? "danger" : entry.skillId || evaluation.rating === "safe" ? "special" : "",
    disabled: !evaluation.available,
  });
}

function p0CombatPositionMapHtml(board) {
  return `
    <div class="p0-combat-map" style="--p0-combat-image:url('${escapeHtml(board.meta.sceneImage || "./assets/combat/jinling-rain-ambush.webp")}')" aria-label="${escapeHtml(board.meta.mapLabel || "战场身位图")}">
      ${board.nodes.map((node) => {
        const playerHere = board.positions.player === node.id;
        const enemies = board.units.filter((unit) => board.positions[unit.id] === node.id);
        return `<div class="p0-combat-node ${escapeHtml(node.type || "ground")} ${playerHere ? "player-here" : ""}" style="left:${Number(node.x)}%;top:${Number(node.y)}%">
          <strong>${escapeHtml(node.shortName || node.name)}</strong>
          <span>${playerHere ? "你" : ""}${playerHere && enemies.length ? " · " : ""}${enemies.map((unit) => escapeHtml(unit.name)).join(" · ")}</span>
        </div>`;
      }).join("")}
    </div>
  `;
}

function renderFirstNeedleAmbush() {
  const session = ensureP0CombatSession();
  const board = getCombatLabBattleBoard(session);
  const actions = getCombatLabActions(session);
  const recommended = getCombatLabRecommendations(session);
  const recommendedIds = new Set(recommended.map((entry) => entry.id));
  const moreActions = actions.filter((entry) => !recommendedIds.has(entry.id));
  const technique = getP0Skill(state.p0.activeMartial?.technique);
  const turn = board.turn;
  const energy = Array.from({ length: turn.maxEnergy }, (_, index) => `<i class="${index < turn.energy ? "ready" : "spent"}"></i>`).join("");
  const lastEntry = session.history.at(-1);
  const currentEnemyAction = turn.phase === "enemy" ? turn.enemyQueue[turn.enemyCursor] : null;
  const currentEnemy = currentEnemyAction ? board.units.find((unit) => unit.id === currentEnemyAction.unitId) : null;
  const environment = board.environment.map((entry) => `<li class="${escapeHtml(entry.state)}">${escapeHtml(entry.name)} · ${escapeHtml({ lit: "仍亮", out: "已灭", cover: "可遮挡", escape: "可脱身", blocked: "已封锁" }[entry.state] || entry.state)}</li>`).join("");
  const knownSleeve = board.knownFacts.includes("left_sleeve_blade") || board.conditions.observedFeint;
  const primaryEnemy = board.units.find((unit) => unit.primary) || board.units[0];
  return gameShell(`
    ${sceneHeader("东门长街 · 夜雨", "蒙面刀客不是独自来杀你", "刀客从檐影逼近，弩手伏在屋脊，巷尾还有一人封路。你能先连走三步；收势之后，他们会照预告逐个出手。")}
    <div class="battle-layout p0-combat-layout">
      <div class="combat-objective"><span>战斗目的</span><strong>${escapeHtml(board.objective || "活过伏击，并决定留下活口、取命或脱身。")}</strong></div>
      <div class="p0-turn-strip ${escapeHtml(turn.phase)}">
        <div><span>第 ${Number(turn.round)} 轮</span><strong>${turn.phase === "player" ? "你的回合" : "敌方回合"}</strong></div>
        <div class="p0-energy" role="meter" aria-label="本轮气机" aria-valuemin="0" aria-valuemax="${Number(turn.maxEnergy)}" aria-valuenow="${Number(turn.energy)}"><span>气机 ${Number(turn.energy)} / ${Number(turn.maxEnergy)}</span><b>${energy}</b></div>
        <div><span>当前运用</span><strong>${escapeHtml(technique?.name || "徒手")}</strong></div>
      </div>
      <div class="combat-vitality-grid">
        ${combatVitalityBarHtml(state.name || "陈司命", COMBAT_STAGE_NAMES[state.martialStage] || state.martialStage, board.vitality.player, "player")}
        ${combatVitalityBarHtml("蒙面刀客", COMBAT_STAGE_NAMES[primaryEnemy?.stageId] || primaryEnemy?.stageId, board.vitality.enemy, "enemy")}
      </div>
      <div class="p0-enemy-intents ${knownSleeve ? "known" : "uncertain"}">
        ${board.units.map((unit) => `<div class="p0-enemy-card ${unit.acting ? "acting" : ""} ${unit.acted ? "acted" : ""}">
          <span>${Number(unit.intentOrder || 0) ? `次序 ${Number(unit.intentOrder)}` : "暂不出手"} · ${escapeHtml(unit.role)}</span>
          <strong>${escapeHtml(unit.name)} · ${escapeHtml(unit.intent)}</strong>
          <p>${escapeHtml(unit.intentDetail || "正在等待战机")}</p>
          <small>${escapeHtml(unit.nodeName)} · ${escapeHtml(unit.distance)}</small>
        </div>`).join("")}
      </div>
      <div class="p0-spatial-board">
        ${p0CombatPositionMapHtml(board)}
        <div class="combat-state-board">
          <div><span>当前身位</span><strong>${escapeHtml(board.playerNode?.name || "雨巷入口")}</strong></div>
          <div><span>场景可用</span><ul>${environment}</ul></div>
        </div>
      </div>
      ${lastEntry?.check ? combatCheckResultHtml(lastEntry.check, lastEntry.text) : lastEntry?.text ? `<div class="battle-log"><p><strong>${lastEntry.phase === "enemy" ? "敌方落招：" : "刚才："}</strong>${escapeHtml(lastEntry.text)}</p></div>` : ""}
    </div>
    ${state.p0.wounds.length ? `<div class="death-verdict"><span>带伤应战</span><strong>${state.p0.wounds.length} 处伤势仍在</strong><p>伤处会改变相关身法、力道与后续站桩突破。</p></div>` : ""}
    ${turn.phase === "player" ? `
      <div class="p0-action-heading"><span>眼下可取 · 至多连走三步</span><strong>先看敌招，再组合身位、环境与武学</strong></div>
      <div class="action-list">${recommended.map((entry) => p0CombatActionHtml(entry)).join("")}</div>
      ${moreActions.length ? `<details class="p0-more-actions"><summary>展开其余 ${moreActions.length} 条招路</summary><div class="action-list">${moreActions.map((entry) => p0CombatActionHtml(entry)).join("")}</div></details>` : ""}
      <div class="button-row"><button class="primary-button ${turn.energy === 0 ? "danger-button" : ""}" data-action="end-first-battle-turn">${turn.energy === 0 ? "气机已尽，迎接敌方行动" : `收势，保留 ${Number(turn.energy)} 点未用气机`}</button></div>
    ` : `
      <div class="p0-enemy-resolution">
        <span>敌方行动 · ${Number(turn.enemyCursor) + 1} / ${Number(turn.enemyQueue.length)}</span>
        <strong>${escapeHtml(currentEnemy?.name || "伏兵")}将使出「${escapeHtml(currentEnemyAction?.label || "收拢阵势")}」</strong>
        <p>${escapeHtml(currentEnemyAction?.detail || "这一轮敌招即将落定。")}</p>
        <button class="primary-button danger-button" data-action="resolve-first-battle-enemy">看清这一招落下</button>
      </div>
    `}
  `);
}

function renderFirstKillAftermath() {
  const outcomes = {
    killed: ["刀客仰面倒进雨水", "你没有收回最后一针。第一条人命已经落在自己手上。"],
    subdued: ["刀客四肢僵住，仍能开口", "活口可能交代来路，也会让幕后之人知道你会留手。"],
    escaped: ["身后的刀声渐远", "你保住性命，却不知道是谁要杀药铺里的人。"],
  };
  const [title, subtitle] = outcomes[state.p0.battleOutcome] || ["雨夜已经过去", "你带着针匣回到药铺。"];
  const grade = COMBAT_CHECK_LABELS[state.p0.battleOutcomeGrade] || "战局已决";
  const edgeText = {
    intact_captive: "毒囊尚未咬破，活口与口供都保持完整",
    intact_token: "左袖夹层没有受损，凭证更容易辨认",
    unseen_exit: "刀客没有看清你的退路，追踪时仍有先手",
    bloodied_finish: "目标虽成，伤口会继续影响之后的行动",
  }[state.p0.battleEdge] || "这一战的代价已经写进伤势与后续痕迹";
  return gameShell(`
    ${sceneHeader("长街夜战 · 已决", title, subtitle)}
    <div class="encounter-ledger"><div><span>你的选择</span><strong>${state.p0.battleOutcome === "killed" ? "杀死" : state.p0.battleOutcome === "subdued" ? "制伏" : "脱身"}</strong><p>活口、死尸和逃路各会留下不同痕迹；曹青与幕后之人都会据此重新看你。</p></div><div><span>判定结果</span><strong>${escapeHtml(grade)}</strong><p>${escapeHtml(edgeText)}</p></div><div><span>春风化雨针</span><strong>已经实战</strong><p>从医针变成了真正能决定生死的手段。</p></div></div>
    <div class="action-list">${actionCard({ action: "read-night-trace", title: "先处理长街上留下的人与痕迹", description: "刀客不是来逞凶，他必须在丑时前向某个人回报成败。活口、尸身与脚印各有不同入口。", source: "夜袭未完", meta: "追查回报渠道", kind: "special" })}</div>
  `);
}

function assailantBoardHtml() {
  const board = getAssailantPlotBoard(state.p0);
  return `<div class="quest-grid compact-board">${board.checks.map((check) => `<article class="quest-card ${check.met ? "completed" : "locked"}"><span>${check.met ? "已经看破" : "尚未看破"}</span><h2>${escapeHtml(check.label)}</h2><div class="quest-state">${check.met ? "已掌握" : "缺少条件"}</div></article>`).join("")}</div>`;
}

function renderAssailantTrace() {
  const actions = getSceneActions("assailant_trace", { battleOutcome: state.p0.battleOutcome });
  const openings = {
    subdued: ["活口的目光总往左袖夹层飘", "他可以撒谎，但藏不住自己最怕你拿到什么。"],
    killed: ["雨水从尸身左袖冲出一线黑灰", "口供已经没有了，物件留下的次序却仍能说话。"],
    escaped: ["檐下水痕每隔七步断一次", "刀客在绕路确认无人跟踪；只追刀光会被发现，追雨痕还有机会。"],
  };
  const [title, subtitle] = openings[state.p0.battleOutcome] || ["夜雨正在洗掉痕迹", "若不立刻决定，这条线会在天亮前消失。"];
  return gameShell(`
    ${sceneHeader("东门长街 · 丑时将近", title, subtitle)}
    ${assailantBoardHtml()}
    <div class="action-list">
      ${actions.map((entry) => {
        const evaluation = evaluateCombatAction(entry, null, { ...p0CombatContext(), enemyStage: null });
        const attribute = entry.attribute ? COMBAT_ATTRIBUTE_NAMES[entry.attribute] : "不冒险";
        return actionCard({ action: "assailant-trace", value: entry.id, title: entry.title, description: `${entry.description} 得手：${entry.successPreview}；风险：${entry.riskPreview}。`, source: `${entry.verb} · ${entry.objectName}`, meta: `${evaluation.ratingLabel} · ${attribute}`, detail: evaluation.reasons.join("；"), kind: entry.id === "leave_trace" ? "" : "special" });
      }).join("")}
    </div>
  `);
}

function renderAssailantCounterplan() {
  const board = getAssailantPlotBoard(state.p0);
  const actions = getSceneActions("assailant_counterplan", { plotReady: board.ready });
  return gameShell(`
    ${sceneHeader("东水门 · 丑时前", "刀客不是最后一环，你已经握住他的回报方式", "鱼鳞铜签、暗语和交接时辰原本都属于幕后者。现在你可以只求自保，也可以让这条旧路替你送出一条新消息。")}
    ${assailantBoardHtml()}
    <div class="battle-intent known"><span>眼前命途</span><strong>${board.ready ? "四项条件已经齐备，可以反用这套灭口回报" : "条件仍有缺口，只能先护人或截断渠道"}</strong><p>伪报会接管敌人的判断；改写刻痕会把接头者引到指定地点；告知白栀云则优先保人。</p></div>
    <div class="action-list">
      ${actions.map((entry) => {
        const evaluation = evaluateCombatAction(entry, null, { ...p0CombatContext(), enemyStage: null });
        const attribute = entry.attribute ? COMBAT_ATTRIBUTE_NAMES[entry.attribute] : "不较量";
        return actionCard({ action: "assailant-counterplan", value: entry.id, title: entry.title, description: `${entry.description} 得手：${entry.successPreview}；风险：${entry.riskPreview}。`, source: `${entry.intent} · ${entry.objectName}`, meta: `${evaluation.ratingLabel} · ${attribute}`, detail: evaluation.reasons.join("；"), kind: entry.id === "send_false_report" || entry.id === "reverse_meeting" ? "special" : "" });
      }).join("")}
    </div>
  `);
}

function renderAssailantPlotResult() {
  const outcomes = {
    false_report: ["假消息已经沿旧路送出", "幕后者会以为针匣与持针人都已沉进雨夜。下一次动手前，他仍会使用这条回报渠道。", "回报渠道易手"],
    false_report_exposed: ["暗语对了，语气却露出破绽", "接头者没有现身。敌人已经知道刀客失手，之后会避开原有渠道。", "敌人提高戒备"],
    reverse_meeting: ["交接刻痕被改到了沈家废渡", "下一名接头者会走进你指定的地方。你没有抓住他，却已经能安排下一次相见。", "设下反向会面"],
    meeting_mark_exposed: ["新刻痕没能骗过接头者", "桥洞下只留下一道刮痕。敌人知道有人动过铜签，却不知道你是谁。", "旧渠道作废"],
    bai_guarded: ["白栀云收下铜签，立刻换了三处守夜", "你没有利用敌人的耳目，却让被盯上的人活过了最危险的一夜。", "优先护住白栀云"],
    channel_destroyed: ["铜签被磨成一块无字废铜", "敌人无法确认刀客成败，你也失去了顺藤摸瓜的入口。", "斩断回报渠道"],
    abandoned: ["你收住脚步，让夜雨洗去最后一段痕迹", "没有人发现你继续追查，刀客背后的回报渠道也在丑时之后合拢。", "保全自身，放弃追查"],
    spotted: ["檐下水痕突然折返", "刀客发现身后有人，带着铜签消失在东水门外。旧渠道今夜不会再出现。", "追踪被反身察觉"],
    clue_lost: ["活口与尸身都没能再开口", "关键痕迹在迟疑中消失。你保住夜战结果，却没能摸到幕后人的回报方式。", "回报线索断绝"],
  };
  const [title, subtitle, result] = outcomes[state.p0.assailantPlot?.outcome] || ["雨夜没有留下答案", "有些机会只在一个时辰里存在。", "回报窗口关闭"];
  return gameShell(`
    ${sceneHeader("丑时 · 东水门", title, subtitle)}
    <div class="encounter-ledger"><div><span>夜袭处置</span><strong>${escapeHtml(result)}</strong><p>从今夜起，敌人会按这份结果判断你，也会因此改变下一次来路。</p></div><div><span>当前关系</span><strong>${escapeHtml(p0RelationLabel("bai_zhiyun"))}</strong><p>护人、设局与藏锋留下的不是同一种人情。</p></div></div>
    <div class="action-list">${actionCard({ action: "finish-assailant-plot", title: "带着今夜的结果回东门药铺", description: "曹青还亮着灯。他会问你用了哪一针、追到了哪一步，又为何在丑时前停手。", source: "回去见师", meta: "决定师徒路", kind: "special" })}</div>
  `);
}

function renderApprenticeshipOffer() {
  const plotOutcomes = {
    false_report: "你不仅活下来，还让敌人的回报渠道暂时为你所用。",
    reverse_meeting: "你把下一次见面的地点改到了自己选定的渡口。",
    bai_guarded: "你先护住白栀云，让沈家连夜换了守备。",
    channel_destroyed: "你截断回报，没有让任何人知道刀客成败。",
    abandoned: "你没有追查回报渠道，只把夜战本身带了回来。",
    spotted: "追踪被反身察觉，旧回报渠道已经废弃。",
  };
  return gameShell(`
    ${sceneHeader("东门药铺 · 黎明", "曹青听完夜战，只问你愿不愿真正入他的门", `${plotOutcomes[state.p0.assailantPlot?.outcome] || "你已经用春风针决定过一次生死。"} 五禽戏只能健体，打鱼杆法也只是渔人手艺。若想跨进锻体，他愿传一门桩功；从此你也要替他担一部分仇怨。`)}
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

function renderYanJinghongArrival() {
  return gameShell(`
    ${sceneHeader("八月十四 · 柳巷晚市", "燕惊鸿把一枚蛇纹铜牌按在药包下面", "她替金陵巡检房查一条失踪药船，认出你从雨巷刀客身上留下的痕迹。她没有请你杀人，只请你陪她把证物送过临河门洞。说话间，橱窗倒影里始终有一道人影隔着两处摊位跟随。")}
    <div class="encounter-ledger"><div><span>眼前之人</span><strong>燕惊鸿 · 巡检房暗差</strong><p>她掌握官面的失踪药船卷宗，需要一个认得江湖回报暗线的人。</p></div><div><span>眼下目的</span><strong>确认尾随者，让她先带证物离开</strong><p>这还是尾随，不是擂台；过早拔针只会惊动晚市百姓。</p></div><div><span>你的新境界</span><strong>锻体一重</strong><p>桩功、鱼跃龙门诀和雨夜留下的伤都会在这条巷子里兑现。</p></div></div>
    <div class="action-list">${actionCard({ action: "enter-wang-encounter", title: "接过药包，不回头走进柳巷", description: "先从倒影、摊棚和人流确认来者，再决定要不要把这一场尾随带到东湖。", source: "柳巷尾随", meta: "两幕遭遇", kind: "special" })}</div>
  `);
}

function renderWangBattle() {
  const session = ensureWangCombatSession();
  const board = getCombatLabBattleBoard(session);
  const actions = getCombatLabActions(session);
  const recommended = getCombatLabRecommendations(session);
  const recommendedIds = new Set(recommended.map((entry) => entry.id));
  const moreActions = actions.filter((entry) => !recommendedIds.has(entry.id));
  const pursuit = board.meta.presentation === "pursuit";
  const primaryEnemy = board.units.find((unit) => unit.primary) || board.units[0];
  const energy = Array.from({ length: board.turn.maxEnergy }, (_, index) => `<i class="${index < board.turn.energy ? "ready" : "spent"}"></i>`).join("");
  const lastEntry = session.history.at(-1);
  const identityProgress = Math.min(Number(board.pursuit?.identityProgress || 0), Number(board.pursuit?.identityGoal || 2));
  return gameShell(`
    ${sceneHeader(board.meta.location, pursuit ? "先看清尾随者，再让燕惊鸿脱开视线" : "王卓在东湖岸边抖开锁链刀", pursuit ? "这不是一场比谁先清空气血的搏杀。身份线索与同伴去向齐备之前，任何强攻都会把晚市变成他的掩护。" : "聚气境压住河岸，柳根后还有毒刃包抄。你要决定留下活口、当场取命、放线追踪，还是先护人撤走。")}
    <div class="battle-layout p0-combat-layout">
      <div class="combat-objective"><span>${pursuit ? "尾随目的" : "战斗目的"}</span><strong>${escapeHtml(board.objective)}</strong></div>
      <div class="p0-turn-strip ${escapeHtml(board.turn.phase)}"><div><span>第 ${Number(board.turn.round)} 轮</span><strong>${board.turn.phase === "player" ? "你的回合" : "敌招连落"}</strong></div><div class="p0-energy" role="meter" aria-label="本轮气机" aria-valuemin="0" aria-valuemax="${Number(board.turn.maxEnergy)}" aria-valuenow="${Number(board.turn.energy)}"><span>气机 ${Number(board.turn.energy)} / ${Number(board.turn.maxEnergy)}</span><b>${energy}</b></div><div><span>当前身位</span><strong>${escapeHtml(board.playerNode?.shortName || "柳巷")}</strong></div></div>
      <div class="combat-vitality-grid ${pursuit ? "pursuit-vitality" : ""}">
        ${combatVitalityBarHtml(state.name || "陈司命", COMBAT_STAGE_NAMES[state.martialStage] || state.martialStage, board.vitality.player, "player")}
        ${pursuit ? `<div class="p0-pursuit-board"><div><span>身份线索</span><strong>${identityProgress} / ${Number(board.pursuit?.identityGoal || 2)}</strong></div><div><span>燕惊鸿</span><strong>${board.pursuit?.allySafe ? "已脱身" : "仍在视线"}</strong></div><div><span>对方警觉</span><strong>${Number(board.pursuit?.alert || 0)}</strong></div></div>` : combatVitalityBarHtml(primaryEnemy?.name || "王卓", COMBAT_STAGE_NAMES[primaryEnemy?.stageId] || primaryEnemy?.stageId, board.vitality.enemy, "enemy")}
      </div>
      <div class="p0-enemy-intents ${board.knownFacts.includes("wang_chain_blade") ? "known" : "uncertain"}">${board.units.filter((unit) => unit.active && !unit.defeated).map((unit) => `<div class="p0-enemy-card"><span>${pursuit ? "尾随动向" : `次序 ${Number(unit.intentOrder || 0)}`} · ${escapeHtml(unit.role)}</span><strong>${escapeHtml(unit.name)} · ${escapeHtml(unit.intent)}</strong><p>${escapeHtml(unit.intentDetail || "正在等待战机")}</p><small>${escapeHtml(unit.nodeName)} · ${escapeHtml(unit.distance)}</small></div>`).join("")}</div>
      <div class="p0-spatial-board">${p0CombatPositionMapHtml(board)}<div class="combat-state-board"><div><span>同行之人</span><strong>燕惊鸿 · ${board.conditions.allySafe ? "已经安全" : board.conditions.allyGuard ? "已有掩护" : "仍受威胁"}</strong></div><div><span>当前代价</span><strong>${state.p0.wounds.length ? `${state.p0.wounds.length} 处伤势` : "尚未受伤"}</strong></div></div></div>
      ${lastEntry?.check ? combatCheckResultHtml(lastEntry.check, lastEntry.text) : lastEntry?.text ? `<div class="battle-log"><p><strong>${lastEntry.phase === "enemy" ? "敌方落招：" : "刚才："}</strong>${escapeHtml(lastEntry.text)}</p></div>` : ""}
    </div>
    ${board.turn.phase === "player" ? `<div class="p0-action-heading"><span>${pursuit ? "眼下可取 · 不必拔针" : "眼下可取 · 先拆威胁再收束"}</span><strong>${pursuit ? "身份与同伴去向都比气血重要" : "环境、同伴和武学共用三点气机"}</strong></div><div class="action-list">${recommended.map((entry) => p0CombatActionHtml(entry, "wang-battle-action")).join("")}</div>${moreActions.length ? `<details class="p0-more-actions"><summary>展开其余 ${moreActions.length} 条路</summary><div class="action-list">${moreActions.map((entry) => p0CombatActionHtml(entry, "wang-battle-action")).join("")}</div></details>` : ""}<div class="button-row"><button class="primary-button" data-action="end-wang-battle-turn">收势，让敌方意图依次落下</button></div>` : `<div class="p0-enemy-resolution"><span>敌招正在结算</span><strong>无需逐招确认</strong><p>刀、弩、毒伤与失血会按已公开的顺序连续落定。</p><button class="primary-button danger-button" data-action="resolve-wang-enemy">继续结算</button></div>`}
  `);
}

function renderWangAftermath() {
  const result = state.p0.wangOutcome || "escaped";
  const consequences = state.p0.wangConsequences || {};
  const outcome = {
    subdued: ["王卓穴道受制，蛇纹铜牌与口供都留了下来", "生擒首领"],
    killed: ["王卓倒在东湖浅水，毒蛇帮立刻会知道首领失手", "针下取命"],
    released: ["王卓带着你故意留下的破口逃走，去向死信箱", "放线追踪"],
    protected_escape: ["燕惊鸿带着卷宗离开，你放弃了当场处置王卓", "护人撤离"],
    escaped: ["你从东湖保住性命，敌人的暗线仍在运转", "独自脱身"],
  }[result] || ["东湖这一局已经落定", "战局已决"];
  return gameShell(`
    ${sceneHeader("东湖 · 夜色将合", outcome[0], "柳巷里的判断已经变成活口、尸证、逃踪或一段保住同伴的退路。燕惊鸿把这份结果记进巡检房暗卷，也重新判断你究竟是怎样的人。")}
    <div class="encounter-ledger"><div><span>处置</span><strong>${escapeHtml(outcome[1])}</strong><p>不同结果会留下不同的官面证据与江湖警戒。</p></div><div><span>燕惊鸿</span><strong>信任 ${Number(consequences.relationships?.yan_jinghong?.trust ?? state.p0.relationships.yan_jinghong.trust)}</strong><p>${consequences.yanJinghong === "safe" ? "她与证物都已安全" : "她仍记得你在河岸上的取舍"}</p></div><div><span>余波</span><strong>证据 ${Number(consequences.evidence?.length || 0)} · 警戒 ${Number(consequences.alert || 0)}</strong><p>${Number(consequences.wounds?.length || 0)} 处伤势会带入明日赶路。</p></div></div>
    <div class="action-list">${actionCard({ action: "continue-after-wang", title: "带着东湖结果回药铺", description: "沈字铜钱正在袖中发烫；八月十五的破庙奇缘只剩最后一夜可赶。", source: "旧奇遇回响", meta: "继续赶路", kind: "special" })}</div>
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
  const plotLabels = {
    false_report: "回报渠道易手",
    false_report_exposed: "伪报被识破",
    reverse_meeting: "接头地点已改",
    meeting_mark_exposed: "刻痕被看破",
    bai_guarded: "白栀云已有防备",
    channel_destroyed: "回报渠道已断",
    abandoned: "没有继续追查",
    spotted: "追踪时被察觉",
    clue_lost: "关键痕迹已经消失",
  };
  return gameShell(`
    ${sceneHeader("八月十五 · 月落东郊", state.p0.complete ? "破庙不再只是你活过第一夜的地方" : "这一程停在了机缘门外", state.p0.complete ? "你从病榻学会用医术定因果，从雨夜学会用针决定生死，又用一门桩功赶回旧地。猴群认得你，水洞也留下了下一门武学的方向。" : "你仍保有此前所有武学与关系，但没能把这一串机缘走到水洞深处。")}
    <div class="wudao-ending-grid shen-ending-grid">
      <div><span>医道结果</span><strong>${state.p0.treatmentOutcome === "saved" ? "白栀云脱险" : state.p0.treatmentOutcome || "未成"}</strong><p>${escapeHtml(p0RelationLabel("bai_zhiyun"))}</p></div>
      <div><span>夜战结果</span><strong>${state.p0.battleOutcome === "killed" ? "第一次杀人" : state.p0.battleOutcome === "subdued" ? "留下活口" : state.p0.battleOutcome === "escaped" ? "保命脱身" : "未经历"}</strong><p>${state.p0.skills.spring_rain_needles ? "春风化雨针已经实战" : "针法未得"}</p></div>
      <div><span>夜袭后手</span><strong>${escapeHtml(plotLabels[state.p0.assailantPlot?.outcome] || "回报窗口关闭")}</strong><p>${state.p0.evidence.includes("assailant_channel_controlled") ? "敌人的旧耳目暂时会替你送话" : "后续敌人会按这一夜的结果调整行动"}</p></div>
      <div><span>武道进境</span><strong>${state.martialStage === "body" ? "锻体一重" : "未入门"}</strong><p>${escapeHtml(P0_STAKES[state.p0.stakeId]?.name || "未选桩功")}</p></div>
      <div><span>破庙新缘</span><strong>${legacy}</strong><p>灵猴情分 ${relation.favor} · 信任 ${relation.trust}</p></div>
      <div><span>死劫履历</span><strong>${state.p0.deathRecords.length} 次</strong><p>${state.p0.deathRecords.length ? escapeHtml(state.p0.deathRecords.at(-1).insight) : "尚未在这一程熄灭命灯"}</p></div>
    </div>
    <div class="next-hooks"><div><span>水洞石痕</span><strong>神猿挥棒只余半式</strong><p>若要补全，须先找到能承受山泉水压的兵器。</p></div><div><span>刀客来路</span><strong>${escapeHtml(plotLabels[state.p0.assailantPlot?.outcome] || "东门夜杀并非偶遇")}</strong><p>${state.p0.evidence.includes("assailant_channel_controlled") ? "下一次假回报可以继续误导幕后者。" : state.p0.evidence.includes("receiver_route_reversed") ? "沈家废渡会成为下一次反向会面。" : "敌人的下一步将由这一夜留下的痕迹决定。"}</p></div><div><span>沈家内宅</span><strong>练功残页另有来处</strong><p>白栀云为何强练此功，尚未说完。</p></div></div>
    <div class="button-row"><button class="primary-button" data-action="begin-m4">回东门药铺，继续这一程</button><button class="secondary-button" data-action="restart">另起一世</button></div>
  `);
}

function m4EvidenceBoardHtml() {
  const evidence = state.m4.evidence.map((id) => M4_EVIDENCE[id]).filter(Boolean);
  return `<div class="quest-grid compact-board">
    ${evidence.length ? evidence.map((entry) => `<article class="quest-card completed"><span>已经看见</span><h2>${escapeHtml(entry.name)}</h2><p>${escapeHtml(entry.description)}</p><div class="quest-state">记入行录</div></article>`).join("") : `<article class="quest-card locked"><span>来路未明</span><h2>沉木钱匣</h2><p>钱是真的，沈福的话却还没有一处能与它互相印证。</p><div class="quest-state">先查疑点</div></article>`}
  </div>`;
}

function renderCaoDeparture() {
  return gameShell(`
    ${sceneHeader("八月十六 · 东门药铺", "曹青把炉火压低，只说今夜便要离开金陵", "他不肯说去哪里，也不许你跟。往后药库、指点和师父的名字都不能再当作现成门路；临行前，他只准你从三样东西里拿走一样。")}
    <div class="encounter-ledger"><div><span>仍可依靠</span><strong>你的医术、针、杆与桩功</strong><p>已经学会的本事不会随师父离开</p></div><div><span>即将关闭</span><strong>药库 · 指点 · 师父担保</strong><p>选一项临别帮助，不能把曹青留下</p></div></div>
    <div class="action-list">
      ${actionCard({ action: "m4-cao-aid", value: "medicine_key", title: "接过一把只可用一次的药库钥匙", description: "曹青走后仍能取一次救命药，但钥匙用过就要归还沈家。", source: "临别帮助", meta: "一次取药机会", kind: "special" })}
      ${actionCard({ action: "m4-cao-aid", value: "sealed_letter", title: "收好写给白栀云的封口短札", description: "短札不替你说谎，只能让沈家内宅愿意先听完一份有物证的指控。", source: "临别帮助", meta: "内宅担保", kind: "special" })}
      ${actionCard({ action: "m4-cao-aid", value: "enemy_warning", title: "记住毒蛇帮认路的三处暗记", description: "曹青不解释旧仇，只让你见到蛇纹、反结和收货牌时先看身后。", source: "临别帮助", meta: "反跟踪优势", kind: "special" })}
    </div>
  `);
}

function renderShenFuOffer() {
  const board = getDirtyMoneyBoard(state.m4);
  const seen = new Set(state.m4.evidence);
  return gameShell(`
    ${sceneHeader("沈家侧门 · 入夜", "沈福等到曹青的车出了城，才把一只沉木钱匣推进门缝", "他说这是沈家账外积下的私银，只求你替他藏过今夜。箱角沾着河泥，铜锁新换过，内沿却留着一线烧黑的火漆。")}
    ${m4EvidenceBoardHtml()}
    <div class="action-list">
      ${actionCard({ action: "m4-inquiry", value: "inspect_seal", title: "用药针挑起箱沿烧黑的火漆", description: "针尖不会破坏暗记，可以分辨这是沈家封蜡还是帮会转运印。", source: "春风化雨针 · 悟性", meta: seen.has("snake_seal") ? "已查：蛇纹火漆" : "查钱匣来源", kind: "special", disabled: seen.has("snake_seal") })}
      ${actionCard({ action: "m4-inquiry", value: "compare_tally", title: "把缺号货签与东湖失船暗记并在一起", description: "王卓一战留下的水路见闻未必完整，却足以确认两张货签是否出自同一批。", source: "旧见闻 · 货签", meta: seen.has("missing_tally") ? "已查：编号相邻" : "查水路", disabled: seen.has("missing_tally") })}
      ${actionCard({ action: "m4-inquiry", value: "question_source", title: "请沈福把取钱地点再说一遍", description: "不揭穿，只把他说过的桥、仓与时辰重新排一遍，看哪一句先变。", source: "人物记忆 · 试话", meta: seen.has("shen_fu_lie") ? "已查：口供矛盾" : "会提高戒心", disabled: seen.has("shen_fu_lie") })}
      ${actionCard({ action: "m4-finish-inquiry", title: "不再追问，当面决定钱匣去处", description: board.canDecide ? "你已经掌握至少两处能互相印证的疑点。" : "钱若还只是钱，任何选择都只是在替沈福承担未知的账。", source: "局面已知", meta: board.canDecide ? `${board.evidence.length} 项见闻` : `还缺 ${2 - board.evidence.length} 项`, kind: "special", disabled: !board.canDecide })}
    </div>
  `);
}

function renderDirtyMoneyChoice() {
  const context = m4Context();
  const entries = [
    ["report", "把钱匣与疑点一并送进沈家内宅", "不吞钱，也不把沈福先交给外人；代价是灰色门路很快会关闭。", "上交", "证人与内宅", "special"],
    ["share", "答应与沈福分账", "先拿到一半份额，却让沈福亲眼看见你愿意和他背同一笔黑账。", "分赃", "利益同盟", "danger"],
    ["hide", "连人带钱一起藏过今夜", "钱匣归你保管，来源、知情者和追索不会因此消失。", "藏匿", "持有人变更", "danger"],
    ["trap", "把原匣留在旧处，等收货人自己来取", "不急着占有，把钱匣变成一枚会暴露上游的饵。", "设局", "需要三项疑点", "special"],
    ["refuse", "把匣子推回去，拒绝替他背账", "保持手上干净，却会让已经被你看破的沈福更加害怕。", "拒收", "门路生变", ""],
  ];
  return gameShell(`
    ${sceneHeader("侧门灯影下", "钱不会自己害人，知道钱从哪里来的人会", "你已经看见毒蛇帮水路、缺号货签或沈福前后矛盾的话。现在选择的不是拿与不拿，而是谁持有、谁知情、谁会在天亮后追索。")}
    ${m4EvidenceBoardHtml()}
    <div class="action-list">${entries.map(([id, title, description, source, meta, kind]) => {
      const preview = resolveDirtyMoneyChoice(id, state.m4, context);
      return actionCard({ action: "m4-money-choice", value: id, title, description, source, meta: preview?.available ? meta : preview?.reason || meta, detail: preview?.available ? `当前钱匣持有人：沈福；已知情：${state.m4.dirtyMoney.knownBy.map(m4KnownPersonLabel).join("、")}` : preview?.reason, kind, disabled: !preview?.available });
    }).join("")}</div>
  `);
}

function renderShenFuReckoning() {
  const reactions = {
    report: "沈福发现内宅开始查账，笑意里第一次露出真正的恐惧。他要知道你究竟交出了多少。",
    share: "分到手的银子没有让沈福收手。他认定你既肯拿一次，就会替他拿第二次。",
    hide: "沈福在你住处外转了三圈。他不是来送钱，是来确认钱和人是否都还受他掌握。",
    trap: "空匣在旧处放到二更，终于有人用三短一长的灯号试探门窗。沈福也在暗处看着。",
    refuse: "沈福把钱收回去，却不相信你会忘掉箱上的蛇纹。他必须先知道你会把话卖给谁。",
  };
  const actions = getM4TrackingActions(state.m4, m4Context());
  return gameShell(`
    ${sceneHeader("三日后 · 秦淮夜巷", "沈福又来了，这次要的不是藏一箱钱", reactions[state.m4.dirtyMoney.disposition] || "他要你替自己继续把这条钱路榨干。")}
    <div class="battle-intent known"><span>敌意已经成形</span><strong>沈福在试探你，毒蛇帮的人也在看他</strong><p>你可以追人、断踪、反查或先护住知情人。即使失手，局面也会带着警觉与残缺证据继续。</p></div>
    <div class="action-list">${actions.map((entry) => actionCard({
      action: "m4-tracking",
      value: entry.id,
      title: entry.title,
      description: entry.id === "shadow_steps" ? "不贴近，只看他在哪个转角换鞋、换灯和换称呼。" : entry.id === "water_break" ? "把自己和知情人送过支流，再沿水面反光寻找尾灯。" : entry.id === "countermark" ? "不追沈福的背影，改追收货人认路时留下的动作。" : "先护住会被灭口的人，再从没人来取的空匣倒查去路。",
      source: `${entry.intent} · ${entry.attributeName}`,
      meta: `${m4TrackingGradeLabel(entry.check.grade)} · 因果骰 ${entry.check.die}`,
      detail: `因果骰 ${entry.check.die}，行动修正 ${entry.modifier >= 0 ? `+${entry.modifier}` : entry.modifier}，合计 ${entry.check.total}；依据：${entry.reasons.join("；")}`,
      kind: entry.check.grade === "great" || entry.check.grade === "success" ? "special" : entry.check.grade === "failure" ? "danger" : "",
    })).join("")}</div>
  `);
}

function renderM4Tracking() {
  const tracking = state.m4.tracking;
  const resultText = {
    great: "你没有让任何一盏尾灯转向身后，完整看见收货人从沈福手中取走暗账与铜牌。",
    success: "你跟到秦淮旧宅，拿到夹墙暗账；收货人只来得及带走一块铜牌。",
    costly: "你翻过矮墙时撞伤肩背，却在被发现前扯下夹墙暗账。",
    failure: "沈福用一条假巷把你带偏。等你折回，只剩半页被撕裂的账纸；旧宅已经有人守着。",
  }[tracking.grade];
  return gameShell(`
    ${sceneHeader("秦淮河西 · 更鼓三响", m4TrackingGradeLabel(tracking.grade), resultText)}
    <div class="skill-gate-board"><div><span>因果骰</span><strong>${tracking.check?.die ?? "—"}</strong></div><div><span>行动修正</span><strong>${Number(tracking.check?.modifier || 0) >= 0 ? "+" : ""}${tracking.check?.modifier ?? 0}</strong></div><div><span>警觉</span><strong>${tracking.alert ? `提高 ${tracking.alert}` : "未惊动"}</strong></div><div><span>所得</span><strong>${state.m4.evidence.slice(-2).map(m4EvidenceName).join("、") || "残缺去向"}</strong></div></div>
    <div class="action-list">${actionCard({ action: "m4-tracking-continue", title: "沿账页墨痕进入秦淮旧宅", description: "无论拿到整本暗账还是半页残纸，墨迹都指向同一座旧宅；区别在于谁先知道你来了。", source: "追踪所得", meta: state.m4.locationStates.qinhuai_old_house === "watched" ? "旧宅有人守候" : "旧宅已经显形", kind: "special" })}</div>
  `);
}

function renderSevenKillHouse() {
  const canMessage = resolveOldHouseChoice("send_bai_message", state.m4, m4Context()).available;
  return gameShell(`
    ${sceneHeader("秦淮旧宅 · 夹墙之后", "暗账尽头不是银号，而是一只压着七道拓痕的旧刀匣", "刀已经不在。拓纸上的落势却与沈家内宅练功残页同出一脉。门外有脚步停了又走；你只来得及查一处、守一处，或把消息送给一个人。")}
    ${m4EvidenceBoardHtml()}
    <div class="action-list">
      ${actionCard({ action: "m4-old-house", value: "search_drawer", title: "翻开刀匣下的暗层", description: "取得七杀刀拓痕，但翻找声会让门外的人知道屋里有人。", source: "七杀旧账 · 悟性", meta: "线索 +1 · 警觉 +1", kind: "special" })}
      ${actionCard({ action: "m4-old-house", value: "watch_door", title: "不碰刀匣，先看谁来收尾", description: "放弃最深的家族线索，换取毒蛇帮收货人的活证和更低警觉。", source: "藏锋 · 活证", meta: "收货牌 · 警觉下降" })}
      ${actionCard({ action: "m4-old-house", value: "send_bai_message", title: "把拓纸位置写给白栀云", description: "让内宅的人取证，你守住门外；她是否回应取决于旧日救命关系与曹青短札。", source: "救命旧债 · 白栀云", meta: canMessage ? "内宅愿意接信" : "缺少担保", kind: "special", disabled: !canMessage })}
    </div>
  `);
}

function renderShenFuConfrontation() {
  const board = getM4OutcomeBoard(state.m4, m4Context());
  const definitions = {
    control: ["把暗账分成两份，逼沈福继续替你开门", "他活着，也仍是一条门路；代价是你们都握着能毁掉对方的东西。", "受控联系人", "special"],
    expose: ["请白栀云的人带走钱、账和沈福", "把灰色门路换成受内宅约束的新联系人；他会活成证人或囚徒。", "揭发／交人", "special"],
    release: ["给沈福一条无人守的水路", "不替他洗清，也不在今夜杀他；侧门与灶房人情从此永久断裂。", "放走", ""],
    kill: ["在帮众合围前先取沈福性命", "斩草除根会关闭全部口供和旧人情，也把尸身与怀疑留给你。", "杀死", "danger"],
  };
  return gameShell(`
    ${sceneHeader("旧宅后院 · 月黑风高", "沈福终于不再装作只是来办差", "他承认钱是私藏的，却说毒蛇帮一旦知道暗账被翻，自己和你都活不过下一次更鼓。门外脚步正在合围；现在决定的不是输赢，而是他以什么身份离开这里。")}
    <div class="condition-board">${board.options.map((option) => `<div class="condition-row ${option.available ? "met" : "unmet"}"><span>${option.available ? "可达" : "缺条件"}</span><strong>${escapeHtml(definitions[option.id][2])}</strong><p>${escapeHtml(option.reason)}</p></div>`).join("")}</div>
    <div class="action-list">${board.options.map((option) => {
      const [title, description, source, kind] = definitions[option.id];
      return actionCard({ action: "m4-outcome", value: option.id, title, description, source, meta: option.reason, detail: option.reason, kind, disabled: !option.available });
    }).join("")}</div>
  `);
}

function renderM4WorldEcho() {
  const outcomeLabels = { controlled: "受控联系人", exposed: "证人／囚徒", released: "失踪", killed: "死亡" };
  const route = state.m4.contacts.shen_fu.permissions.length ? state.m4.contacts.shen_fu.permissions.map((permission) => M4_PERMISSION_LABELS[permission] || "受限门路").join(" · ") : state.m4.contacts.replacement ? "白栀云内宅口信" : "永久断线";
  return gameShell(`
    ${sceneHeader("次日 · 沈家侧门", "旧路没有等到章末才改变", state.m4.worldEcho)}
    <div class="encounter-ledger"><div><span>沈福</span><strong>${escapeHtml(outcomeLabels[state.m4.outcome] || "去向未明")}</strong><p>他本人掌握的灶房、护院和侧门人情已经重算</p></div><div><span>沈家如何看你</span><strong>${escapeHtml(m4IdentityLabel(state.m4.shenIdentity))}</strong><p>身份会同时改变称呼、权限和风险</p></div><div><span>现在可走的门路</span><strong>${escapeHtml(route)}</strong><p>替代联系人不会继承沈福不知道的承诺</p></div></div>
    <div class="action-list">${actionCard({ action: "m4-continue-echo", title: "离开侧门，去见夜里来访的人", description: "沈福的结果已经写进地点与人物反应；白栀云还欠你病榻前的一段话。", source: "沈家门路", meta: state.m4.sevenKillClue ? "七杀刀拓痕仍在" : "七杀旧账只余半页", kind: "special" })}</div>
  `);
}

function renderBaiReturn() {
  const available = canReceiveBaiInstruction(state.m4, m4Context());
  return gameShell(`
    ${sceneHeader("旧住处 · 夜半拍门", "白栀云没有带侍女，只把七杀刀拓纸压在桌上", available ? "她记得病榻前欠下的命，也知道你已卷进沈家旧账。她不许你现在拔刀，只教三种卸力法：护经、沉胯、送力回桩。" : "她只问了七杀拓纸的来处，没有承诺替你担保。旧日关系与眼前物证还不足以让她把沈家武学交出来。")}
    <div class="encounter-ledger"><div><span>共同经历</span><strong>${state.p0.treatmentOutcome === "saved" ? "救命之恩" : "病榻旧识"}</strong><p>${escapeHtml(p0RelationLabel("bai_zhiyun"))}</p></div><div><span>眼前物证</span><strong>${state.m4.sevenKillClue ? "七杀刀拓痕" : "残缺暗账"}</strong><p>关系让她愿意承担什么，物证决定她相信什么</p></div></div>
    <div class="action-list">
      ${actionCard({ action: "m4-bai-instruction", value: "receive", title: "请她把卸力三诀拆给你看", description: "白栀云不为它另立名目，只针对七杀刀势教你护经、沉胯与送力回桩。", source: "白栀云 · 救命旧债", meta: available ? M4_METHOD.name : "关系或物证不足", kind: "special", disabled: !available })}
      ${actionCard({ action: "m4-bai-instruction", value: "decline", title: "只问七杀旧事，不受她的武学", description: "保留距离，带着已有证据离开；不会得到下一场闭门试势的特殊解法。", source: "保持距离", meta: "仍可安全离城" })}
    </div>
  `);
}

function renderM4Training() {
  const entries = [
    ["apply_to_stake", "把卸力三诀放进自己的桩功", "枯木桩会把旧伤变成气血刻度；定海桩会从三股水势中显出‘淼’字呼吸。", "白栀云授武 · 桩功", "当夜试势", "special"],
    ["seal_old_blade", "隔着刀衣听七杀旧势", "不拔刀，只用卸力三诀辨认刀势最先牵动的经脉，为日后止杀留下条件。", "七杀旧账 · 医武", "安全封刀", "special"],
    ["leave_city", "不闭关，趁追索未合先搬离旧住处", "放弃最后一次修炼，换取更低暴露和一条干净退路。", "先求生", "安全离城", ""],
  ];
  return gameShell(`
    ${sceneHeader("天亮之前 · 最后一夜", "旧住处已经不能久留", state.m4.baiInstruction ? "白栀云刚教的三诀必须立刻落进身体，否则只会变成另一段看过的文字。" : "你没有接下白栀云的三诀，只能把时间用于收拾行囊、处理证据和提前离开。")}
    <div class="action-list">${entries.map(([id, title, description, source, meta, kind]) => {
      const preview = resolveM4Training(id, state.m4, m4Context());
      return actionCard({ action: "m4-training", value: id, title, description, source, meta: preview?.available ? meta : preview?.reason || meta, detail: preview?.reason || `完成后立即写入身体、七杀见闻或退路。`, kind, disabled: !preview?.available });
    }).join("")}</div>
  `);
}

function renderM4JourneyEnd() {
  const trace = state.m4.jianghuTrace || [];
  return gameShell(`
    ${sceneHeader("离开旧住处的清晨", "曹青不在身后，你仍把这条路走完了", "你没有只躲开一笔黑账，而是决定钱落到谁手里、沈福以什么身份离开、沈家以后还肯为你开哪一扇门。")}
    <div class="panel-title">江湖留痕</div>
    <div class="narrative-timeline">${trace.map((entry, index) => `<details class="condition-details" ${index === 0 ? "open" : ""}><summary><span>${index + 1}</span><strong>${escapeHtml(entry.text)}</strong></summary><p>依据：${escapeHtml(entry.source)}</p></details>`).join("")}</div>
    <div class="next-hooks"><div><span>七杀旧账</span><strong>${state.m4.sevenKillClue ? "七道刀痕已经入册" : "仍缺完整拓痕"}</strong><p>沈家的秘密没有因沈福结局而消失。</p></div><div><span>金陵来路</span><strong>城门方向传来急锣</strong><p>下一次回城，盘查、宵禁和官面身份都会成为真正条件。</p></div><div><span>当前身份</span><strong>${escapeHtml(m4IdentityLabel(state.m4.shenIdentity))}</strong><p>沈家已经不再把你当作普通药童。</p></div></div>
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
  assailantTrace: renderAssailantTrace,
  assailantCounterplan: renderAssailantCounterplan,
  assailantPlotResult: renderAssailantPlotResult,
  apprenticeshipOffer: renderApprenticeshipOffer,
  stakeChoice: renderStakeChoice,
  stakeTraining: renderStakeTraining,
  bodyBreakthrough: renderBodyBreakthrough,
  yanJinghongArrival: renderYanJinghongArrival,
  wangBattle: renderWangBattle,
  wangAftermath: renderWangAftermath,
  midAutumnWarning: renderMidAutumnWarning,
  midAutumnDeparture: renderMidAutumnDeparture,
  templeOfferingSource: renderTempleOfferingSource,
  monkeyTest: renderMonkeyTest,
  monkeyConflict: renderMonkeyConflict,
  monkeyWineChoice: renderMonkeyWineChoice,
  apeWaterCave: renderApeWaterCave,
  p0Missed: renderP0Missed,
  p0JourneyEnd: renderP0JourneyEnd,
  caoDeparture: renderCaoDeparture,
  shenFuOffer: renderShenFuOffer,
  dirtyMoneyChoice: renderDirtyMoneyChoice,
  shenFuReckoning: renderShenFuReckoning,
  m4Tracking: renderM4Tracking,
  sevenKillHouse: renderSevenKillHouse,
  shenFuConfrontation: renderShenFuConfrontation,
  m4WorldEcho: renderM4WorldEcho,
  baiReturn: renderBaiReturn,
  m4Training: renderM4Training,
  m4JourneyEnd: renderM4JourneyEnd,
};

function screenMode() {
  if (["gameDeath", "shenDeath", "p0Death"].includes(state.screen)) return "death";
  if (["encounterReward", "mindArt", "roadResult", "ending", "quietDeparture", "qingQingReward", "fiveAnimalReward", "shenPharmacy", "alchemyFailure", "shenChapterEnding", "needleInheritance", "firstKillAftermath", "assailantPlotResult", "wangAftermath", "midAutumnWarning", "p0Missed", "p0JourneyEnd", "m4Tracking", "m4WorldEcho", "m4JourneyEnd"].includes(state.screen)) return "settlement";
  if (["landing", "worldIntro", "characterDraft", "vow", "destiny", "characterSheet"].includes(state.screen)) return "neutral";
  return "simulation";
}

function render() {
  document.body.dataset.mode = screenMode();
  const renderer = renderers[state.screen] || renderLanding;
  app.innerHTML = renderer();
  requestAnimationFrame(() => {
    const deck = app.querySelector(".world-stage-shell .narrative-deck");
    const current = deck?.querySelector("[data-narrative-current]");
    if (deck && current) deck.scrollTop = Math.max(0, current.offsetTop - 18);
  });
}

function updateSceneInspection(kind, title, detail, markerClass, value) {
  const panel = app.querySelector("[data-scene-inspection]");
  if (!panel) return;
  const kindNode = panel.querySelector("span");
  const titleNode = panel.querySelector("strong");
  const detailNode = panel.querySelector("p");
  if (kindNode) kindNode.textContent = kind;
  if (titleNode) titleNode.textContent = title;
  if (detailNode) detailNode.textContent = detail;
  app.querySelectorAll(".scene-hotspot, .scene-actor, .route-node").forEach((node) => node.classList.remove("selected"));
  const marker = [...app.querySelectorAll(`.${markerClass}`)].find((node) => node.dataset.value === value);
  marker?.classList.add("selected");
}

function recordNarrativeChoice(target) {
  const current = target.closest(".narrative-deck")?.querySelector("[data-narrative-current]");
  if (!current || !target.matches(".action-card, .inline-button")) return;
  const title = current.querySelector(".scene-title")?.textContent?.trim();
  if (!title) return;
  const actor = app.querySelector(".scene-actor .scene-marker-label")?.textContent?.trim() || "人物";
  const rawLines = [
    ...current.querySelectorAll(".scene-subtitle, .story-copy p, .battle-intent p"),
  ].map((node) => node.textContent?.trim()).filter(Boolean);
  const lines = [...new Set(rawLines)].slice(0, 3).map((text) => ({
    type: /[“”「」]/.test(text) ? "dialogue" : "narration",
    speaker: /[“”「」]/.test(text) ? actor : "",
    text: text.slice(0, 240),
  }));
  const choiceCard = target.closest(".quest-card");
  const choice = target.dataset.choiceTitle
    || choiceCard?.querySelector("h2, h3")?.textContent?.trim()
    || target.textContent?.trim()
    || "继续";
  const choiceSource = target.dataset.choiceSource
    || choiceCard?.querySelector(":scope > span")?.textContent?.trim()
    || target.dataset.choiceMeta
    || "";
  const record = {
    id: `${Date.now()}-${state.events.length}`,
    context: modeLabel(),
    title: title.slice(0, 80),
    lines,
    choice: choice.slice(0, 120),
    choiceSource: choiceSource.slice(0, 80),
    choiceKind: target.dataset.choiceKind || "",
  };
  const log = Array.isArray(state.narrativeLog) ? state.narrativeLog : [];
  state.narrativeLog = [...log, record].slice(-24);
}

function appendNarrativeOutcome(text) {
  if (!text || !Array.isArray(state.narrativeLog) || !state.narrativeLog.length) return;
  const record = state.narrativeLog.at(-1);
  const lines = Array.isArray(record.lines) ? record.lines : [];
  record.lines = [...lines, { type: "narration", speaker: "", text: String(text).slice(0, 300) }].slice(-4);
}

function combatOutcomeText(result) {
  if (!result) return "";
  const check = result.check;
  const checkText = check
    ? `因果骰掷出 ${check.roll}，加上行动修正 ${check.modifier >= 0 ? `+${check.modifier}` : check.modifier}，合计 ${check.total}，判定为${check.tierLabel || COMBAT_CHECK_LABELS[check.tier] || "落定"}。`
    : "";
  const impact = result.impact
    ? `气血变化：你失去 ${Number(result.impact.playerDamage || 0)}，刀客失去 ${Number(result.impact.enemyDamage || 0)}。`
    : "";
  return `${checkText}${impact}${result.text || result.battle?.lastResult || result.cause || ""}`;
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

function moveM4(screen, node, previousStatus = "complete", currentStatus = "active") {
  const previous = state.m4.node;
  if (previous && previous !== node) state.m4.eventStates[previous] = { status: previousStatus };
  state.m4.eventStates[node] = { status: currentStatus };
  state.m4.node = node;
  state.m4.resumeScreen = screen;
  moveTo(screen);
}

function handleP0Death(reason, memory, node, causeId = "unknown_death", check = null) {
  if (state.lives <= 0) return;
  state.lives -= 1;
  state.p0.deathReason = reason;
  state.p0.deathNode = node;
  const locations = { firstNeedleAmbush: "东门长街", bodyBreakthrough: "东门药铺后院", wangBattle: "柳巷至东湖" };
  state.p0 = recordDeath(state.p0, createDeathRecord({
    id: causeId,
    location: locations[node] || "未知死局",
    cause: reason,
    insight: memory,
    returnedTo: node === "firstNeedleAmbush" ? "刀客现身之前" : node === "wangBattle" ? "接过燕惊鸿药包之前" : "突破之前",
    round: node === "firstNeedleAmbush" ? state.p0.battle?.turn?.round || state.p0.battle?.round || null : node === "wangBattle" ? state.p0.wangBattle?.turn?.round || null : null,
    check,
  }));
  state.lastDeathChoice = reason;
  track("p0_death", { node, causeId, lives: state.lives });
  moveTo("p0Death");
}

function finishFirstNeedleBattle(session) {
  syncP0CombatSession(session);
  const result = session.result || {};
  state.p0.battleOutcome = result.outcome;
  state.p0.battleOutcomeGrade = result.check?.tier || null;
  state.p0.battleEdge = result.edge || (result.check?.tier === "costly" ? "bloodied_finish" : null);
  state.p0.firstKill = result.outcome === "killed";
  state.p0.firstKillChoice = result.outcome;
  track("first_battle_resolved", { outcome: result.outcome, rounds: session.turn.round });
  moveP0("firstKillAftermath", "first_kill_aftermath");
}

function finishWangBattle(session) {
  syncWangCombatSession(session);
  const result = session.result || {};
  state.p0.wangOutcome = result.outcome;
  state.p0.wangConsequences = structuredClone(result.consequences || {});
  if (result.consequences?.relationships?.yan_jinghong) {
    state.p0.relationships.yan_jinghong = structuredClone(result.consequences.relationships.yan_jinghong);
  }
  track("wang_battle_resolved", { outcome: result.outcome, rounds: session.turn.round });
  moveP0("wangAftermath", "wang_aftermath");
}

function settleMainCombat(session, kind) {
  if (kind === "wang") syncWangCombatSession(session);
  else syncP0CombatSession(session);
  if (session.status === "death") {
    const death = session.result || {};
    const check = [...session.history].reverse().find((entry) => entry.check)?.check || null;
    return handleP0Death(death.cause, death.memory, kind === "wang" ? "wangBattle" : "firstNeedleAmbush", death.causeId, check);
  }
  if (session.status === "finished") return kind === "wang" ? finishWangBattle(session) : finishFirstNeedleBattle(session);
  refresh();
}

const handlers = {
  "inspect-scene-object": (value) => {
    const scene = getScenePresentation(state.screen, state);
    const hotspot = scene?.hotspots.find((item) => item.id === value);
    if (!hotspot) return;
    updateSceneInspection("所见", hotspot.label, hotspot.detail, "scene-hotspot", value);
  },
  "inspect-scene-actor": (value) => {
    const scene = getScenePresentation(state.screen, state);
    const actor = scene?.actors.find((item) => item.id === value);
    if (!actor) return;
    updateSceneInspection("人物", actor.label, actor.detail, "scene-actor", value);
  },
  "inspect-route-node": (value) => {
    const route = getRoutePresentation(state.screen, state);
    const node = route?.nodes.find((item) => item.id === value);
    if (!node) return;
    updateSceneInspection("去处", node.label, node.detail, "route-node", value);
  },
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
    state.p0.activeMartial.foundation = state.mindArt || null;
    if (!state.skills.includes("spring_rain_needles")) state.skills.push("spring_rain_needles");
    state.p0.battle = createP0CombatSession();
    state.p0.checkpoint = null;
    state.p0.checkpoint = structuredClone(state.p0);
    track("spring_rain_needles_received");
    moveP0("firstNeedleAmbush", "first_needle_ambush");
  },
  "first-battle-action": (value) => {
    if (state.screen !== "firstNeedleAmbush") return;
    const session = ensureP0CombatSession();
    const result = resolveCombatLabAction(session, value);
    if (!result?.available) return;
    let next = result.session;
    appendNarrativeOutcome(combatOutcomeText(result.result));
    if (next.turn.energy === 0 && next.turn.phase === "player") {
      const enemyPhase = resolveFullEnemyPhase(next);
      next = enemyPhase.session;
      enemyPhase.texts.forEach(appendNarrativeOutcome);
    }
    track("first_battle_action", { action: value, round: next.turn.round, energy: next.turn.energy });
    settleMainCombat(next, "rain");
  },
  "end-first-battle-turn": () => {
    if (state.screen !== "firstNeedleAmbush") return;
    const result = resolveFullEnemyPhase(ensureP0CombatSession());
    if (!result?.available) return;
    result.texts.forEach(appendNarrativeOutcome);
    track("first_battle_enemy_phase", { round: result.session.turn.round });
    settleMainCombat(result.session, "rain");
  },
  "resolve-first-battle-enemy": () => {
    if (state.screen !== "firstNeedleAmbush") return;
    const result = resolveFullEnemyPhase(ensureP0CombatSession());
    if (!result?.available) return;
    result.texts.forEach(appendNarrativeOutcome);
    settleMainCombat(result.session, "rain");
  },
  "return-p0-death": () => {
    if (state.screen !== "p0Death" || !state.p0.checkpoint || state.lives <= 0) return;
    const memories = [...state.p0.deathMemory];
    const deathRecords = structuredClone(state.p0.deathRecords);
    const node = state.p0.deathNode;
    state.p0 = migrateP0State(structuredClone(state.p0.checkpoint));
    state.p0.deathMemory = memories;
    state.p0.deathRecords = deathRecords;
    state.p0.deathNode = null;
    state.p0.deathReason = null;
    if (node === "firstNeedleAmbush") {
      const knownFacts = deathRecords.some((record) => record.id === "left_sleeve_blade") ? ["left_sleeve_blade"] : [];
      state.p0.battle = createP0CombatSession(knownFacts);
    }
    if (node === "wangBattle") state.p0.wangBattle = createWangCombatSession();
    track("p0_death_return", { node });
    moveP0(node, node === "firstNeedleAmbush" ? "first_needle_ambush" : node === "wangBattle" ? "wang_battle" : "body_breakthrough");
  },
  "read-night-trace": () => {
    if (state.screen !== "firstKillAftermath" || !state.p0.battleOutcome) return;
    moveP0("assailantTrace", "assailant_trace");
  },
  "assailant-trace": (value) => {
    if (state.screen !== "assailantTrace") return;
    const result = resolveAssailantTrace(value, state.p0, p0CombatContext());
    if (!result?.available) return;
    state.p0 = result.state;
    track("assailant_trace", { action: value, outcome: result.outcome });
    if (result.continueTo === "counterplan") return moveP0("assailantCounterplan", "assailant_counterplan");
    moveP0("assailantPlotResult", "assailant_plot_result", result.outcome === "abandoned" ? "missed" : "failed");
  },
  "assailant-counterplan": (value) => {
    if (state.screen !== "assailantCounterplan") return;
    const result = resolveAssailantCounterAction(value, state.p0, p0CombatContext());
    if (!result?.available) return;
    state.p0 = result.state;
    track("assailant_counterplan", { action: value, outcome: result.outcome });
    moveP0("assailantPlotResult", "assailant_plot_result", ["false_report", "reverse_meeting"].includes(result.outcome) ? "completed" : "resolved");
  },
  "finish-assailant-plot": () => {
    if (state.screen !== "assailantPlotResult" || !state.p0.assailantPlot?.outcome) return;
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
    if (result.outcome === "death") return handleP0Death(result.cause, result.memory, "bodyBreakthrough", "forced_body_breakthrough");
    state.p0 = result.state;
    state.potential -= result.potentialCost;
    state.martialStage = "body";
    state.p0.checkpoint = null;
    state.p0.checkpoint = structuredClone(state.p0);
    track("body_breakthrough", { stake: state.p0.stakeId, cost: result.potentialCost });
    moveP0("yanJinghongArrival", "yan_jinghong_arrival");
  },
  "enter-wang-encounter": () => {
    if (state.screen !== "yanJinghongArrival") return;
    state.p0.wangBattle = createWangCombatSession();
    track("wang_battle_started", { carriedOutcome: state.p0.battleOutcome });
    moveP0("wangBattle", "wang_battle");
  },
  "wang-battle-action": (value) => {
    if (state.screen !== "wangBattle") return;
    const result = resolveCombatLabAction(ensureWangCombatSession(), value);
    if (!result?.available) return;
    let next = result.session;
    appendNarrativeOutcome(combatOutcomeText(result.result));
    if (next.turn.energy === 0 && next.turn.phase === "player") {
      const enemyPhase = resolveFullEnemyPhase(next);
      next = enemyPhase.session;
      enemyPhase.texts.forEach(appendNarrativeOutcome);
    }
    track("wang_battle_action", { action: value, stage: next.battle.stageId, round: next.turn.round });
    settleMainCombat(next, "wang");
  },
  "end-wang-battle-turn": () => {
    if (state.screen !== "wangBattle") return;
    const result = resolveFullEnemyPhase(ensureWangCombatSession());
    if (!result?.available) return;
    result.texts.forEach(appendNarrativeOutcome);
    settleMainCombat(result.session, "wang");
  },
  "resolve-wang-enemy": () => {
    if (state.screen !== "wangBattle") return;
    const result = resolveFullEnemyPhase(ensureWangCombatSession());
    if (!result?.available) return;
    result.texts.forEach(appendNarrativeOutcome);
    settleMainCombat(result.session, "wang");
  },
  "continue-after-wang": () => {
    if (state.screen !== "wangAftermath" || !state.p0.wangOutcome) return;
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
  "begin-m4": () => {
    if (state.screen !== "p0JourneyEnd") return;
    state.m4 = migrateM4State(state.m4);
    track("m4_started", { previousJourneyComplete: state.p0.complete });
    moveM4("caoDeparture", "cao_departure");
  },
  "m4-cao-aid": (value) => {
    if (state.screen !== "caoDeparture") return;
    const result = resolveCaoDeparture(value, state.m4);
    if (!result?.available) return;
    state.m4 = result.state;
    track("cao_departed", { aid: value });
    moveM4("shenFuOffer", "shen_fu_offer");
  },
  "m4-inquiry": (value) => {
    if (state.screen !== "shenFuOffer") return;
    const result = resolveMoneyInquiry(value, state.m4);
    if (!result?.available) return;
    state.m4 = result.state;
    appendNarrativeOutcome(`你记下了${result.evidence.name}：${result.evidence.description}`);
    track("m4_money_inquiry", { action: value, evidence: result.evidence.id });
    refresh();
  },
  "m4-finish-inquiry": () => {
    if (state.screen !== "shenFuOffer" || !getDirtyMoneyBoard(state.m4).canDecide) return;
    moveM4("dirtyMoneyChoice", "dirty_money_choice");
  },
  "m4-money-choice": (value) => {
    if (state.screen !== "dirtyMoneyChoice") return;
    const result = resolveDirtyMoneyChoice(value, state.m4, m4Context());
    if (!result?.available) return;
    state.m4 = result.state;
    track("m4_money_disposition", { choice: value, holder: state.m4.dirtyMoney.holder });
    moveM4("shenFuReckoning", "shen_fu_reckoning");
  },
  "m4-tracking": (value) => {
    if (state.screen !== "shenFuReckoning") return;
    const result = resolveM4Tracking(value, state.m4, m4Context());
    if (!result?.available) return;
    state.m4 = result.state;
    if (state.m4.tracking.wound && !state.p0.wounds.some((wound) => wound.id === state.m4.tracking.wound)) {
      state.p0.wounds.push({ id: state.m4.tracking.wound, type: "bruise", bodyPart: "shoulder", severity: 1, tags: ["tracking", "temporary"] });
    }
    appendNarrativeOutcome(`追踪判定为${m4TrackingGradeLabel(result.outcome)}；警觉提高${state.m4.tracking.alert}。`);
    track("m4_tracking", { action: value, grade: result.outcome, check: result.action.check });
    moveM4("m4Tracking", "m4_tracking", result.outcome === "failure" ? "failed" : "complete");
  },
  "m4-tracking-continue": () => {
    if (state.screen !== "m4Tracking") return;
    moveM4("sevenKillHouse", "seven_kill_house");
  },
  "m4-old-house": (value) => {
    if (state.screen !== "sevenKillHouse") return;
    const result = resolveOldHouseChoice(value, state.m4, m4Context());
    if (!result?.available) return;
    state.m4 = result.state;
    track("m4_old_house", { choice: value, sevenKillClue: state.m4.sevenKillClue });
    moveM4("shenFuConfrontation", "shen_fu_confrontation");
  },
  "m4-outcome": (value) => {
    if (state.screen !== "shenFuConfrontation") return;
    const result = resolveM4Outcome(value, state.m4, m4Context());
    if (!result?.available) return;
    state.m4 = result.state;
    state.shenFuContact = state.m4.contacts.shen_fu.permissions.length > 0;
    track("m4_shen_fu_outcome", { choice: value, outcome: result.outcome, identity: state.m4.shenIdentity });
    moveM4("m4WorldEcho", "m4_world_echo");
  },
  "m4-continue-echo": () => {
    if (state.screen !== "m4WorldEcho") return;
    moveM4("baiReturn", "bai_return");
  },
  "m4-bai-instruction": (value) => {
    if (state.screen !== "baiReturn") return;
    const result = resolveBaiInstruction(value, state.m4, m4Context());
    if (!result?.available) return;
    state.m4 = result.state;
    if (result.method && !state.p0.skills[result.method.id]) state.p0.skills[result.method.id] = { stage: "learned", progress: 30 };
    track("m4_bai_instruction", { choice: value, learned: Boolean(result.method) });
    moveM4("m4Training", "m4_training");
  },
  "m4-training": (value) => {
    if (state.screen !== "m4Training") return;
    const result = resolveM4Training(value, state.m4, m4Context());
    if (!result?.available) return;
    state.m4 = result.state;
    if (["water_formula", "wound_cycle"].includes(result.outcome) && state.p0.stakeId && state.p0.skills[state.p0.stakeId]) {
      const skill = state.p0.skills[state.p0.stakeId];
      skill.progress = Math.min(100, Number(skill.progress || 0) + 30);
      if (skill.progress >= 60) skill.stage = "skilled";
      if (!state.p0.evidence.includes(result.outcome)) state.p0.evidence.push(result.outcome);
    }
    if (result.outcome === "seven_kill_guarded" && !state.p0.evidence.includes("seven_kill_guarded")) state.p0.evidence.push("seven_kill_guarded");
    const completed = completeM4(state.m4);
    if (!completed.available) return;
    state.m4 = completed.state;
    track("m4_complete", { outcome: state.m4.outcome, training: result.outcome, traceCount: state.m4.jianghuTrace.length });
    moveM4("m4JourneyEnd", "m4_journey_end");
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
  recordNarrativeChoice(target);
  handlers[target.dataset.action]?.(target.dataset.value || "");
});

app.addEventListener("input", (event) => {
  if (event.target.dataset.field !== "hero-name") return;
  state.name = event.target.value.slice(0, 8);
  saveState();
  const button = app.querySelector('[data-action="to-vow"]');
  if (button) button.disabled = !state.name.trim() || !state.backgroundId;
});

app.addEventListener("toggle", (event) => {
  const drawer = event.target.closest?.(".dock-drawer");
  if (!drawer?.open) return;
  app.querySelectorAll(".dock-drawer[open]").forEach((other) => {
    if (other !== drawer) other.removeAttribute("open");
  });
}, true);

document.addEventListener("keydown", (event) => {
  if (event.target.matches("input, textarea") || !/^[1-9]$/.test(event.key)) return;
  const actions = [...app.querySelectorAll(".action-card:not(:disabled), .inline-button:not(:disabled)")];
  actions[Number(event.key) - 1]?.click();
});

render();
