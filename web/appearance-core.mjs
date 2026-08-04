export const APPEARANCE_BODIES = Object.freeze([
  { id: "male", name: "男身" },
  { id: "female", name: "女身" },
]);

function numbered(names) {
  return Object.freeze(names.map((name, index) => Object.freeze({ id: index + 1, name })));
}

export const APPEARANCE_HATS = numbered([
  "不戴冠帽", "旧布额巾", "束发小冠",
]);
export const APPEARANCE_FRONT_HAIRS = numbered([
  "散碎垂发", "分束垂发",
]);
export const APPEARANCE_BACK_HAIRS = numbered([
  "高束发髻", "齐颈后发",
]);
export const APPEARANCE_EYES = numbered([
  "平直凤眼", "清锐长眼",
]);
export const APPEARANCE_BROWS = numbered([
  "平锋眉", "淡月眉",
]);
export const APPEARANCE_MOUTHS = numbered([
  "常唇", "薄唇",
]);
export const APPEARANCE_NOSES = numbered([
  "直鼻", "圆鼻",
]);
export const APPEARANCE_FACE_SHAPES = numbered([
  "清峻脸型", "方正脸型",
]);
export const APPEARANCE_BACK_ACCESSORIES = numbered([
  "不负外物", "旧木剑匣",
]);
export const APPEARANCE_CLOTHINGS = numbered([
  "玄青游侠装", "褐布行衣",
]);
export const APPEARANCE_FACE_ACCESSORIES = numbered([
  "不饰面容", "颊上旧痕",
]);

export const APPEARANCE_PARTS = Object.freeze([
  Object.freeze({ id: "hat", label: "帽子", catalog: APPEARANCE_HATS, symbol: "hat", z: 70, layout: "top" }),
  Object.freeze({ id: "frontHair", label: "前发", catalog: APPEARANCE_FRONT_HAIRS, symbol: "front-hair", z: 50, layout: "left-1" }),
  Object.freeze({ id: "backHair", label: "后发", catalog: APPEARANCE_BACK_HAIRS, symbol: "back-hair", z: 10, layout: "right-1" }),
  Object.freeze({ id: "eyes", label: "眼睛", catalog: APPEARANCE_EYES, symbol: "eyes", z: 45, layout: "left-2" }),
  Object.freeze({ id: "brows", label: "眉毛", catalog: APPEARANCE_BROWS, symbol: "brows", z: 46, layout: "right-2" }),
  Object.freeze({ id: "mouth", label: "嘴巴", catalog: APPEARANCE_MOUTHS, symbol: "mouth", z: 48, layout: "left-3" }),
  Object.freeze({ id: "nose", label: "鼻子", catalog: APPEARANCE_NOSES, symbol: "nose", z: 47, layout: "right-3" }),
  Object.freeze({ id: "faceShape", label: "脸型", catalog: APPEARANCE_FACE_SHAPES, symbol: "face-shape", z: 40, layout: "left-4" }),
  Object.freeze({ id: "faceAccessory", label: "脸饰", catalog: APPEARANCE_FACE_ACCESSORIES, symbol: "face-accessory", z: 60, layout: "right-4" }),
  Object.freeze({ id: "backAccessory", label: "后背", catalog: APPEARANCE_BACK_ACCESSORIES, symbol: "back-accessory", z: 5, layout: "left-5" }),
  Object.freeze({ id: "clothing", label: "衣服", catalog: APPEARANCE_CLOTHINGS, symbol: "clothing", z: 30, layout: "right-5" }),
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

export const APPEARANCE_BASE_ASSETS = Object.freeze({
  male: "./assets/appearance/rig-v1/male-base-v4.webp",
  female: "./assets/appearance/rig-v1/female-base-v4.webp",
});

const EMPTY_APPEARANCE_PARTS = Object.freeze({
  hat: new Set([1]),
  faceAccessory: new Set([1]),
  backAccessory: new Set([1]),
});

export function appearanceLayerAsset(body, partId, id) {
  if (!catalogHas(APPEARANCE_BODIES, body)) return null;
  const part = APPEARANCE_PARTS.find((entry) => entry.id === partId);
  const numeric = Number(id);
  if (!part || !catalogHas(part.catalog, numeric) || EMPTY_APPEARANCE_PARTS[partId]?.has(numeric)) return null;
  if (partId === "hat") return `./assets/appearance/rig-v1/${body}-hat-${numeric}-front-v3.webp`;
  return `./assets/appearance/rig-v1/${body}-${partId}-${numeric}-v3.webp`;
}

export function appearanceHairMaskAsset(body, hatId) {
  const numeric = Number(hatId);
  if (!catalogHas(APPEARANCE_BODIES, body) || !catalogHas(APPEARANCE_HATS, numeric) || numeric === 1) return null;
  return `./assets/appearance/rig-v1/${body}-hat-${numeric}-hair-mask-v3.webp`;
}

export const APPEARANCE_DEFAULT_LAYER_ASSETS = Object.freeze({
  male: Object.freeze(Object.fromEntries(APPEARANCE_PARTS.map((part) => [part.id, appearanceLayerAsset("male", part.id, 1)]))),
  female: Object.freeze(Object.fromEntries(APPEARANCE_PARTS.map((part) => [part.id, appearanceLayerAsset("female", part.id, 1)]))),
});

export const APPEARANCE_RUNTIME_ASSETS = Object.freeze([
  APPEARANCE_BASE_ASSETS.male,
  APPEARANCE_BASE_ASSETS.female,
  ...APPEARANCE_BODIES.flatMap(({ id: body }) => APPEARANCE_PARTS.flatMap((part) => (
    part.catalog.map(({ id }) => appearanceLayerAsset(body, part.id, id)).filter(Boolean)
  ))),
  ...APPEARANCE_BODIES.flatMap(({ id: body }) => APPEARANCE_HATS.map(({ id }) => appearanceHairMaskAsset(body, id)).filter(Boolean)),
]);

function catalogHas(catalog, id) {
  return catalog.some((entry) => entry.id === id);
}

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

export function cycleAppearance(value = {}) {
  const current = normalizeAppearance(value);
  return normalizeAppearance(Object.fromEntries([
    ["body", current.body],
    ...APPEARANCE_PARTS.map((part) => [part.id, (current[part.id] % part.catalog.length) + 1]),
  ]));
}

export function appearanceBaseAsset(value = {}) {
  return APPEARANCE_BASE_ASSETS[normalizeAppearance(value).body];
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

// 旧接口保留到版本9存档迁移完成，返回新的分层底像／前发缩略资源。
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
