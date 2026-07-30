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
var timer_label: Label3D
var last_advanced_unix: float = 0.0
var _last_timer_text := ""
var _hovered := false

const SOIL_DRY := Color("704325")
const SOIL_WET := Color("452c21")
const GRASS := Color("6cb74d")
const MAX_OFFLINE_SECONDS := 28800.0

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
	_build_timer_label()
	input_event.connect(_on_input_event)
	mouse_entered.connect(_on_mouse_entered)
	mouse_exited.connect(_on_mouse_exited)

func _build_timer_label() -> void:
	timer_label = Label3D.new()
	timer_label.name = "CropTimer"
	timer_label.position = Vector3(0, 1.55, 0.78)
	timer_label.text = ""
	timer_label.font_size = 18
	timer_label.outline_size = 4
	timer_label.modulate = Color(1.0, 0.98, 0.88, 0.94)
	timer_label.outline_modulate = Color(0.12, 0.18, 0.10, 0.82)
	timer_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	timer_label.no_depth_test = false
	timer_label.fixed_size = true
	timer_label.visible = false
	add_child(timer_label)

func _on_input_event(_camera: Node, event: InputEvent, _position: Vector3, _normal: Vector3, _shape_idx: int) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		selected.emit(self)
	elif event is InputEventScreenTouch and event.pressed:
		selected.emit(self)

func _on_mouse_entered() -> void:
	_hovered = true
	_refresh_timer_visibility()

func _on_mouse_exited() -> void:
	_hovered = false
	_refresh_timer_visibility()

func set_highlight(value: bool) -> void:
	highlight_visual.visible = value
	_refresh_timer_visibility()

func set_state(data: Dictionary) -> void:
	tilled = bool(data.get("tilled", false))
	crop_key = String(data.get("crop", ""))
	growth = float(data.get("growth", 0.0))
	watered = bool(data.get("watered", false))
	protected_crop = bool(data.get("protected", false))
	lost = bool(data.get("lost", false))
	last_advanced_unix = float(data.get("last_advanced_unix", 0.0))
	if crop_key.is_empty():
		last_advanced_unix = 0.0
	refresh_visual()

func export_state() -> Dictionary:
	return {
		"tilled": tilled,
		"crop": crop_key,
		"growth": growth,
		"watered": watered,
		"protected": protected_crop,
		"lost": lost,
		"last_advanced_unix": last_advanced_unix,
	}

func advance(delta: float, crop_data: Dictionary, realistic: bool) -> bool:
	var now := Time.get_unix_time_from_system()
	var elapsed := delta
	if last_advanced_unix > 0.0:
		elapsed = clampf(now - last_advanced_unix, 0.0, MAX_OFFLINE_SECONDS)
	last_advanced_unix = now
	if crop_key.is_empty() or lost or growth >= 1.0:
		update_timer(crop_data)
		return false
	var duration := float(crop_data.get("duration", 45.0))
	var care_multiplier := _care_multiplier()
	growth = minf(1.0, growth + elapsed / duration * care_multiplier)
	if realistic and growth > 0.42 and not watered:
		var loss_chance := minf(1.0, elapsed * 0.0025)
		if randf() < loss_chance:
			lost = true
			refresh_visual()
			update_timer(crop_data)
			return true
	update_timer(crop_data)
	return false

func _care_multiplier() -> float:
	var multiplier := 1.22 if watered else 0.55
	if protected_crop:
		multiplier *= 1.1
	return multiplier

func remaining_seconds(crop_data: Dictionary) -> int:
	if crop_key.is_empty() or lost or growth >= 1.0:
		return 0
	var duration := float(crop_data.get("duration", 45.0))
	return maxi(0, ceili((1.0 - growth) * duration / maxf(0.01, _care_multiplier())))

func update_timer(crop_data: Dictionary) -> void:
	if timer_label == null:
		return
	if crop_key.is_empty():
		timer_label.visible = false
		_last_timer_text = ""
		return
	var next_text := ""
	var next_color := Color(1.0, 0.98, 0.88, 0.94)
	if lost:
		next_text = "Perdida"
		next_color = Color(1.0, 0.58, 0.52, 0.96)
	elif growth >= 1.0:
		next_text = "Pronto"
		next_color = Color(0.82, 0.96, 0.42, 0.96)
	else:
		var seconds_left := remaining_seconds(crop_data)
		if seconds_left >= 60:
			next_text = "%d:%02d" % [seconds_left / 60, seconds_left % 60]
		else:
			next_text = "%ds" % seconds_left
		if seconds_left <= 8:
			next_color = Color(1.0, 0.85, 0.30, 0.96)
	if next_text != _last_timer_text:
		_last_timer_text = next_text
		timer_label.text = next_text
	timer_label.modulate = next_color
	_refresh_timer_visibility(crop_data)

func _refresh_timer_visibility(crop_data: Dictionary = {}) -> void:
	if timer_label == null or crop_key.is_empty():
		if timer_label != null:
			timer_label.visible = false
		return
	var urgent := lost or growth >= 1.0
	if not crop_data.is_empty() and not urgent:
		urgent = remaining_seconds(crop_data) <= 8
	timer_label.visible = _hovered or highlight_visual.visible or urgent

func refresh_visual() -> void:
	soil_visual.material_override = VisualFactory.material(SOIL_WET if watered else (SOIL_DRY if tilled else GRASS), 0.94)
	for child in crop_visual.get_children():
		child.queue_free()
	if crop_key.is_empty():
		last_advanced_unix = 0.0
		if timer_label != null:
			timer_label.visible = false
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
