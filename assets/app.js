// Страница «Расчёт»: пошаговый выбор → схема в конце, смета справа на всех шагах.
// Цены, планы и расчёт — в data.js.

const state = {
  step: 0,
  picked: [false, false, false, false], // клиент сам выбрал на шагах 1–4 (до этого — рука-подсказка)
  plan: null,
  where: 'out',
  on: Object.fromEntries(Object.keys(PLANS).map((k) => [k, new Set()])),
  extraOut: 0,
  extraIn: 0,
  days: 14,
  cable: 15,
};

const $ = (s) => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
// на телефоне план ужимается вдвое — точки крупнее, чтобы попадать пальцем
const narrow = matchMedia('(max-width: 600px)');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

// ---------- шаги ----------

const icon = (n) => `<img class="o__img" src="assets/icons/${n}.webp" alt="">`;
const art = (svg) => `<span class="o__art" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${svg}</svg></span>`;
const big = (n, unit) => `<span class="o__big" aria-hidden="true"><b>${n}</b>${unit}</span>`;
const camsWord = (n) => `${n} ${plural(n, 'камера', 'камеры', 'камер')}`;
const whereSet = (plan, w) => {
  const b = PLANS[plan].base;
  return new Set(w === 'out' ? b.out : w === 'in' ? b.in : [...b.out, ...b.in]);
};
// камеры, которые получатся при выборе на шагах 2–3 (для подписи на карточке)
const totalWith = (patch) => counts({ ...state, ...patch }).total;

const ART = {
  out: '<path d="M10 30 32 12l22 18"/><path d="M16 26v24h32V26"/><circle cx="52" cy="12" r="5"/><path d="M6 54h52"/>',
  in: '<rect x="10" y="10" width="44" height="44" rx="4"/><path d="M26 54V36h12v18"/><path d="M10 24h44"/>',
  all: '<path d="M4 34 18 22l14 12"/><path d="M8 31v19h20V31"/><rect x="36" y="26" width="24" height="24" rx="3"/><path d="M44 50V40h8v10"/><path d="M2 54h60"/>',
  near: '<circle cx="14" cy="32" r="6"/><path d="M20 32h10"/><rect x="34" y="24" width="18" height="16" rx="3"/>',
  mid: '<circle cx="10" cy="32" r="6"/><path d="M16 32h22"/><rect x="40" y="24" width="18" height="16" rx="3"/>',
  far: '<circle cx="8" cy="32" r="5"/><path d="M13 32h34" stroke-dasharray="4 4"/><rect x="48" y="25" width="14" height="14" rx="3"/>',
};

const STEPS = [
  {
    name: 'Объект',
    q: 'Какой у вас объект?',
    options: () => OBJECTS.map((o) => ({ v: o.plan, on: state.plan === o.plan, html: `${icon(o.icon)}<b>${o.t}</b><small>${o.d}</small>` })),
    pick: (v) => {
      if (state.plan !== v) {
        state.plan = v;
        state.on[v] = whereSet(v, state.where);
        state.cable = PLANS[v].cable;
      }
    },
  },
  {
    name: 'Где камеры',
    q: 'Где нужны камеры?',
    options: () => [
      ['out', 'Снаружи', 'Вокруг здания, вход, двор'],
      ['in', 'Внутри', 'Помещения и входы изнутри'],
      ['all', 'И снаружи, и внутри', 'Полная защита объекта'],
    ].map(([v, t, d]) => ({
      v, on: state.where === v,
      html: `${art(ART[v])}<b>${t}</b><small>${d}</small><span class="o__meta">${camsWord(totalWith({ on: { [state.plan]: whereSet(state.plan, v) } }))}</span>`,
    })),
    pick: (v) => {
      state.where = v;
      state.on[state.plan] = whereSet(state.plan, v);
    },
  },
  {
    name: 'Архив',
    q: 'Сколько дней хранить запись?',
    options: () => [7, 14, 30].map((d) => {
      const e = estimate({ ...state, days: d });
      const disk = e.eq.find((l) => l.name.startsWith('Жёсткий диск'));
      return {
        v: d, on: state.days === d,
        html: `${big(d, plural(d, 'день', 'дня', 'дней'))}<b>${d === 7 ? 'Неделю' : d === 14 ? 'Две недели' : 'Месяц'}</b><small>${disk ? disk.name.replace('Жёсткий диск', 'Диск') + (disk.qty > 1 ? ` × ${disk.qty}` : '') : ''}</small>`,
      };
    }),
    pick: (v) => (state.days = v),
  },
  {
    name: 'Расстояние',
    q: 'Далеко ли камеры от регистратора?',
    options: () => [
      [10, 'near', 'Близко', 'Около 10 м кабеля на камеру'],
      [15, 'mid', 'Средне', 'Около 15 м кабеля на камеру'],
      [25, 'far', 'Далеко', 'Около 25 м кабеля на камеру'],
    ].map(([v, a, t, d]) => ({ v, on: state.cable === v, html: `${art(ART[a])}<b>${t}</b><small>${d}</small>` })),
    pick: (v) => (state.cable = v),
  },
  {
    name: 'Схема',
    q: 'Где поставить камеры?',
  },
];

const HAND = `<div class="hand" aria-hidden="true"><svg width="44" height="44" viewBox="0 0 24 24" fill="#fff" stroke="#0E1218" stroke-width="1.4" stroke-linejoin="round"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-.5V9a1.5 1.5 0 0 1 3 0v1.5m0 0a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.2a5 5 0 0 1-3.9-1.9L4.6 16a1.5 1.5 0 0 1 2.3-1.9L9 16.5V11"/></svg><span>Нажмите на карточку</span></div>`;

const TICK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

function renderStepsBar() {
  $('#stepsBar').innerHTML = STEPS.map((s, i) => {
    const done = i < state.step;
    const reach = i <= state.step || state.picked.slice(0, i).every(Boolean);
    const arrow = i ? `<span class="steps-bar__arrow${done || i === state.step ? ' is-passed' : ''}" aria-hidden="true">${ARROW}</span>` : '';
    return `${arrow}<button type="button" class="${i === state.step ? 'is-now' : done ? 'is-done' : 'is-later'}" data-step="${i}" ${reach ? '' : 'disabled'} ${i === state.step ? 'aria-current="step"' : ''}><b>${done ? TICK : i + 1}</b><span class="steps-bar__name">${s.name}</span></button>`;
  }).join('');
}

function renderStep(animate) {
  const s = STEPS[state.step];
  $('#q').textContent = s.q;
  renderStepsBar();
  const body = $('#stepBody');

  if (s.options) {
    const opts = s.options();
    const picked = state.picked[state.step];
    body.innerHTML = `<div class="choices">${opts.map((o, i) =>
      `<button type="button" class="o" data-v="${o.v}" aria-pressed="${picked && o.on}"><span class="o__ribbon">✓ Выбрано</span><span class="o__check"></span>${o.html}${!picked && i === 0 ? HAND : ''}</button>`).join('')}</div>`;
  } else {
    body.innerHTML = `
      <div class="monitor">
        <div class="monitor__bar" aria-hidden="true"><span><span class="rec"></span><span id="planName"></span></span></div>
        <svg id="plan" class="plan" viewBox="0 0 640 440" role="group" aria-label="План объекта: нажмите на точку, чтобы поставить или убрать камеру"></svg>
      </div>
      <div class="opt extras">
        <div class="opt__label">Ещё камеры, которых нет на схеме</div>
        <div class="steppers">
          ${[['extraOut', 'Уличные', 'уличную'], ['extraIn', 'Внутренние', 'внутреннюю']].map(([k, t, w]) => `
          <div class="stepper" data-key="${k}">
            <span>${t}</span>
            <button type="button" data-d="-1" aria-label="Убрать ${w} камеру">−</button>
            <output>${state[k]}</output>
            <button type="button" data-d="1" aria-label="Добавить ${w} камеру">+</button>
          </div>`).join('')}
        </div>
      </div>`;
    renderPlan();
  }

  const last = state.step === STEPS.length - 1;
  $('#back').hidden = state.step === 0;
  const next = $('#next');
  next.hidden = last;
  next.disabled = !last && !state.picked[state.step];

  if (animate) {
    body.classList.remove('is-in');
    void body.offsetWidth;
    body.classList.add('is-in');
    const top = $('#wiz').getBoundingClientRect().top;
    if (top < 0) $('#wiz').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }
}

function go(step) {
  state.step = Math.max(0, Math.min(STEPS.length - 1, step));
  renderStep(true);
  renderSmeta();
}

$('#stepBody').addEventListener('click', (e) => {
  const o = e.target.closest('.o');
  if (o) {
    const s = STEPS[state.step];
    const raw = o.dataset.v;
    s.pick(isNaN(+raw) ? raw : +raw);
    state.picked[state.step] = true;
    // перерисовать карточки (подписи зависят от выбора), выбранную — с анимацией
    renderStep();
    const again = $(`#stepBody .o[data-v="${raw}"]`);
    if (again) { again.classList.add('is-pop'); again.focus({ preventScroll: true }); }
    renderSmeta();
    return;
  }
  const b = e.target.closest('.stepper button');
  if (b) {
    const key = b.closest('.stepper').dataset.key, d = +b.dataset.d;
    if (d > 0 && !canAdd()) return;
    state[key] = Math.max(0, state[key] + d);
    b.closest('.stepper').querySelector('output').textContent = state[key];
    renderSmeta();
  }
});

$('#stepsBar').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-step]');
  if (b && !b.disabled) go(+b.dataset.step);
});
$('#next').addEventListener('click', () => go(state.step + 1));
$('#back').addEventListener('click', () => go(state.step - 1));

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
  const svg = $('#plan');
  if (!svg || !state.plan) return;
  const plan = PLANS[state.plan];
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
      renderPlan();
      renderSmeta();
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
  const step = (t) => {
    const k = reduceMotion.matches ? 1 : Math.min(1, (t - t0) / 380);
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
  const e = state.plan ? estimate(state) : { c: { total: 0 }, eq: [], work: [], total: 0 };
  $('#lines').innerHTML = e.c.total
    ? [...e.eq, ...e.work].map(lineHtml).join('')
    : `<p class="smeta__empty">${state.plan ? 'Камер пока нет — отметьте их на схеме.' : 'Выберите объект — здесь появится смета.'}</p>`;
  animateTotal(e.total);

  const href = waLink(e);
  $('#send').href = href;
  $('#mSend').href = href;
  $('#send').classList.toggle('is-disabled', !e.c.total);
}

function waLink(e) {
  if (!e.c.total) return `https://wa.me/${WA_PHONE}?text=${encodeURIComponent('Здравствуйте! Хочу поставить видеонаблюдение.')}`;
  const plan = PLANS[state.plan];
  const obj = OBJECTS.find((o) => o.plan === state.plan);
  const places = [...state.on[state.plan]].sort((a, b) => a - b).map((i) => plan.slots[i].l);
  const extra = state.extraOut + state.extraIn ? ` + ещё ${state.extraOut + state.extraIn} не на схеме` : '';
  const text = [
    'Здравствуйте! Посчитал(а) на сайте видеонаблюдение.',
    `Объект: ${obj ? obj.t.toLowerCase() : plan.tab}`,
    `Камер: ${e.c.total} (уличных ${e.c.out}, внутренних ${e.c.inn})`,
    places.length ? `Где: ${places.join(', ')}${extra}` : '',
    `Архив: ${state.days} дней, кабель ~${state.cable} м на камеру`,
    `Предварительно: ${fmt(e.total)}`,
    'Хочу точный расчёт.',
  ].filter(Boolean).join('\n');
  return `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(text)}`;
}

// ?kit=N — пришли со страницы «Комплекты»: сразу на схему с камерами комплекта
function applyKitFromUrl() {
  const n = new URLSearchParams(location.search).get('kit');
  const k = n === null ? null : KITS[+n];
  if (!k) return;
  state.plan = k.plan;
  state.on[k.plan] = new Set(k.on);
  const b = PLANS[k.plan].base;
  state.where = k.on.some((i) => b.in.includes(i)) ? 'all' : 'out';
  state.cable = PLANS[k.plan].cable;
  state.picked = [true, true, true, true];
  state.step = STEPS.length - 1;
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

// мобильная панель с итогом — пока смета не на экране
const mbar = $('.mbar');
function syncBar() {
  const r = $('.smeta').getBoundingClientRect();
  mbar.classList.toggle('is-on', !!state.plan && window.scrollY > 200 && (r.top > innerHeight || r.bottom < 0));
}
addEventListener('scroll', syncBar, { passive: true });
addEventListener('resize', syncBar);
narrow.addEventListener('change', () => renderPlan());

applyKitFromUrl();
renderStep();
renderSmeta();
