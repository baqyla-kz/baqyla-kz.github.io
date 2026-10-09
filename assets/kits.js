// Страница «Комплекты». Цены считаются тем же расчётом, что и на странице «Расчёт» (data.js).

document.querySelector('#kitsList').innerHTML = KITS.map((k, i) => {
  const e = estimate({ plan: k.plan, on: { [k.plan]: new Set(k.on) }, extraOut: 0, extraIn: 0, days: 14, cable: PLANS[k.plan].cable });
  const main = e.eq.filter((l) => !/Кабель|Коннектор|коробка|Гофра/.test(l.name));
  return `
    <article class="kit">
      <div class="kit__top"><h2>${k.name}</h2><span class="kit__n">${e.c.total} ${plural(e.c.total, 'камера', 'камеры', 'камер')}</span></div>
      <p class="kit__text">${k.text}</p>
      <ul class="kit__list">
        ${main.map((l) => `<li><span>${l.name}</span><span>${l.qty} ${l.unit}</span></li>`).join('')}
        <li><span>Кабель, гофра, коннекторы</span><span>${PLANS[k.plan].cable} м на камеру</span></li>
        <li><span>Монтаж и настройка телефона</span><span>входит</span></li>
      </ul>
      <div class="kit__foot">
        <div><small>Под ключ, архив 14 дней</small><div class="kit__price">${fmt(e.total)}</div></div>
        <a class="btn btn--primary" href="index.html?kit=${i}">Открыть в расчёте</a>
      </div>
    </article>`;
}).join('');
