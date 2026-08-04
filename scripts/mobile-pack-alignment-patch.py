#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


MENU_HELPERS = r'''

func _build_agro_mobile_menu():
    if mobile_root == null:
        return
    if mobile_root.has_node("AgroMobileMenu"):
        mobile_menu_panel = mobile_root.get_node("AgroMobileMenu")
        return

    mobile_menu_panel = PanelContainer.new()
    mobile_menu_panel.name = "AgroMobileMenu"
    mobile_menu_panel.anchor_left = 0.5
    mobile_menu_panel.anchor_right = 0.5
    mobile_menu_panel.anchor_top = 0.5
    mobile_menu_panel.anchor_bottom = 0.5
    mobile_menu_panel.margin_left = -390
    mobile_menu_panel.margin_top = -230
    mobile_menu_panel.margin_right = 390
    mobile_menu_panel.margin_bottom = 230
    mobile_menu_panel.visible = false
    if has_method("_phone_panel_style"):
        _phone_panel_style(mobile_menu_panel)
    else:
        mobile_menu_panel.add_stylebox_override("panel", _panel_style(Color(0.0, 0.06, 0.02, 0.96)))
    mobile_root.add_child(mobile_menu_panel)

    var box = VBoxContainer.new()
    box.name = "Content"
    box.add_constant_override("separation", 12)
    mobile_menu_panel.add_child(box)

    mobile_menu_title = Label.new()
    mobile_menu_title.text = "AGRO FARM"
    mobile_menu_title.align = Label.ALIGN_CENTER
    mobile_menu_title.valign = Label.VALIGN_CENTER
    mobile_menu_title.rect_min_size = Vector2(0, 48)
    if has_method("_ui_font"):
        mobile_menu_title.add_font_override("font", _ui_font(24))
    mobile_menu_title.add_color_override("font_color", Color(1, 1, 1, 1))
    box.add_child(mobile_menu_title)

    mobile_menu_grid = GridContainer.new()
    mobile_menu_grid.columns = 2
    mobile_menu_grid.add_constant_override("hseparation", 12)
    mobile_menu_grid.add_constant_override("vseparation", 12)
    box.add_child(mobile_menu_grid)

func _toggle_agro_mobile_menu():
    if mobile_menu_panel == null:
        _build_agro_mobile_menu()
    action_panel.visible = false
    map_panel.visible = false
    inventory.visible = false
    _fill_agro_mobile_main_menu()
    mobile_menu_panel.visible = not mobile_menu_panel.visible
    _refresh_mini_map()

func _close_agro_mobile_menu():
    if mobile_menu_panel != null:
        mobile_menu_panel.visible = false
    _refresh_mini_map()

func _clear_mobile_menu():
    if mobile_menu_grid == null:
        return
    for child in mobile_menu_grid.get_children():
        mobile_menu_grid.remove_child(child)
        child.queue_free()

func _add_mobile_menu_button(text_value, method_name, args=[]):
    var button = _make_button(text_value, Vector2(360, 62))
    if has_method("_phone_button_style"):
        _phone_button_style(button)
    button.connect("pressed", self, method_name, args)
    mobile_menu_grid.add_child(button)
    return button

func _fill_agro_mobile_main_menu():
    if mobile_menu_panel == null:
        _build_agro_mobile_menu()
    _clear_mobile_menu()
    mobile_menu_title.text = "MENU"
    _add_mobile_menu_button("🌾 LOTES", "_show_mobile_fields")
    _add_mobile_menu_button("🏗️ CONSTRUÇÕES", "_show_mobile_buildings")
    _add_mobile_menu_button("🐄 ANIMAIS", "_show_mobile_animals")
    _add_mobile_menu_button("🗺️ MAPA", "_open_big_map_from_mobile_menu")
    _add_mobile_menu_button("💾 SALVAR", "_mobile_save_game")
    _add_mobile_menu_button("FECHAR", "_close_agro_mobile_menu")

func _open_big_map_from_mobile_menu():
    if mobile_menu_panel != null:
        mobile_menu_panel.visible = false
    map_panel.visible = true
    _refresh_map()
    _refresh_mini_map()

func _mobile_save_game():
    var gm = get_node_or_null("/root/GameManager")
    if gm and gm.has_method("save_game"):
        gm.save_game()
    _show_toast("Jogo salvo.")
    _close_agro_mobile_menu()

func _show_mobile_fields():
    _clear_mobile_menu()
    var total = 36
    if farm != null and farm.has_method("mobile_total_fields"):
        total = int(farm.mobile_total_fields())
    mobile_menu_title.text = "LOTES " + str(FarmProgressionSystem.unlocked_fields) + "/" + str(total)
    var cost = FarmProgressionSystem.get_next_field_cost()
    _add_mobile_menu_button("CAMPO +1  $" + str(cost), "_buy_mobile_field")
    _add_mobile_menu_button("VOLTAR", "_fill_agro_mobile_main_menu")

func _buy_mobile_field():
    var total = 36
    if farm != null and farm.has_method("mobile_total_fields"):
        total = int(farm.mobile_total_fields())
    var result = FarmProgressionSystem.buy_next_field(total)
    if farm != null and farm.has_method("mobile_apply_field_visibility"):
        farm.mobile_apply_field_visibility()
    _show_toast(result.get("message", "Campo atualizado."))
    _show_mobile_fields()

func _show_mobile_buildings():
    _clear_mobile_menu()
    mobile_menu_title.text = "CONSTRUÇÕES"
    _add_structure_button("coop", "GALINHEIRO")
    _add_structure_button("stable", "ESTÁBULO")
    _add_structure_button("pigsty", "CHIQUEIRO")
    _add_structure_button("silo", "SILO")
    _add_structure_button("barn", "GALPÃO")
    _add_mobile_menu_button("VOLTAR", "_fill_agro_mobile_main_menu")

func _add_structure_button(structure_id, fallback_name):
    var name_value = fallback_name
    var cost_value = 0
    if FarmProgressionSystem.has_method("get_structure_name"):
        name_value = FarmProgressionSystem.get_structure_name(structure_id).to_upper()
    if FarmProgressionSystem.has_method("get_structure_cost"):
        cost_value = FarmProgressionSystem.get_structure_cost(structure_id)
    var label = name_value
    if FarmProgressionSystem.has_structure(structure_id):
        label += " ✅"
    else:
        label += "  $" + str(cost_value)
    _add_mobile_menu_button(label, "_buy_mobile_structure", [structure_id])

func _buy_mobile_structure(structure_id):
    var result = FarmProgressionSystem.buy_structure(structure_id)
    _show_toast(result.get("message", "Construção atualizada."))
    _show_mobile_buildings()

func _show_mobile_animals():
    _clear_mobile_menu()
    mobile_menu_title.text = "ANIMAIS"
    _add_animal_button("chicken", "GALINHA", "coop")
    _add_animal_button("cow", "VACA", "stable")
    _add_animal_button("sheep", "OVELHA", "stable")
    _add_mobile_menu_button("VOLTAR", "_fill_agro_mobile_main_menu")

func _add_animal_button(animal_id, label_name, required_structure):
    var label = label_name
    if not FarmProgressionSystem.has_structure(required_structure):
        label += " 🔒"
    _add_mobile_menu_button(label, "_buy_mobile_animal", [animal_id, required_structure])

func _buy_mobile_animal(animal_id, required_structure):
    if not FarmProgressionSystem.has_structure(required_structure):
        _show_toast("Compre a construção primeiro.")
        return
    if Engine.has_singleton("AnimalSystem") and AnimalSystem.has_method("buy_animal"):
        if AnimalSystem.buy_animal(animal_id):
            _show_toast("Animal comprado.")
        else:
            _show_toast("Saldo insuficiente para comprar animal.")
    else:
        _show_toast("Sistema de animais indisponível.")
    _show_mobile_animals()
'''


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Trecho nao encontrado: {label}")
    return text.replace(old, new, 1)


def patch_controller(root: Path) -> None:
    path = root / "mobile" / "MobileController.gd"
    text = path.read_text(encoding="utf-8")

    if "var mobile_menu_panel" not in text:
        text = replace_once(
            text,
            "var toast_panel = null\nvar toast_label = null",
            "var mobile_menu_panel = null\nvar mobile_menu_grid = null\nvar mobile_menu_title = null\nvar toast_panel = null\nvar toast_label = null",
            "variaveis menu mobile",
        )

    if "_build_agro_mobile_menu()" not in text:
        text = replace_once(
            text,
            "    _build_toast()",
            "    _build_toast()\n    _build_agro_mobile_menu()",
            "build menu mobile",
        )

    text = text.replace(
        'inventory_button.connect("pressed", self, "_toggle_inventory")',
        'inventory_button.connect("pressed", self, "_toggle_agro_mobile_menu")',
    )
    text = text.replace(
        'inventory_button.connect("pressed", self, "_open_uploaded_mobile_menu")',
        'inventory_button.connect("pressed", self, "_toggle_agro_mobile_menu")',
    )

    if "func _build_agro_mobile_menu():" not in text:
        text = text.rstrip() + MENU_HELPERS + "\n"

    # Mini mapa some quando o menu mobile estiver aberto.
    text = text.replace(
        'if action_panel != null and action_panel.visible:\n        show_map = false',
        'if action_panel != null and action_panel.visible:\n        show_map = false\n    if mobile_menu_panel != null and mobile_menu_panel.visible:\n        show_map = false',
    )

    path.write_text(text, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Alinha o jogo ao modelo mobile do agro_farm_mobile.zip")
    parser.add_argument("project", type=Path)
    root = parser.parse_args().project.resolve()
    patch_controller(root)
    print(f"Modelo mobile do ZIP aplicado em: {root}")


if __name__ == "__main__":
    main()
