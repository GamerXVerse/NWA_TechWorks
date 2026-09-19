import * as THREE from './vendor/three.module.min.js';

// Local, pinned Three.js. Every diagram keeps its HTML/SVG fallback until rendered.
const green = 0x38d996, blue = 0x6d9cff;
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const scenes = [];
let paused = preference.matches, frame = 0, elapsed = 0, previous = 0;
const toggle = document.querySelector('[data-motion-toggle]');
const sphere = new THREE.SphereGeometry(1, 20, 14);
const ring = new THREE.TorusGeometry(1, .025, 8, 64);
const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);

function node(group, position, radius, color) {
  const mesh = new THREE.Mesh(sphere, new THREE.MeshStandardMaterial({color, metalness: .5, roughness: .24, emissive: color, emissiveIntensity: .18}));
  mesh.position.copy(position); mesh.scale.setScalar(radius); group.add(mesh);
  return mesh;
}
function line(group, points, color, opacity = .5) {
  const mesh = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({color, transparent: true, opacity}));
  group.add(mesh); return mesh;
}
function route(s, a, b, height, color, index) {
  const middle = a.clone().lerp(b, .5); middle.z += height;
  if (s.kind === 'rail' || s.kind === 'process') {
    if (Math.abs(b.x-a.x) > Math.abs(b.y-a.y)) middle.y += 14;
    else middle.x -= 9;
  }
  const curve = new THREE.QuadraticBezierCurve3(a, middle, b);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, ['map','rail','process'].includes(s.kind) ? .75 : .015, 6, false), new THREE.MeshBasicMaterial({color, transparent: true, opacity: .65}));
  s.group.add(tube);
  const packet = node(s.group, a, s.kind === 'map' ? 2.8 : .048, color);
  s.packets.push({curve, packet, offset: index * .19, speed: .13 + index * .013});
}
function label(s, text, position, className = '') {
  const el = document.createElement('span'); el.className = `scene-label ${className}`; el.textContent = text;
  s.host.append(el); s.labels.push({el, position});
}
function makeScene(host, kind) {
  const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'network-canvas'; renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene(), group = new THREE.Group(); scene.add(group);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x174133, 2.8));
  const light = new THREE.DirectionalLight(0xffffff, 4); light.position.set(-4, 7, 12); scene.add(light);
  const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, .1, 2000); camera.position.z = 800;
  const s = {host, kind, renderer, scene, group, camera, packets: [], labels: [], visible: true, pointer: {x: 0, y: 0}};
  host.append(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); s.visible = false; host.classList.remove('three-ready'); host.classList.add('three-lost'); });
  host.addEventListener('pointermove', e => { const r = host.getBoundingClientRect(); s.pointer.x = (e.clientX-r.left)/r.width-.5; s.pointer.y = (e.clientY-r.top)/r.height-.5; });
  host.addEventListener('pointerleave', () => {s.pointer.x = s.pointer.y = 0;});
  return s;
}
function buildMap(s) {
  const coords = [[62,70],[448,73],[448,328],[362,327],[362,357],[200,351],[199,397],[166,397],[166,441],[99,439]];
  const p = (x,y,z=10) => v(x-260,260-y,z);
  const shape = new THREE.Shape(coords.map(([x,y]) => new THREE.Vector2(x-260,260-y)));
  const geometry = new THREE.ExtrudeGeometry(shape, {depth: 13, bevelEnabled: true, bevelSize: 1.4, bevelThickness: 1.4, bevelSegments: 2, steps: 1});
  const plate = new THREE.Mesh(geometry, [new THREE.MeshBasicMaterial({color: 0x0c2922}), new THREE.MeshStandardMaterial({color: 0x134937, metalness: .25, roughness: .7})]);
  s.group.add(plate);
  line(s.group, [...coords, coords[0]].map(([x,y])=>p(x,y,15)), green, .85);
  line(s.group, [...coords, coords[0]].map(([x,y])=>p(x,y,-12)), blue, .28);
  for (let i=0;i<coords.length;i++) { const [x,y]=coords[i]; line(s.group,[p(x,y,-12),p(x,y,14)],blue,.3); }
  // Retain the supplied map's exact silhouette and contextual roads/lake lines.
  document.querySelectorAll('.map-context path').forEach(path => {
    const length=path.getTotalLength(), points=[];
    for(let i=0;i<=80;i++){const q=path.getPointAtLength(length*i/80);points.push(p(q.x,q.y,16));}
    line(s.group,points,path.classList.contains('map-water')?blue:green,.22);
  });
  const origin=p(255,185,24); node(s.group,origin,6,green);
  for(const radius of [13,22]) {const halo=new THREE.Mesh(ring,new THREE.MeshBasicMaterial({color:green,transparent:true,opacity:.5}));halo.position.copy(origin);halo.scale.setScalar(radius);s.group.add(halo);}
  label(s,'BENTONVILLE',p(250,153,26),'hub');
  const cities=[['ROGERS',305,225],['BELLA VISTA',250,98],['PEA RIDGE',338,135],['SILOAM SPRINGS',104,360],['LOWELL',308,315]];
  cities.forEach(([name,x,y],i)=>{const target=p(x,y,23);node(s.group,target,4,blue);route(s,origin,target,50+i*8,i%2?blue:green,i);label(s,name,p(x,y-15,24));});
  label(s,'BENTON COUNTY',p(255,405,18),'county');
  s.group.rotation.x = -.5; s.group.rotation.y = -.16;
}
function buildHero(s) {
  const points = [];
  for (let i=0;i<32;i++) { const y=1-2*(i+.5)/32, r=Math.sqrt(1-y*y), a=i*2.39996; points.push(v(Math.cos(a)*r*3.35,y*3.35,Math.sin(a)*r*3.35)); }
  points.forEach((p,i)=>{node(s.group,p,i%7===0?.11:.045,i%3?green:blue);points.slice(i+1).forEach(q=>{if(p.distanceTo(q)<2.3)line(s.group,[p,q],i%2?green:blue,.22);});});
  for(let i=0;i<7;i++)route(s,points[i],points[(i+11)%32],.8,i%2?green:blue,i);
  for(let i=0;i<3;i++){const orbit=new THREE.Mesh(ring,new THREE.MeshBasicMaterial({color:i%2?green:blue,transparent:true,opacity:.22}));orbit.scale.setScalar(3.9+i*.25);orbit.rotation.set(.5+i*.8,.3+i*.55,0);s.group.add(orbit);}
  s.group.rotation.z = -.15;
}
function buildIcon(s) {
  const a=v(-2.6,0,.4), b=v(2.4,2,0), c=v(2.4,-2,.2);
  [a,b,c].forEach((p,i)=>node(s.group,p,.5,i?blue:green));
  route(s,a,b,2,green,0);route(s,a,c,2,blue,1);
}
function buildRail(s) {
  // Measure the existing responsive text layout rather than moving any content.
  const bounds=s.host.getBoundingClientRect();
  const elements=[...s.host.querySelectorAll(s.kind==='process'?'.step-node':':scope > div:not(.scene-layer)')];
  const points=elements.map(el=>{const b=el.getBoundingClientRect();return v((b.left-bounds.left+(s.kind==='process'?b.width/2:8))-bounds.width/2,bounds.height/2-(b.top-bounds.top+(s.kind==='process'?b.height/2:-15)),4);});
  points.forEach((p,i)=>node(s.group,p,6,i%2?blue:green));
  points.slice(1).forEach((p,i)=>route(s,points[i],p,30,i%2?blue:green,i));
  // Pixel-space diagrams need slightly larger tubes and packets.
  s.packets.forEach(({packet})=>packet.scale.setScalar(3));
}
function resize(s) {
  const {width,height}=s.host.getBoundingClientRect(); if(!width||!height)return;
  s.renderer.setSize(width,height,false);
  let h=s.kind==='map'?560:s.kind==='hero'?10:s.kind==='icon'?8:height;
  let w=s.kind==='map'?Math.max(550,h*width/height):s.kind==='hero'?Math.max(9,h*width/height):s.kind==='icon'?h*width/height:width;
  if(s.kind==='map')h=w*height/width;
  Object.assign(s.camera,{left:-w/2,right:w/2,top:h/2,bottom:-h/2});s.camera.updateProjectionMatrix();
  if(s.kind==='rail'||s.kind==='process'){
    s.group.traverse(obj=>{if(obj.geometry&&obj.geometry!==sphere&&obj.geometry!==ring)obj.geometry.dispose();if(obj.material)obj.material.dispose();});s.group.clear();s.packets=[];buildRail(s);
  }
  draw(s,elapsed);
}
function draw(s,t) {
  if(s.kind==='hero'){s.group.rotation.y=t*.07;s.group.rotation.x=.18+(paused?0:s.pointer.y*.15);}
  if(s.kind==='map'){s.group.rotation.y=-.16+(paused?0:Math.sin(t*.22)*.04+s.pointer.x*.12);s.group.rotation.x=-.5+(paused?0:s.pointer.y*.09);}
  if(s.kind==='icon')s.group.rotation.y=Math.sin(t*.5)*.3;
  s.packets.forEach(({curve,packet,offset,speed})=>packet.position.copy(curve.getPoint((t*speed+offset)%1)));
  s.group.updateMatrixWorld(true);
  s.labels.forEach(({el,position})=>{const p=position.clone().applyMatrix4(s.group.matrixWorld).project(s.camera);el.style.left=`${(p.x+1)*50}%`;el.style.top=`${(1-p.y)*50}%`;});
  s.renderer.render(s.scene,s.camera);
}
function tick(now) {
  frame=0;if(paused||document.hidden||!scenes.some(s=>s.visible))return;
  elapsed+=previous?Math.min((now-previous)/1000,.05):0;previous=now;
  scenes.filter(s=>s.visible).forEach(s=>draw(s,elapsed));frame=requestAnimationFrame(tick);
}
function resume(){if(!frame&&!paused&&!document.hidden){previous=0;frame=requestAnimationFrame(tick);}}
function setPaused(value){paused=value;toggle.textContent=paused?'Play animations':'Pause animations';toggle.setAttribute('aria-pressed',String(paused));document.documentElement.classList.toggle('animations-paused',paused);document.dispatchEvent(new CustomEvent('network-motion',{detail:{paused}}));if(paused){cancelAnimationFrame(frame);frame=0;}else resume();}
toggle.addEventListener('click',()=>setPaused(!paused));preference.addEventListener('change',e=>setPaused(e.matches));
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else resume();});

const targets=[['.hero-route','hero'],['.vision-map','map'],['.system-rail','rail'],['.process-track','process']];
document.querySelectorAll('.service-card').forEach(card=>{if(/^(Workflow Systems|Automation & Integration)$/.test(card.querySelector('h3').textContent)){const host=document.createElement('div');host.className='network-icon';host.setAttribute('aria-hidden','true');const svg=card.querySelector('svg');svg.before(host);host.append(svg);targets.push([host,'icon']);}});
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
  const host=entry.target;let s=scenes.find(item=>item.host===host);
  if(!s&&entry.isIntersecting){try{s=makeScene(host,host.dataset.scene);if(s.kind==='map')buildMap(s);if(s.kind==='hero')buildHero(s);if(s.kind==='icon')buildIcon(s);resize(s);scenes.push(s);host.classList.add('three-ready');host.dataset.rendered='threejs';new ResizeObserver(()=>resize(s)).observe(host);toggle.hidden=false;document.dispatchEvent(new CustomEvent('network-3d-ready'));}catch(error){host.querySelectorAll('.network-canvas,.scene-label').forEach(el=>el.remove());host.classList.remove('three-ready');host.dataset.rendered='fallback';observer.unobserve(host);return;}}
  if(s){s.visible=entry.isIntersecting&&!host.classList.contains('three-lost');if(s.visible)draw(s,elapsed);resume();}
}),{rootMargin:'120px'});
targets.forEach(([selector,kind])=>{const host=typeof selector==='string'?document.querySelector(selector):selector;if(host){host.dataset.scene=kind;observer.observe(host);}});
setPaused(paused);
