"""Blender-only initial authored CHR-01 master. Never overwrite an existing master."""
import bpy, math, json, sys
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'art_source/linshui-quality/v1/characters/hero'
SOURCE.mkdir(parents=True,exist_ok=True)
MASTER=SOURCE/'hero-v1.blend'
if MASTER.exists(): raise RuntimeError('Master exists: revise in place; creation refused')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def mat(name,color):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.88
    return m
blue=mat('Robe • storm blue',(.19,.28,.34));edge=mat('Robe • edge',(.12,.19,.23))
ivory=mat('Inner linen',(.77,.74,.63));skin=mat('Warm skin',(.68,.45,.30))
hair=mat('Ink hair',(.035,.042,.049));hairlight=mat('Hair facets',(.065,.074,.078))
boots=mat('Cloth boots',(.045,.058,.066));pants=mat('Charcoal trousers',(.09,.12,.14))
leather=mat('Belt and scabbard',(.20,.12,.07));metal=mat('Sword steel',(.52,.61,.64))
dark=mat('Eyes and brows',(.015,.022,.026));white=mat('Eye whites',(.80,.76,.66))
bronze=mat('Muted brass',(.39,.30,.13))
parts=[]

def bind(obj,bone):
    vg=obj.vertex_groups.new(name=bone);vg.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    mod=obj.modifiers.new('Shared hero rig','ARMATURE');mod.object=rig
    parts.append(obj);return obj

def mesh(name,verts,faces,material,bone=None):
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.data.materials.append(material)
    if bone: bind(ob,bone)
    return ob

def ell(name,loc,scale,material,bone):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=loc)
    ob=bpy.context.object;ob.name=name;ob.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    # Bake vertices to rest-world coordinates before skinning.
    for v in ob.data.vertices:v.co+=ob.location
    ob.location=(0,0,0);ob.data.materials.append(material);return bind(ob,bone)

def loft(name,rings,material,bone,segments=12):
    verts=[]
    for x,y,z,rx,ry in rings:
        verts += [(x+rx*math.cos(i*2*math.pi/segments),y+ry*math.sin(i*2*math.pi/segments),z) for i in range(segments)]
    faces=[tuple(range(segments-1,-1,-1))]
    for r in range(len(rings)-1):
        for i in range(segments):
            a=r*segments+i;b=r*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
    faces.append(tuple((len(rings)-1)*segments+i for i in range(segments)))
    return mesh(name,verts,faces,material,bone)

# Anatomical master: all articulated parts use one armature; no mirrored atlas directions.
arm=bpy.data.armatures.new('YeWuchenRig');rig=bpy.data.objects.new('YeWuchenRig',arm)
bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
    b=arm.edit_bones.new(name);b.head=head;b.tail=tail
    if parent:b.parent=arm.edit_bones[parent]
bone('root',(0,0,0),(0,0,.2))
bone('pelvis',(0,0,.70),(0,0,.86),'root');bone('spine',(0,0,.86),(0,0,1.20),'pelvis')
bone('head',(0,0,1.20),(0,0,1.65),'spine')
for side,s in [('L',-1),('R',1)]:
    bone('upper_arm.'+side,(s*.25,0,1.18),(s*.34,-.01,.97),'spine')
    bone('forearm.'+side,(s*.34,-.01,.97),(s*.34,-.05,.76),'upper_arm.'+side)
    bone('thigh.'+side,(s*.12,0,.74),(s*.13,0,.43),'pelvis')
    bone('shin.'+side,(s*.13,0,.43),(s*.13,0,.13),'thigh.'+side)
    bone('coat.'+side,(s*.10,.025,.80),(s*.22,.04,.39),'pelvis')
bone('ponytail',(0,.15,1.56),(0,.22,1.18),'head')
bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
loft('Torso tailored robe',[(0,0,.78,.20,.12),(0,0,.91,.21,.135),(0,0,1.12,.28,.15),(0,0,1.22,.22,.12)],blue,'spine')
loft('Waist sash',[(0,0,.76,.21,.14),(0,0,.83,.215,.145)],leather,'pelvis')
ell('Neck',(0,0,1.25),(.09,.085,.13),skin,'head')
ell('Face',(0,-.012,1.46),(.205,.16,.225),skin,'head')
ell('Hair cap',(0,.025,1.53),(.215,.166,.195),hair,'head')
# Lower face stays visible under cap. Faceted forehead locks, sideburns and knot.
for x,z,l in [(-.16,1.58,.20),(-.085,1.65,.23),(.01,1.67,.18),(.09,1.64,.18),(.165,1.56,.23)]:
    mesh('Forelock',[(x-.055,-.151,z),(x+.057,-.155,z+.01),(x+.035,-.182,z-l),(x-.018,-.186,z-l*.85)],[(0,1,2,3)],hairlight,'head')
ell('Topknot',(0,.09,1.715),(.12,.12,.10),hair,'head')
ell('Hair tie',(0,.185,1.65),(.075,.045,.06),blue,'head')
loft('Bound ponytail',[(0,.16,1.63,.08,.08),(0,.23,1.48,.095,.07),(.03,.26,1.28,.06,.05),(.08,.25,1.17,.01,.01)],hair,'ponytail')
for s in [-1,1]:
    ell('Ear',(s*.203,0,1.44),(.035,.04,.065),skin,'head')
    ell('Eye white',(s*.082,-.154,1.455),(.050,.014,.030),white,'head')
    ell('Eye pupil',(s*.083,-.167,1.455),(.021,.009,.025),dark,'head')
    ell('Eyebrow',(s*.082,-.157,1.495),(.053,.009,.009),dark,'head')
ell('Nose',(0,-.173,1.40),(.026,.035,.028),skin,'head')
ell('Mouth',(0,-.158,1.353),(.035,.006,.006),leather,'head')
# Crossed lapels and visible inner collar, geometry rather than baked highlights.
mesh('Inner cross collar',[(-.16,-.135,1.20),(0,-.16,1.05),(.16,-.135,1.20),(.11,-.158,.88),(-.09,-.158,.88)],[(0,1,2,3,4)],ivory,'spine')
mesh('Left lapel',[(-.19,-.14,1.21),(-.13,-.16,1.23),(.08,-.17,.88),(.015,-.171,.88)],[(0,1,2,3)],edge,'spine')
mesh('Right lapel',[(.18,-.14,1.21),(.12,-.16,1.23),(-.04,-.171,1.01),(.005,-.174,.94)],[(0,1,2,3)],blue,'spine')
for side,s in [('L',-1),('R',1)]:
    loft('Sleeve '+side,[(s*.25,0,1.17,.12,.12),(s*.32,-.01,1.02,.14,.13),(s*.34,-.01,.94,.12,.12)],blue,'upper_arm.'+side)
    loft('Linen cuff '+side,[(s*.34,-.01,.96,.11,.105),(s*.34,-.03,.88,.09,.09)],ivory,'forearm.'+side)
    loft('Wrist binding '+side,[(s*.34,-.03,.89,.083,.075),(s*.34,-.045,.79,.065,.07)],boots,'forearm.'+side)
    ell('Hand '+side,(s*.34,-.05,.755),(.062,.067,.075),skin,'forearm.'+side)
    loft('Trouser '+side,[(s*.12,0,.75,.105,.11),(s*.13,0,.50,.12,.11),(s*.13,0,.39,.095,.09)],pants,'thigh.'+side)
    loft('Boot shaft '+side,[(s*.13,0,.39,.077,.08),(s*.13,0,.12,.08,.09)],boots,'shin.'+side)
    ell('Boot foot '+side,(s*.13,-.058,.08),(.092,.15,.075),boots,'shin.'+side)
    mesh('Split robe tail '+side,[(s*.02,-.145,.78),(s*.20,-.11,.78),(s*.29,-.11,.40),(s*.06,-.18,.43),(s*.02,.11,.78),(s*.20,.13,.78),(s*.29,.16,.40),(s*.06,.19,.43)],[(0,1,2,3),(4,7,6,5),(1,5,6,2),(0,3,7,4),(3,2,6,7)],blue,'coat.'+side)
    mesh('Tail hem '+side,[(s*.06,-.183,.43),(s*.29,-.113,.40),(s*.29,-.113,.44),(s*.06,-.183,.47)],[(0,1,2,3)],ivory,'coat.'+side)
ell('Sash knot',(-.06,-.16,.80),(.055,.035,.05),bronze,'pelvis')
# Right-handed blade held down at rest; bone motion supplies thrust, never switches hand.
loft('Sword grip',[(.34,-.075,.70,.025,.026),(.34,-.075,.82,.025,.026)],leather,'forearm.R',8)
ell('Sword guard',(.34,-.075,.68),(.09,.025,.023),bronze,'forearm.R')
mesh('Single straight steel blade',[(.305,-.075,.67),(.34,-.09,.67),(.375,-.075,.67),(.34,-.06,.67),(.32,-.075,.08),(.34,-.085,.08),(.36,-.075,.08),(.34,-.065,.08),(.34,-.075,.015)],[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,8),(5,6,8),(6,7,8),(7,4,8)],metal,'forearm.R')
loft('Left hip scabbard',[(-.255,.02,.81,.035,.035),(-.28,.06,.45,.032,.032),(-.30,.09,.17,.025,.026)],leather,'pelvis',8)

for pb in rig.pose.bones:pb.rotation_mode='XYZ'
actions={'idle':4,'walk':8,'thrust':12}
for action,count in actions.items():
    rig.animation_data_create();rig.animation_data.action=bpy.data.actions.new(action)
    for frame in range(1,count+1):
        t=(frame-1)/count;phase=2*math.pi*t
        for pb in rig.pose.bones:pb.rotation_euler=(0,0,0);pb.location=(0,0,0)
        if action=='idle':
            rig.pose.bones['spine'].rotation_euler.x=.015*math.sin(phase)
            rig.pose.bones['coat.L'].rotation_euler.x=.025*math.sin(phase)
        elif action=='walk':
            for side,s in [('L',1),('R',-1)]:
                rig.pose.bones['thigh.'+side].rotation_euler.x=s*.42*math.sin(phase)
                rig.pose.bones['shin.'+side].rotation_euler.x=-max(0,s*math.cos(phase))*.42
                rig.pose.bones['upper_arm.'+side].rotation_euler.x=-s*.35*math.sin(phase)
                rig.pose.bones['coat.'+side].rotation_euler.x=s*.16*math.sin(phase+.3)
            rig.pose.bones['pelvis'].location.z=.015*(1-math.cos(phase*2))
        else:
            intensity=[0,.10,.25,.4,.8,1,1,.9,.6,.3,.1,0][frame-1]
            rig.pose.bones['upper_arm.R'].rotation_euler.x=-1.45*intensity
            rig.pose.bones['forearm.R'].rotation_euler.x=-.12*intensity
            rig.pose.bones['upper_arm.L'].rotation_euler.x=.45*intensity
            rig.pose.bones['thigh.R'].rotation_euler.x=.50*intensity
            rig.pose.bones['thigh.L'].rotation_euler.x=-.4*intensity
            rig.pose.bones['spine'].rotation_euler.x=.13*intensity
            rig.pose.bones['coat.R'].rotation_euler.x=.2*intensity
        rig.pose.bones['ponytail'].rotation_euler.x=.07*math.sin(phase+.6)
        for pb in rig.pose.bones:
            pb.keyframe_insert('rotation_euler',frame=frame);pb.keyframe_insert('location',frame=frame)
    rig.animation_data.action.use_fake_user=True

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16
scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.render.resolution_x=640;scene.render.resolution_y=512;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.render.fps=12
world=bpy.data.worlds.new('Neutral studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.70,.75,1);world.node_tree.nodes['Background'].inputs[1].default_value=.65;scene.world=world
for name,loc,power,size in [('Key',(-3,-4,6),350,5),('Fill',(3,-1,3),100,4)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
    ob=bpy.data.objects.new(name,data);scene.collection.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector((0,0,.9))-ob.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('SpriteCamera');cam=bpy.data.objects.new('SpriteCamera',data);scene.collection.objects.link(cam)
target=Vector((0,0,1.04));cam.location=target+Vector((0,-6,5.4024));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();data.type='ORTHO';data.ortho_scale=2.5625;scene.camera=cam
rig.animation_data.action=bpy.data.actions['idle'];scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(MASTER))
(SOURCE/'render-profile.json').write_text(json.dumps({'frame_size':[160,128],'foot_anchor':[80,112],'body_height_target':[78,82],'source_resolution':[640,512],'directions':{'s':0,'se':-45},'actions':actions,'camera_pitch':42,'runtime':'2D sprite, camera-facing plane without GPU billboard','status':'first master, visual review pending'},indent=2))
scene.render.filepath=str(SOURCE/'master-preview.png');bpy.ops.render.render(write_still=True)
