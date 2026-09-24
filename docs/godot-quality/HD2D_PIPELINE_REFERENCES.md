# GitHub 管线核查与当前修订

> 2026-09-24：本文后续是旧管线研究与诊断记录。当前生产要求见 EXECUTION_PLAN v2 / CHARACTER_PRODUCTION_STANDARD v3；同rig、逐帧AI均不再强制，按连续小样质量选择。固定画布、采样、来源诚实与引擎验证经验仍有效。

核查日期：2026-09-22–23。用户反馈人物「糊成一团」，明确要求研究后继续；这是 r3 拒收后的修订方向，不解除 G2 门禁。

## 实际参考及取舍

| 一手仓库 / 文件 | 能借鉴什么 | 本项目取舍 |
| --- | --- | --- |
| [Blender-Spritesheet-Renderer](https://github.com/chrishayesmu/Blender-Spritesheet-Renderer)，README、render_operator.py | 同一母版动作、旋转方向、固定动画画幅、JSON 元数据、独立材质输出 | 保留已有 rig 和脚点；不逐帧自动裁切。仓库声明仅测试 Blender 2.9，不直接安装到 5.2；MIT，未复制代码或资产。 |
| [PixelArtPipeline](https://github.com/workavast/PixelArtPipeline) | 3D 动画转 sprite，颜色与法线输出思路 | Unity 管线参考，不是商业游戏官方源代码；不移植 Unity，不把法线图当自动像素精修。未引入第三方资产。 |
| [HD2D-template / HD2D.gd](https://github.com/Meowa-AI/HD2D-template-meowa/blob/main/scripts/HD2D.gd) | Sprite3D 最近邻、脚底定位、透明裁切 | 示例默认 shaded=false 且 Y billboard，不能直接照搬到必须受光、预渲染斜俯视的角色。本项目仍 shaded=true。 |
| [Field.gd](https://github.com/Meowa-AI/HD2D-template-meowa/blob/main/scripts/Field.gd)、[HD2DEnvironment.gd](https://github.com/Meowa-AI/HD2D-template-meowa/blob/main/scripts/HD2DEnvironment.gd)、[HD2DStage.gd](https://github.com/Meowa-AI/HD2D-template-meowa/blob/main/scripts/HD2DStage.gd) | 摄像机目标与偏移分离；主光、环境补光分开管理 | 不复制其场景、云、草、Glow、SSAO 和风格标签。本阶段关闭 DOF/Glow；不把 README 的商业游戏风格描述当真实参数证据。许可未全审，不复制资产。 |
| [Godot 纹理导入源码](https://github.com/godotengine/godot/blob/master/editor/import/resource_importer_texture.cpp) 与 [官方导入文档](https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_images.html) | 3D 自动检测会改成 VRAM 压缩并启用 mipmaps；0 为 lossless，detect_3d=0 关闭检测回调 | idle 已实际被转成 S3TC；walk/thrust 尚未转换但检测开关仍开。现在三者统一无损、禁自动转换、基准关闭 mipmaps。最近邻单独设置不能防压缩损坏。 |

这些是架构/管线参考，不是已达到参考作品美术质量的证明。未运行下载来的插件，也未调用其云服务。链接为可变分支，未声称锁定第三方 commit 或已完成分发许可审查。

## 本地诊断与已经实施的修正

- 先锁定 idle_s 第 0 帧，保存同机位、同灯光、同图集的 `evidence/p2-sampling-before.png` 与 `p2-sampling-lossless.png`。仅消除压缩损伤，造型仍然不好看。
- 调色板之前把透明 RGB 黑色和空白区域算进 40 色统计；改为仅统计 alpha≥128 的可见像素。仍不是手工色簇精修。
- `pixel-patches.json` 不再每次打包被清空；支持按 action/direction/frame 重放稀疏 RGBA 修补。现有空 patches 仍如实保留未精修状态。
- 离线 walk GIF 改为使用最终量化帧，不再展示未量化中间图误导验收。
- r4 修改既有 .blend 的袖口宽度、衣摆亮边、眼白碎亮点和高光；同一骨架、同一动作，无母版重生成。保留 r3 母版用于回退对照。

## 镜头与受光校准结论

当前运行镜头 (8,17,24) 看向 (-4,0,0)，俯角约 32.35°；源渲染相对水平约 42°。这不是同一投影条件，仍需带地平面/脚点校准；不把示例约 20° 摄像机照搬进本工程。先完成采样隔离对照，再评估机位，否则无法归因。

渲染端已有烘入颜色的工作室明暗，运行端又做光照：需要检查明暗是否叠加洗白。不能简单设置 unshaded 来逃过日光→檐下受光验收。后续应在同母版做底色/法线配对试片，再决定是否引入角色专用材质；目前没有输出真实法线图，不能宣称已采用该管线。

当前仍需修正肩袖连续性、脸部像素簇、出剑和走路姿态；源资产问题不能用改镜头、锐化、泛光、景深解决。G2 维持拒收；P3 不放行。
