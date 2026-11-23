#!/usr/bin/env node
/** Sube VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY de .env como secretos de GitHub Actions (usa `gh`). */
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => l.split(/=(.*)/s).slice(0, 2)))
for (const k of ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']) {
  if (!env[k]) throw new Error(`Falta ${k} en .env`)
  execFileSync('gh', ['secret', 'set', k, '--body', env[k].trim()], { stdio: 'inherit' })
}
console.log('Secretos configurados en GitHub Actions')
