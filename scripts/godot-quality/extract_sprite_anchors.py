"""Read actual evaluated sword tip from master rig for each existing rendered frame."""
import bpy,json,math
from pathlib import Path
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'art_source/linshui-quality/v1/characters/hero'
bpy.ops.wm.open_mainfile(filepath=str(SRC/'hero-v1.blend'));rig=bpy.data.objects['YeWuchenRig'];scene=bpy.context.scene
anchors={}
for direction,angle in [('s',0),('se',-45)]:
    for action,count in [('idle',4),('walk',8),('thrust',12)]:
        rig.animation_data.action=bpy.data.actions[action]
        for i in range(count):
            scene.frame_set(i+1);bpy.data.objects['RenderDirection'].rotation_euler.z=math.radians(angle);bpy.context.view_layer.update()
            obj=bpy.data.objects['Single straight steel blade'].evaluated_get(bpy.context.evaluated_depsgraph_get())
            co=obj.matrix_world@obj.data.vertices[8].co;p=world_to_camera_view(scene,scene.camera,co)
            anchors[f'{action}/{direction}/{i}']=[round(p.x*160,3),round((1-p.y)*128,3)]
(SRC/'weapon-anchors.json').write_text(json.dumps(anchors,indent=2))
