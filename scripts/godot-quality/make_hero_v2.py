"""Build the new editable hero-v2 master from the approved production contract.

Run inside Blender 5.2. Never overwrites a pre-existing master. The generated
turnaround is a packed reference image, not a runtime sprite or model texture.
"""
import bpy
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art_source/linshui-quality/v1/characters/hero-v2"
MASTER = SOURCE / "hero-v2.blend"
if MASTER.exists():
    raise RuntimeError(f"Protected master already exists: {MASTER}")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

def material(name, rgb):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    p = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    p.inputs["Base Color"].default_value = (*rgb, 1)
    p.inputs["Roughness"].default_value = .92
    return mat

linen = material("Linen ivory", (.73, .70, .62))
linen_shadow = material("Linen shaded fold", (.56, .57, .54))
blue = material("Storm blue outer robe", (.19, .27, .34))
blue_dark = material("Outer robe shadow", (.105, .16, .21))
hair = material("Ink hair", (.035, .04, .045))
skin = material("Warm skin", (.67, .46, .32))
boot = material("Dark wrapped boots", (.08, .09, .10))
brown = material("Worn brown leather", (.22, .14, .08))
steel = material("Straight sword steel", (.56, .62, .63))
bronze = material("Muted fittings", (.43, .32, .17))
eye = material("Face line", (.025, .025, .027))

turn = bpy.data.objects.new("RenderDirection", None)
bpy.context.collection.objects.link(turn)
turn.scale.x = -1  # one-time rig handedness calibration: R hand projects screen-left

arm = bpy.data.armatures.new("HeroV2Armature")
rig = bpy.data.objects.new("HeroV2Rig", arm)
bpy.context.collection.objects.link(rig)
rig.parent = turn
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")

def bone(name, head, tail, parent=None):
    b = arm.edit_bones.new(name)
    b.head, b.tail = head, tail
    if parent:
        b.parent = arm.edit_bones[parent]

bone("root", (0, 0, 0), (0, 0, .2))
bone("pelvis", (0, 0, .68), (0, 0, .86), "root")
bone("spine", (0, 0, .86), (0, 0, 1.25), "pelvis")
bone("head", (0, 0, 1.25), (0, 0, 1.68), "spine")
bone("hair", (0, .12, 1.63), (0, .22, 1.18), "head")
for side, sign in (("L", -1), ("R", 1)):
    bone("upper_arm." + side, (sign * .25, 0, 1.20), (sign * .35, 0, .99), "spine")
    bone("forearm." + side, (sign * .35, 0, .99), (sign * .35, -.02, .77), "upper_arm." + side)
    bone("thigh." + side, (sign * .13, 0, .69), (sign * .14, 0, .40), "pelvis")
    bone("shin." + side, (sign * .14, 0, .40), (sign * .14, -.01, .13), "thigh." + side)
    bone("coat." + side, (sign * .12, .03, .81), (sign * .30, .02, .39), "pelvis")
bpy.ops.object.mode_set(mode="OBJECT")
rig.select_set(False)

def bind(obj, name):
    obj.parent = turn
    group = obj.vertex_groups.new(name=name)
    group.add(list(range(len(obj.data.vertices))), 1, "REPLACE")
    modifier = obj.modifiers.new("HeroV2 shared rig", "ARMATURE")
    modifier.object = rig
    return obj

def mesh(name, verts, faces, mat, bone_name):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    ob = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(ob)
    data.materials.append(mat)
    return bind(ob, bone_name)

def ellipsoid(name, location, scale, mat, bone_name, segments=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=12, location=location)
    ob = bpy.context.object
    ob.name = name
    ob.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for vertex in ob.data.vertices:
        vertex.co += ob.location
    ob.location = (0, 0, 0)
    ob.data.materials.append(mat)
    for face in ob.data.polygons:
        face.use_smooth = True
    return bind(ob, bone_name)

def rectangular(name, center, size, mat, bone_name, bevel=.015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    ob = bpy.context.object
    ob.name = name
    ob.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for vertex in ob.data.vertices:
        vertex.co += ob.location
    ob.location = (0, 0, 0)
    ob.data.materials.append(mat)
    if bevel:
        mod = ob.modifiers.new("Soft garment edge", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        ob.modifiers.new("Weighted garment normals", "WEIGHTED_NORMAL")
    return bind(ob, bone_name)

def loft(name, rings, mat, bone_name, sides=8):
    verts = []
    for x, y, z, rx, ry in rings:
        verts.extend((x + rx * math.cos(i * math.tau / sides),
                      y + ry * math.sin(i * math.tau / sides), z)
                     for i in range(sides))
    faces = [tuple(range(sides - 1, -1, -1))]
    for row in range(len(rings) - 1):
        for i in range(sides):
            a = row * sides + i
            b = row * sides + (i + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    faces.append(tuple((len(rings) - 1) * sides + i for i in range(sides)))
    return mesh(name, verts, faces, mat, bone_name)

# Head and high tied hair: keep a broad skin face exposed at sprite scale.
ellipsoid("Head • face", (0, -.025, 1.47), (.205, .17, .215), skin, "head")
ellipsoid("Hair • crown", (0, .065, 1.58), (.22, .15, .155), hair, "head")
ellipsoid("Hair • tied knot", (0, .14, 1.72), (.095, .09, .065), hair, "head")
loft("Hair • ponytail", [(0, .15, 1.68, .07, .07), (0, .20, 1.45, .10, .07),
                          (.035, .23, 1.28, .065, .045), (.085, .25, 1.12, .008, .008)],
     hair, "hair", 10)
for sign in (-1, 1):
    mesh("Hair • temple lock", [(sign * .13, -.125, 1.65), (sign * .20, -.10, 1.62),
                                  (sign * .17, -.14, 1.36), (sign * .12, -.16, 1.41)],
         [(0, 1, 2, 3)], hair, "head")
    ellipsoid("Face • eye", (sign * .075, -.185, 1.47), (.025, .012, .017), eye, "head", 12)
    mesh("Face • brow", [(sign * .045, -.186, 1.515), (sign * .105, -.178, 1.51),
                          (sign * .108, -.18, 1.50), (sign * .045, -.187, 1.505)],
         [(0, 1, 2, 3)], eye, "head")

# Clear white cross collar over an angular blue-gray torso, no noisy eye whites.
rectangular("Torso • outer vest", (0, .005, 1.02), (.48, .29, .47), blue, "spine", .025)
rectangular("Torso • visible linen", (0, -.153, 1.01), (.34, .014, .36), linen, "spine", .006)
mesh("Cross collar • left", [(-.21, -.168, 1.23), (-.145, -.175, 1.25),
                              (.095, -.176, .93), (.04, -.178, .91)], [(0, 1, 2, 3)], blue_dark, "spine")
mesh("Cross collar • right", [(.20, -.17, 1.23), (.13, -.18, 1.24),
                               (-.07, -.18, .96), (-.005, -.182, .94)], [(0, 1, 2, 3)], linen_shadow, "spine")
rectangular("Waist • belt", (0, -.005, .79), (.51, .32, .09), brown, "pelvis", .008)
rectangular("Waist • small buckle", (0, -.18, .79), (.075, .015, .06), bronze, "pelvis", .006)

# Separate flared robe panels: they remain inspectable and can be rigged/repainted.
for side, sign in (("L", -1), ("R", 1)):
    for front, mat in ((True, linen if sign < 0 else blue), (False, blue_dark)):
        y0 = -.13 if front else .13
        y1 = -.16 if front else .17
        mesh("Coat • %s %s" % (side, "front" if front else "back"),
             [(0, y0, .77), (sign * .23, y0, .77),
              (sign * .32, y1, .38), (sign * .02, y1, .37)],
             [(0, 1, 2, 3)], mat, "coat." + side)
    loft("Sleeve • upper " + side,
         [(sign * .25, 0, 1.20, .12, .12), (sign * .34, 0, 1.02, .135, .13),
          (sign * .35, -.01, .93, .115, .11)], linen, "upper_arm." + side)
    loft("Sleeve • wrist wrap " + side,
         [(sign * .35, -.01, .94, .095, .09), (sign * .35, -.015, .79, .075, .07)],
         boot, "forearm." + side)
    ellipsoid("Hand • " + side, (sign * .35, -.025, .75), (.065, .065, .07), skin, "forearm." + side)
    loft("Trouser • " + side,
         [(sign * .13, 0, .69, .11, .11), (sign * .14, 0, .39, .105, .10)],
         blue_dark, "thigh." + side)
    loft("Boot • shaft " + side,
         [(sign * .14, 0, .39, .09, .09), (sign * .14, 0, .13, .085, .09)],
         boot, "shin." + side)
    ellipsoid("Boot • foot " + side, (sign * .14, -.075, .08), (.10, .16, .07), boot, "shin." + side)

# Exactly one straight blade; right-hand grip and left-hip sheath are separate.
rectangular("Sword • grip", (.35, -.035, .72), (.055, .055, .16), brown, "forearm.R", .005)
rectangular("Sword • guard", (.35, -.035, .66), (.16, .04, .028), bronze, "forearm.R", .004)
mesh("Sword • single straight blade",
     [(.33, -.04, .65), (.37, -.04, .65), (.37, -.04, .12), (.35, -.04, .04),
      (.33, -.04, .12)], [(0, 1, 2, 3, 4)], steel, "forearm.R")
loft("Sheath • left hip", [(-.24, .015, .78, .035, .035),
                            (-.30, .06, .41, .035, .035), (-.33, .09, .18, .025, .025)],
     brown, "pelvis", 8)

for pose in rig.pose.bones:
    pose.rotation_mode = "XYZ"
for action_name, count in (("idle", 4), ("walk", 8), ("thrust", 12)):
    rig.animation_data_create()
    action = bpy.data.actions.new(action_name)
    rig.animation_data.action = action
    for frame in range(1, count + 1):
        phase = math.tau * (frame - 1) / count
        for pose in rig.pose.bones:
            pose.rotation_euler = (0, 0, 0)
            pose.location = (0, 0, 0)
        if action_name == "idle":
            rig.pose.bones["spine"].rotation_euler.x = .012 * math.sin(phase)
            rig.pose.bones["hair"].rotation_euler.x = .025 * math.sin(phase + .6)
        elif action_name == "walk":
            for side, sign in (("L", 1), ("R", -1)):
                rig.pose.bones["thigh." + side].rotation_euler.x = sign * .35 * math.sin(phase)
                rig.pose.bones["shin." + side].rotation_euler.x = -.25 * max(0, sign * math.cos(phase))
                rig.pose.bones["upper_arm." + side].rotation_euler.x = -sign * .25 * math.sin(phase)
                rig.pose.bones["coat." + side].rotation_euler.x = sign * .09 * math.sin(phase + .3)
        else:
            amount = [0, .12, .3, .55, .82, 1, 1, .9, .65, .4, .15, 0][frame - 1]
            rig.pose.bones["upper_arm.R"].rotation_euler.x = -1.35 * amount
            rig.pose.bones["forearm.R"].rotation_euler.x = -.12 * amount
            rig.pose.bones["upper_arm.L"].rotation_euler.x = .35 * amount
            rig.pose.bones["spine"].rotation_euler.x = .10 * amount
            rig.pose.bones["thigh.R"].rotation_euler.x = .25 * amount
            rig.pose.bones["thigh.L"].rotation_euler.x = -.2 * amount
            rig.pose.bones["coat.R"].rotation_euler.x = .14 * amount
        for pose in rig.pose.bones:
            pose.keyframe_insert("rotation_euler", frame=frame)
            pose.keyframe_insert("location", frame=frame)
    action.use_fake_user = True

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 24
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.resolution_x = 640
scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.fps = 12
scene.view_settings.view_transform = "Standard"
world = bpy.data.worlds.new("Neutral sprite studio")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (.68, .72, .74, 1)
world.node_tree.nodes["Background"].inputs[1].default_value = .7
scene.world = world
light_data = bpy.data.lights.new("Soft key", "AREA")
light_data.energy = 350
light_data.shape = "DISK"
light_data.size = 5
light = bpy.data.objects.new("Soft key", light_data)
scene.collection.objects.link(light)
light.location = (-3, -4, 5)
light.rotation_euler = (Vector((0, 0, 1)) - light.location).to_track_quat("-Z", "Y").to_euler()
camera_data = bpy.data.cameras.new("SpriteCamera")
camera = bpy.data.objects.new("SpriteCamera", camera_data)
scene.collection.objects.link(camera)
target = Vector((0, 0, 1.15))
camera.location = target + Vector((0, -6, 5.4))
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 3.1
scene.camera = camera

reference = bpy.data.images.load(str(SOURCE / "turnaround-guide-v2.png"), check_existing=True)
reference.pack()
rig.animation_data.action = bpy.data.actions["idle"]
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(MASTER))
scene.render.filepath = str(SOURCE / "master-preview-v2.png")
bpy.ops.render.render(write_still=True)
print(f"Saved hero-v2 master and preview: {MASTER}")
