// Страница «Расчёт»: пошаговый выбор → схема в конце, смета справа на всех шагах.
// Цены, планы и расчёт — в data.js.

const fresh = () => ({
  step: 0,
  picked: [false, false, false], // клиент сам выбрал на шагах 1–3 (до этого — рука-подсказка)
  plan: null,
  on: Object.fromEntries(Object.keys(PLANS).map((k) => [k, new Set()])),
  extraOut: 0,
  extraIn: 0,
  store: null, // носитель записи: 'sd' | '2x1' (диск 2 ТБ) | '8x2' (два по 8 ТБ)…, см. storeOptions в data.js; null — не выбран, в смете без носителя
  net: null, // интернет на объекте: 'yes' | 'no' | null — ещё не ответили
  cable: 15, // метров кабеля на камеру — по объекту (PLANS[…].cable), клиент не выбирает
  addons: [], // «Дополнительно» на шаге «Схема»: id из ADDONS (data.js)
});
const state = fresh();

const $ = (s) => document.querySelector(s);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

// ---------- шаги ----------

// иконка карточки: обёртка парит, внутри — картинка с бликом (маска по форме иконки), при наведении приподнимается
const icon = (n) => { const src = `assets/icons/${n}.webp`; return `<span class="o__img o__ic"><span class="o__pic"><img src="${src}" alt=""><i class="o__glare" style="-webkit-mask-image:url(${src});mask-image:url(${src})"></i></span></span>`; };
// Wi‑Fi: второй слой той же картинки — по нему «бежит» сигнал от точки к дугам (маска в CSS)
const netIcon = (n) => `<span class="o__img o__net o__net--${n}"><img src="assets/icons/${n}.webp" alt="">${n === 'wifi' ? `<img src="assets/icons/${n}.webp" alt="">` : ''}</span>`;
const camsWord = (n) => `${n} ${plural(n, 'камера', 'камеры', 'камер')}`;
const CAM_IMG = '<img src="assets/icons/camera.webp" alt="">';


const STEPS = [
  {
    name: 'Объект',
    q: 'Какой у вас объект?',
    options: () => OBJECTS.map((o) => ({ v: o.plan, on: state.plan === o.plan, html: `${icon(o.icon)}<b>${t(o.t)}</b><small>${t(o.d)}</small>` })),
    pick: (v) => {
      if (state.plan !== v) {
        state.plan = v;
        state.on[v] = new Set(); // по умолчанию камер нет — клиент сам ставит «+» на шаге «Камеры»
        state.extraOut = state.extraIn = 0;
        state.cable = PLANS[v].cable;
      }
    },
  },
  {
    name: 'Камеры',
    q: 'Сколько камер и где?',
    ready: () => counts(state).total > 0, // «Дальше» — как только есть хоть одна камера
    render: () => renderZones(),
  },
  {
    name: 'Запись и интернет',
    q: 'Сколько дней хранить запись с камер?',
    // карточка = носитель; крупно — сколько дней примерно хватит при выбранном числе камер
    options: () => {
      const n = counts(state).total, cur = state.store;
      return storeOptions(state).map((o) => {
        const r = daysRange(storeDays(o, n));
        const pics = o.sd ? 1 : o.tb >= 2 || o.qty > 1 ? 2 : 1; // от 2 ТБ — две иконки диска
        return {
          v: o.key, on: cur === o.key,
          html: `<span class="o__big o__big--store" aria-hidden="true"><span class="o__media o__media--${o.sd ? 'sd' : 'hdd'}">${`<img src="assets/icons/${o.sd ? 'sd' : 'hdd'}.webp" alt="">`.repeat(pics)}</span><span class="o__days">${L('хранить', 'сақтайды')}<b>${r.num}</b>${r.unit}</span></span>`
            + (o.sd ? `<b>${L(`Карта памяти ${PRICE.sd.gb} ГБ`, `${PRICE.sd.gb} ГБ жад картасы`)}</b><small>${L('В каждой камере, без регистратора', 'Әр камераның ішінде, регистраторсыз')}</small>`
              : `<b>${diskLabel(o)}</b><small>${L(`В регистраторе, на ${n} ${plural(n, 'камеру', 'камеры', 'камер')}`, `Регистраторда, ${n} камераға`)}</small>`),
        };
      });
    },
    // носитель — по желанию: повторное нажатие снимает выбор
    isSet: () => state.store !== null,
    pick: (v) => { state.store = state.store === v ? null : v; },
    // второй вопрос на том же шаге; на цену пока не влияет — уходит в сообщение и пояснение под сметой
    more: {
      q: 'Есть интернет на объекте?',
      options: () => [
        ['yes', 'wifi', state.plan === 'business' ? 'На объекте есть интернет' : 'В доме есть интернет', 'Камеры можно смотреть с телефона откуда угодно'],
        ['no', 'wifi-off', 'Нет интернета', 'Запись сохраняется, смотреть — на месте'],
      ].map(([v, ic, tt, d]) => ({ v, on: state.net === v, html: `${netIcon(ic)}<b>${t(tt)}</b><small>${t(d)}</small>` })),
      isSet: () => state.net !== null,
      pick: (v) => (state.net = v),
    },
    ready: () => state.net !== null, // обязателен только ответ про интернет
  },
  {
    name: 'Схема',
    q: 'Примерная схема установки',
    render: () => renderScheme(),
    after: () => drawScheme(),
  },
];


const TICK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
// пунктир со стрелкой: впереди пунктир, пройденный участок — сплошная синяя линия
const ARROW = '<svg viewBox="0 0 44 14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path class="steps-bar__line" d="M2 7h34"/><path d="M34 2l6 5-6 5"/></svg>';

function renderStepsBar() {
  $('#stepsBar').innerHTML = STEPS.map((s, i) => {
    const done = i < state.step;
    const reach = i <= state.step || state.picked.slice(0, i).every(Boolean);
    const arrow = i ? `<span class="steps-bar__arrow${done || i === state.step ? ' is-passed' : ''}" aria-hidden="true">${ARROW}</span>` : '';
    return `${arrow}<button type="button" class="${i === state.step ? 'is-now' : done ? 'is-done' : 'is-later'}" data-step="${i}" ${reach ? '' : 'disabled'} ${i === state.step ? 'aria-current="step"' : ''}><b>${done ? TICK : i + 1}</b><span class="steps-bar__name">${t(s.name)}</span></button>`;
  }).join('');
}

function renderStep(animate) {
  const s = STEPS[state.step];
  $('#q').textContent = t(s.q);
  renderStepsBar();
  const body = $('#stepBody');

  if (s.render) {
    body.innerHTML = s.render();
    s.after && s.after();
  } else {
    const group = (g, id) => {
      const set = g.isSet ? g.isSet() : state.picked[state.step];
      return `<div class="choices${id === 'more' ? ' choices--more' : ''}" data-group="${id}">${g.options().map((o) =>
        `<button type="button" class="o" data-v="${o.v}" aria-pressed="${set && o.on}"><span class="o__ribbon">✓ ${L('Выбрано', 'Таңдалды')}</span><span class="o__check"></span>${o.html}</button>`).join('')}</div>`;
    };
    body.innerHTML = group(s, 'main') + (s.more ? `<h3 class="q q--sub">${t(s.more.q)}</h3>${group(s.more, 'more')}` : '');
  }

  // подсказка у вопроса — только на первом шаге, пока объект не выбран; дальше уже понятно, что карточки нажимаются
  const hint = state.step === 0;
  $('#hint').classList.toggle('is-on', hint && !state.picked[0]);
  $('#hint').hidden = !hint;

  const last = state.step === STEPS.length - 1;
  $('#adds').hidden = !last;
  if (last) $('#adds').innerHTML = renderAddons();
  $('#back').hidden = state.step === 0;
  const next = $('#next');
  next.hidden = last;
  next.disabled = !last && !(s.ready ? s.ready() : state.picked[state.step]);

  if (animate) {
    body.classList.remove('is-in');
    void body.offsetWidth;
    body.classList.add('is-in');
    const top = $('#wiz').getBoundingClientRect().top;
    if (top < 0) $('#wiz').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth' });
  }
}

// подсказка «схему можно крутить»: при каждом входе на шаг «Схема» через 5 с схема сама дважды покачивается
// туда-обратно, внизу подпись — всегда; если клиент в это время сам взялся за схему — покачивание останавливается
let hintTimer = 0, schemeTouched = false;
const touch = matchMedia('(pointer: coarse)');
function schemeHint() {
  clearTimeout(hintTimer);
  if (state.step !== STEPS.length - 1) return;
  hintTimer = setTimeout(() => {
    if (state.step !== STEPS.length - 1 || !window.Scheme3D) return;
    schemeTouched = false;
    for (const k of ['out', 'in']) if ($(`#sch-${k}`)) wobble(k, $(`#sch-${k}`));
  }, 5000);
}
function wobble(k, el) {
  const c = Scheme3D.stage(k).controls, t0 = performance.now(), dur = 3200;
  const tip = document.createElement('div');
  tip.className = 'sch__hint';
  tip.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/></svg>${touch.matches ? L('Схему можно вращать пальцем и приближать двумя', 'Схеманы саусақпен айналдырып, екі саусақпен жақындатуға болады') : L('Схему можно вращать мышью и приближать', 'Схеманы тышқанмен айналдырып, жақындатуға болады')}`;
  el.append(tip);
  requestAnimationFrame(() => tip.classList.add('is-on'));
  const done = () => { c.autoRotate = false; tip.classList.remove('is-on'); setTimeout(() => tip.remove(), 400); };
  if (reduceMotion.matches) { setTimeout(done, 4000); return; } // без анимации — только подпись
  c.autoRotate = true;
  const step = (now) => {
    const t = (now - t0) / dur;
    if (schemeTouched || !el.isConnected) return done();
    if (t >= 1) { c.autoRotate = false; setTimeout(done, 2500); return; }
    c.autoRotateSpeed = Math.sin(t * Math.PI * 4) * 9; // два качания, в конце — на прежнем месте
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
$('#stepBody').addEventListener('pointerdown', (e) => { if (e.target.closest('.sch')) schemeTouched = true; });

// шаг назад (кнопкой «Назад» или по полосе шагов) — всё, что выбрано на шагах после того, куда вернулись,
// сбрасывается, как при первом заходе: выбор на самом этом шаге остаётся
function resetAfter(step) {
  if (step < 1) { // «Камеры»: снова 0 камер, смета — цена за одну камеру
    Object.assign(state, { on: fresh().on, extraOut: 0, extraIn: 0 });
    if (state.plan) state.cable = PLANS[state.plan].cable;
    state.picked[1] = false;
  }
  if (step < 2) { state.store = null; state.net = null; state.picked[2] = false; } // «Запись и интернет»
  if (step < 3) state.addons = []; // «Схема»: «Дополнительно»
}

function go(step) {
  step = Math.max(0, Math.min(STEPS.length - 1, step));
  if (step < state.step) resetAfter(step);
  state.step = step;
  renderStep(true);
  renderSmeta();
  schemeHint();
}

$('#stepBody').addEventListener('click', (e) => {
  const o = e.target.closest('.o');
  if (o) {
    const s = STEPS[state.step];
    const id = o.closest('[data-group]').dataset.group;
    const raw = o.dataset.v;
    (id === 'more' ? s.more : s).pick(isNaN(+raw) ? raw : +raw);
    state.picked[state.step] = s.ready ? s.ready() : true;
    // перерисовать карточки (подписи зависят от выбора), выбранную — с анимацией
    renderStep();
    const again = $(`#stepBody [data-group="${id}"] .o[data-v="${raw}"]`);
    if (again) { again.classList.add('is-pop'); again.focus({ preventScroll: true }); }
    renderSmeta();
    return;
  }
  const z = e.target.closest('.cnt__ctl button');
  if (z) {
    const zone = z.dataset.zone, d = +z.dataset.d;
    if (!addCam(zone, d)) return;
    state.picked[state.step] = counts(state).total > 0;
    renderStep();
    const card = $(`#stepBody .cnt__card[data-zone="${zone}"]`);
    const again = card.querySelector(`button[data-d="${d}"]`);
    (again.disabled ? card.querySelector('button[data-d="1"]') : again).focus({ preventScroll: true });
    if (d > 0 && card.querySelector('.cnt__row img:last-child')) card.querySelector('.cnt__row img:last-child').classList.add('is-new');
    renderSmeta();
    return;
  }
});

$('#stepsBar').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-step]');
  if (b && !b.disabled) go(+b.dataset.step);
});
$('#next').addEventListener('click', () => {
  if (STEPS[state.step].ready) state.picked[state.step] = true;
  go(state.step + 1);
});
$('#back').addEventListener('click', () => go(state.step - 1));

// ---------- шаг «Сколько камер и где?» ----------
// Счётчики «снаружи / внутри» — это те же точки схемы + «ещё камеры, которых нет на схеме»:
// «+» ставит камеру в следующую свободную точку (сначала base, потом остальные), точки кончились — в «ещё».
// «−» сначала убирает из «ещё», потом последнюю точку. На шаге «Схема» важны только числа «снаружи / внутри».

const EXTRA = { out: 'extraOut', in: 'extraIn' };

function zoneOrder(plan, zone) {
  const p = PLANS[plan], base = p.base[zone];
  const rest = p.slots.map((s, i) => (s.t === zone && !base.includes(i) ? i : -1)).filter((i) => i >= 0);
  return [...base, ...rest];
}

function addCam(zone, d) {
  const on = state.on[state.plan], order = zoneOrder(state.plan, zone), ex = EXTRA[zone];
  if (d > 0) {
    if (!canAdd(zone)) return false;
    const free = order.find((i) => !on.has(i));
    free === undefined ? state[ex]++ : on.add(free);
    return true;
  }
  if (state[ex] > 0) { state[ex]--; return true; }
  const last = [...order].reverse().find((i) => on.has(i));
  if (last === undefined) return false;
  on.delete(last);
  return true;
}

// кадр фото — то же правило, что в редакторе drafts/step2.html
const photoStyle = ({ pos: [x, y], zoom }) => `object-position:${x}% ${y}%;transform-origin:${x}% ${y}%;transform:scale(${zoom})`;

function renderZones() {
  const p = PLANS[state.plan], c = counts(state);
  const n = { out: c.out, in: c.inn };
  return `<div class="cnt">${['out', 'in'].map((zone) => {
    const z = p.zones[zone], k = n[zone], name = t(z.t).toLowerCase();
    return `
    <div class="cnt__card${k ? ' is-on' : ''}" data-zone="${zone}">
      <div class="cnt__photo" aria-hidden="true"><img src="assets/photos/${z.photo}.webp" alt="" style="${photoStyle(z)}"></div>
      <div class="cnt__main">
        <span class="cnt__cam" aria-hidden="true">${CAM_IMG}</span>
        <b class="cnt__t" id="zone-${zone}">${t(z.t)}</b>
        <span class="cnt__d">${t(z.d)}</span>
      </div>
      <div class="cnt__row" aria-hidden="true">${CAM_IMG.repeat(k)}</div>
      <div class="cnt__ctl" role="group" aria-labelledby="zone-${zone}">
        <button type="button" data-zone="${zone}" data-d="-1" aria-label="${L(`Убрать камеру ${name}`, `Камераны азайту: ${name}`)}"${k ? '' : ' disabled'}>−</button>
        <output class="cnt__n" aria-live="polite"><span>${k}</span><small>${plural(k, 'камера', 'камеры', 'камер')}</small></output>
        <button type="button" data-zone="${zone}" data-d="1" aria-label="${L(`Добавить камеру ${name}`, `Камера қосу: ${name}`)}"${k >= PRICE.maxPerZone ? ' aria-disabled="true"' : ''}>+</button>
      </div>
    </div>`;
  }).join('')}</div>
  <div class="cnt-sum">${CAM_IMG}<span>${L('Всего', 'Барлығы')}: ${camsWord(c.total)}</span></div>`;
}

// ---------- схема ----------
// Камеры расставлены по заготовленным местам сцены (scenes.js) — клиент их не двигает.
// 3D рисует assets/scheme3d.js (модуль, Three.js с CDN) — он может загрузиться позже шага.

const view = '3d'; // на сайте только 3D (2D — в PDF)

function renderScheme() {
  const sc = SCENES[state.plan], c = counts(state);
  const pane = (k, n) => `
    <section class="sch__pane">
      <div class="sch__head">${t(sc[k].title)}<span class="sch__chip">${camsWord(n)}</span></div>
      <div class="sch__stage" id="sch-${k}" data-fit="${c.out && c.inn ? 0.92 : 0.94}" data-zoom="${c.out && c.inn ? 1.1 : 1.4}"><p class="sch__wait">${t('Загружаем схему…')}</p></div>
    </section>`;
  // зона без камер не рисуется: одна схема — на всю ширину; две — крупнее и ближе (data-fit → поля вокруг сцены в scheme3d.js)
  const panes = [['out', c.out], ['in', c.inn]].filter(([, n]) => n > 0).map(([k, n]) => pane(k, n));
  return `
    <div class="sch" data-view="${view}">
      <div class="sch__grid${panes.length < 2 ? ' sch__grid--one' : ''}">${panes.join('<div class="sch__div" aria-hidden="true"></div>')}</div>
    </div>`;
}

function drawScheme() {
  if (!window.Scheme3D) {
    addEventListener('scheme3d-ready', drawScheme, { once: true });
    return;
  }
  const sc = SCENES[state.plan], c = counts(state);
  for (const [k, n, start] of [['out', c.out, 1], ['in', c.inn, c.out + 1]]) {
    const box = $(`#sch-${k}`);
    if (!box) continue; // зоны без камер нет на схеме (или шаг уже сменился)
    box.querySelector('.sch__wait')?.remove();
    Scheme3D.draw(k, box, sc[k], n, start, view);
  }
}

// ---------- «Дополнительно» ----------
// Отдельная карточка под схемой. Фото и кадр — ADDONS в data.js; значок — контурная иконка в белом круге на краю фото.

const ADD_ICON = {
  mic: '<path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
  talk: '<path d="M4 5h16v10H10l-5 4v-4H4z"/><path d="M8 10h8"/>',
  siren: '<path d="M6.5 18v-5.5a5.5 5.5 0 0 1 11 0V18M4 18h16v3H4zM12 2.5v2M4 6l1.5 1.5M20 6l-1.5 1.5"/>',
  ptz: '<path d="M4 4h16M6 4v4a6 6 0 0 0 12 0V4"/><circle cx="12" cy="9" r="2"/><path d="M5 18a9 9 0 0 0 14 0M17 21l2-3-3.5-.5"/>',
  zoom: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/>',
  monitor: '<rect x="2.5" y="4" width="19" height="12.5" rx="1.5"/><path d="M8 20.5h8M12 16.5v4"/>',
  human: '<circle cx="9" cy="7" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M15 13h5l1 3v3h-7v-3z"/>',
  line: '<path d="M3 12h18" stroke-dasharray="3 3"/><path d="M12 4v5M9.5 6.5 12 9l2.5-2.5M5 20h3M16 20h3"/>',
  plate: '<rect x="2.5" y="7" width="19" height="10" rx="2"/><path d="M6 12h2M10 12h3M15 12h3"/>',
  face: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><circle cx="12" cy="11" r="3"/><path d="M8 17a4.5 4.5 0 0 1 8 0"/>',
  count: '<circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2.5"/><path d="M3.5 17a4.5 4.5 0 0 1 9 0M11.5 17a4.5 4.5 0 0 1 9 0"/><path d="M4 21h16"/>',
  pir: '<circle cx="12" cy="12" r="2"/><path d="M7.5 7.5a6.5 6.5 0 0 0 0 9M16.5 7.5a6.5 6.5 0 0 1 0 9M4.5 4.5a10.5 10.5 0 0 0 0 15M19.5 4.5a10.5 10.5 0 0 1 0 15"/>',
  door: '<path d="M6 21V3h12v18M3 21h18"/><circle cx="14.5" cy="12" r=".8"/>',
};
const addIcon = (id) => `<svg class="ad-ic" viewBox="0 0 24 24" aria-hidden="true">${ADD_ICON[id]}</svg>`;

// фото в рамке: move — вписано целиком и сдвинуто (как в редакторе drafts/addons-photos.html), cover — заполняет рамку
const addImg = (f) => {
  const st = f.move
    ? `transform:translate(${f.move[0]}%, ${f.move[1]}%) scale(${f.move[2]})`
    : photoStyle({ pos: [f.cover[0], f.cover[1]], zoom: f.cover[2] });
  return `<img class="${f.move ? 'is-fit' : ''}" src="${picUrl(f.pic)}" alt="" loading="lazy" style="${st}">`;
};
const WAVE = `<span class="ad__wave">${Array.from({ length: 20 }, (_, i) => `<i style="animation-delay:-${(i * 137 % 100) / 100}s;animation-duration:${0.5 + (i * 53 % 50) / 100}s"></i>`).join('')}</span>`;

function renderAddons() {
  const on = new Set(state.addons);
  const card = (a) => `
    <button type="button" class="ad" data-addon="${a.id}" aria-pressed="${on.has(a.id)}">
      <span class="ad__pic" aria-hidden="true">
        <span class="ad__frame">${a.ba
          ? a.ba.map((f, i) => `<span class="ad__half ad__half--${i ? 'b' : 'a'}">${addImg(f)}<span class="ad__lbl">${t(f.l)}</span></span>`).join('')
          : addImg(a)}${a.wave ? WAVE : ''}</span>
        <span class="ad__badge">${addIcon(a.id)}</span>
      </span>
      <b class="ad__t">${t(a.t)}</b>
      <small class="ad__d">${t(a.d)}</small>
      <span class="ad__tg" aria-hidden="true"></span>
    </button>`;
  return `<h2 class="adds__t" id="addsT">${t('Дополнительно')}</h2>
    ${ADDONS.map((g) => `<h3 class="adds__g">${t(g.g)}</h3><div class="adds__grid">${g.items.map(card).join('')}</div>`).join('')}`;
}

$('#adds').addEventListener('click', (e) => {
  const b = e.target.closest('.ad');
  if (!b) return;
  const id = b.dataset.addon, on = !state.addons.includes(id);
  // порядок — как в каталоге, чтобы смета не прыгала
  state.addons = Object.keys(ADDON).filter((k) => (k === id ? on : state.addons.includes(k)));
  b.setAttribute('aria-pressed', on);
  renderSmeta();
});

// лимит — на каждую зону отдельно: 16 снаружи и 16 внутри
const zoneFull = (s, zone) => { const c = counts(s); return (zone === 'out' ? c.out : c.inn) >= PRICE.maxPerZone; };
const tooMany = (s) => { const c = counts(s); return c.out > PRICE.maxPerZone || c.inn > PRICE.maxPerZone; };

function canAdd(zone) {
  if (!zoneFull(state, zone)) return true;
  toast(L(`Больше ${PRICE.maxPerZone} камер ${zone === 'out' ? 'снаружи' : 'внутри'} посчитаем отдельно — напишите нам`,
    `${zone === 'out' ? 'Сыртқа' : 'Ішке'} ${PRICE.maxPerZone}-дан көп камераны бөлек есептейміз — бізге жазыңыз`));
  return false;
}

// ---------- смета ----------

let shown = 0, raf = 0, from = '', smetaOpen = false; // smetaOpen — в смете есть сумма (иначе мобильную панель не показываем)
function animateTotal(to) {
  cancelAnimationFrame(raf);
  const from = shown, t0 = performance.now();
  const step = (t) => {
    const k = reduceMotion.matches ? 1 : Math.min(1, (t - t0) / 380);
    shown = from + (to - from) * (1 - Math.pow(1 - k, 3));
    $('#total').textContent = fmt(shown);
    $('#mTotal').textContent = from + fmt(shown);
    if (k < 1) raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
}

// «Доп. материалы»: строка со стрелкой, по нажатию — состав и цены; раскрыто/свёрнуто помним между перерисовками сметы
let partsOpen = false;
const CHEVRON = '<svg class="ln__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const qtyFmt = (q) => String(Math.round(q * 10) / 10).replace('.', ',');
function partsHtml(l, pic) {
  const rows = l.parts.map((p) => `<li><span>${p.name}</span><span class="ln__pq">${qtyFmt(p.qty)} ${p.unit}${hasPrice(p.price) ? ` × ${fmt(p.price)}` : ''}</span><b>${hasPrice(p.price) ? fmt(p.sum) : t('без цены')}</b></li>`).join('');
  return `<details class="ln-d"${partsOpen ? ' open' : ''}><summary class="ln ln--ic ln--one">${pic}<span class="ln__name">${l.name}</span>`
    + `<span class="ln__sum ln__sum--x">${l.price === undefined ? '' : fmt(l.sum)}${CHEVRON}</span></summary>`
    + `<ul class="ln__parts">${rows}<li class="ln__ptot"><span>${t('Всего')}</span><b>${l.partial ? `${t('от')} ` : ''}${fmt(l.sum)}</b></li></ul></details>`;
}

// у строк на всех шагах — иконки в белом круге (нет иконки — пустой круг, картинку загрузим позже)
function lineHtml(l, per) {
  const pic = `<span class="ln__ic">${l.ic ? `<img src="assets/icons/${l.ic}.webp" alt="">` : l.addon ? addIcon(l.addon) : ''}</span>`;
  if (l.parts) return partsHtml(l, pic);
  const qty = l.qty === undefined ? '' : `<span class="ln__qty">${l.qty} ${l.unit}${l.price && l.qty > 1 ? ` × ${fmt(l.price)}` : ''}</span>`;
  if (l.price === undefined) return `<div class="ln ln--ic${qty ? '' : ' ln--one'}">${pic}<span class="ln__name">${l.name}</span>${qty}</div>`; // состав без цены (шаг «Камеры»)
  if (l.included) return `<div class="ln ln--ic">${pic}<span class="ln__name">${l.name}</span>${qty}<span class="ln__sum ln__sum--ask">${t('в комплекте')}</span></div>`;
  if (l.price === null) return `<div class="ln ln--ic">${pic}<span class="ln__name">${l.name}</span><span class="ln__qty">${t('уточним на осмотре')}</span><span class="ln__sum ln__sum--ask">${t('по запросу')}</span></div>`;
  return `<div class="ln ln--ic${qty ? '' : ' ln--one'}">${pic}<span class="ln__name">${l.name}</span>${qty}<span class="ln__sum">${l.from ? `${t('от')} ` : ''}${fmt(l.sum)}${per ? `<small>${per}</small>` : ''}</span></div>`;
}

// после изменения камер выбранный носитель может пропасть из вариантов (SD при 5 камерах) — тогда выбор снимаем
function syncStore() {
  if (!state.store || !state.plan || storeOptions(state).some((o) => o.key === state.store)) return;
  state.store = null;
}

$('#lines').addEventListener('toggle', (e) => { if (e.target.matches('.ln-d')) partsOpen = e.target.open; }, true);

function renderSmeta() {
  syncStore();
  const e = state.plan ? estimate(state) : { c: { total: 0 }, eq: [], work: [], extra: [], total: 0, monthly: [] };
  const last = state.step === STEPS.length - 1;
  // Пока клиент сам не выбрал количество камер (шаг «Объект» или «Камеры» до первого «+/−») — цена установки
  // одной камеры. Потом — смета объекта (HOME / FLATS / BIZ в data.js), одна и та же с шага «Камеры» до «Схемы»
  const early = state.step < 2;
  const per = early && !(state.step === 1 && state.picked[1]);
  const inst = PRICE.install;
  const n = per ? 1 : e.c.total;
  $('#lines').innerHTML = per
    ? lineHtml({ name: t('Установка 1 камеры'), price: inst.price, sum: inst.price, ic: 'tools' })
    : !n
      ? `<p class="smeta__empty">${t('Камер пока нет — добавьте их на шаге «Камеры».')}</p>`
      : [...e.eq, ...e.work].map((l) => lineHtml(l)).join('')
        + (e.extra.length ? `<div class="smeta__sub">${t('Дополнительно')}</div>${e.extra.map((l) => lineHtml(l)).join('')}` : '');
  from = n && (per || e.draft) ? `${t('от')} ` : ''; // есть позиции без цены — итог «от»
  $('#from').hidden = !from;
  $('#from').textContent = t('от');
  $('#totalT').textContent = t(from ? 'Итого' : 'Итого под ключ');
  $('#note').hidden = !last; // «Цена примерная.» — только на шаге «Схема»
  animateTotal(!n ? 0 : per ? inst.price : e.total);

  $('#monthly').hidden = early || !(n && e.monthly.length);
  $('#monthly').innerHTML = `<div class="smeta__sub">${t('Ежемесячно')}</div>${e.monthly.map((l) => lineHtml(l, t('в месяц'))).join('')}<p class="smeta__mnote">${t('Без покупки — только абонплата, в итог не входит')}</p>`;

  // кнопки — только на шаге «Схема»
  $('#acts').hidden = !(last && e.c.total);
  $('#mSend').hidden = !(last && e.c.total);
  $('#send').href = waLink(e, INSTALLER_PHONE);
  smetaOpen = n > 0;
  save(); // смета перерисовывается после любого изменения — тут же и сохраняем
}

// коротко о расчёте — для WhatsApp (на языке страницы) и заметки в CRM (по-русски, inRu)
function summary(e) {
  const obj = OBJECTS.find((o) => o.plan === state.plan);
  return [
    `${L('Объект', 'Нысан')}: ${obj ? t(obj.t).toLowerCase() : t(PLANS[state.plan].tab)}`,
    L(`Камер: ${e.c.total} (снаружи ${e.c.out}, внутри ${e.c.inn})`, `Камера: ${e.c.total} (сыртта ${e.c.out}, ішінде ${e.c.inn})`),
    e.store ? L(`Запись: ${storeLabel(e.store)}, примерно ${daysRange(storeDays(e.store, e.c.total)).text}`, `Жазба: ${storeLabel(e.store)}, шамамен ${daysRange(storeDays(e.store, e.c.total)).text}`) : L('Запись: не выбрана', 'Жазба: таңдалмаған'),
    L(`Кабель: ~${state.cable} м на камеру`, `Кабель: әр камераға ~${state.cable} м`),
    state.net ? L(`Интернет на объекте: ${state.net === 'yes' ? 'есть' : 'нет'}`, `Нысанда интернет: ${state.net === 'yes' ? 'бар' : 'жоқ'}`) : '',
    e.extra.length ? `${t('Дополнительно')}: ${e.extra.map((l) => l.name + (l.price === null ? ` (${t('по запросу')})` : '')).join(', ')}` : '',
    e.eq.some((l) => l.price === undefined) ? `${L('Без цены', 'Бағасы жоқ')}: ${e.eq.filter((l) => l.price === undefined).map((l) => (l.qty ? `${l.name} — ${l.qty} ${l.unit}` : l.name)).join(', ')}` : '',
    `${L('Предварительно', 'Алдын ала')}: ${e.draft ? `${t('от')} ` : ''}${fmt(e.total)}`,
    ...e.monthly.map((l) => `${t('Ежемесячно')}: ${l.name} — ${L(`${fmt(l.price)} в месяц`, `айына ${fmt(l.price)}`)}`),
  ].filter(Boolean);
}

function waLink(e, phone = WA_PHONE) {
  if (!e.c.total) return `https://wa.me/${phone}?text=${encodeURIComponent(L('Здравствуйте! Хочу поставить видеонаблюдение.', 'Сәлеметсіз бе! Бейнебақылау орнатқым келеді.'))}`;
  const text = [
    L('Здравствуйте! Посчитал(а) на сайте видеонаблюдение.', 'Сәлеметсіз бе! Сайттан бейнебақылауды есептеп көрдім.'),
    ...summary(e),
    location.protocol.startsWith('http') ? `${t('Схема')}: ${shareUrl()}` : '',
    L('Хочу точный расчёт.', 'Нақты есебін білгім келеді.'),
  ].filter(Boolean).join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

// ---------- «Отправить на рассмотрение» → заявка в CRM ----------
// Клиент оставляет только телефон; расчёт уходит целиком (функция site_lead в Supabase CRM).

const phoneDigits = (v) => {
  const d = v.replace(/\D/g, '');
  return d.length === 11 && /^[78]/.test(d) ? d.slice(1) : d.length === 10 ? d : null;
};

$('#review').addEventListener('click', () => {
  $('#review').hidden = true;
  $('#lead').hidden = false;
  $('#leadPhone').focus();
});

$('#lead').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const msg = $('#leadMsg'), btn = $('#leadSend');
  const d = phoneDigits($('#leadPhone').value);
  if (!d) { msg.className = 'lead__msg is-bad'; msg.textContent = L('Проверьте номер: 10 цифр после +7', 'Нөмірді тексеріңіз: +7-ден кейін 10 сан'); return; }
  // заявка в CRM — по-русски, на каком бы языке ни был сайт
  const obj = OBJECTS.find((o) => o.plan === state.plan);
  const { e, note, title } = inRu(() => {
    const e = estimate(state);
    return { e, note: summary(e).join('. '), title: `Расчёт с сайта: ${obj.t.toLowerCase()}, ${camsWord(e.c.total)}` };
  });
  btn.disabled = true;
  msg.className = 'lead__msg';
  msg.textContent = L('Отправляем…', 'Жіберіп жатырмыз…');
  try {
    const r = await fetch(`${CRM.url}/rest/v1/rpc/site_lead`, {
      method: 'POST',
      headers: { apikey: CRM.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_phone: '+7' + d,
        p_payload: {
          type: { home: 'house', flats: 'apartment', business: 'business' }[state.plan],
          title,
          total: e.total,
          // в CRM — только позиции с ценой (без цены — «по запросу» и пока не заданные цены частного дома)
          lines: [...e.eq, ...e.work, ...e.extra].filter((l) => l.price != null).map(({ name, qty, unit, price }) => ({ name, qty, unit, price })),
          note,
        },
      }),
    });
    if (!r.ok) throw new Error(r.status);
    const res = await r.json();
    msg.className = 'lead__msg is-ok';
    msg.textContent = L(`Заявка${res.number ? ` №${res.number}` : ''} отправлена — перезвоним в ближайшее время.`, `Өтінім${res.number ? ` №${res.number}` : ''} жіберілді — жақын арада хабарласамыз.`);
    $('#leadPhone').disabled = true;
    btn.hidden = true;
  } catch (_) {
    btn.disabled = false;
    msg.className = 'lead__msg is-bad';
    msg.textContent = L('Не получилось отправить. Напишите монтажнику в WhatsApp — кнопка ниже.', 'Жіберілмей қалды. Шеберге WhatsApp-қа жазыңыз — батырма төменде.');
  }
});

// ---------- «Скачать расчёт» → PDF по дизайн-коду (assets/pdf.js грузится по нажатию) ----------

$('#pdf').addEventListener('click', async () => {
  const b = $('#pdf');
  if (b.classList.contains('is-busy')) return;
  b.classList.add('is-busy');
  const label = b.lastChild.textContent;
  b.lastChild.textContent = L('Готовим PDF…', 'PDF дайындап жатырмыз…');
  try {
    const { downloadPdf } = await import('./pdf.js');
    const e = estimate(state);
    await downloadPdf({ e, plan: state.plan, obj: t(OBJECTS.find((o) => o.plan === state.plan).t), scene: SCENES[state.plan] });
  } catch (err) {
    console.error(err);
    toast(L('Не получилось собрать PDF — попробуйте ещё раз', 'PDF жасалмай қалды — тағы бір рет көріңіз'));
  }
  b.lastChild.textContent = label;
  b.classList.remove('is-busy');
});

// ---------- сохранение и ссылка ----------
// Выбор хранится в браузере — после перезагрузки клиент продолжает с того же шага.
// Ссылка ?obj=home&cams=1.2.3.4&… (уходит в сообщении WhatsApp) открывает ту же схему.

const STORE = 'baqyla-calc-v1';
const CABLES = [10, 15, 25], NETS = ['yes', 'no'];

const int = (v, max) => (Number.isInteger(+v) && +v >= 0 && +v <= max ? +v : null);
const slotSet = (plan, list) => new Set(list.map(Number).filter((i) => Number.isInteger(i) && i >= 0 && i < PLANS[plan].slots.length));

// расчёт хранится в браузере, только пока клиент на шаге «Схема»: перезагрузил там — вернётся туда же;
// на шагах 1–3 перезагрузка начинает расчёт заново
function save() {
  try {
    if (state.step !== STEPS.length - 1) { localStorage.removeItem(STORE); return; }
    localStorage.setItem(STORE, JSON.stringify({
      ...state,
      on: Object.fromEntries(Object.entries(state.on).map(([k, v]) => [k, [...v]])),
    }));
  } catch (_) { /* приватный режим или запрещено — просто не сохраняем */ }
}

function load() {
  let d;
  try { d = JSON.parse(localStorage.getItem(STORE)); } catch (_) { return false; }
  if (!d || !PLANS[d.plan] || d.step !== STEPS.length - 1) return false;
  const next = fresh();
  for (const k in PLANS) if (Array.isArray(d.on && d.on[k])) next.on[k] = slotSet(k, d.on[k]);
  next.plan = d.plan;
  // в старых сохранениях storeSet: false — носитель был подставлен сам, клиент его не выбирал
  next.store = typeof d.store === 'string' && d.storeSet !== false ? d.store : null;
  next.net = NETS.includes(d.net) ? d.net : null;
  next.cable = PLANS[d.plan].cable; // расстояние больше не спрашиваем — старый выбор не тянем
  next.extraOut = int(d.extraOut, PRICE.maxPerZone) ?? 0;
  next.extraIn = int(d.extraIn, PRICE.maxPerZone) ?? 0;
  next.addons = Array.isArray(d.addons) ? Object.keys(ADDON).filter((k) => d.addons.includes(k)) : [];
  if (tooMany(next)) return false;
  if (Array.isArray(d.picked)) next.picked = next.picked.map((_, i) => d.picked[i] === true);
  next.picked[0] = true;
  next.picked[2] = next.picked[2] && next.net !== null; // шаг 3 пройден, только если ответили про интернет
  // дальше первого невыбранного шага не пускаем — как и кнопки в полосе шагов
  const open = next.picked.indexOf(false);
  next.step = Math.min(int(d.step, 9) ?? 0, STEPS.length - 1, open < 0 ? STEPS.length - 1 : open); // в старых сохранениях шагов было 5
  Object.assign(state, next);
  return true;
}

function shareUrl() {
  const p = new URLSearchParams({ obj: state.plan, cams: [...state.on[state.plan]].sort((a, b) => a - b).map((i) => i + 1).join('.') });
  if (state.extraOut) p.set('out', state.extraOut);
  if (state.extraIn) p.set('in', state.extraIn);
  if (state.store) p.set('rec', state.store);
  if (state.net) p.set('net', state.net);
  if (state.addons.length) p.set('add', state.addons.join('.'));
  p.set('cable', state.cable);
  return `${location.href.split(/[?#]/)[0]}?${p}`;
}

// пришли по ссылке: ?kit=N со страницы «Комплекты» или ?obj=… от «Поделиться» — сразу на схему
function applyUrl() {
  const q = new URLSearchParams(location.search);
  let plan, on;
  if (q.has('kit')) {
    const k = KITS[+q.get('kit')];
    if (k) { plan = k.plan; on = new Set(k.on); q.set('rec', k.store); }
  } else if (PLANS[q.get('obj')]) {
    plan = q.get('obj');
    on = slotSet(plan, (q.get('cams') || '').split('.').filter(Boolean).map((n) => n - 1));
  }
  if (!plan) return false;
  const next = fresh();
  next.plan = plan;
  next.on[plan] = on;
  next.extraOut = int(q.get('out') || 0, PRICE.maxPerZone) ?? 0;
  next.extraIn = int(q.get('in') || 0, PRICE.maxPerZone) ?? 0;
  next.store = q.get('rec');
  next.net = NETS.includes(q.get('net')) ? q.get('net') : null;
  next.addons = Object.keys(ADDON).filter((k) => (q.get('add') || '').split('.').includes(k));
  next.cable = CABLES.includes(+q.get('cable')) ? +q.get('cable') : PLANS[plan].cable;
  if (tooMany(next)) next.extraOut = next.extraIn = 0;
  next.picked = [true, true, true];
  next.step = STEPS.length - 1;
  Object.assign(state, next);
  history.replaceState(null, '', location.pathname);
  return true;
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
  mbar.classList.toggle('is-on', smetaOpen && window.scrollY > 200 && (r.top > innerHeight || r.bottom < 0));
}
addEventListener('scroll', syncBar, { passive: true });
addEventListener('resize', syncBar);

// настройки из админки (admin.html → Supabase site_settings): сначала последние известные из браузера — без мигания цен,
// потом свежие с сервера; не получилось — остаются значения по умолчанию из data.js
const SETTINGS_CACHE = 'baqyla-settings-v1';
const topPrice = () => { $('#topPrice').textContent = fmt(PRICE.install.price); }; // «Установка 1 камеры — 15 000 ₸» в шапке
try { applySettings(JSON.parse(localStorage.getItem(SETTINGS_CACHE))); } catch (_) { /* нет кэша */ }
topPrice();
fetch(`${CRM.url}/rest/v1/site_settings?key=eq.${SETTINGS_KEY}&select=value`, { headers: { apikey: CRM.key } })
  .then((r) => (r.ok ? r.json() : []))
  .then((rows) => {
    if (!rows[0] || !applySettings(rows[0].value)) return;
    try { localStorage.setItem(SETTINGS_CACHE, JSON.stringify(rows[0].value)); } catch (_) { /* приватный режим */ }
    topPrice();
    renderStep();
    renderSmeta();
  })
  .catch(() => {});

applyUrl() || load();
renderStep();
renderSmeta();
schemeHint();

// сменили язык — перерисовать шаг и смету (вёрстку переводит i18n.js)
addEventListener('langchange', () => {
  renderStep();
  renderSmeta();
  topPrice();
});
