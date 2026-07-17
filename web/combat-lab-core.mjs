import {
  createFirstBattle,
  getFirstBattleActions,
  getFirstBattleVitality,
  resolveFirstBattleAction,
} from "./wudao-p0-core.mjs?v=20260717.2";

export const COMBAT_LAB_MAX_ENERGY = 3;

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

export const COMBAT_LAB_POSITION_NODES = Object.freeze([
  { id: "alley_entrance", name: "雨巷入口", shortName: "巷口", type: "ground", x: 16, y: 73 },
  { id: "eave_pillar", name: "药铺檐下", shortName: "檐下", type: "cover", x: 35, y: 58 },
  { id: "street_center", name: "长街中央", shortName: "街心", type: "ground", x: 56, y: 50 },
  { id: "pharmacy_wall", name: "药铺矮墙", shortName: "矮墙", type: "cover", x: 76, y: 68 },
  { id: "alley_end", name: "雨巷深处", shortName: "巷尾", type: "ground", x: 87, y: 42 },
  { id: "rooftop", name: "临街屋脊", shortName: "屋脊", type: "high", x: 68, y: 20 },
]);

const NODE_BY_ID = new Map(COMBAT_LAB_POSITION_NODES.map((node) => [node.id, node]));
const PLAYER_DESTINATIONS = new Set(["alley_entrance", "eave_pillar", "street_center", "pharmacy_wall"]);
const MOVEMENT_EDGES = Object.freeze({
  alley_entrance: ["eave_pillar"],
  eave_pillar: ["alley_entrance", "street_center", "pharmacy_wall"],
  street_center: ["eave_pillar", "pharmacy_wall", "alley_end"],
  pharmacy_wall: ["eave_pillar", "street_center", "alley_end"],
  alley_end: ["street_center", "pharmacy_wall"],
  rooftop: [],
});
const DISTANCE_EDGES = Object.freeze({
  ...MOVEMENT_EDGES,
  street_center: [...MOVEMENT_EDGES.street_center, "rooftop"],
  alley_end: [...MOVEMENT_EDGES.alley_end, "rooftop"],
  rooftop: ["street_center", "alley_end"],
});

const ACTION_COSTS = Object.freeze({
  observe: 1,
  extinguish: 2,
  needle_wrist: 2,
  reckless: 2,
  seal: 3,
  kill: 3,
  flee: 3,
});

const COMBAT_LAB_RECOMMENDATIONS = Object.freeze({
  default: [
    { actionId: "observe", icon: "eye", title: "观左袖", consequence: "看破下一招" },
    { actionId: "move_eave_pillar", icon: "stance", title: "掠至檐下", consequence: "移动一段 · 取得遮挡" },
    { actionId: "extinguish", icon: "lantern", title: "银针灭灯", consequence: "遮断弩手视线" },
  ],
  street_lantern: [
    { actionId: "extinguish", icon: "lantern", title: "银针灭灯", consequence: "中距出针 · 熄灭灯火" },
    { actionId: "move_street_center", icon: "stance", title: "抢入街心", consequence: "移动至刀客身前" },
    { actionId: "observe", icon: "shadow", title: "借影观敌", consequence: "原地看破下一招" },
  ],
  eave_pillar: [
    { actionId: "move_eave_pillar", icon: "stance", title: "掠至檐下", consequence: "移动并取得遮挡" },
    { actionId: "observe", icon: "eye", title: "借柱看势", consequence: "以遮挡换取识招" },
    { actionId: "needle_wrist", icon: "needles", title: "绕柱封腕", consequence: "中距取持刀手" },
  ],
  pharmacy_wall: [
    { actionId: "move_pharmacy_wall", icon: "stance", title: "移向矮墙", consequence: "为下一轮脱身占位" },
    { actionId: "flee", icon: "escape", title: "翻墙脱身", consequence: "必须身在矮墙" },
    { actionId: "observe", icon: "eye", title: "蹬墙观势", consequence: "借墙看破后手" },
  ],
  "target:roof_crossbow": [
    { actionId: "extinguish", icon: "lantern", title: "银针灭灯", consequence: "切断弩手视线" },
    { actionId: "move_eave_pillar", icon: "stance", title: "掠至檐下", consequence: "用檐柱取得遮挡" },
    { actionId: "move_pharmacy_wall", icon: "escape", title: "移向矮墙", consequence: "借矮墙削弱弩箭" },
  ],
  "target:black_leader": [
    { actionId: "move_pharmacy_wall", icon: "escape", title: "抢占矮墙", consequence: "赶在头目封路之前" },
    { actionId: "flee", icon: "stance", title: "翻墙脱身", consequence: "不让合围成形" },
    { actionId: "observe", icon: "eye", title: "回看刀势", consequence: "先处理挡路刀客" },
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

function initialTurn() {
  return {
    round: 1,
    phase: "player",
    energy: COMBAT_LAB_MAX_ENERGY,
    maxEnergy: COMBAT_LAB_MAX_ENERGY,
    enemyQueue: [],
    enemyCursor: 0,
    actedEnemyIds: [],
  };
}

function initialPositions() {
  return {
    player: "alley_entrance",
    night_assailant: "street_center",
    roof_crossbow: "rooftop",
    black_leader: "alley_end",
  };
}

function initialEnemyState() {
  return {
    crossbowAimed: false,
    leaderCharge: 0,
    wallBlocked: false,
    knifeEmpowered: false,
  };
}

export function createCombatLabSession(options = {}) {
  const setup = normalizeSetup(options);
  const session = {
    setup,
    lives: setup.lives,
    battle: createFirstBattle({ knownFacts: setup.knownFacts, context: setup }),
    turn: initialTurn(),
    positions: initialPositions(),
    enemyState: initialEnemyState(),
    pendingConsequences: [],
    pendingOutcome: null,
    wounds: clone(setup.wounds),
    deathMemory: [],
    history: [],
    status: "fighting",
    result: null,
  };
  syncBattleSpatialState(session);
  return session;
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

function findPath(from, to, edges = MOVEMENT_EDGES) {
  if (!from || !to || !edges[from] || !edges[to]) return [];
  if (from === to) return [from];
  const queue = [[from]];
  const visited = new Set([from]);
  while (queue.length) {
    const path = queue.shift();
    const current = path.at(-1);
    for (const neighbor of edges[current] || []) {
      if (visited.has(neighbor)) continue;
      const nextPath = [...path, neighbor];
      if (neighbor === to) return nextPath;
      visited.add(neighbor);
      queue.push(nextPath);
    }
  }
  return [];
}

export function getCombatLabPositionPath(from, to) {
  return findPath(from, to);
}

function distanceBetween(from, to) {
  const path = findPath(from, to, DISTANCE_EDGES);
  return path.length ? path.length - 1 : 99;
}

function distanceLabel(distance) {
  if (distance <= 0) return "贴身";
  if (distance === 1) return "近距";
  if (distance === 2) return "中距";
  return "远距";
}

function positionName(nodeId) {
  return NODE_BY_ID.get(nodeId)?.shortName || "未知身位";
}

function spatialRange(session) {
  const distance = distanceBetween(session.positions.player, session.positions.night_assailant);
  if (distance <= 0) return "close";
  if (distance <= 2) return "mid";
  return "far";
}

function syncBattleSpatialState(session) {
  if (!session?.battle) return session;
  session.battle.round = session.turn.round;
  session.battle.range = spatialRange(session);
  return session;
}

function movementCost(session, destination) {
  const from = session.positions.player;
  const path = findPath(from, destination);
  if (!path.length) return { available: false, reason: "此处没有可以踏出的路。", path: [], cost: 99 };
  let cost = path.length - 1;
  const engaged = from === session.positions.night_assailant && !session.battle.enemyWounded;
  if (engaged && destination !== from) cost += 1;
  if (cost > COMBAT_LAB_MAX_ENERGY) return { available: false, reason: "这一轮的气机不足以抵达。", path, cost };
  if (session.enemyState.wallBlocked && destination === "pharmacy_wall") return { available: false, reason: "头目已经封住矮墙退路。", path, cost };
  return { available: true, reason: null, path, cost };
}

function actionSpatialGate(session, actionId) {
  const player = session.positions.player;
  const knife = session.positions.night_assailant;
  const knifeDistance = distanceBetween(player, knife);
  const lanternDistance = distanceBetween(player, "street_center");
  if (actionId === "extinguish" && lanternDistance > 2) return { available: false, reason: "灯笼已经超出银针可及的中距。" };
  if (actionId === "needle_wrist" && knifeDistance > 2) return { available: false, reason: "持刀手仍在银针有效距离之外。" };
  if (["seal", "kill"].includes(actionId) && knifeDistance > 1) return { available: false, reason: "决胜一针必须先逼到近距。" };
  if (actionId === "reckless" && knifeDistance > 2) return { available: false, reason: "距离太远，强攻无法一气撞入刀路。" };
  if (actionId === "flee" && player !== "pharmacy_wall") return { available: false, reason: "必须先抵达药铺矮墙。" };
  if (actionId === "flee" && session.enemyState.wallBlocked) return { available: false, reason: "头目已经封住矮墙退路。" };
  return { available: true, reason: null };
}

function actionPositionPreview(session, actionId) {
  const from = session.positions.player;
  const knife = session.positions.night_assailant;
  const before = distanceLabel(distanceBetween(from, knife));
  let to = from;
  if (actionId === "reckless") to = knife;
  if (actionId === "extinguish" && from === "alley_entrance") to = "eave_pillar";
  const after = distanceLabel(distanceBetween(to, knife));
  if (actionId === "flee") return `身在${positionName(from)}｜翻墙后脱离战场`;
  if (to !== from) return `${positionName(from)}→${positionName(to)}｜${before}→${after}`;
  return `身在${positionName(from)}｜与刀客${before}`;
}

function disabledEvaluation(evaluation, reason) {
  return { ...evaluation, available: false, reason };
}

function projectActionPosition(session, action) {
  const projected = clone(session);
  if (action.id.startsWith("move_")) projected.positions.player = action.objectId;
  if (action.id === "reckless") projected.positions.player = projected.positions.night_assailant;
  if (action.id === "extinguish" && projected.positions.player === "alley_entrance") {
    projected.positions.player = "eave_pillar";
    projected.battle.darkness = true;
  }
  syncBattleSpatialState(projected);
  return projected;
}

function projectedOutcome(session, action) {
  if (!action.evaluation?.available) return null;
  const tier = action.evaluation.tier;
  if (action.id === "seal" && tier !== "failure") return "subdued";
  if (action.id === "kill" && tier !== "failure") return "killed";
  if (action.id === "flee" && (tier !== "failure" || session.turn.round >= 3)) return "escaped";
  return null;
}

function addEnemyPhaseForecast(session, action) {
  const projected = projectActionPosition(session, action);
  const outcome = projectedOutcome(session, action);
  if (outcome) projected.pendingOutcome = { outcome };
  const intents = getCombatLabEnemyIntents(projected);
  const threat = intents.reduce((total, intent) => total + Number(intent.damage || 0), 0);
  const enemyPhasePreview = threat > 0
    ? `若此刻收势：预计承受${threat}点气血`
    : "若此刻收势：敌人只会移动或蓄势";
  let evaluation = action.evaluation;
  if (action.intent === "身位" && evaluation.available) {
    const currentHp = getFirstBattleVitality(session.battle, getCombatLabContext(session)).player.current;
    const rating = threat >= currentHp ? "fatal" : threat >= 3 ? "dangerous" : threat > 0 ? "viable" : "safe";
    evaluation = {
      ...evaluation,
      rating,
      ratingLabel: { safe: "稳妥", viable: "可行", dangerous: "凶险", fatal: "必死" }[rating],
      reasons: [...(evaluation.reasons || []), enemyPhasePreview],
    };
  }
  return {
    ...action,
    evaluation,
    enemyPhasePreview,
    impactPreview: {
      ...(action.impactPreview || {}),
      enemyPhase: enemyPhasePreview,
    },
  };
}

function movementActions(session) {
  return COMBAT_LAB_POSITION_NODES
    .filter((node) => PLAYER_DESTINATIONS.has(node.id) && node.id !== session.positions.player)
    .map((node) => {
      const move = movementCost(session, node.id);
      const enoughEnergy = session.turn.energy >= move.cost;
      const available = session.turn.phase === "player" && move.available && enoughEnergy;
      const reason = session.turn.phase !== "player"
        ? "敌方正在行动。"
        : !move.available
          ? move.reason
          : !enoughEnergy
            ? `还需${move.cost}点气机。`
            : null;
      const from = session.positions.player;
      const knifeDistance = distanceBetween(node.id, session.positions.night_assailant);
      const action = {
        id: `move_${node.id}`,
        verb: "换位",
        objectId: node.id,
        objectName: node.name,
        intent: "身位",
        title: `移向${node.shortName}`,
        description: `沿${move.path.map(positionName).join("→")}换位。`,
        successPreview: node.type === "cover" ? "获得遮挡并改变敌人路径" : "改变与敌人的距离",
        riskPreview: from === session.positions.night_assailant && !session.battle.enemyWounded ? "脱离贴身会额外消耗一点气机" : "敌人会在行动阶段追赶",
        energyCost: move.cost,
        positionPreview: `${positionName(from)}→${node.shortName}｜对刀客${distanceLabel(knifeDistance)}`,
        impactPreview: { success: `移动${Math.max(1, move.path.length - 1)}段`, risk: "不直接造成伤害", position: `${positionName(from)}→${node.shortName}` },
        evaluation: {
          available,
          reason,
          rating: available ? "safe" : "locked",
          ratingLabel: available ? "稳妥" : "不可用",
          tier: "success",
          reasons: [node.type === "cover" ? "此处可以遮挡远程视线" : "改变当前身位"],
        },
      };
      return addEnemyPhaseForecast(session, action);
    });
}

function enrichAction(session, action) {
  const energyCost = Number(ACTION_COSTS[action.id] || 1);
  const spatial = actionSpatialGate(session, action.id);
  let evaluation = clone(action.evaluation);
  if (session.turn.phase !== "player") evaluation = disabledEvaluation(evaluation, "敌方正在行动。");
  else if (!spatial.available) evaluation = disabledEvaluation(evaluation, spatial.reason);
  else if (session.turn.energy < energyCost) evaluation = disabledEvaluation(evaluation, `气机不足：需要${energyCost}点。`);
  return addEnemyPhaseForecast(session, {
    ...action,
    energyCost,
    positionPreview: actionPositionPreview(session, action.id),
    evaluation,
  });
}

export function getCombatLabActions(session) {
  if (session.status !== "fighting" || session.pendingOutcome || session.battle.finished) return [];
  const battle = { ...session.battle, round: session.turn.round, range: spatialRange(session) };
  const martialActions = getFirstBattleActions(battle, getCombatLabContext(session)).map((action) => enrichAction(session, action));
  return [...martialActions, ...movementActions(session)];
}

export function getCombatLabRecommendations(session, focusId = "default") {
  const allActions = getCombatLabActions(session);
  const actions = new Map(allActions.map((entry) => [entry.id, entry]));
  const positionFocus = String(focusId).startsWith("position:") ? String(focusId).slice(9) : null;
  const configured = positionFocus
    ? [
      { actionId: `move_${positionFocus}`, icon: "stance", title: `移向${positionName(positionFocus)}`, consequence: "改变距离与遮挡" },
      ...COMBAT_LAB_RECOMMENDATIONS.default,
    ]
    : COMBAT_LAB_RECOMMENDATIONS[focusId] || COMBAT_LAB_RECOMMENDATIONS.default;
  const seen = new Set();
  const preferred = configured
    .map((entry) => {
      const action = actions.get(entry.actionId);
      if (!action || seen.has(action.id)) return null;
      seen.add(action.id);
      return { ...action, display: clone(entry) };
    })
    .filter(Boolean);
  const used = new Set(preferred.map((entry) => entry.id));
  const fallbackIcon = (entry) => entry.intent === "身位"
    ? "stance"
    : entry.objectId === "pharmacy_wall"
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

function knifeIntent(session) {
  const from = session.positions.night_assailant;
  const target = session.positions.player;
  const path = findPath(from, target);
  const to = path.length > 1 ? path[1] : from;
  const reachesPlayer = to === target;
  const pending = session.pendingConsequences.filter((entry) => entry.sourceId === "night_assailant");
  if (pending.length) {
    const lethal = pending.find((entry) => entry.lethal) || null;
    const damage = pending.reduce((total, entry) => total + Number(entry.damage || 0), 0);
    return {
      id: `enemy_${session.turn.round}_knife_reaction`,
      unitId: "night_assailant",
      order: 1,
      kind: "reaction",
      label: lethal ? "左袖反刺" : "乘隙追刀",
      detail: `${positionName(from)}→${positionName(to)}｜预计气血−${damage}`,
      from,
      to,
      damage,
      consequences: clone(pending),
      causeId: lethal?.causeId || null,
      cause: lethal?.cause || null,
      memory: lethal?.memory || null,
    };
  }
  const knownSleeve = session.battle.observedFeint || session.battle.knownFacts.includes("left_sleeve_blade");
  const empowered = session.enemyState.knifeEmpowered;
  let damage = reachesPlayer ? (session.battle.enemyWounded ? 2 : 4) + (empowered ? 2 : 0) : 0;
  if (knownSleeve && damage) damage = Math.max(1, damage - 1);
  return {
    id: `enemy_${session.turn.round}_knife`,
    unitId: "night_assailant",
    order: 1,
    kind: reachesPlayer ? "attack" : "move",
    label: reachesPlayer ? (knownSleeve ? "左袖反刺" : "贴身抢杀") : "逼近压位",
    detail: reachesPlayer ? `${positionName(from)}→${positionName(to)}｜预计气血−${damage}` : `${positionName(from)}→${positionName(to)}｜向你逼近`,
    from,
    to,
    damage,
  };
}

function crossbowIntent(session) {
  const covered = ["eave_pillar", "pharmacy_wall"].includes(session.positions.player);
  if (session.battle.darkness) {
    return { id: `enemy_${session.turn.round}_crossbow`, unitId: "roof_crossbow", order: 2, kind: "miss", label: "失去视线", detail: "灯火已灭｜弩箭无法锁定", from: "rooftop", to: "rooftop", damage: 0 };
  }
  if (!session.enemyState.crossbowAimed) {
    return { id: `enemy_${session.turn.round}_crossbow`, unitId: "roof_crossbow", order: 2, kind: "aim", label: "瞄准", detail: `屋脊→${positionName(session.positions.player)}｜下轮放箭`, from: "rooftop", to: "rooftop", damage: 0 };
  }
  const damage = covered ? 1 : 4;
  return { id: `enemy_${session.turn.round}_crossbow`, unitId: "roof_crossbow", order: 2, kind: "shoot", label: "弩箭破雨", detail: `屋脊→${positionName(session.positions.player)}｜预计气血−${damage}${covered ? " · 有遮挡" : ""}`, from: "rooftop", to: "rooftop", damage };
}

function leaderIntent(session) {
  if (session.enemyState.leaderCharge === 0) {
    return { id: `enemy_${session.turn.round}_leader`, unitId: "black_leader", order: 3, kind: "charge", label: "蓄势观局", detail: "固守巷尾｜看清你的退路", from: "alley_end", to: "alley_end", damage: 0 };
  }
  if (!session.enemyState.wallBlocked) {
    return { id: `enemy_${session.turn.round}_leader`, unitId: "black_leader", order: 3, kind: "block", label: "封锁矮墙", detail: "巷尾下令｜下一轮不能翻墙", from: "alley_end", to: "alley_end", damage: 0 };
  }
  return { id: `enemy_${session.turn.round}_leader`, unitId: "black_leader", order: 3, kind: "command", label: "催刀合围", detail: "巷尾下令｜刀客下一击增强", from: "alley_end", to: "alley_end", damage: 0 };
}

function supportOutcomeIntents(session) {
  let crossbow;
  if (session.battle.darkness && session.enemyState.crossbowAimed) {
    crossbow = { id: `enemy_${session.turn.round}_crossbow_exit`, unitId: "roof_crossbow", order: 2, kind: "miss", label: "盲射落空", detail: "灯火已灭｜最后一箭没入雨幕", from: "rooftop", to: "rooftop", damage: 0 };
  } else if (session.enemyState.crossbowAimed) {
    crossbow = crossbowIntent(session);
  } else {
    crossbow = { id: `enemy_${session.turn.round}_crossbow_exit`, unitId: "roof_crossbow", order: 2, kind: "withdraw", label: "收弩撤离", detail: "屋脊后撤｜没有形成射击窗口", from: "rooftop", to: "rooftop", damage: 0 };
  }
  const leader = {
    id: `enemy_${session.turn.round}_leader_exit`,
    unitId: "black_leader",
    order: 3,
    kind: "withdraw",
    label: session.pendingOutcome?.outcome === "subdued" ? "弃卒断尾" : "喝令撤走",
    detail: session.pendingOutcome?.outcome === "subdued" ? "活口已失｜头目不再冒险抢回" : "刀客已倒｜头目带人退入巷尾",
    from: "alley_end",
    to: "alley_end",
    damage: 0,
  };
  return [crossbow, leader];
}

export function getCombatLabEnemyIntents(session) {
  if (session.status !== "fighting") return [];
  if (session.pendingOutcome) return supportOutcomeIntents(session);
  if (session.battle.finished) return [];
  return [knifeIntent(session), crossbowIntent(session), leaderIntent(session)];
}

export function getCombatLabBattleBoard(session) {
  const context = getCombatLabContext(session);
  const vitality = getFirstBattleVitality(session.battle, context);
  const intents = getCombatLabEnemyIntents(session);
  const intentByUnit = new Map(intents.map((entry) => [entry.unitId, entry]));
  const unit = (id, name, role, vitality, portrait) => ({
    id,
    name,
    role,
    vitality: vitality ? clone(vitality) : null,
    current: vitality?.current ?? null,
    max: vitality?.max ?? null,
    intent: intentByUnit.get(id)?.label || "已失去行动",
    intentDetail: intentByUnit.get(id)?.detail || "",
    intentOrder: intentByUnit.get(id)?.order || 0,
    portrait,
    nodeId: session.positions[id],
    nodeName: positionName(session.positions[id]),
    distance: distanceLabel(distanceBetween(session.positions.player, session.positions[id])),
    acting: session.turn.phase === "enemy" && session.turn.enemyQueue[session.turn.enemyCursor]?.unitId === id,
    acted: session.turn.actedEnemyIds.includes(id),
  });
  return {
    vitality,
    turn: clone(session.turn),
    intents,
    intent: {
      target: intents[0]?.detail || "雨幕中的身位",
      threat: intents.reduce((total, entry) => total + Number(entry.damage || 0), 0),
      sequence: intents.map((entry) => `${entry.order} · ${entry.label}｜${entry.detail}`),
    },
    objective: session.battle.objective,
    environment: clone(session.battle.environment || []),
    nodes: COMBAT_LAB_POSITION_NODES.map((node) => ({
      ...clone(node),
      playerSelectable: PLAYER_DESTINATIONS.has(node.id),
    })),
    positions: clone(session.positions),
    playerNode: NODE_BY_ID.get(session.positions.player),
    units: [
      unit("night_assailant", "刀客", "当前交锋", vitality.enemy, "./assets/combat/portrait-masked-blade.webp"),
      unit("roof_crossbow", "弩手", "远程威胁", null, "./assets/combat/portrait-roof-crossbow.webp"),
      unit("black_leader", "头目", "后阵指挥", null, "./assets/combat/portrait-black-leader.webp"),
    ],
  };
}

function playerActionText(actionId, rawResult) {
  const tier = rawResult.evaluation?.tier;
  const texts = {
    observe: tier === "failure" ? "你看慢半步，刀客已经抓住空门。" : tier === "costly" ? "你看清左袖藏刃，刀锋也已经追到肋下。" : "你压住抢攻念头，看清真正杀招藏在左袖。",
    extinguish: tier === "failure" ? "银针擦过灯罩，刀客趁势逼近。" : tier === "costly" ? "灯焰虽灭，刀客也借转身空隙追来。" : "针尾扫灭灯焰，弩手的视线随之断开。",
    needle_wrist: tier === "failure" ? "银针被刀背磕偏，左袖反击已经递出。" : tier === "costly" ? "银针封住明刀，左袖仍擦向肋下。" : "银针没入持刀右腕，刀势明显一滞。",
    reckless: tier === "failure" ? "你撞进刀路，却把自己送进左袖短刃的距离。" : "你迎刀抢进，强行撞乱刀客下盘。",
    seal: rawResult.battle.lastResult,
    kill: rawResult.battle.lastResult,
    flee: rawResult.battle.lastResult,
  };
  return texts[actionId] || rawResult.battle.lastResult || "这一手改变了雨中的战局。";
}

function normalizePlayerActionResult(session, actionId, rawResult, startingVitality) {
  const battle = rawResult.battle;
  const rawPlayerDamage = Math.max(0, startingVitality.player - battle.vitality.player.current);
  const finished = ["subdued", "killed", "escaped"].includes(rawResult.outcome);
  const pendingConsequence = !finished && (rawPlayerDamage > 0 || rawResult.wound || rawResult.outcome === "death")
    ? {
      id: `reaction_${session.turn.round}_${session.history.length}_${actionId}`,
      sourceId: "night_assailant",
      actionId,
      damage: rawPlayerDamage,
      wound: rawResult.wound ? clone(rawResult.wound) : null,
      lethal: rawResult.outcome === "death",
      causeId: rawResult.causeId || null,
      cause: rawResult.cause || null,
      memory: rawResult.memory || null,
    }
    : null;
  if (!finished) {
    battle.vitality.player.current = startingVitality.player;
    battle.vitality.player.max = startingVitality.playerMax;
  }
  battle.round = session.turn.round;
  if (!finished) battle.finished = false;
  battle.lastResult = playerActionText(actionId, rawResult);
  const impact = {
    ...(rawResult.impact || {}),
    playerDamage: finished ? rawPlayerDamage : 0,
    playerHp: finished ? battle.vitality.player.current : startingVitality.player,
    playerMaxHp: startingVitality.playerMax,
    enemyDamage: Math.max(0, startingVitality.enemy - battle.vitality.enemy.current),
    enemyHp: battle.vitality.enemy.current,
    enemyMaxHp: battle.vitality.enemy.max,
  };
  return {
    ...rawResult,
    outcome: finished ? rawResult.outcome : "player_action",
    wound: finished ? rawResult.wound || null : null,
    deferredPlayerDamage: rawPlayerDamage,
    pendingConsequence,
    impact,
    battle,
  };
}

function resolveMovementAction(session, action) {
  const next = clone(session);
  const destination = action.objectId;
  const from = next.positions.player;
  next.positions.player = destination;
  next.turn.energy = Math.max(0, next.turn.energy - Number(action.energyCost || 0));
  syncBattleSpatialState(next);
  const text = `你从${positionName(from)}掠至${positionName(destination)}，与刀客变为${distanceLabel(distanceBetween(destination, next.positions.night_assailant))}。`;
  const result = {
    available: true,
    outcome: "player_action",
    intent: "身位",
    evaluation: clone(action.evaluation),
    impact: { playerDamage: 0, enemyDamage: 0, playerHp: next.battle.vitality.player.current, enemyHp: next.battle.vitality.enemy.current },
    battle: next.battle,
    text,
  };
  next.history.push({
    round: next.turn.round,
    phase: "player",
    actionId: action.id,
    intent: "身位",
    energyCost: action.energyCost,
    position: `${positionName(from)}→${positionName(destination)}`,
    outcome: "player_action",
    impact: result.impact,
    text,
  });
  return { available: true, result, session: next };
}

export function resolveCombatLabAction(session, actionId) {
  if (session.status !== "fighting") return { available: false, reason: "这场推演已经落定。" };
  if (session.turn.phase !== "player") return { available: false, reason: "敌方正在行动。" };
  const listed = getCombatLabActions(session).find((entry) => entry.id === actionId);
  if (!listed) return { available: false, reason: "眼下不能这样行动。" };
  if (!listed.evaluation.available) return { available: false, reason: listed.evaluation.reason || "条件不足。" };
  if (actionId.startsWith("move_")) return resolveMovementAction(session, listed);

  const next = clone(session);
  const beforeVitality = getFirstBattleVitality(next.battle, getCombatLabContext(next));
  const startingVitality = {
    player: beforeVitality.player.current,
    playerMax: beforeVitality.player.max,
    enemy: beforeVitality.enemy.current,
  };
  const battleInput = clone(next.battle);
  battleInput.round = next.turn.round;
  battleInput.range = spatialRange(next);
  const raw = resolveFirstBattleAction(actionId, battleInput, getCombatLabContext(next));
  if (!raw?.available) return raw || { available: false, reason: "这一手没有落下。" };
  const result = normalizePlayerActionResult(next, actionId, raw, startingVitality);
  next.battle = result.battle;
  next.turn.energy = Math.max(0, next.turn.energy - Number(listed.energyCost || 0));
  if (actionId === "reckless") next.positions.player = next.positions.night_assailant;
  if (actionId === "extinguish" && next.positions.player === "alley_entrance" && result.evaluation?.tier !== "failure") next.positions.player = "eave_pillar";
  syncBattleSpatialState(next);
  if (result.pendingConsequence) next.pendingConsequences.push(clone(result.pendingConsequence));
  if (result.pendingConsequence?.lethal) next.turn.energy = 0;
  if (result.outcome === "death") result.outcome = "player_action";
  next.history.push({
    round: next.turn.round,
    phase: "player",
    actionId,
    intent: result.intent,
    energyCost: listed.energyCost,
    position: actionPositionPreview(session, actionId),
    outcome: result.outcome,
    rating: result.evaluation?.rating || null,
    check: result.check || null,
    impact: result.impact || null,
    text: result.battle.lastResult || "",
  });

  if (["subdued", "killed", "escaped"].includes(result.outcome)) {
    next.wounds = mergeWound(next.wounds, result.wound);
    next.pendingOutcome = {
      outcome: result.outcome,
      edge: result.edge || null,
      check: result.check || null,
      text: result.battle.lastResult,
    };
    next.turn.energy = 0;
  }
  return { available: true, result, session: next };
}

export function endCombatLabPlayerTurn(session) {
  if (session.status !== "fighting" || session.turn.phase !== "player") return { available: false, reason: "眼下不能收势。" };
  const next = clone(session);
  next.turn.phase = "enemy";
  next.turn.enemyQueue = getCombatLabEnemyIntents(next);
  next.turn.enemyCursor = 0;
  next.turn.actedEnemyIds = [];
  next.turn.energy = 0;
  return { available: true, session: next };
}

function completeEnemyTurn(next) {
  if (next.pendingOutcome) {
    next.status = "finished";
    next.result = clone(next.pendingOutcome);
    next.pendingOutcome = null;
    next.turn.phase = "player";
    next.turn.energy = 0;
    next.turn.enemyQueue = [];
    next.turn.enemyCursor = 0;
    next.turn.actedEnemyIds = [];
    return syncBattleSpatialState(next);
  }
  next.turn.round += 1;
  next.turn.phase = "player";
  next.turn.energy = next.turn.maxEnergy;
  next.turn.enemyQueue = [];
  next.turn.enemyCursor = 0;
  next.turn.actedEnemyIds = [];
  next.battle.round = next.turn.round;
  return syncBattleSpatialState(next);
}

function enemyActionText(action, damage) {
  if (action.unitId === "night_assailant") {
    if (action.kind === "move") return `刀客踏过积水，从${positionName(action.from)}逼到${positionName(action.to)}。`;
    if (action.kind === "reaction") return damage > 0 ? `刀客乘你出手的空隙追来，这一记${action.label}令气血下降${damage}。` : "刀客试图乘隙反击，却没能把刀锋递到实处。";
    return damage > 0 ? `刀客在${positionName(action.to)}递出${action.label}，你的气血下降${damage}。` : "刀客的刀锋没有够到你的身位。";
  }
  if (action.unitId === "roof_crossbow") {
    if (action.kind === "withdraw") return "弩手没有等到射击窗口，收弩退下屋脊。";
    if (action.kind === "aim") return `弩手伏低肩背，锁定你在${positionName(action.targetNode)}的身影。`;
    if (action.kind === "miss") return "弩机轻响，箭矢没入黑暗；灯灭让弩手失去了你的身位。";
    return damage > 1 ? `弩箭穿雨而来，你的气血下降${damage}。` : "弩箭撞上遮挡，只擦去一点气血。";
  }
  if (action.kind === "withdraw") return "头目见刀客已倒，喝令余人断尾撤走。";
  if (action.kind === "charge") return "头目没有抢进，只在巷尾看清你的退路。";
  if (action.kind === "block") return "头目一声短喝，两道人影封住药铺矮墙。";
  return "头目催刀合围，刀客下一击将更重。";
}

function applyEnemyDamage(next, amount, sourceId) {
  const vitality = getFirstBattleVitality(next.battle, getCombatLabContext(next));
  next.battle.vitality = vitality;
  const damage = Math.max(0, Math.min(vitality.player.current, Number(amount || 0)));
  next.battle.vitality.player.current -= damage;
  if (damage >= 3) {
    next.battle.playerWounded = true;
    next.wounds = mergeWound(next.wounds, {
      id: sourceId === "roof_crossbow" ? "crossbow_graze" : "left_rib_cut",
      type: sourceId === "roof_crossbow" ? "pierce" : "cut",
      bodyPart: "torso",
      severity: damage >= 5 ? 2 : 1,
      tags: ["limits_training"],
    });
  }
  return damage;
}

export function resolveCombatLabEnemyAction(session) {
  if (session.status !== "fighting" || session.turn.phase !== "enemy") return { available: false, reason: "敌方尚未行动。" };
  const next = clone(session);
  if (next.turn.enemyCursor >= next.turn.enemyQueue.length) {
    return { available: true, completed: true, session: completeEnemyTurn(next), action: null, impact: null };
  }
  const action = clone(next.turn.enemyQueue[next.turn.enemyCursor]);
  let damage = 0;
  if (action.unitId === "night_assailant") {
    next.positions.night_assailant = action.to;
    damage = applyEnemyDamage(next, action.damage, action.unitId);
    for (const consequence of action.consequences || []) {
      if (consequence.wound) next.wounds = mergeWound(next.wounds, consequence.wound);
    }
    if ((action.consequences || []).some((entry) => entry.wound)) next.battle.playerWounded = true;
    next.enemyState.knifeEmpowered = false;
    next.pendingConsequences = next.pendingConsequences.filter((entry) => entry.sourceId !== action.unitId);
  }
  if (action.unitId === "roof_crossbow") {
    action.targetNode = next.positions.player;
    if (action.kind === "aim") next.enemyState.crossbowAimed = true;
    if (["shoot", "miss", "withdraw"].includes(action.kind)) next.enemyState.crossbowAimed = false;
    if (action.kind === "shoot") damage = applyEnemyDamage(next, action.damage, action.unitId);
  }
  if (action.unitId === "black_leader") {
    if (action.kind === "charge") next.enemyState.leaderCharge += 1;
    if (action.kind === "block") {
      next.enemyState.wallBlocked = true;
      const wall = next.battle.environment.find((entry) => entry.id === "pharmacy_wall");
      if (wall) wall.state = "blocked";
    }
    if (action.kind === "command") next.enemyState.knifeEmpowered = true;
  }
  syncBattleSpatialState(next);
  next.turn.actedEnemyIds.push(action.unitId);
  next.turn.enemyCursor += 1;
  const text = enemyActionText(action, damage);
  const impact = {
    playerDamage: damage,
    enemyDamage: 0,
    playerHp: next.battle.vitality.player.current,
    playerMaxHp: next.battle.vitality.player.max,
    enemyHp: next.battle.vitality.enemy.current,
    enemyMaxHp: next.battle.vitality.enemy.max,
  };
  next.battle.lastResult = text;
  next.history.push({
    round: next.turn.round,
    phase: "enemy",
    actionId: action.id,
    unitId: action.unitId,
    intent: action.label,
    outcome: "enemy_action",
    position: action.from === action.to ? positionName(action.to) : `${positionName(action.from)}→${positionName(action.to)}`,
    impact,
    text,
  });
  if (next.battle.vitality.player.current <= 0) {
    const knifeDeath = action.unitId === "night_assailant";
    next.lives = Math.max(0, next.lives - 1);
    next.status = "death";
    next.pendingOutcome = null;
    const memory = action.memory || (knifeDeath ? "刀客右肩是诱饵，真正杀招藏在左袖；贴身时必须先留应对。" : "屋脊弩手完成瞄准后，下一轮必须取得遮挡或灭灯。");
    if (!next.deathMemory.includes(memory)) next.deathMemory.push(memory);
    next.result = {
      outcome: "death",
      causeId: action.causeId || (knifeDeath ? "left_sleeve_blade" : "roof_crossbow_bolt"),
      cause: action.cause || (knifeDeath ? "左袖短刃在敌方行动阶段贯入肋下，气血顷刻归零。" : "弩箭从屋脊穿雨而下，气血在落地前断绝。"),
      memory,
    };
  }
  return { available: true, completed: false, action, impact, text, session: next };
}

export function rewindCombatLabDeath(session) {
  if (session.status !== "death" || session.lives <= 0) return { available: false, reason: "命灯已经无法把这一战拉回原处。" };
  const learnedFacts = unique([
    ...session.setup.knownFacts,
    ...(session.battle?.knownFacts || []),
    session.result?.causeId === "left_sleeve_blade" ? "left_sleeve_blade" : null,
  ]);
  const next = createCombatLabSession({ ...clone(session.setup), knownFacts: learnedFacts, lives: session.lives });
  next.deathMemory = clone(session.deathMemory);
  next.history = [...clone(session.history), {
    round: 0,
    phase: "rewind",
    actionId: "rewind",
    intent: "回照",
    outcome: "rewound",
    rating: null,
    check: null,
    text: "命灯把雨夜拉回刀客现身之前，死中见闻仍在。",
  }];
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
