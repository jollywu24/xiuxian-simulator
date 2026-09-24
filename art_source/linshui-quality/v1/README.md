# 权威源资产 — P2 未验收

- `characters/hero/hero-v1.blend`：唯一主角母版，具同一骨架、idle/walk/thrust Action、分件身体／脸／发／衣摆／腰带／剑鞘。已修订至 r3。
- `environment/tea-house/tea-house-v1.blend`：墙体、屋顶、正面门窗、基础四个 Collection；独立瓦、椽、梁、门窗可编辑。
- `environment/pavement/pavement-v1.blend`：2 m 地块母版。当前只导出一个变体，四变体和路沿未完成。
- `references/`：内置 imagegen 技能实际生成的造型／结构导引，仅供参考，不能裁切作运行资产。
- `textures/`：实际生成底色母版、规则与 3×3 检查图。数据法线目前明确为平面法线，ORM 按规则生成；未冒充从彩色图推导的浮雕。
- `asset-manifest.json`：46 工作项的实际状态，不把预计文件路径算作交付。
- `generation-records.json`：来源与生成记录；未用新付费 API，模型版本／请求 ID 未由工具公开的字段保持 null。

字符帧：160×128、脚点(80,112)、40色共同调色板、S/SE 两方向、48帧槽。武器尖端从实际 rig 变形网格投影导出。
`pixel-patches.json` 的精修状态仍未通过，量化与尺寸达标不代表像素美术合格。GIF 标有 offline，仅用于动作预览，不是实机录屏或性能证据。

构建入口（从仓库根目录，Python/Blender 路径见 toolchain-lock）：

```text
python scripts/godot-quality/build_assets.py --stage p2 --changed
blender --background --python scripts/godot-quality/render_sprites.py
blender --background --python scripts/godot-quality/extract_sprite_anchors.py
python scripts/godot-quality/pack_atlases.py
python scripts/godot-quality/validate_assets.py --stage p2
```

生成器 make_* 只负责首次创建，发现已有母版会拒绝覆盖；后续从同一个 .blend 定点修改。r3 后继续制作须先完成评审。
运行 PNG/GLB 位于 `godot/linshui-quality/assets`，不进入 web/，不参与 Pages。
本机 `.blend1` 是 Blender 自动生成的临时保存备份，不是另一套获准母版；未清理既有用户资源。

许可：几何和代码为本任务原创；生成图片保留来源记录；用户参考图仅作本地参考。当前未完成公开分发审查，不宣称生成图的独占版权，不混入商用字体或第三方游戏资产。
资源体积超过网页预算时本任务采用原生桌面验证，未修改网页预算／发布契约。当前 assets 子树约 26.6 MiB（含导入元数据），包含重复内嵌材质的 GLB；正式阶段还需去重、灰瓦材质与显存实测，不能据此声称性能达标。
