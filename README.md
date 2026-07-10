# 《太虚命盘》可玩 Demo

`xiuxian-simulator` / 修仙模拟器 Demo

一段约 10～15 分钟的浏览器纵向切片，验证“试命 → 带回 → 改命”的核心循环。

当前可体验内容：

- 唯一自建主角：姓名、称谓、外观印色、凡俗出身；
- 根骨、才性、因果三组随机先天词条，每组二选一，可整组重抽一次；
- 第一次模拟中的调查、关系、修炼与高风险试探；
- 晚宴毒杀、死亡因果回溯；
- 道行、确证、按行为生成词池的后天词条抽取；
- 三种不同的现实破局与“预知兑现”；
- 第二次模拟快速越过旧死法，抵达乌铜矿日核钩子；
- 本地自动存档、现实死亡重试、改选第一次结算。

## 启动

无需安装第三方依赖：

```bash
npm run serve
```

然后打开：

```text
http://127.0.0.1:8080/
```

如需固定随机结果，使用：

```text
http://127.0.0.1:8080/?seed=balance-42
```

## 验证

核心随机与结算池测试：

```bash
npm test
```

完整浏览器冒烟脚本位于 `scripts/cdp-smoke.mjs`，会验证道行、确证、词条三条结算路线。它需要一个开启远程调试端口的本地 Chrome：

```bash
google-chrome --headless --no-sandbox --remote-debugging-port=9225 \
  --user-data-dir=/tmp/taixu-demo-chrome \
  "http://127.0.0.1:8080/?seed=balance-42"

node scripts/cdp-smoke.mjs 9225
```

## 文件

- `web/index.html`：页面入口；
- `web/styles.css`：现实暖纸、模拟冷墨、死亡暗红、结算玄金四套视觉状态；
- `web/game-core.mjs`：可复现随机、开局词条与结算词池；
- `web/app.mjs`：场景状态机、存档与完整体验流程；
- `tests/core.test.mjs`：无依赖核心测试；
- `docs/GAME_DESIGN.md`：完整游戏设计。
