import {
  COMBAT_MAX_ENERGY,
  createBattle,
  getAvailableCombatActions,
  getBattleDistance,
  getBattlePath,
  getBattleView,
  getEnemyIntents,
  getRecommendedCombatActions,
  resolveCombatAction,
  resolveEnemyAction,
  restartBattle,
  rewindBattle,
  startEnemyPhase,
} from "./combat-engine.mjs?v=20260730.1";
import {
  COMBAT_ENCOUNTER_CATALOG,
  RAIN_AMBUSH_DEFAULTS,
  RAIN_AMBUSH_ENCOUNTER,
  WANG_ZHUO_DEFAULTS,
  WANG_ZHUO_ENCOUNTER,
} from "./combat-encounters.mjs?v=20260730.1";

export const COMBAT_LAB_MAX_ENERGY = COMBAT_MAX_ENERGY;
export const COMBAT_LAB_ENCOUNTERS = COMBAT_ENCOUNTER_CATALOG;
export const COMBAT_LAB_DEFAULTS = RAIN_AMBUSH_DEFAULTS;
export const COMBAT_LAB_POSITION_NODES = Object.freeze(RAIN_AMBUSH_ENCOUNTER.nodes.map((node) => ({ ...node })));

const DEFINITIONS = Object.freeze({
  [RAIN_AMBUSH_ENCOUNTER.id]: RAIN_AMBUSH_ENCOUNTER,
  [WANG_ZHUO_ENCOUNTER.id]: WANG_ZHUO_ENCOUNTER,
  wang_zhuo: WANG_ZHUO_ENCOUNTER,
});

function clone(value) {
  return structuredClone(value);
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function definitionForId(encounterId = RAIN_AMBUSH_ENCOUNTER.id) {
  return DEFINITIONS[encounterId] || RAIN_AMBUSH_ENCOUNTER;
}

function definitionForSession(session) {
  return definitionForId(session?.encounterId);
}

function distanceLabel(distance) {
  if (distance <= 0) return "贴身";
  if (distance <= 2) return "适中";
  return "远离";
}

function actionIcon(action) {
  if (action.icon) return action.icon;
  if (action.intent === "身位") return "stance";
  if (action.intent === "识招") return "eye";
  if (action.intent === "脱身") return "escape";
  if (action.skillId) return "needles";
  return "blade";
}

export function createCombatLabSession(options = {}) {
  const definition = definitionForId(options.encounterId);
  return createBattle(definition, options);
}

export function getCombatLabContext(session) {
  return {
    ...clone(session.setup || {}),
    wounds: clone(session.wounds || []),
    knownFacts: unique([...(session.setup?.knownFacts || []), ...(session.battle?.knownFacts || [])]),
  };
}

export function getCombatLabPositionPath(from, to) {
  const session = createCombatLabSession();
  return getBattlePath(session, RAIN_AMBUSH_ENCOUNTER, from, to);
}

export function getCombatLabActions(session) {
  return getAvailableCombatActions(session, definitionForSession(session));
}

export function getCombatLabRecommendations(session, focusId = "default") {
  return getRecommendedCombatActions(session, definitionForSession(session), focusId).map((action) => ({
    ...action,
    display: {
      actionId: action.id,
      icon: actionIcon(action),
      title: action.title,
      consequence: action.successPreview || action.impactPreview?.success || "改变当前战局",
    },
  }));
}

export function getCombatLabEnemyIntents(session) {
  return getEnemyIntents(session, definitionForSession(session));
}

export function getCombatLabBattleBoard(session) {
  const definition = definitionForSession(session);
  const view = getBattleView(session, definition);
  const nodeById = new Map(view.nodes.map((node) => [node.id, node]));
  const intentByUnit = new Map(view.intents.map((intent) => [intent.unitId, intent]));
  const primary = view.enemies.find((entry) => entry.primary) || view.enemies[0] || null;
  const unit = (entry) => {
    const intent = intentByUnit.get(entry.id);
    const distance = getBattleDistance(session, definition, session.positions.player, session.positions[entry.id]);
    return {
      id: entry.id,
      name: entry.name,
      role: entry.role,
      stageId: entry.stageId,
      vitality: { current: entry.current, max: entry.max },
      current: entry.current,
      max: entry.max,
      intent: intent?.label || (entry.defeated ? "已经倒下" : entry.active ? "等待时机" : "已经撤走"),
      intentDetail: intent?.detail || "",
      intentOrder: intent?.order || 0,
      portrait: entry.portrait || "",
      icon: entry.icon || "blade",
      nodeId: session.positions[entry.id],
      nodeName: nodeById.get(session.positions[entry.id])?.shortName || "战场外",
      distance: distanceLabel(distance),
      acting: session.turn.phase === "enemy" && session.turn.enemyQueue[session.turn.enemyCursor]?.unitId === entry.id,
      acted: session.turn.actedEnemyIds.includes(entry.id),
      primary: Boolean(entry.primary),
      active: Boolean(entry.active),
      defeated: Boolean(entry.defeated),
      statuses: clone(entry.statuses || []),
    };
  };
  const pursuit = view.stage.presentation === "pursuit" ? {
    identityProgress: Number(view.conditions.identityProgress || 0),
    identityGoal: 2,
    allySafe: Boolean(view.conditions.allySafe),
    alert: Number(view.ledger?.alert || 0),
    tailPressure: Number(view.conditions.tailPressure || 0),
  } : null;
  return {
    meta: {
      ...view.meta,
      playerName: view.player.name,
      playerStageId: view.player.stageId,
      presentation: view.stage.presentation || "battle",
      encounterCatalog: clone(COMBAT_LAB_ENCOUNTERS),
    },
    vitality: {
      player: { current: view.player.current, max: view.player.max },
      enemy: primary ? { current: primary.current, max: primary.max } : { current: 0, max: 1 },
      enemies: Object.fromEntries(view.enemies.map((entry) => [entry.id, { current: entry.current, max: entry.max }])),
    },
    combat: {
      defense: Number(view.player.defense || 0),
      reduction: Number(view.player.reduction || 0),
      qi: Number(view.player.qi || 0),
      maxQi: Number(view.player.maxQi || 0),
    },
    turn: clone(session.turn),
    intents: clone(view.intents),
    intent: {
      target: view.intents[0]?.detail || "敌人正在重新寻找出手机会",
      threat: view.threat,
      sequence: view.intents.map((entry) => `${entry.order} · ${entry.label}｜${entry.detail}`),
    },
    objective: view.objective,
    environment: clone(view.environment),
    nodes: clone(view.nodes),
    links: clone(view.links),
    positions: clone(view.positions),
    playerNode: nodeById.get(session.positions.player),
    units: view.enemies.map(unit),
    allies: view.allies.map((entry) => ({
      ...clone(entry),
      nodeName: nodeById.get(session.positions[entry.id])?.shortName || "战场外",
    })),
    statuses: clone(view.statuses),
    wounds: clone(view.wounds),
    knownFacts: clone(view.knownFacts),
    conditions: clone(view.conditions),
    ledger: clone(view.ledger),
    stage: clone(view.stage),
    pursuit,
  };
}

export function resolveCombatLabAction(session, actionId) {
  return resolveCombatAction(session, actionId, definitionForSession(session));
}

export function endCombatLabPlayerTurn(session) {
  return startEnemyPhase(session, definitionForSession(session));
}

export function resolveCombatLabEnemyAction(session) {
  return resolveEnemyAction(session, definitionForSession(session));
}

export function rewindCombatLabDeath(session) {
  return rewindBattle(session, definitionForSession(session));
}

export function restartCombatLab(session, patch = {}) {
  return restartBattle(session, definitionForSession(session), patch);
}

export function advanceCombatLabCampaign(session) {
  if (session?.encounterId !== RAIN_AMBUSH_ENCOUNTER.id || session?.status !== "finished") {
    return { available: false, reason: "当前没有可以承接的下一场战斗。" };
  }
  const outcome = session.result?.outcome || "escaped";
  const relationshipDelta = outcome === "subdued" ? 4 : outcome === "killed" ? -2 : 1;
  const evidence = unique([
    ...(session.result?.consequences?.evidence || []),
    outcome === "subdued" ? "rain_ambush_captive" : outcome === "killed" ? "fish_scale_token" : "rain_escape_trace",
  ]);
  const alert = Number(session.result?.consequences?.alert || 0) + (outcome === "killed" ? 1 : 0);
  const defaults = clone(WANG_ZHUO_DEFAULTS);
  const next = createBattle(WANG_ZHUO_ENCOUNTER, {
    ...defaults,
    fateSeed: `${session.setup.fateSeed || "seed-0"}:east-lake`,
    lives: session.lives,
    attributes: {
      ...defaults.attributes,
      ...clone(session.setup.attributes || {}),
    },
    playerStage: "body",
    skills: {
      ...defaults.skills,
      ...clone(session.setup.skills || {}),
    },
    wounds: clone(session.wounds || []),
    knownFacts: unique([
      ...defaults.knownFacts,
      ...(session.setup.knownFacts || []),
      ...(session.battle.knownFacts || []),
    ]),
    deathMemory: clone(session.deathMemory || []),
    deathRecords: clone(session.deathRecords || []),
    campaign: {
      relationships: {
        yan_jinghong: {
          ...defaults.relationships.yan_jinghong,
          trust: Number(defaults.relationships.yan_jinghong.trust || 0) + relationshipDelta,
        },
      },
      evidence,
      alert,
      outcomes: [{ encounterId: RAIN_AMBUSH_ENCOUNTER.id, outcome }],
      contacts: [],
    },
  });
  next.history.unshift({
    round: 0,
    stageRound: 0,
    stageId: next.battle.stageId,
    phase: "campaign",
    actionId: "carry_from_rain_ambush",
    intent: "前局余波",
    text: session.wounds.length
      ? "你带着雨巷留下的伤势赶到柳巷，旧伤仍会影响这次尾随。"
      : "雨巷留下的活口、尸证或逃踪，改变了燕惊鸿对你的判断。",
  });
  return { available: true, session: next };
}
