// Страница «Оборудование»: плитки с фото и ценой по разделам. Карточки — из админки (вкладка «Оборудование»,
// data.js: catalogCards); пока каталог не сохраняли — собраны из цен расчёта. Скрытые не показываем, пустые разделы — тоже.
// Раздел — в адресе (equipment.html#nvr), без адреса — первый непустой.

// текст карточки на языке страницы: своё поле по-казахски → словарь KK → по-русски
const cardText = (c, k) => (I18N.lang === 'kk' && c[`${k}Kk`]) || t(c[k]);
const cardPrice = (c) => (hasPrice(c.price)
  ? `${c.from ? `<small>${t('от')} </small>` : ''}${fmt(c.price)}${c.per === 'month' ? `<small> ${t('в месяц')}</small>` : c.per === 'm' ? `<small> / ${t('м')}</small>` : ''}`
  : `<small>${t('по запросу')}</small>`);

let eqCur = location.hash.slice(1);
const eqOpen = new Set(); // карточки с раскрытыми «Параметрами» — остаются раскрытыми после смены языка
const EQ_CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

function renderEquipment() {
  const cards = catalogCards().filter((c) => !c.hidden);
  const types = EQ_TYPES.filter((ty) => cards.some((c) => c.type === ty.id));
  if (!types.some((ty) => ty.id === eqCur)) eqCur = types.length ? types[0].id : '';

  const tabs = document.querySelector('#eqTypes');
  tabs.setAttribute('aria-label', t('Разделы оборудования'));
  tabs.innerHTML = types.map((ty) => `<button type="button" class="eq__type" data-type="${ty.id}" aria-pressed="${ty.id === eqCur}">`
    + `<img src="assets/icons/${ty.ic}.webp" alt=""><span>${soft(t(ty.t))}</span><i>${cards.filter((c) => c.type === ty.id).length}</i></button>`).join('');
  // есть ссылка на товар — название-ссылка растянута на всю плитку (новая вкладка); кнопка «Параметры» — поверх неё
  // в разделе — от самой дешёвой к самой дорогой; без цены («по запросу») — в конце, равные — в порядке из админки
  const byPrice = (c) => (hasPrice(c.price) ? c.price : Infinity);
  document.querySelector('#eqGrid').innerHTML = cards.filter((c) => c.type === eqCur).sort((a, b) => byPrice(a) - byPrice(b)).map((c) => {
    const name = cardText(c, 'name'), params = c.params || [];
    return `
    <article class="eq__tile${c.url ? ' eq__tile--link' : ''}">
      <div class="eq__ph${c.pic.startsWith('icons/') ? '' : ' eq__ph--photo'}"><img src="${picUrl(c.pic)}" alt=""></div>
      <div class="eq__body">
        <h2 class="eq__name">${c.url ? `<a class="eq__link" href="${c.url}" target="_blank" rel="noopener" data-cid="${c.id}">${name}</a>` : name}</h2>
        ${c.spec ? `<p class="eq__spec">${cardText(c, 'spec')}</p>` : ''}
        <p class="eq__price">${cardPrice(c)}</p>
        ${params.length ? `<button type="button" class="eq__tg" data-params="${c.id}" aria-expanded="${eqOpen.has(c.id)}">${t('Параметры')}${EQ_CHEV}</button>
        <ul class="eq__params">${params.map((p, i) => `<li>${(I18N.lang === 'kk' && (c.paramsKk || [])[i]) || t(p)}</li>`).join('')}</ul>` : ''}
      </div>
    </article>`;
  }).join('');
}

document.querySelector('#eqGrid').addEventListener('click', (e) => {
  const link = e.target.closest('[data-cid]'), c = link && catalogCards().find((x) => x.id === link.dataset.cid);
  if (c) track('kaspi', { id: c.id, name: c.name });
  const b = e.target.closest('[data-params]');
  if (!b) return;
  const open = b.getAttribute('aria-expanded') !== 'true';
  b.setAttribute('aria-expanded', open);
  if (open) eqOpen.add(b.dataset.params); else eqOpen.delete(b.dataset.params);
});

document.querySelector('#eqTypes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-type]');
  if (!b || b.dataset.type === eqCur) return;
  eqCur = b.dataset.type;
  track('eq_tab', { type: eqCur });
  history.replaceState(null, '', `#${eqCur}`);
  renderEquipment();
});

loadSettings(renderEquipment, true);
renderEquipment();
addEventListener('langchange', renderEquipment);
