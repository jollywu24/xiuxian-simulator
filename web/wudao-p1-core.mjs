import { rollCausalDie } from "./wudao-p0-core.mjs?v=20260731.2";
import { P1_ARCS, P1_CONTENT_NODES, getP1Arc, getP1Node } from "./content/p1/arcs.mjs?v=20260731.2";
import { M4_EVIDENCE, M4_LOCATIONS, M4_METHOD } from "./content/p1/catalogs.mjs?v=20260731.2";

export { P1_ARCS, P1_CONTENT_NODES, M4_EVIDENCE, M4_LOCATIONS, M4_METHOD, getP1Arc, getP1Node };

const FAREWELL_AIDS = Object.freeze({
  medicine_key: { id: "medicine_key", name: "一把只可用一次的药库钥匙" },
  sealed_letter: { id: "sealed_letter", name: "写给白栀云的封口短札" },
  enemy_warning: { id: "enemy_warning", name: "毒蛇帮认路暗记" },
});

const MONEY_INQUIRY = Object.freeze({
  inspect_seal: "snake_seal",
  compare_tally: "missing_tally",
  question_source: "shen_fu_lie",
});

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

export function createM4State() {
  return {
    started: false,
    complete: false,
    node: "cao_departure",
    eventStates: {},
    appliedEffects: [],
    cao: {
      status: "present",
      permissions: { guidance: true, medicine: true, guarantee: true },
      partingAid: null,
    },
    shenIdentity: "cao_apprentice",
    contacts: {
      cao_qing: { status: "available", permissions: ["guidance", "medicine", "guarantee"] },
      shen_fu: { status: "available", permissions: ["side_gate", "kitchen", "boat_guard"] },
      replacement: null,
    },
    dirtyMoney: {
      id: "shen_fu_silver_chest",
      amount: 1,
      unit: "沉木钱匣",
      source: "unknown_water_route",
      holder: "shen_fu",
      knownBy: ["shen_fu"],
      legality: "suspected_illicit",
      evidence: [],
      exposure: 0,
      disposition: null,
      playerClaim: null,
    },
    shenFu: {
      greed: 1,
      fear: 1,
      suspicion: 0,
      status: "contact",
      witnessedActs: [],
      promise: null,
    },
    tracking: {
      stage: "none",
      action: null,
      grade: null,
      check: null,
      alert: 0,
      falseTrail: false,
      wound: null,
    },
    evidence: [],
    oldHouseChoice: null,
    outcome: null,
    contentVariant: null,
    worldEcho: null,
    baiInstruction: false,
    trainingOutcome: null,
    sevenKillClue: false,
    locationStates: {
      east_pharmacy: "open",
      shen_side_gate: "open",
      qinhuai_old_house: "hidden",
    },
    jianghuTrace: [],
  };
}

export function migrateM4State(savedM4) {
  const defaults = createM4State();
  const source = savedM4 && typeof savedM4 === "object" ? savedM4 : {};
  return {
    ...defaults,
    ...source,
    eventStates: { ...defaults.eventStates, ...(source.eventStates || {}) },
    cao: {
      ...defaults.cao,
      ...(source.cao || {}),
      permissions: { ...defaults.cao.permissions, ...(source.cao?.permissions || {}) },
    },
    contacts: {
      ...defaults.contacts,
      ...(source.contacts || {}),
      cao_qing: { ...defaults.contacts.cao_qing, ...(source.contacts?.cao_qing || {}) },
      shen_fu: { ...defaults.contacts.shen_fu, ...(source.contacts?.shen_fu || {}) },
    },
    dirtyMoney: {
      ...defaults.dirtyMoney,
      ...(source.dirtyMoney || {}),
      knownBy: unique(source.dirtyMoney?.knownBy || defaults.dirtyMoney.knownBy),
      evidence: unique(source.dirtyMoney?.evidence || []),
    },
    shenFu: { ...defaults.shenFu, ...(source.shenFu || {}), witnessedActs: unique(source.shenFu?.witnessedActs || []) },
    tracking: { ...defaults.tracking, ...(source.tracking || {}) },
    evidence: unique(source.evidence || []),
    locationStates: { ...defaults.locationStates, ...(source.locationStates || {}) },
    jianghuTrace: [...(source.jianghuTrace || [])],
  };
}

export function resolveCaoDeparture(choiceId, m4) {
  const aid = FAREWELL_AIDS[choiceId];
  if (!aid || m4.cao.status === "away") return { available: false, reason: "曹青已经离开，临行话不能重选。" };
  const next = migrateM4State(m4);
  next.started = true;
  next.cao.status = "away";
  next.cao.permissions = { guidance: false, medicine: false, guarantee: false };
  next.cao.partingAid = choiceId;
  next.contacts.cao_qing = { status: "away", permissions: [] };
  next.locationStates.east_pharmacy = "master_away";
  next.shenFu.witnessedActs = unique([...next.shenFu.witnessedActs, `chose_${choiceId}`]);
  return { available: true, aid, state: next };
}

export function resolveMoneyInquiry(actionId, m4) {
  const evidenceId = MONEY_INQUIRY[actionId];
  if (!evidenceId) return null;
  if (m4.evidence.includes(evidenceId)) return { available: false, reason: "这处疑点已经查过。" };
  const next = migrateM4State(m4);
  next.evidence = unique([...next.evidence, evidenceId]);
  next.dirtyMoney.evidence = unique([...next.dirtyMoney.evidence, evidenceId]);
  next.dirtyMoney.knownBy = unique([...next.dirtyMoney.knownBy, "chen_siming"]);
  if (actionId === "inspect_seal") next.dirtyMoney.source = "poison_snake_water_route";
  if (actionId === "question_source") {
    next.shenFu.suspicion += 1;
    next.shenFu.fear += 1;
  }
  return { available: true, evidence: M4_EVIDENCE[evidenceId], state: next };
}

export function getDirtyMoneyBoard(m4) {
  const evidence = m4.evidence.map((id) => M4_EVIDENCE[id]).filter(Boolean);
  return {
    evidence,
    canDecide: evidence.length >= 2,
    holder: m4.dirtyMoney.holder,
    sourceKnown: m4.dirtyMoney.source === "poison_snake_water_route",
    disposition: m4.dirtyMoney.disposition,
  };
}

export function resolveDirtyMoneyChoice(choiceId, m4, context = {}) {
  const board = getDirtyMoneyBoard(m4);
  if (!board.canDecide) return { available: false, reason: "至少还要看清两处疑点，才知道这箱钱会牵动谁。" };
  if (m4.dirtyMoney.disposition) return { available: false, reason: "这箱钱已经有了去处。" };
  if (choiceId === "report" && !(m4.cao.partingAid === "sealed_letter" || Number(context.baiTrust || 0) >= 20 || Number(context.baiDebt || 0) >= 20)) {
    return { available: false, reason: "没有能让沈家内宅听你说话的人，也没有曹青留下的短札。" };
  }
  if (choiceId === "trap" && m4.evidence.length < 3) return { available: false, reason: "疑点还不够完整，留下钱匣只会把自己变成饵。" };
  const choices = {
    report: { holder: "bai_zhiyun", claim: null, greed: 0, fear: 3, suspicion: 2, promise: "reported", exposure: 0 },
    share: { holder: "shen_fu", claim: "half_share", greed: 4, fear: 1, suspicion: 0, promise: "shared", exposure: 2 },
    hide: { holder: "chen_siming", claim: "whole_chest", greed: 2, fear: 2, suspicion: 3, promise: "hidden", exposure: 2 },
    trap: { holder: "bait_cache", claim: null, greed: 2, fear: 2, suspicion: 1, promise: "counterplot", exposure: 1 },
    refuse: { holder: "shen_fu", claim: null, greed: 2, fear: 2, suspicion: 2, promise: "refused", exposure: 0 },
  };
  const choice = choices[choiceId];
  if (!choice) return null;
  const next = migrateM4State(m4);
  next.dirtyMoney.disposition = choiceId;
  next.dirtyMoney.holder = choice.holder;
  next.dirtyMoney.playerClaim = choice.claim;
  next.dirtyMoney.exposure += choice.exposure;
  next.dirtyMoney.knownBy = unique([...next.dirtyMoney.knownBy, ...(choiceId === "report" ? ["bai_zhiyun"] : [])]);
  next.shenFu.greed += choice.greed;
  next.shenFu.fear += choice.fear;
  next.shenFu.suspicion += choice.suspicion;
  next.shenFu.promise = choice.promise;
  next.shenFu.witnessedActs = unique([...next.shenFu.witnessedActs, `money_${choiceId}`]);
  return { available: true, outcome: choiceId, state: next };
}

function trackingModifier(action, m4, context) {
  let modifier = Number(context.attributes?.[action.attribute] || 0);
  const reasons = [`${action.attributeName}${modifier}`];
  if (action.id === "water_break" && context.hasWaterMindArt) { modifier += 2; reasons.push("鱼跃龙门诀 +2"); }
  if (action.id === "water_break" && context.stakeId === "sea_stilling_stake") { modifier += 1; reasons.push("沧澜定海桩 +1"); }
  if (action.id === "shadow_steps" && context.fishingRodMethod) { modifier += 1; reasons.push("打鱼杆法借物探路 +1"); }
  if (action.id === "countermark" && m4.cao.partingAid === "enemy_warning") { modifier += 2; reasons.push("曹青留下暗记 +2"); }
  if (action.id === "countermark" && context.assailantChannelControlled) { modifier += 1; reasons.push("曾接管回报渠道 +1"); }
  if (action.id === "protect_witness" && Number(context.baiTrust || 0) >= 20) { modifier += 2; reasons.push("白栀云信任 +2"); }
  if (m4.dirtyMoney.disposition === "trap") { modifier += 1; reasons.push("钱匣作饵 +1"); }
  if (m4.dirtyMoney.exposure >= 2) { modifier -= 1; reasons.push("钱路暴露 -1"); }
  return { modifier, reasons };
}

export const M4_TRACKING_ACTIONS = Object.freeze([
  { id: "shadow_steps", title: "隔着两条巷子跟住沈福", attribute: "agility", attributeName: "身法", intent: "追人" },
  { id: "water_break", title: "借秦淮支流断掉毒蛇帮尾巴", attribute: "constitution", attributeName: "根骨", intent: "断踪" },
  { id: "countermark", title: "把旧回报暗记反贴到收货人身上", attribute: "insight", attributeName: "悟性", intent: "反查" },
  { id: "protect_witness", title: "先把知情人送进内宅，再循空箱追路", attribute: "fortune", attributeName: "福缘", intent: "护人" },
]);

export function getM4TrackingActions(m4, context = {}) {
  return M4_TRACKING_ACTIONS.map((action) => {
    const { modifier, reasons } = trackingModifier(action, m4, context);
    const key = ["m4_tracking", action.id, m4.dirtyMoney.disposition, m4.evidence.slice().sort().join(","), modifier].join("|");
    const die = rollCausalDie(context.fateSeed, key, 10);
    const total = die + modifier;
    const grade = total >= 13 ? "great" : total >= 10 ? "success" : total >= 7 ? "costly" : "failure";
    return { ...action, modifier, reasons, check: { die, modifier, total, target: 10, grade, causalKey: key } };
  });
}

export function resolveM4Tracking(actionId, m4, context = {}) {
  if (m4.tracking.action) return { available: false, reason: "这次追踪已经走出了结果。" };
  const action = getM4TrackingActions(m4, context).find((entry) => entry.id === actionId);
  if (!action) return null;
  const next = migrateM4State(m4);
  next.tracking = { ...next.tracking, stage: "resolved", action: actionId, grade: action.check.grade, check: action.check };
  next.locationStates.qinhuai_old_house = "discovered";
  if (action.check.grade === "great") {
    next.evidence = unique([...next.evidence, "hidden_ledger", "collector_token"]);
  } else if (action.check.grade === "success") {
    next.evidence = unique([...next.evidence, "hidden_ledger"]);
  } else if (action.check.grade === "costly") {
    next.evidence = unique([...next.evidence, "hidden_ledger"]);
    next.tracking.alert = 1;
    next.tracking.wound = "m4_alley_bruise";
  } else {
    next.evidence = unique([...next.evidence, "torn_account_page"]);
    next.tracking.alert = 2;
    next.tracking.falseTrail = true;
    next.locationStates.qinhuai_old_house = "watched";
  }
  next.dirtyMoney.evidence = unique([...next.dirtyMoney.evidence, ...next.evidence.filter((id) => ["hidden_ledger", "collector_token", "torn_account_page"].includes(id))]);
  return { available: true, action, outcome: action.check.grade, state: next };
}

export function resolveOldHouseChoice(choiceId, m4, context = {}) {
  if (m4.oldHouseChoice) return { available: false, reason: "旧宅里最要紧的一步已经选定。" };
  if (choiceId === "send_bai_message" && !(m4.cao.partingAid === "sealed_letter" || Number(context.baiTrust || 0) >= 20 || m4.dirtyMoney.disposition === "report")) {
    return { available: false, reason: "白栀云还没有理由为一张来历不明的字条调动内宅人手。" };
  }
  const next = migrateM4State(m4);
  next.oldHouseChoice = choiceId;
  if (choiceId === "search_drawer") {
    next.evidence = unique([...next.evidence, "seven_kill_rubbing"]);
    next.sevenKillClue = true;
    next.tracking.alert += 1;
  } else if (choiceId === "watch_door") {
    next.evidence = unique([...next.evidence, "collector_token"]);
    next.tracking.alert = Math.max(0, next.tracking.alert - 1);
  } else if (choiceId === "send_bai_message") {
    next.evidence = unique([...next.evidence, "seven_kill_rubbing"]);
    next.sevenKillClue = true;
    next.dirtyMoney.knownBy = unique([...next.dirtyMoney.knownBy, "bai_zhiyun"]);
  } else return null;
  next.dirtyMoney.evidence = unique([...next.dirtyMoney.evidence, ...next.evidence.filter((id) => M4_EVIDENCE[id])]);
  return { available: true, state: next };
}

export function getM4OutcomeBoard(m4, context = {}) {
  const strongEvidence = m4.evidence.filter((id) => ["snake_seal", "missing_tally", "hidden_ledger", "collector_token", "seven_kill_rubbing"].includes(id));
  const support = m4.cao.partingAid === "sealed_letter" || Number(context.baiTrust || 0) >= 20 || Number(context.baiDebt || 0) >= 20 || m4.dirtyMoney.disposition === "report";
  const canControl = strongEvidence.length >= 3 || (m4.dirtyMoney.disposition === "trap" && strongEvidence.length >= 2);
  const canExpose = strongEvidence.length >= 2 && support;
  const canKill = context.martialStage === "body" && Boolean(context.hasKillingMethod);
  return {
    evidence: strongEvidence,
    options: [
      { id: "control", available: canControl, reason: canControl ? "账证足以同时捏住沈福与收货人。" : "至少需要三项硬证，或先把钱匣布成饵。" },
      { id: "expose", available: canExpose, reason: canExpose ? "物证与内宅担保已经齐备。" : "需要两项硬证，以及白栀云或曹青留下的担保。" },
      { id: "release", available: true, reason: "放他走不需要额外条件，但旧门路会永久断裂。" },
      { id: "kill", available: canKill, reason: canKill ? "锻体与已经见血的手段足以抢在帮众合围前取命。" : "需要锻体境和一门已经实战的杀伐手段。" },
    ],
  };
}

export function resolveM4Outcome(choiceId, m4, context = {}) {
  if (m4.outcome) return { available: false, reason: "沈福的去路已经定下。" };
  const gate = getM4OutcomeBoard(m4, context).options.find((entry) => entry.id === choiceId);
  if (!gate) return null;
  if (!gate.available) return { available: false, reason: gate.reason };
  const next = migrateM4State(m4);
  next.outcome = choiceId === "release" ? "released" : choiceId === "kill" ? "killed" : choiceId === "expose" ? "exposed" : "controlled";
  if (next.outcome === "controlled") {
    next.contentVariant = "controlled";
    next.shenFu.status = "controlled";
    next.contacts.shen_fu = { status: "compromised", permissions: ["conditional_side_gate", "risky_goods"] };
    next.shenIdentity = "dangerous_variable";
    next.tracking.alert += 1;
    next.locationStates.shen_side_gate = "watched_but_open";
    next.worldEcho = "沈福仍会开门，但每一次开门都像在计算下一次背叛。";
  } else if (next.outcome === "exposed") {
    next.contentVariant = "exposed";
    next.shenFu.status = "detained_witness";
    next.contacts.shen_fu = { status: "closed", permissions: [] };
    next.contacts.replacement = "bai_steward";
    next.shenIdentity = "inner_house_witness";
    next.locationStates.shen_side_gate = "restricted_replacement";
    next.worldEcho = "侧门不再认沈福的笑脸，只认白栀云内宅发出的一次性口信。";
  } else if (next.outcome === "released") {
    next.contentVariant = "broken";
    next.shenFu.status = "missing";
    next.contacts.shen_fu = { status: "closed", permissions: [] };
    next.shenIdentity = "unsettled_loose_end";
    next.tracking.alert += 2;
    next.locationStates.shen_side_gate = "closed";
    next.locationStates.qinhuai_old_house = "abandoned";
    next.worldEcho = "沈福没有再回沈家；有人却在打听是谁最后见过他。";
  } else {
    next.contentVariant = "broken";
    next.shenFu.status = "dead";
    next.contacts.shen_fu = { status: "closed", permissions: [] };
    next.shenIdentity = "suspected_killer";
    next.tracking.alert += 3;
    next.locationStates.shen_side_gate = "sealed";
    next.locationStates.qinhuai_old_house = "bloodied";
    next.worldEcho = "沈福死后，灶房、侧门和走船护院同时装作从未认识你。";
  }
  return { available: true, outcome: next.outcome, state: next };
}

export function canReceiveBaiInstruction(m4, context = {}) {
  return Boolean(m4.sevenKillClue || m4.outcome === "exposed") && (Number(context.baiTrust || 0) >= 20 || Number(context.baiDebt || 0) >= 20 || m4.cao.partingAid === "sealed_letter");
}

export function resolveBaiInstruction(choiceId, m4, context = {}) {
  if (m4.baiInstruction || m4.trainingOutcome) return { available: false, reason: "这次夜授已经结清。" };
  const next = migrateM4State(m4);
  if (choiceId === "decline") return { available: true, outcome: "declined", state: next };
  if (choiceId !== "receive") return null;
  if (!canReceiveBaiInstruction(m4, context)) return { available: false, reason: "七杀旧账或救命关系还不足以让白栀云亲自拆招。" };
  next.baiInstruction = true;
  return { available: true, outcome: "learned", method: M4_METHOD, state: next };
}

export function resolveM4Training(choiceId, m4, context = {}) {
  if (m4.trainingOutcome) return { available: false, reason: "离城前的时间只够完成一件事。" };
  const next = migrateM4State(m4);
  if (choiceId === "apply_to_stake") {
    if (!m4.baiInstruction || !context.stakeId) return { available: false, reason: "需要白栀云拆过卸力法，也需要一门已经入门的桩功。" };
    next.trainingOutcome = context.stakeId === "sea_stilling_stake" ? "water_formula" : "wound_cycle";
  } else if (choiceId === "seal_old_blade") {
    if (!m4.baiInstruction || !m4.sevenKillClue) return { available: false, reason: "没有卸力三诀或七杀刀拓痕，贸然触碰只会被刀势牵动。" };
    next.trainingOutcome = "seven_kill_guarded";
  } else if (choiceId === "leave_city") {
    next.trainingOutcome = "safe_departure";
  } else return null;
  return { available: true, outcome: next.trainingOutcome, state: next };
}

export function buildM4JianghuTrace(m4) {
  const outcomeLines = {
    controlled: { text: "你没有杀沈福，却让他今后每开一次侧门都要先想起夹墙暗账。", source: "沈福·受控" },
    exposed: { text: "你把沈福和账证一起送进内宅，换来一条更干净、也更受约束的新门路。", source: "沈福·交人" },
    released: { text: "你放沈福离开金陵；从此没人再替你进灶房，也没人知道他会把名字卖给谁。", source: "沈福·失踪" },
    killed: { text: "你在月黑风高时取了沈福的命，旧人情、旧门路和他的口供一并断绝。", source: "沈福·死亡" },
  };
  const trainingLines = {
    water_formula: { text: "白栀云的卸力三诀落进定海桩，你第一次听懂‘淼’字为何要从三股水势中站稳。", source: "闭门试势·定海" },
    wound_cycle: { text: "白栀云的卸力三诀落进枯木桩，旧伤不再只是负担，也成了辨认气血回流的刻度。", source: "闭门试势·枯木" },
    seven_kill_guarded: { text: "你没有拔出七杀旧刀，只学会隔着刀衣听出它最先牵动哪一处经脉。", source: "七杀旧账·封刀" },
    safe_departure: { text: "你没有贪最后一次闭关，趁追索尚未合拢先离开旧住处。", source: "离城准备·先行" },
  };
  const lines = [
    { text: "曹青离开金陵以后，药库、指点与师父担保第一次同时从你身后撤去。", source: "曹青·离场" },
    { text: `你从一只沉木钱匣里认出了${m4.evidence.some((id) => id === "snake_seal" || id === "collector_token") ? "毒蛇帮水路" : "无法洗净的私账"}，钱从此不再只是钱。`, source: "不义之财·来源" },
    outcomeLines[m4.outcome],
    { text: m4.worldEcho || "沈家旧门路已经改变，没有人还能装作一切照旧。", source: "沈家·门路" },
    m4.sevenKillClue ? { text: "七道拓痕把沈福私账牵回沈家旧宅，七杀刀第一次成为你的见闻。", source: "秦淮旧宅·刀痕" } : { text: "你错过了旧宅最深处的刀痕，七杀旧账仍只露出半角。", source: "秦淮旧宅·缺页" },
    trainingLines[m4.trainingOutcome],
  ].filter(Boolean);
  return lines.slice(0, 8);
}

export function completeM4(m4) {
  if (!m4.outcome || !m4.trainingOutcome) return { available: false, reason: "沈福的去路或离城准备还没有结清。" };
  const next = migrateM4State(m4);
  next.complete = true;
  next.jianghuTrace = buildM4JianghuTrace(next);
  return { available: true, state: next };
}

export function validateP1Content() {
  const errors = [];
  const nodeIds = new Set();
  for (const node of P1_CONTENT_NODES) {
    if (!node.id) errors.push("内容节点缺少ID");
    if (nodeIds.has(node.id)) errors.push(`重复节点：${node.id}`);
    nodeIds.add(node.id);
    if (!Array.isArray(node.actions) || !node.actions.length) errors.push(`节点没有行动：${node.id}`);
    for (const action of node.actions || []) {
      if (!action.id) errors.push(`行动缺少ID：${node.id}`);
      if (!Array.isArray(action.outcomes) || !action.outcomes.length) errors.push(`行动没有结果：${node.id}/${action.id}`);
    }
  }
  for (const node of P1_CONTENT_NODES) {
    for (const action of node.actions || []) {
      if (action.next && !nodeIds.has(action.next)) errors.push(`坏跳转：${node.id}/${action.id} -> ${action.next}`);
    }
  }
  for (const arc of P1_ARCS) {
    if (!nodeIds.has(arc.entry)) errors.push(`篇章入口不存在：${arc.id}`);
    for (const exit of arc.exits || []) if (!nodeIds.has(exit)) errors.push(`篇章出口不存在：${arc.id}/${exit}`);
    if ((arc.coreVariants || []).length > 3) errors.push(`核心内容变体超过三种：${arc.id}`);
    const routes = arc.solutionMatrix || [];
    if (routes.length < 3) errors.push(`核心局面不足三条解法：${arc.id}`);
    if (routes.filter((route) => route.kind !== "combat").length < 2) errors.push(`核心局面不足两条非战斗解法：${arc.id}`);
  }
  return { ok: errors.length === 0, errors, nodeCount: P1_CONTENT_NODES.length, arcCount: P1_ARCS.length };
}
