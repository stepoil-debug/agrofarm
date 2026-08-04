#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path


MINI_MAP_HELPERS = r'''

func _build_mini_map():
    mini_map_panel = PanelContainer.new()
    mini_map_panel.name = "MiniMap"
    mini_map_panel.anchor_left = 1.0
    mini_map_panel.anchor_right = 1.0
    mini_map_panel.anchor_top = 0.0
    mini_map_panel.anchor_bottom = 0.0
    mini_map_panel.margin_left = -178
    mini_map_panel.margin_top = 76
    mini_map_panel.margin_right = -10
    mini_map_panel.margin_bottom = 176
    mini_map_panel.add_stylebox_override("panel", _mini_map_panel_style())
    mini_map_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
    mobile_root.add_child(mini_map_panel)

    mini_map_canvas = Control.new()
    mini_map_canvas.name = "Canvas"
    mini_map_canvas.anchor_right = 1.0
    mini_map_canvas.anchor_bottom = 1.0
    mini_map_canvas.rect_min_size = Vector2(168, 100)
    mini_map_canvas.mouse_filter = Control.MOUSE_FILTER_IGNORE
    mini_map_panel.add_child(mini_map_canvas)

    mini_map_background = ColorRect.new()
    mini_map_background.name = "Background"
    mini_map_background.anchor_right = 1.0
    mini_map_background.anchor_bottom = 1.0
    mini_map_background.color = Color(0.13, 0.34, 0.16, 0.95)
    mini_map_background.mouse_filter = Control.MOUSE_FILTER_IGNORE
    mini_map_canvas.add_child(mini_map_background)

    mini_map_target_marker = Label.new()
    mini_map_target_marker.name = "Target"
    mini_map_target_marker.text = "L"
    mini_map_target_marker.rect_size = Vector2(26, 26)
    mini_map_target_marker.align = Label.ALIGN_CENTER
    mini_map_target_marker.valign = Label.VALIGN_CENTER
    mini_map_target_marker.add_font_override("font", _ui_font(18))
    mini_map_target_marker.add_color_override("font_color", Color(1.0, 0.90, 0.18, 1.0))
    mini_map_canvas.add_child(mini_map_target_marker)

    mini_map_player_marker = Label.new()
    mini_map_player_marker.name = "Player"
    mini_map_player_marker.text = "●"
    mini_map_player_marker.rect_size = Vector2(26, 26)
    mini_map_player_marker.align = Label.ALIGN_CENTER
    mini_map_player_marker.valign = Label.VALIGN_CENTER
    mini_map_player_marker.add_font_override("font", _ui_font(18))
    mini_map_player_marker.add_color_override("font_color", Color(1, 1, 1, 1))
    mini_map_canvas.add_child(mini_map_player_marker)

func _mini_map_panel_style():
    var style = StyleBoxFlat.new()
    style.bg_color = Color(0.01, 0.05, 0.02, 0.88)
    style.border_color = Color(0.82, 1.0, 0.82, 0.88)
    style.set_border_width_all(2)
    style.set_corner_radius_all(10)
    style.content_margin_left = 5
    style.content_margin_right = 5
    style.content_margin_top = 5
    style.content_margin_bottom = 5
    return style

func _refresh_mini_map():
    if mini_map_panel == null or mini_map_canvas == null:
        return
    if player == null or player.Zone == null:
        return
    var nav = _navigation_tilemap()
    if nav == null:
        mini_map_panel.visible = false
        return

    var show_map = true
    if shop_menu != null and shop_menu.visible:
        show_map = false
    if map_panel != null and map_panel.visible:
        show_map = false
    if action_panel != null and action_panel.visible:
        show_map = false
    mini_map_panel.visible = show_map
    if not show_map:
        return

    var zone_name = player.Zone.name
    var current = nav.world_to_map(player.position)
    var target = _current_target_cell()
    var size = player.Zone.grid_size

    if zone_name == "Town":
        mini_map_background.color = Color(0.35, 0.28, 0.16, 0.95)
        mini_map_target_marker.text = "L"
    elif zone_name == "Farm":
        mini_map_background.color = Color(0.13, 0.34, 0.16, 0.95)
        mini_map_target_marker.text = "C"
    else:
        mini_map_background.color = Color(0.28, 0.21, 0.15, 0.95)
        mini_map_target_marker.text = "S"

    mini_map_player_marker.rect_position = _mini_map_position(current, size) - Vector2(13, 13)
    mini_map_target_marker.rect_position = _mini_map_position(target, size) - Vector2(13, 13)

func _mini_map_position(cell, size):
    var safe_x = max(1.0, size.x - 1.0)
    var safe_y = max(1.0, size.y - 1.0)
    var canvas_size = Vector2(158, 90)
    if mini_map_canvas != null:
        canvas_size = mini_map_canvas.rect_size - Vector2(10, 10)
    return Vector2(
        5 + (cell.x / safe_x) * max(1, canvas_size.x),
        5 + (cell.y / safe_y) * max(1, canvas_size.y)
    )
'''


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Trecho nao encontrado para {label}")
    return text.replace(old, new, 1)


def patch_controller(root: Path) -> None:
    path = root / "mobile" / "MobileController.gd"
    text = path.read_text(encoding="utf-8")

    if "mini_map_panel" not in text:
        text = replace_once(
            text,
            "var map_guide_button = null\nvar toast_panel = null",
            "var map_guide_button = null\nvar mini_map_panel = null\nvar mini_map_canvas = null\nvar mini_map_background = null\nvar mini_map_player_marker = null\nvar mini_map_target_marker = null\nvar toast_panel = null",
            "variaveis do mini mapa",
        )

    if "_build_mini_map()" not in text:
        text = replace_once(
            text,
            "    _build_action_panel()\n    _build_map_panel()\n    _build_toast()",
            "    _build_mini_map()\n    _build_action_panel()\n    _build_map_panel()\n    _build_toast()",
            "criacao do mini mapa",
        )

    if "_refresh_mini_map()" not in text:
        text = replace_once(
            text,
            "        _update_navigation_status()\n        _update_shop_controls()",
            "        _update_navigation_status()\n        _update_shop_controls()\n        _refresh_mini_map()",
            "atualizacao do mini mapa",
        )

    if "func _build_mini_map():" not in text:
        text = text.rstrip() + MINI_MAP_HELPERS + "\n"

    # Garante que abrir/fechar o mapa grande atualize a visibilidade do mini mapa.
    text = text.replace(
        "    if map_panel.visible:\n        _refresh_map()\n",
        "    if map_panel.visible:\n        _refresh_map()\n    _refresh_mini_map()\n",
        1,
    )

    # Garante que os controles da loja escondam o mini mapa quando necessário.
    if "mini_map_panel.visible = not in_shop" not in text:
        text = text.replace(
            "    shop_open_button.visible = can_open\n",
            "    shop_open_button.visible = can_open\n    if mini_map_panel != null:\n        mini_map_panel.visible = not in_shop and not map_panel.visible and not action_panel.visible\n",
            1,
        )

    path.write_text(text, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Adiciona mini mapa fixo na HUD mobile")
    parser.add_argument("project", type=Path)
    root = parser.parse_args().project.resolve()
    patch_controller(root)
    print(f"Mini mapa aplicado em: {root}")


if __name__ == "__main__":
    main()
