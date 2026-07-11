# 《太虚命盘》可玩 Demo

`xiuxian-simulator` / 修仙人生模拟 Roguelite

一段约 10～15 分钟的浏览器纵向切片。玩家围绕“晚宴投毒”提出试命命题，亲历未来并保留全部记忆，在“固命 / 化劫”之间选择一种人生写回方式，最终从受害者成长为灭口计划的新操作者。

> 把每次死亡炼成破局条件，最终亲手接管灭门因果。

## 手机在线试玩

[打开《太虚命盘》网页版](https://jollywu24.github.io/xiuxian-simulator/)

支持手机竖屏、触控操作和自动存档。GitHub Pages 会在 `main` 更新后自动重新发布。

## 当前 P0 验证什么

- 入盘前选择明确的试命命题，而非盲目调查；
- 模拟中的对话、时辰、人物行为和死亡过程自动保留；
- 见闻、推测、已验证事实与过期情报独立管理，不占结算名额；
- 结算仅在“固命此世所得”与“将此世之劫化为命痕”之间选择；
- 浅层模拟免费，命火用于把人生写回现实及建立不可逆锚点；
- 主动收束与死亡都有价值，死亡看得更深但增加心神负担；
- 命途条件板展示已见结果、当前缺口、代价与一条未完全揭示的高阶路线；
- 同一行动始终可以尝试，构筑决定能在危险里走多深；
- 晚宴事件按“受劫 → 识劫 → 避劫 → 破劫 → 借劫 → 驭劫”逐层掌控；
- 制度漏洞、单向前世关系、夺法与接管计划都在可玩流程中产生实际作用。

当前首版刻意不验证捏人、随机先天词条、完整战斗、天妒、复杂偏差、矿难和七年终局。它们属于完整设计，不属于 P0 的证明责任。

## 启动

无需安装第三方依赖：

```bash
npm run serve
```

然后打开：

```text
http://127.0.0.1:8080/
```

Windows 没有 `python3` 命令时可直接运行：

```powershell
python -m http.server 8080 --directory web
```

## 验证

核心规则测试：

```bash
npm test
```

或：

```bash
node --test tests/core.test.mjs
```

完整浏览器冒烟脚本位于 `scripts/cdp-smoke.mjs`。它验证两次试命、死亡复盘、固命、化劫、命途条件板、假死追凶、反向名单、锚点、存档以及桌面/移动端布局。

```bash
google-chrome --headless --no-sandbox --remote-debugging-port=9225 \
  --user-data-dir=/tmp/taixu-demo-chrome \
  "http://127.0.0.1:8080/"

node scripts/cdp-smoke.mjs 9225
```

## 文件

- `web/index.html`：页面入口；
- `web/styles.css`：现实、模拟、死亡、结算四套视觉状态及响应式界面；
- `web/game-core.mjs`：命题、见闻、命痕、行动深度与命途条件纯规则；
- `web/app.mjs`：P0 场景状态机、自动存档与完整可玩流程；
- `tests/core.test.mjs`：无依赖核心规则测试；
- `scripts/cdp-smoke.mjs`：真实浏览器完整流程测试；
- `docs/GAME_DESIGN.md`：统一后的完整产品设计与 P0 验收标准；
- `AGENTS.md`：后续代理协作与实现约束。
