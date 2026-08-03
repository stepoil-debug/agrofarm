#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path

HEAD_INCLUDE = r'''<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><style>html,body{margin:0!important;padding:0!important;width:100vw!important;height:100dvh!important;overflow:hidden!important;background:#000!important;touch-action:none!important}body{position:fixed!important;inset:0!important}canvas{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;margin:0!important;padding:0!important;display:block!important;object-fit:fill!important;background:#000!important}@media (orientation:portrait){body:before{content:"GIRE O CELULAR";position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;text-align:center;background:#07130b;color:white;font:900 46px/1.15 Arial,sans-serif;padding:40px}body:after{content:"Use o jogo com o celular deitado";position:fixed;left:20px;right:20px;top:62%;z-index:1000000;text-align:center;color:#d8f5dc;font:800 26px/1.25 Arial,sans-serif}canvas{visibility:hidden!important}}</style>'''


def replace_once(text: str, old: str, new: str) -> str:
    if old not in text:
        return text
    return text.replace(old, new, 1)


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
        '    _force_mobile_scale()\n    _build_mobile_ui()\n    _apply_readable_layout()\n    _update_navigation_status()\n',
    )
    text = replace_once(
        text,
        '        if map_panel.visible:\n            _refresh_map()\n',
        '        _apply_readable_layout()\n        if map_panel.visible:\n            _refresh_map()\n',
    )

    text = text.replace('dynamic_font.size = size_value', 'dynamic_font.size = int(size_value * 2.2)')
    text = text.replace('dynamic_font.outline_size = 2', 'dynamic_font.outline_size = 5')
    text = text.replace('button.add_font_override("font", _ui_font(30))', 'button.add_font_override("font", _ui_font(36))')
    text = text.replace('var button = _make_button(label_text, Vector2(432, 68))', 'var button = _make_button(label_text, Vector2(520, 104))')
    text = text.replace('var button = _make_button(label_text + "  x" + str(amount), Vector2(432, 68))', 'var button = _make_button(label_text + "  x" + str(amount), Vector2(520, 104))')
    text = text.replace('_add_action_button("IR ATE AQUI", "_walk_to_selected")', '_add_action_button("IR", "_walk_to_selected")')
    text = text.replace('_add_crop_button("PLANTAR MILHO", "TurnipSeeds", 0)', '_add_crop_button("MILHO", "TurnipSeeds", 0)')
    text = text.replace('_add_crop_button("PLANTAR MANDIOCA", "StrawberrySeeds", 30)', '_add_crop_button("MANDIOCA", "StrawberrySeeds", 30)')
    text = text.replace('_add_crop_button("PLANTAR ABACAXI", "EggplantSeeds", 12)', '_add_crop_button("ABACAXI", "EggplantSeeds", 12)')

    if 'func _force_mobile_scale():' not in text:
        text += r'''

func _force_mobile_scale():
    if OS.has_touchscreen_ui_hint():
        get_tree().set_screen_stretch(SceneTree.STRETCH_MODE_2D, SceneTree.STRETCH_ASPECT_EXPAND, Vector2(960, 540), 1)

func _apply_readable_layout():
    if action_panel == null:
        return
    var view = get_viewport().size
    var panel_w = min(max(760, view.x - 28), 940)
    var panel_h = min(max(310, view.y * 0.52), 430)
    action_panel.anchor_left = 0.5
    action_panel.anchor_right = 0.5
    action_panel.anchor_top = 1.0
    action_panel.anchor_bottom = 1.0
    action_panel.margin_left = -panel_w / 2
    action_panel.margin_right = panel_w / 2
    action_panel.margin_top = -panel_h - 112
    action_panel.margin_bottom = -112
    action_panel.rect_min_size = Vector2(panel_w, panel_h)
    if action_title != null:
        action_title.rect_min_size = Vector2(0, 84)
        action_title.add_font_override("font", _ui_font(34))
    if action_grid != null:
        action_grid.columns = 2
        action_grid.add_constant_override("hseparation", 18)
        action_grid.add_constant_override("vseparation", 18)
        var button_w = (panel_w - 54) / 2
        for child in action_grid.get_children():
            if child is Button:
                child.rect_min_size = Vector2(button_w, 104)
                child.add_font_override("font", _ui_font(34))
    if location_label != null:
        location_label.margin_left = -360
        location_label.margin_right = 360
        location_label.margin_top = 10
        location_label.margin_bottom = 110
        location_label.add_font_override("font", _ui_font(26))
    if map_button != null:
        map_button.rect_min_size = Vector2(210, 88)
    if inventory_button != null:
        inventory_button.rect_min_size = Vector2(250, 88)
    var hotbar = player.get_node("UI/Hotbar") if player.has_node("UI/Hotbar") else null
    if hotbar != null:
        hotbar.rect_scale = Vector2(0.72, 0.72)
        hotbar.margin_top = -118
'''

    path.write_text(text, encoding="utf-8")


def patch_project(root: Path) -> None:
    path = root / "project.godot"
    text = path.read_text(encoding="utf-8")
    settings = {
        'display/window/size/width': '960',
        'display/window/size/height': '540',
        'display/window/size/test_width': '960',
        'display/window/size/test_height': '540',
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
    parser = argparse.ArgumentParser(description="Forca escala legivel mobile")
    parser.add_argument("project", type=Path)
    args = parser.parse_args()
    root = args.project.resolve()
    patch_controller(root)
    patch_project(root)
    patch_export(root)
    print(f"Escala mobile legivel aplicada em: {root}")


if __name__ == "__main__":
    main()
