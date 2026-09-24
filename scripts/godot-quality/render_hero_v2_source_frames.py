"""Render all 48 P2 pose references individually from one 3D Blender rig.

These unpainted RGBA frames are pose/registration controls for one-frame-at-a-
time art generation. They are not automatically accepted runtime sprites.
"""
import bpy
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art_source/linshui-quality/v1/characters/hero-v2"
MASTER = SOURCE / "hero-v2.blend"
OUT = SOURCE / "source-frames"
bpy.ops.wm.open_mainfile(filepath=str(MASTER))
scene = bpy.context.scene
scene.cycles.samples = 8
rig = bpy.data.objects["HeroV2Rig"]
turn = bpy.data.objects["RenderDirection"]

actions = (("walk", 8),) if "--walk-only" in sys.argv else (("idle", 4), ("walk", 8), ("thrust", 12))
directions = (("se", math.pi / 4),) if "--se-only" in sys.argv else (("s", 0.0), ("se", math.pi / 4))
for direction, angle in directions:
    turn.rotation_euler.z = angle
    for action, count in actions:
        rig.animation_data.action = bpy.data.actions[action]
        folder = OUT / direction / action
        folder.mkdir(parents=True, exist_ok=True)
        for frame in range(1, count + 1):
            scene.frame_set(frame)
            scene.render.filepath = str(folder / f"{frame:02}.png")
            bpy.ops.render.render(write_still=True)
print(f"Rendered {sum(count for _, count in actions) * len(directions)} separate source pose PNGs from {MASTER}")
