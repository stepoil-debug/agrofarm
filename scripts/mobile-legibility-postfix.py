#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path

HEAD_INCLUDE = r'''<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><style>html,body{margin:0!important;padding:0!important;width:100vw!important;height:100dvh!important;overflow:hidden!important;background:#000!important;touch-action:none!important;-webkit-user-select:none!important;user-select:none!important}body{position:fixed!important;inset:0!important}canvas{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;margin:0!important;padding:0!important;display:block!important;object-fit:fill!important;background:#000!important;image-rendering:auto!important}@media (orientation:portrait){body:before{content:"GIRE O CELULAR";position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;text-align:center;background:#07130b;color:white;font:900 52px/1.1 Arial,sans-serif;padding:40px;text-shadow:0 4px 0 #000}body:after{content:"Use deitado para as caixas ficarem grandes";position:fixed;left:18px;right:18px;top:62%;z-index:1000000;text-align:center;color:#d8f5dc;font:800 28px/1.25 Arial,sans-serif}canvas{visibility:hidden!important}}</style>'''


def replace_once(text: str, old: str, new: str) -> str:
    return text.replace(old, new, 1) if old in text else text


def force_regex(text: str, pattern: str, replacement: str) -> str:
    new_text, count = re.subn(pattern, replacement, text, count=1, flags=re.M)
    return new_text if count else text


def patch_controller(root: Path) -> None:
    path = root / "mobile" / "MobileController.gd"
    text = path.read_text(encoding="utf-8")

    text = replace_once(
        text,
        'location_label.text = _zone_label(player.Zone.name) + "\n" + _target_description(current, target)',
        'location_label.text = _zone_label(player.Zone.name) + "\\n" + _target_description(current, target)',
    )

    text = replace_once(
        text,
        '    _build_mobile_ui()\n    _update_navigation_status()\n',
        '    _force_mobile_scale()\n    _build_mobile_ui()\n    _apply_phone_modal_layout()\n    _update_navigation_status()\n',
    )
    text = replace_once(
        text,
        '        if map_panel.visible:\n            _refresh_map()\n',
        '        _apply_phone_modal_layout()\n        if map_panel.visible:\n            _refresh_map()\n',
    )

    text = force_regex(text, r'^\s*dynamic_font\.size\s*=.*$', '    dynamic_font.size = int(size_value * 3.0)')
    text = force_regex(text, r'^\s*dynamic_font\.outline_size\s*=.*$', '    dynamic_font.outline_size = 7')

    replacements = {
        '_add_action_button("IR ATE AQUI", "_walk_to_selected")': '_add_action_button("IR", "_walk_to_selected")',
        '_add_action_button("IR", "_walk_to_selected")': '_add_action_button("IR", "_walk_to_selected")',
        '_add_crop_button("PLANTAR MILHO", "TurnipSeeds", 0)': '_add_crop_button("MILHO", "TurnipSeeds", 0)',
        '_add_crop_button("PLANTAR MANDIOCA", "StrawberrySeeds", 30)': '_add_crop_button("MANDIOCA", "StrawberrySeeds", 30)',
        '_add_crop_button("PLANTAR ABACAXI", "EggplantSeeds", 12)': '_add_crop_button("ABACAXI", "EggplantSeeds", 12)',
        'action_title.text = "ACOES DA PLANTACAO"': 'action_title.text = "AÇÕES"',
        'action_title.text = "CANTEIRO %d - %d" % [int(selected_cell.x) + 1, int(selected_cell.y) + 1]': 'action_title.text = "AÇÕES"',
    }
    for old, new in replacements.items():
        text = text.replace(old, new)

    if 'func _phone_button_style(' not in text:
        text += r'''

func _force_mobile_scale():
    if OS.has_touchscreen_ui_hint():
        get_tree().set_screen_stretch(SceneTree.STRETCH_MODE_2D, SceneTree.STRETCH_ASPECT_EXPAND, Vector2(640, 360), 1)

func _phone_button_style(button):
    var normal = StyleBoxFlat.new()
    normal.bg_color = Color(0.05, 0.23, 0.09, 0.98)
    normal.border_color = Color(1, 1, 1, 0.95)
    normal.set_border_width_all(3)
    normal.set_corner_radius_all(12)
    var pressed = StyleBoxFlat.new()
    pressed.bg_color = Color(0.13, 0.43, 0.16, 1.0)
    pressed.border_color = Color(1, 1, 1, 1)
    pressed.set_border_width_all(4)
    pressed.set_corner_radius_all(12)
    var disabled = StyleBoxFlat.new()
    disabled.bg_color = Color(0.18, 0.18, 0.18, 0.95)
    disabled.border_color = Color(0.55, 0.55, 0.55, 0.95)
    disabled.set_border_width_all(2)
    disabled.set_corner_radius_all(12)
    button.add_stylebox_override("normal", normal)
    button.add_stylebox_override("hover", normal)
    button.add_stylebox_override("pressed", pressed)
    button.add_stylebox_override("disabled", disabled)
    button.add_font_override("font", _ui_font(15))
    button.add_color_override("font_color", Color(1, 1, 1, 1))
    button.add_color_override("font_color_hover", Color(1, 1, 1, 1))
    button.add_color_override("font_color_pressed", Color(1, 1, 1, 1))
    button.add_color_override("font_color_disabled", Color(0.82, 0.82, 0.82, 1))
    button.clip_text = false
    button.focus_mode = Control.FOCUS_NONE

func _phone_panel_style(panel):
    var style = StyleBoxFlat.new()
    style.bg_color = Color(0.0, 0.05, 0.02, 0.97)
    style.border_color = Color(1, 1, 1, 0.95)
    style.set_border_width_all(3)
    style.set_corner_radius_all(18)
    panel.add_stylebox_override("panel", style)

func _apply_phone_modal_layout():
    if not OS.has_touchscreen_ui_hint():
        return
    if action_panel == null:
        return

    var view = get_viewport().size
    var panel_w = max(590, view.x - 14)
    var panel_h = max(238, view.y * 0.66)
    if panel_h > view.y - 92:
        panel_h = view.y - 92

    action_panel.anchor_left = 0.5
    action_panel.anchor_right = 0.5
    action_panel.anchor_top = 1.0
    action_panel.anchor_bottom = 1.0
    action_panel.margin_left = -panel_w / 2
    action_panel.margin_right = panel_w / 2
    action_panel.margin_top = -panel_h - 76
    action_panel.margin_bottom = -76
    action_panel.rect_min_size = Vector2(panel_w, panel_h)
    _phone_panel_style(action_panel)

    if action_title != null:
        action_title.text = "AÇÕES"
        action_title.rect_min_size = Vector2(0, 48)
        action_title.align = Label.ALIGN_CENTER
        action_title.valign = Label.VALIGN_CENTER
        action_title.add_font_override("font", _ui_font(16))
        action_title.add_color_override("font_color", Color(1, 1, 1, 1))

    if action_grid != null:
        action_grid.columns = 2
        action_grid.add_constant_override("hseparation", 12)
        action_grid.add_constant_override("vseparation", 12)
        var button_w = (panel_w - 38) / 2
        var button_h = max(54, (panel_h - 80) / 4)
        for child in action_grid.get_children():
            if child is Button:
                child.rect_min_size = Vector2(button_w, button_h)
                _phone_button_style(child)

    if location_label != null:
        location_label.margin_left = -255
        location_label.margin_right = 255
        location_label.margin_top = 6
        location_label.margin_bottom = 68
        location_label.add_font_override("font", _ui_font(10))
        location_label.align = Label.ALIGN_CENTER
        location_label.valign = Label.VALIGN_CENTER

    if map_button != null:
        map_button.rect_min_size = Vector2(112, 50)
        map_button.margin_left = 8
        map_button.margin_top = 8
        map_button.margin_right = 120
        map_button.margin_bottom = 58
        _phone_button_style(map_button)

    if inventory_button != null:
        inventory_button.rect_min_size = Vector2(145, 50)
        inventory_button.margin_left = -153
        inventory_button.margin_top = 8
        inventory_button.margin_right = -8
        inventory_button.margin_bottom = 58
        _phone_button_style(inventory_button)

    if shop_open_button != null:
        shop_open_button.rect_min_size = Vector2(150, 50)
        _phone_button_style(shop_open_button)

    var hotbar = null
    if player != null and player.has_node("UI/Hotbar"):
        hotbar = player.get_node("UI/Hotbar")
    if hotbar != null:
        hotbar.rect_scale = Vector2(0.78, 0.78)
        hotbar.anchor_left = 0.5
        hotbar.anchor_right = 0.5
        hotbar.anchor_top = 1.0
        hotbar.anchor_bottom = 1.0
        hotbar.margin_top = -62
        hotbar.margin_bottom = 0
'''

    path.write_text(text, encoding="utf-8")


def patch_project(root: Path) -> None:
    path = root / "project.godot"
    text = path.read_text(encoding="utf-8")
    settings = {
        'display/window/size/width': '640',
        'display/window/size/height': '360',
        'display/window/size/test_width': '640',
        'display/window/size/test_height': '360',
        'display/window/stretch/mode': '"2d"',
        'display/window/stretch/aspect': '"expand"',
        'display/window/stretch/shrink': '1',
    }
    for key, value in settings.items():
        line = f'{key}={value}'
        pattern = re.compile(rf'^{re.escape(key)}=.*$', re.M)
        text = pattern.sub(line, text, count=1) if pattern.search(text) else text + '\n' + line + '\n'
    path.write_text(text, encoding="utf-8")


def patch_export(root: Path) -> None:
    path = root / "export_presets.cfg"
    text = path.read_text(encoding="utf-8")
    escaped = HEAD_INCLUDE.replace('\\', '\\\\').replace('"', '\\"')
    text, count = re.subn(r'html/head_include=".*?"', f'html/head_include="{escaped}"', text, count=1)
    if count != 1:
        raise RuntimeError("html/head_include nao encontrado")
    path.write_text(text, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Forca caixas legiveis no mobile")
    parser.add_argument("project", type=Path)
    args = parser.parse_args()
    root = args.project.resolve()
    patch_controller(root)
    patch_project(root)
    patch_export(root)
    print(f"Caixas mobile legiveis aplicadas em: {root}")


if __name__ == "__main__":
    main()
