# 执行状态

## 当前有效状态：2026-09-24 重制v2，P1已获用户确认

最新：按用户要求改为“先整组、再修坏帧”。已实际生成19张新完整二维动作源图，并沿用1张完整直刺关键帧，组成S步行8帧与SE直刺12帧；另对步行05/08、直刺04分别生成局部第二稿并保留原稿。与既有S/SE待机各4帧合计28张独立256×256候选，统一脚锚(128,220)。Godot Forward+ 720p/1080p实机依次播放两段动作，空格攻击锁移动且不会被按键重复重启，技术检查通过。正常尺寸仍可见直刺03→04→05身高/剑向突变，步行循环尚未艺术通过；P2尚缺SE步行8帧和S直刺12帧，可编辑分层源亦未完成。见[本轮整组评审](review/p2-2d-batch-v1.md)、[源图与提示词](../../art_source/linshui-quality/v1/characters/hero-v2/2d-batch-v1/generation-record.md)。G2继续拒收。

最新纠偏：用户指出HD-2D最终人物应为二维。停止三维母版的造型迭代；既有完整二维S/SE源图经统一采样进入Godot `SpriteFrames`/`AnimatedSprite3D`。另将S/SE待机与一张SE攻击关键帧固定平移至256×256独立PNG、脚锚(128,220)，1080p/720p实机通过技术检查；160与256人物局部截图像素相同。三张图足底可见末行220/219/218，动作连续与源图落脚仍待修整。格式取舍见[二维帧格式决策](CHARACTER_FORMAT_DECISION.md)；P2依然未通过。

前轮二维动作诊断（历史）：当时仅有S/SE待机各4张、S步行5张和SE直刺关键帧1张，以统一脚锚打成14张独立PNG；Forward+技术播放通过，步态拒收。该次“缺3张步行、11张直刺”的数量已被本轮整组生成补足，但不代表动作艺术通过。旧证据见[二维动作诊断](review/p2-2d-motion-review-v1.md)。

按用户“避免来回返工”的方案实际建立P2人物造型→姿势→连续动作门槛。造型门槛已制作可编辑Blender修订、统一采样S/SE独立帧及1080p/720p四张Forward+整屏截图；技术检查通过，人工比对仍拒收简化模型感。未扩产角色动作；源母版和前版另存，详情见[造型门槛评审](review/style-gate-v2.md)。P2仍未通过。

最新：用户选择保留造型、可控骨骼验证。已在原 hero-v2.blend 增量修改发束与五官、加入独立脚骨和解析腿部接地，固定35°相机及(80,112)根锚；实际渲染22张小样（S/SE静止2张、S步行8张、SE直刺12张），统一4:1采样且安全边检查通过。当前衣服仍显低模、直刺缺少完整身体发力，不作为正式资产/P2通过；详见 review/controlled-rig-sample-v1.md。

用户要求实施新计划，后续解除逐帧生成限制，确定“方式不限、先验证小样、动作连续且人物好看”。现行执行计划v2、人物规范v3及资源清单已更新。以下旧记录仅保留历史，不覆盖现行范围。

- P0：核对Godot4.7.2、Blender5.2.1、Forward+ RTX5060；原292文件工作区哈希保护仍一致。最终Windows导出模板尚待准备。
- P1：独立composition-review场景已实际运行。七段连续物理路线、点击拒绝/桥面点击、输入锁、键盘行走/河岸防跌落通过。用户查看截图后明确“合适，继续执行计划”，构图和人物大小获批准；镜头size18.8/约35°，1080p角色约101px、720p约67px冻结。见[评审记录](review/composition-review.md)。
- P2未通过：已实际交付新增檐棚、170块石路、175块岸石的可编辑母版和三个GLB、真实石灰岩底色及水面材质，已进入固定整屏实机；路线和双分辨率检查通过。8帧步行整图经过三轮生成/编辑，仍有经过姿势不足与4–6逻辑像素脚点差，拒收并暂停该生成路线，不批量扩帧。见[P2实拍/缺陷与管线评审](review/p2-recomposition-review.md)。
- P3–P5未完成；无正式Windows包、最终90秒录屏或120秒性能报告。默认main仍是旧测试入口，新P1独立运行。未删除用户资产，未推送/上线。

## 历史记录（旧阶段和生产方式已被取代）

2026-09-23 最新：用户要求停止修补旧上传角色、按规范重做。新增 `CHARACTER_PRODUCTION_STANDARD.md` 和独立 `hero-v2/`，已交付图像生成四视图／风格目标、真实 Blender 5.2 可编辑母版（46网格、15骨骼、单剑、idle4/walk8/thrust12）、固定镜头配置与 S/SE 14个真实动作抽样帧。r4 首帧逻辑身体约80.75px、底端 y≈112.25，符合尺寸定标；但造型与直刺视觉质量尚不合格，未产生48帧图集、未接入 Godot，不称重做完成。新生成风格图只是目标，不作为运行帧。默认入口仍为旧上传角色；G2保持拒收，具体见 `review/defects.md`。旧资产、网页、存档、Pages均未动；未推送。

2026-09-23 用户要求直接用图像技能重修剑尖越格：已执行内置 image_gen 的 v2 全图保守编辑与 v3 单帧窄改，均输出真实透明 PNG 并在 Forward+ 实机逐帧复拍。两稿仍导致人物截断、碎块和游离剑尖，拒收；完整提示词、失败截图与差异量化见 `art_source/linshui-quality/v1/characters/hero-uploaded/attack-repair-prompts-v2-v3.md`。原 `character5.png` 与默认运行图集保持不变。结合 v1 已达计划的同类三次修订上限，不能继续盲目整图重生成或放行 G2。

2026-09-23 攻击尺寸修复：上传待机主角可见身高约214源像素，攻击起手约158源像素；旧 `play_pose()` 按图集格高(约222/190)计算 `pixel_size`，没有对齐实际人物尺寸，切换时可见忽大忽小。现按身高校准攻击图的世界像素密度，按真实脚点留白校准落脚高度；不逐帧改缩放或世界位置。资源合同加入攻击与待机身高/脚点等值检查。真实 Forward+ 同镜头截图：`evidence/attack-scale-fixed-s-idle.png`、`attack-row-fixed-s-0.png`、`attack-scale-fixed-se-idle.png`、`attack-row-fixed-se-0.png`；数值记录在 `evidence/attack-row-fixed-engine.json`。原图剑尖横向越格等美术缺陷仍未解决，G2继续拒收。

2026-09-23 本轮“修复所有已知问题”审计：可确定的攻击行切片、重建脚本依赖缺失旧图集、空格键自动重复已修；旧P2图集从现存源帧重编，资源合同复测通过。用户上传5张原图不变。生成式攻击和石路候选经视觉／边缘检查拒收，记录于 `review/defects.md`。`run_quality.py` 当前仅 `assets-p2` 因像素精修与 G2视觉拒收返回1；其余6项检查通过。旧Three.js 5项测试与292文件哈希保护检查通过。本轮未修复全部美术缺陷，G2仍拒收，不进入P3或宣布完成计划。

攻击上下分裂修复：用户截图对应的 `character5.png` 仅有7排实际动作，先前代码按8排等分；自第三排起切片穿过人物，导致上下两截落在不同位置。现按源图透明间隙测得7个行起点(0,180,370,560,750,940,1135)，统一取190px高，重新生成默认场景。南／东南各6帧在真实Forward+窗口逐帧截图，见 evidence/attack-row-fixed-engine.json、attack-row-fixed-*.png；测试验证42格行坐标和源图上下留白。上下分裂已修复；个别剑尖横向越格仍在源图内，不能因此放行CHR-01/G2。

最新修复：用户报告的原地左右晃动来自错误的整图均分，不是物理位置移动。上传待机实际列距199px，旧代码用了约222px。已按固定图集原点/列距修正idle/walk/run并重新保存默认场景；没有逐帧改世界坐标或包围盒居中。idle-registration.json显示8方向下半身横向偏移范围从66–69.5px降到0–2.5px，S/SE均1px；idle-fixed-engine.json与8张引擎帧图记录同世界原点验证。新增默认入口网格回归测试。

P2独立工作：4米石路连同碰撞、导航前移0.5m至檐口，新增前墙碰撞防穿入未实现室内；修复旧夹具重复命名导致三面边界漏移动的问题。真实三段路线以0.12m到达容差复测通过。尚未通过：连续受光美术验收、南/东南正式直刺（上传图跨格/方向漂移）、统一160×128帧与动作元数据、石路接缝及茶铺材质。G2继续拒收，不得将本次晃动修复称为P2完成。

入口修复：main.tscn 默认引用 uploaded-hero-review.tscn，上传图集已序列化保存，不再只在 _ready 替换。因此默认F5与该场景编辑器预览一致。原 quality-fixture.tscn 仅用于旧母版对照。截图脚本P2也改为走main入口，防止以后生成旧截图误报。证据 evidence/default-entry-new-hero.png；默认入口170帧槽合同测试通过。三段真实物理/导航移动通过，见 evidence/uploaded-motion.json，但不是步态/受光/全流程验收。夹具没有檐下可行走区域，V03仍未完成，不能靠调暗角色伪造。

2026-09-23 上传资源续作：新增独立 `scenes/validation/uploaded-hero-review.tscn`，接入用户上传待机32、行走48、跑步48、攻击42帧槽。已在RTX5060 Forward+输出8张真实截图，见 evidence/uploaded-hero-review.json。新形象静态可读性改善，攻击均分切片出现邻格剑尖残片，NW方向缺失，G2不放行。按用户要求实际使用内置image_gen定向修复，结果仍有越界和方向漂移，保存在 hero-uploaded/attack-repair-v1.png 且明确拒收。上传5张文件SHA256保持不变。原默认入口暂不替换，避免把待修攻击当正式资源。详细记录见 art_source/linshui-quality/v1/characters/hero-uploaded/README.md。

当前阶段：P2 已有实际资产和可运行夹具；收到用户评审后完成 r4 同母版修订及48帧重导出，G2 仍拒收。不是全部完成。

参考提交：8f4a0f2585bf3fa8a3e9fac8d46c502ef39059d7。
保护基线：[reference-baseline.json](reports/reference-baseline.json)，292 个实际工作区文件；原有改动与删除保持不动，未切换分支。

工具：Godot 4.7.2.stable.official.ed1daf0bf、Blender 5.2.1 LTS (9e2066aef7ef)、Python 3.12.14、RTX 5060 / 595.95 / 8151 MiB。
工具检测：[doctor.json](reports/doctor.json)。已在窗口日志验证 Vulkan Forward+，不是 Compatibility。

已验证：原 Three.js 5 项 node:test 通过；灰盒场景保存、56 个导航多边形；7 段实际物理移动均到达且未穿水。桥屏幕点击射线命中真实 Y=0.35 桥面。见 evidence/p1-route.json。
P0 工具能力已实测；P1 路线与构图已有证据，但这些不代表正式资产质量。

P2 实物：主角唯一 .blend/rig、3 个动作、S/SE 两方向共48帧槽、3张真实图集与元数据；茶铺 .blend、4个GLB模块；石路 .blend、1个GLB模块；3套底色/平面法线/ORM；5次 imagegen 实际输出与完整生成记录。
可运行入口：godot/linshui-quality/project.godot → scenes/main.tscn。仅P2夹具，非完整游戏。

G2拒收：人物仍有分段低模感，肩袖衔接／脸部像素簇／出剑节奏未达标；石路接缝和重复、茶铺材质／檐下动态受光待修。见 review/p2-review.json。
用户已反馈人物模糊并要求 GitHub 管线调研后继续：恢复同母版 r4 定向修订、无损导入与像素加工修复。见 HD2D_PIPELINE_REFERENCES.md；不扩展P3，不降低门槛。
资源合同测试通过；资产门禁按预期返回非零（像素精修和G2未通过）。自动通过不等同美术通过。

尚未完成：其余37个清单项仍 planned，已有9项也仅局部输出，0项 reviewed_pass。尚缺完整336帧主角、周伯、桥岸船柳木桩等正式资源，P4玩法/存档/声音、连续60–90秒真实录屏、120秒持续性能测试、Windows包和许可全项审查。
Windows导出模板未安装属于后续未完成准备，不能宣称已导出；图像工具和GPU实际可用，本轮质量阻塞不是工具缺失。
目前仅有实时Viewport截图与离线角色GIF；没有最终连续实机录像。瞬时draw calls与primitives见 evidence/p2-engine.json，不是60FPS达标证据。

下一步：复核 r4 实际图集与引擎截图，继续肩袖/脸部像素簇、镜头投影与连续受光校准；用户已给出修订方向，不再以等待同一评审为阻塞理由。
可直接复核：python scripts/godot-quality/run_quality.py （当前应返回1，因为G2被明确拒收）。

本次修改仅限 godot/linshui-quality、art_source/linshui-quality/v1、scripts/godot-quality、docs/godot-quality。
没有推送、上线、删除旧资源或修改旧存档。
