"""Render both direction keyposes from the one painted-puppet Blender rig."""
import bpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art_source/linshui-quality/v1/characters/hero-v2"
MASTER = SOURCE / "hero-v2-puppet.blend"
OUT = SOURCE / "puppet-review-frames"
OUT.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(MASTER))
scene = bpy.context.scene
rig = bpy.data.objects["HeroV2PaintedRig"]
for direction in ("s", "se"):
    for ob in bpy.data.objects:
        if ob.type == "MESH" and ob.name.startswith(("s.", "se.")):
            ob.hide_render = not ob.name.startswith(direction + ".")
    for action, frames in (("idle", (1,)), ("walk", (1, 3, 5, 7)),
                           ("thrust_" + direction, (1, 3, 5, 7, 9, 12))):
        rig.animation_data.action = bpy.data.actions[action]
        for frame in frames:
            scene.frame_set(frame)
            scene.render.filepath = str(OUT / f"{direction}-{action}-{frame:02}.png")
            bpy.ops.render.render(write_still=True)
print(f"Rendered {len(list(OUT.glob('*.png')))} keyposes into {OUT}")
