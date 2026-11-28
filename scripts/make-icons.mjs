// Genera los iconos de la PWA, Android y el banner social a partir de public/favicon.svg
// y scripts/logo-art.svg (solo el arte, sin fondo) usando ImageMagick.
import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const run = (c) => execSync(c, { stdio: 'inherit' })
mkdirSync('public/icons', { recursive: true })
run('convert -background none public/favicon.svg -resize 192x192 public/icons/icon-192.png')
run('convert -background none public/favicon.svg -resize 512x512 public/icons/icon-512.png')
// Maskable / adaptativo: el arte debe caber en el círculo central (66 % del lienzo)
const art = (size, out) => run(`convert -size ${size}x${size} gradient:'#1e3a8a-#0b1220' \\( -background none scripts/logo-art.svg -resize ${Math.round(size * 0.58)}x${Math.round(size * 0.58)} \\) -gravity center -composite ${out}`)
art(512, 'public/icons/icon-512-maskable.png')
for (const [dpi, s] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
  const dir = `android/app/src/main/res/mipmap-${dpi}`
  mkdirSync(dir, { recursive: true })
  run(`convert -background none public/favicon.svg -resize ${s}x${s} ${dir}/ic_launcher.png`)
  run(`cp ${dir}/ic_launcher.png ${dir}/ic_launcher_round.png`)
  art(s, `${dir}/ic_launcher_foreground.png`)
}
const font = execSync(`fc-match -f '%{file}' "DejaVu Sans:bold"`).toString().trim()
run(`convert -size 1200x630 gradient:'#172a5c-#0b1220' \\( public/icons/icon-512.png -resize 300x300 \\) -geometry +90+165 -composite -font "${font}" -fill white -pointsize 84 -annotate +440+280 'RadioPatio Trip' -fill '#f5c542' -pointsize 40 -annotate +444+350 'Edimburgo con la panda' -fill '#aab6cc' -pointsize 30 -annotate +444+420 'Plan en directo · mapa · carta · fotos · gastos' public/og.png`)
