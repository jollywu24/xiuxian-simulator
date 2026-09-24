# 内置 image_gen 攻击越格修复记录（2026-09-23）

编辑目标：用户上传的 `godot/linshui-quality/assets/characters/hero/character5.png`。两次均使用内置 image_gen 的 `precise-object-edit`，保留透明 PNG，未覆盖原图。

## v2 完整图集保守修复

输出：`attack-repair-v2.png`。

> Use case: precise-object-edit. Asset type: 2D game attack sprite sheet. Image 1 is the edit target, the original 1086×1448 transparent PNG. Make a CONSERVATIVE repair of this exact image, not a redesign or a new animation. Preserve the exact seven directional rows, six attack poses in each row, every character's identity, facing, clothing, body proportions, pose, foot placement, and existing column/row layout. Edit only the swords that intrude into an adjacent frame: shorten/reposition each offending blade tip within its OWN pose's cell and remove orphaned blade-tip fragments from neighboring cells. Every sword must remain visually connected to its own wielder's hand, with exactly one blade per pose. Leave the main character pixels, all other swords, and the transparent background unchanged as closely as possible. Output a genuinely transparent RGBA PNG with the same overall aspect ratio and no text, grid, border, shadow, blur or new objects. Critical: the six vertical frame boundaries correspond to x≈0,181,362,543,724,905,1086; seven row origins ≈0,180,370,560,750,940,1135 with 190px height. No opaque sword pixel from one pose may enter another cell.

引擎复拍：`docs/godot-quality/evidence/attack-repair-v2-review/`。南向第5帧仍有游离剑尖，下半身遭切断，并在茶铺前出现黑色碎块；拒收。

## v3 单个游离剑尖窄范围修复

输出：`attack-repair-v3.png`。

> Use case: precise-object-edit. Edit target: Image 1, the existing transparent 1086×1448 attack atlas. This is a surgical in-place retouch, NOT regeneration, restyling, re-layout or resizing. Preserve all existing pixels and positions except for ONE error: in the SOUTH-facing row (fifth row, y about 750–940), the fifth frame (x about 724–905) has a short disconnected sword-tip sliver near its LEFT edge, inherited from the previous frame. Remove ONLY that orphan sliver, leaving the fifth frame's character, its one correctly held sword, every other frame, and all transparent gaps unchanged. Output the same 1086×1448 RGBA canvas with genuine transparency. Absolutely no changes to character scale, pose, feet, hair, face, clothes, frame spacing, row alignment, other swords or background. No added shapes, text, shadows or blur.

引擎复拍：`docs/godot-quality/evidence/attack-repair-v3-review/`。原图与候选差异覆盖 `(0,15)-(1086,1448)`，不透明像素数 386464→475505，远非只改一个剑尖；南向第5帧仍有游离剑尖与截断；拒收。

结论：内置图像编辑能生成完整透明图，但在这张密集42格图集上未能稳定保持坐标。三次同类修订（v1、v2、v3）均未满足源图／运行时质量验收。权威上传文件与默认运行时未改变；若继续精确消除跨格，应取得逐帧像素编辑或可编辑角色动画母版的明确制作路径，不能把失败图当正式资产。
