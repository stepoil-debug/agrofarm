#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Trecho nao encontrado para {label}")
    return text.replace(old, new, 1)


def patch_controller(root: Path) -> None:
    path = root / "mobile" / "MobileController.gd"
    text = path.read_text(encoding="utf-8")

    constants = '''const SHOP_CELL = Vector2(27, 43)
const FARM_GATE_CELL = Vector2(19, 0)
const HOUSE_EXIT_CELL = Vector2(4, 8)
'''
    font_support = '''const SHOP_CELL = Vector2(27, 43)
const FARM_GATE_CELL = Vector2(19, 0)
const HOUSE_EXIT_CELL = Vector2(4, 8)
const UI_FONT_PATH = "res://ui/dashboard/OpenSans-Bold.ttf"

var ui_font_cache = {}

func _ui_font(size_value):
    if ui_font_cache.has(size_value):
        return ui_font_cache[size_value]
    var dynamic_font = DynamicFont.new()
    dynamic_font.font_data = load(UI_FONT_PATH)
    dynamic_font.size = size_value
    dynamic_font.outline_size = 2
    dynamic_font.outline_color = Color(0.0, 0.0, 0.0, 0.92)
    dynamic_font.use_filter = true
    ui_font_cache[size_value] = dynamic_font
    return dynamic_font

func _style_label(label, size_value, color_value = Color(1, 1, 1)):
    label.add_font_override("font", _ui_font(size_value))
    label.add_color_override("font_color", color_value)
    label.add_color_override("font_color_shadow", Color(0, 0, 0, 0.95))
    label.add_constant_override("shadow_offset_x", 2)
    label.add_constant_override("shadow_offset_y", 2)
'''
    text = replace_once(text, constants, font_support, "fonte mobile")

    text = text.replace('map_button = _make_button("MAPA", Vector2(126, 52))', 'map_button = _make_button("MAPA", Vector2(160, 64))', 1)
    text = text.replace('map_button.margin_left = 16\n    map_button.margin_top = 14\n    map_button.margin_right = 142\n    map_button.margin_bottom = 66', 'map_button.margin_left = 14\n    map_button.margin_top = 12\n    map_button.margin_right = 174\n    map_button.margin_bottom = 76', 1)

    text = text.replace('location_label.margin_left = -270\n    location_label.margin_top = 16\n    location_label.margin_right = 270\n    location_label.margin_bottom = 60', 'location_label.margin_left = -310\n    location_label.margin_top = 8\n    location_label.margin_right = 310\n    location_label.margin_bottom = 82', 1)
    text = text.replace('location_label.text = "FAZENDA"\n    location_label.add_color_override("font_color", Color(1, 1, 1))', 'location_label.text = "FAZENDA"\n    location_label.autowrap = true\n    _style_label(location_label, 27)', 1)

    text = text.replace('inventory_button = _make_button("MOCHILA", Vector2(142, 52))', 'inventory_button = _make_button("MOCHILA", Vector2(180, 64))', 1)
    text = text.replace('inventory_button.margin_left = -158\n    inventory_button.margin_top = 14\n    inventory_button.margin_right = -16\n    inventory_button.margin_bottom = 66', 'inventory_button.margin_left = -194\n    inventory_button.margin_top = 12\n    inventory_button.margin_right = -14\n    inventory_button.margin_bottom = 76', 1)

    text = text.replace('shop_open_button = _make_button("ABRIR LOJA", Vector2(166, 52))', 'shop_open_button = _make_button("ABRIR LOJA", Vector2(210, 64))', 1)
    text = text.replace('shop_open_button.margin_left = -340\n    shop_open_button.margin_top = 14\n    shop_open_button.margin_right = -174\n    shop_open_button.margin_bottom = 66', 'shop_open_button.margin_left = -420\n    shop_open_button.margin_top = 12\n    shop_open_button.margin_right = -210\n    shop_open_button.margin_bottom = 76', 1)

    text = text.replace('shop_close_button = _make_button("FECHAR LOJA", Vector2(168, 54))', 'shop_close_button = _make_button("FECHAR LOJA", Vector2(210, 66))', 1)
    text = text.replace('shop_close_button.margin_left = -184\n    shop_close_button.margin_top = 16\n    shop_close_button.margin_right = -16\n    shop_close_button.margin_bottom = 70', 'shop_close_button.margin_left = -224\n    shop_close_button.margin_top = 12\n    shop_close_button.margin_right = -14\n    shop_close_button.margin_bottom = 78', 1)

    text = text.replace('shop_tab_button = _make_button("COMPRAR / VENDER", Vector2(206, 54))', 'shop_tab_button = _make_button("COMPRAR / VENDER", Vector2(280, 66))', 1)
    text = text.replace('shop_tab_button.margin_left = 16\n    shop_tab_button.margin_top = 16\n    shop_tab_button.margin_right = 222\n    shop_tab_button.margin_bottom = 70', 'shop_tab_button.margin_left = 14\n    shop_tab_button.margin_top = 12\n    shop_tab_button.margin_right = 294\n    shop_tab_button.margin_bottom = 78', 1)

    text = text.replace('action_panel.margin_left = -330\n    action_panel.margin_top = -286\n    action_panel.margin_right = 330\n    action_panel.margin_bottom = -86', 'action_panel.margin_left = -455\n    action_panel.margin_top = -480\n    action_panel.margin_right = 455\n    action_panel.margin_bottom = -78', 1)
    text = text.replace('content.add_constant_override("separation", 8)', 'content.add_constant_override("separation", 12)', 1)
    text = text.replace('action_title.text = "O que deseja fazer nesta area?"', 'action_title.text = "ACOES DA PLANTACAO"', 1)
    text = text.replace('action_title.rect_min_size = Vector2(0, 34)\n    action_title.add_color_override("font_color", Color(1, 1, 1))', 'action_title.rect_min_size = Vector2(0, 52)\n    _style_label(action_title, 34)', 1)
    text = text.replace('action_grid.columns = 3', 'action_grid.columns = 2', 1)
    text = text.replace('action_grid.add_constant_override("hseparation", 8)\n    action_grid.add_constant_override("vseparation", 8)', 'action_grid.add_constant_override("hseparation", 12)\n    action_grid.add_constant_override("vseparation", 12)', 1)

    text = text.replace('map_panel.margin_left = -340\n    map_panel.margin_top = -220\n    map_panel.margin_right = 340\n    map_panel.margin_bottom = 220', 'map_panel.margin_left = -475\n    map_panel.margin_top = -300\n    map_panel.margin_right = 475\n    map_panel.margin_bottom = 300', 1)
    text = text.replace('content.add_constant_override("separation", 8)', 'content.add_constant_override("separation", 12)', 1)
    text = text.replace('map_title.rect_min_size = Vector2(0, 36)\n    map_title.add_color_override("font_color", Color(1, 1, 1))', 'map_title.rect_min_size = Vector2(0, 50)\n    _style_label(map_title, 36)', 1)
    text = text.replace('map_info.rect_min_size = Vector2(0, 42)\n    map_info.add_color_override("font_color", Color(0.9, 0.95, 0.9))', 'map_info.rect_min_size = Vector2(0, 56)\n    map_info.autowrap = true\n    _style_label(map_info, 27, Color(0.95, 1.0, 0.95))', 1)
    text = text.replace('map_canvas.rect_min_size = Vector2(620, 250)', 'map_canvas.rect_min_size = Vector2(870, 330)', 1)
    text = text.replace('map_player_marker.rect_size = Vector2(62, 30)', 'map_player_marker.rect_size = Vector2(96, 44)', 1)
    text = text.replace('map_player_marker.add_color_override("font_color", Color(1, 1, 1))', '_style_label(map_player_marker, 25)', 1)
    text = text.replace('map_target_marker.rect_size = Vector2(70, 30)', 'map_target_marker.rect_size = Vector2(110, 44)', 1)
    text = text.replace('map_target_marker.add_color_override("font_color", Color(1.0, 0.94, 0.35))', '_style_label(map_target_marker, 25, Color(1.0, 0.94, 0.35))', 1)
    text = text.replace('map_guide_button = _make_button("GUIAR PARA A LOJA", Vector2(220, 54))', 'map_guide_button = _make_button("GUIAR PARA A LOJA", Vector2(310, 66))', 1)
    text = text.replace('var close = _make_button("FECHAR", Vector2(150, 54))', 'var close = _make_button("FECHAR", Vector2(190, 66))', 1)

    text = text.replace('toast_panel.margin_left = -270\n    toast_panel.margin_top = -360\n    toast_panel.margin_right = 270\n    toast_panel.margin_bottom = -310', 'toast_panel.margin_left = -455\n    toast_panel.margin_top = -390\n    toast_panel.margin_right = 455\n    toast_panel.margin_bottom = -300', 1)
    text = text.replace('toast_label.align = Label.ALIGN_CENTER\n    toast_label.valign = Label.VALIGN_CENTER\n    toast_label.add_color_override("font_color", Color(1, 1, 1))', 'toast_label.align = Label.ALIGN_CENTER\n    toast_label.valign = Label.VALIGN_CENTER\n    toast_label.autowrap = true\n    _style_label(toast_label, 28)', 1)

    text = text.replace('button.focus_mode = Control.FOCUS_NONE\n    button.add_color_override("font_color", Color(1, 1, 1))', 'button.focus_mode = Control.FOCUS_NONE\n    button.clip_text = false\n    button.add_font_override("font", _ui_font(30))\n    button.add_color_override("font_color", Color(1, 1, 1))', 1)
    text = text.replace('button.add_color_override("font_color_hover", Color(1, 1, 1))', 'button.add_color_override("font_color_hover", Color(1, 1, 1))\n    button.add_color_override("font_color_pressed", Color(1, 1, 1))\n    button.add_color_override("font_color_disabled", Color(0.72, 0.76, 0.72))', 1)

    text = text.replace('action_title.text = "Area fora da fazenda"', 'action_title.text = "FORA DA AREA DE PLANTIO"', 1)
    text = text.replace('action_title.text = "Area de plantio %d, %d" % [int(selected_cell.x) + 1, int(selected_cell.y) + 1]', 'action_title.text = "CANTEIRO %d - %d" % [int(selected_cell.x) + 1, int(selected_cell.y) + 1]', 1)
    text = text.replace('_add_action_button("ANDAR ATE AQUI", "_walk_to_selected")', '_add_action_button("IR ATE AQUI", "_walk_to_selected")', 1)
    text = text.replace('var button = _make_button(label_text, Vector2(196, 54))', 'var button = _make_button(label_text, Vector2(432, 68))', 1)
    text = text.replace('var button = _make_button(label_text + " (" + str(amount) + ")", Vector2(196, 54))', 'var button = _make_button(label_text + "  x" + str(amount), Vector2(432, 68))', 1)

    text = text.replace('map_player_marker.rect_position = _map_position(cell, size) - Vector2(31, 15)', 'map_player_marker.rect_position = _map_position(cell, size) - Vector2(48, 22)', 1)
    text = text.replace('map_target_marker.rect_position = _map_position(target, size) - Vector2(35, 15)', 'map_target_marker.rect_position = _map_position(target, size) - Vector2(55, 22)', 1)
    text = text.replace('return Vector2(24 + (cell.x / safe_x) * 572, 20 + (cell.y / safe_y) * 210)', 'return Vector2(34 + (cell.x / safe_x) * 802, 30 + (cell.y / safe_y) * 270)', 1)

    text = text.replace('location_label.text = _zone_label(player.Zone.name) + "  |  " + _target_description(current, target)', 'location_label.text = _zone_label(player.Zone.name) + "\n" + _target_description(current, target)', 1)
    text = text.replace('return "LOJA: " + direction_word + " - " + str(steps) + " passos"', 'return "LOJA  " + direction_word + "  " + str(steps) + " PASSOS"', 1)
    text = text.replace('return "CIDADE / LOJA: " + direction_word + " - " + str(steps) + " passos"', 'return "LOJA  " + direction_word + "  " + str(steps) + " PASSOS"', 1)
    text = text.replace('return "SAIDA: " + direction_word + " - " + str(steps) + " passos"', 'return "SAIDA  " + direction_word + "  " + str(steps) + " PASSOS"', 1)

    path.write_text(text, encoding="utf-8")


def patch_player_scene(root: Path) -> None:
    path = root / "player" / "Player.tscn"
    text = path.read_text(encoding="utf-8")
    text = text.replace('margin_left = -288.0\nmargin_top = -82.0\nmargin_right = 912.0\nmargin_bottom = 80.0\nrect_scale = Vector2( 0.48, 0.48 )', 'margin_left = -360.0\nmargin_top = -110.0\nmargin_right = 840.0\nmargin_bottom = 52.0\nrect_scale = Vector2( 0.6, 0.6 )', 1)
    text = text.replace('margin_left = -270.0\nmargin_top = -122.0\nmargin_right = 930.0\nmargin_bottom = 422.0\nrect_scale = Vector2( 0.45, 0.45 )', 'margin_left = -348.0\nmargin_top = -158.0\nmargin_right = 852.0\nmargin_bottom = 386.0\nrect_scale = Vector2( 0.58, 0.58 )', 1)
    text = text.replace('margin_left = -118.0\nmargin_top = 78.0\nmargin_right = 82.0\nmargin_bottom = 196.0\nrect_scale = Vector2( 0.55, 0.55 )', 'margin_left = -170.0\nmargin_top = 84.0\nmargin_right = 30.0\nmargin_bottom = 202.0\nrect_scale = Vector2( 0.75, 0.75 )', 1)
    path.write_text(text, encoding="utf-8")


def patch_game_scene(root: Path) -> None:
    path = root / "Game.tscn"
    text = path.read_text(encoding="utf-8")
    text = text.replace('margin_left = -306.0\nmargin_top = -153.0\nmargin_right = 3295.0\nmargin_bottom = 1648.0\nrect_scale = Vector2( 0.17, 0.17 )', 'margin_left = -450.0\nmargin_top = -225.0\nmargin_right = 3150.0\nmargin_bottom = 1575.0\nrect_scale = Vector2( 0.25, 0.25 )', 1)
    path.write_text(text, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Melhora a legibilidade mobile do AgroFarm Classic")
    parser.add_argument("project", type=Path)
    args = parser.parse_args()
    root = args.project.resolve()
    if not (root / "project.godot").exists():
        raise SystemExit(f"Projeto Godot nao encontrado em {root}")
    patch_controller(root)
    patch_player_scene(root)
    patch_game_scene(root)
    print(f"Legibilidade mobile aplicada em: {root}")


if __name__ == "__main__":
    main()
