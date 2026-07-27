export const MARTIAL_SAVE_VERSION = 1;

export const MARTIAL_CATEGORIES = Object.freeze([
  { id: "heart", name: "心法", glyph: "心" },
  { id: "technique", name: "招式", glyph: "式" },
  { id: "movement", name: "轻功", glyph: "轻" },
  { id: "body", name: "锻体", glyph: "体" },
]);

export const MARTIAL_TECHNIQUE_SUBTYPES = Object.freeze([
  { id: "all", name: "全部" },
  { id: "sword", name: "剑法" },
  { id: "saber", name: "刀法" },
  { id: "fist", name: "拳掌" },
  { id: "polearm", name: "枪棍" },
  { id: "hidden_weapon", name: "暗器" },
]);

export const MARTIAL_GRADES = Object.freeze({
  rudimentary: { id: "rudimentary", name: "粗浅", order: 0 },
  ordinary: { id: "ordinary", name: "寻常", order: 1 },
  superior: { id: "superior", name: "上乘", order: 2 },
  peerless: { id: "peerless", name: "绝学", order: 3 },
  sect: { id: "sect", name: "镇派", order: 4 },
});

export const MARTIAL_MASTERIES = Object.freeze({
  unlearned: { id: "unlearned", name: "未入门", order: 0, combatStage: "known", combatBonus: 0 },
  beginner: { id: "beginner", name: "入门", order: 1, combatStage: "learned", combatBonus: 0 },
  skilled: { id: "skilled", name: "熟练", order: 2, combatStage: "skilled", combatBonus: 1 },
  expert: { id: "expert", name: "精通", order: 3, combatStage: "mastered", combatBonus: 2 },
  perfect: { id: "perfect", name: "圆满", order: 4, combatStage: "mastered", combatBonus: 2 },
});

export const MARTIAL_SLOTS = Object.freeze([
  { id: "heart", category: "heart", name: "心法" },
  { id: "technique1", category: "technique", name: "招式一" },
  { id: "technique2", category: "technique", name: "招式二" },
  { id: "technique3", category: "technique", name: "招式三" },
  { id: "movement", category: "movement", name: "轻功" },
  { id: "body", category: "body", name: "锻体" },
]);

const STAGE_ORDER = Object.freeze({
  mortal: 0,
  body: 1,
  breath: 2,
  qi: 2,
  meridian: 3,
  master: 4,
});

const BREAKTHROUGH_COSTS = Object.freeze({
  beginner: 80,
  skilled: 80,
  expert: 120,
  perfect: 200,
});

const MASTERY_SEQUENCE = Object.freeze(["unlearned", "beginner", "skilled", "expert", "perfect"]);

function node(id, name, stage, kind, description, extra = {}) {
  return Object.freeze({ id, name, stage, kind, description, ...extra });
}

function martial(config) {
  return Object.freeze({
    subtype: null,
    tags: [],
    weaponRequirement: null,
    damage: null,
    metrics: {},
    nodes: [],
    narrativeUses: [],
    bodyBonuses: {},
    ...config,
  });
}

export const MARTIAL_DEFINITIONS = Object.freeze([
  martial({
    id: "fish_leap_art",
    legacyIds: ["carp_dragon_gate"],
    name: "鱼跃龙门诀",
    category: "heart",
    grade: "ordinary",
    icon: "fish",
    source: "龙青鱼以江鲤行波图灌顶所授",
    summary: "借水势调息行身，先能闭气逆流，聚气以后才可借流催劲。",
    tags: ["水意", "调息", "临水", "龙青鱼"],
    metrics: {
      body: [
        ["行水", "体力消耗降低"],
        ["闭气", "可长时潜水"],
        ["真气", "尚未聚气"],
      ],
      qi: [
        ["催动", "借流换距"],
        ["恢复", "临水得手时"],
        ["方向", "卸力／身法"],
      ],
    },
    nodes: [
      node("carp_in_current", "江鲤行波", "beginner", "passive", "临水行动更稳，长途涉水的体力消耗降低。"),
      node("under_current", "潜流于渊", "skilled", "passive", "观察水意武学、药性与暗流时，更容易看见关键条件。"),
      node("borrow_current", "借流", "expert", "active", "聚气后消耗一点真气，借水势换距或卸去一次冲击。", { requiresStage: "qi" }),
      node("leap_dragon_gate", "鱼跃龙门", "perfect", "passive", "真实战胜高于自身境界的敌人后，开放品阶晋升命题。"),
    ],
    narrativeUses: ["water_travel", "hold_breath", "read_current", "water_alchemy"],
  }),
  martial({
    id: "spring_rain_needles",
    name: "春风化雨针",
    category: "technique",
    subtype: "hidden_weapon",
    grade: "superior",
    icon: "needles",
    source: "白栀云因救命之恩传下的医针与杀针",
    summary: "以悟性辨脉，以银针封腕、封穴；同一门针法既可救人，也可取命。",
    tags: ["暗器", "医术", "点穴", "白栀云"],
    weaponRequirement: {
      label: "针",
      itemIds: ["spring_rain_needle_case"],
    },
    damage: {
      kind: "ranged",
      attribute: "insight",
      techniquePower: 2,
      maxBonus: 1,
      actionCost: 2,
      range: ["middle", "far"],
      ignoreReduction: 1,
    },
    nodes: [
      node("seal_wrist", "封腕", "beginner", "active", "中远距出针，截断持械手的发力。"),
      node("observe_meridians", "观脉", "skilled", "passive", "首次观察目标时揭示一处可封穴的经脉破绽。"),
      node("seal_acupoint", "封穴", "expert", "active", "看破破绽后封住肩井与曲池，制伏而不杀。"),
      node("needle_follows_mind", "针随心走", "perfect", "passive", "医治或点穴得手有损时，可以选择保全目标或保全自身位置。"),
    ],
    narrativeUses: ["stop_bleeding", "diagnose_meridian", "wake_unconscious", "disable_silently"],
  }),
  martial({
    id: "fishing_rod_method",
    name: "打鱼杆法",
    category: "technique",
    subtype: "polearm",
    grade: "rudimentary",
    icon: "rod",
    source: "紫金河老渔王五所授",
    summary: "伤害不算高，却能在中距扫腿、缠兵，也能探路、打捞和触动远物。",
    tags: ["枪棍", "水路", "控距", "王五"],
    weaponRequirement: {
      label: "枪棍",
      itemIds: ["river_bamboo_staff", "long_ash_spear"],
    },
    damage: {
      kind: "melee",
      attribute: "strength",
      techniquePower: 1,
      actionCost: 2,
      range: ["middle"],
      ignoreReduction: 0,
    },
    nodes: [
      node("sweep_water", "抄水拍鱼", "beginner", "active", "以杆梢横扫中距目标，也能从水中打捞物件。"),
      node("split_wave", "劈浪戳鱼", "skilled", "active", "沿直线压住对手脚步，并探明前方虚实。"),
      node("bind_weapon", "缠竿夺械", "expert", "passive", "招式大成时可以缠住轻兵器，使目标失衡。"),
    ],
    narrativeUses: ["fish", "salvage", "probe_path", "trigger_distant_object"],
  }),
  martial({
    id: "five_animal_play",
    name: "五禽戏",
    category: "body",
    grade: "ordinary",
    icon: "animals",
    source: "曹青为调养失血之身传下的导引法",
    summary: "以虎、熊、鹤、猿、鹿五戏调养筋骨，承药疗伤，并为锻体打下身体底子。",
    tags: ["导引", "调养", "承药", "曹青"],
    bodyBonuses: { health: 2 },
    nodes: [
      node("five_shapes", "五形入身", "beginner", "passive", "最大气血提高二点，调养行动更有效。"),
      node("animal_breath", "禽息相随", "skilled", "passive", "服药和休养时更容易稳定轻伤。"),
      node("whole_form", "五戏合一", "expert", "passive", "完成一整套架势后，可以压住一处身体负荷。"),
      node("living_form", "形随意动", "perfect", "passive", "准备充分时，可在五种身体倾向间选择本次优势。"),
    ],
    narrativeUses: ["recover", "absorb_medicine", "body_breakthrough"],
  }),
  martial({
    id: "deadwood_stake",
    name: "神农枯木桩",
    category: "body",
    grade: "ordinary",
    icon: "deadwood",
    source: "曹青门下的耐伤承药桩功",
    summary: "收紧呼吸、护住经络，在负伤和药毒之间保住身体不乱。",
    tags: ["桩功", "耐伤", "抗毒", "曹青"],
    bodyBonuses: { health: 4, woundedReduction: 1 },
    nodes: [
      node("root_breath", "枯息守身", "beginner", "passive", "最大气血提高四点；带伤时获得一点减伤。"),
      node("medicine_bone", "纳药入骨", "skilled", "passive", "药物与毒物第一次作用时，降低身体负荷。"),
      node("wither_not_fall", "枯而不倒", "expert", "active", "压住一处伤势一轮，战后仍需治疗。"),
      node("spring_in_deadwood", "枯木回春", "perfect", "passive", "濒死处理成功时，保留一次继续行动的机会。"),
    ],
    narrativeUses: ["endure_wound", "absorb_medicine", "resist_poison", "mountain_travel"],
  }),
  martial({
    id: "sea_stilling_stake",
    name: "沧澜定海桩",
    category: "body",
    grade: "ordinary",
    icon: "waves",
    source: "曹青门下的临水定身桩功",
    summary: "沉胯定足，借水意稳定重心，擅长抗冲击、守位与临水行气。",
    tags: ["桩功", "临水", "定身", "曹青"],
    bodyBonuses: { defense: 1 },
    nodes: [
      node("still_wave", "定浪沉身", "beginner", "passive", "防御提高一点，湿滑地面不再天然削弱下盘。"),
      node("hear_tide", "听潮行气", "skilled", "passive", "临水成功换位后，下一次防御获得有利。"),
      node("anchor_impact", "定海承浪", "expert", "active", "迎击冲撞并把推退转为原地失衡。"),
      node("sea_without_motion", "沧海不移", "perfect", "passive", "守住关键位置时，可以替邻近同伴承受一次位移。"),
    ],
    narrativeUses: ["water_travel", "hold_ground", "resist_impact", "wet_terrain"],
  }),
  martial({
    id: "ape_legacy_clue",
    name: "神猿挥棒残势",
    category: "body",
    grade: "superior",
    icon: "ape",
    source: "灵猴水洞石壁上的残缺发力轨迹",
    summary: "只记下了一段挥棒轮廓，尚不足以练成完整的金刚斗猿桩。",
    tags: ["残势", "桩功", "灵猴", "未完传承"],
    learnable: false,
    nodes: [
      node("ape_trace", "挥棒残势", "unlearned", "passive", "等待后续传承补全，当前只能作为武学见闻。"),
    ],
    narrativeUses: ["recognize_ape_legacy"],
  }),
]);

const MARTIAL_BY_ID = Object.freeze(Object.fromEntries(MARTIAL_DEFINITIONS.map((entry) => [entry.id, entry])));
const CATEGORY_BY_ID = Object.freeze(Object.fromEntries(MARTIAL_CATEGORIES.map((entry) => [entry.id, entry])));
const SUBTYPE_BY_ID = Object.freeze(Object.fromEntries(MARTIAL_TECHNIQUE_SUBTYPES.map((entry) => [entry.id, entry])));
const SLOT_BY_ID = Object.freeze(Object.fromEntries(MARTIAL_SLOTS.map((entry) => [entry.id, entry])));

function uniqueKnown(values = []) {
  return [...new Set((values || []).filter((id) => Boolean(MARTIAL_BY_ID[id])))];
}

function masteryId(value) {
  if (MARTIAL_MASTERIES[value]) return value;
  if (["learned", "entered"].includes(value)) return "beginner";
  if (value === "skilled") return "skilled";
  if (value === "mastered") return "expert";
  return "unlearned";
}

function normalizeLearnedEntry(value = {}) {
  const mastery = masteryId(typeof value === "string" ? value : value.mastery || value.stage);
  return {
    mastery,
    progress: Math.max(0, Math.min(100, Number(typeof value === "object" ? value.progress || 0 : 0))),
    unlockedNodes: Array.isArray(value?.unlockedNodes) ? [...new Set(value.unlockedNodes)] : [],
    firstUseNodes: Array.isArray(value?.firstUseNodes) ? [...new Set(value.firstUseNodes)] : [],
    gradeOverride: MARTIAL_GRADES[value?.gradeOverride] ? value.gradeOverride : null,
  };
}

function defaultLoadout() {
  return {
    heart: null,
    technique1: null,
    technique2: null,
    technique3: null,
    movement: null,
    body: null,
  };
}

export function createMartialState() {
  return {
    version: MARTIAL_SAVE_VERSION,
    experience: 0,
    known: [],
    inheritances: [],
    learned: {},
    loadout: defaultLoadout(),
    insights: [],
    qi: null,
  };
}

function grantLegacy(next, id, entry = {}, { inheritance = true, equip = true } = {}) {
  const definition = getMartialDefinition(id);
  if (!definition) return;
  if (!next.known.includes(id)) next.known.push(id);
  if (inheritance && !next.inheritances.includes(id)) next.inheritances.push(id);
  const incoming = normalizeLearnedEntry(entry);
  const existing = normalizeLearnedEntry(next.learned[id]);
  if (!next.learned[id] || MARTIAL_MASTERIES[incoming.mastery].order > MARTIAL_MASTERIES[existing.mastery].order) {
    next.learned[id] = incoming;
  } else {
    next.learned[id] = {
      ...existing,
      progress: Math.max(existing.progress, incoming.progress),
      unlockedNodes: [...new Set([...existing.unlockedNodes, ...incoming.unlockedNodes])],
      firstUseNodes: [...new Set([...existing.firstUseNodes, ...incoming.firstUseNodes])],
    };
  }
  if (!equip || next.learned[id].mastery === "unlearned") return;
  const compatible = compatibleMartialSlots(id);
  if (compatible.some((slotId) => next.loadout[slotId] === id)) return;
  const empty = compatible.find((slotId) => !next.loadout[slotId]);
  if (empty) next.loadout[empty] = id;
}

function legacySkillEntry(legacy, id) {
  return legacy?.p0?.skills?.[id] || null;
}

export function migrateMartialState(value, legacy = {}) {
  const base = createMartialState();
  const source = value && typeof value === "object" ? value : {};
  const next = {
    version: MARTIAL_SAVE_VERSION,
    experience: Math.max(0, Number(source.experience ?? legacy.potential ?? 0)),
    known: uniqueKnown(source.known),
    inheritances: uniqueKnown(source.inheritances),
    learned: {},
    loadout: { ...defaultLoadout(), ...(source.loadout || {}) },
    insights: [...new Set(Array.isArray(source.insights) ? source.insights.filter(Boolean) : [])],
    qi: source.qi == null ? null : Math.max(0, Number(source.qi || 0)),
  };
  for (const [id, entry] of Object.entries(source.learned || {})) {
    if (getMartialDefinition(id)) next.learned[id] = normalizeLearnedEntry(entry);
  }

  if (legacy.mindArt || source.known?.includes("fish_leap_art")) {
    grantLegacy(next, "fish_leap_art", {
      mastery: legacy.roadTrial === "dive" ? "skilled" : "beginner",
      progress: legacy.roadTrial === "dive" ? 30 : 0,
      firstUseNodes: legacy.roadTrial === "dive" ? ["road_trial_dive"] : [],
    }, { equip: !source.learned?.fish_leap_art });
  }
  if (legacy.fiveAnimalBook) {
    grantLegacy(next, "five_animal_play", {
      mastery: Number(legacy.fiveAnimalLevel || 0) > 0 ? "beginner" : "unlearned",
      progress: Number(legacy.fiveAnimalProgress || 0),
    }, {
      equip: Number(legacy.fiveAnimalLevel || 0) > 0
        && (!source.learned?.five_animal_play || masteryId(source.learned.five_animal_play.mastery) === "unlearned"),
    });
  }
  if (legacy.fishingRodMethod || legacy.skills?.includes?.("fishing_rod_method")) {
    grantLegacy(next, "fishing_rod_method", {
      mastery: "beginner",
      progress: 20,
      firstUseNodes: ["treasure_fish_training"],
    }, { equip: !source.learned?.fishing_rod_method });
  }
  const spring = legacySkillEntry(legacy, "spring_rain_needles");
  if (spring) {
    grantLegacy(next, "spring_rain_needles", {
      mastery: spring.stage === "skilled" ? "skilled" : "beginner",
      progress: Number(spring.progress || 0),
      firstUseNodes: legacy.p0?.battleOutcome ? ["first_needle_ambush"] : [],
    }, { equip: !source.learned?.spring_rain_needles });
  }
  for (const id of ["deadwood_stake", "sea_stilling_stake"]) {
    const stake = legacySkillEntry(legacy, id);
    if (stake) {
      grantLegacy(next, id, {
        mastery: ["learned", "skilled", "mastered"].includes(stake.stage) ? masteryId(stake.stage) : "unlearned",
        progress: Number(stake.progress || 0),
        firstUseNodes: Number(legacy.p0?.stakeProgress || 0) > 0 ? ["stake_training"] : [],
      }, {
        equip: legacy.p0?.stakeId === id
          && (!source.learned?.[id] || masteryId(source.learned[id].mastery) === "unlearned"),
      });
    }
  }
  if (
    ["deadwood_stake", "sea_stilling_stake"].includes(legacy.p0?.stakeId)
    && next.learned[legacy.p0.stakeId]?.mastery !== "unlearned"
    && (!source.learned?.[legacy.p0.stakeId] || masteryId(source.learned[legacy.p0.stakeId].mastery) === "unlearned")
  ) {
    next.loadout.body = legacy.p0.stakeId;
  }
  const ape = legacySkillEntry(legacy, "ape_legacy_clue");
  if (ape) grantLegacy(next, "ape_legacy_clue", { mastery: "unlearned", progress: Number(ape.progress || 0) }, { equip: false });
  if (legacy.m4?.baiInstruction && !next.insights.includes("bai_unloading_methods")) next.insights.push("bai_unloading_methods");

  next.known = uniqueKnown([...next.known, ...Object.keys(next.learned)]);
  next.inheritances = uniqueKnown(next.inheritances);

  const seen = new Set();
  for (const slot of MARTIAL_SLOTS) {
    const id = next.loadout[slot.id];
    const definition = getMartialDefinition(id);
    const mastery = next.learned[id]?.mastery;
    if (!definition || definition.category !== slot.category || mastery === "unlearned" || seen.has(id)) {
      next.loadout[slot.id] = null;
      continue;
    }
    seen.add(id);
  }
  return next;
}

export function getMartialDefinition(id) {
  return MARTIAL_BY_ID[id] || null;
}

export function getMartialCategory(id) {
  return CATEGORY_BY_ID[id] || MARTIAL_CATEGORIES[0];
}

export function getTechniqueSubtype(id) {
  return SUBTYPE_BY_ID[id] || MARTIAL_TECHNIQUE_SUBTYPES[0];
}

export function getMartialGrade(id) {
  return MARTIAL_GRADES[id] || MARTIAL_GRADES.rudimentary;
}

export function getMartialMastery(id) {
  return MARTIAL_MASTERIES[id] || MARTIAL_MASTERIES.unlearned;
}

export function getMartialSlot(id) {
  return SLOT_BY_ID[id] || null;
}

export function compatibleMartialSlots(martialId) {
  const definition = getMartialDefinition(martialId);
  return definition ? MARTIAL_SLOTS.filter((slot) => slot.category === definition.category).map((slot) => slot.id) : [];
}

export function unlockedMartialNodes(martialId, state) {
  const definition = getMartialDefinition(martialId);
  const entry = state?.learned?.[martialId];
  if (!definition || !entry) return [];
  const mastery = getMartialMastery(entry.mastery);
  return definition.nodes.filter((entryNode) => getMartialMastery(entryNode.stage).order <= mastery.order);
}

function nextMastery(current) {
  const index = MASTERY_SEQUENCE.indexOf(masteryId(current));
  return index < 0 || index >= MASTERY_SEQUENCE.length - 1 ? null : MASTERY_SEQUENCE[index + 1];
}

function requirement(label, met, detail = "") {
  return { label, met: Boolean(met), detail };
}

export function getMartialBreakthroughBoard(martialId, state, context = {}) {
  const definition = getMartialDefinition(martialId);
  const entry = state?.learned?.[martialId] || normalizeLearnedEntry();
  if (!definition) return { available: false, reason: "没有这门武学。" };
  const target = nextMastery(entry.mastery);
  if (!target) return { available: false, reason: "这门武学的造诣已经圆满。", target: null, requirements: [] };
  if (definition.learnable === false) return { available: false, reason: "传承残缺，尚无完整入门之法。", target, requirements: [] };
  const requirements = [
    requirement(`阅历${BREAKTHROUGH_COSTS[target]}`, Number(state?.experience || 0) >= BREAKTHROUGH_COSTS[target]),
  ];
  if (target !== "beginner") requirements.push(requirement("当前修为100", Number(entry.progress || 0) >= 100));

  if (martialId === "five_animal_play" && target === "beginner") {
    requirements.push(requirement("医术一", Number(context.medicalLevel || 0) >= 1));
    requirements.push(requirement("悟性三", Number(context.attributes?.insight || 0) >= 3));
  }
  if (martialId === "fishing_rod_method" && target === "beginner") {
    requirements.push(requirement("力道三", Number(context.attributes?.strength || 0) >= 3));
    requirements.push(requirement("悟性二", Number(context.attributes?.insight || 0) >= 2));
  }
  if (target === "skilled") {
    const used = entry.firstUseNodes.length > 0
      || (martialId === "fish_leap_art" && context.roadTrial === "dive")
      || (martialId === "spring_rain_needles" && Boolean(context.p0?.battleOutcome))
      || (["deadwood_stake", "sea_stilling_stake"].includes(martialId) && Number(context.p0?.stakeProgress || 0) > 0);
    requirements.push(requirement("至少实际使用一次", used));
  }
  if (target === "expert") {
    const insight = (martialId === "spring_rain_needles" && Boolean(context.p0?.battleOutcome))
      || (martialId === "fish_leap_art" && Number(STAGE_ORDER[context.martialStage] || 0) >= STAGE_ORDER.qi)
      || (martialId === "fishing_rod_method" && Boolean(context.m4?.tracking))
      || (martialId === "five_animal_play" && Boolean(context.p0?.complete))
      || (["deadwood_stake", "sea_stilling_stake"].includes(martialId) && Boolean(context.p0?.monkeyTest));
    requirements.push(requirement("完成对应领悟", insight));
  }
  if (target === "perfect") {
    const signature = (martialId === "spring_rain_needles" && Boolean(context.m4?.baiInstruction))
      || (martialId === "fish_leap_art" && ["subdued", "killed", "released", "protected_escape"].includes(context.p0?.wangOutcome))
      || (["deadwood_stake", "sea_stilling_stake"].includes(martialId) && Boolean(context.m4?.trainingOutcome));
    requirements.push(requirement("完成标志性人物或局面条件", signature));
  }
  const available = requirements.every((item) => item.met);
  return {
    available,
    reason: available ? `可突破至${getMartialMastery(target).name}。` : "仍有突破条件未满足。",
    target,
    cost: BREAKTHROUGH_COSTS[target],
    requirements,
  };
}

export function trainMartial(martialId, state) {
  const next = migrateMartialState(state);
  const entry = next.learned[martialId];
  if (!entry || entry.mastery === "unlearned") return { available: false, reason: "尚未入门，不能直接研习。", state: next };
  if (entry.mastery === "perfect") return { available: false, reason: "造诣已经圆满。", state: next };
  if (entry.progress >= 100) return { available: false, reason: "当前修为已满，应先完成突破。", state: next };
  if (next.experience < 40) return { available: false, reason: "阅历不足四十。", state: next };
  next.experience -= 40;
  entry.progress = Math.min(100, entry.progress + 10);
  return { available: true, reason: `${getMartialDefinition(martialId).name}修为提高十点。`, cost: 40, gain: 10, state: next };
}

export function breakthroughMartial(martialId, state, context = {}) {
  const next = migrateMartialState(state);
  const board = getMartialBreakthroughBoard(martialId, next, context);
  if (!board.available) return { ...board, state: next };
  const entry = next.learned[martialId] || normalizeLearnedEntry();
  next.experience -= board.cost;
  entry.mastery = board.target;
  entry.progress = 0;
  entry.unlockedNodes = unlockedMartialNodes(martialId, { learned: { [martialId]: entry } }).map((item) => item.id);
  next.learned[martialId] = entry;
  if (!next.known.includes(martialId)) next.known.push(martialId);
  if (!next.inheritances.includes(martialId)) next.inheritances.push(martialId);
  return {
    available: true,
    reason: `${getMartialDefinition(martialId).name}已达${getMartialMastery(board.target).name}。`,
    target: board.target,
    cost: board.cost,
    state: next,
  };
}

export function equipMartial(state, martialId, slotId = null) {
  const next = migrateMartialState(state);
  const definition = getMartialDefinition(martialId);
  const learned = next.learned[martialId];
  if (!definition || !learned || learned.mastery === "unlearned") return { available: false, reason: "这门武学尚未入门。", state: next };
  const compatible = compatibleMartialSlots(martialId);
  const target = slotId && compatible.includes(slotId) ? slotId : compatible.find((id) => !next.loadout[id]);
  if (!target) return { available: false, reason: "需要先选择要替换的位置。", needsSlot: true, slots: compatible, state: next };
  for (const id of compatible) {
    if (next.loadout[id] === martialId) next.loadout[id] = null;
  }
  const replacedId = next.loadout[target] || null;
  next.loadout[target] = martialId;
  return {
    available: true,
    reason: replacedId
      ? `以${definition.name}替换了${getMartialDefinition(replacedId)?.name || "原有武学"}。`
      : `已携带${definition.name}。`,
    slotId: target,
    replacedId,
    state: next,
  };
}

export function unequipMartial(state, slotId) {
  const next = migrateMartialState(state);
  const slot = getMartialSlot(slotId);
  const martialId = next.loadout[slotId];
  if (!slot || !martialId) return { available: false, reason: "这个位置没有可卸下的武学。", state: next };
  next.loadout[slotId] = null;
  return {
    available: true,
    reason: `已卸下${getMartialDefinition(martialId)?.name || "这门武学"}。`,
    martialId,
    state: next,
  };
}

export function martialIsCarried(state, martialId) {
  return Object.values(state?.loadout || {}).includes(martialId);
}

export function martialSkillsForCombat(state) {
  const result = {};
  for (const martialId of Object.values(state?.loadout || {})) {
    const learned = state?.learned?.[martialId];
    const mastery = getMartialMastery(learned?.mastery);
    if (!martialId || mastery.order < MARTIAL_MASTERIES.beginner.order) continue;
    result[martialId] = {
      stage: mastery.combatStage,
      progress: Number(learned.progress || 0),
    };
  }
  return result;
}

export function martialWeaponRequirements(state, equipment = {}) {
  const equipped = new Set(Object.values(equipment?.slots || {}).filter(Boolean));
  const failures = {};
  for (const martialId of Object.values(state?.loadout || {})) {
    const requirementRule = getMartialDefinition(martialId)?.weaponRequirement;
    if (!requirementRule) continue;
    if (!requirementRule.itemIds.some((itemId) => equipped.has(itemId))) failures[martialId] = `需要：${requirementRule.label}`;
  }
  return failures;
}

export function getMartialCombatBonuses(state, context = {}) {
  const bodyId = state?.loadout?.body;
  const definition = getMartialDefinition(bodyId);
  const mastery = getMartialMastery(state?.learned?.[bodyId]?.mastery);
  if (!definition || mastery.order < MARTIAL_MASTERIES.beginner.order) return { health: 0, defense: 0, reduction: 0 };
  const bonuses = definition.bodyBonuses || {};
  return {
    health: Number(bonuses.health || 0),
    defense: Number(bonuses.defense || 0),
    reduction: Number(bonuses.reduction || 0) + ((context.wounds || []).length ? Number(bonuses.woundedReduction || 0) : 0),
  };
}

export function heartMasteryQiBonus(state) {
  const heartId = state?.loadout?.heart;
  const mastery = getMartialMastery(state?.learned?.[heartId]?.mastery);
  if (mastery.order >= MARTIAL_MASTERIES.expert.order) return 2;
  if (mastery.order >= MARTIAL_MASTERIES.skilled.order) return 1;
  return 0;
}

export function getMartialList(state, { category = "heart", subtype = "all" } = {}) {
  const known = uniqueKnown([...(state?.known || []), ...Object.keys(state?.learned || {})]);
  return known
    .map(getMartialDefinition)
    .filter(Boolean)
    .filter((entry) => entry.category === category)
    .filter((entry) => category !== "technique" || subtype === "all" || entry.subtype === subtype)
    .sort((a, b) => {
      const grade = getMartialGrade(b.grade).order - getMartialGrade(a.grade).order;
      if (grade) return grade;
      const mastery = getMartialMastery(state?.learned?.[b.id]?.mastery).order - getMartialMastery(state?.learned?.[a.id]?.mastery).order;
      return mastery || a.name.localeCompare(b.name, "zh-CN");
    });
}

export function getMartialBoard(state, ui = {}) {
  const category = getMartialCategory(ui.category).id;
  const subtype = category === "technique" ? getTechniqueSubtype(ui.subtype).id : "all";
  const items = getMartialList(state, { category, subtype });
  const selectedId = items.some((item) => item.id === ui.selectedId) ? ui.selectedId : items[0]?.id || null;
  const slots = MARTIAL_SLOTS.map((slot) => ({
    ...slot,
    martialId: state?.loadout?.[slot.id] || null,
    martial: getMartialDefinition(state?.loadout?.[slot.id]),
  }));
  return {
    categories: MARTIAL_CATEGORIES,
    category: getMartialCategory(category),
    subtypes: MARTIAL_TECHNIQUE_SUBTYPES,
    subtype: getTechniqueSubtype(subtype),
    items,
    selectedId,
    selected: getMartialDefinition(selectedId),
    slots,
    experience: Math.max(0, Number(state?.experience || 0)),
  };
}

export function hasMartialNarrativeUse(state, useId, { sudden = false } = {}) {
  return Object.entries(state?.learned || {}).some(([id, entry]) => {
    if (getMartialMastery(entry.mastery).order < MARTIAL_MASTERIES.beginner.order) return false;
    if (sudden && !martialIsCarried(state, id)) return false;
    return getMartialDefinition(id)?.narrativeUses.includes(useId);
  });
}
