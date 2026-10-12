// 3D-схема шага «Схема» на Three.js: сцены и места камер — в scenes.js.
// Режим 3D — сцену можно вращать; 2D — та же сцена строго сверху (план), вращение выключено.
// Отдаёт window.Scheme3D: draw(…) для страницы и snapshot(…) для PDF.
// Стиль «реалистичный»: скруглённые края, фактуры по цвету (SC_ROLE в scenes.js), гладкие деревья,
// люди и машины — модели из простых форм (spec.extras), зона обзора — полупрозрачный объём от объектива до пола.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// мир (x, y, z-вверх) → three (x, z, y): вид совпадает с изометрией из черновика и с планом сверху
const V = (x, y, z = 0) => new THREE.Vector3(x, z, y);
const mat = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0, ...o });

// ---------- фактуры: серые картинки, умножаются на цвет материала ----------
const TEX = {};
function texture(kind) {
  if (TEX[kind]) return TEX[kind];
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const x = cv.getContext('2d');
  x.fillStyle = '#fff';
  x.fillRect(0, 0, 256, 256);
  const noise = (n, a, sz = 1) => { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * a})`; x.fillRect(Math.random() * 256, Math.random() * 256, sz, sz); } };
  const line = (x0, y0, x1, y1, a, w = 1) => { x.strokeStyle = `rgba(0,0,0,${a})`; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); };
  if (kind === 'grain' || kind === 'planks') {
    for (let i = 0; i < 90; i++) { x.strokeStyle = `rgba(0,0,0,${0.04 + Math.random() * 0.08})`; x.lineWidth = 0.5 + Math.random() * 1.5; x.beginPath(); const y0 = Math.random() * 256; x.moveTo(0, y0); x.bezierCurveTo(80, y0 + Math.random() * 8 - 4, 170, y0 + Math.random() * 8 - 4, 256, y0); x.stroke(); }
    if (kind === 'planks') for (let i = 0; i <= 4; i++) { line(0, i * 64, 256, i * 64, 0.35, 2); for (let k = 0; k < 2; k++) { const px = (i * 97 + k * 131) % 256; line(px, i * 64, px, i * 64 + 64, 0.25, 1.5); } } // доски по 0,5 м со стыками
  }
  if (kind === 'grass') { noise(9000, 0.12, 2); for (let i = 0; i < 700; i++) { const px = Math.random() * 256, py = Math.random() * 256; line(px, py, px + Math.random() * 2 - 1, py - 3 - Math.random() * 3, 0.12); } }
  if (kind === 'asphalt') noise(10000, 0.18, 2);
  if (kind === 'stone') { noise(4000, 0.06); for (let r = 0; r < 4; r++) { line(0, r * 64, 256, r * 64, 0.2, 1.5); for (let c = 0; c <= 2; c++) line(c * 128 + (r % 2) * 64, r * 64, c * 128 + (r % 2) * 64, r * 64 + 64, 0.2, 1.5); } }
  if (kind === 'tile') { noise(2500, 0.04); for (let i = 0; i <= 4; i++) { line(0, i * 64, 256, i * 64, 0.14, 1.5); line(i * 64, 0, i * 64, 256, 0.14, 1.5); } }
  if (kind === 'fabric') noise(12000, 0.1);
  if (kind === 'plaster') noise(4000, 0.05);
  if (kind === 'roof') { noise(3000, 0.08); for (let i = 0; i <= 8; i++) line(0, i * 32, 256, i * 32, 0.25, 2); }
  if (kind === 'soil') noise(9000, 0.2, 2);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return (TEX[kind] = t);
}
const TILE = { grass: 3, asphalt: 3, stone: 2, planks: 2, tile: 2.4, grain: 1.2, fabric: 1, plaster: 2, roof: 1.5, soil: 2 }; // метров на один повтор фактуры
const ROUGH = { grass: 1, asphalt: 0.95, stone: 0.9, planks: 0.55, tile: 0.4, grain: 0.55, fabric: 0.95, plaster: 0.9, roof: 0.85, soil: 1 };
const ROLE = {}; // цвет → фактура
for (const [kind, keys] of Object.entries(SC_ROLE)) for (const k of keys) ROLE[SC[k].toUpperCase()] = kind;
const texRep = {};
function texFor(kind, rx, ry) {
  const key = `${kind}|${rx.toFixed(1)}|${ry.toFixed(1)}`;
  if (!texRep[key]) { const t = texture(kind).clone(); t.repeat.set(rx, ry); t.needsUpdate = true; texRep[key] = t; }
  return texRep[key];
}
// материал по цвету: с фактурой, если она у этого цвета есть; w × h — размер поверхности в метрах
function matFor(fill, w, h, plane) {
  let kind = ROLE[String(fill).toUpperCase()];
  if (!kind) return mat(fill);
  if (kind === 'wood') kind = plane ? 'planks' : 'grain';
  return mat(fill, { map: texFor(kind, Math.max(1, w / TILE[kind]), Math.max(1, h / TILE[kind])), roughness: ROUGH[kind] });
}

function box(b) {
  const g = new THREE.Group();
  const z = b.z || 0;
  const r = Math.min(0.06, Math.min(b.w, b.h, b.d) * 0.25); // скруглённые края
  const geo = r > 0.004 ? new RoundedBoxGeometry(b.w, b.h, b.d, 2, r) : new THREE.BoxGeometry(b.w, b.h, b.d);
  const m = new THREE.Mesh(geo, matFor(b.fill, Math.max(b.w, b.d), b.h, false));
  m.position.copy(V(b.x + b.w / 2, b.y + b.d / 2, z + b.h / 2));
  m.castShadow = m.receiveShadow = true;
  g.add(m);
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
  // крона: гладкий шар и три поменьше вокруг
  const geo = new THREE.IcosahedronGeometry(t.r, 3), m = mat(SC.crown, { map: texture('fabric'), roughness: 1 });
  const cr = new THREE.Mesh(geo, m);
  cr.position.copy(V(t.x, t.y, t.h * 0.68));
  cr.castShadow = true;
  for (const [dx, dy, dz, k] of [[0.55, -0.2, 0.25, 0.62], [-0.5, -0.25, -0.3, 0.58], [0.1, 0.35, -0.45, 0.5]]) {
    const b = new THREE.Mesh(geo, m);
    b.position.set(dx * t.r, dy * t.r, dz * t.r);
    b.scale.setScalar(k);
    b.castShadow = true;
    cr.add(b);
  }
  g.add(cr);
  return g;
}

// ---------- человек из простых форм, рост ~1.75 м; walk — шаг, box — несёт коробку ----------
function human({ skin, top, pants, shoes, hair, walk = 0, box = false, mannequin = false }) {
  const g = new THREE.Group();
  const add = (geo, m, x, y, z) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); g.add(o); return o; };
  const mSkin = mat(skin, { roughness: mannequin ? 0.35 : 0.6 }), mTop = mat(top, { roughness: 0.9 }), mPants = mat(pants), mShoes = mat(shoes, { roughness: 0.5 });
  const lathe = (pts) => new THREE.LatheGeometry(pts.map(([a, b]) => new THREE.Vector2(a, b)), 20);
  add(lathe([[0, 0.9], [0.15, 0.92], [0.165, 1.0], [0.145, 1.12], [0.175, 1.3], [0.19, 1.4], [0.13, 1.47], [0.05, 1.5], [0, 1.5]]), mTop, 0, 0, 0).scale.set(1, 1, 0.62); // грудь — талия — плечи
  add(lathe([[0, 0.86], [0.155, 0.88], [0.165, 0.98], [0.15, 1.04], [0, 1.04]]), mPants, 0, 0, 0).scale.set(1, 1, 0.66);
  add(new THREE.CylinderGeometry(0.045, 0.05, 0.1, 10), mSkin, 0, 1.53, 0);
  add(new THREE.SphereGeometry(0.105, 20, 14), mSkin, 0, 1.66, 0).scale.set(0.9, 1.12, 1);
  if (hair) add(new THREE.SphereGeometry(0.11, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(hair, { roughness: 0.95 }), 0, 1.68, -0.008).scale.set(0.93, 1.12, 1.03);
  for (const s of [1, -1]) {
    const sw = walk * s;
    const leg = new THREE.Group(); leg.position.set(0.085 * s, 0.9, 0); leg.rotation.x = -sw * 0.35; g.add(leg);
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.3, 4, 10), mPants); th.position.y = -0.2; leg.add(th);
    const knee = new THREE.Group(); knee.position.y = -0.42; knee.rotation.x = Math.max(0, sw) * 0.25; leg.add(knee);
    const sh = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.32, 4, 10), mPants); sh.position.y = -0.2; knee.add(sh);
    const shoe = new THREE.Mesh(new RoundedBoxGeometry(0.1, 0.08, 0.26, 2, 0.035), mShoes); shoe.position.set(0, -0.42, 0.05); knee.add(shoe);
    const arm = new THREE.Group(); arm.position.set(0.2 * s, 1.43, 0); arm.rotation.set(box ? -0.9 : sw * 0.4, 0, 0.1 * s); g.add(arm);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.24, 4, 10), mTop); up.position.y = -0.16; arm.add(up);
    const el = new THREE.Group(); el.position.y = -0.31; el.rotation.x = box ? -0.6 : -0.15; arm.add(el);
    const fo = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.22, 4, 10), box ? mSkin : mTop); fo.position.y = -0.14; el.add(fo);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mSkin); hand.position.y = -0.3; hand.scale.set(0.8, 1.2, 0.6); el.add(hand);
  }
  if (box) add(new RoundedBoxGeometry(0.42, 0.3, 0.32, 2, 0.02), mat('#C49A6C', { roughness: 0.95 }), 0, 1.12, 0.36);
  return g;
}
// курьер — первый человек во дворе (у ворот, у входа); остальные — в одежде, каждый третий — манекен
const PEOPLE = [
  () => human({ skin: '#D9A882', top: '#E36B2C', pants: '#3A3F48', shoes: '#2B2B2B', hair: '#1E1A17', walk: 1, box: true }),
  (shirt) => human({ skin: '#E2B896', top: shirt, pants: '#2F3A4F', shoes: '#F2F2F2', hair: '#3B2A20' }),
  () => human({ skin: '#E6E3DE', top: '#E6E3DE', pants: '#E6E3DE', shoes: '#D5D1CB', mannequin: true }),
];

// ---------- легковая машина: профиль сбоку (длина по z, высота по y), вытянут по ширине со скруглёнными краями ----------
function car({ color, len = 4.5, wid = 1.8, prof, cabin, rails = false }) {
  const g = new THREE.Group();
  const paint = mat(color, { roughness: 0.28, metalness: 0.35 }), glass = mat('#1C2A3A', { roughness: 0.1, metalness: 0.6 }), dark = mat('#24272D', { roughness: 0.7 });
  const end = (p) => p.slice(-2);
  const extrude = (pts, w, m, bev) => {
    const sh = new THREE.Shape();
    sh.moveTo(...pts[0]);
    for (const p of pts.slice(1)) p.length === 2 ? sh.lineTo(...p) : sh.quadraticCurveTo(...p);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: w - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 10 });
    geo.translate(0, 0, -(w - 2 * bev) / 2);
    const o = new THREE.Mesh(geo, m); o.rotation.y = -Math.PI / 2; g.add(o);
  };
  extrude(prof, wid, paint, 0.1);
  extrude(cabin, wid - 0.16, glass, 0.06);
  const [c1, c2] = [end(cabin[1]), end(cabin[2])], top = Math.max(c1[1], c2[1]), rz = (c1[0] + c2[0]) / 2, rl = c1[0] - c2[0];
  const roof = new THREE.Mesh(new RoundedBoxGeometry(wid - 0.18, 0.06, rl + 0.1, 2, 0.03), paint); roof.position.set(0, top + 0.03, rz); g.add(roof);
  for (const sd of [-1, 1]) { const bp = new THREE.Mesh(new THREE.BoxGeometry(0.03, top - cabin[0][1], 0.1), paint); bp.position.set(sd * (wid / 2 - 0.08), (top + cabin[0][1]) / 2, rz + 0.1); g.add(bp); }
  if (rails) for (const sd of [-1, 1]) { const r = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.05, rl * 0.85, 2, 0.02), dark); r.position.set(sd * (wid / 2 - 0.15), top + 0.09, rz); g.add(r); }
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const w = new THREE.Group(); w.position.set(sx * (wid / 2 - 0.08), 0.34, sz * (len / 2 - 0.85)); w.rotation.z = Math.PI / 2; g.add(w);
    w.add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 20), mat('#1B1C1F', { roughness: 0.9 })));
    w.add(new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.25, 16), mat('#C9CED6', { roughness: 0.25, metalness: 0.8 })));
  }
  for (const sd of [-1, 1]) {
    const hl = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.12, 0.08, 2, 0.04), mat('#F4F7FB', { emissive: '#FFF6DA', emissiveIntensity: 0.4, roughness: 0.2 })); hl.position.set(sd * (wid / 2 - 0.35), end(prof[2])[1] - 0.12, len / 2 + 0.02); g.add(hl);
    const tl = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.1, 0.06, 2, 0.03), mat('#B3262B', { emissive: '#7A1014', emissiveIntensity: 0.4, roughness: 0.3 })); tl.position.set(sd * (wid / 2 - 0.3), end(prof[prof.length - 3])[1] - 0.12, -len / 2 - 0.02); g.add(tl);
    const mr = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.1, 0.1, 2, 0.03), paint); mr.position.set(sd * (wid / 2 + 0.05), cabin[0][1] + 0.05, cabin[0][0] - 0.15); g.add(mr);
  }
  for (const zz of [len / 2 + 0.03, -len / 2 - 0.03]) { const b = new THREE.Mesh(new RoundedBoxGeometry(wid + 0.02, 0.14, 0.1, 2, 0.04), dark); b.position.set(0, 0.32, zz); g.add(b); }
  return g;
}
// седан, кроссовер, купе — по очереди; точки [x, y] — прямая, [cx, cy, x, y] — изгиб
const CARS = [
  { prof: [[2.25, 0.28], [2.3, 0.55], [2.3, 0.74, 2.0, 0.78], [1.5, 0.84, 0.95, 0.86], [-1.6, 0.9], [-2.05, 0.92, -2.22, 0.82], [-2.32, 0.76, -2.3, 0.5], [-2.25, 0.28]],
    cabin: [[0.95, 0.86], [0.55, 1.25, 0.0, 1.36], [-0.45, 1.42, -0.9, 1.38], [-1.45, 1.28, -1.6, 0.9]] },
  { len: 4.4, wid: 1.85, rails: true, prof: [[2.2, 0.34], [2.25, 0.7], [2.25, 0.92, 1.9, 0.98], [1.4, 1.02, 1.0, 1.05], [-2.0, 1.08], [-2.22, 1.08, -2.22, 0.9], [-2.2, 0.34]],
    cabin: [[1.0, 1.05], [0.55, 1.5, 0.2, 1.62], [-0.8, 1.68, -1.85, 1.64], [-2.02, 1.5, -2.0, 1.08]] },
  { wid: 1.85, prof: [[2.3, 0.25], [2.35, 0.5], [2.35, 0.66, 2.0, 0.7], [1.4, 0.76, 0.6, 0.8], [-1.8, 0.84], [-2.25, 0.86, -2.3, 0.7], [-2.35, 0.55, -2.3, 0.4], [-2.25, 0.25]],
    cabin: [[0.6, 0.8], [0.1, 1.12, -0.5, 1.18], [-1.0, 1.2, -1.4, 1.14], [-1.75, 1.0, -1.8, 0.84]] },
];

// люди и машины сцены: места — spec.extras (scenes.js)
function extras(spec) {
  const g = new THREE.Group();
  let ci = 0, pi = 0;
  const outdoor = (spec.ground || []).some((gr) => ROLE[String(gr.fill).toUpperCase()] === 'grass' || ROLE[String(gr.fill).toUpperCase()] === 'asphalt');
  for (const e of spec.extras || []) {
    let o;
    if (e.kind === 'car') {
      o = car({ color: e.color, ...CARS[ci++ % CARS.length] });
      o.position.copy(V(e.axis === 'y' ? e.x + 0.9 : e.x + 2.1, e.axis === 'y' ? e.y + 2.1 : e.y + 0.9, 0.02));
      if (e.axis === 'x') o.rotation.y = Math.PI / 2;
    } else {
      o = PEOPLE[outdoor && pi === 0 ? 0 : pi % 3 === 2 ? 2 : 1](e.shirt);
      o.position.copy(V(e.x, e.y, 0));
      o.rotation.y = 0.5 + pi * 1.3;
      o.scale.setScalar(e.k || 1);
      pi++;
    }
    o.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
    g.add(o);
  }
  return g;
}

// одна сцена = один WebGL-холст; холсты живут всё время, при перерисовке шага их просто переносят в новый блок
class Stage {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // мягкий «фото»-свет для фактур
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.ov = Object.assign(document.createElement('div'), { className: 'sch__ov' });
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xC9D6EE, 1.6));
    this.sun = new THREE.DirectionalLight(0xffffff, 1.7);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.radius = 4;
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
      const m = new THREE.Mesh(new THREE.PlaneGeometry(c - a, d - b), matFor(g.fill, c - a, d - b, true));
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
    this.group.add(extras(spec));

    const cams = placeCams(spec.cams, n), sz = sizeFor(n);
    const zoneMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x1E6BE0, transparent: true, opacity: 0.55 });
    cams.forEach((c, i) => {
      const ray = coneRays(c, spec.cams, n);
      // зона обзора — объём: пятно на полу (у камеры ярче) и полупрозрачная пирамида от объектива до края пятна
      const eye = V(c.x, c.y, c.z), foot = V(c.x, c.y, 0.06), far = Math.max(...ray.map(([x, y]) => Math.hypot(x - c.x, y - c.y))) || 1;
      const pos = [], alpha = [];
      const tri = (p, q, r, a, b, d) => { pos.push(p, q, r); alpha.push(a, b, d); };
      const fa = ([x, y]) => 0.3 - 0.2 * Math.hypot(x - c.x, y - c.y) / far;
      for (let k = 0; k < ray.length - 1; k++) {
        const p = V(ray[k][0], ray[k][1], 0.06), q = V(ray[k + 1][0], ray[k + 1][1], 0.06);
        tri(foot, p, q, 0.3, fa(ray[k]), fa(ray[k + 1]));
        tri(eye, p, q, 0.32, 0.03, 0.03);
      }
      const r0 = V(ray[0][0], ray[0][1], 0.06), r1 = V(ray[ray.length - 1][0], ray[ray.length - 1][1], 0.06);
      tri(eye, foot, r0, 0.25, 0.08, 0.03);
      tri(eye, foot, r1, 0.25, 0.08, 0.03);
      const zone = mesh(pos, zoneMat);
      zone.geometry.setAttribute('color', new THREE.Float32BufferAttribute(alpha.flatMap((a) => [0.118, 0.42, 0.878, a]), 4));
      this.group.add(zone);
      for (const f of [r0, r1]) this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([eye, f]), edgeMat));
      // камера: корпус + объектив, смотрит по направлению и чуть вниз
      const body = new THREE.Group();
      const s = 0.55 + 0.45 * sz;
      const hull = new THREE.Mesh(new RoundedBoxGeometry(0.22 * s, 0.22 * s, 0.6 * s, 2, 0.066 * s), mat('#FFFFFF', { roughness: 0.4 }));
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
