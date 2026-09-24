"""Run inside Blender. Render existing master actions; never reconstruct geometry."""
import bpy, math, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'art_source/linshui-quality/v1/characters/hero'
bpy.ops.wm.open_mainfile(filepath=str(SRC/'hero-v1.blend'))
scene=bpy.context.scene;rig=bpy.data.objects['YeWuchenRig']
scene.cycles.samples=8
for direction,angle in [('s',0),('se',-45)]:
    # Rotate the root bone, not a separately regenerated/mirrored character.
    for action,count in [('idle',4),('walk',8),('thrust',12)]:
        rig.animation_data.action=bpy.data.actions[action]
        out=SRC/'renders'/action/direction;out.mkdir(parents=True,exist_ok=True)
        for frame in range(1,count+1):
            scene.frame_set(frame)
            bpy.data.objects['RenderDirection'].rotation_euler.z=math.radians(angle)
            bpy.context.view_layer.update()
            scene.render.filepath=str(out/f'{frame-1:02}.png')
            bpy.ops.render.render(write_still=True)
