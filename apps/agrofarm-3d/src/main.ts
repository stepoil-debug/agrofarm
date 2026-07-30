import './styles.css'
import {
  BARNS,
  CROPS,
  LEVELS,
  MACHINES,
  type BuildingKey,
  type CropKey,
  type GameState,
  type MachineKey,
  type PlotState,
  type ToolKey,
  createFreshState,
  currentLevel,
  growthProgress,
  loadState,
  nextBarn,
  nextLevel,
  resetState,
  saveState,
  usedStorage,
} from './state'

type Point = { x: number; y: number }
type QueuedAction = { type: 'plot'; id: number } | { type: 'building'; id: BuildingKey } | null

const SVG_NS = 'http://www.w3.org/2000/svg'
const svg = document.querySelector<SVGSVGElement>('#farm-scene')
const viewport = document.querySelector<HTMLElement>('#viewport')
const plotsLayer = document.querySelector<SVGGElement>('#plots-layer')
const treesLayer = document.querySelector<SVGGElement>('#trees-layer')
const flowerLayer = document.querySelector<SVGGElement>('#flower-layer')
const farmer = document.querySelector<SVGGElement>('#farmer')
const marker = document.querySelector<SVGCircleElement>('#move-marker')

if (!svg || !viewport || !plotsLayer || !treesLayer || !flowerLayer || !farmer || !marker) {
  throw new Error('Estrutura visual do AgroFarm não foi encontrada.')
}

const dom = {
  coins: document.querySelector<HTMLElement>('#coins'),
  farmLevel: document.querySelector<HTMLElement>('#farm-level'),
  storage: document.querySelector<HTMLElement>('#storage'),
  weatherIcon: document.querySelector<HTMLElement>('#weather-icon'),
  clock: document.querySelector<HTMLElement>('#clock'),
  mode: document.querySelector<HTMLButtonElement>('#mode-button'),
  menu: document.querySelector<HTMLButtonElement>('#menu-button'),
  missionTitle: document.querySelector<HTMLElement>('#mission-title'),
  missionText: document.querySelector<HTMLElement>('#mission-text'),
  missionProgress: document.querySelector<HTMLElement>('#mission-progress'),
  toolbar: document.querySelector<HTMLElement>('#toolbar'),
  cropPicker: document.querySelector<HTMLElement>('#crop-picker'),
  toast: document.querySelector<HTMLElement>('#toast'),
  dialog: document.querySelector<HTMLElement>('#dialog'),
  dialogContent: document.querySelector<HTMLElement>('#dialog-content'),
  loading: document.querySelector<HTMLElement>('#loading'),
  play: document.querySelector<HTMLButtonElement>('#play-button'),
  zoomIn: document.querySelector<HTMLButtonElement>('#zoom-in'),
  zoomOut: document.querySelector<HTMLButtonElement>('#zoom-out'),
  cameraHome: document.querySelector<HTMLButtonElement>('#camera-home'),
}

const plotPositions: Point[] = [
  { x: 267, y: 454 }, { x: 355, y: 436 }, { x: 444, y: 423 }, { x: 535, y: 419 },
  { x: 260, y: 497 }, { x: 350, y: 480 }, { x: 443, y: 468 }, { x: 540, y: 462 },
  { x: 255, y: 541 }, { x: 349, y: 525 }, { x: 448, y: 513 }, { x: 550, y: 505 },
]

const buildingTargets: Record<BuildingKey, { center: Point; entrance: Point }> = {
  house: { center: { x: 793, y: 190 }, entrance: { x: 790, y: 320 } },
  barn: { center: { x: 1185, y: 220 }, entrance: { x: 1168, y: 337 } },
  market: { center: { x: 797, y: 650 }, entrance: { x: 798, y: 748 } },
  workshop: { center: { x: 370, y: 260 }, entrance: { x: 440, y: 365 } },
}

let state: GameState = loadState()
let running = false
let zoom = 1
let dayElapsed = 8 * 60
let lastFrame = performance.now()
let lastSave = performance.now()
let lastAutomation = performance.now()
let toastTimer = 0
let moveTarget: Point | null = null
let queuedAction: QueuedAction = null
let player: Point = normalisePlayer(state)

function normalisePlayer(value: GameState): Point {
  const x = value.player.x
  const y = value.player.z
  if (x > 80 && x < 1520 && y > 80 && y < 840) return { x, y }
  return { x: 780, y: 484 }
}

function formatCoins(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value))
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function save(): void {
  state.player = { x: player.x, z: player.y, yaw: 0 }
  saveState(state)
}

function showToast(message: string): void {
  window.clearTimeout(toastTimer)
  if (!dom.toast) return
  dom.toast.textContent = message
  dom.toast.classList.remove('hidden')
  toastTimer = window.setTimeout(() => dom.toast?.classList.add('hidden'), 2600)
}

function closeDialog(): void {
  dom.dialog?.classList.add('hidden')
  if (dom.dialogContent) dom.dialogContent.innerHTML = ''
}

function openDialog(content: string): void {
  if (dom.dialogContent) dom.dialogContent.innerHTML = content
  dom.dialog?.classList.remove('hidden')
}

function mission(): { title: string; text: string; progress: number } {
  const stats = state.stats
  if (!stats.tilled) return { title: 'Prepare o primeiro terreno', text: 'Escolha a enxada e clique ou toque em um lote.', progress: 8 }
  if (!stats.planted) return { title: 'Plante sua primeira cultura', text: 'Escolha sementes e clique no lote preparado.', progress: 26 }
  if (!stats.watered) return { title: 'Cuide da plantação', text: 'Regue a cultura para aumentar a produção.', progress: 42 }
  if (!stats.harvested) return { title: 'Faça a primeira colheita', text: 'Aguarde o crescimento e use a cesta.', progress: 62 }
  if (!stats.sold) return { title: 'Venda no mercado', text: 'Clique na banca rural e venda sua produção.', progress: 80 }
  if (state.level === 1) return { title: 'Evolua sua sede', text: 'Acumule 150 moedas e melhore a casa.', progress: 92 }
  return { title: 'Expanda sua fazenda', text: 'Automatize a produção e cuide das máquinas.', progress: 100 }
}

function updateHud(): void {
  if (dom.coins) dom.coins.textContent = formatCoins(state.coins)
  if (dom.farmLevel) dom.farmLevel.textContent = `LV ${state.level}`
  if (dom.storage) dom.storage.textContent = `${usedStorage(state)}/${state.barnCapacity}`
  if (dom.mode) dom.mode.textContent = state.mode === 'free' ? 'Livre' : 'Realista'
  const icons = { sunny: '☀️', cloudy: '⛅', rain: '🌧️' } as const
  if (dom.weatherIcon) dom.weatherIcon.textContent = icons[state.weather]
  const hour = Math.floor(dayElapsed / 60) % 24
  const minute = Math.floor(dayElapsed % 60)
  if (dom.clock) dom.clock.textContent = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
  const current = mission()
  if (dom.missionTitle) dom.missionTitle.textContent = current.title
  if (dom.missionText) dom.missionText.textContent = current.text
  if (dom.missionProgress) dom.missionProgress.style.width = `${current.progress}%`
}

function createSvg<K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, name)
}

function renderTrees(): void {
  const trees = [
    [105, 190, 1.05, 0], [164, 320, .82, 0], [91, 535, .95, 0], [176, 640, .78, 0],
    [295, 105, .86, 0], [470, 88, .82, 0], [560, 135, .72, 0], [1000, 86, .8, 0],
    [1410, 130, 1.05, 1], [1486, 260, .82, 1], [1470, 410, .92, 1], [1445, 590, .8, 1],
    [1380, 760, .98, 0], [1200, 825, .75, 0], [1015, 805, .72, 0], [902, 820, .62, 0],
    [605, 815, .84, 0], [522, 695, .72, 0], [330, 735, .84, 0], [250, 660, .7, 0],
    [600, 195, .7, 1], [980, 215, .72, 0], [1328, 356, .74, 1], [1345, 640, .72, 1],
  ] as const
  treesLayer.innerHTML = ''
  trees.forEach(([x, y, scale, fruit], index) => {
    const group = createSvg('g')
    group.setAttribute('class', `tree ${fruit ? 'fruit-tree' : ''}`)
    group.setAttribute('transform', `translate(${x} ${y}) scale(${scale})`)
    group.innerHTML = `
      <ellipse cx="0" cy="30" rx="37" ry="13" fill="#2b652e" opacity=".25" />
      <rect class="trunk" x="-9" y="-5" width="18" height="47" rx="8" />
      <circle class="crown-a" cx="-22" cy="-25" r="31" />
      <circle class="crown-b" cx="18" cy="-29" r="34" />
      <circle class="crown-c" cx="0" cy="-58" r="35" />
      ${fruit ? '<circle class="fruit" cx="-20" cy="-39" r="7"/><circle class="fruit" cx="14" cy="-48" r="7"/><circle class="fruit" cx="28" cy="-19" r="7"/><circle class="fruit" cx="-3" cy="-70" r="7"/>' : ''}
    `
    group.style.animationDelay = `${-(index % 5) * .4}s`
    treesLayer.appendChild(group)
  })
}

function renderFlowers(): void {
  flowerLayer.innerHTML = ''
  const colors = ['#f1748d', '#f4cc52', '#9b7ad9', '#fff4dc', '#6ec5dd']
  for (let index = 0; index < 95; index += 1) {
    const angle = index * 2.399
    const radius = 120 + (index % 11) * 57
    let x = 800 + Math.cos(angle) * radius
    let y = 470 + Math.sin(angle) * radius * .55
    if (x > 170 && x < 650 && y > 380 && y < 610) x += 520
    if (x > 650 && x < 935 && y < 340) y += 280
    x = clamp(x, 45, 1550)
    y = clamp(y, 70, 845)
    const group = createSvg('g')
    group.setAttribute('class', 'flower')
    group.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${.55 + (index % 4) * .12})`)
    const color = colors[index % colors.length] ?? '#f1748d'
    group.innerHTML = `<circle r="5" fill="${color}"/><circle cx="-5" r="4" fill="${color}"/><circle cx="5" r="4" fill="${color}"/><circle cy="-5" r="4" fill="${color}"/><circle cy="5" r="4" fill="${color}"/><circle r="2.6" fill="#f5d65c"/>`
    flowerLayer.appendChild(group)
  }
}

function cropMarkup(plot: PlotState): string {
  if (!plot.crop) return ''
  const progress = growthProgress(plot)
  const stage = progress < .33 ? 1 : progress < .72 ? 2 : 3
  const cropClass = plot.crop === 'corn' ? 'corn' : plot.crop === 'cassava' ? 'cassava' : 'pineapple'
  const items: string[] = []
  const count = stage === 1 ? 3 : stage === 2 ? 5 : 7
  for (let index = 0; index < count; index += 1) {
    const x = -41 + (index % 4) * 27 + (Math.floor(index / 4) * 10)
    const y = -5 + Math.floor(index / 4) * 25
    const height = 18 + stage * 12 + (index % 3) * 3
    const fruit = stage === 3
      ? cropClass === 'corn'
        ? `<ellipse class="crop-fruit-corn" cx="7" cy="${-height + 13}" rx="5" ry="10"/>`
        : cropClass === 'cassava'
          ? `<ellipse class="crop-fruit-cassava" cx="0" cy="8" rx="6" ry="12"/>`
          : `<ellipse class="crop-fruit-pineapple" cx="0" cy="${-height + 10}" rx="8" ry="11"/><path d="M-8 ${-height + 1}l8-14 8 14" stroke="#4b913f" stroke-width="4" fill="none"/>`
      : ''
    items.push(`<g transform="translate(${x} ${y})"><path class="crop-stem" d="M0 10V${-height}"/><ellipse class="crop-leaf" cx="-7" cy="${-height + 15}" rx="11" ry="5" transform="rotate(-28 -7 ${-height + 15})"/><ellipse class="crop-leaf" cx="8" cy="${-height + 24}" rx="11" ry="5" transform="rotate(30 8 ${-height + 24})"/>${fruit}</g>`)
  }
  return items.join('')
}

function plotStatus(plot: PlotState): string {
  if (!plot.tilled) return ''
  if (!plot.crop) return '✓'
  if (growthProgress(plot) >= 1) return '✨'
  if (plot.watered && plot.protected) return '💚'
  if (plot.watered) return '💧'
  if (plot.protected) return '🛡️'
  return ''
}

function renderPlots(): void {
  plotsLayer.innerHTML = ''
  state.plots.forEach((plot, index) => {
    const position = plotPositions[index]
    if (!position) return
    const group = createSvg('g')
    group.setAttribute('class', `plot-group ${plot.watered ? 'plot-watered' : ''}`)
    group.setAttribute('data-plot', String(plot.id))
    group.setAttribute('transform', `translate(${position.x} ${position.y})`)
    group.innerHTML = `
      <path class="plot-hit" d="M-53-24Q0-41 53-24L57 25Q0 43-57 25Z"/>
      ${plot.tilled ? '<path class="plot-soil" d="M-49-19Q0-34 49-19L52 21Q0 35-52 21Z"/>' : ''}
      ${cropMarkup(plot)}
      <text class="plot-status" y="7">${plotStatus(plot)}</text>
    `
    plotsLayer.appendChild(group)
  })
}

function setTool(tool: ToolKey): void {
  state.selectedTool = tool
  document.querySelectorAll<HTMLElement>('.tool').forEach(button => button.classList.toggle('active', button.dataset.tool === tool))
  save()
}

function setCrop(crop: CropKey): void {
  state.selectedCrop = crop
  document.querySelectorAll<HTMLElement>('.crop').forEach(button => button.classList.toggle('selected', button.dataset.crop === crop))
  save()
}

function performPlotAction(plotId: number, fromAutomation = false): boolean {
  const plot = state.plots[plotId]
  if (!plot) return false
  const definition = CROPS[state.selectedCrop]

  if (state.selectedTool === 'hoe') {
    if (plot.crop || plot.tilled) {
      if (!fromAutomation) showToast(plot.crop ? 'Há uma plantação neste canteiro.' : 'Este terreno já está preparado.')
      return false
    }
    plot.tilled = true
    state.stats.tilled += 1
    if (!fromAutomation) showToast('Terra preparada!')
  } else if (state.selectedTool === 'seed') {
    if (!plot.tilled || plot.crop) {
      if (!fromAutomation) showToast(!plot.tilled ? 'Prepare a terra antes de plantar.' : 'Este canteiro já está ocupado.')
      return false
    }
    if (state.coins < definition.seedCost) {
      if (!fromAutomation) showToast('Saldo insuficiente para comprar as sementes.')
      return false
    }
    state.coins -= definition.seedCost
    plot.crop = state.selectedCrop
    plot.plantedAt = Date.now()
    plot.watered = false
    plot.protected = false
    state.stats.planted += 1
    if (!fromAutomation) showToast(`${definition.name} plantado.`)
  } else if (state.selectedTool === 'water') {
    if (!plot.crop || plot.watered) {
      if (!fromAutomation) showToast(!plot.crop ? 'Não existe plantação neste canteiro.' : 'Esta plantação já foi regada.')
      return false
    }
    plot.watered = true
    state.stats.watered += 1
    if (!fromAutomation) showToast('Plantação regada.')
  } else if (state.selectedTool === 'protect') {
    if (!plot.crop || plot.protected) {
      if (!fromAutomation) showToast(!plot.crop ? 'Não existe plantação neste canteiro.' : 'O defensivo já foi aplicado.')
      return false
    }
    if (state.coins < 2) {
      if (!fromAutomation) showToast('São necessárias 2 moedas.')
      return false
    }
    state.coins -= 2
    plot.protected = true
    if (!fromAutomation) showToast('Defensivo aplicado.')
  } else if (state.selectedTool === 'harvest') {
    if (!plot.crop || growthProgress(plot) < 1) {
      if (!fromAutomation) showToast(!plot.crop ? 'Não existe produção para colher.' : 'A cultura ainda está crescendo.')
      return false
    }
    const cropKey = plot.crop
    const crop = CROPS[cropKey]
    let quantity = crop.baseYield + (plot.watered ? 1 : 0) + (plot.protected ? 1 : 0)
    if (state.mode === 'realistic') {
      if (!plot.watered && Math.random() < .42) quantity -= 3
      if (!plot.protected && Math.random() < .38) quantity -= 3
    }
    quantity = Math.max(0, Math.min(quantity, state.barnCapacity - usedStorage(state)))
    if (quantity <= 0) {
      if (!fromAutomation) showToast(usedStorage(state) >= state.barnCapacity ? 'O galpão está cheio.' : 'A produção foi perdida por falta de cuidado.')
      return false
    }
    state.inventory[cropKey] += quantity
    state.stats.harvested += quantity
    plot.crop = null
    plot.plantedAt = 0
    plot.watered = false
    plot.protected = false
    plot.tilled = true
    if (!fromAutomation) showToast(`${quantity} unidades de ${crop.name.toLowerCase()} colhidas.`)
  }

  save()
  renderPlots()
  updateHud()
  pulsePlot(plotId)
  return true
}

function pulsePlot(plotId: number): void {
  const element = plotsLayer.querySelector<SVGGElement>(`[data-plot="${plotId}"]`)
  element?.classList.add('active')
  window.setTimeout(() => element?.classList.remove('active'), 520)
}

function sellCrop(cropKey: CropKey): void {
  const quantity = state.inventory[cropKey]
  if (!quantity) {
    showToast('Não há produtos para vender.')
    return
  }
  const price = CROPS[cropKey].salePrice * currentLevel(state).multiplier
  const value = Math.round(quantity * price * 100) / 100
  state.inventory[cropKey] = 0
  state.coins += value
  state.stats.sold += quantity
  save()
  updateHud()
  showToast(`Venda concluída: ${formatCoins(value)} moedas.`)
  openBuilding('market')
}

function openBuilding(building: BuildingKey): void {
  if (building === 'market') {
    const rows = (Object.entries(CROPS) as [CropKey, (typeof CROPS)[CropKey]][]).map(([key, crop]) => {
      const quantity = state.inventory[key]
      const unit = crop.salePrice * currentLevel(state).multiplier
      return `<article class="shop-item"><strong>${crop.icon} ${crop.name}</strong><small>${quantity} unidades · ${formatCoins(unit)} por unidade</small><button data-sell="${key}" ${quantity === 0 ? 'disabled' : ''}>Vender tudo por ${formatCoins(quantity * unit)}</button></article>`
    }).join('')
    openDialog(`<button class="modal-close" type="button">×</button><h2>Banca Rural</h2><div class="hero-row"><span class="hero-icon">🧺</span><div><strong>Feira da comunidade</strong><p>Venda sua produção e acompanhe o multiplicador da sede: ${currentLevel(state).multiplier.toFixed(2)}x.</p></div></div><div class="shop-grid">${rows}</div>`)
    return
  }

  if (building === 'house') {
    const level = currentLevel(state)
    const next = nextLevel(state)
    openDialog(`<button class="modal-close" type="button">×</button><h2>Casa da Fazenda</h2><div class="hero-row"><span class="hero-icon">🏡</span><div><strong>${level.label}</strong><p>Nível ${state.level} · vendas em ${level.multiplier.toFixed(2)}x.</p></div></div>${next ? `<p>A evolução melhora a reputação e aumenta a margem de todas as vendas.</p><button class="primary" data-upgrade="house" ${state.coins < next.cost ? 'disabled' : ''}>Evoluir para o nível ${next.level} · ${formatCoins(next.cost)} moedas</button>` : '<p>Você atingiu o nível máximo desta versão.</p>'}`)
    return
  }

  if (building === 'barn') {
    const next = nextBarn(state)
    const inventory = (Object.entries(CROPS) as [CropKey, (typeof CROPS)[CropKey]][]).map(([key, crop]) => `<article class="shop-item"><strong>${crop.icon} ${crop.name}</strong><small>${state.inventory[key]} unidades armazenadas</small></article>`).join('')
    openDialog(`<button class="modal-close" type="button">×</button><h2>Celeiro e Silo</h2><div class="hero-row"><span class="hero-icon">🌾</span><div><strong>Galpão nível ${state.barnLevel}</strong><p>${usedStorage(state)} de ${state.barnCapacity} espaços ocupados.</p></div></div><div class="shop-grid">${inventory}</div>${next ? `<button class="primary" data-upgrade="barn" ${state.coins < next.cost ? 'disabled' : ''}>Ampliar para ${next.capacity} espaços · ${formatCoins(next.cost)} moedas</button>` : '<p>Capacidade máxima atual.</p>'}`)
    return
  }

  const rows = (Object.entries(MACHINES) as [MachineKey, (typeof MACHINES)[MachineKey]][]).map(([key, machine]) => {
    const status = state.machines[key]
    const locked = state.level < machine.unlockLevel
    const label = !status.owned ? `Comprar por ${formatCoins(machine.cost)}` : status.broken ? `Consertar por ${formatCoins(machine.repairCost)}` : status.enabled ? 'Desligar automação' : 'Ativar automação'
    const description = !status.owned ? `Libera no nível ${machine.unlockLevel}` : `${status.broken ? 'QUEBRADA' : status.enabled ? 'Em operação' : 'Parada'} · condição ${Math.round(status.condition)}%`
    return `<article class="shop-item"><strong>${machine.icon} ${machine.name}</strong><small>${description}</small>${status.owned ? `<div class="machine-condition"><i style="width:${status.condition}%"></i></div>` : ''}<button data-machine="${key}" ${locked ? 'disabled' : ''}>${locked ? `Bloqueada até o nível ${machine.unlockLevel}` : label}</button></article>`
  }).join('')
  openDialog(`<button class="modal-close" type="button">×</button><h2>Oficina Agrícola</h2><div class="hero-row"><span class="hero-icon">🚜</span><div><strong>Máquinas e automação</strong><p>Automatize tarefas, mas acompanhe desgaste, manutenção e defeitos.</p></div></div><div class="shop-grid">${rows}</div>`)
}

function upgrade(type: 'house' | 'barn'): void {
  if (type === 'house') {
    const next = nextLevel(state)
    if (!next || state.coins < next.cost) {
      showToast('Saldo insuficiente.')
      return
    }
    state.coins -= next.cost
    state.level = next.level
    showToast(`Sede evoluída para o nível ${next.level}!`)
  } else {
    const next = nextBarn(state)
    if (!next || state.coins < next.cost) {
      showToast('Saldo insuficiente.')
      return
    }
    state.coins -= next.cost
    state.barnLevel = next.level
    state.barnCapacity = next.capacity
    showToast(`Galpão ampliado para ${next.capacity} espaços.`)
  }
  save()
  updateHud()
  openBuilding(type)
}

function handleMachine(key: MachineKey): void {
  const definition = MACHINES[key]
  const machine = state.machines[key]
  if (state.level < definition.unlockLevel) return
  if (!machine.owned) {
    if (state.coins < definition.cost) {
      showToast('Saldo insuficiente para comprar esta máquina.')
      return
    }
    state.coins -= definition.cost
    machine.owned = true
    machine.enabled = true
    showToast(`${definition.name} comprada e ativada.`)
  } else if (machine.broken) {
    if (state.coins < definition.repairCost) {
      showToast('Saldo insuficiente para o reparo.')
      return
    }
    state.coins -= definition.repairCost
    machine.broken = false
    machine.condition = Math.min(100, machine.condition + 70)
    state.stats.repaired += 1
    showToast('Máquina consertada.')
  } else {
    machine.enabled = !machine.enabled
    showToast(machine.enabled ? 'Automação ativada.' : 'Automação desligada.')
  }
  save()
  updateHud()
  openBuilding('workshop')
}

function runAutomation(): void {
  for (const [key, machine] of Object.entries(state.machines) as [MachineKey, (typeof state.machines)[MachineKey]][]) {
    if (!machine.owned || !machine.enabled || machine.broken) continue
    machine.condition = Math.max(0, machine.condition - (state.mode === 'realistic' ? .8 : .45))
    const chance = state.mode === 'realistic' ? .012 + (100 - machine.condition) / 4200 : .002 + (100 - machine.condition) / 12000
    if (machine.condition <= 0 || Math.random() < chance) {
      machine.broken = true
      machine.enabled = false
      showToast(`${MACHINES[key].name} quebrou e precisa de reparo.`)
      continue
    }
    const oldTool = state.selectedTool
    if (key === 'irrigator') {
      const plot = state.plots.find(item => item.crop && !item.watered)
      if (plot) { state.selectedTool = 'water'; performPlotAction(plot.id, true) }
    }
    if (key === 'planter') {
      const plot = state.plots.find(item => item.tilled && !item.crop)
      if (plot && state.coins >= CROPS[state.selectedCrop].seedCost) { state.selectedTool = 'seed'; performPlotAction(plot.id, true) }
    }
    if (key === 'harvester') {
      const plot = state.plots.find(item => item.crop && growthProgress(item) >= 1)
      if (plot) { state.selectedTool = 'harvest'; performPlotAction(plot.id, true) }
    }
    state.selectedTool = oldTool
  }
  save()
}

function toSvgPoint(clientX: number, clientY: number): Point {
  const point = svg.createSVGPoint()
  point.x = clientX
  point.y = clientY
  const matrix = svg.getScreenCTM()
  if (!matrix) return player
  const transformed = point.matrixTransform(matrix.inverse())
  return { x: transformed.x, y: transformed.y }
}

function nearestPlot(point: Point): number | null {
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
}

function goTo(target: Point, action: QueuedAction = null): void {
  moveTarget = { x: clamp(target.x, 55, 1545), y: clamp(target.y, 65, 845) }
  queuedAction = action
  marker.setAttribute('cx', String(moveTarget.x))
  marker.setAttribute('cy', String(moveTarget.y))
  marker.setAttribute('opacity', '1')
  window.setTimeout(() => marker.setAttribute('opacity', '0'), 450)
}

function handleSceneInput(clientX: number, clientY: number): void {
  if (!running || (dom.dialog && !dom.dialog.classList.contains('hidden'))) return
  const point = toSvgPoint(clientX, clientY)
  const plotId = nearestPlot(point)
  if (plotId !== null) {
    const position = plotPositions[plotId]
    if (position) goTo({ x: position.x + 72, y: position.y + 42 }, { type: 'plot', id: plotId })
    return
  }
  const building = nearestBuilding(point)
  if (building) {
    goTo(buildingTargets[building].entrance, { type: 'building', id: building })
    return
  }
  goTo(point)
}

function updatePlayer(delta: number): void {
  if (!moveTarget || !running) {
    farmer.classList.remove('walking')
    return
  }
  const dx = moveTarget.x - player.x
  const dy = moveTarget.y - player.y
  const remaining = Math.hypot(dx, dy)
  if (remaining < 5) {
    player = moveTarget
    moveTarget = null
    farmer.classList.remove('walking')
    if (queuedAction?.type === 'plot') performPlotAction(queuedAction.id)
    if (queuedAction?.type === 'building') openBuilding(queuedAction.id)
    queuedAction = null
    save()
  } else {
    const step = Math.min(remaining, delta * 220)
    player.x += (dx / remaining) * step
    player.y += (dy / remaining) * step
    farmer.classList.add('walking')
  }
  farmer.setAttribute('transform', `translate(${player.x.toFixed(1)} ${player.y.toFixed(1)})`)
}

function rotateWeather(now: number): void {
  if (now - state.weatherChangedAt < 90000) return
  const random = Math.random()
  state.weather = random < .18 ? 'rain' : random < .42 ? 'cloudy' : 'sunny'
  state.weatherChangedAt = Date.now()
  if (state.weather === 'rain') {
    state.plots.forEach(plot => { if (plot.crop) plot.watered = true })
    renderPlots()
    showToast('Começou a chover. As plantações foram regadas.')
  } else {
    showToast(state.weather === 'cloudy' ? 'O tempo ficou nublado.' : 'O sol voltou a aparecer.')
  }
  save()
}

function updateSceneMood(): void {
  const hour = dayElapsed / 60
  const night = hour < 6 || hour > 19
  const evening = hour > 17 && hour <= 19
  viewport.style.filter = night ? 'brightness(.58) saturate(.82) hue-rotate(8deg)' : evening ? 'sepia(.16) saturate(1.08)' : state.weather === 'cloudy' ? 'brightness(.9) saturate(.85)' : ''
}

function updateZoom(): void {
  svg.style.transform = `scale(${zoom})`
}

function menuDialog(): void {
  openDialog(`<button class="modal-close" type="button">×</button><h2>AgroFarm</h2><div class="hero-row"><span class="hero-icon">🌱</span><div><strong>${currentLevel(state).label}</strong><p>Clique ou toque no mapa para caminhar. Clique em canteiros e construções para interagir.</p></div></div><div class="shop-grid"><article class="shop-item"><strong>🖱️ Computador</strong><small>Mouse para mover, selecionar ferramentas e acessar a fazenda.</small></article><article class="shop-item"><strong>👆 Celular</strong><small>Toque no destino, canteiro ou construção.</small></article><article class="shop-item"><strong>💾 Salvamento automático</strong><small>O progresso fica salvo neste navegador.</small></article><article class="shop-item"><strong>🌦️ Mundo vivo</strong><small>Clima e horário afetam o visual e o cuidado da fazenda.</small></article></div><button class="primary" data-save="1">Salvar agora</button><button class="primary danger" data-reset="1">Reiniciar fazenda</button>`)
}

function frame(now: number): void {
  const delta = Math.min(.05, (now - lastFrame) / 1000)
  lastFrame = now
  if (running) {
    dayElapsed = (dayElapsed + delta * 2.4) % 1440
    updatePlayer(delta)
    rotateWeather(Date.now())
    updateSceneMood()
    state.plots.forEach(plot => {
      if (plot.crop && growthProgress(plot) >= 1) renderPlots()
    })
    if (now - lastAutomation > 5000) { lastAutomation = now; runAutomation() }
    if (now - lastSave > 12000) { lastSave = now; save() }
    updateHud()
  }
  requestAnimationFrame(frame)
}

svg.addEventListener('pointerup', event => {
  if (event.button !== 0 && event.pointerType !== 'touch') return
  handleSceneInput(event.clientX, event.clientY)
})

svg.addEventListener('pointermove', event => {
  const point = toSvgPoint(event.clientX, event.clientY)
  const plotId = nearestPlot(point)
  plotsLayer.querySelectorAll('.plot-group').forEach(element => element.classList.remove('active'))
  if (plotId !== null) plotsLayer.querySelector(`[data-plot="${plotId}"]`)?.classList.add('active')
})

svg.addEventListener('pointerleave', () => plotsLayer.querySelectorAll('.plot-group').forEach(element => element.classList.remove('active')))

dom.toolbar?.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLElement>('[data-tool]')
  if (button?.dataset.tool) setTool(button.dataset.tool as ToolKey)
})

dom.cropPicker?.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLElement>('[data-crop]')
  if (button?.dataset.crop) setCrop(button.dataset.crop as CropKey)
})

dom.mode?.addEventListener('click', () => {
  state.mode = state.mode === 'free' ? 'realistic' : 'free'
  save()
  updateHud()
  showToast(state.mode === 'free' ? 'Modo Livre ativado.' : 'Modo Realista ativado: perdas e falhas são mais severas.')
})

dom.menu?.addEventListener('click', menuDialog)
dom.zoomIn?.addEventListener('click', () => { zoom = clamp(zoom + .1, .9, 1.45); updateZoom() })
dom.zoomOut?.addEventListener('click', () => { zoom = clamp(zoom - .1, .9, 1.45); updateZoom() })
dom.cameraHome?.addEventListener('click', () => { zoom = 1; updateZoom() })

dom.dialog?.addEventListener('click', event => {
  const target = event.target as HTMLElement
  if (target === dom.dialog || target.closest('.modal-close')) { closeDialog(); return }
  const sell = target.closest<HTMLElement>('[data-sell]')?.dataset.sell as CropKey | undefined
  if (sell) { sellCrop(sell); return }
  const machine = target.closest<HTMLElement>('[data-machine]')?.dataset.machine as MachineKey | undefined
  if (machine) { handleMachine(machine); return }
  const upgradeType = target.closest<HTMLElement>('[data-upgrade]')?.dataset.upgrade as 'house' | 'barn' | undefined
  if (upgradeType) { upgrade(upgradeType); return }
  if (target.closest('[data-save]')) { save(); showToast('Progresso salvo.') }
  if (target.closest('[data-reset]') && window.confirm('Reiniciar a fazenda e apagar o progresso deste navegador?')) {
    resetState()
    state = createFreshState()
    window.location.reload()
  }
})

window.addEventListener('keydown', event => {
  if (event.code === 'Escape') closeDialog()
  if (/^Digit[1-5]$/.test(event.code)) {
    const tools: ToolKey[] = ['hoe', 'seed', 'water', 'protect', 'harvest']
    const index = Number(event.code.at(-1)) - 1
    const tool = tools[index]
    if (tool) setTool(tool)
  }
})

dom.play?.addEventListener('click', () => {
  running = true
  dom.loading?.classList.add('ready')
  window.setTimeout(() => dom.loading?.classList.add('hidden'), 500)
})

renderTrees()
renderFlowers()
renderPlots()
setTool(state.selectedTool)
setCrop(state.selectedCrop)
updateHud()
farmer.setAttribute('transform', `translate(${player.x} ${player.y})`)
requestAnimationFrame(frame)
