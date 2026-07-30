class_name RuralFarmWorld
extends "res://scripts/farm_world.gd"

var editable_trees: Dictionary = {}
var custom_fences: Dictionary = {}
var custom_plot_positions: Array = []
var expansion_roots: Dictionary = {}
var animal_nodes: Array[FarmAnimal] = []
var constructed_objects: Dictionary = {}
var _next_tree_id := 0
var _next_fence_id := 0

const INITIAL_BOUNDS := {"min_x": -21.0, "max_x": 21.0, "min_z": -14.5, "max_z": 14.5}
const EXPANSION_DEPTH := 8.0

func setup() -> void:
	_setup_environment()
	_build_camera()
	_build_terrain()
	_build_paths_and_water()
	_build_house(Vector3(1.5, 0.35, -9.5))
	_build_barn(Vector3(11.5, 0.35, -6.5))
	_build_workshop(Vector3(-11.0, 0.35, -6.0))
	_build_market(Vector3(1.0, 0.35, 8.5))
	_build_initial_fields()
	_build_empty_pasture(Vector3(7.7, 0.0, 1.6))
	_build_empty_coop(Vector3(11.0, 0.35, 8.5))
	_build_empty_pig_pen(Vector3(-11.5, 0.0, 8.0))
	_build_orchard()
	_build_decorations()
	_remove_default_animals()
	_build_player()
	_register_building_roots()
	_register_editable_trees()
	_build_expansion_markers()
	_build_environment_details()

func _build_initial_fields() -> void:
	var start := Vector3(-8.8, 0.22, 1.8)
	for row in range(3):
		for column in range(4):
			var plot := CropPlot.new()
			add_child(plot)
			plot.setup(row * 4 + column, start + Vector3(column * 3.65, 0.0, row * 2.9))
			plots.append(plot)

func _build_empty_pasture(position_value: Vector3) -> void:
	var root := Node3D.new()
	root.name = "CowPasture"
	root.position = position_value
	add_child(root)
	_fence_rect_on(root, Vector3.ZERO, Vector2(11.8, 9.2), Color("9d7546"), 1.25)
	VisualFactory.cylinder(root, "Trough", Vector3(1.6, 0.42, 2.8), 0.62, 2.4, Color("5daec5"), Vector3(0, 0, PI / 2.0), 16)
	VisualFactory.box(root, "PastureSign", Vector3(-3.9, 1.4, 4.2), Vector3(2.2, 0.7, 0.18), Color("6d4a2e"))
	var label := Label3D.new()
	label.text = "PASTO"
	label.font_size = 32
	label.position = Vector3(-3.9, 1.42, 4.32)
	label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	label.modulate = Color("fff0c7")
	root.add_child(label)
	var area := VisualFactory.interaction_area(self, "PastureArea", position_value + Vector3(0, 1.0, 0), Vector3(12.2, 2.2, 9.6), {"interaction_type": "building", "interaction_id": "pasture"})
	buildings["pasture"] = {
		"root": root,
		"area": area,
		"entrance": position_value + Vector3(0, 0, 5.8),
		"entrance_offset": Vector3(0, 0, 5.8),
		"area_offset": Vector3(0, 1.0, 0),
	}

func _build_empty_coop(position_value: Vector3) -> void:
	var root := Node3D.new()
	root.name = "ChickenCoop"
	root.position = position_value
	add_child(root)
	VisualFactory.box(root, "CoopBody", Vector3(0, 1.2, 0), Vector3(4.4, 2.4, 3.7), Color("d59f57"))
	_roof(root, Vector3(0, 2.75, 0), 5.0, 4.3, ROOF_RED, 0.48)
	VisualFactory.box(root, "CoopDoor", Vector3(0, 0.92, 1.86), Vector3(1.3, 1.7, 0.15), Color("70462f"))
	VisualFactory.box(root, "Ramp", Vector3(0, 0.28, 2.9), Vector3(1.4, 0.15, 2.1), WOOD_LIGHT, Vector3(-0.18, 0, 0))
	_fence_rect_on(root, Vector3(0, 0, 0.5), Vector2(8.5, 7.5), Color("9c7545"), 1.2)
	var area := VisualFactory.interaction_area(self, "CoopArea", position_value + Vector3(0, 1.6, 0), Vector3(8.8, 3.8, 7.8), {"interaction_type": "building", "interaction_id": "coop"})
	buildings["coop"] = {
		"root": root,
		"area": area,
		"entrance": position_value + Vector3(0, 0, 4.6),
		"entrance_offset": Vector3(0, 0, 4.6),
		"area_offset": Vector3(0, 1.6, 0),
	}

func _build_empty_pig_pen(position_value: Vector3) -> void:
	var root := Node3D.new()
	root.name = "PigPen"
	root.position = position_value
	add_child(root)
	_fence_rect_on(root, Vector3.ZERO, Vector2(8.8, 7.4), Color("8e6842"), 1.2)
	VisualFactory.box(root, "PigShelter", Vector3(-2.2, 1.05, -1.8), Vector3(3.2, 2.0, 2.8), Color("c68e54"))
	_roof(root, Vector3(-2.2, 2.3, -1.8), 3.8, 3.3, Color("7d4734"), 0.42)
	VisualFactory.box(root, "MudPatch", Vector3(1.7, 0.08, 0.5), Vector3(3.1, 0.12, 2.6), Color("7d5a3d"), Vector3.ZERO, false)
	VisualFactory.cylinder(root, "PigTrough", Vector3(1.9, 0.36, -2.2), 0.42, 2.0, Color("758d91"), Vector3(0, 0, PI / 2.0), 12)
	var area := VisualFactory.interaction_area(self, "PigPenArea", position_value + Vector3(0, 1.3, 0), Vector3(9.2, 3.0, 7.8), {"interaction_type": "building", "interaction_id": "pig_pen"})
	buildings["pig_pen"] = {
		"root": root,
		"area": area,
		"entrance": position_value + Vector3(0, 0, 4.6),
		"entrance_offset": Vector3(0, 0, 4.6),
		"area_offset": Vector3(0, 1.3, 0),
	}

func _fence_rect_on(parent: Node3D, center: Vector3, size: Vector2, color: Color, height: float = 1.2, front_gate: bool = true) -> void:
	var half_x := size.x * 0.5
	var half_z := size.y * 0.5
	var spacing := 2.1
	for side_z in [-half_z, half_z]:
		var x := -half_x
		while x <= half_x + 0.1:
			if not (front_gate and side_z > 0 and abs(x) < 1.3):
				VisualFactory.cylinder(parent, "FencePost", center + Vector3(x, height * 0.5, side_z), 0.08, height, color, Vector3.ZERO, 8)
			x += spacing
		var sections := int(ceil(size.x / spacing))
		for section in range(sections):
			var rail_x := -half_x + spacing * 0.5 + section * spacing
			if front_gate and side_z > 0 and abs(rail_x) < 1.3:
				continue
			for rail_y in [height * 0.38, height * 0.78]:
				VisualFactory.box(parent, "FenceRail", center + Vector3(rail_x, rail_y, side_z), Vector3(spacing, 0.1, 0.1), color)
	for side_x in [-half_x, half_x]:
		var z := -half_z
		while z <= half_z + 0.1:
			VisualFactory.cylinder(parent, "FencePost", center + Vector3(side_x, height * 0.5, z), 0.08, height, color, Vector3.ZERO, 8)
			z += spacing
		var sections := int(ceil(size.y / spacing))
		for section in range(sections):
			var rail_z := -half_z + spacing * 0.5 + section * spacing
			for rail_y in [height * 0.38, height * 0.78]:
				VisualFactory.box(parent, "FenceRail", center + Vector3(side_x, rail_y, rail_z), Vector3(0.1, 0.1, spacing), color)

func _remove_default_animals() -> void:
	for child in get_children():
		if child is FarmAnimal:
			remove_child(child)
			child.queue_free()

func _register_building_roots() -> void:
	var names := {
		"house": "FarmHouse",
		"barn": "Barn",
		"workshop": "Workshop",
		"market": "FarmMarket",
	}
	for key in names:
		var root := find_child(names[key], false, false) as Node3D
		if root == null or not buildings.has(key):
			continue
		var info: Dictionary = buildings[key]
		var area := info.get("area") as Area3D
		info["root"] = root
		info["entrance_offset"] = Vector3(info.get("entrance", root.position)) - root.position
		info["area_offset"] = area.position - root.position if area != null else Vector3.ZERO
		buildings[key] = info

func _register_editable_trees() -> void:
	for child in get_children():
		if not child is Node3D:
			continue
		var root := child as Node3D
		if not root.name.begins_with("Tree") and not root.name.begins_with("FruitTree"):
			continue
		var tree_id := _next_tree_id
		_next_tree_id += 1
		var area := Area3D.new()
		area.name = "TreeArea_%d" % tree_id
		area.collision_layer = 2
		area.collision_mask = 0
		area.set_meta("interaction_type", "tree")
		area.set_meta("interaction_id", tree_id)
		var shape_node := CollisionShape3D.new()
		var shape := CapsuleShape3D.new()
		shape.radius = 1.15
		shape.height = 4.8
		shape_node.shape = shape
		shape_node.position = Vector3(0, 2.35, 0)
		area.add_child(shape_node)
		root.add_child(area)
		editable_trees[tree_id] = {"root": root, "area": area}

func _build_expansion_markers() -> void:
	var marker_data := {
		"north": Vector3(0, 0.15, -16.0),
		"south": Vector3(0, 0.15, 16.0),
		"east": Vector3(22.5, 0.15, 0),
		"west": Vector3(-22.5, 0.15, 0),
	}
	for direction in marker_data:
		var root := Node3D.new()
		root.name = "Expansion_%s" % direction
		root.position = marker_data[direction]
		add_child(root)
		VisualFactory.box(root, "ExpansionPad", Vector3.ZERO, Vector3(4.2, 0.12, 2.6), Color(0.93, 0.84, 0.47, 0.72), Vector3.ZERO, false)
		VisualFactory.box(root, "Sign", Vector3(0, 1.15, 0), Vector3(2.8, 1.0, 0.18), Color("765235"))
		var label := Label3D.new()
		label.text = "EXPANDIR"
		label.font_size = 28
		label.position = Vector3(0, 1.18, 0.12)
		label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		label.modulate = Color("fff4c9")
		root.add_child(label)
		var area := VisualFactory.interaction_area(root, "ExpansionArea", Vector3(0, 0.8, 0), Vector3(4.5, 1.8, 2.9), {"interaction_type": "expansion", "interaction_id": direction})
		expansion_roots[direction] = {"root": root, "area": area}

func _build_environment_details() -> void:
	var rock_positions := [
		Vector3(-16.0, 0.2, -5.0), Vector3(-12.5, 0.18, 7.4), Vector3(15.4, 0.2, 6.3),
		Vector3(8.8, 0.2, 11.1), Vector3(-2.0, 0.18, -12.6), Vector3(18.0, 0.18, -4.0),
	]
	for index in range(rock_positions.size()):
		VisualFactory.sphere(self, "Rock", rock_positions[index], 0.45 + (index % 3) * 0.12, Color("77866d"), Vector3(1.35, 0.7, 1.0), false)
	var bush_positions := [
		Vector3(-13.2, 0.2, -10.3), Vector3(-8.4, 0.2, -11.8), Vector3(6.2, 0.2, -12.0),
		Vector3(16.7, 0.2, 9.2), Vector3(12.5, 0.2, 12.1), Vector3(-15.5, 0.2, 3.1),
	]
	for index in range(bush_positions.size()):
		var color := Color("3f9145") if index % 2 == 0 else Color("57a84d")
		VisualFactory.sphere(self, "Bush", bush_positions[index], 0.72, color, Vector3(1.25, 0.72, 1.05), false)
		VisualFactory.sphere(self, "Bush", bush_positions[index] + Vector3(0.52, 0.05, 0.1), 0.55, color.lightened(0.05), Vector3(1.0, 0.8, 1.0), false)

func apply_removed_trees(ids: Array) -> void:
	for value in ids:
		cut_tree(int(value), false)

func cut_tree(tree_id: int, create_stump: bool = true) -> bool:
	if not editable_trees.has(tree_id):
		return false
	var info: Dictionary = editable_trees[tree_id]
	var root := info.get("root") as Node3D
	if root != null:
		var stump_position := root.position
		root.queue_free()
		if create_stump:
			VisualFactory.cylinder(self, "Stump", stump_position + Vector3(0, 0.18, 0), 0.32, 0.34, Color("835a36"), Vector3.ZERO, 12)
	editable_trees.erase(tree_id)
	return true

func apply_expansions(items: Array) -> void:
	for direction in items:
		purchase_expansion(String(direction), false)

func purchase_expansion(direction: String, create_visual: bool = true) -> bool:
	if not expansion_roots.has(direction):
		return false
	var info: Dictionary = expansion_roots[direction]
	var root := info.get("root") as Node3D
	if root != null:
		root.visible = false
	var center := Vector3.ZERO
	var size := Vector3(16, 0.65, 12)
	match direction:
		"north":
			center = Vector3(0, -0.18, -20.0)
			size = Vector3(30, 0.65, 12)
		"south":
			center = Vector3(0, -0.18, 20.0)
			size = Vector3(30, 0.65, 12)
		"east":
			center = Vector3(26.0, -0.18, 0)
			size = Vector3(12, 0.65, 26)
		"west":
			center = Vector3(-26.0, -0.18, 0)
			size = Vector3(12, 0.65, 26)
	VisualFactory.box(self, "ExpansionLand_%s" % direction, center, size, GRASS_LIGHT, Vector3.ZERO, false)
	VisualFactory.collision_box(self, center + Vector3(0, 0.08, 0), size + Vector3(0, 0.4, 0), {"interaction_type": "ground"})
	if create_visual:
		for index in range(8):
			var offset := Vector3(randf_range(-size.x * 0.42, size.x * 0.42), 0.2, randf_range(-size.z * 0.42, size.z * 0.42))
			_flower(center + offset, Color.from_hsv(randf(), 0.55, 0.95))
	return true

func get_bounds(expansions: Array) -> Dictionary:
	var bounds := INITIAL_BOUNDS.duplicate()
	if expansions.has("north"):
		bounds["min_z"] = float(bounds["min_z"]) - EXPANSION_DEPTH
	if expansions.has("south"):
		bounds["max_z"] = float(bounds["max_z"]) + EXPANSION_DEPTH
	if expansions.has("east"):
		bounds["max_x"] = float(bounds["max_x"]) + EXPANSION_DEPTH
	if expansions.has("west"):
		bounds["min_x"] = float(bounds["min_x"]) - EXPANSION_DEPTH
	return bounds

func is_inside_bounds(target: Vector3, expansions: Array, margin: float = 1.0) -> bool:
	var bounds := get_bounds(expansions)
	return target.x >= float(bounds["min_x"]) + margin and target.x <= float(bounds["max_x"]) - margin and target.z >= float(bounds["min_z"]) + margin and target.z <= float(bounds["max_z"]) - margin

func apply_building_positions(saved: Dictionary) -> void:
	for key in saved:
		var data = saved[key]
		if data is Array and data.size() >= 2:
			move_building(String(key), Vector3(float(data[0]), 0.0, float(data[1])))

func export_building_positions() -> Dictionary:
	var result := {}
	for key in buildings:
		var info: Dictionary = buildings[key]
		var root := info.get("root") as Node3D
		if root != null:
			result[key] = [root.position.x, root.position.z]
	return result

func move_building(key: String, target: Vector3) -> bool:
	if not buildings.has(key):
		return false
	var info: Dictionary = buildings[key]
	var root := info.get("root") as Node3D
	var area := info.get("area") as Area3D
	if root == null:
		return false
	var final_position := Vector3(target.x, root.position.y, target.z)
	root.position = final_position
	if area != null:
		area.position = final_position + Vector3(info.get("area_offset", Vector3.ZERO))
	info["entrance"] = final_position + Vector3(info.get("entrance_offset", Vector3(0, 0, 3)))
	buildings[key] = info
	return true

func get_building_position(key: String) -> Vector3:
	if not buildings.has(key):
		return Vector3.ZERO
	var root := buildings[key].get("root") as Node3D
	return root.position if root != null else Vector3.ZERO

func can_place_building(key: String, target: Vector3, expansions: Array) -> bool:
	if not is_inside_bounds(target, expansions, 3.4):
		return false
	for other_key in buildings:
		if String(other_key) == key:
			continue
		var other_root := buildings[other_key].get("root") as Node3D
		if other_root != null and Vector2(other_root.position.x, other_root.position.z).distance_to(Vector2(target.x, target.z)) < 6.0:
			return false
	for plot in plots:
		if Vector2(plot.position.x, plot.position.z).distance_to(Vector2(target.x, target.z)) < 4.2:
			return false
	for tree_id in editable_trees:
		var tree_root := editable_trees[tree_id].get("root") as Node3D
		if tree_root != null and Vector2(tree_root.position.x, tree_root.position.z).distance_to(Vector2(target.x, target.z)) < 3.2:
			return false
	return true

func add_custom_fence(target: Vector3, vertical: bool, forced_id: int = -1) -> int:
	var fence_id := forced_id if forced_id >= 0 else _next_fence_id
	_next_fence_id = maxi(_next_fence_id, fence_id + 1)
	var root := Node3D.new()
	root.name = "CustomFence_%d" % fence_id
	root.position = Vector3(target.x, 0, target.z)
	root.rotation.y = PI * 0.5 if vertical else 0.0
	add_child(root)
	var color := Color("9d7546")
	for x in [-1.0, 1.0]:
		VisualFactory.cylinder(root, "Post", Vector3(x, 0.62, 0), 0.09, 1.24, color, Vector3.ZERO, 8)
	for height in [0.45, 0.9]:
		VisualFactory.box(root, "Rail", Vector3(0, height, 0), Vector3(2.15, 0.11, 0.11), color)
	var area := VisualFactory.interaction_area(root, "FenceArea", Vector3(0, 0.62, 0), Vector3(2.3, 1.4, 0.55), {"interaction_type": "fence", "interaction_id": fence_id})
	custom_fences[fence_id] = {"root": root, "area": area, "vertical": vertical}
	return fence_id

func move_fence(fence_id: int, target: Vector3) -> bool:
	if not custom_fences.has(fence_id):
		return false
	var root := custom_fences[fence_id].get("root") as Node3D
	if root == null:
		return false
	root.position = Vector3(target.x, 0, target.z)
	return true

func remove_custom_fence(fence_id: int) -> bool:
	if not custom_fences.has(fence_id):
		return false
	var root := custom_fences[fence_id].get("root") as Node3D
	if root != null:
		root.queue_free()
	custom_fences.erase(fence_id)
	return true

func get_fence_position(fence_id: int) -> Vector3:
	if not custom_fences.has(fence_id):
		return Vector3.ZERO
	var root := custom_fences[fence_id].get("root") as Node3D
	return root.position if root != null else Vector3.ZERO

func apply_custom_fences(items: Array) -> void:
	for item in items:
		if not item is Dictionary:
			continue
		var data: Dictionary = item
		add_custom_fence(Vector3(float(data.get("x", 0.0)), 0, float(data.get("z", 0.0))), bool(data.get("vertical", false)), int(data.get("id", -1)))

func export_custom_fences() -> Array:
	var result: Array = []
	for fence_id in custom_fences:
		var info: Dictionary = custom_fences[fence_id]
		var root := info.get("root") as Node3D
		if root != null:
			result.append({"id": fence_id, "x": root.position.x, "z": root.position.z, "vertical": bool(info.get("vertical", false))})
	return result

func can_place_fence(target: Vector3, expansions: Array, ignore_id: int = -1) -> bool:
	if not is_inside_bounds(target, expansions, 0.8):
		return false
	for fence_id in custom_fences:
		if int(fence_id) == ignore_id:
			continue
		var root := custom_fences[fence_id].get("root") as Node3D
		if root != null and Vector2(root.position.x, root.position.z).distance_to(Vector2(target.x, target.z)) < 1.4:
			return false
	return true

func add_custom_plot(target: Vector3) -> CropPlot:
	var snapped := Vector3(target.x, 0.22, target.z)
	var plot := CropPlot.new()
	add_child(plot)
	plot.setup(plots.size(), snapped)
	plots.append(plot)
	custom_plot_positions.append([snapped.x, snapped.z])
	return plot

func apply_custom_plots(items: Array) -> void:
	for item in items:
		if item is Array and item.size() >= 2:
			add_custom_plot(Vector3(float(item[0]), 0.22, float(item[1])))

func export_custom_plot_positions() -> Array:
	var result: Array = []
	for index in range(12, plots.size()):
		var plot := plots[index]
		result.append([plot.position.x, plot.position.z])
	return result

func export_plot_positions() -> Array:
	var result: Array = []
	for plot in plots:
		result.append([plot.position.x, plot.position.z])
	return result

func apply_plot_positions(items: Array) -> void:
	for index in range(mini(items.size(), plots.size())):
		var item = items[index]
		if item is Array and item.size() >= 2:
			plots[index].position = Vector3(float(item[0]), 0.22, float(item[1]))

func move_plot(plot_id: int, target: Vector3) -> bool:
	if plot_id < 0 or plot_id >= plots.size():
		return false
	plots[plot_id].position = Vector3(target.x, 0.22, target.z)
	return true

func get_plot_position(plot_id: int) -> Vector3:
	if plot_id < 0 or plot_id >= plots.size():
		return Vector3.ZERO
	return plots[plot_id].position

func can_place_plot(target: Vector3, expansions: Array, ignore_id: int = -1) -> bool:
	if not is_inside_bounds(target, expansions, 1.8):
		return false
	for plot in plots:
		if plot.plot_id == ignore_id:
			continue
		if Vector2(plot.position.x, plot.position.z).distance_to(Vector2(target.x, target.z)) < 3.2:
			return false
	for key in buildings:
		var root := buildings[key].get("root") as Node3D
		if root != null and Vector2(root.position.x, root.position.z).distance_to(Vector2(target.x, target.z)) < 5.0:
			return false
	for tree_id in editable_trees:
		var tree_root := editable_trees[tree_id].get("root") as Node3D
		if tree_root != null and Vector2(tree_root.position.x, tree_root.position.z).distance_to(Vector2(target.x, target.z)) < 2.1:
			return false
	return true

func build_fish_pond(target: Vector3) -> bool:
	if buildings.has("fish_pond"):
		return false
	var root := Node3D.new()
	root.name = "FishPond"
	root.position = Vector3(target.x, 0.0, target.z)
	add_child(root)
	var rim := VisualFactory.cylinder(root, "PondRim", Vector3(0, 0.05, 0), 3.2, 0.28, Color("7d9f54"), Vector3.ZERO, 40, false)
	rim.scale.z = 0.72
	var water := VisualFactory.cylinder(root, "PondWater", Vector3(0, 0.2, 0), 2.75, 0.12, Color("4fb9d1"), Vector3.ZERO, 40, false)
	water.scale.z = 0.72
	for angle_index in range(8):
		var angle := TAU * float(angle_index) / 8.0
		VisualFactory.sphere(root, "PondStone", Vector3(cos(angle) * 2.95, 0.28, sin(angle) * 2.1), 0.34, Color("7b8875"), Vector3(1.2, 0.65, 1.0), false)
	var area := VisualFactory.interaction_area(self, "FishPondArea", root.position + Vector3(0, 0.8, 0), Vector3(6.6, 1.8, 4.8), {"interaction_type": "building", "interaction_id": "fish_pond"})
	buildings["fish_pond"] = {
		"root": root,
		"area": area,
		"entrance": root.position + Vector3(0, 0, 3.2),
		"entrance_offset": Vector3(0, 0, 3.2),
		"area_offset": Vector3(0, 0.8, 0),
	}
	constructed_objects["fish_pond"] = true
	return true

func apply_constructions(data: Dictionary) -> void:
	if bool(data.get("fish_pond", false)) and not buildings.has("fish_pond"):
		var position_data = data.get("fish_pond_position", [6.0, 11.5])
		build_fish_pond(Vector3(float(position_data[0]), 0, float(position_data[1])))

func export_constructions() -> Dictionary:
	var result := {"fish_pond": buildings.has("fish_pond")}
	if buildings.has("fish_pond"):
		var root := buildings["fish_pond"].get("root") as Node3D
		result["fish_pond_position"] = [root.position.x, root.position.z]
	return result

func sync_animals(counts: Dictionary) -> void:
	for animal in animal_nodes:
		if is_instance_valid(animal):
			animal.queue_free()
	animal_nodes.clear()
	_spawn_species("cow", int(counts.get("cow", 0)), "pasture", 2.8)
	_spawn_species("chicken", int(counts.get("chicken", 0)), "coop", 2.2)
	_spawn_species("pig", int(counts.get("pig", 0)), "pig_pen", 2.3)

func _spawn_species(species: String, count: int, home_key: String, radius: float) -> void:
	if not buildings.has(home_key):
		return
	var home := get_building_position(home_key)
	for index in range(count):
		var angle := TAU * float(index) / maxf(1.0, float(count))
		var offset := Vector3(cos(angle) * minf(radius * 0.65, 1.0 + index * 0.22), 0, sin(angle) * minf(radius * 0.65, 1.0 + index * 0.22))
		var animal := FarmAnimal.new()
		animal.setup(species, home + offset, radius)
		add_child(animal)
		animal_nodes.append(animal)

func refresh_animal_homes(counts: Dictionary) -> void:
	sync_animals(counts)

func get_object_position(kind: String, identifier) -> Vector3:
	match kind:
		"building":
			return get_building_position(String(identifier))
		"plot":
			return get_plot_position(int(identifier))
		"fence":
			return get_fence_position(int(identifier))
	return Vector3.ZERO
