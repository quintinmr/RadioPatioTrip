#!/usr/bin/env node
/** Sube VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY de .env como secretos de GitHub Actions (usa `gh`). */
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => l.split(/=(.*)/s).slice(0, 2)))
for (const k of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']) {
  if (!env[k]) throw new Error(`Falta ${k} en .env`)
  execFileSync('gh', ['secret', 'set', k, '--body', env[k].trim()], { stdio: 'inherit' })
}
// Clave de firma de Android (generada en ~/.config/radiopatio); misma firma en CI y local
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
const ksEnvPath = `${homedir()}/.config/radiopatio/keystore.env`
if (existsSync(ksEnvPath)) {
  const ks = Object.fromEntries(readFileSync(ksEnvPath, 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => l.split(/=(.*)/s).slice(0, 2)))
  execFileSync('gh', ['secret', 'set', 'RP_KEYSTORE_BASE64', '--body', readFileSync(ks.RP_KEYSTORE).toString('base64')], { stdio: 'inherit' })
  for (const k of ['RP_KEYSTORE_PASSWORD', 'RP_KEY_ALIAS', 'RP_KEY_PASSWORD']) execFileSync('gh', ['secret', 'set', k, '--body', ks[k]], { stdio: 'inherit' })
  console.log('Clave de firma subida como secretos')
}
console.log('Secretos configurados en GitHub Actions')
