// Genera los iconos PNG de la PWA a partir de public/favicon.svg usando ImageMagick.
import { execSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
mkdirSync('public/icons', { recursive: true })
const run = (c) => execSync(c, { stdio: 'inherit' })
run('convert -background none public/favicon.svg -resize 192x192 public/icons/icon-192.png')
run('convert -background none public/favicon.svg -resize 512x512 public/icons/icon-512.png')
// Maskable: el icono ocupa el 80% central sobre fondo sólido
run('convert -size 512x512 xc:#0b1220 \\( public/favicon.svg -resize 410x410 \\) -gravity center -composite public/icons/icon-512-maskable.png')
