#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
from pathlib import Path


HEAD_INCLUDE = r'''<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#07130b;touch-action:none;overscroll-behavior:none;-webkit-user-select:none;user-select:none}body{position:fixed;inset:0;display:flex;align-items:center;justify-content:center}canvas{display:block;width:100vw!important;height:100dvh!important;max-width:none!important;max-height:none!important;object-fit:contain;touch-action:none;background:#07130b}@media (orientation:portrait){body:before{content:"GIRE O CELULAR";position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;padding:48px;text-align:center;box-sizing:border-box;background:#07130b;color:#fff;font:800 38px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:1px;text-shadow:0 3px 0 #000}body:after{content:"O AgroFarm funciona deitado. Desative o bloqueio de rotacao e vire o aparelho.";position:fixed;left:34px;right:34px;top:58%;z-index:1000000;text-align:center;color:#d8f5dc;font:600 22px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}canvas{visibility:hidden}}@media (orientation:landscape){body:before,body:after{display:none!important}canvas{visibility:visible;width:100vw!important;height:100dvh!important}}</style>'''


def main() -> None:
    parser = argparse.ArgumentParser(description="Corrige texto, orientacao e preenchimento mobile")
    parser.add_argument("project", type=Path)
    args = parser.parse_args()
    root = args.project.resolve()

    controller = root / "mobile" / "MobileController.gd"
    text = controller.read_text(encoding="utf-8")
    old = 'location_label.text = _zone_label(player.Zone.name) + "\n" + _target_description(current, target)'
    new = 'location_label.text = _zone_label(player.Zone.name) + "\\n" + _target_description(current, target)'
    if old not in text:
        raise RuntimeError("Quebra de linha invalida do HUD nao encontrada")
    controller.write_text(text.replace(old, new, 1), encoding="utf-8")

    preset = root / "export_presets.cfg"
    preset_text = preset.read_text(encoding="utf-8")
    escaped = HEAD_INCLUDE.replace('\\', '\\\\').replace('"', '\\"')
    replacement = f'html/head_include="{escaped}"'
    preset_text, count = re.subn(r'html/head_include=".*?"', replacement, preset_text, count=1)
    if count != 1:
        raise RuntimeError("html/head_include nao encontrado")
    preset.write_text(preset_text, encoding="utf-8")

    project = root / "project.godot"
    project_text = project.read_text(encoding="utf-8")
    if 'display/window/stretch/mode=' in project_text:
        project_text = re.sub(r'display/window/stretch/mode=".*?"', 'display/window/stretch/mode="2d"', project_text, count=1)
    else:
        project_text += '\ndisplay/window/stretch/mode="2d"\n'
    if 'display/window/stretch/aspect=' in project_text:
        project_text = re.sub(r'display/window/stretch/aspect=".*?"', 'display/window/stretch/aspect="expand"', project_text, count=1)
    else:
        project_text += 'display/window/stretch/aspect="expand"\n'
    project.write_text(project_text, encoding="utf-8")

    print(f"HUD, orientacao paisagem e tela cheia corrigidos em: {root}")


if __name__ == "__main__":
    main()
