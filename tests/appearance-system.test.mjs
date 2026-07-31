import assert from "node:assert/strict";
import test from "node:test";
import {
  APPEARANCE_BODIES,
  APPEARANCE_FACES,
  APPEARANCE_HAIRS,
  APPEARANCE_SKINS,
  appearanceCharacterAsset,
  appearanceHairAsset,
  createAppearanceState,
  cycleAppearance,
  normalizeAppearance,
} from "../web/appearance-core.mjs";

test("appearance catalogs expose the confirmed body, face, hair and skin choices", () => {
  assert.deepEqual(APPEARANCE_BODIES.map((entry) => entry.name), ["男身", "女身"]);
  assert.equal(APPEARANCE_FACES.length, 6);
  assert.equal(APPEARANCE_HAIRS.length, 5);
  assert.equal(APPEARANCE_SKINS.length, 5);
  assert.ok(APPEARANCE_HAIRS.every((entry) => !/长辫|长马尾/.test(entry.name)));
});

test("appearance state is JSON-safe and repairs invalid legacy values", () => {
  assert.deepEqual(createAppearanceState(), { body: "male", face: 1, hair: 1, skin: 2 });
  assert.deepEqual(normalizeAppearance({ body: "unknown", face: 99, hair: -1, skin: "bad" }), {
    body: "male",
    face: 1,
    hair: 1,
    skin: 2,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(createAppearanceState({ body: "female", face: 4, hair: 5, skin: 3 }))), {
    body: "female",
    face: 4,
    hair: 5,
    skin: 3,
  });
});

test("random appearance control cycles visible presets without changing body", () => {
  assert.deepEqual(cycleAppearance({ body: "female", face: 6, hair: 5, skin: 5 }), {
    body: "female",
    face: 1,
    hair: 1,
    skin: 1,
  });
});

test("appearance asset paths stay inside the formal runtime asset directory", () => {
  assert.equal(appearanceCharacterAsset({ body: "male", hair: 4 }), "./assets/appearance/male-4-v1.webp");
  assert.equal(appearanceHairAsset("female", 3), "./assets/appearance/female-hair-3-v1.webp");
});
