#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Normaliza scripts enhanced para Godot 3")
    parser.add_argument("project", type=Path)
    root = parser.parse_args().project.resolve()

    write(root / "singletons" / "EquipmentSystem.gd", r'''
extends Node

signal equipment_broken(equip_name)
signal equipment_repaired(equip_name)
signal durability_changed(equip_name, current, maximum)

var equipment = {}

func _ready():
    equipment = {
        "hoe": {"name": "Enxada", "durability": 100.0, "max": 100.0, "repair": 30, "owned": true, "broken": false, "cost": 0},
        "watering_can": {"name": "Regador", "durability": 100.0, "max": 100.0, "repair": 40, "owned": true, "broken": false, "cost": 0},
        "hammer": {"name": "Martelo", "durability": 100.0, "max": 100.0, "repair": 50, "owned": true, "broken": false, "cost": 0},
        "axe": {"name": "Machado", "durability": 100.0, "max": 100.0, "repair": 45, "owned": true, "broken": false, "cost": 0},
        "sickle": {"name": "Foice", "durability": 100.0, "max": 100.0, "repair": 35, "owned": true, "broken": false, "cost": 0},
        "harvester": {"name": "Colheitadeira", "durability": 150.0, "max": 150.0, "repair": 150, "owned": false, "broken": false, "cost": 3000},
        "pesticide_sprayer": {"name": "Pulverizador", "durability": 100.0, "max": 100.0, "repair": 80, "owned": false, "broken": false, "cost": 1500}
    }

func use_equipment(id, amount = 1.0):
    if not equipment.has(id):
        return true
    var eq = equipment[id]
    if not eq.get("owned", false):
        return false
    if eq.get("broken", false):
        return false
    eq["durability"] = max(0.0, float(eq["durability"]) - float(amount))
    if eq["durability"] <= 0.0:
        eq["broken"] = true
        emit_signal("equipment_broken", eq["name"])
    emit_signal("durability_changed", eq["name"], eq["durability"], eq["max"])
    return not eq["broken"]

func buy_equipment(id):
    if not equipment.has(id):
        return false
    var eq = equipment[id]
    if eq["owned"]:
        return true
    if EconomySystem.subtract_money(eq["cost"], "Equipamento: " + eq["name"]):
        eq["owned"] = true
        return true
    return false

func repair_equipment(id):
    if not equipment.has(id):
        return false
    var eq = equipment[id]
    if EconomySystem.subtract_money(eq["repair"], "Reparo: " + eq["name"]):
        eq["durability"] = eq["max"]
        eq["broken"] = false
        emit_signal("equipment_repaired", eq["name"])
        emit_signal("durability_changed", eq["name"], eq["durability"], eq["max"])
        return true
    return false

func repair_all():
    var repaired = 0
    for id in equipment.keys():
        if equipment[id].get("owned", false) and equipment[id]["durability"] < equipment[id]["max"]:
            if repair_equipment(id):
                repaired += 1
    return repaired

func daily_decay():
    pass

func get_save_data():
    return equipment

func load_save_data(data):
    for id in data.keys():
        if equipment.has(id):
            equipment[id] = data[id]
''')

    write(root / "singletons" / "StaffSystem.gd", r'''
extends Node

signal staff_hired(type_id, staff_name)
signal staff_fired(type_id)

var staff_types = {
    "harvester": {"name": "Colhedor", "daily_wage": 80, "hired": false, "skill": "Colhe automaticamente"},
    "caretaker": {"name": "Cuidador", "daily_wage": 70, "hired": false, "skill": "Ajuda animais"},
    "mechanic": {"name": "Mecânico", "daily_wage": 90, "hired": false, "skill": "Reduz quebras"}
}

func hire_staff(id):
    if not staff_types.has(id):
        return false
    var s = staff_types[id]
    if s["hired"]:
        return true
    var cost = int(s["daily_wage"]) * 10
    if EconomySystem.subtract_money(cost, "Contratação: " + s["name"]):
        s["hired"] = true
        emit_signal("staff_hired", id, s["name"])
        return true
    return false

func fire_staff(id):
    if staff_types.has(id):
        staff_types[id]["hired"] = false
        emit_signal("staff_fired", id)

func pay_daily_wages():
    for id in staff_types.keys():
        var s = staff_types[id]
        if s["hired"]:
            EconomySystem.subtract_money(s["daily_wage"], "Salário: " + s["name"])

func execute_auto_actions(farm):
    pass

func get_save_data():
    return staff_types

func load_save_data(data):
    for id in data.keys():
        if staff_types.has(id):
            staff_types[id] = data[id]
''')

    write(root / "singletons" / "AnimalSystem.gd", r'''
extends Node

signal animal_added(animal_type, animal_name)
signal animal_died(animal_type, animal_name)
signal product_collected(product_type, amount, value)

var animals = []
var next_id = 1
var defs = {
    "chicken": {"name": "Galinha", "cost": 500, "product": "Ovo", "value": 15},
    "cow": {"name": "Vaca", "cost": 2000, "product": "Leite", "value": 50},
    "sheep": {"name": "Ovelha", "cost": 1500, "product": "Lã", "value": 80}
}

func buy_animal(id):
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

func feed_animal(animal_id):
    for a in animals:
        if int(a["id"]) == int(animal_id):
            a["fed"] = true
            a["health"] = min(100, int(a["health"]) + 10)
            return

func feed_all():
    for a in animals:
        a["fed"] = true
        a["health"] = min(100, int(a["health"]) + 10)

func sell_animal(animal_id):
    for i in range(animals.size()):
        if int(animals[i]["id"]) == int(animal_id):
            EconomySystem.add_money(int(defs[animals[i]["type"]]["cost"] / 2), "Venda animal")
            animals.remove(i)
            return true
    return false

func daily_update(weather):
    var dead = []
    for a in animals:
        if not a.get("fed", false):
            a["health"] = int(a["health"]) - 15
        if weather == "storm":
            a["health"] = int(a["health"]) - 5
        a["fed"] = false
        if int(a["health"]) <= 0:
            dead.append(a)
        else:
            var d = defs[a["type"]]
            EconomySystem.add_money(d["value"], "Produção: " + d["product"])
            emit_signal("product_collected", d["product"], 1, d["value"])
    for a in dead:
        emit_signal("animal_died", a["type"], a["name"])
        animals.erase(a)

func get_save_data():
    return {"animals": animals, "next_id": next_id}

func load_save_data(data):
    animals = data.get("animals", [])
    next_id = int(data.get("next_id", 1))
''')

    write(root / "ui" / "enhanced" / "EnhancedHUD.gd", r'''
extends Control

var money_label
var panel

func _ready():
    Engine.target_fps = 30
    _build()
    EconomySystem.connect("money_changed", self, "_on_money_changed")
    _on_money_changed(EconomySystem.money)

func _build():
    anchor_right = 1
    anchor_bottom = 1
    money_label = Label.new()
    money_label.name = "MoneyLabel"
    money_label.text = "$0"
    money_label.rect_position = Vector2(16, 82)
    money_label.rect_min_size = Vector2(220, 44)
    add_child(money_label)

    var names = [["EQUIP", "equip"], ["FUNC", "staff"], ["ANIMAIS", "animal"], ["LOJA", "shop"]]
    for i in range(names.size()):
        var b = Button.new()
        b.text = names[i][0]
        b.rect_position = Vector2(16 + i * 132, 130)
        b.rect_min_size = Vector2(122, 52)
        b.connect("pressed", self, "_toggle", [names[i][1]])
        add_child(b)

    panel = Panel.new()
    panel.visible = false
    panel.rect_position = Vector2(40, 190)
    panel.rect_min_size = Vector2(880, 300)
    add_child(panel)

func _on_money_changed(new_amount):
    money_label.text = "$" + str(new_amount)

func _clear_panel():
    for c in panel.get_children():
        c.queue_free()

func _toggle(kind):
    if panel.visible and panel.get_meta("kind", "") == kind:
        panel.visible = false
        return
    panel.set_meta("kind", kind)
    panel.visible = true
    _clear_panel()
    var title = Label.new()
    title.text = kind.to_upper()
    title.rect_position = Vector2(18, 12)
    title.rect_min_size = Vector2(830, 32)
    panel.add_child(title)
    if kind == "equip":
        _equipment()
    elif kind == "staff":
        _staff()
    elif kind == "animal":
        _animal()
    elif kind == "shop":
        _shop()

func _button(text, pos, method, args=[]):
    var b = Button.new()
    b.text = text
    b.rect_position = pos
    b.rect_min_size = Vector2(190, 48)
    b.connect("pressed", self, method, args)
    panel.add_child(b)
    return b

func _equipment():
    var y = 58
    for id in EquipmentSystem.equipment.keys():
        var e = EquipmentSystem.equipment[id]
        var l = Label.new()
        l.text = e["name"] + "  " + str(int(e["durability"])) + "/" + str(int(e["max"]))
        l.rect_position = Vector2(22, y)
        l.rect_min_size = Vector2(380, 38)
        panel.add_child(l)
        _button("REPARAR", Vector2(430, y - 6), "_repair", [id])
        y += 48

func _staff():
    var y = 58
    for id in StaffSystem.staff_types.keys():
        var s = StaffSystem.staff_types[id]
        var l = Label.new()
        l.text = s["name"] + " $" + str(s["daily_wage"]) + "/dia"
        l.rect_position = Vector2(22, y)
        l.rect_min_size = Vector2(360, 38)
        panel.add_child(l)
        if s["hired"]:
            _button("DEMITIR", Vector2(430, y - 6), "_hire_fire", [id])
        else:
            _button("CONTRATAR", Vector2(430, y - 6), "_hire_fire", [id])
        y += 52

func _animal():
    _button("GALINHA $500", Vector2(22, 62), "_buy_animal", ["chicken"])
    _button("VACA $2000", Vector2(230, 62), "_buy_animal", ["cow"])
    _button("OVELHA $1500", Vector2(438, 62), "_buy_animal", ["sheep"])
    var y = 126
    for a in AnimalSystem.animals:
        var l = Label.new()
        l.text = a["name"] + " saúde " + str(a["health"])
        l.rect_position = Vector2(22, y)
        l.rect_min_size = Vector2(360, 36)
        panel.add_child(l)
        y += 38

func _shop():
    _button("COLHEITADEIRA", Vector2(22, 62), "_buy_equip", ["harvester"])
    _button("PULVERIZADOR", Vector2(230, 62), "_buy_equip", ["pesticide_sprayer"])
    _button("UPGRADE", Vector2(438, 62), "_upgrade", [])

func _repair(id):
    EquipmentSystem.repair_equipment(id)
    _toggle("equip")

func _hire_fire(id):
    if StaffSystem.staff_types[id]["hired"]:
        StaffSystem.fire_staff(id)
    else:
        StaffSystem.hire_staff(id)
    _toggle("staff")

func _buy_animal(id):
    AnimalSystem.buy_animal(id)
    _toggle("animal")

func _buy_equip(id):
    EquipmentSystem.buy_equipment(id)
    _toggle("shop")

func _upgrade():
    FarmUpgradeSystem.upgrade_farm()
    _toggle("shop")
''')

    print(f"GDScript enhanced normalizado em {root}")


if __name__ == "__main__":
    main()
