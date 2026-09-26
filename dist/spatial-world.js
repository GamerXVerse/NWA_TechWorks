import * as THREE from './vendor/three.module.min.js';

// One renderer and one connected world persist behind every HTML chapter.
const host = document.querySelector('[data-spatial-world]');
const toggle = document.querySelector('[data-motion-toggle]');
const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
const mobileQuery = matchMedia('(max-width: 700px)');
const chapters = [
  document.querySelector('#mission'),
  document.querySelector('.mission-bridge'),
  document.querySelector('#story'),
  document.querySelector('.problem'),
  document.querySelector('#services'),
  document.querySelector('#process'),
  document.querySelector('#vision'),
  document.querySelector('#team'),
  document.querySelector('#contact'),
].filter(Boolean);

const STEP = 16;
const COLOR = {green: 0x0c9466, blue: 0x386ed9, ink: 0x294438};
const nodeSets = {green: [], blue: [], ink: []};
const grayLines = [];
const greenLines = [];
const blueLines = [];
const routes = [];
const rings = [];
const mapLabels = [];
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t); };
const point = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const offset = mobileQuery.matches ? 0 : 3.2;
let seed = 1937;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

function addNode(position, radius = .075, color = 'green') {
  nodeSets[color].push({position: position.clone(), radius});
  return position;
}
function addLine(a, b, color = 'gray') {
  const target = color === 'green' ? greenLines : color === 'blue' ? blueLines : grayLines;
  target.push(a.x, a.y, a.z, b.x, b.y, b.z);
}
function addCurve(a, b, bend = .5, color = 'green', packet = false) {
  const middle = a.clone().lerp(b, .5);
  middle.z += bend;
  middle.y += bend * .14;
  const curve = new THREE.QuadraticBezierCurve3(a, middle, b);
  let last = curve.getPoint(0);
  for (let i = 1; i <= 24; i++) {
    const next = curve.getPoint(i / 24);
    addLine(last, next, color);
    last = next;
  }
  if (packet) routes.push(curve);
}
function addRing(scene, center, radius, color, tilt = .32) {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(radius, .012, 5, 80),
    new THREE.MeshBasicMaterial({color, transparent: true, opacity: .28, depthWrite: false}),
  );
  mesh.position.copy(center);
  mesh.rotation.x = tilt;
  scene.add(mesh);
  rings.push(mesh);
}

function buildCloud(index, count, radius, centerY = 0, centerZ = 0) {
  const center = point(index * STEP + offset, centerY, centerZ);
  addNode(center, .2, 'green');
  const points = [];
  for (let i = 0; i < count; i++) {
    const theta = i * 2.3999632297;
    const r = radius * Math.sqrt((i + .5) / count);
    const p = point(center.x + Math.cos(theta) * r, center.y + Math.sin(theta) * r, center.z + (random() - .5) * 3.6);
    points.push(p);
    addNode(p, i % 9 === 0 ? .12 : .05 + random() * .035, i % 7 === 0 ? 'blue' : i % 5 === 0 ? 'green' : 'ink');
    if (i % 2 === 0) addLine(center, p, i % 7 === 0 ? 'blue' : 'gray');
    if (i > 3) addLine(p, points[i - 3], 'gray');
  }
  return center;
}

function buildStoryWorld(scene, mobile) {
  buildCloud(0, mobile ? 19 : 43, 3.8);
  addRing(scene, point(offset, 0, 0), 2.8, COLOR.green, .55);
  const mission = buildCloud(1, mobile ? 14 : 29, 3.3, .3);
  const missionPeer = point(STEP + offset - 3.3, -1.5, -.8);
  addNode(missionPeer, .16, 'blue');
  addCurve(missionPeer, mission, 1.3, 'blue', true);

  // The origin is a route through a handful of connected project moments.
  const storyX = 2 * STEP + offset;
  const storyPoints = [
    point(storyX - 4, -2.5, -1), point(storyX - 2.2, -1.6, .9),
    point(storyX - .5, .7, 1.2), point(storyX + 1.5, 1.7, -.6),
    point(storyX + 3.7, 2.6, 1),
  ];
  storyPoints.forEach((p, i) => {
    addNode(p, i === 2 ? .21 : .12, i % 2 ? 'blue' : 'green');
    if (i) addCurve(storyPoints[i - 1], p, .8, i % 2 ? 'blue' : 'green', true);
  });
  buildCloud(3, mobile ? 11 : 23, 3.1, -.25);

  const serviceCenter = point(4 * STEP + offset, 0, -.3);
  addNode(serviceCenter, .31, 'green');
  addRing(scene, serviceCenter, 2.3, COLOR.blue, .55);
  addRing(scene, serviceCenter, 3.75, COLOR.green, -.35);
  for (let i = 0; i < 10; i++) {
    const angle = i / 10 * Math.PI * 2 - .45;
    const r = i % 2 ? 3.2 : 4.1;
    const p = point(serviceCenter.x + Math.cos(angle) * r, Math.sin(angle) * r, (i % 3 - 1) * .9);
    addNode(p, .13, i % 2 ? 'blue' : 'green');
    addCurve(serviceCenter, p, .35, i % 2 ? 'blue' : 'green', i < 5);
  }

  const processX = 5 * STEP + offset;
  const process = [-4.2, -1.4, 1.4, 4.2].map((x, i) => point(processX + x, i % 2 ? .3 : -.3, i % 2 ? -.6 : .8));
  process.forEach((p, i) => {
    addNode(p, .22, i % 2 ? 'blue' : 'green');
    addRing(scene, p, .57, i % 2 ? COLOR.blue : COLOR.green, .15);
    if (i) addCurve(process[i - 1], p, .65, i % 2 ? 'blue' : 'green', true);
  });

  buildCounty(scene, 6 * STEP + (mobile ? 0 : -3.1));
  const teamX = 7 * STEP + offset;
  const people = [point(teamX - 2.8, 1.4, .6), point(teamX + 2.4, 1.8, -.5), point(teamX, -2.5, 1.2)];
  people.forEach((p, i) => { addNode(p, .27, i === 1 ? 'blue' : 'green'); addRing(scene, p, .75, i === 1 ? COLOR.blue : COLOR.green); });
  addCurve(people[0], people[1], .7, 'blue', true);
  addCurve(people[1], people[2], .8, 'green', true);
  addCurve(people[2], people[0], .8, 'green', true);
  const finalCenter = buildCloud(8, mobile ? 12 : 29, 3.15, -.3);
  addRing(scene, finalCenter, 1.7, COLOR.green, .6);
}

function buildCounty(scene, worldX) {
  // The silhouette is derived from the site's existing Benton County diagram.
  const coords = [[62,70],[448,73],[448,328],[362,327],[362,357],[200,351],[199,397],[166,397],[166,441],[99,439]];
  const mapPoint = (x, y, z = 0) => point(worldX + (x - 260) / 70, (260 - y) / 70, z);
  const shape = new THREE.Shape(coords.map(([x, y]) => new THREE.Vector2((x - 260) / 70, (260 - y) / 70)));
  const geometry = new THREE.ExtrudeGeometry(shape, {depth: .19, bevelEnabled: true, bevelThickness: .06, bevelSize: .06, bevelSegments: 1});
  const plate = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color: 0xe9f5ef, metalness: .12, roughness: .7, transparent: true, opacity: .87}));
  plate.position.x = worldX;
  plate.rotation.x = -.24;
  scene.add(plate);
  for (let i = 0; i < coords.length; i++) {
    const [ax, ay] = coords[i], [bx, by] = coords[(i + 1) % coords.length];
    addLine(mapPoint(ax, ay, .26), mapPoint(bx, by, .26), 'green');
  }
  const hub = mapPoint(255,185,.45);
  addNode(hub, .2, 'green');
  mapLabels.push({text: 'BENTONVILLE', position: hub.clone().add(point(0,.48,.1)), hub: true});
  const cities = [['ROGERS',305,225],['BELLA VISTA',250,98],['PEA RIDGE',338,135],['SILOAM SPRINGS',104,360],['LOWELL',308,315]];
  cities.forEach(([name,x,y], i) => {
    const p = mapPoint(x,y,.45);
    addNode(p, .11, 'blue');
    addCurve(hub, p, .3 + i * .08, i % 2 ? 'blue' : 'green', true);
    mapLabels.push({text: name, position: p.clone().add(point(0,.28,.1))});
  });
  mapLabels.push({text: 'BENTON COUNTY', position: mapPoint(260,320,.4), county: true});
  addRing(scene, hub, .5, COLOR.green, .1);
}

function buildLines(scene, positions, color, opacity) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mesh = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({color, transparent: true, opacity, depthWrite: false}));
  scene.add(mesh);
}

function buildInstancedNodes(scene, colorName, geometry) {
  const nodes = nodeSets[colorName];
  const mesh = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({color: COLOR[colorName], roughness: .36, metalness: .16}), nodes.length);
  const matrix = new THREE.Matrix4();
  nodes.forEach(({position, radius}, i) => {
    matrix.makeScale(radius, radius, radius);
    matrix.setPosition(position);
    mesh.setMatrixAt(i, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  scene.add(mesh);
}

function addSpine(scene) {
  const points = [];
  for (let i = 0; i <= 144; i++) {
    const x = -7 + i;
    points.push(point(x, -3.9 + Math.sin(x * .22) * .22, -2.4 + Math.sin(x * .12) * .3));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  scene.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({color: COLOR.green, transparent: true, opacity: .23, depthWrite: false})));
  for (let i = 0; i < chapters.length; i++) {
    const a = point(i * STEP + offset, -2.8, -1.2);
    const b = point(i * STEP + offset, -3.9 + Math.sin(i * STEP * .22) * .22, -2.4);
    addCurve(a, b, .4, 'gray');
  }
}

let renderer;
let scene;
let camera;
let packets;
let packetMatrix;
let frame = 0;
let lastFrame = 0;
let time = 0;
let paused = reduceQuery.matches;
let targetX = 0;
let cameraX = 0;
let targetY = 0;
let pointerX = 0;
let pointerY = 0;
let anchors = [];

function measure() {
  if (!renderer) return;
  const width = innerWidth, height = innerHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobileQuery.matches ? 1.25 : 1.6));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  anchors = chapters.map((el, i) => i ? Math.max(0, el.getBoundingClientRect().top + scrollY - innerHeight * .42) : 0);
  updateTarget();
  render();
}

function updateTarget() {
  const y = scrollY;
  let index = 0;
  while (index < anchors.length - 2 && y >= anchors[index + 1]) index++;
  const start = anchors[index], end = anchors[index + 1] ?? start + innerHeight;
  const local = smooth((y - start) / Math.max(1, end - start));
  targetX = (index + local) * STEP;
  targetY = Math.sin((index + local) * .9) * .32;
  document.documentElement.dataset.worldChapter = String(index);
  if (paused || reduceQuery.matches) {
    cameraX = targetX;
    render();
  } else schedule();
}

function render() {
  if (!renderer || document.hidden) return;
  const mobile = mobileQuery.matches;
  camera.position.set(cameraX + (mobile ? 0 : pointerX * .25), targetY + (mobile ? .15 : pointerY * .17), mobile ? 13.6 : 13.2);
  camera.lookAt(cameraX + (mobile ? 0 : .7), targetY, 0);
  camera.updateMatrixWorld();
  if (packets) {
    routes.forEach((curve, index) => {
      const progress = ((time * (.1 + index % 4 * .025) + index * .193) % 1 + 1) % 1;
      const p = curve.getPoint(progress);
      packetMatrix.makeScale(.055, .055, .055);
      packetMatrix.setPosition(p);
      packets.setMatrixAt(index, packetMatrix);
    });
    packets.instanceMatrix.needsUpdate = true;
  }
  rings.forEach((ring, index) => { ring.rotation.z = paused ? 0 : Math.sin(time * .25 + index) * .09; });
  const mapInView = Math.abs(cameraX - 6 * STEP) < 9;
  mapLabels.forEach(({element, position}) => {
    if (!mapInView) { element.hidden = true; return; }
    const projected = position.clone().project(camera);
    element.hidden = projected.z > 1 || Math.abs(projected.x) > .95 || Math.abs(projected.y) > .88;
    if (!element.hidden) {
      element.style.left = `${(projected.x + 1) * 50}%`;
      element.style.top = `${(1 - projected.y) * 50}%`;
    }
  });
  renderer.render(scene, camera);
}

function tick(now) {
  frame = 0;
  if (document.hidden || paused || reduceQuery.matches) return;
  const minInterval = mobileQuery.matches ? 1000 / 24 : 1000 / 48;
  if (now - lastFrame < minInterval) { schedule(); return; }
  const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .05) : 0;
  lastFrame = now;
  time += dt;
  // Exponential easing prevents camera jumps without tying movement to frame rate.
  cameraX += (targetX - cameraX) * (1 - Math.exp(-dt * 5.8));
  if (Math.abs(targetX - cameraX) < .002) cameraX = targetX;
  render();
  schedule();
}
function schedule() {
  if (!frame && !document.hidden && !paused && !reduceQuery.matches) frame = requestAnimationFrame(tick);
}
function setPaused(value) {
  paused = value;
  toggle.hidden = false;
  toggle.textContent = paused ? 'Play animations' : 'Pause animations';
  toggle.setAttribute('aria-pressed', String(paused));
  document.documentElement.classList.toggle('animations-paused', paused);
  if (paused) { cancelAnimationFrame(frame); frame = 0; cameraX = targetX; render(); }
  else { lastFrame = 0; schedule(); }
}

function init() {
  if (!host || !chapters.length) return;
  try {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    renderer = new THREE.WebGLRenderer({canvas, alpha: true, antialias: !mobileQuery.matches, powerPreference: 'low-power'});
    renderer.setClearColor(0xffffff, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.append(canvas);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(43, 1, .1, 90);
    scene.add(new THREE.AmbientLight(0xffffff, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(-4, 7, 10);
    scene.add(key);
    buildStoryWorld(scene, mobileQuery.matches);
    mapLabels.forEach(label => {
      const element = document.createElement('span');
      element.className = `world-label${label.hub ? ' is-hub' : ''}${label.county ? ' is-county' : ''}`;
      element.textContent = label.text;
      element.hidden = true;
      host.append(element);
      label.element = element;
    });
    addSpine(scene);
    buildLines(scene, grayLines, 0x91aaa0, .22);
    buildLines(scene, greenLines, COLOR.green, .42);
    buildLines(scene, blueLines, COLOR.blue, .36);
    const sphere = new THREE.SphereGeometry(1, mobileQuery.matches ? 8 : 12, mobileQuery.matches ? 6 : 9);
    ['green', 'blue', 'ink'].forEach(name => buildInstancedNodes(scene, name, sphere));
    packets = new THREE.InstancedMesh(sphere, new THREE.MeshBasicMaterial({color: 0x0c9466}), routes.length);
    packets.frustumCulled = false;
    packetMatrix = new THREE.Matrix4();
    scene.add(packets);
    measure();
    document.documentElement.classList.add('spatial-ready');
    document.dispatchEvent(new Event('spatial-world-ready'));
    toggle.hidden = false;
    setPaused(reduceQuery.matches);
    addEventListener('scroll', updateTarget, {passive: true});
    addEventListener('resize', measure, {passive: true});
    addEventListener('pointermove', event => {
      if (mobileQuery.matches || paused) return;
      pointerX = event.clientX / innerWidth - .5;
      pointerY = event.clientY / innerHeight - .5;
    }, {passive: true});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastFrame = 0; render(); schedule(); } });
    reduceQuery.addEventListener('change', event => setPaused(event.matches));
    toggle.addEventListener('click', () => setPaused(!paused));
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      frame = 0;
      document.documentElement.classList.remove('spatial-ready');
      document.documentElement.classList.add('spatial-fallback');
    });
  } catch (error) {
    console.warn('The 3D world is unavailable; the accessible site remains usable.', error);
    renderer?.dispose();
    host.replaceChildren();
    document.documentElement.classList.add('spatial-fallback');
  }
}

init();
