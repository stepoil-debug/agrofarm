#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


def ensure_autoload(root: Path) -> None:
    project = root / "project.godot"
    text = project.read_text(encoding="utf-8")
    if 'AgroFarmConfig=' in text:
        return
    autoload_header = '[autoload]\n\n'
    line = 'AgroFarmConfig="*res://config/AgroFarmConfig.gd"\n'
    if autoload_header in text:
        text = text.replace(autoload_header, autoload_header + line, 1)
    else:
        text += '\n[autoload]\n\n' + line
    project.write_text(text, encoding="utf-8")


def safe_pest_system(root: Path) -> None:
    path = root / "singletons" / "PestSystem.gd"
    path.write_text(r'''
extends Node

signal pest_attack(cells)

var attacks = []

func daily_check(farm):
    if randi() % 8 != 0:
        return
    if farm == null:
        return
    if not farm.has_node("Crops"):
        return
    var crops = farm.get_node("Crops")
    var used = crops.get_used_cells()
    if used.size() == 0:
        return
    var hit = []
    for i in range(min(3, used.size())):
        var c = used[randi() % used.size()]
        crops.set_cellv(c, -1)
        hit.append(c)
    if hit.size() > 0:
        attacks.append(hit)
        emit_signal("pest_attack", hit)

func get_save_data():
    return {"attacks": attacks}

func load_save_data(data):
    attacks = data.get("attacks", [])
'''.strip() + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Corrige config/autoloads enhanced")
    parser.add_argument("project", type=Path)
    root = parser.parse_args().project.resolve()
    ensure_autoload(root)
    safe_pest_system(root)
    print(f"Config enhanced corrigida em {root}")


if __name__ == "__main__":
    main()
