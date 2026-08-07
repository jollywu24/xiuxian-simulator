# 《武道》项目导航

本文只负责回答“项目现在是什么、从哪里开始找、一次改动需要碰哪些位置”。具体规则不在这里重复维护。

## 当前产品

《武道》是纯高武世界的单人浏览器叙事 RPG。正式入口从世家旁支、市井子弟、身世成谜三种来处之一开始，在大曜金陵东郊破庙汇流；游戏以文字和状态为核心，以 2D 场景、路线和人物／行囊／武学全屏界面增强代入。当前发布分支为 `main`，线上入口为：

- [正式游戏](https://jollywu24.github.io/xiuxian-simulator/)
- [战斗演武](https://jollywu24.github.io/xiuxian-simulator/combat.html)

已上线能力必须以 `web/` 入口和自动测试为准。路线图或效果图中的内容不能据此视为已经完成。

## 开发入口

```bash
npm run serve
npm run verify:quick
npm run verify
npm test
npm run validate:content
npm run test:release
npm run smoke
npm run smoke:origins
npm run smoke:combat
npm run test:browser
```

- `npm run serve`：只启动本地静态页面；
- `npm run verify:quick`：执行语法、规则、内容与发布资源检查，不启动三套长浏览器流程；
- `npm run verify`：执行语法、规则、内容、发布资源与三套自启动浏览器完整质量门禁；
- `npm test`：纯规则、存档、资源与发布契约测试；
- `npm run validate:content`：剧情目录、节点和跳转校验；
- `npm run test:release`：检查运行时资源、关键发布清单和统一缓存版本；
- `npm run smoke`：自动启动静态服务器和无头浏览器，跑正篇完整流程；
- `npm run smoke:origins`：跑世家旁支、市井子弟两条独立序章、沈家汇流、个人事件与手机横屏；
- `npm run smoke:combat`：自动启动环境，跑独立战斗流程；
- `npm run test:browser`：连续执行正篇、出身与战斗三套浏览器回归，无需手动打开浏览器或指定调试端口。

若浏览器没有安装在常规路径，可通过 `CHROME_BIN` 指定 Chrome 或 Edge 可执行文件。

## 代码导航

| 要修改的内容 | 首要代码 | 对应测试／文档 |
| --- | --- | --- |
| 世界、人物、五维、破庙、沈家前段 | `web/wudao-core.mjs` | `tests/wudao.test.mjs`、`docs/STORY_BIBLE.md` |
| 三出身、独立序章与旧ID迁移 | `web/origin-core.mjs` | `tests/origin-system.test.mjs`、`scripts/cdp-origins.mjs`、`docs/systems/11_ORIGIN_PROLOGUES.md` |
| 出身卡与容貌页环境美术 | `art_source/creation-v1/`、`scripts/build-creation-art-v1.py`、`web/assets/creation-v1/` | `tests/creation-art.test.mjs`、`docs/assets/creation-art-v1-sheet.webp` |
| 三夫人至灵猴篇规则 | `web/wudao-p0-core.mjs`、`web/content/p0/` | `tests/p0-systems.test.mjs` |
| 曹青离场至白栀云授武 | `web/wudao-p1-core.mjs`、`web/content/p1/` | `tests/p1-systems.test.mjs` |
| 状态机、叙事栏和页面交互 | `web/wudao-app.mjs` | `scripts/cdp-smoke.mjs`、`docs/systems/07_INTERFACE_SAVE_QA.md` |
| 十一类容貌状态、同母版分层部件、旧档回落与Canvas合成 | `web/appearance-core.mjs`、`web/paperdoll-system.mjs`、`web/paperdoll-renderer.mjs`、`scripts/build-appearance-rig-v4.py` | `tests/appearance-system.test.mjs`、`tests/paperdoll-system.test.mjs`、`scripts/cdp-appearance.mjs`、`docs/systems/12_APPEARANCE_RIG.md` |
| Spine待机动态预制、男女皮肤、统一骨架与动画授权门禁 | `art_source/appearance/spine-v1/`、`scripts/build-spine-idle-slice.py` | `tests/spine-idle-slice.test.mjs`、`docs/assets/spine-idle-slice-v1.webp`、`docs/assets/spine-idle-motion-v1.webp`、`docs/systems/12_APPEARANCE_RIG.md` |
| 人物、装备和战斗派生值 | `web/character-system.mjs` | `tests/character-system.test.mjs`、`docs/systems/09_EQUIPMENT_COMBAT_FORMULA.md` |
| 武学目录、成长和携带 | `web/martial-system.mjs` | `tests/martial-system.test.mjs`、`docs/systems/02_CHARACTER_MARTIAL.md` |
| 通用战斗和遭遇 | `web/combat-engine.mjs`、`web/combat-encounters.mjs` | `tests/combat-engine.test.mjs`、`scripts/cdp-combat-lab.mjs` |
| 存档、备份和迁移 | `web/save-core.mjs`、`web/save-storage.mjs` | `tests/save-core.test.mjs`、`docs/SAVE_ARCHITECTURE.md` |
| 样式和响应式 | `web/styles.css` | 三套浏览器回归、`docs/systems/07_INTERFACE_SAVE_QA.md` |
| 确认效果图还原 | 对应页面、样式与正式资源 | `docs/VISUAL_IMPLEMENTATION.md`、对应系统文档与浏览器截图回归 |
| 测试与浏览器回归 | `scripts/run-quality-gate.mjs`、`scripts/run-browser-regression.mjs` | `docs/TESTING.md` |
| 调试状态协议 | `web/wudao-app.mjs` | `docs/DEBUGGING.md`、`tests/release-infrastructure.test.mjs` |
| 发布与线上验证 | `.github/workflows/`、`scripts/release-contract.mjs`、`scripts/smoke-deployed.mjs` | `docs/RELEASE.md` |

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
| `docs/TESTING.md` | 自动化测试层级、自启动浏览器回归、覆盖矩阵和失败定位 |
| `docs/DEBUGGING.md` | `WudaoDebug`协议、只读状态、受控命令和诊断边界 |
| `docs/RELEASE.md` | Pages质量门禁、资源契约、构建标识和部署后线上冒烟 |
| `docs/VISUAL_IMPLEMENTATION.md` | 效果图冻结、量取、灰盒、资源、叠图、视口与视觉验收流程 |
| `docs/DECISION_LOG.md` | 已确认设计或工程决策的原因与取舍 |
| `docs/CHANGELOG.md` | 已经交付的重要变更，不解释设计理由 |
| `GOAL.md` | 用户明确指定且尚在推进的一次性施工目标 |

## 测试、调试与发布

- 完整本地与CI质量门禁：[`docs/TESTING.md`](docs/TESTING.md)；
- `?debug=1`状态协议：[`docs/DEBUGGING.md`](docs/DEBUGGING.md)；
- Pages资源契约、构建标识与部署后HTTP／真实浏览器冒烟：[`docs/RELEASE.md`](docs/RELEASE.md)。

三份文档各自维护事实源；本导航不复制命令细节、接口字段或发布资源清单。
