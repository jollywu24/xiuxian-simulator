"""Build a painted-parts Blender mother/rig from the v2 isolated source art.

The original low-poly hero-v2.blend is preserved as a rejected study. This
creates a *new* authoritative candidate. Both S and SE painted layers are
driven by one real Blender armature; runtime will use only rendered 2D frames.
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "art_source/linshui-quality/v1/characters/hero-v2"
INDEX = json.loads((SOURCE / "puppet-parts/index.json").read_text(encoding="utf-8"))
MASTER = SOURCE / "hero-v2-puppet.blend"
if MASTER.exists():
    raise RuntimeError(f"Protected source already exists: {MASTER}")
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

PX_TO_M = 1.7 / 1182.0
CX = INDEX["virtual_center_x"]
FY = INDEX["virtual_foot_y"]


def pos(x, y, depth=0):
    return ((x - CX) * PX_TO_M, depth, (FY - y) * PX_TO_M)


facing = bpy.data.objects.new("CameraFacingProductionPlane", None)
bpy.context.collection.objects.link(facing)
facing.rotation_euler.x = -math.radians(42)

arm = bpy.data.armatures.new("HeroV2PaintedArmature")
rig = bpy.data.objects.new("HeroV2PaintedRig", arm)
bpy.context.collection.objects.link(rig)
rig.parent = facing
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
bpy.ops.object.mode_set(mode="EDIT")


def bone(name, start, end, parent=None):
    b = arm.edit_bones.new(name)
    b.head = pos(*start)
    b.tail = pos(*end)
    if parent:
        b.parent = arm.edit_bones[parent]


bone("root", (700, 942), (700, 900))
bone("pelvis", (700, 380), (700, 270), "root")
bone("torso", (700, 330), (700, 130), "pelvis")
bone("head", (700, 155), (700, -130), "torso")
bone("hair_tail", (620, 30), (530, 300), "head")
bone("arm.R", (615, 210), (590, 545), "torso")
bone("arm.L", (820, 210), (875, 545), "torso")
bone("sword.R", (590, 535), (588, 850), "arm.R")
bone("leg.R", (640, 575), (650, 925), "pelvis")
bone("leg.L", (770, 575), (785, 925), "pelvis")
bone("skirt", (700, 350), (700, 620), "pelvis")
bpy.ops.object.mode_set(mode="OBJECT")
rig.select_set(False)


def emission_material(name, image):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = image
    tex.interpolation = "Closest"
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Strength"].default_value = 1
    transparent = nodes.new("ShaderNodeBsdfTransparent")
    mix = nodes.new("ShaderNodeMixShader")
    output = nodes.new("ShaderNodeOutputMaterial")
    links = mat.node_tree.links
    links.new(tex.outputs["Color"], emission.inputs["Color"])
    links.new(tex.outputs["Alpha"], mix.inputs[0])
    links.new(transparent.outputs[0], mix.inputs[1])
    links.new(emission.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], output.inputs["Surface"])
    return mat


bind_bone = {"head": "head", "torso": "torso", "skirt": "skirt",
             "arm_r": "arm.R", "arm_l": "arm.L", "leg_r": "leg.R",
             "leg_l": "leg.L", "sword": "sword.R"}
depths = {"leg_r": .04, "leg_l": .04, "skirt": .025,
          "torso": .01, "arm_l": -.01, "arm_r": -.015,
          "head": -.025, "sword": -.035}


def make_part(direction, name, spec):
    path = SOURCE / spec["file"]
    image = bpy.data.images.load(str(path), check_existing=True)
    image.pack()
    box = spec["crop_box"]
    dx, dy = spec["virtual_offset"]
    x0, y0, x1, y1 = box[0] + dx, box[1] + dy, box[2] + dx, box[3] + dy
    depth = depths[name]
    verts = [pos(x0, y1, depth), pos(x1, y1, depth),
             pos(x1, y0, depth), pos(x0, y0, depth)]
    mesh = bpy.data.meshes.new(f"{direction}.{name}.mesh")
    mesh.from_pydata(verts, [], [(0, 1, 2, 3)])
    mesh.update()
    uv = mesh.uv_layers.new(name="Full cutout UV")
    for index, coord in enumerate(((0, 0), (1, 0), (1, 1), (0, 1))):
        uv.data[index].uv = coord
    ob = bpy.data.objects.new(f"{direction}.{name}", mesh)
    bpy.context.collection.objects.link(ob)
    ob.parent = facing
    mesh.materials.append(emission_material(f"{direction}.{name}.paint", image))
    vg = ob.vertex_groups.new(name=bind_bone[name])
    vg.add([0, 1, 2, 3], 1, "REPLACE")
    mod = ob.modifiers.new("Single shared puppet rig", "ARMATURE")
    mod.object = rig
    ob.hide_render = direction != "s"
    return ob


for direction, parts in INDEX["directions"].items():
    for name, spec in parts.items():
        make_part(direction, name, spec)

for pb in rig.pose.bones:
    pb.rotation_mode = "XYZ"


def key_action(name, count, thrust_sign=1):
    rig.animation_data_create()
    act = bpy.data.actions.new(name)
    rig.animation_data.action = act
    for frame in range(1, count + 1):
        phase = math.tau * (frame - 1) / count
        for pb in rig.pose.bones:
            pb.rotation_euler = (0, 0, 0)
            pb.location = (0, 0, 0)
        if name == "idle":
            rig.pose.bones["head"].rotation_euler.y = math.radians(.45) * math.sin(phase)
            rig.pose.bones["skirt"].rotation_euler.y = math.radians(.5) * math.sin(phase + .5)
        elif name == "walk":
            rig.pose.bones["leg.R"].rotation_euler.y = math.radians(13) * math.sin(phase)
            rig.pose.bones["leg.L"].rotation_euler.y = -math.radians(13) * math.sin(phase)
            rig.pose.bones["arm.R"].rotation_euler.y = -math.radians(7) * math.sin(phase)
            rig.pose.bones["arm.L"].rotation_euler.y = math.radians(7) * math.sin(phase)
            rig.pose.bones["skirt"].rotation_euler.y = math.radians(2.5) * math.sin(phase + .3)
            rig.pose.bones["head"].rotation_euler.y = math.radians(.8) * math.sin(phase + .5)
        else:
            amount = [0, .1, .24, .48, .78, 1, 1, .86, .60, .35, .12, 0][frame - 1]
            rig.pose.bones["arm.R"].rotation_euler.y = math.radians(66 * thrust_sign) * amount
            rig.pose.bones["arm.L"].rotation_euler.y = -math.radians(12 * thrust_sign) * amount
            rig.pose.bones["head"].rotation_euler.y = -math.radians(3 * thrust_sign) * amount
            rig.pose.bones["skirt"].rotation_euler.y = math.radians(3 * thrust_sign) * amount
            rig.pose.bones["leg.R"].rotation_euler.y = math.radians(8 * thrust_sign) * amount
            rig.pose.bones["leg.L"].rotation_euler.y = -math.radians(8 * thrust_sign) * amount
        for pb in rig.pose.bones:
            pb.keyframe_insert("rotation_euler", frame=frame)
            pb.keyframe_insert("location", frame=frame)
    act.use_fake_user = True


key_action("idle", 4)
key_action("walk", 8)
key_action("thrust_s", 12, 1)
key_action("thrust_se", 12, -1)

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.samples = 8
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.resolution_x = 640
scene.render.resolution_y = 512
scene.render.resolution_percentage = 100
scene.render.fps = 12
scene.view_settings.view_transform = "Standard"

camera_data = bpy.data.cameras.new("SpriteCamera")
camera = bpy.data.objects.new("SpriteCamera", camera_data)
scene.collection.objects.link(camera)
target = Vector((0, math.sin(math.radians(42)) * 1.02,
                 math.cos(math.radians(42)) * 1.02))
camera.location = target + Vector((0, -6, 5.4))
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera_data.type = "ORTHO"
camera_data.ortho_scale = 3.4
scene.camera = camera

rig.animation_data.action = bpy.data.actions["idle"]
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(MASTER))
scene.render.filepath = str(SOURCE / "puppet-rig-preview-s.png")
bpy.ops.render.render(write_still=True)
print(f"Saved shared puppet rig master and S preview: {MASTER}")
