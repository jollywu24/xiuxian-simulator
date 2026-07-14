import { P0_ITEMS, P0_LOCATIONS, P0_NPCS, P0_SKILLS, getP0Item, getP0Location, getP0Npc, getP0Skill } from "./content/p0/catalogs.mjs";
import { P0_ARCS, P0_CONTENT_NODES, getP0Arc, getP0Node } from "./content/p0/arcs.mjs";

export { P0_ITEMS, P0_LOCATIONS, P0_NPCS, P0_SKILLS, P0_ARCS, P0_CONTENT_NODES, getP0Item, getP0Location, getP0Npc, getP0Skill, getP0Arc, getP0Node };

function relation(favor = 0, trust = 0, debt = 0, suspicion = 0) {
  return { favor, trust, debt, suspicion };
}

export function createP0State() {
  return {
    started: false,
    complete: false,
    node: "third_lady_summons",
    eventStates: {},
    appliedEffects: [],
    items: {},
    skills: {},
    evidence: [],
    hypotheses: {},
    relationships: {
      bai_zhiyun: relation(0, 0, 0, 5),
      cao_qing: relation(49, 45, 0, 0),
      temple_monkeys: relation(0, 0, 0, 10),
    },
    diagnosisActions: [],
    diagnosis: "unknown",
    dangerClock: 4,
    ingredientSource: null,
    pillQuality: null,
    treatmentOutcome: null,
    battle: null,
    battleOutcome: null,
    firstKill: false,
    firstKillChoice: null,
    wounds: [],
    apprentice: false,
    stakeId: null,
    stakeProgress: 0,
    bodyProgress: 0,
    clock: { year: 427, month: 8, day: 12, segment: "night", weather: "clear" },
    location: "east_pharmacy",
    locationStates: { ruined_temple: "known", monkey_trail: "hidden", ape_water_cave: "hidden" },
    travelOutcome: null,
    monkeyOutcome: null,
    monkeyConflictOutcome: null,
    wineChoice: null,
    legacyOutcome: null,
    deathMemory: [],
    checkpoint: null,
    log: [],
  };
}

export function migrateP0State(savedP0) {
  const defaults = createP0State();
  const source = savedP0 && typeof savedP0 === "object" ? savedP0 : {};
  return {
    ...defaults,
    ...source,
    eventStates: { ...defaults.eventStates, ...(source.eventStates || {}) },
    items: { ...defaults.items, ...(source.items || {}) },
    skills: { ...defaults.skills, ...(source.skills || {}) },
    hypotheses: { ...defaults.hypotheses, ...(source.hypotheses || {}) },
    relationships: {
      ...defaults.relationships,
      ...(source.relationships || {}),
      bai_zhiyun: { ...defaults.relationships.bai_zhiyun, ...(source.relationships?.bai_zhiyun || {}) },
      cao_qing: { ...defaults.relationships.cao_qing, ...(source.relationships?.cao_qing || {}) },
      temple_monkeys: { ...defaults.relationships.temple_monkeys, ...(source.relationships?.temple_monkeys || {}) },
    },
    clock: { ...defaults.clock, ...(source.clock || {}) },
    locationStates: { ...defaults.locationStates, ...(source.locationStates || {}) },
  };
}

function readPath(source, path) {
  return String(path).split(".").reduce((value, key) => value?.[key], source);
}

function writePath(target, path, value) {
  const keys = String(path).split(".");
  const last = keys.pop();
  const parent = keys.reduce((node, key) => {
    if (!node[key] || typeof node[key] !== "object") node[key] = {};
    return node[key];
  }, target);
  parent[last] = value;
}

export function evaluateConditions(conditions = [], context = {}) {
  return conditions.map((condition) => {
    let actual;
    let met = false;
    if (condition.type === "field") {
      actual = readPath(context, condition.path);
      if (condition.operator === "includes") met = Array.isArray(actual) && actual.includes(condition.value);
      else if (condition.operator === "gte") met = Number(actual || 0) >= Number(condition.value || 0);
      else met = actual === condition.value;
    } else if (condition.type === "item") {
      actual = Number(context.p0?.items?.[condition.id] || 0);
      met = actual >= Number(condition.quantity || 1);
    } else if (condition.type === "skill") {
      actual = context.p0?.skills?.[condition.id] || null;
      met = Boolean(actual);
    } else if (condition.type === "evidence") {
      actual = context.p0?.evidence || [];
      met = actual.includes(condition.id);
    } else if (condition.type === "relation") {
      actual = Number(context.p0?.relationships?.[condition.npc]?.[condition.dimension] || 0);
      met = actual >= Number(condition.value || 0);
    }
    return { ...condition, actual, met, visible: condition.visible !== false, reason: met ? "已满足" : condition.reason || "条件未足" };
  });
}

export function applyEffects(p0, effects = []) {
  const next = structuredClone(p0);
  const changes = [];
  for (const effect of effects) {
    if (effect.id && next.appliedEffects.includes(effect.id)) continue;
    if (effect.type === "set") {
      writePath(next, effect.path, structuredClone(effect.value));
      changes.push({ type: effect.type, path: effect.path, value: effect.value });
    } else if (effect.type === "increment") {
      const value = Number(readPath(next, effect.path) || 0) + Number(effect.value || 0);
      writePath(next, effect.path, value);
      changes.push({ type: effect.type, path: effect.path, value });
    } else if (effect.type === "addItem") {
      next.items[effect.itemId] = Number(next.items[effect.itemId] || 0) + Number(effect.quantity || 1);
      changes.push({ type: effect.type, itemId: effect.itemId, quantity: effect.quantity || 1 });
    } else if (effect.type === "removeItem") {
      const current = Number(next.items[effect.itemId] || 0);
      const quantity = Number(effect.quantity || 1);
      if (current < quantity) continue;
      next.items[effect.itemId] = current - quantity;
      changes.push({ type: effect.type, itemId: effect.itemId, quantity });
    } else if (effect.type === "addSkill") {
      if (!next.skills[effect.skillId]) next.skills[effect.skillId] = { stage: effect.stage || "known", progress: Number(effect.progress || 0) };
      changes.push({ type: effect.type, skillId: effect.skillId });
    } else if (effect.type === "evidence") {
      if (!next.evidence.includes(effect.evidenceId)) next.evidence.push(effect.evidenceId);
      changes.push({ type: effect.type, evidenceId: effect.evidenceId });
    } else if (effect.type === "relation") {
      const target = next.relationships[effect.npcId] || relation();
      target[effect.dimension] = Number(target[effect.dimension] || 0) + Number(effect.value || 0);
      next.relationships[effect.npcId] = target;
      changes.push({ type: effect.type, npcId: effect.npcId, dimension: effect.dimension, value: target[effect.dimension] });
    } else if (effect.type === "wound") {
      if (!next.wounds.some((wound) => wound.id === effect.wound.id)) next.wounds.push(structuredClone(effect.wound));
      changes.push({ type: effect.type, wound: effect.wound.id });
    } else if (effect.type === "healWound") {
      next.wounds = next.wounds.filter((wound) => wound.id !== effect.woundId);
      changes.push({ type: effect.type, wound: effect.woundId });
    }
    if (effect.id) next.appliedEffects.push(effect.id);
  }
  return { state: next, changes };
}

export function validateP0Content() {
  const errors = [];
  const nodeIds = new Set();
  for (const node of P0_CONTENT_NODES) {
    if (!node.id) errors.push("内容节点缺少ID");
    if (nodeIds.has(node.id)) errors.push(`重复节点：${node.id}`);
    nodeIds.add(node.id);
    if (!Array.isArray(node.actions) || !node.actions.length) errors.push(`节点没有行动：${node.id}`);
    for (const action of node.actions || []) {
      if (!action.id) errors.push(`行动缺少ID：${node.id}`);
      if (!Array.isArray(action.outcomes) || !action.outcomes.length) errors.push(`行动没有结果：${node.id}/${action.id}`);
    }
  }
  for (const node of P0_CONTENT_NODES) {
    for (const action of node.actions || []) {
      if (action.next && !nodeIds.has(action.next)) errors.push(`坏跳转：${node.id}/${action.id} -> ${action.next}`);
    }
  }
  for (const arc of P0_ARCS) {
    if (!nodeIds.has(arc.entry)) errors.push(`篇章入口不存在：${arc.id}`);
    for (const exit of arc.exits) if (!nodeIds.has(exit)) errors.push(`篇章出口不存在：${arc.id}/${exit}`);
    for (const payoff of arc.firstPayoffs || []) {
      const acquire = P0_CONTENT_NODES.findIndex((node) => node.id === payoff.acquireNode);
      const use = P0_CONTENT_NODES.findIndex((node) => node.id === payoff.useNode);
      if (acquire < 0 || use < 0 || use - acquire > 2 || use < acquire) errors.push(`能力未及时兑现：${arc.id}/${payoff.ability}`);
    }
  }
  for (const [catalogName, catalog] of Object.entries({ items: P0_ITEMS, skills: P0_SKILLS, npcs: P0_NPCS, locations: P0_LOCATIONS })) {
    const catalogIds = catalog.map((item) => item.id);
    const duplicates = catalogIds.filter((id, index) => catalogIds.indexOf(id) !== index);
    if (duplicates.length) errors.push(`${catalogName}目录ID重复：${[...new Set(duplicates)].join(",")}`);
  }
  return { ok: errors.length === 0, errors, nodeCount: P0_CONTENT_NODES.length, arcCount: P0_ARCS.length };
}

export const THIRD_LADY_EVIDENCE = {
  observe: { id: "breath_disorder", label: "呼吸与脉搏并不同步" },
  pulse: { id: "reversed_meridians", label: "三处经脉逆行，不是寻常风寒" },
  ask_manual: { id: "purple_dragon_manual", label: "练功残页记载了紫龙换血法" },
};

export function resolveDiagnosisAction(actionId, p0, context = {}) {
  if (!THIRD_LADY_EVIDENCE[actionId] || p0.diagnosisActions.includes(actionId)) return { available: false, reason: "这一步已经查过。" };
  if (actionId === "pulse" && Number(context.medicalLevel || 0) < 2) return { available: false, reason: "医术不足以分辨经脉逆行。" };
  if (actionId === "ask_manual" && Number(p0.relationships.bai_zhiyun?.trust || 0) < 10) return { available: false, reason: "她还不肯交出练功残页。" };
  const effects = [
    { id: `diagnosis_action_${actionId}`, type: "evidence", evidenceId: THIRD_LADY_EVIDENCE[actionId].id },
    { id: `diagnosis_record_${actionId}`, type: "set", path: "diagnosisActions", value: [...p0.diagnosisActions, actionId] },
    { id: `diagnosis_clock_${actionId}`, type: "increment", path: "dangerClock", value: -1 },
  ];
  const result = applyEffects(p0, effects);
  if (result.state.evidence.includes("reversed_meridians") && result.state.evidence.includes("breath_disorder")) result.state.diagnosis = "deviation";
  return { available: true, evidence: THIRD_LADY_EVIDENCE[actionId], depth: actionId === "pulse" ? "confirmed" : "observed", ...result };
}

export function getDiagnosisBoard(p0) {
  return {
    dangerClock: p0.dangerClock,
    observations: p0.evidence.map((id) => Object.values(THIRD_LADY_EVIDENCE).find((entry) => entry.id === id)?.label || id),
    diagnosis: p0.diagnosis,
    canConclude: p0.diagnosis === "deviation" && p0.dangerClock > 0,
  };
}

export function resolveIngredientSource(sourceId, p0, context = {}) {
  const sources = {
    cao: { available: Number(context.caoFavor || 0) >= 40, costSilver: 0, effects: [{ type: "relation", npcId: "cao_qing", dimension: "trust", value: 3 }] },
    shen: { available: Number(p0.relationships.bai_zhiyun?.trust || 0) >= 10, costSilver: 0, effects: [{ type: "relation", npcId: "bai_zhiyun", dimension: "suspicion", value: 5 }] },
    merchant: { available: Number(context.silver || 0) >= 6, costSilver: 6, effects: [] },
  };
  const source = sources[sourceId];
  if (!source?.available) return { available: false, reason: sourceId === "merchant" ? "银钱不足。" : "这条人情尚未打开。" };
  const effects = [
    { id: `ingredient_source_${sourceId}`, type: "set", path: "ingredientSource", value: sourceId },
    { id: "ingredient_purple_scale", type: "addItem", itemId: "purple_scale_herb", quantity: 1 },
    { id: "ingredient_blood_vine", type: "addItem", itemId: "blood_vine_core", quantity: 1 },
    { id: "ingredient_calm_sand", type: "addItem", itemId: "calm_pulse_sand", quantity: 1 },
    ...source.effects,
  ];
  return { available: true, costSilver: source.costSilver, ...applyEffects(p0, effects) };
}

export function resolvePurpleDragonAlchemy(choiceId, p0, context = {}) {
  const hasIngredients = ["purple_scale_herb", "blood_vine_core", "calm_pulse_sand"].every((id) => Number(p0.items[id] || 0) > 0);
  if (!hasIngredients || Number(context.medicalLevel || 0) < 2 || Number(context.alchemyLevel || 0) < 2) return { available: false, reason: "药材或丹医根基尚未齐备。" };
  const choices = {
    strict: { quality: "stable", label: "药性稳定" },
    rush: { quality: "volatile", label: "药力躁烈" },
    substitute: { quality: "failed", label: "药泥焦结" },
  };
  const choice = choices[choiceId];
  if (!choice) return null;
  const effects = [
    { id: "consume_purple_scale", type: "removeItem", itemId: "purple_scale_herb", quantity: 1 },
    { id: "consume_blood_vine", type: "removeItem", itemId: "blood_vine_core", quantity: 1 },
    { id: "consume_calm_sand", type: "removeItem", itemId: "calm_pulse_sand", quantity: 1 },
    { id: "purple_pill_quality", type: "set", path: "pillQuality", value: choice.quality },
  ];
  if (choice.quality !== "failed") effects.push({ id: "purple_pill_item", type: "addItem", itemId: "purple_dragon_blood_pill", quantity: 1 });
  return { available: true, outcome: choice.quality, label: choice.label, ...applyEffects(p0, effects) };
}

export function resolveThirdLadyTreatment(choiceId, p0) {
  if (choiceId === "withdraw") return { available: true, outcome: "missed", state: { ...structuredClone(p0), treatmentOutcome: "missed" }, changes: [] };
  if (Number(p0.items.purple_dragon_blood_pill || 0) < 1) return { available: false, reason: "换血丹没有炼成。" };
  let outcome = "failed";
  if (choiceId === "seal_then_pill" && p0.pillQuality === "stable") outcome = "saved";
  else if (choiceId === "seal_then_pill" && p0.pillQuality === "volatile") outcome = "saved_with_aftereffect";
  else if (choiceId === "pill_direct" && p0.pillQuality === "stable") outcome = "stabilized";
  const effects = [
    { id: "consume_purple_pill", type: "removeItem", itemId: "purple_dragon_blood_pill", quantity: 1 },
    { id: "third_lady_treatment_outcome", type: "set", path: "treatmentOutcome", value: outcome },
  ];
  if (outcome === "saved") effects.push(
    { id: "bai_saved_favor", type: "relation", npcId: "bai_zhiyun", dimension: "favor", value: 30 },
    { id: "bai_saved_trust", type: "relation", npcId: "bai_zhiyun", dimension: "trust", value: 25 },
    { id: "bai_saved_debt", type: "relation", npcId: "bai_zhiyun", dimension: "debt", value: 40 },
  );
  if (outcome === "saved_with_aftereffect") effects.push(
    { id: "bai_aftereffect_favor", type: "relation", npcId: "bai_zhiyun", dimension: "favor", value: 22 },
    { id: "bai_aftereffect_debt", type: "relation", npcId: "bai_zhiyun", dimension: "debt", value: 25 },
  );
  if (outcome === "stabilized") effects.push(
    { id: "bai_stable_favor", type: "relation", npcId: "bai_zhiyun", dimension: "favor", value: 12 },
    { id: "bai_stable_trust", type: "relation", npcId: "bai_zhiyun", dimension: "trust", value: 8 },
  );
  return { available: true, outcome, ...applyEffects(p0, effects) };
}

export function grantSpringRainNeedles(p0) {
  return applyEffects(p0, [
    { id: "spring_needles_item", type: "addItem", itemId: "spring_rain_needles", quantity: 1 },
    { id: "spring_needles_skill", type: "addSkill", skillId: "spring_rain_needles", stage: "learned", progress: 0 },
  ]);
}

export function resolveWoundTreatment(choiceId, p0, context = {}) {
  const wound = p0.wounds.find((entry) => Number(entry.severity || 0) <= 2);
  if (!wound) return { available: false, reason: "眼下没有可在此处处理的轻中伤。" };
  if (choiceId === "return_spring") {
    if (Number(p0.items.return_spring_pill || 0) < 1) return { available: false, reason: "行囊里已经没有回春丹。" };
    return { available: true, treatment: "pill", ...applyEffects(p0, [
      { id: `heal_${wound.id}_with_pill`, type: "removeItem", itemId: "return_spring_pill", quantity: 1 },
      { id: `remove_${wound.id}_with_pill`, type: "healWound", woundId: wound.id },
    ]) };
  }
  if (choiceId === "needles") {
    if (!p0.skills.spring_rain_needles || Number(context.medicalLevel || 0) < 2) return { available: false, reason: "针法或医术还不足以独自治伤。" };
    return { available: true, treatment: "needles", ...applyEffects(p0, [
      { id: `remove_${wound.id}_with_needles`, type: "healWound", woundId: wound.id },
    ]) };
  }
  return null;
}

export function createFirstBattle() {
  return {
    id: "first_needle_ambush",
    round: 1,
    range: "mid",
    terrain: ["alley", "night", "rain"],
    enemyIntent: "蒙面刀客压低右肩，正借雨声逼近。",
    observedFeint: false,
    darkness: false,
    enemyWounded: false,
    playerWounded: false,
    finished: false,
  };
}

export function resolveFirstBattleAction(actionId, battle, context = {}) {
  const next = structuredClone(battle || createFirstBattle());
  if (next.finished) return { available: false, reason: "这一战已经结束。" };
  if (!context.hasNeedles && ["needle_wrist", "seal", "kill"].includes(actionId)) return { available: false, reason: "手中没有可用银针。" };
  if (next.round === 1) {
    if (actionId === "observe") {
      next.observedFeint = true;
      next.round = 2;
      next.enemyIntent = "他右手仍在引你注意，真正的短刃藏在左袖。";
      return { available: true, outcome: "round", battle: next };
    }
    if (actionId === "extinguish") {
      next.darkness = true;
      next.round = 2;
      next.enemyIntent = "灯灭后，他的脚步慢了一瞬。";
      return { available: true, outcome: "round", battle: next };
    }
    if (actionId === "needle_wrist") {
      next.enemyWounded = true;
      next.round = 2;
      next.enemyIntent = "右腕中针，左袖短刃仍朝你腹间递来。";
      return { available: true, outcome: "round", battle: next };
    }
    if (actionId === "flee") {
      next.finished = true;
      return { available: true, outcome: "escaped", battle: next };
    }
    if (actionId === "reckless" || actionId === "kill" || actionId === "seal") {
      return { available: true, outcome: "death", cause: "你只盯着右手，左袖短刃从肋下穿入。", memory: "刀客右肩是诱饵，杀招藏在左袖。", battle: next };
    }
  }
  if (next.round >= 2) {
    if (actionId === "seal" && (next.observedFeint || next.darkness || next.enemyWounded)) {
      next.finished = true;
      return { available: true, outcome: "subdued", battle: next };
    }
    if (actionId === "kill" && (next.observedFeint || next.darkness || next.enemyWounded)) {
      next.finished = true;
      return { available: true, outcome: "killed", battle: next };
    }
    if (actionId === "flee") {
      next.finished = true;
      return { available: true, outcome: "escaped", battle: next };
    }
    if (actionId === "needle_wrist" && !next.enemyWounded) {
      next.enemyWounded = true;
      next.round += 1;
      return { available: true, outcome: "round", battle: next };
    }
    return { available: true, outcome: "wounded", wound: { id: "left_rib_cut", type: "cut", bodyPart: "torso", severity: 2, tags: ["limits_training"] }, battle: { ...next, playerWounded: true, round: next.round + 1 } };
  }
  return null;
}

export const P0_STAKES = {
  deadwood_stake: {
    id: "deadwood_stake",
    name: "神农枯木桩",
    description: "收敛呼吸，让药力与伤势在静中归拢。",
    combatBenefit: "重伤时仍可稳住一轮",
    travelBenefit: "带伤赶路时减轻恶化",
  },
  sea_stilling_stake: {
    id: "sea_stilling_stake",
    name: "沧澜定海桩",
    description: "以足下为锚，借水意稳定气血与冲击。",
    combatBenefit: "水边受击时不易失位",
    travelBenefit: "水路耗时更短且不受轻伤",
  },
};

export function chooseStake(stakeId, p0) {
  if (!P0_STAKES[stakeId]) return null;
  return applyEffects(p0, [
    { id: "chosen_stake", type: "set", path: "stakeId", value: stakeId },
    { id: `learn_${stakeId}`, type: "addSkill", skillId: stakeId, stage: "known", progress: 0 },
    { id: "apprentice_confirmed", type: "set", path: "apprentice", value: true },
  ]);
}

export function resolveStakeTraining(p0, context = {}) {
  if (!p0.stakeId) return { available: false, reason: "尚未选定桩功。" };
  if (Number(context.potential || 0) < 120) return { available: false, reason: "潜能不足一百二十。" };
  const effects = [
    { id: "stake_first_training", type: "set", path: "stakeProgress", value: 1 },
    { id: "stake_skill_progress", type: "set", path: `skills.${p0.stakeId}.progress`, value: 30 },
    { id: "stake_skill_stage", type: "set", path: `skills.${p0.stakeId}.stage`, value: "learned" },
    { id: "advance_to_august_fourteen", type: "set", path: "clock", value: { year: 427, month: 8, day: 14, segment: "night", weather: "clear" } },
  ];
  return { available: true, potentialCost: 120, ...applyEffects(p0, effects) };
}

export function getBodyBreakthroughBoard(p0, context = {}) {
  const checks = [
    { id: "stake", met: Boolean(p0.stakeId && p0.stakeProgress >= 1), label: "一门已经入门的桩功" },
    { id: "potential", met: Number(context.potential || 0) >= 200, label: "潜能二百" },
    { id: "wounds", met: !p0.wounds.some((wound) => Number(wound.severity || 0) >= 3), label: "没有阻塞性重伤" },
    { id: "experience", met: Boolean(p0.battleOutcome), label: "一次真正的生死见闻" },
  ];
  return { checks, available: checks.every((check) => check.met) };
}

export function resolveBodyBreakthrough(choiceId, p0, context = {}) {
  const board = getBodyBreakthroughBoard(p0, context);
  if (!board.available) return { available: false, board, reason: "突破条件尚未齐备。" };
  if (choiceId === "force") return { available: true, outcome: "death", cause: "强催气血冲断旧伤，桩架散去时心脉也随之停下。", memory: "突破时必须让桩功领着气血走，不能抢在呼吸之前。" };
  if (choiceId !== "steady") return null;
  return { available: true, outcome: "success", potentialCost: 200, ...applyEffects(p0, [
    { id: "body_stage_progress", type: "set", path: "bodyProgress", value: 1 },
    { id: "mid_autumn_clock", type: "set", path: "clock", value: { year: 427, month: 8, day: 14, segment: "evening", weather: "clear" } },
  ]) };
}

export function resolveMidAutumnTravel(routeId, p0, context = {}) {
  const routes = {
    water: { available: Boolean(context.hasWaterMindArt), outcome: p0.stakeId === "sea_stilling_stake" ? "on_time_fresh" : "on_time", clock: { year: 427, month: 8, day: 15, segment: "dawn", weather: "clear" }, wound: null },
    road: { available: true, outcome: "late", clock: { year: 427, month: 8, day: 15, segment: "afternoon", weather: "clear" }, wound: null },
    mountain: { available: true, outcome: p0.stakeId === "deadwood_stake" ? "wounded_stable" : "wounded", clock: { year: 427, month: 8, day: 15, segment: "morning", weather: "clear" }, wound: { id: "mountain_sprain", type: "strain", bodyPart: "leg", severity: p0.stakeId === "deadwood_stake" ? 1 : 3, tags: ["limits_chase"] } },
    delay: { available: true, outcome: "missed", clock: { year: 427, month: 8, day: 16, segment: "morning", weather: "clear" }, wound: null },
  };
  const route = routes[routeId];
  if (!route?.available) return { available: false, reason: "没有能在夜水中借力的心法。" };
  const effects = [
    { id: "mid_autumn_route", type: "set", path: "travelOutcome", value: route.outcome },
    { id: "mid_autumn_time", type: "set", path: "clock", value: route.clock },
    { id: "arrive_ruined_temple", type: "set", path: "location", value: "ruined_temple" },
  ];
  if (route.wound) effects.push({ id: "mountain_route_wound", type: "wound", wound: route.wound });
  return { available: true, outcome: route.outcome, onTime: !["late", "missed"].includes(route.outcome), ...applyEffects(p0, effects) };
}

export function resolveMonkeyTest(choiceId, p0, context = {}) {
  const choices = {
    share_peach: { outcome: "friend", available: Number(context.peaches || 0) > 0, peachCost: 1, effects: [
      { id: "monkey_friend_favor", type: "relation", npcId: "temple_monkeys", dimension: "favor", value: 25 },
      { id: "monkey_friend_trust", type: "relation", npcId: "temple_monkeys", dimension: "trust", value: 20 },
    ] },
    trade: { outcome: "neutral", available: Number(context.silver || 0) >= 1, silverCost: 1, effects: [
      { id: "monkey_trade_favor", type: "relation", npcId: "temple_monkeys", dimension: "favor", value: 10 },
    ] },
    grab: { outcome: "hostile", available: true, effects: [
      { id: "monkey_hostile_suspicion", type: "relation", npcId: "temple_monkeys", dimension: "suspicion", value: 30 },
    ] },
  };
  const choice = choices[choiceId];
  if (!choice?.available) return { available: false, reason: "手中没有可用来试探的东西。" };
  return { available: true, outcome: choice.outcome, peachCost: choice.peachCost || 0, silverCost: choice.silverCost || 0, ...applyEffects(p0, [
    { id: "monkey_test_outcome", type: "set", path: "monkeyOutcome", value: choice.outcome },
    ...choice.effects,
  ]) };
}

export function resolveMonkeyConflict(choiceId, p0) {
  if (p0.monkeyOutcome !== "hostile") return { available: false, reason: "猴群尚未与你动手。" };
  const choices = {
    root_and_endure: {
      available: p0.stakeId === "deadwood_stake",
      outcome: "endured",
      effects: [{ id: "monkey_stone_bruise", type: "wound", wound: { id: "monkey_stone_bruise", type: "bruise", bodyPart: "shoulder", severity: 1, tags: ["temporary"] } }],
    },
    anchor_and_withdraw: {
      available: p0.stakeId === "sea_stilling_stake",
      outcome: "withdrew_unhurt",
      effects: [],
    },
    flee: {
      available: true,
      outcome: "fled_wounded",
      effects: [{ id: "monkey_chase_sprain", type: "wound", wound: { id: "monkey_chase_sprain", type: "strain", bodyPart: "leg", severity: 2, tags: ["limits_chase"] } }],
    },
  };
  const choice = choices[choiceId];
  if (!choice?.available) return { available: false, reason: "所选桩功无法支持这一种应对。" };
  return { available: true, outcome: choice.outcome, ...applyEffects(p0, [
    { id: "monkey_conflict_outcome", type: "set", path: "monkeyConflictOutcome", value: choice.outcome },
    ...choice.effects,
  ]) };
}

export function resolveMonkeyWine(choiceId, p0) {
  if (p0.monkeyOutcome === "hostile") return { available: false, reason: "猴群已经把酒瓮带走。" };
  const choices = {
    share: { quantity: 1, relation: 15, outcome: "shared" },
    drink: { quantity: 0, relation: 3, outcome: "drank" },
    keep: { quantity: 2, relation: -5, outcome: "kept" },
  };
  const choice = choices[choiceId];
  if (!choice) return null;
  const effects = [
    { id: "monkey_wine_choice", type: "set", path: "wineChoice", value: choice.outcome },
    { id: "monkey_wine_relation", type: "relation", npcId: "temple_monkeys", dimension: "favor", value: choice.relation },
    { id: "open_monkey_trail", type: "set", path: "locationStates.monkey_trail", value: "open" },
  ];
  if (choice.quantity) effects.push({ id: "monkey_wine_item", type: "addItem", itemId: "monkey_wine", quantity: choice.quantity });
  return { available: true, outcome: choice.outcome, bodyGain: choiceId === "drink" ? 1 : 0, ...applyEffects(p0, effects) };
}

export function resolveApeLegacy(choiceId, p0) {
  if (p0.locationStates.monkey_trail !== "open") return { available: false, reason: "猴道尚未向你打开。" };
  if (!p0.monkeyOutcome || p0.monkeyOutcome === "hostile") return { available: false, reason: "猴群不允许你接近水洞。" };
  const outcome = choiceId === "imitate" ? "imitated_with_strain" : choiceId === "observe" ? "observed" : null;
  if (!outcome) return null;
  const effects = [
    { id: "open_ape_cave", type: "set", path: "locationStates.ape_water_cave", value: "open" },
    { id: "ape_legacy_outcome", type: "set", path: "legacyOutcome", value: outcome },
    { id: "ape_legacy_item", type: "addItem", itemId: "ape_relief_rubbing", quantity: 1 },
    { id: "ape_legacy_skill", type: "addSkill", skillId: "ape_legacy_clue", stage: "known", progress: choiceId === "imitate" ? 10 : 0 },
    { id: "p0_complete", type: "set", path: "complete", value: true },
  ];
  if (choiceId === "imitate") effects.push({ id: "ape_imitation_strain", type: "wound", wound: { id: "ape_imitation_strain", type: "strain", bodyPart: "shoulder", severity: 1, tags: ["temporary"] } });
  return { available: true, outcome, ...applyEffects(p0, effects) };
}
