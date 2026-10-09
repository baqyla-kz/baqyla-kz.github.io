// Калькулятор Baqyla. Цены и комплекты совпадают с CRM (~/dev/baqyla-crm/src/lib/seed.ts):
// комплект «Дом» здесь даёт те же 209 800 ₸ оборудования + 63 000 ₸ работы.
// Поменять цены — только в PRICE ниже.

const WA_PHONE = '77089804260';

const PRICE = {
  camOut: { name: 'Уличная камера 4 Мп ColorVu', price: 28000 },
  camIn: { name: 'Камера-турель 4 Мп', price: 23800 },
  nvr: [
    { ch: 4, name: 'Регистратор 4 канала с PoE', price: 37000 },
    { ch: 8, name: 'Регистратор 8 каналов с PoE', price: 57800 },
    { ch: 16, name: 'Регистратор 16 каналов с PoE', price: 110000 }, // нет в CRM — уточнить
  ],
  hdd: [
    { tb: 1, price: 22000 }, // нет в CRM — уточнить
    { tb: 2, price: 30000 },
    { tb: 4, price: 45000 },
    { tb: 6, price: 62000 }, // нет в CRM — уточнить
    { tb: 8, price: 78000 }, // нет в CRM — уточнить
  ],
  cable: { name: 'Кабель UTP Cat.5e', price: 250 },
  conduit: { name: 'Гофра 20 мм', price: 150 },
  rj45: { name: 'Коннектор RJ45', price: 100, perCam: 2 },
  box: { name: 'Распаячная коробка', price: 1500, perCam: 1 },
  labor: { name: 'Монтаж камер', price: 12000 },
  setup: { name: 'Пусконаладка и настройка телефона', price: 15000 },
  gbPerCamDay: 30, // 4 Мп, H.265, запас на движение
  maxCams: 16,
};

// План: x/y — точка крепления, a — куда смотрит камера (градусы, 0 = вправо, 90 = вниз).
const PLANS = {
  home: {
    tab: 'Дом',
    title: 'ДОМ',
    cable: 15,
    draw: `
      <path class="p-fence" d="M260 420 H20 V20 H620 V420 H360"/>
      <text class="p-label" x="310" y="434" text-anchor="middle">ВОРОТА</text>
      <path class="p-drive" d="M270 420 V290 M350 420 V290"/>
      <rect class="p-build" x="210" y="120" width="220" height="150"/>
      <path class="p-wall" d="M300 120 V200 M300 230 V270 M300 200 H360 M390 200 H430"/>
      <text class="p-label" x="320" y="105" text-anchor="middle">ДОМ</text>
      <rect class="p-build p-build--minor" x="50" y="50" width="90" height="64"/>
      <text class="p-label" x="95" y="87" text-anchor="middle">БАНЯ</text>
      <rect class="p-build p-build--minor" x="480" y="300" width="110" height="88"/>
      <text class="p-label" x="535" y="349" text-anchor="middle">ГАРАЖ</text>
    `,
    slots: [
      { x: 210, y: 120, a: 225, t: 'out', l: 'угол дома' },
      { x: 430, y: 120, a: 315, t: 'out', l: 'угол дома' },
      { x: 430, y: 270, a: 45, t: 'out', l: 'угол дома' },
      { x: 210, y: 270, a: 135, t: 'out', l: 'угол дома' },
      { x: 320, y: 270, a: 90, t: 'out', l: 'въезд и ворота' },
      { x: 285, y: 120, a: 270, t: 'out', l: 'задний двор' },
      { x: 222, y: 200, a: 0, t: 'in', l: 'прихожая' },
      { x: 375, y: 132, a: 90, t: 'in', l: 'гостиная' },
    ],
  },
  business: {
    tab: 'Бизнес',
    title: 'МАГАЗИН',
    cable: 15,
    draw: `
      <rect class="p-street" x="0" y="392" width="640" height="48"/>
      <text class="p-label" x="320" y="421" text-anchor="middle">УЛИЦА</text>
      <path class="p-fence" d="M20 60 V380 H130"/>
      <path class="p-drive" d="M40 300 H130 M40 250 H130 M40 200 H130"/>
      <text class="p-label" x="74" y="190" text-anchor="middle">ПАРКОВКА</text>
      <rect class="p-build" x="150" y="60" width="420" height="280"/>
      <path class="p-wall" d="M440 60 V140 M440 170 V190 H570 M150 280 H200 M230 280 H260 V340"/>
      <text class="p-label" x="320" y="185" text-anchor="middle">ТОРГОВЫЙ ЗАЛ</text>
      <text class="p-label" x="505" y="130" text-anchor="middle">СКЛАД</text>
      <text class="p-label" x="205" y="316" text-anchor="middle">КАССА</text>
      <path class="p-door" d="M340 340 H390"/>
    `,
    slots: [
      { x: 365, y: 340, a: 90, t: 'out', l: 'вход' },
      { x: 150, y: 340, a: 150, t: 'out', l: 'парковка' },
      { x: 570, y: 60, a: 315, t: 'out', l: 'разгрузка' },
      { x: 570, y: 340, a: 45, t: 'out', l: 'угол здания' },
      { x: 162, y: 72, a: 40, t: 'in', l: 'торговый зал' },
      { x: 428, y: 200, a: 150, t: 'in', l: 'торговый зал' },
      { x: 250, y: 292, a: 180, t: 'in', l: 'касса' },
      { x: 452, y: 72, a: 40, t: 'in', l: 'склад' },
    ],
  },
  farm: {
    tab: 'Хозяйство',
    title: 'КРЕСТЬЯНСКОЕ ХОЗЯЙСТВО',
    cable: 25,
    draw: `
      <path class="p-fence" d="M520 420 H20 V20 H620 V420 H600"/>
      <text class="p-label" x="560" y="434" text-anchor="middle">ВОРОТА</text>
      <rect class="p-build" x="60" y="60" width="280" height="110"/>
      <path class="p-wall" d="M130 60 V170 M200 60 V170 M270 60 V170"/>
      <text class="p-label" x="200" y="48" text-anchor="middle">КОРОВНИК</text>
      <rect class="p-build p-build--minor" x="400" y="60" width="180" height="90"/>
      <text class="p-label" x="490" y="110" text-anchor="middle">СКЛАД КОРМОВ</text>
      <rect class="p-pen" x="60" y="220" width="280" height="150"/>
      <text class="p-label" x="200" y="300" text-anchor="middle">ЗАГОН</text>
      <rect class="p-build p-build--minor" x="430" y="250" width="110" height="80"/>
      <text class="p-label" x="485" y="294" text-anchor="middle">СТОРОЖКА</text>
    `,
    slots: [
      { x: 540, y: 330, a: 50, t: 'out', l: 'ворота' },
      { x: 60, y: 370, a: 315, t: 'out', l: 'загон' },
      { x: 580, y: 150, a: 60, t: 'out', l: 'двор' },
      { x: 430, y: 250, a: 210, t: 'out', l: 'техника' },
      { x: 200, y: 170, a: 90, t: 'out', l: 'вход в коровник' },
      { x: 72, y: 115, a: 0, t: 'in', l: 'коровник' },
      { x: 328, y: 115, a: 180, t: 'in', l: 'коровник' },
      { x: 412, y: 105, a: 0, t: 'in', l: 'склад кормов' },
    ],
  },
};

const KITS = [
  { name: 'Дом', plan: 'home', on: [0, 1, 2, 3], text: 'Четыре уличные камеры по углам дома' },
  { name: 'Дом+', plan: 'home', on: [0, 1, 2, 3, 4, 5], text: 'Шесть камер: углы дома, въезд и задний двор' },
  { name: 'Бизнес', plan: 'business', on: [0, 1, 2, 3, 4, 5, 6, 7], text: 'Улица и торговый зал: восемь камер' },
];

const state = {
  plan: 'home',
  on: { home: new Set(KITS[0].on), business: new Set(), farm: new Set() },
  extraOut: 0,
  extraIn: 0,
  days: 14,
  cable: 15,
};

const $ = (s) => document.querySelector(s);
const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₸';
const NS = 'http://www.w3.org/2000/svg';
// на телефоне план ужимается вдвое — точки крупнее, чтобы попадать пальцем
const narrow = matchMedia('(max-width: 600px)');

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

// ---------- расчёт ----------

function counts(s = state) {
  const plan = PLANS[s.plan];
  let out = s.extraOut, inn = s.extraIn;
  for (const i of s.on[s.plan]) plan.slots[i].t === 'out' ? out++ : inn++;
  return { out, inn, total: out + inn };
}

function estimate(s = state) {
  const c = counts(s);
  const eq = [], work = [];
  if (!c.total) return { c, eq, work, total: 0 };
  const add = (list, name, qty, unit, price) => qty > 0 && list.push({ name, qty, unit, price, sum: qty * price });

  add(eq, PRICE.camOut.name, c.out, 'шт', PRICE.camOut.price);
  add(eq, PRICE.camIn.name, c.inn, 'шт', PRICE.camIn.price);

  const nvr = PRICE.nvr.find((r) => r.ch >= c.total) || PRICE.nvr[PRICE.nvr.length - 1];
  add(eq, nvr.name, 1, 'шт', nvr.price);

  const needTb = (c.total * s.days * PRICE.gbPerCamDay) / 1000;
  const disk = PRICE.hdd.find((d) => d.tb >= needTb);
  if (disk) add(eq, `Жёсткий диск ${disk.tb} ТБ`, 1, 'шт', disk.price);
  else {
    const big = PRICE.hdd[PRICE.hdd.length - 1];
    add(eq, `Жёсткий диск ${big.tb} ТБ`, Math.ceil(needTb / big.tb), 'шт', big.price);
  }

  const meters = c.total * s.cable;
  add(eq, PRICE.cable.name, meters, 'м', PRICE.cable.price);
  add(eq, PRICE.rj45.name, c.total * PRICE.rj45.perCam, 'шт', PRICE.rj45.price);
  add(eq, PRICE.box.name, c.total * PRICE.box.perCam, 'шт', PRICE.box.price);
  add(eq, PRICE.conduit.name, meters, 'м', PRICE.conduit.price);

  add(work, PRICE.labor.name, c.total, 'усл', PRICE.labor.price);
  add(work, PRICE.setup.name, 1, 'усл', PRICE.setup.price);

  const total = [...eq, ...work].reduce((a, l) => a + l.sum, 0);
  return { c, eq, work, total, diskTb: disk ? disk.tb : null };
}

// ---------- план ----------

function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  parent && parent.appendChild(n);
  return n;
}

function cone(r, half) {
  const rad = (d) => (d * Math.PI) / 180;
  const x1 = r * Math.cos(rad(-half)), y1 = r * Math.sin(rad(-half));
  const x2 = r * Math.cos(rad(half)), y2 = r * Math.sin(rad(half));
  return `M0 0 L${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
}

function renderPlan() {
  const plan = PLANS[state.plan];
  const svg = $('#plan');
  svg.innerHTML = `
    <defs>
      <clipPath id="plot"><rect x="0" y="0" width="640" height="440"/></clipPath>
    </defs>
    <g class="p-draw">${plan.draw}</g>
    <g class="p-cones" clip-path="url(#plot)"></g>
    <g class="p-slots"></g>`;
  const cones = svg.querySelector('.p-cones');
  const slots = svg.querySelector('.p-slots');
  const on = state.on[state.plan];

  plan.slots.forEach((s, i) => {
    const active = on.has(i);
    if (active) {
      const r = s.t === 'out' ? 150 : 95;
      const g = el('g', { transform: `translate(${s.x} ${s.y}) rotate(${s.a})`, class: 'p-cone' }, cones);
      el('path', { d: cone(r, 32), fill: `url(#beam-${i})` }, g);
      const grad = el('radialGradient', { id: `beam-${i}`, cx: 0, cy: 0, r, gradientUnits: 'userSpaceOnUse' }, svg.querySelector('defs'));
      el('stop', { offset: 0, 'stop-color': 'var(--signal)', 'stop-opacity': s.t === 'out' ? 0.5 : 0.42 }, grad);
      el('stop', { offset: 1, 'stop-color': 'var(--signal)', 'stop-opacity': 0 }, grad);
    }
    const n = String(i + 1).padStart(2, '0');
    const g = el('g', {
      'data-i': i,
      class: `p-slot p-slot--${s.t}${active ? ' is-on' : ''}`,
      transform: `translate(${s.x} ${s.y}) scale(${narrow.matches ? 1.7 : 1})`,
      tabindex: 0,
      role: 'switch',
      'aria-checked': active,
      'aria-label': `${s.t === 'out' ? 'Уличная' : 'Внутренняя'} камера: ${s.l}`,
    }, slots);
    el('circle', { r: 22, class: 'p-hit' }, g);
    el('circle', { r: 11, class: 'p-ring' }, g);
    el('path', { d: active ? 'M-4.5 0 a4.5 4.5 0 1 0 9 0 a4.5 4.5 0 1 0 -9 0' : 'M-4.5 0 H4.5 M0 -4.5 V4.5', class: 'p-mark' }, g);
    const lx = s.x > 470 ? -16 : 16;
    const ly = s.y < 60 ? 24 : -14;
    const anchor = lx < 0 ? 'end' : 'start';
    // у включённой камеры — только номер, полное имя — при наведении (иначе подписи слипаются)
    el('text', { x: lx * 0.95, y: ly + 2, class: 'p-num', 'text-anchor': anchor }, g).textContent = n;
    el('text', { x: lx, y: ly, class: 'p-tag', 'text-anchor': anchor }, g).textContent = `КАМ ${n} · ${s.l}`;
    const toggle = () => {
      on.has(i) ? on.delete(i) : canAdd() && on.add(i);
      update();
      const again = svg.querySelector(`.p-slot[data-i="${i}"]`);
      again && again.focus();
    };
    g.addEventListener('mouseenter', () => slots.lastChild !== g && slots.appendChild(g)); // подпись поверх соседних точек
    g.addEventListener('click', toggle);
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
  $('#planName').textContent = `ПЛАН · ${plan.title}`;
}

function canAdd() {
  if (counts().total < PRICE.maxCams) return true;
  toast(`Больше ${PRICE.maxCams} камер посчитаем отдельно — напишите нам`);
  return false;
}

// ---------- смета ----------

let shown = 0, raf = 0;
function animateTotal(to) {
  cancelAnimationFrame(raf);
  const from = shown, t0 = performance.now();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const step = (t) => {
    const k = reduce ? 1 : Math.min(1, (t - t0) / 380);
    shown = from + (to - from) * (1 - Math.pow(1 - k, 3));
    $('#total').textContent = fmt(shown);
    $('#mTotal').textContent = fmt(shown);
    if (k < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

function lineHtml(l) {
  return `<div class="ln"><span class="ln__name">${l.name}</span><span class="ln__qty">${l.qty} ${l.unit} × ${fmt(l.price)}</span><span class="ln__sum">${fmt(l.sum)}</span></div>`;
}

function renderSmeta() {
  const e = estimate();
  const { c } = e;
  if (!c.total) {
    $('#summary').textContent = 'Камер пока нет';
    $('#lines').innerHTML = '<p class="smeta__empty">Нажмите на точку на плане — камера встанет туда, и здесь появится смета.</p>';
  } else {
    const parts = [];
    if (c.out) parts.push(`${c.out} уличн.`);
    if (c.inn) parts.push(`${c.inn} внутр.`);
    $('#summary').textContent = `${c.total} ${plural(c.total, 'камера', 'камеры', 'камер')} (${parts.join(', ')}) · архив ${state.days} дн.`;
    const sum = (list) => list.reduce((a, l) => a + l.sum, 0);
    $('#lines').innerHTML = `
      <div class="grp"><span>Оборудование</span><span>${fmt(sum(e.eq))}</span></div>
      ${e.eq.map(lineHtml).join('')}
      <div class="grp"><span>Работа</span><span>${fmt(sum(e.work))}</span></div>
      ${e.work.map(lineHtml).join('')}`;
  }
  animateTotal(e.total);

  const href = waLink(e);
  $('#send').href = href;
  $('#mSend').href = href;
  $('#send').classList.toggle('is-disabled', !c.total);
}

function waLink(e) {
  const plan = PLANS[state.plan];
  if (!e.c.total) return `https://wa.me/${WA_PHONE}?text=${encodeURIComponent('Здравствуйте! Хочу поставить видеонаблюдение.')}`;
  const places = [...state.on[state.plan]].sort((a, b) => a - b).map((i) => plan.slots[i].l);
  const extra = state.extraOut + state.extraIn ? ` + ещё ${state.extraOut + state.extraIn} не на плане` : '';
  const text = [
    'Здравствуйте! Посчитал(а) на сайте видеонаблюдение.',
    `Объект: ${plan.tab.toLowerCase()}`,
    `Камер: ${e.c.total} (уличных ${e.c.out}, внутренних ${e.c.inn})`,
    places.length ? `Где: ${places.join(', ')}${extra}` : '',
    `Архив: ${state.days} дней, кабель ~${state.cable} м на камеру`,
    `Предварительно: ${fmt(e.total)}`,
    'Хочу точный расчёт.',
  ].filter(Boolean).join('\n');
  return `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(text)}`;
}

// ---------- управление ----------

function renderTabs() {
  $('#tabs').innerHTML = Object.entries(PLANS).map(([k, p]) =>
    `<button type="button" role="tab" data-k="${k}" aria-selected="${k === state.plan}">${p.tab}</button>`).join('');
}

function setPlan(k, keepCable) {
  if (state.plan !== k && !keepCable) state.cable = PLANS[k].cable;
  state.plan = k;
  update(true);
}

function update(full) {
  if (full) {
    renderTabs();
    $('#cable').value = state.cable;
  }
  renderPlan();
  $('#cableOut').textContent = `${state.cable} м`;
  document.querySelectorAll('.stepper').forEach((s) => (s.querySelector('output').textContent = state[s.dataset.key]));
  document.querySelectorAll('#archive button').forEach((b) => b.setAttribute('aria-checked', +b.dataset.v === state.days));
  renderSmeta();
}

$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  b && setPlan(b.dataset.k);
});

document.querySelectorAll('.stepper').forEach((s) => s.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const d = +b.dataset.d, key = s.dataset.key;
  if (d > 0 && !canAdd()) return;
  state[key] = Math.max(0, state[key] + d);
  update();
}));

$('#archive').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  state.days = +b.dataset.v;
  update();
});

$('#cable').addEventListener('input', (e) => {
  state.cable = +e.target.value;
  update();
});

function renderKits() {
  $('#kitsList').innerHTML = KITS.map((k, i) => {
    const s = { ...state, plan: k.plan, on: { [k.plan]: new Set(k.on) }, extraOut: 0, extraIn: 0, days: 14, cable: PLANS[k.plan].cable };
    const e = estimate(s);
    return `
      <article class="kit">
        <div class="kit__top"><h3>${k.name}</h3><span class="kit__n">${e.c.total} ${plural(e.c.total, 'камера', 'камеры', 'камер')}</span></div>
        <p>${k.text}. Архив 14 дней, диск ${e.diskTb} ТБ, настройка телефона.</p>
        <div class="kit__price">${fmt(e.total)}</div>
        <button type="button" class="btn btn--ghost btn--block" data-kit="${i}">Открыть в расчёте</button>
      </article>`;
  }).join('');
}

$('#kitsList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-kit]');
  if (!b) return;
  const k = KITS[+b.dataset.kit];
  state.on[k.plan] = new Set(k.on);
  state.extraOut = state.extraIn = 0;
  state.days = 14;
  state.cable = PLANS[k.plan].cable;
  setPlan(k.plan, true);
  $('#calc').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});

// ---------- мелочи ----------

let toastTimer;
function toast(msg) {
  let t = $('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-on'), 3200);
}

function tick() {
  const d = new Date(), p = (n) => String(n).padStart(2, '0');
  $('#clock').textContent = `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
tick();
setInterval(tick, 1000);

// мобильная панель с итогом — пока смета не на экране
const mbar = $('.mbar');
function syncBar() {
  const r = $('.smeta').getBoundingClientRect();
  mbar.classList.toggle('is-on', window.scrollY > 200 && (r.top > innerHeight || r.bottom < 0));
}
addEventListener('scroll', syncBar, { passive: true });
addEventListener('resize', syncBar);
narrow.addEventListener('change', () => renderPlan());

renderKits();
update(true);
