#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path


CONTROLLER_GD = r'''extends Node

var player = null
var farm = null
var ui_layer = null
var inventory = null
var shop_menu = null

var mobile_root = null
var map_button = null
var location_label = null
var inventory_button = null
var shop_open_button = null
var shop_close_button = null
var shop_tab_button = null
var action_panel = null
var action_title = null
var action_grid = null
var map_panel = null
var map_title = null
var map_info = null
var map_canvas = null
var map_player_marker = null
var map_target_marker = null
var map_guide_button = null
var toast_panel = null
var toast_label = null
var toast_until = 0
var selected_cell = Vector2(-1, -1)
var last_tap_at = 0
var update_accumulator = 0.0

const SHOP_CELL = Vector2(27, 43)
const FARM_GATE_CELL = Vector2(19, 0)
const HOUSE_EXIT_CELL = Vector2(4, 8)

func _ready():
    player = get_parent()
    farm = get_node("/root/Game/Farm")
    ui_layer = player.get_node("UI")
    inventory = player.get_node("UI/Inventory")
    shop_menu = get_node("/root/Game/Menus/Shop Menu")
    set_process_unhandled_input(true)
    set_process(true)
    _build_mobile_ui()
    _update_navigation_status()

func _process(delta):
    update_accumulator += delta
    if update_accumulator >= 0.25:
        update_accumulator = 0.0
        _update_navigation_status()
        _update_shop_controls()
        if map_panel.visible:
            _refresh_map()
    if toast_panel.visible and OS.get_ticks_msec() >= toast_until:
        toast_panel.visible = false

func _unhandled_input(event):
    if shop_menu.visible or map_panel.visible or action_panel.visible or inventory.visible:
        return
    var screen_position = null
    if event is InputEventScreenTouch and event.pressed:
        screen_position = event.position
    elif event is InputEventMouseButton and event.button_index == BUTTON_LEFT and event.pressed:
        screen_position = event.position
    if screen_position == null:
        return
    var now = OS.get_ticks_msec()
    if now - last_tap_at < 120:
        return
    last_tap_at = now
    _handle_world_tap(screen_position)

func _build_mobile_ui():
    mobile_root = Control.new()
    mobile_root.name = "MobileHUD"
    mobile_root.anchor_right = 1.0
    mobile_root.anchor_bottom = 1.0
    mobile_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
    ui_layer.add_child(mobile_root)

    map_button = _make_button("MAPA", Vector2(126, 52))
    map_button.anchor_left = 0.0
    map_button.anchor_top = 0.0
    map_button.margin_left = 16
    map_button.margin_top = 14
    map_button.margin_right = 142
    map_button.margin_bottom = 66
    map_button.connect("pressed", self, "_toggle_map")
    mobile_root.add_child(map_button)

    location_label = Label.new()
    location_label.anchor_left = 0.5
    location_label.anchor_right = 0.5
    location_label.margin_left = -270
    location_label.margin_top = 16
    location_label.margin_right = 270
    location_label.margin_bottom = 60
    location_label.align = Label.ALIGN_CENTER
    location_label.valign = Label.VALIGN_CENTER
    location_label.text = "FAZENDA"
    location_label.add_color_override("font_color", Color(1, 1, 1))
    mobile_root.add_child(location_label)

    inventory_button = _make_button("MOCHILA", Vector2(142, 52))
    inventory_button.anchor_left = 1.0
    inventory_button.anchor_right = 1.0
    inventory_button.margin_left = -158
    inventory_button.margin_top = 14
    inventory_button.margin_right = -16
    inventory_button.margin_bottom = 66
    inventory_button.connect("pressed", self, "_toggle_inventory")
    mobile_root.add_child(inventory_button)

    shop_open_button = _make_button("ABRIR LOJA", Vector2(166, 52))
    shop_open_button.anchor_left = 1.0
    shop_open_button.anchor_right = 1.0
    shop_open_button.margin_left = -340
    shop_open_button.margin_top = 14
    shop_open_button.margin_right = -174
    shop_open_button.margin_bottom = 66
    shop_open_button.visible = false
    shop_open_button.connect("pressed", self, "_open_shop")
    mobile_root.add_child(shop_open_button)

    shop_close_button = _make_button("FECHAR LOJA", Vector2(168, 54))
    shop_close_button.anchor_left = 1.0
    shop_close_button.anchor_right = 1.0
    shop_close_button.margin_left = -184
    shop_close_button.margin_top = 16
    shop_close_button.margin_right = -16
    shop_close_button.margin_bottom = 70
    shop_close_button.visible = false
    shop_close_button.connect("pressed", self, "_close_shop")
    mobile_root.add_child(shop_close_button)

    shop_tab_button = _make_button("COMPRAR / VENDER", Vector2(206, 54))
    shop_tab_button.anchor_left = 0.0
    shop_tab_button.margin_left = 16
    shop_tab_button.margin_top = 16
    shop_tab_button.margin_right = 222
    shop_tab_button.margin_bottom = 70
    shop_tab_button.visible = false
    shop_tab_button.connect("pressed", self, "_switch_shop_tab")
    mobile_root.add_child(shop_tab_button)

    _build_action_panel()
    _build_map_panel()
    _build_toast()

func _build_action_panel():
    action_panel = PanelContainer.new()
    action_panel.anchor_left = 0.5
    action_panel.anchor_right = 0.5
    action_panel.anchor_top = 1.0
    action_panel.anchor_bottom = 1.0
    action_panel.margin_left = -330
    action_panel.margin_top = -286
    action_panel.margin_right = 330
    action_panel.margin_bottom = -86
    action_panel.add_stylebox_override("panel", _panel_style(Color(0.06, 0.12, 0.08, 0.97)))
    action_panel.visible = false
    mobile_root.add_child(action_panel)

    var content = VBoxContainer.new()
    content.add_constant_override("separation", 8)
    action_panel.add_child(content)

    action_title = Label.new()
    action_title.text = "O que deseja fazer nesta area?"
    action_title.align = Label.ALIGN_CENTER
    action_title.rect_min_size = Vector2(0, 34)
    action_title.add_color_override("font_color", Color(1, 1, 1))
    content.add_child(action_title)

    action_grid = GridContainer.new()
    action_grid.columns = 3
    action_grid.add_constant_override("hseparation", 8)
    action_grid.add_constant_override("vseparation", 8)
    content.add_child(action_grid)

func _build_map_panel():
    map_panel = PanelContainer.new()
    map_panel.anchor_left = 0.5
    map_panel.anchor_right = 0.5
    map_panel.anchor_top = 0.5
    map_panel.anchor_bottom = 0.5
    map_panel.margin_left = -340
    map_panel.margin_top = -220
    map_panel.margin_right = 340
    map_panel.margin_bottom = 220
    map_panel.add_stylebox_override("panel", _panel_style(Color(0.035, 0.075, 0.05, 0.98)))
    map_panel.visible = false
    mobile_root.add_child(map_panel)

    var content = VBoxContainer.new()
    content.add_constant_override("separation", 8)
    map_panel.add_child(content)

    map_title = Label.new()
    map_title.text = "MAPA"
    map_title.align = Label.ALIGN_CENTER
    map_title.rect_min_size = Vector2(0, 36)
    map_title.add_color_override("font_color", Color(1, 1, 1))
    content.add_child(map_title)

    map_info = Label.new()
    map_info.align = Label.ALIGN_CENTER
    map_info.rect_min_size = Vector2(0, 42)
    map_info.add_color_override("font_color", Color(0.9, 0.95, 0.9))
    content.add_child(map_info)

    map_canvas = Control.new()
    map_canvas.rect_min_size = Vector2(620, 250)
    content.add_child(map_canvas)

    var background = ColorRect.new()
    background.name = "Background"
    background.anchor_right = 1.0
    background.anchor_bottom = 1.0
    background.color = Color(0.18, 0.42, 0.22, 1.0)
    background.mouse_filter = Control.MOUSE_FILTER_IGNORE
    map_canvas.add_child(background)

    map_player_marker = Label.new()
    map_player_marker.text = "VOCE"
    map_player_marker.rect_size = Vector2(62, 30)
    map_player_marker.align = Label.ALIGN_CENTER
    map_player_marker.valign = Label.VALIGN_CENTER
    map_player_marker.add_color_override("font_color", Color(1, 1, 1))
    map_canvas.add_child(map_player_marker)

    map_target_marker = Label.new()
    map_target_marker.text = "LOJA"
    map_target_marker.rect_size = Vector2(70, 30)
    map_target_marker.align = Label.ALIGN_CENTER
    map_target_marker.valign = Label.VALIGN_CENTER
    map_target_marker.add_color_override("font_color", Color(1.0, 0.94, 0.35))
    map_canvas.add_child(map_target_marker)

    var buttons = HBoxContainer.new()
    buttons.alignment = BoxContainer.ALIGN_CENTER
    buttons.add_constant_override("separation", 12)
    content.add_child(buttons)

    map_guide_button = _make_button("GUIAR PARA A LOJA", Vector2(220, 54))
    map_guide_button.connect("pressed", self, "_guide_to_target")
    buttons.add_child(map_guide_button)

    var close = _make_button("FECHAR", Vector2(150, 54))
    close.connect("pressed", self, "_toggle_map")
    buttons.add_child(close)

func _build_toast():
    toast_panel = PanelContainer.new()
    toast_panel.anchor_left = 0.5
    toast_panel.anchor_right = 0.5
    toast_panel.anchor_top = 1.0
    toast_panel.anchor_bottom = 1.0
    toast_panel.margin_left = -270
    toast_panel.margin_top = -360
    toast_panel.margin_right = 270
    toast_panel.margin_bottom = -310
    toast_panel.add_stylebox_override("panel", _panel_style(Color(0.04, 0.04, 0.04, 0.92)))
    toast_panel.visible = false
    mobile_root.add_child(toast_panel)
    toast_label = Label.new()
    toast_label.align = Label.ALIGN_CENTER
    toast_label.valign = Label.VALIGN_CENTER
    toast_label.add_color_override("font_color", Color(1, 1, 1))
    toast_panel.add_child(toast_label)

func _make_button(text_value, min_size):
    var button = Button.new()
    button.text = text_value
    button.rect_min_size = min_size
    button.focus_mode = Control.FOCUS_NONE
    button.add_color_override("font_color", Color(1, 1, 1))
    button.add_color_override("font_color_hover", Color(1, 1, 1))
    button.add_stylebox_override("normal", _button_style(Color(0.14, 0.36, 0.20, 0.98)))
    button.add_stylebox_override("hover", _button_style(Color(0.18, 0.48, 0.26, 1.0)))
    button.add_stylebox_override("pressed", _button_style(Color(0.09, 0.27, 0.14, 1.0)))
    return button

func _panel_style(color_value):
    var style = StyleBoxFlat.new()
    style.bg_color = color_value
    style.corner_radius_top_left = 16
    style.corner_radius_top_right = 16
    style.corner_radius_bottom_left = 16
    style.corner_radius_bottom_right = 16
    style.content_margin_left = 14
    style.content_margin_right = 14
    style.content_margin_top = 12
    style.content_margin_bottom = 12
    return style

func _button_style(color_value):
    var style = StyleBoxFlat.new()
    style.bg_color = color_value
    style.corner_radius_top_left = 10
    style.corner_radius_top_right = 10
    style.corner_radius_bottom_left = 10
    style.corner_radius_bottom_right = 10
    style.content_margin_left = 10
    style.content_margin_right = 10
    style.content_margin_top = 8
    style.content_margin_bottom = 8
    return style

func _handle_world_tap(screen_position):
    var world_position = get_viewport().get_canvas_transform().affine_inverse().xform(screen_position)
    if player.Zone.name == "Farm":
        var cell = farm.mobile_world_to_cell(world_position)
        if farm.mobile_is_interactive_cell(cell):
            selected_cell = cell
            _open_farm_actions()
            return
    _walk_to_world(world_position)

func _open_farm_actions():
    inventory.visible = false
    map_panel.visible = false
    action_panel.visible = true
    _refresh_farm_actions()

func _refresh_farm_actions():
    _clear_container(action_grid)
    var state = farm.mobile_get_cell_state(selected_cell)
    if not state.get("valid", false):
        action_title.text = "Area fora da fazenda"
        _add_action_button("FECHAR", "_close_actions")
        return

    action_title.text = "Area de plantio %d, %d" % [int(selected_cell.x) + 1, int(selected_cell.y) + 1]
    _add_action_button("ANDAR ATE AQUI", "_walk_to_selected")

    if state.get("can_till", false):
        _add_action_button("ARAR", "_farm_till")

    if state.get("can_plant", false):
        _add_crop_button("PLANTAR MILHO", "TurnipSeeds", 0)
        _add_crop_button("PLANTAR MANDIOCA", "StrawberrySeeds", 30)
        _add_crop_button("PLANTAR ABACAXI", "EggplantSeeds", 12)

    if state.get("can_water", false):
        _add_action_button("MOLHAR", "_farm_water")

    if state.get("can_harvest", false):
        _add_action_button("COLHER", "_farm_harvest")

    if state.get("has_junk", false):
        _add_action_button("LIMPAR", "_farm_clear")

    _add_action_button("FECHAR", "_close_actions")

func _add_action_button(label_text, method_name):
    var button = _make_button(label_text, Vector2(196, 54))
    button.connect("pressed", self, method_name)
    action_grid.add_child(button)
    return button

func _add_crop_button(label_text, seed_item, crop_id):
    var amount = inventory.get_amount(seed_item)
    var button = _make_button(label_text + " (" + str(amount) + ")", Vector2(196, 54))
    button.disabled = amount <= 0
    button.connect("pressed", self, "_farm_plant", [seed_item, crop_id])
    action_grid.add_child(button)

func _clear_container(container):
    for child in container.get_children():
        container.remove_child(child)
        child.queue_free()

func _close_actions():
    action_panel.visible = false

func _walk_to_selected():
    action_panel.visible = false
    _walk_to_cell(selected_cell)

func _farm_till():
    _perform_farm_result(farm.mobile_till_cell(selected_cell))

func _farm_plant(seed_item, crop_id):
    _perform_farm_result(farm.mobile_plant_cell(selected_cell, seed_item, crop_id))

func _farm_water():
    _perform_farm_result(farm.mobile_water_cell(selected_cell))

func _farm_harvest():
    _perform_farm_result(farm.mobile_harvest_cell(selected_cell))

func _farm_clear():
    _perform_farm_result(farm.mobile_clear_cell(selected_cell))

func _perform_farm_result(result):
    _show_toast(result.get("message", "Acao concluida"))
    _refresh_farm_actions()

func _walk_to_world(world_position):
    var nav = _navigation_tilemap()
    if nav == null:
        return
    _walk_to_cell(nav.world_to_map(world_position))

func _walk_to_cell(target_cell):
    var nav = _navigation_tilemap()
    if nav == null:
        return
    var start = nav.world_to_map(player.position)
    if start == target_cell:
        _show_toast("Voce ja esta neste ponto.")
        return
    var path = _find_grid_path(start, target_cell)
    if path.empty():
        _show_toast("Nao encontrei um caminho livre ate esse ponto.")
        return
    action_panel.visible = false
    map_panel.visible = false
    player.set_mobile_path(path)

func _find_grid_path(start, requested_target):
    var target = _nearest_walkable(requested_target)
    if target == null:
        return []
    if start == target:
        return []

    var frontier = [start]
    var came_from = {}
    came_from[start] = start
    var directions = [Vector2.UP, Vector2.DOWN, Vector2.LEFT, Vector2.RIGHT]

    while not frontier.empty():
        var current = frontier.pop_front()
        if current == target:
            break
        for step in directions:
            var next_cell = current + step
            if came_from.has(next_cell):
                continue
            if not _cell_inside_zone(next_cell):
                continue
            if not _cell_walkable(next_cell):
                continue
            came_from[next_cell] = current
            frontier.append(next_cell)

    if not came_from.has(target):
        return []

    var cell_path = []
    var cursor = target
    while cursor != start:
        cell_path.push_front(cursor)
        cursor = came_from[cursor]

    var move_path = []
    var previous = start
    for cell in cell_path:
        move_path.append(cell - previous)
        previous = cell
    return move_path

func _nearest_walkable(target):
    if _cell_inside_zone(target) and _cell_walkable(target):
        return target
    for radius in range(1, 9):
        for x in range(int(target.x) - radius, int(target.x) + radius + 1):
            for y in range(int(target.y) - radius, int(target.y) + radius + 1):
                if abs(x - int(target.x)) != radius and abs(y - int(target.y)) != radius:
                    continue
                var candidate = Vector2(x, y)
                if _cell_inside_zone(candidate) and _cell_walkable(candidate):
                    return candidate
    return null

func _cell_inside_zone(cell):
    var size = player.Zone.grid_size
    return cell.x >= 0 and cell.y >= 0 and cell.x < size.x and cell.y < size.y

func _cell_walkable(cell):
    if not _cell_inside_zone(cell):
        return false
    return player.Zone.grid[int(cell.x)][int(cell.y)] != 1

func _navigation_tilemap():
    if player.Zone.name == "Farm":
        return player.Zone.get_node("Objects1")
    if player.Zone.name == "Town":
        return player.Zone.get_node("DummyObject")
    if player.Zone.name == "House":
        return player.Zone.get_node("Objects")
    return null

func _toggle_inventory():
    action_panel.visible = false
    map_panel.visible = false
    inventory.visible = not inventory.visible

func _toggle_map():
    action_panel.visible = false
    inventory.visible = false
    map_panel.visible = not map_panel.visible
    if map_panel.visible:
        _refresh_map()

func _refresh_map():
    var zone_name = player.Zone.name
    var nav = _navigation_tilemap()
    if nav == null:
        return
    var cell = nav.world_to_map(player.position)
    var size = player.Zone.grid_size
    var target = _current_target_cell()

    map_title.text = "MAPA - " + _zone_label(zone_name)
    map_info.text = _target_description(cell, target)
    map_player_marker.rect_position = _map_position(cell, size) - Vector2(31, 15)
    map_target_marker.rect_position = _map_position(target, size) - Vector2(35, 15)

    var background = map_canvas.get_node("Background")
    if zone_name == "Town":
        background.color = Color(0.38, 0.31, 0.20, 1.0)
        map_target_marker.text = "LOJA"
        map_guide_button.text = "GUIAR PARA A LOJA"
    elif zone_name == "Farm":
        background.color = Color(0.18, 0.42, 0.22, 1.0)
        map_target_marker.text = "CIDADE"
        map_guide_button.text = "GUIAR PARA A CIDADE"
    else:
        background.color = Color(0.30, 0.24, 0.18, 1.0)
        map_target_marker.text = "SAIDA"
        map_guide_button.text = "GUIAR PARA A SAIDA"

func _map_position(cell, size):
    var safe_x = max(1.0, size.x - 1.0)
    var safe_y = max(1.0, size.y - 1.0)
    return Vector2(24 + (cell.x / safe_x) * 572, 20 + (cell.y / safe_y) * 210)

func _current_target_cell():
    if player.Zone.name == "Town":
        return SHOP_CELL
    if player.Zone.name == "Farm":
        return FARM_GATE_CELL
    return HOUSE_EXIT_CELL

func _guide_to_target():
    map_panel.visible = false
    if player.Zone.name == "Farm":
        var path = _find_grid_path(_navigation_tilemap().world_to_map(player.position), FARM_GATE_CELL)
        if path.empty() and _navigation_tilemap().world_to_map(player.position) != FARM_GATE_CELL:
            _show_toast("Nao encontrei caminho ate a cidade.")
            return
        path.append(Vector2.UP)
        player.set_mobile_path(path)
        _show_toast("Siga o caminho ate a cidade. A loja fica no centro.")
    else:
        _walk_to_cell(_current_target_cell())

func _update_navigation_status():
    if player == null or player.Zone == null:
        return
    var nav = _navigation_tilemap()
    if nav == null:
        return
    var current = nav.world_to_map(player.position)
    var target = _current_target_cell()
    location_label.text = _zone_label(player.Zone.name) + "  |  " + _target_description(current, target)

func _target_description(current, target):
    var delta = target - current
    var steps = int(abs(delta.x) + abs(delta.y))
    var direction_word = _direction_word(delta)
    if player.Zone.name == "Town":
        return "LOJA: " + direction_word + " - " + str(steps) + " passos"
    if player.Zone.name == "Farm":
        return "CIDADE / LOJA: " + direction_word + " - " + str(steps) + " passos"
    return "SAIDA: " + direction_word + " - " + str(steps) + " passos"

func _direction_word(delta):
    if abs(delta.x) > abs(delta.y):
        return "LESTE" if delta.x > 0 else "OESTE"
    return "SUL" if delta.y > 0 else "NORTE"

func _zone_label(zone_name):
    if zone_name == "Farm":
        return "FAZENDA"
    if zone_name == "Town":
        return "CIDADE"
    if zone_name == "House":
        return "CASA"
    return zone_name.to_upper()

func _update_shop_controls():
    var in_shop = shop_menu.visible
    shop_close_button.visible = in_shop
    shop_tab_button.visible = in_shop
    map_button.visible = not in_shop
    location_label.visible = not in_shop
    inventory_button.visible = not in_shop
    action_panel.visible = action_panel.visible and not in_shop
    map_panel.visible = map_panel.visible and not in_shop

    var can_open = false
    if not in_shop and player.Zone.name == "Town" and player.Zone.has_method("can_shop"):
        can_open = player.Zone.can_shop(player.position)
    shop_open_button.visible = can_open

func _open_shop():
    if shop_menu.has_method("open_shop_mobile"):
        shop_menu.open_shop_mobile()

func _close_shop():
    if shop_menu.has_method("_close_shop_menu"):
        shop_menu._close_shop_menu()

func _switch_shop_tab():
    if shop_menu.has_method("switch_tabs"):
        shop_menu.switch_tabs()

func _show_toast(message):
    toast_label.text = message
    toast_panel.visible = true
    toast_until = OS.get_ticks_msec() + 2600
'''


FARM_MOBILE_GD = r'''

# -----------------------------------------------------------------------------
# AgroFarm mobile-first: interacao direta por toque em uma celula de plantio.
# -----------------------------------------------------------------------------
func _mobile_inventory():
    if Inventory == null:
        Inventory = $Player.get_node("UI/Inventory")
    return Inventory

func _mobile_energy_bar():
    return $Player.get_node("UI/Energy Bar")

func mobile_world_to_cell(world_position):
    return Background2.world_to_map(world_position)

func mobile_is_valid_cell(cell):
    return cell.x >= 0 and cell.y >= 0 and cell.x < grid_size.x and cell.y < grid_size.y

func mobile_is_interactive_cell(cell):
    if not mobile_is_valid_cell(cell):
        return false
    return Background2.get_cellv(cell) == 15 or Dirt.get_cellv(cell) != -1 or Crops.get_cellv(cell) != -1 or Junk.get_cellv(cell) != -1

func mobile_get_cell_state(cell):
    if not mobile_is_valid_cell(cell):
        return {"valid": false}
    var farmable = Background2.get_cellv(cell) == 15
    var dirt_id = Dirt.get_cellv(cell)
    var crop_id = Crops.get_cellv(cell)
    var junk_id = Junk.get_cellv(cell)
    return {
        "valid": true,
        "farmable": farmable,
        "dirt": dirt_id,
        "crop": crop_id,
        "junk": junk_id,
        "has_junk": junk_id != -1,
        "can_till": farmable and dirt_id == -1 and crop_id == -1 and junk_id == -1,
        "can_plant": farmable and dirt_id >= 0 and crop_id == -1 and junk_id == -1,
        "can_water": dirt_id == 0,
        "can_harvest": crop_id == 5 or crop_id == 35 or crop_id == 17
    }

func mobile_till_cell(cell):
    var state = mobile_get_cell_state(cell)
    if not state.get("can_till", false):
        return {"ok": false, "message": "Esta area nao pode ser arada agora."}
    if not _mobile_energy_bar().has_energy():
        return {"ok": false, "message": "Energia insuficiente. Descanse para continuar."}
    Dirt.set_cellv(cell, 0)
    if not SoundManager.is_playing("hoe"):
        SoundManager.play_tool("hoe")
    use_energy()
    return {"ok": true, "message": "Terra arada. Agora escolha o que plantar."}

func mobile_plant_cell(cell, seed_item, crop_id):
    var state = mobile_get_cell_state(cell)
    if not state.get("can_plant", false):
        return {"ok": false, "message": "Primeiro are a terra e deixe a area livre."}
    var mobile_inventory = _mobile_inventory()
    if mobile_inventory.get_amount(seed_item) <= 0:
        return {"ok": false, "message": "Voce nao tem esta semente. Compre na loja da cidade."}
    if not _mobile_energy_bar().has_energy():
        return {"ok": false, "message": "Energia insuficiente. Descanse para continuar."}
    Crops.set_cellv(cell, crop_id)
    mobile_inventory.remove(seed_item, 1)
    if not SoundManager.is_playing("seeds"):
        SoundManager.play_tool("seeds")
    use_energy()
    return {"ok": true, "message": "Plantio realizado. Molhe a terra para a cultura crescer."}

func mobile_water_cell(cell):
    var state = mobile_get_cell_state(cell)
    if not state.get("can_water", false):
        if state.get("dirt", -1) == 2:
            return {"ok": false, "message": "Esta area ja esta molhada."}
        return {"ok": false, "message": "A terra precisa estar arada antes de molhar."}
    if not _mobile_energy_bar().has_energy():
        return {"ok": false, "message": "Energia insuficiente. Descanse para continuar."}
    Dirt.set_cellv(cell, 2)
    if not SoundManager.is_playing("watering"):
        SoundManager.play_tool("watering")
    use_energy()
    return {"ok": true, "message": "Terra molhada. A plantacao avancara no proximo dia."}

func mobile_harvest_cell(cell):
    var crop_id = Crops.get_cellv(cell)
    var item_name = ""
    var display_name = ""
    if crop_id == 5:
        item_name = "Turnip"
        display_name = "milho"
    elif crop_id == 35:
        item_name = "Strawberry"
        display_name = "mandioca"
    elif crop_id == 17:
        item_name = "Eggplant"
        display_name = "abacaxi"
    else:
        return {"ok": false, "message": "A plantacao ainda nao esta pronta para colher."}
    Crops.set_cellv(cell, -1)
    _mobile_inventory().add(item_name, 1)
    if not SoundManager.is_playing("harvest"):
        SoundManager.play_effect("harvest")
    return {"ok": true, "message": "Voce colheu " + display_name + " e guardou na mochila."}

func mobile_clear_cell(cell):
    var junk_id = Junk.get_cellv(cell)
    if junk_id == -1:
        return {"ok": false, "message": "Nao ha nada para limpar nesta area."}
    var mobile_inventory = _mobile_inventory()
    var required_tool = ""
    var sound_name = ""
    if junk_id == 4:
        required_tool = "Sickle"
        sound_name = "sickle"
    elif junk_id == 0 or junk_id == 1:
        required_tool = "Axe"
        sound_name = "axe"
    else:
        required_tool = "Hammer"
        sound_name = "hammer"
    if not mobile_inventory._contains(required_tool):
        return {"ok": false, "message": "Ferramenta necessaria: " + AgroFarmConfig.get_item_display_name(required_tool) + ". Compre na loja."}
    if not _mobile_energy_bar().has_energy():
        return {"ok": false, "message": "Energia insuficiente. Descanse para continuar."}
    Junk.set_cellv(cell, -1)
    if not SoundManager.is_playing(sound_name):
        SoundManager.play_tool(sound_name)
    use_energy()
    return {"ok": true, "message": "Area limpa e pronta para uso."}
'''


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Trecho nao encontrado para {label}")
    return text.replace(old, new, 1)


def patch_player(root: Path) -> None:
    path = root / "player" / "Player.gd"
    text = path.read_text(encoding="utf-8")

    text = re.sub(
        r"\n# AgroFarm mobile: toque/clique no cenário define um destino\.\n"
        r"var touch_destination = Vector2\(\)\n"
        r"var has_touch_destination = false\n"
        r"const TOUCH_STOP_DISTANCE = 18\.0\n"
        r"const TOUCH_AXIS_DEADZONE = 6\.0\n",
        "\n",
        text,
        count=1,
    )
    text = re.sub(
        r"\n# Recebe apenas eventos não consumidos pela interface, evitando caminhar ao tocar\n"
        r".*?(?=\n#called when the Player node enters the scene)",
        "\n",
        text,
        count=1,
        flags=re.S,
    )
    text = text.replace('\tset_process_unhandled_input(true)\n', '', 1)

    if "var mobile_path = []" not in text:
        text = replace_once(
            text,
            "var is_moving = false\n",
            "var is_moving = false\nvar mobile_path = [] # caminho calculado pelo controlador mobile\n",
            "estado do caminho mobile",
        )

    ready_old = '''func _ready():
\tget_node("UI/Dashboard/TimeManager").connect("sleep", self, "_force_sleep")
'''
    ready_new = '''func _ready():
\tget_node("UI/Dashboard/TimeManager").connect("sleep", self, "_force_sleep")
\tif not has_node("MobileController"):
\t\tvar mobile_controller = load("res://mobile/MobileController.gd").new()
\t\tmobile_controller.name = "MobileController"
\t\tadd_child(mobile_controller)

func set_mobile_path(path):
\tmobile_path = path.duplicate()

func cancel_mobile_path():
\tmobile_path.clear()
'''
    text = replace_once(text, ready_old, ready_new, "inicializacao mobile")

    enter_old = '''func _enter_tree():
\tZone = get_parent()
\tGame = Zone.get_parent()
\tset_physics_process(true)
'''
    enter_new = '''func _enter_tree():
\tZone = get_parent()
\tGame = Zone.get_parent()
\tmobile_path.clear()
\tset_physics_process(true)
'''
    text = replace_once(text, enter_old, enter_new, "troca de zona")

    direction_pattern = re.compile(
        r"\tdirection = Vector2\(\)\n.*?(?=\n\tif direction != Vector2\(\):)",
        re.S,
    )
    direction_new = '''\tdirection = Vector2()
\t
\tif not animationCommit:
\t\tvar keyboard_direction = Vector2()
\t\tif Input.is_action_pressed("ui_up"):
\t\t\tkeyboard_direction = Vector2.UP
\t\telif Input.is_action_pressed("ui_down"):
\t\t\tkeyboard_direction = Vector2.DOWN
\t\telif Input.is_action_pressed("ui_left") and not Input.is_action_pressed("shift_left_arrow"):
\t\t\tkeyboard_direction = Vector2.LEFT
\t\telif Input.is_action_pressed("ui_right") and not Input.is_action_pressed("shift_right_arrow"):
\t\t\tkeyboard_direction = Vector2.RIGHT
\t\tif keyboard_direction != Vector2():
\t\t\tcancel_mobile_path()
\t\t\tdirection = keyboard_direction
\t\telif not is_moving and mobile_path.size() > 0:
\t\t\tdirection = mobile_path.pop_front()
'''
    text, count = direction_pattern.subn(direction_new, text, count=1)
    if count != 1:
        raise RuntimeError("Bloco de direcao do Player nao encontrado")

    text = text.replace(
        '''\t\t\telif has_touch_destination:
\t\t\t\t_cancel_touch_destination()
''',
        "",
        1,
    )

    if "\t\telse:\n\t\t\tmobile_path.clear()\n\n\telif is_moving:" not in text:
        text = replace_once(
            text,
            "\n\telif is_moving:\n",
            "\n\t\telse:\n\t\t\tmobile_path.clear()\n\n\telif is_moving:\n",
            "tratamento de obstaculo",
        )

    movement_pattern = re.compile(
        r"\t\tspeed = MAX_SPEED\n"
        r"\t\tvelocity = speed \* target_direction \* delta\n\s*"
        r"\t\tvar distance_to_target = Vector2\(abs\(target_pos\.x - position\.x\), abs\(target_pos\.y - position\.y\)\)\n\s*"
        r"\t\tif abs\(velocity\.x\) > distance_to_target\.x:\n"
        r"\t\t\tvelocity\.x = distance_to_target\.x \* target_direction\.x\n"
        r"\t\t\tis_moving = false\n\s*"
        r"\t\tif abs\(velocity\.y\) > distance_to_target\.y:\n"
        r"\t\t\tvelocity\.y = distance_to_target\.y \* target_direction\.y\n"
        r"\t\t\tis_moving = false\n\s*"
        r"\t\tmove_and_collide\(velocity\)",
        re.S,
    )
    movement_new = '''\t\tspeed = MAX_SPEED
\t\tposition = position.move_toward(target_pos, speed * delta)
\t\tif position.distance_to(target_pos) <= 0.25:
\t\t\tposition = target_pos
\t\t\tis_moving = false'''
    text, count = movement_pattern.subn(movement_new, text, count=1)
    if count != 1:
        raise RuntimeError("Bloco de movimento continuo nao encontrado")

    path.write_text(text, encoding="utf-8")


def patch_farm(root: Path) -> None:
    path = root / "areas" / "Farm.gd"
    text = path.read_text(encoding="utf-8")
    if "func mobile_get_cell_state" not in text:
        text = text.rstrip() + FARM_MOBILE_GD + "\n"
    path.write_text(text, encoding="utf-8")


def patch_player_scene(root: Path) -> None:
    path = root / "player" / "Player.tscn"
    text = path.read_text(encoding="utf-8")

    text = replace_once(text, '''[node name="UI" type="Node2D" parent="." index="4"]

z_index = 3
_sections_unfolded = [ "Transform", "Visibility", "Z Index" ]
''', '''[node name="UI" type="CanvasLayer" parent="." index="4"]

layer = 10
''', "CanvasLayer da interface")

    text = replace_once(text, '''[node name="Hotbar" parent="UI" index="0" instance=ExtResource( 238 )]

margin_left = -120.0
margin_top = 102.0
margin_right = 1080.0
margin_bottom = 264.0
rect_scale = Vector2( 0.2, 0.2 )
''', '''[node name="Hotbar" parent="UI" index="0" instance=ExtResource( 238 )]

anchor_left = 0.5
anchor_top = 1.0
anchor_right = 0.5
anchor_bottom = 1.0
margin_left = -288.0
margin_top = -82.0
margin_right = 912.0
margin_bottom = 80.0
rect_scale = Vector2( 0.48, 0.48 )
''', "hotbar mobile")

    text = replace_once(text, '''[node name="Inventory" parent="UI" index="1" instance=ExtResource( 239 )]

visible = false
margin_left = -162.0
margin_top = -73.0
margin_right = 1038.0
margin_bottom = 471.0
rect_scale = Vector2( 0.27, 0.27 )
''', '''[node name="Inventory" parent="UI" index="1" instance=ExtResource( 239 )]

visible = false
anchor_left = 0.5
anchor_top = 0.5
anchor_right = 0.5
anchor_bottom = 0.5
margin_left = -270.0
margin_top = -122.0
margin_right = 930.0
margin_bottom = 422.0
rect_scale = Vector2( 0.45, 0.45 )
''', "inventario mobile")

    text = replace_once(text, '''[node name="Dashboard" parent="UI" index="2" instance=ExtResource( 240 )]

margin_left = 165.0
margin_top = -130.0
margin_right = 365.0
margin_bottom = -12.0
rect_scale = Vector2( 0.35, 0.35 )
''', '''[node name="Dashboard" parent="UI" index="2" instance=ExtResource( 240 )]

anchor_left = 1.0
anchor_top = 0.0
anchor_right = 1.0
anchor_bottom = 0.0
margin_left = -118.0
margin_top = 78.0
margin_right = 82.0
margin_bottom = 196.0
rect_scale = Vector2( 0.55, 0.55 )
''', "dashboard mobile")

    text = replace_once(text, '''[node name="Energy Bar" parent="UI" index="3" instance=ExtResource( 241 )]

margin_left = 211.0
margin_top = 36.0
margin_right = 411.0
margin_bottom = 820.0
rect_scale = Vector2( 0.12, 0.12 )
''', '''[node name="Energy Bar" parent="UI" index="3" instance=ExtResource( 241 )]

anchor_left = 1.0
anchor_top = 0.5
anchor_right = 1.0
anchor_bottom = 0.5
margin_left = -40.0
margin_top = -47.0
margin_right = 160.0
margin_bottom = 737.0
rect_scale = Vector2( 0.12, 0.12 )
''', "energia mobile")

    path.write_text(text, encoding="utf-8")


def patch_game_scene(root: Path) -> None:
    path = root / "Game.tscn"
    text = path.read_text(encoding="utf-8")

    text = replace_once(text, '''[node name="Menus" type="Node2D" parent="." index="5"]

pause_mode = 2
editor/display_folded = true
z_index = 7
_sections_unfolded = [ "Pause", "Transform", "Z Index" ]
''', '''[node name="Menus" type="CanvasLayer" parent="." index="5"]

pause_mode = 2
layer = 20
''', "CanvasLayer dos menus")

    text = replace_once(text, '''[node name="Shop Menu" parent="Menus" index="0" instance=ExtResource( 38 )]

visible = false
margin_left = 106.0
margin_top = -1759.0
margin_right = 3706.0
margin_bottom = 41.0
rect_scale = Vector2( 0.115, 0.115 )
''', '''[node name="Shop Menu" parent="Menus" index="0" instance=ExtResource( 38 )]

visible = false
anchor_left = 0.5
anchor_top = 0.5
anchor_right = 0.5
anchor_bottom = 0.5
margin_left = -306.0
margin_top = -153.0
margin_right = 3295.0
margin_bottom = 1648.0
rect_scale = Vector2( 0.17, 0.17 )
''', "loja mobile")

    text = replace_once(text, '''[node name="PauseMenu" parent="Menus" index="1" instance=ExtResource( 39 )]

pause_mode = 0
visible = false
margin_left = 352.0
margin_top = 137.0
margin_right = 832.0
margin_bottom = 407.0
rect_min_size = Vector2( 480, 270 )
_sections_unfolded = [ "Mouse", "Pause", "Rect", "Transform", "Z Index" ]
''', '''[node name="PauseMenu" parent="Menus" index="1" instance=ExtResource( 39 )]

pause_mode = 0
visible = false
anchor_left = 0.5
anchor_top = 0.5
anchor_right = 0.5
anchor_bottom = 0.5
margin_left = -240.0
margin_top = -135.0
margin_right = 240.0
margin_bottom = 135.0
rect_min_size = Vector2( 480, 270 )
_sections_unfolded = [ "Mouse", "Pause", "Rect", "Transform", "Z Index" ]
''', "pause mobile")

    path.write_text(text, encoding="utf-8")


def patch_shop_script(root: Path) -> None:
    path = root / "menus" / "shop" / "Shop Menu.gd"
    text = path.read_text(encoding="utf-8")

    input_pattern = re.compile(
        r"func _input\(event\):\n"
        r"\t#Show the shop menu.*?"
        r"(?=\t#close the shop)",
        re.S,
    )
    input_new = '''func _input(event):
\tif Input.is_action_pressed("E") and Town_Grid.world_to_map(Player.position) == Vector2(27, 43) and not Inventory.visible and not visible:
\t\t_open_shop_menu()
'''
    text, count = input_pattern.subn(input_new, text, count=1)
    if count != 1:
        raise RuntimeError("Bloco de abertura da loja nao encontrado")

    open_methods = '''func open_shop_mobile():
\tif Town_Grid.world_to_map(Player.position) == Vector2(27, 43) and not Inventory.visible and not visible:
\t\t_open_shop_menu()

func _open_shop_menu():
\tvisible = true
\tHotbar.visible = false
\tEnergyBar.visible = false
\tUI.layer = 30
\tBuy.visible = true
\tSell.visible = false
\tBuy.update_buy_menu()

'''
    text = replace_once(text, "func _close_shop_menu():\n", open_methods + "func _close_shop_menu():\n", "metodo mobile da loja")
    text = text.replace("\tUI.z_index = 3\n", "\tUI.layer = 10\n", 1)
    text = text.replace("\tUI.z_index = 5\n", "\tUI.layer = 30\n", 1)
    text = re.sub(r"\t#place the shop directly over the player\n\trect_position = .*?\n", "", text, count=1)
    path.write_text(text, encoding="utf-8")


def patch_export(root: Path) -> None:
    path = root / "export_presets.cfg"
    text = path.read_text(encoding="utf-8")
    text = re.sub(
        r'html/head_include=".*?"',
        'html/head_include="<meta name=\\"viewport\\" content=\\"width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover\\"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#111;touch-action:none;overscroll-behavior:none;-webkit-user-select:none;user-select:none}canvas{display:block;width:100%!important;height:100%!important;touch-action:none}</style>"',
        text,
        count=1,
    )
    path.write_text(text, encoding="utf-8")


def write_controller(root: Path) -> None:
    mobile_dir = root / "mobile"
    mobile_dir.mkdir(parents=True, exist_ok=True)
    (mobile_dir / "MobileController.gd").write_text(CONTROLLER_GD, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Aplica interface e controles mobile-first ao AgroFarm Classic")
    parser.add_argument("project", type=Path)
    args = parser.parse_args()
    root = args.project.resolve()
    if not (root / "project.godot").exists():
        raise SystemExit(f"Projeto Godot nao encontrado em {root}")

    write_controller(root)
    patch_player(root)
    patch_farm(root)
    patch_player_scene(root)
    patch_game_scene(root)
    patch_shop_script(root)
    patch_export(root)
    print(f"Patch mobile-first aplicado em: {root}")


if __name__ == "__main__":
    main()
