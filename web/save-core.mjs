export const SAVE_STORAGE_KEY = "wudao-high-martial-v1";
export const SAVE_SLOT_ID = "save-1";
export const SAVE_BACKUP_SUFFIX = "-backup";
export const SAVE_CHECKSUM_SUFFIX = "-checksum";
export const SAVE_BACKUP_CHECKSUM_SUFFIX = "-backup-checksum";

export function checksumText(value) {
  const text = String(value ?? "");
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    hash ^= code & 0xff;
    hash = Math.imul(hash, 0x01000193);
    hash ^= code >>> 8;
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function isSaveObject(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function parseSaveText(raw, expectedChecksum = null, validate = isSaveObject) {
  if (typeof raw !== "string" || !raw.trim()) {
    return { valid: false, value: null, raw: null, reason: "missing" };
  }
  if (expectedChecksum && checksumText(raw) !== expectedChecksum) {
    return { valid: false, value: null, raw, reason: "checksum" };
  }
  try {
    const value = JSON.parse(raw);
    if (!isSaveObject(value)) {
      return { valid: false, value: null, raw, reason: "shape" };
    }
    if (typeof validate === "function" && !validate(value)) {
      return { valid: false, value: null, raw, reason: "unsupported" };
    }
    return { valid: true, value, raw, reason: null };
  } catch {
    return { valid: false, value: null, raw, reason: "json" };
  }
}

export function selectRecoverableSave(
  {
    primary = null,
    primaryChecksum = null,
    backup = null,
    backupChecksum = null,
  } = {},
  validate = isSaveObject,
) {
  const primaryResult = parseSaveText(primary, primaryChecksum, validate);
  if (primaryResult.valid) {
    return {
      ...primaryResult,
      source: "primary",
      recovered: false,
      primaryReason: null,
    };
  }

  const backupResult = parseSaveText(backup, backupChecksum, validate);
  if (backupResult.valid) {
    return {
      ...backupResult,
      source: "backup",
      recovered: true,
      primaryReason: primaryResult.reason,
    };
  }

  return {
    valid: false,
    value: null,
    raw: null,
    reason: backupResult.reason,
    source: null,
    recovered: false,
    primaryReason: primaryResult.reason,
  };
}
