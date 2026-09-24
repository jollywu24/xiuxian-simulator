# 临水质量样板 — P2 评审中，未通过 G2

用标准版 **Godot 4.7.2** 导入本目录 `project.godot`，F6 运行 `scenes/main.tscn` 或 F5。
Forward+ / Windows / 1920×1080；运行时使用真实 GLB 与 PNG 图集，不运行 Blender 或生成服务。

默认 F5 与 main.tscn 现已指向上传主角场景，图集也已保存进场景，编辑器预览不依赖 _ready 临时替换。若之前打开旧的 quality-fixture.tscn，F6 仍是旧母版对照；请打开 main.tscn 或直接 F5。
操作：WASD 移动，点击石路前往，Shift 跑步，Space 测试攻击（NW缺失，禁用；其他方向仍有待修图集问题）。
这仅是 P2 小型美术夹具，不是完整游戏；安全边界用于防止从夹具落下。还没有 NPC、调查、木桩命中系统或保存功能；不会读写旧网页存档。

灰盒：单独运行 `scenes/validation/graybox.tscn`。WASD、Shift、点击移动，可验证桥与码头斜坡；胶囊、盒子和水面都明确是 P1 灰盒。

母版：`../../art_source/linshui-quality/v1/`。不在运行时依赖该目录。
执行状态、缺陷和证据：`../../docs/godot-quality/STATUS.md`。

用户已提供新主角图集并授权图片生成定向修复，当前采用上传角色，不再以等待旧母版评审为由暂停。G2仍因动作图集和环境质量未通过，不得默认扩展P3。
未交付 Windows 导出包、最终全流程录像、持续性能达标报告，不得称为最终完成。
