// Сцены 3D-схемы (шаг «Схема», PDF, «Комплекты»): дом, ЖК, коммерция — снаружи и внутри,
// и заготовленные места камер. Рисует assets/scheme3d.js (Three.js) в «реалистичном» стиле:
// скруглённые объекты, фактуры, люди и машины — отдельными моделями (spec.extras).
// Прежние сцены и варианты стиля — drafts/scheme-v1/ и *-variants.html (локально).
// Мир в метрах: x — вправо-вниз, y — влево-вниз (на экране), z — вверх.

const SCHEME_MAX = 16; // как PRICE.maxPerZone

// ---------- места камер ----------
// Прямоугольник (стены дома / комнаты), 16 мест по порядку: углы → середины стен → четверти.
// Чем больше камер, тем больше мест занято — камеры ближе друг к другу.
const SIDES = {
  front: { a: (r) => [r[0], r[3]], b: (r) => [r[2], r[3]], n: [0, 1] },
  right: { a: (r) => [r[2], r[3]], b: (r) => [r[2], r[1]], n: [1, 0] },
  back: { a: (r) => [r[2], r[1]], b: (r) => [r[0], r[1]], n: [0, -1] },
  left: { a: (r) => [r[0], r[1]], b: (r) => [r[0], r[3]], n: [-1, 0] },
};
const SIDE_ORDER = ['front', 'right', 'back', 'left'];
const CORNER = { D: ['left', 1], C: ['front', 1], B: ['right', 1], A: ['back', 1] }; // угол = конец стороны
const quarters = (sides) => sides.flatMap((s) => [[s, 0.25], [s, 0.75]]);
const ORDER_OUT = [CORNER.D, CORNER.C, CORNER.B, CORNER.A, ['front', 0.5], ['right', 0.5], ['back', 0.5], ['left', 0.5], ...quarters(['front', 'right', 'back', 'left'])];
const ORDER_IN = [CORNER.A, CORNER.B, CORNER.D, CORNER.C, ['back', 0.5], ['left', 0.5], ['right', 0.5], ['front', 0.5], ...quarters(['back', 'left', 'right', 'front'])];

function placeCams(spec, n) {
  if (spec.fixed) return spec.fixed.slice(0, n); // места заданы сценой (кабины лифта)
  const r = spec.rect;
  const order = spec.order || (spec.inward ? ORDER_IN : ORDER_OUT);
  return order.slice(0, n).map(([side, f]) => {
    const S = SIDES[side];
    const [ax, ay] = S.a(r), [bx, by] = S.b(r);
    let [nx, ny] = S.n;
    if (f === 1) { // угол: смотрит по диагонали
      const next = SIDES[SIDE_ORDER[(SIDE_ORDER.indexOf(side) + 1) % 4]].n;
      nx += next[0]; ny += next[1];
      const l = Math.hypot(nx, ny); nx /= l; ny /= l;
    }
    const sgn = spec.inward ? -1 : 1;
    const off = 0.15 * sgn;
    const x = ax + (bx - ax) * f + nx * off, y = ay + (by - ay) * f + ny * off;
    // позиция по периметру — чтобы номера шли по кругу
    const per = SIDE_ORDER.indexOf(side) + f;
    // снаружи камеры на дальних стенах (смотрят от зрителя) — за домом, рисуем бледнее
    return { x, y, z: spec.z, dir: Math.atan2(ny * sgn, nx * sgn), per, hidden: !spec.inward && nx + ny < -0.3 };
  }).sort((p, q) => p.per - q.per);
}

// размер камер и длина зоны обзора: чем больше камер в сцене, тем мельче
const sizeFor = (n) => 1 - 0.45 * Math.max(0, n - 1) / (SCHEME_MAX - 1);

// веер обзора на земле: лучи до края участка/комнаты
function coneRays(cam, spec, n, steps = 14) {
  spec = cam.spec || spec; // у камеры в кабине лифта веер — в пределах своей кабины
  const half = (spec.half || 38) * Math.PI / 180;
  const L = (spec.L || 7) * (1 - 0.35 * Math.max(0, n - 1) / (SCHEME_MAX - 1));
  const [cx0, cy0, cx1, cy1] = spec.clip;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const a = cam.dir - half + (2 * half * i) / steps;
    const dx = Math.cos(a), dy = Math.sin(a);
    let t = L;
    if (dx > 0) t = Math.min(t, (cx1 - cam.x) / dx); else if (dx < 0) t = Math.min(t, (cx0 - cam.x) / dx);
    if (dy > 0) t = Math.min(t, (cy1 - cam.y) / dy); else if (dy < 0) t = Math.min(t, (cy0 - cam.y) / dy);
    t = Math.max(0, t);
    pts.push([cam.x + dx * t, cam.y + dy * t]);
  }
  return pts;
}

// ---------- палитра: «реалистичный» стиль; фактуры по цвету — в scheme3d.js (SC_ROLE) ----------
const SC = {
  lawn: '#A9C98A', lawn2: '#9EC07E', pave: '#D9D5CC', deck: '#B48655', soil: '#8A6A4E', asphalt: '#80878F', road: '#6F767F',
  wall: '#F2EEE8', plinth: '#B5AA9A', roof: '#7C4A3A', brick: '#8E4B3A', glass: '#B7D3EA', door: '#6B4F3A',
  garageDoor: '#D6D2CA', fence: '#CFC8BC', post: '#9C9284', wood: '#B88B5A', wallIn: '#EDE9E3', floor: '#E6E1D8',
  floorWood: '#B48655', floorWood2: '#A97C4E', tile: '#E3E4E6', rug: '#D8CFC2', cabinet: '#F5F3EF', counter: '#8A8F99',
  sofa: '#7D8A99', sofa2: '#8C98A6', blanket: '#C9A27A', bedding: '#FFFFFF', fridge: '#E6E9ED', metal: '#A5AEBB',
  dark: '#2E3645', screen: '#1C2330', lamp: '#F3E3B5', skin: '#E9C3A0', hair: '#3B2A20', pants: '#3E4A5E',
  shirts: ['#E36B4F', '#3F9C6D', '#F2B84B', '#7A5BD6'], cars: ['#B8BEC6', '#2F4A66', '#7A1E1E', '#D9D9D9', '#4E5D52'],
  tyre: '#22272F', carGlass: '#3A4A60', facade: '#EDE6DA', facade2: '#CFC5B5', balcony: '#FFFFFF', canopy: '#7A8699',
  play: '#C98F6A', sand: '#F3E2B8', accent: '#E36B4F', accent2: '#3F9C6D', shopWall: '#F4F1EC', sign: '#2E4E8C',
  signText: '#FFFFFF', awning: ['#2E4E8C', '#FFFFFF'], shelf: '#E1E5EA',
  goods: ['#E36B4F', '#F2B84B', '#3F9C6D', '#5B8FD6', '#E6E1D8', '#B85C9E'], glassCold: '#C7E0F2', bin: '#4E7F5A',
  mat: '#8A93A0', lift: '#AEB7C4', slabOut: '#5E4632', slabIn: '#9A9389', cut: '#3A3F48', crown: '#5F8F4E', trunk: '#6B4B33',
};

// какая фактура у какого цвета: трава, асфальт, плитка, дерево, ткань, штукатурка, кафель, черепица, земля
const SC_ROLE = {
  grass: ['lawn', 'lawn2'], asphalt: ['asphalt', 'road'], stone: ['pave', 'plinth'], wood: ['floorWood', 'floorWood2', 'deck', 'wood'],
  fabric: ['sofa', 'sofa2', 'rug', 'blanket'], plaster: ['wall', 'wallIn', 'facade', 'facade2', 'shopWall'], tile: ['tile', 'floor'], roof: ['roof'], soil: ['slabOut', 'soil'],
};

// сцена = объекты + места людей и машин (EX), которые рисует scheme3d.js
let EX = [];
function scene(title, build) {
  EX = [];
  const s = build(SC);
  return { title, ...s, extras: EX };
}

// ---------- детали из коробок ----------
const B = (x, y, w, d, h, fill, z = 0, o = {}) => ({ x, y, w, d, h, fill, z, ...o });
const dec = (face, u0, u1, v0, v1, fill) => ({ face, u0, u1, v0, v1, fill });

// машина: место (угол x, y; длина 4.2 вдоль axis). Легковую рисует scheme3d.js отдельной моделью;
// грузовик с будкой (van) — из коробок
function car(P, x, y, color, axis = 'y', van = false) {
  if (!van) { EX.push({ kind: 'car', x, y, axis, color }); return []; }
  const L = 5, W = 1.8, ay = axis === 'y';
  const w = ay ? W : L, d = ay ? L : W, out = [];
  const wh = (wx, wy) => out.push(B(wx, wy, ay ? 0.24 : 0.7, ay ? 0.7 : 0.24, 0.62, P.tyre));
  if (ay) { wh(x - 0.04, y + 0.5); wh(x + W - 0.2, y + 0.5); wh(x - 0.04, y + L - 1.2); wh(x + W - 0.2, y + L - 1.2); }
  else { wh(x + 0.5, y - 0.04); wh(x + 0.5, y + W - 0.2); wh(x + L - 1.2, y - 0.04); wh(x + L - 1.2, y + W - 0.2); }
  // кабина спереди, будка сзади
  out.push(B(x, y, w, d, 0.55, color, 0.3));
  out.push(ay ? B(x, y, W, 1.4, 1.0, color, 0.85, { decals: [dec('+x', 0.15, 1.2, 0.35, 0.85, P.carGlass)] })
    : B(x + L - 1.4, y, 1.4, W, 1.0, color, 0.85, { decals: [dec('+x', 0.15, W - 0.15, 0.35, 0.85, P.carGlass), dec('+y', 0.1, 1.2, 0.35, 0.85, P.carGlass)] }));
  out.push(ay ? B(x, y + 1.45, W, L - 1.45, 1.9, P.wall, 0.4) : B(x, y, L - 1.45, W, 1.9, P.wall, 0.4));
  return out;
}

// человек ~1.75 м: место и цвет одежды, модель рисует scheme3d.js; k — масштаб (ребёнок 0.65)
function person(P, x, y, shirt, k = 1) {
  EX.push({ kind: 'person', x, y, shirt, k });
  return [];
}

// диван: back — сторона спинки: 'w' | 'n' | 's' | 'e'
function sofa(P, x, y, w, d, back) {
  const t = 0.25, out = [B(x, y, w, d, 0.42, P.sofa)];
  if (back === 'w') out.push(B(x, y, t, d, 0.85, P.sofa2));
  if (back === 's') out.push(B(x, y + d - t, w, t, 0.85, P.sofa2));
  if (back === 'n') out.push(B(x, y, w, t, 0.85, P.sofa2));
  if (back === 'w') out.push(B(x, y, w, 0.2, 0.62, P.sofa2), B(x, y + d - 0.2, w, 0.2, 0.62, P.sofa2));
  else out.push(B(x, y, 0.2, d, 0.62, P.sofa2), B(x + w - 0.2, y, 0.2, d, 0.62, P.sofa2));
  return out;
}
// стол на ножках
function table(P, x, y, w, d, h = 0.75, fill = P.wood) {
  const l = 0.07;
  return [B(x, y, w, d, 0.06, fill, h - 0.06), B(x + 0.05, y + 0.05, l, l, h - 0.06, fill), B(x + w - 0.12, y + 0.05, l, l, h - 0.06, fill), B(x + 0.05, y + d - 0.12, l, l, h - 0.06, fill), B(x + w - 0.12, y + d - 0.12, l, l, h - 0.06, fill)];
}
// стул: back — сторона спинки
function chair(P, x, y, back, fill = P.dark) {
  const s = 0.44, out = [B(x, y, s, s, 0.45, fill)];
  if (back === 'n') out.push(B(x, y, s, 0.07, 0.95, fill));
  if (back === 's') out.push(B(x, y + s - 0.07, s, 0.07, 0.95, fill));
  if (back === 'w') out.push(B(x, y, 0.07, s, 0.95, fill));
  if (back === 'e') out.push(B(x + s - 0.07, y, 0.07, s, 0.95, fill));
  return out;
}
// фонарь
const lampPost = (P, x, y) => [B(x, y, 0.12, 0.12, 3.2, P.dark), B(x - 0.15, y - 0.15, 0.42, 0.42, 0.18, P.lamp, 3.2)];
// скамейка вдоль x или y
const bench = (P, x, y, len, ax = 'x') => ax === 'x'
  ? [B(x, y, len, 0.45, 0.08, P.wood, 0.42), B(x, y + 0.38, len, 0.07, 0.4, P.wood, 0.5), B(x + 0.1, y + 0.05, 0.08, 0.35, 0.42, P.dark), B(x + len - 0.18, y + 0.05, 0.08, 0.35, 0.42, P.dark)]
  : [B(x, y, 0.45, len, 0.08, P.wood, 0.42), B(x, y, 0.07, len, 0.4, P.wood, 0.5), B(x + 0.05, y + 0.1, 0.35, 0.08, 0.42, P.dark), B(x + 0.05, y + len - 0.18, 0.35, 0.08, 0.42, P.dark)];

// забор секциями по 2 м, в проёме ворот — пусто
function fenceRun(P, x0, y0, x1, y1, h, gate) {
  const out = [], seg = 2, t = 0.12;
  const push = (ax, ay, ux, uy, s, e) => {
    const px = ax + ux * s, py = ay + uy * s, qx = ax + ux * e, qy = ay + uy * e;
    out.push(B(Math.min(px, qx) - (ux ? 0 : t / 2), Math.min(py, qy) - (uy ? 0 : t / 2), Math.abs(qx - px) || t, Math.abs(qy - py) || t, h, P.fence));
    out.push(B(px - 0.1, py - 0.1, 0.2, 0.2, h + 0.15, P.post));
  };
  const run = (side, ax, ay, bx, by) => {
    const len = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / len, uy = (by - ay) / len;
    for (let s = 0; s < len - 0.01; s += seg) {
      const e = Math.min(len, s + seg);
      if (gate && gate.side === side && e > gate.from && s < gate.to) {
        if (s < gate.from) push(ax, ay, ux, uy, s, gate.from);
        if (e > gate.to) push(ax, ay, ux, uy, gate.to, e);
        continue;
      }
      push(ax, ay, ux, uy, s, e);
    }
  };
  run('back', x0, y0, x1, y0); run('left', x0, y0, x0, y1); run('right', x1, y0, x1, y1); run('front', x0, y1, x1, y1);
  return out;
}

// комната в разрезе: дальние стены (задняя, левая) — в полную высоту, ближние — низкие; у срезанных стен тёмный верх, как на макете
function room(P, x1, y1, H, back = [], left = [], cut = 0.35) {
  const t = 0.2, out = [];
  const wall = (x, y, w, d, h, decals) => { out.push(B(x, y, w, d, h, P.wallIn, 0, { kind: 'wall', decals })); out.push(B(x, y, w, d, 0.04, P.cut, h)); };
  wall(-t, -t, x1 + t, t, H, back.map((d) => ({ ...d, face: '+y', u0: d.u0 + t, u1: d.u1 + t })));
  wall(-t, 0, t, y1, H, left.map((d) => ({ ...d, face: '+x', u0: d.u0, u1: d.u1 })));
  wall(x1, -t, t, y1 + t, cut);
  wall(-t, y1, x1 + 2 * t, t, cut);
  return out;
}
const tiles = (x0, y0, x1, y1, step, stroke = 'rgba(10,36,99,.06)') => {
  const L = [];
  for (let x = x0 + step; x < x1 - 0.01; x += step) L.push({ pts: [[x, y0, 0], [x, y1, 0]], stroke });
  for (let y = y0 + step; y < y1 - 0.01; y += step) L.push({ pts: [[x0, y, 0], [x1, y, 0]], stroke });
  return L;
};
// подставка: срез земли/пола под сценой
const slab = (fill, x0, y0, x1, y1, h = 0.7) => fill ? [B(x0, y0, x1 - x0, y1 - y0, h - 0.01, fill, -h)] : [];

// полка с товаром вдоль x, товар смотрит в +y
function shelfX(P, x, y, w, levels, h) {
  const out = [B(x, y, w, 0.08, h, P.shelf)];
  levels.forEach((z, li) => {
    out.push(B(x, y + 0.08, w, 0.42, 0.04, P.shelf, z));
    for (let i = 0, gx = x + 0.05; gx < x + w - 0.3; i++, gx += 0.46) out.push(B(gx, y + 0.12, 0.4, 0.34, 0.26 + ((i + li) % 3) * 0.06, P.goods[(i * 2 + li) % P.goods.length], z + 0.04));
  });
  return out;
}
// островной стеллаж: товар с двух сторон
function gondola(P, x, y, w) {
  const out = [B(x, y, w, 0.9, 0.14, P.shelf), B(x, y + 0.42, w, 0.06, 1.55, P.shelf)];
  for (const z of [0.14, 0.62, 1.1]) {
    if (z > 0.2) out.push(B(x, y, w, 0.9, 0.03, P.shelf, z));
    for (let i = 0, gx = x + 0.05; gx < x + w - 0.3; i++, gx += 0.46) {
      const k = Math.round(z * 10) + i;
      out.push(B(gx, y + 0.04, 0.4, 0.34, 0.26 + (k % 3) * 0.05, P.goods[k % P.goods.length], z + 0.03));
      out.push(B(gx, y + 0.52, 0.4, 0.34, 0.26 + ((k + 1) % 3) * 0.05, P.goods[(k + 2) % P.goods.length], z + 0.03));
    }
  }
  return out;
}

// ---------- сцены ----------
// места камер: rect — стены, по которым их расставляет placeCams(); clip — край веера
const CAMS = {
  homeOut: { rect: [6, 4, 17, 11], z: 2.8, clip: [0, 0, 26, 20], L: 8 },
  homeIn: { rect: [0, 0, 12, 8], z: 2.6, inward: true, clip: [0, 0, 12, 8], L: 6.5 },
  flatsOut: {
    rect: [2, 4, 21, 11], z: 3.1, clip: [0, 0, 30, 22], L: 8,
    // сначала — над входами в подъезды, потом углы и остальные стены
    order: [['front', 0.27], ['front', 0.6], ['front', 0.92], CORNER.D, CORNER.C, CORNER.B, CORNER.A, ['right', 0.5], ['left', 0.5], ['back', 0.17], ['back', 0.5], ['back', 0.83], ['right', 0.25], ['right', 0.75], ['left', 0.25], ['left', 0.75]],
  },
  flatsIn: { rect: [0, 0, 9, 7], z: 2.8, inward: true, clip: [0, 0, 9, 7], L: 5.5 },
  bizOut: { rect: [5, 3, 15, 11], z: 3.5, clip: [0, 0, 20, 16], L: 7 },
  bizIn: { rect: [0, 0, 10, 8], z: 2.8, inward: true, clip: [0, 0, 10, 8], L: 6 },
};

function homeOut(P) {
  const win = (face, u0, u1) => dec(face, u0, u1, 1, 2.3, P.glass);
  return {
    ground: [
      { r: [0, 0, 26, 20], fill: P.lawn }, { r: [0, 20, 26, 21.4], fill: P.pave }, { r: [0, 21.4, 26, 25], fill: P.road },
      { r: [11, 11, 15, 20], fill: P.pave }, { r: [15, 11, 23, 16.4], fill: P.pave }, { r: [7.4, 11, 11, 13.2], fill: P.deck },
      { r: [1, 11.5, 4.5, 14], fill: P.soil }, { r: [2.1, 8.6, 2.9, 11], fill: P.pave }, { r: [17.5, 2, 24.5, 8.5], fill: P.lawn2 },
    ],
    lines: [
      ...Array.from({ length: 8 }, (_, i) => ({ pts: [[0.5 + i * 3.3, 23.2, 0], [2.1 + i * 3.3, 23.2, 0]], stroke: '#fff' })),
      ...[12, 12.6, 13.2].map((y) => ({ pts: [[1.2, y, 0], [4.3, y, 0]], stroke: 'rgba(255,255,255,.5)' })),
    ],
    boxes: [
      ...slab(P.slabOut, 0, 0, 26, 25),
      ...fenceRun(P, 0, 0, 26, 20, 1.4, { side: 'front', from: 11, to: 15 }),
      B(5.85, 3.85, 11.3, 7.3, 0.35, P.plinth),
      B(6, 4, 11, 7, 3.2, P.wall, 0, { roof: { axis: 'x', h: 2.4, o: 0.5, fill: P.roof },
        decals: [win('+y', 1, 2.6), win('+y', 3.6, 5.2), dec('+y', 6.6, 7.6, 0, 2.1, P.door), win('+y', 8.8, 10.2), win('+x', 1.5, 3), win('+x', 4.2, 5.7)] }),
      B(8, 5.2, 0.6, 0.6, 2.8, P.brick, 3.2),
      B(12.3, 11, 1.6, 0.9, 0.3, P.plinth), B(12.1, 11, 2, 1.3, 0.12, P.roof, 2.6), B(12.15, 12.15, 0.1, 0.1, 2.6, P.post), B(13.95, 12.15, 0.1, 0.1, 2.6, P.post),
      B(18, 10.5, 5, 5.5, 2.6, P.wall, 0, { roof: { axis: 'y', h: 1.2, o: 0.3, fill: P.roof }, decals: [dec('+y', 0.6, 4.4, 0, 2.1, P.garageDoor)] }),
      B(0.9, 5.2, 3.2, 3.4, 2.3, P.wood, 0, { roof: { axis: 'y', h: 1, o: 0.25, fill: P.roof }, decals: [dec('+y', 1.2, 2.0, 0, 1.8, P.door), dec('+x', 1, 1.8, 1.1, 1.7, P.glass)] }),
      B(10.75, 19.85, 0.3, 0.3, 1.9, P.post), B(14.95, 19.85, 0.3, 0.3, 1.9, P.post),
      ...car(P, 12.1, 14.4, P.cars[0], 'y'),
      ...car(P, 3, 22.3, P.cars[3], 'x'),
      ...table(P, 8.4, 11.6, 1.4, 0.9), ...chair(P, 7.8, 11.8, 'w', P.wood), ...chair(P, 10.0, 11.8, 'e', P.wood),
      ...person(P, 16.6, 20.7, P.shirts[0]),
      ...person(P, 9.1, 12.9, P.shirts[1]),
      B(4.2, 16.4, 1.1, 1.3, 0.8, P.wood, 0, { roof: { axis: 'y', h: 0.45, o: 0.1, fill: P.roof }, decals: [dec('+x', 0.4, 0.9, 0, 0.55, P.dark)] }),
    ],
    trees: [{ x: 3, y: 17.8, r: 1.3, h: 4 }, { x: 22.5, y: 3.5, r: 1.6, h: 4.6 }, { x: 19.5, y: 6.5, r: 1.1, h: 3.4 }, { x: 24.5, y: 18.5, r: 1, h: 3 }, { x: 7.5, y: 17.5, r: 0.7, h: 1.8 }],
    labels: [{ x: 13, y: 20.7, z: 0, t: 'ворота' }, { x: 20.5, y: 13, z: 4.2, t: 'гараж' }, { x: 2.5, y: 6.9, z: 3.9, t: 'баня' }],
    cams: CAMS.homeOut,
  };
}

function homeIn(P) {
  return {
    ground: [
      { r: [0, 0, 12, 8], fill: P.floor }, { r: [0, 0, 6, 8], fill: P.floorWood }, { r: [6, 0, 12, 5.2], fill: P.tile }, { r: [6, 5.2, 12, 8], fill: P.floorWood2 },
      { r: [1.4, 3.1, 4.8, 5.6], fill: P.rug },
    ],
    lines: [...tiles(6, 0, 12, 5.2, 0.8), ...tiles(0, 0, 6, 8, 0.5).filter((l) => l.pts[0][0] === l.pts[1][0])],
    boxes: [
      ...slab(P.slabIn, -0.2, -0.2, 12.2, 8.2, 0.4),
      ...room(P, 12, 8, 2.8,
        [{ u0: 4.3, u1: 5.9, v0: 1, v1: 2.3, fill: P.glass }],
        [{ u0: 1, u1: 2.1, v0: 0, v1: 2.1, fill: P.door }]),
      // перегородка спальни — в разрезе
      B(6, 5.2, 6, 0.12, 0.35, P.wallIn), B(6, 5.2, 6, 0.12, 0.04, P.cut, 0.35), B(6, 6.4, 0.12, 1.6, 0.35, P.wallIn), B(6, 6.4, 0.12, 1.6, 0.04, P.cut, 0.35),
      // гостиная
      ...sofa(P, 0.3, 3.2, 1, 3.2, 'w'), ...sofa(P, 1.6, 5.7, 2.9, 1, 's'),
      ...table(P, 2.2, 4.0, 1.4, 0.8, 0.42),
      B(1.2, 0.05, 2.6, 0.45, 0.5, P.dark), B(1.5, 0.1, 2.0, 0.06, 1.05, P.screen, 0.7),
      B(0.55, 7.25, 0.08, 0.08, 1.5, P.dark), B(0.38, 7.08, 0.42, 0.42, 0.35, P.lamp, 1.45),
      // кухня
      B(6.6, 0.05, 4.4, 0.6, 0.85, P.cabinet, 0, { decals: [0, 1, 2, 3, 4, 5].map((i) => dec('+y', 0.05 + i * 0.73, 0.7 + i * 0.73, 0.1, 0.78, P.cabinet)) }),
      B(6.55, 0.02, 4.5, 0.68, 0.06, P.counter, 0.85),
      B(8.1, 0.12, 0.62, 0.45, 0.02, P.screen, 0.91), B(9.6, 0.12, 0.55, 0.42, 0.02, P.metal, 0.91),
      B(6.6, 0.05, 4.4, 0.35, 0.7, P.cabinet, 1.55),
      B(11.1, 0.05, 0.8, 0.72, 1.95, P.fridge, 0, { decals: [dec('+y', 0.62, 0.68, 0.9, 1.4, P.metal)] }),
      ...table(P, 7.6, 2.4, 2.2, 1.0, 0.75, P.wood),
      ...chair(P, 7.9, 1.8, 'n'), ...chair(P, 9.0, 1.8, 'n'), ...chair(P, 7.9, 3.55, 's'), ...chair(P, 9.0, 3.55, 's'),
      ...person(P, 10.5, 1.4, P.shirts[2]),
      // спальня
      B(9.6, 5.7, 2.2, 2.0, 0.35, P.wood), B(9.65, 5.75, 2.1, 1.9, 0.2, P.bedding, 0.35), B(9.65, 5.75, 1.35, 1.9, 0.06, P.blanket, 0.55),
      B(11.1, 5.85, 0.55, 0.78, 0.15, P.bedding, 0.55), B(11.1, 6.8, 0.55, 0.78, 0.15, P.bedding, 0.55),
      B(11.78, 5.7, 0.12, 2.0, 1.0, P.wood),
      B(11.3, 7.75, 0.5, 0.2, 0.5, P.wood),
      B(6.2, 5.5, 0.6, 2.2, 2.0, P.cabinet, 0, { decals: [dec('+x', 0.1, 1.05, 0.1, 1.9, P.cabinet), dec('+x', 1.15, 2.1, 0.1, 1.9, P.cabinet)] }),
    ],
    trees: [{ x: 5.4, y: 0.6, r: 0.42, h: 1.4, pot: true }],
    labels: [{ x: 3, y: 4.4, z: 1.2, t: 'гостиная' }, { x: 9.4, y: 1.0, z: 2.7, t: 'кухня' }, { x: 10.4, y: 6.7, z: 1.3, t: 'спальня' }],
    cams: CAMS.homeIn,
  };
}

function flatsOut(P) {
  const glass = (face, u0, v0) => dec(face, u0, u0 + 1.4, v0, v0 + 1.4, P.glass);
  const front = [], side = [];
  for (let fl = 0; fl < 5; fl++) {
    for (const u of [1.5, 4.5, 8, 11, 14.5, 17]) if (fl > 0 || ![4.5, 11, 17].includes(u)) front.push(glass('+y', u, 1 + fl * 3));
    for (const u of [1.5, 4.5]) side.push(glass('+x', u, 1 + fl * 3));
  }
  const balconies = [];
  for (let fl = 1; fl < 5; fl++) for (const u of [1.5, 8, 14.5]) balconies.push(B(2 + u - 0.2, 11, 1.8, 0.8, 1.0, P.balcony, fl * 3), B(2 + u - 0.2, 11, 1.8, 0.8, 0.12, P.canopy, fl * 3 + 2.7));
  return {
    ground: [
      { r: [0, 0, 30, 22], fill: P.lawn }, { r: [0, 11, 30, 13], fill: P.pave }, { r: [0, 13, 30, 18.6], fill: P.asphalt }, { r: [0, 19.4, 30, 22], fill: P.road },
      { r: [22, 3.6, 29.4, 10.4], fill: P.play }, { r: [26.2, 8.2, 28.2, 9.8], fill: P.sand },
    ],
    lines: [
      ...Array.from({ length: 12 }, (_, i) => ({ pts: [[1 + i * 2.6, 13.2, 0], [1 + i * 2.6, 17.8, 0]], stroke: '#fff' })),
      ...Array.from({ length: 9 }, (_, i) => ({ pts: [[0.5 + i * 3.4, 20.7, 0], [2.1 + i * 3.4, 20.7, 0]], stroke: '#fff' })),
    ],
    boxes: [
      ...slab(P.slabOut, 0, 0, 30, 22),
      B(1.9, 3.9, 19.2, 7.2, 0.8, P.facade2),
      B(2, 4, 19, 7, 15, P.facade, 0, { decals: [...front, ...side, ...[4.5, 11, 17].map((u) => dec('+y', u, u + 1.4, 0, 2.2, P.door))] }),
      B(2, 4, 19, 7, 0.5, P.facade2, 15),
      B(5, 6, 1.4, 1.4, 1.2, P.metal, 15.5),
      ...balconies,
      ...[6.2, 12.7, 18.7].flatMap((x) => [B(x, 11, 2.2, 1.3, 0.15, P.canopy, 2.6), B(x + 0.2, 11, 1.8, 0.8, 0.18, P.plinth)]),
      ...car(P, 3.85, 13.5, P.cars[0]), ...car(P, 9.05, 13.5, P.cars[1]), ...car(P, 11.65, 13.5, P.cars[2]), ...car(P, 19.45, 13.5, P.cars[3]),
      ...car(P, 13, 20.0, P.cars[4], 'x'),
      // площадка: качели, горка, песочница
      B(23, 5, 0.12, 0.12, 2.2, P.dark), B(23, 7.5, 0.12, 0.12, 2.2, P.dark), B(23, 5, 0.12, 2.62, 0.12, P.dark, 2.2),
      B(22.85, 5.7, 0.45, 0.35, 0.06, P.accent, 0.55), B(22.85, 6.7, 0.45, 0.35, 0.06, P.accent2, 0.55),
      B(25.2, 4.4, 1.3, 1.3, 1.5, P.accent2), B(25.2, 4.4, 1.3, 1.3, 0.1, P.accent, 2.5), B(25.2, 4.4, 0.1, 0.1, 2.5, P.dark), B(26.4, 5.6, 0.1, 0.1, 2.5, P.dark),
      ...[0, 1, 2, 3].map((i) => B(26.5 + i * 0.55, 4.6, 0.55, 0.9, 1.2 - i * 0.3, P.accent)),
      B(26.2, 8.2, 2, 0.12, 0.3, P.wood), B(26.2, 9.68, 2, 0.12, 0.3, P.wood), B(26.2, 8.2, 0.12, 1.6, 0.3, P.wood), B(28.08, 8.2, 0.12, 1.6, 0.3, P.wood),
      ...bench(P, 23, 9.6, 1.8), ...bench(P, 0.8, 11.2, 1.8),
      ...person(P, 24, 9.2, P.shirts[3]), ...person(P, 23.6, 6.9, P.shirts[2], 0.62), ...person(P, 27, 9, P.shirts[0], 0.6),
      ...person(P, 13.4, 12.4, P.shirts[1]),
      ...lampPost(P, 9, 12.6), ...lampPost(P, 16, 12.6),
      B(21.6, 11.6, 1.2, 0.8, 1.1, P.bin), B(21.6, 12.5, 1.2, 0.8, 1.1, P.bin),
    ],
    trees: [{ x: 25, y: 19, r: 1.4, h: 4.4 }, { x: 1.2, y: 19.5, r: 1.1, h: 3.6 }, { x: 28.5, y: 2.2, r: 1.3, h: 4 }, { x: 22.2, y: 1.8, r: 1, h: 3.2 }],
    labels: [{ x: 15, y: 18.2, z: 0, t: 'парковка' }, { x: 25.5, y: 10.8, z: 0, t: 'детская площадка' }],
    cams: CAMS.flatsOut,
  };
}

function flatsIn(P) {
  const mail = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) mail.push(dec('+x', 0.1 + c * 0.5, 0.5 + c * 0.5, 0.1 + r * 0.38, 0.4 + r * 0.38, P.metal));
  return {
    ground: [{ r: [0, 0, 9, 7], fill: P.tile }, { r: [2.9, 6.1, 4.5, 7], fill: P.mat }],
    lines: tiles(0, 0, 9, 7, 0.6),
    boxes: [
      ...slab(P.slabIn, -0.2, -0.2, 9.2, 7.2, 0.4),
      ...room(P, 9, 7, 3,
        [{ u0: 1.0, u1: 2.4, v0: 0, v1: 2.2, fill: P.lift }, { u0: 3.2, u1: 4.6, v0: 0, v1: 2.2, fill: P.lift }, { u0: 2.6, u1: 2.9, v0: 1.0, v1: 1.4, fill: P.dark }],
        [{ u0: 5.0, u1: 6.0, v0: 0.2, v1: 0.8, fill: P.metal }]),
      // лифты: дверь из двух створок
      B(1.69, 0.0, 0.03, 0.04, 2.2, P.dark), B(3.89, 0.0, 0.03, 0.04, 2.2, P.dark),
      // лестница и перила
      ...Array.from({ length: 7 }, (_, i) => B(6.2, 0.2 + i * 0.5, 2.6, 0.5, 0.17 * (i + 1), P.wallIn)),
      ...Array.from({ length: 7 }, (_, i) => B(6.08, 0.2 + i * 0.5, 0.1, 0.5, 0.17 * (i + 1) + 0.9, P.metal)),
      B(0.05, 0.6, 0.35, 2.2, 1.2, P.metal, 1.0, { decals: mail }),
      ...bench(P, 0.05, 3.8, 1.8, 'y'),
      ...person(P, 2.2, 1.3, P.shirts[0]),
      ...person(P, 4.6, 4.2, P.shirts[3]),
      B(4.85, 4.0, 0.7, 0.45, 0.45, P.accent2, 0.35), B(5.45, 4.0, 0.06, 0.45, 1.0, P.dark),
    ],
    trees: [{ x: 5.4, y: 0.5, r: 0.38, h: 1.3, pot: true }],
    labels: [{ x: 2.8, y: 0.2, z: 2.7, t: 'лифт' }, { x: 7.5, y: 2, z: 1.8, t: 'лестница' }, { x: 0.3, y: 1.7, z: 2.6, t: 'почта' }],
    cams: CAMS.flatsIn,
  };
}

function bizOut(P) {
  const stripes = [];
  for (const [x0, x1] of [[5.6, 8.8], [11.2, 14.4]]) for (let i = 0, x = x0; x < x1 - 0.01; i++, x += 0.4) stripes.push(B(x, 11, 0.4, 1.1, 0.12, P.awning[i % 2], 2.75));
  return {
    ground: [
      { r: [0, 0, 20, 16], fill: P.pave }, { r: [0, 0, 20, 2.2], fill: P.lawn }, { r: [0, 12.6, 20, 16], fill: P.asphalt }, { r: [15.6, 3, 20, 11], fill: P.asphalt },
    ],
    lines: [
      ...Array.from({ length: 7 }, (_, i) => ({ pts: [[1 + i * 2.8, 12.8, 0], [1 + i * 2.8, 16, 0]], stroke: '#fff' })),
    ],
    boxes: [
      ...slab(P.slabOut, 0, 0, 20, 16),
      B(5, 3, 10, 8, 4, P.shopWall, 0, { decals: [dec('+y', 0.6, 3.8, 0.4, 2.6, P.glass), dec('+y', 4.3, 5.7, 0, 2.5, P.glass), dec('+y', 6.2, 9.4, 0.4, 2.6, P.glass), dec('+x', 5.4, 6.6, 0, 2.2, P.door), dec('+x', 1, 3, 1, 2.4, P.glass)] }),
      B(4.9, 2.9, 10.2, 8.2, 0.45, P.plinth, 4),
      B(5, 11, 10, 0.3, 0.9, P.sign, 3.0, { decals: [dec('+y', 2.2, 7.8, 0.25, 0.65, P.signText)] }),
      ...stripes,
      B(7, 5, 1.3, 1, 0.8, P.metal, 4.45), B(11, 6, 1.3, 1, 0.8, P.metal, 4.45),
      B(9.1, 11, 1.8, 0.6, 0.15, P.plinth),
      B(4.2, 11.3, 0.7, 0.7, 0.5, P.plinth), B(15.1, 11.3, 0.7, 0.7, 0.5, P.plinth),
      ...car(P, 1.5, 13, P.cars[1], 'y'), ...car(P, 7.1, 13, P.cars[0], 'y'), ...car(P, 12.7, 13, P.cars[2], 'y'),
      ...car(P, 16.8, 3.6, P.cars[4], 'y', true),
      B(15.6, 1.0, 1.4, 0.9, 1.1, P.bin), B(17.2, 1.0, 1.4, 0.9, 1.1, P.bin),
      ...person(P, 9.0, 12.1, P.shirts[0]), ...person(P, 11.6, 12.3, P.shirts[3]), ...person(P, 16.1, 9.9, P.shirts[1]),
      B(15.85, 9.3, 0.5, 0.5, 0.5, P.wood, 0.9),
      ...lampPost(P, 0.6, 12.2), ...lampPost(P, 19.2, 12.2),
    ],
    trees: [{ x: 4.55, y: 11.65, r: 0.55, h: 1.6, pot: true }, { x: 15.45, y: 11.65, r: 0.55, h: 1.6, pot: true }, { x: 2.5, y: 1.2, r: 1.1, h: 3.4 }, { x: 12, y: 1.1, r: 0.9, h: 3 }],
    labels: [{ x: 10, y: 12.4, z: 0, t: 'вход' }, { x: 9.8, y: 15.6, z: 0, t: 'парковка' }, { x: 18.2, y: 9.8, z: 0, t: 'склад' }],
    cams: CAMS.bizOut,
  };
}

function bizIn(P) {
  return {
    ground: [{ r: [0, 0, 10, 8], fill: P.tile }, { r: [4.2, 7.1, 5.8, 8], fill: P.mat }],
    lines: tiles(0, 0, 10, 8, 0.6),
    boxes: [
      ...slab(P.slabIn, -0.2, -0.2, 10.2, 8.2, 0.4),
      ...room(P, 10, 8, 3, [{ u0: 7.6, u1: 8.8, v0: 0, v1: 2.2, fill: P.door }], []),
      ...shelfX(P, 0.9, 0.0, 6.2, [0.3, 0.85, 1.4], 2.0),
      ...gondola(P, 3.4, 2.4, 5.2), ...gondola(P, 3.4, 4.3, 5.2),
      // холодильники с напитками вдоль левой стены, стекло смотрит в зал
      B(0.0, 1.0, 0.75, 3.6, 2.1, P.fridge, 0, { decals: [0, 1, 2].map((i) => dec('+x', 0.1 + i * 1.18, 1.1 + i * 1.18, 0.25, 1.9, P.glassCold)) }),
      ...[0, 1, 2].flatMap((i) => [0.6, 1.05, 1.5].map((z, r) => B(0.55, 1.2 + i * 1.18, 0.12, 0.9, 0.2, P.goods[(i + r) % P.goods.length], z))),
      // касса у входа
      B(1.0, 5.9, 2.6, 0.75, 1.0, P.counter), B(1.0, 5.9, 0.7, 1.6, 1.0, P.counter),
      B(2.6, 5.95, 0.45, 0.4, 0.22, P.screen, 1.0), B(2.0, 5.92, 0.45, 0.05, 0.32, P.screen, 1.1),
      ...person(P, 2.4, 5.4, P.shirts[1]),
      ...person(P, 2.6, 7.1, P.shirts[0]), B(2.9, 7.05, 0.4, 0.3, 0.25, P.accent, 0.7),
      ...person(P, 6.0, 3.85, P.shirts[3]), ...person(P, 8.9, 1.6, P.shirts[2]),
    ],
    labels: [{ x: 1.6, y: 6.3, z: 1.9, t: 'касса' }, { x: 8.2, y: 0.1, z: 2.6, t: 'склад' }, { x: 5, y: 7.6, z: 0, t: 'вход' }],
    cams: CAMS.bizIn,
  };
}


// кабина лифта в разрезе: дальние стены (задняя, левая) — в полную высоту, ближние (правая, передняя с проёмом дверей) — низкие,
// как у комнат; внутри зеркало, поручень и кнопки; камера — в дальнем углу под потолком, смотрит на двери
const CAB = { w: 1.6, d: 1.5, H: 2.3, gapX: 0.35, gapY: 0.9, row: 4 };
function cabin(x0, y0, againstWall, no) {
  const { w, d, H } = CAB, fill = '#C9D1DE', cut = 0.35;
  return {
    ground: { r: [x0, y0, x0 + w, y0 + d], fill: '#DCE2EC' },
    boxes: [
      ...(againstWall ? [] : [{ x: x0 - 0.1, y: y0 - 0.1, w: w + 0.2, d: 0.1, h: cut, fill }]), // первый ряд — у стены холла; у следующих задняя стенка низкая, чтобы не закрывала первый
      { x: x0 - 0.1, y: y0, w: 0.1, d, h: H, fill },
      { x: x0 + w, y: y0, w: 0.1, d, h: cut, fill },
      { x: x0 - 0.1, y: y0 + d, w: 0.45, d: 0.1, h: cut, fill },
      { x: x0 + w - 0.35, y: y0 + d, w: 0.45, d: 0.1, h: cut, fill },
      { x: x0 + 0.25, y: y0 + 0.01, w: 1.1, d: 0.04, h: 1.1, z: 0.9, fill: SC.glass }, // зеркало
      { x: x0 + 0.01, y: y0 + 0.25, w: 0.05, d: 0.7, h: 0.05, z: 0.9, fill: '#9AA6BA' }, // поручень
      { x: x0 + 0.01, y: y0 + 1.1, w: 0.04, d: 0.22, h: 0.5, z: 0.9, fill: SC.dark }, // кнопки
    ],
    label: { x: x0 + w / 2, y: y0 + d + 0.45, z: 0, t: no ? `лифт ${no}` : 'лифт' },
    cam: { x: x0 + 0.15, y: y0 + 0.15, z: 2.1, dir: Math.atan2(1, 0.75), per: 0, spec: { clip: [x0, y0, x0 + w, y0 + d], L: 2.4, half: 34 } },
  };
}
// сцена «Лифт»: по кабине на камеру, по 4 в ряд; следующий ряд — ближе к зрителю
function liftScene(n) {
  const k = Math.max(1, n), cols = Math.min(k, CAB.row), rows = Math.ceil(k / CAB.row);
  const W = cols * (CAB.w + CAB.gapX) + 0.5, D = rows * (CAB.d + CAB.gapY) + 0.4;
  const cabs = Array.from({ length: k }, (_, i) => cabin(0.4 + (i % CAB.row) * (CAB.w + CAB.gapX), 0.1 + Math.floor(i / CAB.row) * (CAB.d + CAB.gapY), i < CAB.row, k > 1 && i + 1));
  return {
    ground: [{ r: [0, 0, W, D], fill: SC.floor }, ...cabs.map((c) => c.ground)],
    lines: tiles(0, 0, W, D, 0.8),
    boxes: [{ x: -0.2, y: -0.2, w: W + 0.4, d: 0.2, h: CAB.H + 0.4, fill: SC.wall, kind: 'wall' }, ...cabs.flatMap((c) => c.boxes)],
    labels: cabs.map((c) => c.label),
    cams: { fixed: cabs.map((c) => c.cam) },
  };
}


const SCENES = {
  home: {
    name: 'Частный дом',
    out: scene('Двор и дом снаружи', homeOut),
    in: scene('Дом внутри', homeIn),
  },
  flats: {
    name: 'Многоквартирный дом',
    out: scene('Фасад и двор', flatsOut),
    in: scene('Подъезд внутри', flatsIn),
    // сцена зависит от числа камер (кабин) — scheme3d.js собирает её через build(n)
    lift: { title: 'Лифт', build: liftScene },
  },
  business: {
    name: 'Коммерческий объект',
    out: scene('Снаружи', bizOut),
    in: scene('Внутри', bizIn),
  },
};
