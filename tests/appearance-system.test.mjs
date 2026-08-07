import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  APPEARANCE_BODIES,
  APPEARANCE_BODY_ASSETS,
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
    return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
  }
  throw new Error(`unsupported WebP chunk: ${chunk}`);
}

test("容貌目录提供十一类真实可切换部件", () => {
  assert.deepEqual(APPEARANCE_BODIES.map((entry) => entry.name), ["男身", "女身"]);
  assert.deepEqual(APPEARANCE_PARTS.map((part) => part.label), [
    "帽子", "前发", "后发", "眼睛", "眉毛", "嘴巴", "鼻子", "脸型", "脸饰", "后背", "衣服",
  ]);
  assert.deepEqual(Object.fromEntries(APPEARANCE_PARTS.map((part) => [part.id, part.catalog.length])), {
    hat: 2,
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
  assert.deepEqual(normalizeAppearance({ body: "unknown", hat: 99, frontHair: -1, clothing: "bad" }), DEFAULT_APPEARANCE);
  const custom = createAppearanceState({ body: "female", clothing: 2, eyes: 2 });
  assert.deepEqual(JSON.parse(JSON.stringify(custom)), custom);
});

test("版本9整脸与发式字段安全迁移成离散部件", () => {
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

test("随心一变依次轮换四套分层容貌组合", () => {
  const first = createAppearanceState();
  const second = cycleAppearance(first);
  const third = cycleAppearance(second);
  const fourth = cycleAppearance(third);
  assert.deepEqual([first, second, third, fourth].map(({ body, clothing }) => `${body}:${clothing}`), [
    "male:1", "male:2", "female:1", "female:2",
  ]);
  assert.deepEqual(cycleAppearance(fourth), first);
  assert.notDeepEqual(second, first);
  assert.ok(APPEARANCE_PARTS.every((part) => APPEARANCE_CATALOGS[part.id].some((entry) => entry.id === fourth[part.id])));
});

test("容貌发布同画布的底像、衣装与独立部件层", () => {
  assert.equal(appearanceBaseAsset({ body: "male", clothing: 1 }), "./assets/appearance/rig-v4/male-base-v1.webp");
  assert.equal(appearanceBaseAsset({ body: "female", clothing: 2 }), "./assets/appearance/rig-v4/female-clothing-2-v1.webp");
  assert.equal(APPEARANCE_BODY_ASSETS.male[2], "./assets/appearance/rig-v4/male-clothing-2-v1.webp");
  assert.equal(appearancePart({ body: "male", frontHair: 1 }, "frontHair").asset, null);
  assert.equal(appearancePart({ body: "male", frontHair: 2 }, "frontHair").asset, "./assets/appearance/rig-v4/male-front-hair-2-v1.webp");
  assert.equal(appearancePart({ body: "female", hat: 2 }, "hat").asset, "./assets/appearance/rig-v4/female-hat-v1.webp");
  assert.equal(appearancePart({ body: "female", clothing: 2 }, "clothing").asset, null);
  assert.equal(appearanceHairMaskAsset("male", 2), null);
  assert.equal(APPEARANCE_RUNTIME_ASSETS.length, 24);
  assert.equal(new Set(APPEARANCE_RUNTIME_ASSETS).size, APPEARANCE_RUNTIME_ASSETS.length);
  assert.ok(APPEARANCE_RUNTIME_ASSETS.every((asset) => /^\.\/assets\/appearance\/rig-v4\/.+\.webp$/.test(asset)));
  for (const asset of APPEARANCE_RUNTIME_ASSETS) {
    const target = path.join(webRoot, asset.replace(/^\.\//, ""));
    assert.ok(fs.existsSync(target), `missing appearance asset: ${asset}`);
    assert.ok(fs.statSync(target).size >= 64, `empty appearance asset: ${asset}`);
    assert.deepEqual(webpDimensions(fs.readFileSync(target)), { width: 1024, height: 1536 }, `wrong fixed canvas: ${asset}`);
  }
  assert.ok(fs.existsSync(path.resolve(webRoot, "../scripts/build-appearance-rig-v4.py")));
});
