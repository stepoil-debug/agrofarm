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
var player_name = ""
var gender = "masculino"
var profile_created = false

var structures = {
    "coop": {"name": "Galinheiro", "cost": 500, "owned": false},
    "stable": {"name": "Estabulo", "cost": 1200, "owned": false},
    "pigsty": {"name": "Chiqueiro", "cost": 800, "owned": false},
    "silo": {"name": "Silo", "cost": 350, "owned": false},
    "barn": {"name": "Galpao", "cost": 700, "owned": false}
}

var start_screen
var game_screen
var name_input
var male_button
var female_button
var money_label
var day_label
var energy_label
var title_label
var mini_map
var plot_grid
var menu_panel
var content_panel
var toast_label

func _ready():
    rect_min_size = Vector2(960, 540)
    _init_plots()
    _load_game()
    _build_start_screen()
    _build_game_screen()
    if profile_created:
        _show_game()
    else:
        _show_start()
    _refresh_all()

func _init_plots():
    plots.clear()
    for i in range(MAX_PLOTS):
        plots.append({"unlocked": i < unlocked_plots, "crop": "", "stage": 0, "max_stage": 3, "watered": false, "pest": false})

func _button(text, min_size=Vector2(160, 52)):
    var b = Button.new()
    b.text = text
    b.rect_min_size = min_size
    return b

func _label(text, size=Vector2(200, 30), center=true):
    var l = Label.new()
    l.text = text
    l.rect_min_size = size
    if center:
        l.align = Label.ALIGN_CENTER
        l.valign = Label.VALIGN_CENTER
    return l

func _build_start_screen():
    start_screen = Control.new()
    start_screen.name = "StartScreen"
    start_screen.anchor_right = 1
    start_screen.anchor_bottom = 1
    add_child(start_screen)

    var bg = ColorRect.new()
    bg.color = Color(0.04, 0.18, 0.08, 1)
    bg.anchor_right = 1
    bg.anchor_bottom = 1
    start_screen.add_child(bg)

    var sky = ColorRect.new()
    sky.color = Color(0.24, 0.54, 0.88, 1)
    sky.anchor_right = 1
    sky.anchor_bottom = 0.42
    start_screen.add_child(sky)

    var field = ColorRect.new()
    field.color = Color(0.12, 0.42, 0.12, 1)
    field.anchor_top = 0.42
    field.anchor_right = 1
    field.anchor_bottom = 1
    start_screen.add_child(field)

    var title = Label.new()
    title.text = "AGRO FARM"
    title.anchor_left = 0.07
    title.anchor_top = 0.06
    title.anchor_right = 0.93
    title.anchor_bottom = 0.20
    title.align = Label.ALIGN_CENTER
    title.valign = Label.VALIGN_CENTER
    start_screen.add_child(title)

    var subtitle = Label.new()
    subtitle.text = "O JOGO DO PRODUTOR BRASILEIRO"
    subtitle.anchor_left = 0.07
    subtitle.anchor_top = 0.18
    subtitle.anchor_right = 0.93
    subtitle.anchor_bottom = 0.26
    subtitle.align = Label.ALIGN_CENTER
    subtitle.valign = Label.VALIGN_CENTER
    start_screen.add_child(subtitle)

    var setup = Panel.new()
    setup.anchor_left = 0.09
    setup.anchor_top = 0.30
    setup.anchor_right = 0.91
    setup.anchor_bottom = 0.92
    start_screen.add_child(setup)

    var box = VBoxContainer.new()
    box.anchor_left = 0.05
    box.anchor_top = 0.06
    box.anchor_right = 0.95
    box.anchor_bottom = 0.94
    box.add_constant_override("separation", 10)
    setup.add_child(box)

    var name_label = _label("Nome do personagem", Vector2(0, 30))
    box.add_child(name_label)

    name_input = LineEdit.new()
    name_input.placeholder_text = "Digite o nome do produtor"
    name_input.text = player_name
    name_input.max_length = 18
    name_input.rect_min_size = Vector2(0, 44)
    box.add_child(name_input)

    var choose = _label("Escolha o personagem", Vector2(0, 30))
    box.add_child(choose)

    var choices = HBoxContainer.new()
    choices.alignment = BoxContainer.ALIGN_CENTER
    choices.add_constant_override("separation", 16)
    choices.rect_min_size = Vector2(0, 120)
    box.add_child(choices)

    male_button = _button("MASCULINO\nProdutor", Vector2(210, 105))
    male_button.connect("pressed", self, "_select_gender", ["masculino"])
    choices.add_child(male_button)

    female_button = _button("FEMININO\nProdutora", Vector2(210, 105))
    female_button.connect("pressed", self, "_select_gender", ["feminino"])
    choices.add_child(female_button)

    var start = _button("COMEÇAR FAZENDA", Vector2(0, 54))
    start.connect("pressed", self, "_start_game")
    box.add_child(start)

    _update_gender_buttons()

func _build_game_screen():
    game_screen = Control.new()
    game_screen.name = "GameScreen"
    game_screen.anchor_right = 1
    game_screen.anchor_bottom = 1
    add_child(game_screen)

    var bg = ColorRect.new()
    bg.color = Color(0.10, 0.31, 0.11, 1)
    bg.anchor_right = 1
    bg.anchor_bottom = 1
    game_screen.add_child(bg)

    var road = ColorRect.new()
    road.color = Color(0.88, 0.71, 0.33, 1)
    road.anchor_left = 0.26
    road.anchor_top = 0.08
    road.anchor_right = 0.32
    road.anchor_bottom = 0.82
    game_screen.add_child(road)

    var road2 = ColorRect.new()
    road2.color = Color(0.88, 0.71, 0.33, 1)
    road2.anchor_left = 0.30
    road2.anchor_top = 0.57
    road2.anchor_right = 0.92
    road2.anchor_bottom = 0.66
    game_screen.add_child(road2)

    var top = Panel.new()
    top.anchor_right = 1
    top.margin_bottom = 64
    game_screen.add_child(top)

    var map_btn = _button("MAPA", Vector2(130, 52))
    map_btn.anchor_left = 0.02
    map_btn.anchor_top = 0.10
    map_btn.anchor_right = 0.16
    map_btn.anchor_bottom = 0.90
    map_btn.connect("pressed", self, "_open_map")
    top.add_child(map_btn)

    title_label = Label.new()
    title_label.anchor_left = 0.28
    title_label.anchor_right = 0.72
    title_label.anchor_top = 0.02
    title_label.anchor_bottom = 0.98
    title_label.align = Label.ALIGN_CENTER
    title_label.valign = Label.VALIGN_CENTER
    top.add_child(title_label)

    var menu_btn = _button("MENU", Vector2(130, 52))
    menu_btn.anchor_left = 0.82
    menu_btn.anchor_top = 0.10
    menu_btn.anchor_right = 0.98
    menu_btn.anchor_bottom = 0.90
    menu_btn.connect("pressed", self, "_toggle_menu")
    top.add_child(menu_btn)

    mini_map = Panel.new()
    mini_map.name = "MiniMap"
    mini_map.anchor_left = 0.02
    mini_map.anchor_top = 0.14
    mini_map.anchor_right = 0.25
    mini_map.anchor_bottom = 0.44
    game_screen.add_child(mini_map)
    _build_mini_map_contents()

    plot_grid = GridContainer.new()
    plot_grid.columns = 6
    plot_grid.anchor_left = 0.30
    plot_grid.anchor_top = 0.18
    plot_grid.anchor_right = 0.94
    plot_grid.anchor_bottom = 0.76
    plot_grid.add_constant_override("hseparation", 8)
    plot_grid.add_constant_override("vseparation", 8)
    game_screen.add_child(plot_grid)

    var actions = HBoxContainer.new()
    actions.anchor_left = 0.20
    actions.anchor_top = 0.84
    actions.anchor_right = 0.86
    actions.anchor_bottom = 0.97
    actions.alignment = BoxContainer.ALIGN_CENTER
    actions.add_constant_override("separation", 12)
    game_screen.add_child(actions)
    _add_action_button(actions, "LOTES", "_open_lots")
    _add_action_button(actions, "CONSTRUIR", "_open_structures")
    _add_action_button(actions, "ANIMAIS", "_open_animals")
    _add_action_button(actions, "DORMIR", "_sleep_day")

    money_label = Label.new()
    money_label.anchor_left = 0.02
    money_label.anchor_top = 0.78
    money_label.anchor_right = 0.26
    money_label.anchor_bottom = 0.84
    money_label.align = Label.ALIGN_CENTER
    game_screen.add_child(money_label)

    day_label = Label.new()
    day_label.anchor_left = 0.02
    day_label.anchor_top = 0.84
    day_label.anchor_right = 0.26
    day_label.anchor_bottom = 0.90
    day_label.align = Label.ALIGN_CENTER
    game_screen.add_child(day_label)

    energy_label = Label.new()
    energy_label.anchor_left = 0.02
    energy_label.anchor_top = 0.90
    energy_label.anchor_right = 0.26
    energy_label.anchor_bottom = 0.96
    energy_label.align = Label.ALIGN_CENTER
    game_screen.add_child(energy_label)

    menu_panel = Panel.new()
    menu_panel.anchor_left = 0.62
    menu_panel.anchor_top = 0.12
    menu_panel.anchor_right = 0.96
    menu_panel.anchor_bottom = 0.80
    menu_panel.visible = false
    game_screen.add_child(menu_panel)
    _build_menu_panel()

    content_panel = Panel.new()
    content_panel.anchor_left = 0.08
    content_panel.anchor_top = 0.10
    content_panel.anchor_right = 0.92
    content_panel.anchor_bottom = 0.82
    content_panel.visible = false
    game_screen.add_child(content_panel)

    toast_label = Label.new()
    toast_label.anchor_left = 0.22
    toast_label.anchor_top = 0.72
    toast_label.anchor_right = 0.86
    toast_label.anchor_bottom = 0.82
    toast_label.align = Label.ALIGN_CENTER
    toast_label.valign = Label.VALIGN_CENTER
    toast_label.visible = false
    game_screen.add_child(toast_label)

func _add_action_button(parent, text, method):
    var b = _button(text, Vector2(150, 58))
    b.connect("pressed", self, method)
    parent.add_child(b)

func _build_menu_panel():
    var box = VBoxContainer.new()
    box.anchor_left = 0.06
    box.anchor_top = 0.06
    box.anchor_right = 0.94
    box.anchor_bottom = 0.94
    box.add_constant_override("separation", 10)
    menu_panel.add_child(box)
    _add_menu_button(box, "LOTES", "_open_lots")
    _add_menu_button(box, "CONSTRUCOES", "_open_structures")
    _add_menu_button(box, "ANIMAIS", "_open_animals")
    _add_menu_button(box, "MAPA", "_open_map")
    _add_menu_button(box, "SALVAR", "_save_game")
    _add_menu_button(box, "TROCAR PERSONAGEM", "_back_to_start")
    _add_menu_button(box, "FECHAR", "_close_panels")

func _add_menu_button(parent, text, method):
    var b = _button(text, Vector2(0, 44))
    b.connect("pressed", self, method)
    parent.add_child(b)

func _build_mini_map_contents():
    _clear_children(mini_map)
    var bg = ColorRect.new()
    bg.color = Color(0.02, 0.10, 0.04, 1)
    bg.anchor_right = 1
    bg.anchor_bottom = 1
    mini_map.add_child(bg)

    _rect(mini_map, 0.08, 0.10, 0.58, 0.58, Color(0.14, 0.45, 0.15, 1))
    _rect(mini_map, 0.59, 0.10, 0.70, 0.90, Color(0.86, 0.70, 0.32, 1))
    _rect(mini_map, 0.10, 0.62, 0.92, 0.72, Color(0.86, 0.70, 0.32, 1))
    _rect(mini_map, 0.73, 0.18, 0.94, 0.48, Color(0.20, 0.20, 0.36, 1))

    var farm = _label("CAMPO", Vector2(80, 20))
    farm.anchor_left = 0.10
    farm.anchor_top = 0.12
    farm.anchor_right = 0.55
    farm.anchor_bottom = 0.28
    mini_map.add_child(farm)

    var city = _label("LOJA", Vector2(80, 20))
    city.anchor_left = 0.72
    city.anchor_top = 0.20
    city.anchor_right = 0.96
    city.anchor_bottom = 0.36
    mini_map.add_child(city)

    var player = _label("EU", Vector2(34, 22))
    player.anchor_left = 0.34
    player.anchor_top = 0.44
    player.anchor_right = 0.50
    player.anchor_bottom = 0.60
    mini_map.add_child(player)

func _rect(parent, l, t, r, b, color):
    var cr = ColorRect.new()
    cr.color = color
    cr.anchor_left = l
    cr.anchor_top = t
    cr.anchor_right = r
    cr.anchor_bottom = b
    parent.add_child(cr)
    return cr

func _toggle_menu():
    menu_panel.visible = not menu_panel.visible
    content_panel.visible = false

func _show_start():
    start_screen.visible = true
    game_screen.visible = false

func _show_game():
    start_screen.visible = false
    game_screen.visible = true
    _refresh_all()

func _select_gender(value):
    gender = value
    _update_gender_buttons()

func _update_gender_buttons():
    if male_button == null or female_button == null:
        return
    male_button.text = ("[X] MASCULINO\nProdutor" if gender == "masculino" else "MASCULINO\nProdutor")
    female_button.text = ("[X] FEMININO\nProdutora" if gender == "feminino" else "FEMININO\nProdutora")

func _start_game():
    var typed = name_input.text.strip_edges()
    if typed == "":
        _toast_start("Digite o nome do personagem")
        return
    player_name = typed
    profile_created = true
    _save_game(false)
    _show_game()

func _back_to_start():
    _close_panels()
    if name_input != null:
        name_input.text = player_name
    _show_start()

func _close_panels():
    menu_panel.visible = false
    content_panel.visible = false

func _clear_children(node):
    for c in node.get_children():
        node.remove_child(c)
        c.queue_free()

func _clear_content():
    _clear_children(content_panel)
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
    var title = _label("LOTES DE PLANTACAO - " + str(unlocked_plots) + "/" + str(MAX_PLOTS), Vector2(0, 34))
    box.add_child(title)
    _build_plot_grid(box)
    var expand = _button("EXPANDIR CAMPO  $" + str(_expand_price()), Vector2(0, 44))
    expand.disabled = unlocked_plots >= MAX_PLOTS
    expand.connect("pressed", self, "_expand_plot")
    box.add_child(expand)

func _build_plot_grid(parent):
    var grid = GridContainer.new()
    grid.columns = 6
    grid.rect_min_size = Vector2(0, 250)
    grid.add_constant_override("hseparation", 6)
    grid.add_constant_override("vseparation", 6)
    parent.add_child(grid)
    for i in range(MAX_PLOTS):
        var btn = _button(_plot_text(i), Vector2(84, 42))
        btn.disabled = not plots[i]["unlocked"]
        btn.connect("pressed", self, "_plot_pressed", [i])
        grid.add_child(btn)

func _plot_text(i):
    var p = plots[i]
    if not p["unlocked"]:
        return "BLOQ " + str(i + 1)
    if p["crop"] == "":
        return "VAZIO " + str(i + 1)
    if p["stage"] >= p["max_stage"]:
        return "COLHER"
    var txt = str(int(float(p["stage"]) / float(p["max_stage"]) * 100)) + "%"
    if p["watered"]:
        txt += " AGUA"
    return txt

func _plot_pressed(i):
    var p = plots[i]
    if p["crop"] == "":
        if _spend(8, "Semente"):
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
    return int(120 * pow(1.35, unlocked_plots - INITIAL_PLOTS))

func _expand_plot():
    if unlocked_plots >= MAX_PLOTS:
        _toast("Todos os lotes ja foram liberados")
        return
    var price = _expand_price()
    if _spend(price, "Expansao"):
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
    box.add_child(_label("CONSTRUCOES", Vector2(0, 38)))
    for id in structures.keys():
        var s = structures[id]
        var b = _button(s["name"] + ("  OK" if s["owned"] else "  $" + str(s["cost"])), Vector2(0, 45))
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
    box.add_child(_label("ANIMAIS - " + str(animals.size()), Vector2(0, 38)))
    _animal_button(box, "Galinha", 300, "coop")
    _animal_button(box, "Vaca", 1500, "stable")
    _animal_button(box, "Porco", 900, "pigsty")
    for a in animals:
        box.add_child(_label(a["name"] + " - producao diaria", Vector2(0, 28), false))

func _animal_button(parent, name, price, required):
    var b = _button("", Vector2(0, 44))
    if not structures[required]["owned"]:
        b.text = name + " - precisa de " + structures[required]["name"]
        b.disabled = true
    else:
        b.text = "Comprar " + name + "  $" + str(price)
        b.connect("pressed", self, "_buy_animal", [name, price])
    parent.add_child(b)

func _buy_animal(name, price):
    if _spend(price, "Animal: " + name):
        animals.append({"name": name + " " + str(animals.size() + 1)})
        _toast(name + " comprado")
    _refresh_all()
    _open_animals()

func _open_map():
    _clear_content()
    var big = Panel.new()
    big.anchor_left = 0.05
    big.anchor_top = 0.08
    big.anchor_right = 0.95
    big.anchor_bottom = 0.90
    content_panel.add_child(big)
    _build_big_map(big)

func _build_big_map(parent):
    _rect(parent, 0.04, 0.10, 0.54, 0.62, Color(0.14, 0.45, 0.15, 1))
    _rect(parent, 0.55, 0.08, 0.65, 0.92, Color(0.86, 0.70, 0.32, 1))
    _rect(parent, 0.07, 0.64, 0.92, 0.74, Color(0.86, 0.70, 0.32, 1))
    _rect(parent, 0.68, 0.14, 0.95, 0.48, Color(0.20, 0.20, 0.36, 1))
    _map_label(parent, "FAZENDA", 0.13, 0.20, 0.45, 0.30)
    _map_label(parent, "LOJA / CIDADE", 0.70, 0.22, 0.94, 0.32)
    _map_label(parent, player_name, 0.32, 0.47, 0.47, 0.55)
    _map_label(parent, "RIO / FLORESTA EM BREVE", 0.13, 0.80, 0.72, 0.90)

func _map_label(parent, text, l, t, r, b):
    var lb = _label(text, Vector2(120, 24))
    lb.anchor_left = l
    lb.anchor_top = t
    lb.anchor_right = r
    lb.anchor_bottom = b
    parent.add_child(lb)

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
        _toast("Producao dos animais: +$" + str(animals.size() * 10))
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
    if title_label != null:
        title_label.text = "FAZENDA\n" + (player_name if player_name != "" else "NOVO PRODUTOR")
    if money_label != null:
        money_label.text = "$" + str(money)
    if day_label != null:
        day_label.text = "Dia " + str(day)
    if energy_label != null:
        energy_label.text = "Energia " + str(energy) + "%"
    if plot_grid != null:
        _clear_children(plot_grid)
        for i in range(MAX_PLOTS):
            var btn = _button(_plot_text(i), Vector2(88, 44))
            btn.disabled = not plots[i]["unlocked"]
            btn.connect("pressed", self, "_plot_pressed", [i])
            plot_grid.add_child(btn)
    if mini_map != null:
        _build_mini_map_contents()

func _toast(msg):
    if toast_label == null:
        return
    toast_label.text = msg
    toast_label.visible = true
    var timer = get_tree().create_timer(1.8)
    yield(timer, "timeout")
    if toast_label != null:
        toast_label.visible = false

func _toast_start(msg):
    var l = Label.new()
    l.text = msg
    l.anchor_left = 0.25
    l.anchor_top = 0.88
    l.anchor_right = 0.75
    l.anchor_bottom = 0.96
    l.align = Label.ALIGN_CENTER
    start_screen.add_child(l)
    var timer = get_tree().create_timer(1.6)
    yield(timer, "timeout")
    if l != null:
        l.queue_free()

func _save_game(show=true):
    var data = {"money": money, "day": day, "energy": energy, "unlocked_plots": unlocked_plots, "plots": plots, "structures": structures, "animals": animals, "player_name": player_name, "gender": gender, "profile_created": profile_created}
    var f = File.new()
    if f.open(SAVE_PATH, File.WRITE) == OK:
        f.store_string(to_json(data))
        f.close()
        if show:
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
    player_name = str(data.get("player_name", player_name))
    gender = str(data.get("gender", gender))
    profile_created = bool(data.get("profile_created", player_name != ""))
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
