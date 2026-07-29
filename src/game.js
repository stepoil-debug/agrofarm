const canvas = document.querySelector('#game')
const ctx = canvas.getContext('2d')
ctx.imageSmoothingEnabled = false

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

const WORLD = { width: 1600, height: 1040 }
const CROPS = {
  corn: { name: 'Milho', icon: '🌽', seedCost: 4, sale: 3, yield: 3, growMs: 70000, leaf: '#6fae3c', fruit: '#f1c232' },
  cassava: { name: 'Mandioca', icon: '🌿', seedCost: 8, sale: 4, yield: 5, growMs: 105000, leaf: '#3f8d45', fruit: '#c79c67' },
  pineapple: { name: 'Abacaxi', icon: '🍍', seedCost: 15, sale: 6, yield: 6, growMs: 150000, leaf: '#4c8a41', fruit: '#e8b33d' },
}
const LEVELS = [
  { level: 1, cost: 0, mult: 1 }, { level: 2, cost: 150, mult: 1.2 },
  { level: 3, cost: 450, mult: 1.4 }, { level: 4, cost: 1200, mult: 1.6 },
  { level: 5, cost: 3000, mult: 1.8 },
]
const BARNS = [
  { level: 1, cost: 0, capacity: 10 }, { level: 2, cost: 100, capacity: 20 },
  { level: 3, cost: 300, capacity: 35 }, { level: 4, cost: 800, capacity: 55 },
]
const MACHINES = {
  irrigator: { name: 'Irrigador automático', icon: '💧', cost: 65, repair: 18, unlock: 1 },
  planter: { name: 'Plantadeira', icon: '🚜', cost: 120, repair: 35, unlock: 2 },
  harvester: { name: 'Colheitadeira', icon: '⚙️', cost: 240, repair: 70, unlock: 3 },
}
const STORAGE_KEY = 'agrofarm-real-game-v1'

const fieldOrigin = { x: 720, y: 350 }
const plotSize = 74
const plotGap = 8

function makePlots() {
  return Array.from({ length: 16 }, (_, i) => ({
    id: i,
    x: fieldOrigin.x + (i % 4) * (plotSize + plotGap),
    y: fieldOrigin.y + Math.floor(i / 4) * (plotSize + plotGap),
    tilled: false,
    crop: null,
    plantedAt: 0,
    watered: false,
    protected: false,
  }))
}

function initialState() {
  return {
    version: 2,
    coins: 100,
    level: 1,
    barnLevel: 1,
    barnCapacity: 10,
    mode: 'free',
    selectedTool: 'hoe',
    selectedCrop: 'corn',
    inventory: { corn: 0, cassava: 0, pineapple: 0 },
    plots: makePlots(),
    player: { x: 555, y: 650, dir: 'down' },
    stats: { tilled: 0, planted: 0, harvested: 0, sold: 0 },
    machines: {
      irrigator: { owned: false, enabled: false, condition: 100, broken: false },
      planter: { owned: false, enabled: false, condition: 100, broken: false },
      harvester: { owned: false, enabled: false, condition: 100, broken: false },
    },
  }
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved?.version !== 2) return initialState()
    const freshPlots = makePlots()
    saved.plots = freshPlots.map((base, i) => ({ ...base, ...(saved.plots?.[i] || {}) }))
    return saved
  } catch {
    return initialState()
  }
}

let state = loadState()
let running = false
let lastTime = performance.now()
let now = Date.now()
let toastTimer = null
let activeInteractable = null
let keyboard = new Set()
let joystickVector = { x: 0, y: 0 }
let camera = { x: 0, y: 0 }

const obstacles = [
  { x: 155, y: 185, w: 300, h: 235 },
  { x: 1100, y: 175, w: 270, h: 220 },
  { x: 1120, y: 620, w: 260, h: 220 },
  { x: 70, y: 690, w: 250, h: 190 },
  { x: 470, y: 110, w: 155, h: 120 },
]

const buildings = [
  { id: 'house', name: 'Sede da Fazenda', x: 155, y: 185, w: 300, h: 235, doorX: 305, doorY: 420 },
  { id: 'shop', name: 'Mercado Rural', x: 1100, y: 175, w: 270, h: 220, doorX: 1235, doorY: 395 },
  { id: 'workshop', name: 'Oficina', x: 1120, y: 620, w: 260, h: 220, doorX: 1250, doorY: 840 },
  { id: 'barn', name: 'Galpão', x: 70, y: 690, w: 250, h: 190, doorX: 195, doorY: 880 },
]

const treePositions = [
  [55,80],[120,90],[1450,90],[1510,155],[1450,300],[80,500],[1450,520],[1530,700],
  [430,850],[520,900],[610,870],[920,850],[1020,900],[1440,920],[1500,960],[470,70],
]

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.floor(innerWidth * dpr)
  canvas.height = Math.floor(innerHeight * dpr)
  canvas.style.width = `${innerWidth}px`
  canvas.style.height = `${innerHeight}px`
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.imageSmoothingEnabled = false
}
window.addEventListener('resize', resize)
resize()

function usedCapacity() {
  return Object.values(state.inventory).reduce((sum, qty) => sum + Number(qty || 0), 0)
}
function levelData() { return LEVELS.find(item => item.level === state.level) || LEVELS.at(-1) }
function nextLevel() { return LEVELS.find(item => item.level === state.level + 1) }
function nextBarn() { return BARNS.find(item => item.level === state.barnLevel + 1) }
function distance(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by) }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)) }

function toast(message) {
  clearTimeout(toastTimer)
  ui.toast.textContent = message
  ui.toast.classList.remove('hidden')
  toastTimer = setTimeout(() => ui.toast.classList.add('hidden'), 2600)
}

function closeDialog() {
  ui.dialog.classList.add('hidden')
  ui.dialogContent.innerHTML = ''
}
ui.dialog.addEventListener('click', event => {
  if (event.target === ui.dialog || event.target.closest('.modal-close')) closeDialog()
})

function openDialog(html) {
  ui.dialogContent.innerHTML = html
  ui.dialog.classList.remove('hidden')
}

function roundedRect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke() }
}

function drawGround() {
  ctx.fillStyle = '#6cab55'
  ctx.fillRect(0, 0, WORLD.width, WORLD.height)
  for (let y = 0; y < WORLD.height; y += 32) {
    for (let x = 0; x < WORLD.width; x += 32) {
      const n = ((x / 32) * 13 + (y / 32) * 7) % 11
      ctx.fillStyle = n < 3 ? '#72b45b' : '#69a853'
      ctx.fillRect(x, y, 32, 32)
      if (n === 4) {
        ctx.fillStyle = '#9bc76b'
        ctx.fillRect(x + 8, y + 9, 3, 8)
        ctx.fillRect(x + 4, y + 12, 8, 3)
      }
    }
  }
  drawPath()
  drawPond()
  drawFence()
}

function drawPath() {
  ctx.fillStyle = '#cba56b'
  roundedRect(0, 470, 1600, 120, 12, '#cba56b')
  roundedRect(350, 345, 180, 650, 12, '#cba56b')
  roundedRect(1210, 330, 110, 640, 12, '#cba56b')
  for (let x = 0; x < 1600; x += 46) {
    ctx.fillStyle = '#b98e58'
    ctx.fillRect(x + 12, 505 + (x % 3) * 4, 20, 10)
  }
}

function drawPond() {
  roundedRect(500, 730, 160, 165, 38, '#4ca6b8', '#e3ca8b')
  ctx.fillStyle = '#72c4d1'
  for (let y = 755; y < 875; y += 26) ctx.fillRect(525, y, 95, 5)
  ctx.fillStyle = '#5b9e45'
  ctx.beginPath(); ctx.arc(560, 780, 13, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#efcf69'; ctx.fillRect(556, 774, 7, 7)
}

function drawFence() {
  ctx.fillStyle = '#8a5a32'
  for (let x = 680; x <= 1085; x += 42) {
    ctx.fillRect(x, 310, 8, 28); ctx.fillRect(x, 690, 8, 28)
  }
  ctx.fillRect(680, 320, 405, 7); ctx.fillRect(680, 700, 405, 7)
  for (let y = 320; y <= 700; y += 42) {
    ctx.fillRect(680, y, 8, 28); ctx.fillRect(1078, y, 8, 28)
  }
}

function drawTree(x, y, scale = 1) {
  ctx.fillStyle = '#674326'; ctx.fillRect(x - 8 * scale, y, 16 * scale, 35 * scale)
  const circles = [[0,-15,28],[-18,0,22],[19,2,22],[0,12,25]]
  for (const [dx,dy,r] of circles) {
    ctx.fillStyle = dy < 0 ? '#2f7e3f' : '#3f9248'
    ctx.beginPath(); ctx.arc(x + dx * scale, y + dy * scale, r * scale, 0, Math.PI * 2); ctx.fill()
  }
  ctx.fillStyle = '#68ad50'; ctx.fillRect(x - 11, y - 24, 7, 7)
}

function drawHouse() {
  const b = buildings[0]
  roundedRect(b.x, b.y + 75, b.w, b.h - 75, 8, '#f2d48f', '#5f3c25')
  ctx.fillStyle = '#b64d37'
  ctx.beginPath(); ctx.moveTo(b.x - 18, b.y + 82); ctx.lineTo(b.x + b.w / 2, b.y); ctx.lineTo(b.x + b.w + 18, b.y + 82); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#743523'; ctx.fillRect(b.x + 26, b.y + 100, 56, 22); ctx.fillRect(b.x + 218, b.y + 100, 56, 22)
  ctx.fillStyle = '#87c8d7'; ctx.fillRect(b.x + 34, b.y + 128, 42, 45); ctx.fillRect(b.x + 225, b.y + 128, 42, 45)
  ctx.fillStyle = '#885536'; ctx.fillRect(b.x + 126, b.y + 145, 52, 90)
  ctx.fillStyle = '#efd570'; ctx.fillRect(b.x + 166, b.y + 187, 6, 6)
  ctx.fillStyle = '#fff2b0'; ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'center'; ctx.fillText(`SEDE LV ${state.level}`, b.x + b.w / 2, b.y + 112)
}

function drawShop() {
  const b = buildings[1]
  roundedRect(b.x, b.y + 65, b.w, b.h - 65, 8, '#d8954e', '#58351f')
  ctx.fillStyle = '#713927'; ctx.fillRect(b.x - 10, b.y + 40, b.w + 20, 62)
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = i % 2 ? '#f2d892' : '#b94f39'
    ctx.fillRect(b.x + i * 40 - 5, b.y + 42, 42, 35)
  }
  ctx.fillStyle = '#f7ecbe'; ctx.fillRect(b.x + 60, b.y + 105, 150, 42)
  ctx.fillStyle = '#47351e'; ctx.font = 'bold 19px system-ui'; ctx.textAlign = 'center'; ctx.fillText('MERCADO', b.x + b.w / 2, b.y + 133)
  ctx.fillStyle = '#754529'; ctx.fillRect(b.x + 105, b.y + 155, 60, 65)
}

function drawBarn() {
  const b = buildings[3]
  roundedRect(b.x, b.y + 45, b.w, b.h - 45, 6, '#b94d39', '#552d21')
  ctx.fillStyle = '#6f3025'
  ctx.beginPath(); ctx.moveTo(b.x - 14, b.y + 60); ctx.lineTo(b.x + b.w / 2, b.y); ctx.lineTo(b.x + b.w + 14, b.y + 60); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#efd598'; ctx.fillRect(b.x + 93, b.y + 85, 65, 105)
  ctx.strokeStyle = '#74472e'; ctx.lineWidth = 7
  ctx.beginPath(); ctx.moveTo(b.x + 98, b.y + 90); ctx.lineTo(b.x + 153, b.y + 185); ctx.moveTo(b.x + 153, b.y + 90); ctx.lineTo(b.x + 98, b.y + 185); ctx.stroke()
  ctx.fillStyle = '#fff0b0'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.fillText(`GALPÃO ${usedCapacity()}/${state.barnCapacity}`, b.x + b.w / 2, b.y + 75)
}

function drawWorkshop() {
  const b = buildings[2]
  roundedRect(b.x, b.y + 50, b.w, b.h - 50, 8, '#76848a', '#39464a')
  ctx.fillStyle = '#42545b'; ctx.fillRect(b.x - 10, b.y + 38, b.w + 20, 58)
  ctx.fillStyle = '#d7dfdf'; ctx.fillRect(b.x + 32, b.y + 112, 74, 62)
  ctx.fillStyle = '#2b373b'; ctx.fillRect(b.x + 135, b.y + 105, 90, 115)
  ctx.fillStyle = '#f3d66b'; ctx.font = 'bold 17px system-ui'; ctx.textAlign = 'center'; ctx.fillText('OFICINA', b.x + b.w / 2, b.y + 83)
  ctx.font = '36px system-ui'; ctx.fillText('⚙️', b.x + 68, b.y + 158)
}

function cropProgress(plot) {
  if (!plot.crop) return 0
  return clamp((now - plot.plantedAt) / CROPS[plot.crop].growMs, 0, 1)
}

function drawCrop(plot) {
  const crop = CROPS[plot.crop]
  const progress = cropProgress(plot)
  const cx = plot.x + plotSize / 2
  const cy = plot.y + plotSize / 2 + 12
  const stage = progress < .25 ? 0 : progress < .55 ? 1 : progress < .9 ? 2 : 3
  ctx.fillStyle = crop.leaf
  if (stage === 0) {
    ctx.fillRect(cx - 2, cy + 5, 4, 10)
    ctx.fillRect(cx - 8, cy + 4, 8, 4)
    ctx.fillRect(cx, cy, 8, 4)
  } else {
    const h = 16 + stage * 8
    ctx.fillRect(cx - 3, cy - h, 6, h + 8)
    for (let i = 0; i < stage + 1; i++) {
      ctx.fillRect(cx - 15, cy - h + 8 + i * 8, 13, 5)
      ctx.fillRect(cx + 2, cy - h + 4 + i * 8, 13, 5)
    }
    if (stage === 3) {
      ctx.fillStyle = crop.fruit
      if (plot.crop === 'corn') ctx.fillRect(cx + 4, cy - 24, 8, 18)
      if (plot.crop === 'cassava') { ctx.fillRect(cx - 10, cy + 2, 8, 13); ctx.fillRect(cx + 3, cy + 1, 8, 15) }
      if (plot.crop === 'pineapple') { ctx.fillRect(cx - 9, cy - 17, 18, 23); ctx.fillStyle = '#386f39'; ctx.fillRect(cx - 8, cy - 26, 4, 11); ctx.fillRect(cx + 3, cy - 29, 4, 13) }
    }
  }
  if (plot.watered) { ctx.fillStyle = '#63b7d7'; ctx.fillRect(plot.x + 7, plot.y + 7, 8, 5) }
  if (plot.protected) { ctx.fillStyle = '#eadb83'; ctx.fillRect(plot.x + plotSize - 16, plot.y + 7, 8, 8) }
  if (progress >= 1) {
    ctx.strokeStyle = '#fff2a4'; ctx.lineWidth = 3; ctx.strokeRect(plot.x + 4, plot.y + 4, plotSize - 8, plotSize - 8)
  }
}

function drawField() {
  for (const plot of state.plots) {
    const fill = plot.tilled ? '#7a4f2e' : '#8bbd5f'
    roundedRect(plot.x, plot.y, plotSize, plotSize, 7, fill, plot.tilled ? '#59381f' : '#6c9d4b')
    if (plot.tilled) {
      ctx.strokeStyle = '#5f3d26'; ctx.lineWidth = 2
      for (let y = plot.y + 15; y < plot.y + plotSize - 8; y += 13) {
        ctx.beginPath(); ctx.moveTo(plot.x + 8, y); ctx.lineTo(plot.x + plotSize - 8, y); ctx.stroke()
      }
    }
    if (plot.crop) drawCrop(plot)
  }
  ctx.fillStyle = '#f7e9ad'; ctx.font = 'bold 18px system-ui'; ctx.textAlign = 'center'
  ctx.fillText('ÁREA DE PLANTIO', fieldOrigin.x + 160, fieldOrigin.y - 24)
}

function drawAnimals() {
  const t = performance.now() / 700
  const chickens = [[930 + Math.sin(t) * 16, 735],[980 + Math.sin(t + 2) * 22,770],[1040 + Math.sin(t + 4) * 18,735]]
  for (const [x,y] of chickens) {
    ctx.fillStyle = '#f3eee1'; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#d95839'; ctx.fillRect(x + 7, y - 10, 6, 7)
    ctx.fillStyle = '#e9b93f'; ctx.fillRect(x + 10, y - 2, 7, 4)
    ctx.fillStyle = '#2b2b22'; ctx.fillRect(x + 5, y - 5, 3, 3)
  }
}

function drawPlayer() {
  const p = state.player
  const bob = Math.sin(performance.now() / 120) * (keyboard.size || joystickVector.x || joystickVector.y ? 2 : .3)
  ctx.save(); ctx.translate(p.x, p.y + bob)
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(0, 18, 17, 7, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#334c7a'; ctx.fillRect(-12, -2, 24, 25)
  ctx.fillStyle = '#e6b07c'; ctx.fillRect(-10, -26, 20, 22)
  ctx.fillStyle = '#5e3b29'; ctx.fillRect(-12, -30, 24, 8)
  ctx.fillStyle = '#d9e578'; ctx.fillRect(-17, -34, 34, 7)
  ctx.fillStyle = '#2d2723'
  if (p.dir === 'left') ctx.fillRect(-8, -18, 3, 3)
  else if (p.dir === 'right') ctx.fillRect(5, -18, 3, 3)
  else { ctx.fillRect(-6, -18, 3, 3); ctx.fillRect(4, -18, 3, 3) }
  ctx.fillStyle = '#59422d'; ctx.fillRect(-12, 23, 9, 11); ctx.fillRect(3, 23, 9, 11)
  ctx.restore()
}

function drawWorld() {
  ctx.save()
  ctx.translate(-camera.x, -camera.y)
  drawGround()
  treePositions.forEach(([x,y]) => drawTree(x,y,1))
  drawHouse(); drawShop(); drawBarn(); drawWorkshop(); drawField(); drawAnimals(); drawPlayer()
  ctx.restore()

  const cycle = (Date.now() / 1000) % 180
  const darkness = cycle > 125 ? Math.min(.32, (cycle - 125) / 80) : cycle < 20 ? (.32 - cycle / 65) : 0
  if (darkness > 0) {
    ctx.fillStyle = `rgba(8,18,40,${darkness})`
    ctx.fillRect(0,0,innerWidth,innerHeight)
  }
}

function collides(x, y) {
  const margin = 14
  if (x < margin || y < margin || x > WORLD.width - margin || y > WORLD.height - margin) return true
  return obstacles.some(o => x > o.x - margin && x < o.x + o.w + margin && y > o.y - margin && y < o.y + o.h + margin)
}

function movementVector() {
  let x = 0, y = 0
  if (keyboard.has('ArrowLeft') || keyboard.has('KeyA')) x -= 1
  if (keyboard.has('ArrowRight') || keyboard.has('KeyD')) x += 1
  if (keyboard.has('ArrowUp') || keyboard.has('KeyW')) y -= 1
  if (keyboard.has('ArrowDown') || keyboard.has('KeyS')) y += 1
  x += joystickVector.x; y += joystickVector.y
  const length = Math.hypot(x,y)
  return length > 1 ? { x: x / length, y: y / length } : { x, y }
}

function updatePlayer(dt) {
  if (!running || !ui.dialog.classList.contains('hidden')) return
  const v = movementVector()
  const speed = 190
  if (Math.abs(v.x) > Math.abs(v.y)) state.player.dir = v.x < 0 ? 'left' : 'right'
  else if (Math.abs(v.y) > .1) state.player.dir = v.y < 0 ? 'up' : 'down'
  const nx = state.player.x + v.x * speed * dt
  const ny = state.player.y + v.y * speed * dt
  if (!collides(nx, state.player.y)) state.player.x = nx
  if (!collides(state.player.x, ny)) state.player.y = ny
  const maxCameraX = Math.max(0, WORLD.width - innerWidth)
  const maxCameraY = Math.max(0, WORLD.height - innerHeight)
  camera.x += (clamp(state.player.x - innerWidth / 2, 0, maxCameraX) - camera.x) * .12
  camera.y += (clamp(state.player.y - innerHeight / 2, 0, maxCameraY) - camera.y) * .12
}

function nearestPlot() {
  return state.plots
    .map(plot => ({ ...plot, distance: distance(state.player.x, state.player.y, plot.x + plotSize / 2, plot.y + plotSize / 2) }))
    .filter(plot => plot.distance < 72)
    .sort((a,b) => a.distance - b.distance)[0] || null
}

function detectInteraction() {
  const plot = nearestPlot()
  if (plot) {
    const actionNames = { hoe: 'Preparar terreno', seed: `Plantar ${CROPS[state.selectedCrop].name}`, water: 'Regar', protect: 'Aplicar defensivo', hand: 'Colher' }
    activeInteractable = { type: 'plot', id: plot.id }
    ui.interactionText.textContent = actionNames[state.selectedTool]
    ui.interaction.classList.remove('hidden')
    return
  }
  const building = buildings
    .map(item => ({ ...item, distance: distance(state.player.x, state.player.y, item.doorX, item.doorY) }))
    .filter(item => item.distance < 95)
    .sort((a,b) => a.distance - b.distance)[0]
  if (building) {
    activeInteractable = { type: 'building', id: building.id }
    ui.interactionText.textContent = `Entrar: ${building.name}`
    ui.interaction.classList.remove('hidden')
    return
  }
  activeInteractable = null
  ui.interaction.classList.add('hidden')
}

function usePlot(plot) {
  const original = state.plots[plot.id]
  if (state.selectedTool === 'hoe') {
    if (original.crop) return toast('Há uma plantação neste terreno.')
    if (original.tilled) return toast('Este terreno já está preparado.')
    original.tilled = true; state.stats.tilled++; toast('Terra preparada!')
  }
  if (state.selectedTool === 'seed') {
    const crop = CROPS[state.selectedCrop]
    if (!original.tilled) return toast('Use a enxada primeiro.')
    if (original.crop) return toast('Este terreno já está ocupado.')
    if (state.coins < crop.seedCost) return toast('Moedas insuficientes para a semente.')
    state.coins -= crop.seedCost
    Object.assign(original, { crop: state.selectedCrop, plantedAt: Date.now(), watered: false, protected: false })
    state.stats.planted++; toast(`${crop.name} plantado por ${crop.seedCost} moedas.`)
  }
  if (state.selectedTool === 'water') {
    if (!original.crop) return toast('Não há cultura para regar.')
    if (original.watered) return toast('Esta cultura já foi regada.')
    original.watered = true; toast('Plantação regada.')
  }
  if (state.selectedTool === 'protect') {
    if (!original.crop) return toast('Não há cultura neste terreno.')
    if (original.protected) return toast('O defensivo já foi aplicado.')
    if (state.coins < 2) return toast('São necessárias 2 moedas.')
    state.coins -= 2; original.protected = true; toast('Defensivo aplicado.')
  }
  if (state.selectedTool === 'hand') harvestPlot(original)
  save(); refreshUI()
}

function harvestPlot(plot) {
  if (!plot.crop) return toast('Nada para colher aqui.')
  if (cropProgress(plot) < 1) return toast('A cultura ainda está crescendo.')
  const crop = CROPS[plot.crop]
  let factor = 1
  const problems = []
  if (plot.watered) factor += .15
  if (plot.protected) factor += .15
  if (state.mode === 'realistic') {
    if (!plot.watered && Math.random() < .42) { factor -= .55; problems.push('seca') }
    if (!plot.protected && Math.random() < .48) { factor -= .55; problems.push('praga') }
    if (!plot.watered && !plot.protected && Math.random() < .16) factor = 0
  }
  const total = Math.max(0, Math.floor(crop.yield * Math.max(0, factor)))
  const space = Math.max(0, state.barnCapacity - usedCapacity())
  const stored = Math.min(total, space)
  state.inventory[plot.crop] += stored
  state.stats.harvested += stored
  const name = crop.name
  Object.assign(plot, { crop: null, plantedAt: 0, watered: false, protected: false })
  if (!total) toast(`${name} perdido por falta de cuidado.`)
  else if (stored < total) toast(`${stored} guardados e ${total - stored} perdidos: galpão cheio.`)
  else toast(`${stored} unidades de ${name} colhidas${problems.length ? ' com perdas' : ''}.`)
}

function performAction() {
  if (!running || !ui.dialog.classList.contains('hidden')) return
  if (!activeInteractable) return toast('Aproxime-se de um terreno ou construção.')
  if (activeInteractable.type === 'plot') usePlot(state.plots[activeInteractable.id])
  else openBuilding(activeInteractable.id)
}

function openBuilding(id) {
  if (id === 'house') openHouse()
  if (id === 'barn') openBarn()
  if (id === 'shop') openShop()
  if (id === 'workshop') openWorkshop()
}

function openHouse() {
  const next = nextLevel()
  openDialog(`
    <span class="eyebrow">SEDE DA FAZENDA</span><h2>Casa nível ${state.level}</h2>
    <p>Seu nível aumenta a reputação e o preço recebido em todas as vendas. Multiplicador atual: <strong>${levelData().mult.toFixed(1)}x</strong>.</p>
    <div class="shop-grid">
      <article class="shop-item"><span style="font-size:42px">🏡</span><strong>Próxima melhoria</strong><small>${next ? `Nível ${next.level} · vendas em ${next.mult.toFixed(1)}x` : 'Nível máximo atual'}</small><button id="upgrade-house" ${!next || state.coins < next.cost ? 'disabled' : ''}>${next ? `Melhorar por ${next.cost} moedas` : 'Completo'}</button></article>
      <article class="shop-item"><span style="font-size:42px">📊</span><strong>Resumo da fazenda</strong><small>${state.stats.planted} plantios · ${state.stats.harvested} colhidos · ${state.stats.sold} vendidos</small></article>
    </div>`)
  document.querySelector('#upgrade-house')?.addEventListener('click', () => {
    const level = nextLevel(); if (!level || state.coins < level.cost) return
    state.coins -= level.cost; state.level = level.level; save(); closeDialog(); toast(`Sede elevada ao nível ${level.level}!`); refreshUI()
  })
}

function openBarn() {
  const next = nextBarn()
  openDialog(`
    <span class="eyebrow">ARMAZENAMENTO</span><h2>Galpão nível ${state.barnLevel}</h2>
    <p>Capacidade usada: <strong>${usedCapacity()}/${state.barnCapacity}</strong>. Produtos excedentes são perdidos na colheita.</p>
    <div class="shop-grid">
      ${Object.entries(CROPS).map(([id,crop]) => `<article class="shop-item"><span style="font-size:36px">${crop.icon}</span><strong>${crop.name}</strong><small>${state.inventory[id]} unidades armazenadas</small></article>`).join('')}
      <article class="shop-item"><span style="font-size:36px">🧱</span><strong>Ampliar galpão</strong><small>${next ? `${next.capacity} espaços` : 'Capacidade máxima atual'}</small><button id="upgrade-barn" ${!next || state.coins < next.cost ? 'disabled' : ''}>${next ? `Ampliar por ${next.cost} moedas` : 'Completo'}</button></article>
    </div>`)
  document.querySelector('#upgrade-barn')?.addEventListener('click', () => {
    const barn = nextBarn(); if (!barn || state.coins < barn.cost) return
    state.coins -= barn.cost; state.barnLevel = barn.level; state.barnCapacity = barn.capacity; save(); closeDialog(); toast(`Galpão ampliado para ${barn.capacity} espaços.`); refreshUI()
  })
}

function openShop() {
  openDialog(`
    <span class="eyebrow">MERCADO RURAL</span><h2>Venda sua produção</h2>
    <p>O preço recebido inclui o multiplicador de <strong>${levelData().mult.toFixed(1)}x</strong> da sua sede.</p>
    <div class="shop-grid">
      ${Object.entries(CROPS).map(([id,crop]) => {
        const qty = state.inventory[id]
        const revenue = Math.round(qty * crop.sale * levelData().mult * 100) / 100
        return `<article class="shop-item"><span style="font-size:38px">${crop.icon}</span><strong>${crop.name}</strong><small>${qty} unidades · ${revenue.toFixed(2)} moedas</small><button data-sell="${id}" ${qty ? '' : 'disabled'}>Vender tudo</button></article>`
      }).join('')}
    </div>`)
  document.querySelectorAll('[data-sell]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.sell; const qty = state.inventory[id]; if (!qty) return
    const revenue = Math.round(qty * CROPS[id].sale * levelData().mult * 100) / 100
    state.inventory[id] = 0; state.coins += revenue; state.stats.sold += qty
    save(); closeDialog(); toast(`Venda concluída: ${revenue.toFixed(2)} moedas.`); refreshUI()
  }))
}

function machineCard(id, machine) {
  const def = MACHINES[id]
  const locked = state.level < def.unlock
  return `<article class="shop-item"><span style="font-size:38px">${def.icon}</span><strong>${def.name}</strong><small>${locked ? `Libera no nível ${def.unlock}` : machine.owned ? `Conservação ${machine.condition}%${machine.broken ? ' · QUEBRADA' : ''}` : `Compra: ${def.cost} moedas`}</small>
    ${machine.owned ? `<button data-machine-toggle="${id}" ${machine.broken ? 'disabled' : ''}>${machine.enabled ? 'Desligar automação' : 'Ligar automação'}</button><button data-machine-repair="${id}" ${machine.condition === 100 && !machine.broken ? 'disabled' : ''}>Reparar por ${def.repair} moedas</button>` : `<button data-machine-buy="${id}" ${locked || state.coins < def.cost ? 'disabled' : ''}>Comprar</button>`}
  </article>`
}

function openWorkshop() {
  openDialog(`
    <span class="eyebrow">OFICINA E AUTOMAÇÃO</span><h2>Maquinário agrícola</h2>
    <p>Máquinas trabalham sozinhas, mas desgastam e podem quebrar. A manutenção evita perdas maiores.</p>
    <div class="shop-grid">${Object.entries(state.machines).map(([id,m]) => machineCard(id,m)).join('')}</div>`)
  document.querySelectorAll('[data-machine-buy]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.machineBuy; const def = MACHINES[id]
    if (state.coins < def.cost || state.level < def.unlock) return
    state.coins -= def.cost; state.machines[id].owned = true; save(); openWorkshop(); refreshUI(); toast(`${def.name} comprada.`)
  }))
  document.querySelectorAll('[data-machine-toggle]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.machineToggle; const m = state.machines[id]
    if (m.broken) return
    m.enabled = !m.enabled; save(); openWorkshop(); toast(`${MACHINES[id].name} ${m.enabled ? 'ligada' : 'desligada'}.`)
  }))
  document.querySelectorAll('[data-machine-repair]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.machineRepair; const def = MACHINES[id]
    if (state.coins < def.repair) return toast('Saldo insuficiente para o reparo.')
    state.coins -= def.repair; Object.assign(state.machines[id], { condition: 100, broken: false, enabled: false }); save(); openWorkshop(); refreshUI(); toast(`${def.name} reparada.`)
  }))
}

function openMenu() {
  openDialog(`
    <span class="eyebrow">MENU DO JOGO</span><h2>AgroFarm</h2>
    <p>Explore o mapa, aproxime-se das construções e cuide dos terrenos. Seu progresso é salvo automaticamente neste aparelho.</p>
    <div class="shop-grid">
      <article class="shop-item"><strong>Controles</strong><small>WASD/setas para andar · E ou Ação para interagir · 1 a 5 trocam ferramentas.</small></article>
      <article class="shop-item"><strong>Modo de jogo</strong><small>${state.mode === 'free' ? 'Livre: produção protegida.' : 'Realista: seca, pragas e perdas ativas.'}</small><button id="toggle-mode-menu">Alternar modo</button></article>
      <article class="shop-item"><strong>Recomeçar</strong><small>Apaga o progresso local e cria uma nova fazenda.</small><button id="reset-game">Reiniciar fazenda</button></article>
    </div>`)
  document.querySelector('#toggle-mode-menu')?.addEventListener('click', toggleMode)
  document.querySelector('#reset-game')?.addEventListener('click', () => {
    state = initialState(); save(); closeDialog(); refreshUI(); toast('Uma nova fazenda foi criada.')
  })
}

function toggleMode() {
  state.mode = state.mode === 'free' ? 'realistic' : 'free'
  save(); closeDialog(); refreshUI(); toast(state.mode === 'free' ? 'Modo Livre ativado.' : 'Modo Realista ativado: cuide bem da produção.')
}

function updateMission() {
  let title, text, progress
  if (state.stats.tilled < 1) { title = 'Prepare seu primeiro terreno'; text = 'Equipe a enxada e use-a perto de um lote.'; progress = 0 }
  else if (state.stats.planted < 1) { title = 'Plante sua primeira cultura'; text = 'Escolha uma semente e plante no terreno preparado.'; progress = 25 }
  else if (!state.plots.some(p => p.watered)) { title = 'Regue a plantação'; text = 'A água aumenta a produção e evita perdas.'; progress = 50 }
  else if (state.stats.harvested < 1) { title = 'Espere e faça a colheita'; text = 'Quando a cultura brilhar, use a cesta.'; progress = 70 }
  else if (state.stats.sold < 1) { title = 'Venda no Mercado Rural'; text = 'Leve sua produção ao mercado no lado direito do mapa.'; progress = 90 }
  else { title = 'Evolua sua sede'; text = 'Aumente o nível para lucrar mais e liberar máquinas.'; progress = 100 }
  ui.missionTitle.textContent = title; ui.missionText.textContent = text; ui.missionBar.style.width = `${progress}%`
}

function refreshUI() {
  ui.coins.textContent = Number(state.coins).toFixed(2)
  ui.level.textContent = `LV ${state.level}`
  ui.capacity.textContent = `${usedCapacity()}/${state.barnCapacity}`
  ui.mode.textContent = state.mode === 'free' ? 'Livre' : 'Realista'
  document.querySelectorAll('.tool').forEach(btn => btn.classList.toggle('active', btn.dataset.tool === state.selectedTool))
  document.querySelectorAll('.crop').forEach(btn => btn.classList.toggle('selected', btn.dataset.crop === state.selectedCrop))
  updateMission()
}

function automationCycle() {
  if (!running) return
  for (const [id, machine] of Object.entries(state.machines)) {
    if (!machine.owned || !machine.enabled || machine.broken) continue
    let target = null
    if (id === 'irrigator') target = state.plots.find(p => p.crop && !p.watered)
    if (id === 'planter') target = state.plots.find(p => p.tilled && !p.crop && state.coins >= CROPS[state.selectedCrop].seedCost)
    if (id === 'harvester') target = state.plots.find(p => p.crop && cropProgress(p) >= 1 && usedCapacity() < state.barnCapacity)
    if (!target) continue
    machine.condition = Math.max(0, machine.condition - 1)
    const risk = machine.condition < 20 ? .22 : machine.condition < 45 ? .08 : machine.condition < 70 ? .025 : .006
    if (!machine.condition || Math.random() < risk) {
      machine.broken = true; machine.enabled = false; toast(`${MACHINES[id].name} quebrou. Vá até a oficina.`); continue
    }
    if (id === 'irrigator') target.watered = true
    if (id === 'planter') {
      const crop = CROPS[state.selectedCrop]; state.coins -= crop.seedCost
      Object.assign(target, { crop: state.selectedCrop, plantedAt: Date.now(), watered: false, protected: false }); state.stats.planted++
    }
    if (id === 'harvester') harvestPlot(target)
  }
  save(); refreshUI()
}
setInterval(automationCycle, 5000)

window.addEventListener('keydown', event => {
  keyboard.add(event.code)
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) event.preventDefault()
  if (event.code === 'KeyE' || event.code === 'Space') performAction()
  const toolKeys = { Digit1: 'hoe', Digit2: 'seed', Digit3: 'water', Digit4: 'protect', Digit5: 'hand' }
  if (toolKeys[event.code]) { state.selectedTool = toolKeys[event.code]; save(); refreshUI() }
})
window.addEventListener('keyup', event => keyboard.delete(event.code))

for (const button of document.querySelectorAll('.tool')) button.addEventListener('click', () => {
  state.selectedTool = button.dataset.tool; save(); refreshUI()
})
for (const button of document.querySelectorAll('.crop')) button.addEventListener('click', () => {
  state.selectedCrop = button.dataset.crop; state.selectedTool = 'seed'; save(); refreshUI()
})
ui.mode.addEventListener('click', toggleMode)
ui.menu.addEventListener('click', openMenu)
ui.action.addEventListener('click', performAction)
ui.play.addEventListener('click', () => { ui.start.classList.add('hidden'); running = true; toast('Bem-vindo à Fazenda Vale Verde!') })

let joystickPointer = null
function updateJoystick(event) {
  const rect = ui.joystick.getBoundingClientRect()
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2
  let dx = event.clientX - cx, dy = event.clientY - cy
  const distanceValue = Math.hypot(dx,dy); const limit = rect.width * .32
  if (distanceValue > limit) { dx = dx / distanceValue * limit; dy = dy / distanceValue * limit }
  ui.stick.style.transform = `translate(${dx}px, ${dy}px)`
  joystickVector = { x: dx / limit, y: dy / limit }
}
ui.joystick.addEventListener('pointerdown', event => { joystickPointer = event.pointerId; ui.joystick.setPointerCapture(event.pointerId); updateJoystick(event) })
ui.joystick.addEventListener('pointermove', event => { if (event.pointerId === joystickPointer) updateJoystick(event) })
function releaseJoystick(event) {
  if (event.pointerId !== joystickPointer) return
  joystickPointer = null; joystickVector = { x: 0, y: 0 }; ui.stick.style.transform = 'translate(0,0)'
}
ui.joystick.addEventListener('pointerup', releaseJoystick)
ui.joystick.addEventListener('pointercancel', releaseJoystick)

function loop(time) {
  const dt = Math.min(.035, (time - lastTime) / 1000)
  lastTime = time; now = Date.now()
  updatePlayer(dt); detectInteraction(); drawWorld()
  requestAnimationFrame(loop)
}
refreshUI()
requestAnimationFrame(loop)
