"""Correct the existing painted puppet master to 160x128/80px foot framing."""
import bpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art_source/linshui-quality/v1/characters/hero-v2"
MASTER = SOURCE / "hero-v2-puppet.blend"
bpy.ops.wm.open_mainfile(filepath=str(MASTER))
scene = bpy.context.scene
scene.camera.data.ortho_scale = 3.4
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(MASTER))
scene.render.filepath = str(SOURCE / "puppet-rig-preview-s-r2.png")
bpy.ops.render.render(write_still=True)
