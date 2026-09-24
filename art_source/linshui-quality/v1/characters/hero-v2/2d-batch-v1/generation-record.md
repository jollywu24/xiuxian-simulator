# 完整二维动作整组 v1 · 生成记录

日期：2026-09-24。内置 `image_gen` 编辑模式；没有走收费CLI、第三方素材或肢体拼接。`source/s/walk/01..08.png` 为8张独立完整人物，`source/se/thrust/01..12.png` 为12张独立完整人物；其中SE直刺07是此前已有的完整二维关键帧原图，其余19张为本轮生成。`revisions/`保存局部问题的第二稿；初稿不覆盖。逐张SHA256、实际采用来源、画布和Alpha范围见 `frame-contract.json`。

输入参考：S步行统一参考 `../generated-frames/s/idle/01.png`；SE直刺统一参考 `../generated-frames/se/idle/01.png`（身份/尺寸）与 `../generated-frames/se/thrust/07.png`（命中方向）。均为项目内已有角色图。生成器输出目标为透明1402×1122原图；其中S步行07实际返回1401×1123，固定左上原点补入1402×1122，不做逐帧缩放或bbox居中。发布许可审核未完成，当前仅内部候选。

## 首轮提示词配方

每张各发起一次内置图像生成请求；下列相同组中的 `frame` 与 `pose` 替换为对应行内容，不是让生成器一次画多格图。

S步行01/03/05/07前缀：

> Use case: identity-preserve. Asset type: ONE full-body frame in an 8-frame south-facing 2D HD-2D wuxia walking cycle. Image 1 is exact identity, pixel-art style, world-scale and camera-view reference, not a sheet. Same young black-haired high-tied swordsman, white crossed collar, blue-gray outer robe, brown belt, black bracers and boots, sword held in right hand and scabbard at left hip. Front-facing, full character on genuinely transparent background. Keep head/body/weapon size and stable foot-ground baseline comparable to reference; place entire character inside 1402x1122 canvas with generous clear edges. Produce just one pose, no grid/sheet, no other character, no duplicated limbs, split body, detached sword, text, scenery, shadow, or watermark. Frame {frame} of 08. Precise pose: {pose}. Clearly readable stride at normal game size while maintaining identical identity and clothing.

|帧|`pose`|
|---|---|
|01|left foot forward contacting ground, right foot trailing behind, natural opposite arm swing|
|03|left foot planted directly beneath hips, right foot lifted and passing beside the planted shin, knees distinct|
|05|right foot forward contacting ground, left foot trailing behind, natural opposite arm swing|
|07|right foot planted directly beneath hips, left foot lifted and passing beside the planted shin, knees distinct|

S步行02/04/06/08前缀：

> Use case: identity-preserve. Asset type: ONE full-body frame of an 8-frame south-facing 2D HD-2D wuxia walking cycle. Image 1 is exact identity, pixel-art style, camera-view and scale reference, not a sheet. Same young black-haired high-tied swordsman, white crossed collar, blue-gray outer robe, brown belt, black bracers and boots, sword in right hand and scabbard at left hip. Front-facing. Complete body and sword in a transparent 1402x1122 image, same body scale and head/foot baseline as reference. Distinct stride for frame {frame} of 08. Exact pose: {pose}. Keep one coherent person with connected hands, sword and legs. Do not add other characters, fragments, extra limbs, text, scenery, shadow, grid, or watermark. Genuinely transparent background.

|帧|`pose`|
|---|---|
|02|weight-bearing compression immediately after left-foot contact: left knee bends slightly, pelvis lowers subtly, right boot remains behind with heel lifted|
|04|push-off after left-foot passing: left toe trails and pushes from ground while right knee and boot swing forward visibly, torso rises slightly|
|06|weight-bearing compression immediately after right-foot contact: right knee bends slightly, pelvis lowers subtly, left boot remains behind with heel lifted|
|08|push-off after right-foot passing: right toe trails and pushes from ground while left knee and boot swing forward visibly, torso rises slightly|

SE直刺01–04前缀：

> Use case: identity-preserve. Asset type: ONE full-body 2D frame of a twelve-frame SE-facing wuxia sword-thrust animation. Image 1 is exact character identity/idle pose and camera-scale reference; Image 2 is same character's frame-07 hit-pose and sword direction reference. Single cohesive young swordsman, black high tied hair/white tie, white crossed collar, blue-gray outer robe, brown belt, dark bracers and boots, sword in right hand, scabbard left hip. Same 3/4 view facing image right; do not mirror. Complete figure and sword with transparent padding inside 1402x1122 canvas. Preserve character identity and overall scale; no runtime-like zoom. Frame {frame} of 12. Pose: {pose}. Keep right hand anatomically attached to sword hilt, two coherent legs/feet and continuous costume. Genuinely transparent background. No other person, no grid/sheet, no text, no shadow, no scenery, no detached parts or watermark.

|帧|`pose`|
|---|---|
|01|ready stance matching idle, slight tightening before a thrust; sword tip angled downward, both feet grounded|
|02|anticipation starts: right sword hand begins to draw back, left forearm counters, knees soften; blade still below chest height|
|03|clear anticipation: right elbow pulled back toward ribs, sword angled rearward, torso turns slightly away from target, weight gathers on rear leg|
|04|deep coiled preparation: sword hilt near right waist, blade trailing back, torso winds, front foot just starting to step; not yet thrusting|

SE直刺05/06/08/09前缀：

> Use case: identity-preserve. Asset type: ONE complete 2D frame in a twelve-frame SE-facing sword-thrust animation. Image 1 is exact identity/idle artwork; Image 2 is the same character at full-extension hit in frame 07. Keep same young swordsman's black high ponytail, white tie, blue-gray robe, white collar, brown belt, dark boots and bracers, one sword in right hand and left-hip scabbard. Same 3/4 camera facing image right, body/face scale, transparent 1402x1122 source canvas. Frame {frame} of 12. Pose: {pose}. This is a single full-body pose, not a sprite sheet. Entire sword and both feet must remain inside canvas with safe padding. Genuinely transparent background. Do not mirror, crop, split, duplicate limbs, detach sword, add a trail, grid, scenery, shadow, text, or watermark.

|帧|`pose`|
|---|---|
|05|launch phase: front foot steps toward image right, hips drive forward, sword arm begins extending from coiled waist, sword tip still short of full extension|
|06|late launch immediately before hit: front foot plants, right arm almost straight, blade points toward image right at chest height, torso leaning into thrust|
|08|immediate post-hit hold: same extended sword direction as frame 07, follow-through settles, knees brace, hair/robe still moving|
|09|early recovery: sword arm begins retracting from extension, torso rises from lunge, front foot remains planted, rear foot starts gathering|

SE直刺10–12前缀：

> Use case: identity-preserve. Asset type: ONE full-body frame of a twelve-frame SE-facing wuxia sword thrust. Image 1 is the exact idle identity and scale reference; Image 2 is the same swordsman at frame 07 hit. Same 3/4 view facing image right, black tied hair/white tie, white crossed collar, blue-gray robe, brown belt, dark boots and bracers, right-hand sword and left-hip scabbard. Frame {frame} of 12. Pose: {pose}. Keep identity, costume and foot-ground scale comparable to image 1. Complete person and entire sword inside transparent 1402x1122 canvas with safe padding. One pose only, no sprite sheet or extra person, no mirrored asymmetry, duplicate limbs, split body, detached sword, effects, text, scenery, shadow, grid, or watermark. Genuinely transparent background.

|帧|`pose`|
|---|---|
|10|mid recovery: sword retracts halfway toward right hip, torso more upright, rear foot gathers forward, cloth and hair settle|
|11|late recovery: sword is lowered diagonally beside right leg, weight centers over both feet, knees nearly straight|
|12|return to ready stance very close to image 1 idle but with final small cloth and hair settling, sword tip lowered, both feet grounded|

## 局部修订

S步行05第二稿以原05为编辑目标、原01为对照，只改腿部相位：前脚换到画面右、后脚在画面左，保留脸、服饰、剑、相机与画布，禁止整体镜像。采用 `revisions/s/walk/05-r2.png`，原05留存。S步行08第二稿以原08为编辑目标、原07为头发高度参考，只收回异常冲高的马尾，保持步态与身体原位。采用 `revisions/s/walk/08-r2.png`，原08留存。SE直刺04第二稿以原04为编辑目标、03和05作相邻姿势参考，将远伸向左的剑收回腰侧斜下作蓄力，保持全身与透明画布；采用 `revisions/se/thrust/04-r2.png`，但仍需连播评审。

三张修订的完整英文约束：

> 05: Correct ONLY the leg phase in Image 1: make the front planted boot visibly on the viewer-RIGHT and the trailing boot on the viewer-LEFT, opposite the contact in Image 2, with natural knee and robe opening. Keep the head, face, hair, collar, belt, sword hand, sword, scabbard, torso, transparent 1402x1122 canvas, fixed source scale, camera and character center unchanged. Single complete character, no mirrored entire body, no duplicate feet/limbs, no text, shadow, scenery, grid or watermark. Genuinely transparent background.

> 08: Correct ONLY the unnaturally high hair/ponytail silhouette of Image 1; return hair-top line and hair mass to approximately the height and shape of Image 2 while keeping the distinct frame-08 stepping pose, face identity, hands, sword, robe, legs, boots and fixed character scale unchanged. Transparent 1402x1122 canvas, no global zoom or shift. Full coherent character, no new limbs, fragments, text, grid, shadow, scenery, or watermark. Genuinely transparent background.

> 04: Revise ONLY frame 04 into the bridge between those two: keep the same character identity, costume, 3/4 right-facing camera and planted lunge, but bring the right hand and sword hilt back close to the right waist/torso, elbow bent, with blade angled diagonally down-left and sword tip no farther than the left boot. Do not leave the blade fully extended to the left as in Image 1. The hand must remain visibly attached to the hilt; this is a coiled instant before the arm extends right in Image 3. Keep full body and sword within transparent 1402x1122 source canvas, similar body size and foot line. No global scaling, mirroring, duplicate hands, detached blade, parts, shadows, trails, scenery, text, grid or watermark. Genuinely transparent background.

当前图像只完成第一轮整组与三帧局部修订，不是可编辑分层像素母版，不具备P2艺术验收或外发许可。继续修改具体源帧，不重生成整套。
