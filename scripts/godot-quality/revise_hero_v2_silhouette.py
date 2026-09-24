"""Refine the existing hero-v2 Blender master in place; keep its single rig/actions.

This is a source-art revision, not a repair of the uploaded sprite sheets. Run in
Blender 5.2 after make_hero_v2.py. A .blend1 revision backup is retained.
"""
import bpy
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art_source/linshui-quality/v1/characters/hero-v2"
MASTER = SOURCE / "hero-v2.blend"
bpy.ops.wm.open_mainfile(filepath=str(MASTER))
scene = bpy.context.scene
rig = bpy.data.objects["HeroV2Rig"]
turn = bpy.data.objects["RenderDirection"]


def remove(*names):
    for name in names:
        ob = bpy.data.objects.get(name)
        if ob is not None:
            bpy.data.objects.remove(ob, do_unlink=True)


def mat(name):
    return bpy.data.materials[name]


def bind(ob, bone):
    ob.parent = turn
    group = ob.vertex_groups.new(name=bone)
    group.add(list(range(len(ob.data.vertices))), 1.0, "REPLACE")
    modifier = ob.modifiers.new("HeroV2 shared rig", "ARMATURE")
    modifier.object = rig
    return ob


def mesh(name, verts, faces, material, bone):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    data.materials.append(mat(material))
    return bind(ob, bone)


def loft(name, rings, material, bone, sides=12):
    verts = []
    for x, y, z, rx, ry in rings:
        verts += [(x + rx * math.cos(i * math.tau / sides),
                   y + ry * math.sin(i * math.tau / sides), z)
                  for i in range(sides)]
    faces = [tuple(range(sides - 1, -1, -1))]
    for row in range(len(rings) - 1):
        for i in range(sides):
            a = row * sides + i
            b = row * sides + (i + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    faces.append(tuple((len(rings) - 1) * sides + i for i in range(sides)))
    return mesh(name, verts, faces, material, bone)


def ellipsoid(name, center, radius, material, bone):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, location=center)
    ob = bpy.context.object
    ob.name = name
    ob.scale = radius
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for vertex in ob.data.vertices:
        vertex.co += ob.location
    ob.location = (0, 0, 0)
    ob.data.materials.append(mat(material))
    for polygon in ob.data.polygons:
        polygon.use_smooth = True
    return bind(ob, bone)


# The first pass had a square bib, spherical helmet and rectangular hanging
# panels. Replace those volumes inside the SAME editable master.
remove("Hair • crown", "Hair • tied knot", "Torso • outer vest",
       "Torso • visible linen", "Cross collar • left", "Cross collar • right",
       "Boot • foot L", "Boot • foot R")
for ob in list(bpy.data.objects):
    if ob.name.startswith("Coat • "):
        bpy.data.objects.remove(ob, do_unlink=True)

# Parted fringe frames an exposed brow. A separate back cap and long ponytail
# preserve silhouette in S and SE without a black helmet across the forehead.
ellipsoid("Hair v2 • back cap", (0, .085, 1.585), (.214, .14, .147), "Ink hair", "head")
loft("Hair v2 • left swept fringe",
     [(-.12, -.115, 1.68, .09, .035), (-.11, -.163, 1.58, .075, .027),
      (-.17, -.171, 1.485, .012, .009)], "Ink hair", "head")
loft("Hair v2 • right swept fringe",
     [(.10, -.115, 1.685, .105, .035), (.095, -.17, 1.585, .085, .028),
      (.14, -.172, 1.48, .010, .008)], "Ink hair", "head")
ellipsoid("Hair v2 • tied knot", (0, .19, 1.725), (.095, .075, .065), "Ink hair", "head")
mesh("Hair v2 • linen tie", [(-.09, .137, 1.708), (.09, .137, 1.708),
                              (.08, .21, 1.715), (-.08, .21, 1.715)],
     [(0, 1, 2, 3)], "Linen ivory", "head")

# Linen is the actual body garment; dark blue stays as edge piping and outer
# skirt, so the white crossed robe reads at native sprite scale.
loft("Robe v2 • white fitted body",
     [(0, 0, 1.255, .215, .13), (0, 0, 1.04, .235, .145),
      (0, 0, .825, .228, .135)], "Linen ivory", "spine")
mesh("Robe v2 • left crossing collar",
     [(-.185, -.135, 1.254), (-.113, -.139, 1.264),
      (.106, -.157, .936), (.064, -.161, .921)],
     [(0, 1, 2, 3)], "Storm blue outer robe", "spine")
mesh("Robe v2 • right undercollar",
     [(.16, -.139, 1.258), (.105, -.145, 1.26),
      (-.117, -.161, .96), (-.073, -.166, .94)],
     [(0, 1, 2, 3)], "Linen shaded fold", "spine")
for sign, side in ((-1, "L"), (1, "R")):
    mesh("Robe v2 • blue shoulder edging " + side,
         [(sign * .16, -.095, 1.247), (sign * .245, -.036, 1.242),
          (sign * .236, -.128, .982), (sign * .201, -.151, .985)],
         [(0, 1, 2, 3)], "Storm blue outer robe", "spine")
    # A blue overskirt over trousers, plus distinct white split front panels.
    mesh("Robe v2 • flared blue skirt " + side,
         [(0, -.02, .79), (sign * .25, -.02, .79),
          (sign * .39, -.12, .29), (sign * .015, -.14, .29)],
         [(0, 1, 2, 3)], "Storm blue outer robe", "coat." + side)
    mesh("Robe v2 • white split panel " + side,
         [(0, -.151, .78), (sign * .17, -.143, .78),
          (sign * .245, -.19, .31), (sign * .025, -.205, .305)],
         [(0, 1, 2, 3)], "Linen ivory", "coat." + side)
    mesh("Robe v2 • skirt fold " + side,
         [(sign * .172, -.151, .755), (sign * .185, -.153, .754),
          (sign * .255, -.196, .315), (sign * .239, -.195, .31)],
         [(0, 1, 2, 3)], "Linen shaded fold", "coat." + side)
    ellipsoid("Boot • foot " + side, (sign * .14, -.058, .075),
              (.092, .127, .053), "Dark wrapped boots", "shin." + side)

# Cloth and fitting accents remain separate, editable geometry.
for sign, side in ((-1, "L"), (1, "R")):
    mesh("Sleeve v2 • cuff seam " + side,
         [(sign * .265, -.10, .967), (sign * .438, -.10, .967),
          (sign * .433, -.102, .947), (sign * .268, -.102, .947)],
         [(0, 1, 2, 3)], "Linen shaded fold", "upper_arm." + side)
    loft("Boot v2 • leather wrap " + side,
         [(sign * .14, 0, .255, .095, .094),
          (sign * .14, 0, .221, .097, .096)],
         "Worn brown leather", "shin." + side)

rig.animation_data.action = bpy.data.actions["idle"]
scene.frame_set(1)
scene.render.filepath = str(SOURCE / "master-preview-v2-r3.png")
bpy.ops.wm.save_as_mainfile(filepath=str(MASTER))
bpy.ops.render.render(write_still=True)
print("Revised the existing v2 master silhouette and rendered r3")
