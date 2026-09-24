"""Incremental editable 3D source revision; never assembles raster body parts.

Run in Blender. Static sample first; --motion also renders the bounded motion set.
The previous master is retained once, and hidden source meshes stay editable.
"""
import bpy
import math
import json
import shutil
import sys
from pathlib import Path
from mathutils import Vector, Matrix, Quaternion
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art_source/linshui-quality/v1/characters/hero-v2'
MASTER = SOURCE / 'hero-v2.blend'
OUT = SOURCE / 'controlled-rig-sample-v1'
OUT.mkdir(exist_ok=True)
backup = OUT / 'hero-before-controlled-refinement.blend'
if not backup.exists():
    shutil.copy2(MASTER, backup)
bpy.ops.wm.open_mainfile(filepath=str(MASTER))
scene = bpy.context.scene
rig = bpy.data.objects['HeroV2Rig']
turn = bpy.data.objects['RenderDirection']
rig.animation_data.action = None
for p in rig.pose.bones:
    p.matrix_basis = Matrix.Identity(4)
turn.rotation_euler = (0, 0, 0)

def material(name, color):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    m.diffuse_color = (*color, 1)
    node = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    node.inputs['Base Color'].default_value = (*color, 1)
    node.inputs['Roughness'].default_value = .86
    return m

hair = material('Controlled • hair ink', (.018, .024, .033))
hair_light = material('Controlled • hair planes', (.04, .052, .065))
skin = material('Controlled • skin', (.68, .47, .33))
lip = material('Controlled • lip', (.30, .17, .13))
ivory = bpy.data.materials['Linen ivory']
ink = bpy.data.materials['Face line']

# Hide only explicitly superseded source pieces, retain them in the .blend.
prefixes = ('Hair v2', 'Hair • temple', 'Face • eye', 'Face • brow')
for ob in bpy.data.objects:
    if ob.name.startswith(prefixes):
        ob.hide_render = True
        ob.hide_set(True)

def bind(ob, bone):
    ob.parent = turn
    group = ob.vertex_groups.new(name=bone)
    group.add(list(range(len(ob.data.vertices))), 1, 'REPLACE')
    ob.modifiers.new('Shared controlled rig', 'ARMATURE').object = rig
    return ob

def mesh(name, verts, faces, mat, bone='head'):
    name = 'Controlled • ' + name
    # Reruns update this revision's own named meshes, not unrelated source.
    old = bpy.data.objects.get(name)
    if old:
        bpy.data.objects.remove(old, do_unlink=True)
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    ob = bpy.data.objects.new(name, data)
    scene.collection.objects.link(ob)
    data.materials.append(mat)
    for poly in data.polygons:
        poly.use_smooth = True
    return bind(ob, bone)

def sphere(name, center, scale, mat, bone='head'):
    verts, faces = [], []
    rings, sides = 16, 24
    for j in range(rings + 1):
        phi = math.pi * j / rings
        for i in range(sides):
            theta = math.tau * i / sides
            verts.append((center[0] + scale[0]*math.sin(phi)*math.cos(theta),
                          center[1] + scale[1]*math.sin(phi)*math.sin(theta),
                          center[2] + scale[2]*math.cos(phi)))
    for j in range(rings):
        for i in range(sides):
            a = j*sides+i
            b = j*sides+(i+1)%sides
            faces.append((a,b,b+sides,a+sides))
    return mesh(name, verts, faces, mat, bone)

def strand(name, points, widths, mat=hair, bone='head'):
    verts, faces = [], []
    for (x,y,z), width in zip(points,widths):
        for i in range(8):
            a = math.tau*i/8
            verts.append((x+width*math.cos(a),y+width*.42*math.sin(a),z))
    for row in range(len(points)-1):
        for i in range(8):
            a=row*8+i; b=row*8+(i+1)%8
            faces.append((a,b,b+8,a+8))
    return mesh(name,verts,faces,mat,bone)

sphere('scalp', (0,.05,1.615), (.208,.165,.14), hair)
sphere('tied knot', (0,.15,1.742), (.075,.073,.065), hair)
# Layered swept locks with tapering ends, instead of rectangular fringe plates.
for side in (-1,1):
    for i in range(4):
        x=side*(.025+i*.036)
        strand(f'fringe {side} {i}',
               [(x*.7,-.07,1.735-i*.006),(x,-.147,1.666),
                (x+side*.035,-.182,1.60-i*.011),
                (x+side*.062,-.181,1.548-i*.016)],
               [.032,.042,.024,.001],hair_light if i==1 else hair)
    strand(f'temple {side}',[(side*.178,-.08,1.65),
           (side*.20,-.125,1.54),(side*.175,-.132,1.365)], [.037,.037,.002])
    sphere(f'ear {side}',(side*.193,-.014,1.455),(.026,.03,.045),skin)
    # Almond outline, narrow ivory and iris: separate readable facial planes.
    sphere(f'eyelid {side}',(side*.076,-.184,1.485),(.042,.014,.019),ink)
    sphere(f'eye light {side}',(side*.076,-.195,1.485),(.031,.005,.011),ivory)
    sphere(f'iris {side}',(side*.069,-.201,1.485),(.013,.004,.013),ink)
    strand(f'brow {side}',[(side*.042,-.187,1.523),
           (side*.095,-.177,1.528),(side*.115,-.17,1.519)], [.008,.01,.002],ink)
sphere('nose',(0,-.19,1.435),(.021,.026,.035),skin)
sphere('mouth',(0,-.178,1.385),(.027,.006,.006),lip)

# A real foot bone lets the sole remain level while the shin bends.
bpy.context.view_layer.objects.active=rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for side,sign in [('L',-1),('R',1)]:
    name='foot.'+side
    if name not in rig.data.edit_bones:
        b=rig.data.edit_bones.new(name)
        b.head=(sign*.14,-.01,.13)
        b.tail=(sign*.14,-.16,.13)
        b.parent=rig.data.edit_bones['shin.'+side]
bpy.ops.object.mode_set(mode='OBJECT')
rig.select_set(False)
for side in ('L','R'):
    ob=bpy.data.objects['Boot • foot '+side]
    ob.vertex_groups.clear()
    ob.vertex_groups.new(name='foot.'+side).add(list(range(len(ob.data.vertices))),1,'REPLACE')

def orient(name, head, tail):
    pb=rig.pose.bones[name]
    rest=pb.bone
    rotation=(rest.tail_local-rest.head_local).rotation_difference(tail-head)
    pb.matrix=Matrix.Translation(head) @ rotation.to_matrix().to_4x4() @ rest.matrix_local.to_quaternion().to_matrix().to_4x4()
    bpy.context.view_layer.update()

def leg(side, sign, y, lift):
    hip=Vector((sign*.13,0,.64))
    ankle=Vector((sign*.14,y,.13+lift))
    direction=(ankle-hip).normalized()
    d=(ankle-hip).length
    a=(rig.data.bones['thigh.'+side].tail_local-rig.data.bones['thigh.'+side].head_local).length
    b=(rig.data.bones['shin.'+side].tail_local-rig.data.bones['shin.'+side].head_local).length
    along=(a*a-b*b+d*d)/(2*d)
    bend=Vector((0,-1,0)); bend=(bend-direction*bend.dot(direction)).normalized()
    knee=hip+direction*along+bend*math.sqrt(max(0,a*a-along*along))
    orient('thigh.'+side,hip,knee)
    orient('shin.'+side,knee,ankle)
    orient('foot.'+side,ankle,ankle+Vector((0,-.15,0)))

def new_action(name):
    action=bpy.data.actions.get(name) or bpy.data.actions.new(name)
    rig.animation_data.action=action
    action.use_fake_user=True
    return action

contacts=[]
for action_name,count in [('controlled_idle',4),('controlled_walk',8),('controlled_thrust',12)]:
    new_action(action_name)
    for frame in range(1,count+1):
        scene.frame_set(frame)
        for p in rig.pose.bones:
            p.rotation_mode='QUATERNION'
            p.matrix_basis=Matrix.Identity(4)
        if action_name=='controlled_walk':
            rig.pose.bones['pelvis'].location.y=-.05
            bpy.context.view_layer.update()
            for side,sign,offset in [('L',-1,0),('R',1,.5)]:
                phase=((frame-1)/8+offset)%1
                y=-.15+.6*phase if phase<.5 else .15-.6*(phase-.5)
                lift=0 if phase<.5 else .10*math.sin(math.tau*(phase-.5))
                leg(side,sign,y,lift)
                contacts.append(dict(frame=frame,side=side,stance=phase<.5,ankle=[sign*.14,y,.13+lift]))
                p=rig.pose.bones['upper_arm.'+side]
                p.rotation_quaternion=Quaternion((1,0,0),sign*.20*math.cos(math.tau*(frame-1)/8))
                rig.pose.bones['coat.'+side].rotation_quaternion=Quaternion((1,0,0),sign*.08*math.cos(math.tau*(frame-1)/8-.4))
        elif action_name=='controlled_thrust':
            # Forward sword direction is determined in rig/world space, not by
            # guessing Euler signs on a downward-oriented local bone axis.
            amount=[0,.08,.22,.48,.80,1,1,.92,.64,.32,.10,0][frame-1]
            shoulder=Vector((.25,0,1.20))
            wrist=Vector((.35,-.02-.36*amount,.77+.24*amount))
            delta=wrist-shoulder
            axis=delta.normalized()
            a=rig.data.bones['upper_arm.R'].length
            b=rig.data.bones['forearm.R'].length
            along=(a*a-b*b+delta.length_squared)/(2*delta.length)
            bend=Vector((1,0,0)); bend=(bend-axis*bend.dot(axis)).normalized()
            elbow=shoulder+axis*along+bend*math.sqrt(max(0,a*a-along*along))
            orient('upper_arm.R',shoulder,elbow)
            orient('forearm.R',elbow,wrist)
        for p in rig.pose.bones:
            p.keyframe_insert('location',frame=frame)
            p.keyframe_insert('rotation_quaternion',frame=frame)
            p.keyframe_insert('scale',frame=frame)

camera=bpy.data.objects['SpriteCamera']
pitch=math.radians(35)
target=Vector((0,0,0))
camera.location=Vector((0,-6,6*math.tan(pitch)))
camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.ortho_scale=3.1
camera.data.shift_x=0
camera.data.shift_y=0
scene.camera=camera
scene.render.resolution_x=640
scene.render.resolution_y=512
scene.render.resolution_percentage=100
# Single camera calibration to fixed ground root (80,112), never per frame.
camera.location+=camera.rotation_euler.to_matrix() @ Vector((0,(112/128-.5)*(3.1/1.25),0))
bpy.context.view_layer.update()
anchor=world_to_camera_view(scene,camera,Vector((0,0,0)))
assert abs(anchor.x*160-80)<.01 and abs((1-anchor.y)*128-112)<.01
scene.render.engine='CYCLES'
scene.cycles.samples=24
rig.animation_data.action=bpy.data.actions['controlled_idle']
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(MASTER))
jobs=[('s','controlled_idle',1),('se','controlled_idle',1)]
if '--motion' in sys.argv:
    jobs += [('s','controlled_walk',f) for f in range(1,9)]
    jobs += [('se','controlled_thrust',f) for f in range(1,13)]
for direction,action,frame in jobs:
    turn.rotation_euler.z=0 if direction=='s' else math.pi/4
    rig.animation_data.action=bpy.data.actions[action]
    scene.frame_set(frame)
    scene.render.filepath=str(OUT/f'{direction}-{action}-{frame:02}.png')
    bpy.ops.render.render(write_still=True)
(OUT/'source-record.json').write_text(json.dumps(dict(status='candidate_not_accepted',
    method='existing true 3D master refinement and controlled skeletal animation; offline 2D output',
    user_choice='保留当前造型，改用可控骨骼动画验证',
    camera_pitch=35,canvas=[160,128],source_canvas=[640,512],root_anchor=[80,112],
    per_frame_image_transform=False,contacts=contacts,rendered=jobs,
    limitations=['Unapproved source silhouette/materials','Motion and weapon trajectory require visual review',
                  'No completed pixel revision master or final animation acceptance']),ensure_ascii=False,indent=2),encoding='utf-8')
print('Controlled skeletal sample rendered; visual gate remains unaccepted.')
