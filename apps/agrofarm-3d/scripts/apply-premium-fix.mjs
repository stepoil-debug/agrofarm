import { readFileSync, writeFileSync } from 'node:fs'

const sourcePath = new URL('../src/main.ts', import.meta.url)
let source = readFileSync(sourcePath, 'utf8')

const replaceRequired = (current, before, after, label) => {
  if (current.includes(after)) return current
  if (!current.includes(before)) throw new Error(`Correção premium não aplicada: ${label}`)
  return current.replace(before, after)
}

source = replaceRequired(
  source,
  `const SVG_NS = 'http://www.w3.org/2000/svg'
const svg = document.querySelector<SVGSVGElement>('#farm-scene')
const viewport = document.querySelector<HTMLElement>('#viewport')
const plotsLayer = document.querySelector<SVGGElement>('#plots-layer')
const treesLayer = document.querySelector<SVGGElement>('#trees-layer')
const flowerLayer = document.querySelector<SVGGElement>('#flower-layer')
const farmer = document.querySelector<SVGGElement>('#farmer')
const marker = document.querySelector<SVGCircleElement>('#move-marker')

if (!svg || !viewport || !plotsLayer || !treesLayer || !flowerLayer || !farmer || !marker) {
  throw new Error('Estrutura visual do AgroFarm não foi encontrada.')
}`,
  `const SVG_NS = 'http://www.w3.org/2000/svg'

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector)
  if (!element) throw new Error(\`Elemento obrigatório ausente: \${selector}\`)
  return element
}

const svg = requiredElement<SVGSVGElement>('#farm-scene')
const viewport = requiredElement<HTMLElement>('#viewport')
const plotsLayer = requiredElement<SVGGElement>('#plots-layer')
const treesLayer = requiredElement<SVGGElement>('#trees-layer')
const flowerLayer = requiredElement<SVGGElement>('#flower-layer')
const farmer = requiredElement<SVGGElement>('#farmer')
const marker = requiredElement<SVGCircleElement>('#move-marker')`,
  'elementos obrigatórios',
)

source = replaceRequired(
  source,
  `function nearestPlot(point: Point): number | null {
  let best: { id: number; distance: number } | null = null
  plotPositions.forEach((position, id) => {
    const current = distance(point, position)
    if (!best || current < best.distance) best = { id, distance: current }
  })
  return best && best.distance < 62 ? best.id : null
}

function nearestBuilding(point: Point): BuildingKey | null {
  let best: { id: BuildingKey; distance: number } | null = null
  ;(Object.entries(buildingTargets) as [BuildingKey, (typeof buildingTargets)[BuildingKey]][]).forEach(([id, target]) => {
    const current = distance(point, target.center)
    if (!best || current < best.distance) best = { id, distance: current }
  })
  return best && best.distance < 135 ? best.id : null
}`,
  `function nearestPlot(point: Point): number | null {
  let bestId: number | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (let id = 0; id < plotPositions.length; id += 1) {
    const position = plotPositions[id]
    if (!position) continue
    const current = distance(point, position)
    if (current < bestDistance) {
      bestDistance = current
      bestId = id
    }
  }
  return bestDistance < 62 ? bestId : null
}

function nearestBuilding(point: Point): BuildingKey | null {
  let bestId: BuildingKey | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const [id, target] of Object.entries(buildingTargets) as [BuildingKey, (typeof buildingTargets)[BuildingKey]][]) {
    const current = distance(point, target.center)
    if (current < bestDistance) {
      bestDistance = current
      bestId = id
    }
  }
  return bestDistance < 135 ? bestId : null
}`,
  'alvos de clique',
)

if (!source.includes('let lastPlotRender = performance.now()')) {
  source = source.replace(
    'let lastAutomation = performance.now()',
    'let lastAutomation = performance.now()\nlet lastPlotRender = performance.now()',
  )
}

source = replaceRequired(
  source,
  `    state.plots.forEach(plot => {
      if (plot.crop && growthProgress(plot) >= 1) renderPlots()
    })`,
  `    if (now - lastPlotRender > 1000) {
      lastPlotRender = now
      renderPlots()
    }`,
  'atualização dos canteiros',
)

if (!source.includes("svg.setAttribute('preserveAspectRatio', 'xMidYMid slice')")) {
  source = source.replace(
    "const marker = requiredElement<SVGCircleElement>('#move-marker')",
    "const marker = requiredElement<SVGCircleElement>('#move-marker')\nsvg.setAttribute('preserveAspectRatio', 'xMidYMid slice')",
  )
}

writeFileSync(sourcePath, source)
console.log('Motor premium estabilizado para TypeScript e build.')
