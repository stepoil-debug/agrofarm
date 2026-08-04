#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path


FARM_PROGRESSION_SYSTEM = r'''
extends Node

signal fields_changed(unlocked_fields)
signal structure_bought(structure_id, structure_name)

const INITIAL_FIELDS = 4
const SAVE_PATH = "user://agrofarm_progression.json"

var unlocked_fields = INITIAL_FIELDS
var field_costs = [120, 150, 180, 220, 280, 350, 450, 600, 800, 1000]
var structures = {
    "coop": {"name": "Galinheiro", "cost": 500, "owned": false, "description": "Libera galinhas"},
    "stable": {"name": "Estabulo", "cost": 1200, "owned": false, "description": "Libera vacas"},
    "pigsty": {"name": "Chiqueiro", "cost": 800, "owned": false, "description": "Libera porcos"},
    "silo": {"name": "Silo", "cost": 350, "owned": false, "description": "Melhora armazenamento"},
    "barn": {"name": "Galpao", "cost": 700, "owned": false, "description": "Base para maquinas"}
}

func _ready():
    load_progression()

func is_field_unlocked(field_index):
    return int(field_index) >= 0 and int(field_index) < int(unlocked_fields)

func get_next_field_cost():
    var idx = int(unlocked_fields) - INITIAL_FIELDS
    if idx < 0:
        idx = 0
    if idx >= field_costs.size():
        idx = field_costs.size() - 1
    return int(field_costs[idx])

func buy_next_field(max_fields):
    max_fields = int(max_fields)
    if unlocked_fields >= max_fields:
        return {"ok": false, "message": "Todos os campos ja foram liberados."}
    var cost = get_next_field_cost()
    if not EconomySystem.subtract_money(cost, "Novo campo de plantio"):
        return {"ok": false, "message": "Saldo insuficiente para abrir novo campo. Custo: $" + str(cost)}
    unlocked_fields += 1
    save_progression()
    emit_signal("fields_changed", unlocked_fields)
    return {"ok": true, "message": "Novo campo liberado. Campos: " + str(unlocked_fields)}

func has_structure(structure_id):
    return structures.has(structure_id) and bool(structures[structure_id].get("owned", false))

func get_structure_name(structure_id):
    if not structures.has(structure_id):
        return structure_id
    return str(structures[structure_id].get("name", structure_id))

func get_structure_cost(structure_id):
    if not structures.has(structure_id):
        return 0
    return int(structures[structure_id].get("cost", 0))

func buy_structure(structure_id):
    if not structures.has(structure_id):
        return {"ok": false, "message": "Construcao nao encontrada."}
    var item = structures[structure_id]
    if bool(item.get("owned", false)):
        return {"ok": false, "message": str(item.get("name", structure_id)) + " ja foi comprado."}
    var cost = int(item.get("cost", 0))
    if not EconomySystem.subtract_money(cost, "Construcao: " + str(item.get("name", structure_id))):
        return {"ok": false, "message": "Saldo insuficiente. Custo: $" + str(cost)}
    structures[structure_id]["owned"] = true
    save_progression()
    emit_signal("structure_bought", structure_id, str(item.get("name", structure_id)))
    return {"ok": true, "message": str(item.get("name", structure_id)) + " comprado."}

func get_save_data():
    return {"unlocked_fields": unlocked_fields, "structures": structures}

func load_save_data(data):
    if typeof(data) != TYPE_DICTIONARY:
        return
    unlocked_fields = max(INITIAL_FIELDS, int(data.get("unlocked_fields", INITIAL_FIELDS)))
    var saved_structures = data.get("structures", {})
    if typeof(saved_structures) == TYPE_DICTIONARY:
        for id in saved_structures.keys():
            if structures.has(id) and typeof(saved_structures[id]) == TYPE_DICTIONARY:
                structures[id]["owned"] = bool(saved_structures[id].get("owned", false))
    save_progression()

func save_progression():
    var file = File.new()
    if file.open(SAVE_PATH, File.WRITE) != OK:
        return
    file.store_string(to_json(get_save_data()))
    file.close()

func load_progression():
    var file = File.new()
    if not file.file_exists(SAVE_PATH):
        return
    if file.open(SAVE_PATH, File.READ) != OK:
        return
    var raw = file.get_as_text()
    file.close()
    var data = parse_json(raw)
    if typeof(data) == TYPE_DICTIONARY:
        load_save_data(data)
'''


FARM_HELPERS = r'''

# -----------------------------------------------------------------------------
# AgroFarm progressao: somente 4 campos no inicio e expansao via loja.
# -----------------------------------------------------------------------------
func _agro_field_score(cell):
    # Primeiro libera a area mais perto do jogador no campo inferior direito.
    if cell.x >= 27 and cell.y >= 13:
        return int((cell.y - 13) * 10 + (cell.x - 27))
    if cell.x >= 27:
        return int(1000 + cell.y * 10 + (cell.x - 27))
    if cell.y >= 13:
        return int(2000 + (cell.y - 13) * 10 + cell.x)
    return int(3000 + cell.y * 10 + cell.x)

func _agro_sort_fields(a, b):
    var score_a = _agro_field_score(a)
    var score_b = _agro_field_score(b)
    if score_a == score_b:
        return a.x < b.x
    return score_a < score_b

func _agro_farmable_cells():
    if agro_field_cells_cache.size() > 0:
        return agro_field_cells_cache
    var cells = []
    for x in range(int(grid_size.x)):
        for y in range(int(grid_size.y)):
            var c = Vector2(x, y)
            if Background2.get_cellv(c) == 15 or Dirt.get_cellv(c) != -1 or Crops.get_cellv(c) != -1:
                cells.append(c)
    cells.sort_custom(self, "_agro_sort_fields")
    agro_field_cells_cache = cells
    return agro_field_cells_cache

func mobile_total_fields():
    return _agro_farmable_cells().size()

func mobile_field_index(cell):
    var fields = _agro_farmable_cells()
    for i in range(fields.size()):
        if fields[i] == cell:
            return i
    return -1

func mobile_is_field_unlocked(cell):
    var idx = mobile_field_index(cell)
    if idx < 0:
        return false
    return FarmProgressionSystem.is_field_unlocked(idx)

func mobile_apply_field_visibility():
    var fields = _agro_farmable_cells()
    for i in range(fields.size()):
        var c = fields[i]
        if FarmProgressionSystem.is_field_unlocked(i):
            Background2.set_cellv(c, 15)
        else:
            Background2.set_cellv(c, 4)
            Dirt.set_cellv(c, -1)
            Crops.set_cellv(c, -1)
            Junk.set_cellv(c, -1)
    Background2.update_dirty_quadrants()
    Dirt.update_dirty_quadrants()
    Crops.update_dirty_quadrants()
    Junk.update_dirty_quadrants()
'''


MOBILE_INTERACTIVE = r'''
func mobile_is_interactive_cell(cell):
    if not mobile_is_valid_cell(cell):
        return false
    var idx = mobile_field_index(cell)
    if idx >= 0:
        return FarmProgressionSystem.is_field_unlocked(idx)
    return Dirt.get_cellv(cell) != -1 or Crops.get_cellv(cell) != -1 or Junk.get_cellv(cell) != -1
'''


MOBILE_STATE = r'''
func mobile_get_cell_state(cell):
    if not mobile_is_valid_cell(cell):
        return {"valid": false}
    var field_index = mobile_field_index(cell)
    var farmable = field_index >= 0
    var locked = farmable and not FarmProgressionSystem.is_field_unlocked(field_index)
    var dirt_id = Dirt.get_cellv(cell)
    var crop_id = Crops.get_cellv(cell)
    var junk_id = Junk.get_cellv(cell)
    return {
        "valid": true,
        "farmable": farmable,
        "locked": locked,
        "field_index": field_index,
        "dirt": dirt_id,
        "crop": crop_id,
        "junk": junk_id,
        "has_junk": junk_id != -1 and not locked,
        "can_till": farmable and not locked and dirt_id == -1 and crop_id == -1 and junk_id == -1,
        "can_plant": farmable and not locked and dirt_id >= 0 and crop_id == -1 and junk_id == -1,
        "can_water": not locked and dirt_id == 0,
        "can_harvest": not locked and (crop_id == 5 or crop_id == 35 or crop_id == 17)
    }
'''


MOBILE_SHOP_HELPERS = r'''

func _construction_store():
    if mobile_root == null:
        return null
    return mobile_root.get_node_or_null("ConstructionStore")

func _construction_store_visible():
    var panel = _construction_store()
    return panel != null and panel.visible

func _build_construction_store():
    var existing = _construction_store()
    if existing != null:
        return existing
    var panel = PanelContainer.new()
    panel.name = "ConstructionStore"
    panel.anchor_left = 0.5
    panel.anchor_right = 0.5
    panel.anchor_top = 0.5
    panel.anchor_bottom = 0.5
    panel.margin_left = -410
    panel.margin_top = -230
    panel.margin_right = 410
    panel.margin_bottom = 230
    panel.visible = false
    if has_method("_phone_panel_style"):
        _phone_panel_style(panel)
    else:
        panel.add_stylebox_override("panel", _panel_style(Color(0.0, 0.05, 0.02, 0.96)))
    mobile_root.add_child(panel)

    var content = VBoxContainer.new()
    content.name = "Content"
    content.add_constant_override("separation", 10)
    panel.add_child(content)
    return panel

func _open_construction_store():
    action_panel.visible = false
    map_panel.visible = false
    inventory.visible = false
    if shop_menu.visible and shop_menu.has_method("_close_shop_menu"):
        shop_menu._close_shop_menu()
    var panel = _build_construction_store()
    panel.visible = true
    _refresh_construction_store()
    _update_shop_controls()

func _close_construction_store():
    var panel = _construction_store()
    if panel != null:
        panel.visible = false

func _refresh_construction_store():
    var panel = _build_construction_store()
    var content = panel.get_node("Content")
    _clear_container(content)

    var title = Label.new()
    title.text = "LOJA DA FAZENDA"
    title.align = Label.ALIGN_CENTER
    title.rect_min_size = Vector2(0, 42)
    if has_method("_style_label"):
        _style_label(title, 24)
    content.add_child(title)

    var status = Label.new()
    status.align = Label.ALIGN_CENTER
    status.rect_min_size = Vector2(0, 34)
    status.text = "$" + str(EconomySystem.money) + "  |  Campos " + str(FarmProgressionSystem.unlocked_fields) + "/" + str(farm.mobile_total_fields())
    if has_method("_style_label"):
        _style_label(status, 16)
    content.add_child(status)

    var grid = GridContainer.new()
    grid.columns = 2
    grid.add_constant_override("hseparation", 10)
    grid.add_constant_override("vseparation", 10)
    content.add_child(grid)

    var field_cost = FarmProgressionSystem.get_next_field_cost()
    var field_text = "CAMPO +1  $" + str(field_cost)
    if FarmProgressionSystem.unlocked_fields >= farm.mobile_total_fields():
        field_text = "CAMPOS COMPLETOS"
    _add_store_button(grid, field_text, "_buy_next_field")
    _add_store_button(grid, _structure_button_label("coop"), "_buy_structure", ["coop"])
    _add_store_button(grid, _structure_button_label("stable"), "_buy_structure", ["stable"])
    _add_store_button(grid, _structure_button_label("pigsty"), "_buy_structure", ["pigsty"])
    _add_store_button(grid, _structure_button_label("silo"), "_buy_structure", ["silo"])
    _add_store_button(grid, _structure_button_label("barn"), "_buy_structure", ["barn"])
    _add_store_button(grid, "SEMENTES / VENDER", "_open_original_shop_from_store")
    _add_store_button(grid, "FECHAR", "_close_shop")

func _structure_button_label(structure_id):
    var name = FarmProgressionSystem.get_structure_name(structure_id).to_upper()
    if FarmProgressionSystem.has_structure(structure_id):
        return name + " OK"
    return name + "  $" + str(FarmProgressionSystem.get_structure_cost(structure_id))

func _add_store_button(grid, label_text, method_name, args=[]):
    var button = _make_button(label_text, Vector2(390, 62))
    if has_method("_phone_button_style"):
        _phone_button_style(button)
    button.connect("pressed", self, method_name, args)
    grid.add_child(button)
    return button

func _buy_next_field():
    var result = FarmProgressionSystem.buy_next_field(farm.mobile_total_fields())
    farm.mobile_apply_field_visibility()
    _show_toast(result.get("message", "Campo atualizado."))
    _refresh_construction_store()

func _buy_structure(structure_id):
    var result = FarmProgressionSystem.buy_structure(structure_id)
    _show_toast(result.get("message", "Loja atualizada."))
    _refresh_construction_store()

func _open_original_shop_from_store():
    _close_construction_store()
    if shop_menu.has_method("open_shop_mobile"):
        shop_menu.open_shop_mobile()
    _update_shop_controls()
'''


UPDATE_SHOP_CONTROLS = r'''
func _update_shop_controls():
    var construction_visible = _construction_store_visible()
    var original_shop_visible = shop_menu.visible
    var in_shop = original_shop_visible or construction_visible
    shop_close_button.visible = in_shop
    shop_tab_button.visible = original_shop_visible
    map_button.visible = not in_shop
    location_label.visible = not in_shop
    inventory_button.visible = not in_shop
    action_panel.visible = action_panel.visible and not in_shop
    map_panel.visible = map_panel.visible and not in_shop

    var can_open = false
    if not in_shop and player.Zone.name == "Town" and player.Zone.has_method("can_shop"):
        can_open = player.Zone.can_shop(player.position)
    shop_open_button.visible = can_open
'''

OPEN_SHOP = r'''
func _open_shop():
    _open_construction_store()
'''

CLOSE_SHOP = r'''
func _close_shop():
    _close_construction_store()
    if shop_menu.has_method("_close_shop_menu"):
        shop_menu._close_shop_menu()
    _update_shop_controls()
'''

ENHANCED_SHOP = r'''
func _shop():
    _button("CAMPO +1 $" + str(FarmProgressionSystem.get_next_field_cost()), Vector2(22, 62), "_buy_field", [])
    _button("GALINHEIRO $" + str(FarmProgressionSystem.get_structure_cost("coop")), Vector2(230, 62), "_buy_structure", ["coop"])
    _button("ESTABULO $" + str(FarmProgressionSystem.get_structure_cost("stable")), Vector2(438, 62), "_buy_structure", ["stable"])
    _button("CHIQUEIRO $" + str(FarmProgressionSystem.get_structure_cost("pigsty")), Vector2(646, 62), "_buy_structure", ["pigsty"])
    _button("SILO $" + str(FarmProgressionSystem.get_structure_cost("silo")), Vector2(22, 126), "_buy_structure", ["silo"])
    _button("GALPAO $" + str(FarmProgressionSystem.get_structure_cost("barn")), Vector2(230, 126), "_buy_structure", ["barn"])
    _button("COLHEITADEIRA", Vector2(438, 126), "_buy_equip", ["harvester"])
    _button("UPGRADE", Vector2(646, 126), "_upgrade", [])
'''

ENHANCED_EXTRA_FUNCS = r'''
func _buy_field():
    var farm = get_node_or_null("/root/Game/Farm")
    var max_fields = 9999
    if farm != null and farm.has_method("mobile_total_fields"):
        max_fields = farm.mobile_total_fields()
    FarmProgressionSystem.buy_next_field(max_fields)
    if farm != null and farm.has_method("mobile_apply_field_visibility"):
        farm.mobile_apply_field_visibility()
    _toggle("shop")

func _buy_structure(structure_id):
    FarmProgressionSystem.buy_structure(structure_id)
    _toggle("shop")
'''

ANIMAL_BUY = r'''
func buy_animal(id):
    if id == "chicken" and not FarmProgressionSystem.has_structure("coop"):
        return false
    if id == "cow" and not FarmProgressionSystem.has_structure("stable"):
        return false
    if id == "pig" and not FarmProgressionSystem.has_structure("pigsty"):
        return false
    if not defs.has(id):
        return false
    var d = defs[id]
    if EconomySystem.subtract_money(d["cost"], "Animal: " + d["name"]):
        var a = {"id": next_id, "type": id, "name": d["name"] + " " + str(next_id), "health": 100, "fed": true}
        next_id += 1
        animals.append(a)
        emit_signal("animal_added", id, a["name"])
        return true
    return false
'''


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")


def replace_func(text: str, name: str, replacement: str) -> str:
    pattern = re.compile(rf'^func {re.escape(name)}\([^\n]*\):\n[\s\S]*?(?=^func |\Z)', re.M)
    new_text, count = pattern.subn(replacement.strip() + "\n\n", text, count=1)
    if count != 1:
        raise RuntimeError(f"Funcao nao encontrada: {name}")
    return new_text


def patch_project(root: Path) -> None:
    path = root / "project.godot"
    text = path.read_text(encoding="utf-8")
    if 'FarmProgressionSystem=' not in text:
        line = 'FarmProgressionSystem="*res://singletons/FarmProgressionSystem.gd"\n'
        if 'FarmUpgradeSystem=' in text:
            text = text.replace('FarmUpgradeSystem="*res://singletons/FarmUpgradeSystem.gd"\n', 'FarmUpgradeSystem="*res://singletons/FarmUpgradeSystem.gd"\n' + line, 1)
        elif '[autoload]\n\n' in text:
            text = text.replace('[autoload]\n\n', '[autoload]\n\n' + line, 1)
        else:
            text += '\n[autoload]\n\n' + line
    path.write_text(text, encoding="utf-8")


def patch_farm(root: Path) -> None:
    path = root / "areas" / "Farm.gd"
    text = path.read_text(encoding="utf-8")
    if 'var agro_field_cells_cache = []' not in text:
        text = text.replace('var grid = []\n', 'var grid = []\nvar agro_field_cells_cache = []\n', 1)
    if 'mobile_apply_field_visibility' not in text.split('func _ready():', 1)[1].split('#this function tells', 1)[0]:
        marker = '\t\t\telse:\n\t\t\t\tgrid[x].append(null)\n'
        text = text.replace(marker, marker + '\n\tcall_deferred("mobile_apply_field_visibility")\n', 1)
    if 'func _agro_field_score' not in text:
        text = text.rstrip() + FARM_HELPERS + '\n'
    text = replace_func(text, 'mobile_is_interactive_cell', MOBILE_INTERACTIVE)
    text = replace_func(text, 'mobile_get_cell_state', MOBILE_STATE)
    path.write_text(text, encoding="utf-8")


def patch_mobile_controller(root: Path) -> None:
    path = root / "mobile" / "MobileController.gd"
    text = path.read_text(encoding="utf-8")
    if 'func _construction_store()' not in text:
        text = text.rstrip() + MOBILE_SHOP_HELPERS + '\n'
    text = replace_func(text, '_update_shop_controls', UPDATE_SHOP_CONTROLS)
    text = replace_func(text, '_open_shop', OPEN_SHOP)
    text = replace_func(text, '_close_shop', CLOSE_SHOP)
    path.write_text(text, encoding="utf-8")


def patch_enhanced_hud(root: Path) -> None:
    path = root / "ui" / "enhanced" / "EnhancedHUD.gd"
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    text = replace_func(text, '_shop', ENHANCED_SHOP)
    if 'func _buy_field()' not in text:
        text = text.rstrip() + '\n\n' + ENHANCED_EXTRA_FUNCS.strip() + '\n'
    path.write_text(text, encoding="utf-8")


def patch_animal_system(root: Path) -> None:
    path = root / "singletons" / "AnimalSystem.gd"
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    if '"pig"' not in text:
        text = text.replace('"sheep":{"name":"Ovelha","cost":1500,"product":"Lã","value":80}}', '"sheep":{"name":"Ovelha","cost":1500,"product":"Lã","value":80},"pig":{"name":"Porco","cost":900,"product":"Carne","value":60}}', 1)
    text = replace_func(text, 'buy_animal', ANIMAL_BUY)
    path.write_text(text, encoding="utf-8")


def patch_game_manager(root: Path) -> None:
    path = root / "save_load" / "GameManager.gd"
    if not path.exists():
        return
    text = path.read_text(encoding="utf-8")
    if 'saveDictionary["farm_progression"]' not in text:
        text = text.replace('saveDictionary["farm_upgrades"] = FarmUpgradeSystem.get_save_data()\n', 'saveDictionary["farm_upgrades"] = FarmUpgradeSystem.get_save_data()\n\tsaveDictionary["farm_progression"] = FarmProgressionSystem.get_save_data()\n', 1)
    if 'dict.has("farm_progression")' not in text:
        text = text.replace('if dict.has("farm_upgrades"): FarmUpgradeSystem.load_save_data(dict["farm_upgrades"])\n', 'if dict.has("farm_upgrades"): FarmUpgradeSystem.load_save_data(dict["farm_upgrades"])\n\tif dict.has("farm_progression"): FarmProgressionSystem.load_save_data(dict["farm_progression"])\n', 1)
    path.write_text(text, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Adiciona progressao de campos e loja de construcoes")
    parser.add_argument("project", type=Path)
    root = parser.parse_args().project.resolve()
    write_file(root / "singletons" / "FarmProgressionSystem.gd", FARM_PROGRESSION_SYSTEM)
    patch_project(root)
    patch_farm(root)
    patch_mobile_controller(root)
    patch_enhanced_hud(root)
    patch_animal_system(root)
    patch_game_manager(root)
    print(f"Progressao de fazenda aplicada em {root}")


if __name__ == "__main__":
    main()
