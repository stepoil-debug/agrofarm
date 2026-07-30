class_name CustomFarmWorld
extends "res://scripts/farm_world.gd"

var editable_trees: Dictionary = {}
var custom_fences: Dictionary = {}
var custom_plot_positions: Array = []
var _next_tree_id := 0
var _next_fence_id := 0

func setup() -> void:
	super()
	_register_building_roots()
	_register_editable_trees()
	_build_environment_details()

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
	var coop_root := find_child("ChickenCoop", false, false) as Node3D
	if coop_root != null:
		var coop_area := VisualFactory.interaction_area(self, "CoopArea", coop_root.position + Vector3(0, 1.6, 0), Vector3(5.4, 3.8, 5.0), {"interaction_type": "building", "interaction_id": "coop"})
		buildings["coop"] = {
			"root": coop_root,
			"area": coop_area,
			"entrance": coop_root.position + Vector3(0, 0, 3.4),
			"entrance_offset": Vector3(0, 0, 3.4),
			"area_offset": Vector3(0, 1.6, 0),
		}

func _register_editable_trees() -> void:
	for child in get_children():
		if not child is Node3D:
			continue
		var root := child as Node3D
		if root.name != "Tree" and root.name != "FruitTree":
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

func cut_tree(tree_id: int, create_wood: bool = true) -> bool:
	if not editable_trees.has(tree_id):
		return false
	var info: Dictionary = editable_trees[tree_id]
	var root := info.get("root") as Node3D
	if root != null:
		var stump_position := root.position
		root.queue_free()
		if create_wood:
			VisualFactory.cylinder(self, "Stump", stump_position + Vector3(0, 0.18, 0), 0.32, 0.34, Color("835a36"), Vector3.ZERO, 12)
	editable_trees.erase(tree_id)
	return true

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

func can_place_building(key: String, target: Vector3) -> bool:
	if abs(target.x) > 19.0 or target.z < -12.5 or target.z > 10.5:
		return false
	for other_key in buildings:
		if String(other_key) == key:
			continue
		var other: Dictionary = buildings[other_key]
		var root := other.get("root") as Node3D
		if root != null and Vector2(root.position.x, root.position.z).distance_to(Vector2(target.x, target.z)) < 6.0:
			return false
	for plot in plots:
		if Vector2(plot.position.x, plot.position.z).distance_to(Vector2(target.x, target.z)) < 4.2:
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

func remove_custom_fence(fence_id: int) -> bool:
	if not custom_fences.has(fence_id):
		return false
	var info: Dictionary = custom_fences[fence_id]
	var root := info.get("root") as Node3D
	if root != null:
		root.queue_free()
	custom_fences.erase(fence_id)
	return true

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
	return custom_plot_positions.duplicate(true)

func can_place_plot(target: Vector3) -> bool:
	if abs(target.x) > 19.5 or target.z < -12.5 or target.z > 9.8:
		return false
	for plot in plots:
		if Vector2(plot.position.x, plot.position.z).distance_to(Vector2(target.x, target.z)) < 3.2:
			return false
	for key in buildings:
		var info: Dictionary = buildings[key]
		var root := info.get("root") as Node3D
		if root != null and Vector2(root.position.x, root.position.z).distance_to(Vector2(target.x, target.z)) < 5.0:
			return false
	for tree_id in editable_trees:
		var tree_info: Dictionary = editable_trees[tree_id]
		var tree_root := tree_info.get("root") as Node3D
		if tree_root != null and Vector2(tree_root.position.x, tree_root.position.z).distance_to(Vector2(target.x, target.z)) < 2.0:
			return false
	return true
