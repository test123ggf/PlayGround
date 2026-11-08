import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js';

const canvas = document.querySelector('#game-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#9dd4e4');
scene.fog = new THREE.FogExp2('#9dd4e4', 0.00165);
const camera = new THREE.PerspectiveCamera(54, innerWidth / innerHeight, 0.1, 1200);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

scene.add(new THREE.HemisphereLight('#fff1d2', '#477b61', 2.2));
const sun = new THREE.DirectionalLight('#fff0ce', 3.2);
sun.position.set(-80, 130, -70);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -130; sun.shadow.camera.right = 130; sun.shadow.camera.top = 130; sun.shadow.camera.bottom = -130;
sun.shadow.bias = -0.00015;
scene.add(sun);

const mat = (color, roughness = .86, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
const materials = {
  grass: mat('#62a967'), road: mat('#424a51'), curbRed: mat('#f56d53'), curbWhite: mat('#fff0d6'),
  line: mat('#f9efce'), tree: mat('#286f5c'), tree2: mat('#3c9168'), trunk: mat('#805544'),
  wood: mat('#b77443'), cream: mat('#fff2d6'), orange: mat('#fa704e'), yellow: mat('#ffd45e'), blue: mat('#64c7d2'),
  dark: mat('#263445'), tire: mat('#20232b'), metal: mat('#b8c5c6', .4, { metalness: .4 }),
};

const ground = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), materials.grass);
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.55; ground.receiveShadow = true; scene.add(ground);

const controlPoints = [
  [0, 0, 67], [43, 0, 61], [72, 0, 34], [77, 0, 0], [62, 0, -37],
  [34, 0, -61], [-4, 0, -67], [-43, 0, -58], [-70, 0, -34], [-75, 0, 3],
  [-59, 0, 38], [-31, 0, 60]
].map(([x,y,z]) => new THREE.Vector3(x, y, z));
const trackCurve = new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', .25);
const trackLength = trackCurve.getLength();
const roadWidth = 13.5;
const samples = 720;
const pointAt = (u) => trackCurve.getPointAt(((u % 1) + 1) % 1);
const tangentAt = (u) => trackCurve.getTangentAt(((u % 1) + 1) % 1).normalize();
const rightAt = (u) => { const t = tangentAt(u); return new THREE.Vector3(t.z, 0, -t.x); };

function ribbon(inner, outer, material, yOffset = 0) {
  const vertices = [], indices = [];
  for (let i = 0; i <= samples; i++) {
    const u = i / samples, p = pointAt(u), right = rightAt(u);
    for (const side of [inner, outer]) vertices.push(p.x + right.x * side, p.y + yOffset, p.z + right.z * side);
    if (i < samples) { const a = i * 2; indices.push(a, a+2, a+1, a+1, a+2, a+3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); g.setIndex(indices); g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, material); mesh.receiveShadow = true; mesh.castShadow = false; scene.add(mesh); return mesh;
}
ribbon(-roadWidth / 2 - 1.5, roadWidth / 2 + 1.5, materials.curbWhite, -.02);
ribbon(-roadWidth / 2, roadWidth / 2, materials.road, .02);
ribbon(-roadWidth / 2 - .7, -roadWidth / 2, materials.curbRed, .045);
ribbon(roadWidth / 2, roadWidth / 2 + .7, materials.curbRed, .045);

// Crisp center dashes and two fine edge guides.
for (let i = 0; i < 145; i++) {
  const u = i / 145, p = pointAt(u), t = tangentAt(u), r = rightAt(u);
  if (i % 2 === 0) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(.13, .025, 1.15), materials.line);
    dash.position.set(p.x, .065, p.z); dash.rotation.y = Math.atan2(t.x, t.z); scene.add(dash);
  }
}

// Starting grid, checker stripe and landmark gantry.
function box(parent, name, size, material, pos, rotation = [0,0,0]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material); m.name = name;
  m.position.set(...pos); m.rotation.set(...rotation); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
const startU = .008, startP = pointAt(startU), startT = tangentAt(startU), startAngle = Math.atan2(startT.x, startT.z);
for (let i = 0; i < 14; i++) {
  const lateral = -roadWidth / 2 + (i + .5) * roadWidth / 14;
  const r = rightAt(startU); const tile = new THREE.Mesh(new THREE.BoxGeometry(roadWidth / 14, .035, 1.5), mat(i % 2 ? '#202731' : '#fff4df'));
  tile.position.set(startP.x + r.x * lateral, .09, startP.z + r.z * lateral); tile.rotation.y = startAngle; scene.add(tile);
}
const gantry = new THREE.Group(); gantry.position.copy(pointAt(.035)); gantry.position.y = 0; gantry.rotation.y = Math.atan2(tangentAt(.035).x, tangentAt(.035).z); scene.add(gantry);
box(gantry,'arch-leg',[.55,7,.55],materials.dark,[-7.6,3.5,0]); box(gantry,'arch-leg',[.55,7,.55],materials.dark,[7.6,3.5,0]);
box(gantry,'arch-beam',[16,1.05,.75],materials.orange,[0,7,0]); box(gantry,'arch-face',[7.6,1.05,.12],materials.dark,[0,7,-.44]);
const gantryText = box(gantry,'sign',[5.3,.35,.08],materials.yellow,[0,7,-.53]);
for (let i=0;i<6;i++) { const lamp = new THREE.Mesh(new THREE.SphereGeometry(.22,12,8), mat(i<3?'#fff5ce':'#ffb3a0',.2,{emissive:i<3?'#ffcf55':'#ff4e3b',emissiveIntensity:1.6})); lamp.position.set(-5.4+i*2.16,7,.5); gantry.add(lamp); }

// Low-poly island scenery: palms, rounded pines, flower tufts, and pastel billboards.
const treeGeo = new THREE.ConeGeometry(1, 2.5, 7);
const treeTopGeo = new THREE.ConeGeometry(1.35, 2.4, 7);
const trunkGeo = new THREE.CylinderGeometry(.19,.28,1.8,7);
const treeMeshes = [];
for (let i = 0; i < 180; i++) {
  const u = (i * .61803398875) % 1, p = pointAt(u), tangent = tangentAt(u), right = rightAt(u);
  const side = i % 2 ? 1 : -1;
  const offset = roadWidth / 2 + 8 + ((i * 19) % 22);
  const wobble = Math.sin(i * 42.12) * 3.4;
  const pos = p.clone().addScaledVector(right, side * offset).addScaledVector(tangent, wobble);
  const group = new THREE.Group(); group.position.set(pos.x,0,pos.z);
  const scale = .72 + (i * 37 % 55) / 100;
  const trunk = new THREE.Mesh(trunkGeo, materials.trunk); trunk.position.y=.9; trunk.scale.setScalar(scale); trunk.castShadow=true; group.add(trunk);
  const crownMat = i % 3 === 0 ? materials.tree2 : materials.tree;
  const crown = new THREE.Mesh(treeTopGeo,crownMat); crown.position.y=2.65*scale; crown.scale.setScalar(scale); crown.castShadow=true; group.add(crown);
  const crown2 = new THREE.Mesh(treeGeo,crownMat); crown2.position.set(.05,3.45*scale,.04); crown2.scale.setScalar(scale*.7); crown2.castShadow=true; group.add(crown2);
  scene.add(group); treeMeshes.push(group);
}

// Distant island silhouettes and sunset puffs.
for (let i=0;i<28;i++) {
  const a=i/28*Math.PI*2, radius=175+(i%4)*15, h=18+(i*17%34);
  const hill = new THREE.Mesh(new THREE.ConeGeometry(25+(i%3)*8,h,7),mat(i%2?'#70998a':'#83aa91'));
  hill.position.set(Math.cos(a)*radius,h/2-3,Math.sin(a)*radius); hill.rotation.y=i*1.72; scene.add(hill);
}
for(let i=0;i<14;i++){
  const cloud=new THREE.Group(), x=(i*67%240)-120, z=(i*89%210)-105;
  for(let j=0;j<4;j++){const puff=new THREE.Mesh(new THREE.SphereGeometry(3+j%2,10,7),mat('#fff4e8'));puff.position.set(j*4-6,0,(j%2)*1.5);puff.scale.y=.48;cloud.add(puff)}
  cloud.position.set(x,35+(i*7%20),z);scene.add(cloud);
}

// Small trackside signs are placed tangent to the circuit.
const signMats=[materials.orange,materials.blue,materials.yellow];
for(let i=0;i<20;i++){
  const u=i/20, p=pointAt(u), right=rightAt(u), t=tangentAt(u), side=i%2?1:-1;
  const sign=new THREE.Group(); sign.position.copy(p).addScaledVector(right,side*(roadWidth/2+2.6)); sign.position.y=1.1; sign.rotation.y=Math.atan2(t.x,t.z)+(side>0?Math.PI/2:-Math.PI/2); scene.add(sign);
  box(sign,'post',[.12,1.4,.12],materials.wood,[0,-.45,0]);
  const board=box(sign,'billboard',[4.2,1.1,.22],signMats[i%3],[0,.32,0]);
  const stripe=box(sign,'billboard-stripe',[2.7,.12,.02],materials.cream,[0,.32,.13]);
}

// Collectible coins float along the ideal line; catching one grants a short turbo burst.
const coins=[];
const coinGeo=new THREE.TorusGeometry(.62,.16,10,24);
for(let i=0;i<18;i++){
  const u=(i+.45)/18,p=pointAt(u),r=rightAt(u);
  const mesh=new THREE.Mesh(coinGeo,mat('#ffc84e',.28,{metalness:.25,emissive:'#985414',emissiveIntensity:.3}));
  mesh.position.set(p.x+r.x*((i%3)-1)*1.1,1.25,p.z+r.z*((i%3)-1)*1.1); mesh.rotation.x=Math.PI/2; mesh.castShadow=true; scene.add(mesh); coins.push({mesh,u,got:false});
}

// Racer and kart, built from lightweight primitives so the whole scene is self-contained.
const kart = new THREE.Group(); scene.add(kart);
const bodyMat=mat('#f05d45',.42), accentMat=mat('#ffd45e',.38), seatMat=mat('#314353');
box(kart,'chassis',[1.7,.42,2.7],materials.dark,[0,.49,0]);
box(kart,'lower-bumper',[2.12,.25,2.8],accentMat,[0,.43,.12]);
box(kart,'body-shell',[2,.61,1.92],bodyMat,[0,.73,.02]);
box(kart,'nose',[1.55,.38,.92],accentMat,[0,.79,1.15]);
box(kart,'bonnet',[1.25,.12,.64],bodyMat,[0,1.005,1.18]);
box(kart,'seat',[.88,.75,.9],seatMat,[0,1.1,-.48]);
// Wheel wells and chunky tires, with yellow hubs.
const wheels=[];
for(const x of [-1,1]) for(const z of [-.88,.94]){
  const wheelGroup=new THREE.Group(); wheelGroup.position.set(x*1.02,.43,z); kart.add(wheelGroup);
  const tire=new THREE.Mesh(new THREE.CylinderGeometry(.43,.43,.34,14),materials.tire); tire.rotation.z=Math.PI/2; tire.castShadow=true; wheelGroup.add(tire);
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.365,12),accentMat); hub.rotation.z=Math.PI/2; wheelGroup.add(hub);
  const hubcap=new THREE.Mesh(new THREE.CylinderGeometry(.095,.095,.38,10),materials.dark); hubcap.rotation.z=Math.PI/2; wheelGroup.add(hubcap); wheels.push({group:wheelGroup,front:z>0});
}
// Friendly helmeted driver.
const driver=new THREE.Group(); driver.position.set(0,1.15,-.35); kart.add(driver);
const skin=mat('#f4bd86'), red=mat('#d94b3f'), blue=mat('#428db7'), white=mat('#fff6de'), black=mat('#202633');
const sphere=(parent,radius,material,pos,scale=[1,1,1])=>{const m=new THREE.Mesh(new THREE.SphereGeometry(radius,16,12),material);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;parent.add(m);return m};
sphere(driver,.45,blue,[0,.47,-.05],[1.04,1.12,.85]);
sphere(driver,.51,skin,[0,1.18,.08],[.9,1,.85]);
sphere(driver,.53,red,[0,1.53,.03],[1.05,.57,.99]);
box(driver,'helmet-brim',[1.08,.12,.42],red,[0,1.39,.38]);
sphere(driver,.13,white,[-.19,1.2,.46],[.72,1.2,.5]);sphere(driver,.13,white,[.19,1.2,.46],[.72,1.2,.5]);
sphere(driver,.055,black,[-.17,1.19,.51]);sphere(driver,.055,black,[.17,1.19,.51]);
sphere(driver,.105,skin,[0,1.01,.49],[1,.8,.8]);
// Steering wheel, rear exhausts, and a tiny spoiler.
const steering=new THREE.Mesh(new THREE.TorusGeometry(.3,.045,8,18),materials.dark);steering.position.set(0,1.26,.55);steering.rotation.x=.72;kart.add(steering);
box(kart,'spoiler',[2,.15,.25],accentMat,[0,1.42,-1.26]);
for(const x of [-.55,.55]){const exhaust=new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,.34,10),materials.metal);exhaust.rotation.x=Math.PI/2;exhaust.position.set(x,.55,-1.45);kart.add(exhaust)}

const kartShadow = new THREE.Mesh(new THREE.CircleGeometry(1.5,24),mat('#172c32',1,{transparent:true,opacity:.22}));kartShadow.rotation.x=-Math.PI/2;kartShadow.position.y=-.49;kart.add(kartShadow);

// Race state and controls.
const $ = (selector) => document.querySelector(selector);
const intro = $('#intro-overlay'), results = $('#result-overlay'), raceHud = $('#race-hud'), raceBottom = $('#race-bottom');
const mobileControls = $('#mobile-controls'), notice = $('#center-notice'), toast = $('#toast');
const timerNode = $('#timer'), timerBar = $('#timer-bar'), lapTimeNode = $('#lap-time'), lapNode = $('#lap-number');
const bestNode = $('#best-time'), speedNode = $('#speed'), speedMeter = $('#speed-meter'), boostState = $('#boost-state');
const mapPlayer = $('#map-player'), mapPath = document.querySelector('.map-center');
const mapPathLength = mapPath.getTotalLength();
const keys = new Set();
const state = { running:false, paused:false, over:false, time:60, speed:0, distance:0, lapTime:0, laps:0, lane:0, steer:0, boost:0, driftCharge:0, coins:0, topSpeed:0, cameraReady:false };
let bestLap = Number(localStorage.getItem('sunsetCircuitBest') || 0);
let toastTimeout = 0;
function timeString(seconds) {
  const mins=Math.floor(seconds/60), secs=Math.floor(seconds%60), cents=Math.floor((seconds%1)*100);
  return `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}.${String(cents).padStart(2,'0')}`;
}
function showToast(message) {
  toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimeout);
  toastTimeout=setTimeout(()=>toast.classList.remove('show'),1800);
}
function updateBest() { bestNode.textContent=bestLap?timeString(bestLap):'— — : — — . — —'; }
updateBest();

let audioContext=null, engineGain=null, engineOsc=null, muted=false;
function startAudio(){
  if(!audioContext){
    const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;
    audioContext=new AudioCtx();engineOsc=audioContext.createOscillator();const overtone=audioContext.createOscillator();
    const filter=audioContext.createBiquadFilter();engineGain=audioContext.createGain();
    engineOsc.type='sawtooth';engineOsc.frequency.value=55;overtone.type='triangle';overtone.frequency.value=83;
    filter.type='lowpass';filter.frequency.value=270;engineGain.gain.value=0;
    engineOsc.connect(filter);overtone.connect(filter);filter.connect(engineGain);engineGain.connect(audioContext.destination);
    engineOsc.start();overtone.start();
  }
  audioContext.resume();
}
function beep(frequency=580,duration=.12,wave='sine',volume=.07){
  if(muted||!audioContext)return;const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();
  oscillator.type=wave;oscillator.frequency.setValueAtTime(frequency,audioContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(100,frequency*.72),audioContext.currentTime+duration);
  gain.gain.setValueAtTime(volume,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+duration);
  oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start();oscillator.stop(audioContext.currentTime+duration);
}
function resetGame(){
  Object.assign(state,{running:false,paused:false,over:false,time:60,speed:0,distance:0,lapTime:0,laps:0,lane:0,steer:0,boost:0,driftCharge:0,coins:0,topSpeed:0,cameraReady:false});
  keys.clear();coins.forEach(c=>{c.got=false;c.mesh.visible=true});
  intro.classList.add('hidden');results.classList.add('hidden');raceHud.style.display='flex';raceBottom.style.display='flex';
  mobileControls.style.display=innerWidth<=700?'block':'none';notice.textContent='';
  updateRaceHUD(); updateBest();
  const p=pointAt(0),t=tangentAt(0),r=rightAt(0);kart.position.set(p.x,.08,p.z);kart.rotation.y=Math.atan2(t.x,t.z);kart.rotation.z=0;
  camera.position.set(p.x-t.x*12,8,p.z-t.z*12);camera.lookAt(p.x,1.2,p.z);state.cameraReady=true;
}
async function countdown(){
  startAudio();$('#start-button').disabled=true;$('#start-button span').textContent='GET READY...';
  const sequence=['3','2','1','GO!'];
  for(const item of sequence){notice.textContent=item;beep(item==='GO!'?880:520,.16,'triangle',.1);await new Promise(resolve=>setTimeout(resolve,item==='GO!'?550:700));}
  notice.textContent='';state.running=true;state.lapTime=0;$('#start-button').disabled=false;$('#start-button span').textContent='START YOUR ENGINE';
}
$('#start-button').addEventListener('click',()=>{resetGame();countdown()});
$('#restart-button').addEventListener('click',()=>{resetGame();countdown()});
$('#sound-button').addEventListener('click',()=>{
  muted=!muted;$('#sound-icon').textContent=muted?'♩':'♪';$('.sound-label').textContent=muted?'SOUND OFF':'SOUND ON';
  if(engineGain&&audioContext)engineGain.gain.setTargetAtTime(muted?0:(state.running?.026:0),audioContext.currentTime,.08);
});
window.addEventListener('keydown',e=>{
  const key=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key))e.preventDefault();
  if(key==='escape'||key==='p'){
    if(state.running&&!state.over){state.paused=!state.paused;showToast(state.paused?'PAUSED · PRESS P TO RESUME':'BACK IN THE RACE');}
    return;
  }
  keys.add(key);
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());
function bindTouch(id,key){
  const button=$(id);if(!button)return;
  button.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(key);button.setPointerCapture(e.pointerId)});
  const release=e=>{e.preventDefault();keys.delete(key)};
  button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
}
bindTouch('#touch-left','arrowleft');bindTouch('#touch-right','arrowright');bindTouch('#touch-gas','arrowup');bindTouch('#touch-drift',' ');

function finishRace(){
  state.running=false;state.over=true;notice.textContent='';mobileControls.style.display='none';
  const improved=bestLap>0&&state.lapTime>0&&state.lapTime<bestLap;
  $('#result-title').textContent=state.laps>=3?'CIRCUIT ACE!':(state.laps>0?'TIME!':'NICE TRY!');
  $('#result-copy').textContent=state.laps>=3?'Three laps in the sixty. That was a ride.':(state.laps>0?'Your next run is already calling.':'A few more turns and you’ll be flying.');
  $('#result-medal').textContent=state.laps>=3?'★':'✦';
  $('#result-laps').textContent=String(state.laps).padStart(2,'0');
  $('#result-best').textContent=bestLap?timeString(bestLap):'—:—.—';
  $('#result-speed').innerHTML=`${Math.round(state.topSpeed*3.6).toString().padStart(3,'0')} <i>KM/H</i>`;
  results.classList.remove('hidden');beep(680,.36,'triangle',.12);
}
function updateRaceHUD(){
  const remaining=Math.max(0,state.time),sec=Math.floor(remaining),cents=Math.floor((remaining%1)*100);
  timerNode.innerHTML=`${String(sec).padStart(2,'0')}<span>.${String(cents).padStart(2,'0')}</span>`;
  timerBar.style.width=`${Math.max(0,remaining/60*100)}%`;
  lapTimeNode.textContent=timeString(state.lapTime);lapNode.textContent=String(state.laps+1).padStart(2,'0');
  speedNode.textContent=Math.round(state.speed*3.6).toString().padStart(3,'0');
  speedMeter.style.width=`${Math.min(100,state.speed/52*100)}%`;
  boostState.textContent=state.boost>0?'ACTIVE':(state.driftCharge>.35?'CHARGING':'READY');
  boostState.style.color=state.boost>0?'#aaffb0':'#ffd35a';
  const marker=mapPath.getPointAtLength((state.distance/trackLength%1)*mapPathLength);
  mapPlayer.setAttribute('cx',marker.x);mapPlayer.setAttribute('cy',marker.y);
  $('#map-checkpoint').textContent=`CHECKPOINT ${String(Math.floor((state.distance/trackLength%1)*4)+1).padStart(2,'0')}`;
}

const clock=new THREE.Clock();
let lastUi=0;
function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(clock.getDelta(),.045),now=clock.elapsedTime;
  for(const coin of coins){coin.mesh.rotation.y=now*1.9;coin.mesh.position.y=1.22+Math.sin(now*2+coin.u*8)*.16;}
  treeMeshes.forEach((tree,i)=>{tree.rotation.z=Math.sin(now*.55+i)*.008});
  if(state.running&&!state.paused){
    const accelerating=keys.has('w')||keys.has('arrowup'), braking=keys.has('s')||keys.has('arrowdown');
    const steerInput=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
    // Forgiving automatic roll keeps the time trial moving; throttle and drift reward clean driving.
    const targetSpeed=accelerating?44:(braking?0:15);
    const acceleration=(targetSpeed-state.speed)*(targetSpeed>state.speed?1.8:2.5);
    state.speed=Math.max(0,state.speed+acceleration*dt);
    const drifting=keys.has(' ');
    if(drifting&&Math.abs(steerInput)>0&&state.speed>9){
      state.driftCharge+=dt*(Math.abs(steerInput)*.75+.2);
      if(state.driftCharge>=1.15){state.driftCharge=0;state.boost=1.35;beep(760,.17,'sawtooth',.045);showToast('MINI TURBO! ϟ');}
    }else if(!drifting)state.driftCharge=Math.max(0,state.driftCharge-dt*.72);
    if(state.boost>0){state.boost=Math.max(0,state.boost-dt);state.speed=Math.min(53,state.speed+17*dt)}
    state.steer+=(steerInput-state.steer)*Math.min(1,dt*9);
    state.lane+=state.steer*dt*(2.4+state.speed*.115);
    state.lane*=Math.max(.94,1-dt*.045);
    const offroad=Math.abs(state.lane)>roadWidth*.43;
    const effectiveSpeed=offroad?state.speed*.67:state.speed;
    if(offroad){state.speed=Math.max(7,state.speed-dt*13);kart.position.y=.08+Math.abs(Math.sin(now*28))*.055;}
    else kart.position.y=.08;
    const previousLap=Math.floor(state.distance/trackLength);
    state.distance+=effectiveSpeed*dt;
    const newLap=Math.floor(state.distance/trackLength);
    state.lapTime+=dt;state.time-=dt;state.topSpeed=Math.max(state.topSpeed,state.speed);
    if(newLap>previousLap){
      state.laps++;if(state.lapTime>5&&(bestLap===0||state.lapTime<bestLap)){bestLap=state.lapTime;localStorage.setItem('sunsetCircuitBest',bestLap.toString());showToast('NEW PERSONAL BEST!');}
      state.lapTime=0;beep(900,.28,'triangle',.1);
      if(state.laps===1)showToast('LAP 01 COMPLETE · KEEP IT UP');
    }
    const u=(state.distance/trackLength)%1,p=pointAt(u),t=tangentAt(u),r=rightAt(u);
    kart.position.x=p.x+r.x*state.lane;kart.position.z=p.z+r.z*state.lane;
    const yaw=Math.atan2(t.x,t.z);
    kart.rotation.y=yaw+state.steer*(drifting?.17:.075);
    kart.rotation.z=-state.steer*(drifting?.11:.045);
    wheels.forEach(w=>{w.group.rotation.x=now*state.speed*(w.front?1.9:1.75);if(w.front)w.group.rotation.y=state.steer*.24});
    steering.rotation.z=-state.steer*.18;
    for(const coin of coins){
      if(!coin.got){const delta=Math.abs(((u-coin.u+.5+1)%1)-.5);
        if(delta<.0033&&Math.abs(state.lane)<roadWidth*.39){coin.got=true;coin.mesh.visible=false;state.boost=Math.max(state.boost,.9);state.coins++;beep(1100,.11,'sine',.065);}
      }
      if(state.laps>0&&u<.04&&coin.u>.9)coin.got=false;
    }
    if(state.time<=0){state.time=0;updateRaceHUD();finishRace();}
    if(now-lastUi>.045){updateRaceHUD();updateBest();lastUi=now;}
    if(engineGain&&audioContext&&!muted)engineGain.gain.setTargetAtTime(.008+state.speed/44*.021,audioContext.currentTime,.06);
  }else if(engineGain&&audioContext&&(!state.running||state.paused)&&!muted){engineGain.gain.setTargetAtTime(0,audioContext.currentTime,.12)}

  const u=(state.distance/trackLength)%1,p=pointAt(u),t=tangentAt(u),r=rightAt(u);
  // Ease the chase camera and let it lean subtly into the current corner.
  const idealPos=new THREE.Vector3(kart.position.x-t.x*(10.5+state.speed*.075),5.4+state.speed*.025,kart.position.z-t.z*(10.5+state.speed*.075));
  camera.position.lerp(idealPos,1-Math.exp(-dt*3.3));
  const lookAt=new THREE.Vector3(kart.position.x+t.x*7,1.35,kart.position.z+t.z*7);
  camera.lookAt(lookAt);camera.rotation.z=-state.steer*.018;
  if(innerWidth>700){camera.fov=THREE.MathUtils.lerp(camera.fov,54+state.speed*.06,dt*2);camera.updateProjectionMatrix();}
  renderer.render(scene,camera);
}

function resize(){
  const w=innerWidth,h=innerHeight;camera.aspect=w/h;camera.fov=w<700?61:54;camera.updateProjectionMatrix();
  renderer.setSize(w,h);renderer.setPixelRatio(Math.min(devicePixelRatio,w<700?1.35:1.7));
  if(!state.running)mobileControls.style.display='none';
}
window.addEventListener('resize',resize);

// Park the racer at the start line while the player reads the briefing.
const initial=pointAt(0),initialT=tangentAt(0);
kart.position.set(initial.x,.08,initial.z);kart.rotation.y=Math.atan2(initialT.x,initialT.z);
camera.position.set(initial.x-initialT.x*12,8,initial.z-initialT.z*12);camera.lookAt(initial.x,1.2,initial.z);
frame();
