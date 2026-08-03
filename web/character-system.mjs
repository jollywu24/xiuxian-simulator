import {
  getMartialCombatBonuses,
  heartMasteryQiBonus,
} from "./martial-system.mjs?v=20260803.1";

export const CHARACTER_SAVE_VERSION = 2;

export const CHARACTER_STAGE_ORDER = Object.freeze({
  mortal: 0,
  body: 1,
  breath: 2,
  qi: 2,
  meridian: 3,
  master: 4,
});

export const CHARACTER_STAGE_NAMES = Object.freeze({
  mortal: "未入门",
  body: "锻体一重",
  breath: "聚气",
  qi: "聚气",
  meridian: "通脉",
  master: "宗师",
});

export const EQUIPMENT_CAPACITY = 24;

export const EQUIPMENT_QUALITIES = Object.freeze({
  common: { id: "common", name: "凡品", color: "#718472" },
  fine: { id: "fine", name: "良品", color: "#6087a0" },
  precious: { id: "precious", name: "珍品", color: "#7869a6" },
  rare: { id: "rare", name: "奇珍", color: "#b3863f" },
  treasure: { id: "treasure", name: "秘宝", color: "#9f4f3f" },
});

export const EQUIPMENT_SLOTS = Object.freeze([
  { id: "head", name: "冠", group: "armor", side: "left" },
  { id: "body", name: "衣", group: "armor", side: "left" },
  { id: "wrist", name: "腕", group: "armor", side: "left" },
  { id: "boots", name: "履", group: "armor", side: "right" },
  { id: "accessory", name: "佩", group: "accessory", side: "right" },
  { id: "meleeMain", name: "近战主手", group: "weapon", side: "bottom" },
  { id: "meleeOff", name: "近战副手", group: "weapon", side: "bottom" },
  { id: "rangedMain", name: "远程主手", group: "weapon", side: "bottom" },
  { id: "rangedOff", name: "远程副手", group: "weapon", side: "bottom" },
]);

export const EQUIPMENT_CATEGORIES = Object.freeze([
  { id: "all", name: "全部", glyph: "囊" },
  { id: "weapon", name: "兵刃", glyph: "刃" },
  { id: "armor", name: "衣甲", glyph: "衣" },
  { id: "accessory", name: "佩饰", glyph: "佩" },
]);

const ATLAS = "./assets/equipment/equipment-atlas.png";

function equipmentItem(config) {
  const slotIds = Array.isArray(config.slotIds) ? config.slotIds : [config.slotIds];
  return Object.freeze({
    category: slotIds.some((id) => id.startsWith("melee") || id.startsWith("ranged")) ? "weapon"
      : slotIds.includes("accessory") ? "accessory" : "armor",
    twoHanded: false,
    bonuses: {},
    art: ATLAS,
    ...config,
    slotIds,
  });
}

export const EQUIPMENT_ITEMS = Object.freeze([
  equipmentItem({
    id: "rain_hood",
    name: "蓑雨兜帽",
    description: "竹篾夹油布缝成的旧兜帽，雨丝不容易迷眼。",
    quality: "common",
    slotIds: "head",
    atlas: [0, 0],
    bonuses: { rangedDefense: 1 },
    paperDoll: {
      asset: "./assets/paperdoll/rain-hood-v1.webp",
      layer: "head",
      hides: ["hairFront"],
    },
  }),
  equipmentItem({
    id: "patched_martial_coat",
    name: "补缀短褐",
    description: "一件补了数回的靛青短褐，夹层仍能挡住浅刀。",
    quality: "common",
    slotIds: "body",
    atlas: [1, 0],
    bonuses: { reduction: 1, health: 2 },
  }),
  equipmentItem({
    id: "cloth_wrist_wraps",
    name: "缠腕布",
    description: "层层扎紧腕骨，接兵刃时不至于轻易脱手。",
    quality: "common",
    slotIds: "wrist",
    atlas: [2, 0],
    bonuses: { defense: 1 },
  }),
  equipmentItem({
    id: "worn_cloth_boots",
    name: "旧行靴",
    description: "鞋底磨得很薄，胜在贴脚，湿石上也能收住一步。",
    quality: "fine",
    slotIds: "boots",
    atlas: [3, 0],
    bonuses: { defense: 1 },
  }),
  equipmentItem({
    id: "family_jade_charm",
    name: "家传玉佩",
    description: "半块来历不明的旧玉。贴近心口时，偶尔会传来温意。",
    quality: "treasure",
    slotIds: "accessory",
    atlas: [0, 1],
    bonuses: { qi: 1 },
  }),
  equipmentItem({
    id: "goosewing_short_saber",
    name: "雁翎短刀",
    description: "刀背厚、锋口短，适合在巷道里贴身劈压。",
    quality: "fine",
    slotIds: ["meleeMain", "meleeOff"],
    atlas: [1, 1],
    weapon: { kind: "melee", min: 3, max: 5, powerAttribute: "strength", penetration: 0 },
  }),
  equipmentItem({
    id: "river_bamboo_staff",
    name: "紫金竹杆",
    description: "从河边选出的老竹，长而不滞，既能打鱼也能缠踝。",
    quality: "precious",
    slotIds: "meleeMain",
    twoHanded: true,
    atlas: [2, 1],
    weapon: { kind: "melee", min: 3, max: 6, powerAttribute: "strength", penetration: 1 },
  }),
  equipmentItem({
    id: "hunting_bow",
    name: "桑木短弓",
    description: "弓身短小，三十步内发箭最稳。",
    quality: "precious",
    slotIds: "rangedMain",
    twoHanded: true,
    atlas: [3, 1],
    weapon: { kind: "ranged", min: 3, max: 5, powerAttribute: "agility", penetration: 0 },
  }),
  equipmentItem({
    id: "spring_rain_needle_case",
    name: "春雨针匣",
    description: "细针分槽而藏，抖腕便能拈出。针法取准，不取蛮力。",
    quality: "rare",
    slotIds: ["rangedMain", "rangedOff"],
    atlas: [0, 2],
    weapon: { kind: "ranged", min: 2, max: 4, powerAttribute: "agility", penetration: 1 },
    bonuses: { needleAccuracy: 1 },
  }),
  equipmentItem({
    id: "iron_scale_vest",
    name: "乌鳞短甲",
    description: "细铁片缀在皮衬上，沉重，却能把直劈卸向两侧。",
    quality: "precious",
    slotIds: "body",
    atlas: [1, 2],
    requirements: { constitution: 2 },
    bonuses: { reduction: 2, defense: -1, health: 3 },
    paperDoll: {
      asset: "./assets/paperdoll/iron-scale-vest-v1.webp",
      layer: "body",
    },
  }),
  equipmentItem({
    id: "traveler_straw_hat",
    name: "江行斗笠",
    description: "宽檐压得很低，遮雨，也遮旁人窥看的眼。",
    quality: "fine",
    slotIds: "head",
    atlas: [2, 2],
    bonuses: { defense: 1 },
    paperDoll: {
      asset: "./assets/paperdoll/traveler-straw-hat-v1.webp",
      layer: "head",
    },
  }),
  equipmentItem({
    id: "shen_guard_bracers",
    name: "沈府护腕",
    description: "内嵌薄铁的皮护腕，正适合在近身架刀时借力。",
    quality: "precious",
    slotIds: "wrist",
    atlas: [3, 2],
    bonuses: { reduction: 1, defense: 1 },
    paperDoll: {
      asset: "./assets/paperdoll/shen-guard-bracers-v1.webp",
      layer: "wrist",
    },
  }),
  equipmentItem({
    id: "narrow_straight_sword",
    name: "细脊剑",
    description: "剑身窄直，擅点、削与贴腕截招。",
    quality: "fine",
    slotIds: ["meleeMain", "meleeOff"],
    atlas: [0, 3],
    weapon: { kind: "melee", min: 2, max: 6, powerAttribute: "agility", penetration: 1 },
  }),
  equipmentItem({
    id: "ring_pommel_saber",
    name: "环首刀",
    description: "军中常见的硬刀，劈砍时最能吃住力道。",
    quality: "precious",
    slotIds: "meleeMain",
    atlas: [1, 3],
    weapon: { kind: "melee", min: 4, max: 7, powerAttribute: "strength", penetration: 1 },
  }),
  equipmentItem({
    id: "long_ash_spear",
    name: "白蜡长枪",
    description: "长杆柔韧，枪尖专取两步之外。",
    quality: "precious",
    slotIds: "meleeMain",
    twoHanded: true,
    atlas: [2, 3],
    weapon: { kind: "melee", min: 4, max: 7, powerAttribute: "strength", penetration: 1 },
  }),
  equipmentItem({
    id: "rope_dart",
    name: "索镖",
    description: "软索缠腰，铁镖能从意想不到的角度探出。",
    quality: "rare",
    slotIds: "rangedMain",
    twoHanded: true,
    atlas: [3, 3],
    weapon: { kind: "ranged", min: 3, max: 7, powerAttribute: "agility", penetration: 1 },
  }),
]);

const EQUIPMENT_BY_ID = Object.freeze(Object.fromEntries(EQUIPMENT_ITEMS.map((item) => [item.id, item])));
const SLOT_BY_ID = Object.freeze(Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => [slot.id, slot])));

export function getEquipmentItem(id) {
  return EQUIPMENT_BY_ID[id] || null;
}

export function getEquipmentSlot(id) {
  return SLOT_BY_ID[id] || null;
}

export function getEquipmentQuality(id) {
  return EQUIPMENT_QUALITIES[id] || EQUIPMENT_QUALITIES.common;
}

export function createEquipmentState() {
  return {
    version: CHARACTER_SAVE_VERSION,
    capacity: EQUIPMENT_CAPACITY,
    owned: EQUIPMENT_ITEMS.slice(0, 12).map((item) => item.id),
    slots: {
      head: "rain_hood",
      body: "patched_martial_coat",
      wrist: "cloth_wrist_wraps",
      boots: "worn_cloth_boots",
      accessory: "family_jade_charm",
      meleeMain: "goosewing_short_saber",
      meleeOff: null,
      rangedMain: "spring_rain_needle_case",
      rangedOff: null,
    },
  };
}

function uniqueKnownEquipment(values = []) {
  return [...new Set(values)].filter((id) => Boolean(getEquipmentItem(id))).slice(0, EQUIPMENT_CAPACITY);
}

export function migrateEquipmentState(value) {
  const base = createEquipmentState();
  if (!value || typeof value !== "object") return base;
  const owned = uniqueKnownEquipment(Array.isArray(value.owned) ? value.owned : base.owned);
  const slots = Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => {
    const itemId = value.slots?.[slot.id];
    const item = getEquipmentItem(itemId);
    return [slot.id, item && owned.includes(item.id) && item.slotIds.includes(slot.id) ? item.id : null];
  }));
  const seen = new Set();
  for (const slot of EQUIPMENT_SLOTS) {
    const itemId = slots[slot.id];
    if (!itemId) continue;
    if (seen.has(itemId)) slots[slot.id] = null;
    else seen.add(itemId);
  }
  for (const [mainhand, offhand] of [["meleeMain", "meleeOff"], ["rangedMain", "rangedOff"]]) {
    if (getEquipmentItem(slots[mainhand])?.twoHanded) slots[offhand] = null;
  }
  return {
    version: CHARACTER_SAVE_VERSION,
    capacity: EQUIPMENT_CAPACITY,
    owned,
    slots,
  };
}

export function createCharacterVitals() {
  return { health: null, qi: null };
}

export function migrateCharacterVitals(value) {
  return {
    health: value?.health == null || !Number.isFinite(Number(value.health)) ? null : Math.max(0, Number(value.health)),
    qi: value?.qi == null || !Number.isFinite(Number(value.qi)) ? null : Math.max(0, Number(value.qi)),
  };
}

function normalizeAttributes(attributes = {}) {
  return {
    constitution: Math.max(0, Number(attributes.constitution || 0)),
    insight: Math.max(0, Number(attributes.insight || 0)),
    agility: Math.max(0, Number(attributes.agility || 0)),
    strength: Math.max(0, Number(attributes.strength || 0)),
    fortune: Math.max(0, Number(attributes.fortune || 0)),
  };
}

function stageIndex(stageId) {
  return Number(CHARACTER_STAGE_ORDER[stageId] ?? 0);
}

export function equippedItems(equipment) {
  const migrated = migrateEquipmentState(equipment);
  return EQUIPMENT_SLOTS
    .map((slot) => getEquipmentItem(migrated.slots[slot.id]))
    .filter((item, index, values) => item && values.findIndex((entry) => entry?.id === item.id) === index);
}

export function getEquipmentBonuses(equipment) {
  return equippedItems(equipment).reduce((total, item) => {
    for (const [key, value] of Object.entries(item.bonuses || {})) {
      total[key] = Number(total[key] || 0) + Number(value || 0);
    }
    return total;
  }, {});
}

export function getEquippedWeapon(equipment, kind = "melee") {
  const migrated = migrateEquipmentState(equipment);
  const slotIds = kind === "ranged" ? ["rangedMain", "rangedOff"] : ["meleeMain", "meleeOff"];
  return slotIds.map((id) => getEquipmentItem(migrated.slots[id])).find((item) => item?.weapon?.kind === kind) || null;
}

export function calculateDamageRange({
  attributes = {},
  stageId = "mortal",
  equipment,
  kind = "melee",
  techniquePower = 0,
  qiBoost = 0,
  weapon,
} = {}) {
  const normalized = normalizeAttributes(attributes);
  const equippedWeapon = weapon || getEquippedWeapon(equipment, kind);
  const weaponRule = equippedWeapon?.weapon || (weapon?.min != null ? weapon : null) || {
    kind,
    min: kind === "ranged" ? 1 : 1,
    max: kind === "ranged" ? 2 : 3,
    powerAttribute: kind === "ranged" ? "agility" : "strength",
    penetration: 0,
  };
  const power = Math.floor(Number(normalized[weaponRule.powerAttribute] || 0) / 2);
  const stage = stageIndex(stageId);
  const extra = Math.max(0, Number(techniquePower || 0)) + Math.max(0, Number(qiBoost || 0));
  return {
    min: Math.max(1, Number(weaponRule.min || 1) + power + stage + extra),
    max: Math.max(1, Number(weaponRule.max || 1) + power + stage + extra),
    powerAttribute: weaponRule.powerAttribute,
    penetration: Math.max(0, Number(weaponRule.penetration || 0)),
    weaponId: equippedWeapon?.id || null,
    weaponName: equippedWeapon?.name || weapon?.name || (kind === "ranged" ? "飞石" : "拳脚"),
  };
}

export function damageForTier(range, tier) {
  const minimum = Math.max(0, Number(range?.min || 0));
  const maximum = Math.max(minimum, Number(range?.max || minimum));
  if (tier === "great") return maximum;
  if (tier === "success") return Math.ceil((minimum + maximum) / 2);
  if (tier === "costly") return minimum;
  return 0;
}

export function applyDamageReduction(rawDamage, reduction = 0, penetration = 0) {
  const raw = Math.max(0, Number(rawDamage || 0));
  const effectiveReduction = Math.max(0, Number(reduction || 0) - Math.max(0, Number(penetration || 0)));
  const final = raw > 0 ? Math.max(1, raw - effectiveReduction) : 0;
  return { raw, final, prevented: Math.max(0, raw - final), effectiveReduction };
}

export function deriveCharacterStats({
  attributes = {},
  stageId = "mortal",
  equipment,
  wounds = [],
  martial = null,
  vitals,
} = {}) {
  const normalized = normalizeAttributes(attributes);
  const bonuses = getEquipmentBonuses(equipment);
  const martialBonuses = getMartialCombatBonuses(martial, { wounds });
  const stage = stageIndex(stageId);
  const woundLoss = (wounds || []).reduce((total, wound) => total + Math.max(0, Number(wound.severity || 0)) * 2, 0);
  const maxHealth = Math.max(1, 12 + normalized.constitution * 2 + stage * 4 + Number(bonuses.health || 0) + martialBonuses.health - woundLoss);
  const hasQi = stage >= CHARACTER_STAGE_ORDER.qi;
  const maxQi = hasQi
    ? Math.max(1, Math.min(6, 3 + Math.floor(normalized.constitution / 3) + heartMasteryQiBonus(martial) + Number(bonuses.qi || 0)))
    : 0;
  const defense = Math.max(0, Math.floor(normalized.agility / 2) + Number(bonuses.defense || 0) + martialBonuses.defense);
  const reduction = Math.max(0, Number(bonuses.reduction || 0) + martialBonuses.reduction);
  const melee = calculateDamageRange({ attributes: normalized, stageId, equipment, kind: "melee" });
  const ranged = calculateDamageRange({ attributes: normalized, stageId, equipment, kind: "ranged" });
  const currentHealth = vitals?.health == null ? maxHealth : Math.max(0, Math.min(maxHealth, Number(vitals.health)));
  const currentQi = maxQi === 0 ? 0 : vitals?.qi == null ? maxQi : Math.max(0, Math.min(maxQi, Number(vitals.qi)));
  return {
    attributes: normalized,
    stageId,
    stageName: CHARACTER_STAGE_NAMES[stageId] || CHARACTER_STAGE_NAMES.mortal,
    health: { current: currentHealth, max: maxHealth },
    qi: { current: currentQi, max: maxQi, available: maxQi > 0 },
    defense,
    reduction,
    melee,
    ranged,
    bonuses,
    martialBonuses,
  };
}

export function characterCombatProfile(state = {}) {
  const stats = deriveCharacterStats({
    attributes: state.attributes,
    stageId: state.martialStage,
    equipment: state.equipment,
    wounds: state.p0?.wounds,
    martial: state.martial,
    vitals: state.characterVitals,
  });
  return {
    maxHealth: stats.health.max,
    health: stats.health.current,
    maxQi: stats.qi.max,
    qi: stats.qi.current,
    defense: stats.defense,
    reduction: stats.reduction,
    melee: stats.melee,
    ranged: stats.ranged,
  };
}

export function actionTargetValue(difficulty = 0, defense = 0) {
  return Math.max(1, 4 + Number(difficulty || 0) + Math.max(0, Number(defense || 0)));
}

function requirementFailure(item, attributes) {
  for (const [id, needed] of Object.entries(item.requirements || {})) {
    if (Number(attributes?.[id] || 0) < Number(needed || 0)) return `${id === "constitution" ? "根骨" : id}需达到${needed}`;
  }
  return null;
}

function compatibleSlot(item, requestedSlotId, equipment) {
  if (requestedSlotId && item.slotIds.includes(requestedSlotId)) return requestedSlotId;
  const empty = item.slotIds.find((slotId) => !equipment.slots[slotId]);
  return empty || item.slotIds[0] || null;
}

export function equipEquipmentItem(equipment, itemId, { slotId = null, attributes = {} } = {}) {
  const current = migrateEquipmentState(equipment);
  const item = getEquipmentItem(itemId);
  if (!item || !current.owned.includes(itemId)) return { available: false, reason: "行囊里没有这件装备。", state: current };
  const requirement = requirementFailure(item, normalizeAttributes(attributes));
  if (requirement) return { available: false, reason: requirement, state: current };
  const targetSlot = compatibleSlot(item, slotId, current);
  if (!targetSlot) return { available: false, reason: "没有合适的装备位置。", state: current };
  const next = structuredClone(current);
  for (const id of EQUIPMENT_SLOTS.map((entry) => entry.id)) {
    if (next.slots[id] === itemId) next.slots[id] = null;
  }
  if (item.twoHanded) {
    const offhand = item.weapon?.kind === "ranged" ? "rangedOff" : "meleeOff";
    const mainhand = item.weapon?.kind === "ranged" ? "rangedMain" : "meleeMain";
    next.slots[mainhand] = itemId;
    next.slots[offhand] = null;
  } else {
    const pairedMain = targetSlot === "meleeOff" ? "meleeMain" : targetSlot === "rangedOff" ? "rangedMain" : null;
    if (pairedMain) {
      const mainItem = getEquipmentItem(next.slots[pairedMain]);
      if (mainItem?.twoHanded) next.slots[pairedMain] = null;
    }
    next.slots[targetSlot] = itemId;
  }
  return {
    available: true,
    reason: `${item.name}已装备`,
    item,
    slotId: item.twoHanded ? (item.weapon?.kind === "ranged" ? "rangedMain" : "meleeMain") : targetSlot,
    state: next,
  };
}

export function unequipEquipmentSlot(equipment, slotId) {
  const current = migrateEquipmentState(equipment);
  if (!getEquipmentSlot(slotId) || !current.slots[slotId]) return { available: false, reason: "这里没有装备。", state: current };
  const next = structuredClone(current);
  const item = getEquipmentItem(next.slots[slotId]);
  for (const id of EQUIPMENT_SLOTS.map((entry) => entry.id)) {
    if (next.slots[id] === item?.id) next.slots[id] = null;
  }
  return { available: true, reason: `${item?.name || "装备"}已卸下`, item, state: next };
}

export function createEquipmentBoard(state, { category = "all" } = {}) {
  const equipment = migrateEquipmentState(state?.equipment);
  const selectedCategory = EQUIPMENT_CATEGORIES.find((entry) => entry.id === category) || EQUIPMENT_CATEGORIES[0];
  const stats = deriveCharacterStats({
    attributes: state?.attributes,
    stageId: state?.martialStage,
    equipment,
    wounds: state?.p0?.wounds,
    martial: state?.martial,
    vitals: state?.characterVitals,
  });
  const items = equipment.owned
    .map((id) => getEquipmentItem(id))
    .filter((item) => item && (selectedCategory.id === "all" || item.category === selectedCategory.id))
    .map((item) => ({
      ...item,
      qualityInfo: getEquipmentQuality(item.quality),
      equippedSlots: EQUIPMENT_SLOTS.filter((slot) => equipment.slots[slot.id] === item.id).map((slot) => slot.id),
    }));
  return {
    equipment,
    stats,
    categories: EQUIPMENT_CATEGORIES,
    category: selectedCategory,
    items,
    used: equipment.owned.length,
    capacity: EQUIPMENT_CAPACITY,
    slots: EQUIPMENT_SLOTS.map((slot) => ({
      ...slot,
      item: getEquipmentItem(equipment.slots[slot.id]),
    })),
  };
}
