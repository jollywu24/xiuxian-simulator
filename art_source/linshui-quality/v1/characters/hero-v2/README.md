# 叶无尘 v2 重做源资产

## 当前生产口径（2026-09-24）

最新：用户明确要求以**二维完整人物图**为美术源，并先生成整组再修坏帧。`2d-batch-v1/`现有S步行8张、SE直刺12张完整人物源图及3张定向第二稿；连同既有S/SE待机各4张，统一采样为28张独立256×256候选PNG，脚锚(128,220)。来源哈希和边界在 `2d-batch-v1/frame-contract.json`，提示词在 `2d-batch-v1/generation-record.md`，实机缺陷与技术检查见 `docs/godot-quality/review/p2-2d-batch-v1.md`。动作艺术尚未通过，P2另缺SE步行8张和S直刺12张。旧 `2d-png-256-v1/` 与 `2d-motion-review-v1/` 仅作静止/5帧历史诊断。`hero-v2.blend`及`style-gate-v2/`只保留失败三维路线对照，不是当前人物源。

历史：曾选择可控骨骼路线，`hero-v2.blend`保留当时的可编辑母版，`style-gate-v2/hero-before-style-gate.blend`保留修订前状态。`scripts/godot-quality/refine_hero_style_gate.py`、`package_style_gate.py`和`docs/godot-quality/review/style-gate-v2.md`记录该试验及拒收；用户之后已改选以完整二维画作为主线，不能将这份三维母版当成现行角色美术母版。

以下旧母版说明保留为历史。当前以 `docs/godot-quality/CHARACTER_PRODUCTION_STANDARD.md` v3 为准：用户已解除“必须逐帧生成”和“必须同rig渲染”，被拒的 `hero-v2-puppet.blend` 不恢复使用。

`generated-frames/` 有未验收的整体人物AI候选；`review-normalized/` 是固定采样预览，不能宣称逐帧已精修。`review-normalized/s/idle/01.png` 的精确副本曾作P1静止试片。当前批量帧也只是候选，不是正式验收图集或用户已批准造型；先逐问题修订和实机复测。部分更早历史帧的精确提示词仍缺失，须在清单中如实标识。

## 历史：2026-09-23 同rig尝试（已拒收，约束已被取代）

2026-09-23 用户授权停止修补上传图，新建此角色权威母版。旧 `hero/`、`hero-uploaded/` 和 Godot 现用图集不覆盖、不删除；此目录尚未通过 G2，不是正式运行资产。

| 文件 | 来源与用途 |
| --- | --- |
| `turnaround-guide-v2.png` | 内置 image_gen 根据用户上传造型重新绘制的四视图；只作身份和服装参考；提示词见同名 `*-prompt-v2.txt` |
| `idle-s-style-target-v2.png` | 内置 image_gen 根据四视图和 v2 rig 首帧生成的风格目标；不是帧源，不能裁入图集；提示词见同名 `*-prompt-v2.txt` |
| `hero-v2.blend` | Blender 5.2.1 创建的同一可编辑模型／rig／idle、walk、thrust 动作；由 `scripts/godot-quality/make_hero_v2.py` 起建，再运行 `revise_hero_v2_camera.py`、`revise_hero_v2_silhouette.py`、`revise_hero_v2_thrust.py`、`revise_hero_v2_foot_anchor.py` 定向演进 |
| `master-preview-v2*.png` | 各次真实 Blender 渲染；r1相机足点不准，r2初次校准，r3造型修订，r4再次校准脚点。不是 Godot 截图 |
| `review-frames/` | 同一母版 S/SE 的 idle、walk、thrust 共14个抽样源帧，由 `render_hero_v2_contact.py` 导出；不冒充48帧正式交付 |
| `render-profile.json` | 固定镜头、帧、脚锚、方向、动作合同；当前状态明确拒收 |
| `generation-record.json` | 生成方式、脚本顺序、关键源哈希与拒收结论 |

v2 首帧固定640×512 RGBA渲染到160×128逻辑格，r4 身体高度约80.75px，足点 y≈112.25，目标 y=112。640图是可复核的高分辨率源，`master-preview-v2-native.png` 仅作 r3 正常尺度检查。所有方向共用正交相机，方向由 `RenderDirection` 转动。`audit_hero_v2.py` 可只读复核部件／rig／镜头合同。

目前视觉缺陷：与四视图／风格目标相比，母版衣料、脸、发和剑仍明显简化；S/SE 直刺的剑姿不能读成清晰前刺；步行未做连续引擎检查。因此未导出48帧候选图集，未接入 Godot，不放行 G2。修订须继续改变本 `hero-v2.blend`，并保留失败证据；不得通过简单缩放单帧 imagegen 结果、剪旧上传图或运行时补丁掩盖。

生成式素材由 OpenAI image_gen 生成，作为本项目内部制作参考；用户上传图仅作为角色身份参考。未取得单独发布授权／许可审查前不公开分发。正式运行图集还需同母版导出、像素修订及逐帧／引擎验收。Blender 源、提示词和渲染过程可复核，AI 图本身不证明同rig。
