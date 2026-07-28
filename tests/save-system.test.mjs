import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createFileSaveStore } from "../desktop/save-file-store.mjs";
import {
  SAVE_BACKUP_CHECKSUM_SUFFIX,
  SAVE_BACKUP_SUFFIX,
  SAVE_CHECKSUM_SUFFIX,
  SAVE_STORAGE_KEY,
  checksumText,
  selectRecoverableSave,
} from "../web/save-core.mjs";
import { createBrowserSaveStorage } from "../web/save-storage.mjs";

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

const validState = (screen, version = 8) => ({ version, screen, name: "陈司命" });
const supportsCurrentState = (value) => [2, 3, 4, 5, 6, 7, 8].includes(value?.version) && Boolean(value?.screen);

test("checksum detects truncated or altered save text", () => {
  const raw = JSON.stringify(validState("templeWake"));
  assert.equal(checksumText(raw), checksumText(raw));
  assert.notEqual(checksumText(raw), checksumText(`${raw} `));
  assert.equal(
    selectRecoverableSave({ primary: raw, primaryChecksum: checksumText(raw) }, supportsCurrentState).source,
    "primary",
  );
});

test("browser storage accepts a legacy save and adds checksum on next write", () => {
  const memory = new MemoryStorage();
  const storage = createBrowserSaveStorage({ storage: memory });
  const legacyRaw = JSON.stringify(validState("templeWake", 4));
  memory.setItem(SAVE_STORAGE_KEY, legacyRaw);

  const loaded = storage.read(supportsCurrentState);
  assert.equal(loaded.value.version, 4);
  assert.equal(loaded.source, "primary");

  const nextRaw = JSON.stringify(validState("ladyArrival"));
  storage.write(nextRaw, supportsCurrentState);
  assert.equal(memory.getItem(SAVE_STORAGE_KEY), nextRaw);
  assert.equal(memory.getItem(`${SAVE_STORAGE_KEY}${SAVE_CHECKSUM_SUFFIX}`), checksumText(nextRaw));
  assert.equal(memory.getItem(`${SAVE_STORAGE_KEY}${SAVE_BACKUP_SUFFIX}`), legacyRaw);
  assert.equal(
    memory.getItem(`${SAVE_STORAGE_KEY}${SAVE_BACKUP_CHECKSUM_SUFFIX}`),
    checksumText(legacyRaw),
  );
});

test("browser storage restores and promotes backup when primary is corrupted", () => {
  const memory = new MemoryStorage();
  const storage = createBrowserSaveStorage({ storage: memory });
  const firstRaw = JSON.stringify(validState("templeWake"));
  const secondRaw = JSON.stringify(validState("ladyArrival"));
  storage.write(firstRaw, supportsCurrentState);
  storage.write(secondRaw, supportsCurrentState);
  memory.setItem(SAVE_STORAGE_KEY, '{"version":8');
  memory.removeItem(`${SAVE_STORAGE_KEY}${SAVE_CHECKSUM_SUFFIX}`);

  const recovered = storage.read(supportsCurrentState);
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.source, "backup");
  assert.equal(recovered.value.screen, "templeWake");
  assert.equal(memory.getItem(SAVE_STORAGE_KEY), firstRaw);
  assert.equal(memory.getItem(`${SAVE_STORAGE_KEY}${SAVE_CHECKSUM_SUFFIX}`), checksumText(firstRaw));
});

test("browser storage falls back when valid JSON no longer matches its checksum", () => {
  const memory = new MemoryStorage();
  const storage = createBrowserSaveStorage({ storage: memory });
  const firstRaw = JSON.stringify(validState("templeWake"));
  const secondRaw = JSON.stringify(validState("ladyArrival"));
  storage.write(firstRaw, supportsCurrentState);
  storage.write(secondRaw, supportsCurrentState);
  memory.setItem(SAVE_STORAGE_KEY, JSON.stringify(validState("shenArrival")));

  const recovered = storage.read(supportsCurrentState);
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.primaryReason, "checksum");
  assert.equal(recovered.value.screen, "templeWake");
});

test("browser storage rejects invalid writes without replacing a valid save", () => {
  const memory = new MemoryStorage();
  const storage = createBrowserSaveStorage({ storage: memory });
  const raw = JSON.stringify(validState("templeWake"));
  storage.write(raw, supportsCurrentState);
  assert.throws(() => storage.write('{"version":7', supportsCurrentState), /invalid save payload/i);
  assert.equal(memory.getItem(SAVE_STORAGE_KEY), raw);
});

test("browser clear removes the primary, checksum and backup records", () => {
  const memory = new MemoryStorage();
  const storage = createBrowserSaveStorage({ storage: memory });
  storage.write(JSON.stringify(validState("templeWake")), supportsCurrentState);
  storage.write(JSON.stringify(validState("ladyArrival")), supportsCurrentState);
  storage.clear();
  Object.values(storage.keys).forEach((key) => assert.equal(memory.getItem(key), null));
});

test("file store writes atomically, rotates backup and recovers a corrupt primary", async (context) => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "wudao-save-"));
  context.after(() => fs.rm(baseDir, { recursive: true, force: true }));
  const store = createFileSaveStore({ baseDir });
  const firstRaw = JSON.stringify(validState("templeWake"));
  const secondRaw = JSON.stringify(validState("ladyArrival"));

  await store.write(firstRaw, supportsCurrentState);
  await store.write(secondRaw, supportsCurrentState);
  assert.equal(await fs.readFile(store.paths.primary, "utf8"), secondRaw);
  assert.equal(await fs.readFile(store.paths.backup, "utf8"), firstRaw);

  await fs.writeFile(store.paths.primary, '{"version":7', "utf8");
  const recovered = await store.read(supportsCurrentState);
  assert.equal(recovered.recovered, true);
  assert.equal(recovered.value.screen, "templeWake");
  assert.equal(await fs.readFile(store.paths.primary, "utf8"), firstRaw);
  assert.equal(await fs.readFile(store.paths.backup, "utf8"), firstRaw);
});

test("file store keeps the previous save when a new payload is invalid", async (context) => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "wudao-save-"));
  context.after(() => fs.rm(baseDir, { recursive: true, force: true }));
  const store = createFileSaveStore({ baseDir });
  const raw = JSON.stringify(validState("templeWake"));
  await store.write(raw, supportsCurrentState);

  await assert.rejects(store.write('{"version":7', supportsCurrentState), /invalid save payload/i);
  assert.equal(await fs.readFile(store.paths.primary, "utf8"), raw);
  await store.clear();
  await assert.rejects(fs.access(store.paths.primary));
});

test("file store serializes rapid writes so the newest state remains primary", async (context) => {
  const baseDir = await fs.mkdtemp(path.join(os.tmpdir(), "wudao-save-"));
  context.after(() => fs.rm(baseDir, { recursive: true, force: true }));
  const store = createFileSaveStore({ baseDir });
  const firstRaw = JSON.stringify(validState("templeWake"));
  const secondRaw = JSON.stringify(validState("ladyArrival"));
  const thirdRaw = JSON.stringify(validState("nightTalk"));

  await Promise.all([
    store.write(firstRaw, supportsCurrentState),
    store.write(secondRaw, supportsCurrentState),
    store.write(thirdRaw, supportsCurrentState),
  ]);
  assert.equal(await fs.readFile(store.paths.primary, "utf8"), thirdRaw);
  assert.equal(await fs.readFile(store.paths.backup, "utf8"), secondRaw);
});
