import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");

function webpDimensions(buffer) {
  assert.equal(buffer.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(buffer.subarray(8, 12).toString("ascii"), "WEBP");
  const chunk = buffer.subarray(12, 16).toString("ascii");
  if (chunk === "VP8X") {
    return {
      width: 1 + buffer[24] + (buffer[25] << 8) + (buffer[26] << 16),
      height: 1 + buffer[27] + (buffer[28] << 8) + (buffer[29] << 16),
    };
  }
  if (chunk === "VP8 ") {
    const start = 20;
    for (let index = start; index < buffer.length - 9; index += 1) {
      if (buffer[index] === 0x9d && buffer[index + 1] === 0x01 && buffer[index + 2] === 0x2a) {
        return {
          width: buffer.readUInt16LE(index + 3) & 0x3fff,
          height: buffer.readUInt16LE(index + 5) & 0x3fff,
        };
      }
    }
  }
  throw new Error(`Unsupported WebP chunk: ${chunk}`);
}

test("character creation art exposes the approved three-card and grounded-courtyard contract", () => {
  const assets = new Map([
    ["origin-shen-branch-v1.webp", { width: 720, height: 960 }],
    ["origin-streetborn-v1.webp", { width: 720, height: 960 }],
    ["origin-mystery-v1.webp", { width: 720, height: 960 }],
    ["appearance-jiangnan-v1.webp", { width: 1672, height: 941 }],
  ]);
  for (const [name, dimensions] of assets) {
    const target = path.join(root, "web", "assets", "creation-v1", name);
    assert.ok(fs.existsSync(target), `missing creation asset: ${name}`);
    assert.ok(fs.statSync(target).size > 64_000, `unexpectedly small creation asset: ${name}`);
    assert.deepEqual(webpDimensions(fs.readFileSync(target)), dimensions);
  }
  assert.ok(fs.existsSync(path.join(root, "scripts", "build-creation-art-v1.py")));
  assert.ok(fs.existsSync(path.join(root, "docs", "assets", "creation-art-v1-sheet.webp")));
});
