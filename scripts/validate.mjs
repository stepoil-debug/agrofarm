import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const required = [
  'index.html',
  'src/isometric-game.js',
  'src/game.css',
  'src/github-pages.js',
  'public/manifest.webmanifest',
  'sw.js',
  'scripts/build.mjs',
  'supabase/migrations/20260729190000_agrofarm_init.sql',
]

for (const file of required) {
  if (!existsSync(file)) throw new Error(`Arquivo obrigatório ausente: ${file}`)
}

execFileSync(process.execPath, ['--check', 'src/isometric-game.js'], { stdio: 'inherit' })
execFileSync(process.execPath, ['--check', 'scripts/build.mjs'], { stdio: 'inherit' })

const html = readFileSync('index.html', 'utf8')
if (!html.includes('./src/isometric-game.js')) throw new Error('index.html não carrega src/isometric-game.js')
if (!html.includes('phaser.min.js')) throw new Error('index.html não carrega o Phaser')
if (!html.includes('<div id="game"')) throw new Error('index.html não contém o contêiner do jogo Phaser')

const game = readFileSync('src/isometric-game.js', 'utf8')
if (!game.includes('class AgroFarmScene extends Phaser.Scene')) throw new Error('Cena principal do Phaser ausente')
if (!game.includes('resolveAssets')) throw new Error('Resolução de assets isométricos ausente')

const build = readFileSync('scripts/build.mjs', 'utf8')
if (!build.includes('kenney_isometricminiaturefarm.zip')) throw new Error('Build não inclui o pacote CC0 da Kenney')
if (!build.includes('ASSET-LICENSE.txt')) throw new Error('Build não registra a licença dos assets')

const sql = readFileSync('supabase/migrations/20260729190000_agrofarm_init.sql', 'utf8')
if (!sql.includes('create schema if not exists agrofarm')) throw new Error('Migration não cria schema agrofarm')
if (/create table\s+public\./i.test(sql)) throw new Error('Migration criou tabela no schema public')

console.log('Validação do AgroFarm Phaser isométrico concluída sem erros.')
