"""Paint an untextured generated body from its orthographic reference views, for /mobile/finger-network/2.

Run headless:
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
    --python apps/scc/scripts/texture-finger-network-model.py -- shape.glb front.png left.png back.png output.glb \
    [--triangles 60000] [--texture 2048]

The views are background-free images cropped to the person and centered on a square canvas, as an image-to-3D
service receives them: front faces the camera, left shows the person's left side, back shows their back. The
person's right side reuses the mirrored left view. Each view is projected along its axis onto the mesh's bounding
box; a vertex takes a view only if it faces that view and nothing occludes it, weighted by how squarely it faces.
The blend is baked into one texture on a fresh UV layout.
"""

import sys
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

args = sys.argv[sys.argv.index("--") + 1:]
shape, front_path, left_path, back_path, target = args[:5]
triangles = int(args[args.index("--triangles") + 1]) if "--triangles" in args else 60000
texture_size = int(args[args.index("--texture") + 1]) if "--texture" in args else 2048

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=shape)
meshes = [obj for obj in bpy.data.objects if obj.type == "MESH"]
bpy.ops.object.select_all(action="DESELECT")
for obj in meshes:
    obj.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
body = bpy.context.view_layer.objects.active
bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for slot in list(body.material_slots):
    body.data.materials.clear()

faces = sum(len(polygon.vertices) - 2 for polygon in body.data.polygons)
if faces > triangles:
    decimate = body.modifiers.new("decimate", "DECIMATE")
    decimate.ratio = triangles / faces
    bpy.ops.object.modifier_apply(modifier=decimate.name)
bpy.ops.object.shade_smooth()

mesh = body.data
points = [v.co for v in mesh.vertices]
low = Vector((min(p.x for p in points), min(p.y for p in points), min(p.z for p in points)))
high = Vector((max(p.x for p in points), max(p.y for p in points), max(p.z for p in points)))
size = high - low


def image_box(image):
    """The opaque bounding box of a padded view, in 0..1 image coordinates (v up)."""
    width, height = image.size
    pixels = image.pixels[:]
    xs, ys = [], []
    for y in range(0, height, 2):
        row = y * width * 4
        for x in range(0, width, 2):
            if pixels[row + x * 4 + 3] > 0.5:
                xs.append(x)
                ys.append(y)
    return min(xs) / width, min(ys) / height, max(xs) / width, max(ys) / height


images = {name: bpy.data.images.load(path) for name, path in (("front", front_path), ("left", left_path), ("back", back_path))}
boxes = {name: image_box(image) for name, image in images.items()}

# view: (image, horizontal image coordinate of a point, direction toward the camera)
# Blender after glTF import: the person faces -Y, their left is +X, up is +Z.
views = {
    "front": ("front", lambda p: (p.x - low.x) / size.x, Vector((0, -1, 0))),
    "back": ("back", lambda p: (high.x - p.x) / size.x, Vector((0, 1, 0))),
    "left": ("left", lambda p: (p.y - low.y) / size.y, Vector((1, 0, 0))),
    # Seen from the right, the left view's front-to-back axis reads the same way, which mirrors the image.
    "right": ("left", lambda p: (p.y - low.y) / size.y, Vector((-1, 0, 0))),
}

tree = BVHTree.FromObject(body, bpy.context.evaluated_depsgraph_get())
reach = size.length * 2
weights = {name: [0.0] * len(mesh.vertices) for name in views}
for vertex in mesh.vertices:
    for name, (_, _, toward) in views.items():
        facing = vertex.normal.dot(toward)
        if facing <= 0.05:
            continue
        hit = tree.ray_cast(vertex.co + toward * size.length * 0.004, toward, reach)
        if hit[0] is not None:
            continue
        weights[name][vertex.index] = facing ** 3
    total = sum(weights[name][vertex.index] for name in views)
    if total == 0:
        weights["front"][vertex.index] = 1.0
        total = 1.0
    for name in views:
        weights[name][vertex.index] /= total

# One projection UV layer and one weight attribute per view; a fresh layout receives the bake.
for name, (image_name, horizontal, _) in views.items():
    layer = mesh.uv_layers.new(name="proj_" + name)
    left_edge, bottom, right_edge, top = boxes[image_name]
    for loop in mesh.loops:
        p = mesh.vertices[loop.vertex_index].co
        u = horizontal(p)
        layer.data[loop.index].uv = (left_edge + u * (right_edge - left_edge), bottom + (p.z - low.z) / size.z * (top - bottom))
    attribute = mesh.attributes.new(name="w_" + name, type="FLOAT", domain="POINT")
    attribute.data.foreach_set("value", weights[name])
baked_layer = mesh.uv_layers.new(name="UVMap")
mesh.uv_layers.active = baked_layer
baked_layer.active_render = True
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.003)
bpy.ops.object.mode_set(mode="OBJECT")

# Projection shader: four image lookups mixed by the per-vertex weights, emitted for baking.
material = bpy.data.materials.new("projection")
material.use_nodes = True
nodes, links = material.node_tree.nodes, material.node_tree.links
nodes.clear()
output = nodes.new("ShaderNodeOutputMaterial")
emission = nodes.new("ShaderNodeEmission")
links.new(emission.outputs[0], output.inputs["Surface"])
mixed = None
for name, (image_name, _, _) in views.items():
    uv = nodes.new("ShaderNodeUVMap")
    uv.uv_map = "proj_" + name
    texture = nodes.new("ShaderNodeTexImage")
    texture.image = images[image_name]
    texture.extension = "EXTEND"
    links.new(uv.outputs[0], texture.inputs[0])
    weight = nodes.new("ShaderNodeAttribute")
    weight.attribute_name = "w_" + name
    scaled = nodes.new("ShaderNodeVectorMath")
    scaled.operation = "SCALE"
    links.new(texture.outputs["Color"], scaled.inputs[0])
    links.new(weight.outputs["Fac"], scaled.inputs["Scale"])
    if mixed is None:
        mixed = scaled
    else:
        add = nodes.new("ShaderNodeVectorMath")
        add.operation = "ADD"
        links.new(mixed.outputs[0], add.inputs[0])
        links.new(scaled.outputs[0], add.inputs[1])
        mixed = add
links.new(mixed.outputs[0], emission.inputs["Color"])
baked = bpy.data.images.new("body", texture_size, texture_size)
target_node = nodes.new("ShaderNodeTexImage")
target_node.image = baked
nodes.active = target_node
body.data.materials.append(material)

scene = bpy.context.scene
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 1
scene.render.bake.margin = 8
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.bake(type="EMIT")

# Final material: the baked colour on a matte surface; projection layers and weights are dropped.
for name in views:
    mesh.uv_layers.remove(mesh.uv_layers["proj_" + name])
    mesh.attributes.remove(mesh.attributes["w_" + name])
nodes.clear()
output = nodes.new("ShaderNodeOutputMaterial")
shader = nodes.new("ShaderNodeBsdfPrincipled")
shader.inputs["Roughness"].default_value = 0.72
color = nodes.new("ShaderNodeTexImage")
color.image = baked
links.new(color.outputs["Color"], shader.inputs["Base Color"])
links.new(shader.outputs[0], output.inputs["Surface"])
material.name = "body"
for image in images.values():
    bpy.data.images.remove(image)

bpy.ops.export_scene.gltf(filepath=target, export_format="GLB", use_selection=True, export_image_format="WEBP", export_image_quality=90)
print("textured", target, "faces", len(mesh.polygons))
