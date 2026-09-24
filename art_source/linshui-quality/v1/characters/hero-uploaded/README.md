# 用户上传主角资源：试接入，未验收

权威上传文件仍保存在 `godot/linshui-quality/assets/characters/hero/character1.png` 至 `character5.png`；不移动、覆盖或删除。来源为用户本次上传，原作者/许可、是否有对应 rig 未验证，不作公开分发。

当前默认入口 main.tscn 已引用 `godot/linshui-quality/scenes/validation/uploaded-hero-review.tscn`。F5 或打开该场景按 F6；WASD 移动，Shift 跑步，Space 测试攻击。图集序列保存进场景，编辑器预览同样显示新角色。旧 quality-fixture 仅保留为旧母版对照。默认使用有光照、最近邻、无损导入的真实 Sprite3D。

图2：887×1774，4列8行待机；图3/4：1086×1448，6列8行行走/跑步；图5：同尺寸但只有7行有效攻击，底部留白。方向按 N/NE/E/SE/S/SW/W/NW 推定，须逐帧复核。攻击图安全切片行起点为 0/180/370/560/750/940/1135，各帧190px高；以前按8行等分导致上下分裂，现已修复。X方向仍有剑尖横向跨格，不能靠整体切片间距解决。攻击 NW 明确禁用，不镜像。

实机证据：`docs/godot-quality/evidence/uploaded-*.png`、`uploaded-hero-review.json`。静态形象明显改善，但攻击出现邻格剑尖残片；还未验收连续滑步、所有帧轮廓、半透明边、动态遮挡和持续性能。

`attack-repair-v1.png` 是内置 image_gen 定向编辑结果，不是上传原图。实际提示词见 `attack-repair-prompt-v1.txt`。目标是同身份、同7方向6帧、统一直剑、完整格间留白。实际视觉复核：仍有跨格武器和方向漂移，拒收，未接入运行时。不能将图像输出当作同 rig 动作来源证明。

按用户要求再次使用内置 image_gen 修复越格：v2 全图保守编辑、v3 单帧剑尖窄改均实测失败。候选与完整提示词见 `attack-repair-v2.png`、`attack-repair-v3.png`、`attack-repair-prompts-v2-v3.md`；Godot Forward+ 复拍在 `docs/godot-quality/evidence/attack-repair-v2-review/` 与 `attack-repair-v3-review/`。未替换 `character5.png` 或默认场景图集。

下一项具体工作：以同一身份按方向分拆攻击关键帧编辑，验证每帧完整边界、持剑手和面向；完成后再组装固定画幅图集。G2 仍未通过。
