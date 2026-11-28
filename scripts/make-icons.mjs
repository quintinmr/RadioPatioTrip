// Genera los iconos de la PWA, Android y el banner social a partir de public/favicon.svg
// (icono completo) y scripts/logo-tiles.svg (solo la retícula, transparente).
// Los SVG se rasterizan con Chrome (scripts/render-svg.sh) y se componen con ImageMagick.
import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const run = (c) => execSync(c, { stdio: 'inherit' })
const render = (svg, size, out) => run(`bash scripts/render-svg.sh ${svg} ${size} ${out}`)
mkdirSync('public/icons', { recursive: true })
const tmp = 'android/build/icon-tmp'; mkdirSync(tmp, { recursive: true })
render('public/favicon.svg', 1024, `${tmp}/icon-1024.png`)
render('scripts/logo-tiles.svg', 1024, `${tmp}/tiles-1024.png`)
run(`convert ${tmp}/icon-1024.png -resize 192x192 public/icons/icon-192.png`)
run(`convert ${tmp}/icon-1024.png -resize 512x512 public/icons/icon-512.png`)
// Maskable / adaptativo: la retícula debe caber en el círculo central (66 % del lienzo), fondo pergamino
const art = (size, out) => run(`convert -size ${size}x${size} xc:'#F3EAD7' \\( ${tmp}/tiles-1024.png -resize ${Math.round(size * 0.58)}x${Math.round(size * 0.58)} \\) -gravity center -composite ${out}`)
art(512, 'public/icons/icon-512-maskable.png')
for (const [dpi, s] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
  const dir = `android/app/src/main/res/mipmap-${dpi}`
  mkdirSync(dir, { recursive: true })
  run(`convert ${tmp}/icon-1024.png -resize ${s}x${s} ${dir}/ic_launcher.png`)
  run(`cp ${dir}/ic_launcher.png ${dir}/ic_launcher_round.png`)
  art(s, `${dir}/ic_launcher_foreground.png`)
}
// Banner para WhatsApp / redes: pergamino, retícula y nombre
const font = execSync(`fc-match -f '%{file}' "DejaVu Serif:bold"`).toString().trim()
const font2 = execSync(`fc-match -f '%{file}' "DejaVu Sans"`).toString().trim()
run(`convert -size 1200x630 gradient:'#F8F1E3-#E9DCC2' \\( ${tmp}/tiles-1024.png -resize 280x280 \\) -geometry +110+175 -composite -font "${font}" -fill '#3B2A1E' -pointsize 96 -annotate +430+300 'RadioPatio' -fill '#7B1E2B' -pointsize 40 -annotate +434+368 'Edimburgo con la panda' -font "${font2}" -fill '#6B5A48' -pointsize 28 -annotate +434+428 'Plan en directo · mapa · carta · fotos · gastos' public/og.png`)
