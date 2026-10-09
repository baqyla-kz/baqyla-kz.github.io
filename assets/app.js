// Страница «Расчёт»: план объекта и смета. Цены и расчёт — в data.js.

const state = {
  plan: 'home',
  on: { home: new Set(KITS[0].on), business: new Set(), farm: new Set() },
  extraOut: 0,
  extraIn: 0,
  days: 14,
  cable: 15,
};

const $ = (s) => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
// на телефоне план ужимается вдвое — точки крупнее, чтобы попадать пальцем
const narrow = matchMedia('(max-width: 600px)');

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
  if (counts(state).total < PRICE.maxCams) return true;
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
  const e = estimate(state);
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

// ?kit=N — пришли со страницы «Комплекты»
function applyKitFromUrl() {
  const k = KITS[+new URLSearchParams(location.search).get('kit')];
  if (!k) return;
  state.on[k.plan] = new Set(k.on);
  state.plan = k.plan;
  state.cable = PLANS[k.plan].cable;
  history.replaceState(null, '', location.pathname);
}

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

applyKitFromUrl();
update(true);
