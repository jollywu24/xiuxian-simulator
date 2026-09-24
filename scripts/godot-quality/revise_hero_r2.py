"""Fix observed identical directions, eye readability, global-axis action posing and anchor."""
import bpy, math, json
from pathlib import Path
from mathutils import Matrix,Vector
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'art_source/linshui-quality/v1/characters/hero'
bpy.ops.wm.open_mainfile(filepath=str(SRC/'hero-v1.blend'));rig=bpy.data.objects['YeWuchenRig']
if rig.get('revision',0)>=2:raise RuntimeError('Revision already applied')
for ob in bpy.data.objects:
    if ob.type!='MESH':continue
    if ob.name.startswith(('Eye white','Eye pupil')):
        center=sum((v.co for v in ob.data.vertices),Vector())/len(ob.data.vertices)
        for v in ob.data.vertices:v.co.z=center.z+(v.co.z-center.z)*.55
    if ob.name.startswith('Nose'):
        center=sum((v.co for v in ob.data.vertices),Vector())/len(ob.data.vertices)
        for v in ob.data.vertices:v.co=center+(v.co-center)*.65
    if ob.name.startswith('Sleeve'):
        center=.30 if ob.data.vertices[0].co.x>0 else -.30
        for v in ob.data.vertices:v.co.x=center+(v.co.x-center)*.82
orientation=bpy.data.objects.new('RenderDirection',None);bpy.context.scene.collection.objects.link(orientation)
for ob in list(bpy.context.scene.objects):
    if ob.type=='MESH' or ob==rig:ob.parent=orientation
def rx(name,value):
    basis=rig.data.bones[name].matrix_local.to_3x3()
    rig.pose.bones[name].rotation_euler=(basis.inverted()@Matrix.Rotation(value,3,'X')@basis).to_euler()
for action,count in [('idle',4),('walk',8),('thrust',12)]:
    rig.animation_data.action=bpy.data.actions[action]
    for f in range(1,count+1):
        bpy.context.scene.frame_set(f);phase=(f-1)/count*math.tau
        for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
        if action=='idle':rx('spine',.015*math.sin(phase));rx('coat.L',.025*math.sin(phase))
        elif action=='walk':
            for side,s in [('L',1),('R',-1)]:
                rx('thigh.'+side,s*.32*math.sin(phase));rx('shin.'+side,max(0,s*math.cos(phase))*.38)
                rx('upper_arm.'+side,-s*.28*math.sin(phase));rx('coat.'+side,s*.13*math.sin(phase+.3))
            rig.pose.bones['pelvis'].location.z=.009*(1-math.cos(phase*2))
        else:
            t=[0,.1,.25,.4,.8,1,1,.9,.6,.3,.1,0][f-1]
            rx('upper_arm.R',-1.42*t);rx('forearm.R',-.12*t);rx('upper_arm.L',.3*t)
            rx('thigh.R',-.35*t);rx('thigh.L',.23*t);rx('spine',.07*t);rx('coat.R',-.13*t)
        rx('ponytail',.05*math.sin(phase+.6))
        for pb in rig.pose.bones:pb.keyframe_insert('rotation_euler',frame=f);pb.keyframe_insert('location',frame=f)
scene=bpy.context.scene;rig.animation_data.action=bpy.data.actions['idle'];scene.frame_set(1)
bpy.context.view_layer.update();cam=scene.camera
anchor=world_to_camera_view(scene,cam,Vector((0,0,0)))
current_y=(1-anchor.y)*128;delta=112-current_y
cam.location+=cam.rotation_euler.to_matrix()@Vector((0,delta*(cam.data.ortho_scale*.8)/128,0))
bpy.context.view_layer.update();rig['revision']=2
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'hero-v1.blend'))
scene.render.filepath=str(SRC/'master-preview-r2.png');bpy.ops.render.render(write_still=True)
p=json.loads((SRC/'render-profile.json').read_text());p['ortho_scale']=cam.data.ortho_scale;p['camera_location']=list(cam.location);p['actual_foot_anchor']=[world_to_camera_view(scene,cam,Vector()).x*160,(1-world_to_camera_view(scene,cam,Vector()).y)*128];p['revision']=2
(SRC/'render-profile.json').write_text(json.dumps(p,indent=2))
