import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const required = [
  'index.html',
  'src/app.js',
  'src/styles.css',
  'public/manifest.webmanifest',
  'sw.js',
  'supabase/migrations/20260729190000_agrofarm_init.sql',
]
for (const file of required) {
  if (!existsSync(file)) throw new Error(`Arquivo obrigatório ausente: ${file}`)
}
execFileSync(process.execPath, ['--check', 'src/app.js'], { stdio: 'inherit' })
const html = readFileSync('index.html', 'utf8')
if (!html.includes('/src/app.js')) throw new Error('index.html não carrega src/app.js')
const sql = readFileSync('supabase/migrations/20260729190000_agrofarm_init.sql', 'utf8')
if (!sql.includes('create schema if not exists agrofarm')) throw new Error('Migration não cria schema agrofarm')
if (/create table\s+public\./i.test(sql)) throw new Error('Migration criou tabela no schema public')
console.log('Validação concluída sem erros.')
