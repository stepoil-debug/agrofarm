#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


EXPORT_PRESETS = r'''
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
html/head_include="<meta name=\"viewport\" content=\"width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover\"><style>html,body{margin:0!important;padding:0!important;width:100vw!important;height:100dvh!important;overflow:hidden!important;background:#000!important;touch-action:none!important}canvas{position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;display:block!important;background:#000!important}</style>"
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


def ensure_setting(text: str, key: str, value: str) -> str:
    line = f'{key}={value}'
    lines = text.splitlines()
    for i, current in enumerate(lines):
        if current.startswith(key + '='):
            lines[i] = line
            return '\n'.join(lines) + '\n'
    return text.rstrip() + '\n' + line + '\n'


def main() -> None:
    parser = argparse.ArgumentParser(description="Configura Harvest Moon 2.0 para exportação Web/PWA")
    parser.add_argument("project", type=Path)
    root = parser.parse_args().project.resolve()
    project = root / "project.godot"
    if not project.exists():
        raise FileNotFoundError(project)

    text = project.read_text(encoding="utf-8")
    text = ensure_setting(text, "display/window/stretch/mode", '"viewport"')
    text = ensure_setting(text, "display/window/stretch/aspect", '"keep"')
    text = ensure_setting(text, "display/window/handheld/orientation", '"landscape"')
    text = ensure_setting(text, "input_devices/pointing/emulate_touch_from_mouse", "true")
    text = ensure_setting(text, "input_devices/pointing/emulate_mouse_from_touch", "true")
    project.write_text(text, encoding="utf-8")

    (root / "export_presets.cfg").write_text(EXPORT_PRESETS.strip() + "\n", encoding="utf-8")
    pwa = root / "pwa"
    pwa.mkdir(exist_ok=True)
    (pwa / "manifest.json").write_text('{"name":"Harvest Moon 2.0","short_name":"HarvestMoon","display":"fullscreen","orientation":"landscape","start_url":"./","scope":"./","background_color":"#000000","theme_color":"#000000","icons":[]}', encoding="utf-8")
    (pwa / "sw.js").write_text("self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{});", encoding="utf-8")
    print(f"Harvest Moon 2.0 configurado para Web em: {root}")


if __name__ == "__main__":
    main()
