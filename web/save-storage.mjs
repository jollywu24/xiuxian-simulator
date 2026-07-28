import {
  SAVE_BACKUP_CHECKSUM_SUFFIX,
  SAVE_BACKUP_SUFFIX,
  SAVE_CHECKSUM_SUFFIX,
  SAVE_SLOT_ID,
  SAVE_STORAGE_KEY,
  checksumText,
  isSaveObject,
  parseSaveText,
  selectRecoverableSave,
} from "./save-core.mjs?v=20260728.5";

function storageKeys(key) {
  return {
    primary: key,
    checksum: `${key}${SAVE_CHECKSUM_SUFFIX}`,
    backup: `${key}${SAVE_BACKUP_SUFFIX}`,
    backupChecksum: `${key}${SAVE_BACKUP_CHECKSUM_SUFFIX}`,
  };
}

export function createBrowserSaveStorage({
  storage = globalThis.localStorage,
  key = SAVE_STORAGE_KEY,
} = {}) {
  const keys = storageKeys(key);

  function promote(raw) {
    storage.removeItem(keys.checksum);
    storage.setItem(keys.primary, raw);
    storage.setItem(keys.checksum, checksumText(raw));
  }

  return {
    kind: "browser",
    read(validate = isSaveObject) {
      const result = selectRecoverableSave(
        {
          primary: storage.getItem(keys.primary),
          primaryChecksum: storage.getItem(keys.checksum),
          backup: storage.getItem(keys.backup),
          backupChecksum: storage.getItem(keys.backupChecksum),
        },
        validate,
      );
      if (result.recovered && result.raw) promote(result.raw);
      return result;
    },
    write(raw, validate = isSaveObject) {
      const next = parseSaveText(raw, null, validate);
      if (!next.valid) throw new Error(`Refusing invalid save payload: ${next.reason}`);

      const currentRaw = storage.getItem(keys.primary);
      const current = parseSaveText(currentRaw, storage.getItem(keys.checksum), validate);
      if (current.valid && current.raw !== raw) {
        storage.setItem(keys.backup, current.raw);
        storage.setItem(keys.backupChecksum, checksumText(current.raw));
      }

      promote(raw);
      return { source: "primary", checksum: checksumText(raw) };
    },
    clear() {
      Object.values(keys).forEach((storageKey) => storage.removeItem(storageKey));
    },
    flush() {
      return Promise.resolve();
    },
    keys: { ...keys },
  };
}

export function createDesktopBridgeSaveStorage({
  bridge,
  slot = SAVE_SLOT_ID,
} = {}) {
  if (!bridge?.readSaveSlot || !bridge?.writeSaveSlot || !bridge?.clearSaveSlot) {
    throw new Error("Desktop save bridge is incomplete.");
  }
  let writeQueue = Promise.resolve();

  return {
    kind: "desktop",
    async read(validate = isSaveObject) {
      await writeQueue;
      const files = await bridge.readSaveSlot(slot);
      return selectRecoverableSave(
        {
          primary: files?.primary ?? files?.raw ?? null,
          backup: files?.backup ?? files?.backupRaw ?? null,
        },
        validate,
      );
    },
    write(raw, validate = isSaveObject) {
      const next = parseSaveText(raw, null, validate);
      if (!next.valid) return Promise.reject(new Error(`Refusing invalid save payload: ${next.reason}`));
      const operation = writeQueue.then(() => bridge.writeSaveSlot(slot, raw));
      writeQueue = operation.catch(() => undefined);
      return operation;
    },
    clear() {
      const operation = writeQueue.then(() => bridge.clearSaveSlot(slot));
      writeQueue = operation.catch(() => undefined);
      return operation;
    },
    flush() {
      return writeQueue;
    },
  };
}

export function createSaveStorage({
  storage = globalThis.localStorage,
  bridge = globalThis.wudaoDesktopStorage,
  key = SAVE_STORAGE_KEY,
  slot = SAVE_SLOT_ID,
} = {}) {
  if (bridge) return createDesktopBridgeSaveStorage({ bridge, slot });
  return createBrowserSaveStorage({ storage, key });
}
