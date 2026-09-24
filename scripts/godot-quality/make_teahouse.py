"""Authored post-and-beam tea shop, curved tile courses, lattice joinery.
Initial creation only. Existing editable master is never overwritten.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'art_source/linshui-quality/v1/environment/tea-house'
OUT=ROOT/'godot/linshui-quality/assets/environment';SRC.mkdir(parents=True,exist_ok=True);OUT.mkdir(parents=True,exist_ok=True)
MASTER=SRC/'tea-house-v1.blend'
if MASTER.exists():raise RuntimeError('Existing master protected; revise it instead')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
random.seed(24)
def material(name,color,rough):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    p=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough
    return m
wood=material('Old timber',(.22,.14,.08),.86);end=material('Timber endgrain',(.29,.20,.12),.89)
plaster=material('Lime plaster',(.67,.65,.55),.94);stone=material('Foundation stone',(.32,.35,.33),.91)
dark=material('Interior recess',(.055,.047,.034),.98)
tiles=[material('Tile gray '+str(i),(.10+i*.011,.14+i*.010,.16+i*.010),.79) for i in range(5)]
collections={}
for n in ['walls','roof','facade','foundation']:
    col=bpy.data.collections.new(n);bpy.context.scene.collection.children.link(col);collections[n]=col
current=collections['walls']
def move(ob):
    for col in list(ob.users_collection):col.objects.unlink(ob)
    current.objects.link(ob)
def box(name,loc,size,mat,bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);ob=bpy.context.object;ob.name=name;ob.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);move(ob);ob.data.materials.append(mat)
    if bevel:
        b=ob.modifiers.new('Worn edges','BEVEL');b.width=bevel;b.segments=2
        ob.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return ob
def mesh(name,verts,faces,mat):
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();ob=bpy.data.objects.new(name,me);current.objects.link(ob);me.materials.append(mat)
    # Deterministic planar UVs: 192px/m for 1024² maps.
    uv=me.uv_layers.new(name='UVMap')
    for poly in me.polygons:
        axis=max(range(3),key=lambda i:abs(poly.normal[i]));axes=[i for i in range(3) if i!=axis]
        for li in poly.loop_indices:
            co=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(co[axes[0]]*.1875,co[axes[1]]*.1875)
    return ob
def beam(name,a,b,width,depth,mat):
    mid=(Vector(a)+Vector(b))*.5;d=Vector(b)-Vector(a)
    ob=box(name,mid,(width,depth,d.length),mat,.015);ob.rotation_euler=d.to_track_quat('Z','Y').to_euler();return ob

current=collections['foundation']
box('Raised stone plinth',(0,0,.12),(6.3,5.3,.24),stone,.055)
for x in [-3,-1.05,1.05,3]:
    for y in [-2.5,2.5]:box('Column stone shoe',(x,y,.33),(.39,.39,.42),stone,.035)
for i in range(3):box('Door threshold step',(0,-2.75-i*.17,.12-i*.03),(2.1,.36,.16),stone,.025)
current=collections['walls']
for x in [-3,3]:box('Side lime infill',(x,0,1.58),(.16,4.85,2.6),plaster)
box('Back lime infill',(0,2.5,1.58),(5.85,.16,2.6),plaster)
for x in [-3,-1.05,1.05,3]:
    for y in [-2.5,2.5]:box('Main post',(x,y,1.72),(.23,.23,2.9),wood)
for y in [-2.5,2.5]:
    for z in [.52,2.80,3.04]:box('Cross beam',(0,y,z),(6.2,.23,.21),wood)
for x in [-3,3]:
    box('Side tie beam',(x,0,2.97),(.23,5.3,.23),wood)
    mesh('Gable plaster',[(x,-2.5,3),(x,2.5,3),(x,0,4.15)],[(0,1,2)],plaster)
    beam('Gable kingpost',(x,0,3),(x,0,4.15),.19,.21,wood)
for x in [-3,-1.05,1.05,3]:
    for y in [-2.5,2.5]:
        for s in [-1,1]:
            if abs(x+s*.45)<3.2:beam('Knee brace',(x,y,2.43),(x+s*.45,y,2.86),.13,.14,wood)

current=collections['facade']
for x in [-2.0,2.0]:
    box('Window bay plaster',(x,-2.5,1.52),(1.7,.18,2.45),plaster)
    box('Window inset shadow',(x,-2.61,1.81),(1.40,.035,1.40),dark,0)
    for dx in [-.75,.75]:box('Window upright',(x+dx,-2.68,1.80),(.12,.14,1.6),wood)
    for z in [1.03,2.57]:box('Window header sill',(x,-2.71,z),(1.72,.24,.12),end)
    for i in range(7):box('Lattice vertical',(x-.61+i*.203,-2.68,1.8),(.038,.05,1.38),wood,.004)
    for i in range(6):box('Lattice horizontal',(x,-2.71,1.16+i*.25),(1.35,.05,.032),wood,.004)
    for i in range(5):box('Low shutter panel',(x-.61+i*.30,-2.65,.78),(.28,.09,.39),wood,.01)
box('Dark door recess',(0,-2.53,1.48),(1.85,.04,2.4),dark,0)
for x in [-1,1]:box('Door jamb',(x,-2.69,1.45),(.13,.19,2.45),wood)
box('Door lintel',(0,-2.69,2.68),(2.15,.25,.18),wood)
for side in [-1,1]:
    for i in range(5):box('Door plank',(side*(.09+i*.183),-2.64,1.45),(.174,.10,2.29),end,.008)
    for z in [.55,1.2,2.38]:box('Door horizontal rail',(side*.49,-2.72,z),(.86,.11,.09),wood,.012)
    bpy.ops.mesh.primitive_torus_add(major_radius=.065,minor_radius=.012,major_segments=12,minor_segments=6,location=(side*.15,-2.83,1.38),rotation=(math.pi/2,0,0));ob=bpy.context.object;ob.name='Forged door ring';ob.data.materials.append(tiles[0]);move(ob)

current=collections['roof']
def roof_z(y):
    t=abs(y)/3.05
    return 4.15-1.30*t+.30*t*t*t
# Rafters, curved fascia and physically overlapping barrel tiles; silhouette is real geometry.
for x in [i*.30-3.3 for i in range(23)]:
    for side in [-1,1]:
        for k in range(5):
            y1=side*k*3.05/5;y2=side*(k+1)*3.05/5
            beam('Exposed rafter',(x,y1,roof_z(y1)-.16),(x,y2,roof_z(y2)-.16),.085,.09,wood)
for x in [-3.42,3.42]:
    for side in [-1,1]:
        for k in range(10):
            y1=side*k*.305;y2=side*(k+1)*.305
            beam('Curved gable fascia',(x,y1,roof_z(y1)-.05),(x,y2,roof_z(y2)-.05),.12,.16,wood)
for side in [-1,1]:
    for row in range(12):
        ya=side*(row*.255);yb=side*(row*.255+.29)
        for col in range(33):
            x=-3.40+col*.212
            verts=[]
            for y in [ya,yb]:
                for j in range(7):
                    ang=j*math.pi/6
                    verts.append((x+.106*math.cos(ang),y,roof_z(y)+.055*math.sin(ang)+.018))
            faces=[(j,j+1,8+j,7+j) for j in range(6)]
            ob=mesh('Overlapping barrel tile',verts,faces,tiles[(row*3+col)%5])
            sol=ob.modifiers.new('Tile clay thickness','SOLIDIFY');sol.thickness=.014
    box('Eave bearer',(0,side*2.94,2.98),(6.9,.14,.14),wood)
for i in range(24):
    x=-3.43+i*.292
    verts=[]
    for xx in [x,x+.31]:
        for j in range(9):
            a=j*math.pi/8;verts.append((xx,.14*math.cos(a),4.15+.14*math.sin(a)))
    mesh('Ridge saddle cap',verts,[(j,j+1,j+10,j+9) for j in range(8)],tiles[2])
# Persistent neutral-review setup excluded from exported asset collections.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16
scene.render.resolution_x=1280;scene.render.resolution_y=960;scene.render.resolution_percentage=100
scene.world.color=(.35,.35,.35);scene.view_settings.view_transform='AgX'
ld=bpy.data.lights.new('Review softbox','AREA');ld.energy=1700;ld.size=8
lo=bpy.data.objects.new('Review softbox',ld);scene.collection.objects.link(lo);lo.location=(-4,-6,9);lo.rotation_euler=(Vector((0,0,1.5))-lo.location).to_track_quat('-Z','Y').to_euler()
cd=bpy.data.cameras.new('Review camera');cam=bpy.data.objects.new('Review camera',cd);scene.collection.objects.link(cam);cam.location=(9,-12,8);cam.rotation_euler=(Vector((0,0,2))-cam.location).to_track_quat('-Z','Y').to_euler();cd.type='ORTHO';cd.ortho_scale=11;scene.camera=cam
bpy.ops.wm.save_as_mainfile(filepath=str(MASTER))
for name,col in collections.items():
    bpy.ops.object.select_all(action='DESELECT')
    for ob in col.objects:ob.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'tea-{name}-v1.glb'),export_format='GLB',use_selection=True,export_apply=True)
scene.render.filepath=str(SRC/'neutral-review-v1.png');bpy.ops.render.render(write_still=True)
(SRC/'construction.json').write_text(json.dumps({'dimensions_m':[6,5,4.3],'front':'Blender -Y / Godot +Z','modules':list(collections),'tile_courses':24,'tiles_per_course':33,'provenance':'Original authored geometry; image_gen tea-guide-v1 used for structural direction only','status':'exported, in-engine review pending'},indent=2))
