"""Compare both SE turn signs after one-time right-hand calibration."""
import bpy
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art_source/linshui-quality/v1/characters/hero-v2"
bpy.ops.wm.open_mainfile(filepath=str(SOURCE / "hero-v2.blend"))
scene = bpy.context.scene
bpy.data.objects["HeroV2Rig"].animation_data.action = bpy.data.actions["idle"]
scene.frame_set(1)
turn = bpy.data.objects["RenderDirection"]
for name, angle in (("minus", -math.pi / 4), ("plus", math.pi / 4)):
    turn.rotation_euler.z = angle
    scene.render.filepath = str(SOURCE / f"se-turn-{name}.png")
    bpy.ops.render.render(write_still=True)
