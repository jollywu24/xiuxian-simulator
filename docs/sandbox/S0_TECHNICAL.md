# S0 技术与迁移决策

范围 A07、T01。**S1 生产基线选择：纯规则 ES Modules＋结构化 JSON＋Canvas2D 场景＋DOM 界面，Tiled 对象层作为地图编辑输入。** Three.js 正交渲染保留为 S0 比较适配器，不同时维护第二套游戏规则。该选择可逆，必须在扩大地图／角色数量前通过目标硬件和内容制作复核。

选择依据是本次可运行纵切、共享原规则、可检查的数据边界和当前制作能力证据；不是仅因为旧仓库使用网页。优点是场景与规则可分离、确定性测试成本低、可快速校验2D内容；代价是场景编辑、动画、资源流送和桌面封装需要补齐，不能把浏览器样板直接称作AA客户端。

| 候选 | 已取得证据 | 本轮结论 |
| --- | --- | --- |
| Canvas2D＋DOM | 样板、实际浏览器交互、CPU提交采样、规则与数据测试 | 选为S1单一路线；GPU总帧时、内存与桌面包待目标机 |
| Three.js正交2D | 独立精灵适配器、WebGL不可用时回退 | 本环境禁止WebGL2，未取得GPU对照，不据此评价其性能高低 |
| Godot 2D | 官方2D与Web导出文档调研 | 编辑器和桌面能力值得候选，但本轮未运行迁移纵切；不编造性能和人日 |
| 继续完整3D | 旧分支已有3D世界 | 不符合本轮2D内容目标；仅抽取独立规则和已有适用资产 |

架构：catalog/schema → validateCatalog → createSession → inspectAction/applyCommand → state/events → renderer/UI；持久化适配器独立调用 exportSession/restoreSession。规则不读取DOM、网络或localStorage。玩家输入、AI与回放共享命令语义；表现事件不再触发一次规则结算。

| 原项目部分 | 决策 | 边界 |
| --- | --- | --- |
| character-system伤害与减伤 | 复用 | S0直接导入已有公式；正式整合前保留契约测试 |
| 固定因果、武境和术语 | 复用 | 同种子和命令给同结果；不通过读档重掷 |
| 世界时钟与存档架构 | 原则复用、S1适配 | S0刻数夹具不冒充旧档迁移器；旧主键不改 |
| 章节／剧情驱动的场景编排 | 分批重构 | 转为地图、角色、任务ID，旧内容逐包迁移，不整文件复制 |
| 原3D渲染／模型 | 保留旧版本 | 新2D内容不依赖3D世界，资源不强行转换 |
| 原UI／纸娃娃／资产工具 | 按功能评估复用 | 有许可或锚点不符的素材不默认转入新客户端 |

ID形式为类型前缀＋英文稳定键，例如 actor.chen-siming；显示名可改，ID不可跟着汉化文案变化。实体分为region、route、map、faction、actor、skill、item、quest、event、asset。定义数据与运行状态分离；外部记录恢复时地图碰撞、属性和技能归定义数据所有。schemaVersion显式升级，迁移不得静默丢弃人物和唯一物品。

目录包含44个实体，路线图全连通；地图相邻关系必须双向；任务必须有奖励键与人物缺席退路；资产必须存在。Schema检查结构，语义检查引用、出生点、生命策略和道路；WBS检查重复、缺失和循环依赖。Tiled仅支持orthogonal对象层的spawn、blocker、interaction、exit，未知类型拒绝导入。当前6个对象证明格式可导入，尚不是完整编辑器或运行时场景生产系统。

实测与限制：evidence/benchmark.json记录云浏览器7角色、额外96角色两档各180次CPU提交；2026-09-16日景中位数0.1／0.2ms、P95 0.1／0.3ms。同步提交不等待GPU，不得换算FPS；WebGL2不可创建。导入CPU时间由validate:s0输出，也不等于人类编辑效率。没有取得目标Windows硬件、第二名制作者或团队技能调查，因此A07的外部实测门仍未关闭。

目标机协议：分别记录OS、CPU、GPU、驱动、内存、分辨率、电源状态、构建版本；冷启动3次、暖机60秒，昼／夜／雨＋战斗＋96压力角色各连续120秒；记录rAF总帧时P50/P95/P99、超50ms帧占比、内存、首屏与切场景耗时、输入反馈、WebGL可用性；每种档位重复3轮。低档目标P95≤33.3ms，推荐档≤16.7ms，输入反馈≤100ms、交互加载目标≤3s，最终以目标机报告决定预算调整。CPU提交按钮不能替代该协议。

引擎重评触发：正确分层与批处理后仍不能达到目标帧时；地图／动画编辑持续依赖程序员；桌面包的输入、存档或分发形成不可接受阻断。触发时只迁移同一6图纵切，比较总制作与维护成本，不先迁移36张图。

第一方调研： [Godot 2D教程](https://docs.godotengine.org/en/stable/getting_started/first_2d_game/index.html)、[Godot Web导出](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)、[Canvas优化](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)、[Tiled JSON](https://doc.mapeditor.org/en/stable/reference/json-map-format/)、[Three.js](https://threejs.org/docs/)。
