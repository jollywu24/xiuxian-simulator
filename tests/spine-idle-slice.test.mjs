import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sliceRoot = path.join(repositoryRoot, "art_source", "appearance", "spine-v1", "export");
const skeletonPath = path.join(sliceRoot, "wuxia-idle.json");
const atlasPath = path.join(sliceRoot, "wuxia-idle.atlas");
const texturePath = path.join(sliceRoot, "wuxia-idle.png");

function pngDimensions(buffer) {
  assert.equal(buffer.toString("ascii", 1, 4), "PNG");
  assert.equal(buffer.toString("ascii", 12, 16), "IHDR");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test("Spine 待机纵切包含男女皮肤、统一骨架与静态降级所需资源", () => {
  for (const target of [skeletonPath, atlasPath, texturePath]) {
    assert.ok(fs.existsSync(target), `missing Spine slice asset: ${target}`);
    assert.ok(fs.statSync(target).size > 64, `empty Spine slice asset: ${target}`);
  }
  const skeleton = JSON.parse(fs.readFileSync(skeletonPath, "utf8"));
  assert.match(skeleton.skeleton.spine, /^4\.2\./);
  assert.deepEqual(skeleton.skins.map((skin) => skin.name), ["male", "female"]);
  assert.deepEqual(skeleton.slots.map((slot) => slot.name), ["body", "eyes-closed"]);
  assert.deepEqual(skeleton.bones.map((bone) => bone.name), [
    "root", "pelvis", "torso", "head", "hair-tip", "hem-left", "hem-right", "arm-left", "arm-right",
  ]);
  assert.deepEqual(pngDimensions(fs.readFileSync(texturePath)), { width: 2048, height: 1664 });
  assert.match(fs.readFileSync(atlasPath, "utf8"), /body_male[\s\S]*body_female[\s\S]*eyes_male_closed[\s\S]*eyes_female_closed/);
});

test("idle 动画同时提供非匀速眨眼、呼吸网格和衣摆骨骼时间轴", () => {
  const skeleton = JSON.parse(fs.readFileSync(skeletonPath, "utf8"));
  const idle = skeleton.animations.idle;
  assert.ok(idle);
  const blink = idle.slots["eyes-closed"].attachment;
  assert.deepEqual(blink.filter((frame) => frame.name === "closed").map((frame) => frame.time), [2.16, 4.91]);
  assert.notEqual(4.91 - 2.16, 2.16, "blink timings should not become a mechanical fixed interval");
  assert.deepEqual(Object.keys(idle.deform), ["male", "female"]);
  for (const skinName of ["male", "female"]) {
    const frames = idle.deform[skinName].body.body;
    assert.equal(frames.length, 5);
    assert.ok(frames.some((frame) => frame.vertices.some((value) => Math.abs(value) >= 2)), `${skinName} mesh does not visibly deform`);
  }
  assert.ok(idle.bones["hem-left"].rotate.some((frame) => Math.abs(frame.angle) >= 1));
  assert.ok(idle.bones["hem-right"].rotate.some((frame) => Math.abs(frame.angle) >= 1));
});

test("Spine 纵切不把官方商业运行时误提交进网页发布目录", () => {
  const published = fs.readdirSync(path.join(repositoryRoot, "web"), { recursive: true })
    .map(String)
    .filter((entry) => /spine-(player|webgl|core).*(js|css)$/i.test(entry));
  assert.deepEqual(published, []);
  assert.ok(fs.existsSync(path.join(repositoryRoot, "scripts", "build-spine-idle-slice.py")));
  assert.ok(fs.existsSync(path.join(repositoryRoot, "docs", "assets", "spine-idle-slice-v1.webp")));
  assert.ok(fs.existsSync(path.join(repositoryRoot, "docs", "assets", "spine-idle-motion-v1.webp")));
});
