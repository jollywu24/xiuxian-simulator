# 系统制作文档索引

总优先级、依赖和剧情里程碑见 [《大曜江湖》完整游戏系统路线图](../SYSTEM_ROADMAP.md)。

| 编号 | 文档 | 负责范围 |
| --- | --- | --- |
| SYS-01 | [叙事事件与奇遇条件](01_NARRATIVE_ENCOUNTER.md) | 事件、条件、效果、情报和回照 |
| SYS-02 | [人物成长与武学](02_CHARACTER_MARTIAL.md) | 属性、境界、武学、修炼和突破 |
| SYS-03 | [战斗、伤势与死亡](03_COMBAT_INJURY_DEATH.md) | 回合、意图、伤势、毒和命灯 |
| SYS-04 | [医术、炼丹、毒术、物品与经济](04_MEDICINE_CRAFTING_ECONOMY.md) | 病例、配方、库存、品质和交易 |
| SYS-05 | [人物关系、势力与身份](05_RELATIONSHIP_FACTION.md) | 信任、债务、秘密、声望和权限 |
| SYS-06 | [世界、时间、旅行与调查](06_WORLD_TIME_INVESTIGATION.md) | 日历、地图、窗口、证据和潜入 |
| SYS-07 | [界面、存档、无障碍与质量保障](07_INTERFACE_SAVE_QA.md) | 组件、迁移、手机体验和回归测试 |
| SYS-08 | [内容生产与自动校验](08_CONTENT_PIPELINE.md) | 内容包、校验器、分支巡检和发布门禁 |

系统文档共同遵守：

- `AGENTS.md`的纯高武、单人叙事边界；
- `STORY_BIBLE.md`的剧情顺序和揭示规则；
- `GAME_DESIGN.md`的玩家体验与界面规则；
- `SYSTEM_ROADMAP.md`的依赖和优先级。

具体实现与文档冲突时，先确认剧情基线是否变化，再同步修改规则、状态、测试和文档。
