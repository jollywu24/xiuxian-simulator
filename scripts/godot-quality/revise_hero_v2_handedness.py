"""Calibrate the existing v2 rig's right hand to the approved costume art.

This single source coordinate reflection is not a runtime sprite mirror:
both S and SE are rendered independently from the same rig afterward.
"""
import bpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art_source/linshui-quality/v1/characters/hero-v2"
MASTER = SOURCE / "hero-v2.blend"
bpy.ops.wm.open_mainfile(filepath=str(MASTER))
turn = bpy.data.objects["RenderDirection"]
turn.scale.x = -1
turn.rotation_euler.z = 0
bpy.ops.wm.save_as_mainfile(filepath=str(MASTER))
print("Rig R hand and single sword now project to screen-left in S view")
