"""Refine the existing true-3D hero master for the static silhouette gate.

Only authored meshes/materials are changed. Camera, rig, actions and render scale
stay frozen. Superseded meshes are hidden in the editable master for comparison.
"""
import bpy
import math
import json
import shutil
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'art_source/linshui-quality/v1/characters/hero-v2'
MASTER = SOURCE / 'hero-v2.blend'
OUT = SOURCE / 'style-gate-v2'
OUT.mkdir(exist_ok=True)
BACKUP = OUT / 'hero-before-style-gate.blend'
if not BACKUP.exists():
    shutil.copy2(MASTER, BACKUP)
bpy.ops.wm.open_mainfile(filepath=str(MASTER))
scene = bpy.context.scene
rig = bpy.data.objects['HeroV2Rig']
turn = bpy.data.objects['RenderDirection']
camera = bpy.data.objects['SpriteCamera']

def mat(name, rgb, roughness=.92):
    result = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    result.diffuse_color = (*rgb, 1)
    result.use_nodes = True
    shader = next(n for n in result.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    shader.inputs['Base Color'].default_value = (*rgb, 1)
    shader.inputs['Roughness'].default_value = roughness
    return result

ivory = mat('Style gate • warm ivory', (.67,.645,.57))
ivory_lit = mat('Style gate • linen edge', (.78,.755,.68))
fold = mat('Style gate • shaded ivory', (.48,.49,.47))
blue = mat('Style gate • blue grey wool', (.155,.235,.31))
blue_light = mat('Style gate • raised blue grey', (.22,.30,.37))
blue_dark = mat('Style gate • deep blue grey', (.075,.125,.18))
leather = mat('Style gate • rubbed leather', (.25,.16,.09))
leather_light = mat('Style gate • leather edge', (.38,.255,.14))
metal = mat('Style gate • bronze', (.46,.35,.20), .64)
hair = mat('Style gate • ink hair', (.025,.028,.034))
hair_light = mat('Style gate • hair ridge', (.045,.052,.061))

superseded = [
    'Hair • ponytail', 'Controlled • scalp', 'Controlled • tied knot',
    'Waist • belt', 'Waist • small buckle',
    'Robe v2 • left crossing collar', 'Robe v2 • right undercollar',
]
for side in ('L','R'):
    superseded += [f'Sleeve • upper {side}', f'Sleeve v2 • cuff seam {side}',
                   f'Robe v2 • blue shoulder edging {side}',
                   f'Robe v2 • flared blue skirt {side}',
                   f'Robe v2 • white split panel {side}',
                   f'Robe v2 • skirt fold {side}']
for name in superseded:
    ob = bpy.data.objects.get(name)
    if ob:
        ob.hide_render = True
        ob.hide_set(True)
for ob in bpy.data.objects:
    if ob.name.startswith('Controlled • fringe ') or ob.name.startswith('Controlled • temple '):
        ob.hide_render = True
        ob.hide_set(True)
# The old torso's very wide upper ring was reading as a white scarf under the
# face. Narrow that source ring once; all other body vertices remain intact.
body = bpy.data.objects['Robe v2 • white fitted body']
if not body.get('style_gate_neck_tapered', False):
    for vertex in body.data.vertices:
        if vertex.co.z > 1.20:
            vertex.co.x *= .72
            vertex.co.y *= .77
    body['style_gate_neck_tapered'] = True

def geometry(name, verts, faces, material, bone):
    full = 'Style gate • '+name
    previous = bpy.data.objects.get(full)
    if previous:
        bpy.data.objects.remove(previous, do_unlink=True)
    mesh = bpy.data.meshes.new(full)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(full, mesh)
    scene.collection.objects.link(obj)
    mesh.materials.append(material)
    for face in mesh.polygons:
        face.use_smooth = True
    obj.parent = turn
    group = obj.vertex_groups.new(name=bone)
    group.add(list(range(len(mesh.vertices))), 1, 'REPLACE')
    obj.modifiers.new('Editable shared rig', 'ARMATURE').object = rig
    return obj

def ellipsoid(name, center, scale, material, bone, sides=24, rings=14):
    verts=[]; faces=[]
    for row in range(rings+1):
        phi=math.pi*row/rings
        for col in range(sides):
            ang=math.tau*col/sides
            verts.append((center[0]+scale[0]*math.sin(phi)*math.cos(ang),
                          center[1]+scale[1]*math.sin(phi)*math.sin(ang),
                          center[2]+scale[2]*math.cos(phi)))
    for row in range(rings):
        for col in range(sides):
            a=row*sides+col; b=row*sides+(col+1)%sides
            faces.append((a,b,b+sides,a+sides))
    return geometry(name, verts, faces, material, bone)

def tapered(name, path, widths, material, bone, sides=10):
    verts=[]; faces=[]
    for (x,y,z),width in zip(path,widths):
        for side in range(sides):
            ang=math.tau*side/sides
            verts.append((x+width*math.cos(ang),y+.55*width*math.sin(ang),z))
    for row in range(len(path)-1):
        for col in range(sides):
            a=row*sides+col; b=row*sides+(col+1)%sides
            faces.append((a,b,b+sides,a+sides))
    return geometry(name,verts,faces,material,bone)

# The low cap reveals the forehead; hair growth is carried by individual curved
# strands. A long divided ponytail makes S and SE silhouettes distinct.
ellipsoid('lower hair crown',(0,.058,1.624),(.184,.124,.105),hair,'head')
ellipsoid('high tie',(0,.175,1.719),(.048,.052,.043),hair_light,'head')
for sign in (-1,1):
    for i in range(5):
        x=sign*(.018+.031*i)
        tapered(f'swept lock {sign} {i}',
                [(x*.32,-.018,1.705-i*.006),
                 (x,-.105,1.675-i*.004),
                 (x+sign*.023,-.151,1.638-i*.008),
                 (x+sign*.04,-.167,1.61-i*.011)],
                [.015,.025,.018,.001],hair_light if i in (1,4) else hair,'head')
    tapered(f'sideburn {sign}',
            [(sign*.166,-.061,1.636),(sign*.194,-.105,1.525),
             (sign*.19,-.119,1.418)], [.03,.028,.001],hair,'head')
for i in range(7):
    x=(i-3)*.024
    tapered(f'ponytail strand {i}',
            [(x,.182,1.719),(x*1.3,.23,1.61),
             (x*1.5-.015,.29,1.47),(x*1.8-.028,.31,1.30),
             (x*2-.046,.28,1.135-.018*(i%3))],
            [.018,.028,.027,.022,.001],hair_light if i in (1,5) else hair,'hair')

# Full-volume upper sleeves, with curved taper and three readable fold planes.
for side,sign in [('L',-1),('R',1)]:
    rings=[(sign*.252,-.004,1.20,.052,.08),
           (sign*.266,-.007,1.16,.061,.11),
           (sign*.294,-.006,1.075,.073,.126),
           (sign*.332,-.008,.985,.076,.110),
           (sign*.35,-.01,.924,.067,.084)]
    verts=[]; faces=[]; segments=24
    for cx,cy,cz,rx,ry in rings:
        for k in range(segments):
            ang=math.tau*k/segments
            verts.append((cx+rx*math.cos(ang),cy+ry*math.sin(ang),cz))
    for row in range(len(rings)-1):
        for k in range(segments):
            a=row*segments+k; b=row*segments+(k+1)%segments
            faces.append((a,b,b+segments,a+segments))
    faces.append(tuple(range(segments-1,-1,-1)))
    faces.append(tuple((len(rings)-1)*segments+k for k in range(segments)))
    geometry(f'fabric sleeve {side}',verts,faces,ivory,'upper_arm.'+side)
    # The dark seam follows the sleeve surface; it does not drive motion.
    tapered(f'sleeve fold {side}',
            [(sign*.29,-.101,1.16),(sign*.33,-.126,1.09),
             (sign*.355,-.115,1.01)], [.006,.009,.001],fold,'upper_arm.'+side,8)
    tapered(f'sleeve highlight {side}',
            [(sign*.28,-.09,1.17),(sign*.30,-.123,1.085),
             (sign*.33,-.105,1.00)], [.009,.009,.001],ivory_lit,'upper_arm.'+side,8)
    # Woven cuff over the pre-existing dark wrist wrap.
    cuff=[]; cuff_faces=[]
    for z in (.948,.928):
        for k in range(16):
            ang=math.tau*k/16
            cuff.append((sign*.35+.10*math.cos(ang),-.012+.094*math.sin(ang),z))
    for k in range(16):
        a=k; b=(k+1)%16
        cuff_faces.append((a,b,b+16,a+16))
    geometry(f'woven cuff {side}',cuff,cuff_faces,leather,'forearm.'+side)

# Collar pieces curve with the torso instead of crossing as flat giant X strips.
geometry('left outer lapel',
         [(-.19,-.101,1.238),(-.126,-.143,1.244),
          (.068,-.183,.987),(.117,-.161,.983),
          (-.02,-.198,1.043),(-.105,-.178,1.172)],
         [(0,1,5),(1,2,4,5),(2,3,4)],blue,'spine')
geometry('right white lapel',
         [(.175,-.106,1.236),(.113,-.143,1.246),
          (-.071,-.185,1.033),(-.11,-.168,1.018),
          (.003,-.203,1.073),(.096,-.172,1.183)],
         [(0,1,5),(1,2,4,5),(2,3,4)],ivory_lit,'spine')
for side,sign in [('L',-1),('R',1)]:
    geometry(f'blue shoulder {side}',
             [(sign*.14,-.077,1.26),(sign*.244,-.04,1.232),
              (sign*.236,-.124,1.055),(sign*.185,-.152,1.074)],
             [(0,1,2,3)],blue,'spine')

# Curved skirt panels with hem thickness and coarse folds. Keep separate bone
# bindings on each side so the same controlled rig can animate them later.
def skirt_panel(name, sign, inner_top, outer_top, inner_bottom, outer_bottom,
                top_z, bottom_z, y_top, y_bottom, material, bone):
    verts=[]; faces=[]; rows=7; cols=7
    for row in range(rows):
        t=row/(rows-1)
        z=top_z+(bottom_z-top_z)*t
        inner=inner_top+(inner_bottom-inner_top)*t
        outer=outer_top+(outer_bottom-outer_top)*t
        for col in range(cols):
            u=col/(cols-1)
            x=sign*(inner+(outer-inner)*u)
            # Small, regular sculpted folds and irregular hem, no frame offsets.
            wave=.014*math.sin(math.pi*t)*math.sin(u*math.tau*2)
            hem=.012*math.sin(u*math.tau*1.5)*t*t
            y=y_top+(y_bottom-y_top)*t+wave
            verts.append((x,y,z+hem))
    for row in range(rows-1):
        for col in range(cols-1):
            a=row*cols+col
            faces.append((a,a+1,a+1+cols,a+cols))
    # Two-sided back surface makes the editable skirt read as cloth volume.
    front_count=len(verts)
    verts += [(x,y+.022,z) for x,y,z in verts]
    for face in list(faces):
        faces.append(tuple(front_count+i for i in reversed(face)))
    for row in range(rows-1):
        for col in (0,cols-1):
            a=row*cols+col
            faces.append((a,a+cols,a+cols+front_count,a+front_count))
    for col in range(cols-1):
        a=(rows-1)*cols+col
        faces.append((a,a+1,a+1+front_count,a+front_count))
    geometry(name,verts,faces,material,bone)

for side,sign in [('L',-1),('R',1)]:
    skirt_panel(f'outer skirt {side}',sign,.015,.23,.012,.407,
                .785,.265,-.071,-.099,blue,'coat.'+side)
    skirt_panel(f'white front fold {side}',sign,.011,.141,.021,.217,
                .775,.282,-.169,-.209,ivory,'coat.'+side)
    tapered(f'white skirt crease {side}',
            [(sign*.132,-.175,.73),(sign*.17,-.192,.54),
             (sign*.20,-.211,.293)], [.007,.009,.001],fold,'coat.'+side,8)
    tapered(f'blue hem edge {side}',
            [(sign*.263,-.092,.41),(sign*.32,-.103,.33),
             (sign*.403,-.101,.268)], [.006,.009,.001],blue_light,'coat.'+side,8)

# Wrapped belt with front band, raised edge, compact bronze closure and knot.
for name,z0,z1,radius,material in [
    ('main woven belt',.77,.855,.258,leather),
    ('upper belt rim',.843,.855,.261,leather_light),
    ('lower belt rim',.77,.783,.259,leather_light)]:
    verts=[]; faces=[]; segments=24
    for z in (z0,z1):
        for k in range(segments):
            a=math.tau*k/segments
            verts.append((radius*math.cos(a),.151*math.sin(a),z))
    for k in range(segments):
        a=k; b=(k+1)%segments
        faces.append((a,b,b+segments,a+segments))
    geometry(name,verts,faces,material,'pelvis')
ellipsoid('belt closure',(.045,-.16,.814),(.033,.015,.026),metal,'pelvis',16,10)
tapered('belt hanging cord',[(.10,-.158,.80),(.123,-.16,.66),
                              (.15,-.18,.47)], [.012,.012,.004],leather_light,'pelvis',8)

# The camera/scale are frozen by the P1 contract; report both before render.
assert abs(camera.data.ortho_scale-3.1)<1e-6
scene.camera=camera
for p in rig.pose.bones:
    p.matrix_basis.identity()
rig.animation_data.action=bpy.data.actions['controlled_idle']
scene.frame_set(1)
anchor=world_to_camera_view(scene,camera,Vector((0,0,0)))
assert abs(anchor.x*160-80)<.01 and abs((1-anchor.y)*128-112)<.01
scene.render.resolution_x=640
scene.render.resolution_y=512
scene.render.resolution_percentage=100
bpy.ops.wm.save_as_mainfile(filepath=str(MASTER))
for direction,angle in [('s',0),('se',math.pi/4)]:
    turn.rotation_euler.z=angle
    scene.render.filepath=str(OUT/f'{direction}-idle-source-01.png')
    bpy.ops.render.render(write_still=True)
(OUT/'source-record.json').write_text(json.dumps(dict(
    status='static_style_candidate_unaccepted',
    parent='style-gate-v2/hero-before-style-gate.blend',
    master='hero-v2.blend',
    method='incremental editable 3D mesh and material revision; same rig and frozen camera',
    changed=['hair silhouette','sleeve volume','skirt volume','collar','belt'],
    unchanged=['camera 35 degrees','orthographic scale 3.1','root anchor 80,112',
               'animation actions','right-hand sword','left-hip sheath'],
    renders=['s-idle-source-01.png','se-idle-source-01.png'],
    visual_approved=False,
    local_review='rejected after normal-size Godot comparison: still reads as a simplified model'),indent=2),encoding='utf-8')
print('Style gate static S/SE source rendered; visual acceptance pending.')
