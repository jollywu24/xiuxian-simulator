# P2 完整二维帧动作诊断（2026-09-24）

状态：**未通过**，不进入默认 `main.tscn` 或正式角色资产。既有二维源图中只有 S 待机4张、SE待机4张、S步行5张、SE直刺第7关键姿势1张。P2要求的 S 步行8张与 SE直刺12张均不齐，不能复制、镜像或补空槽报满。

`package_2d_motion_review.py` 将已有160×128完整人物图以统一(48,108)平移放入256×256独立PNG，脚锚(128,220)，无逐帧缩放、bbox重心修正或身体部件拼接；合同见 `art_source/linshui-quality/v1/characters/hero-v2/2d-motion-review-v1/frame-contract.json`。14张已打包图均通过4px边距技术检查。

Godot `composition-refined.tscn` 的独立诊断模式用真正的 `SpriteFrames`/`AnimatedSprite3D` 播放5张S步行候选。F3可播放/停止，F4切换S/SE静止图。1080p和720p Forward+实机每帧截图及报告见 `evidence/p2-character-2d-motion-v1-*`，本机为RTX5060。5帧的角色世界位置、`pixel_size=0.022`、`offset=(0,92)`、`scale=(1,1,1)`一致；技术接入通过，不等于动作通过。原尺寸观察帧间腿部/身体姿势变化较弱，缺少足够明确的接触—经过—离地循环；短5帧循环末尾会直接跳回开头。现有静态截图不是90秒连续录屏。

本轮用内置 image_gen 以 `generated-frames/s/idle/01.png` 为编辑目标制作一张S步行经过姿势，保存在 `2d-motion-review-v1/s-walk-passing-imagegen-rejected.png`，SHA256 `AB696A3E449E426E2FC3805EDAB5F136AD92FF8853451185E2A248368456784F`。原图和新图均为1402×1122 RGBA；按alpha≥128测得可见包围盒分别为(415,153,875,1041)和(408,147,871,1059)，身体可见高度888→912源像素，约+2.7%，足底降低18源像素。它有更明确的经过姿势，但在固定采样下会改变体积及足底，未接入循环，不能以逐帧缩放/运行时偏移补救。

图像生成输入约束与提示词（内置 image_gen，编辑模式，无CLI）：

> Use case: identity-preserve. Asset type: candidate 2D HD-2D wuxia game character walk-cycle key pose. Image 1 is the edit target and exact identity/style reference. Create ONE complete full-body image of the SAME young swordsman facing toward the viewer, in the mid-passing pose of a southward walk cycle: left foot planted under the pelvis, right foot lifted just past it, modest natural arm counter-swing. Keep black high-tied hair and white tie, face, blue-gray outer layers, white crossed collar, brown belt, black bracers and boots, sword in right hand and scabbard at left hip. Preserve his 3.5-4 head proportions, camera pitch, artwork pixel-art detail and source-image character scale. Sword hand anatomically attached; no duplicate limbs, detached sword, split body or fragments. All of head, hair, sword and feet fully visible with generous transparent padding. Genuinely transparent background, no ground, no shadow, no text, no grid, no other character. Only change the pose; keep identity, clothing, colors, weapon and rendering style otherwise invariant.

对该图再作一次只针对体积/足线的编辑，输出 `2d-motion-review-v1/s-walk-passing-imagegen-r2-rejected.png`，SHA256 `C053D555EE078A45A3A8334ED1C6FE31B82BD7F44E449B94332ACAA35EED5995`。alpha≥128包围盒变为(400,154,878,1067)，可见高度913源像素，足底比待机低26源像素，较第一稿没有改善。按计划停止这一种靠提示词约束固定尺度的修法，不重复生成全套动作。第二稿提示词（输入图1为第一稿编辑目标，图2为待机比例参考）：

> Use case: identity-preserve. Asset type: complete 2D game-character walking key pose. Image 1 is the EDIT TARGET, a walking passing pose. Image 2 is the EXACT scale and placement reference, the same character standing. Make one focused source-art revision of Image 1: retain its natural passing leg pose, face, hair, clothing, hand/sword grip, weapon, and transparent 1402×1122 canvas, but redraw the foot/leg/body proportions and registration so its head top, body scale, and planted sole match Image 2's visible head and planted foot lines. The top of visible hair should be around source y=153, the planted sole must end around source y=1041, and the complete character should occupy about 888 source pixels in height. Keep the same horizontal body center, identity, palette, camera pitch and pixel-art finish. Do not simply zoom/scale the entire bitmap; correct artwork proportions and pose. No split parts, duplicate limbs, detached sword, extra pixels, ground, shadow, scenery, text, grid, or watermark. Genuinely transparent background. The result should remain a recognizable passing pose, not revert to idle.

下一门仍是：在同一二维人物身份和固定尺度下完成明确的S步行接触/经过关键姿势与SE直刺起手/命中/收势，先逐帧比较足线、手剑连接和身高，再制作可连续播放的小样。这需要可控二维绘制/编辑母版，不再依赖仅靠自然语言锁定AI输出的体积。P2环境视觉也仍未获通过；不扩产其余方向。
