# Spine 待机纵切源文件

本目录保存男女灰衣角色的 Spine 4.2 待机动画预制包，不是 Spine 编辑器生成的 `.spine` 工程。

## 内容

- `male-blink-generated.png`、`female-blink-generated.png`：内置图像生成工具产生的闭眼参考；整图存在身份和姿势漂移，构建脚本只在严格眼周蒙版内提取眼睑，不使用其身体、服装或轮廓；
- `export/wuxia-idle.json`：遵循官方 Spine 4.2 JSON 格式的可导入／评估骨架数据；
- `export/wuxia-idle.atlas`、`export/wuxia-idle.png`：男女皮肤、完整人物网格和闭眼附件图集；
- `scripts/build-spine-idle-slice.py`：从已验收 `rig-v2` 母版重建图集、网格和动画数据。

## 骨架与动画

- 皮肤：`male`、`female`；
- 插槽：`body`、`eyes-closed`；
- 骨骼：`root`、`pelvis`、`torso`、`head`、`hair-tip`、`hem-left`、`hem-right`、`arm-left`、`arm-right`；
- 动画：`idle`，长度六秒，包含两次非等间隔眨眼、轻微呼吸网格形变和衣摆摆动。

## 授权门禁

当前机器没有 Spine 编辑器，仓库也没有确认可用于公开分发的 Spine Professional 许可。纵切包含网格形变，Spine Essential不能保存或导出该工程；达到官方企业门槛时应使用Enterprise。因此：

1. 本目录数据只能称为“Spine 4.2 可导入纵切”，不能冒充编辑器导出的 `.spine` 工程；
2. 官方 Spine Runtime 不进入 `web/`、提交或 Pages；
3. 持有许可并安装与运行时匹配的 Spine 编辑器后，先导入 JSON、人工检查网格和时间轴、保存 `.spine` 工程，再接入正式页面；
4. 正式页面始终保留现有静态 WebP 降级。
