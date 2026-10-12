// Сцены 3D-схемы (шаг «Схема» и PDF): дом, ЖК, коммерция — снаружи и внутри,
// и заготовленные места камер. Рисует assets/scheme3d.js (Three.js). Черновики вариантов — drafts/scheme-*.html.
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

// ---------- сцены ----------
const SC = {
  lawn: '#E3EEDC', pave: '#EEF1F6', wall: '#FFFFFF', roof: '#2E4E8C', fence: '#C7D1E2',
  glass: '#BFD6FF', door: '#4A5878', wood: '#D8C2A3', floor: '#F5F8FD', soft: '#8FB3F2',
  dark: '#3A465C', line: 'rgba(10,36,99,.22)', crown: '#93C28A', trunk: '#8A6A4F', asphalt: '#E4E8EF',
};

function fence(x0, y0, x1, y1, h, gate) {
  const out = [], seg = 2, t = 0.12;
  const run = (side, ax, ay, bx, by) => {
    const len = Math.hypot(bx - ax, by - ay);
    for (let s = 0; s < len - 0.01; s += seg) {
      const e = Math.min(len, s + seg);
      if (gate && gate.side === side && e > gate.from && s < gate.to) {
        if (s < gate.from) push(side, ax, ay, bx, by, len, s, gate.from);
        if (e > gate.to) push(side, ax, ay, bx, by, len, gate.to, e);
        continue;
      }
      push(side, ax, ay, bx, by, len, s, e);
    }
  };
  const push = (side, ax, ay, bx, by, len, s, e) => {
    const ux = (bx - ax) / len, uy = (by - ay) / len;
    const px = ax + ux * s, py = ay + uy * s, qx = ax + ux * e, qy = ay + uy * e;
    out.push({ x: Math.min(px, qx) - (ux ? 0 : t / 2), y: Math.min(py, qy) - (uy ? 0 : t / 2), w: Math.abs(qx - px) || t, d: Math.abs(qy - py) || t, h, fill: SC.fence, kind: 'fence' });
  };
  run('back', x0, y0, x1, y0); run('left', x0, y0, x0, y1); run('right', x1, y0, x1, y1); run('front', x0, y1, x1, y1);
  return out;
}

const win = (face, u0, u1, v0, v1) => ({ face, u0, u1, v0, v1, fill: SC.glass });
const door = (face, u0, u1, v1 = 2.1) => ({ face, u0, u1, v0: 0, v1, fill: SC.door });

// стены комнаты в разрезе: дальние — в полную высоту, ближние — низкие
function room(x0, y0, x1, y1, H, cut = 0.35) {
  const t = 0.2;
  return [
    { x: x0 - t, y: y0 - t, w: t, d: y1 - y0 + t, h: H, fill: SC.wall, kind: 'wall' },
    { x: x0, y: y0 - t, w: x1 - x0 + t, d: t, h: H, fill: SC.wall, kind: 'wall' },
    { x: x1, y: y0, w: t, d: y1 - y0 + t, h: cut, fill: SC.wall, kind: 'wall' },
    { x: x0 - t, y: y1, w: x1 - x0 + t, d: t, h: cut, fill: SC.wall, kind: 'wall' },
  ];
}
const ceiling = (x0, y0, x1, y1, H) => ({ pts: [[x1, y0, H], [x1, y1, H], [x0, y1, H]], dash: '4 4', stroke: 'rgba(10,36,99,.28)' });
const tiles = (x0, y0, x1, y1, step = 1) => {
  const L = [];
  for (let x = x0 + step; x < x1; x += step) L.push({ pts: [[x, y0, 0], [x, y1, 0]], stroke: 'rgba(10,36,99,.06)' });
  for (let y = y0 + step; y < y1; y += step) L.push({ pts: [[x0, y, 0], [x1, y, 0]], stroke: 'rgba(10,36,99,.06)' });
  return L;
};

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
    out: {
      title: 'Двор и дом снаружи',
      ground: [
        { r: [0, 0, 26, 20], fill: SC.lawn },
        { r: [11, 11, 15, 20], fill: SC.pave }, // въезд
        { r: [15, 11, 23, 16], fill: SC.pave },
        { r: [8, 11, 11, 12.4], fill: SC.pave },
      ],
      boxes: [
        ...fence(0, 0, 26, 20, 1.4, { side: 'front', from: 11, to: 15 }),
        { x: 6, y: 4, w: 11, d: 7, h: 3.2, fill: SC.wall, roof: { axis: 'x', h: 2.4, o: 0.5, fill: SC.roof },
          decals: [win('+y', 1, 2.6, 1, 2.3), win('+y', 4, 5.6, 1, 2.3), door('+y', 6.6, 7.6), win('+y', 8.8, 10.2, 1, 2.3), win('+x', 1.5, 3, 1, 2.3), win('+x', 4.2, 5.7, 1, 2.3)] },
        { x: 18, y: 10.5, w: 5, d: 5.5, h: 2.6, fill: SC.wall, roof: { axis: 'y', h: 1.2, o: 0.3, fill: SC.roof },
          decals: [{ face: '+y', u0: 0.6, u1: 4.4, v0: 0, v1: 2.1, fill: '#DCE3EE' }] },
        { x: 1.5, y: 1.5, w: 3.5, d: 3, h: 2.3, fill: SC.wood, roof: { axis: 'x', h: 1, o: 0.25, fill: SC.roof }, decals: [door('+y', 1.3, 2.1, 1.8)] },
      ],
      trees: [{ x: 3, y: 15, r: 1.4, h: 4.2 }, { x: 22.5, y: 3, r: 1.6, h: 4.6 }, { x: 2.5, y: 9, r: 1.1, h: 3.4 }, { x: 8, y: 17, r: 0.9, h: 2.6 }],
      labels: [{ x: 13, y: 20.8, z: 0, t: 'ворота' }, { x: 20.5, y: 13, z: 4.2, t: 'гараж' }, { x: 3.2, y: 3, z: 4, t: 'баня' }],
      cams: { rect: [6, 4, 17, 11], z: 2.8, clip: [0, 0, 26, 20], L: 8 },
    },
    in: {
      title: 'Дом внутри',
      ground: [{ r: [0, 0, 12, 8], fill: SC.floor }, { r: [1.5, 3.5, 5.5, 6.8], fill: '#E3ECFB' }],
      lines: [...tiles(0, 0, 12, 8), ceiling(0, 0, 12, 8, 2.8)],
      boxes: [
        ...room(0, 0, 12, 8, 2.8),
        { x: 0.6, y: 3.6, w: 0.9, d: 3.2, h: 0.8, fill: SC.soft }, // диван
        { x: 1.5, y: 6.1, w: 3.2, d: 0.9, h: 0.8, fill: SC.soft },
        { x: 2.6, y: 4.3, w: 1.5, d: 0.9, h: 0.45, fill: SC.wood }, // столик
        { x: 0.2, y: 0.4, w: 3.4, d: 0.5, h: 0.6, fill: SC.dark }, // тумба
        { x: 0.9, y: 0.25, w: 2, d: 0.08, h: 1.1, z: 0.8, fill: '#111826' }, // телевизор
        { x: 7, y: 0.1, w: 4.8, d: 0.7, h: 0.9, fill: SC.wood }, // кухня
        { x: 7, y: 0.1, w: 4.8, d: 0.4, h: 0.8, z: 1.6, fill: SC.wood },
        { x: 7.6, y: 3.6, w: 2.4, d: 1.3, h: 0.75, fill: SC.wood }, // стол
        { x: 7.9, y: 3.0, w: 0.5, d: 0.5, h: 0.45, fill: SC.dark }, { x: 9.2, y: 3.0, w: 0.5, d: 0.5, h: 0.45, fill: SC.dark },
        { x: 7.9, y: 5.0, w: 0.5, d: 0.5, h: 0.45, fill: SC.dark }, { x: 9.2, y: 5.0, w: 0.5, d: 0.5, h: 0.45, fill: SC.dark },
      ],
      wallDecals: [
        { wall: 'back', u0: 4.3, u1: 6.3, v0: 1, v1: 2.3, fill: SC.glass },
        { wall: 'left', u0: 1, u1: 2.2, v0: 0, v1: 2.1, fill: SC.door },
      ],
      trees: [{ x: 11.2, y: 7.2, r: 0.45, h: 1.4, pot: true }],
      labels: [{ x: 3, y: 5, z: 1.2, t: 'гостиная' }, { x: 9.4, y: 1.2, z: 2.5, t: 'кухня' }],
      cams: { rect: [0, 0, 12, 8], z: 2.6, inward: true, clip: [0, 0, 12, 8], L: 6.5 },
    },
  },
  flats: {
    name: 'Многоквартирный дом',
    out: {
      title: 'Фасад и двор',
      ground: [
        { r: [0, 0, 30, 22], fill: SC.lawn },
        { r: [0, 11, 30, 13], fill: SC.pave }, // тротуар у дома
        { r: [0, 13, 30, 19], fill: SC.asphalt }, // парковка
        { r: [22, 4, 29, 10], fill: '#F2E8D5' }, // площадка
      ],
      lines: [...Array.from({ length: 11 }, (_, i) => ({ pts: [[1 + i * 2.6, 13.2, 0], [1 + i * 2.6, 16, 0]], stroke: '#fff', w: 2 }))],
      boxes: [
        { x: 2, y: 4, w: 19, d: 7, h: 15, fill: SC.wall,
          decals: [
            ...[0, 1, 2, 3, 4].flatMap((fl) => [1.5, 4.5, 8, 11, 14.5, 17].map((u) => win('+y', u, u + 1.4, 1 + fl * 3, 2.4 + fl * 3)).filter((w) => fl > 0 || ![4.5, 11, 17].includes(w.u0))),
            ...[0, 1, 2, 3, 4].flatMap((fl) => [1.5, 4.5].map((u) => win('+x', u, u + 1.4, 1 + fl * 3, 2.4 + fl * 3))),
            door('+y', 4.5, 5.9), door('+y', 11, 12.4), door('+y', 17, 18.4),
          ] },
        { x: 6.2, y: 11, w: 2.2, d: 1.2, h: 0.15, z: 2.6, fill: SC.roof }, // козырьки
        { x: 12.7, y: 11, w: 2.2, d: 1.2, h: 0.15, z: 2.6, fill: SC.roof },
        { x: 18.7, y: 11, w: 2.2, d: 1.2, h: 0.15, z: 2.6, fill: SC.roof },
        { x: 23, y: 5, w: 1.6, d: 1.6, h: 1.2, fill: '#F2B84B' }, { x: 26, y: 7, w: 2, d: 0.6, h: 0.6, fill: SC.soft },
        { x: 5, y: 13.6, w: 1.8, d: 3.8, h: 1.3, fill: '#9CB6E8' }, { x: 12.8, y: 13.6, w: 1.8, d: 3.8, h: 1.3, fill: '#D5DBE5' }, { x: 20.6, y: 13.6, w: 1.8, d: 3.8, h: 1.3, fill: '#4A5878' },
      ],
      trees: [{ x: 25, y: 19.5, r: 1.5, h: 4.5 }, { x: 1.2, y: 20, r: 1.2, h: 3.8 }, { x: 28, y: 2.5, r: 1.3, h: 4 }],
      labels: [{ x: 15, y: 18.5, z: 0, t: 'парковка' }, { x: 25.5, y: 9, z: 1.6, t: 'детская площадка' }],
      cams: {
        rect: [2, 4, 21, 11], z: 3.1, clip: [0, 0, 30, 22], L: 8,
        // сначала — над входами в подъезды, потом углы и остальные стены
        order: [['front', 0.27], ['front', 0.6], ['front', 0.92], CORNER.D, CORNER.C, CORNER.B, CORNER.A, ['right', 0.5], ['left', 0.5], ['back', 0.17], ['back', 0.5], ['back', 0.83], ['right', 0.25], ['right', 0.75], ['left', 0.25], ['left', 0.75]],
      },
    },
    in: {
      title: 'Подъезд внутри',
      ground: [{ r: [0, 0, 9, 7], fill: SC.floor }],
      lines: [...tiles(0, 0, 9, 7, 0.8), ceiling(0, 0, 9, 7, 3)],
      boxes: [
        ...room(0, 0, 9, 7, 3),
        ...Array.from({ length: 7 }, (_, i) => ({ x: 6.2, y: 0.2 + i * 0.5, w: 2.6, d: 0.5, h: 0.17 * (i + 1), fill: '#E3E8F0' })), // лестница
        { x: 0.1, y: 3.8, w: 0.5, d: 1.8, h: 0.45, fill: SC.wood }, // скамейка
      ],
      wallDecals: [
        { wall: 'back', u0: 1.2, u1: 2.4, v0: 0, v1: 2.2, fill: '#9AA6BA' }, { wall: 'back', u0: 3.2, u1: 4.4, v0: 0, v1: 2.2, fill: '#9AA6BA' }, // лифты
        ...[0, 1, 2].flatMap((r) => [0, 1, 2, 3].map((c) => ({ wall: 'left', u0: 0.7 + c * 0.55, u1: 1.15 + c * 0.55, v0: 1.1 + r * 0.4, v1: 1.4 + r * 0.4, fill: '#7E8BA3' }))), // почтовые ящики
      ],
      labels: [{ x: 2.8, y: 0.2, z: 2.6, t: 'лифт' }, { x: 7.5, y: 2, z: 1.6, t: 'лестница' }, { x: 0.4, y: 1.6, z: 2.2, t: 'почта' }],
      cams: { rect: [0, 0, 9, 7], z: 2.8, inward: true, clip: [0, 0, 9, 7], L: 5.5 },
    },
    // сцена зависит от числа камер (кабин) — scheme3d.js собирает её через build(n)
    lift: { title: 'Лифт', build: liftScene },
  },
  business: {
    name: 'Коммерческий объект',
    out: {
      title: 'Снаружи',
      ground: [{ r: [0, 0, 20, 16], fill: SC.pave }],
      lines: [...tiles(0, 0, 20, 16, 2)],
      boxes: [{ x: 5, y: 3, w: 10, d: 8, h: 4, fill: SC.wall, decals: [door('+y', 4.3, 5.7, 2.4), win('+y', 1, 3.6, 0.6, 3), win('+y', 6.4, 9, 0.6, 3)] }],
      labels: [{ x: 10, y: 11.6, z: 0, t: 'вход' }],
      cams: { rect: [5, 3, 15, 11], z: 3.5, clip: [0, 0, 20, 16], L: 7 },
    },
    in: {
      title: 'Внутри',
      ground: [{ r: [0, 0, 10, 8], fill: SC.floor }],
      lines: [...tiles(0, 0, 10, 8), ceiling(0, 0, 10, 8, 3)],
      boxes: [...room(0, 0, 10, 8, 3)],
      cams: { rect: [0, 0, 10, 8], z: 2.8, inward: true, clip: [0, 0, 10, 8], L: 6 },
    },
  },
};

// декали на стенах комнаты → на внутренние грани дальних стен
function roomDecals(spec) {
  const back = spec.boxes.find((b) => b.kind === 'wall' && b.d < 0.3 && b.h > 1);
  const left = spec.boxes.find((b) => b.kind === 'wall' && b.w < 0.3 && b.h > 1);
  for (const d of spec.wallDecals || []) {
    const tgt = d.wall === 'back' ? back : left;
    tgt.decals = tgt.decals || [];
    tgt.decals.push({ ...d, face: d.wall === 'back' ? '+y' : '+x', u0: d.u0 + 0.2, u1: d.u1 + 0.2 });
  }
}
for (const k in SCENES) for (const z of ['out', 'in']) roomDecals(SCENES[k][z]);
