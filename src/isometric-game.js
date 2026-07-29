/* global Phaser */

const ASSET_ROOT = './assets/kenney/'
const SAVE_KEY = 'agrofarm-isometric-v4'

const CROPS = {
  corn: { name: 'Milho', icon: '🌽', seedCost: 4, salePrice: 3, baseYield: 3, growMs: 70_000, tint: 0xffd54f },
  cassava: { name: 'Mandioca', icon: '🌿', seedCost: 8, salePrice: 4, baseYield: 5, growMs: 105_000, tint: 0x7cb342 },
  pineapple: { name: 'Abacaxi', icon: '🍍', seedCost: 15, salePrice: 6, baseYield: 6, growMs: 150_000, tint: 0xffb33a },
}

const LEVELS = [
  { level: 1, cost: 0, multiplier: 1 },
  { level: 2, cost: 150, multiplier: 1.2 },
  { level: 3, cost: 450, multiplier: 1.4 },
  { level: 4, cost: 1_200, multiplier: 1.6 },
  { level: 5, cost: 3_000, multiplier: 1.8 },
]

const BARNS = [
  { level: 1, cost: 0, capacity: 10 },
  { level: 2, cost: 100, capacity: 20 },
  { level: 3, cost: 300, capacity: 35 },
  { level: 4, cost: 800, capacity: 55 },
]

const MACHINES = {
  irrigator: { name: 'Irrigador automático', icon: '💧', cost: 65, unlock: 1, repair: 18 },
  planter: { name: 'Plantadeira', icon: '🚜', cost: 120, unlock: 2, repair: 35 },
  harvester: { name: 'Colheitadeira', icon: '⚙️', cost: 240, unlock: 3, repair: 70 },
}

const ui = {
  coins: document.querySelector('#coins'),
  level: document.querySelector('#farm-level'),
  capacity: document.querySelector('#capacity'),
  mode: document.querySelector('#mode-button'),
  menu: document.querySelector('#menu-button'),
  missionTitle: document.querySelector('#mission-title'),
  missionText: document.querySelector('#mission-text'),
  missionBar: document.querySelector('#mission-bar'),
  interaction: document.querySelector('#interaction'),
  interactionText: document.querySelector('#interaction-text'),
  toast: document.querySelector('#toast'),
  dialog: document.querySelector('#dialog'),
  dialogContent: document.querySelector('#dialog-content'),
  play: document.querySelector('#play-button'),
  start: document.querySelector('#start-screen'),
  action: document.querySelector('#action-button'),
  joystick: document.querySelector('#joystick'),
  stick: document.querySelector('#stick'),
}

function emptyPlot(id) {
  return { id, tilled: false, crop: null, plantedAt: 0, watered: false, protected: false }
}

function initialState() {
  return {
    version: 4,
    coins: 100,
    level: 1,
    barnLevel: 1,
    barnCapacity: 10,
    mode: 'free',
    selectedTool: 'hoe',
    selectedCrop: 'corn',
    inventory: { corn: 0, cassava: 0, pineapple: 0 },
    plots: Array.from({ length: 16 }, (_, id) => emptyPlot(id)),
    player: { x: 720, y: 720, direction: 'down' },
    stats: { tilled: 0, planted: 0, harvested: 0, sold: 0 },
    machines: Object.fromEntries(Object.keys(MACHINES).map((id) => [id, {
      owned: false,
      enabled: false,
      condition: 100,
      broken: false,
    }])),
  }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY))
    if (saved?.version !== 4) return initialState()
    saved.plots = Array.from({ length: 16 }, (_, id) => ({ ...emptyPlot(id), ...(saved.plots?.[id] || {}) }))
    return saved
  } catch {
    return initialState()
  }
}

let state = loadState()
let farmScene = null
let toastTimer = null
let joystickVector = { x: 0, y: 0 }

function saveState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state))
}

function usedCapacity() {
  return Object.values(state.inventory).reduce((sum, quantity) => sum + Number(quantity || 0), 0)
}

function levelData() {
  return LEVELS.find((item) => item.level === state.level) || LEVELS.at(-1)
}

function nextLevel() {
  return LEVELS.find((item) => item.level === state.level + 1)
}

function nextBarn() {
  return BARNS.find((item) => item.level === state.barnLevel + 1)
}

function formatCoins(value) {
  return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function toast(message) {
  clearTimeout(toastTimer)
  ui.toast.textContent = message
  ui.toast.classList.remove('hidden')
  toastTimer = setTimeout(() => ui.toast.classList.add('hidden'), 2_600)
}

function updateHud() {
  ui.coins.textContent = formatCoins(state.coins)
  ui.level.textContent = `LV ${state.level}`
  ui.capacity.textContent = `${usedCapacity()}/${state.barnCapacity}`
  ui.mode.textContent = state.mode === 'free' ? 'Livre' : 'Realista'

  const stats = state.stats
  let title = 'Prepare seu primeiro terreno'
  let text = 'Escolha a enxada e toque em um lote.'
  let progress = 0
  if (stats.tilled > 0) {
    title = 'Plante sua primeira cultura'
    text = 'Selecione uma semente e plante na terra preparada.'
    progress = 25
  }
  if (stats.planted > 0) {
    title = 'Cuide da plantação'
    text = 'Regue e aplique defensivo para aumentar a colheita.'
    progress = 50
  }
  if (stats.harvested > 0) {
    title = 'Venda no Mercado Rural'
    text = 'Aproxime-se do mercado para negociar sua produção.'
    progress = 75
  }
  if (stats.sold > 0) {
    title = 'Expanda e automatize'
    text = 'Melhore a casa, amplie o galpão e compre máquinas.'
    progress = 100
  }
  ui.missionTitle.textContent = title
  ui.missionText.textContent = text
  ui.missionBar.style.width = `${progress}%`
}

function closeDialog() {
  ui.dialog.classList.add('hidden')
  ui.dialogContent.innerHTML = ''
  farmScene?.setPaused(false)
}

function openDialog(html) {
  ui.dialogContent.innerHTML = html
  ui.dialog.classList.remove('hidden')
  farmScene?.setPaused(true)
}

ui.dialog.addEventListener('click', (event) => {
  if (event.target === ui.dialog || event.target.closest('.modal-close')) closeDialog()
})

function buildingDialog(id) {
  if (id === 'market') {
    const rows = Object.entries(CROPS).map(([cropId, crop]) => {
      const quantity = state.inventory[cropId]
      const unitPrice = crop.salePrice * levelData().multiplier
      return `<article class="shop-item">
        <div class="item-icon">${crop.icon}</div>
        <div><strong>${crop.name}</strong><small>${quantity} unidades · ${formatCoins(unitPrice)} moedas cada</small></div>
        <button data-sell="${cropId}" ${quantity ? '' : 'disabled'}>Vender tudo</button>
      </article>`
    }).join('')
    openDialog(`<button class="modal-close">×</button><span class="dialog-kicker">COMÉRCIO</span><h2>Mercado Rural</h2><p>Venda sua produção e reinvista na propriedade.</p><div class="shop-grid">${rows}</div>`)
  }

  if (id === 'house') {
    const next = nextLevel()
    openDialog(`<button class="modal-close">×</button><span class="dialog-kicker">PROGRESSÃO</span><h2>Casa da Fazenda</h2>
      <div class="dialog-highlight"><span>🏡</span><div><strong>Nível ${state.level}</strong><small>Vendas com multiplicador ${levelData().multiplier.toFixed(1)}x</small></div></div>
      <p>A melhoria da sede aumenta a reputação, libera máquinas e valoriza todas as vendas.</p>
      ${next ? `<button class="primary" data-upgrade="house">Evoluir por ${formatCoins(next.cost)} moedas</button>` : '<p>Nível máximo atual.</p>'}`)
  }

  if (id === 'barn') {
    const next = nextBarn()
    openDialog(`<button class="modal-close">×</button><span class="dialog-kicker">ARMAZENAMENTO</span><h2>Galpão nível ${state.barnLevel}</h2>
      <div class="dialog-highlight"><span>🎒</span><div><strong>${usedCapacity()}/${state.barnCapacity}</strong><small>espaços ocupados</small></div></div>
      ${next ? `<button class="primary" data-upgrade="barn">Ampliar para ${next.capacity} espaços · ${formatCoins(next.cost)} moedas</button>` : '<p>Capacidade máxima atual.</p>'}`)
  }

  if (id === 'workshop') {
    const rows = Object.entries(MACHINES).map(([machineId, machine]) => {
      const owned = state.machines[machineId]
      const locked = state.level < machine.unlock
      let label = `Comprar · ${formatCoins(machine.cost)}`
      if (owned.owned) label = owned.broken ? `Consertar · ${formatCoins(machine.repair)}` : owned.enabled ? 'Desligar automação' : 'Ativar automação'
      return `<article class="shop-item">
        <div class="item-icon">${machine.icon}</div>
        <div><strong>${machine.name}</strong><small>${owned.owned ? `Condição ${Math.round(owned.condition)}%` : `Libera no nível ${machine.unlock}`}</small></div>
        <button data-machine="${machineId}" ${locked ? 'disabled' : ''}>${label}</button>
      </article>`
    }).join('')
    openDialog(`<button class="modal-close">×</button><span class="dialog-kicker">AUTOMAÇÃO</span><h2>Oficina</h2><p>Máquinas economizam tempo, mas desgastam e podem quebrar.</p><div class="shop-grid">${rows}</div>`)
  }
}

ui.dialog.addEventListener('click', (event) => {
  const cropId = event.target.dataset.sell
  if (cropId) {
    const quantity = state.inventory[cropId]
    if (!quantity) return
    const revenue = Math.round(quantity * CROPS[cropId].salePrice * levelData().multiplier * 100) / 100
    state.inventory[cropId] = 0
    state.coins += revenue
    state.stats.sold += quantity
    saveState()
    updateHud()
    toast(`Venda concluída: ${formatCoins(revenue)} moedas.`)
    buildingDialog('market')
    return
  }

  const upgrade = event.target.dataset.upgrade
  if (upgrade === 'house') {
    const next = nextLevel()
    if (!next || state.coins < next.cost) return toast('Saldo insuficiente para evoluir a casa.')
    state.coins -= next.cost
    state.level = next.level
    saveState()
    updateHud()
    farmScene?.refreshBuildings()
    closeDialog()
    toast(`Casa elevada ao nível ${state.level}.`)
    return
  }

  if (upgrade === 'barn') {
    const next = nextBarn()
    if (!next || state.coins < next.cost) return toast('Saldo insuficiente para ampliar o galpão.')
    state.coins -= next.cost
    state.barnLevel = next.level
    state.barnCapacity = next.capacity
    saveState()
    updateHud()
    closeDialog()
    toast(`Galpão ampliado para ${next.capacity} espaços.`)
    return
  }

  const machineId = event.target.dataset.machine
  if (machineId) {
    const definition = MACHINES[machineId]
    const machine = state.machines[machineId]
    if (!machine.owned) {
      if (state.coins < definition.cost) return toast('Saldo insuficiente para comprar a máquina.')
      state.coins -= definition.cost
      machine.owned = true
    } else if (machine.broken) {
      if (state.coins < definition.repair) return toast('Saldo insuficiente para o reparo.')
      state.coins -= definition.repair
      machine.condition = 100
      machine.broken = false
    } else {
      machine.enabled = !machine.enabled
    }
    saveState()
    updateHud()
    buildingDialog('workshop')
  }
})

async function resolveAssets() {
  try {
    const response = await fetch(`${ASSET_ROOT}manifest.json`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const manifest = await response.json()
    const files = Array.isArray(manifest.files) ? manifest.files : []
    const pick = (...patterns) => {
      for (const pattern of patterns) {
        const match = files.find((file) => pattern.test(file))
        if (match) return `${ASSET_ROOT}${encodeURIComponent(match)}`
      }
      return null
    }
    return {
      dirt: pick(/^dirtFarmland_E\.png$/i, /^dirt_E\.png$/i),
      cornYoung: pick(/^cornYoung_E\.png$/i, /corn.*young.*_E\.png$/i),
      corn: pick(/^corn_E\.png$/i, /corn.*_E\.png$/i),
      fenceE: pick(/^fenceLow_E\.png$/i, /fence.*_E\.png$/i),
      fenceN: pick(/^fenceLow_N\.png$/i, /fence.*_N\.png$/i),
      wall: pick(/^woodWall_E\.png$/i, /woodWall.*_E\.png$/i),
      wallDoor: pick(/^woodWallDoorClosed_E\.png$/i, /woodWallDoor.*_E\.png$/i),
      wallWindow: pick(/^woodWallWindow_E\.png$/i, /woodWallWindow.*_E\.png$/i),
      roof: pick(/^roof_E\.png$/i, /^roof.*_E\.png$/i),
      roofSingle: pick(/^roofSingle_E\.png$/i, /roofSingle.*_E\.png$/i),
      chimneyBase: pick(/^chimneyBase_E\.png$/i),
      chimneyTop: pick(/^chimneyTop_E\.png$/i),
      hay: pick(/^hayBales_E\.png$/i, /hay.*_E\.png$/i),
      hayStack: pick(/^hayBalesStacked_E\.png$/i, /hay.*Stack.*_E\.png$/i),
      sack: pick(/^sack_E\.png$/i, /sack.*_E\.png$/i),
      sacks: pick(/^sacksCrate_E\.png$/i, /sacks.*_E\.png$/i),
      planks: pick(/^planks_E\.png$/i),
    }
  } catch (error) {
    console.warn('Assets Kenney indisponíveis; usando gráficos de contingência.', error)
    return {}
  }
}

const TILE_W = 128
const TILE_H = 64
const MAP_COLS = 17
const MAP_ROWS = 17
const MAP_ORIGIN_X = 1_090
const MAP_ORIGIN_Y = 120

function isoToWorld(col, row) {
  return {
    x: MAP_ORIGIN_X + (col - row) * TILE_W / 2,
    y: MAP_ORIGIN_Y + (col + row) * TILE_H / 2,
  }
}

function diamondPoints(x, y, width = TILE_W, height = TILE_H) {
  return [
    new Phaser.Geom.Point(x, y - height / 2),
    new Phaser.Geom.Point(x + width / 2, y),
    new Phaser.Geom.Point(x, y + height / 2),
    new Phaser.Geom.Point(x - width / 2, y),
  ]
}

class AgroFarmScene extends Phaser.Scene {
  constructor(assetUrls) {
    super('AgroFarmScene')
    this.assetUrls = assetUrls
    this.plotViews = []
    this.buildingViews = new Map()
    this.activeInteraction = null
    this.pausedByModal = false
  }

  preload() {
    for (const [key, url] of Object.entries(this.assetUrls)) {
      if (url) this.load.image(key, url)
    }
  }

  create() {
    farmScene = this
    this.cameras.main.setBackgroundColor('#91c968')
    this.physics.world.setBounds(0, 0, 2_180, 1_250)
    this.createTerrain()
    this.createPathsAndWater()
    this.createField()
    this.createBuildings()
    this.createDecorations()
    this.createAnimals()
    this.createPlayer()
    this.createInput()
    this.refreshAllPlots()
    this.refreshBuildings()
    updateHud()
    this.time.addEvent({ delay: 5_000, loop: true, callback: () => this.runAutomation() })
    this.time.addEvent({ delay: 1_000, loop: true, callback: () => this.refreshGrowingPlots() })
  }

  setPaused(paused) {
    this.pausedByModal = paused
  }

  createTerrain() {
    const graphics = this.add.graphics().setDepth(0)
    for (let row = 0; row < MAP_ROWS; row += 1) {
      for (let col = 0; col < MAP_COLS; col += 1) {
        const { x, y } = isoToWorld(col, row)
        const shade = (col * 7 + row * 11) % 5
        const colors = [0x79b95d, 0x7fc064, 0x75b458, 0x84c469, 0x78b85b]
        graphics.fillStyle(colors[shade], 1)
        graphics.lineStyle(1, 0x6da652, 0.18)
        graphics.fillPoints(diamondPoints(x, y), true)
        graphics.strokePoints(diamondPoints(x, y), true)
      }
    }
    const speckles = this.add.graphics().setDepth(1)
    for (let i = 0; i < 180; i += 1) {
      const col = (i * 7) % MAP_COLS
      const row = (i * 13) % MAP_ROWS
      const base = isoToWorld(col, row)
      const dx = ((i * 31) % 70) - 35
      const dy = ((i * 17) % 28) - 14
      speckles.fillStyle(i % 4 === 0 ? 0xf7df70 : 0x579b47, 0.55)
      speckles.fillCircle(base.x + dx, base.y + dy, i % 4 === 0 ? 2.2 : 1.5)
    }
  }

  createPathsAndWater() {
    const pathTiles = new Set()
    for (let i = 1; i < 16; i += 1) pathTiles.add(`${i},8`)
    for (let i = 2; i < 14; i += 1) pathTiles.add(`4,${i}`)
    for (let i = 3; i < 15; i += 1) pathTiles.add(`13,${i}`)
    for (const id of ['5,7', '6,7', '7,7', '8,7', '9,7', '10,7', '11,7']) pathTiles.add(id)
    const graphics = this.add.graphics().setDepth(2)
    for (const id of pathTiles) {
      const [col, row] = id.split(',').map(Number)
      const { x, y } = isoToWorld(col, row)
      graphics.fillStyle(0xcda268, 1)
      graphics.lineStyle(2, 0xe9c58b, 0.45)
      graphics.fillPoints(diamondPoints(x, y), true)
      graphics.strokePoints(diamondPoints(x, y), true)
    }
    for (let col = 0; col < MAP_COLS; col += 1) {
      const row = 15 + (col % 3 === 0 ? -1 : 0)
      const { x, y } = isoToWorld(col, row)
      graphics.fillStyle(col % 2 ? 0x54b5cb : 0x5cc0d2, 1)
      graphics.lineStyle(2, 0x9ee3e4, 0.55)
      graphics.fillPoints(diamondPoints(x, y, TILE_W, TILE_H + 8), true)
      graphics.strokePoints(diamondPoints(x, y, TILE_W, TILE_H + 8), true)
    }
    const bridge = isoToWorld(8, 14)
    graphics.fillStyle(0xa66d3f, 1)
    graphics.lineStyle(3, 0x75472b, 1)
    graphics.fillPoints(diamondPoints(bridge.x, bridge.y - 2, 176, 58), true)
    graphics.strokePoints(diamondPoints(bridge.x, bridge.y - 2, 176, 58), true)
    for (let i = -60; i <= 60; i += 24) {
      graphics.lineStyle(3, 0xd59a58, 1)
      graphics.lineBetween(bridge.x + i - 24, bridge.y - 14, bridge.x + i + 24, bridge.y + 10)
    }
  }

  createField() {
    const positions = []
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) positions.push({ col: 8 + col, row: 3 + row })
    }
    this.plotViews = positions.map((position, id) => {
      const world = isoToWorld(position.col, position.row)
      const hitArea = new Phaser.Geom.Polygon(diamondPoints(0, 0, 110, 55))
      const container = this.add.container(world.x, world.y).setDepth(world.y + 20)
      const ground = this.add.graphics()
      ground.fillStyle(0x80b963, 1)
      ground.lineStyle(2, 0x5b924c, 0.75)
      ground.fillPoints(diamondPoints(0, 0, 110, 55), true)
      ground.strokePoints(diamondPoints(0, 0, 110, 55), true)
      container.add(ground)
      container.setSize(110, 55)
      container.setInteractive(hitArea, Phaser.Geom.Polygon.Contains)
      container.on('pointerover', () => container.setScale(1.035))
      container.on('pointerout', () => container.setScale(1))
      container.on('pointerdown', () => this.usePlot(id))
      return { id, position, world, container, ground, cropObjects: [] }
    })
    this.createFenceAroundField()
  }

  createFenceAroundField() {
    const segments = []
    for (let col = 7; col <= 12; col += 1) segments.push({ col, row: 2, key: 'fenceE' }, { col, row: 7, key: 'fenceE' })
    for (let row = 3; row <= 6; row += 1) segments.push({ col: 7, row, key: 'fenceN' }, { col: 12, row, key: 'fenceN' })
    for (const segment of segments) {
      const world = isoToWorld(segment.col, segment.row)
      if (this.textures.exists(segment.key)) {
        this.add.image(world.x, world.y + 5, segment.key).setScale(0.32).setOrigin(0.5, 0.78).setDepth(world.y + 80)
      } else {
        const fence = this.add.graphics().setDepth(world.y + 80)
        fence.lineStyle(5, 0xf4e8c2, 1)
        fence.lineBetween(world.x - 38, world.y - 6, world.x + 38, world.y + 12)
        fence.lineStyle(3, 0xcdbd97, 1)
        fence.lineBetween(world.x - 26, world.y - 18, world.x - 26, world.y + 16)
        fence.lineBetween(world.x + 26, world.y - 7, world.x + 26, world.y + 27)
      }
    }
  }

  addAsset(key, x, y, scale = 0.36, depthOffset = 0, tint = null) {
    if (!this.textures.exists(key)) return null
    const image = this.add.image(x, y, key).setOrigin(0.5, 0.82).setScale(scale).setDepth(y + depthOffset)
    if (tint != null) image.setTint(tint)
    return image
  }

  createBuildings() {
    this.createBuilding('house', 'Casa da Fazenda', 3, 3, 0xf2d59a)
    this.createBuilding('market', 'Mercado Rural', 13, 3, 0xf1b864)
    this.createBuilding('barn', 'Galpão', 3, 11, 0xc95343)
    this.createBuilding('workshop', 'Oficina', 13, 11, 0x85999d)
  }

  createBuilding(id, name, col, row, fallbackColor) {
    const world = isoToWorld(col, row)
    const container = this.add.container(world.x, world.y).setDepth(world.y + 240)
    container.add(this.add.ellipse(0, 34, 190, 48, 0x294527, 0.22))
    const hasAssets = this.textures.exists('wall') && this.textures.exists('roof')
    if (hasAssets) {
      const pieces = [
        this.add.image(-52, 0, id === 'house' && this.textures.exists('wallWindow') ? 'wallWindow' : 'wall'),
        this.add.image(0, 16, this.textures.exists('wallDoor') ? 'wallDoor' : 'wall'),
        this.add.image(52, 0, this.textures.exists('wallWindow') ? 'wallWindow' : 'wall'),
        this.add.image(-38, -56, 'roof'),
        this.add.image(38, -38, this.textures.exists('roofSingle') ? 'roofSingle' : 'roof'),
      ]
      pieces.forEach((piece, index) => {
        piece.setOrigin(0.5, 0.82).setScale(index >= 3 ? 0.37 : 0.34)
        container.add(piece)
      })
      if (id === 'barn') pieces.slice(0, 3).forEach((piece) => piece.setTint(0xd36b58))
      if (id === 'workshop') pieces.slice(0, 3).forEach((piece) => piece.setTint(0x92a7a9))
      if (id === 'market') pieces.slice(0, 3).forEach((piece) => piece.setTint(0xf1bd72))
    } else {
      const body = this.add.graphics()
      body.fillStyle(fallbackColor, 1)
      body.lineStyle(4, 0x6b4730, 1)
      body.fillPoints([new Phaser.Geom.Point(-92, -22), new Phaser.Geom.Point(0, 22), new Phaser.Geom.Point(92, -22), new Phaser.Geom.Point(0, -67)], true)
      body.fillStyle(0xa84234, 1)
      body.fillPoints([new Phaser.Geom.Point(-95, -25), new Phaser.Geom.Point(0, -88), new Phaser.Geom.Point(95, -25), new Phaser.Geom.Point(0, 20)], true)
      container.add(body)
    }
    const label = this.add.text(0, -114, name.toUpperCase(), {
      fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px', fontStyle: 'bold',
      color: '#fff8d8', backgroundColor: '#345538cc', padding: { x: 10, y: 5 },
    }).setOrigin(0.5)
    container.add(label)
    const interactionPoint = { id, name, x: world.x, y: world.y + 85 }
    this.buildingViews.set(id, { container, label, interactionPoint })
    container.setSize(210, 200).setInteractive(new Phaser.Geom.Rectangle(-105, -130, 210, 210), Phaser.Geom.Rectangle.Contains)
    container.on('pointerdown', () => buildingDialog(id))
  }

  refreshBuildings() {
    const house = this.buildingViews.get('house')
    if (house) house.label.setText(`CASA LV ${state.level}`)
    const barn = this.buildingViews.get('barn')
    if (barn) barn.label.setText(`GALPÃO ${usedCapacity()}/${state.barnCapacity}`)
  }

  createDecorations() {
    const treePositions = [[1,1],[1,5],[2,7],[1,13],[5,1],[7,1],[10,1],[15,1],[15,6],[15,10],[15,13],[6,12],[8,13],[10,12],[5,15],[12,15]]
    for (const [col, row] of treePositions) this.createTree(col, row)
    const props = [['hayStack',5,10,.36],['hay',6,10,.34],['sacks',12,9,.34],['sack',12,10,.34],['planks',14,10,.32]]
    for (const [key, col, row, scale] of props) {
      const world = isoToWorld(col, row)
      this.addAsset(key, world.x, world.y, scale, 120)
    }
  }

  createTree(col, row) {
    const world = isoToWorld(col, row)
    const container = this.add.container(world.x, world.y).setDepth(world.y + 150)
    const shadow = this.add.ellipse(8, 28, 82, 24, 0x345934, 0.2)
    const trunk = this.add.rectangle(0, 4, 18, 58, 0x765036).setStrokeStyle(3, 0x5d3c28)
    const canopy = [this.add.circle(-20,-28,31,0x3c853f),this.add.circle(22,-29,34,0x4a9847),this.add.circle(0,-58,37,0x39813d),this.add.circle(-2,-8,32,0x58a74e),this.add.ellipse(-11,-66,24,13,0x7bc061)]
    container.add([shadow, trunk, ...canopy])
  }

  createAnimals() {
    this.animals = []
    const positions = [[6,10],[7,10],[6,11]]
    positions.forEach(([col, row], index) => {
      const world = isoToWorld(col, row)
      this.animals.push(this.createCow(world.x, world.y, index))
    })
  }

  createCow(x, y, index) {
    const container = this.add.container(x, y).setDepth(y + 130)
    const shadow = this.add.ellipse(0,19,68,17,0x2b4829,.18)
    const body = this.add.ellipse(0,-1,56,32,0xfff7e7).setStrokeStyle(2,0xcbbfa9)
    const spot1 = this.add.ellipse(-12,-4,17,13,0x6a4937)
    const spot2 = this.add.ellipse(13,4,13,11,0x6a4937)
    const head = this.add.circle(31,-5,14,0xfff7e7).setStrokeStyle(2,0xcbbfa9)
    const nose = this.add.ellipse(40,2,13,8,0xe7b6a1)
    const legs = [-17,13].map((offset) => this.add.rectangle(offset,15,6,21,0x574337))
    container.add([shadow,...legs,body,spot1,spot2,head,nose])
    this.tweens.add({ targets: container, x: x + (index % 2 ? 28 : -22), duration: 4_000 + index * 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
    return container
  }

  createPlayer() {
    const { x, y } = state.player
    this.player = this.add.container(x, y).setDepth(y + 500)
    this.playerShadow = this.add.ellipse(0,25,40,13,0x203820,.24)
    this.playerBody = this.add.ellipse(0,3,27,38,0x2f638f).setStrokeStyle(2,0x234b6e)
    this.playerHead = this.add.circle(0,-23,14,0xe4b17f).setStrokeStyle(2,0x9b6c4a)
    this.playerHat = this.add.ellipse(0,-36,38,10,0xf2d76b).setStrokeStyle(2,0x9a7836)
    this.playerBrim = this.add.rectangle(0,-31,27,8,0x6e452d)
    this.playerLegA = this.add.rectangle(-7,24,8,17,0x654a34)
    this.playerLegB = this.add.rectangle(7,24,8,17,0x654a34)
    this.player.add([this.playerShadow,this.playerLegA,this.playerLegB,this.playerBody,this.playerHead,this.playerBrim,this.playerHat])
    this.physics.add.existing(this.player)
    this.player.body.setCircle(14, -14, -14)
    this.player.body.setCollideWorldBounds(true)
    this.cameras.main.startFollow(this.player, true, .085, .085)
    this.cameras.main.setBounds(0, 0, 2_180, 1_250)
    this.cameras.main.setZoom(innerWidth < 700 ? .85 : 1)
  }

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys()
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,SPACE')
    this.input.keyboard.on('keydown-E', () => this.interact())
    this.input.keyboard.on('keydown-SPACE', (event) => { event.preventDefault(); this.interact() })
    this.input.keyboard.on('keydown', (event) => {
      if (/^Digit[1-5]$/.test(event.code)) document.querySelectorAll('.tool')[Number(event.code.at(-1)) - 1]?.click()
    })
    this.input.on('wheel', (_pointer, _objects, _dx, dy) => {
      const camera = this.cameras.main
      camera.setZoom(Phaser.Math.Clamp(camera.zoom - Math.sign(dy) * .08, .72, 1.25))
    })
  }

  update(_time, delta) {
    if (this.pausedByModal || !ui.start.classList.contains('hidden')) return
    const horizontal = (this.cursors.left.isDown || this.keys.A.isDown ? -1 : 0) + (this.cursors.right.isDown || this.keys.D.isDown ? 1 : 0) + joystickVector.x
    const vertical = (this.cursors.up.isDown || this.keys.W.isDown ? -1 : 0) + (this.cursors.down.isDown || this.keys.S.isDown ? 1 : 0) + joystickVector.y
    const vector = new Phaser.Math.Vector2(horizontal, vertical)
    if (vector.lengthSq() > 1) vector.normalize()
    this.player.body.setVelocity(vector.x * 185, vector.y * 185)
    this.player.setDepth(this.player.y + 500)
    if (vector.lengthSq() > .01) {
      const step = Math.sin(this.time.now / 85)
      this.playerBody.y = 3 + Math.abs(step) * -2
      this.playerLegA.y = 24 + step * 3
      this.playerLegB.y = 24 - step * 3
      state.player.x = this.player.x
      state.player.y = this.player.y
    } else {
      this.playerBody.y = 3
      this.playerLegA.y = 24
      this.playerLegB.y = 24
    }
    this.detectInteraction()
    if (delta > 0 && Math.floor(this.time.now) % 4_000 < 20) saveState()
  }

  detectInteraction() {
    let nearest = null
    for (const view of this.plotViews) {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, view.world.x, view.world.y)
      if (distance < 88 && (!nearest || distance < nearest.distance)) nearest = { type: 'plot', id: view.id, distance }
    }
    for (const [id, view] of this.buildingViews) {
      const point = view.interactionPoint
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, point.x, point.y)
      if (distance < 120 && (!nearest || distance < nearest.distance)) nearest = { type: 'building', id, distance }
    }
    this.activeInteraction = nearest
    if (!nearest) {
      ui.interaction.classList.add('hidden')
      return
    }
    ui.interaction.classList.remove('hidden')
    if (nearest.type === 'building') ui.interactionText.textContent = `Entrar: ${this.buildingViews.get(nearest.id).interactionPoint.name}`
    else {
      const labels = { hoe: 'Preparar terreno', seed: `Plantar ${CROPS[state.selectedCrop].name}`, water: 'Regar', protect: 'Aplicar defensivo', hand: 'Colher' }
      ui.interactionText.textContent = labels[state.selectedTool]
    }
  }

  interact() {
    if (!this.activeInteraction) return
    if (this.activeInteraction.type === 'plot') this.usePlot(this.activeInteraction.id)
    else buildingDialog(this.activeInteraction.id)
  }

  usePlot(id) {
    const plot = state.plots[id]
    const crop = CROPS[state.selectedCrop]
    if (state.selectedTool === 'hoe') {
      if (plot.crop) return toast('Há uma cultura plantada neste terreno.')
      if (plot.tilled) return toast('Este terreno já está preparado.')
      plot.tilled = true
      state.stats.tilled += 1
      toast('Terra preparada!')
    } else if (state.selectedTool === 'seed') {
      if (!plot.tilled) return toast('Prepare a terra com a enxada primeiro.')
      if (plot.crop) return toast('Este lote já está ocupado.')
      if (state.coins < crop.seedCost) return toast('Saldo insuficiente para a semente.')
      state.coins -= crop.seedCost
      plot.crop = state.selectedCrop
      plot.plantedAt = Date.now()
      plot.watered = false
      plot.protected = false
      state.stats.planted += 1
      toast(`${crop.name} plantado.`)
    } else if (state.selectedTool === 'water') {
      if (!plot.crop) return toast('Não existe cultura neste lote.')
      plot.watered = true
      toast('Plantação regada.')
    } else if (state.selectedTool === 'protect') {
      if (!plot.crop) return toast('Não existe cultura neste lote.')
      if (state.coins < 2) return toast('O defensivo custa 2 moedas.')
      state.coins -= 2
      plot.protected = true
      toast('Defensivo aplicado.')
    } else if (state.selectedTool === 'hand') {
      if (!plot.crop) return toast('Não há nada para colher.')
      if (this.cropProgress(plot) < 1) return toast('A cultura ainda não está pronta.')
      const plantedCrop = CROPS[plot.crop]
      let quantity = plantedCrop.baseYield + (plot.watered ? 1 : 0) + (plot.protected ? 1 : 0)
      if (state.mode === 'realistic' && !plot.watered && Math.random() < .4) quantity = Math.max(0, quantity - 3)
      if (state.mode === 'realistic' && !plot.protected && Math.random() < .45) quantity = Math.max(0, quantity - 3)
      const stored = Math.min(quantity, Math.max(0, state.barnCapacity - usedCapacity()))
      if (stored <= 0) return toast(quantity <= 0 ? 'A produção foi perdida.' : 'O galpão está cheio.')
      state.inventory[plot.crop] += stored
      state.stats.harvested += stored
      Object.assign(plot, { crop: null, plantedAt: 0, watered: false, protected: false, tilled: true })
      toast(`${stored} unidades colhidas.`)
    }
    saveState()
    updateHud()
    this.refreshPlot(id)
    this.refreshBuildings()
  }

  cropProgress(plot) {
    if (!plot.crop) return 0
    return Phaser.Math.Clamp((Date.now() - plot.plantedAt) / CROPS[plot.crop].growMs, 0, 1)
  }

  refreshAllPlots() {
    this.plotViews.forEach((view) => this.refreshPlot(view.id))
  }

  refreshGrowingPlots() {
    this.plotViews.forEach((view) => { if (state.plots[view.id].crop) this.refreshPlot(view.id) })
  }

  refreshPlot(id) {
    const view = this.plotViews[id]
    const plot = state.plots[id]
    view.cropObjects.forEach((object) => object.destroy())
    view.cropObjects = []
    view.ground.clear()
    view.ground.fillStyle(plot.tilled ? 0x8c603d : 0x80b963, 1)
    view.ground.lineStyle(2, plot.tilled ? 0x674327 : 0x5b924c, .8)
    view.ground.fillPoints(diamondPoints(0, 0, 110, 55), true)
    view.ground.strokePoints(diamondPoints(0, 0, 110, 55), true)
    if (plot.tilled) {
      view.ground.lineStyle(1.5, 0x6e482d, .8)
      for (let offset = -24; offset <= 24; offset += 12) view.ground.lineBetween(-38 + offset / 2, offset / 2, 38 + offset / 2, offset / 2)
    }
    if (!plot.crop) return
    const crop = CROPS[plot.crop]
    const mature = this.cropProgress(plot) >= 1
    const textureKey = mature && this.textures.exists('corn') ? 'corn' : this.textures.exists('cornYoung') ? 'cornYoung' : null
    const positions = [[-27,-6],[0,7],[27,-6],[-13,15],[14,17]]
    for (const [x, y] of positions) {
      let object
      if (textureKey) {
        object = this.add.image(x, y, textureKey).setOrigin(.5,.82).setScale(mature ? .18 : .14)
        if (plot.crop !== 'corn') object.setTint(crop.tint)
      } else {
        object = this.add.container(x, y)
        object.add([this.add.rectangle(0,-7,3,18,0x4f8b3e),this.add.ellipse(-5,-9,10,5,0x5aa347).setAngle(-25),this.add.ellipse(5,-13,10,5,0x6aae4f).setAngle(25)])
        if (mature) object.add(this.add.circle(2,-18,5,crop.tint))
      }
      view.container.add(object)
      view.cropObjects.push(object)
    }
    if (plot.watered) {
      const drop = this.add.text(-45,-25,'💧',{fontSize:'13px'}).setOrigin(.5)
      view.container.add(drop); view.cropObjects.push(drop)
    }
    if (plot.protected) {
      const shield = this.add.text(45,-25,'🛡️',{fontSize:'12px'}).setOrigin(.5)
      view.container.add(shield); view.cropObjects.push(shield)
    }
    if (mature) {
      const glow = this.add.graphics()
      glow.lineStyle(3,0xffef86,.95); glow.strokePoints(diamondPoints(0,0,104,50),true)
      view.container.add(glow); view.cropObjects.push(glow)
    }
  }

  runAutomation() {
    if (this.pausedByModal) return
    let changed = false
    for (const [machineId, machine] of Object.entries(state.machines)) {
      if (!machine.owned || !machine.enabled || machine.broken) continue
      machine.condition = Math.max(0, machine.condition - .8)
      changed = true
      const chance = machine.condition < 20 ? .18 : machine.condition < 45 ? .06 : .008
      if (machine.condition <= 0 || Math.random() < chance) {
        machine.broken = true; machine.enabled = false; toast(`${MACHINES[machineId].name} apresentou defeito.`); continue
      }
      if (machineId === 'irrigator') {
        const plot = state.plots.find((item) => item.crop && !item.watered)
        if (plot) plot.watered = true
      }
      if (machineId === 'planter') {
        const plot = state.plots.find((item) => item.tilled && !item.crop)
        const crop = CROPS[state.selectedCrop]
        if (plot && state.coins >= crop.seedCost) {
          state.coins -= crop.seedCost
          Object.assign(plot, { crop: state.selectedCrop, plantedAt: Date.now(), watered: false, protected: false })
          state.stats.planted += 1
        }
      }
      if (machineId === 'harvester') {
        const plot = state.plots.find((item) => item.crop && this.cropProgress(item) >= 1)
        if (plot) {
          const previous = state.selectedTool
          state.selectedTool = 'hand'; this.usePlot(plot.id); state.selectedTool = previous
        }
      }
    }
    if (changed) { saveState(); updateHud(); this.refreshAllPlots() }
  }
}

function bindDomControls() {
  document.querySelectorAll('.tool').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tool').forEach((item) => item.classList.remove('active'))
      button.classList.add('active')
      state.selectedTool = button.dataset.tool
      saveState()
    })
  })
  document.querySelectorAll('.crop').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.crop').forEach((item) => item.classList.remove('selected'))
      button.classList.add('selected')
      state.selectedCrop = button.dataset.crop
      saveState()
    })
  })
  ui.mode.addEventListener('click', () => {
    state.mode = state.mode === 'free' ? 'realistic' : 'free'
    saveState(); updateHud(); toast(state.mode === 'free' ? 'Modo Livre ativado.' : 'Modo Realista ativado.')
  })
  ui.menu.addEventListener('click', () => {
    openDialog(`<button class="modal-close">×</button><span class="dialog-kicker">MENU</span><h2>AgroFarm</h2><p>Use WASD ou as setas para explorar. Clique nos lotes ou aproxime-se e pressione E.</p><button class="primary" data-reset="1">Reiniciar fazenda</button>`)
  })
  ui.dialog.addEventListener('click', (event) => {
    if (event.target.dataset.reset) { localStorage.removeItem(SAVE_KEY); location.reload() }
  })
  ui.play.addEventListener('click', () => ui.start.classList.add('hidden'))
  ui.action.addEventListener('click', () => farmScene?.interact())
  let pointerId = null
  ui.joystick.addEventListener('pointerdown', (event) => { pointerId = event.pointerId; ui.joystick.setPointerCapture(pointerId) })
  ui.joystick.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return
    const rectangle = ui.joystick.getBoundingClientRect()
    const x = event.clientX - (rectangle.left + rectangle.width / 2)
    const y = event.clientY - (rectangle.top + rectangle.height / 2)
    const length = Math.hypot(x, y) || 1
    const movement = Math.min(36, length)
    joystickVector = { x: x / length, y: y / length }
    ui.stick.style.transform = `translate(${joystickVector.x * movement}px, ${joystickVector.y * movement}px)`
  })
  const releaseJoystick = () => { pointerId = null; joystickVector = { x: 0, y: 0 }; ui.stick.style.transform = '' }
  ui.joystick.addEventListener('pointerup', releaseJoystick)
  ui.joystick.addEventListener('pointercancel', releaseJoystick)
}

async function bootstrap() {
  if (!window.Phaser) {
    ui.start.querySelector('p').textContent = 'Não foi possível carregar o motor do jogo. Verifique sua conexão e recarregue a página.'
    ui.play.disabled = true
    return
  }
  const assetUrls = await resolveAssets()
  bindDomControls()
  updateHud()
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#91c968',
    antialias: true,
    pixelArt: false,
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: new AgroFarmScene(assetUrls),
  })
}

void bootstrap()
