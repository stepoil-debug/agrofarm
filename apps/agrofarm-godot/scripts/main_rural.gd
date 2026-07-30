extends "res://scripts/main.gd"

const AXE_COST := 120.0
const TREE_CUT_COST := 10.0
const FENCE_COST := 4.0
const FENCE_REFUND := 1.0
const BASE_PLOT_COST := 60.0
const POND_COST := 220.0
const EXPANSION_COSTS := [120.0, 250.0, 500.0, 900.0]

const MOVE_COSTS := {
	"house": 55.0,
	"barn": 40.0,
	"workshop": 35.0,
	"market": 20.0,
	"pasture": 35.0,
	"coop": 25.0,
	"pig_pen": 25.0,
	"fish_pond": 30.0,
}

const FARM_LEVELS := [
	{"cost": 0.0, "margin": 0.02, "free_multiplier": 1.0, "label": "Produtor iniciante"},
	{"cost": 150.0, "margin": 0.04, "free_multiplier": 1.20, "label": "Fazenda organizada"},
	{"cost": 300.0, "margin": 0.06, "free_multiplier": 1.40, "label": "Produtor regional"},
	{"cost": 600.0, "margin": 0.08, "free_multiplier": 1.65, "label": "Fazenda avançada"},
	{"cost": 1000.0, "margin": 0.10, "free_multiplier": 1.95, "label": "Complexo agroindustrial"},
]

const FREE_CROP_DURATIONS := {"corn": 34.0, "cassava": 46.0, "pineapple": 64.0}
const REAL_CROP_DURATIONS := {"corn": 7200.0, "cassava": 14400.0, "pineapple": 21600.0}

const ANIMAL_DATA := {
	"cow": {"name": "Vaca leiteira", "buy_cost": 260.0, "capacity": 4, "feed_cost": 5.0, "product": "milk"},
	"chicken": {"name": "Galinha poedeira", "buy_cost": 40.0, "capacity": 6, "feed_cost": 1.0, "product": "eggs"},
	"pig": {"name": "Porco", "buy_cost": 120.0, "capacity": 4, "feed_cost": 3.0, "product": "pig"},
}

const PRODUCT_DATA := {
	"milk": {"name": "Leite", "free_sell": 4.0, "real_sell": 2.0},
	"eggs": {"name": "Ovos", "free_sell": 2.2, "real_sell": 1.1},
	"fish": {"name": "Peixe", "free_sell": 7.0, "real_sell": 3.6},
}

const EMPLOYEE_DATA := {
	"harvester": {"name": "Colhedor", "hire_cost": 120.0, "wage": 18.0, "description": "Colhe automaticamente plantações prontas."},
	"seller": {"name": "Vendedor", "hire_cost": 140.0, "wage": 22.0, "description": "Vende automaticamente a produção armazenada."},
	"caretaker": {"name": "Tratador", "hire_cost": 160.0, "wage": 24.0, "description": "Mantém os animais alimentados e produtivos."},
}

var edit_mode := false
var edit_action := ""
var selected_move_type := ""
var selected_move_id = null
var edit_panel: PanelContainer
var edit_status: Label
var edit_button: Button
var selection_marker: MeshInstance3D
var production_timer := 0.0
var worker_timer := 0.0
var seller_timer := 0.0
var last_day_minutes := 480.0
var pending_expansion := ""

func _ready() -> void:
	randomize()
	world = RuralFarmWorld.new()
	world.name = "FarmWorld"
	add_child(world)
	world.setup()
	_build_movement_marker()
	_build_selection_marker()
	_build_interface()
	game = _load_game()
	_ensure_rural_defaults()
	selected_tool = String(game.get("selected_tool", "hoe"))
	selected_crop = String(game.get("selected_crop", "corn"))
	day_minutes = float(game.get("day_minutes", 480.0))
	last_day_minutes = day_minutes
	camera_zoom = float(game.get("camera_zoom", 34.0))
	_apply_rural_layout()
	_apply_saved_plots()
	_connect_all_plots()
	(world as RuralFarmWorld).sync_animals(game.get("animals", {}))
	_update_tool_buttons()
	_update_crop_buttons()
	_update_hud()
	running = true
	_show_toast("Fazenda pronta. Os currais começam vazios.")

func _fresh_game() -> Dictionary:
	var data: Dictionary = super()
	data["level"] = 1
	data["inventory"] = {"corn": 0, "cassava": 0, "pineapple": 0, "milk": 0, "eggs": 0, "fish": 0}
	data["tools_owned"] = {"axe": false}
	data["wood"] = 0
	data["removed_trees"] = []
	data["building_positions"] = {}
	data["custom_fences"] = []
	data["custom_plot_positions"] = []
	data["plot_positions"] = []
	data["camera_zoom"] = 34.0
	data["expansions"] = []
	data["constructions"] = {"fish_pond": false}
	data["animals"] = {"cow": 0, "chicken": 0, "pig": 0}
	data["animal_care"] = {"cow": 100.0, "chicken": 100.0, "pig": 100.0}
	data["mature_pigs"] = 0
	data["pond_stock"] = 0
	data["production"] = {"cow_ready_at": 0.0, "chicken_ready_at": 0.0, "pig_ready_at": 0.0, "fish_ready_at": 0.0}
	data["last_care_unix"] = Time.get_unix_time_from_system()
	data["employees"] = {"harvester": false, "seller": false, "caretaker": false}
	data["game_day"] = 1
	return data

func _ensure_rural_defaults() -> void:
	var defaults := _fresh_game()
	for key in defaults:
		if not game.has(key):
			game[key] = defaults[key]
	for key in defaults["inventory"]:
		if not game["inventory"].has(key):
			game["inventory"][key] = 0
	for key in defaults["animals"]:
		if not game["animals"].has(key):
			game["animals"][key] = 0
	for key in defaults["animal_care"]:
		if not game["animal_care"].has(key):
			game["animal_care"][key] = 100.0
	for key in defaults["employees"]:
		if not game["employees"].has(key):
			game["employees"][key] = false
	for key in defaults["production"]:
		if not game["production"].has(key):
			game["production"][key] = 0.0

func _apply_rural_layout() -> void:
	var rural_world := world as RuralFarmWorld
	rural_world.apply_expansions(game.get("expansions", []))
	rural_world.apply_constructions(game.get("constructions", {}))
	rural_world.apply_removed_trees(game.get("removed_trees", []))
	rural_world.apply_custom_plots(game.get("custom_plot_positions", []))
	rural_world.apply_plot_positions(game.get("plot_positions", []))
	rural_world.apply_building_positions(game.get("building_positions", {}))
	rural_world.apply_custom_fences(game.get("custom_fences", []))

func _connect_all_plots() -> void:
	for plot in world.plots:
		_connect_plot(plot)

func _connect_plot(plot: CropPlot) -> void:
	if plot.has_meta("selection_connected"):
		return
	plot.set_meta("selection_connected", true)
	plot.selected.connect(func(_selected: CropPlot): _queue_plot(plot.plot_id))

func _save_game() -> void:
	if game.is_empty():
		return
	var rural_world := world as RuralFarmWorld
	game["building_positions"] = rural_world.export_building_positions()
	game["custom_fences"] = rural_world.export_custom_fences()
	game["custom_plot_positions"] = rural_world.export_custom_plot_positions()
	game["plot_positions"] = rural_world.export_plot_positions()
	game["constructions"] = rural_world.export_constructions()
	game["camera_zoom"] = camera_zoom
	super()

func _build_selection_marker() -> void:
	selection_marker = VisualFactory.cylinder(self, "EditSelection", Vector3.ZERO, 1.9, 0.08, Color(0.95, 0.83, 0.22, 0.7), Vector3.ZERO, 32, false)
	selection_marker.visible = false

func _process(delta: float) -> void:
	super(delta)
	if not running:
		return
	production_timer += delta
	worker_timer += delta
	seller_timer += delta
	if production_timer >= 1.0:
		production_timer = 0.0
		_update_rural_production()
	if worker_timer >= 5.0:
		worker_timer = 0.0
		_run_worker_tasks()
	if seller_timer >= 30.0:
		seller_timer = 0.0
		if bool(game["employees"].get("seller", false)):
			_sell_all(false)

func _build_interface() -> void:
	super()
	_build_rural_controls()

func _build_top_hud(root: Control) -> void:
	var panel := PanelContainer.new()
	panel.anchor_left = 0.5
	panel.anchor_right = 0.5
	panel.offset_left = -335
	panel.offset_right = 335
	panel.offset_top = 14
	panel.offset_bottom = 72
	panel.add_theme_stylebox_override("panel", _panel_style(Color("fff8e7"), 28))
	root.add_child(panel)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 8)
	panel.add_child(row)
	row.add_child(_make_label("AgroFarm", 18, Color("33442d"), true))
	for key_text in [["coins", "100.00"], ["level", "LV 1"], ["storage", "0/10"], ["clock", "Sol 08:00"]]:
		var chip := PanelContainer.new()
		chip.add_theme_stylebox_override("panel", _panel_style(Color("f3efd9"), 18, Color("eee8cc")))
		var label := _make_label(key_text[1], 14, Color("39442e"), true)
		chip.add_child(label)
		row.add_child(chip)
		hud[key_text[0]] = label
	var mode_button := _make_button("Livre", _toggle_mode, Color("e8f49b"), Vector2(90, 40))
	row.add_child(mode_button)
	hud["mode"] = mode_button
	row.add_child(_make_button("Menu", _open_menu, Color("e8f49b"), Vector2(66, 40)))

func _build_mission_panel(root: Control) -> void:
	var panel := PanelContainer.new()
	panel.offset_left = 16
	panel.offset_top = 18
	panel.offset_right = 302
	panel.offset_bottom = 142
	panel.add_theme_stylebox_override("panel", _panel_style(Color("fff8e7"), 26))
	root.add_child(panel)
	var column := VBoxContainer.new()
	column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	column.add_theme_constant_override("separation", 4)
	panel.add_child(column)
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
	panel.offset_left = -350
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
		var button := _make_button(String(info["name"]), _select_crop.bind(key), Color("fff8e7"), Vector2(100, 40))
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
	panel.offset_top = -88
	panel.offset_bottom = -14
	panel.add_theme_stylebox_override("panel", _panel_style(Color("fff8e7"), 26))
	root.add_child(panel)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 5)
	panel.add_child(row)
	var tools := [["hoe", "1\nEnxada"], ["seed", "2\nPlantar"], ["water", "3\nRegar"], ["protect", "4\nDefensivo"], ["harvest", "5\nColher"]]
	for data in tools:
		var button := _make_button(data[1], _select_tool.bind(data[0]), Color("fff8e7"), Vector2(103, 58))
		button.set_meta("tool", data[0])
		button.add_to_group("tool_buttons")
		row.add_child(button)

func _build_zoom_controls(root: Control) -> void:
	var panel := PanelContainer.new()
	panel.anchor_left = 1.0
	panel.anchor_right = 1.0
	panel.anchor_top = 1.0
	panel.anchor_bottom = 1.0
	panel.offset_left = -82
	panel.offset_right = -18
	panel.offset_top = -196
	panel.offset_bottom = -22
	panel.add_theme_stylebox_override("panel", _panel_style(Color("fff8e7"), 24))
	root.add_child(panel)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 5)
	panel.add_child(column)
	column.add_child(_make_button("+", func(): camera_zoom = clampf(camera_zoom - 2.0, 13.0, 52.0), Color("e8f49b"), Vector2(52, 42)))
	column.add_child(_make_button("Geral", _camera_home, Color("e8f49b"), Vector2(52, 42)))
	column.add_child(_make_button("-", func(): camera_zoom = clampf(camera_zoom + 2.0, 13.0, 52.0), Color("e8f49b"), Vector2(52, 42)))

func _build_rural_controls() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 12
	add_child(layer)
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(root)

	var actions := VBoxContainer.new()
	actions.anchor_top = 1.0
	actions.anchor_bottom = 1.0
	actions.offset_left = 18
	actions.offset_right = 156
	actions.offset_top = -208
	actions.offset_bottom = -22
	actions.add_theme_constant_override("separation", 6)
	root.add_child(actions)
	actions.add_child(_make_button("Construir", _open_build_menu, Color("e8f49b"), Vector2(132, 46)))
	actions.add_child(_make_button("Equipe", _open_team_menu, Color("e8f49b"), Vector2(132, 46)))
	edit_button = _make_button("Editar mapa", _toggle_edit_mode, Color("e8f49b"), Vector2(132, 46))
	actions.add_child(edit_button)

	edit_panel = PanelContainer.new()
	edit_panel.anchor_left = 0.5
	edit_panel.anchor_right = 0.5
	edit_panel.offset_left = -480
	edit_panel.offset_right = 480
	edit_panel.offset_top = 82
	edit_panel.offset_bottom = 154
	edit_panel.add_theme_stylebox_override("panel", _panel_style(Color("f8f3df"), 22))
	edit_panel.visible = false
	root.add_child(edit_panel)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 4)
	edit_panel.add_child(column)
	edit_status = _make_label("Escolha uma ação.", 12, Color("58634d"), true)
	edit_status.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(edit_status)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 5)
	column.add_child(row)
	row.add_child(_make_button("Mover", _select_edit_action.bind("move"), Color("e7efcb"), Vector2(88, 38)))
	row.add_child(_make_button("Cerca H", _select_edit_action.bind("fence_h"), Color("e7efcb"), Vector2(88, 38)))
	row.add_child(_make_button("Cerca V", _select_edit_action.bind("fence_v"), Color("e7efcb"), Vector2(88, 38)))
	row.add_child(_make_button("Remover cerca", _select_edit_action.bind("remove_fence"), Color("f1d8c0"), Vector2(116, 38)))
	row.add_child(_make_button("Cortar árvore", _activate_axe, Color("e7efcb"), Vector2(112, 38)))
	row.add_child(_make_button("Canteiro", _select_edit_action.bind("expand"), Color("dff18d"), Vector2(92, 38)))
	row.add_child(_make_button("Cancelar", _clear_move_selection, Color("ead8c8"), Vector2(88, 38)))
	row.add_child(_make_button("Fechar", _toggle_edit_mode, Color("ead8c8"), Vector2(76, 38)))

func _update_hud() -> void:
	if hud.is_empty() or game.is_empty():
		return
	hud["coins"].text = _format_coins(float(game["coins"]))
	hud["level"].text = "LV %d" % int(game["level"])
	hud["storage"].text = "%d/%d" % [_used_storage(), int(game["barn_capacity"])]
	hud["mode"].text = "Livre" if String(game["mode"]) == "free" else "Realista"
	var hour := int(day_minutes / 60.0) % 24
	var minute := int(day_minutes) % 60
	var weather_names := {"sunny": "Sol", "cloudy": "Nublado", "rain": "Chuva"}
	hud["clock"].text = "%s %02d:%02d" % [weather_names.get(game.get("weather", "sunny"), "Sol"), hour, minute]
	var mission := _mission()
	hud["mission_title"].text = mission["title"]
	hud["mission_text"].text = mission["text"]
	hud["mission_progress"].value = mission["progress"]

func _unhandled_input(event: InputEvent) -> void:
	if not running or modal_overlay.visible:
		return
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			if edit_mode:
				_handle_edit_pointer(event.position)
			else:
				_handle_world_pointer(event.position)
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			rotating_camera = event.pressed
			previous_pointer = event.position
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP and event.pressed:
			camera_zoom = clampf(camera_zoom - 1.8, 13.0, 52.0)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			camera_zoom = clampf(camera_zoom + 1.8, 13.0, 52.0)
	elif event is InputEventMouseMotion and rotating_camera:
		camera_yaw -= event.relative.x * 0.18
	elif event is InputEventScreenTouch and event.pressed:
		if edit_mode:
			_handle_edit_pointer(event.position)
		else:
			_handle_world_pointer(event.position)

func _raycast_pointer(screen_position: Vector2) -> Dictionary:
	var origin := world.camera.project_ray_origin(screen_position)
	var direction := world.camera.project_ray_normal(screen_position)
	var query := PhysicsRayQueryParameters3D.create(origin, origin + direction * 220.0)
	query.collide_with_areas = true
	query.collide_with_bodies = true
	query.collision_mask = 3
	return get_world_3d().direct_space_state.intersect_ray(query)

func _handle_world_pointer(screen_position: Vector2) -> void:
	var hit := _raycast_pointer(screen_position)
	if hit.is_empty():
		return
	var collider: Object = hit.get("collider")
	var hit_position: Vector3 = hit.get("position", Vector3.ZERO)
	if collider != null and collider.has_meta("interaction_type"):
		var interaction_type := String(collider.get_meta("interaction_type"))
		var interaction_id = collider.get_meta("interaction_id")
		match interaction_type:
			"plot":
				_queue_plot(int(interaction_id))
				return
			"building":
				_queue_building(String(interaction_id))
				return
			"expansion":
				_open_expansion(String(interaction_id))
				return
			"tree":
				_show_toast("Árvores não podem ser movidas. Use o machado no modo de edição.")
				return
	_move_to(hit_position, {})

func _toggle_edit_mode() -> void:
	edit_mode = not edit_mode
	edit_panel.visible = edit_mode
	edit_button.text = "Sair da edição" if edit_mode else "Editar mapa"
	edit_action = ""
	_clear_move_selection()
	has_move_target = false
	movement_marker.visible = false
	if edit_mode:
		edit_status.text = "Escolha uma ação. Árvores só podem ser cortadas."
		_show_toast("Modo de edição ativado.")
	else:
		_show_toast("Alterações salvas.")
		_save_game()

func _start_edit_action(action: String) -> void:
	if not edit_mode:
		_toggle_edit_mode()
	_select_edit_action(action)

func _select_edit_action(action: String) -> void:
	edit_action = action
	_clear_move_selection()
	match action:
		"move":
			edit_status.text = "Selecione prédio, canteiro ou cerca; depois toque no novo local."
		"fence_h":
			edit_status.text = "Toque no terreno para construir uma cerca horizontal (4 moedas)."
		"fence_v":
			edit_status.text = "Toque no terreno para construir uma cerca vertical (4 moedas)."
		"remove_fence":
			edit_status.text = "Toque em uma cerca personalizada para removê-la."
		"expand":
			edit_status.text = "Toque em uma área livre para comprar um novo canteiro."
		"pond":
			edit_status.text = "Escolha uma área livre para construir o lago."
		"cut_tree":
			edit_status.text = "Toque em uma árvore. Cada corte custa 10 moedas."

func _clear_move_selection() -> void:
	selected_move_type = ""
	selected_move_id = null
	if selection_marker != null:
		selection_marker.visible = false
	if edit_mode and edit_status != null:
		edit_status.text = "Escolha uma ação."

func _handle_edit_pointer(screen_position: Vector2) -> void:
	if edit_action.is_empty():
		_show_toast("Escolha uma ação no painel de edição.")
		return
	var hit := _raycast_pointer(screen_position)
	if hit.is_empty():
		return
	var collider: Object = hit.get("collider")
	var hit_position: Vector3 = hit.get("position", Vector3.ZERO)
	var interaction_type := ""
	var interaction_id = null
	if collider != null and collider.has_meta("interaction_type"):
		interaction_type = String(collider.get_meta("interaction_type"))
		interaction_id = collider.get_meta("interaction_id")
	match edit_action:
		"move":
			_handle_move_action(interaction_type, interaction_id, hit_position)
		"fence_h":
			_place_fence(hit_position, false)
		"fence_v":
			_place_fence(hit_position, true)
		"remove_fence":
			if interaction_type == "fence":
				_remove_fence(int(interaction_id))
			else:
				_show_toast("Selecione uma cerca personalizada.")
		"cut_tree":
			if interaction_type == "tree":
				_cut_tree(int(interaction_id))
			else:
				_show_toast("Selecione uma árvore.")
		"expand":
			_expand_field(hit_position)
		"pond":
			_place_pond(hit_position)

func _handle_move_action(interaction_type: String, interaction_id, hit_position: Vector3) -> void:
	var rural_world := world as RuralFarmWorld
	if selected_move_type.is_empty():
		if interaction_type == "tree":
			_show_toast("Árvores não podem ser movidas. Corte com o machado.")
			return
		if interaction_type != "building" and interaction_type != "plot" and interaction_type != "fence":
			_show_toast("Selecione um prédio, canteiro ou cerca.")
			return
		selected_move_type = interaction_type
		selected_move_id = interaction_id
		var selected_position := rural_world.get_object_position(selected_move_type, selected_move_id)
		selection_marker.position = Vector3(selected_position.x, 0.2, selected_position.z)
		selection_marker.visible = true
		var cost := _move_cost(selected_move_type, selected_move_id)
		edit_status.text = "Selecionado. Toque no novo local (%.0f moedas)." % cost
		return
	var target := _snap_position(hit_position, 1.0)
	var cost := _move_cost(selected_move_type, selected_move_id)
	if float(game["coins"]) < cost:
		_show_toast("Moedas insuficientes para mover esse elemento.")
		return
	var valid := false
	match selected_move_type:
		"building":
			valid = rural_world.can_place_building(String(selected_move_id), target, game.get("expansions", []))
		"plot":
			valid = rural_world.can_place_plot(target, game.get("expansions", []), int(selected_move_id))
		"fence":
			valid = rural_world.can_place_fence(target, game.get("expansions", []), int(selected_move_id))
	if not valid:
		_show_toast("Esse local está ocupado ou fora da área comprada.")
		return
	game["coins"] = float(game["coins"]) - cost
	match selected_move_type:
		"building":
			rural_world.move_building(String(selected_move_id), target)
			rural_world.refresh_animal_homes(game.get("animals", {}))
		"plot":
			rural_world.move_plot(int(selected_move_id), target)
		"fence":
			rural_world.move_fence(int(selected_move_id), target)
	_show_toast("Elemento reposicionado.")
	_clear_move_selection()
	_update_hud()
	_save_game()

func _move_cost(kind: String, identifier) -> float:
	if kind == "building":
		return float(MOVE_COSTS.get(String(identifier), 30.0))
	if kind == "plot":
		return 10.0
	if kind == "fence":
		return 2.0
	return 0.0

func _place_fence(hit_position: Vector3, vertical: bool) -> void:
	if float(game["coins"]) < FENCE_COST:
		_show_toast("Você precisa de 4 moedas para construir a cerca.")
		return
	var target := _snap_position(hit_position, 1.1)
	var rural_world := world as RuralFarmWorld
	if not rural_world.can_place_fence(target, game.get("expansions", [])):
		_show_toast("Não é possível construir a cerca nesse local.")
		return
	rural_world.add_custom_fence(target, vertical)
	game["coins"] = float(game["coins"]) - FENCE_COST
	_update_hud()
	_save_game()
	_show_toast("Cerca construída.")

func _remove_fence(fence_id: int) -> void:
	var rural_world := world as RuralFarmWorld
	if rural_world.remove_custom_fence(fence_id):
		game["coins"] = float(game["coins"]) + FENCE_REFUND
		_update_hud()
		_save_game()
		_show_toast("Cerca removida. 1 moeda devolvida.")

func _activate_axe() -> void:
	if bool(game.get("tools_owned", {}).get("axe", false)):
		_start_edit_action("cut_tree")
		return
	_clear_modal("Comprar machado")
	modal_content.add_child(_make_label("O machado custa 120 moedas. Cada árvore removida também exige 10 moedas de trabalho.", 15, Color("59654f")))
	modal_content.add_child(_make_button("Comprar machado - 120 moedas", _buy_axe, Color("dff18d"), Vector2(0, 50)))

func _buy_axe() -> void:
	if float(game["coins"]) < AXE_COST:
		_show_toast("Moedas insuficientes para comprar o machado.")
		return
	game["coins"] = float(game["coins"]) - AXE_COST
	game["tools_owned"]["axe"] = true
	_close_modal()
	_start_edit_action("cut_tree")
	_update_hud()
	_save_game()
	_show_toast("Machado adquirido.")

func _cut_tree(tree_id: int) -> void:
	if not bool(game.get("tools_owned", {}).get("axe", false)):
		_activate_axe()
		return
	if float(game["coins"]) < TREE_CUT_COST:
		_show_toast("Você precisa de 10 moedas para remover a árvore.")
		return
	var rural_world := world as RuralFarmWorld
	if not rural_world.cut_tree(tree_id):
		return
	game["coins"] = float(game["coins"]) - TREE_CUT_COST
	var removed: Array = game.get("removed_trees", [])
	if not removed.has(tree_id):
		removed.append(tree_id)
	game["removed_trees"] = removed
	game["wood"] = int(game.get("wood", 0)) + 3
	_update_hud()
	_save_game()
	_show_toast("Árvore removida. -10 moedas, +3 madeiras.")

func _expand_field(hit_position: Vector3) -> void:
	var rural_world := world as RuralFarmWorld
	var target := _snap_position(hit_position, 3.0)
	var extra_count := maxi(0, world.plots.size() - 12)
	var cost := BASE_PLOT_COST + float(extra_count) * 25.0
	if float(game["coins"]) < cost:
		_show_toast("Moedas insuficientes. O novo canteiro custa %.0f." % cost)
		return
	if not rural_world.can_place_plot(target, game.get("expansions", [])):
		_show_toast("Limpe a área ou escolha outro local.")
		return
	game["coins"] = float(game["coins"]) - cost
	var plot := rural_world.add_custom_plot(target)
	_connect_plot(plot)
	_update_hud()
	_save_game()
	_show_toast("Novo canteiro criado por %.0f moedas." % cost)

func _place_pond(hit_position: Vector3) -> void:
	var rural_world := world as RuralFarmWorld
	if rural_world.buildings.has("fish_pond"):
		_show_toast("A fazenda já possui um lago de peixes.")
		return
	if float(game["coins"]) < POND_COST:
		_show_toast("Você precisa de 220 moedas para construir o lago.")
		return
	var target := _snap_position(hit_position, 1.0)
	if not rural_world.can_place_building("fish_pond", target, game.get("expansions", [])):
		_show_toast("Escolha uma área livre maior para o lago.")
		return
	game["coins"] = float(game["coins"]) - POND_COST
	rural_world.build_fish_pond(target)
	edit_action = ""
	_update_hud()
	_save_game()
	_show_toast("Lago construído. Agora compre alevinos.")

func _snap_position(value: Vector3, step: float) -> Vector3:
	return Vector3(round(value.x / step) * step, 0.0, round(value.z / step) * step)

func _open_build_menu() -> void:
	_clear_modal("Construções rurais")
	var rural_world := world as RuralFarmWorld
	var next_plot_cost := BASE_PLOT_COST + float(maxi(0, world.plots.size() - 12)) * 25.0
	modal_content.add_child(_make_label("Escolha o que deseja construir e depois posicione no mapa.", 15, Color("59654f")))
	modal_content.add_child(_make_button("Novo canteiro - %.0f moedas" % next_plot_cost, _start_build_plot, Color("dff18d"), Vector2(0, 48)))
	modal_content.add_child(_make_button("Construir cercas - 4 moedas por trecho", _start_build_fence, Color("f5e4ad"), Vector2(0, 48)))
	if not rural_world.buildings.has("fish_pond"):
		modal_content.add_child(_make_button("Lago para peixes - 220 moedas", _start_build_pond, Color("bde7ef"), Vector2(0, 48)))
	else:
		modal_content.add_child(_make_label("Lago para peixes já construído.", 14, Color("66705a")))
	modal_content.add_child(_make_label("As placas nas bordas compram novas áreas do mapa.", 14, Color("66705a")))

func _start_build_plot() -> void:
	_close_modal()
	_start_edit_action("expand")

func _start_build_fence() -> void:
	_close_modal()
	_start_edit_action("fence_h")

func _start_build_pond() -> void:
	_close_modal()
	_start_edit_action("pond")

func _open_expansion(direction: String) -> void:
	if game.get("expansions", []).has(direction):
		return
	pending_expansion = direction
	var count := game.get("expansions", []).size()
	var cost := EXPANSION_COSTS[mini(count, EXPANSION_COSTS.size() - 1)]
	_clear_modal("Ampliar propriedade")
	modal_content.add_child(_make_label("Esta compra libera uma nova faixa de terra para produção, animais e construções.", 15, Color("59654f")))
	modal_content.add_child(_make_button("Comprar expansão - %.0f moedas" % cost, _purchase_pending_expansion, Color("dff18d"), Vector2(0, 52)))

func _purchase_pending_expansion() -> void:
	if pending_expansion.is_empty():
		return
	var expansions: Array = game.get("expansions", [])
	var cost := EXPANSION_COSTS[mini(expansions.size(), EXPANSION_COSTS.size() - 1)]
	if float(game["coins"]) < cost:
		_show_toast("Moedas insuficientes para ampliar a propriedade.")
		return
	game["coins"] = float(game["coins"]) - cost
	expansions.append(pending_expansion)
	game["expansions"] = expansions
	(world as RuralFarmWorld).purchase_expansion(pending_expansion)
	pending_expansion = ""
	_close_modal()
	camera_zoom = maxf(camera_zoom, 40.0)
	_update_hud()
	_save_game()
	_show_toast("Nova área da fazenda liberada.")

func _queue_building(key: String) -> void:
	if not world.buildings.has(key):
		return
	var info: Dictionary = world.buildings[key]
	_move_to(info["entrance"], {"type": "building", "id": key})

func _open_building(key: String) -> void:
	match key:
		"pasture":
			_open_animal_area("cow")
		"coop":
			_open_animal_area("chicken")
		"pig_pen":
			_open_animal_area("pig")
		"fish_pond":
			_open_fish_pond()
		"house":
			_open_house()
		"barn":
			_open_barn()
		"market":
			_open_market()
		"workshop":
			_open_workshop()

func _open_animal_area(species: String) -> void:
	var info: Dictionary = ANIMAL_DATA[species]
	var count := int(game["animals"].get(species, 0))
	var care := float(game["animal_care"].get(species, 100.0))
	_clear_modal(String(info["name"]))
	modal_content.add_child(_make_label("Animais: %d/%d · cuidado %.0f%%" % [count, int(info["capacity"]), care], 18, Color("4d6245"), true))
	if count < int(info["capacity"]):
		modal_content.add_child(_make_button("Comprar %s - %.0f moedas" % [String(info["name"]), float(info["buy_cost"])], _buy_animal.bind(species), Color("dff18d"), Vector2(0, 48)))
	else:
		modal_content.add_child(_make_label("Capacidade máxima desta estrutura.", 14, Color("66705a")))
	if count > 0:
		var feed_cost := float(info["feed_cost"]) * count
		modal_content.add_child(_make_button("Alimentar todos - %.0f moedas" % feed_cost, _feed_animals.bind(species), Color("f5e4ad"), Vector2(0, 46)))
	if species == "pig":
		var mature := int(game.get("mature_pigs", 0))
		modal_content.add_child(_make_label("Porcos prontos para venda: %d" % mature, 15, Color("59654f")))
		if mature > 0:
			modal_content.add_child(_make_button("Vender um porco", _sell_mature_pig, Color("edc79d"), Vector2(0, 46)))
	else:
		var product_key := String(info["product"])
		modal_content.add_child(_make_label("Produção armazenada: %d %s" % [int(game["inventory"].get(product_key, 0)), PRODUCT_DATA[product_key]["name"]], 14, Color("66705a")))

func _buy_animal(species: String) -> void:
	var info: Dictionary = ANIMAL_DATA[species]
	var count := int(game["animals"].get(species, 0))
	if count >= int(info["capacity"]):
		return
	if float(game["coins"]) < float(info["buy_cost"]):
		_show_toast("Moedas insuficientes para comprar o animal.")
		return
	game["coins"] = float(game["coins"]) - float(info["buy_cost"])
	game["animals"][species] = count + 1
	game["animal_care"][species] = maxf(70.0, float(game["animal_care"].get(species, 100.0)))
	(world as RuralFarmWorld).sync_animals(game["animals"])
	_open_animal_area(species)
	_update_hud()
	_save_game()
	_show_toast("%s comprado." % info["name"])

func _feed_animals(species: String) -> void:
	var info: Dictionary = ANIMAL_DATA[species]
	var count := int(game["animals"].get(species, 0))
	var cost := float(info["feed_cost"]) * count
	if count <= 0:
		return
	if float(game["coins"]) < cost:
		_show_toast("Moedas insuficientes para comprar a ração.")
		return
	game["coins"] = float(game["coins"]) - cost
	game["animal_care"][species] = minf(100.0, float(game["animal_care"].get(species, 100.0)) + 35.0)
	_open_animal_area(species)
	_update_hud()
	_save_game()
	_show_toast("Animais alimentados.")

func _sell_mature_pig() -> void:
	var mature := int(game.get("mature_pigs", 0))
	var pigs := int(game["animals"].get("pig", 0))
	if mature <= 0 or pigs <= 0:
		return
	var value := 145.0 if String(game["mode"]) == "free" else 122.4
	game["mature_pigs"] = mature - 1
	game["animals"]["pig"] = pigs - 1
	game["coins"] = float(game["coins"]) + value
	(world as RuralFarmWorld).sync_animals(game["animals"])
	_open_animal_area("pig")
	_update_hud()
	_save_game()
	_show_toast("Porco vendido por %.2f moedas." % value)

func _open_fish_pond() -> void:
	_clear_modal("Piscicultura")
	var stock := int(game.get("pond_stock", 0))
	modal_content.add_child(_make_label("Peixes em crescimento: %d" % stock, 18, Color("4d6245"), true))
	modal_content.add_child(_make_label("Peixes colhidos no galpão: %d" % int(game["inventory"].get("fish", 0)), 14, Color("66705a")))
	if stock == 0:
		modal_content.add_child(_make_button("Comprar 5 alevinos - 50 moedas", _stock_fish_pond, Color("bde7ef"), Vector2(0, 48)))
	else:
		var ready_at := float(game["production"].get("fish_ready_at", 0.0))
		var remaining := maxi(0, int(ready_at - Time.get_unix_time_from_system()))
		modal_content.add_child(_make_label("Tempo restante: %s" % _format_duration(remaining), 15, Color("59654f")))

func _stock_fish_pond() -> void:
	if float(game["coins"]) < 50.0:
		_show_toast("Moedas insuficientes para comprar os alevinos.")
		return
	game["coins"] = float(game["coins"]) - 50.0
	game["pond_stock"] = 5
	game["production"]["fish_ready_at"] = Time.get_unix_time_from_system() + _production_duration("fish")
	_open_fish_pond()
	_update_hud()
	_save_game()
	_show_toast("Lago povoado com 5 alevinos.")

func _open_team_menu() -> void:
	_clear_modal("Equipe da fazenda")
	modal_content.add_child(_make_label("Funcionários recebem salário a cada novo dia do jogo.", 14, Color("66705a")))
	for key in EMPLOYEE_DATA:
		var info: Dictionary = EMPLOYEE_DATA[key]
		var hired := bool(game["employees"].get(key, false))
		var status := "Contratado" if hired else "Disponível"
		modal_content.add_child(_make_label("%s · %s · salário %.0f" % [info["name"], status, float(info["wage"])], 16, Color("4d6245"), true))
		modal_content.add_child(_make_label(info["description"], 13, Color("66705a")))
		if not hired:
			modal_content.add_child(_make_button("Contratar - %.0f moedas" % float(info["hire_cost"]), _hire_employee.bind(key), Color("dff18d"), Vector2(0, 43)))
		else:
			modal_content.add_child(_make_button("Demitir", _fire_employee.bind(key), Color("edc79d"), Vector2(0, 40)))

func _hire_employee(key: String) -> void:
	var info: Dictionary = EMPLOYEE_DATA[key]
	if float(game["coins"]) < float(info["hire_cost"]):
		_show_toast("Moedas insuficientes para contratar.")
		return
	game["coins"] = float(game["coins"]) - float(info["hire_cost"])
	game["employees"][key] = true
	_open_team_menu()
	_update_hud()
	_save_game()
	_show_toast("%s contratado." % info["name"])

func _fire_employee(key: String) -> void:
	game["employees"][key] = false
	_open_team_menu()
	_save_game()
	_show_toast("Funcionário desligado.")

func _update_world(delta: float) -> void:
	var previous_minutes := day_minutes
	day_minutes = fmod(day_minutes + delta * 2.4, 1440.0)
	weather_timer += delta
	var realistic := String(game.get("mode", "free")) == "realistic"
	for plot in world.plots:
		if plot.crop_key.is_empty():
			continue
		var previous_stage := int(plot.growth * 4.0)
		var crop_info: Dictionary = CROP_DATA.get(plot.crop_key, CROP_DATA["corn"]).duplicate()
		crop_info["duration"] = _crop_duration(plot.crop_key)
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
	if day_minutes < previous_minutes:
		_on_new_day()
	last_day_minutes = day_minutes

func _crop_duration(crop_key: String) -> float:
	if String(game.get("mode", "free")) == "realistic":
		return float(REAL_CROP_DURATIONS.get(crop_key, 7200.0))
	return float(FREE_CROP_DURATIONS.get(crop_key, 45.0))

func _perform_plot_action(plot_id: int, automated: bool = false, forced_tool: String = "") -> bool:
	if plot_id < 0 or plot_id >= world.plots.size():
		return false
	var plot := world.plots[plot_id]
	var stats: Dictionary = game["stats"]
	var action := forced_tool if not forced_tool.is_empty() else selected_tool
	match action:
		"hoe":
			if plot.tilled or not plot.crop_key.is_empty():
				if not automated: _show_toast("Esse canteiro já está preparado.")
				return false
			plot.tilled = true
			stats["tilled"] = true
			if not automated: _show_toast("Terra preparada.")
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
			plot.last_advanced_unix = Time.get_unix_time_from_system()
			stats["planted"] = true
			if not automated: _show_toast("%s plantado." % crop_info["name"])
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
				if not automated: _show_toast("A cultura perdida foi removida.")
				return true
			if plot.growth < 1.0:
				if not automated: _show_toast("A cultura ainda está crescendo.")
				return false
			var crop_info: Dictionary = CROP_DATA[plot.crop_key]
			var amount := int(crop_info["yield"])
			if String(game["mode"]) == "free":
				if plot.watered: amount += 1
				if plot.protected_crop: amount += 1
			if _used_storage() + amount > int(game["barn_capacity"]):
				if not automated: _show_toast("O galpão não tem espaço suficiente.")
				return false
			game["inventory"][plot.crop_key] = int(game["inventory"].get(plot.crop_key, 0)) + amount
			stats["harvested"] = true
			var crop_name := String(crop_info["name"])
			_reset_plot(plot)
			if not automated: _show_toast("%d unidades de %s colhidas." % [amount, crop_name])
	plot.refresh_visual()
	game["stats"] = stats
	_update_hud()
	_save_game()
	Input.vibrate_handheld(28)
	return true

func _update_rural_production() -> void:
	var now := Time.get_unix_time_from_system()
	var last_care := float(game.get("last_care_unix", now))
	var elapsed := clampf(now - last_care, 0.0, 28800.0)
	game["last_care_unix"] = now
	var decay_per_second := 1.0 / (3600.0 if String(game["mode"]) == "realistic" else 300.0)
	for species in ["cow", "chicken", "pig"]:
		if int(game["animals"].get(species, 0)) <= 0:
			continue
		if bool(game["employees"].get("caretaker", false)):
			game["animal_care"][species] = maxf(85.0, float(game["animal_care"].get(species, 100.0)))
		else:
			game["animal_care"][species] = maxf(0.0, float(game["animal_care"].get(species, 100.0)) - elapsed * decay_per_second)
	_update_species_production("cow", "milk", now)
	_update_species_production("chicken", "eggs", now)
	_update_pig_growth(now)
	_update_fish_growth(now)

func _update_species_production(species: String, product: String, now: float) -> void:
	var count := int(game["animals"].get(species, 0))
	if count <= 0 or float(game["animal_care"].get(species, 100.0)) < 25.0:
		return
	var timer_key := "%s_ready_at" % species
	var ready_at := float(game["production"].get(timer_key, 0.0))
	if ready_at <= 0.0:
		game["production"][timer_key] = now + _production_duration(species)
		return
	if now < ready_at:
		return
	if _used_storage() + count > int(game["barn_capacity"]):
		game["production"][timer_key] = now + 30.0
		return
	game["inventory"][product] = int(game["inventory"].get(product, 0)) + count
	game["production"][timer_key] = now + _production_duration(species)
	_show_toast("%s produzido e enviado ao galpão." % PRODUCT_DATA[product]["name"])

func _update_pig_growth(now: float) -> void:
	var count := int(game["animals"].get("pig", 0))
	var mature := int(game.get("mature_pigs", 0))
	if count <= mature or float(game["animal_care"].get("pig", 100.0)) < 25.0:
		return
	var ready_at := float(game["production"].get("pig_ready_at", 0.0))
	if ready_at <= 0.0:
		game["production"]["pig_ready_at"] = now + _production_duration("pig")
	elif now >= ready_at:
		game["mature_pigs"] = mature + 1
		game["production"]["pig_ready_at"] = now + _production_duration("pig")
		_show_toast("Um porco atingiu o peso de venda.")

func _update_fish_growth(now: float) -> void:
	var stock := int(game.get("pond_stock", 0))
	if stock <= 0:
		return
	var ready_at := float(game["production"].get("fish_ready_at", 0.0))
	if ready_at > 0.0 and now >= ready_at:
		if _used_storage() + stock > int(game["barn_capacity"]):
			game["production"]["fish_ready_at"] = now + 30.0
			return
		game["inventory"]["fish"] = int(game["inventory"].get("fish", 0)) + stock
		game["pond_stock"] = 0
		game["production"]["fish_ready_at"] = 0.0
		_show_toast("Os peixes foram colhidos e enviados ao galpão.")

func _production_duration(kind: String) -> float:
	var realistic := String(game.get("mode", "free")) == "realistic"
	if realistic:
		return {"cow": 18000.0, "chicken": 10800.0, "pig": 28800.0, "fish": 36000.0}.get(kind, 10800.0)
	return {"cow": 120.0, "chicken": 60.0, "pig": 180.0, "fish": 240.0}.get(kind, 120.0)

func _run_worker_tasks() -> void:
	if bool(game["employees"].get("harvester", false)):
		for plot in world.plots:
			if not plot.crop_key.is_empty() and plot.growth >= 1.0 and not plot.lost:
				_perform_plot_action(plot.plot_id, true, "harvest")
				break
	if bool(game["employees"].get("caretaker", false)):
		for species in ["cow", "chicken", "pig"]:
			if int(game["animals"].get(species, 0)) > 0:
				game["animal_care"][species] = maxf(85.0, float(game["animal_care"].get(species, 100.0)))

func _on_new_day() -> void:
	game["game_day"] = int(game.get("game_day", 1)) + 1
	var wages := 0.0
	for key in EMPLOYEE_DATA:
		if bool(game["employees"].get(key, false)):
			wages += float(EMPLOYEE_DATA[key]["wage"])
	if wages <= 0.0:
		return
	if float(game["coins"]) >= wages:
		game["coins"] = float(game["coins"]) - wages
		_show_toast("Salários pagos: %.0f moedas." % wages)
	else:
		for key in EMPLOYEE_DATA:
			game["employees"][key] = false
		_show_toast("Saldo insuficiente. A equipe foi desligada.")
	_update_hud()
	_save_game()

func _open_house() -> void:
	_clear_modal("Sede da Fazenda")
	var level := int(game["level"])
	var current: Dictionary = FARM_LEVELS[min(level - 1, FARM_LEVELS.size() - 1)]
	var margin_text := "%.0f%%" % (float(current["margin"]) * 100.0)
	modal_content.add_child(_make_label("%s · teto otimista %s no modo Realista" % [current["label"], margin_text], 18, Color("4d6245"), true))
	if level < FARM_LEVELS.size():
		var next: Dictionary = FARM_LEVELS[level]
		modal_content.add_child(_make_label("O próximo nível libera teto de %.0f%% e melhora o valor das vendas no modo Livre." % (float(next["margin"]) * 100.0), 14, Color("66705a")))
		modal_content.add_child(_make_button("Evoluir sede - %.0f moedas" % float(next["cost"]), _upgrade_house, Color("dff18d"), Vector2(0, 52)))
	else:
		modal_content.add_child(_make_label("Nível máximo: teto otimista de 10%.", 15, Color("66705a")))

func _upgrade_house() -> void:
	var level := int(game["level"])
	if level >= FARM_LEVELS.size():
		return
	var next: Dictionary = FARM_LEVELS[level]
	if float(game["coins"]) < float(next["cost"]):
		_show_toast("Moedas insuficientes para evoluir a sede.")
		return
	game["coins"] = float(game["coins"]) - float(next["cost"])
	game["level"] = level + 1
	_close_modal()
	_update_hud()
	_save_game()
	_show_toast("Sede evoluída para o nível %d." % int(game["level"]))

func _open_market() -> void:
	_clear_modal("Feira Rural")
	var total_value := 0.0
	for key in game["inventory"]:
		var amount := int(game["inventory"].get(key, 0))
		if amount <= 0:
			continue
		var value := _sale_value(key, amount)
		total_value += value
		modal_content.add_child(_make_button("Vender %s (%d) - %s moedas" % [_item_name(key), amount, _format_coins(value)], _sell_item.bind(key), Color("f5e4ad"), Vector2(0, 47)))
	if total_value <= 0.0:
		modal_content.add_child(_make_label("O galpão está vazio.", 15, Color("66705a")))
	else:
		modal_content.add_child(_make_button("Vender tudo - %s moedas" % _format_coins(total_value), _sell_all.bind(true), Color("dff18d"), Vector2(0, 54)))

func _sale_value(key: String, amount: int) -> float:
	var level_data: Dictionary = FARM_LEVELS[min(int(game["level"]) - 1, FARM_LEVELS.size() - 1)]
	if CROP_DATA.has(key):
		var crop: Dictionary = CROP_DATA[key]
		if String(game["mode"]) == "realistic":
			var unit_cost := float(crop["seed_cost"]) / maxf(1.0, float(crop["yield"]))
			return amount * unit_cost * (1.0 + float(level_data["margin"]))
		return amount * float(crop["sell"]) * float(level_data["free_multiplier"])
	if PRODUCT_DATA.has(key):
		var product: Dictionary = PRODUCT_DATA[key]
		var unit_price := float(product["real_sell"]) if String(game["mode"]) == "realistic" else float(product["free_sell"]) * float(level_data["free_multiplier"])
		return amount * unit_price
	return 0.0

func _sell_item(key: String) -> void:
	var amount := int(game["inventory"].get(key, 0))
	if amount <= 0:
		return
	var value := _sale_value(key, amount)
	game["coins"] = float(game["coins"]) + value
	game["inventory"][key] = 0
	game["stats"]["sold"] = true
	_open_market()
	_update_hud()
	_save_game()
	_show_toast("Venda concluída: %s moedas." % _format_coins(value))

func _sell_all(show_feedback: bool = true) -> void:
	var total := 0.0
	for key in game["inventory"]:
		var amount := int(game["inventory"].get(key, 0))
		if amount > 0:
			total += _sale_value(key, amount)
			game["inventory"][key] = 0
	if total <= 0.0:
		if show_feedback: _show_toast("Seu galpão está vazio.")
		return
	game["coins"] = float(game["coins"]) + total
	game["stats"]["sold"] = true
	if modal_overlay.visible:
		_close_modal()
	_update_hud()
	_save_game()
	if show_feedback: _show_toast("Produção vendida por %s moedas." % _format_coins(total))

func _item_name(key: String) -> String:
	if CROP_DATA.has(key):
		return String(CROP_DATA[key]["name"])
	if PRODUCT_DATA.has(key):
		return String(PRODUCT_DATA[key]["name"])
	return key.capitalize()

func _open_barn() -> void:
	_clear_modal("Galpão")
	var level := int(game["barn_level"])
	modal_content.add_child(_make_label("Estoque: %d de %d espaços" % [_used_storage(), int(game["barn_capacity"])], 18, Color("4d6245"), true))
	for key in game["inventory"]:
		var amount := int(game["inventory"].get(key, 0))
		modal_content.add_child(_make_label("%s: %d unidades" % [_item_name(key), amount], 15, Color("56654f")))
	if level < BARN_DATA.size():
		var next: Dictionary = BARN_DATA[level]
		modal_content.add_child(_make_button("Ampliar para %d espaços - %s moedas" % [next["capacity"], _format_coins(next["cost"])], _upgrade_barn, Color("dff18d"), Vector2(0, 52)))

func _open_menu() -> void:
	_clear_modal("AgroFarm 3D")
	modal_content.add_child(_make_label("Clique ou toque para jogar. Use Construir, Equipe e Editar mapa no canto inferior esquerdo.", 14, Color("66705a")))
	modal_content.add_child(_make_label("Árvores não podem ser movidas. Compre o machado e pague a remoção para abrir espaço.", 14, Color("66705a")))
	modal_content.add_child(_make_label("Madeira: %d · Dia %d" % [int(game.get("wood", 0)), int(game.get("game_day", 1))], 14, Color("66705a"), true))
	modal_content.add_child(_make_button("Salvar agora", func(): _save_game(); _show_toast("Jogo salvo."), Color("dff18d"), Vector2(0, 48)))
	modal_content.add_child(_make_button("Reiniciar fazenda", _reset_game, Color("edc1aa"), Vector2(0, 48)))

func _camera_home() -> void:
	camera_yaw = 42.0
	camera_zoom = 40.0 if game.get("expansions", []).size() > 0 else 36.0
	world.camera_rig.position = Vector3.ZERO

func _format_duration(total_seconds: int) -> String:
	var hours := total_seconds / 3600
	var minutes := (total_seconds % 3600) / 60
	var seconds := total_seconds % 60
	if hours > 0:
		return "%dh %02dmin" % [hours, minutes]
	if minutes > 0:
		return "%d:%02d" % [minutes, seconds]
	return "%ds" % seconds

func _reset_game() -> void:
	if FileAccess.file_exists(SAVE_PATH):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(SAVE_PATH))
	get_tree().reload_current_scene()
