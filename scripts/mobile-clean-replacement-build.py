#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
from pathlib import Path


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")


MAIN_GD = r'''
extends Control

const SAVE_PATH = "user://agro_farm_mobile_clean.json"
const MAX_PLOTS = 36
const INITIAL_PLOTS = 4

var money = 2000
var day = 1
var energy = 100
var unlocked_plots = INITIAL_PLOTS
var plots = []
var animals = []
var structures = {
    "coop": {"name": "Galinheiro", "cost": 500, "owned": false, "emoji": "🐔"},
    "stable": {"name": "Estábulo", "cost": 1200, "owned": false, "emoji": "🐄"},
    "pigsty": {"name": "Chiqueiro", "cost": 800, "owned": false, "emoji": "🐷"},
    "silo": {"name": "Silo", "cost": 350, "owned": false, "emoji": "🌾"},
    "barn": {"name": "Galpão", "cost": 700, "owned": false, "emoji": "🏚️"}
}

var money_label
var day_label
var energy_label
var title_label
var mini_map
var menu_panel
var content_panel
var toast_label

func _ready():
    rect_min_size = Vector2(960, 540)
    _init_plots()
    _load_game()
    _build_ui()
    _refresh_all()

func _init_plots():
    plots.clear()
    for i in range(MAX_PLOTS):
        plots.append({"unlocked": i < unlocked_plots, "crop": "", "stage": 0, "max_stage": 3, "watered": false, "pest": false})

func _build_ui():
    var bg = ColorRect.new()
    bg.color = Color(0.08, 0.27, 0.10, 1)
    bg.anchor_right = 1
    bg.anchor_bottom = 1
    add_child(bg)

    var top = Panel.new()
    top.name = "TopBar"
    top.anchor_right = 1
    top.margin_bottom = 62
    add_child(top)

    money_label = Label.new()
    money_label.margin_left = 12
    money_label.margin_top = 8
    money_label.margin_right = 210
    money_label.margin_bottom = 32
    top.add_child(money_label)

    day_label = Label.new()
    day_label.margin_left = 12
    day_label.margin_top = 34
    day_label.margin_right = 210
    day_label.margin_bottom = 58
    top.add_child(day_label)

    energy_label = Label.new()
    energy_label.anchor_left = 0.38
    energy_label.anchor_right = 0.68
    energy_label.margin_top = 18
    energy_label.margin_bottom = 48
    energy_label.align = Label.ALIGN_CENTER
    top.add_child(energy_label)

    var menu_btn = Button.new()
    menu_btn.text = "☰ MENU"
    menu_btn.anchor_left = 0.84
    menu_btn.anchor_top = 0.12
    menu_btn.anchor_right = 0.98
    menu_btn.anchor_bottom = 0.88
    menu_btn.connect("pressed", self, "_toggle_menu")
    top.add_child(menu_btn)

    title_label = Label.new()
    title_label.anchor_left = 0.5
    title_label.anchor_top = 0.17
    title_label.anchor_right = 0.5
    title_label.anchor_bottom = 0.17
    title_label.margin_left = -320
    title_label.margin_top = -20
    title_label.margin_right = 320
    title_label.margin_bottom = 28
    title_label.align = Label.ALIGN_CENTER
    title_label.valign = Label.VALIGN_CENTER
    title_label.text = "🌾 AGRO FARM MOBILE"
    add_child(title_label)

    var hint = Label.new()
    hint.anchor_left = 0.5
    hint.anchor_top = 0.28
    hint.anchor_right = 0.5
    hint.anchor_bottom = 0.28
    hint.margin_left = -360
    hint.margin_top = -20
    hint.margin_right = 360
    hint.margin_bottom = 44
    hint.align = Label.ALIGN_CENTER
    hint.valign = Label.VALIGN_CENTER
    hint.text = "Comece com 4 lotes. Compre expansões, construções e animais."
    add_child(hint)

    mini_map = Panel.new()
    mini_map.anchor_left = 0.78
    mini_map.anchor_top = 0.14
    mini_map.anchor_right = 0.98
    mini_map.anchor_bottom = 0.40
    add_child(mini_map)
    _build_mini_map_contents()

    var actions = HBoxContainer.new()
    actions.anchor_left = 0.18
    actions.anchor_top = 0.84
    actions.anchor_right = 0.82
    actions.anchor_bottom = 0.97
    actions.alignment = BoxContainer.ALIGN_CENTER
    actions.add_constant_override("separation", 12)
    add_child(actions)
    _add_action_button(actions, "🌾 LOTES", "_open_lots")
    _add_action_button(actions, "🏗️ CONSTRUIR", "_open_structures")
    _add_action_button(actions, "🐄 ANIMAIS", "_open_animals")
    _add_action_button(actions, "🌙 DORMIR", "_sleep_day")

    menu_panel = Panel.new()
    menu_panel.anchor_left = 0.22
    menu_panel.anchor_top = 0.12
    menu_panel.anchor_right = 0.78
    menu_panel.anchor_bottom = 0.86
    menu_panel.visible = false
    add_child(menu_panel)

    var menu_box = VBoxContainer.new()
    menu_box.anchor_left = 0.06
    menu_box.anchor_top = 0.06
    menu_box.anchor_right = 0.94
    menu_box.anchor_bottom = 0.94
    menu_box.add_constant_override("separation", 10)
    menu_panel.add_child(menu_box)
    _add_menu_button(menu_box, "🌾 LOTES", "_open_lots")
    _add_menu_button(menu_box, "🏗️ CONSTRUÇÕES", "_open_structures")
    _add_menu_button(menu_box, "🐄 ANIMAIS", "_open_animals")
    _add_menu_button(menu_box, "🗺️ MAPA", "_open_map")
    _add_menu_button(menu_box, "💾 SALVAR", "_save_game")
    _add_menu_button(menu_box, "FECHAR", "_close_panels")

    content_panel = Panel.new()
    content_panel.anchor_left = 0.06
    content_panel.anchor_top = 0.10
    content_panel.anchor_right = 0.94
    content_panel.anchor_bottom = 0.82
    content_panel.visible = false
    add_child(content_panel)

    toast_label = Label.new()
    toast_label.anchor_left = 0.18
    toast_label.anchor_top = 0.73
    toast_label.anchor_right = 0.82
    toast_label.anchor_bottom = 0.82
    toast_label.align = Label.ALIGN_CENTER
    toast_label.valign = Label.VALIGN_CENTER
    toast_label.visible = false
    add_child(toast_label)

func _add_action_button(parent, text, method):
    var b = Button.new()
    b.text = text
    b.rect_min_size = Vector2(150, 58)
    b.connect("pressed", self, method)
    parent.add_child(b)

func _add_menu_button(parent, text, method):
    var b = Button.new()
    b.text = text
    b.rect_min_size = Vector2(0, 46)
    b.connect("pressed", self, method)
    parent.add_child(b)

func _build_mini_map_contents():
    var farm = Label.new()
    farm.text = "🌾 FAZENDA"
    farm.anchor_left = 0.05
    farm.anchor_top = 0.10
    farm.anchor_right = 0.95
    farm.anchor_bottom = 0.35
    farm.align = Label.ALIGN_CENTER
    mini_map.add_child(farm)
    var road = Label.new()
    road.text = "┃  ESTRADA"
    road.anchor_left = 0.05
    road.anchor_top = 0.38
    road.anchor_right = 0.95
    road.anchor_bottom = 0.60
    road.align = Label.ALIGN_CENTER
    mini_map.add_child(road)
    var city = Label.new()
    city.text = "🏙️ CIDADE"
    city.anchor_left = 0.05
    city.anchor_top = 0.66
    city.anchor_right = 0.95
    city.anchor_bottom = 0.90
    city.align = Label.ALIGN_CENTER
    mini_map.add_child(city)

func _toggle_menu():
    menu_panel.visible = not menu_panel.visible
    content_panel.visible = false

func _close_panels():
    menu_panel.visible = false
    content_panel.visible = false

func _clear_content():
    for c in content_panel.get_children():
        c.queue_free()
    content_panel.visible = true
    menu_panel.visible = false

func _open_lots():
    _clear_content()
    var box = VBoxContainer.new()
    box.anchor_left = 0.04
    box.anchor_top = 0.04
    box.anchor_right = 0.96
    box.anchor_bottom = 0.96
    box.add_constant_override("separation", 8)
    content_panel.add_child(box)
    var title = Label.new()
    title.text = "🌾 LOTES DE PLANTAÇÃO — " + str(unlocked_plots) + "/" + str(MAX_PLOTS)
    title.align = Label.ALIGN_CENTER
    title.rect_min_size = Vector2(0, 34)
    box.add_child(title)
    var grid = GridContainer.new()
    grid.columns = 6
    grid.rect_min_size = Vector2(0, 250)
    grid.add_constant_override("hseparation", 6)
    grid.add_constant_override("vseparation", 6)
    box.add_child(grid)
    for i in range(MAX_PLOTS):
        var btn = Button.new()
        btn.rect_min_size = Vector2(84, 42)
        btn.text = _plot_text(i)
        btn.disabled = not plots[i]["unlocked"]
        btn.connect("pressed", self, "_plot_pressed", [i])
        grid.add_child(btn)
    var expand = Button.new()
    expand.text = "➕ EXPANDIR CAMPO  $" + str(_expand_price())
    expand.disabled = unlocked_plots >= MAX_PLOTS
    expand.rect_min_size = Vector2(0, 44)
    expand.connect("pressed", self, "_expand_plot")
    box.add_child(expand)

func _plot_text(i):
    var p = plots[i]
    if not p["unlocked"]:
        return "🔒 " + str(i + 1)
    if p["crop"] == "":
        return "🌱 " + str(i + 1)
    if p["stage"] >= p["max_stage"]:
        return "✅ " + p["crop"]
    var txt = str(int(float(p["stage"]) / float(p["max_stage"]) * 100)) + "%"
    if p["watered"]:
        txt += "💧"
    return txt

func _plot_pressed(i):
    var p = plots[i]
    if p["crop"] == "":
        if _spend(8, "Semente de milho"):
            p["crop"] = "Milho"
            p["stage"] = 0
            p["watered"] = false
            _toast("Milho plantado no lote " + str(i + 1))
    elif p["stage"] >= p["max_stage"]:
        money += 25
        p["crop"] = ""
        p["stage"] = 0
        p["watered"] = false
        _toast("Colheita vendida: +$25")
    else:
        p["watered"] = true
        _toast("Lote molhado")
    _refresh_all()
    _open_lots()

func _expand_price():
    return int(500 * pow(1.5, unlocked_plots - INITIAL_PLOTS))

func _expand_plot():
    if unlocked_plots >= MAX_PLOTS:
        _toast("Todos os lotes já foram liberados")
        return
    var price = _expand_price()
    if _spend(price, "Expansão de campo"):
        plots[unlocked_plots]["unlocked"] = true
        unlocked_plots += 1
        _toast("Novo lote liberado")
    _refresh_all()
    _open_lots()

func _open_structures():
    _clear_content()
    var box = VBoxContainer.new()
    box.anchor_left = 0.05
    box.anchor_top = 0.06
    box.anchor_right = 0.95
    box.anchor_bottom = 0.94
    box.add_constant_override("separation", 8)
    content_panel.add_child(box)
    var title = Label.new()
    title.text = "🏗️ CONSTRUÇÕES"
    title.align = Label.ALIGN_CENTER
    title.rect_min_size = Vector2(0, 38)
    box.add_child(title)
    for id in structures.keys():
        var s = structures[id]
        var b = Button.new()
        b.rect_min_size = Vector2(0, 45)
        b.text = s["emoji"] + " " + s["name"] + ("  ✅" if s["owned"] else "  $" + str(s["cost"]))
        b.disabled = s["owned"]
        b.connect("pressed", self, "_buy_structure", [id])
        box.add_child(b)

func _buy_structure(id):
    var s = structures[id]
    if _spend(s["cost"], s["name"]):
        s["owned"] = true
        _toast(s["name"] + " comprado")
    _refresh_all()
    _open_structures()

func _open_animals():
    _clear_content()
    var box = VBoxContainer.new()
    box.anchor_left = 0.05
    box.anchor_top = 0.06
    box.anchor_right = 0.95
    box.anchor_bottom = 0.94
    box.add_constant_override("separation", 8)
    content_panel.add_child(box)
    var title = Label.new()
    title.text = "🐄 ANIMAIS — " + str(animals.size())
    title.align = Label.ALIGN_CENTER
    title.rect_min_size = Vector2(0, 38)
    box.add_child(title)
    _animal_button(box, "Galinha", 300, "coop", "🐔")
    _animal_button(box, "Vaca", 1500, "stable", "🐄")
    _animal_button(box, "Porco", 900, "pigsty", "🐷")
    for a in animals:
        var l = Label.new()
        l.text = a["emoji"] + " " + a["name"] + " — produção diária"
        l.rect_min_size = Vector2(0, 28)
        box.add_child(l)

func _animal_button(parent, name, price, required, emoji):
    var b = Button.new()
    b.rect_min_size = Vector2(0, 44)
    if not structures[required]["owned"]:
        b.text = emoji + " " + name + " — precisa de " + structures[required]["name"]
        b.disabled = true
    else:
        b.text = emoji + " Comprar " + name + "  $" + str(price)
        b.connect("pressed", self, "_buy_animal", [name, price, emoji])
    parent.add_child(b)

func _buy_animal(name, price, emoji):
    if _spend(price, "Animal: " + name):
        animals.append({"name": name + " " + str(animals.size() + 1), "emoji": emoji})
        _toast(name + " comprado")
    _refresh_all()
    _open_animals()

func _open_map():
    _clear_content()
    var label = Label.new()
    label.anchor_left = 0.05
    label.anchor_top = 0.10
    label.anchor_right = 0.95
    label.anchor_bottom = 0.90
    label.align = Label.ALIGN_CENTER
    label.valign = Label.VALIGN_CENTER
    label.text = "🗺️ MAPA DO MUNDO\n\n🌾 Fazenda  →  🛤️ Estrada  →  🏙️ Cidade\n\nPróximas áreas: 🌲 Floresta, ⛰️ Montanha, 🌊 Rio"
    content_panel.add_child(label)

func _sleep_day():
    day += 1
    energy = 100
    for p in plots:
        if p["unlocked"] and p["crop"] != "":
            if p["watered"] and p["stage"] < p["max_stage"]:
                p["stage"] += 1
            p["watered"] = false
    if animals.size() > 0:
        money += animals.size() * 10
        _toast("Produção dos animais: +$" + str(animals.size() * 10))
    else:
        _toast("Novo dia")
    _refresh_all()

func _spend(amount, reason):
    amount = int(amount)
    if money < amount:
        _toast("Saldo insuficiente: $" + str(amount))
        return false
    money -= amount
    return true

func _refresh_all():
    money_label.text = "💰 $" + str(money)
    day_label.text = "📅 Dia " + str(day)
    energy_label.text = "⚡ Energia " + str(energy) + "%"

func _toast(msg):
    toast_label.text = msg
    toast_label.visible = true
    var timer = get_tree().create_timer(1.8)
    yield(timer, "timeout")
    toast_label.visible = false

func _save_game():
    var data = {"money": money, "day": day, "energy": energy, "unlocked_plots": unlocked_plots, "plots": plots, "structures": structures, "animals": animals}
    var f = File.new()
    if f.open(SAVE_PATH, File.WRITE) == OK:
        f.store_string(to_json(data))
        f.close()
        _toast("Jogo salvo")
    _close_panels()

func _load_game():
    var f = File.new()
    if not f.file_exists(SAVE_PATH):
        return
    if f.open(SAVE_PATH, File.READ) != OK:
        return
    var data = parse_json(f.get_as_text())
    f.close()
    if typeof(data) != TYPE_DICTIONARY:
        return
    money = int(data.get("money", money))
    day = int(data.get("day", day))
    energy = int(data.get("energy", energy))
    unlocked_plots = int(data.get("unlocked_plots", unlocked_plots))
    if data.has("plots"):
        plots = data["plots"]
    if data.has("structures"):
        structures = data["structures"]
    if data.has("animals"):
        animals = data["animals"]
'''

MAIN_TSCN = r'''
[gd_scene load_steps=2 format=2]
[ext_resource path="res://Main.gd" type="Script" id=1]
[node name="AgroFarmMobile" type="Control"]
anchor_right = 1.0
anchor_bottom = 1.0
script = ExtResource( 1 )
'''

PROJECT = r'''
; Engine configuration file.
config_version=4

[application]
config/name="Agro Farm Mobile"
run/main_scene="res://Main.tscn"

[display]
window/size/width=960
window/size/height=540
window/stretch/mode="2d"
window/stretch/aspect="expand"
window/handheld/orientation="sensor_landscape"

[input_devices]
pointing/emulate_touch_from_mouse=true
pointing/emulate_mouse_from_touch=true

[rendering]
quality/driver/driver_name="GLES2"
'''

EXPORT = r'''
[preset.0]
name="HTML5"
platform="HTML5"
runnable=true
custom_features=""
export_filter="all_resources"
include_filter=""
exclude_filter=""
patch_list=PoolStringArray(  )
script_export_mode=1
script_encryption_key=""

[preset.0.options]
vram_texture_compression/for_desktop=true
vram_texture_compression/for_mobile=false
html/export_icon=true
html/custom_html_shell=""
html/head_include="<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover\"><style>html,body{margin:0;overflow:hidden;background:#07130b;touch-action:none}canvas{width:100vw!important;height:100dvh!important;touch-action:none}</style>"
html/canvas_resize_policy=2
html/focus_canvas_on_start=true
html/experimental_virtual_keyboard=true
progressive_web_app/enabled=true
progressive_web_app/offline_page=""
progressive_web_app/display=1
progressive_web_app/orientation=3
progressive_web_app/icon_144x144=""
progressive_web_app/icon_180x180=""
progressive_web_app/icon_512x512=""
'''


def main() -> None:
    parser = argparse.ArgumentParser(description="Substitui o projeto antigo por um Agro Farm Mobile limpo")
    parser.add_argument("project", type=Path)
    root = parser.parse_args().project.resolve()
    if root.exists():
        shutil.rmtree(root)
    root.mkdir(parents=True, exist_ok=True)
    write(root / "Main.gd", MAIN_GD)
    write(root / "Main.tscn", MAIN_TSCN)
    write(root / "project.godot", PROJECT)
    write(root / "export_presets.cfg", EXPORT)
    write(root / "pwa/manifest.json", '{"name":"Agro Farm Mobile","short_name":"AgroFarm","display":"fullscreen","orientation":"landscape","start_url":"./","scope":"./","background_color":"#07130b","theme_color":"#07130b","icons":[]}')
    write(root / "pwa/sw.js", "self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{});")
    print(f"Projeto mobile limpo criado em: {root}")


if __name__ == "__main__":
    main()
