"""Render the same v2 master/rig at S and SE keyposes for visual rejection/approval.

The high-resolution RGBA files are review source frames, not runtime sprites.
No per-pose re-centering or scale changes are permitted.
"""
import bpy
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art_source/linshui-quality/v1/characters/hero-v2"
MASTER = SOURCE / "hero-v2.blend"
OUT = SOURCE / "review-frames"
OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(MASTER))
scene = bpy.context.scene
scene.render.filepath = ""
scene.cycles.samples = 16
rig = bpy.data.objects["HeroV2Rig"]
turn = bpy.data.objects["RenderDirection"]

poses = [("idle", 1), ("walk", 1), ("walk", 3),
         ("thrust", 1), ("thrust", 5), ("thrust", 7), ("thrust", 12)]
for direction, angle in (("s", 0.0), ("se", math.pi / 4)):
    turn.rotation_euler.z = angle
    for action, frame in poses:
        rig.animation_data.action = bpy.data.actions[action]
        scene.frame_set(frame)
        scene.render.filepath = str(OUT / f"{direction}-{action}-{frame:02}.png")
        bpy.ops.render.render(write_still=True)
print(f"Rendered {len(poses) * 2} poses from one master into {OUT}")
