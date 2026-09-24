"""Third focused source revision: cloth silhouette and value hierarchy, not regeneration."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'art_source/linshui-quality/v1/characters/hero'
bpy.ops.wm.open_mainfile(filepath=str(SRC/'hero-v1.blend'));rig=bpy.data.objects['YeWuchenRig']
if rig.get('revision',0)>=3:raise RuntimeError('Third revision already applied; review required before further changes')
for obj in bpy.data.objects:
    if obj.type!='MESH':continue
    if obj.name.startswith('Sleeve'):
        for v in obj.data.vertices:
            center=.3 if v.co.x>0 else -.3
            v.co.x=center+(v.co.x-center)*.72
            v.co.y*=.82
        for poly in obj.data.polygons:poly.use_smooth=False
    if obj.name.startswith('Topknot'):
        for v in obj.data.vertices:v.co.x*=.65;v.co.z=1.70+(v.co.z-1.70)*.60
    if obj.name.startswith('Hair cap'):
        for v in obj.data.vertices:v.co.x*=.94
    if obj.name.startswith('Forelock'):
        for v in obj.data.vertices:
            if v.co.z<1.56:v.co.z+=.035
for name,color in [('Robe • storm blue',(.085,.16,.22)),('Robe • edge',(.045,.085,.12)),('Inner linen',(.70,.65,.53)),('Ink hair',(.018,.023,.028)),('Hair facets',(.032,.042,.047))]:
    mat=bpy.data.materials[name];mat.diffuse_color=(*color,1)
    next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'].default_value=(*color,1)
rig['revision']=3
bpy.data.objects['RenderDirection'].rotation_euler.z=0
rig.animation_data.action=bpy.data.actions['idle'];bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'hero-v1.blend'))
bpy.context.scene.render.filepath=str(SRC/'master-preview-r3.png');bpy.ops.render.render(write_still=True)
(SRC/'revision-log.json').write_text(json.dumps([
{'revision':0,'result':'rejected','defects':['fringe covers eyes','rounded shoulder silhouette','incorrect frame scale']},
{'revision':1,'result':'rejected','changes':['shortened bangs','narrowed sleeves','smoothed facial normals'],'defects':['identical direction exports','anchor not verified','toy-like face']},
{'revision':2,'result':'rejected','changes':['real shared-master direction pivot','global-axis bone rotations','eye proportions','foot projection 80,112'],'defects':['low-poly-downsample appearance','cloth silhouette overly rounded','weak value separation']},
{'revision':3,'result':'pending_in_engine_review','changes':['angular narrow cloth sleeves','smaller tied hair knot','stronger robe/linen/hair palette hierarchy'],'next_if_failed':'Stop further art iterations and request review under execution-plan three-revision rule'}],indent=2))
