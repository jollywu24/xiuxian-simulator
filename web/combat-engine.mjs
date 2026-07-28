import { rollCausalDie } from "./wudao-p0-core.mjs?v=20260728.5";
import {
  actionTargetValue,
  applyDamageReduction,
  calculateDamageRange,
  damageForTier,
} from "./character-system.mjs?v=20260728.5";

export const COMBAT_MAX_ENERGY = 3;

export const COMBAT_STAGE_ORDER = Object.freeze({
  mortal: 0,
  body: 1,
  breath: 2,
  qi: 2,
  meridian: 3,
  master: 4,
});

const MASTERY_ORDER = Object.freeze({
  unknown: -1,
  known: -1,
  learned: 0,
  entered: 0,
  skilled: 1,
  mastered: 2,
});

const RATING_LABELS = Object.freeze({
  safe: "条件占优",
  viable: "条件相持",
  dangerous: "条件不利",
  fatal: "已知死局",
  locked: "不可用",
});

const TIER_LABELS = Object.freeze({
  great: "大成",
  success: "得手",
  costly: "得手有损",
  failure: "失手",
});

const ATTRIBUTE_LABELS = Object.freeze({
  constitution: "根骨",
  insight: "悟性",
  agility: "身法",
  strength: "力道",
  fortune: "福缘",
});

function clone(value) {
  return structuredClone(value);
}

function mergeRecords(base = {}, override = {}) {
  const result = clone(base || {});
  for (const [id, value] of Object.entries(override || {})) {
    const previous = result[id];
    result[id] = value && previous
      && typeof value === "object" && !Array.isArray(value)
      && typeof previous === "object" && !Array.isArray(previous)
      ? { ...previous, ...clone(value) }
      : clone(value);
  }
  return result;
}

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function stageIndex(stageId) {
  return Number(COMBAT_STAGE_ORDER[stageId] ?? 0);
}

function skillStage(skill) {
  if (typeof skill === "string") return skill;
  return skill?.stage || "unknown";
}

function skillMastery(skill) {
  const stage = skillStage(skill);
  const rank = Number(MASTERY_ORDER[stage] ?? -1);
  return {
    available: rank >= 0,
    rank,
    bonus: Math.max(0, rank),
    stage,
  };
}

function getStage(definition, state) {
  return definition.stages.find((entry) => entry.id === state.battle.stageId) || definition.stages[0];
}

function stageNodes(definition, state) {
  const stage = getStage(definition, state);
  const allowed = new Set(stage.nodeIds || definition.nodes.map((node) => node.id));
  return definition.nodes.filter((node) => allowed.has(node.id));
}

function stageEdges(definition, state) {
  const allowed = new Set(stageNodes(definition, state).map((node) => node.id));
  return Object.fromEntries(
    Object.entries(definition.edges || {})
      .filter(([id]) => allowed.has(id))
      .map(([id, neighbors]) => [id, neighbors.filter((neighbor) => allowed.has(neighbor))]),
  );
}

export function getBattlePath(state, definition, from, to) {
  const edges = stageEdges(definition, state);
  if (!from || !to || !edges[from] || !edges[to]) return [];
  if (from === to) return [from];
  const queue = [[from]];
  const visited = new Set([from]);
  while (queue.length) {
    const path = queue.shift();
    const current = path.at(-1);
    for (const neighbor of edges[current] || []) {
      if (visited.has(neighbor)) continue;
      const next = [...path, neighbor];
      if (neighbor === to) return next;
      visited.add(neighbor);
      queue.push(next);
    }
  }
  return [];
}

export function getBattleDistance(state, definition, from, to) {
  const path = getBattlePath(state, definition, from, to);
  return path.length ? path.length - 1 : 99;
}

function distanceLabel(distance) {
  if (distance <= 0) return "贴身";
  if (distance <= 2) return "适中";
  return "远离";
}

function nodeName(state, definition, nodeId) {
  return stageNodes(definition, state).find((entry) => entry.id === nodeId)?.shortName || "未知身位";
}

function participant(state, participantId) {
  if (participantId === "player") return state.battle.participants.player;
  return state.battle.participants.enemies[participantId]
    || state.battle.participants.allies[participantId]
    || null;
}

function activeEnemies(state) {
  return Object.values(state.battle.participants.enemies).filter((entry) => entry.active && !entry.defeated && entry.current > 0);
}

function contextFor(state, context = {}) {
  return {
    ...clone(state.setup || {}),
    ...clone(context || {}),
    attributes: {
      ...(state.setup?.attributes || {}),
      ...(context.attributes || {}),
    },
    skills: mergeRecords(state.setup?.skills, context.skills),
    relationships: mergeRecords(state.battle.ledger?.relationships, context.relationships),
    wounds: clone(state.wounds || []),
    knownFacts: unique([
      ...(state.setup?.knownFacts || []),
      ...(state.battle?.knownFacts || []),
      ...(context.knownFacts || []),
    ]),
  };
}

function maximumVitality(setup, wounds = []) {
  if (Number.isFinite(Number(setup.combatStats?.maxHealth))) return Math.max(1, Number(setup.combatStats.maxHealth));
  const constitution = Number(setup.attributes?.constitution || 0);
  const base = 12 + constitution * 2 + stageIndex(setup.playerStage || "mortal") * 4;
  const injuryLoss = wounds.reduce((total, wound) => total + Math.max(0, Number(wound.severity || 0)) * 2, 0);
  return Math.max(1, base - injuryLoss);
}

function normalizeSetup(definition, context = {}) {
  const defaults = clone(definition.defaults || {});
  return {
    ...defaults,
    ...clone(context),
    attributes: {
      ...(defaults.attributes || {}),
      ...(context.attributes || {}),
    },
    skills: mergeRecords(defaults.skills, context.skills),
    knownFacts: unique([...(defaults.knownFacts || []), ...(context.knownFacts || [])]),
    wounds: clone(context.wounds || defaults.wounds || []),
    lives: Math.max(0, Math.min(2, Number(context.lives ?? defaults.lives ?? 2))),
    relationships: mergeRecords(defaults.relationships, context.relationships),
    items: {
      ...(defaults.items || {}),
      ...(context.items || {}),
    },
  };
}

function initialLedger(setup, context = {}) {
  return {
    relationships: mergeRecords(setup.relationships, context.campaign?.relationships),
    evidence: unique(context.campaign?.evidence || []),
    alert: Math.max(0, Number(context.campaign?.alert || 0)),
    outcomes: clone(context.campaign?.outcomes || []),
    contacts: unique(context.campaign?.contacts || []),
  };
}

function createParticipants(definition, setup) {
  const maximum = maximumVitality(setup, setup.wounds);
  const player = {
    id: "player",
    name: definition.player?.name || "陈司命",
    side: "player",
    stageId: setup.playerStage || "mortal",
    current: Math.max(0, Math.min(maximum, Number(setup.combatStats?.health ?? maximum))),
    max: maximum,
    qi: Math.max(0, Math.min(Number(setup.combatStats?.maxQi || 0), Number(setup.combatStats?.qi ?? setup.combatStats?.maxQi ?? 0))),
    maxQi: Math.max(0, Number(setup.combatStats?.maxQi || 0)),
    defense: Math.max(0, Number(setup.combatStats?.defense || 0)),
    reduction: Math.max(0, Number(setup.combatStats?.reduction || 0)),
    statuses: [],
    wounds: clone(setup.wounds),
  };
  const enemies = {};
  const allies = {};
  for (const entry of definition.participants || []) {
    const target = entry.side === "ally" ? allies : enemies;
    target[entry.id] = {
      ...clone(entry),
      current: Number(entry.current ?? entry.max ?? 1),
      max: Number(entry.max ?? entry.current ?? 1),
      defense: Math.max(0, Number(entry.defense || 0)),
      reduction: Math.max(0, Number(entry.reduction || 0)),
      statuses: clone(entry.statuses || []),
      wounds: clone(entry.wounds || []),
      active: false,
      seen: false,
      defeated: false,
    };
  }
  return { player, enemies, allies };
}

function activateStageParticipants(state, definition, stage) {
  const activeEnemies = new Set(stage.activeEnemyIds || []);
  const activeAllies = new Set(stage.activeAllyIds || []);
  for (const entry of Object.values(state.battle.participants.enemies)) {
    entry.active = activeEnemies.has(entry.id) && !entry.defeated && entry.current > 0;
    if (entry.active) entry.seen = true;
  }
  for (const entry of Object.values(state.battle.participants.allies)) {
    entry.active = activeAllies.has(entry.id) && !entry.defeated && entry.current > 0;
    if (entry.active) entry.seen = true;
  }
}

function stagePositions(definition, stage) {
  return clone(stage.positions || definition.positions || {});
}

function stageEnvironment(definition, stage) {
  const stageIds = new Set(stage.environmentIds || []);
  return definition.environment
    .filter((entry) => !stageIds.size || stageIds.has(entry.id))
    .map((entry) => clone(entry));
}

export function createBattle(definition, context = {}) {
  if (!definition?.id || !Array.isArray(definition.stages) || !definition.stages.length) {
    throw new Error("战斗定义缺少稳定ID或阶段。");
  }
  const setup = normalizeSetup(definition, context);
  const firstStage = definition.stages[0];
  const state = {
    engine: "dayao-combat-v1",
    encounterId: definition.id,
    setup,
    lives: setup.lives,
    status: "fighting",
    result: null,
    pendingOutcome: null,
    turn: {
      round: 1,
      stageRound: 1,
      phase: "player",
      energy: Number(definition.maxEnergy || COMBAT_MAX_ENERGY),
      maxEnergy: Number(definition.maxEnergy || COMBAT_MAX_ENERGY),
      enemyQueue: [],
      enemyCursor: 0,
      actedEnemyIds: [],
    },
    positions: stagePositions(definition, firstStage),
    wounds: clone(setup.wounds),
    deathMemory: clone(context.deathMemory || []),
    deathRecords: clone(context.deathRecords || []),
    history: [],
    battle: {
      id: definition.id,
      stageId: firstStage.id,
      stageIndex: 0,
      objective: firstStage.objective || definition.objective,
      knownFacts: clone(setup.knownFacts),
      conditions: clone(firstStage.conditions || {}),
      environment: stageEnvironment(definition, firstStage),
      participants: createParticipants(definition, setup),
      ledger: initialLedger(setup, context),
      lastResult: firstStage.entryText || definition.entryText || null,
      fortuneOpportunity: Boolean(definition.createFortuneOpportunity?.(setup)),
    },
    checkpoint: {
      setup: clone(setup),
      campaign: clone(context.campaign || null),
    },
  };
  activateStageParticipants(state, definition, firstStage);
  return state;
}

function stageModifier(playerStage, enemyStage, ignoreStage = false) {
  if (ignoreStage || !enemyStage) return { value: 0, label: null, blocked: false };
  const difference = stageIndex(playerStage) - stageIndex(enemyStage);
  if (difference <= -3) return { value: -4, label: "境界相差三重以上", blocked: true };
  if (difference <= -2) return { value: -4, label: "境界低两重 -4", blocked: false };
  if (difference === -1) return { value: -2, label: "境界低一重 -2", blocked: false };
  if (difference >= 1) return { value: 2, label: "境界高一重以上 +2", blocked: false };
  return { value: 0, label: "双方同境", blocked: false };
}

function actionBodyParts(action) {
  if (Array.isArray(action.bodyParts)) return action.bodyParts;
  if (action.attribute === "agility") return ["leg"];
  if (action.attribute === "strength") return ["arm", "shoulder", "torso"];
  if (action.skillId) return ["arm", "shoulder"];
  return [];
}

function woundPenalty(action, wounds) {
  const bodyParts = new Set(actionBodyParts(action));
  const relevant = wounds.filter((wound) => bodyParts.has(wound.bodyPart));
  const severity = Math.max(0, ...relevant.map((wound) => Number(wound.severity || 0)));
  return {
    severity,
    penalty: severity >= 2 ? 2 : severity === 1 ? 1 : 0,
    blocked: Boolean(action.requiresHealthy && severity >= 2),
  };
}

function asReasons(value) {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function actionDefinition(definition, actionId) {
  return definition.actions.find((entry) => entry.id === actionId) || null;
}

function qiBoostDefinition(definition, actionId) {
  if (!String(actionId).endsWith("__qi")) return null;
  const baseId = String(actionId).slice(0, -4);
  const base = actionDefinition(definition, baseId);
  if (!base?.qiBoost || !base.formulaDamage) return null;
  const cost = Math.max(1, Number(base.qiBoost.cost || 1));
  const power = Math.max(1, Number(base.qiBoost.power || 2));
  return {
    ...base,
    id: actionId,
    title: `运气·${base.title}`,
    description: `${base.description} 运转${cost}点真气，把这一式的威力再推高一层。`,
    qiCost: cost,
    qiPower: power,
    successPreview: `${base.successPreview || "招式得手"} · 真气强化`,
    recommendationWeight: Number(base.recommendationWeight || 0) + 2,
  };
}

function movementDefinition(state, definition, actionId) {
  if (!String(actionId).startsWith("move_")) return null;
  const destination = String(actionId).slice(5);
  const node = stageNodes(definition, state).find((entry) => entry.id === destination && entry.playerSelectable !== false);
  if (!node || destination === state.positions.player) return null;
  const path = getBattlePath(state, definition, state.positions.player, destination);
  if (!path.length) return null;
  const primary = activeEnemies(state).find((entry) => entry.primary) || activeEnemies(state)[0];
  const engaged = primary && getBattleDistance(state, definition, state.positions.player, state.positions[primary.id]) === 0;
  const cost = path.length - 1 + (engaged ? 1 : 0);
  return {
    id: actionId,
    type: "move",
    verb: "换位",
    objectId: destination,
    objectName: node.name,
    title: `移向${node.shortName}`,
    description: `沿${path.map((id) => nodeName(state, definition, id)).join("→")}换位。`,
    intent: "身位",
    focusIds: [`position:${destination}`],
    attribute: "agility",
    difficulty: node.movementDifficulty ?? 1,
    energyCost: cost,
    recommendationWeight: Number(node.recommendationWeight || 0),
    ignoreStage: true,
    bodyParts: ["leg"],
    successPreview: node.type === "cover" ? "取得遮挡并改变追击路线" : "改变与敌人的距离",
    riskPreview: node.type === "wet" ? "湿石换位处于不利，失手会失衡" : "敌人会按新身位兑现意图",
    advantages: (current, context) => {
      const skill = skillMastery(context.skills?.fish_leap_art);
      return node.type === "water" && skill.available ? "鱼跃龙门诀熟悉水势" : null;
    },
    disadvantages: (current) => node.type === "wet" && !current.battle.conditions.steadyFooting ? "湿石落脚不稳" : null,
    outcomes: {
      great: { text: `你借势抢到${node.shortName}，没有给敌人截步的机会。`, effects: [{ type: "move", targetId: "player", to: destination }] },
      success: { text: `你换到${node.shortName}，重新拉开身位。`, effects: [{ type: "move", targetId: "player", to: destination }] },
      costly: { text: `你勉强踏到${node.shortName}，腿侧也在湿石上扭伤。`, effects: [{ type: "move", targetId: "player", to: destination }, { type: "wound", targetId: "player", wound: { id: `movement_${destination}_leg`, type: "strain", bodyPart: "leg", severity: 1, tags: ["limits_travel"] } }] },
      failure: { text: "脚下湿滑让你没能换开身位，敌人已经逼近。", effects: [{ type: "status", targetId: "player", status: { id: "off_balance", label: "失衡", duration: 1 } }] },
    },
  };
}

function internalAction(state, definition, actionId) {
  return actionDefinition(definition, actionId) || qiBoostDefinition(definition, actionId) || movementDefinition(state, definition, actionId);
}

function allowedInStage(action, stageId) {
  return !Array.isArray(action.stageIds) || action.stageIds.includes(stageId);
}

function publicAction(action) {
  const {
    availableWhen,
    advantages,
    disadvantages,
    outcomes,
    resolve,
    fatalWhen,
    knownFatalWhen,
    recommend,
    ...publicFields
  } = action;
  return clone(publicFields);
}

function stableConditions(conditions) {
  return Object.entries(conditions || {})
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${String(value)}`)
    .join(",");
}

function causalKey(state, action, context) {
  const causalActionId = String(action.id || "").replace(/__qi$/, "");
  const wounds = (state.wounds || [])
    .map((wound) => `${wound.id}:${wound.bodyPart}:${wound.severity}:${Number(Boolean(wound.stabilized))}`)
    .sort()
    .join(",");
  const skills = Object.entries(context.skills || {})
    .map(([id, skill]) => `${id}:${skillStage(skill)}`)
    .sort()
    .join(",");
  const attributes = Object.entries(context.attributes || {})
    .map(([id, value]) => `${id}:${Number(value || 0)}`)
    .sort()
    .join(",");
  return [
    state.encounterId,
    state.battle.stageId,
    `round-${state.turn.round}`,
    `stage-round-${state.turn.stageRound}`,
    causalActionId,
    `positions-${stableConditions(state.positions)}`,
    `conditions-${stableConditions(state.battle.conditions)}`,
    `facts-${unique(context.knownFacts).sort().join(",")}`,
    `attributes-${attributes}`,
    `stage-${context.playerStage || "mortal"}`,
    `skills-${skills}`,
    `wounds-${wounds}`,
  ].join("|");
}

function forwardOutcomeCount(modifier, target) {
  const minimumRoll = target - modifier;
  if (minimumRoll <= 1) return 10;
  if (minimumRoll > 10) return 0;
  return 11 - minimumRoll;
}

function resolvedTier(roll, modifier, target, greatTarget) {
  const total = roll + modifier;
  if (total >= greatTarget) return { tier: "great", total };
  if (total >= target) return { tier: "success", total };
  if (total === target - 1) return { tier: "costly", total };
  return { tier: "failure", total };
}

export function evaluateCombatAction(state, actionOrId, definition, suppliedContext = {}) {
  const action = typeof actionOrId === "string" ? internalAction(state, definition, actionOrId) : actionOrId;
  if (!action) return { available: false, reason: "没有这个行动。", rating: "locked", ratingLabel: RATING_LABELS.locked };
  if (state.status !== "fighting" || state.pendingOutcome) return { available: false, reason: "这一战正在收束。", rating: "locked", ratingLabel: RATING_LABELS.locked };
  if (state.turn.phase !== "player") return { available: false, reason: "敌方正在行动。", rating: "locked", ratingLabel: RATING_LABELS.locked };
  if (!allowedInStage(action, state.battle.stageId)) return { available: false, reason: "这个行动不属于眼前战局。", rating: "locked", ratingLabel: RATING_LABELS.locked };
  const energyCost = Math.max(0, Number(action.energyCost ?? 1));
  if (energyCost > state.turn.energy) return { available: false, reason: `行动不足：需要${energyCost}点。`, rating: "locked", ratingLabel: RATING_LABELS.locked };
  const qiCost = Math.max(0, Number(action.qiCost || 0));
  if (qiCost > Number(state.battle.participants.player.qi || 0)) {
    return { available: false, reason: `真气不足：需要${qiCost}点。`, rating: "locked", ratingLabel: RATING_LABELS.locked };
  }
  const context = contextFor(state, suppliedContext);
  const availability = action.availableWhen?.(state, context);
  if (availability === false || typeof availability === "string") {
    return { available: false, reason: typeof availability === "string" ? availability : "当前条件不足。", rating: "locked", ratingLabel: RATING_LABELS.locked };
  }
  const martialRequirement = action.skillId ? context.martialRequirements?.[action.skillId] : null;
  if (martialRequirement) {
    return { available: false, reason: martialRequirement, rating: "locked", ratingLabel: RATING_LABELS.locked };
  }
  const mastery = action.skillId ? skillMastery(context.skills?.[action.skillId]) : { available: true, rank: 0, bonus: 0, stage: null };
  const requiredMastery = Number(MASTERY_ORDER[action.masteryRequired || "learned"] ?? 0);
  if (action.skillId && (!mastery.available || mastery.rank < requiredMastery)) {
    return { available: false, reason: `尚未真正掌握${action.skillName || "这门武学"}。`, rating: "locked", ratingLabel: RATING_LABELS.locked };
  }
  const target = action.targetId ? participant(state, action.targetId) : activeEnemies(state).find((entry) => entry.primary) || activeEnemies(state)[0];
  const stage = stageModifier(context.playerStage || "mortal", target?.stageId, action.ignoreStage);
  const nonConfrontational = ["识招", "借势", "脱身", "护人", "同伴", "疗伤", "改命", "身位"].includes(action.intent);
  if (stage.blocked && !nonConfrontational) {
    return { available: false, reason: "境界相差太远，只能观察、借势、护人或脱身。", rating: "locked", ratingLabel: RATING_LABELS.locked };
  }
  const injury = woundPenalty(action, state.wounds || []);
  if (injury.blocked) return { available: false, reason: "相关部位重伤，无法完整发力。", rating: "locked", ratingLabel: RATING_LABELS.locked };
  if (!action.attribute) {
    return {
      available: true,
      rating: "safe",
      ratingLabel: RATING_LABELS.safe,
      previewTier: "success",
      reasons: ["无需正面较量"],
      score: Number(action.modifier || 0),
      difficulty: Number(action.difficulty || 0),
      attribute: null,
      skillId: action.skillId || null,
      energyCost,
      check: null,
      action: publicAction(action),
    };
  }
  const advantages = asReasons(action.advantages?.(state, context));
  const disadvantages = asReasons(action.disadvantages?.(state, context));
  const alreadyOutnumbered = disadvantages.some((reason) => /夹击|多人/.test(reason));
  if (action.directCombat && !alreadyOutnumbered && activeEnemies(state).length > 1 && !state.battle.conditions.allyEngaged && !state.battle.conditions.chokePoint) {
    disadvantages.push("多人夹击");
  }
  const attributeValue = Number(context.attributes?.[action.attribute] || 0);
  const score = attributeValue
    + mastery.bonus
    + stage.value
    + (advantages.length ? 2 : 0)
    - (disadvantages.length ? 2 : 0)
    - injury.penalty
    + Number(action.modifier || 0);
  const targetDefense = action.directCombat && !action.ignoreDefense ? Number(target?.defense || 0) : 0;
  const targetValue = actionTargetValue(action.difficulty, targetDefense);
  const greatTarget = targetValue + 3;
  const forwardCount = forwardOutcomeCount(score, targetValue);
  let rating = forwardCount >= 8 ? "safe" : forwardCount >= 5 ? "viable" : "dangerous";
  const fatal = Boolean(action.fatalWhen?.(state, context));
  const knownFatal = fatal && Boolean(action.knownFatalWhen?.(state, context));
  if (knownFatal) rating = "fatal";
  const previewRoll = Math.max(1, Math.min(10, 6));
  const previewTier = fatal ? "failure" : resolvedTier(previewRoll, score, targetValue, greatTarget).tier;
  const reasons = [`${ATTRIBUTE_LABELS[action.attribute] || action.attribute} ${attributeValue}`];
  if (action.skillId) reasons.push(`${action.skillName || action.skillId}${mastery.bonus ? ` +${mastery.bonus}` : " 入门"}`);
  if (stage.label) reasons.push(stage.label);
  if (advantages.length) reasons.push(`${advantages[0]}：有利`);
  if (disadvantages.length) reasons.push(`${disadvantages[0]}：不利`);
  if (injury.penalty) reasons.push(`相关伤势 -${injury.penalty}`);
  if (action.modifier) reasons.push(`行动修正 ${Number(action.modifier) > 0 ? "+" : ""}${Number(action.modifier)}`);
  if (targetDefense) reasons.push(`目标防御 +${targetDefense}`);
  if (qiCost) reasons.push(`真气 ${qiCost} · 威力 +${Number(action.qiPower || 0)}`);
  return {
    available: true,
    rating,
    ratingLabel: RATING_LABELS[rating],
    previewTier,
    reasons,
    score,
    difficulty: Number(action.difficulty || 0),
    attribute: action.attribute,
    skillId: action.skillId || null,
    advantage: Boolean(advantages.length),
    disadvantage: Boolean(disadvantages.length),
    advantageReasons: advantages,
    disadvantageReasons: disadvantages,
    woundPenalty: injury.penalty,
    energyCost,
    qiCost,
    check: {
      die: "1D10",
      modifier: score,
      target: targetValue,
      greatTarget,
      forwardCount,
      causalKey: causalKey(state, action, context),
    },
    action: publicAction(action),
  };
}

function mergeWoundList(wounds, wound) {
  const next = clone(wounds || []);
  const existing = next.find((entry) => entry.id === wound.id);
  if (existing) {
    existing.severity = Math.max(Number(existing.severity || 0), Number(wound.severity || 0));
    existing.tags = unique([...(existing.tags || []), ...(wound.tags || [])]);
    if (wound.countdown != null) existing.countdown = Math.min(Number(existing.countdown ?? wound.countdown), Number(wound.countdown));
    if (wound.stabilized != null) existing.stabilized = Boolean(wound.stabilized);
  } else {
    next.push({
      ...clone(wound),
      countdown: Number(wound.severity || 0) >= 3 ? Number(wound.countdown ?? 1) : wound.countdown,
      stabilized: Boolean(wound.stabilized),
    });
  }
  return next;
}

export function applyWound(state, actorId, wound) {
  const next = clone(state);
  if (!wound) return next;
  if (actorId === "player") {
    next.wounds = mergeWoundList(next.wounds, wound);
    next.battle.participants.player.wounds = clone(next.wounds);
    return next;
  }
  const actor = participant(next, actorId);
  if (actor) actor.wounds = mergeWoundList(actor.wounds, wound);
  return next;
}

function addStatus(actor, status) {
  if (!actor || !status) return;
  const existing = actor.statuses.find((entry) => entry.id === status.id);
  if (existing) {
    existing.duration = Math.max(Number(existing.duration || 0), Number(status.duration || 0));
    existing.potency = Math.max(Number(existing.potency || 0), Number(status.potency || 0));
    existing.tickDamage = Math.max(Number(existing.tickDamage || 0), Number(status.tickDamage || 0));
  } else {
    actor.statuses.push(clone(status));
  }
}

function removeStatus(actor, statusId) {
  if (!actor) return;
  actor.statuses = actor.statuses.filter((entry) => entry.id !== statusId);
}

function applyDamage(state, actorId, amount, floor = 0) {
  const actor = participant(state, actorId);
  if (!actor) return 0;
  const damage = Math.max(0, Math.min(actor.current - Math.max(0, floor), Number(amount || 0)));
  actor.current = Math.max(Math.max(0, floor), actor.current - damage);
  if (actorId !== "player" && actor.current <= 0) {
    actor.defeated = true;
    actor.active = false;
  }
  return damage;
}

function applyHeal(state, actorId, amount) {
  const actor = participant(state, actorId);
  if (!actor) return 0;
  const before = actor.current;
  actor.current = Math.min(actor.max, actor.current + Math.max(0, Number(amount || 0)));
  return actor.current - before;
}

function setNestedRelation(ledger, relationId, field, amount) {
  const current = ledger.relationships[relationId] || {};
  ledger.relationships[relationId] = {
    ...current,
    [field]: Number(current[field] || 0) + Number(amount || 0),
  };
}

function reallocateAttribute(setup, targetAttribute) {
  const attributes = setup.attributes || {};
  const source = Object.entries(attributes)
    .filter(([id, value]) => id !== targetAttribute && Number(value || 0) > 0)
    .sort((a, b) => Number(b[1]) - Number(a[1]) || a[0].localeCompare(b[0]))[0];
  if (!source) return false;
  attributes[source[0]] = Number(attributes[source[0]]) - 1;
  attributes[targetAttribute] = Number(attributes[targetAttribute] || 0) + 1;
  return true;
}

function applyEffects(state, effects = []) {
  const impact = {
    rawDamage: 0,
    preventedDamage: 0,
    playerDamage: 0,
    playerHealing: 0,
    enemyDamage: 0,
    enemyDamageById: {},
    allyDamage: 0,
    wounds: [],
    statuses: [],
  };
  for (const effect of effects || []) {
    if (!effect) continue;
    if (effect.type === "damage") {
      const target = participant(state, effect.targetId);
      const reduced = effect.ignoreReduction
        ? { raw: Math.max(0, Number(effect.amount || 0)), final: Math.max(0, Number(effect.amount || 0)), prevented: 0 }
        : applyDamageReduction(effect.amount, target?.reduction || 0, effect.penetration || 0);
      const damage = applyDamage(state, effect.targetId, reduced.final, effect.floor || 0);
      impact.rawDamage += reduced.raw;
      impact.preventedDamage += reduced.prevented;
      if (effect.targetId === "player") impact.playerDamage += damage;
      else if (state.battle.participants.enemies[effect.targetId]) {
        impact.enemyDamage += damage;
        impact.enemyDamageById[effect.targetId] = Number(impact.enemyDamageById[effect.targetId] || 0) + damage;
      } else impact.allyDamage += damage;
    }
    if (effect.type === "heal") {
      const healing = applyHeal(state, effect.targetId, effect.amount);
      if (effect.targetId === "player") impact.playerHealing += healing;
    }
    if (effect.type === "wound") {
      if (effect.targetId === "player") {
        state.wounds = mergeWoundList(state.wounds, effect.wound);
        state.battle.participants.player.wounds = clone(state.wounds);
      } else {
        const actor = participant(state, effect.targetId);
        if (actor) actor.wounds = mergeWoundList(actor.wounds, effect.wound);
      }
      impact.wounds.push(clone(effect.wound));
    }
    if (effect.type === "healWound") {
      if (effect.targetId === "player") {
        state.wounds = state.wounds.filter((entry) => entry.id !== effect.woundId);
        state.battle.participants.player.wounds = clone(state.wounds);
      } else {
        const actor = participant(state, effect.targetId);
        if (actor) actor.wounds = actor.wounds.filter((entry) => entry.id !== effect.woundId);
      }
    }
    if (effect.type === "stabilizeWounds") {
      for (const wound of state.wounds) if (Number(wound.severity || 0) >= 3) wound.stabilized = true;
      state.battle.participants.player.wounds = clone(state.wounds);
    }
    if (effect.type === "status") {
      addStatus(participant(state, effect.targetId), effect.status);
      impact.statuses.push(clone(effect.status));
    }
    if (effect.type === "removeStatus") removeStatus(participant(state, effect.targetId), effect.statusId);
    if (effect.type === "move") state.positions[effect.targetId] = effect.to;
    if (effect.type === "condition") state.battle.conditions[effect.key] = clone(effect.value);
    if (effect.type === "increment") state.battle.conditions[effect.key] = Number(state.battle.conditions[effect.key] || 0) + Number(effect.amount || 1);
    if (effect.type === "fact") state.battle.knownFacts = unique([...state.battle.knownFacts, effect.factId]);
    if (effect.type === "environment") {
      const target = state.battle.environment.find((entry) => entry.id === effect.environmentId);
      if (target) target.state = effect.state;
    }
    if (effect.type === "relationship") setNestedRelation(state.battle.ledger, effect.relationId, effect.field, effect.amount);
    if (effect.type === "evidence") state.battle.ledger.evidence = unique([...state.battle.ledger.evidence, effect.evidenceId]);
    if (effect.type === "alert") state.battle.ledger.alert = Math.max(0, Number(state.battle.ledger.alert || 0) + Number(effect.amount || 0));
    if (effect.type === "contact") state.battle.ledger.contacts = unique([...state.battle.ledger.contacts, effect.contactId]);
    if (effect.type === "item") state.setup.items[effect.itemId] = Math.max(0, Number(state.setup.items[effect.itemId] || 0) + Number(effect.amount || 0));
    if (effect.type === "reallocate") reallocateAttribute(state.setup, effect.to);
    if (effect.type === "activate") {
      const actor = participant(state, effect.targetId);
      if (actor && !actor.defeated) {
        actor.active = true;
        actor.seen = true;
      }
    }
    if (effect.type === "deactivate") {
      const actor = participant(state, effect.targetId);
      if (actor) actor.active = false;
    }
  }
  return impact;
}

function effectsForCombatFormula(action, tier, outcome, state, context) {
  const effects = clone(outcome?.effects || []);
  if (!action.formulaDamage || !action.targetId) return { effects, range: null, damage: null };
  const range = calculateDamageRange({
    attributes: context.attributes,
    stageId: context.playerStage,
    equipment: context.equipment,
    kind: action.formulaDamage.kind || "melee",
    techniquePower: Number(action.formulaDamage.techniquePower || 0),
    qiBoost: Number(action.qiPower || 0),
    weapon: action.formulaDamage.weapon || null,
  });
  const damage = damageForTier(range, tier);
  const existingIndex = effects.findIndex((effect) => effect?.type === "damage" && effect.targetId === action.targetId);
  if (damage > 0) {
    const formulaEffect = {
      type: "damage",
      targetId: action.targetId,
      amount: damage,
      penetration: Number(action.formulaDamage.penetration ?? range.penetration ?? 0),
      floor: existingIndex >= 0 ? Number(effects[existingIndex].floor || 0) : 0,
    };
    if (existingIndex >= 0) effects[existingIndex] = formulaEffect;
    else effects.unshift(formulaEffect);
  } else if (existingIndex >= 0) {
    effects.splice(existingIndex, 1);
  }
  return { effects, range, damage };
}

function outcomeFor(action, tier, state, context) {
  if (typeof action.resolve === "function") return action.resolve(state, tier, context);
  return clone(action.outcomes?.[tier] || action.outcomes?.failure || { text: "这一手没有改变战局。", effects: [] });
}

function mergeImpact(first, second) {
  return {
    rawDamage: Number(first?.rawDamage || 0) + Number(second?.rawDamage || 0),
    preventedDamage: Number(first?.preventedDamage || 0) + Number(second?.preventedDamage || 0),
    playerDamage: Number(first?.playerDamage || 0) + Number(second?.playerDamage || 0),
    playerHealing: Number(first?.playerHealing || 0) + Number(second?.playerHealing || 0),
    enemyDamage: Number(first?.enemyDamage || 0) + Number(second?.enemyDamage || 0),
    enemyDamageById: { ...(first?.enemyDamageById || {}) },
    allyDamage: Number(first?.allyDamage || 0) + Number(second?.allyDamage || 0),
    wounds: [...(first?.wounds || []), ...(second?.wounds || [])],
    statuses: [...(first?.statuses || []), ...(second?.statuses || [])],
  };
}

function transitionToStage(state, definition, stageId, text = null) {
  const index = definition.stages.findIndex((entry) => entry.id === stageId);
  if (index < 0 || state.battle.stageId === stageId) return false;
  const stage = definition.stages[index];
  state.battle.stageId = stage.id;
  state.battle.stageIndex = index;
  state.battle.objective = stage.objective || definition.objective;
  state.battle.conditions = {
    ...state.battle.conditions,
    ...(clone(stage.conditions || {})),
  };
  state.battle.environment = stageEnvironment(definition, stage);
  state.positions = stagePositions(definition, stage);
  activateStageParticipants(state, definition, stage);
  state.turn.stageRound = 1;
  state.turn.phase = "player";
  state.turn.energy = state.turn.maxEnergy;
  state.turn.enemyQueue = [];
  state.turn.enemyCursor = 0;
  state.turn.actedEnemyIds = [];
  state.battle.lastResult = text || stage.entryText || state.battle.lastResult;
  state.history.push({
    round: state.turn.round,
    stageId: stage.id,
    phase: "transition",
    actionId: `enter_${stage.id}`,
    intent: "战局转折",
    text: state.battle.lastResult,
  });
  return true;
}

function maybeTransition(state, definition, trigger) {
  const transition = definition.nextStage?.(state, trigger);
  if (!transition) return false;
  if (typeof transition === "string") return transitionToStage(state, definition, transition);
  return transitionToStage(state, definition, transition.stageId, transition.text);
}

function buildConsequences(state, definition, outcome) {
  const base = {
    wounds: clone(state.wounds),
    relationships: clone(state.battle.ledger.relationships),
    evidence: clone(state.battle.ledger.evidence),
    alert: Number(state.battle.ledger.alert || 0),
    contacts: clone(state.battle.ledger.contacts),
    enemyDisposition: Object.fromEntries(Object.values(state.battle.participants.enemies).map((entry) => [entry.id, entry.defeated ? "defeated" : entry.active ? "active" : "withdrawn"])),
  };
  return definition.buildConsequences ? definition.buildConsequences(state, outcome, base) : base;
}

function finishBattle(state, definition, outcome) {
  state.status = "finished";
  state.pendingOutcome = null;
  state.turn.phase = "player";
  state.turn.energy = 0;
  state.turn.enemyQueue = [];
  state.turn.enemyCursor = 0;
  const ledgerEntry = {
    encounterId: state.encounterId,
    outcome: outcome.outcome,
    stageId: state.battle.stageId,
    round: state.turn.round,
  };
  state.battle.ledger.outcomes.push(ledgerEntry);
  state.result = {
    ...clone(outcome),
    consequences: buildConsequences(state, definition, outcome),
  };
  state.battle.lastResult = outcome.text || state.battle.lastResult;
  return state;
}

export function createDeathMemory(record) {
  return {
    causeId: record.causeId,
    cause: record.cause,
    memory: record.memory,
    factId: record.factId || null,
    returnedTo: record.returnedTo || "战斗开始前",
    count: Number(record.count || 1),
  };
}

function finalizeDeath(state, definition, cause = {}) {
  state.lives = Math.max(0, state.lives - 1);
  state.status = "death";
  state.pendingOutcome = null;
  state.turn.energy = 0;
  const fallback = definition.defaultDeath || {};
  const record = createDeathMemory({
    causeId: cause.causeId || fallback.causeId || "blood_exhausted",
    cause: cause.cause || fallback.cause || "气血断绝，命灯随之熄灭。",
    memory: cause.memory || fallback.memory || "这一处死局已经被命灯照见。",
    factId: cause.factId || fallback.factId || null,
    returnedTo: cause.returnedTo || definition.title,
  });
  const existing = state.deathRecords.find((entry) => entry.causeId === record.causeId);
  if (existing) existing.count = Number(existing.count || 1) + 1;
  else state.deathRecords.push(record);
  state.deathMemory = unique([...state.deathMemory, record.memory]);
  if (record.factId) state.battle.knownFacts = unique([...state.battle.knownFacts, record.factId]);
  state.result = { outcome: "death", ...record };
  state.battle.lastResult = record.cause;
  return state;
}

function resolveCheck(state, action, evaluation, context) {
  if (!evaluation.check) {
    return {
      evaluation: { ...evaluation, tier: evaluation.previewTier || "success" },
      check: null,
      tier: evaluation.previewTier || "success",
    };
  }
  const roll = rollCausalDie(context.fateSeed, evaluation.check.causalKey, 10);
  const resolved = resolvedTier(roll, evaluation.check.modifier, evaluation.check.target, evaluation.check.greatTarget);
  const fatal = Boolean(action.fatalWhen?.(state, context));
  const tier = fatal ? "failure" : resolved.tier;
  const check = {
    ...evaluation.check,
    round: state.turn.round,
    stageRound: state.turn.stageRound,
    roll,
    total: resolved.total,
    tier,
    tierLabel: TIER_LABELS[tier],
  };
  return { evaluation: { ...evaluation, tier, check }, check, tier };
}

export function resolveCombatAction(state, actionId, definition, suppliedContext = {}) {
  const action = internalAction(state, definition, actionId);
  const evaluation = evaluateCombatAction(state, action, definition, suppliedContext);
  if (!evaluation.available) return { available: false, reason: evaluation.reason, evaluation };
  const next = clone(state);
  const context = contextFor(next, suppliedContext);
  const resolved = resolveCheck(next, action, evaluation, context);
  const outcome = outcomeFor(action, resolved.tier, next, context) || {};
  const formula = effectsForCombatFormula(action, resolved.tier, outcome, next, context);
  const impact = applyEffects(next, formula.effects);
  next.turn.energy = Math.max(0, next.turn.energy - Number(action.energyCost ?? 1));
  next.battle.participants.player.qi = Math.max(0, Number(next.battle.participants.player.qi || 0) - Number(action.qiCost || 0));
  if (outcome.energy != null) next.turn.energy = Math.max(0, Number(outcome.energy));
  if (outcome.pendingOutcome) {
    next.pendingOutcome = {
      ...clone(outcome.pendingOutcome),
      check: clone(resolved.check),
      intent: action.intent,
    };
    next.turn.energy = 0;
  }
  if (outcome.outcome) finishBattle(next, definition, { outcome: outcome.outcome, text: outcome.text, edge: outcome.edge || null });
  next.battle.lastResult = outcome.text || "这一手改变了战局。";
  const historyEntry = {
    round: next.turn.round,
    stageRound: next.turn.stageRound,
    stageId: next.battle.stageId,
    phase: "player",
    actionId: action.id,
    intent: action.intent,
    energyCost: Number(action.energyCost ?? 1),
    qiCost: Number(action.qiCost || 0),
    damageRange: formula.range,
    position: action.type === "move" ? `${nodeName(state, definition, state.positions.player)}→${nodeName(next, definition, next.positions.player)}` : null,
    outcome: outcome.outcome || (outcome.pendingOutcome ? outcome.pendingOutcome.outcome : "player_action"),
    rating: resolved.evaluation.rating,
    check: resolved.check,
    impact,
    text: next.battle.lastResult,
  };
  next.history.push(historyEntry);
  const player = next.battle.participants.player;
  if (next.status === "fighting" && player.current <= 0) {
    finalizeDeath(next, definition, outcome.death || {});
  }
  let transitioned = false;
  if (next.status === "fighting" && !next.pendingOutcome) transitioned = maybeTransition(next, definition, { type: "playerAction", actionId: action.id, tier: resolved.tier });
  return {
    available: true,
    result: {
      available: true,
      outcome: next.status === "death" ? "death" : outcome.outcome || (outcome.pendingOutcome ? outcome.pendingOutcome.outcome : "player_action"),
      intent: action.intent,
      evaluation: resolved.evaluation,
      check: resolved.check,
      impact: {
        ...impact,
        damageRange: formula.range,
        formulaDamage: formula.damage,
        playerHp: next.battle.participants.player.current,
        playerMaxHp: next.battle.participants.player.max,
        playerQi: next.battle.participants.player.qi,
        playerMaxQi: next.battle.participants.player.maxQi,
        enemyHp: (activeEnemies(next).find((entry) => entry.primary) || Object.values(next.battle.participants.enemies)[0])?.current || 0,
      },
      battle: clone(next.battle),
      text: next.battle.lastResult,
      transitioned,
    },
    session: next,
  };
}

function projectedTier(state, action, evaluation, context) {
  if (!evaluation.check) return evaluation.previewTier || "success";
  const roll = rollCausalDie(context.fateSeed, evaluation.check.causalKey, 10);
  return action.fatalWhen?.(state, context)
    ? "failure"
    : resolvedTier(roll, evaluation.check.modifier, evaluation.check.target, evaluation.check.greatTarget).tier;
}

function projectedActionState(state, action, evaluation, definition, context) {
  const projected = clone(state);
  if (!evaluation.available) return { projected, outcome: null, tier: null };
  const tier = projectedTier(state, action, evaluation, context);
  const outcome = outcomeFor(action, tier, projected, context) || {};
  const formula = effectsForCombatFormula(action, tier, outcome, projected, context);
  applyEffects(projected, formula.effects);
  projected.battle.participants.player.qi = Math.max(0, Number(projected.battle.participants.player.qi || 0) - Number(action.qiCost || 0));
  if (outcome.pendingOutcome) projected.pendingOutcome = clone(outcome.pendingOutcome);
  return { projected, outcome: { ...outcome, effects: formula.effects, damageRange: formula.range }, tier };
}

function enemyHelpers(state, definition) {
  return {
    path: (from, to) => getBattlePath(state, definition, from, to),
    distance: (from, to) => getBattleDistance(state, definition, from, to),
    activeEnemies: () => activeEnemies(state),
    participant: (id) => participant(state, id),
    nodeName: (id) => nodeName(state, definition, id),
  };
}

export function getEnemyIntents(state, definition, suppliedContext = {}) {
  if (state.status !== "fighting") return [];
  const intents = definition.getEnemyIntents?.(state, contextFor(state, suppliedContext), enemyHelpers(state, definition)) || [];
  return clone(intents).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function enemyForecast(state, definition, context) {
  const intents = getEnemyIntents(state, definition, context);
  const reduction = Number(state.battle.participants.player.reduction || 0);
  const damage = intents.reduce((total, intent) => total + (intent.effects || [])
    .filter((effect) => effect.type === "damage" && effect.targetId === "player")
    .reduce((subtotal, effect) => subtotal + applyDamageReduction(effect.amount, reduction, effect.penetration || 0).final, 0), 0);
  const poison = state.battle.participants.player.statuses.reduce((total, status) => total + Number(status.tickDamage || 0), 0);
  return {
    intents,
    damage: damage + poison,
    text: damage + poison > 0 ? `若此刻收势：预计承受${damage + poison}点气血` : "若此刻收势：敌人只会换位、蓄势或撤走",
  };
}

function actionPositionPreview(state, action, definition) {
  const playerNode = nodeName(state, definition, state.positions.player);
  if (action.type === "move") return `${playerNode}→${nodeName(state, definition, action.objectId)}`;
  const target = action.targetId ? participant(state, action.targetId) : activeEnemies(state).find((entry) => entry.primary) || activeEnemies(state)[0];
  const targetNode = target ? state.positions[target.id] : null;
  const distance = targetNode ? distanceLabel(getBattleDistance(state, definition, state.positions.player, targetNode)) : "当前身位";
  return `身在${playerNode}｜与${target?.name || "敌人"}${distance}`;
}

function impactPreview(action, outcome) {
  const effects = outcome?.effects || [];
  const playerDamage = effects.filter((entry) => entry.type === "damage" && entry.targetId === "player").reduce((total, entry) => total + Number(entry.amount || 0), 0);
  const enemyDamage = effects.filter((entry) => entry.type === "damage" && entry.targetId !== "player").reduce((total, entry) => total + Number(entry.amount || 0), 0);
  return {
    success: action.successPreview || (enemyDamage ? `敌方气血 -${enemyDamage}` : "改变当前战局"),
    risk: action.riskPreview || (playerDamage ? `自身气血 -${playerDamage}` : "敌方意图仍会兑现"),
    playerDamage,
    enemyDamage,
  };
}

export function getAvailableCombatActions(state, definition, suppliedContext = {}) {
  if (state.status !== "fighting" || state.pendingOutcome || state.turn.phase !== "player") return [];
  const stageId = state.battle.stageId;
  const defined = definition.actions.filter((action) => allowedInStage(action, stageId));
  const qiBoosted = Number(state.battle.participants.player.maxQi || 0) > 0
    ? defined.filter((action) => action.qiBoost && action.formulaDamage).map((action) => qiBoostDefinition(definition, `${action.id}__qi`))
    : [];
  const moves = stageNodes(definition, state)
    .filter((node) => node.playerSelectable !== false && node.id !== state.positions.player)
    .map((node) => movementDefinition(state, definition, `move_${node.id}`))
    .filter(Boolean);
  return [...defined, ...qiBoosted, ...moves].map((action) => {
    const evaluation = evaluateCombatAction(state, action, definition, suppliedContext);
    const context = contextFor(state, suppliedContext);
    const projected = projectedActionState(state, action, evaluation, definition, context);
    const forecast = enemyForecast(projected.projected, definition, suppliedContext);
    const publicEntry = publicAction(action);
    return {
      ...publicEntry,
      energyCost: Number(action.energyCost ?? 1),
      positionPreview: actionPositionPreview(state, action, definition),
      enemyPhasePreview: forecast.text,
      evaluation,
      impactPreview: {
        ...impactPreview(action, projected.outcome),
        position: actionPositionPreview(state, action, definition),
        enemyPhase: forecast.text,
      },
      recommendationWeight: Number(action.recommend?.(state, context) || action.recommendationWeight || 0),
    };
  }).filter((action) => !(state.lives <= 1 && action.evaluation.rating === "fatal"));
}

export function getRecommendedCombatActions(state, definition, focusId = "default", suppliedContext = {}) {
  const actions = getAvailableCombatActions(state, definition, suppliedContext);
  const focused = actions.map((action, index) => {
    const focusWeight = Array.isArray(action.focusIds) && action.focusIds.includes(focusId) ? 100 : 0;
    const availableWeight = action.evaluation.available ? 30 : -1000;
    const dangerWeight = action.evaluation.rating === "fatal" ? -80 : action.evaluation.rating === "dangerous" ? -10 : 10;
    return { action, index, score: focusWeight + availableWeight + dangerWeight + Number(action.recommendationWeight || 0) };
  });
  const seen = new Set();
  return focused
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ action }) => action)
    .filter((action) => {
      const baseActionId = String(action.id || "").replace(/__qi$/, "");
      if (seen.has(baseActionId)) return false;
      seen.add(baseActionId);
      return true;
    })
    .slice(0, 3);
}

export function startEnemyPhase(state, definition, suppliedContext = {}) {
  if (state.status !== "fighting" || state.turn.phase !== "player") return { available: false, reason: "眼下不能收势。" };
  const next = clone(state);
  next.turn.phase = "enemy";
  next.turn.energy = 0;
  next.turn.enemyQueue = getEnemyIntents(next, definition, suppliedContext);
  next.turn.enemyCursor = 0;
  next.turn.actedEnemyIds = [];
  return { available: true, session: next };
}

function resolveEnemyIntentEffects(state, action) {
  const effects = clone(action.effects || []);
  const damaging = effects.some((effect) => effect?.type === "damage" && effect.targetId === "player");
  if (!damaging || action.ignoreDefense) return { effects, check: null, tier: "success" };
  const attacker = participant(state, action.unitId);
  const player = state.battle.participants.player;
  const modifier = Number(action.attackBonus ?? (2 + stageIndex(attacker?.stageId || "mortal") * 2));
  const target = actionTargetValue(Number(action.difficulty || 0), Number(player.defense || 0));
  const greatTarget = target + 3;
  const causalKey = [
    state.encounterId,
    state.battle.stageId,
    `enemy-${action.unitId || "unknown"}`,
    `round-${state.turn.round}`,
    action.id,
    `defense-${Number(player.defense || 0)}`,
  ].join("|");
  const roll = rollCausalDie(state.setup.fateSeed, causalKey, 10);
  const resolved = resolvedTier(roll, modifier, target, greatTarget);
  const adjusted = effects.flatMap((effect) => {
    if (effect.targetId !== "player") return [effect];
    if (resolved.tier === "failure" && ["damage", "wound", "status"].includes(effect.type)) return [];
    if (effect.type !== "damage") return [effect];
    const maximum = Math.max(1, Number(effect.amount || 0));
    const minimum = Math.max(1, Math.ceil(maximum / 2));
    return [{ ...effect, amount: damageForTier({ min: minimum, max: maximum }, resolved.tier) }];
  });
  return {
    effects: adjusted,
    tier: resolved.tier,
    check: {
      die: "1D10",
      roll,
      modifier,
      target,
      greatTarget,
      total: resolved.total,
      tier: resolved.tier,
      tierLabel: TIER_LABELS[resolved.tier],
      causalKey,
    },
  };
}

function tickStatuses(state) {
  const actors = [
    state.battle.participants.player,
    ...Object.values(state.battle.participants.enemies),
    ...Object.values(state.battle.participants.allies),
  ].filter((actor) => actor.current > 0);
  const impact = {
    playerDamage: 0,
    enemyDamage: 0,
    enemyDamageById: {},
    allyDamage: 0,
  };
  const messages = [];
  for (const actor of actors) {
    for (const status of actor.statuses) {
      if (Number(status.tickDamage || 0) > 0) {
        const damage = applyDamage(state, actor.id, status.tickDamage);
        if (actor.id === "player") impact.playerDamage += damage;
        else if (state.battle.participants.enemies[actor.id]) {
          impact.enemyDamage += damage;
          impact.enemyDamageById[actor.id] = Number(impact.enemyDamageById[actor.id] || 0) + damage;
        } else impact.allyDamage += damage;
        if (damage) messages.push(`${actor.name}受${status.label || "持续伤势"}侵袭，气血下降${damage}。`);
      }
      if (status.duration != null) status.duration = Number(status.duration) - 1;
    }
    actor.statuses = actor.statuses.filter((status) => status.duration == null || Number(status.duration) > 0);
  }
  return { impact, text: messages.join("") };
}

function resolveFatalWounds(state) {
  const fatalWounds = state.wounds.filter((wound) => Number(wound.severity || 0) >= 3 && !wound.stabilized);
  let expired = null;
  for (const wound of fatalWounds) {
    wound.countdown = Number(wound.countdown ?? 1) - 1;
    if (wound.countdown <= 0 && !expired) expired = wound;
  }
  if (!expired) return null;
  applyDamage(state, "player", state.battle.participants.player.current);
  return {
    causeId: `unstabilized_${expired.id}`,
    cause: "致命伤没有在这一轮得到处理，气血终于断绝。",
    memory: "致命伤必须在敌方阶段结束前止血、撤离或求助。",
    factId: "fatal_wound_deadline",
  };
}

function completeEnemyPhase(state, definition) {
  const next = clone(state);
  const tick = tickStatuses(next);
  if (tick.text) {
    next.history.push({
      round: next.turn.round,
      stageRound: next.turn.stageRound,
      stageId: next.battle.stageId,
      phase: "upkeep",
      actionId: "status_tick",
      intent: "持续伤势",
      impact: tick.impact,
      text: tick.text,
    });
    next.battle.lastResult = tick.text;
  }
  const fatalCause = resolveFatalWounds(next);
  if (next.battle.participants.player.current <= 0) {
    finalizeDeath(next, definition, fatalCause || definition.statusDeath || {});
    return next;
  }
  if (next.pendingOutcome) return finishBattle(next, definition, next.pendingOutcome);
  const endEffects = definition.onRoundEnd?.(next, contextFor(next)) || [];
  if (Array.isArray(endEffects)) applyEffects(next, endEffects);
  if (maybeTransition(next, definition, { type: "roundEnd" })) return next;
  next.turn.round += 1;
  next.turn.stageRound += 1;
  next.turn.phase = "player";
  next.turn.energy = next.turn.maxEnergy;
  next.turn.enemyQueue = [];
  next.turn.enemyCursor = 0;
  next.turn.actedEnemyIds = [];
  next.battle.conditions.companionUsedRound = 0;
  next.battle.conditions.allyEngaged = false;
  return next;
}

export function resolveEnemyAction(state, definition) {
  if (state.status !== "fighting" || state.turn.phase !== "enemy") return { available: false, reason: "敌方尚未行动。" };
  if (state.turn.enemyCursor >= state.turn.enemyQueue.length) {
    return { available: true, completed: true, session: completeEnemyPhase(state, definition), action: null, impact: null };
  }
  const next = clone(state);
  const action = clone(next.turn.enemyQueue[next.turn.enemyCursor]);
  const enemyCheck = resolveEnemyIntentEffects(next, action);
  const impact = applyEffects(next, enemyCheck.effects);
  next.turn.enemyCursor += 1;
  if (action.unitId) next.turn.actedEnemyIds.push(action.unitId);
  const text = enemyCheck.tier === "failure"
    ? `${action.label || "敌招"}落空，你的防御与身位把这一击让了过去。`
    : action.text || `${action.label || "敌招"}已经兑现。`;
  next.battle.lastResult = text;
  next.history.push({
    round: next.turn.round,
    stageRound: next.turn.stageRound,
    stageId: next.battle.stageId,
    phase: "enemy",
    actionId: action.id,
    unitId: action.unitId || null,
    intent: action.label,
    position: action.from && action.to ? `${nodeName(next, definition, action.from)}→${nodeName(next, definition, action.to)}` : null,
    impact,
    check: enemyCheck.check,
    text,
  });
  if (next.battle.participants.player.current <= 0) finalizeDeath(next, definition, action.death || {});
  else if (!next.pendingOutcome) maybeTransition(next, definition, { type: "enemyAction", actionId: action.id });
  return {
    available: true,
    completed: false,
    action,
    impact: {
      ...impact,
      check: enemyCheck.check,
      playerHp: next.battle.participants.player.current,
      playerMaxHp: next.battle.participants.player.max,
      playerQi: next.battle.participants.player.qi,
      playerMaxQi: next.battle.participants.player.maxQi,
      enemyHp: (activeEnemies(next).find((entry) => entry.primary) || Object.values(next.battle.participants.enemies)[0])?.current || 0,
    },
    text,
    session: next,
  };
}

export function rewindBattle(state, definition) {
  if (state.status !== "death" || state.lives <= 0) return { available: false, reason: "命灯已经无法把这一战拉回原处。" };
  const facts = unique([
    ...(state.checkpoint.setup.knownFacts || []),
    ...state.battle.knownFacts,
    ...state.deathRecords.map((entry) => entry.factId),
  ]);
  const next = createBattle(definition, {
    ...clone(state.checkpoint.setup),
    lives: state.lives,
    knownFacts: facts,
    campaign: clone(state.checkpoint.campaign),
    deathMemory: clone(state.deathMemory),
    deathRecords: clone(state.deathRecords),
  });
  next.history.push({
    round: 0,
    stageRound: 0,
    stageId: next.battle.stageId,
    phase: "rewind",
    actionId: "fate_lamp_rewind",
    intent: "命灯回照",
    text: `你带着${state.result.memory}回到战斗开始前。`,
  });
  return { available: true, session: next };
}

export function restartBattle(state, definition, patch = {}) {
  const checkpointSetup = state.checkpoint?.setup || state.setup;
  let campaign = clone(patch.campaign ?? state.checkpoint.campaign);
  if (campaign && patch.relationships) {
    campaign.relationships = { ...(campaign.relationships || {}) };
    for (const [id, relationship] of Object.entries(patch.relationships)) {
      campaign.relationships[id] = {
        ...(campaign.relationships[id] || {}),
        ...clone(relationship),
      };
    }
  }
  return createBattle(definition, {
    ...clone(checkpointSetup),
    ...clone(patch),
    attributes: { ...checkpointSetup.attributes, ...(patch.attributes || {}) },
    skills: mergeRecords(checkpointSetup.skills, patch.skills),
    relationships: mergeRecords(checkpointSetup.relationships, patch.relationships),
    items: { ...checkpointSetup.items, ...(patch.items || {}) },
    wounds: clone(patch.wounds ?? checkpointSetup.wounds),
    knownFacts: unique(patch.knownFacts ?? checkpointSetup.knownFacts),
    lives: Number(patch.lives ?? checkpointSetup.lives),
    campaign,
  });
}

export function getBattleView(state, definition, suppliedContext = {}) {
  const stage = getStage(definition, state);
  const intents = state.turn.phase === "enemy" ? state.turn.enemyQueue.slice(state.turn.enemyCursor) : getEnemyIntents(state, definition, suppliedContext);
  const nodes = stageNodes(definition, state).map((node) => clone(node));
  const stageEnemyIds = new Set(stage.activeEnemyIds || []);
  const stageAllyIds = new Set(stage.activeAllyIds || []);
  const enemies = Object.values(state.battle.participants.enemies)
    .filter((entry) => entry.seen || entry.active || stageEnemyIds.has(entry.id))
    .map((entry) => ({ ...clone(entry), nodeId: state.positions[entry.id] }));
  const allies = Object.values(state.battle.participants.allies)
    .filter((entry) => entry.seen || entry.active || stageAllyIds.has(entry.id))
    .map((entry) => ({ ...clone(entry), nodeId: state.positions[entry.id] }));
  return {
    meta: {
      encounterId: definition.id,
      location: stage.location || definition.location,
      title: stage.title || definition.title,
      stageLabel: stage.label || null,
      sceneClass: stage.sceneClass || definition.sceneClass || "",
      sceneImage: stage.sceneImage || definition.sceneImage || "",
      mapLabel: stage.mapLabel || "战场身位图",
      historyLabel: definition.historyLabel || "战斗行录",
      primaryEnemyId: enemies.find((entry) => entry.primary)?.id || enemies[0]?.id || null,
    },
    stage: clone(stage),
    objective: state.battle.objective,
    player: clone(state.battle.participants.player),
    enemies,
    allies,
    nodes,
    links: (stage.links || []).map((entry) => clone(entry)),
    positions: clone(state.positions),
    environment: clone(state.battle.environment),
    knownFacts: clone(state.battle.knownFacts),
    conditions: clone(state.battle.conditions),
    ledger: clone(state.battle.ledger),
    intents,
    threat: intents.reduce((total, intent) => total + (intent.effects || []).filter((effect) => effect.type === "damage" && effect.targetId === "player").reduce((sum, effect) => sum + Number(effect.amount || 0), 0), 0),
    wounds: clone(state.wounds),
    statuses: clone(state.battle.participants.player.statuses),
  };
}
