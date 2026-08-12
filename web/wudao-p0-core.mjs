import { P0_ITEMS, P0_LOCATIONS, P0_NPCS, P0_SKILLS, getP0Item, getP0Location, getP0Npc, getP0Skill } from "./content/p0/catalogs.mjs?v=20260811.1";
import { P0_ARCS, P0_CONTENT_NODES, getP0Arc, getP0Node } from "./content/p0/arcs.mjs?v=20260811.1";

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
      yan_jinghong: relation(0, 58, 0, 0),
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
    battleOutcomeGrade: null,
    battleEdge: null,
    wangBattle: null,
    wangOutcome: null,
    wangConsequences: null,
    firstKill: false,
    firstKillChoice: null,
    activeMartial: { foundation: null, technique: null, stance: null },
    battleHistory: [],
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
    deathRecords: [],
    assailantPlot: {
      stage: "unknown",
      clues: [],
      traceAction: null,
      counterAction: null,
      outcome: null,
    },
    checkpoint: null,
    log: [],
  };
}

export function migrateP0State(savedP0) {
  const defaults = createP0State();
  const source = savedP0 && typeof savedP0 === "object" ? savedP0 : {};
  const legacyDeathRecords = Array.isArray(source.deathRecords)
    ? source.deathRecords
    : (source.deathMemory || []).map((insight, index) => ({
        id: `legacy_death_${index + 1}`,
        location: "旧日死局",
        cause: "旧存档未记下完整死因",
        insight,
        returnedTo: "最近因果节点",
        count: 1,
      }));
  return {
    ...defaults,
    ...source,
    eventStates: { ...defaults.eventStates, ...(source.eventStates || {}) },
    items: { ...defaults.items, ...(source.items || {}) },
    skills: { ...defaults.skills, ...(source.skills || {}) },
    hypotheses: { ...defaults.hypotheses, ...(source.hypotheses || {}) },
    activeMartial: { ...defaults.activeMartial, ...(source.activeMartial || {}) },
    assailantPlot: {
      ...defaults.assailantPlot,
      ...(source.assailantPlot || {}),
      clues: [...(source.assailantPlot?.clues || [])],
    },
    deathRecords: legacyDeathRecords,
    relationships: {
      ...defaults.relationships,
      ...(source.relationships || {}),
      bai_zhiyun: { ...defaults.relationships.bai_zhiyun, ...(source.relationships?.bai_zhiyun || {}) },
      cao_qing: { ...defaults.relationships.cao_qing, ...(source.relationships?.cao_qing || {}) },
      yan_jinghong: { ...defaults.relationships.yan_jinghong, ...(source.relationships?.yan_jinghong || {}) },
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
  for (const [sceneId, actions] of Object.entries(P0_SCENE_ACTIONS)) {
    const node = P0_CONTENT_NODES.find((entry) => entry.id === sceneId);
    if (!node) {
      errors.push(`动作协议场景不存在：${sceneId}`);
      continue;
    }
    const seenActions = new Set();
    for (const action of actions) {
      if (!action.id || !action.verb || !action.objectId || !action.objectName || !action.intent) errors.push(`动作协议字段不全：${sceneId}/${action.id || "unknown"}`);
      if (seenActions.has(action.id)) errors.push(`动作协议重复：${sceneId}/${action.id}`);
      seenActions.add(action.id);
      if (!node.actions.some((entry) => entry.id === action.id)) errors.push(`动作协议未登记到内容节点：${sceneId}/${action.id}`);
    }
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

const ATTRIBUTE_LABELS = {
  constitution: "根骨",
  insight: "悟性",
  agility: "身法",
  strength: "力道",
  fortune: "福缘",
};

const STAGE_ORDER = { mortal: 0, body: 1, qi: 2, meridian: 3, master: 4 };
const CHECK_TIER_LABELS = { great: "大成", success: "得手", costly: "得手有损", failure: "失手" };
const FIRST_BATTLE_ENEMY_MAX_HP = 18;

export const P0_SCENE_ACTIONS = {
  first_needle_ambush: [
    { id: "observe", verb: "观察", objectId: "night_assailant", objectName: "蒙面刀客", rounds: [1], intent: "识招", attribute: "insight", difficulty: 3, title: "让开半步，只看肩、胯与袖口", description: "放弃先手，用一轮换取对真正杀招的判断。", successPreview: "看破藏在左袖的短刃", riskPreview: "看慢一步会被刀锋擦伤" },
    { id: "extinguish", verb: "改变", objectId: "street_lantern", objectName: "街边灯笼", rounds: [1], intent: "借势", attribute: "agility", difficulty: 2, title: "借雨掠过檐下，打灭灯笼", description: "不与刀锋相碰，先夺走对手看路的光。", successPreview: "让刀客慢下一步", riskPreview: "身法不足会在转身时挨刀" },
    { id: "needle_wrist", verb: "出针", objectId: "weapon_wrist", objectName: "持刀手腕", rounds: [1, 2, 3], intent: "夺械", attribute: "insight", skillId: "spring_rain_needles", difficulty: 4, title: "春风针·封腕", description: "银针先取持刀手；若仍未看破暗招，腕停刀未必停。", successPreview: "封住明处刀腕", riskPreview: "未知后手可能直取要害" },
    { id: "seal", verb: "封穴", objectId: "assailant_meridians", objectName: "肩井与曲池", minRound: 2, requiresOpening: true, intent: "制伏", attribute: "insight", skillId: "spring_rain_needles", difficulty: 4, title: "春风针·封穴留命", description: "截断肩肘发力，留下一个能开口的活口。", successPreview: "制伏并保留口供", riskPreview: "失手会让左袖短刃逼近" },
    { id: "kill", verb: "穿喉", objectId: "assailant_throat", objectName: "刀客咽喉", minRound: 2, requiresOpening: true, intent: "杀死", attribute: "insight", skillId: "spring_rain_needles", difficulty: 3, title: "春风针·穿喉", description: "不给第二次出刀，也永远失去他的口供。", successPreview: "立即结束夜战", riskPreview: "留下尸体与第一条人命" },
    { id: "reckless", verb: "抢攻", objectId: "night_assailant", objectName: "蒙面刀客", rounds: [1, 2, 3], intent: "强攻", attribute: "strength", difficulty: 3, title: "迎刀抢进，逼他退步", description: "以力道撞开刀路；第一轮若仍盯着右手，会踏进死局。", successPreview: "逼乱刀客脚步", riskPreview: "未看破左袖时可能当场身死" },
    { id: "flee", verb: "脱离", objectId: "pharmacy_wall", objectName: "药铺矮墙", rounds: [1, 2, 3], intent: "脱身", attribute: "agility", difficulty: 0, ignoreStage: true, title: "翻过药铺矮墙脱身", description: "放弃追查刀客来路，保住性命和针匣。", successPreview: "安全离开长街", riskPreview: "敌人的回报渠道仍会运转" },
  ],
  assailant_trace: [
    { id: "question_captive", verb: "盘问", objectId: "night_assailant", objectName: "受制刀客", onlyOutcome: "subdued", intent: "追查", attribute: "insight", difficulty: 2, title: "循着他看向袖口的眼神盘问", description: "不问主人姓名，只问谁等回报、用什么暗语。", successPreview: "取得暗语、铜签和交接时辰", riskPreview: "逼得太急会让他咬破毒囊" },
    { id: "search_sleeves", verb: "搜查", objectId: "fallen_assailant", objectName: "刀客尸身", onlyOutcome: "killed", intent: "追查", attribute: "insight", difficulty: 2, title: "先查左袖夹层，再翻腰间暗袋", description: "死亡夺走口供，却留下无法自行销毁的凭证。", successPreview: "拼出回报暗语和交接地点", riskPreview: "巡夜更夫随时可能转进长街" },
    { id: "follow_rain_marks", verb: "追踪", objectId: "rain_footprints", objectName: "雨中足印", onlyOutcome: "escaped", intent: "追查", attribute: "agility", difficulty: 2, title: "不追刀光，只追檐下断续水痕", description: "保持一条街的距离，看他把回报凭证藏到哪里。", successPreview: "找到暗语、铜签和交接时辰", riskPreview: "身法不足会被反身发现" },
    { id: "leave_trace", verb: "放弃", objectId: "night_trace", objectName: "雨夜痕迹", intent: "保全", title: "收住脚步，先把夜战结果带回药铺", description: "不再碰这条线，避免下一名接头者察觉异常。", successPreview: "安全返回药铺", riskPreview: "永久失去这次回报窗口" },
  ],
  assailant_counterplan: [
    { id: "send_false_report", verb: "伪报", objectId: "assailant_channel", objectName: "灭口回报渠道", intent: "接管", attribute: "insight", difficulty: 3, requiresReadyPlot: true, title: "照暗语送出“药已回炉”", description: "让幕后人相信刀客得手，暂时把他的耳目变成你的耳目。", successPreview: "接管回报渠道", riskPreview: "措辞露馅会让下一批人提前戒备" },
    { id: "reverse_meeting", verb: "改写", objectId: "meeting_mark", objectName: "交接刻痕", intent: "设局", attribute: "fortune", difficulty: 2, requiresReadyPlot: true, title: "把交接刻痕改到沈家废渡", description: "不发假消息，只让接头者走进你选好的地方。", successPreview: "留下可反查的接头地点", riskPreview: "福缘不足时，对方可能察觉刻痕新旧" },
    { id: "warn_bai", verb: "告知", objectId: "bai_zhiyun", objectName: "白栀云", intent: "护人", title: "把铜签与暗语交给白栀云", description: "先保住被盯上的人，不再冒险利用敌人的渠道。", successPreview: "白栀云提高戒备并更信任你", riskPreview: "幕后人发现旧渠道失去回应" },
    { id: "destroy_channel", verb: "毁去", objectId: "fish_scale_token", objectName: "鱼鳞铜签", intent: "藏锋", title: "磨平铜签，截断这一夜的来往", description: "不求追凶，只让对方无法确认刀客究竟成败。", successPreview: "暂时隐藏夜战结果", riskPreview: "无法继续反查接头者" },
  ],
};

export function getSceneActions(sceneId, context = {}) {
  const actions = P0_SCENE_ACTIONS[sceneId] || [];
  return actions.filter((action) => {
    if (action.onlyOutcome && action.onlyOutcome !== context.battleOutcome) return false;
    if (action.rounds && !action.rounds.includes(Number(context.round || 1))) return false;
    if (action.minRound && Number(context.round || 1) < action.minRound) return false;
    if (action.requiresOpening && !context.hasOpening) return false;
    if (action.requiresReadyPlot && !context.plotReady) return false;
    if (action.id === "reckless" && Number(context.round || 1) === 1 && context.canRiskDeath === false) return false;
    if (action.id === "needle_wrist" && context.enemyWounded) return false;
    return true;
  }).map((action) => structuredClone(action));
}

function skillMastery(skill) {
  if (!skill || skill.stage === "known") return { available: false, bonus: 0, label: "尚未入门" };
  if (skill.stage === "mastered" || Number(skill.progress || 0) >= 100) return { available: true, bonus: 2, label: "精通" };
  if (skill.stage === "skilled" || Number(skill.progress || 0) >= 60) return { available: true, bonus: 1, label: "熟练" };
  return { available: true, bonus: 0, label: "入门" };
}

function stageModifier(playerStage, enemyStage, ignoreStage = false) {
  if (ignoreStage || !enemyStage) return { value: 0, label: null, blocked: false };
  const difference = Number(STAGE_ORDER[playerStage] || 0) - Number(STAGE_ORDER[enemyStage] || 0);
  if (difference >= 1) return { value: 2, label: `高于对手一境`, blocked: false };
  if (difference === 0) return { value: 0, label: "与对手同境", blocked: false };
  if (difference === -1) return { value: -2, label: `低于对手一境`, blocked: false };
  if (difference === -2) return { value: -4, label: `低于对手两境`, blocked: false };
  return { value: -4, label: `相差三境，不能正面取胜`, blocked: true };
}

function clampVitality(value, maximum) {
  return Math.max(0, Math.min(Number(maximum || 0), Number(value || 0)));
}

function firstBattlePlayerMaxHp(context = {}) {
  const constitution = Math.max(0, Number(context.attributes?.constitution || 0));
  const stageBonus = Math.max(0, Number(STAGE_ORDER[context.playerStage || "mortal"] || 0)) * 4;
  return 12 + constitution * 2 + stageBonus;
}

function firstBattleStartingWoundLoss(wounds = []) {
  return wounds.reduce((total, wound) => total + Math.max(0, Math.min(3, Number(wound.severity || 0))) * 2, 0);
}

export function getFirstBattleVitality(battle = null, context = {}) {
  const stored = battle?.vitality || {};
  const playerMax = Math.max(1, Number(stored.player?.max || firstBattlePlayerMaxHp(context)));
  const enemyMax = Math.max(1, Number(stored.enemy?.max || FIRST_BATTLE_ENEMY_MAX_HP));
  const playerDefault = Math.max(1, playerMax - firstBattleStartingWoundLoss(context.wounds || []));
  return {
    player: {
      current: clampVitality(stored.player?.current ?? playerDefault, playerMax),
      max: playerMax,
    },
    enemy: {
      current: clampVitality(stored.enemy?.current ?? enemyMax, enemyMax),
      max: enemyMax,
    },
  };
}

export function getFirstBattleIntentBoard(battle, context = {}) {
  const next = battle || createFirstBattle({ context });
  const knownFacts = new Set([...(next.knownFacts || []), ...(context.knownFacts || [])]);
  const knownSleeve = next.observedFeint || knownFacts.has("left_sleeve_blade");
  if (next.enemyWounded) {
    return {
      target: "你的旧伤与退路",
      threat: 4,
      sequence: knownSleeve
        ? ["右腕已僵，刀客以肩背强压距离", "左袖短刃沿旧伤补进"]
        : ["右腕已僵，刀客仍在遮掩左袖", "他准备贴身孤注一掷"],
    };
  }
  if (next.darkness) {
    return {
      target: "灯下残影",
      threat: 4,
      sequence: knownSleeve
        ? ["刀客循雨声摸向你的方位", "左袖短刃在贴身时兑现"]
        : ["刀客放低脚步试探方位", "未知后手藏在下一次贴近中"],
    };
  }
  if (knownSleeve) {
    return {
      target: "你的肋下",
      threat: 6,
      sequence: ["右手刀光诱你抢进", "左袖短刃随后穿向肋下"],
    };
  }
  return {
    target: "尚未看清",
    threat: 6,
    sequence: ["右手刀光逼你回应", "第二道动作仍被袖影遮住"],
  };
}

function firstBattleImpactPreview(action, battle) {
  const range = battle?.range === "close" ? "贴身" : battle?.range === "far" ? "远离" : "适中";
  const previews = {
    observe: { success: "识破后手，不造成伤害", risk: "自身气血 -2～5", position: `距离维持${range}` },
    extinguish: { success: "夺走灯火，退至远离", risk: "自身气血 -2～5", position: "檐柱形成遮挡" },
    needle_wrist: { success: "敌方气血 -3～5", risk: "自身气血 -2；未知后手可能致命", position: "距离维持适中" },
    seal: { success: "敌方气血压至 1，留下活口", risk: "自身气血 -2～5", position: "贴身封穴后结束" },
    kill: { success: "敌方气血归零", risk: "自身气血 -2～5", position: "穿喉后结束" },
    reckless: { success: "敌方气血 -4～6，逼入贴身", risk: "自身气血 -3～致命", position: "距离转为贴身" },
    flee: { success: "脱离战斗", risk: "自身气血 -2～5", position: "翻墙后远离" },
  };
  return previews[action.id] || { success: action.successPreview, risk: action.riskPreview, position: `当前${range}` };
}

function actionAdvantage(action, battle, context) {
  const knownFacts = new Set([...(battle?.knownFacts || []), ...(context.knownFacts || [])]);
  if (action.id === "question_captive" && context.battleEdge === "intact_captive") return "无伤制伏，毒囊尚未咬破";
  if (action.id === "search_sleeves" && context.battleEdge === "intact_token") return "穿喉一针没有毁伤左袖夹层";
  if (action.id === "follow_rain_marks" && context.battleEdge === "unseen_exit") return "脱身时没有惊动刀客回望";
  if (action.id === "observe" && knownFacts.has("left_sleeve_blade")) return "死中见闻已指出左袖";
  if (action.id === "extinguish" && battle?.terrain?.includes("rain")) return "雨夜灯焰不稳";
  if (["needle_wrist", "seal", "kill", "reckless"].includes(action.id)) {
    if (battle?.observedFeint || knownFacts.has("left_sleeve_blade")) return "已经看破左袖后手";
    if (battle?.darkness) return "灯灭使刀客慢了一步";
    if (battle?.enemyWounded) return "持刀手已经受制";
  }
  const vitality = getFirstBattleVitality(battle, context);
  if (["seal", "kill", "reckless"].includes(action.id) && vitality.enemy.current <= vitality.enemy.max / 2) return "刀客气血已失过半";
  return null;
}

function actionDisadvantage(action, battle, context) {
  const knownFacts = new Set([...(battle?.knownFacts || []), ...(context.knownFacts || [])]);
  if (["needle_wrist", "reckless"].includes(action.id) && Number(battle?.round || 1) === 1 && !knownFacts.has("left_sleeve_blade")) return "左袖仍有未知后手";
  const vitality = getFirstBattleVitality(battle, context);
  if (["needle_wrist", "seal", "kill", "reckless"].includes(action.id) && vitality.player.current <= vitality.player.max / 4) return "自身气血已经逼近断绝";
  return null;
}

function relevantWoundPenalty(action, wounds = []) {
  if (action.attribute === "agility") return wounds.some((wound) => wound.bodyPart === "leg" && Number(wound.severity || 0) >= 2) ? 1 : 0;
  if (action.attribute === "strength") return wounds.some((wound) => ["arm", "shoulder", "torso"].includes(wound.bodyPart) && Number(wound.severity || 0) >= 2) ? 1 : 0;
  if (action.skillId) return wounds.some((wound) => ["arm", "shoulder"].includes(wound.bodyPart) && Number(wound.severity || 0) >= 2) ? 1 : 0;
  return 0;
}

export function evaluateCombatAction(action, battle, context = {}) {
  if (!action) return { available: false, reason: "没有这个行动。" };
  const martialRequirement = action.skillId ? context.martialRequirements?.[action.skillId] : null;
  if (martialRequirement) return { available: false, reason: martialRequirement };
  const mastery = action.skillId ? skillMastery(context.skills?.[action.skillId]) : { available: true, bonus: 0, label: null };
  if (action.skillId && !mastery.available) return { available: false, reason: `尚未真正学会${getP0Skill(action.skillId)?.name || "这门武学"}。` };
  if (!action.attribute) return { available: true, rating: "safe", ratingLabel: "稳妥", tier: "success", reasons: ["无需正面较量"], score: 0, difficulty: 0, action };
  const attributeValue = Number(context.attributes?.[action.attribute] || 0);
  const stage = stageModifier(context.playerStage || "mortal", context.enemyStage || battle?.enemyStage, action.ignoreStage);
  if (stage.blocked && !["识招", "借势", "脱身"].includes(action.intent)) return { available: false, reason: "境界相差太远，只能观察、借势或脱身。", action };
  const advantage = actionAdvantage(action, battle, context);
  const disadvantage = actionDisadvantage(action, battle, context);
  const woundPenalty = relevantWoundPenalty(action, context.wounds || []);
  const upperHandBonus = battle?.upperHand && action.requiresOpening ? 1 : 0;
  const score = attributeValue + mastery.bonus + stage.value + (advantage ? 2 : 0) - (disadvantage ? 2 : 0) - woundPenalty + upperHandBonus;
  let tier = "failure";
  if (score >= action.difficulty + 2) tier = "great";
  else if (score >= action.difficulty) tier = "success";
  else if (score === action.difficulty - 1) tier = "costly";
  const knownFatal = action.id === "reckless" && Number(battle?.round || 1) === 1 && (battle?.knownFacts || []).includes("left_sleeve_blade");
  const scriptedFatal = action.id === "reckless" && Number(battle?.round || 1) === 1;
  let rating = ["great", "success"].includes(tier) ? "safe" : tier === "costly" ? "viable" : "dangerous";
  if (disadvantage && !["great", "success"].includes(tier)) rating = "dangerous";
  if (knownFatal) rating = "fatal";
  const ratingLabel = { safe: "稳妥", viable: "可行", dangerous: "凶险", fatal: "必死" }[rating];
  const reasons = [`${ATTRIBUTE_LABELS[action.attribute]} ${attributeValue}`];
  if (mastery.label) reasons.push(`${getP0Skill(action.skillId)?.name || action.skillId}${mastery.label} ${mastery.bonus ? `+${mastery.bonus}` : ""}`.trim());
  if (stage.label) reasons.push(stage.label);
  if (advantage) reasons.push(`${advantage}：有利`);
  if (disadvantage) reasons.push(`${disadvantage}：不利`);
  if (woundPenalty) reasons.push("相关伤势妨碍行动");
  if (upperHandBonus) reasons.push("上一手抢得先机 +1");
  return { available: true, rating, ratingLabel, tier: scriptedFatal ? "failure" : tier, reasons, score, difficulty: action.difficulty, attribute: action.attribute, skillId: action.skillId || null, advantage: Boolean(advantage), disadvantage: Boolean(disadvantage), action };
}

function hashCausalKey(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function rollCausalDie(seed, key, sides = 10) {
  const size = Math.max(2, Number(sides || 10));
  return (hashCausalKey(`${seed || "dayao"}:${key}`) % size) + 1;
}

function firstBattleCheckKey(action, battle, context) {
  const skill = action.skillId ? context.skills?.[action.skillId] : null;
  const wounds = (context.wounds || [])
    .map((wound) => `${wound.id}:${wound.bodyPart}:${wound.severity}`)
    .sort()
    .join(",");
  const knownFacts = [...new Set([...(battle.knownFacts || []), ...(context.knownFacts || [])])].sort().join(",");
  return [
    battle.id,
    `round-${battle.round}`,
    action.id,
    `facts-${knownFacts}`,
    `dark-${Number(Boolean(battle.darkness))}`,
    `enemy-wound-${Number(Boolean(battle.enemyWounded))}`,
    `player-wound-${Number(Boolean(battle.playerWounded))}`,
    `upper-${Number(Boolean(battle.upperHand))}`,
    `attribute-${Number(context.attributes?.[action.attribute] || 0)}`,
    `stage-${context.playerStage || "mortal"}`,
    `skill-${skill?.stage || "none"}-${Number(skill?.progress || 0)}`,
    `wounds-${wounds}`,
  ].join("|");
}

function forwardOutcomeCount(modifier, target) {
  const minimumRoll = target - 1 - modifier;
  if (minimumRoll <= 1) return 10;
  if (minimumRoll > 10) return 0;
  return 11 - minimumRoll;
}

function previewFirstBattleCheck(action, battle, context, evaluation) {
  if (!evaluation.available || !action.attribute) return evaluation;
  const target = 4 + Number(action.difficulty || 0);
  const forwardCount = forwardOutcomeCount(evaluation.score, target);
  const scriptedFatal = action.id === "reckless" && Number(battle.round || 1) === 1;
  const knownFatal = scriptedFatal && battle.knownFacts?.includes("left_sleeve_blade");
  let rating = forwardCount >= 8 ? "safe" : forwardCount >= 5 ? "viable" : "dangerous";
  if (scriptedFatal) {
    rating = knownFatal ? "fatal" : "dangerous";
    return {
      ...evaluation,
      rating,
      ratingLabel: { dangerous: "凶险", fatal: "必死" }[rating],
      check: null,
    };
  }
  return {
    ...evaluation,
    rating,
    ratingLabel: { safe: "稳妥", viable: "可行", dangerous: "凶险", fatal: "必死" }[rating],
    check: {
      die: "1D10",
      modifier: evaluation.score,
      target,
      greatTarget: target + 3,
      forwardCount,
    },
  };
}

function resolveFirstBattleCheck(action, battle, context, evaluation) {
  const preview = previewFirstBattleCheck(action, battle, context, evaluation);
  if (!preview.available || !preview.check) return { evaluation: preview, check: null };
  const key = firstBattleCheckKey(action, battle, context);
  const roll = rollCausalDie(context.fateSeed, key, 10);
  const total = roll + preview.check.modifier;
  let tier = "failure";
  if (total >= preview.check.greatTarget) tier = "great";
  else if (total >= preview.check.target) tier = "success";
  else if (total === preview.check.target - 1) tier = "costly";
  const check = {
    ...preview.check,
    round: battle.round,
    roll,
    total,
    tier,
    tierLabel: CHECK_TIER_LABELS[tier],
    causalKey: key,
  };
  return { evaluation: { ...preview, tier, check }, check };
}

export function getFirstBattleActions(battle, context = {}) {
  const next = battle || createFirstBattle();
  const vitality = getFirstBattleVitality(next, context);
  const hasOpening = Boolean(next.observedFeint || next.darkness || next.enemyWounded || next.knownFacts?.includes("left_sleeve_blade") || vitality.enemy.current <= vitality.enemy.max / 2);
  return getSceneActions("first_needle_ambush", { round: next.round, hasOpening, enemyWounded: next.enemyWounded, canRiskDeath: context.canRiskDeath })
    .map((action) => {
      const evaluation = evaluateCombatAction(action, next, { ...context, enemyStage: next.enemyStage });
      return {
        ...action,
        impactPreview: firstBattleImpactPreview(action, next),
        evaluation: previewFirstBattleCheck(action, next, context, evaluation),
      };
    });
}

export function grantSpringRainNeedles(p0) {
  return applyEffects(p0, [
    { id: "spring_needles_item", type: "addItem", itemId: "spring_rain_needles", quantity: 1 },
    { id: "spring_needles_skill", type: "addSkill", skillId: "spring_rain_needles", stage: "skilled", progress: 60 },
    { id: "spring_needles_active", type: "set", path: "activeMartial.technique", value: "spring_rain_needles" },
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

export function createFirstBattle(options = {}) {
  const knownFacts = [...new Set(options.knownFacts || [])];
  return {
    id: "first_needle_ambush",
    round: 1,
    range: "mid",
    terrain: ["alley", "night", "rain"],
    objective: "活过伏击，并决定留下活口、取命或脱身。",
    environment: [
      { id: "street_lantern", name: "街边灯笼", state: "lit" },
      { id: "eave_pillar", name: "药铺檐柱", state: "cover" },
      { id: "pharmacy_wall", name: "湿滑矮墙", state: "escape" },
    ],
    enemyStage: "body",
    enemyIntent: knownFacts.includes("left_sleeve_blade") ? "右手刀光仍是诱饵，左袖短刃正等你抢进。" : "蒙面刀客压低右肩，正借雨声逼近。",
    knownFacts,
    observedFeint: false,
    darkness: false,
    enemyWounded: false,
    playerWounded: false,
    upperHand: false,
    edge: null,
    lastCheck: null,
    lastResult: null,
    history: [],
    chosenIntent: null,
    vitality: getFirstBattleVitality(options.vitality ? { vitality: options.vitality } : null, options.context || options),
    finished: false,
  };
}

export function resolveFirstBattleAction(actionId, battle, context = {}) {
  const next = structuredClone(battle || createFirstBattle());
  if (!next.objective) next.objective = "活过伏击，并决定留下活口、取命或脱身。";
  if (!Array.isArray(next.environment) || !next.environment.length) {
    next.environment = [
      { id: "street_lantern", name: "街边灯笼", state: "lit" },
      { id: "eave_pillar", name: "药铺檐柱", state: "cover" },
      { id: "pharmacy_wall", name: "湿滑矮墙", state: "escape" },
    ];
  }
  next.vitality = getFirstBattleVitality(next, context);
  if (next.finished) return { available: false, reason: "这一战已经结束。" };
  const listed = getFirstBattleActions(next, context).find((entry) => entry.id === actionId);
  if (!listed) return { available: false, reason: "眼下不能这样行动。" };
  if (!listed.evaluation.available) return listed.evaluation;
  if (!context.hasNeedles && listed.skillId) return { available: false, reason: "手中没有可用银针。" };
  const scriptedDeath = actionId === "reckless" && next.round === 1;
  const resolvedCheck = scriptedDeath
    ? { evaluation: { ...listed.evaluation, tier: "failure", check: null }, check: null }
    : resolveFirstBattleCheck(listed, next, context, listed.evaluation);
  const evaluation = resolvedCheck.evaluation;
  const check = resolvedCheck.check;
  next.chosenIntent = listed.intent;
  next.lastCheck = check;
  const historyEntry = { round: next.round, actionId, verb: listed.verb, objectId: listed.objectId, intent: listed.intent, tier: evaluation.tier, check };
  const wound = (severity = 2) => ({ id: "left_rib_cut", type: "cut", bodyPart: "torso", severity, tags: ["limits_training"] });
  const startingVitality = {
    player: next.vitality.player.current,
    enemy: next.vitality.enemy.current,
  };
  const damage = (target, amount, floor = 0) => {
    const combatant = next.vitality[target];
    combatant.current = Math.max(floor, combatant.current - Math.max(0, Number(amount || 0)));
  };
  const impact = () => ({
    playerDamage: Math.max(0, startingVitality.player - next.vitality.player.current),
    enemyDamage: Math.max(0, startingVitality.enemy - next.vitality.enemy.current),
    playerHp: next.vitality.player.current,
    playerMaxHp: next.vitality.player.max,
    enemyHp: next.vitality.enemy.current,
    enemyMaxHp: next.vitality.enemy.max,
    range: next.range,
  });
  const stampHistory = () => {
    historyEntry.impact = impact();
  };
  const advance = (resultText, intentText) => {
    next.round += 1;
    next.lastResult = resultText;
    next.enemyIntent = intentText;
    stampHistory();
    next.history.push(historyEntry);
  };
  const finish = (outcome, resultText, extras = {}) => {
    next.finished = true;
    next.lastResult = resultText;
    next.edge = extras.edge || null;
    stampHistory();
    next.history.push(historyEntry);
    return { available: true, outcome, intent: listed.intent, evaluation, check, impact: impact(), battle: next, ...extras };
  };
  const die = (causeId, cause, memory) => {
    damage("player", next.vitality.player.current);
    next.lastResult = cause;
    stampHistory();
    next.history.push(historyEntry);
    return { available: true, outcome: "death", causeId, cause, memory, intent: listed.intent, evaluation, check, impact: impact(), battle: next };
  };
  const dieIfDepleted = (causeId, cause, memory) => next.vitality.player.current <= 0 ? die(causeId, cause, memory) : null;
  if (next.round === 1) {
    if (actionId === "reckless") {
      next.range = "close";
      return die("left_sleeve_blade", "你只盯着右手，左袖短刃从肋下穿入，气血顷刻归零。", "刀客右肩是诱饵，杀招藏在左袖。");
    }
    if (actionId === "observe") {
      const failed = evaluation.tier === "failure";
      const costly = evaluation.tier === "costly";
      next.observedFeint = !failed;
      next.upperHand = evaluation.tier === "great";
      if (!failed && !next.knownFacts.includes("left_sleeve_blade")) next.knownFacts.push("left_sleeve_blade");
      if (failed || costly) next.playerWounded = true;
      damage("player", failed ? 5 : costly ? 2 : 0);
      next.range = failed ? "close" : "mid";
      const depleted = dieIfDepleted("blood_exhausted_observing", "你强撑着看清第二道刀光，气血却先在肋下伤口里流尽。", "观察也需要留下承受一刀的余地；气血见底时应先借势或脱身。");
      if (depleted) return depleted;
      const resultText = failed
        ? "你看慢了一瞬，肋下先被刀锋擦开。"
        : evaluation.tier === "great"
          ? "你没有追右手刀光，还抢在刀客换步前看清了左袖短刃。"
          : costly
            ? "你看清左袖短刃时，肋下也被刀锋擦开。"
            : "你没有追右手刀光，终于看见左袖短刃。";
      advance(resultText, failed ? "刀客已经贴近，左袖仍藏在雨幕里。" : "右手仍在诱你，左袖短刃才是真正杀招。");
      return { available: true, outcome: "round", wound: failed ? wound(2) : costly ? wound(1) : null, intent: listed.intent, evaluation, check, impact: impact(), battle: next };
    }
    if (actionId === "extinguish") {
      const failed = evaluation.tier === "failure";
      const costly = evaluation.tier === "costly";
      next.darkness = !failed;
      next.upperHand = evaluation.tier === "great";
      if (failed || costly) next.playerWounded = true;
      damage("player", failed ? 5 : costly ? 2 : 0);
      next.range = failed ? "close" : "far";
      const lantern = next.environment?.find((entry) => entry.id === "street_lantern");
      if (lantern && !failed) lantern.state = "out";
      const depleted = dieIfDepleted("blood_exhausted_extinguishing", "你扫灭灯焰，肋下失血却让眼前黑得更早。", "借环境也不能忽略已经见底的气血。");
      if (depleted) return depleted;
      const resultText = failed
        ? "你没能先灯一步，转身时肋下见血。"
        : costly
          ? "灯焰灭了，刀锋也在你肋下带出一道血线。"
          : evaluation.tier === "great"
            ? "灯焰熄灭，你已先一步退进刀客视野之外。"
            : "针尾扫灭灯焰，刀客在黑暗里慢下一步。";
      advance(resultText, failed ? "灯仍亮着，刀客已经逼到适中距离。" : "灯灭后，他放低脚步摸向你的方位。");
      return { available: true, outcome: "round", wound: failed ? wound(2) : costly ? wound(1) : null, intent: listed.intent, evaluation, check, impact: impact(), battle: next };
    }
    if (actionId === "needle_wrist") {
      if (evaluation.tier === "failure") {
        next.range = "close";
        return die("left_sleeve_blade", "银针封住右腕，左袖短刃却已从肋下穿入，气血顷刻归零。", "封住明处刀腕并不等于封住左袖杀招。");
      }
      next.enemyWounded = true;
      if (evaluation.tier === "costly") next.playerWounded = true;
      damage("enemy", evaluation.tier === "great" ? 5 : evaluation.tier === "costly" ? 3 : 4, 1);
      damage("player", evaluation.tier === "costly" ? 2 : 0);
      next.range = "mid";
      const depleted = dieIfDepleted("blood_exhausted_wrist", "银针封住刀腕，你却没能封住自己流失的气血。", "气血见底时，即使得手有损也会变成死局。");
      if (depleted) return depleted;
      advance(evaluation.tier === "costly" ? "银针封住右腕，你也被左袖刀锋擦开肋下。" : "银针准确没入持刀手腕。", "右腕已僵，左袖短刃仍朝你腹间递来。");
      return { available: true, outcome: "round", wound: evaluation.tier === "costly" ? wound(1) : null, intent: listed.intent, evaluation, check, impact: impact(), battle: next };
    }
    if (actionId === "flee") {
      if (evaluation.tier === "failure") {
        next.playerWounded = true;
        damage("player", 5);
        next.range = "close";
        const depleted = dieIfDepleted("blood_exhausted_wall", "你没能翻过湿墙，腿伤与旧伤一齐抽空最后一口气。", "气血不足时，脱身也必须先制造距离。");
        if (depleted) return depleted;
        advance("你没能一次翻过湿墙，刀锋在腿侧划开一道口子。", "刀客已经逼到墙下，下一步必须换法脱身。");
        return { available: true, outcome: "wounded", wound: { id: "wall_leg_cut", type: "cut", bodyPart: "leg", severity: 2, tags: ["limits_travel"] }, intent: listed.intent, evaluation, check, impact: impact(), battle: next };
      }
      const suffered = evaluation.tier === "costly" ? { id: "wall_leg_cut", type: "cut", bodyPart: "leg", severity: 1, tags: ["limits_travel"] } : null;
      damage("player", suffered ? 2 : 0);
      next.range = "far";
      const depleted = dieIfDepleted("blood_exhausted_escape", "你翻过矮墙，落地时气血也随腿侧血线一同断绝。", "得手有损仍会扣除气血，见底前必须选择更稳妥的退路。");
      if (depleted) return depleted;
      return finish("escaped", suffered ? "你翻过矮墙脱身，落地时腿侧仍被刀锋带出一道血线。" : "你翻过矮墙，刀声被雨幕隔在身后。", { wound: suffered, edge: evaluation.tier === "great" ? "unseen_exit" : suffered ? "bloodied_finish" : null });
    }
  }
  if (next.round >= 2) {
    if (actionId === "flee") {
      if (evaluation.tier === "failure" && next.round < 3) {
        next.playerWounded = true;
        damage("player", 5);
        next.range = "close";
        const depleted = dieIfDepleted("blood_exhausted_wall", "你第二次扑向湿墙，腿侧刀伤抽空最后一口气。", "连续失手会真实削减气血，不能无限尝试同一条退路。");
        if (depleted) return depleted;
        advance("湿墙让你慢了一步，腿侧被刀锋追上。", "刀客也被墙角阻住，这是最后一次脱身机会。");
        return { available: true, outcome: "wounded", wound: { id: "wall_leg_cut", type: "cut", bodyPart: "leg", severity: 2, tags: ["limits_travel"] }, intent: listed.intent, evaluation, check, impact: impact(), battle: next };
      }
      const severity = evaluation.tier === "failure" ? 2 : evaluation.tier === "costly" ? 1 : 0;
      const suffered = severity ? { id: "wall_leg_cut", type: "cut", bodyPart: "leg", severity, tags: ["limits_travel"] } : null;
      damage("player", severity === 2 ? 5 : severity === 1 ? 2 : 0);
      next.range = "far";
      const depleted = dieIfDepleted("blood_exhausted_escape", "你终于越过矮墙，气血却在落地前彻底断绝。", "逃出刀路不等于熬过伤势，必须为最后一次失血留下余量。");
      if (depleted) return depleted;
      return finish("escaped", suffered ? "你带着腿伤翻过矮墙，终于把刀客甩进雨幕。" : "你借矮墙脱离刀路，保住针匣离开长街。", { wound: suffered, edge: evaluation.tier === "great" ? "unseen_exit" : suffered ? "bloodied_finish" : null });
    }
    if (["seal", "kill"].includes(actionId) && evaluation.tier !== "failure") {
      const suffered = evaluation.tier === "costly" ? wound(1) : null;
      if (suffered) next.playerWounded = true;
      damage("player", suffered ? 2 : 0);
      damage("enemy", actionId === "seal" ? Math.max(0, next.vitality.enemy.current - 1) : next.vitality.enemy.current, actionId === "seal" ? 1 : 0);
      next.range = "close";
      const depleted = dieIfDepleted("blood_exhausted_finisher", "最后一针已经递出，你也在刀客倒下前耗尽气血。", "收束动作仍可能付出气血，不能把“得手有损”当成无代价胜利。");
      if (depleted) return depleted;
      const great = evaluation.tier === "great";
      const resultText = actionId === "seal"
        ? great
          ? "银针先封毒囊再截肩肘，刀客无伤跪进雨水，仍留着完整口供。"
          : suffered
            ? "银针封住肩肘两穴，你也被最后一记回锋擦伤。"
            : "银针封住肩肘两穴，刀客四肢僵住跪进雨水。"
        : great
          ? "最后一针穿喉，刀客左袖夹层与鱼鳞铜签都没有受损。"
          : suffered
            ? "最后一针穿喉，你也被临死回锋割开肋下。"
            : "最后一针穿喉，刀客仰面倒进积水。代价随结果而来。";
      return finish(actionId === "seal" ? "subdued" : "killed", resultText, {
        wound: suffered,
        edge: great ? (actionId === "seal" ? "intact_captive" : "intact_token") : suffered ? "bloodied_finish" : null,
      });
    }
    if (["seal", "kill"].includes(actionId) && evaluation.tier === "failure") {
      if (next.playerWounded || next.round >= 3) {
        next.range = "close";
        return die("failed_finisher", "你第二次抢穴仍慢半步，左袖短刃沿旧伤送进心口，气血顷刻断绝。", "结束战斗前必须先真正制造优势，不能只凭看见破绽。");
      }
      next.playerWounded = true;
      damage("player", 5);
      next.range = "close";
      const depleted = dieIfDepleted("blood_exhausted_finisher", "银针擦穴而过，肋下失血先一步抽空气力。", "气血过低时不能继续抢穴，应先借势或脱身。");
      if (depleted) return depleted;
      advance("银针擦穴而过，刀锋在肋下留下伤口。", "刀客要沿着你的伤口继续逼近。");
      return { available: true, outcome: "wounded", wound: wound(2), intent: listed.intent, evaluation, check, impact: impact(), battle: next };
    }
    if (actionId === "needle_wrist" && !next.enemyWounded) {
      if (evaluation.tier === "failure" && (next.playerWounded || next.round >= 3)) {
        next.range = "close";
        return die("failed_wrist_check", "你再次只封住明处刀腕，左袖短刃沿着旧伤送入心口，气血顷刻断绝。", "连续失手时必须换法或脱身，不能反复追逐明处刀腕。");
      }
      if (evaluation.tier !== "failure") next.enemyWounded = true;
      if (["failure", "costly"].includes(evaluation.tier)) next.playerWounded = true;
      damage("enemy", evaluation.tier === "great" ? 5 : evaluation.tier === "success" ? 4 : evaluation.tier === "costly" ? 3 : 0, 1);
      damage("player", evaluation.tier === "failure" ? 5 : evaluation.tier === "costly" ? 2 : 0);
      next.range = evaluation.tier === "failure" ? "close" : "mid";
      const depleted = dieIfDepleted("blood_exhausted_wrist", "你仍在追逐刀腕，自己的气血却先沿旧伤流尽。", "连续夺械必须读取剩余气血，见底前要换法。");
      if (depleted) return depleted;
      advance(next.enemyWounded ? "持刀右腕终于被针封住。" : "针尖被刀背磕开，肋下再添一道伤。", next.enemyWounded ? "刀客只剩左袖短刃可以一搏。" : "刀客顺势压向你的旧伤。");
      const suffered = ["failure", "costly"].includes(evaluation.tier) ? wound(evaluation.tier === "failure" ? 2 : 1) : null;
      return { available: true, outcome: suffered ? "wounded" : "round", wound: suffered, intent: listed.intent, evaluation, check, impact: impact(), battle: next };
    }
    if (actionId === "reckless") {
      if (evaluation.tier === "failure" && (next.playerWounded || next.round >= 3)) {
        next.range = "close";
        return die("failed_force_entry", "你带伤再次撞进刀路，左袖短刃顺着破绽直入心口，气血顷刻断绝。", "带伤强攻只会让同一个破绽变成死路。");
      }
      if (evaluation.tier !== "failure") next.enemyWounded = true;
      next.playerWounded = evaluation.tier === "failure" || evaluation.tier === "costly";
      damage("enemy", evaluation.tier === "great" ? 6 : evaluation.tier === "success" ? 5 : evaluation.tier === "costly" ? 4 : 0, 1);
      damage("player", evaluation.tier === "failure" ? 5 : evaluation.tier === "costly" ? 3 : 0);
      next.range = "close";
      const depleted = dieIfDepleted("blood_exhausted_force", "你撞乱刀路，自己的气血也在贴身一刻彻底断绝。", "强攻会同时交换双方气血，低气血时不应继续换伤。");
      if (depleted) return depleted;
      advance(next.enemyWounded ? "你撞开刀路，逼得他左脚踏进积水。" : "你没能撞开刀势，肋下被回锋割伤。", next.enemyWounded ? "刀客下盘已乱，正在收回左袖。" : "刀客正沿伤口继续压进。");
      const suffered = next.playerWounded ? wound(evaluation.tier === "failure" ? 2 : 1) : null;
      return { available: true, outcome: suffered ? "wounded" : "round", wound: suffered, intent: listed.intent, evaluation, check, impact: impact(), battle: next };
    }
  }
  return null;
}

export function createDeathRecord({ id, location, cause, insight, returnedTo, round = null, check = null }) {
  return { id, location, cause, insight, returnedTo, round, check, count: 1 };
}

export function recordDeath(p0, record) {
  const next = structuredClone(p0);
  const existing = next.deathRecords.find((entry) => entry.id === record.id);
  if (existing) existing.count = Number(existing.count || 1) + 1;
  else next.deathRecords.push(structuredClone(record));
  if (record.insight && !next.deathMemory.includes(record.insight)) next.deathMemory.push(record.insight);
  return next;
}

function addPlotClues(plot, clues) {
  plot.clues = [...new Set([...(plot.clues || []), ...clues])];
}

export function getAssailantPlotBoard(p0) {
  const clues = new Set(p0.assailantPlot?.clues || []);
  const checks = [
    { id: "target", label: "知道刀客要确认谁已经死去", met: clues.has("target_needle_holder") },
    { id: "signal", label: "知道回报暗语“药已回炉”", met: clues.has("signal_medicine_returned") },
    { id: "token", label: "取得鱼鳞铜签", met: clues.has("fish_scale_token") },
    { id: "window", label: "知道丑时前送到东水门桥洞", met: clues.has("rain_report_window") },
  ];
  return { stage: p0.assailantPlot?.stage || "unknown", checks, ready: checks.every((check) => check.met), outcome: p0.assailantPlot?.outcome || null };
}

export function resolveAssailantTrace(actionId, p0, context = {}) {
  const action = getSceneActions("assailant_trace", { battleOutcome: p0.battleOutcome }).find((entry) => entry.id === actionId);
  if (!action) return { available: false, reason: "这条痕迹与眼前结果对不上。" };
  const next = structuredClone(p0);
  const plot = next.assailantPlot;
  plot.traceAction = actionId;
  if (actionId === "leave_trace") {
    plot.stage = "missed";
    plot.outcome = "abandoned";
    return { available: true, outcome: "abandoned", continueTo: "result", action, state: next };
  }
  const evaluation = evaluateCombatAction(action, null, { ...context, enemyStage: null });
  if (!evaluation.available) return evaluation;
  if (evaluation.tier === "failure") {
    plot.stage = "missed";
    plot.outcome = actionId === "follow_rain_marks" ? "spotted" : "clue_lost";
    return { available: true, outcome: plot.outcome, continueTo: "result", action, evaluation, state: next };
  }
  addPlotClues(plot, ["target_needle_holder", "signal_medicine_returned", "fish_scale_token", "rain_report_window"]);
  plot.stage = "seen_through";
  if (!next.evidence.includes("assailant_report_chain")) next.evidence.push("assailant_report_chain");
  next.items.fish_scale_token = 1;
  return { available: true, outcome: "seen_through", continueTo: "counterplan", action, evaluation, state: next };
}

export function resolveAssailantCounterAction(actionId, p0, context = {}) {
  const board = getAssailantPlotBoard(p0);
  const action = getSceneActions("assailant_counterplan", { plotReady: board.ready }).find((entry) => entry.id === actionId);
  if (!action) return { available: false, reason: "还没有足够条件走这条路。", board };
  const next = structuredClone(p0);
  const plot = next.assailantPlot;
  plot.counterAction = actionId;
  const evaluation = evaluateCombatAction(action, null, { ...context, enemyStage: null });
  if (!evaluation.available) return evaluation;
  if (actionId === "send_false_report") {
    plot.stage = evaluation.tier === "failure" ? "exposed" : "controlled";
    plot.outcome = evaluation.tier === "failure" ? "false_report_exposed" : "false_report";
    if (evaluation.tier !== "failure" && !next.evidence.includes("assailant_channel_controlled")) next.evidence.push("assailant_channel_controlled");
  } else if (actionId === "reverse_meeting") {
    plot.stage = evaluation.tier === "failure" ? "exposed" : "controlled";
    plot.outcome = evaluation.tier === "failure" ? "meeting_mark_exposed" : "reverse_meeting";
    if (evaluation.tier !== "failure" && !next.evidence.includes("receiver_route_reversed")) next.evidence.push("receiver_route_reversed");
  } else if (actionId === "warn_bai") {
    plot.stage = "broken";
    plot.outcome = "bai_guarded";
    next.relationships.bai_zhiyun.trust += 8;
    next.relationships.bai_zhiyun.debt += 5;
  } else {
    plot.stage = "hidden";
    plot.outcome = "channel_destroyed";
    next.items.fish_scale_token = 0;
  }
  return { available: true, outcome: plot.outcome, action, evaluation, state: next };
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
    { id: "active_stance", type: "set", path: "activeMartial.stance", value: stakeId },
    { id: "apprentice_confirmed", type: "set", path: "apprentice", value: true },
  ]);
}

export function resolveStakeTraining(p0, context = {}) {
  if (!p0.stakeId) return { available: false, reason: "尚未选定桩功。" };
  if (Number(context.potential || 0) < 120) return { available: false, reason: "阅历不足一百二十。" };
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
    { id: "potential", met: Number(context.potential || 0) >= 200, label: "阅历二百" },
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
