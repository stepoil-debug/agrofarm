import {
  Application,
  Color,
  Entity,
  FILLMODE_FILL_WINDOW,
  Keyboard,
  Mouse,
  PROJECTION_ORTHOGRAPHIC,
  RESOLUTION_AUTO,
  StandardMaterial,
  TouchDevice,
  Vec3,
} from 'playcanvas'
import './styles.css'

const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')
if (!canvas) throw new Error('Canvas do jogo não encontrado.')

const app = new Application(canvas, {
  mouse: new Mouse(canvas),
  touch: new TouchDevice(canvas),
  keyboard: new Keyboard(window),
  graphicsDeviceOptions: {
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
  },
})

app.setCanvasFillMode(FILLMODE_FILL_WINDOW)
app.setCanvasResolution(RESOLUTION_AUTO)
app.scene.ambientLight = new Color(0.62, 0.72, 0.6)
app.start()

const material = (color: Color, gloss = 0.15): StandardMaterial => {
  const value = new StandardMaterial()
  value.diffuse = color
  value.gloss = gloss
  value.metalness = 0
  value.update()
  return value
}

const createPrimitive = (
  name: string,
  type: 'box' | 'plane' | 'cylinder' | 'sphere' | 'capsule',
  position: Vec3,
  scale: Vec3,
  color: Color,
): Entity => {
  const entity = new Entity(name)
  entity.addComponent('render', { type })
  entity.setPosition(position)
  entity.setLocalScale(scale)
  if (entity.render) entity.render.material = material(color)
  app.root.addChild(entity)
  return entity
}

const cameraPivot = new Entity('Camera Pivot')
app.root.addChild(cameraPivot)

const camera = new Entity('Orthographic Camera')
camera.addComponent('camera', {
  clearColor: new Color(0.53, 0.78, 0.95),
  projection: PROJECTION_ORTHOGRAPHIC,
  orthoHeight: 19,
  nearClip: 0.1,
  farClip: 180,
})
camera.setLocalPosition(20, 22, 20)
camera.lookAt(0, 0, 0)
cameraPivot.addChild(camera)

const sun = new Entity('Sun')
sun.addComponent('light', {
  type: 'directional',
  color: new Color(1, 0.93, 0.76),
  intensity: 1.9,
  castShadows: true,
  shadowResolution: 2048,
  shadowDistance: 50,
  normalOffsetBias: 0.08,
})
sun.setEulerAngles(48, -38, 0)
app.root.addChild(sun)

createPrimitive('Ground', 'box', new Vec3(0, -0.45, 0), new Vec3(34, 0.8, 26), new Color(0.32, 0.65, 0.27))
createPrimitive('Water', 'box', new Vec3(0, -0.1, 11.8), new Vec3(34, 0.35, 3.2), new Color(0.18, 0.62, 0.82))

// Objetos abaixo existem apenas para validar câmera, luz e escala enquanto os
// modelos CC0 definitivos são preparados. Esta branch não deve ser publicada.
createPrimitive('House Volume', 'box', new Vec3(-8, 1.4, -5), new Vec3(5.8, 3.2, 4.8), new Color(0.91, 0.69, 0.42))
createPrimitive('Barn Volume', 'box', new Vec3(8, 1.2, -4.2), new Vec3(5.4, 2.8, 4.4), new Color(0.72, 0.21, 0.16))

for (let row = 0; row < 3; row += 1) {
  for (let column = 0; column < 4; column += 1) {
    createPrimitive(
      `Plot ${row}-${column}`,
      'box',
      new Vec3(-4.5 + column * 3, 0.05, 1.5 + row * 2.6),
      new Vec3(2.4, 0.22, 1.9),
      new Color(0.42, 0.24, 0.12),
    )
  }
}

const player = createPrimitive('Player Test Rig', 'capsule', new Vec3(0, 1, -1.5), new Vec3(0.8, 1.5, 0.8), new Color(0.18, 0.38, 0.72))

let dragging = false
let pointerX = 0
let pointerY = 0
let targetYaw = 45
let targetZoom = 19
const targetPivot = new Vec3(0, 0, 0)

canvas.addEventListener('pointerdown', (event) => {
  dragging = event.button === 1 || event.button === 2 || event.pointerType === 'touch'
  pointerX = event.clientX
  pointerY = event.clientY
  if (dragging) canvas.setPointerCapture(event.pointerId)
})

canvas.addEventListener('pointermove', (event) => {
  if (!dragging) return
  const deltaX = event.clientX - pointerX
  const deltaY = event.clientY - pointerY
  pointerX = event.clientX
  pointerY = event.clientY
  targetYaw -= deltaX * 0.18
  targetPivot.x += (deltaY - deltaX) * 0.012
  targetPivot.z += (deltaY + deltaX) * 0.012
})

const releasePointer = (): void => {
  dragging = false
}
canvas.addEventListener('pointerup', releasePointer)
canvas.addEventListener('pointercancel', releasePointer)
canvas.addEventListener('contextmenu', (event) => event.preventDefault())
canvas.addEventListener('wheel', (event) => {
  event.preventDefault()
  targetZoom = Math.max(10, Math.min(28, targetZoom + event.deltaY * 0.012))
}, { passive: false })

app.on('update', (deltaTime: number) => {
  const interpolation = Math.min(1, deltaTime * 8)
  const currentPosition = cameraPivot.getPosition()
  cameraPivot.setPosition(
    currentPosition.x + (targetPivot.x - currentPosition.x) * interpolation,
    0,
    currentPosition.z + (targetPivot.z - currentPosition.z) * interpolation,
  )

  const angles = cameraPivot.getEulerAngles()
  cameraPivot.setEulerAngles(0, angles.y + (targetYaw - angles.y) * interpolation, 0)

  if (camera.camera) camera.camera.orthoHeight += (targetZoom - camera.camera.orthoHeight) * interpolation
  player.rotate(0, deltaTime * 18, 0)
})

window.addEventListener('resize', () => app.resizeCanvas())

const progress = document.querySelector<HTMLElement>('#loading-progress')
const loading = document.querySelector<HTMLElement>('#loading')
if (progress) progress.style.width = '100%'
window.setTimeout(() => loading?.classList.add('ready'), 450)
