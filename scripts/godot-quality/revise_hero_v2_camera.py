"""First measured camera/foot-frame revision of the existing v2 Blender master."""
import bpy
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art_source/linshui-quality/v1/characters/hero-v2"
MASTER = SOURCE / "hero-v2.blend"
bpy.ops.wm.open_mainfile(filepath=str(MASTER))
scene = bpy.context.scene
camera = bpy.data.objects["SpriteCamera"]
target = Vector((0, 0, 1.08))
camera.location = target + Vector((0, -6, 5.4))
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.ortho_scale = 3.1
scene.camera = camera
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(MASTER))
scene.render.filepath = str(SOURCE / "master-preview-v2-r2.png")
bpy.ops.render.render(write_still=True)
