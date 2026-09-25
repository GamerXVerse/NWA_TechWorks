import * as THREE from './vendor/three.module.min.js';

// Local, pinned Three.js. Every diagram keeps its HTML/SVG fallback until rendered.
const green = 0x0d7c52, blue = 0x245fdb, graphite = 0x26312c;
const mapGreen = 0x38d996, mapBlue = 0x6d9cff;
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const storyHost = document.querySelector('[data-story]');
const storyCopy = document.querySelector('.hero-copy');
const storyMoments = [...document.querySelectorAll('[data-story-moment]')];
const scenes = [];
let paused = preference.matches, frame = 0, elapsed = 0, previous = 0;
let storyReady = false, storyTarget = 0;
const toggle = document.querySelector('[data-motion-toggle]');
const sphere = new THREE.SphereGeometry(1, 18, 12);
const ring = new THREE.TorusGeometry(1, .025, 8, 64);
const v = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const smoothstep = (value, start, end) => {
  const t = clamp((value - start) / (end - start));
  return t * t * (3 - 2 * t);
};

function node(group, position, radius, color) {
  const material = new THREE.MeshBasicMaterial({color, transparent: true, depthWrite: false});
  const mesh = new THREE.Mesh(sphere, material);
  mesh.position.copy(position);
  mesh.scale.setScalar(radius);
  group.add(mesh);
  return mesh;
}

function line(group, points, color, opacity = .5) {
  const mesh = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({color, transparent: true, opacity, depthWrite: false}),
  );
  group.add(mesh);
  return mesh;
}

function route(s, a, b, height, color, index) {
  const middle = a.clone().lerp(b, .5);
  middle.z += height;
  if (s.kind === 'rail' || s.kind === 'process') {
    if (Math.abs(b.x - a.x) > Math.abs(b.y - a.y)) middle.y += 14;
    else middle.x -= 9;
  }
  const curve = new THREE.QuadraticBezierCurve3(a, middle, b);
  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 40, ['map', 'rail', 'process'].includes(s.kind) ? .75 : .012, 5, false),
    new THREE.MeshBasicMaterial({color, transparent: true, opacity: s.kind === 'hero' ? .3 : .65, depthWrite: false}),
  );
  s.group.add(tube);
  const packet = node(s.group, a, s.kind === 'map' ? 2.8 : s.kind === 'hero' ? .055 : .048, color);
  if (s.kind === 'hero') {
    s.flightTubes.push(tube);
    s.flightPackets.push(packet);
  }
  s.packets.push({curve, packet, offset: index * .23, speed: .09 + index * .009});
}

function label(s, text, position, className = '') {
  const el = document.createElement('span');
  el.className = `scene-label ${className}`;
  el.textContent = text;
  s.host.append(el);
  s.labels.push({el, position});
}

function makeScene(host, kind) {
  const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true, powerPreference: 'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setClearColor(0xffffff, 0);
  renderer.domElement.className = 'network-canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const scene = new THREE.Scene(), group = new THREE.Group();
  scene.add(group);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xe5ebe7, 2.2));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(-4, 7, 12);
  scene.add(light);
  const camera = kind === 'hero'
    ? new THREE.PerspectiveCamera(42, 1, .1, 160)
    : new THREE.OrthographicCamera(-5, 5, 5, -5, .1, 2000);
  camera.position.z = kind === 'hero' ? 12 : 800;
  const s = {host, kind, renderer, scene, group, camera, packets: [], labels: [], visible: true, scrollTarget: 0, scrollProgress: 0, pointer: {x: 0, y: 0}};
  host.append(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    s.visible = false;
    host.classList.remove('three-ready');
    host.classList.add('three-lost');
    if (kind === 'hero') {
      storyReady = false;
      setStoryMotionEnabled(false);
    }
  });
  host.addEventListener('pointermove', event => {
    const bounds = host.getBoundingClientRect();
    s.pointer.x = (event.clientX - bounds.left) / bounds.width - .5;
    s.pointer.y = (event.clientY - bounds.top) / bounds.height - .5;
  });
  host.addEventListener('pointerleave', () => { s.pointer.x = s.pointer.y = 0; });
  return s;
}

function buildMap(s) {
  const coords = [[62, 70], [448, 73], [448, 328], [362, 327], [362, 357], [200, 351], [199, 397], [166, 397], [166, 441], [99, 439]];
  const p = (x, y, z = 10) => v(x - 260, 260 - y, z);
  const shape = new THREE.Shape(coords.map(([x, y]) => new THREE.Vector2(x - 260, 260 - y)));
  const geometry = new THREE.ExtrudeGeometry(shape, {depth: 13, bevelEnabled: true, bevelSize: 1.4, bevelThickness: 1.4, bevelSegments: 2, steps: 1});
  const plate = new THREE.Mesh(geometry, [new THREE.MeshBasicMaterial({color: 0x0c2922}), new THREE.MeshStandardMaterial({color: 0x134937, metalness: .25, roughness: .7})]);
  s.group.add(plate);
  line(s.group, [...coords, coords[0]].map(([x, y]) => p(x, y, 15)), mapGreen, .85);
  line(s.group, [...coords, coords[0]].map(([x, y]) => p(x, y, -12)), mapBlue, .28);
  for (let i = 0; i < coords.length; i++) {
    const [x, y] = coords[i];
    line(s.group, [p(x, y, -12), p(x, y, 14)], mapBlue, .3);
  }
  // Retain the supplied map's exact silhouette and contextual roads/lake lines.
  document.querySelectorAll('.map-context path').forEach(path => {
    const length = path.getTotalLength(), points = [];
    for (let i = 0; i <= 80; i++) {
      const q = path.getPointAtLength(length * i / 80);
      points.push(p(q.x, q.y, 16));
    }
    line(s.group, points, path.classList.contains('map-water') ? mapBlue : mapGreen, .22);
  });
  const origin = p(255, 185, 24);
  node(s.group, origin, 6, mapGreen);
  for (const radius of [13, 22]) {
    const halo = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({color: mapGreen, transparent: true, opacity: .5}));
    halo.position.copy(origin);
    halo.scale.setScalar(radius);
    s.group.add(halo);
  }
  label(s, 'BENTONVILLE', p(250, 153, 26), 'hub');
  const cities = [['ROGERS', 305, 225], ['BELLA VISTA', 250, 98], ['PEA RIDGE', 338, 135], ['SILOAM SPRINGS', 104, 360], ['LOWELL', 308, 315]];
  cities.forEach(([name, x, y], i) => {
    const target = p(x, y, 23);
    node(s.group, target, 4, mapBlue);
    route(s, origin, target, 50 + i * 8, i % 2 ? mapBlue : mapGreen, i);
    label(s, name, p(x, y - 15, 24));
  });
  s.group.rotation.x = -.5;
  s.group.rotation.y = -.16;
}

function buildHero(s) {
  s.flightTubes = [];
  s.flightPackets = [];
  const points = [];
  for (let i = 0; i < 32; i++) {
    const y = 1 - 2 * (i + .5) / 32;
    const r = Math.sqrt(1 - y * y), angle = i * 2.39996;
    points.push(v(Math.cos(angle) * r * 3.35, y * 3.35, Math.sin(angle) * r * 3.35));
  }

  const mobile = matchMedia('(max-width: 800px)').matches;
  s.group.position.x = mobile ? .3 : 1.65;
  const nodes = [];
  const edges = [];
  const phaseFor = index => index % 4 === 0 ? .31 : index % 4 === 1 ? .5 : index % 4 === 2 ? .68 : .85;
  points.forEach((point, index) => {
    const depth = .24 + (point.z + 3.35) / 6.7 * .43;
    const radius = index % 7 === 0 ? .105 : .052;
    const mesh = node(s.group, point, radius, index % 7 === 0 ? graphite : 0x4a554f);
    mesh.material.opacity = depth;
    nodes.push({mesh, radius, opacity: depth, phase: phaseFor(index)});
    points.slice(index + 1).forEach((other, otherIndex) => {
      if (point.distanceTo(other) >= 2.3) return;
      const edge = line(s.group, [point, other], 0x55615b, .12 + depth * .13);
      edges.push({mesh: edge, opacity: edge.material.opacity, phase: phaseFor(index + otherIndex + 1), ambient: true});
    });
  });

  const center = v(0, 0, 0);
  const techNode = node(s.group, center, .2, green);
  nodes.push({mesh: techNode, radius: .2, opacity: .14, phase: .5, focal: true});
  [2, 8, 14, 20, 26].forEach((index, i) => {
    const edge = line(s.group, [center, points[index]], green, .12);
    edges.push({mesh: edge, opacity: .12, phase: i < 2 ? .5 : .68});
  });

  // A handful of quiet pulses make the existing network routes feel active.
  [0, 7, 15, 23].forEach((index, i) => route(s, points[index], points[(index + 11) % points.length], .45, i === 1 ? green : graphite, i));
  [2, 14, 26].forEach((index, i) => route(s, center, points[index], .22, green, i + 4));

  const offset = s.group.position.clone();
  const cameraPoints = [
    offset.clone().add(v(0, 0, 12)),
    offset.clone().add(points[1].clone().multiplyScalar(.62)).add(v(0, .1, 1.1)),
    offset.clone().add(points[9].clone().multiplyScalar(.52)),
    offset.clone().add(points[17].clone().multiplyScalar(.48)),
    offset.clone().add(points[25].clone().multiplyScalar(.54)),
    offset.clone().add(v(0, 0, 12)),
  ];
  const targetPoints = [
    offset.clone(),
    offset.clone().add(points[7]),
    offset.clone(),
    offset.clone().add(points[20]),
    offset.clone().add(points[28].clone().multiplyScalar(.4)),
    offset.clone(),
  ];
  s.story = {
    nodes,
    edges,
    mobile,
    cameraPath: new THREE.CatmullRomCurve3(cameraPoints),
    targetPath: new THREE.CatmullRomCurve3(targetPoints),
    start: cameraPoints[0],
    lookStart: targetPoints[0],
    progress: 0,
  };
}

function buildIcon(s) {
  const a = v(-2.6, 0, .4), b = v(2.4, 2, 0), c = v(2.4, -2, .2);
  [a, b, c].forEach((point, i) => node(s.group, point, .5, i ? blue : green));
  route(s, a, b, 2, green, 0);
  route(s, a, c, 2, blue, 1);
}

function buildRail(s) {
  // Measure the existing responsive text layout rather than moving any content.
  const bounds = s.host.getBoundingClientRect();
  const elements = [...s.host.querySelectorAll(s.kind === 'process' ? '.step-node' : ':scope > div:not(.scene-layer)')];
  const points = elements.map(el => {
    const b = el.getBoundingClientRect();
    return v((b.left - bounds.left + (s.kind === 'process' ? b.width / 2 : 8)) - bounds.width / 2, bounds.height / 2 - (b.top - bounds.top + (s.kind === 'process' ? b.height / 2 : -15)), 4);
  });
  points.forEach((point, i) => node(s.group, point, 6, i % 2 ? blue : green));
  points.slice(1).forEach((point, i) => route(s, points[i], point, 30, i % 2 ? blue : green, i));
  s.packets.forEach(({packet}) => packet.scale.setScalar(3));
}

function resize(s) {
  const {width, height} = s.host.getBoundingClientRect();
  if (!width || !height) return;
  s.renderer.setSize(width, height, false);
  if (s.kind === 'hero') {
    s.camera.aspect = width / height;
    s.camera.updateProjectionMatrix();
    if (s.story) {
      const mobile = matchMedia('(max-width: 800px)').matches;
      if (mobile !== s.story.mobile) {
        const nextX = mobile ? .3 : 1.65;
        const shift = nextX - s.group.position.x;
        s.group.position.x = nextX;
        s.story.cameraPath.points.forEach(point => { point.x += shift; });
        s.story.targetPath.points.forEach(point => { point.x += shift; });
        s.story.mobile = mobile;
      }
    }
  } else {
    let h = s.kind === 'map' ? 560 : s.kind === 'icon' ? 8 : height;
    let w = s.kind === 'map' ? Math.max(550, h * width / height) : s.kind === 'icon' ? h * width / height : width;
    if (s.kind === 'map') h = w * height / width;
    Object.assign(s.camera, {left: -w / 2, right: w / 2, top: h / 2, bottom: -h / 2});
    s.camera.updateProjectionMatrix();
    if (s.kind === 'rail' || s.kind === 'process') {
      s.group.traverse(obj => {
        if (obj.geometry && obj.geometry !== sphere && obj.geometry !== ring) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
      s.group.clear();
      s.packets = [];
      buildRail(s);
    }
  }
  draw(s, elapsed);
}

function updateStoryProgress() {
  if (!storyHost || !storyHost.classList.contains('is-cinematic')) {
    storyTarget = 0;
    return;
  }
  const travel = storyHost.offsetHeight - innerHeight;
  storyTarget = travel > 0 ? clamp(-storyHost.getBoundingClientRect().top / travel) : 0;
}

function updateSceneViewport(s) {
  const bounds = s.host.getBoundingClientRect();
  s.scrollTarget = clamp((innerHeight - bounds.top) / (innerHeight + bounds.height));
  s.host.classList.toggle('scene-on-screen', bounds.bottom > 0 && bounds.top < innerHeight);
}

function updateScrollProgress() {
  updateStoryProgress();
  scenes.forEach(updateSceneViewport);
}

function setStoryMotionEnabled(enabled) {
  if (!storyHost) return;
  const shouldEnable = enabled && storyReady && !paused && !preference.matches;
  const wasEnabled = storyHost.classList.contains('is-cinematic');
  if (wasEnabled === shouldEnable) return;

  const before = storyHost.getBoundingClientRect().height;
  const top = storyHost.getBoundingClientRect().top + window.scrollY;
  const scrollY = window.scrollY;
  const root = document.documentElement;
  const scrollBehavior = root.style.scrollBehavior;
  const overflowAnchor = root.style.overflowAnchor;
  root.style.scrollBehavior = 'auto';
  root.style.overflowAnchor = 'none';
  storyHost.classList.toggle('is-cinematic', shouldEnable);
  const after = storyHost.getBoundingClientRect().height;
  const delta = after - before;

  if (scrollY >= top + before - 1) {
    window.scrollTo(0, Math.max(0, scrollY + delta));
  } else if (!shouldEnable && scrollY > top + 1) {
    window.scrollTo(0, Math.max(0, top));
  }
  requestAnimationFrame(() => {
    root.style.scrollBehavior = scrollBehavior;
    root.style.overflowAnchor = overflowAnchor;
  });

  if (!shouldEnable) {
    storyTarget = 0;
    const hero = scenes.find(scene => scene.kind === 'hero');
    if (hero) hero.story.progress = 0;
    storyCopy?.style.removeProperty('opacity');
    if (storyCopy) storyCopy.inert = false;
    storyMoments.forEach(moment => { moment.style.opacity = '0'; moment.style.visibility = 'hidden'; });
  }
  updateScrollProgress();
}

function updateMomentVisibility(progress) {
  const moments = {gap: .31, connector: .5, services: .68, community: .85};
  storyMoments.forEach(moment => {
    const center = moments[moment.dataset.storyMoment];
    const opacity = smoothstep(progress, center - .105, center - .045) * (1 - smoothstep(progress, center + .055, center + .12));
    moment.style.opacity = opacity.toFixed(3);
    moment.style.visibility = opacity > .005 ? 'visible' : 'hidden';
    moment.style.transform = `translateY(${(1 - opacity) * 14}px)`;
  });
}

function storyCameraProgress(progress) {
  const stops = [
    [0, 0], [.18, .22], [.24, .23], [.4, .23],
    [.48, .45], [.56, .45], [.62, .45],
    [.7, .68], [.74, .69], [.8, .69],
    [.87, .84], [.91, .85], [.97, .85], [1, 1],
  ];
  for (let i = 1; i < stops.length; i++) {
    const [endScroll, endCamera] = stops[i];
    if (progress > endScroll) continue;
    const [startScroll, startCamera] = stops[i - 1];
    const amount = smoothstep(progress, startScroll, endScroll);
    return startCamera + (endCamera - startCamera) * amount;
  }
  return 1;
}

function draw(s, time) {
  if (s.kind === 'hero') {
    const activeStory = storyReady && storyHost?.classList.contains('is-cinematic');
    if (activeStory) {
      const story = s.story;
      story.progress += (storyTarget - story.progress) * .13;
      if (Math.abs(storyTarget - story.progress) < .0005) story.progress = storyTarget;
      const progress = story.progress;
      const exitFade = 1 - smoothstep(progress, .92, 1);
      const cameraProgress = storyCameraProgress(progress);
      const cameraPosition = story.cameraPath.getPoint(cameraProgress);
      const cameraTarget = story.targetPath.getPoint(cameraProgress);
      if (story.mobile) {
        cameraPosition.copy(story.start).lerp(cameraPosition, .28);
        cameraTarget.copy(story.lookStart).lerp(cameraTarget, .35);
      }
      s.camera.position.copy(cameraPosition);
      s.camera.lookAt(cameraTarget);

      const hideHero = smoothstep(progress, .015, .14);
      if (storyCopy) {
        storyCopy.style.opacity = String(1 - hideHero);
        if (storyCopy.inert !== (hideHero > .98)) storyCopy.inert = hideHero > .98;
      }
      updateMomentVisibility(progress);

      story.nodes.forEach(({mesh, radius, opacity, phase, focal}) => {
        const emphasis = Math.max(0, 1 - Math.abs(progress - phase) / .13);
        const base = focal ? opacity + smoothstep(progress, .38, .47) * .18 : opacity;
        mesh.material.opacity = Math.min(1, base + emphasis * (focal ? .78 : .42)) * exitFade;
        mesh.scale.setScalar(radius * (1 + emphasis * (focal ? .7 : .32)));
      });
      story.edges.forEach(({mesh, opacity, phase, ambient}) => {
        const emphasis = Math.max(0, 1 - Math.abs(progress - phase) / .16);
        mesh.material.opacity = (opacity * (ambient ? .78 : 1) + emphasis * (ambient ? .22 : .58)) * exitFade;
      });
      s.flightTubes.forEach(tube => { tube.material.opacity = .3 * exitFade; });
      s.flightPackets.forEach(packet => { packet.material.opacity = exitFade; });
      s.group.rotation.y = Math.sin(time * .16) * .018 * (1 - smoothstep(progress, 0, .16));
    } else {
      s.camera.position.set(s.group.position.x, 0, 12);
      s.camera.lookAt(s.group.position);
      s.group.rotation.y = paused ? 0 : Math.sin(time * .18) * .018;
      if (s.story) {
        s.story.nodes.forEach(({mesh, radius, opacity}) => {
          mesh.material.opacity = opacity;
          mesh.scale.setScalar(radius);
        });
        s.story.edges.forEach(({mesh, opacity}) => { mesh.material.opacity = opacity; });
        s.flightTubes.forEach(tube => { tube.material.opacity = .3; });
        s.flightPackets.forEach(packet => { packet.material.opacity = 1; });
      }
      if (storyCopy) {
        storyCopy.style.opacity = '1';
        storyCopy.inert = false;
      }
    }
  }
  if (s.kind === 'map') {
    if (!paused && !preference.matches) s.scrollProgress += (s.scrollTarget - s.scrollProgress) * .14;
    const entrance = smoothstep(s.scrollProgress, .03, .62);
    s.group.position.y = (1 - entrance) * 16;
    s.group.scale.setScalar(.985 + entrance * .015);
    s.group.rotation.y = -.16 + (paused || preference.matches ? 0 : Math.sin(time * .22) * .04 + s.pointer.x * .12) - (1 - entrance) * .025;
    s.group.rotation.x = -.5 + (paused || preference.matches ? 0 : s.pointer.y * .09) + (1 - entrance) * .02;
  } else if (s.kind === 'icon' || s.kind === 'rail' || s.kind === 'process') {
    if (!paused && !preference.matches) s.scrollProgress += (s.scrollTarget - s.scrollProgress) * .14;
    const entrance = smoothstep(s.scrollProgress, .03, .62);
    const lift = s.kind === 'icon' ? .16 : 12;
    s.group.position.y = (1 - entrance) * lift;
    s.group.scale.setScalar(.96 + entrance * .04);
    if (s.kind === 'icon') s.group.rotation.y = paused || preference.matches ? 0 : Math.sin(time * .5) * .3;
  }
  s.packets.forEach(({curve, packet, offset, speed}) => packet.position.copy(curve.getPoint((time * speed + offset) % 1)));
  s.group.updateMatrixWorld(true);
  s.labels.forEach(({el, position}) => {
    const projected = position.clone().applyMatrix4(s.group.matrixWorld).project(s.camera);
    el.style.left = `${(projected.x + 1) * 50}%`;
    el.style.top = `${(1 - projected.y) * 50}%`;
  });
  s.renderer.render(s.scene, s.camera);
}

function tick(now) {
  frame = 0;
  if (paused || document.hidden || !scenes.some(s => s.visible)) return;
  elapsed += previous ? Math.min((now - previous) / 1000, .05) : 0;
  previous = now;
  scenes.filter(s => s.visible).forEach(s => draw(s, elapsed));
  frame = requestAnimationFrame(tick);
}

function resume() {
  if (!frame && !paused && !document.hidden) {
    previous = 0;
    frame = requestAnimationFrame(tick);
  }
}

function setPaused(value) {
  paused = value;
  toggle.textContent = paused ? 'Play animations' : 'Pause animations';
  toggle.setAttribute('aria-pressed', String(paused));
  document.documentElement.classList.toggle('animations-paused', paused);
  setStoryMotionEnabled(!paused);
  document.dispatchEvent(new CustomEvent('network-motion', {detail: {paused}}));
  if (paused) {
    cancelAnimationFrame(frame);
    frame = 0;
    scenes.filter(s => s.visible).forEach(s => draw(s, elapsed));
  } else resume();
}

toggle.addEventListener('click', () => setPaused(!paused));
preference.addEventListener('change', event => setPaused(event.matches));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(frame);
    frame = 0;
  } else resume();
});
window.addEventListener('scroll', updateScrollProgress, {passive: true});
window.addEventListener('resize', updateScrollProgress, {passive: true});

const targets = [['.hero-route', 'hero'], ['.vision-map', 'map'], ['.system-rail', 'rail'], ['.process-track', 'process']];
document.querySelectorAll('.service-card').forEach(card => {
  if (/^(Workflow Systems|Automation & Integration)$/.test(card.querySelector('h3').textContent)) {
    const host = document.createElement('div');
    host.className = 'network-icon';
    host.setAttribute('aria-hidden', 'true');
    const svg = card.querySelector('svg');
    svg.before(host);
    host.append(svg);
    targets.push([host, 'icon']);
  }
});

const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  const host = entry.target;
  let s = scenes.find(item => item.host === host);
  if (!s && entry.isIntersecting) {
    try {
      s = makeScene(host, host.dataset.scene);
      if (s.kind === 'map') buildMap(s);
      if (s.kind === 'hero') buildHero(s);
      if (s.kind === 'icon') buildIcon(s);
      resize(s);
      scenes.push(s);
      updateSceneViewport(s);
      host.classList.add('three-ready');
      host.dataset.rendered = 'threejs';
      new ResizeObserver(() => resize(s)).observe(host);
      toggle.hidden = false;
      if (s.kind === 'hero') {
        storyReady = true;
        setStoryMotionEnabled(true);
      }
      document.dispatchEvent(new CustomEvent('network-3d-ready'));
    } catch (error) {
      console.error('Three.js scene could not be initialized.', error);
      host.querySelectorAll('.network-canvas,.scene-label').forEach(el => el.remove());
      host.classList.remove('three-ready');
      host.dataset.rendered = 'fallback';
      if (host.dataset.scene === 'hero') {
        storyReady = false;
        setStoryMotionEnabled(false);
      }
      observer.unobserve(host);
      return;
    }
  }
  if (s) {
    s.visible = entry.isIntersecting && !host.classList.contains('three-lost');
    if (s.visible) draw(s, elapsed);
    resume();
  }
}), {rootMargin: '120px'});

targets.forEach(([selector, kind]) => {
  const host = typeof selector === 'string' ? document.querySelector(selector) : selector;
  if (host) {
    host.dataset.scene = kind;
    observer.observe(host);
  }
});

setPaused(paused);
