import test from "node:test";
import assert from "node:assert/strict";

import { migrateCharacterVitals } from "../web/character-system.mjs";

test("旧存档的空气血与真气保持未初始化，不会迁移成零", () => {
  assert.deepEqual(migrateCharacterVitals({ health: null, qi: null }), { health: null, qi: null });
  assert.deepEqual(migrateCharacterVitals(), { health: null, qi: null });
  assert.deepEqual(migrateCharacterVitals({ health: 7, qi: 2 }), { health: 7, qi: 2 });
});
