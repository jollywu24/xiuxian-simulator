import {
  APPEARANCE_PARTS,
  APPEARANCE_RUNTIME_ASSETS,
  appearanceBaseAsset,
  appearancePart,
  normalizeAppearance,
} from "./appearance-core.mjs?v=20260806.1";

export const PAPER_DOLL_LAYER_ORDER = Object.freeze({
  backAccessory: 5,
  backHair: 10,
  hatBack: 15,
  base: 20,
  clothing: 30,
  faceShape: 40,
  eyes: 45,
  brows: 46,
  nose: 47,
  mouth: 48,
  frontHair: 50,
  faceAccessory: 60,
  hatFront: 70,
});

// 兼容发布资源契约的旧导出名；内容已经改为纯容貌资源。
export const PAPER_DOLL_RUNTIME_ASSETS = APPEARANCE_RUNTIME_ASSETS;

export function resolvePaperDollLayers({ appearance } = {}) {
  const normalizedAppearance = normalizeAppearance(appearance);
  const resolveAppearanceLayer = (part) => {
    const selected = appearancePart(normalizedAppearance, part.id);
    if (!selected?.asset) return null;
    const kind = part.id === "hat" ? "hatFront" : part.id;
    return {
      id: `appearance:${kind}:${selected.id}`,
      itemId: null,
      slotId: kind,
      kind,
      source: selected.source,
      href: selected.href,
      asset: selected.asset,
      maskAsset: null,
      z: PAPER_DOLL_LAYER_ORDER[kind],
    };
  };
  const layers = [
    ...APPEARANCE_PARTS.flatMap((part) => {
      const layer = resolveAppearanceLayer(part);
      if (!layer || layer.z >= PAPER_DOLL_LAYER_ORDER.base) return [];
      return [layer];
    }),
    {
      id: `appearance-base:clothing:${normalizedAppearance.clothing}`,
      itemId: null,
      slotId: null,
      kind: "base",
      source: "image",
      asset: appearanceBaseAsset(normalizedAppearance),
      z: PAPER_DOLL_LAYER_ORDER.base,
    },
    ...APPEARANCE_PARTS.flatMap((part) => {
      const layer = resolveAppearanceLayer(part);
      if (!layer || layer.z < PAPER_DOLL_LAYER_ORDER.base) return [];
      return [layer];
    }),
  ];
  return {
    appearance: normalizedAppearance,
    layers: layers.sort((left, right) => left.z - right.z),
  };
}

// D-013以后装备不再提供人物外观层；保留接口供旧调用和迁移测试使用。
export function paperDollVisibleItemIds() {
  return [];
}
