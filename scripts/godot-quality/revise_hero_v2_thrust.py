"""Correct the v2 rig's sword-forward thrust on the existing Blender master."""
import bpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art_source/linshui-quality/v1/characters/hero-v2"
MASTER = SOURCE / "hero-v2.blend"
bpy.ops.wm.open_mainfile(filepath=str(MASTER))
scene = bpy.context.scene
rig = bpy.data.objects["HeroV2Rig"]
rig.animation_data.action = bpy.data.actions["thrust"]
amounts = [0, .12, .3, .55, .82, 1, 1, .9, .65, .4, .15, 0]
for frame, amount in enumerate(amounts, 1):
    scene.frame_set(frame)
    forearm = rig.pose.bones["forearm.R"]
    # The blade is rigged to the right forearm. Rotate its local vertical axis
    # forward into a real screen-visible stab, preserving one physical sword.
    forearm.rotation_euler.x = -1.46 * amount
    forearm.keyframe_insert("rotation_euler", frame=frame)
rig.animation_data.action = bpy.data.actions["idle"]
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(MASTER))
print("Updated the same master rig's thrust action")
