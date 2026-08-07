export const APPEARANCE_BODIES = Object.freeze([
  { id: "male", name: "男身" },
  { id: "female", name: "女身" },
]);

function numbered(names) {
  return Object.freeze(names.map((name, index) => Object.freeze({ id: index + 1, name })));
}

export const APPEARANCE_HATS = numbered(["不戴冠帽", "乌木小冠"]);
export const APPEARANCE_FRONT_HAIRS = numbered(["束起碎发", "斜分垂发"]);
export const APPEARANCE_BACK_HAIRS = numbered(["利落高束", "蓬松长束"]);
export const APPEARANCE_EYES = numbered(["清锐长眼", "明澈凤眼"]);
export const APPEARANCE_BROWS = numbered(["平锋眉", "扬剑眉"]);
export const APPEARANCE_MOUTHS = numbered(["常唇", "薄抿唇"]);
export const APPEARANCE_NOSES = numbered(["直鼻", "秀挺鼻"]);
export const APPEARANCE_FACE_SHAPES = numbered(["清峻脸型", "宽颌脸型"]);
export const APPEARANCE_BACK_ACCESSORIES = numbered(["不负外物", "乌木剑匣"]);
export const APPEARANCE_CLOTHINGS = numbered(["黛青锦衣", "玄褐行衣"]);
export const APPEARANCE_FACE_ACCESSORIES = numbered(["不饰面容", "江湖旧痕"]);

export const APPEARANCE_PARTS = Object.freeze([
  Object.freeze({ id: "hat", label: "帽子", catalog: APPEARANCE_HATS, z: 70, layout: "top" }),
  Object.freeze({ id: "frontHair", label: "前发", catalog: APPEARANCE_FRONT_HAIRS, z: 50, layout: "left-1" }),
  Object.freeze({ id: "backHair", label: "后发", catalog: APPEARANCE_BACK_HAIRS, z: 44, layout: "right-1" }),
  Object.freeze({ id: "eyes", label: "眼睛", catalog: APPEARANCE_EYES, z: 45, layout: "left-2" }),
  Object.freeze({ id: "brows", label: "眉毛", catalog: APPEARANCE_BROWS, z: 46, layout: "right-2" }),
  Object.freeze({ id: "mouth", label: "嘴巴", catalog: APPEARANCE_MOUTHS, z: 48, layout: "left-3" }),
  Object.freeze({ id: "nose", label: "鼻子", catalog: APPEARANCE_NOSES, z: 47, layout: "right-3" }),
  Object.freeze({ id: "faceShape", label: "脸型", catalog: APPEARANCE_FACE_SHAPES, z: 40, layout: "left-4" }),
  Object.freeze({ id: "faceAccessory", label: "脸饰", catalog: APPEARANCE_FACE_ACCESSORIES, z: 60, layout: "right-4" }),
  Object.freeze({ id: "backAccessory", label: "后背", catalog: APPEARANCE_BACK_ACCESSORIES, z: 5, layout: "left-5" }),
  Object.freeze({ id: "clothing", label: "衣服", catalog: APPEARANCE_CLOTHINGS, z: 30, layout: "right-5" }),
]);

export const APPEARANCE_CATALOGS = Object.freeze(Object.fromEntries(
  APPEARANCE_PARTS.map((part) => [part.id, part.catalog]),
));

export const DEFAULT_APPEARANCE = Object.freeze({
  body: "male",
  hat: 1,
  frontHair: 1,
  backHair: 1,
  eyes: 1,
  brows: 1,
  mouth: 1,
  nose: 1,
  faceShape: 1,
  backAccessory: 1,
  clothing: 1,
  faceAccessory: 1,
});

export const APPEARANCE_BODY_ASSETS = Object.freeze({
  male: Object.freeze({
    1: "./assets/appearance/rig-v4/male-base-v1.webp",
    2: "./assets/appearance/rig-v4/male-clothing-2-v1.webp",
  }),
  female: Object.freeze({
    1: "./assets/appearance/rig-v4/female-base-v1.webp",
    2: "./assets/appearance/rig-v4/female-clothing-2-v1.webp",
  }),
});

export const APPEARANCE_BASE_ASSETS = Object.freeze({
  male: APPEARANCE_BODY_ASSETS.male[1],
  female: APPEARANCE_BODY_ASSETS.female[1],
});

const PART_ASSET_STEMS = Object.freeze({
  hat: "hat",
  frontHair: "front-hair-2",
  backHair: "back-hair-2",
  eyes: "eyes-2",
  brows: "brows-2",
  mouth: "mouth-2",
  nose: "nose-2",
  faceShape: "face-shape-2",
  backAccessory: "back-accessory",
  faceAccessory: "face-accessory",
});

function catalogHas(catalog, id) {
  return catalog.some((entry) => entry.id === id);
}

export function appearanceLayerAsset(body, partId, id) {
  if (!catalogHas(APPEARANCE_BODIES, body) || Number(id) !== 2) return null;
  if (partId === "clothing") return null;
  const stem = PART_ASSET_STEMS[partId];
  return stem ? `./assets/appearance/rig-v4/${body}-${stem}-v1.webp` : null;
}

export function appearanceHairMaskAsset() {
  return null;
}

export const APPEARANCE_DEFAULT_LAYER_ASSETS = Object.freeze({
  male: Object.freeze(Object.fromEntries(APPEARANCE_PARTS.map((part) => [part.id, null]))),
  female: Object.freeze(Object.fromEntries(APPEARANCE_PARTS.map((part) => [part.id, null]))),
});

export const APPEARANCE_RUNTIME_ASSETS = Object.freeze([
  ...APPEARANCE_BODIES.flatMap(({ id: body }) => APPEARANCE_CLOTHINGS.map(({ id }) => APPEARANCE_BODY_ASSETS[body][id])),
  ...APPEARANCE_BODIES.flatMap(({ id: body }) => Object.keys(PART_ASSET_STEMS).map((partId) => appearanceLayerAsset(body, partId, 2))),
].filter(Boolean));

function legacyAppearance(value) {
  const legacyFace = Number(value?.face);
  const legacyHair = Number(value?.hair);
  const hasNewPart = APPEARANCE_PARTS.some((part) => value?.[part.id] !== undefined);
  if (hasNewPart) return value || {};
  return {
    ...(value || {}),
    frontHair: Number.isFinite(legacyHair) ? ((legacyHair - 1) % APPEARANCE_FRONT_HAIRS.length) + 1 : 1,
    backHair: Number.isFinite(legacyHair) ? ((legacyHair - 1) % APPEARANCE_BACK_HAIRS.length) + 1 : 1,
    eyes: Number.isFinite(legacyFace) ? ((legacyFace - 1) % APPEARANCE_EYES.length) + 1 : 1,
    brows: Number.isFinite(legacyFace) ? ((legacyFace - 1) % APPEARANCE_BROWS.length) + 1 : 1,
    mouth: Number.isFinite(legacyFace) ? ((legacyFace - 1) % APPEARANCE_MOUTHS.length) + 1 : 1,
    nose: Number.isFinite(legacyFace) ? ((legacyFace - 1) % APPEARANCE_NOSES.length) + 1 : 1,
    faceShape: Number.isFinite(legacyFace) ? ((legacyFace - 1) % APPEARANCE_FACE_SHAPES.length) + 1 : 1,
  };
}

export function normalizeAppearance(value = {}) {
  const migrated = legacyAppearance(value);
  const body = catalogHas(APPEARANCE_BODIES, migrated?.body) ? migrated.body : DEFAULT_APPEARANCE.body;
  return Object.fromEntries([
    ["body", body],
    ...APPEARANCE_PARTS.map((part) => {
      const numeric = Number(migrated?.[part.id]);
      return [part.id, catalogHas(part.catalog, numeric) ? numeric : DEFAULT_APPEARANCE[part.id]];
    }),
  ]);
}

export function createAppearanceState(overrides = {}) {
  return normalizeAppearance({ ...DEFAULT_APPEARANCE, ...overrides });
}

const APPEARANCE_PRESETS = Object.freeze([
  Object.freeze({ body: "male" }),
  Object.freeze({ body: "male", clothing: 2, hat: 2, frontHair: 2, faceAccessory: 2 }),
  Object.freeze({ body: "female", backHair: 2, eyes: 2, brows: 2 }),
  Object.freeze({ body: "female", clothing: 2, hat: 2, faceShape: 2, nose: 2, mouth: 2, backAccessory: 2 }),
]);

export function cycleAppearance(value = {}) {
  const current = normalizeAppearance(value);
  const signatures = APPEARANCE_PRESETS.map((preset) => JSON.stringify(normalizeAppearance(preset)));
  const currentIndex = signatures.indexOf(JSON.stringify(current));
  return normalizeAppearance(APPEARANCE_PRESETS[(Math.max(-1, currentIndex) + 1) % APPEARANCE_PRESETS.length]);
}

export function appearanceBaseAsset(value = {}) {
  const appearance = normalizeAppearance(value);
  return APPEARANCE_BODY_ASSETS[appearance.body][appearance.clothing];
}

export function appearancePart(value, partId) {
  const appearance = normalizeAppearance(value);
  const part = APPEARANCE_PARTS.find((entry) => entry.id === partId);
  if (!part) return null;
  const id = appearance[partId];
  const asset = appearanceLayerAsset(appearance.body, partId, id);
  return {
    ...part,
    id,
    name: part.catalog.find((entry) => entry.id === id)?.name || part.catalog[0].name,
    asset,
    source: asset ? "image" : null,
    href: null,
  };
}

export function appearanceDescription(value = {}) {
  const appearance = normalizeAppearance(value);
  const bodyName = APPEARANCE_BODIES.find((entry) => entry.id === appearance.body)?.name || "男身";
  return [bodyName, ...APPEARANCE_PARTS.map((part) => appearancePart(appearance, part.id)?.name)].filter(Boolean).join("，");
}

export const APPEARANCE_FACES = APPEARANCE_FACE_SHAPES;
export const APPEARANCE_HAIRS = APPEARANCE_FRONT_HAIRS;
export const APPEARANCE_SKINS = Object.freeze([]);
export function appearanceCharacterAsset(value = {}) {
  return appearanceBaseAsset(value);
}
export function appearanceHairAsset(body, hair) {
  const appearance = normalizeAppearance({ body, frontHair: hair });
  return appearanceLayerAsset(appearance.body, "frontHair", appearance.frontHair);
}
