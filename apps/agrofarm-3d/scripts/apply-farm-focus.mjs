import { readFileSync, writeFileSync } from 'node:fs'

const mainPath = new URL('../src/main.ts', import.meta.url)

const replaceOnce = (source, pattern, replacement, label) => {
  if (source.includes(replacement)) return source
  const next = source.replace(pattern, replacement)
  if (next === source) throw new Error(`Patch não aplicado: ${label}`)
  return next
}

let main = readFileSync(mainPath, 'utf8')

main = replaceOnce(
  main,
  `const world=new FarmWorld(app);let state:GameState=loadState();`,
  `const world=new FarmWorld(app);const hideTemporaryCows=(node:Entity)=>{for(const child of node.children){const entity=child as Entity;if(entity.name==='Cow')entity.enabled=false;hideTemporaryCows(entity)}};hideTemporaryCows(world.root);let state:GameState=loadState();`,
  'ocultar vacas provisórias',
)

main = replaceOnce(
  main,
  'await world.loadExternalModels((progress,label)=>{if(dom.loadingProgress)dom.loadingProgress.style.width=`${18+progress*72}%`;if(dom.loadingLabel)dom.loadingLabel.textContent=label});',
  `if(dom.loadingProgress)dom.loadingProgress.style.width='82%';if(dom.loadingLabel)dom.loadingLabel.textContent='Montando celeiro, curral e galinheiro...';await new Promise<void>(resolve=>window.setTimeout(resolve,220));`,
  'bloquear modelos urbanos externos',
)

main = replaceOnce(
  main,
  `let joystick={x:0,y:0},joystickPointer:number|null=null,pointerDown:{id:number;x:number;y:number;moved:boolean;rotating:boolean}|null=null`,
  `let joystick={x:0,y:0},joystickPointer:number|null=null,pointerDown:{id:number;x:number;y:number;moved:boolean;rotating:boolean}|null=null,moveTarget:Vec3|null=null,queuedPlot:number|null=null,queuedBuilding:BuildingKey|null=null`,
  'estado de navegação',
)

const clickMovement = `const updatePlayer=(dt:number)=>{if(!running||(dom.dialog&&!dom.dialog.classList.contains('hidden')))return false;const manual=movementVector();let vector=manual,targetDistance=0;if(Math.hypot(manual.x,manual.z)>.05){moveTarget=null;queuedPlot=null;queuedBuilding=null}else if(moveTarget){const current=world.playerRoot.getPosition(),dx=moveTarget.x-current.x,dz=moveTarget.z-current.z;targetDistance=Math.hypot(dx,dz);vector=targetDistance>.08?{x:dx/targetDistance,z:dz/targetDistance}:{x:0,z:0}}const moving=Math.hypot(vector.x,vector.z)>.05;if(!moving){if(moveTarget&&targetDistance<=.08){moveTarget=null;if(queuedPlot!==null){const id=queuedPlot;queuedPlot=null;performPlotAction(id)}else if(queuedBuilding){const id=queuedBuilding;queuedBuilding=null;openBuilding(id)}}return false}const current=world.playerRoot.getPosition(),speed=moveTarget?5.5:5.1,nx=current.x+vector.x*speed*dt,nz=current.z+vector.z*speed*dt;if(!isBlocked(nx,current.z))world.playerRoot.setPosition(nx,0,current.z);const after=world.playerRoot.getPosition();if(!isBlocked(after.x,nz))world.playerRoot.setPosition(after.x,0,nz);const yaw=Math.atan2(vector.x,vector.z)*180/Math.PI,currentYaw=world.playerRoot.getEulerAngles().y,difference=((yaw-currentYaw+540)%360)-180;world.playerRoot.setEulerAngles(0,currentYaw+difference*Math.min(1,dt*12),0);if(moveTarget&&distance2D(world.playerRoot.getPosition(),moveTarget)<.14)moveTarget=null;return true}
const updateCamera=`
main = replaceOnce(main, /const updatePlayer=[\s\S]*?const updateCamera=/, clickMovement, 'movimento por clique')

const clickTargets = `const groundPointFromScreen=(x:number,y:number)=>{if(!camera.camera)return null;const near=new Vec3(),far=new Vec3();camera.camera.screenToWorld(x,y,camera.camera.nearClip,near);camera.camera.screenToWorld(x,y,camera.camera.farClip,far);const direction=far.clone().sub(near);if(Math.abs(direction.y)<.0001)return null;const t=-near.y/direction.y;return t<0?null:near.add(direction.mulScalar(t))};const nearestScreenTarget=(x:number,y:number)=>{if(!camera.camera)return{plot:null as number|null,building:null as BuildingKey|null};const screen=new Vec3(),plot=world.plots.map(item=>{camera.camera!.worldToScreen(item.position,screen);return{id:item.id,distance:Math.hypot(screen.x-x,screen.y-y)}}).sort((a,b)=>a.distance-b.distance)[0],building=world.buildings.map(item=>{camera.camera!.worldToScreen(item.labelAnchor,screen);return{id:item.id,distance:Math.hypot(screen.x-x,screen.y-y)}}).sort((a,b)=>a.distance-b.distance)[0];if(plot&&plot.distance<58&&(!building||plot.distance<=building.distance))return{plot:plot.id,building:null};if(building&&building.distance<90)return{plot:null,building:building.id};return{plot:null,building:null}};const handleWorldTap=(x:number,y:number)=>{if(!running)return;const target=nearestScreenTarget(x,y);if(target.plot!==null){const plot=world.plots[target.plot];if(!plot)return;queuedPlot=target.plot;queuedBuilding=null;moveTarget=plot.position.clone().add(new Vec3(0,0,1.45));showToast('Indo trabalhar no lote.');return}if(target.building){const building=world.buildings.find(item=>item.id===target.building);if(!building)return;queuedBuilding=target.building;queuedPlot=null;moveTarget=building.entrance.clone();showToast('Indo para '+buildingName(target.building)+'.');return}const point=groundPointFromScreen(x,y);if(!point)return;point.x=clamp(point.x,-22.5,22.5);point.z=clamp(point.z,-15.5,15.5);if(isBlocked(point.x,point.z)){showToast('Clique em uma área livre do caminho.');return}queuedPlot=null;queuedBuilding=null;moveTarget=point};const updateWorldTime=`
main = replaceOnce(main, /const clickNearestPlot=[\s\S]*?const updateWorldTime=/, clickTargets, 'seleção por clique e toque')

main = main.replace(
  /const menuDialog=\(\)=>openDialog\(`[^`]*`\)/,
  `const menuDialog=()=>openDialog(\`<button class="modal-close" type="button">×</button><h2>AgroFarm</h2><div class="hero-row"><span class="hero-icon">🌱</span><div><strong>\${currentLevel(state).label}</strong><p>No computador, clique para andar e clique diretamente em lotes ou construções. No celular, toque da mesma forma.</p></div></div><div class="shop-grid"><article class="shop-item"><strong>🖱️ Computador</strong><small>Clique para mover. Botão direito ou meio gira a câmera. Scroll ajusta o zoom.</small></article><article class="shop-item"><strong>👆 Celular</strong><small>Toque para mover e trabalhar. O joystick permanece como alternativa.</small></article></div><button class="primary" data-save="1">Salvar agora</button><button class="primary danger" data-reset="1">Reiniciar fazenda</button>\`)`,
)

const pointerControls = `canvas.addEventListener('pointerdown',event=>{const rotating=event.button===1||event.button===2||event.shiftKey;pointerDown={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false,rotating};canvas.setPointerCapture(event.pointerId)});canvas.addEventListener('pointermove',event=>{if(!pointerDown||pointerDown.id!==event.pointerId)return;const dx=event.clientX-pointerDown.x,dy=event.clientY-pointerDown.y;if(Math.hypot(dx,dy)>6)pointerDown.moved=true;if(pointerDown.rotating&&pointerDown.moved)targetYaw-=dx*.16;pointerDown.x=event.clientX;pointerDown.y=event.clientY});canvas.addEventListener('pointerup',event=>{if(pointerDown&&!pointerDown.moved&&event.button===0)handleWorldTap(event.clientX,event.clientY);pointerDown=null});canvas.addEventListener('pointercancel',()=>{pointerDown=null});canvas.addEventListener('contextmenu',event=>event.preventDefault());canvas.addEventListener('wheel',event=>{event.preventDefault();targetZoom=clamp(targetZoom+event.deltaY*.012,11,28)},{passive:false})`
main = replaceOnce(main, /canvas\.addEventListener\('pointerdown'[\s\S]*?\{passive:false\}\)/, pointerControls, 'eventos do mouse e toque')

main = main.replace('Equipe a enxada e interaja com um lote.','Escolha a enxada e clique ou toque em um lote.')
main = main.replace('Use WASD ou as setas para andar, E para interagir e arraste o cenário para girar a câmera.','Clique ou toque no cenário para andar e interagir. WASD permanece como alternativa.')
writeFileSync(mainPath, main)

console.log('Foco rural e controles por clique/toque aplicados.')
