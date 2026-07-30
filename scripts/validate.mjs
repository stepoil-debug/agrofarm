import { existsSync, readFileSync } from 'node:fs'

const required = [
  'apps/agrofarm-3d/index.html',
  'apps/agrofarm-3d/src/main.ts',
  'apps/agrofarm-3d/src/world.ts',
  'apps/agrofarm-3d/src/state.ts',
  'apps/agrofarm-3d/src/factory.ts',
  'apps/agrofarm-3d/src/styles.css',
  'apps/agrofarm-3d/scripts/fetch-assets.mjs',
  'supabase/migrations/20260729190000_agrofarm_init.sql',
]
for (const file of required) if (!existsSync(file)) throw new Error(`Arquivo obrigatório ausente: ${file}`)
const html = readFileSync('apps/agrofarm-3d/index.html', 'utf8')
if (!html.includes('game-canvas')) throw new Error('A aplicação 3D não possui canvas.')
if (!html.includes('/src/main.ts')) throw new Error('A aplicação 3D não carrega o motor.')
const source = readFileSync('apps/agrofarm-3d/src/main.ts', 'utf8')
for (const requirement of ['new Application', 'new FarmWorld', 'runAutomation', 'performPlotAction', 'openBuilding']) {
  if (!source.includes(requirement)) throw new Error(`Sistema obrigatório ausente: ${requirement}`)
}
const assetScript = readFileSync('apps/agrofarm-3d/scripts/fetch-assets.mjs', 'utf8')
if (!assetScript.includes('CC0-1.0')) throw new Error('Manifesto de licença CC0 ausente.')
const sql = readFileSync('supabase/migrations/20260729190000_agrofarm_init.sql', 'utf8')
if (!sql.includes('create schema if not exists agrofarm')) throw new Error('Migration não cria schema agrofarm.')
if (/create table\s+public\./i.test(sql)) throw new Error('Migration criou tabela no schema public.')
console.log('Estrutura AgroFarm 3D e schema agrofarm validados.')
