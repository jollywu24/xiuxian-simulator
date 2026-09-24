"""Revise existing Blender masters; export authored P2 veranda, paving and bank meshes.

No edits to user images. New limestone albedo is the actual imagegen output.
Geometry is editable, not runtime-generated. This script never claims visual acceptance.
"""
import bpy
import hashlib
import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "art_source/linshui-quality/v1"
OUT = ROOT / "godot/linshui-quality/assets/environment"
TAG = "refine_p2_environment_v2"
rng = random.Random(240924)


def collection(name):
    col = bpy.data.collections.get(name)
    if col:
        for obj in list(col.objects):
            if obj.get("author_script") != TAG:
                raise RuntimeError(f"Refusing to replace foreign object {obj.name}")
            bpy.data.objects.remove(obj, do_unlink=True)
    else:
        col = bpy.data.collections.new(name)
        bpy.context.scene.collection.children.link(col)
    return col


def material(name, color, roughness=0.9, texture=None):
    mat = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = (*color, 1)
    shader = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    if texture:
        tex = mat.node_tree.nodes.get("P2 authored albedo") or mat.node_tree.nodes.new("ShaderNodeTexImage")
        tex.name = "P2 authored albedo"
        tex.image = bpy.data.images.load(str(texture), check_existing=True)
        mat.node_tree.links.new(tex.outputs["Color"], shader.inputs["Base Color"])
    return mat


def box(col, name, position, size, mat, bevel=0.02, rotate=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=position)
    obj = bpy.context.object
    obj.name = name
    obj["author_script"] = TAG
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for old in list(obj.users_collection):
        old.objects.unlink(obj)
    col.objects.link(obj)
    obj.data.materials.append(mat)
    uv = obj.data.uv_layers.active or obj.data.uv_layers.new(name="UVMap")
    offset = (rng.random(), rng.random())
    for face in obj.data.polygons:
        axis = max(range(3), key=lambda i: abs(face.normal[i]))
        axes = [i for i in range(3) if i != axis]
        for li in face.loop_indices:
            point = obj.data.vertices[obj.data.loops[li].vertex_index].co
            uv.data[li].uv = (point[axes[0]] * 0.8 + offset[0], point[axes[1]] * 0.8 + offset[1])
    obj.rotation_euler.z = rotate
    if bevel:
        mod = obj.modifiers.new("Authored edge wear", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


def export(col, name):
    bpy.ops.object.select_all(action="DESELECT")
    copies = []
    deps = bpy.context.evaluated_depsgraph_get()
    for obj in col.all_objects:
        if obj.type != "MESH":
            continue
        mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(deps), depsgraph=deps)
        copy = bpy.data.objects.new(obj.name + " export", mesh)
        bpy.context.scene.collection.objects.link(copy)
        copy.matrix_world = obj.matrix_world.copy()
        copy.select_set(True)
        copies.append(copy)
    bpy.context.view_layer.objects.active = copies[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    obj.data.calc_loop_triangles()
    path = OUT / f"{name}.glb"
    stats = {"triangles": len(obj.data.loop_triangles), "vertices": len(obj.data.vertices), "source_objects": len(col.objects)}
    bpy.ops.export_scene.gltf(filepath=str(path), export_format="GLB", use_selection=True, export_apply=True)
    stats["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
    stats["bytes"] = path.stat().st_size
    bpy.data.objects.remove(obj, do_unlink=True)
    return stats


def veranda():
    master = SRC / "environment/tea-house/tea-house-v1.blend"
    bpy.ops.wm.open_mainfile(filepath=str(master))
    col = collection("p2-veranda")
    wood = material("P2 smoked elm", (0.16,0.095,0.048),0.88)
    edge = material("P2 cut timber", (0.23,0.145,0.078),0.92)
    stone = material("P2 column shoe", (0.30,0.33,0.32))
    tiles = [material(f"P2 veranda tile {i}", (0.105+i*0.013,0.145+i*0.011,0.16+i*0.011),0.87) for i in range(5)]
    for x in [-3.15,3.15]:
        box(col,"Stone column shoe",(x,-4.65,0.12),(0.38,0.38,0.24),stone,0.025)
        box(col,"Elm column",(x,-4.65,1.34),(0.20,0.22,2.42),wood,0.014)
        box(col,"Capital",(x,-4.65,2.51),(0.37,0.34,0.16),edge,0.012)
        # Traditional diagonal knee braces, real load-bearing silhouette.
        brace = box(col,"Knee brace",(x-math.copysign(0.24,x),-4.65,2.28),(0.68,0.12,0.12),wood,0.01)
        brace.rotation_euler.y = math.copysign(math.pi/4,x)
    box(col,"Front eave beam",(0,-4.65,2.58),(6.7,0.22,0.22),wood,0.018)
    box(col,"Wall ledger",(0,-2.65,2.99),(6.7,0.2,0.18),wood,0.015)
    for index in range(18):
        rafter = box(col,"Veranda rafter",(-3.25+index*0.38,-3.70,2.79),(0.075,2.32,0.10),edge,0.008)
        rafter.rotation_euler.x = math.atan(0.2)
    # Curved half-barrel tiles, overlap in rows and alternate cap channels.
    for row in range(9):
        for lane in range(31):
            x = -3.45 + lane*0.225
            y0 = -2.64-row*0.265
            vertices = []
            for y in [y0,y0-0.30]:
                base = 3.08 + (y+2.64)*0.19
                for j in range(7):
                    angle = j*math.pi/6
                    vertices.append((x+0.116*math.cos(angle),y,base+0.045*math.sin(angle)))
            faces = [(j,j+1,j+8,j+7) for j in range(6)]
            me = bpy.data.meshes.new("Veranda tile mesh")
            me.from_pydata(vertices,[],faces)
            me.update()
            obj = bpy.data.objects.new("Overlapping clay barrel tile",me)
            obj["author_script"] = TAG
            col.objects.link(obj)
            me.materials.append(tiles[(lane+row*3)%5])
            solid = obj.modifiers.new("Tile thickness", "SOLIDIFY")
            solid.thickness = 0.018
    box(col,"Weathered fascia",(0,-5.05,2.57),(7.2,0.10,0.18),wood,0.012)
    bpy.ops.wm.save_as_mainfile(filepath=str(master))
    return export(col,"tea-veranda-p2-v2")


def paving_and_banks():
    master = SRC / "environment/pavement/pavement-v1.blend"
    bpy.ops.wm.open_mainfile(filepath=str(master))
    paving = collection("p2-paving-layout")
    bank = collection("p2-bank-layout")
    albedo = ROOT / "godot/linshui-quality/assets/textures/limestone-albedo-v2.png"
    limestone = material("P2 limestone albedo", (0.35,0.40,0.43),0.91,albedo)
    dark = material("P2 wet limestone", (0.19,0.25,0.25),0.77)
    coping = material("P2 coping stone", (0.36,0.40,0.38),0.92,albedo)
    count = 0
    for row in range(16):
        z = -0.75 + row*0.45
        if z < 1.95:
            left,right = -10.2,0.9
        elif z < 3.5:
            left,right = -10.2,-0.6
        else:
            left,right = -2.8,-0.6
        x = left
        while x < right-0.12:
            width = min((0.39 if count%2==0 and x==left else rng.uniform(0.64,0.85)),right-x)
            if width < 0.12:
                break
            box(paving,"Hand laid limestone %03d"%count,(x+width/2,-z, -0.027),(max(width-0.016,0.08),0.426,0.058),limestone,0.014,rng.uniform(-0.006,0.006))
            count += 1
            x += width
    # Real masonry bank faces, footings and coping. Source Y converts to Godot -Z.
    for edge in [1.0,5.0]:
        for row in range(3):
            z = -10.0-(row%2)*0.40
            while z < 10:
                length = rng.uniform(0.68,1.1)
                midpoint = z+length/2
                if edge == 1.0 and midpoint+length/2 > 4.40 and midpoint-length/2 < 7.05:
                    z += length
                    continue
                mat = limestone if row==2 else dark
                box(bank,"Retaining ashlar",(edge+(-0.03 if edge==1 else 0.03),-midpoint,-0.82+row*0.29),(0.30,length-0.012,0.285),mat,0.025)
                z += length
        for k in range(25):
            z = -9.8+k*0.8
            if edge==1.0 and 4.0<z<7.5:
                continue
            box(bank,"Bank coping",(edge,-z,-0.018),(0.42,0.784,0.08),coping,0.022)
    bpy.ops.wm.save_as_mainfile(filepath=str(master))
    return {"paving":export(paving,"paving-layout-p2-v2"),"bank":export(bank,"bank-layout-p2-v2")}


report = {"tea_veranda":veranda(),**paving_and_banks(),"status":"exported_not_visual_approved", "method":"existing editable Blender masters incrementally extended; actual generated limestone albedo; geometric bevel/relief, no claimed normal map"}
target = SRC / "environment/p2-refinement-v2.json"
target.write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps(report,indent=2))
