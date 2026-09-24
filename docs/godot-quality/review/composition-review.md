# P1 整屏构图验证（2026-09-24）

用户已在查看1080p实机截图后回复“合适，继续执行计划”。**构图与角色大小通过，进入P2；不代表美术或动画通过。**

## 实际交付与冻结值

独立场景：`godot/linshui-quality/scenes/validation/composition-review.tscn`。在Godot中打开并按F6运行；原main未切换。灰盒已保存为可编辑节点与烘焙导航，运行时不生成场景。

相机正交size18.8，位置(5,24,33.5)，看向(-2,0,0)，俯角约35°。角色160×128、脚锚(80,112)、pixel_size0.022、Sprite偏移(0,48)，约80逻辑像素站立身高：1080p投影101.1px、720p67.4px。固定机位与世界比例进入P2。

地面0、桥面+0.35、码头-0.25、水面约-0.85。真实岸线缺口与坡道接码头。碰撞层1、角色层2，导航按同一碰撞几何离线烘焙。

WASD/点击移动，E查看交互位置，Esc锁/解输入，R回起点。角色仍是静止尺寸试片，NPC等为灰盒，正式动作/对话/声音尚未实现。

## 证据

`evidence/composition-overview-1080.png`、`composition-overview-720.png`以及檐下/桥/码头截图来自Vulkan Forward+、RTX5060、Godot4.7.2真实窗口。

`evidence/composition-report-1080.json`记录七段连续物理路线：檐下→桥→对岸→返回桥→码头→木桩→茶铺，并保存实际坐标、路径、高程和采样。河水/屋顶点击拒绝、桥面点击、输入锁、合成D键移动与河岸防跌落通过。路线未以传送代替。采图通过不等于视觉通过。

复现：`python scripts/godot-quality/review_composition.py --height 1080 --routes`或`--height 720`，支持`--godot`覆盖默认D盘路径。重建灰盒源为`godot/linshui-quality/tools/build_composition.gd`，Godot用`--headless --path godot/linshui-quality --script res://tools/build_composition.gd`执行。

## 修复与未完成

- 初次导航点比地面高约0.2–0.23m，原到点阈值太小引起徘徊；调导航高度偏移与到点阈值后七段路线通过。
- 初次码头坡道被陆地实体覆盖；改岸线缺口、连续斜坡和低码头，重烘焙后通过。
- 出生点与木桩投影重叠已调整，人物双脚不再被木桩遮住。
- 檐棚、树冠、船和地形仍是体块；人物为单向静止试片，无步行/攻击；茶铺材质与阴影颗粒仍需P2精制。这些未被构图批准豁免。
- 无Release性能结论、Windows包或最终连续录屏。Godot日志有非致命系统证书库读取错误，本地渲染和导航无GDScript错误。
