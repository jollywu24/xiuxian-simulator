# 独立 Windows Forward+ 质量样板

仅本工程：1920×1080、GDScript、固定镜头、2D 图集人物与 GLB 环境。
不修改 web、旧 tests、旧存档、Pages。不得用后处理或占位件放行 G2。

2026-09-24 起按 EXECUTION_PLAN v2 与 CHARACTER_PRODUCTION_STANDARD v3：角色不限定制作方式，先验证连续动画小样再选管线，不强制逐帧生成或同rig。被拒纸偶不得默认恢复。P1构图、P2画面与动作分别需要用户实际确认。composition-review.tscn 是独立灰盒验证入口，不是正式美术；原 main.tscn 保留，完整场景通过验收再切换。

最新用户纠偏：HD-2D角色最终以完整二维人物图为美术源。当前主路线为独立PNG帧、Godot SpriteFrames/AnimatedSprite3D；三维低模修订仅作失败历史，不能继续将其精修当成角色完成。256×256/脚锚(128,220)是已实测候选，待全套攻击边界与资源成本验证后冻结。见 docs/godot-quality/CHARACTER_FORMAT_DECISION.md。
