import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'

const PACKS = [
  {
    name: 'farm',
    url: 'https://opengameart.org/sites/default/files/kenney_isometricminiaturefarm.zip',
  },
  {
    name: 'bases',
    url: 'https://opengameart.org/sites/default/files/isometric_miniature_bases_1.0.zip',
  },
]

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

async function fetchPack(pack, temporaryDirectory, outputDirectory) {
  const response = await fetch(pack.url, {
    headers: { 'user-agent': 'AgroFarm-Build/1.0' },
  })
  if (!response.ok) throw new Error(`Falha ao baixar ${pack.name}: HTTP ${response.status}`)

  const archive = join(temporaryDirectory, `${pack.name}.zip`)
  const extracted = join(temporaryDirectory, pack.name)
  mkdirSync(extracted, { recursive: true })
  writeFileSync(archive, Buffer.from(await response.arrayBuffer()))
  execFileSync('unzip', ['-q', '-o', archive, '-d', extracted], { stdio: 'inherit' })

  const copied = []
  for (const source of walk(extracted)) {
    if (!/\.(png|json|tmx|txt)$/i.test(source)) continue
    const filename = basename(source)
    const destination = join(outputDirectory, filename)
    if (existsSync(destination)) continue
    cpSync(source, destination)
    copied.push(filename)
  }
  return copied
}

rmSync('dist', { recursive: true, force: true })
mkdirSync('dist', { recursive: true })
for (const entry of ['index.html', 'src', 'public', 'sw.js']) cpSync(entry, `dist/${entry}`, { recursive: true })

const assetDirectory = 'dist/assets/kenney'
mkdirSync(assetDirectory, { recursive: true })
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'agrofarm-assets-'))
const files = []
try {
  for (const pack of PACKS) files.push(...await fetchPack(pack, temporaryDirectory, assetDirectory))
  writeFileSync(
    join(assetDirectory, 'manifest.json'),
    JSON.stringify({ license: 'CC0-1.0', source: 'Kenney.nl via OpenGameArt.org', files: files.sort() }, null, 2),
  )
  writeFileSync(
    join(assetDirectory, 'ASSET-LICENSE.txt'),
    'Kenney Isometric Miniature Farm e Isometric Miniature Bases\nLicença: CC0 1.0 Universal\nOrigem: https://kenney.nl\n',
  )
} finally {
  rmSync(temporaryDirectory, { recursive: true, force: true })
}

console.log(`Build criado em dist/ com ${files.length} assets CC0.`)
