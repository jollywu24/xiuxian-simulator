"""Targeted revision of existing CHR-01 source, not identity regeneration."""
import bpy, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'art_source/linshui-quality/v1/characters/hero'
bpy.ops.wm.open_mainfile(filepath=str(SRC/'hero-v1.blend'))
rig=bpy.data.objects['YeWuchenRig']
if rig.get('revision',0)>=1:raise RuntimeError('Revision already applied')
for ob in bpy.data.objects:
    if ob.type!='MESH':continue
    if ob.name.startswith('Forelock'):
        for v in ob.data.vertices:
            if abs(v.co.x)<.13 and v.co.z<1.57:v.co.z=1.57+(v.co.z-1.57)*.22
            if abs(v.co.x)>.13:v.co.x*=1.13
    if ob.name.startswith(('Face','Ear','Neck','Hand','Boot foot')):
        for poly in ob.data.polygons:poly.use_smooth=True
    if ob.name.startswith('Sleeve'):
        for v in ob.data.vertices:
            center=.3 if v.co.x>0 else -.3
            v.co.x=center+(v.co.x-center)*.80
        for poly in ob.data.polygons:poly.use_smooth=True
    if ob.name.startswith('Eye') or ob.name.startswith('Eyebrow'):
        for v in ob.data.vertices:v.co.y-=.025
    if ob.name.startswith('Hair cap'):
        for v in ob.data.vertices:
            if v.co.y<-.08 and v.co.z<1.57:v.co.z=1.57
    if ob.name.startswith('Forelock'):
        sol=ob.modifiers.new('Lock thickness','SOLIDIFY');sol.thickness=.012
rig['revision']=1
scene=bpy.context.scene;scene.camera.data.ortho_scale=2.95
scene.camera.location.z+=.15
rig.animation_data.action=bpy.data.actions['idle'];scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(SRC/'hero-v1.blend'))
scene.render.filepath=str(SRC/'master-preview-r1.png');bpy.ops.render.render(write_still=True)
(SRC/'revision-log.json').write_text(json.dumps([{'revision':1,'defects':['fringe occludes eyes','sleeve silhouette too spherical','frame/foot scale'],'changes':['shorten center locks and move side locks outward','narrow sleeve mesh','smooth face and hand normals','camera framing recalibration'],'acceptance':'pending visual inspection'}],indent=2))
