import { existsSync, readFileSync } from 'node:fs'

const required = [
  'apps/agrofarm-3d/index.html',
  'apps/agrofarm-3d/src/main.ts',
  'apps/agrofarm-3d/src/state.ts',
  'apps/agrofarm-3d/src/styles.css',
  'supabase/migrations/20260729190000_agrofarm_init.sql',
]

for (const file of required) {
  if (!existsSync(file)) throw new Error(`Arquivo obrigatório ausente: ${file}`)
}

const html = readFileSync('apps/agrofarm-3d/index.html', 'utf8')
if (!html.includes('farm-scene')) throw new Error('A aplicação não possui o mapa SVG jogável.')
if (!html.includes('/src/main.ts')) throw new Error('A aplicação não carrega o motor.')
if (!html.includes('plots-layer')) throw new Error('A aplicação não possui camada produtiva.')

const source = readFileSync('apps/agrofarm-3d/src/main.ts', 'utf8')
for (const requirement of ['runAutomation', 'performPlotAction', 'openBuilding', 'handleSceneInput', 'renderPlots']) {
  if (!source.includes(requirement)) throw new Error(`Sistema obrigatório ausente: ${requirement}`)
}

const sql = readFileSync('supabase/migrations/20260729190000_agrofarm_init.sql', 'utf8')
if (!sql.includes('create schema if not exists agrofarm')) throw new Error('Migration não cria schema agrofarm.')
if (/create table\s+public\./i.test(sql)) throw new Error('Migration criou tabela no schema public.')

console.log('Estrutura AgroFarm 2.5D e schema agrofarm validados.')
