# 容貌分层母版 v4

本管线修复 v3 把完整立绘伪装成捏脸选项的问题。`rig-v3` 的男女第一套形象是共同母版；本目录仅保存基于该母版生成、且只改变衣着的第二套色键源图。`scripts/build-appearance-rig-v4.py` 从共同母版确定性生成五官、发型、帽子、脸饰、后背与衣服的可切换发布层。

- 画布与锚点：运行资源统一为 `1024×1536`，头顶、脸中心、领口和肩线不得使用网页 CSS 单独校正。
- 来源：两张 `*-outfit-2-chroma.png` 由 OpenAI 图像生成工具在 `rig-v3/*-look-1-chroma.png` 上做身份保持编辑；提示词要求只改颈部以下衣装，并保持人物、姿势、光向和纯洋红背景。
- 许可：本项目自有生成资产，可随本项目公开分发；没有使用第三方游戏素材。
- 构建：`python scripts/build-appearance-rig-v4.py`（在 Codex 桌面环境中使用工作区依赖提供的 Python）。
- 输出：`web/assets/appearance/rig-v4/`；组合验收图为 `docs/assets/appearance-rig-v4-matrix.webp`。
- 人工验收：逐格检查头身比例、发际线、双眼、鼻口、下颌、领口、肩线、衣袖、背饰遮挡、透明边缘；任一组合错位时不得发布。
