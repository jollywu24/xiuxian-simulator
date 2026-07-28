# 《武道》项目导航

本文只负责回答“项目现在是什么、从哪里开始找、一次改动需要碰哪些位置”。具体规则不在这里重复维护。

## 当前产品

《武道》是纯高武世界的单人浏览器叙事 RPG。正式入口从大曜金陵东郊破庙开始，以文字和状态为核心，以 2D 场景、路线和人物／行囊／武学全屏界面增强代入。当前发布分支为 `main`，线上入口为：

- [正式游戏](https://jollywu24.github.io/xiuxian-simulator/)
- [战斗演武](https://jollywu24.github.io/xiuxian-simulator/combat.html)

已上线能力必须以 `web/` 入口和自动测试为准。路线图或效果图中的内容不能据此视为已经完成。

## 开发入口

```bash
npm run serve
npm test
npm run validate:content
npm run smoke
npm run smoke:combat
npm run test:browser
```

- `npm run serve`：只启动本地静态页面；
- `npm test`：纯规则、存档、资源与发布契约测试；
- `npm run validate:content`：剧情目录、节点和跳转校验；
- `npm run smoke`：自动启动静态服务器和无头浏览器，跑正篇完整流程；
- `npm run smoke:combat`：自动启动环境，跑独立战斗流程；
- `npm run test:browser`：连续执行两套浏览器回归，无需手动打开浏览器或指定调试端口。

若浏览器没有安装在常规路径，可通过 `CHROME_BIN` 指定 Chrome 或 Edge 可执行文件。

## 代码导航

| 要修改的内容 | 首要代码 | 对应测试／文档 |
| --- | --- | --- |
| 世界、人物、五维、破庙、沈家前段 | `web/wudao-core.mjs` | `tests/wudao.test.mjs`、`docs/STORY_BIBLE.md` |
| 三夫人至灵猴篇规则 | `web/wudao-p0-core.mjs`、`web/content/p0/` | `tests/p0-systems.test.mjs` |
| 曹青离场至白栀云授武 | `web/wudao-p1-core.mjs`、`web/content/p1/` | `tests/p1-systems.test.mjs` |
| 状态机、叙事栏和页面交互 | `web/wudao-app.mjs` | `scripts/cdp-smoke.mjs`、`docs/systems/07_INTERFACE_SAVE_QA.md` |
| 人物、装备和战斗派生值 | `web/character-system.mjs` | `tests/character-system.test.mjs`、`docs/systems/09_EQUIPMENT_COMBAT_FORMULA.md` |
| 武学目录、成长和携带 | `web/martial-system.mjs` | `tests/martial-system.test.mjs`、`docs/systems/02_CHARACTER_MARTIAL.md` |
| 通用战斗和遭遇 | `web/combat-engine.mjs`、`web/combat-encounters.mjs` | `tests/combat-engine.test.mjs`、`scripts/cdp-combat-lab.mjs` |
| 存档、备份和迁移 | `web/save-core.mjs`、`web/save-storage.mjs` | `tests/save-core.test.mjs`、`docs/SAVE_ARCHITECTURE.md` |
| 样式和响应式 | `web/styles.css` | 两套浏览器回归、`docs/systems/07_INTERFACE_SAVE_QA.md` |
| 发布与线上验证 | `.github/workflows/`、`scripts/run-browser-regression.mjs` | `tests/release-infrastructure.test.mjs` |

## 文档职责

| 文档 | 只负责 |
| --- | --- |
| `README.md` | 面向试玩者的产品介绍、链接和最短启动／验证方式 |
| `PROJECT_CONTEXT.md` | 开发导航、代码入口和文档索引 |
| `docs/GAME_DESIGN.md` | 产品体验、系统边界和设计目标 |
| `docs/STORY_BIBLE.md` | 人物、剧情顺序、揭示边界和连续性 |
| `docs/SYSTEM_ROADMAP.md` | 已完成、待制作、依赖和优先级 |
| `docs/systems/` | 单个系统的现行规则、接口和验收标准 |
| `docs/SAVE_ARCHITECTURE.md` | 存档格式、迁移、恢复和桌面边界 |
| `docs/DECISION_LOG.md` | 已确认设计或工程决策的原因与取舍 |
| `docs/CHANGELOG.md` | 已经交付的重要变更，不解释设计理由 |
| `GOAL.md` | 用户明确指定且尚在推进的一次性施工目标 |

## 测试与发布

`main` 推送后，Pages 工作流先调用统一验证工作流。规则测试、内容校验和两套自启动浏览器回归全部通过后才制作发布产物。发布时把当前短提交号写入 `index.html` 的 `data-build-sha`，部署完成后再从线上检查：

- 页面返回成功且构建号正确；
- 主样式、主模块和战斗入口可访问；
- 破庙场景、人物、行囊和武学关键资源可访问。

本地 `?debug=1` 入口会提供只读快照和受控状态替换接口 `window.WudaoDebug`，供浏览器回归使用；普通入口没有该对象。
