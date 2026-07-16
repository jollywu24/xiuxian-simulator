import {
  createFirstBattle,
  getFirstBattleActions,
  getFirstBattleIntentBoard,
  getFirstBattleVitality,
  resolveFirstBattleAction,
} from "./wudao-p0-core.mjs?v=20260716.5";

export const COMBAT_LAB_DEFAULTS = Object.freeze({
  fateSeed: "seed-0",
  lives: 2,
  hasNeedles: true,
  attributes: {
    constitution: 0,
    insight: 5,
    agility: 2,
    strength: 2,
    fortune: 0,
  },
  playerStage: "mortal",
  skills: {
    spring_rain_needles: {
      stage: "skilled",
      progress: 60,
    },
  },
  wounds: [],
  knownFacts: [],
});

const COMBAT_LAB_RECOMMENDATIONS = Object.freeze({
  default: [
    { actionId: "observe", icon: "eye", title: "观左袖", consequence: "看破下一招" },
    { actionId: "extinguish", icon: "lantern", title: "银针灭灯", consequence: "遮断弩手视线" },
    { actionId: "needle_wrist", icon: "needles", title: "银针封腕", consequence: "夺下眼前刀势" },
  ],
  street_lantern: [
    { actionId: "extinguish", icon: "lantern", title: "银针灭灯", consequence: "遮断弩手视线" },
    { actionId: "reckless", icon: "fire", title: "踢翻灯笼", consequence: "制造火势 · 可能露空门" },
    { actionId: "observe", icon: "shadow", title: "借影观敌", consequence: "看破下一招" },
  ],
  eave_pillar: [
    { actionId: "observe", icon: "eye", title: "借柱看势", consequence: "以遮挡换取识招" },
    { actionId: "needle_wrist", icon: "needles", title: "绕柱封腕", consequence: "换角度取持刀手" },
    { actionId: "reckless", icon: "impact", title: "诱敌撞柱", consequence: "贴身强攻 · 凶险" },
  ],
  pharmacy_wall: [
    { actionId: "flee", icon: "escape", title: "翻墙脱身", consequence: "结束战斗 · 保住性命" },
    { actionId: "observe", icon: "eye", title: "蹬墙观势", consequence: "拉开距离 · 看破后手" },
    { actionId: "reckless", icon: "impact", title: "蹬墙反跃", consequence: "贴身强攻 · 凶险" },
  ],
});

function clone(value) {
  return structuredClone(value);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function mergeWound(wounds, wound) {
  if (!wound) return wounds;
  const next = clone(wounds);
  const existing = next.find((entry) => entry.id === wound.id);
  if (existing) {
    existing.severity = Math.max(Number(existing.severity || 0), Number(wound.severity || 0));
    existing.tags = unique([...(existing.tags || []), ...(wound.tags || [])]);
  } else {
    next.push(clone(wound));
  }
  return next;
}

function normalizeSetup(options = {}) {
  const defaults = clone(COMBAT_LAB_DEFAULTS);
  return {
    ...defaults,
    ...clone(options),
    attributes: {
      ...defaults.attributes,
      ...(options.attributes || {}),
    },
    skills: {
      ...defaults.skills,
      ...(options.skills || {}),
      spring_rain_needles: {
        ...defaults.skills.spring_rain_needles,
        ...(options.skills?.spring_rain_needles || {}),
      },
    },
    lives: Math.max(1, Math.min(2, Number(options.lives ?? defaults.lives))),
    wounds: clone(options.wounds || defaults.wounds),
    knownFacts: unique(options.knownFacts || defaults.knownFacts),
  };
}

export function createCombatLabSession(options = {}) {
  const setup = normalizeSetup(options);
  return {
    setup,
    lives: setup.lives,
    battle: createFirstBattle({ knownFacts: setup.knownFacts, context: setup }),
    wounds: clone(setup.wounds),
    deathMemory: [],
    history: [],
    status: "fighting",
    result: null,
  };
}

export function getCombatLabContext(session) {
  return {
    fateSeed: session.setup.fateSeed,
    hasNeedles: session.setup.hasNeedles,
    canRiskDeath: session.lives > 1,
    attributes: clone(session.setup.attributes),
    playerStage: session.setup.playerStage,
    skills: clone(session.setup.skills),
    wounds: clone(session.wounds),
    knownFacts: unique([
      ...session.setup.knownFacts,
      ...(session.battle?.knownFacts || []),
    ]),
  };
}

export function getCombatLabActions(session) {
  if (session.status !== "fighting") return [];
  return getFirstBattleActions(session.battle, getCombatLabContext(session));
}

export function getCombatLabRecommendations(session, focusId = "default") {
  const allActions = getCombatLabActions(session);
  const actions = new Map(allActions.map((entry) => [entry.id, entry]));
  const configured = COMBAT_LAB_RECOMMENDATIONS[focusId] || COMBAT_LAB_RECOMMENDATIONS.default;
  const preferred = configured
    .map((entry) => {
      const action = actions.get(entry.actionId);
      return action ? { ...action, display: clone(entry) } : null;
    })
    .filter(Boolean);
  const used = new Set(preferred.map((entry) => entry.id));
  const fallbackIcon = (entry) => entry.objectId === "pharmacy_wall"
    ? "escape"
    : entry.objectId === "street_lantern"
      ? "lantern"
      : entry.skillId
        ? "needles"
        : entry.intent === "识招"
          ? "eye"
          : "blade";
  const fallback = allActions
    .filter((entry) => !used.has(entry.id))
    .map((entry) => ({
      ...entry,
      display: {
        actionId: entry.id,
        icon: fallbackIcon(entry),
        title: entry.title,
        consequence: entry.successPreview,
      },
    }));
  return [...preferred, ...fallback].slice(0, 3);
}

export function getCombatLabBattleBoard(session) {
  const context = getCombatLabContext(session);
  const vitality = getFirstBattleVitality(session.battle, context);
  return {
    vitality,
    intent: getFirstBattleIntentBoard(session.battle, context),
    objective: session.battle.objective,
    environment: clone(session.battle.environment || []),
    units: [
      {
        id: "night_assailant",
        name: "刀客",
        role: "当前交锋",
        current: vitality.enemy.current,
        max: vitality.enemy.max,
        intent: session.battle.knownFacts.includes("left_sleeve_blade") || session.battle.observedFeint
          ? "左袖藏刃"
          : "逼近试探",
        portrait: "./assets/combat/portrait-masked-blade.webp",
        active: true,
      },
      {
        id: "roof_crossbow",
        name: "弩手",
        role: "远程威胁",
        current: session.battle.darkness ? 6 : 8,
        max: 8,
        intent: session.battle.darkness ? "失去视线" : "瞄准",
        portrait: "./assets/combat/portrait-roof-crossbow.webp",
        active: false,
      },
      {
        id: "black_leader",
        name: "头目",
        role: "后阵指挥",
        current: 24,
        max: 24,
        intent: session.battle.finished ? "退入雨幕" : "蓄势",
        portrait: "./assets/combat/portrait-black-leader.webp",
        active: false,
      },
    ],
  };
}

export function resolveCombatLabAction(session, actionId) {
  if (session.status !== "fighting") {
    return { available: false, reason: "这场推演已经落定。" };
  }
  const next = clone(session);
  const result = resolveFirstBattleAction(actionId, next.battle, getCombatLabContext(next));
  if (!result?.available) return result;

  next.battle = result.battle;
  next.wounds = mergeWound(next.wounds, result.wound);
  next.history.push({
    round: result.check?.round || result.battle.history.at(-1)?.round || result.battle.round,
    actionId,
    intent: result.intent,
    outcome: result.outcome,
    rating: result.evaluation?.rating || null,
    check: result.check || null,
    impact: result.impact || null,
    text: result.battle.lastResult || result.cause || "",
  });

  if (result.outcome === "death") {
    next.lives = Math.max(0, next.lives - 1);
    if (result.memory && !next.deathMemory.includes(result.memory)) next.deathMemory.push(result.memory);
    next.status = "death";
    next.result = {
      outcome: "death",
      causeId: result.causeId,
      cause: result.cause,
      memory: result.memory,
      check: result.check || null,
    };
  } else if (["subdued", "killed", "escaped"].includes(result.outcome)) {
    next.status = "finished";
    next.result = {
      outcome: result.outcome,
      edge: result.edge || null,
      check: result.check || null,
      text: result.battle.lastResult,
    };
  }

  return { available: true, result, session: next };
}

export function rewindCombatLabDeath(session) {
  if (session.status !== "death" || session.lives <= 0) {
    return { available: false, reason: "命灯已经无法把这一战拉回原处。" };
  }
  const next = clone(session);
  const learnedFacts = unique([
    ...next.setup.knownFacts,
    ...(next.battle?.knownFacts || []),
    next.result?.causeId === "left_sleeve_blade" ? "left_sleeve_blade" : null,
  ]);
  next.setup.knownFacts = learnedFacts;
  next.battle = createFirstBattle({ knownFacts: learnedFacts, context: next.setup });
  next.wounds = clone(next.setup.wounds);
  next.status = "fighting";
  next.result = null;
  next.history.push({
    round: 0,
    actionId: "rewind",
    intent: "回照",
    outcome: "rewound",
    rating: null,
    check: null,
    text: "命灯把雨夜拉回刀客现身之前，死中见闻仍在。",
  });
  return { available: true, session: next };
}

export function restartCombatLab(session, patch = {}) {
  const setup = normalizeSetup({
    ...clone(session?.setup || {}),
    ...clone(patch),
    attributes: {
      ...(session?.setup?.attributes || {}),
      ...(patch.attributes || {}),
    },
    skills: {
      ...(session?.setup?.skills || {}),
      ...(patch.skills || {}),
      spring_rain_needles: {
        ...(session?.setup?.skills?.spring_rain_needles || {}),
        ...(patch.skills?.spring_rain_needles || {}),
      },
    },
  });
  return createCombatLabSession(setup);
}
