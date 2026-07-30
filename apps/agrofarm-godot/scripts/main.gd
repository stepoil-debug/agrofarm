extends Node3D

const SAVE_PATH := "user://agrofarm_save.json"
const CROP_DATA := {
	"corn": {"name": "Milho", "icon": "🌽", "seed_cost": 4.0, "sell": 3.0, "duration": 34.0, "yield": 3},
	"cassava": {"name": "Mandioca", "icon": "🌿", "seed_cost": 8.0, "sell": 4.0, "duration": 46.0, "yield": 4},
	"pineapple": {"name": "Abacaxi", "icon": "🍍", "seed_cost": 15.0, "sell": 6.0, "duration": 64.0, "yield": 5},
}
const LEVEL_DATA := [
	{"cost": 0.0, "multiplier": 1.0, "label": "Produtor iniciante"},
	{"cost": 150.0, "multiplier": 1.2, "label": "Fazenda organizada"},
	{"cost": 450.0, "multiplier": 1.4, "label": "Pecuarista rural"},
	{"cost": 1200.0, "multiplier": 1.65, "label": "Agroindústria"},
	{"cost": 3000.0, "multiplier": 1.95, "label": "Fazenda tecnológica"},
]
const BARN_DATA := [
	{"capacity": 10, "cost": 0.0}, {"capacity": 20, "cost": 100.0}, {"capacity": 35, "cost": 350.0},
	{"capacity": 55, "cost": 900.0}, {"capacity": 80, "cost": 2200.0},
]
const MACHINE_DATA := {
	"irrigator": {"name": "Irrigador automático", "icon": "💧", "price": 280.0, "wear": 1.2},
	"planter": {"name": "Plantadeira", "icon": "🌱", "price": 650.0, "wear": 1.6},
	"harvester": {"name": "Colheitadeira", "icon": "🚜", "price": 1500.0, "wear": 2.2},
}

var world: FarmWorld
var game: Dictionary
var running := false
var selected_tool := "hoe"
var selected_crop := "corn"
var move_target: Vector3
var has_move_target := false
var queued_interaction: Dictionary = {}
var day_minutes := 8.0 * 60.0
var weather_timer := 0.0
var automation_timer := 0.0
var autosave_timer := 0.0
var hud_timer := 0.0
var camera_yaw := 42.0
var camera_zoom := 25.5
var rotating_camera := false
var previous_pointer := Vector2.ZERO
var movement_marker: MeshInstance3D

var hud: Dictionary = {}
var modal_overlay: ColorRect
var modal_content: VBoxContainer
var toast_label: Label
var toast_tween: Tween

func _ready() -> void:
	randomize()
	world = FarmWorld.new()
	world.name = "FarmWorld"
	add_child(world)
	world.setup()
	_build_movement_marker()
	_build_interface()
	game = _load_game()
	selected_tool = String(game.get("selected_tool", "hoe"))
	selected_crop = String(game.get("selected_crop", "corn"))
	day_minutes = float(game.get("day_minutes", 480.0))
	_apply_saved_plots()
	for plot in world.plots:
		plot.selected.connect(_queue_plot.bind(plot.plot_id))
	_update_tool_buttons()
	_update_crop_buttons()
	_update_hud()
	running = true
	_show_toast("Fazenda pronta. Clique ou toque para caminhar.")

func _fresh_game() -> Dictionary:
	var plots_data: Array = []
	for _index in range(12):
		plots_data.append({"tilled": false, "crop": "", "growth": 0.0, "watered": false, "protected": false, "lost": false})
	return {
		"coins": 100.0,
		"level": 1,
		"barn_level": 1,
		"barn_capacity": 10,
		"mode": "free",
		"inventory": {"corn": 0, "cassava": 0, "pineapple": 0},
		"plots": plots_data,
		"selected_tool": "hoe",
		"selected_crop": "corn",
		"day_minutes": 480.0,
		"weather": "sunny",
		"machines": {
			"irrigator": {"owned": false, "active": false, "condition": 100.0, "broken": false},
			"planter": {"owned": false, "active": false, "condition": 100.0, "broken": false},
			"harvester": {"owned": false, "active": false, "condition": 100.0, "broken": false},
		},
		"stats": {"tilled": false, "planted": false, "watered": false, "harvested": false, "sold": false},
	}

func _load_game() -> Dictionary:
	if not FileAccess.file_exists(SAVE_PATH):
		return _fresh_game()
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		return _fresh_game()
	var parsed = JSON.parse_string(file.get_as_text())
	if not parsed is Dictionary:
		return _fresh_game()
	var loaded: Dictionary = parsed
	var defaults := _fresh_game()
	for key in defaults:
		if not loaded.has(key):
			loaded[key] = defaults[key]
	return loaded

func _save_game() -> void:
	game["selected_tool"] = selected_tool
	game["selected_crop"] = selected_crop
	game["day_minutes"] = day_minutes
	var plots_data: Array = []
	for plot in world.plots:
		plots_data.append(plot.export_state())
	game["plots"] = plots_data
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file != null:
		file.store_string(JSON.stringify(game))

func _apply_saved_plots() -> void:
	var data: Array = game.get("plots", [])
	for index in range(world.plots.size()):
		if index < data.size() and data[index] is Dictionary:
			world.plots[index].set_state(data[index])

func _build_movement_marker() -> void:
	movement_marker = VisualFactory.cylinder(self, "MovementMarker", Vector3.ZERO, 0.55, 0.04, Color("f6df75"), Vector3.ZERO, 24, false)
	movement_marker.visible = false

func _process(delta: float) -> void:
	if not running:
		return
	_update_player(delta)
	_update_camera(delta)
	_update_world(delta)
	automation_timer += delta
	autosave_timer += delta
	hud_timer += delta
	if automation_timer >= 5.0:
		automation_timer = 0.0
		_run_automation()
	if autosave_timer >= 12.0:
		autosave_timer = 0.0
		_save_game()
	if hud_timer >= 0.25:
		hud_timer = 0.0
		_update_hud()

func _update_player(delta: float) -> void:
	if not has_move_target:
		return
	var current := world.player.global_position
	var flat_target := Vector3(move_target.x, current.y, move_target.z)
	var remaining := current.distance_to(flat_target)
	if remaining <= 0.18:
		world.player.global_position = flat_target
		has_move_target = false
		movement_marker.visible = false
		_finish_queued_interaction()
		return
	var direction := (flat_target - current).normalized()
	var step := minf(remaining, delta * 5.2)
	world.player.global_position += direction * step
	world.player.rotation.y = lerp_angle(world.player.rotation.y, atan2(direction.x, direction.z), minf(1.0, delta * 10.0))
	var body := world.player.get_node_or_null("Body")
	if body:
		body.position.y = 1.0 + abs(sin(Time.get_ticks_msec() * 0.012)) * 0.045

func _update_camera(delta: float) -> void:
	world.camera_rig.rotation_degrees.y = lerpf(world.camera_rig.rotation_degrees.y, camera_yaw, minf(1.0, delta * 5.0))
	world.camera.size = lerpf(world.camera.size, camera_zoom, minf(1.0, delta * 6.0))
	var player_position := world.player.global_position
	var desired := Vector3(player_position.x * 0.22, 0.0, player_position.z * 0.22)
	world.camera_rig.position = world.camera_rig.position.lerp(desired, minf(1.0, delta * 1.8))

func _update_world(delta: float) -> void:
	day_minutes = fmod(day_minutes + delta * 2.4, 1440.0)
	weather_timer += delta
	var realistic := String(game.get("mode", "free")) == "realistic"
	for plot in world.plots:
		if plot.crop_key.is_empty():
			continue
		var previous_stage := int(plot.growth * 4.0)
		var crop_info: Dictionary = CROP_DATA.get(plot.crop_key, CROP_DATA["corn"])
		var changed := plot.advance(delta, crop_info, realistic)
		var current_stage := int(plot.growth * 4.0)
		if changed or previous_stage != current_stage:
			plot.refresh_visual()
			if plot.lost:
				_show_toast("Uma cultura foi perdida por falta de cuidado.")
	if weather_timer >= 105.0:
		weather_timer = 0.0
		_rotate_weather()
	_update_lighting()

func _rotate_weather() -> void:
	var roll := randf()
	game["weather"] = "rain" if roll < 0.2 else ("cloudy" if roll < 0.45 else "sunny")
	if game["weather"] == "rain":
		for plot in world.plots:
			if not plot.crop_key.is_empty():
				plot.watered = true
				plot.refresh_visual()
		_show_toast("A chuva regou as plantações.")
	elif game["weather"] == "cloudy":
		_show_toast("O tempo ficou nublado.")
	else:
		_show_toast("O sol voltou a aparecer.")

func _update_lighting() -> void:
	var hour := day_minutes / 60.0
	var daylight := clampf(sin((hour - 5.0) / 14.0 * PI), 0.18, 1.0)
	world.sun.light_energy = 0.28 + daylight * 1.05
	world.sun.light_color = Color("ffd49b") if hour > 16.5 else Color("fff1c8")
	world.environment.ambient_light_energy = 0.35 + daylight * 0.48
	world.environment.background_color = Color("6079a5").lerp(Color("9bd9f0"), daylight)
	if String(game.get("weather", "sunny")) == "cloudy":
		world.sun.light_energy *= 0.68
	elif String(game.get("weather", "sunny")) == "rain":
		world.sun.light_energy *= 0.58

func _unhandled_input(event: InputEvent) -> void:
	if not running or modal_overlay.visible:
		return
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			_handle_world_pointer(event.position)
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			rotating_camera = event.pressed
			previous_pointer = event.position
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			camera_zoom = clampf(camera_zoom - 1.4, 15.0, 31.0)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			camera_zoom = clampf(camera_zoom + 1.4, 15.0, 31.0)
	elif event is InputEventMouseMotion and rotating_camera:
		camera_yaw -= event.relative.x * 0.18
	elif event is InputEventScreenTouch and event.pressed:
		_handle_world_pointer(event.position)

func _handle_world_pointer(screen_position: Vector2) -> void:
	var origin := world.camera.project_ray_origin(screen_position)
	var direction := world.camera.project_ray_normal(screen_position)
	var query := PhysicsRayQueryParameters3D.create(origin, origin + direction * 180.0)
	query.collide_with_areas = true
	query.collide_with_bodies = true
	query.collision_mask = 3
	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty():
		return
	var collider: Object = hit.get("collider")
	var hit_position: Vector3 = hit.get("position", Vector3.ZERO)
	if collider != null and collider.has_meta("interaction_type"):
		var interaction_type := String(collider.get_meta("interaction_type"))
		if interaction_type == "plot":
			_queue_plot(int(collider.get_meta("interaction_id")))
			return
		if interaction_type == "building":
			_queue_building(String(collider.get_meta("interaction_id")))
			return
	_move_to(hit_position, {})

func _queue_plot(plot_id: int) -> void:
	if plot_id < 0 or plot_id >= world.plots.size():
		return
	var plot := world.plots[plot_id]
	var approach := plot.global_position + Vector3(0, 0, 2.0)
	_move_to(approach, {"type": "plot", "id": plot_id})
	for item in world.plots:
		item.set_highlight(item.plot_id == plot_id)

func _queue_building(key: String) -> void:
	if not world.buildings.has(key):
		return
	var info: Dictionary = world.buildings[key]
	_move_to(info["entrance"], {"type": "building", "id": key})

func _move_to(target: Vector3, interaction: Dictionary) -> void:
	move_target = Vector3(clampf(target.x, -21.5, 21.5), 0.05, clampf(target.z, -15.5, 15.5))
	has_move_target = true
	queued_interaction = interaction
	movement_marker.position = Vector3(move_target.x, 0.22, move_target.z)
	movement_marker.visible = true

func _finish_queued_interaction() -> void:
	for plot in world.plots:
		plot.set_highlight(false)
	if queued_interaction.is_empty():
		return
	var interaction := queued_interaction.duplicate()
	queued_interaction.clear()
	if interaction.get("type") == "plot":
		_perform_plot_action(int(interaction.get("id", -1)))
	elif interaction.get("type") == "building":
		_open_building(String(interaction.get("id", "")))

func _perform_plot_action(plot_id: int, automated: bool = false) -> bool:
	if plot_id < 0 or plot_id >= world.plots.size():
		return false
	var plot := world.plots[plot_id]
	var stats: Dictionary = game["stats"]
	match selected_tool:
		"hoe":
			if plot.tilled or not plot.crop_key.is_empty():
				if not automated: _show_toast("Esse canteiro já está preparado.")
				return false
			plot.tilled = true
			stats["tilled"] = true
			_show_toast("Terra preparada.")
		"seed":
			if not plot.tilled or not plot.crop_key.is_empty():
				if not automated: _show_toast("Prepare um canteiro vazio primeiro.")
				return false
			var crop_info: Dictionary = CROP_DATA[selected_crop]
			var cost := float(crop_info["seed_cost"])
			if float(game["coins"]) < cost:
				if not automated: _show_toast("Moedas insuficientes para as sementes.")
				return false
			game["coins"] = float(game["coins"]) - cost
			plot.crop_key = selected_crop
			plot.growth = 0.02
			plot.watered = false
			plot.protected_crop = false
			plot.lost = false
			stats["planted"] = true
			_show_toast("%s plantado." % crop_info["name"])
		"water":
			if plot.crop_key.is_empty():
				if not automated: _show_toast("Não existe cultura nesse canteiro.")
				return false
			plot.watered = true
			stats["watered"] = true
			if not automated: _show_toast("Plantação regada.")
		"protect":
			if plot.crop_key.is_empty():
				if not automated: _show_toast("Não existe cultura nesse canteiro.")
				return false
			if float(game["coins"]) < 2.0:
				if not automated: _show_toast("Você precisa de 2 moedas.")
				return false
			game["coins"] = float(game["coins"]) - 2.0
			plot.protected_crop = true
			if not automated: _show_toast("Defensivo aplicado.")
		"harvest":
			if plot.crop_key.is_empty():
				if not automated: _show_toast("Não há nada para colher.")
				return false
			if plot.lost:
				_reset_plot(plot)
				_show_toast("A cultura perdida foi removida.")
				return true
			if plot.growth < 1.0:
				if not automated: _show_toast("A cultura ainda está crescendo.")
				return false
			var crop_info: Dictionary = CROP_DATA[plot.crop_key]
			var amount := int(crop_info["yield"])
			if plot.watered: amount += 1
			if plot.protected_crop: amount += 1
			if _used_storage() + amount > int(game["barn_capacity"]):
				if not automated: _show_toast("O galpão não tem espaço suficiente.")
				return false
			var inventory: Dictionary = game["inventory"]
			inventory[plot.crop_key] = int(inventory.get(plot.crop_key, 0)) + amount
			stats["harvested"] = true
			var crop_name := String(crop_info["name"])
			_reset_plot(plot)
			_show_toast("%d unidades de %s colhidas." % [amount, crop_name])
	plot.refresh_visual()
	game["stats"] = stats
	_update_hud()
	_save_game()
	Input.vibrate_handheld(28)
	return true

func _reset_plot(plot: CropPlot) -> void:
	plot.tilled = true
	plot.crop_key = ""
	plot.growth = 0.0
	plot.watered = false
	plot.protected_crop = false
	plot.lost = false
	plot.refresh_visual()

func _open_building(key: String) -> void:
	match key:
		"house": _open_house()
		"barn": _open_barn()
		"market": _open_market()
		"workshop": _open_workshop()

func _run_automation() -> void:
	var machines: Dictionary = game["machines"]
	for key in MACHINE_DATA:
		var machine: Dictionary = machines[key]
		if not machine.get("owned", false) or not machine.get("active", false) or machine.get("broken", false):
			continue
		var data: Dictionary = MACHINE_DATA[key]
		machine["condition"] = maxf(0.0, float(machine.get("condition", 100.0)) - float(data["wear"]))
		var condition := float(machine["condition"])
		if String(game["mode"]) == "realistic" and randf() < maxf(0.002, (55.0 - condition) * 0.0008):
			machine["broken"] = true
			machine["active"] = false
			_show_toast("%s apresentou defeito." % data["name"])
			continue
		var previous_tool := selected_tool
		if key == "irrigator":
			selected_tool = "water"
			var target_plot = world.plots.filter(func(plot: CropPlot): return not plot.crop_key.is_empty() and not plot.watered).front()
			if target_plot: _perform_plot_action(target_plot.plot_id, true)
		elif key == "planter":
			selected_tool = "seed"
			var target_plot = world.plots.filter(func(plot: CropPlot): return plot.tilled and plot.crop_key.is_empty()).front()
			if target_plot: _perform_plot_action(target_plot.plot_id, true)
		elif key == "harvester":
			selected_tool = "harvest"
			var target_plot = world.plots.filter(func(plot: CropPlot): return not plot.crop_key.is_empty() and plot.growth >= 1.0).front()
			if target_plot: _perform_plot_action(target_plot.plot_id, true)
		selected_tool = previous_tool
		machines[key] = machine
	game["machines"] = machines

func _used_storage() -> int:
	var total := 0
	for value in game["inventory"].values():
		total += int(value)
	return total

func _mission() -> Dictionary:
	var stats: Dictionary = game["stats"]
	if not stats.get("tilled", false): return {"title": "Prepare o primeiro terreno", "text": "Selecione a enxada e toque em um canteiro.", "progress": 8}
	if not stats.get("planted", false): return {"title": "Plante sua primeira cultura", "text": "Escolha sementes e toque no canteiro preparado.", "progress": 26}
	if not stats.get("watered", false): return {"title": "Cuide da plantação", "text": "Regue a cultura para melhorar a produção.", "progress": 42}
	if not stats.get("harvested", false): return {"title": "Faça a primeira colheita", "text": "Aguarde o crescimento e use a cesta.", "progress": 62}
	if not stats.get("sold", false): return {"title": "Venda no mercado", "text": "Toque na banca rural e venda a produção.", "progress": 80}
	if int(game["level"]) == 1: return {"title": "Evolua sua sede", "text": "Acumule 150 moedas e melhore a casa.", "progress": 92}
	return {"title": "Expanda sua fazenda", "text": "Automatize a produção e cuide das máquinas.", "progress": 100}

func _update_hud() -> void:
	if hud.is_empty(): return
	hud["coins"].text = _format_coins(float(game["coins"]))
	hud["level"].text = "LV %d" % int(game["level"])
	hud["storage"].text = "%d/%d" % [_used_storage(), int(game["barn_capacity"])]
	hud["mode"].text = "Livre" if String(game["mode"]) == "free" else "Realista"
	var hour := int(day_minutes / 60.0) % 24
	var minute := int(day_minutes) % 60
	var weather_icons := {"sunny": "☀", "cloudy": "☁", "rain": "☂"}
	hud["clock"].text = "%s %02d:%02d" % [weather_icons.get(game.get("weather", "sunny"), "☀"), hour, minute]
	var mission := _mission()
	hud["mission_title"].text = mission["title"]
	hud["mission_text"].text = mission["text"]
	hud["mission_progress"].value = mission["progress"]

func _build_interface() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 10
	add_child(layer)
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_PASS
	layer.add_child(root)
	_build_top_hud(root)
	_build_mission_panel(root)
	_build_crop_picker(root)
	_build_toolbar(root)
	_build_zoom_controls(root)
	_build_toast(root)
	_build_modal(root)

func _panel_style(color: Color = Color("fff8df"), radius: int = 22, border_color: Color = Color(1, 1, 1, 0.65)) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = color
	style.border_color = border_color
	style.set_border_width_all(2)
	style.set_corner_radius_all(radius)
	style.shadow_color = Color(0.1, 0.16, 0.08, 0.22)
	style.shadow_size = 8
	style.content_margin_left = 12
	style.content_margin_right = 12
	style.content_margin_top = 8
	style.content_margin_bottom = 8
	return style

func _button_style(color: Color, radius: int = 18) -> StyleBoxFlat:
	var style := _panel_style(color, radius, color.lightened(0.12))
	style.shadow_size = 3
	return style

func _make_label(text_value: String, size: int = 16, color: Color = Color("3b452d"), bold: bool = false) -> Label:
	var label := Label.new()
	label.text = text_value
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	if bold:
		label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.12))
		label.add_theme_constant_override("shadow_offset_x", 1)
		label.add_theme_constant_override("shadow_offset_y", 1)
	return label

func _make_button(text_value: String, callback: Callable, color: Color = Color("e7f293"), minimum := Vector2(48, 42)) -> Button:
	var button := Button.new()
	button.text = text_value
	button.custom_minimum_size = minimum
	button.add_theme_font_size_override("font_size", 15)
	button.add_theme_color_override("font_color", Color("34412c"))
	button.add_theme_stylebox_override("normal", _button_style(color))
	button.add_theme_stylebox_override("hover", _button_style(color.lightened(0.08)))
	button.add_theme_stylebox_override("pressed", _button_style(color.darkened(0.08)))
	button.pressed.connect(callback)
	return button

func _build_top_hud(root: Control) -> void:
	var panel := PanelContainer.new()
	panel.anchor_left = 0.5
	panel.anchor_right = 0.5
	panel.offset_left = -345
	panel.offset_right = 345
	panel.offset_top = 14
	panel.offset_bottom = 72
	panel.add_theme_stylebox_override("panel", _panel_style(Color("fff8e7"), 28))
	root.add_child(panel)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 8)
	panel.add_child(row)
	row.add_child(_make_label("🌱 AgroFarm", 17, Color("33442d"), true))
	for key_text in [["coins", "🪙 100"], ["level", "LV 1"], ["storage", "0/10"], ["clock", "☀ 08:00"]]:
		var chip := PanelContainer.new()
		chip.add_theme_stylebox_override("panel", _panel_style(Color("f3efd9"), 18, Color("eee8cc")))
		var label := _make_label(key_text[1], 14, Color("39442e"), true)
		chip.add_child(label)
		row.add_child(chip)
		hud[key_text[0]] = label
	var mode_button := _make_button("Livre", _toggle_mode, Color("e8f49b"), Vector2(90, 40))
	row.add_child(mode_button)
	hud["mode"] = mode_button
	row.add_child(_make_button("☰", _open_menu, Color("e8f49b"), Vector2(42, 40)))

func _build_mission_panel(root: Control) -> void:
	var panel := PanelContainer.new()
	panel.offset_left = 16
	panel.offset_top = 18
	panel.offset_right = 316
	panel.offset_bottom = 145
	panel.add_theme_stylebox_override("panel", _panel_style(Color("fff8e7"), 26))
	root.add_child(panel)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	panel.add_child(row)
	row.add_child(_make_label("📋", 30))
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(column)
	column.add_child(_make_label("MISSÃO ATUAL", 11, Color("8a6c2f"), true))
	var title := _make_label("Prepare o primeiro terreno", 16, Color("3b402d"), true)
	column.add_child(title)
	var progress := ProgressBar.new()
	progress.custom_minimum_size = Vector2(0, 9)
	progress.max_value = 100
	progress.show_percentage = false
	column.add_child(progress)
	var text := _make_label("Selecione a enxada e toque em um canteiro.", 12, Color("66705a"))
	text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	column.add_child(text)
	hud["mission_title"] = title
	hud["mission_text"] = text
	hud["mission_progress"] = progress

func _build_crop_picker(root: Control) -> void:
	var panel := PanelContainer.new()
	panel.anchor_left = 1.0
	panel.anchor_right = 1.0
	panel.offset_left = -365
	panel.offset_right = -16
	panel.offset_top = 18
	panel.offset_bottom = 75
	panel.add_theme_stylebox_override("panel", _panel_style(Color("fff8e7"), 26))
	root.add_child(panel)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 5)
	panel.add_child(row)
	for key in CROP_DATA:
		var info: Dictionary = CROP_DATA[key]
		var button := _make_button("%s %s" % [info["icon"], info["name"]], _select_crop.bind(key), Color("fff8e7"), Vector2(100, 40))
		button.set_meta("crop", key)
		button.add_to_group("crop_buttons")
		row.add_child(button)

func _build_toolbar(root: Control) -> void:
	var panel := PanelContainer.new()
	panel.anchor_left = 0.5
	panel.anchor_right = 0.5
	panel.anchor_top = 1.0
	panel.anchor_bottom = 1.0
	panel.offset_left = -285
	panel.offset_right = 285
	panel.offset_top = -92
	panel.offset_bottom = -14
	panel.add_theme_stylebox_override("panel", _panel_style(Color("fff8e7"), 26))
	root.add_child(panel)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 5)
	panel.add_child(row)
	var tools := [["hoe", "⛏\nEnxada"], ["seed", "🌱\nPlantar"], ["water", "💧\nRegar"], ["protect", "🛡\nDefensivo"], ["harvest", "🧺\nColher"]]
	for data in tools:
		var button := _make_button(data[1], _select_tool.bind(data[0]), Color("fff8e7"), Vector2(103, 62))
		button.set_meta("tool", data[0])
		button.add_to_group("tool_buttons")
		row.add_child(button)

func _build_zoom_controls(root: Control) -> void:
	var panel := PanelContainer.new()
	panel.anchor_left = 1.0
	panel.anchor_right = 1.0
	panel.anchor_top = 1.0
	panel.anchor_bottom = 1.0
	panel.offset_left = -72
	panel.offset_right = -18
	panel.offset_top = -188
	panel.offset_bottom = -22
	panel.add_theme_stylebox_override("panel", _panel_style(Color("fff8e7"), 24))
	root.add_child(panel)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 5)
	panel.add_child(column)
	column.add_child(_make_button("+", func(): camera_zoom = clampf(camera_zoom - 2.0, 15.0, 31.0), Color("e8f49b"), Vector2(42, 42)))
	column.add_child(_make_button("⌂", _camera_home, Color("e8f49b"), Vector2(42, 42)))
	column.add_child(_make_button("−", func(): camera_zoom = clampf(camera_zoom + 2.0, 15.0, 31.0), Color("e8f49b"), Vector2(42, 42)))

func _build_toast(root: Control) -> void:
	toast_label = _make_label("", 15, Color("493b22"), true)
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	toast_label.anchor_left = 0.5
	toast_label.anchor_right = 0.5
	toast_label.offset_left = -250
	toast_label.offset_right = 250
	toast_label.offset_top = 86
	toast_label.offset_bottom = 132
	toast_label.add_theme_stylebox_override("normal", _panel_style(Color("fff0bd"), 22))
	toast_label.modulate.a = 0.0
	toast_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(toast_label)

func _build_modal(root: Control) -> void:
	modal_overlay = ColorRect.new()
	modal_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	modal_overlay.color = Color(0.08, 0.13, 0.08, 0.68)
	modal_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	modal_overlay.visible = false
	root.add_child(modal_overlay)
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	modal_overlay.add_child(center)
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(620, 360)
	panel.add_theme_stylebox_override("panel", _panel_style(Color("fff8e7"), 30))
	center.add_child(panel)
	modal_content = VBoxContainer.new()
	modal_content.add_theme_constant_override("separation", 10)
	panel.add_child(modal_content)

func _clear_modal(title: String) -> void:
	for child in modal_content.get_children(): child.queue_free()
	var header := HBoxContainer.new()
	var label := _make_label(title, 26, Color("35452f"), true)
	label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(label)
	header.add_child(_make_button("×", _close_modal, Color("e8d3af"), Vector2(42, 42)))
	modal_content.add_child(header)
	modal_overlay.visible = true

func _open_house() -> void:
	_clear_modal("🏡 Sede da Fazenda")
	var level := int(game["level"])
	var current: Dictionary = LEVEL_DATA[min(level - 1, LEVEL_DATA.size() - 1)]
	modal_content.add_child(_make_label("%s · Vendas em %.2fx" % [current["label"], current["multiplier"]], 18, Color("4d6245"), true))
	if level < LEVEL_DATA.size():
		var next: Dictionary = LEVEL_DATA[level]
		modal_content.add_child(_make_label("O próximo nível aumenta o lucro para %.2fx e libera novos sistemas." % next["multiplier"], 14, Color("66705a")))
		modal_content.add_child(_make_button("Evoluir sede · %s moedas" % _format_coins(next["cost"]), _upgrade_house, Color("dff18d"), Vector2(0, 52)))
	else:
		modal_content.add_child(_make_label("Sua sede alcançou o nível máximo desta versão.", 15, Color("66705a")))

func _upgrade_house() -> void:
	var level := int(game["level"])
	if level >= LEVEL_DATA.size(): return
	var next: Dictionary = LEVEL_DATA[level]
	if float(game["coins"]) < float(next["cost"]):
		_show_toast("Moedas insuficientes para evoluir a sede.")
		return
	game["coins"] = float(game["coins"]) - float(next["cost"])
	game["level"] = level + 1
	_close_modal()
	_show_toast("Sede evoluída para o nível %d." % int(game["level"]))
	_save_game()

func _open_barn() -> void:
	_clear_modal("🌾 Galpão")
	var level := int(game["barn_level"])
	modal_content.add_child(_make_label("Estoque: %d de %d espaços" % [_used_storage(), int(game["barn_capacity"])], 18, Color("4d6245"), true))
	for key in CROP_DATA:
		var info: Dictionary = CROP_DATA[key]
		modal_content.add_child(_make_label("%s %s: %d unidades" % [info["icon"], info["name"], int(game["inventory"].get(key, 0))], 15, Color("56654f")))
	if level < BARN_DATA.size():
		var next: Dictionary = BARN_DATA[level]
		modal_content.add_child(_make_button("Ampliar para %d espaços · %s moedas" % [next["capacity"], _format_coins(next["cost"])], _upgrade_barn, Color("dff18d"), Vector2(0, 52)))

func _upgrade_barn() -> void:
	var level := int(game["barn_level"])
	if level >= BARN_DATA.size(): return
	var next: Dictionary = BARN_DATA[level]
	if float(game["coins"]) < float(next["cost"]):
		_show_toast("Moedas insuficientes para ampliar o galpão.")
		return
	game["coins"] = float(game["coins"]) - float(next["cost"])
	game["barn_level"] = level + 1
	game["barn_capacity"] = int(next["capacity"])
	_close_modal()
	_show_toast("Galpão ampliado para %d espaços." % int(next["capacity"]))
	_save_game()

func _open_market() -> void:
	_clear_modal("🧺 Feira Rural")
	var total_value := 0.0
	var level_data: Dictionary = LEVEL_DATA[min(int(game["level"]) - 1, LEVEL_DATA.size() - 1)]
	var multiplier := float(level_data["multiplier"])
	for key in CROP_DATA:
		var amount := int(game["inventory"].get(key, 0))
		var info: Dictionary = CROP_DATA[key]
		var value := amount * float(info["sell"]) * multiplier
		total_value += value
		modal_content.add_child(_make_button("%s Vender %s (%d) · %s moedas" % [info["icon"], info["name"], amount, _format_coins(value)], _sell_crop.bind(key), Color("f5e4ad"), Vector2(0, 47)))
	modal_content.add_child(_make_button("Vender tudo · %s moedas" % _format_coins(total_value), _sell_all, Color("dff18d"), Vector2(0, 54)))

func _sell_crop(key: String) -> void:
	var amount := int(game["inventory"].get(key, 0))
	if amount <= 0:
		_show_toast("Não há produtos desse tipo no galpão.")
		return
	var info: Dictionary = CROP_DATA[key]
	var level_data: Dictionary = LEVEL_DATA[min(int(game["level"]) - 1, LEVEL_DATA.size() - 1)]
	var value := amount * float(info["sell"]) * float(level_data["multiplier"])
	game["coins"] = float(game["coins"]) + value
	game["inventory"][key] = 0
	game["stats"]["sold"] = true
	_open_market()
	_show_toast("Venda concluída: %s moedas." % _format_coins(value))
	_save_game()

func _sell_all() -> void:
	var total := 0.0
	for key in CROP_DATA:
		var amount := int(game["inventory"].get(key, 0))
		var info: Dictionary = CROP_DATA[key]
		var level_data: Dictionary = LEVEL_DATA[min(int(game["level"]) - 1, LEVEL_DATA.size() - 1)]
		total += amount * float(info["sell"]) * float(level_data["multiplier"])
		game["inventory"][key] = 0
	if total <= 0.0:
		_show_toast("Seu galpão está vazio.")
		return
	game["coins"] = float(game["coins"]) + total
	game["stats"]["sold"] = true
	_close_modal()
	_show_toast("Toda a produção foi vendida por %s moedas." % _format_coins(total))
	_save_game()

func _open_workshop() -> void:
	_clear_modal("🔧 Oficina Agrícola")
	var machines: Dictionary = game["machines"]
	for key in MACHINE_DATA:
		var info: Dictionary = MACHINE_DATA[key]
		var machine: Dictionary = machines[key]
		var row := VBoxContainer.new()
		var status := "Não adquirida"
		if machine["owned"]:
			status = "Quebrada" if machine["broken"] else ("Automática" if machine["active"] else "Desligada")
		row.add_child(_make_label("%s %s · %s · condição %.0f%%" % [info["icon"], info["name"], status, float(machine["condition"])], 15, Color("4d6245"), true))
		if not machine["owned"]:
			row.add_child(_make_button("Comprar · %s moedas" % _format_coins(info["price"]), _buy_machine.bind(key), Color("f5e4ad"), Vector2(0, 43)))
		elif machine["broken"]:
			var repair_cost := 60.0 + (100.0 - float(machine["condition"])) * 2.0
			row.add_child(_make_button("Reparar · %s moedas" % _format_coins(repair_cost), _repair_machine.bind(key), Color("edc79d"), Vector2(0, 43)))
		else:
			row.add_child(_make_button("Desligar automação" if machine["active"] else "Ativar automação", _toggle_machine.bind(key), Color("dff18d"), Vector2(0, 43)))
		modal_content.add_child(row)

func _buy_machine(key: String) -> void:
	var info: Dictionary = MACHINE_DATA[key]
	if float(game["coins"]) < float(info["price"]):
		_show_toast("Moedas insuficientes para comprar a máquina.")
		return
	game["coins"] = float(game["coins"]) - float(info["price"])
	game["machines"][key] = {"owned": true, "active": false, "condition": 100.0, "broken": false}
	_open_workshop()
	_show_toast("%s adquirida." % info["name"])
	_save_game()

func _repair_machine(key: String) -> void:
	var machine: Dictionary = game["machines"][key]
	var cost := 60.0 + (100.0 - float(machine["condition"])) * 2.0
	if float(game["coins"]) < cost:
		_show_toast("Moedas insuficientes para o reparo.")
		return
	game["coins"] = float(game["coins"]) - cost
	machine["condition"] = 100.0
	machine["broken"] = false
	game["machines"][key] = machine
	_open_workshop()
	_show_toast("Máquina reparada.")
	_save_game()

func _toggle_machine(key: String) -> void:
	var machine: Dictionary = game["machines"][key]
	machine["active"] = not bool(machine["active"])
	game["machines"][key] = machine
	_open_workshop()
	_save_game()

func _open_menu() -> void:
	_clear_modal("🌱 AgroFarm 3D")
	modal_content.add_child(_make_label("Jogo 3D mobile-first", 18, Color("4d6245"), true))
	modal_content.add_child(_make_label("Computador: clique para caminhar e interagir. Botão direito gira a câmera e o scroll controla o zoom.", 14, Color("66705a")))
	modal_content.add_child(_make_label("Celular: toque no terreno, canteiro ou construção. Os botões foram dimensionados para uso por toque.", 14, Color("66705a")))
	modal_content.add_child(_make_button("Salvar agora", func(): _save_game(); _show_toast("Jogo salvo."), Color("dff18d"), Vector2(0, 48)))
	modal_content.add_child(_make_button("Reiniciar fazenda", _reset_game, Color("edc1aa"), Vector2(0, 48)))

func _reset_game() -> void:
	game = _fresh_game()
	selected_tool = "hoe"
	selected_crop = "corn"
	day_minutes = 480.0
	_apply_saved_plots()
	_close_modal()
	_update_tool_buttons()
	_update_crop_buttons()
	_update_hud()
	_save_game()
	_show_toast("Fazenda reiniciada.")

func _toggle_mode() -> void:
	game["mode"] = "realistic" if String(game["mode"]) == "free" else "free"
	_update_hud()
	_save_game()
	_show_toast("Modo Realista ativado." if game["mode"] == "realistic" else "Modo Livre ativado.")

func _select_tool(key: String) -> void:
	selected_tool = key
	_update_tool_buttons()
	_save_game()
	Input.vibrate_handheld(18)

func _select_crop(key: String) -> void:
	selected_crop = key
	selected_tool = "seed"
	_update_crop_buttons()
	_update_tool_buttons()
	_save_game()

func _update_tool_buttons() -> void:
	for node in get_tree().get_nodes_in_group("tool_buttons"):
		var button := node as Button
		var active := String(button.get_meta("tool")) == selected_tool
		button.add_theme_stylebox_override("normal", _button_style(Color("dff18d") if active else Color("fff8e7")))

func _update_crop_buttons() -> void:
	for node in get_tree().get_nodes_in_group("crop_buttons"):
		var button := node as Button
		var active := String(button.get_meta("crop")) == selected_crop
		button.add_theme_stylebox_override("normal", _button_style(Color("dff18d") if active else Color("fff8e7")))

func _camera_home() -> void:
	camera_yaw = 42.0
	camera_zoom = 25.5
	world.camera_rig.position = Vector3.ZERO

func _close_modal() -> void:
	modal_overlay.visible = false

func _show_toast(message: String) -> void:
	if toast_label == null: return
	toast_label.text = message
	if toast_tween and toast_tween.is_running(): toast_tween.kill()
	toast_label.modulate.a = 1.0
	toast_tween = create_tween()
	toast_tween.tween_interval(2.2)
	toast_tween.tween_property(toast_label, "modulate:a", 0.0, 0.35)

func _format_coins(value: float) -> String:
	return "%.2f" % value
