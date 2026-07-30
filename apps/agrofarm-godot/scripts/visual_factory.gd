class_name VisualFactory
extends RefCounted

static var _material_cache: Dictionary = {}

static func material(color: Color, roughness: float = 0.82, metallic: float = 0.0) -> StandardMaterial3D:
	var key := "%s|%.2f|%.2f" % [color.to_html(), roughness, metallic]
	if _material_cache.has(key):
		return _material_cache[key]
	var value := StandardMaterial3D.new()
	value.albedo_color = color
	value.roughness = roughness
	value.metallic = metallic
	value.cull_mode = BaseMaterial3D.CULL_BACK
	_material_cache[key] = value
	return value

static func box(parent: Node, node_name: String, position: Vector3, size: Vector3, color: Color, rotation: Vector3 = Vector3.ZERO, shadow: bool = true) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.name = node_name
	var mesh := BoxMesh.new()
	mesh.size = size
	node.mesh = mesh
	node.material_override = material(color)
	node.position = position
	node.rotation = rotation
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(node)
	return node

static func sphere(parent: Node, node_name: String, position: Vector3, radius: float, color: Color, scale_value: Vector3 = Vector3.ONE, shadow: bool = true) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.name = node_name
	var mesh := SphereMesh.new()
	mesh.radius = radius
	mesh.height = radius * 2.0
	mesh.radial_segments = 16
	mesh.rings = 8
	node.mesh = mesh
	node.material_override = material(color)
	node.position = position
	node.scale = scale_value
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(node)
	return node

static func cylinder(parent: Node, node_name: String, position: Vector3, radius: float, height: float, color: Color, rotation: Vector3 = Vector3.ZERO, sides: int = 12, shadow: bool = true) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.name = node_name
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius
	mesh.height = height
	mesh.radial_segments = sides
	node.mesh = mesh
	node.material_override = material(color)
	node.position = position
	node.rotation = rotation
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(node)
	return node

static func capsule(parent: Node, node_name: String, position: Vector3, radius: float, height: float, color: Color, rotation: Vector3 = Vector3.ZERO) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.name = node_name
	var mesh := CapsuleMesh.new()
	mesh.radius = radius
	mesh.height = height
	mesh.radial_segments = 16
	mesh.rings = 8
	node.mesh = mesh
	node.material_override = material(color)
	node.position = position
	node.rotation = rotation
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	parent.add_child(node)
	return node

static func quad(parent: Node, node_name: String, position: Vector3, size: Vector2, color: Color, rotation: Vector3 = Vector3(-PI / 2.0, 0.0, 0.0), shadow: bool = false) -> MeshInstance3D:
	var node := MeshInstance3D.new()
	node.name = node_name
	var mesh := QuadMesh.new()
	mesh.size = size
	node.mesh = mesh
	node.material_override = material(color, 0.95)
	node.position = position
	node.rotation = rotation
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	parent.add_child(node)
	return node

static func collision_box(parent: Node, position: Vector3, size: Vector3, metadata: Dictionary = {}) -> StaticBody3D:
	var body := StaticBody3D.new()
	body.position = position
	var shape_node := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	shape_node.shape = shape
	body.add_child(shape_node)
	for key in metadata:
		body.set_meta(key, metadata[key])
	parent.add_child(body)
	return body

static func interaction_area(parent: Node, node_name: String, position: Vector3, size: Vector3, metadata: Dictionary) -> Area3D:
	var area := Area3D.new()
	area.name = node_name
	area.position = position
	area.collision_layer = 2
	area.collision_mask = 0
	var shape_node := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = size
	shape_node.shape = shape
	area.add_child(shape_node)
	for key in metadata:
		area.set_meta(key, metadata[key])
	parent.add_child(area)
	return area

static func ribbon_mesh(points: Array[Vector3], width: float, color: Color, y: float = 0.04) -> MeshInstance3D:
	var surface := SurfaceTool.new()
	surface.begin(Mesh.PRIMITIVE_TRIANGLES)
	for index in range(points.size() - 1):
		var first := points[index]
		var second := points[index + 1]
		var direction := (second - first).normalized()
		var side := Vector3(-direction.z, 0.0, direction.x) * width * 0.5
		var a := Vector3(first.x, y, first.z) - side
		var b := Vector3(first.x, y, first.z) + side
		var c := Vector3(second.x, y, second.z) + side
		var d := Vector3(second.x, y, second.z) - side
		for vertex in [a, b, c, a, c, d]:
			surface.set_normal(Vector3.UP)
			surface.add_vertex(vertex)
	var node := MeshInstance3D.new()
	node.mesh = surface.commit()
	node.material_override = material(color, 1.0)
	node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return node
