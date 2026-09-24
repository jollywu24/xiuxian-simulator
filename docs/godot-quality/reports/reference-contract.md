# Three.js 只读功能参考

位置：web/demos/jiangnan-hd2d/src。保护基线为本轮工作区字节，不只比较 HEAD。

| 旧模块 | 新样板采用的行为合同 | 不迁移 |
| --- | --- | --- |
| world.mjs | 点击真实可走面；跨河经过桥；碰撞与交互距离一致 | 半米 A*、手写桥高公式、旧坐标 |
| rules.mjs | 调查幂等、状态版本校验、坏档保留 | 渡口旧账全任务、交易、战斗公式 |
| main.mjs | WASD/点击移动、交互暂停输入 | DOM、浏览器存档 |
| art.mjs | 仅作失败/占位对照 | Canvas 人物与纹理 |
| render.mjs | 桥栏深度、受光、脚点的验收对象 | 几何、镜头、反射、后处理实现 |

原测试：2026-09-22 执行 node --test tests/hd2d.test.mjs，5/5 通过。
没有取得旧版同尺度运行截图，不能声称已有视觉优劣对照。

锁定版本核验：本机 --version 与 Godot 官方 Windows 下载页一致为 4.7.2。
参考：https://godotengine.org/download/windows/ 。
Sprite3D 参数参考：https://docs.godotengine.org/en/stable/classes/class_spritebase3d.html 。
命令行参考：https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html 。
