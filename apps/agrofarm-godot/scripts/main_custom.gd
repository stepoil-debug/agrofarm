extends "res://scripts/main.gd"

const AXE_COST := 120.0
const FENCE_COST := 4.0
const FENCE_REFUND := 1.0
const BASE_PLOT_COST := 60.0
const MOVE_COSTS := {
	"house": 55.0,
	"barn": 40.0,
	"workshop": 35.0,
	"market": 20.0,
	"coop": 25.0,
}

var edit_mode := false
var edit_action := ""
var selected_building_to_move := ""
var edit_panel: PanelContainer
var edit_status: Label
var edit_button: Button

func _ready() -> void:
	randomize()
	world = CustomFarmWorld.new()
	world.name = "FarmWorld"
	add_child(world)
	world.setup()
	_build_movement_marker()
	_build_interface()
	game = _load_game()
	_ensure_custom_defaults()
	selected_tool = String(game.get("selected_tool", "hoe"))
	selected_crop = String(game.get("selected_crop", "corn"))
	day_minutes = float(game.get("day_minutes", 480.0))
	camera_zoom = float(game.get("camera_zoom", 34.0))
	_apply_custom_layout()
	_apply_saved_plots()
	_connect_all_plots()
	_update_tool_buttons()
	_update_crop_buttons()
	_update_hud()
	running = true
	_show_toast("Fazenda pronta. Use o mouse ou toque para jogar.")

func _ensure_custom_defaults() -> void:
	if not game.has("tools_owned"):
		game["tools_owned"] = {"axe": false}
	if not game.has("wood"):
		game["wood"] = 0
	if not game.has("removed_trees"):
		game["removed_trees"] = []
	if not game.has("building_positions"):
		game["building_positions"] = {}
	if not game.has("custom_fences"):
		game["custom_fences"] = []
	if not game.has("custom_plot_positions"):
		game["custom_plot_positions"] = []
	if not game.has("camera_zoom"):
		game["camera_zoom"] = 34.0

func _apply_custom_layout() -> void:
	var custom_world := world as CustomFarmWorld
	custom_world.apply_removed_trees(game.get("removed_trees", []))
	custom_world.apply_building_positions(game.get("building_positions", {}))
	custom_world.apply_custom_fences(game.get("custom_fences", []))
	custom_world.apply_custom_plots(game.get("custom_plot_positions", []))

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
	var custom_world := world as CustomFarmWorld
	game["building_positions"] = custom_world.export_building_positions()
	game["custom_fences"] = custom_world.export_custom_fences()
	game["custom_plot_positions"] = custom_world.export_custom_plot_positions()
	game["camera_zoom"] = camera_zoom
	super()

func _build_interface() -> void:
	super()
	_build_customization_controls()

func _build_customization_controls() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 12
	add_child(layer)
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_PASS
	layer.add_child(root)

	edit_button = _make_button("Editar fazenda", _toggle_edit_mode, Color("e8f49b"), Vector2(132, 46))
	edit_button.anchor_top = 1.0
	edit_button.anchor_bottom = 1.0
	edit_button.offset_left = 18
	edit_button.offset_right = 150
	edit_button.offset_top = -72
	edit_button.offset_bottom = -26
	root.add_child(edit_button)

	edit_panel = PanelContainer.new()
	edit_panel.anchor_left = 0.5
	edit_panel.anchor_right = 0.5
	edit_panel.offset_left = -470
	edit_panel.offset_right = 470
	edit_panel.offset_top = 82
	edit_panel.offset_bottom = 150
	edit_panel.add_theme_stylebox_override("panel", _panel_style(Color("f8f3df"), 22))
	edit_panel.visible = false
	root.add_child(edit_panel)
	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 4)
	edit_panel.add_child(column)
	edit_status = _make_label("Escolha uma ação de edição.", 12, Color("58634d"), true)
	edit_status.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	column.add_child(edit_status)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 5)
	column.add_child(row)
	row.add_child(_make_button("Mover", _select_edit_action.bind("move"), Color("e7efcb"), Vector2(92, 38)))
	row.add_child(_make_button("Cerca H", _select_edit_action.bind("fence_h"), Color("e7efcb"), Vector2(92, 38)))
	row.add_child(_make_button("Cerca V", _select_edit_action.bind("fence_v"), Color("e7efcb"), Vector2(92, 38)))
	row.add_child(_make_button("Remover cerca", _select_edit_action.bind("remove_fence"), Color("f1d8c0"), Vector2(125, 38)))
	row.add_child(_make_button("Machado", _activate_axe, Color("e7efcb"), Vector2(96, 38)))
	row.add_child(_make_button("Novo canteiro", _select_edit_action.bind("expand"), Color("dff18d"), Vector2(125, 38)))
	row.add_child(_make_button("Fechar", _toggle_edit_mode, Color("ead8c8"), Vector2(82, 38)))

func _toggle_edit_mode() -> void:
	edit_mode = not edit_mode
	edit_panel.visible = edit_mode
	edit_button.text = "Sair da edição" if edit_mode else "Editar fazenda"
	edit_action = ""
	selected_building_to_move = ""
	has_move_target = false
	movement_marker.visible = false
	if edit_mode:
		edit_status.text = "Escolha uma ação e toque no mapa."
		_show_toast("Modo de edição ativado.")
	else:
		_show_toast("Alterações salvas.")
		_save_game()

func _select_edit_action(action: String) -> void:
	edit_action = action
	selected_building_to_move = ""
	match action:
		"move": edit_status.text = "Toque em uma construção e depois no novo local."
		"fence_h": edit_status.text = "Toque no terreno para colocar uma cerca horizontal (4 moedas)."
		"fence_v": edit_status.text = "Toque no terreno para colocar uma cerca vertical (4 moedas)."
		"remove_fence": edit_status.text = "Toque em uma cerca personalizada para removê-la."
		"expand": edit_status.text = "Toque em uma área livre para comprar um novo canteiro."

func _activate_axe() -> void:
	if bool(game.get("tools_owned", {}).get("axe", false)):
		edit_action = "cut_tree"
		edit_status.text = "Toque em uma árvore para cortá-la e receber madeira."
		return
	_clear_modal("Comprar machado")
	modal_content.add_child(_make_label("O machado permite cortar árvores e abrir espaço para expandir a fazenda.", 15, Color("59654f")))
	modal_content.add_child(_make_button("Comprar machado · 120 moedas", _buy_axe, Color("dff18d"), Vector2(0, 50)))

func _buy_axe() -> void:
	if float(game["coins"]) < AXE_COST:
		_show_toast("Moedas insuficientes para comprar o machado.")
		return
	game["coins"] = float(game["coins"]) - AXE_COST
	game["tools_owned"]["axe"] = true
	edit_action = "cut_tree"
	edit_status.text = "Machado equipado. Toque em uma árvore."
	_close_modal()
	_update_hud()
	_save_game()
	_show_toast("Machado adquirido.")

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
			camera_zoom = clampf(camera_zoom - 1.8, 13.0, 48.0)
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN and event.pressed:
			camera_zoom = clampf(camera_zoom + 1.8, 13.0, 48.0)
	elif event is InputEventMouseMotion and rotating_camera:
		camera_yaw -= event.relative.x * 0.18
	elif event is InputEventScreenTouch and event.pressed:
		if edit_mode:
			_handle_edit_pointer(event.position)
		else:
			_handle_world_pointer(event.position)

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

func _raycast_pointer(screen_position: Vector2) -> Dictionary:
	var origin := world.camera.project_ray_origin(screen_position)
	var direction := world.camera.project_ray_normal(screen_position)
	var query := PhysicsRayQueryParameters3D.create(origin, origin + direction * 180.0)
	query.collide_with_areas = true
	query.collide_with_bodies = true
	query.collision_mask = 3
	return get_world_3d().direct_space_state.intersect_ray(query)

func _handle_move_action(interaction_type: String, interaction_id, hit_position: Vector3) -> void:
	var custom_world := world as CustomFarmWorld
	if selected_building_to_move.is_empty():
		if interaction_type != "building":
			_show_toast("Primeiro selecione uma construção.")
			return
		selected_building_to_move = String(interaction_id)
		var cost := float(MOVE_COSTS.get(selected_building_to_move, 30.0))
		edit_status.text = "%s selecionado. Toque no novo local (%.0f moedas)." % [selected_building_to_move.capitalize(), cost]
		return
	var target := _snap_position(hit_position, 1.0)
	var move_cost := float(MOVE_COSTS.get(selected_building_to_move, 30.0))
	if float(game["coins"]) < move_cost:
		_show_toast("Moedas insuficientes para mover a construção.")
		return
	if not custom_world.can_place_building(selected_building_to_move, target):
		_show_toast("Esse local está ocupado ou fora da área permitida.")
		return
	game["coins"] = float(game["coins"]) - move_cost
	custom_world.move_building(selected_building_to_move, target)
	_show_toast("Construção reposicionada.")
	selected_building_to_move = ""
	edit_status.text = "Selecione outra construção ou escolha uma nova ação."
	_update_hud()
	_save_game()

func _place_fence(hit_position: Vector3, vertical: bool) -> void:
	if float(game["coins"]) < FENCE_COST:
		_show_toast("Você precisa de 4 moedas para construir a cerca.")
		return
	var target := _snap_position(hit_position, 1.1)
	var custom_world := world as CustomFarmWorld
	custom_world.add_custom_fence(target, vertical)
	game["coins"] = float(game["coins"]) - FENCE_COST
	_update_hud()
	_save_game()
	_show_toast("Cerca construída.")

func _remove_fence(fence_id: int) -> void:
	var custom_world := world as CustomFarmWorld
	if custom_world.remove_custom_fence(fence_id):
		game["coins"] = float(game["coins"]) + FENCE_REFUND
		_update_hud()
		_save_game()
		_show_toast("Cerca removida. 1 moeda devolvida.")

func _cut_tree(tree_id: int) -> void:
	if not bool(game.get("tools_owned", {}).get("axe", false)):
		_activate_axe()
		return
	var custom_world := world as CustomFarmWorld
	if not custom_world.cut_tree(tree_id):
		return
	var removed: Array = game.get("removed_trees", [])
	if not removed.has(tree_id):
		removed.append(tree_id)
	game["removed_trees"] = removed
	game["wood"] = int(game.get("wood", 0)) + 3
	_save_game()
	_show_toast("Árvore cortada. +3 madeiras.")

func _expand_field(hit_position: Vector3) -> void:
	var custom_world := world as CustomFarmWorld
	var target := _snap_position(hit_position, 3.0)
	var extra_count := custom_world.custom_plot_positions.size()
	var cost := BASE_PLOT_COST + float(extra_count) * 25.0
	if float(game["coins"]) < cost:
		_show_toast("Moedas insuficientes. O novo canteiro custa %.0f." % cost)
		return
	if not custom_world.can_place_plot(target):
		_show_toast("Limpe a área ou escolha outro local.")
		return
	game["coins"] = float(game["coins"]) - cost
	var plot := custom_world.add_custom_plot(target)
	_connect_plot(plot)
	_update_hud()
	_save_game()
	_show_toast("Novo canteiro criado por %.0f moedas." % cost)

func _snap_position(value: Vector3, step: float) -> Vector3:
	return Vector3(round(value.x / step) * step, 0.0, round(value.z / step) * step)

func _camera_home() -> void:
	camera_yaw = 42.0
	camera_zoom = 36.0
	world.camera_rig.position = Vector3.ZERO

func _open_building(key: String) -> void:
	if key == "coop":
		_clear_modal("Galinheiro")
		modal_content.add_child(_make_label("As galinhas produzem ovos e ajudam a dar vida à fazenda. Novas melhorias serão liberadas com a evolução da sede.", 15, Color("59654f")))
		return
	super(key)

func _open_menu() -> void:
	super()
	modal_content.add_child(_make_label("Personalização: mova estruturas, construa cercas, corte árvores e compre novos canteiros.", 14, Color("66705a")))
	modal_content.add_child(_make_button("Abrir modo de edição", func(): _close_modal(); if not edit_mode: _toggle_edit_mode(), Color("dff18d"), Vector2(0, 48)))
	modal_content.add_child(_make_label("Madeira disponível: %d" % int(game.get("wood", 0)), 14, Color("66705a"), true))

func _reset_game() -> void:
	if FileAccess.file_exists(SAVE_PATH):
		DirAccess.remove_absolute(ProjectSettings.globalize_path(SAVE_PATH))
	get_tree().reload_current_scene()
