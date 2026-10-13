// Страница «Комплекты». Комплекты правятся в админке (вкладка «Комплекты», data.js: kitList);
// состав и цена считаются тем же расчётом, что и на странице «Расчёт» (data.js: estimate).
// Разделы — «Все» и по объектам (PLANS), раздел — в адресе (kits.html#home), без адреса — все.
// В карточке сверху — фото объекта и схема установки, между ними — косой срез, как у карточек шага «Сколько камер и где?».

const KIT_TYPES = [
  { id: 'all', t: 'Все' }, // без иконки
  { id: 'home', t: 'Частный дом', ic: 'house' },
  { id: 'flats', t: 'Многоквартирный', ic: 'apartments' },
  { id: 'business', t: 'Бизнес', ic: 'office' },
];
// комплекты из админки (data.js: kitList), скрытые не показываем; в «Все» — по разделам, внутри — в порядке админки
const kitsOf = (type) => kitList().filter((k) => !k.hidden && (type === 'all' || k.plan === type))
  .sort((a, b) => Object.keys(PLANS).indexOf(a.plan) - Object.keys(PLANS).indexOf(b.plan));
// текст на языке страницы: своё поле по-казахски → словарь KK → по-русски
const kitText = (k, f) => (I18N.lang === 'kk' && k[`${f}Kk`]) || t(k[f]);

let kitCur = location.hash.slice(1) || 'all';

// «Все» на телефоне — значок из четырёх квадратов вместо картинки раздела
const KIT_ALL_IC = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>';
// состав комплекта на телефоне свёрнут под «Что входит · 5 ⌄», на компьютере — всегда открыт (кнопка скрыта)
const KIT_CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

function renderKits() {
  const types = KIT_TYPES.filter((ty) => ty.id === 'all' || kitsOf(ty.id).length); // пустой раздел не показываем
  if (!types.some((ty) => ty.id === kitCur)) kitCur = 'all';
  const tabs = document.querySelector('#kitTypes');
  tabs.setAttribute('aria-label', t('Разделы комплектов'));
  tabs.innerHTML = types.map((ty) => `<button type="button" class="eq__type" data-type="${ty.id}" aria-pressed="${ty.id === kitCur}">`
    + `${ty.ic ? `<img src="assets/icons/${ty.ic}.webp" alt="">` : `<b class="eq__all" aria-hidden="true">${KIT_ALL_IC}</b>`}<span>${soft(t(ty.t))}</span><i>${kitsOf(ty.id).length}</i></button>`).join('');
  document.querySelector('#kitsList').innerHTML = kitsOf(kitCur).map((k) => {
    const e = estimate(kitState(k));
    const main = e.eq.filter((l) => !l.parts); // «Доп. материалы» — строкой «Кабель, гофра, коннекторы» ниже
    const work = e.work.reduce((a, l) => a + l.sum, 0);
    const z = PLANS[k.plan].zones.out, c = e.c;
    const own = hasPrice(k.price); // своя цена из админки — без «от»
    // зоны с камерами: одна — схема на всю правую часть; две — снаружи сверху, внутри снизу, между ними пунктир
    const zones = [['out', c.out, 1], ['in', c.inn, c.out + 1]].filter(([, n]) => n > 0);
    const two = zones.length > 1;
    return `
    <article class="kit">
      <div class="kit__media" aria-hidden="true">
        ${zones.map(([zone, n, start]) => `<div class="kit__sch${two ? ` kit__sch--${zone}` : ''}" data-plan="${k.plan}" data-zone="${zone}" data-n="${n}" data-start="${start}" data-zoom="${two ? 1 : 1.1}"${two ? ' data-crop="1.7"' : ''}></div>`
          + (two ? `<span class="kit__zone kit__zone--${zone}">${t({ out: 'Снаружи', in: 'Внутри' }[zone])} <b>${n}</b></span>` : '')).join('')}
        ${two ? '<i class="kit__div"></i>' : ''}
        <div class="kit__photo">${k.pic ? `<img src="${picUrl(k.pic)}" alt="">` : `<img src="assets/photos/${z.photo}.webp" alt="" style="object-position:${z.pos[0]}% ${z.pos[1]}%">`}</div>
      </div>
      <div class="kit__top"><h2>${kitText(k, 'name')}</h2><span class="kit__n">${c.total} ${plural(c.total, 'камера', 'камеры', 'камер')}</span></div>
      ${k.text ? `<p class="kit__text">${kitText(k, 'text')}</p>` : ''}
      <div class="kit__more">
        <button type="button" class="kit__tg" aria-expanded="false">${t('Что входит')} · ${main.length + 2}${KIT_CHEV}</button>
        <ul class="kit__list">
          ${main.map((l) => `<li><span>${l.name}</span><span>${l.qty} ${l.unit}</span></li>`).join('')}
          <li><span>${L('Кабель, гофра, коннекторы', 'Кабель, гофра, коннекторлар')}</span><span>${L(`${PLANS[k.plan].cable} м на камеру`, `әр камераға ${PLANS[k.plan].cable} м`)}</span></li>
          <li><span>${L('Монтаж и настройка телефона', 'Монтаж және телефонды баптау')}</span><span>${fmt(work)}</span></li>
        </ul>
      </div>
      <div class="kit__foot">
        <div><small>${L('Под ключ', 'Толық орнатумен')}</small><div class="kit__price">${!own && e.draft ? `<small>${t('от')} </small>` : ''}${fmt(own ? k.price : e.total)}</div></div>
        <a class="btn btn--primary" href="${kitHref(k)}" data-kit="${k.id}">${L('Открыть в расчёте', 'Есептеуде ашу')}</a>
      </div>
    </article>`;
  }).join('');
  drawKitSchemes();
}

// схема — кадр 3D-сцены (scheme3d.js, как в PDF) под размер блока, ×2 для чёткости; номера камер — поверх в %.
// Одна схема — на 10 % ближе (data-zoom). Две — в data-crop раз крупнее: кадр снимаем больше блока и показываем
// кусок вокруг камер (а не вокруг центра сцены — камера у края комнаты не уезжает за рамку).
// Кадры запоминаются: перерисовка раздела или языка их не пересчитывает.
const kitShots = {};
function drawKitSchemes() {
  if (!window.Scheme3D) return; // модуль ещё грузится — нарисуем по scheme3d-ready
  const st = Scheme3D.stage('kit');
  if (!st.el) { st.attach(document.createElement('div')); st.el.dataset.fit = '1'; }
  for (const box of document.querySelectorAll('.kit__sch[data-zone]')) {
    const w = Math.round(box.clientWidth * 2), h = Math.round(box.clientHeight * 2);
    if (!w || !h) continue;
    const d = box.dataset, z = +d.crop || 1, W = Math.round(w * z), H = Math.round(h * z);
    const key = [d.plan, d.zone, d.n, d.start, d.zoom, W, H].join('|');
    if (!kitShots[key]) {
      st.el.dataset.zoom = d.zoom;
      kitShots[key] = Scheme3D.snapshot('kit', SCENES[d.plan][d.zone], +d.n, +d.start, '3d', W, H);
    }
    const s = kitShots[key], bs = s.marks.filter((m) => m.kind === 'b');
    // окно w×h по центру камер, не за краем кадра; сверху над камерой — место под кружок номера (22 px ×2 + поля)
    const cx = bs.reduce((a, m) => a + m.x, 0) / bs.length, cy = bs.reduce((a, m) => a + m.y, 0) / bs.length;
    const top = Math.max(0, Math.min(H - h, cy - h / 2, Math.min(...bs.map((m) => m.y)) - 80));
    const left = Math.max(0, Math.min(W - w, cx - w / 2));
    box.innerHTML = `<img src="${s.url}" alt="" style="width:${z * 100}%;height:${z * 100}%;transform:translate(${-left / W * 100}%,${-top / H * 100}%)">`
      + bs.map((m) => `<span class="sch__b${m.hid ? ' is-hid' : ''}" style="left:${(m.x - left) / w * 100}%;top:${(m.y - top) / h * 100}%">${m.text}</span>`).join('');
  }
}
let kitResize;
addEventListener('resize', () => { clearTimeout(kitResize); kitResize = setTimeout(drawKitSchemes, 200); });
addEventListener('scheme3d-ready', drawKitSchemes);

document.querySelector('#kitsList').addEventListener('click', (e) => {
  const open = e.target.closest('[data-kit]'), k = open && kitList().find((x) => x.id === open.dataset.kit);
  if (k) track('kit', { id: k.id, name: k.name, plan: k.plan });
  const b = e.target.closest('.kit__tg');
  if (b) b.setAttribute('aria-expanded', b.getAttribute('aria-expanded') !== 'true');
});

document.querySelector('#kitTypes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-type]');
  if (!b || b.dataset.type === kitCur) return;
  kitCur = b.dataset.type;
  track('kit_tab', { type: kitCur });
  history.replaceState(null, '', kitCur === 'all' ? location.pathname : `#${kitCur}`);
  renderKits();
});

loadSettings(renderKits, false, true);
renderKits();
addEventListener('langchange', renderKits);
