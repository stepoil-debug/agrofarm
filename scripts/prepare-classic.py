#!/usr/bin/env python3
from __future__ import annotations

import argparse
import shutil
import subprocess
from pathlib import Path


def replace(root: Path, relative_path: str, old: str, new: str, count: int = -1) -> None:
    path = root / relative_path
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"Trecho não encontrado em {relative_path}: {old[:100]!r}")
    path.write_text(text.replace(old, new, count), encoding="utf-8")


def convert_music(root: Path) -> None:
    music = root / "sound" / "music"
    for name in ("farm", "forceSleep", "house", "rain", "titleScreen", "town"):
        source = music / f"{name}.wav"
        target = music / f"{name}.ogg"
        if not source.exists():
            raise FileNotFoundError(source)
        subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                str(source),
                "-c:a",
                "libvorbis",
                "-q:a",
                "3",
                str(target),
            ],
            check=True,
        )
        source.unlink()
        source.with_suffix(source.suffix + ".import").unlink(missing_ok=True)


def configure_project(root: Path) -> None:
    import_cache = root / ".import"
    if import_cache.exists():
        shutil.rmtree(import_cache)

    splash_dir = root / "Boot Splash and Icon"
    for filename in (
        "Harvest Moon Boot Splash.png",
        "Harvest Moon Boot Splash.png.import",
        "Harvest Moon Boot Splash Test.png.import",
        "rcedit-x64.exe",
    ):
        (splash_dir / filename).unlink(missing_ok=True)

    project = root / "project.godot"
    text = project.read_text(encoding="utf-8")
    text = text.replace('config/name="Harvest Moon 2.0"', 'config/name="AgroFarm Classic"')
    text = text.replace('boot_splash/image="res://Boot Splash and Icon/Harvest Moon Boot Splash.png"\n', "")
    text = text.replace(
        'GameManager="*res://save_load/GameManager.gd"',
        'GameManager="*res://save_load/GameManager.gd"\nAgroFarmConfig="*res://config/AgroFarmConfig.gd"',
    )
    text = text.replace("window/size/width=1366", "window/size/width=1280")
    text = text.replace("window/size/height=768", "window/size/height=720")
    text = text.replace(
        'window/stretch/mode="viewport"',
        'window/stretch/mode="viewport"\nwindow/stretch/aspect="keep"\nwindow/handheld/orientation="landscape"',
    )
    text += (
        "\n[input_devices]\n\n"
        "pointing/emulate_touch_from_mouse=true\n"
        "pointing/emulate_mouse_from_touch=true\n"
    )
    project.write_text(text, encoding="utf-8")

    config_dir = root / "config"
    config_dir.mkdir(exist_ok=True)
    (config_dir / "AgroFarmConfig.gd").write_text(
        '''extends Node

const GAME_TITLE = "AgroFarm Classic"
const STARTING_COINS = 100
const INITIAL_STORAGE_CAPACITY = 10

const ITEM_DISPLAY_NAMES = {
    "Gold": "moedas",
    "TurnipSeeds": "sementes de milho",
    "StrawberrySeeds": "mudas de mandioca",
    "EggplantSeeds": "mudas de abacaxi",
    "Turnip": "milho",
    "Strawberry": "mandioca",
    "Eggplant": "abacaxi",
    "Watering Can": "regador",
    "Hoe": "enxada",
    "Axe": "machado",
    "Hammer": "martelo",
    "Sickle": "foice"
}

const CROP_CONFIG = {
    "Turnip": {"display_name": "Milho", "free_duration_seconds": 34, "realistic_duration_seconds": 7200, "seed_cost": 2, "base_sale": 3},
    "Strawberry": {"display_name": "Mandioca", "free_duration_seconds": 46, "realistic_duration_seconds": 14400, "seed_cost": 4, "base_sale": 6},
    "Eggplant": {"display_name": "Abacaxi", "free_duration_seconds": 64, "realistic_duration_seconds": 21600, "seed_cost": 7, "base_sale": 10}
}

const FARM_LEVELS = [
    {"level": 1, "upgrade_cost": 0, "margin_cap": 0.02},
    {"level": 2, "upgrade_cost": 150, "margin_cap": 0.04},
    {"level": 3, "upgrade_cost": 300, "margin_cap": 0.06},
    {"level": 4, "upgrade_cost": 600, "margin_cap": 0.08},
    {"level": 5, "upgrade_cost": 1000, "margin_cap": 0.10}
]

const EXPANSION_COSTS = [120, 250, 500, 900, 1500]

func get_item_display_name(item_id):
    return ITEM_DISPLAY_NAMES.get(item_id, item_id)
''',
        encoding="utf-8",
    )


def configure_audio_references(root: Path) -> None:
    for old, new in (
        ("farm.wav", "farm.ogg"),
        ("house.wav", "house.ogg"),
        ("town.wav", "town.ogg"),
        ("rain.wav", "rain.ogg"),
        ("forceSleep.wav", "forceSleep.ogg"),
    ):
        replace(root, "Game.tscn", f"res://sound/music/{old}", f"res://sound/music/{new}")
    replace(
        root,
        "menus/main/MainMenu.tscn",
        "res://sound/music/titleScreen.wav",
        "res://sound/music/titleScreen.ogg",
    )


def configure_main_menu(root: Path) -> None:
    menu = root / "menus" / "main" / "MainMenu.tscn"
    text = menu.read_text(encoding="utf-8")
    translations = {
        'text = "New Game"': 'text = "Novo jogo"',
        'text = "Load Game"': 'text = "Carregar jogo"',
        'text = "Controls"': 'text = "Controles"',
        'text = "Graphics"': 'text = "Gráficos"',
        'text = "Quit to Desktop"': 'text = "Sair"',
    }
    for old, new in translations.items():
        if old not in text:
            raise RuntimeError(f"Texto do menu não encontrado: {old}")
        text = text.replace(old, new)

    marker = '[node name="Buttons" type="VBoxContainer" parent="." index="1"]'
    title_node = '''[node name="AgroFarmTitle" type="Label" parent="."]

anchor_left = 0.5
anchor_top = 0.12
anchor_right = 0.5
anchor_bottom = 0.12
margin_left = -260.0
margin_top = -35.0
margin_right = 260.0
margin_bottom = 35.0
text = "AGROFARM CLASSIC"
align = 1
valign = 1

'''
    if marker not in text:
        raise RuntimeError("Container do menu principal não encontrado")
    menu.write_text(text.replace(marker, title_node + marker, 1), encoding="utf-8")


def configure_economy(root: Path) -> None:
    replace(
        root,
        "menus/shop/Buy/Buy.gd",
        'const buyableItems = {"Sickle":50, "Axe":200, "Hammer":500, "TurnipSeeds":5, "StrawberrySeeds":10, "EggplantSeeds":20}',
        'const buyableItems = {"Sickle":50, "Axe":120, "Hammer":140, "TurnipSeeds":2, "StrawberrySeeds":4, "EggplantSeeds":7}',
    )
    replace(
        root,
        "menus/shop/Sell/Sell.gd",
        'const sellableItems = {"Sickle":10, "Axe":50, "Hammer":150, "Turnip":10, "Strawberry":20, "Eggplant":45, "TurnipSeeds":1, "StrawberrySeeds":2, "EggplantSeeds":5}',
        'const sellableItems = {"Sickle":10, "Axe":50, "Hammer":60, "Turnip":3, "Strawberry":6, "Eggplant":10, "TurnipSeeds":1, "StrawberrySeeds":1, "EggplantSeeds":2}',
    )

    sell = root / "menus" / "shop" / "Sell" / "Sell.gd"
    text = sell.read_text(encoding="utf-8")
    start_marker = '\tYou_Currently_Have.get("custom_fonts/font").size = 100'
    end_marker = "\n#updates the amount and total cost labels"
    start = text.find(start_marker)
    end = text.find(end_marker, start)
    if start < 0 or end < 0:
        raise RuntimeError("Bloco de descrição de venda não encontrado")
    replacement = '''\tYou_Currently_Have.get("custom_fonts/font").size = 80
\tvar item_id = currentItems.keys()[indicator_position-1]
\tvar number = Inventory.get_amount(item_id)
\tvar display_name = AgroFarmConfig.get_item_display_name(item_id)
\tYou_Currently_Have.set_text(str(number) + " " + display_name)
'''
    sell.write_text(text[:start] + replacement + text[end:], encoding="utf-8")

    replace(
        root,
        "ui/inventory/Inventory.gd",
        'var stacked_items = {"StrawberrySeeds":18, "Gold":10}',
        'var stacked_items = {"TurnipSeeds":9, "Gold":100}',
    )
    replace(
        root,
        "ui/inventory/Inventory.tscn",
        "res://ui/inventory/tools and items/StrawberrySeeds.png",
        "res://ui/inventory/tools and items/TurnipSeeds.png",
    )
    replace(root, "ui/inventory/Inventory.tscn", 'text = "18"', 'text = "9"', 1)
    replace(root, "ui/inventory/Inventory.tscn", 'text = "10"', 'text = "100"', 1)


def configure_export(root: Path) -> None:
    (root / "export_presets.cfg").write_text(
        '''[preset.0]

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
html/head_include=""
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
''',
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("project", type=Path)
    args = parser.parse_args()
    root = args.project.resolve()
    if not (root / "project.godot").exists():
        raise FileNotFoundError(root / "project.godot")

    convert_music(root)
    configure_project(root)
    configure_audio_references(root)
    configure_main_menu(root)
    configure_economy(root)
    configure_export(root)
    print(f"AgroFarm Classic preparado em: {root}")


if __name__ == "__main__":
    main()
