"""Apply authored timber material and normalized world-scale UV to existing master."""
import bpy
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];MASTER=ROOT/'art_source/linshui-quality/v1/environment/tea-house/tea-house-v1.blend'
bpy.ops.wm.open_mainfile(filepath=str(MASTER))
image=bpy.data.images.load(str(ROOT/'godot/linshui-quality/assets/textures/wood-albedo-v1.png'),check_existing=True)
for name in ['Old timber','Timber endgrain']:
    mat=bpy.data.materials[name];nodes=mat.node_tree.nodes;p=next(n for n in nodes if n.type=='BSDF_PRINCIPLED')
    tex=nodes.get('Authored timber albedo') or nodes.new('ShaderNodeTexImage');tex.name='Authored timber albedo';tex.image=image
    mat.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
mat=bpy.data.materials['Lime plaster'];p=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
tex=mat.node_tree.nodes.get('Authored lime albedo') or mat.node_tree.nodes.new('ShaderNodeTexImage');tex.name='Authored lime albedo'
tex.image=bpy.data.images.load(str(ROOT/'godot/linshui-quality/assets/textures/plaster-albedo-v1.png'),check_existing=True)
mat.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
for col in ['walls','facade','foundation']:
    for obj in bpy.data.collections[col].objects:
        if obj.type!='MESH':continue
        me=obj.data;uv=me.uv_layers.active or me.uv_layers.new(name='UVMap')
        for poly in me.polygons:
            axis=max(range(3),key=lambda i:abs(poly.normal[i]));axes=[i for i in range(3) if i!=axis]
            for li in poly.loop_indices:
                co=me.vertices[me.loops[li].vertex_index].co;uv.data[li].uv=(co[axes[0]]*.25,co[axes[1]]*.25)
bpy.ops.wm.save_as_mainfile(filepath=str(MASTER))
