import assert from "node:assert/strict";
import test from "node:test";

import {
  APPEARANCE_BODIES,
  APPEARANCE_CATALOGS,
  APPEARANCE_PARTS,
  APPEARANCE_RUNTIME_ASSETS,
  DEFAULT_APPEARANCE,
  appearanceBaseAsset,
  appearancePart,
  createAppearanceState,
  cycleAppearance,
  normalizeAppearance,
} from "../web/appearance-core.mjs";

test("容貌目录保持与参考一致的十一类离散部件", () => {
  assert.deepEqual(APPEARANCE_BODIES.map((entry) => entry.name), ["男身", "女身"]);
  assert.deepEqual(APPEARANCE_PARTS.map((part) => part.label), [
    "帽子", "前发", "后发", "眼睛", "眉毛", "嘴巴", "鼻子", "脸型", "脸饰", "后背", "衣服",
  ]);
  assert.deepEqual(Object.fromEntries(APPEARANCE_PARTS.map((part) => [part.id, part.catalog.length])), {
    hat: 8,
    frontHair: 8,
    backHair: 8,
    eyes: 8,
    brows: 8,
    mouth: 8,
    nose: 8,
    faceShape: 6,
    faceAccessory: 6,
    backAccessory: 6,
    clothing: 8,
  });
});

test("十一部件状态可序列化并修复越界值", () => {
  assert.deepEqual(createAppearanceState(), DEFAULT_APPEARANCE);
  assert.ok(APPEARANCE_PARTS.every((part) => DEFAULT_APPEARANCE[part.id] === 1));
  const repaired = normalizeAppearance({ body: "unknown", hat: 99, frontHair: -1, clothing: "bad" });
  assert.deepEqual(repaired, DEFAULT_APPEARANCE);
  const custom = createAppearanceState({ body: "female", hat: 5, eyes: 8, faceShape: 6, clothing: 7 });
  assert.deepEqual(JSON.parse(JSON.stringify(custom)), custom);
});

test("版本9的整脸发式肤色安全迁移成十一部件", () => {
  const migrated = normalizeAppearance({ body: "female", face: 4, hair: 5, skin: 3 });
  assert.equal(migrated.body, "female");
  assert.equal(migrated.frontHair, 5);
  assert.equal(migrated.backHair, 5);
  assert.equal(migrated.faceShape, 4);
  assert.equal(migrated.eyes, 4);
  assert.equal(migrated.clothing, 1);
  assert.equal("face" in migrated, false);
  assert.equal("skin" in migrated, false);
});

test("随心一变同时轮换十一类外观但不改变体貌", () => {
  const current = createAppearanceState({ body: "female", hat: 8, frontHair: 8, faceShape: 6, clothing: 8 });
  const next = cycleAppearance(current);
  assert.equal(next.body, "female");
  assert.equal(next.hat, 1);
  assert.equal(next.frontHair, 1);
  assert.equal(next.faceShape, 1);
  assert.equal(next.clothing, 1);
  assert.ok(APPEARANCE_PARTS.every((part) => APPEARANCE_CATALOGS[part.id].some((entry) => entry.id === next[part.id])));
});

test("容貌底像和部件图集都位于正式运行资源目录", () => {
  assert.equal(appearanceBaseAsset({ body: "male" }), "./assets/appearance/layered/male-base-v2.webp");
  assert.equal(appearanceBaseAsset({ body: "female" }), "./assets/appearance/layered/female-base-v2.webp");
  assert.equal(appearancePart({ body: "male", frontHair: 1 }, "frontHair").asset, "./assets/appearance/layered/male-front-hair-1-v1.webp");
  assert.equal(appearancePart({ body: "female", clothing: 1 }, "clothing").asset, "./assets/appearance/layered/female-clothing-1-v1.webp");
  assert.equal(appearancePart({ frontHair: 3 }, "frontHair").href, "./assets/appearance/layered/parts-v1.svg#front-hair-3");
  assert.equal(appearancePart({ hat: 1 }, "hat").href, null);
  assert.ok(APPEARANCE_RUNTIME_ASSETS.every((path) => /^\.\/assets\/appearance\/layered\/.+\.(?:webp|svg)$/.test(path)));
});
