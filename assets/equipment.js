// Страница «Оборудование»: плитки с фото и ценой по разделам. Карточки — из админки (вкладка «Оборудование»,
// data.js: catalogCards); пока каталог не сохраняли — собраны из цен расчёта. Скрытые не показываем, пустые разделы — тоже.
// Раздел — в адресе (equipment.html#nvr), без адреса — первый непустой.

// текст карточки на языке страницы: своё поле по-казахски → словарь KK → по-русски
const cardText = (c, k) => (I18N.lang === 'kk' && c[`${k}Kk`]) || t(c[k]);
const cardPrice = (c) => (hasPrice(c.price)
  ? `${c.from ? `<small>${t('от')} </small>` : ''}${fmt(c.price)}${c.per === 'month' ? `<small> ${t('в месяц')}</small>` : c.per === 'm' ? `<small> / ${t('м')}</small>` : ''}`
  : `<small>${t('по запросу')}</small>`);

let eqCur = location.hash.slice(1);

function renderEquipment() {
  const cards = catalogCards().filter((c) => !c.hidden);
  const types = EQ_TYPES.filter((ty) => cards.some((c) => c.type === ty.id));
  if (!types.some((ty) => ty.id === eqCur)) eqCur = types.length ? types[0].id : '';

  const tabs = document.querySelector('#eqTypes');
  tabs.setAttribute('aria-label', t('Разделы оборудования'));
  tabs.innerHTML = types.map((ty) => `<button type="button" class="eq__type" data-type="${ty.id}" aria-pressed="${ty.id === eqCur}">`
    + `<img src="assets/icons/${ty.ic}.webp" alt=""><span>${t(ty.t)}</span><i>${cards.filter((c) => c.type === ty.id).length}</i></button>`).join('');
  document.querySelector('#eqGrid').innerHTML = cards.filter((c) => c.type === eqCur).map((c) => `
    <article class="eq__tile">
      <div class="eq__ph${c.pic.startsWith('https://') ? ' eq__ph--photo' : ''}"><img src="${picUrl(c.pic)}" alt=""></div>
      <div class="eq__body">
        <h2 class="eq__name">${cardText(c, 'name')}</h2>
        ${c.spec ? `<p class="eq__spec">${cardText(c, 'spec')}</p>` : ''}
        <p class="eq__price">${cardPrice(c)}</p>
      </div>
    </article>`).join('');
}

document.querySelector('#eqTypes').addEventListener('click', (e) => {
  const b = e.target.closest('[data-type]');
  if (!b || b.dataset.type === eqCur) return;
  eqCur = b.dataset.type;
  history.replaceState(null, '', `#${eqCur}`);
  renderEquipment();
});

loadSettings(renderEquipment, true);
renderEquipment();
addEventListener('langchange', renderEquipment);
