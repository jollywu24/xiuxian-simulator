import { validateP0Content } from "../web/wudao-p0-core.mjs";
import { validateP1Content } from "../web/wudao-p1-core.mjs";

const p0 = validateP0Content();
const p1 = validateP1Content();
const errors = [
  ...p0.errors.map((error) => `既有篇章：${error}`),
  ...p1.errors.map((error) => `沈福篇章：${error}`),
];
if (errors.length) {
  for (const error of errors) process.stderr.write(`${error}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`内容校验通过：${p0.arcCount + p1.arcCount}个篇章，${p0.nodeCount + p1.nodeCount}个节点。\n`);
}
