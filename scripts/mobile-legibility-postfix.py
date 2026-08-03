#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description="Corrige a quebra de linha do HUD mobile gerado")
    parser.add_argument("project", type=Path)
    args = parser.parse_args()

    path = args.project.resolve() / "mobile" / "MobileController.gd"
    text = path.read_text(encoding="utf-8")

    old = 'location_label.text = _zone_label(player.Zone.name) + "\n" + _target_description(current, target)'
    new = 'location_label.text = _zone_label(player.Zone.name) + "\\n" + _target_description(current, target)'
    if old not in text:
        raise RuntimeError("Quebra de linha invalida do HUD nao encontrada")

    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"Quebra de linha mobile corrigida em: {path}")


if __name__ == "__main__":
    main()
