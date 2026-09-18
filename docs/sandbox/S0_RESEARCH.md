# S0：采用依据与评估边界

核对日期：2026-09-16。用户授权：按《武侠沙盒转型工作分解》完成 S0；此阶段包含 A01—A08、B01、T01、V01 共 11 项。生产路线的最终决定与实测记录见 `S0_TECHNICAL.md` 和 `S0_ACCEPTANCE.md`。

## 当前问题

已有项目提供武学、关系、固定因果、伤势、存档及局部探索；流程仍主要依附剧情画面。S0 需要先证明可操控四人队伍、空间行动、2D 表现与通用数据能够共存，再进入 S1 单镇制作。

## 第一方参考

| 来源 | 采用的结构 | 不直接采用／验证边界 |
| --- | --- | --- |
| [大侠立志传开发者介绍](https://store.steampowered.com/app/1948980/?l=tchinese) | 自由行动、关系改变服务、多路线事件 | 不复制其人物、数值或地图；不一次承诺所有 NPC 可杀 |
| [烟雨江湖开发者介绍](https://www.taptap.cn/app/169054/all-info) | 地区探索、门派成长、生活能力参与任务 | 不引入联网 PvP、日常打卡和内购进度墙 |
| [逸剑风云决开发者介绍](https://store.steampowered.com/app/1876890/Wandering_Sword/?l=schinese) | 队伍、人物演出、场景层次 | 其画面融合像素与 3D；本轮不同时量产即时和回合两套战斗 |
| [Three.js 官方文档](https://threejs.org/docs/) | 正交相机、平面与精灵、GPU 图层合成 | 只评估固定视角 2D；复用现有 MIT 运行时不代表直接沿用旧 3D 世界 |
| [MDN Canvas 优化](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) | 静态层缓存、像素比限制、减少每帧重复工作 | Canvas2D 与 WebGL 使用相同负载进行局部比较；不推广为引擎行业跑分 |
| [Tiled JSON 地图格式](https://doc.mapeditor.org/en/stable/reference/json-map-format/) | 对象层、稳定属性、地图与运行状态分离 | S0 只实现所需对象层子集，未知对象类型直接拒绝 |
| [Godot 2D 官方入门](https://docs.godotengine.org/en/stable/getting_started/first_2d_game/index.html) | 作为完整 2D 编辑器路线的候选 | 本轮未运行 Godot，不虚构其性能、迁移耗时或团队熟练度 |
| [Godot Web 导出说明](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html) | 评估 WebAssembly、WebGL2、脚本语言和导出限制 | 4.x C# Web 导出与现有浏览器规则复用存在边界；不声称可直接迁移 JS |

## 实施约束

- 先制作一个场地；共享原 `character-system.mjs` 的伤害区间、档位与减伤函数，避免并行伤害公式。
- 灰盒比较网格与稀疏节点空间，比较后只确定一套首发空间规则；比较开关仅存在于研发工作台。
- 定标页面由脚本生成到 `.tmp/sandbox-s0/`，不进入 `web/` 发布根；永久保留源代码、数据、生成脚本及必要的验收证据。
- 图像生成只生产一张原创场地底图；地面坐标、角色运动、交互、网格、天气和效果由实际运行逻辑驱动。角色运动样板不冒充首发完整动作集。
- 初步比较 Three.js 固定正交 2D 与 Canvas2D；实际测试的环境、视口、负载、采样方法和局限全部入档。
- 既有网页与旧存档不切换到研发工作台。迁移实施属于后续阶段，S0 交付迁移决定和边界。
- 官方运行时以仓库已固定的版本和许可证为准；不引入未完成授权验证的 Spine 运行时。
