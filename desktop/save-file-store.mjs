import { promises as fs } from "node:fs";
import path from "node:path";
import {
  SAVE_SLOT_ID,
  isSaveObject,
  parseSaveText,
  selectRecoverableSave,
} from "../web/save-core.mjs";

async function readText(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function atomicReplace(filePath, raw, temporaryPath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const handle = await fs.open(temporaryPath, "w");
  try {
    await handle.writeFile(raw, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }

  try {
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    if (!["EEXIST", "EPERM"].includes(error?.code)) throw error;
    await fs.rm(filePath, { force: true });
    await fs.rename(temporaryPath, filePath);
  }
}

export function createFileSaveStore({
  baseDir,
  slot = SAVE_SLOT_ID,
} = {}) {
  if (!baseDir) throw new Error("A save directory is required.");
  const primaryPath = path.join(baseDir, `${slot}.json`);
  const backupPath = path.join(baseDir, `${slot}.bak`);
  const temporaryPath = path.join(baseDir, `.${slot}.tmp`);
  let writeQueue = Promise.resolve();

  async function readNow(validate = isSaveObject) {
    const result = selectRecoverableSave(
      {
        primary: await readText(primaryPath),
        backup: await readText(backupPath),
      },
      validate,
    );
    if (result.recovered && result.raw) {
      await atomicReplace(primaryPath, result.raw, temporaryPath);
    }
    return result;
  }

  async function writeNow(raw, validate = isSaveObject) {
    const next = parseSaveText(raw, null, validate);
    if (!next.valid) throw new Error(`Refusing invalid save payload: ${next.reason}`);

    const currentRaw = await readText(primaryPath);
    const current = parseSaveText(currentRaw, null, validate);
    if (current.valid && current.raw !== raw) {
      await atomicReplace(backupPath, current.raw, temporaryPath);
    }
    await atomicReplace(primaryPath, raw, temporaryPath);
    return { source: "primary", primaryPath, backupPath };
  }

  return {
    kind: "file",
    async read(validate = isSaveObject) {
      await writeQueue;
      return readNow(validate);
    },
    write(raw, validate = isSaveObject) {
      const operation = writeQueue.then(() => writeNow(raw, validate));
      writeQueue = operation.catch(() => undefined);
      return operation;
    },
    clear() {
      const operation = writeQueue.then(async () => {
        await Promise.all([
          fs.rm(primaryPath, { force: true }),
          fs.rm(backupPath, { force: true }),
          fs.rm(temporaryPath, { force: true }),
        ]);
      });
      writeQueue = operation.catch(() => undefined);
      return operation;
    },
    flush() {
      return writeQueue;
    },
    paths: {
      primary: primaryPath,
      backup: backupPath,
      temporary: temporaryPath,
    },
  };
}
