import { validateP0Content } from "../web/wudao-p0-core.mjs";

const result = validateP0Content();
if (!result.ok) {
  for (const error of result.errors) process.stderr.write(`${error}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`P0内容校验通过：${result.arcCount}个篇章，${result.nodeCount}个节点。\n`);
}
