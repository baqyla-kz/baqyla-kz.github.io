// Страница «Комплекты». Цены считаются тем же расчётом, что и на странице «Расчёт» (data.js).

function renderKits() {
  document.querySelector('#kitsList').innerHTML = KITS.map((k, i) => {
    const e = estimate({ plan: k.plan, on: { [k.plan]: new Set(k.on) }, extraOut: 0, extraIn: 0, store: k.store, cable: PLANS[k.plan].cable });
    const main = e.eq.filter((l) => !l.parts); // «Доп. материалы» — строкой «Кабель, гофра, коннекторы» ниже
    return `
    <article class="kit">
      <div class="kit__top"><h2>${t(k.name)}</h2><span class="kit__n">${e.c.total} ${plural(e.c.total, 'камера', 'камеры', 'камер')}</span></div>
      <p class="kit__text">${t(k.text)}</p>
      <ul class="kit__list">
        ${main.map((l) => `<li><span>${l.name}</span><span>${l.qty} ${l.unit}</span></li>`).join('')}
        <li><span>${L('Кабель, гофра, коннекторы', 'Кабель, гофра, коннекторлар')}</span><span>${L(`${PLANS[k.plan].cable} м на камеру`, `әр камераға ${PLANS[k.plan].cable} м`)}</span></li>
        <li><span>${L('Монтаж и настройка телефона', 'Монтаж және телефонды баптау')}</span><span>${L('входит', 'кіреді')}</span></li>
      </ul>
      <div class="kit__foot">
        <div><small>${L('Под ключ, запись', 'Толық орнатумен, жазба')} ≈ ${daysRange(storeDays(e.store, e.c.total)).text}</small><div class="kit__price">${fmt(e.total)}</div></div>
        <a class="btn btn--primary" href="index.html?kit=${i}">${L('Открыть в расчёте', 'Есептеуде ашу')}</a>
      </div>
    </article>`;
  }).join('');
}

renderKits();
addEventListener('langchange', renderKits);
