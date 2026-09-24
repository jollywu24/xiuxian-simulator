# 本轮 imagegen 候选（均未接入）

使用内置 image_gen；输入分别是用户上传的 `character5.png` 与现有 `stone-albedo-source-v1.png`。输出暂存于 `.tmp/godot-quality/rejected-imagegen/`，不覆盖权威源图。

## 南向攻击六帧

输出：`attack-s-strip-v2.png`。提示词：

> Use case: precise-object-edit. Asset type: transparent 2D runtime combat spritesheet, one horizontal strip for the SOUTH-facing hero only. Input Image 1 is the existing uploaded seven-row attack sheet and is the edit/reference target. Preserve the exact same young Chinese wuxia swordsman's identity, outfit (white-gray robe, dark blue-black skirt panels, long dark hair), proportions, black/gray pixel-painterly style, and the SOUTH-facing attack sequence from its fifth row. Produce exactly SIX full-body consecutive frames in ONE horizontal row: ready stance, sword raised, forward thrust, impact hold, recovery, ready stance. Each frame must be separated by a clearly transparent gap of at least 25 px. One complete swordsman and exactly one complete sword per cell; feet and weapon tips entirely inside their own cell. Keep consistent feet anchor and same body scale across all six. Genuinely transparent background. No text, no extra figures, no duplicate limbs, no detached sword pieces, no weapon crossing between cells.

拒收：虽有真透明背景及可见改进，但生成图不能证明同一rig动作来源，帧画幅、像素密度与其它方向也不统一；需回到可编辑母版制作正式动作。

## 石路平铺

输出：`stone-seam-v2.png`。提示词：

> Use case: precise-object-edit. Asset type: square albedo tile for the Godot HD-2D Jiangnan stone road. Input image 1 is the existing stone-paving albedo edit target. Preserve its muted cool gray-blue limestone palette, irregular broad paving stones and narrow earthen joints; refine only the tile edges and local stone variety. Produce a true seamlessly repeatable square texture: left edge must match right edge and top edge must match bottom edge pixel-for-pixel in content continuity so a 3x3 tiled preview shows no horizontal or vertical seam. Keep top-down orthographic view, flat diffuse albedo with no cast shadow, no perspective, no isolated centerpiece. Subtle nonperiodic stone wear; each stone readable at game scale. No plants, moss, text, borders, watermark or lighting baked into color.

拒收：实际边缘差异大于旧图，尤其上下边界；未替换运行材质。
