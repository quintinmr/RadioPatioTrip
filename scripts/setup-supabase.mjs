#!/usr/bin/env node
/**
 * Crea el proyecto de Supabase en la UE, ejecuta la migración, configura Auth,
 * obtiene las claves y escribe el .env. Solo necesita un Personal Access Token:
 *   https://supabase.com/dashboard/account/tokens  ->  "Generate new token"
 *
 * Uso:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/setup-supabase.mjs [--site-url https://...] [--region eu-central-1]
 *
 * Si el proyecto ya existe (mismo nombre en la organización) lo reutiliza.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!TOKEN) { console.error('Falta SUPABASE_ACCESS_TOKEN'); process.exit(1) }
const args = Object.fromEntries(process.argv.slice(2).map((a, i, arr) => (a.startsWith('--') ? [a.slice(2), arr[i + 1]] : [])).filter((x) => x.length))
const NAME = args.name ?? 'radiopatio-trip'
const REGION = args.region ?? 'eu-central-1' // Frankfurt (UE). Alternativas UE: eu-west-1 (Irlanda), eu-west-2 (Londres), eu-west-3 (París)
const SITE_URL = args['site-url'] ?? 'http://localhost:5173'
const API = 'https://api.supabase.com/v1'

async function api(method, path, body) {
  const res = await fetch(API + path, { method, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const text = await res.text()
  let json; try { json = JSON.parse(text) } catch { json = text }
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${typeof json === 'string' ? json : JSON.stringify(json)}`)
  return json
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const log = (...a) => console.log('•', ...a)

// 1. Organización
const orgs = await api('GET', '/organizations')
if (!orgs.length) throw new Error('No tienes organizaciones en Supabase')
const org = orgs[0]
log(`Organización: ${org.name} (${org.id})`)

// 2. Proyecto (reutiliza si existe)
let projects = await api('GET', '/projects')
let project = projects.find((p) => p.name === NAME && p.organization_id === org.id)
let dbPass = null
if (project) {
  log(`Proyecto existente: ${project.id} (${project.region})`)
} else {
  dbPass = randomBytes(24).toString('base64url')
  project = await api('POST', '/projects', { name: NAME, organization_id: org.id, db_pass: dbPass, region: REGION })
  log(`Proyecto creado: ${project.id} en ${REGION}`)
  writeFileSync('.supabase-db-password.txt', `${dbPass}\n`) // guárdalo en un gestor de contraseñas y borra este archivo
  log('Contraseña de la base de datos guardada en .supabase-db-password.txt (no se sube a git)')
}
const ref = project.id

// 3. Esperar a que esté activo
process.stdout.write('• Esperando a que el proyecto esté listo')
for (let i = 0; i < 60; i++) {
  const p = await api('GET', `/projects/${ref}`)
  if (p.status === 'ACTIVE_HEALTHY') break
  process.stdout.write('.'); await sleep(5000)
}
console.log(' listo')

// 4. Migración (idempotente: si ya se aplicó, la salta)
const applied = await api('POST', `/projects/${ref}/database/query`, { query: "select to_regclass('public.trips') as t" })
if (applied?.[0]?.t) {
  log('La migración ya estaba aplicada, se omite')
} else {
  const sql = readFileSync(new URL('../supabase/migrations/0001_init.sql', import.meta.url), 'utf8')
  await api('POST', `/projects/${ref}/database/query`, { query: sql })
  log('Migración aplicada (tablas, RLS, storage, funciones RGPD)')
}

// 5. Auth: URL del sitio, redirecciones y registro sin confirmar email (grupo de amigos)
const redirects = [SITE_URL, 'http://localhost:5173', 'https://localhost', 'com.radiopatio.trip://*'].filter((v, i, a) => a.indexOf(v) === i)
await api('PATCH', `/projects/${ref}/config/auth`, { site_url: SITE_URL, uri_allow_list: redirects.join(','), mailer_autoconfirm: true })
log(`Auth configurado: site_url=${SITE_URL}, registro sin confirmación de email`)

// 6. Claves
const keys = await api('GET', `/projects/${ref}/api-keys?reveal=true`)
const anon = keys.find((k) => k.name === 'anon')?.api_key ?? keys.find((k) => k.type === 'publishable')?.api_key
if (!anon) throw new Error('No se encontró la anon key')
const url = `https://${ref}.supabase.co`
writeFileSync('.env', `VITE_SUPABASE_URL=${url}\nVITE_SUPABASE_ANON_KEY=${anon}\n`)
log('.env escrito')
console.log(`\nListo. Dashboard: https://supabase.com/dashboard/project/${ref}`)
console.log(`Siguiente: node scripts/setup-github.mjs  (sube las claves como secretos para el APK en Actions)`)
