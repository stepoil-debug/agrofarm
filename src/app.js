const CROPS = {
  corn: { id: 'corn', name: 'Milho', icon: '🌽', seedCost: 4, growthMs: 20000, baseYield: 3, salePrice: 3 },
  cassava: { id: 'cassava', name: 'Mandioca', icon: '🌿', seedCost: 8, growthMs: 35000, baseYield: 5, salePrice: 4 },
  pineapple: { id: 'pineapple', name: 'Abacaxi', icon: '🍍', seedCost: 15, growthMs: 60000, baseYield: 6, salePrice: 6 },
}

const MACHINES = {
  irrigator: { id: 'irrigator', name: 'Irrigador automático', icon: '💧', description: 'Irriga uma plantação a cada ciclo.', cost: 65, repair: 18, unlock: 1 },
  planter: { id: 'planter', name: 'Plantadeira', icon: '🚜', description: 'Planta automaticamente a cultura selecionada.', cost: 120, repair: 35, unlock: 2 },
  harvester: { id: 'harvester', name: 'Colheitadeira', icon: '⚙️', description: 'Colhe quando houver espaço no galpão.', cost: 240, repair: 70, unlock: 3 },
}

const FARM_LEVELS = [
  { level: 1, cost: 0, multiplier: 1 },
  { level: 2, cost: 150, multiplier: 1.2 },
  { level: 3, cost: 450, multiplier: 1.4 },
  { level: 4, cost: 1200, multiplier: 1.6 },
  { level: 5, cost: 3000, multiplier: 1.8 },
  { level: 6, cost: 7500, multiplier: 2 },
  { level: 7, cost: 18000, multiplier: 2.2 },
  { level: 8, cost: 45000, multiplier: 2.4 },
  { level: 9, cost: 110000, multiplier: 2.6 },
  { level: 10, cost: 275000, multiplier: 2.8 },
]

const WAREHOUSE_LEVELS = [
  { level: 1, cost: 0, capacity: 10 },
  { level: 2, cost: 100, capacity: 20 },
  { level: 3, cost: 300, capacity: 35 },
  { level: 4, cost: 800, capacity: 55 },
  { level: 5, cost: 2000, capacity: 80 },
]

const root = document.querySelector('#root')
const config = window.AGROFARM_CONFIG || {}
const hasSupabase = Boolean(config.supabaseUrl && config.supabaseAnonKey)
const GAME_KEY = 'agrofarm-game-v1'
const SESSION_KEY = 'agrofarm-session-v1'
let state = loadLocalState()
let currentUser = null
let remoteMode = false
let busy = false
let now = Date.now()

function emptyPlot(position) {
  return { position, cropId: null, plantedAt: null, readyAt: null, watered: false, protected: false, health: 100 }
}

function createEvent(message, tone = 'info') {
  return { id: crypto.randomUUID(), createdAt: Date.now(), message, tone }
}

function initialState() {
  return {
    version: 1,
    mode: 'free',
    coins: 100,
    farmLevel: 1,
    warehouseLevel: 1,
    warehouseCapacity: 10,
    selectedCrop: 'corn',
    plots: Array.from({ length: 6 }, (_, position) => emptyPlot(position)),
    inventory: { corn: 0, cassava: 0, pineapple: 0 },
    machines: {
      irrigator: { owned: false, automation: false, condition: 100, broken: false },
      planter: { owned: false, automation: false, condition: 100, broken: false },
      harvester: { owned: false, automation: false, condition: 100, broken: false },
    },
    events: [createEvent('Fazenda criada com 100 moedas e galpão para 10 unidades.', 'success')],
  }
}

function loadLocalState() {
  try {
    const saved = JSON.parse(localStorage.getItem(GAME_KEY))
    return saved?.version === 1 ? saved : initialState()
  } catch {
    return initialState()
  }
}

function persistLocal() {
  if (!remoteMode) localStorage.setItem(GAME_KEY, JSON.stringify(state))
}

function addEvent(message, tone = 'info') {
  state.events = [createEvent(message, tone), ...(state.events || [])].slice(0, 30)
}

const round = (value) => Math.round(Number(value) * 100) / 100
const multiplier = () => FARM_LEVELS.find((item) => item.level === Number(state.farmLevel))?.multiplier || 2.8
const usedCapacity = () => Object.values(state.inventory).reduce((sum, value) => sum + Number(value || 0), 0)
const nextFarmLevel = () => FARM_LEVELS.find((item) => item.level === state.farmLevel + 1)
const nextWarehouseLevel = () => WAREHOUSE_LEVELS.find((item) => item.level === state.warehouseLevel + 1)
const safe = (text) => String(text ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char])

function readSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) } catch { return null }
}

function writeSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  else localStorage.removeItem(SESSION_KEY)
}

function captureOAuthSession() {
  const hash = new URLSearchParams(location.hash.replace(/^#/, ''))
  const accessToken = hash.get('access_token')
  if (!accessToken) return
  writeSession({
    accessToken,
    refreshToken: hash.get('refresh_token'),
    expiresAt: Date.now() + Number(hash.get('expires_in') || 3600) * 1000,
  })
  history.replaceState({}, document.title, location.pathname + location.search)
}

async function getAccessToken() {
  const session = readSession()
  if (!session) return null
  if (session.expiresAt > Date.now() + 30000) return session.accessToken
  if (!session.refreshToken) return null
  const response = await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: config.supabaseAnonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  })
  if (!response.ok) { writeSession(null); return null }
  const data = await response.json()
  const refreshed = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || session.refreshToken,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
  }
  writeSession(refreshed)
  return refreshed.accessToken
}

async function authUser() {
  captureOAuthSession()
  const token = await getAccessToken()
  if (!token) return null
  const response = await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${token}` },
  })
  return response.ok ? response.json() : null
}

async function api(path, options = {}) {
  const token = await getAccessToken()
  if (!token) throw new Error('Sessão expirada. Entre novamente.')
  const response = await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept-Profile': 'agrofarm',
      'Content-Profile': 'agrofarm',
      ...(options.headers || {}),
    },
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Falha na operação.' }))
    throw new Error(error.message || error.hint || 'Falha na operação.')
  }
  if (response.status === 204) return null
  return response.json()
}

const rpc = (name, args = {}) => api(`rpc/${name}`, { method: 'POST', body: JSON.stringify(args) })
const query = (table, params) => api(`${table}?${params}`, { method: 'GET' })

async function loadRemoteState() {
  await rpc('bootstrap_player')
  const farms = await query('farms', 'select=*&limit=1')
  if (!farms?.length) throw new Error('Fazenda não encontrada.')
  const farm = farms[0]
  const [plots, inventory, machines, events] = await Promise.all([
    query('farm_plots', `select=*&farm_id=eq.${farm.id}&order=position.asc`),
    query('inventory', `select=*&farm_id=eq.${farm.id}`),
    query('farm_machines', `select=*&farm_id=eq.${farm.id}`),
    query('game_events', `select=*&farm_id=eq.${farm.id}&order=created_at.desc&limit=30`),
  ])
  state = {
    version: 1,
    mode: farm.mode,
    coins: Number(farm.coins),
    farmLevel: Number(farm.farm_level),
    warehouseLevel: Number(farm.warehouse_level),
    warehouseCapacity: Number(farm.warehouse_capacity),
    selectedCrop: farm.selected_crop_id || 'corn',
    plots: plots.map((plot) => ({
      position: Number(plot.position),
      cropId: plot.crop_id,
      plantedAt: plot.planted_at ? new Date(plot.planted_at).getTime() : null,
      readyAt: plot.ready_at ? new Date(plot.ready_at).getTime() : null,
      watered: plot.watered,
      protected: plot.protected,
      health: Number(plot.health),
    })),
    inventory: Object.fromEntries(Object.keys(CROPS).map((id) => [id, Number(inventory.find((item) => item.item_id === id)?.quantity || 0)])),
    machines: Object.fromEntries(Object.keys(MACHINES).map((id) => {
      const item = machines.find((machine) => machine.machine_id === id)
      return [id, { owned: Boolean(item?.owned), automation: Boolean(item?.automation), condition: Number(item?.condition ?? 100), broken: Boolean(item?.broken) }]
    })),
    events: events.map((item) => ({ id: item.id, createdAt: new Date(item.created_at).getTime(), message: item.message, tone: item.severity })),
  }
  remoteMode = true
}

async function runRemote(name, args = {}) {
  if (busy) return
  busy = true
  render()
  try {
    await rpc(name, args)
    await loadRemoteState()
  } catch (error) {
    addEvent(error.message, 'danger')
  } finally {
    busy = false
    render()
  }
}

function localPlant(position) {
  const plot = state.plots.find((item) => item.position === position)
  const crop = CROPS[state.selectedCrop]
  if (!plot || plot.cropId) return
  if (state.coins < crop.seedCost) return addEvent('Saldo insuficiente para comprar a semente.', 'danger')
  state.coins = round(state.coins - crop.seedCost)
  Object.assign(plot, { cropId: crop.id, plantedAt: Date.now(), readyAt: Date.now() + crop.growthMs, watered: false, protected: false, health: 100 })
  addEvent(`${crop.name} plantado por ${crop.seedCost} moedas.`)
}

function localCare(position, action) {
  const plot = state.plots.find((item) => item.position === position)
  if (!plot?.cropId) return
  if (action === 'protect') {
    if (state.coins < 2) return addEvent('Saldo insuficiente para o defensivo.', 'danger')
    state.coins = round(state.coins - 2)
    plot.protected = true
    addEvent('Defensivo aplicado por 2 moedas.', 'success')
  } else {
    plot.watered = true
    addEvent('Plantação irrigada.', 'success')
  }
}

function harvestResult(plot) {
  const crop = CROPS[plot.cropId]
  let factor = 1 + (plot.watered ? 0.1 : 0) + (plot.protected ? 0.1 : 0)
  const problems = []
  if (state.mode === 'realistic') {
    if (!plot.watered && Math.random() < 0.4) { factor -= 0.5; problems.push('seca') }
    if (!plot.protected && Math.random() < 0.45) { factor -= 0.55; problems.push('praga') }
    if (!plot.watered && !plot.protected && Math.random() < 0.2) { factor = 0; problems.push('perda total') }
  } else factor = Math.max(1, factor)
  const produced = Math.max(0, Math.floor(crop.baseYield * Math.max(0, factor)))
  const stored = Math.min(produced, Math.max(0, state.warehouseCapacity - usedCapacity()))
  return { produced, stored, lost: produced - stored, problems }
}

function localHarvest(position) {
  const plot = state.plots.find((item) => item.position === position)
  if (!plot?.cropId || plot.readyAt > Date.now()) return
  const cropId = plot.cropId
  const result = harvestResult(plot)
  state.inventory[cropId] += result.stored
  state.plots[position] = emptyPlot(position)
  if (!result.produced) addEvent(`${CROPS[cropId].name}: a produção foi perdida.`, 'danger')
  else addEvent(`${result.stored} unidades de ${CROPS[cropId].name} armazenadas.`, result.problems.length ? 'warning' : 'success')
  if (result.lost) addEvent(`${result.lost} unidades perdidas por falta de espaço.`, 'danger')
}

function localSell(cropId) {
  const quantity = state.inventory[cropId]
  if (!quantity) return
  const revenue = round(quantity * CROPS[cropId].salePrice * multiplier())
  state.inventory[cropId] = 0
  state.coins = round(state.coins + revenue)
  addEvent(`${quantity} ${CROPS[cropId].name} vendidos por ${revenue.toFixed(2)} moedas.`, 'success')
}

function localUpgradeFarm() {
  const next = nextFarmLevel()
  if (!next) return addEvent('Sede no nível máximo.')
  if (state.coins < next.cost) return addEvent(`São necessárias ${next.cost} moedas.`, 'danger')
  state.coins = round(state.coins - next.cost)
  state.farmLevel = next.level
  addEvent(`Sede elevada ao nível ${next.level}. Vendas em ${next.multiplier.toFixed(1)}x.`, 'success')
}

function localUpgradeWarehouse() {
  const next = nextWarehouseLevel()
  if (!next) return addEvent('Galpão no nível máximo.')
  if (state.coins < next.cost) return addEvent(`São necessárias ${next.cost} moedas.`, 'danger')
  state.coins = round(state.coins - next.cost)
  state.warehouseLevel = next.level
  state.warehouseCapacity = next.capacity
  addEvent(`Galpão ampliado para ${next.capacity} espaços.`, 'success')
}

function localBuyMachine(id) {
  const definition = MACHINES[id]
  if (definition.unlock > state.farmLevel) return addEvent(`Máquina liberada no nível ${definition.unlock}.`, 'warning')
  if (state.coins < definition.cost) return addEvent('Saldo insuficiente para a máquina.', 'danger')
  state.coins = round(state.coins - definition.cost)
  state.machines[id].owned = true
  addEvent(`${definition.name} adquirida.`, 'success')
}

function localRepairMachine(id) {
  const machine = state.machines[id]
  const cost = Math.max(5, Math.ceil(MACHINES[id].repair * ((100 - machine.condition) / 50)))
  if (state.coins < cost) return addEvent(`Reparo custa ${cost} moedas.`, 'danger')
  state.coins = round(state.coins - cost)
  Object.assign(machine, { condition: 100, broken: false, automation: false })
  addEvent(`${MACHINES[id].name} reparada por ${cost} moedas.`, 'success')
}

function failureChance(condition) {
  return condition <= 20 ? 0.35 : condition <= 40 ? 0.15 : condition <= 60 ? 0.06 : condition <= 80 ? 0.025 : 0.008
}

function localAutomationCycle() {
  let changed = false
  for (const [id, machine] of Object.entries(state.machines)) {
    if (!machine.owned || !machine.automation || machine.broken) continue
    let actionable = false
    if (id === 'irrigator') actionable = state.plots.some((plot) => plot.cropId && !plot.watered)
    if (id === 'planter') actionable = state.plots.some((plot) => !plot.cropId) && state.coins >= CROPS[state.selectedCrop].seedCost
    if (id === 'harvester') actionable = state.plots.some((plot) => plot.cropId && plot.readyAt <= Date.now()) && usedCapacity() < state.warehouseCapacity
    if (!actionable) continue
    machine.condition = Math.max(0, machine.condition - 1)
    changed = true
    if (!machine.condition || Math.random() < failureChance(machine.condition)) {
      machine.broken = true
      machine.automation = false
      addEvent(`${MACHINES[id].name} apresentou defeito e parou.`, 'danger')
      continue
    }
    if (id === 'irrigator') state.plots.find((plot) => plot.cropId && !plot.watered).watered = true
    if (id === 'planter') localPlant(state.plots.find((plot) => !plot.cropId).position)
    if (id === 'harvester') localHarvest(state.plots.find((plot) => plot.cropId && plot.readyAt <= Date.now()).position)
  }
  if (changed) { persistLocal(); render() }
}

function plotMarkup(plot) {
  if (!plot.cropId) {
    const crop = CROPS[state.selectedCrop]
    return `<article class="plot"><div class="plot-icon">🟫</div><strong>Terreno vazio</strong><small>Pronto para ${safe(crop.name.toLowerCase())}</small><button class="primary-button compact" data-action="plant" data-position="${plot.position}" ${busy ? 'disabled' : ''}>Plantar · ${crop.seedCost} 🪙</button></article>`
  }
  const crop = CROPS[plot.cropId]
  const remaining = Math.max(0, Math.ceil((plot.readyAt - now) / 1000))
  const ready = remaining === 0
  const progress = Math.min(100, Math.max(0, ((now - plot.plantedAt) / (plot.readyAt - plot.plantedAt)) * 100))
  return `<article class="plot ${ready ? 'plot-ready' : ''}"><div class="plot-icon">${crop.icon}</div><strong>${crop.name}</strong><small>${ready ? 'Pronto para colher' : `${remaining}s para colher`}</small><div class="progress-track"><span style="width:${progress}%"></span></div><div class="care-row"><span class="${plot.watered ? 'care-done' : ''}">💧</span><span class="${plot.protected ? 'care-done' : ''}">🛡️</span></div>${ready ? `<button class="primary-button compact" data-action="harvest" data-position="${plot.position}" ${busy ? 'disabled' : ''}>Colher</button>` : `<div class="plot-actions"><button data-action="care" data-kind="water" data-position="${plot.position}" ${plot.watered || busy ? 'disabled' : ''}>Irrigar</button><button data-action="care" data-kind="protect" data-position="${plot.position}" ${plot.protected || busy ? 'disabled' : ''}>Defensivo · 2</button></div>`}</article>`
}

function machineMarkup(definition) {
  const machine = state.machines[definition.id]
  const locked = definition.unlock > state.farmLevel
  return `<article class="machine ${machine.broken ? 'machine-broken' : ''}"><div class="machine-title"><span>${definition.icon}</span><div><strong>${definition.name}</strong><small>${locked ? `Libera no nível ${definition.unlock}` : definition.description}</small></div></div>${machine.owned ? `<div class="machine-health"><span>Conservação</span><strong>${machine.condition}%</strong></div><div class="condition-track"><span style="width:${machine.condition}%"></span></div><div class="machine-actions"><button data-action="toggle-machine" data-machine="${definition.id}" ${machine.broken || busy ? 'disabled' : ''}>${machine.automation ? 'Desligar' : 'Automatizar'}</button><button data-action="repair-machine" data-machine="${definition.id}" ${machine.condition === 100 && !machine.broken || busy ? 'disabled' : ''}>Consertar</button></div><span class="machine-status ${machine.broken ? 'danger' : machine.automation ? 'running' : ''}">${machine.broken ? 'Com defeito' : machine.automation ? 'Em operação' : 'Parada'}</span>` : `<button class="secondary-button full" data-action="buy-machine" data-machine="${definition.id}" ${locked || busy ? 'disabled' : ''}>${locked ? 'Bloqueada' : `Comprar · ${definition.cost} moedas`}</button>`}</article>`
}

function render() {
  const nextFarm = nextFarmLevel()
  const nextWarehouse = nextWarehouseLevel()
  const userLabel = currentUser?.email || currentUser?.user_metadata?.full_name || 'Jogador'
  root.innerHTML = `<div class="app-shell"><header class="topbar"><div class="brand"><span class="brand-mark">🌱</span><div><strong>AgroFarm RPG</strong><small>Do campo ao império agroindustrial</small></div></div><div class="top-actions">${hasSupabase ? currentUser ? `<button class="ghost-button" data-action="logout">${safe(userLabel)} · Sair</button>` : `<button class="google-button" data-action="login">Entrar com Google</button>` : `<span class="demo-badge">Modo demonstração</span>`}</div></header><main>
  <section class="hero-bar"><div><span class="eyebrow">Sua fazenda</span><h1>Fazenda Vale Verde</h1><p>Produza, cuide, venda, evolua e automatize sem perder o controle dos riscos.</p></div><div class="hero-controls"><label>Modo de jogo<select data-action="mode" ${busy ? 'disabled' : ''}><option value="free" ${state.mode === 'free' ? 'selected' : ''}>Livre</option><option value="realistic" ${state.mode === 'realistic' ? 'selected' : ''}>Realista · moeda virtual</option></select></label>${remoteMode ? '<span class="status-chip">Sincronizado</span>' : '<button class="ghost-button" data-action="reset">Reiniciar fazenda</button>'}</div></section>
  <section class="metrics"><div class="metric-card"><span>Saldo</span><strong>${Number(state.coins).toFixed(2)} 🪙</strong><small>Início: 100 moedas</small></div><div class="metric-card"><span>Sede</span><strong>Nível ${state.farmLevel}</strong><small>Vendas em ${multiplier().toFixed(1)}x</small></div><div class="metric-card"><span>Galpão</span><strong>${usedCapacity()}/${state.warehouseCapacity}</strong><small>Espaços ocupados</small></div><div class="metric-card"><span>Risco</span><strong>${state.mode === 'free' ? 'Protegido' : 'Ativo'}</strong><small>${state.mode === 'free' ? 'Sem perdas severas' : 'Pragas, seca e defeitos'}</small></div></section>
  <div class="game-layout"><div class="main-column"><section class="panel"><div class="section-heading"><div><span class="eyebrow">Sementes</span><h2>Escolha o plantio</h2></div></div><div class="crop-selector">${Object.values(CROPS).map((crop) => `<button class="crop-option ${state.selectedCrop === crop.id ? 'active' : ''}" data-action="select-crop" data-crop="${crop.id}"><span>${crop.icon}</span><strong>${crop.name}</strong><small>Semente ${crop.seedCost} · Venda ${crop.salePrice}</small></button>`).join('')}</div></section><section class="panel farm-panel"><div class="section-heading"><div><span class="eyebrow">Área produtiva</span><h2>Terrenos</h2></div><span class="status-chip">6 lotes</span></div><div class="farm-grid">${state.plots.map(plotMarkup).join('')}</div></section></div>
  <aside class="side-column"><section class="panel headquarters-panel"><div class="section-heading"><div><span class="eyebrow">Progressão</span><h2>Sede da fazenda</h2></div><span class="level-badge">LV ${state.farmLevel}</span></div><div class="hq-visual"><span>🏡</span><div><strong>${multiplier().toFixed(1)}x</strong><small>multiplicador de venda</small></div></div><p>Subir o nível consome saldo, libera máquinas e aumenta o valor de todas as vendas.</p><button class="primary-button full" data-action="upgrade-farm" ${!nextFarm || busy ? 'disabled' : ''}>${nextFarm ? `Evoluir sede · ${nextFarm.cost} moedas` : 'Sede no nível máximo'}</button></section>
  <section class="panel"><div class="section-heading"><div><span class="eyebrow">Estoque</span><h2>Galpão nível ${state.warehouseLevel}</h2></div><span class="status-chip">${usedCapacity()}/${state.warehouseCapacity}</span></div><div class="capacity-bar"><span style="width:${Math.min(100, usedCapacity() / state.warehouseCapacity * 100)}%"></span></div><div class="inventory-list">${Object.values(CROPS).map((crop) => `<div class="inventory-item"><span class="inventory-icon">${crop.icon}</span><div><strong>${crop.name}</strong><small>${state.inventory[crop.id]} unidades</small></div><button data-action="sell" data-crop="${crop.id}" ${!state.inventory[crop.id] || busy ? 'disabled' : ''}>Vender</button></div>`).join('')}</div><button class="secondary-button full" data-action="upgrade-warehouse" ${!nextWarehouse || busy ? 'disabled' : ''}>${nextWarehouse ? `Ampliar galpão · ${nextWarehouse.cost} moedas` : 'Galpão no nível máximo'}</button></section></aside></div>
  <section class="panel wide-panel"><div class="section-heading"><div><span class="eyebrow">Automação</span><h2>Maquinário</h2></div><span class="status-chip">Ciclo: 5s</span></div><div class="machine-grid">${Object.values(MACHINES).map(machineMarkup).join('')}</div></section>
  <section class="panel wide-panel"><div class="section-heading"><div><span class="eyebrow">Operação</span><h2>Diário da fazenda</h2></div></div><div class="event-list">${(state.events || []).slice(0, 8).map((item) => `<div class="event event-${item.tone}"><span>${new Date(item.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span><p>${safe(item.message)}</p></div>`).join('')}</div></section></main><footer><span>AgroFarm MVP</span><span>Computador e celular · ${remoteMode ? 'Supabase sincronizado' : 'salvamento local'}</span></footer></div>`
}

async function handleAction(action, target) {
  const position = Number(target.dataset.position)
  const crop = target.dataset.crop
  const machine = target.dataset.machine
  if (action === 'login') {
    const redirect = encodeURIComponent(location.origin)
    location.assign(`${config.supabaseUrl.replace(/\/$/, '')}/auth/v1/authorize?provider=google&redirect_to=${redirect}`)
    return
  }
  if (action === 'logout') {
    const token = await getAccessToken()
    if (token) await fetch(`${config.supabaseUrl.replace(/\/$/, '')}/auth/v1/logout`, { method: 'POST', headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${token}` } }).catch(() => {})
    writeSession(null); currentUser = null; remoteMode = false; state = loadLocalState(); render(); return
  }
  if (action === 'reset') { state = initialState(); persistLocal(); render(); return }
  if (action === 'select-crop') {
    state.selectedCrop = crop
    if (remoteMode) await runRemote('set_selected_crop', { p_crop_id: crop })
    else { persistLocal(); render() }
    return
  }
  if (remoteMode) {
    const commands = {
      plant: ['plant_crop', { p_plot_position: position, p_crop_id: state.selectedCrop }],
      care: ['care_crop', { p_plot_position: position, p_action: target.dataset.kind }],
      harvest: ['harvest_crop', { p_plot_position: position }],
      sell: ['sell_crop', { p_crop_id: crop }],
      'upgrade-farm': ['upgrade_headquarters', {}],
      'upgrade-warehouse': ['upgrade_warehouse', {}],
      'buy-machine': ['buy_machine', { p_machine_id: machine }],
      'repair-machine': ['repair_machine', { p_machine_id: machine }],
      'toggle-machine': ['set_machine_automation', { p_machine_id: machine, p_enabled: !state.machines[machine].automation }],
    }
    const command = commands[action]
    if (command) await runRemote(command[0], command[1])
    return
  }
  if (action === 'plant') localPlant(position)
  if (action === 'care') localCare(position, target.dataset.kind)
  if (action === 'harvest') localHarvest(position)
  if (action === 'sell') localSell(crop)
  if (action === 'upgrade-farm') localUpgradeFarm()
  if (action === 'upgrade-warehouse') localUpgradeWarehouse()
  if (action === 'buy-machine') localBuyMachine(machine)
  if (action === 'repair-machine') localRepairMachine(machine)
  if (action === 'toggle-machine') state.machines[machine].automation = !state.machines[machine].automation
  persistLocal(); render()
}

root.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]')
  if (!target || target.tagName === 'SELECT') return
  void handleAction(target.dataset.action, target)
})

root.addEventListener('change', (event) => {
  const target = event.target
  if (target.dataset.action !== 'mode') return
  if (remoteMode) void runRemote('set_game_mode', { p_mode: target.value })
  else { state.mode = target.value; addEvent(`Modo alterado para ${target.value === 'free' ? 'Livre' : 'Realista virtual'}.`); persistLocal(); render() }
})

setInterval(() => { now = Date.now(); render() }, 1000)
setInterval(async () => {
  if (busy) return
  if (remoteMode && Object.values(state.machines).some((machine) => machine.automation)) await runRemote('run_automation_cycle')
  else localAutomationCycle()
}, 5000)

async function boot() {
  render()
  if (!hasSupabase) return
  try {
    currentUser = await authUser()
    if (currentUser) await loadRemoteState()
  } catch (error) {
    addEvent(`Supabase: ${error.message}`, 'warning')
  }
  render()
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

void boot()
