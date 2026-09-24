"""Editable 2 m pavement modules with real bevelled edge; texture relief deliberately flat."""
import bpy, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'art_source/linshui-quality/v1/environment/pavement';SRC.mkdir(parents=True,exist_ok=True)
MASTER=SRC/'pavement-v1.blend'
if MASTER.exists():raise RuntimeError('Existing source protected')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
mat=bpy.data.materials.new('Blue limestone');mat.use_nodes=True
p=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');p.inputs['Roughness'].default_value=.9
tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ROOT/'godot/linshui-quality/assets/textures/stone-albedo-v1.png'));mat.node_tree.links.new(tex.outputs['Color'],p.inputs['Base Color'])
for variant in range(4):
    col=bpy.data.collections.new(f'pavement-{variant+1}');bpy.context.scene.collection.children.link(col)
    bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,-.055));ob=bpy.context.object;ob.name=f'Pavement 2m variant {variant+1}';ob.dimensions=(2,2,.11)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for c in list(ob.users_collection):c.objects.unlink(ob)
    col.objects.link(ob);ob.data.materials.append(mat)
    uv=ob.data.uv_layers.active
    for poly in ob.data.polygons:
        for li in poly.loop_indices:
            co=ob.data.vertices[ob.data.loops[li].vertex_index].co;uv.data[li].uv=((co.x+1)/2,(co.y+1)/2)
    mod=ob.modifiers.new('Stone edge bevel','BEVEL');mod.width=.015;mod.segments=2
bpy.ops.wm.save_as_mainfile(filepath=str(MASTER))
(SRC/'review.json').write_text(json.dumps({'status':'rejected_pending_revision','defects':['Four module sources currently share identical visual content; not four accepted variants','Generated albedo seam inspection required','Microrelief omitted rather than inferred from color']},indent=2))
