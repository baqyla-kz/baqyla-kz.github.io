// 3D-схема шага «Схема» на Three.js: сцены и места камер — в scenes.js.
// Режим 3D — сцену можно вращать; 2D — та же сцена строго сверху (план), вращение выключено.
// Отдаёт window.Scheme3D: draw(…) для страницы и snapshot(…) для PDF.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// мир (x, y, z-вверх) → three (x, z, y): вид совпадает с изометрией из черновика и с планом сверху
const V = (x, y, z = 0) => new THREE.Vector3(x, z, y);
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });

function box(b) {
  const g = new THREE.Group();
  const z = b.z || 0;
  const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat(b.fill));
  m.position.copy(V(b.x + b.w / 2, b.y + b.d / 2, z + b.h / 2));
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x0A2463, transparent: true, opacity: 0.18 }));
  edges.position.copy(m.position);
  g.add(edges);
  for (const dc of b.decals || []) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(dc.u1 - dc.u0, dc.v1 - dc.v0), mat(dc.fill, { roughness: 0.4 }));
    const v = z + (dc.v0 + dc.v1) / 2, u = (dc.u0 + dc.u1) / 2;
    if (dc.face === '+y') p.position.copy(V(b.x + u, b.y + b.d + 0.02, v));
    else { p.position.copy(V(b.x + b.w + 0.02, b.y + u, v)); p.rotation.y = Math.PI / 2; }
    g.add(p);
  }
  if (b.roof) g.add(roof(b));
  return g;
}

function roof(b) {
  const { x, y, w, d } = b, t = (b.z || 0) + b.h, r = b.roof, o = r.o, R = t + r.h;
  let q; // 4 карниза + 2 точки конька
  if (r.axis === 'x') { const m = y + d / 2; q = [V(x - o, y - o, t), V(x + w + o, y - o, t), V(x + w + o, y + d + o, t), V(x - o, y + d + o, t), V(x - o, m, R), V(x + w + o, m, R)]; }
  else { const m = x + w / 2; q = [V(x - o, y - o, t), V(x - o, y + d + o, t), V(x + w + o, y + d + o, t), V(x + w + o, y - o, t), V(m, y - o, R), V(m, y + d + o, R)]; }
  const tri = r.axis === 'x' ? [[0, 1, 5], [0, 5, 4], [3, 4, 5], [3, 5, 2]] : [[0, 4, 5], [0, 5, 1], [3, 2, 5], [3, 5, 4]];
  const g = new THREE.Group();
  const slopes = mesh(tri.flatMap((f) => f.map((i) => q[i])), mat(r.fill, { side: THREE.DoubleSide, flatShading: true }));
  slopes.castShadow = true;
  g.add(slopes);
  const gab = r.axis === 'x'
    ? [V(x, y, t), V(x, y + d, t), V(x, y + d / 2, R), V(x + w, y, t), V(x + w, y + d, t), V(x + w, y + d / 2, R)]
    : [V(x, y, t), V(x + w, y, t), V(x + w / 2, y, R), V(x, y + d, t), V(x + w, y + d, t), V(x + w / 2, y + d, R)];
  g.add(mesh(gab, mat(b.fill, { side: THREE.DoubleSide })));
  return g;
}

function mesh(points, material) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points.flatMap((p) => [p.x, p.y, p.z]), 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

function tree(t) {
  const g = new THREE.Group();
  if (t.pot) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.5, 16), mat('#C9B79C'));
    p.position.copy(V(t.x, t.y, 0.25));
    g.add(p);
  } else {
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(t.r * 0.1, t.r * 0.12, t.h * 0.6, 8), mat(SC.trunk));
    tr.position.copy(V(t.x, t.y, t.h * 0.3));
    tr.castShadow = true;
    g.add(tr);
  }
  const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(t.r, 1), mat(SC.crown, { flatShading: true }));
  cr.position.copy(V(t.x, t.y, t.h * 0.68));
  cr.castShadow = true;
  g.add(cr);
  return g;
}

// одна сцена = один WebGL-холст; холсты живут всё время, при перерисовке шага их просто переносят в новый блок
class Stage {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.ov = Object.assign(document.createElement('div'), { className: 'sch__ov' });
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xC9D6EE, 1.6));
    this.sun = new THREE.DirectionalLight(0xffffff, 1.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun, this.sun.target);
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 500);
    // обычное колесо мыши листает страницу, а не схему; приближает щипок (тачпад/телефон), Ctrl/⌘ + колесо и кнопки «+ −»
    this.renderer.domElement.addEventListener('wheel', (e) => { if (!e.ctrlKey && !e.metaKey) e.stopImmediatePropagation(); });
    this.controls = new OrbitControls(this.cam, this.renderer.domElement);
    Object.assign(this.controls, { enablePan: true, enableZoom: true, zoomToCursor: true, minZoom: 1, maxZoom: 4, enableDamping: true });
    // на телефоне вертикальный свайп листает страницу, горизонтальный — вращает, двумя пальцами — приблизить и сдвинуть
    this.renderer.domElement.style.touchAction = 'pan-y';
    this.zoomUi = Object.assign(document.createElement('div'), { className: 'sch__zoom' });
    this.zoomUi.innerHTML = '<button type="button" data-z="1.4">+</button><button type="button" data-z="0.7">−</button><button type="button" data-z="0">↺</button>';
    this.zoomUi.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (b) this.zoomBy(+b.dataset.z);
    });
    this.controls.addEventListener('change', () => this.render());
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.ro = new ResizeObserver(() => this.fit());
    const loop = () => { requestAnimationFrame(loop); if (this.el && this.controls.update()) this.render(); };
    loop();
  }

  attach(el) {
    if (this.el) this.ro.unobserve(this.el);
    this.el = el;
    // подписи кнопок — на языке страницы (i18n.js)
    ['Приблизить', 'Отдалить', 'Вернуть вид'].forEach((l, i) => this.zoomUi.children[i].setAttribute('aria-label', t(l)));
    el.append(this.renderer.domElement, this.ov, this.zoomUi);
    this.ro.observe(el);
  }

  build(spec, n, startNo, mode) {
    this.key = sceneKey(spec, n, startNo, mode);
    if (spec.build) spec = { ...spec, ...spec.build(n) }; // сцена «Лифт» — по кабине на камеру
    this.group.clear();
    this.ov.innerHTML = '';
    this.marks = [];
    let li = 0;
    for (const g of spec.ground) {
      const [a, b, c, d] = g.r;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(c - a, d - b), mat(g.fill));
      m.rotation.x = -Math.PI / 2;
      m.position.copy(V((a + c) / 2, (b + d) / 2, 0.002 * li++));
      m.receiveShadow = true;
      this.group.add(m);
    }
    for (const l of spec.lines || []) {
      const geo = new THREE.BufferGeometry().setFromPoints(l.pts.map(([x, y, z]) => V(x, y, z + 0.02)));
      const white = l.stroke === '#fff';
      const line = new THREE.Line(geo, l.dash
        ? new THREE.LineDashedMaterial({ color: 0x0A2463, dashSize: 0.25, gapSize: 0.2, transparent: true, opacity: 0.35 })
        : new THREE.LineBasicMaterial({ color: white ? 0xffffff : 0x0A2463, transparent: true, opacity: white ? 1 : 0.08 }));
      if (l.dash) line.computeLineDistances();
      this.group.add(line);
    }
    for (const b of spec.boxes) this.group.add(box(b));
    for (const t of spec.trees || []) this.group.add(tree(t));

    const cams = placeCams(spec.cams, n), sz = sizeFor(n);
    const coneMat = new THREE.MeshBasicMaterial({ color: 0x1E6BE0, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide });
    cams.forEach((c, i) => {
      const ray = coneRays(c, spec.cams, n);
      const fan = [];
      for (let k = 0; k < ray.length - 1; k++) fan.push(V(c.x, c.y, 0.05), V(ray[k][0], ray[k][1], 0.05), V(ray[k + 1][0], ray[k + 1][1], 0.05));
      this.group.add(mesh(fan, coneMat));
      for (const f of [ray[0], ray[ray.length - 1]]) {
        const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(c.x, c.y, c.z), V(f[0], f[1], 0.05)]),
          new THREE.LineDashedMaterial({ color: 0x1E6BE0, dashSize: 0.2, gapSize: 0.15, transparent: true, opacity: 0.6 }));
        ln.computeLineDistances();
        this.group.add(ln);
      }
      // камера: корпус + объектив, смотрит по направлению и чуть вниз
      const body = new THREE.Group();
      const s = 0.55 + 0.45 * sz;
      const hull = new THREE.Mesh(new THREE.BoxGeometry(0.22 * s, 0.22 * s, 0.6 * s), mat('#F4F6FA'));
      hull.castShadow = true;
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.08 * s, 16), mat('#1B2333'));
      lens.position.z = 0.301 * s;
      body.add(hull, lens);
      body.position.copy(V(c.x, c.y, c.z));
      body.lookAt(V(c.x + Math.cos(c.dir) * 3, c.y + Math.sin(c.dir) * 3, c.z - 1.2));
      this.group.add(body);
      this.marks.push({ kind: 'b', text: startNo + i, size: Math.round(18 + 10 * sz), hidden: c.hidden, p: V(c.x, c.y, c.z + 0.35) });
    });
    for (const l of spec.labels || []) this.marks.push({ kind: 'l', text: t(l.t), p: V(l.x, l.y, l.z + 0.1) });
    for (const m of this.marks) {
      m.el = document.createElement('div');
      m.el.className = m.kind === 'b' ? `sch__b${m.hidden && mode === '3d' ? ' is-hid' : ''}` : 'sch__l'; // за домом — бледнее
      m.el.textContent = m.text;
      if (m.size) Object.assign(m.el.style, { width: m.size + 'px', height: m.size + 'px', fontSize: Math.round(m.size * 0.5) + 'px' });
      this.ov.appendChild(m.el);
    }
    if (!n) this.ov.insertAdjacentHTML('beforeend', `<div class="sch__empty">${t('Камер здесь нет')}</div>`);

    // рамка и свет под размер сцены
    const bb = new THREE.Box3().setFromObject(this.group);
    this.center = bb.getCenter(new THREE.Vector3());
    this.radius = bb.getSize(new THREE.Vector3()).length() / 2;
    this.setMode(mode);
    this.sun.position.copy(this.center).add(new THREE.Vector3(-0.6, 1.4, 0.9).multiplyScalar(this.radius * 2));
    this.sun.target.position.copy(this.center);
    Object.assign(this.sun.shadow.camera, { left: -this.radius, right: this.radius, top: this.radius, bottom: -this.radius, near: 0.1, far: this.radius * 6 });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.fit();
  }

  setMode(mode) {
    this.mode = mode;
    const top = mode === '2d';
    this.controls.target.copy(this.center);
    this.cam.position.copy(this.center).add(top ? new THREE.Vector3(0, this.radius * 3, 0.001) : new THREE.Vector3(1, 0.95, 1).normalize().multiplyScalar(this.radius * 3));
    this.cam.zoom = +(this.el && this.el.dataset.zoom) || 1; // стартовый масштаб (data-zoom), «↺» возвращает к нему
    this.sun.castShadow = !top; // сверху косые тени только пачкают план
    Object.assign(this.controls, { enableRotate: !top, minPolarAngle: top ? 0 : 0.35, maxPolarAngle: top ? 0.01 : 1.25 });
    // в 2D вращать нечего — левая кнопка мыши двигает план
    this.controls.mouseButtons.LEFT = top ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    // границы сцены в осях камеры — чтобы кадр был по сцене, а не по описанной сфере
    this.cam.lookAt(this.center);
    this.cam.updateMatrixWorld();
    const bb = new THREE.Box3().setFromObject(this.group), inv = this.cam.matrixWorldInverse, c = this.center.clone().applyMatrix4(inv);
    let hx = 0, hy = 0;
    for (let i = 0; i < 8; i++) {
      const v = new THREE.Vector3(i & 1 ? bb.max.x : bb.min.x, i & 2 ? bb.max.y : bb.min.y, i & 4 ? bb.max.z : bb.min.z).applyMatrix4(inv);
      hx = Math.max(hx, Math.abs(v.x - c.x)); hy = Math.max(hy, Math.abs(v.y - c.y));
    }
    this.half = { x: hx, y: hy };
  }

  // кнопки: f > 1 — ближе, f < 1 — дальше, 0 — исходный вид; отдалили до упора — схема снова по центру
  zoomBy(f) {
    if (!f) this.setMode(this.mode);
    else {
      this.cam.zoom = Math.min(this.controls.maxZoom, Math.max(1, this.cam.zoom * f));
      if (this.cam.zoom === 1) this.controls.target.copy(this.center);
    }
    this.cam.updateProjectionMatrix();
    this.controls.update();
    this.render();
  }

  // кадр по границам сцены + поля: сверху место под номера камер (~34 px), по краям ~4 %
  frame(w, h) {
    const a = w / h;
    const m = +(this.el && this.el.dataset.fit) || 1.04; // поля вокруг сцены; data-fit < 1 — ближе, пустые углы сцены срезаются
    let hy = this.half.y * m, hx = this.half.x * m;
    hy += (hy * 2) * (34 / h); // запас сверху под кружки номеров
    if (hx / hy > a) hy = hx / a; else hx = hy * a;
    Object.assign(this.cam, { left: -hx, right: hx, top: hy, bottom: -hy });
    this.cam.updateProjectionMatrix();
  }

  fit() {
    if (!this.el || !this.center) return;
    const w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.frame(w, h);
    this.controls.update();
    this.render();
  }

  render() {
    this.renderer.render(this.scene, this.cam);
    const w = this.el.clientWidth, h = this.el.clientHeight;
    const z = this.zoomUi.offsetWidth ? [w - this.zoomUi.offsetWidth - 8, h - this.zoomUi.offsetHeight - 8, w, h] : null;
    const taken = z ? [z] : []; // подписи не прячутся под кнопками «+ − ↺»
    for (const m of this.marks || []) { // номера камер идут первыми — подписи уступают им место
      const v = m.p.clone().project(this.cam);
      const x = ((v.x + 1) / 2) * w, y = ((1 - v.y) / 2) * h;
      m.el.style.left = x + 'px';
      m.el.style.top = y + 'px';
      // подпись, налезающая на номер или другую подпись, прячется (на узком экране их много рядом)
      const bw = m.el.offsetWidth, bh = m.el.offsetHeight;
      const r = m.kind === 'b' ? [x - bw / 2, y - bh, x + bw / 2, y] : [x - bw / 2, y - bh / 2, x + bw / 2, y + bh / 2];
      const hit = m.kind === 'l' && taken.some((t) => r[0] < t[2] && r[2] > t[0] && r[1] < t[3] && r[3] > t[1]);
      m.el.style.visibility = hit ? 'hidden' : '';
      if (!hit) taken.push(r);
    }
  }

  // кадр для PDF: картинка нужного размера + где стоят номера и подписи (в пикселях этой картинки)
  snapshot(w, h, mode) {
    const was = { mode: this.mode, pos: this.cam.position.clone(), target: this.controls.target.clone(), zoom: this.cam.zoom, ratio: this.renderer.getPixelRatio() };
    this.setMode(mode);
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(w, h, false);
    this.frame(w, h);
    this.cam.lookAt(this.center);
    this.cam.updateMatrixWorld();
    this.renderer.render(this.scene, this.cam);
    const url = this.renderer.domElement.toDataURL('image/png');
    const marks = this.marks.map((m) => {
      const v = m.p.clone().project(this.cam);
      return { kind: m.kind, text: m.text, size: m.size, hid: m.hidden && mode === '3d', x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h };
    });
    this.setMode(was.mode);
    this.cam.position.copy(was.pos);
    this.controls.target.copy(was.target);
    this.cam.zoom = was.zoom;
    this.renderer.setPixelRatio(was.ratio);
    this.fit();
    return { url, marks };
  }
}

const stages = { out: null, in: null, lift: null };
// сцена пересобирается, если поменялись камеры, вид или язык подписей
const sceneKey = (spec, n, startNo, mode) => [spec.title, n, startNo, mode, I18N.lang].join('|');
const get = (k) => (stages[k] ||= new Stage());

window.Scheme3D = {
  stage: get, // сцена по ключу — для черновиков (drafts/scheme-hint.html: камера, OrbitControls)
  // spec — SCENES[plan].out / .in / .lift; одна и та же сцена не пересобирается при каждом рендере шага
  draw(k, el, spec, n, startNo, mode) {
    const s = get(k);
    s.attach(el);
    if (s.key !== sceneKey(spec, n, startNo, mode)) s.build(spec, n, startNo, mode);
    else s.fit();
  },
  snapshot(k, spec, n, startNo, mode, w, h) {
    const s = get(k);
    if (!s.el) s.attach(document.createElement('div'));
    if (!s.key || ![sceneKey(spec, n, startNo, '2d'), sceneKey(spec, n, startNo, '3d')].includes(s.key)) s.build(spec, n, startNo, mode);
    return s.snapshot(w, h, mode);
  },
};
dispatchEvent(new Event('scheme3d-ready'));
