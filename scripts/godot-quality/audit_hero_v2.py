"""Read-only source audit for the rejected v2 hero candidate (Blender 5.2)."""
import bpy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MASTER = ROOT / "art_source/linshui-quality/v1/characters/hero-v2/hero-v2.blend"
bpy.ops.wm.open_mainfile(filepath=str(MASTER))
scene = bpy.context.scene
rig = bpy.data.objects["HeroV2Rig"]
meshes = [ob for ob in bpy.data.objects if ob.type == "MESH"]
unbound = [ob.name for ob in meshes if not any(
    mod.type == "ARMATURE" and mod.object == rig for mod in ob.modifiers)]
required = ["Head • face", "Robe v2 • white fitted body", "Sword • single straight blade",
            "Sheath • left hip", "Boot • foot L", "Boot • foot R"]
report = {
    "master": str(MASTER),
    "blender_version": bpy.app.version_string,
    "mesh_count": len(meshes),
    "bone_count": len(rig.data.bones),
    "actions": {name: list(bpy.data.actions[name].frame_range) for name in ("idle", "walk", "thrust")},
    "missing_required_parts": [name for name in required if name not in bpy.data.objects],
    "unbound_meshes": unbound,
    "blade_meshes": [ob.name for ob in meshes if ob.name.startswith("Sword • single straight blade")],
    "source_resolution": [scene.render.resolution_x, scene.render.resolution_y],
    "camera_ortho_scale": scene.camera.data.ortho_scale,
    "camera_type": scene.camera.data.type,
    "transparent_film": scene.render.film_transparent,
    "render_direction_scale": list(bpy.data.objects["RenderDirection"].scale),
}
print("HERO_V2_AUDIT " + json.dumps(report, ensure_ascii=False, sort_keys=True))
if unbound or report["missing_required_parts"] or len(report["blade_meshes"]) != 1:
    raise RuntimeError("v2 source contract audit failed")
