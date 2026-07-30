class_name CropPlot
extends Area3D

signal selected(plot: CropPlot)

var plot_id: int = 0
var tilled: bool = false
var crop_key: String = ""
var growth: float = 0.0
var watered: bool = false
var protected_crop: bool = false
var lost: bool = false
var crop_visual: Node3D
var soil_visual: MeshInstance3D
var highlight_visual: MeshInstance3D

const SOIL_DRY := Color("704325")
const SOIL_WET := Color("452c21")
const GRASS := Color("6cb74d")

func setup(id_value: int, world_position: Vector3) -> void:
	plot_id = id_value
	name = "Plot_%02d" % plot_id
	position = world_position
	collision_layer = 2
	collision_mask = 0
	set_meta("interaction_type", "plot")
	set_meta("interaction_id", plot_id)
	var shape_node := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(3.35, 0.6, 2.55)
	shape_node.shape = shape
	shape_node.position.y = 0.25
	add_child(shape_node)
	soil_visual = VisualFactory.box(self, "Soil", Vector3(0, 0.06, 0), Vector3(3.25, 0.16, 2.45), GRASS, Vector3.ZERO, false)
	highlight_visual = VisualFactory.box(self, "Highlight", Vector3(0, 0.14, 0), Vector3(3.46, 0.08, 2.66), Color("f6df75"), Vector3.ZERO, false)
	highlight_visual.visible = false
	crop_visual = Node3D.new()
	crop_visual.name = "Crops"
	add_child(crop_visual)
	input_event.connect(_on_input_event)

func _on_input_event(_camera: Node, event: InputEvent, _position: Vector3, _normal: Vector3, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		selected.emit(self)
	elif event is InputEventScreenTouch and event.pressed:
		selected.emit(self)

func set_highlight(value: bool) -> void:
	highlight_visual.visible = value

func set_state(data: Dictionary) -> void:
	tilled = bool(data.get("tilled", false))
	crop_key = String(data.get("crop", ""))
	growth = float(data.get("growth", 0.0))
	watered = bool(data.get("watered", false))
	protected_crop = bool(data.get("protected", false))
	lost = bool(data.get("lost", false))
	refresh_visual()

func export_state() -> Dictionary:
	return {
		"tilled": tilled,
		"crop": crop_key,
		"growth": growth,
		"watered": watered,
		"protected": protected_crop,
		"lost": lost,
	}

func advance(delta: float, crop_data: Dictionary, realistic: bool) -> bool:
	if crop_key.is_empty() or lost or growth >= 1.0:
		return false
	var duration := float(crop_data.get("duration", 45.0))
	var care_multiplier := 1.0
	care_multiplier *= 1.22 if watered else 0.55
	care_multiplier *= 1.1 if protected_crop else 1.0
	growth = minf(1.0, growth + delta / duration * care_multiplier)
	if realistic and growth > 0.42 and not watered:
		var loss_chance := delta * 0.0025
		if randf() < loss_chance:
			lost = true
			refresh_visual()
			return true
	return false

func refresh_visual() -> void:
	soil_visual.material_override = VisualFactory.material(SOIL_WET if watered else (SOIL_DRY if tilled else GRASS), 0.94)
	for child in crop_visual.get_children():
		child.queue_free()
	if crop_key.is_empty():
		_create_soil_rows()
		return
	if lost:
		_create_withered_crop()
		return
	var stage := 0
	if growth >= 0.78:
		stage = 3
	elif growth >= 0.42:
		stage = 2
	elif growth >= 0.06:
		stage = 1
	_create_crop_rows(stage)

func _create_soil_rows() -> void:
	if not tilled:
		return
	for row in range(4):
		VisualFactory.box(crop_visual, "Furrow", Vector3(-1.18 + row * 0.78, 0.19, 0), Vector3(0.13, 0.08, 2.1), Color("5d351f"), Vector3.ZERO, false)

func _create_crop_rows(stage: int) -> void:
	for row in range(4):
		for column in range(3):
			var offset := Vector3(-1.18 + row * 0.78, 0.16, -0.75 + column * 0.75)
			_create_plant(offset, stage, row + column)

func _create_plant(offset: Vector3, stage: int, variation: int) -> void:
	var height := 0.18 + stage * 0.3 + (variation % 2) * 0.04
	if stage == 0:
		VisualFactory.sphere(crop_visual, "Seedling", offset + Vector3(0, 0.18, 0), 0.11, Color("76ba4d"), Vector3(0.8, 0.45, 0.8), false)
		return
	if crop_key == "corn":
		VisualFactory.cylinder(crop_visual, "CornStem", offset + Vector3(0, height * 0.5, 0), 0.045, height, Color("498c3d"), Vector3.ZERO, 8)
		VisualFactory.sphere(crop_visual, "CornLeaves", offset + Vector3(-0.09, height * 0.66, 0), 0.16, Color("61aa46"), Vector3(1.6, 0.24, 0.55))
		VisualFactory.sphere(crop_visual, "CornLeaves", offset + Vector3(0.09, height * 0.48, 0.02), 0.15, Color("71b94d"), Vector3(1.55, 0.22, 0.5))
		if stage >= 3:
			VisualFactory.sphere(crop_visual, "CornCob", offset + Vector3(0.08, height * 0.66, 0.03), 0.12, Color("f0ca46"), Vector3(0.52, 1.2, 0.52))
	elif crop_key == "cassava":
		VisualFactory.cylinder(crop_visual, "CassavaStem", offset + Vector3(0, height * 0.48, 0), 0.04, height * 0.85, Color("5c8d3d"), Vector3.ZERO, 8)
		for leaf in range(5):
			var angle := TAU * float(leaf) / 5.0
			var leaf_position := offset + Vector3(cos(angle) * 0.14, height, sin(angle) * 0.14)
			VisualFactory.sphere(crop_visual, "CassavaLeaf", leaf_position, 0.12, Color("4f9c42"), Vector3(1.35, 0.28, 0.6))
		if stage >= 3:
			VisualFactory.sphere(crop_visual, "CassavaRoot", offset + Vector3(0, 0.16, 0), 0.12, Color("c58d58"), Vector3(0.55, 1.35, 0.55))
	else:
		for leaf in range(8):
			var angle := TAU * float(leaf) / 8.0
			var leaf_position := offset + Vector3(cos(angle) * 0.15, 0.22 + stage * 0.08, sin(angle) * 0.15)
			var leaf_mesh := VisualFactory.sphere(crop_visual, "PineLeaf", leaf_position, 0.13, Color("397c43"), Vector3(0.48, 1.7, 0.35))
			leaf_mesh.rotation.y = -angle
			leaf_mesh.rotation.z = 0.45
		if stage >= 3:
			VisualFactory.sphere(crop_visual, "Pineapple", offset + Vector3(0, 0.45, 0), 0.2, Color("e2a43c"), Vector3(0.72, 1.15, 0.72))

func _create_withered_crop() -> void:
	for row in range(4):
		for column in range(3):
			var offset := Vector3(-1.18 + row * 0.78, 0.42, -0.75 + column * 0.75)
			VisualFactory.cylinder(crop_visual, "Withered", offset, 0.035, 0.5, Color("806337"), Vector3(0.2, 0.0, 0.12), 6)
