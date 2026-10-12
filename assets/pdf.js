// «Скачать расчёт» → PDF по дизайн-коду Baqyla (v3): смета (с контактами, только она) + схема 2D + схема 3D.
// Каждая страница — картинка 2,5× (≈1985 × 2808), чтобы тени, сетка и шрифт были одинаковы на любом телефоне.
// Страницы собираются из HTML (html-to-image: рисует сам браузер, текст не съезжает, как в html2canvas)
// и складываются в PDF (jsPDF); обе библиотеки грузятся по нажатию.

const W = 794, H = 1123, SCALE = 2.5; // A4 в CSS-пикселях
// тексты — на языке страницы (i18n.js): PDF собирается в момент нажатия
const CITY = () => t('г. Уральск');
const FOOT = () => [L('BAQYLA · проектирование, установка, сервис', 'BAQYLA · жобалау, орнату, қызмет көрсету'), '+7 778 794 37 60 · +7 708 980 42 60 · @baqyla.security.07'];

const load = (src) => new Promise((ok, fail) => {
  const s = Object.assign(document.createElement('script'), { src, onload: ok, onerror: fail });
  document.head.appendChild(s);
});

async function libs() {
  if (!window.htmlToImage) await load('https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js');
  if (!window.jspdf) await load('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  if (!document.querySelector('link[data-onest]')) {
    document.head.insertAdjacentHTML('beforeend', '<link data-onest rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@500;600;700;800&display=swap">');
  }
  await Promise.all(['500 16px Onest', '700 16px Onest', '800 16px Onest'].map((f) => document.fonts.load(f, 'Смета 0123 қәң')));
}

// шрифт Onest для картинки страницы: CSS Google Fonts + сами файлы → data: URL (кириллица, латиница, ₸)
let onest;
async function onestCss() {
  if (onest) return onest;
  const css = await (await fetch('https://fonts.googleapis.com/css2?family=Onest:wght@500;600;700;800&display=swap')).text();
  const keep = css.match(/\/\* (cyrillic-ext|cyrillic|latin-ext|latin) \*\/\s*@font-face\s*{[^}]*}/g) || [];
  const cache = {};
  const toData = async (url) => (cache[url] ||= fetch(url).then((r) => r.blob()).then((b) => new Promise((ok) => {
    const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.readAsDataURL(b);
  })));
  const out = [];
  for (const f of keep) {
    const url = f.match(/url\(([^)]+)\)/)[1];
    out.push(f.replace(url, await toData(url)));
  }
  return (onest = out.join('\n'));
}

// фон клиентских страниц — B2 «тёмно-синий чертёж»: #0A2463, сетка 12 и 48 px, виньетка к краям
function blueprint() {
  const c = document.createElement('canvas');
  c.width = W * SCALE; c.height = H * SCALE;
  const g = c.getContext('2d');
  g.scale(SCALE, SCALE);
  g.fillStyle = '#0A2463'; g.fillRect(0, 0, W, H);
  for (const [step, a] of [[12, 0.05], [48, 0.11]]) {
    g.strokeStyle = `rgba(91,155,255,${a})`; g.lineWidth = 1;
    g.beginPath();
    for (let x = 0; x <= W; x += step) { g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, H); }
    for (let y = 0; y <= H; y += step) { g.moveTo(0, y + 0.5); g.lineTo(W, y + 0.5); }
    g.stroke();
  }
  const v = g.createRadialGradient(W / 2, H * 0.45, H * 0.25, W / 2, H * 0.5, H * 0.8);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  return c.toDataURL('image/png');
}

const CSS = `
.pg { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; font-family: Onest, sans-serif; color: #0B1530; }
.pg__bg { position: absolute; inset: 0; width: 100%; height: 100%; }
.pg__in { position: relative; display: flex; flex-direction: column; height: 100%; }
.hd { display: flex; align-items: center; gap: 20px; padding: 26px 28px; background: linear-gradient(140deg, #1E6BE0, #0A2463); color: #fff; }
.hd__logo { display: grid; place-items: center; width: 78px; height: 78px; border-radius: 22px; background: #000; flex: none; }
.hd__logo img { width: 46px; height: 53px; }
.hd__t { flex: 1; min-width: 0; }
.hd__t b { display: block; font: 800 34px/1.1 Onest; }
.hd__t span { display: block; margin-top: 6px; font: 500 16px/1.3 Onest; color: rgba(255,255,255,.85); }
.hd__chips { display: grid; justify-items: end; gap: 8px; }
.chip { padding: 7px 14px; border-radius: 999px; font: 600 14px Onest; white-space: nowrap; }
.chip--glass { background: rgba(255,255,255,.16); color: #fff; }
.chip--white { background: #fff; color: #0A2463; }
.body { flex: 1; display: flex; flex-direction: column; gap: 6px; padding: 16px 20px 0; min-height: 0; }
.grp { display: flex; flex-direction: column; gap: 7px; }
.sec { display: flex; align-items: center; gap: 10px; margin: 4px 0 2px; color: #fff; font: 700 20px Onest; }
.sec::before { content: ''; width: 4px; height: 22px; border-radius: 2px; background: #5B9BFF; }
.row { display: flex; align-items: center; gap: 14px; padding: 5px 20px 5px 7px; border-radius: 22px; background: #fff; box-shadow: 0 12px 30px rgba(0,0,0,.4); }
.ic { display: grid; place-items: center; width: 50px; height: 50px; border-radius: 50%; background: #fff; box-shadow: 0 6px 16px rgba(10,36,99,.13); flex: none; }
.ic img { width: 45px; height: 45px; object-fit: contain; }
.ic img[src$="setup.webp"] { width: 41px; height: 41px; }
.row__t { flex: 1; min-width: 0; }
.row__t b { display: block; font: 700 18px/1.2 Onest; }
.row__chips { display: flex; gap: 6px; margin-top: 4px; }
.q { padding: 3px 10px; border-radius: 999px; background: #EAF2FF; color: #1E6BE0; font: 600 13px Onest; }
.row__p { text-align: right; font: 800 24px Onest; white-space: nowrap; }
.row__p small { display: block; font: 500 12px Onest; color: #4A5878; }
.tot { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-top: 4px; padding: 16px 24px; border-radius: 24px; background: linear-gradient(160deg, #000 0%, #0B1A3A 55%, #1E6BE0 130%); color: #fff; box-shadow: 0 12px 30px rgba(0,0,0,.4); }
.tot small { display: block; font: 600 12px Onest; letter-spacing: .14em; color: #8DB6FF; }
.tot b { display: block; margin-top: 6px; font: 800 52px/1 Onest; }
.tot span { font: 500 15px Onest; color: #8DB6FF; }
.ft { display: flex; justify-content: space-between; gap: 12px; margin-top: auto; padding: 14px 20px 18px; color: rgba(255,255,255,.75); font: 500 12px Onest; }
.card { flex: 1; display: flex; flex-direction: column; gap: 12px; margin: 20px; padding: 16px 18px; border-radius: 24px; background: #fff; box-shadow: 0 12px 30px rgba(0,0,0,.4); min-height: 0; }
.scn { flex: 1; display: flex; flex-direction: column; gap: 6px; min-height: 0; }
.scn__t { display: flex; align-items: center; gap: 8px; font: 700 17px Onest; }
.scn__img { position: relative; flex: 1; min-height: 0; }
.scn__t span { padding: 3px 10px; border-radius: 999px; background: #EAF2FF; color: #1E6BE0; font: 600 13px Onest; }
.scn__img > img { display: block; width: 100%; height: 100%; }
.scn__div { height: 0; border-top: 2px dashed #C9D5EA; margin: 0 20px; }
.b { position: absolute; display: grid; place-items: center; border: 2.5px solid #fff; border-radius: 50%; background: linear-gradient(140deg, #1E6BE0, #0A2463); color: #fff; font: 800 15px/1 Onest; box-shadow: 0 4px 10px rgba(10,36,99,.25); transform: translate(-50%, -100%); }
.b.hid { opacity: .55; }
.l { position: absolute; padding: 3px 10px; border-radius: 999px; background: rgba(255,255,255,.92); color: #0A2463; font: 600 13px/1.2 Onest; white-space: nowrap; transform: translate(-50%, -50%); }
`;

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const today = () => new Date().toLocaleDateString('ru-RU');

function header(title, sub, chips) {
  return `<div class="hd"><div class="hd__logo"><img src="assets/mark.png" alt=""></div>
    <div class="hd__t"><b>${title}</b><span>${esc(sub)}</span></div>
    <div class="hd__chips">${chips.map(([t, k]) => `<span class="chip chip--${k}">${esc(t)}</span>`).join('')}</div></div>`;
}

// «Дополнительно»: значок — контур из app.js (addIcon), без цены — «по запросу»
function row(l, per) {
  const ask = l.price === null, none = l.price === undefined; // none — цена ещё не задана (HOME / FLATS / BIZ в data.js)
  const qty = ask ? t('уточним на осмотре') : l.qty === undefined ? '' : `${l.qty} ${l.unit}${l.price && l.qty > 1 ? ` × ${fmt(l.price)}` : ''}`;
  const ic = l.addon && !l.ic ? addIcon(l.addon).replace('<svg', '<svg style="width:26px;height:26px;fill:none;stroke:#1E6BE0;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round"') : l.ic ? `<img src="assets/icons/${l.ic}.webp" alt="">` : '';
  return `<div class="row"><span class="ic">${ic}</span>
    <div class="row__t"><b>${esc(l.name)}</b><div class="row__chips"><span class="q">${qty}</span>${per ? `<span class="q">${L('без покупки · только абонплата', 'сатып алмайсыз · тек абоненттік төлем')}</span>` : ''}</div></div>
    <div class="row__p">${ask ? t('по запросу') : l.included ? t('в комплекте') : none ? '' : (l.from ? `${t('от')} ` : '') + fmt(per ? l.price : l.sum)}${per ? `<small>${t('в месяц')}</small>` : ''}</div></div>`;
}

// новая страница: фон-чертёж, шапка-полоса; возвращает блок для содержимого
function page(host, bg, head) {
  const pg = document.createElement('div');
  pg.className = 'pg';
  pg.innerHTML = `<img class="pg__bg" src="${bg}" alt=""><div class="pg__in">${head}<div class="body"></div></div>`;
  host.appendChild(pg);
  return pg;
}

// смета: позиции идут, пока помещаются; не влезло — следующий лист (шапка с «Лист N»), подвал — только на первом
function smetaPages(host, bg, ctx, sub) {
  const { e } = ctx;
  const n = e.eq.length + e.work.length;
  const blocks = [
    `<div class="sec">${L('Оборудование и работы', 'Жабдық және жұмыс')}</div>`,
    ...[...e.eq, ...e.work].map((l) => row(l)),
    // опции с ценой входят в итог — поэтому раздел до строки «Итого»
    ...(e.extra.length ? [`<div class="grp"><div class="sec">${t('Дополнительно')}</div>${e.extra.map((l) => row(l)).join('')}</div>`] : []),
    `<div class="tot"><div><small>${L('ИТОГО ПО СМЕТЕ · РАЗОВО', 'СМЕТА БОЙЫНША БАРЛЫҒЫ · БІР РЕТ')}</small><b>${e.draft ? `${t('от')} ` : ''}${fmt(e.total)}</b></div><span>${n} ${plural(n, 'позиция', 'позиции', 'позиций')}</span></div>`,
    // раздел целиком — заголовок не отрывается от строк
    ...(e.monthly.length ? [`<div class="grp"><div class="sec">${t('Ежемесячно')}</div>${e.monthly.map((l) => row(l, true)).join('')}</div>`] : []),
  ];
  const pages = [];
  let pg, body;
  const open = () => {
    pg = page(host, bg, header('Смета', sub, [[CITY(), 'glass'], [today(), 'white']]));
    body = pg.querySelector('.body');
    if (!pages.length) pg.querySelector('.pg__in').insertAdjacentHTML('beforeend', `<div class="ft"><span>${FOOT()[0]}</span><span>${FOOT()[1]}</span></div>`);
    pages.push(pg);
  };
  open();
  for (const b of blocks) {
    body.insertAdjacentHTML('beforeend', b);
    if (body.scrollHeight > body.clientHeight + 1 && body.children.length > 1) {
      body.lastElementChild.remove();
      open();
      body.insertAdjacentHTML('beforeend', b);
    }
  }
  if (pages.length > 1) pages.forEach((p, i) => { p.querySelector('.chip--white').textContent = L(`Лист ${i + 1} из ${pages.length}`, `${i + 1}/${pages.length} бет`); });
}

// лист схемы: снаружи и внутри одна под другой, номера и подписи — внутри чертежа
function schemePage(host, bg, ctx, sub, mode, sheet) {
  const pg = page(host, bg, header(L('Схема установки', 'Орнату схемасы'), sub, [[CITY(), 'glass'], [`${L(`Лист ${sheet} из 2`, `${sheet}/2 бет`)} · ${mode.toUpperCase()}`, 'white']]));
  const body = pg.querySelector('.body');
  body.outerHTML = '<div class="card"></div>';
  const card = pg.querySelector('.card');
  const c = ctx.e.c;
  const parts = [['out', c.out, 1], ['in', c.inn, c.out + 1]];
  card.innerHTML = parts.map(([k, n]) => `<div class="scn" data-k="${k}"><div class="scn__t">${esc(t(ctx.scene[k].title))}<span>${n} ${plural(n, 'камера', 'камеры', 'камер')}</span></div><div class="scn__img"></div></div>`).join('<div class="scn__div"></div>');
  for (const [k, n, start] of parts) {
    const box = card.querySelector(`[data-k="${k}"] .scn__img`);
    const w = box.clientWidth, h = box.clientHeight;
    const shot = Scheme3D.snapshot(k, ctx.scene[k], n, start, mode, Math.round(w * SCALE), Math.round(h * SCALE));
    box.insertAdjacentHTML('beforeend', `<img src="${shot.url}" alt="">` + shot.marks.map((m) => m.kind === 'b'
      ? `<span class="b${m.hid ? ' hid' : ''}" style="left:${m.x / SCALE}px;top:${m.y / SCALE}px;width:${Math.round(m.size * 1.25)}px;height:${Math.round(m.size * 1.25)}px;font-size:${Math.round(m.size * 0.62)}px">${m.text}</span>`
      : `<span class="l" style="left:${m.x / SCALE}px;top:${m.y / SCALE}px">${esc(m.text)}</span>`).join(''));
  }
}

export async function downloadPdf(ctx) {
  await libs();
  if (!window.Scheme3D) throw new Error('схема ещё не загрузилась');
  const host = document.createElement('div');
  host.style.cssText = `position:fixed;left:-${W + 200}px;top:0;width:${W}px;z-index:-1;`;
  host.innerHTML = `<style>${CSS}</style>`;
  document.body.appendChild(host);
  try {
    const bg = blueprint();
    const sub = `${ctx.obj} · ${ctx.e.c.total} ${plural(ctx.e.c.total, 'камера', 'камеры', 'камер')}`;
    smetaPages(host, bg, ctx, sub);
    schemePage(host, bg, ctx, sub, '2d', 1);
    schemePage(host, bg, ctx, sub, '3d', 2);
    await Promise.all([...host.querySelectorAll('img')].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })));

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    const pages = [...host.querySelectorAll('.pg')];
    const fontEmbedCSS = await onestCss(); // шрифт встраиваем сами: чужие таблицы стилей библиотеке не прочитать
    for (let i = 0; i < pages.length; i++) {
      const canvas = await htmlToImage.toCanvas(pages[i], { pixelRatio: SCALE, width: W, height: H, backgroundColor: '#0A2463', fontEmbedCSS });
      if (i) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 595.28, 841.89);
    }
    pdf.save(`Baqyla — ${L('расчёт', 'есеп')}, ${ctx.obj.toLowerCase()}, ${today()}.pdf`);
  } finally {
    host.remove();
  }
}
