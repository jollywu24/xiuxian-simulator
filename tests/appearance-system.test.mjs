import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  APPEARANCE_BODIES,
  APPEARANCE_CATALOGS,
  APPEARANCE_PARTS,
  APPEARANCE_RUNTIME_ASSETS,
  DEFAULT_APPEARANCE,
  appearanceBaseAsset,
  appearanceHairMaskAsset,
  appearancePart,
  createAppearanceState,
  cycleAppearance,
  normalizeAppearance,
} from "../web/appearance-core.mjs";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../web");

function webpDimensions(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8L") {
    assert.equal(buffer[20], 0x2f);
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") {
    return {
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1,
    };
  }
  throw new Error(`unsupported WebP chunk: ${chunk}`);
}

test("容貌目录保持与参考一致的十一类离散部件", () => {
  assert.deepEqual(APPEARANCE_BODIES.map((entry) => entry.name), ["男身", "女身"]);
  assert.deepEqual(APPEARANCE_PARTS.map((part) => part.label), [
    "帽子", "前发", "后发", "眼睛", "眉毛", "嘴巴", "鼻子", "脸型", "脸饰", "后背", "衣服",
  ]);
  assert.deepEqual(Object.fromEntries(APPEARANCE_PARTS.map((part) => [part.id, part.catalog.length])), {
    hat: 3,
    frontHair: 2,
    backHair: 2,
    eyes: 2,
    brows: 2,
    mouth: 2,
    nose: 2,
    faceShape: 2,
    faceAccessory: 2,
    backAccessory: 2,
    clothing: 2,
  });
});

test("十一部件状态可序列化并修复越界值", () => {
  assert.deepEqual(createAppearanceState(), DEFAULT_APPEARANCE);
  assert.ok(APPEARANCE_PARTS.every((part) => DEFAULT_APPEARANCE[part.id] === 1));
  const repaired = normalizeAppearance({ body: "unknown", hat: 99, frontHair: -1, clothing: "bad" });
  assert.deepEqual(repaired, DEFAULT_APPEARANCE);
  const custom = createAppearanceState({ body: "female", hat: 3, eyes: 2, faceShape: 2, clothing: 2 });
  assert.deepEqual(JSON.parse(JSON.stringify(custom)), custom);
});

test("版本9的整脸发式肤色安全迁移成十一部件", () => {
  const migrated = normalizeAppearance({ body: "female", face: 4, hair: 5, skin: 3 });
  assert.equal(migrated.body, "female");
  assert.equal(migrated.frontHair, 1);
  assert.equal(migrated.backHair, 1);
  assert.equal(migrated.faceShape, 2);
  assert.equal(migrated.eyes, 2);
  assert.equal(migrated.clothing, 1);
  assert.equal("face" in migrated, false);
  assert.equal("skin" in migrated, false);
});

test("随心一变同时轮换十一类外观但不改变体貌", () => {
  const current = createAppearanceState({ body: "female", hat: 3, frontHair: 2, backHair: 2, eyes: 2, brows: 2, mouth: 2, nose: 2, faceShape: 2, faceAccessory: 2, backAccessory: 2, clothing: 2 });
  const next = cycleAppearance(current);
  assert.equal(next.body, "female");
  assert.equal(next.hat, 1);
  assert.equal(next.frontHair, 1);
  assert.equal(next.faceShape, 1);
  assert.equal(next.clothing, 1);
  assert.ok(APPEARANCE_PARTS.every((part) => APPEARANCE_CATALOGS[part.id].some((entry) => entry.id === next[part.id])));
});

test("容貌固定母版、槽位附件和帽发遮罩都位于正式运行资源目录", () => {
  assert.equal(appearanceBaseAsset({ body: "male" }), "./assets/appearance/rig-v1/male-base-v4.webp");
  assert.equal(appearanceBaseAsset({ body: "female" }), "./assets/appearance/rig-v1/female-base-v4.webp");
  assert.equal(appearancePart({ body: "male", frontHair: 1 }, "frontHair").asset, "./assets/appearance/rig-v1/male-frontHair-1-v3.webp");
  assert.equal(appearancePart({ body: "female", clothing: 1 }, "clothing").asset, "./assets/appearance/rig-v1/female-clothing-1-v3.webp");
  assert.equal(appearancePart({ body: "male", frontHair: 2 }, "frontHair").asset, "./assets/appearance/rig-v1/male-frontHair-2-v3.webp");
  assert.equal(appearancePart({ body: "female", eyes: 2 }, "eyes").asset, "./assets/appearance/rig-v1/female-eyes-2-v3.webp");
  assert.equal(appearanceHairMaskAsset("male", 1), null);
  assert.equal(appearanceHairMaskAsset("male", 2), "./assets/appearance/rig-v1/male-hat-2-hair-mask-v3.webp");
  assert.equal(appearancePart({ frontHair: 2 }, "frontHair").href, null);
  assert.equal(appearancePart({ hat: 1 }, "hat").href, null);
  assert.equal(appearancePart({ hat: 1 }, "hat").asset, null);
  assert.equal(APPEARANCE_RUNTIME_ASSETS.length, 46);
  assert.equal(new Set(APPEARANCE_RUNTIME_ASSETS).size, APPEARANCE_RUNTIME_ASSETS.length);
  assert.ok(APPEARANCE_RUNTIME_ASSETS.every((path) => /^\.\/assets\/appearance\/rig-v1\/.+\.webp$/.test(path)));
  assert.ok(APPEARANCE_RUNTIME_ASSETS.every((path) => !path.includes("parts-v1.svg")));
  for (const asset of APPEARANCE_RUNTIME_ASSETS) {
    const target = path.join(webRoot, asset.replace(/^\.\//, ""));
    assert.ok(fs.existsSync(target), `missing appearance asset: ${asset}`);
    assert.ok(fs.statSync(target).size >= 64, `empty appearance asset: ${asset}`);
    assert.deepEqual(webpDimensions(fs.readFileSync(target)), { width: 1024, height: 1536 }, `wrong fixed canvas: ${asset}`);
  }
  const builder = path.resolve(webRoot, "../scripts/build-appearance-rig.py");
  assert.ok(fs.existsSync(builder), `missing reproducible rig builder: ${builder}`);
});
