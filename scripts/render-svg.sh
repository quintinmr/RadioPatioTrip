#!/usr/bin/env bash
# Renderiza un SVG a PNG con fondo transparente usando Chrome headless (soporta degradados, opacidades, etc.).
# Uso: render-svg.sh entrada.svg tamaño salida.png
set -euo pipefail
SVG=$(realpath "$1"); SIZE=$2; OUT=$(realpath -m "$3")
HTML=$(mktemp --suffix=.html)
cat > "$HTML" <<H
<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent}img{display:block;width:${SIZE}px;height:${SIZE}px}</style></head><body><img src="file://$SVG"></body></html>
H
google-chrome --headless=new --disable-gpu --no-sandbox --hide-scrollbars --allow-file-access-from-files --default-background-color=00000000 --window-size=$SIZE,$SIZE --screenshot="$OUT" "file://$HTML" >/dev/null 2>&1
rm -f "$HTML"
