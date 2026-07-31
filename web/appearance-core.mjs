export const APPEARANCE_BODIES = Object.freeze([
  { id: "male", name: "男身" },
  { id: "female", name: "女身" },
]);

export const APPEARANCE_FACES = Object.freeze(
  Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
    name: `面容${index + 1}`,
  })),
);

export const APPEARANCE_HAIRS = Object.freeze([
  { id: 1, name: "短束发" },
  { id: 2, name: "背梳短发" },
  { id: 3, name: "利落短发" },
  { id: 4, name: "半束发" },
  { id: 5, name: "齐颌散发" },
]);

export const APPEARANCE_SKINS = Object.freeze([
  { id: 1, name: "冷白", color: "#dfd7cb" },
  { id: 2, name: "浅麦", color: "#d3b68e" },
  { id: 3, name: "自然", color: "#bf9a7d" },
  { id: 4, name: "暖褐", color: "#a77f67" },
  { id: 5, name: "深褐", color: "#866651" },
]);

export const DEFAULT_APPEARANCE = Object.freeze({
  body: "male",
  face: 1,
  hair: 1,
  skin: 2,
});

export const APPEARANCE_CHARACTER_ASSETS = Object.freeze({
  male: Object.freeze([
    "./assets/appearance/male-1-v1.webp",
    "./assets/appearance/male-2-v1.webp",
    "./assets/appearance/male-3-v1.webp",
    "./assets/appearance/male-4-v1.webp",
    "./assets/appearance/male-5-v1.webp",
  ]),
  female: Object.freeze([
    "./assets/appearance/female-1-v1.webp",
    "./assets/appearance/female-2-v1.webp",
    "./assets/appearance/female-3-v1.webp",
    "./assets/appearance/female-4-v1.webp",
    "./assets/appearance/female-5-v1.webp",
  ]),
});

export const APPEARANCE_HAIR_ASSETS = Object.freeze({
  male: Object.freeze([
    "./assets/appearance/male-hair-1-v1.webp",
    "./assets/appearance/male-hair-2-v1.webp",
    "./assets/appearance/male-hair-3-v1.webp",
    "./assets/appearance/male-hair-4-v1.webp",
    "./assets/appearance/male-hair-5-v1.webp",
  ]),
  female: Object.freeze([
    "./assets/appearance/female-hair-1-v1.webp",
    "./assets/appearance/female-hair-2-v1.webp",
    "./assets/appearance/female-hair-3-v1.webp",
    "./assets/appearance/female-hair-4-v1.webp",
    "./assets/appearance/female-hair-5-v1.webp",
  ]),
});

function catalogHas(catalog, id) {
  return catalog.some((entry) => entry.id === id);
}

export function normalizeAppearance(value = {}) {
  const body = catalogHas(APPEARANCE_BODIES, value?.body) ? value.body : DEFAULT_APPEARANCE.body;
  const face = Number(value?.face);
  const hair = Number(value?.hair);
  const skin = Number(value?.skin);
  return {
    body,
    face: catalogHas(APPEARANCE_FACES, face) ? face : DEFAULT_APPEARANCE.face,
    hair: catalogHas(APPEARANCE_HAIRS, hair) ? hair : DEFAULT_APPEARANCE.hair,
    skin: catalogHas(APPEARANCE_SKINS, skin) ? skin : DEFAULT_APPEARANCE.skin,
  };
}

export function createAppearanceState(overrides = {}) {
  return normalizeAppearance({ ...DEFAULT_APPEARANCE, ...overrides });
}

export function cycleAppearance(value = {}) {
  const current = normalizeAppearance(value);
  return normalizeAppearance({
    ...current,
    face: (current.face % APPEARANCE_FACES.length) + 1,
    hair: (current.hair % APPEARANCE_HAIRS.length) + 1,
    skin: (current.skin % APPEARANCE_SKINS.length) + 1,
  });
}

export function appearanceCharacterAsset(value = {}) {
  const appearance = normalizeAppearance(value);
  return APPEARANCE_CHARACTER_ASSETS[appearance.body][appearance.hair - 1];
}

export function appearanceHairAsset(body, hair) {
  const appearance = normalizeAppearance({ body, hair });
  return APPEARANCE_HAIR_ASSETS[appearance.body][appearance.hair - 1];
}
