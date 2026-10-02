"""Rig a generated full-body mesh for /mobile/finger-network/2's model option.

Run headless:
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    --python apps/scc/scripts/rig-finger-network-model.py -- input.glb output.glb [--triangles 40000] [--texture 2048]

The input is one standing person in an A- or T-pose (any image-to-3D export: glb, gltf, fbx, obj). Joints are
estimated from the mesh's own cross-sections, weights are solved on a watertight voxel proxy and transferred back,
so non-manifold generated meshes still skin. Bone names match screen/model-figure.ts.
"""

import sys
import bpy
import bmesh
from mathutils import Vector

args = sys.argv[sys.argv.index("--") + 1:]
source, target = args[0], args[1]
triangles = int(args[args.index("--triangles") + 1]) if "--triangles" in args else 40000
texture_size = int(args[args.index("--texture") + 1]) if "--texture" in args else 2048

bpy.ops.wm.read_factory_settings(use_empty=True)
extension = source.lower().rsplit(".", 1)[-1]
if extension in ("glb", "gltf"):
    bpy.ops.import_scene.gltf(filepath=source)
elif extension == "fbx":
    bpy.ops.import_scene.fbx(filepath=source)
else:
    bpy.ops.wm.obj_import(filepath=source)

# One mesh, transforms applied, no previous rig.
for obj in list(bpy.data.objects):
    if obj.type == "ARMATURE":
        bpy.data.objects.remove(obj)
meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
bpy.ops.object.select_all(action="DESELECT")
for obj in meshes:
    obj.select_set(True)
    for modifier in list(obj.modifiers):
        obj.modifiers.remove(modifier)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
body = bpy.context.view_layer.objects.active
bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
body.name = "body"

# Feet on the ground, centered, 1.8 m tall: joint estimates below are in proportions of this height.
points = [v.co.copy() for v in body.data.vertices]
low = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
high = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
size = 1.8 / (high.z - low.z)
center = Vector(((low.x + high.x) / 2, (low.y + high.y) / 2, low.z))
for vertex in body.data.vertices:
    vertex.co = (vertex.co - center) * size
body.data.update()
points = [v.co.copy() for v in body.data.vertices]
H = 1.8


def band(z, depth=0.012, side=0):
    """Vertices within a horizontal slab, optionally only one side of the body (screen x)."""
    return [p for p in points if abs(p.z - z) < depth * H and (side == 0 or p.x * side > 0.01 * H)]


def middle(selection, fallback):
    if not selection:
        return fallback
    return sum(selection, Vector()) / len(selection)


# Legs: the slab through each thigh, knee, and ankle, split at the body's center line.
joints = {}
for side, suffix in ((1, "L"), (-1, "R")):
    # glTF is +Z forward; the person's left is +x when they face the camera (-y in Blender after import).
    hip_z, knee_z, ankle_z = 0.5 * H, 0.28 * H, 0.05 * H
    # Hands can hang beside the thighs, so the thigh slab stays inside the hips' width.
    thigh = [p for p in band(0.42 * H, side=side) if abs(p.x) < 0.11 * H]
    joints["thigh_" + suffix] = middle(thigh, Vector((0.06 * H * side, 0, hip_z)))
    joints["thigh_" + suffix].z = hip_z
    joints["shin_" + suffix] = middle([p for p in band(knee_z, side=side) if abs(p.x) < 0.14 * H], Vector((0.06 * H * side, 0, knee_z)))
    joints["foot_" + suffix] = middle(band(ankle_z, side=side), Vector((0.09 * H * side, 0, ankle_z)))
    toe = min((p for p in points if p.z < 0.04 * H and p.x * side > 0), key=lambda p: p.y, default=None)
    joints["toe_" + suffix] = Vector((joints["foot_" + suffix].x, toe.y if toe else -0.12 * H, 0.01 * H))

# Torso centerline from slabs restricted to the middle of the body, so A-posed arms do not pull it sideways.
def torso(z):
    near = [p for p in band(z) if abs(p.x) < 0.1 * H]
    return middle(near, Vector((0, 0, z)))


joints["hips"] = torso(0.53 * H)
joints["spine"] = torso(0.62 * H)
joints["chest"] = torso(0.72 * H)
joints["neck"] = torso(0.845 * H)
joints["head"] = torso(0.9 * H)
joints["head_end"] = Vector((joints["head"].x, joints["head"].y, H))

# Arms: the hand is the farthest point out on each side; shoulders sit on the torso's upper edge.
for side, suffix in ((1, "L"), (-1, "R")):
    outer = [p for p in points if p.x * side > 0.12 * H and p.z > 0.35 * H]
    tip = max(outer, key=lambda p: p.x * side) if outer else Vector((0.4 * H * side, 0, 0.5 * H))
    shoulder = Vector((0.1 * H * side, joints["chest"].y, 0.815 * H))
    wrist = shoulder + (tip - shoulder) * 0.9
    elbow_guess = shoulder + (wrist - shoulder) * 0.5
    near_elbow = [p for p in points if (p - elbow_guess).length < 0.04 * H]
    joints["upperArm_" + suffix] = shoulder
    joints["forearm_" + suffix] = middle(near_elbow, elbow_guess)
    near_wrist = [p for p in points if (p - wrist).length < 0.03 * H]
    joints["hand_" + suffix] = middle(near_wrist, wrist)
    joints["hand_end_" + suffix] = tip
    joints["shoulder_" + suffix] = Vector((0.03 * H * side, joints["chest"].y, 0.81 * H))

# Armature.
armature_data = bpy.data.armatures.new("rig")
rig = bpy.data.objects.new("rig", armature_data)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode="EDIT")
edit = armature_data.edit_bones


def bone(name, head, tail, parent=None):
    b = edit.new(name)
    b.head, b.tail = head, tail
    if (tail - head).length < 1e-4:
        b.tail = head + Vector((0, 0, 0.02))
    if parent:
        b.parent = edit[parent]
        b.use_connect = False
    b.roll = 0
    return b


bone("hips", joints["hips"], joints["spine"])
bone("spine", joints["spine"], joints["chest"], "hips")
bone("chest", joints["chest"], joints["neck"], "spine")
bone("neck", joints["neck"], joints["head"], "chest")
bone("head", joints["head"], joints["head_end"], "neck")
for suffix in ("L", "R"):
    bone("shoulder_" + suffix, joints["shoulder_" + suffix], joints["upperArm_" + suffix], "chest")
    bone("upperArm_" + suffix, joints["upperArm_" + suffix], joints["forearm_" + suffix], "shoulder_" + suffix)
    bone("forearm_" + suffix, joints["forearm_" + suffix], joints["hand_" + suffix], "upperArm_" + suffix)
    bone("hand_" + suffix, joints["hand_" + suffix], joints["hand_end_" + suffix], "forearm_" + suffix)
    bone("thigh_" + suffix, joints["thigh_" + suffix], joints["shin_" + suffix], "hips")
    bone("shin_" + suffix, joints["shin_" + suffix], joints["foot_" + suffix], "thigh_" + suffix)
    bone("foot_" + suffix, joints["foot_" + suffix], joints["toe_" + suffix], "shin_" + suffix)
bpy.ops.object.mode_set(mode="OBJECT")

# Decimate the render mesh first so the weights are solved for the final vertices.
faces = sum(len(polygon.vertices) - 2 for polygon in body.data.polygons)
if faces > triangles:
    decimate = body.modifiers.new("decimate", "DECIMATE")
    decimate.ratio = triangles / faces
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier=decimate.name)

# Weights: heat weighting on a closed voxel proxy, then nearest-surface transfer to the real mesh.
proxy = body.copy()
proxy.data = body.data.copy()
proxy.name = "proxy"
bpy.context.collection.objects.link(proxy)
remesh = proxy.modifiers.new("remesh", "REMESH")
remesh.mode = "VOXEL"
remesh.voxel_size = 0.005
bpy.context.view_layer.objects.active = proxy
bpy.ops.object.modifier_apply(modifier=remesh.name)
bpy.ops.object.select_all(action="DESELECT")
proxy.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.parent_set(type="ARMATURE_AUTO")
unweighted = sum(1 for v in proxy.data.vertices if not v.groups)
print(f"proxy vertices without weights: {unweighted}/{len(proxy.data.vertices)}")

for group in proxy.vertex_groups:
    body.vertex_groups.new(name=group.name)
transfer = body.modifiers.new("weights", "DATA_TRANSFER")
transfer.object = proxy
transfer.use_vert_data = True
transfer.data_types_verts = {"VGROUP_WEIGHTS"}
transfer.vert_mapping = "POLYINTERP_NEAREST"
transfer.layers_vgroup_select_src = "ALL"
transfer.layers_vgroup_select_dst = "NAME"
bpy.context.view_layer.objects.active = body
bpy.ops.object.modifier_apply(modifier=transfer.name)
bpy.data.objects.remove(proxy)
body.parent = rig
skin = body.modifiers.new("rig", "ARMATURE")
skin.object = rig
# The proxy can bridge a hanging arm to the torso; torso skin then follows the arm like a web. Below the shoulder,
# skin inside the torso's own width drops its arm weights.
arm_groups = [body.vertex_groups[name].index for name in body.vertex_groups.keys() if name.startswith(("upperArm_", "forearm_", "hand_"))]
for vertex in body.data.vertices:
    width = abs(joints["upperArm_L"].x) * 0.92
    if vertex.co.z < joints["upperArm_L"].z - 0.02 * H and abs(vertex.co.x) < width:
        for index in arm_groups:
            body.vertex_groups[index].remove([vertex.index])
        if not vertex.groups:
            body.vertex_groups["spine"].add([vertex.index], 1.0, "REPLACE")
bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
bpy.ops.object.vertex_group_normalize_all(lock_active=False)

for image in bpy.data.images:
    if image.size[0] > texture_size or image.size[1] > texture_size:
        image.scale(min(texture_size, image.size[0]), min(texture_size, image.size[1]))

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=target,
    export_format="GLB",
    use_selection=True,
    export_skins=True,
    export_animations=False,
    export_yup=True,
    export_image_format="WEBP",
    export_image_quality=88,
)
print("joints", {name: tuple(round(c, 3) for c in point) for name, point in joints.items()})
print("exported", target)
