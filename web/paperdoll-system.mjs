import {
  appearanceCharacterAsset,
  normalizeAppearance,
} from "./appearance-core.mjs?v=20260731.2";
import {
  EQUIPMENT_SLOTS,
  getEquipmentItem,
  migrateEquipmentState,
} from "./character-system.mjs?v=20260731.2";

export const PAPER_DOLL_LAYER_ORDER = Object.freeze({
  base: 10,
  body: 20,
  wrist: 30,
  boots: 35,
  accessory: 40,
  head: 50,
  weaponBack: 60,
  weaponFront: 70,
});

export const PAPER_DOLL_RUNTIME_ASSETS = Object.freeze([
  "./assets/paperdoll/iron-scale-vest-v1.webp",
  "./assets/paperdoll/rain-hood-v1.webp",
  "./assets/paperdoll/traveler-straw-hat-v1.webp",
  "./assets/paperdoll/shen-guard-bracers-v1.webp",
]);

const SLOT_RENDER_ORDER = Object.freeze([
  "body",
  "wrist",
  "boots",
  "accessory",
  "head",
  "meleeMain",
  "meleeOff",
  "rangedMain",
  "rangedOff",
]);

function equippedVisuals(equipment) {
  if (!equipment) return [];
  const normalized = migrateEquipmentState(equipment);
  return SLOT_RENDER_ORDER.flatMap((slotId) => {
    const item = getEquipmentItem(normalized.slots[slotId]);
    const visual = item?.paperDoll;
    if (!item || !visual?.asset) return [];
    return [{
      id: `${slotId}:${item.id}`,
      itemId: item.id,
      slotId,
      kind: visual.layer || EQUIPMENT_SLOTS.find((slot) => slot.id === slotId)?.group || "accessory",
      asset: visual.asset,
      z: PAPER_DOLL_LAYER_ORDER[visual.layer] || PAPER_DOLL_LAYER_ORDER.accessory,
      hides: Array.isArray(visual.hides) ? [...visual.hides] : [],
    }];
  });
}

export function resolvePaperDollLayers({
  appearance,
  equipment = null,
  includeEquipment = true,
} = {}) {
  const normalizedAppearance = normalizeAppearance(appearance);
  const layers = [{
    id: "appearance-base",
    itemId: null,
    slotId: null,
    kind: "base",
    asset: appearanceCharacterAsset(normalizedAppearance),
    z: PAPER_DOLL_LAYER_ORDER.base,
    hides: [],
  }];
  if (includeEquipment) layers.push(...equippedVisuals(equipment));
  return {
    appearance: normalizedAppearance,
    layers: layers.sort((left, right) => left.z - right.z),
  };
}

export function paperDollVisibleItemIds(equipment) {
  return [...new Set(equippedVisuals(equipment).map((layer) => layer.itemId))];
}
