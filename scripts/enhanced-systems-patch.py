#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path


def write_file(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")


def replace_func(text: str, name: str, insert_line: str) -> str:
    pattern = re.compile(rf'^(func {re.escape(name)}\([^\n]*\):\n)(?!\tif not EquipmentSystem)', re.M)
    return pattern.sub(rf'\1\t{insert_line}\n', text, count=1)


def patch_project(root: Path) -> None:
    path = root / "project.godot"
    text = path.read_text(encoding="utf-8")
    autoload = '''[autoload]

EconomySystem="*res://singletons/EconomySystem.gd"
EquipmentSystem="*res://singletons/EquipmentSystem.gd"
FarmUpgradeSystem="*res://singletons/FarmUpgradeSystem.gd"
StaffSystem="*res://singletons/StaffSystem.gd"
AnimalSystem="*res://singletons/AnimalSystem.gd"
PestSystem="*res://singletons/PestSystem.gd"
InputManager="*res://singletons/InputManager.gd"
WebSaveManager="*res://singletons/WebSaveManager.gd"
ObjectPool="*res://singletons/ObjectPool.gd"
GameManager="*res://save_load/GameManager.gd"
'''
    text = re.sub(r'\[autoload\]\n(?:.*\n)*?(?=\n\[)', autoload + "\n", text, count=1)
    settings = {
        'display/window/stretch/mode': '"viewport"',
        'display/window/stretch/aspect': '"expand"',
        'display/window/handheld/orientation': '"sensor_landscape"',
        'rendering/quality/driver/driver_name': '"GLES2"',
    }
    for key, value in settings.items():
        line = f'{key}={value}'
        pat = re.compile(rf'^{re.escape(key)}=.*$', re.M)
        text = pat.sub(line, text, count=1) if pat.search(text) else text + "\n" + line + "\n"
    path.write_text(text, encoding="utf-8")


def write_singletons(root: Path) -> None:
    write_file(root / "singletons" / "EconomySystem.gd", r'''
extends Node
signal money_changed(new_amount)
signal daily_report(income, expenses, balance)
var money = 2000
var daily_income = 0
var daily_expenses = 0
var transaction_log = []
func _ready(): emit_signal("money_changed", money)
func add_money(amount, reason="Venda"):
    money += int(amount); daily_income += int(amount)
    transaction_log.append({"type":"+","amount":int(amount),"reason":reason})
    emit_signal("money_changed", money)
func subtract_money(amount, reason="Compra"):
    amount = int(amount)
    if money < amount: return false
    money -= amount; daily_expenses += amount
    transaction_log.append({"type":"-","amount":amount,"reason":reason})
    emit_signal("money_changed", money)
    return true
func can_afford(amount): return money >= int(amount)
func end_of_day():
    emit_signal("daily_report", daily_income, daily_expenses, daily_income - daily_expenses)
    daily_income = 0; daily_expenses = 0
func get_save_data(): return {"money":money,"daily_income":daily_income,"daily_expenses":daily_expenses,"transaction_log":transaction_log}
func load_save_data(data):
    money = int(data.get("money", 2000)); daily_income = int(data.get("daily_income", 0)); daily_expenses = int(data.get("daily_expenses", 0)); transaction_log = data.get("transaction_log", [])
    emit_signal("money_changed", money)
''')
    write_file(root / "singletons" / "EquipmentSystem.gd", r'''
extends Node
signal equipment_broken(equip_name)
signal equipment_repaired(equip_name)
signal durability_changed(equip_name, current, maximum)
var equipment = {}
func _ready():
    equipment = {
        "hoe":{"name":"Enxada","durability":100,"max":100,"repair":30,"owned":true,"broken":false,"cost":0},
        "watering_can":{"name":"Regador","durability":100,"max":100,"repair":40,"owned":true,"broken":false,"cost":0},
        "hammer":{"name":"Martelo","durability":100,"max":100,"repair":50,"owned":true,"broken":false,"cost":0},
        "axe":{"name":"Machado","durability":100,"max":100,"repair":45,"owned":true,"broken":false,"cost":0},
        "sickle":{"name":"Foice","durability":100,"max":100,"repair":35,"owned":true,"broken":false,"cost":0},
        "harvester":{"name":"Colheitadeira","durability":150,"max":150,"repair":150,"owned":false,"broken":false,"cost":3000},
        "pesticide_sprayer":{"name":"Pulverizador","durability":100,"max":100,"repair":80,"owned":false,"broken":false,"cost":1500}
    }
func use_equipment(id, amount=1):
    if not equipment.has(id): return true
    var eq = equipment[id]
    if not eq.get("owned", false) or eq.get("broken", false): return false
    eq["durability"] = max(0, float(eq["durability"]) - float(amount))
    if eq["durability"] <= 0:
        eq["broken"] = true; emit_signal("equipment_broken", eq["name"])
    emit_signal("durability_changed", eq["name"], eq["durability"], eq["max"])
    return not eq["broken"]
func buy_equipment(id):
    if not equipment.has(id): return false
    var eq = equipment[id]
    if eq["owned"]: return true
    if EconomySystem.subtract_money(eq["cost"], "Equipamento: " + eq["name"]): eq["owned"] = true; return true
    return false
func repair_equipment(id):
    if not equipment.has(id): return false
    var eq = equipment[id]
    if EconomySystem.subtract_money(eq["repair"], "Reparo: " + eq["name"]):
        eq["durability"] = eq["max"]; eq["broken"] = false; emit_signal("equipment_repaired", eq["name"]); return true
    return false
func repair_all():
    var n = 0
    for id in equipment.keys(): if repair_equipment(id): n += 1
    return n
func daily_decay(): pass
func get_save_data(): return equipment
func load_save_data(data):
    for id in data.keys(): if equipment.has(id): equipment[id] = data[id]
''')
    write_file(root / "singletons" / "FarmUpgradeSystem.gd", r'''
extends Node
signal farm_upgraded(new_level, unlocks)
var level = 1
var levels = {1:{"cost":0,"name":"Fazenda Nível 1"},2:{"cost":500,"name":"Fazenda Nível 2"},3:{"cost":1500,"name":"Fazenda Nível 3"},4:{"cost":3500,"name":"Fazenda Nível 4"},5:{"cost":7000,"name":"Fazenda Nível 5"}}
func get_next_level(): return levels.get(level + 1, null)
func upgrade_farm():
    var nxt = get_next_level()
    if nxt and EconomySystem.subtract_money(nxt.cost, "Upgrade fazenda"):
        level += 1; emit_signal("farm_upgraded", level, []); return true
    return false
func can_have_crop(id): return true
func can_have_equipment(id): return level >= 1
func can_have_animal(id): return true
func get_save_data(): return {"level":level}
func load_save_data(data): level = int(data.get("level", 1))
''')
    write_file(root / "singletons" / "StaffSystem.gd", r'''
extends Node
signal staff_hired(type_id, staff_name)
signal staff_fired(type_id)
var staff_types = {"harvester":{"name":"Colhedor","daily_wage":80,"hired":false,"skill":"Colhe automaticamente"},"caretaker":{"name":"Cuidador","daily_wage":70,"hired":false,"skill":"Ajuda animais"},"mechanic":{"name":"Mecânico","daily_wage":90,"hired":false,"skill":"Reduz quebras"}}
func hire_staff(id):
    if not staff_types.has(id): return false
    var s = staff_types[id]
    if s.hired: return true
    if EconomySystem.subtract_money(int(s.daily_wage) * 10, "Contratação: " + s.name): s.hired = true; emit_signal("staff_hired", id, s.name); return true
    return false
func fire_staff(id): if staff_types.has(id): staff_types[id].hired = false; emit_signal("staff_fired", id)
func pay_daily_wages():
    for id in staff_types.keys(): if staff_types[id].hired: EconomySystem.subtract_money(staff_types[id].daily_wage, "Salário: " + staff_types[id].name)
func execute_auto_actions(farm): pass
func get_save_data(): return staff_types
func load_save_data(data): for id in data.keys(): if staff_types.has(id): staff_types[id] = data[id]
''')
    write_file(root / "singletons" / "AnimalSystem.gd", r'''
extends Node
signal animal_added(animal_type, animal_name)
signal animal_died(animal_type, animal_name)
signal product_collected(product_type, amount, value)
var animals = []
var next_id = 1
var defs = {"chicken":{"name":"Galinha","cost":500,"product":"Ovo","value":15},"cow":{"name":"Vaca","cost":2000,"product":"Leite","value":50},"sheep":{"name":"Ovelha","cost":1500,"product":"Lã","value":80}}
func buy_animal(id):
    if not defs.has(id): return false
    var d = defs[id]
    if EconomySystem.subtract_money(d.cost, "Animal: " + d.name):
        var a = {"id":next_id,"type":id,"name":d.name + " " + str(next_id),"health":100,"fed":true}
        next_id += 1; animals.append(a); emit_signal("animal_added", id, a.name); return true
    return false
func feed_animal(animal_id): for a in animals: if a.id == animal_id: a.fed = true; a.health = min(100, a.health + 10)
func feed_all(): for a in animals: a.fed = true; a.health = min(100, a.health + 10)
func sell_animal(animal_id):
    for i in range(animals.size()):
        if animals[i].id == animal_id:
            EconomySystem.add_money(int(defs[animals[i].type].cost / 2), "Venda animal"); animals.remove(i); return true
    return false
func daily_update(weather):
    var dead = []
    for a in animals:
        if not a.get("fed", false): a.health -= 15
        if weather == "storm": a.health -= 5
        a.fed = false
        if a.health <= 0: dead.append(a)
        else:
            var d = defs[a.type]; EconomySystem.add_money(d.value, "Produção: " + d.product); emit_signal("product_collected", d.product, 1, d.value)
    for a in dead: emit_signal("animal_died", a.type, a.name); animals.erase(a)
func get_save_data(): return {"animals":animals,"next_id":next_id}
func load_save_data(data): animals = data.get("animals", []); next_id = int(data.get("next_id", 1))
''')
    write_file(root / "singletons" / "PestSystem.gd", r'''
extends Node
signal pest_attack(cells)
var attacks = []
func daily_check(farm):
    if randi() % 8 != 0: return
    if not farm or not farm.has_node("Crops"): return
    var crops = farm.get_node("Crops")
    var used = crops.get_used_cells()
    var hit = []
    for i in range(min(3, used.size())):
        var c = used[randi() % used.size()]
        crops.set_cellv(c, -1); hit.append(c)
    if hit.size() > 0: attacks.append(hit); emit_signal("pest_attack", hit)
func get_save_data(): return {"attacks":attacks}
func load_save_data(data): attacks = data.get("attacks", [])
''')
    write_file(root / "singletons" / "InputManager.gd", r'''
extends Node
func is_mobile(): return OS.has_touchscreen_ui_hint() or OS.has_feature("mobile")
func is_web(): return OS.has_feature("web") or OS.has_feature("HTML5")
''')
    write_file(root / "singletons" / "WebSaveManager.gd", r'''
extends Node
func save_game(slot="auto"):
    if Engine.has_singleton("GameManager"): pass
func get_save_data(): return {}
func load_save_data(data): pass
''')
    write_file(root / "singletons" / "ObjectPool.gd", r'''
extends Node
var pools = {}
func get_object(key): return null
func release_object(key, object): pass
''')


def write_enhanced_ui(root: Path) -> None:
    write_file(root / "ui" / "enhanced" / "EnhancedHUD.gd", r'''
extends Control
var money_label
var panel
func _ready():
    Engine.target_fps = 30
    _build()
    EconomySystem.connect("money_changed", self, "_on_money_changed")
    _on_money_changed(EconomySystem.money)
func _build():
    anchor_right = 1; anchor_bottom = 1
    money_label = Label.new(); money_label.name = "MoneyLabel"; money_label.text = "$0"; money_label.rect_position = Vector2(16, 82); money_label.rect_min_size = Vector2(220, 44); add_child(money_label)
    var names = [["EQUIP", "equip"], ["FUNC", "staff"], ["ANIMAIS", "animal"], ["LOJA", "shop"]]
    for i in range(names.size()):
        var b = Button.new(); b.text = names[i][0]; b.rect_position = Vector2(16 + i * 132, 130); b.rect_min_size = Vector2(122, 52); b.connect("pressed", self, "_toggle", [names[i][1]]); add_child(b)
    panel = Panel.new(); panel.visible = false; panel.rect_position = Vector2(40, 190); panel.rect_min_size = Vector2(880, 300); add_child(panel)
func _on_money_changed(new_amount): money_label.text = "$" + str(new_amount)
func _clear_panel(): for c in panel.get_children(): c.queue_free()
func _toggle(kind):
    if panel.visible and panel.get_meta("kind", "") == kind: panel.visible = false; return
    panel.set_meta("kind", kind); panel.visible = true; _clear_panel()
    var title = Label.new(); title.text = kind.to_upper(); title.rect_position = Vector2(18, 12); title.rect_min_size = Vector2(830, 32); panel.add_child(title)
    if kind == "equip": _equipment()
    elif kind == "staff": _staff()
    elif kind == "animal": _animal()
    elif kind == "shop": _shop()
func _button(text, pos, method, args=[]):
    var b = Button.new(); b.text = text; b.rect_position = pos; b.rect_min_size = Vector2(190, 48); b.connect("pressed", self, method, args); panel.add_child(b); return b
func _equipment():
    var y = 58
    for id in EquipmentSystem.equipment.keys():
        var e = EquipmentSystem.equipment[id]
        var l = Label.new(); l.text = e.name + "  " + str(int(e.durability)) + "/" + str(int(e.max)); l.rect_position = Vector2(22, y); l.rect_min_size = Vector2(380, 38); panel.add_child(l)
        _button("REPARAR", Vector2(430, y-6), "_repair", [id]); y += 48
func _staff():
    var y = 58
    for id in StaffSystem.staff_types.keys():
        var s = StaffSystem.staff_types[id]
        var l = Label.new(); l.text = s.name + " $" + str(s.daily_wage) + "/dia"; l.rect_position = Vector2(22, y); l.rect_min_size = Vector2(360, 38); panel.add_child(l)
        _button("DEMITIR" if s.hired else "CONTRATAR", Vector2(430, y-6), "_hire_fire", [id]); y += 52
func _animal():
    _button("GALINHA $500", Vector2(22, 62), "_buy_animal", ["chicken"]); _button("VACA $2000", Vector2(230, 62), "_buy_animal", ["cow"]); _button("OVELHA $1500", Vector2(438, 62), "_buy_animal", ["sheep"])
    var y = 126
    for a in AnimalSystem.animals:
        var l = Label.new(); l.text = a.name + " saúde " + str(a.health); l.rect_position = Vector2(22, y); l.rect_min_size = Vector2(360, 36); panel.add_child(l); y += 38
func _shop():
    _button("COLHEITADEIRA", Vector2(22, 62), "_buy_equip", ["harvester"]); _button("PULVERIZADOR", Vector2(230, 62), "_buy_equip", ["pesticide_sprayer"]); _button("UPGRADE", Vector2(438, 62), "_upgrade", [])
func _repair(id): EquipmentSystem.repair_equipment(id); _toggle("equip")
func _hire_fire(id): if StaffSystem.staff_types[id].hired: StaffSystem.fire_staff(id); else: StaffSystem.hire_staff(id); _toggle("staff")
func _buy_animal(id): AnimalSystem.buy_animal(id); _toggle("animal")
func _buy_equip(id): EquipmentSystem.buy_equipment(id); _toggle("shop")
func _upgrade(): FarmUpgradeSystem.upgrade_farm(); _toggle("shop")
''')
    write_file(root / "ui" / "enhanced" / "EnhancedHUD.tscn", r'''
[gd_scene load_steps=2 format=2]
[ext_resource path="res://ui/enhanced/EnhancedHUD.gd" type="Script" id=1]
[node name="EnhancedHUD" type="Control"]
anchor_right = 1.0
anchor_bottom = 1.0
script = ExtResource( 1 )
''')


def patch_farm(root: Path) -> None:
    path = root / "areas" / "Farm.gd"
    text = path.read_text(encoding="utf-8")
    if "_enhanced_end_of_day()" not in text:
        text = text.replace("\n#change the tile the player has swung their hammer towards", "\n\t_enhanced_end_of_day()\n\n#change the tile the player has swung their hammer towards", 1)
    patches = {
        "swing_hoe": 'if not EquipmentSystem.use_equipment("hoe", 3): return',
        "water_square": 'if not EquipmentSystem.use_equipment("watering_can", 2): return',
        "smash_hammer": 'if not EquipmentSystem.use_equipment("hammer", 3): return',
        "swing_axe": 'if not EquipmentSystem.use_equipment("axe", 3): return',
        "swing_sickle": 'if not EquipmentSystem.use_equipment("sickle", 2): return',
    }
    for fn, line in patches.items(): text = replace_func(text, fn, line)
    if "func _enhanced_end_of_day():" not in text:
        text += r'''

func _enhanced_current_weather():
    var rain = get_node_or_null("Player/Rain")
    if rain and rain.emitting: return "rain"
    return "sunny"

func _enhanced_end_of_day():
    var weather = _enhanced_current_weather()
    PestSystem.daily_check(self)
    AnimalSystem.daily_update(weather)
    StaffSystem.pay_daily_wages()
    StaffSystem.execute_auto_actions(self)
    EquipmentSystem.daily_decay()
    EconomySystem.end_of_day()
    if OS.has_feature("web") or OS.has_feature("HTML5"):
        WebSaveManager.save_game("auto")

func use_harvester(pos, orientation):
    if not EquipmentSystem.use_equipment("harvester", 8): return
    EconomySystem.add_money(25, "Serviço de colheita")

func use_pesticide_sprayer(pos, orientation):
    if not EquipmentSystem.use_equipment("pesticide_sprayer", 4): return
'''
    path.write_text(text, encoding="utf-8")


def patch_game_manager(root: Path) -> None:
    path = root / "save_load" / "GameManager.gd"
    text = path.read_text(encoding="utf-8")
    save_block = '''\n\t#enhanced systems\n\tsaveDictionary["economy"] = EconomySystem.get_save_data()\n\tsaveDictionary["equipment"] = EquipmentSystem.get_save_data()\n\tsaveDictionary["staff"] = StaffSystem.get_save_data()\n\tsaveDictionary["animals"] = AnimalSystem.get_save_data()\n\tsaveDictionary["pests"] = PestSystem.get_save_data()\n\tsaveDictionary["farm_upgrades"] = FarmUpgradeSystem.get_save_data()\n'''
    if 'saveDictionary["economy"]' not in text:
        text = text.replace("\n\t#convert the dictionary to a string\n", save_block + "\n\t#convert the dictionary to a string\n", 1)
    load_block = '''\n\t#load enhanced systems with old-save compatibility\n\tif dict.has("economy"): EconomySystem.load_save_data(dict["economy"])\n\tif dict.has("equipment"): EquipmentSystem.load_save_data(dict["equipment"])\n\tif dict.has("staff"): StaffSystem.load_save_data(dict["staff"])\n\tif dict.has("animals"): AnimalSystem.load_save_data(dict["animals"])\n\tif dict.has("pests"): PestSystem.load_save_data(dict["pests"])\n\tif dict.has("farm_upgrades"): FarmUpgradeSystem.load_save_data(dict["farm_upgrades"])\n'''
    if 'load enhanced systems' not in text:
        text = text.replace("\tvar dict = parse_json(loadFile.get_line())\n", "\tvar dict = parse_json(loadFile.get_line())\n" + load_block, 1)
    path.write_text(text, encoding="utf-8")


def patch_player(root: Path) -> None:
    path = root / "player" / "Player.gd"
    text = path.read_text(encoding="utf-8")
    if "EnhancedHUDScene" not in text:
        text = text.replace("extends KinematicBody2D\n", "extends KinematicBody2D\n\nconst EnhancedHUDScene = preload(\"res://ui/enhanced/EnhancedHUD.tscn\")\n", 1)
    if "_install_enhanced_hud()" not in text:
        text = text.replace("\tget_node(\"UI/Dashboard/TimeManager\").connect(\"sleep\", self, \"_force_sleep\")", "\tget_node(\"UI/Dashboard/TimeManager\").connect(\"sleep\", self, \"_force_sleep\")\n\t_install_enhanced_hud()", 1)
    if "func _install_enhanced_hud():" not in text:
        text += r'''

func _install_enhanced_hud():
    var ui = get_node_or_null("UI")
    if ui and not ui.has_node("EnhancedHUD"):
        var hud = EnhancedHUDScene.instance()
        hud.name = "EnhancedHUD"
        ui.add_child(hud)
'''
    path.write_text(text, encoding="utf-8")


def write_pwa(root: Path) -> None:
    write_file(root / "pwa" / "manifest.json", '{"name":"AgroFarm Classic","short_name":"AgroFarm","display":"fullscreen","orientation":"landscape","start_url":"./","scope":"./","background_color":"#07130b","theme_color":"#07130b","icons":[]}')
    write_file(root / "pwa" / "sw.js", "self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{});")
    preset = root / "export_presets.cfg"
    if preset.exists():
        text = preset.read_text(encoding="utf-8")
        head = '<link rel="manifest" href="manifest.json"><script>if("serviceWorker" in navigator){navigator.serviceWorker.register("sw.js").catch(()=>{});}</script>'
        escaped = head.replace('\\', '\\\\').replace('"', '\\"')
        text = re.sub(r'html/head_include=".*?"', f'html/head_include="{escaped}"', text, count=1)
        preset.write_text(text, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Aplica sistemas enhanced Harvest Moon/AgroFarm")
    parser.add_argument("project", type=Path)
    root = parser.parse_args().project.resolve()
    write_singletons(root)
    write_enhanced_ui(root)
    patch_project(root)
    patch_farm(root)
    patch_game_manager(root)
    patch_player(root)
    write_pwa(root)
    print(f"Sistemas enhanced aplicados em {root}")

if __name__ == "__main__":
    main()
