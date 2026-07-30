class_name FarmWorld
extends Node3D

var plots: Array[CropPlot] = []
var buildings: Dictionary = {}
var player: Node3D
var camera_rig: Node3D
var camera: Camera3D
var sun: DirectionalLight3D
var environment: Environment

const GRASS := Color("6eb94f")
const GRASS_LIGHT := Color("83c85b")
const GRASS_DARK := Color("4f9d45")
const WOOD := Color("8a5a34")
const WOOD_LIGHT := Color("b7824b")
const CREAM := Color("f5dd9c")
const RED := Color("b94236")
const ROOF_RED := Color("a9322b")
const PATH := Color("d7a45e")
const WATER := Color("50b8d2")

func setup() -> void:
	_setup_environment()
	_build_camera()
	_build_terrain()
	_build_paths_and_water()
	_build_house(Vector3(1.5, 0.35, -9.5))
	_build_barn(Vector3(11.5, 0.35, -6.5))
	_build_workshop(Vector3(-11.0, 0.35, -6.0))
	_build_market(Vector3(1.0, 0.35, 8.5))
	_build_coop(Vector3(11.0, 0.35, 8.5))
	_build_fields()
	_build_pasture()
	_build_orchard()
	_build_decorations()
	_build_player()

func _setup_environment() -> void:
	RenderingServer.set_default_clear_color(Color("9bd9f0"))
	var world_environment := WorldEnvironment.new()
	environment = Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color("9bd9f0")
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color("dff5d2")
	environment.ambient_light_energy = 0.72
	environment.reflected_light_source = Environment.REFLECTION_SOURCE_DISABLED
	environment.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	environment.adjustment_enabled = true
	environment.adjustment_brightness = 1.04
	environment.adjustment_saturation = 1.08
	world_environment.environment = environment
	add_child(world_environment)
	sun = DirectionalLight3D.new()
	sun.name = "Sun"
	sun.rotation_degrees = Vector3(-52, -35, 0)
	sun.light_color = Color("fff0c2")
	sun.light_energy = 1.25
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 58.0
	sun.directional_shadow_pancake_size = 12.0
	add_child(sun)

func _build_camera() -> void:
	camera_rig = Node3D.new()
	camera_rig.name = "CameraRig"
	camera_rig.rotation_degrees.y = 42.0
	add_child(camera_rig)
	camera = Camera3D.new()
	camera.name = "Camera"
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 25.5
	camera.near = 0.1
	camera.far = 160.0
	camera.position = Vector3(0, 22, 24)
	camera.rotation_degrees.x = -43.0
	camera.current = true
	camera_rig.add_child(camera)

func _build_terrain() -> void:
	VisualFactory.box(self, "WaterBase", Vector3(0, -0.85, 0), Vector3(64, 1.2, 49), Color("67c3db"), Vector3.ZERO, false)
	for data in [
		[Vector3(-8, -0.22, -3), 21.0, 0.65, GRASS],
		[Vector3(10, -0.20, -3), 18.5, 0.68, GRASS_LIGHT],
		[Vector3(-2, -0.18, 10), 18.0, 0.7, GRASS],
		[Vector3(13, -0.19, 9), 14.5, 0.66, GRASS_DARK],
	]:
		var island := VisualFactory.cylinder(self, "TerrainPatch", data[0], data[1], data[2], data[3], Vector3.ZERO, 48, false)
		island.scale.z = 0.72
	VisualFactory.collision_box(self, Vector3(0, -0.05, 0), Vector3(48, 0.5, 36), {"interaction_type": "ground"})

func _build_paths_and_water() -> void:
	var main_path: Array[Vector3] = [Vector3(1.5, 0, -8.4), Vector3(1.0, 0, -4.5), Vector3(-1.0, 0, 0.0), Vector3(0.3, 0, 4.4), Vector3(1.0, 0, 8.0)]
	var branch_left: Array[Vector3] = [Vector3(-0.5, 0, -1.0), Vector3(-5.5, 0, -2.5), Vector3(-10.0, 0, -5.2)]
	var branch_right: Array[Vector3] = [Vector3(0.0, 0, 1.0), Vector3(6.0, 0, 0.0), Vector3(10.8, 0, -5.0)]
	var branch_coop: Array[Vector3] = [Vector3(0.5, 0, 5.0), Vector3(6.2, 0, 6.8), Vector3(10.4, 0, 8.0)]
	for path_points in [main_path, branch_left, branch_right, branch_coop]:
		var path_mesh := VisualFactory.ribbon_mesh(path_points, 1.75, PATH, 0.15)
		path_mesh.name = "DirtPath"
		add_child(path_mesh)
	var river_points: Array[Vector3] = [Vector3(-24, 0, 10), Vector3(-18, 0, 9), Vector3(-13, 0, 10), Vector3(-8, 0, 12), Vector3(-2, 0, 14), Vector3(5, 0, 15), Vector3(13, 0, 14), Vector3(22, 0, 12)]
	var river := VisualFactory.ribbon_mesh(river_points, 4.2, WATER, 0.1)
	river.name = "River"
	add_child(river)
	for index in range(6):
		VisualFactory.box(self, "BridgePlank", Vector3(-7.5 + index * 0.55, 0.35, 11.5), Vector3(0.48, 0.2, 4.6), WOOD_LIGHT, Vector3(0, 0.12, 0))
	for side in [-1.0, 1.0]:
		VisualFactory.box(self, "BridgeRail", Vector3(-6.1, 1.05, 11.5 + side * 2.05), Vector3(4.2, 0.16, 0.16), WOOD)
		for x in [-7.8, -6.7, -5.6, -4.5]:
			VisualFactory.cylinder(self, "BridgePost", Vector3(x, 0.78, 11.5 + side * 2.05), 0.08, 1.25, WOOD, Vector3.ZERO, 8)

func _roof(parent: Node, center: Vector3, width: float, depth: float, color: Color, pitch: float = 0.48) -> void:
	var half_width := width * 0.54
	VisualFactory.box(parent, "RoofLeft", center + Vector3(-width * 0.23, 0, 0), Vector3(half_width, 0.24, depth), color, Vector3(0, 0, pitch))
	VisualFactory.box(parent, "RoofRight", center + Vector3(width * 0.23, 0, 0), Vector3(half_width, 0.24, depth), color, Vector3(0, 0, -pitch))

func _building_area(key: String, position_value: Vector3, size: Vector3, entrance: Vector3) -> Area3D:
	var area := VisualFactory.interaction_area(self, "%sArea" % key.capitalize(), position_value, size, {"interaction_type": "building", "interaction_id": key})
	buildings[key] = {"area": area, "entrance": entrance}
	return area

func _build_house(position_value: Vector3) -> void:
	var root := Node3D.new()
	root.name = "FarmHouse"
	root.position = position_value
	add_child(root)
	VisualFactory.box(root, "Foundation", Vector3(0, 0.35, 0), Vector3(7.0, 0.7, 5.4), Color("c7a06b"))
	VisualFactory.box(root, "Walls", Vector3(0, 2.2, 0), Vector3(6.5, 3.4, 4.9), CREAM)
	_roof(root, Vector3(0, 4.25, 0), 7.4, 5.8, ROOF_RED, 0.5)
	VisualFactory.box(root, "Porch", Vector3(0, 0.75, 3.0), Vector3(6.0, 0.25, 1.7), Color("d6b06d"))
	for x in [-2.45, 2.45]:
		VisualFactory.cylinder(root, "PorchPost", Vector3(x, 1.8, 3.45), 0.11, 2.3, Color("fff1ce"), Vector3.ZERO, 10)
	VisualFactory.box(root, "Door", Vector3(0, 1.7, 2.49), Vector3(1.1, 2.5, 0.15), Color("75452d"))
	for x in [-2.0, 2.0]:
		VisualFactory.box(root, "Window", Vector3(x, 2.2, 2.5), Vector3(1.1, 1.25, 0.13), Color("74c4d2"), Vector3.ZERO, false)
		VisualFactory.box(root, "FlowerBox", Vector3(x, 1.48, 2.68), Vector3(1.35, 0.25, 0.35), Color("8c5735"))
		for flower_x in [-0.38, 0.0, 0.38]:
			VisualFactory.sphere(root, "PorchFlower", Vector3(x + flower_x, 1.72, 2.72), 0.13, Color.from_hsv(randf(), 0.65, 0.96), Vector3.ONE, false)
	VisualFactory.cylinder(root, "Chimney", Vector3(-2.2, 5.0, -0.8), 0.35, 2.2, Color("8a6651"), Vector3.ZERO, 10)
	_building_area("house", position_value + Vector3(0, 2.0, 0), Vector3(7.5, 4.5, 6.2), position_value + Vector3(0, 0, 4.5))

func _build_barn(position_value: Vector3) -> void:
	var root := Node3D.new()
	root.name = "Barn"
	root.position = position_value
	add_child(root)
	VisualFactory.box(root, "BarnWalls", Vector3(0, 2.2, 0), Vector3(7.2, 4.2, 6.2), RED)
	_roof(root, Vector3(0, 4.75, 0), 8.2, 7.0, Color("3f5364"), 0.48)
	VisualFactory.box(root, "DoorFrame", Vector3(0, 1.7, 3.12), Vector3(3.4, 3.3, 0.18), Color("f7e8c5"))
	VisualFactory.box(root, "Door", Vector3(0, 1.7, 3.25), Vector3(2.85, 2.9, 0.2), Color("873d2c"))
	for diagonal in [-1.0, 1.0]:
		VisualFactory.box(root, "DoorBrace", Vector3(0, 1.7, 3.4), Vector3(0.16, 3.3, 0.12), Color("f7e8c5"), Vector3(0, 0, diagonal * 0.73))
	VisualFactory.box(root, "LoftDoor", Vector3(0, 3.5, 3.18), Vector3(2.4, 1.15, 0.16), Color("f7e8c5"))
	for x in [-4.2, -3.25, 3.3, 4.2]:
		VisualFactory.box(root, "HayBale", Vector3(x, 0.55, 1.8), Vector3(0.85, 1.0, 1.35), Color("d9a83f"), Vector3(0, randf_range(-0.2, 0.2), 0))
	_build_silo(root, Vector3(5.0, 0, -0.8))
	_building_area("barn", position_value + Vector3(1.3, 2.2, 0), Vector3(11.0, 5.3, 7.2), position_value + Vector3(0, 0, 4.6))

func _build_silo(parent: Node, local_position: Vector3) -> void:
	VisualFactory.cylinder(parent, "SiloBody", local_position + Vector3(0, 2.8, 0), 1.25, 5.6, Color("aeb7b4"), Vector3.ZERO, 18)
	var cap := VisualFactory.sphere(parent, "SiloCap", local_position + Vector3(0, 5.6, 0), 1.3, Color("8d9998"), Vector3(1, 0.55, 1))
	cap.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	for ring in [1.1, 2.1, 3.1, 4.1]:
		VisualFactory.cylinder(parent, "SiloRing", local_position + Vector3(0, ring, 0), 1.28, 0.08, Color("7e8b8b"), Vector3.ZERO, 18)

func _build_workshop(position_value: Vector3) -> void:
	var root := Node3D.new()
	root.name = "Workshop"
	root.position = position_value
	add_child(root)
	VisualFactory.box(root, "WorkshopWalls", Vector3(0, 1.7, 0), Vector3(6.5, 3.2, 5.1), Color("c8a56b"))
	_roof(root, Vector3(0, 3.65, 0), 7.2, 5.8, Color("47724f"), 0.42)
	VisualFactory.box(root, "OpenDoor", Vector3(0.8, 1.45, 2.58), Vector3(2.7, 2.65, 0.16), Color("554333"))
	VisualFactory.box(root, "Awning", Vector3(-1.8, 2.5, 3.1), Vector3(2.2, 0.18, 1.1), Color("4385b0"), Vector3(0.15, 0, 0))
	for x in [-2.6, -1.8, -1.0]:
		VisualFactory.cylinder(root, "Barrel", Vector3(x, 0.62, 3.05), 0.34, 1.05, Color("607c86"), Vector3.ZERO, 12)
	VisualFactory.box(root, "Workbench", Vector3(2.1, 0.8, 2.7), Vector3(2.0, 0.22, 0.75), WOOD_LIGHT)
	for wheel_x in [-2.0, 2.0]:
		VisualFactory.cylinder(root, "TractorWheel", Vector3(wheel_x, 0.6, -3.0), 0.62, 0.35, Color("2f3432"), Vector3(PI / 2.0, 0, 0), 16)
	VisualFactory.box(root, "TractorBody", Vector3(0, 0.85, -3.0), Vector3(3.8, 0.8, 1.4), Color("d98135"))
	_building_area("workshop", position_value + Vector3(0, 1.8, 0), Vector3(7.5, 4.4, 7.4), position_value + Vector3(0.8, 0, 4.2))

func _build_market(position_value: Vector3) -> void:
	var root := Node3D.new()
	root.name = "FarmMarket"
	root.position = position_value
	add_child(root)
	VisualFactory.box(root, "Counter", Vector3(0, 0.9, 0), Vector3(5.8, 1.8, 2.3), WOOD)
	VisualFactory.box(root, "CounterTop", Vector3(0, 1.85, 0.2), Vector3(6.3, 0.18, 2.6), Color("ad7540"))
	for x in [-2.5, 2.5]:
		VisualFactory.cylinder(root, "MarketPost", Vector3(x, 2.7, 0), 0.1, 3.4, Color("745034"), Vector3.ZERO, 8)
	for stripe in range(7):
		var stripe_color := Color("f7ead0") if stripe % 2 == 0 else Color("d95b46")
		VisualFactory.box(root, "AwningStripe", Vector3(-2.55 + stripe * 0.85, 4.0, 0), Vector3(0.82, 0.16, 3.1), stripe_color, Vector3(0.14, 0, 0))
	for index in range(12):
		var produce_colors := [Color("de5a3a"), Color("efbe3c"), Color("70aa4b"), Color("cf7b32")]
		VisualFactory.sphere(root, "Produce", Vector3(-2.2 + (index % 6) * 0.88, 2.15, -0.3 + floor(index / 6.0) * 0.65), 0.28, produce_colors[index % produce_colors.size()], Vector3.ONE, false)
	VisualFactory.box(root, "MarketSign", Vector3(0, 3.1, -1.5), Vector3(3.0, 0.65, 0.15), Color("5c4935"))
	_building_area("market", position_value + Vector3(0, 2.0, 0), Vector3(6.8, 4.7, 4.0), position_value + Vector3(0, 0, 3.2))

func _build_coop(position_value: Vector3) -> void:
	var root := Node3D.new()
	root.name = "ChickenCoop"
	root.position = position_value
	add_child(root)
	VisualFactory.box(root, "CoopBody", Vector3(0, 1.2, 0), Vector3(4.4, 2.4, 3.7), Color("d59f57"))
	_roof(root, Vector3(0, 2.75, 0), 5.0, 4.3, ROOF_RED, 0.48)
	VisualFactory.box(root, "CoopDoor", Vector3(0, 0.92, 1.86), Vector3(1.3, 1.7, 0.15), Color("70462f"))
	VisualFactory.box(root, "Ramp", Vector3(0, 0.28, 2.9), Vector3(1.4, 0.15, 2.1), WOOD_LIGHT, Vector3(-0.18, 0, 0))
	_fence_rect(position_value + Vector3(0, 0, 0.5), Vector2(8.5, 7.5), Color("9c7545"), 1.2)
	for offset in [Vector3(-2.2, 0, 2.5), Vector3(2.0, 0, 2.2), Vector3(2.3, 0, -1.3), Vector3(-2.0, 0, -1.5)]:
		var chicken := FarmAnimal.new()
		chicken.setup("chicken", position_value + offset, 1.5)
		add_child(chicken)

func _build_fields() -> void:
	var start := Vector3(-8.8, 0.22, 1.8)
	for row in range(3):
		for column in range(4):
			var plot := CropPlot.new()
			add_child(plot)
			plot.setup(row * 4 + column, start + Vector3(column * 3.65, 0, row * 2.9))
			plots.append(plot)
	_fence_rect(Vector3(-3.3, 0, 4.7), Vector2(16.6, 10.3), Color("a57c48"), 1.1, false)

func _build_pasture() -> void:
	var center := Vector3(7.7, 0, 1.6)
	_fence_rect(center, Vector2(11.8, 9.2), Color("9d7546"), 1.25)
	VisualFactory.cylinder(self, "Trough", center + Vector3(1.6, 0.42, 2.8), 0.62, 2.4, Color("5daec5"), Vector3(0, 0, PI / 2.0), 16)
	for offset in [Vector3(-2.6, 0, -2.3), Vector3(1.8, 0, -2.0), Vector3(-1.0, 0, 1.1), Vector3(2.3, 0, 1.5)]:
		var cow := FarmAnimal.new()
		cow.setup("cow", center + offset, 2.0)
		add_child(cow)

func _build_orchard() -> void:
	for row in range(3):
		for column in range(4):
			_tree(Vector3(12.0 + column * 2.5, 0, -0.4 + row * 3.0), true, 0.82 + randf() * 0.12)

func _build_decorations() -> void:
	var tree_positions := [
		Vector3(-18, 0, -10), Vector3(-15, 0, -7), Vector3(-17, 0, -2), Vector3(-18, 0, 5), Vector3(-14, 0, 10),
		Vector3(-10, 0, -13), Vector3(-4, 0, -14), Vector3(5, 0, -14), Vector3(14, 0, -12), Vector3(18, 0, -8),
		Vector3(20, 0, -1), Vector3(19, 0, 6), Vector3(17, 0, 12), Vector3(10, 0, 13), Vector3(3, 0, 14),
	]
	for tree_position in tree_positions:
		_tree(tree_position, randf() > 0.72, randf_range(0.75, 1.2))
	for index in range(70):
		var angle := float(index) * 2.399
		var radius := 5.0 + float(index % 13) * 1.35
		var position_value := Vector3(cos(angle) * radius, 0.2, sin(angle) * radius * 0.72)
		if abs(position_value.x) < 7.5 and position_value.z > 0.5 and position_value.z < 9.0:
			position_value.x += 12.0
		_flower(position_value, Color.from_hsv(fmod(float(index) * 0.17, 1.0), 0.58, 0.96))
	for hay_position in [Vector3(7.5, 0.55, -8.7), Vector3(8.5, 0.55, -8.5), Vector3(9.5, 0.55, -8.3)]:
		VisualFactory.cylinder(self, "HayBale", hay_position, 0.62, 1.1, Color("d8aa43"), Vector3(0, 0, PI / 2.0), 16)
	for duck_offset in [-1.6, 0.0, 1.4]:
		var duck := FarmAnimal.new()
		duck.setup("chicken", Vector3(-11 + duck_offset, 0.08, 12.0 + randf_range(-0.5, 0.5)), 0.8)
		duck.scale = Vector3(0.7, 0.7, 0.7)
		add_child(duck)

func _tree(position_value: Vector3, fruit: bool = false, scale_value: float = 1.0) -> void:
	var root := Node3D.new()
	root.name = "FruitTree" if fruit else "Tree"
	root.position = position_value
	root.scale = Vector3.ONE * scale_value
	add_child(root)
	VisualFactory.cylinder(root, "Trunk", Vector3(0, 1.45, 0), 0.28, 2.9, Color("795035"), Vector3.ZERO, 10)
	for crown_data in [[Vector3(-0.65, 3.15, 0.1), 1.2], [Vector3(0.7, 3.25, 0), 1.28], [Vector3(0, 4.1, 0), 1.38], [Vector3(0, 3.3, -0.7), 1.08]]:
		VisualFactory.sphere(root, "Crown", crown_data[0], crown_data[1], Color("4d9f48") if not fruit else Color("458d42"), Vector3(1.0, 0.9, 1.0))
	if fruit:
		for fruit_position in [Vector3(-0.75, 3.55, 0.8), Vector3(0.65, 3.8, 0.9), Vector3(0.9, 3.1, -0.35), Vector3(-0.15, 4.4, 0.4)]:
			VisualFactory.sphere(root, "Apple", fruit_position, 0.16, Color("df5141"), Vector3.ONE, false)

func _flower(position_value: Vector3, color: Color) -> void:
	var root := Node3D.new()
	root.position = position_value
	root.scale = Vector3.ONE * randf_range(0.6, 1.0)
	add_child(root)
	VisualFactory.cylinder(root, "Stem", Vector3(0, 0.18, 0), 0.025, 0.36, Color("4e8c3f"), Vector3.ZERO, 6, false)
	for angle in range(5):
		var radians := TAU * float(angle) / 5.0
		VisualFactory.sphere(root, "Petal", Vector3(cos(radians) * 0.1, 0.42, sin(radians) * 0.1), 0.09, color, Vector3(1.0, 0.45, 1.0), false)
	VisualFactory.sphere(root, "Center", Vector3(0, 0.43, 0), 0.06, Color("f5cf55"), Vector3.ONE, false)

func _fence_rect(center: Vector3, size: Vector2, color: Color, height: float = 1.2, front_gate: bool = true) -> void:
	var half_x := size.x * 0.5
	var half_z := size.y * 0.5
	var spacing := 2.1
	for side_z in [-half_z, half_z]:
		var x := -half_x
		while x <= half_x + 0.1:
			if not (front_gate and side_z > 0 and abs(x) < 1.3):
				VisualFactory.cylinder(self, "FencePost", center + Vector3(x, height * 0.5, side_z), 0.08, height, color, Vector3.ZERO, 8)
			x += spacing
		var sections := int(ceil(size.x / spacing))
		for section in range(sections):
			var rail_x := -half_x + spacing * 0.5 + section * spacing
			if front_gate and side_z > 0 and abs(rail_x) < 1.3:
				continue
			for rail_y in [height * 0.38, height * 0.78]:
				VisualFactory.box(self, "FenceRail", center + Vector3(rail_x, rail_y, side_z), Vector3(spacing, 0.1, 0.1), color)
	for side_x in [-half_x, half_x]:
		var z := -half_z
		while z <= half_z + 0.1:
			VisualFactory.cylinder(self, "FencePost", center + Vector3(side_x, height * 0.5, z), 0.08, height, color, Vector3.ZERO, 8)
			z += spacing
		var sections := int(ceil(size.y / spacing))
		for section in range(sections):
			var rail_z := -half_z + spacing * 0.5 + section * spacing
			for rail_y in [height * 0.38, height * 0.78]:
				VisualFactory.box(self, "FenceRail", center + Vector3(side_x, rail_y, rail_z), Vector3(0.1, 0.1, spacing), color)

func _build_player() -> void:
	player = Node3D.new()
	player.name = "Player"
	player.position = Vector3(0, 0.05, 1.2)
	add_child(player)
	VisualFactory.cylinder(player, "Shadow", Vector3(0, 0.05, 0), 0.48, 0.03, Color(0.12, 0.2, 0.1, 0.28), Vector3.ZERO, 18, false)
	VisualFactory.capsule(player, "Body", Vector3(0, 1.0, 0), 0.34, 1.25, Color("3977a7"))
	VisualFactory.sphere(player, "Head", Vector3(0, 1.88, 0), 0.34, Color("dca67a"))
	VisualFactory.box(player, "Shirt", Vector3(0, 1.2, 0.18), Vector3(0.68, 0.58, 0.12), Color("c44d3c"))
	VisualFactory.cylinder(player, "HatBrim", Vector3(0, 2.18, 0), 0.56, 0.09, Color("d3a44e"), Vector3.ZERO, 18)
	VisualFactory.cylinder(player, "HatTop", Vector3(0, 2.32, 0), 0.34, 0.28, Color("c89440"), Vector3.ZERO, 16)
	for side in [-1.0, 1.0]:
		VisualFactory.cylinder(player, "Arm", Vector3(side * 0.43, 1.22, 0), 0.09, 0.72, Color("dca67a"), Vector3(0, 0, side * 0.22), 10)
		VisualFactory.cylinder(player, "Leg", Vector3(side * 0.19, 0.42, 0), 0.11, 0.8, Color("304d72"), Vector3.ZERO, 10)
