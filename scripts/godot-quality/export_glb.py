"""Blender CLI: master.blend collection output.glb. Evaluated export copy, no master mutation."""
import bpy,sys,json
from pathlib import Path
args=sys.argv[sys.argv.index('--')+1:]
master,collection,target=args
bpy.ops.wm.open_mainfile(filepath=master)
col=bpy.data.collections.get(collection)
if col is None:raise ValueError(f'Unknown collection: {collection}')
deps=bpy.context.evaluated_depsgraph_get();copies=[]
bpy.ops.object.select_all(action='DESELECT')
for obj in col.all_objects:
    if obj.type!='MESH':continue
    data=bpy.data.meshes.new_from_object(obj.evaluated_get(deps),depsgraph=deps)
    copy=bpy.data.objects.new(obj.name+' export',data);bpy.context.scene.collection.objects.link(copy)
    copy.matrix_world=obj.matrix_world.copy();copy.select_set(True);copies.append(copy)
if not copies:raise ValueError('No exportable geometry')
bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join()
combined=bpy.context.object;combined.name=collection
combined.data.calc_loop_triangles()
stats={'source':master,'collection':collection,'triangles':len(combined.data.loop_triangles),'vertices':len(combined.data.vertices),'materials':len(set(m.name for m in combined.data.materials if m)),'uv_layers':len(combined.data.uv_layers),'dimensions':list(combined.dimensions)}
bpy.ops.export_scene.gltf(filepath=target,export_format='GLB',use_selection=True,export_apply=True)
Path(target+'.stats.json').write_text(json.dumps(stats,indent=2))
