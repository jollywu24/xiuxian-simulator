"""Correct walk contact phase in the existing single-rig v2 master.

Frame 1 and frame 5 must be opposite contacts, not identical sin(0)/sin(pi).
Keep root scale and translation fixed to avoid action zoom and lateral sway.
"""
import bpy
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art_source/linshui-quality/v1/characters/hero-v2"
MASTER = SOURCE / "hero-v2.blend"
bpy.ops.wm.open_mainfile(filepath=str(MASTER))
scene = bpy.context.scene
rig = bpy.data.objects["HeroV2Rig"]
rig.animation_data.action = bpy.data.actions["walk"]
for frame in range(1, 9):
    scene.frame_set(frame)
    phase = math.tau * (frame - 1) / 8
    for side, sign in (("L", 1), ("R", -1)):
        thigh = rig.pose.bones["thigh." + side]
        shin = rig.pose.bones["shin." + side]
        arm = rig.pose.bones["upper_arm." + side]
        coat = rig.pose.bones["coat." + side]
        thigh.rotation_euler.x = sign * .42 * math.cos(phase)
        shin.rotation_euler.x = -.26 * max(0, sign * math.sin(phase))
        arm.rotation_euler.x = -sign * .30 * math.cos(phase)
        coat.rotation_euler.x = sign * .10 * math.cos(phase + .3)
        for bone in (thigh, shin, arm, coat):
            bone.keyframe_insert("rotation_euler", frame=frame)
rig.animation_data.action = bpy.data.actions["idle"]
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(MASTER))
print("Walk frame 1 / 5 are now opposite contacts on the same rig")
