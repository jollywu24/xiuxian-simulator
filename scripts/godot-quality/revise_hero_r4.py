"""Focused source correction after user review: reduce noisy bright trim, keep rig/identity."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'art_source/linshui-quality/v1/characters/hero'
bpy.ops.wm.open_mainfile(filepath=str(SRC/'hero-v1.blend'))
rig=bpy.data.objects['YeWuchenRig']
if rig.get('revision')!=3:raise RuntimeError('Requires reviewed r3 master, refuses repeated edits')
for obj in bpy.data.objects:
    if obj.type!='MESH':continue
    if obj.name.startswith('Linen cuff'):
        sign=-1 if obj.name.endswith('L') else 1
        for v in obj.data.vertices:
            v.co.x=sign*.34+(v.co.x-sign*.34)*.70
            v.co.y=-.02+(v.co.y+.02)*.70
            v.co.z=.92+(v.co.z-.92)*.55
    if obj.name.startswith('Tail hem'):
        # A narrow muted seam, not a bright horizontal bar across each leg.
        for v in obj.data.vertices:v.co.z=.42+(v.co.z-.42)*.45
        obj.data.materials[0]=bpy.data.materials['Robe • edge']
    if obj.name.startswith('Eye white'):
        obj.data.materials[0]=bpy.data.materials['Warm skin']
    if obj.name.startswith('Eye pupil'):
        center=sum(v.co.z for v in obj.data.vertices)/len(obj.data.vertices)
        for v in obj.data.vertices:v.co.z=center+(v.co.z-center)*.75
    if obj.name.startswith('Inner cross collar'):
        for v in obj.data.vertices:v.co.x*=.75
for name,color in [('Inner linen',(.40,.36,.27)),('Robe • storm blue',(.055,.12,.18))]:
    mat=bpy.data.materials[name];mat.diffuse_color=(*color,1)
    next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED').inputs['Base Color'].default_value=(*color,1)
for mat in bpy.data.materials:
    if mat.use_nodes:
        for node in mat.node_tree.nodes:
            if node.type=='BSDF_PRINCIPLED':node.inputs['Specular IOR Level'].default_value=.08
rig['revision']=4
bpy.data.objects['RenderDirection'].rotation_euler.z=0
rig.animation_data.action=bpy.data.actions['idle'];bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'hero-v1.blend'))
bpy.context.scene.render.filepath=str(SRC/'master-preview-r4.png');bpy.ops.render.render(write_still=True)
log=json.loads((SRC/'revision-log.json').read_text())
log.append({'revision':4,'authorization':'User rejected blurry character and requested GitHub pipeline research then continuation','changes':['narrow cuff geometry on existing master','muted collar and hem','remove eye-white flecks','reduce source specular highlights'],'result':'pending_engine_review','rig_replaced':False})
(SRC/'revision-log.json').write_text(json.dumps(log,indent=2),encoding='utf-8')
profile=json.loads((SRC/'render-profile.json').read_text());profile['revision']=4
(SRC/'render-profile.json').write_text(json.dumps(profile,indent=2),encoding='utf-8')
