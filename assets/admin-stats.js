// Админка, вкладка «Аналитика» (admin.html#stats). Подключается после admin.js: берёт оттуда $, api, session, logout.
// Источники: события сайта — таблица site_events (пишет track.js, SQL — baqyla-crm/supabase/site-analytics.sql);
// заявки с сайта — CRM, таблица records: заметка «Заявка с сайта…» (site_lead) → сделка: этап, сумма, «Сдан», «Отказ».
// Всё считается здесь, в браузере: за период и за такой же период перед ним (стрелки ▲▼ у плиток).

const ST_PERIODS = [['today', 'Сегодня'], ['7', '7 дней'], ['30', '30 дней'], ['90', '90 дней'], ['all', 'Всё время']];
const ST_STAGES = [['new', 'Новая заявка'], ['consult', 'Консультация'], ['survey', 'Выезд на замер'], ['estimate', 'Смета отправлена'], ['install', 'Монтаж'], ['done', 'Сдан'], ['lost', 'Отказ']];
const ST_PAGES = { index: 'Расчёт (главная)', kits: 'Комплекты', equipment: 'Оборудование' };
const ST_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const CONTACT = ['lead', 'wa', 'call'];

let stPeriod = '30', stEvents = null, stLeads = null, stStages = null, stNoTable = false, stLoading = false, stAt = null, stErr = '';
let stLoadedFrom; // с какого момента загружены события: Date, null — все, undefined — ещё не грузили

const num = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ | /g, ' ');
const pct = (a, b) => (b ? `${(a / b * 100).toFixed(a / b < 0.1 && a ? 1 : 0).replace('.', ',')}%` : '—');
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayName = (d) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
const objName = (k) => (OBJECTS.find((o) => o.plan === k) || {}).t || k || '—';
const recName = (k) => {
  if (k === 'sd') return 'SD-карта в камере';
  const m = /^(\d+)x(\d+)$/.exec(k || '');
  return m ? diskLabel({ tb: +m[1], qty: +m[2] }) : 'Не выбрали';
};

// начало периода и такого же периода перед ним; all — без сравнения
function stRange() {
  const now = new Date(), start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (stPeriod === 'all') return { from: null, prev: null, to: now };
  if (stPeriod !== 'today') start.setDate(start.getDate() - (+stPeriod - 1));
  const len = now - start, prev = stPeriod === 'today' ? new Date(start - 864e5) : new Date(start - len);
  return { from: start, prev, to: now, prevTo: stPeriod === 'today' ? new Date(now - 864e5) : start };
}

// ---------- загрузка ----------

async function stFetchAll(path) { // по 1000 строк, пока не кончатся
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await api(path, { headers: { Range: `${from}-${from + 999}`, 'Range-Unit': 'items' } });
    if (r.status === 401) { logout('Сессия истекла — войдите снова'); return null; }
    if (r.status === 404) throw Object.assign(new Error('no table'), { noTable: true });
    if (!r.ok && r.status !== 206) throw new Error(r.status);
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

async function stLoad() {
  if (stLoading) return;
  stLoading = true;
  stRender();
  const { prev } = stRange();
  try {
    const since = prev ? `&at=gte.${prev.toISOString()}` : '';
    stNoTable = false;
    stEvents = await stFetchAll(`site_events?select=at,vid,sid,ev,page,data&order=id.asc${since}`).catch((e) => { if (e.noTable) { stNoTable = true; return []; } throw e; });
    if (stEvents === null) return;
    stEvents.forEach((e) => { e.t = new Date(e.at); });
    stLoadedFrom = prev;
    if (!stLeads) await stLoadLeads();
    stAt = new Date();
    stErr = '';
  } catch (_) {
    stEvents = stEvents || [];
    stErr = 'Не получилось загрузить аналитику — проверьте интернет и нажмите «Обновить».';
  } finally {
    stLoading = false;
  }
  stRender();
}

// заявки с сайта: заметка site_lead → сделка (этап и сумма — как сейчас в CRM)
async function stLoadLeads() {
  const acts = await stFetchAll(`records?collection=eq.activities&data->>text=like.${encodeURIComponent('Заявка с сайта*')}&select=data`);
  if (!acts) return;
  const deals = await stById('deals', acts.map((a) => a.data.dealId));
  const dl = Object.values(deals);
  const ests = await stById('estimates', dl.map((d) => d.estimateId));
  const clients = await stById('clients', acts.map((a) => a.data.clientId).concat(dl.map((d) => d.clientId)));
  const set = await stFetchAll('records?collection=eq.settings&id=eq.main&select=data');
  const custom = set && set[0] && set[0].data && set[0].data.stages;
  stStages = Array.isArray(custom) && custom.length ? custom.map((s) => [s.key, s.label]) : ST_STAGES;
  stLeads = acts.map((a) => {
    const deal = deals[a.data.dealId] || null;
    return { t: new Date(a.data.at), deal, est: deal && ests[deal.estimateId] || null, client: clients[(deal && deal.clientId) || a.data.clientId] || null,
      note: String(a.data.text || '').replace(/^Заявка с сайта \(калькулятор\)\.\s*/, '') };
  }).sort((a, b) => b.t - a.t);
}

// записи CRM по id (по 80 за запрос): { id: data }
async function stById(collection, ids) {
  ids = [...new Set(ids.filter(Boolean))];
  const out = {};
  for (let i = 0; i < ids.length; i += 80) {
    const rows = await stFetchAll(`records?collection=eq.${collection}&id=in.(${ids.slice(i, i + 80).join(',')})&select=id,data`);
    (rows || []).forEach((r) => { out[r.id] = r.data; });
  }
  return out;
}

// ---------- подсчёт ----------

// визиты из событий: откуда пришёл, на чём, куда дошёл, что посчитал
function stSessions(events) {
  const map = new Map();
  for (const e of events) {
    let s = map.get(e.sid);
    if (!s) map.set(e.sid, s = { sid: e.sid, vid: e.vid, t: e.t, view: null, evs: {}, pages: new Set(), calc: null, adds: new Set(), maxStep: -1, obj: null, index: false });
    s.evs[e.ev] = (s.evs[e.ev] || 0) + 1;
    s.pages.add(e.page);
    const d = e.data || {};
    if (e.ev === 'view') { if (!s.view) s.view = d; if (e.page === 'index') s.index = true; }
    if (e.ev === 'obj') { s.obj = d.obj; s.maxStep = Math.max(s.maxStep, 0); }
    if (e.ev === 'step') { s.maxStep = Math.max(s.maxStep, d.n); if (d.obj) s.obj = d.obj; if (d.n === 3) s.calc = d; }
    if ((e.ev === 'lead' || e.ev === 'pdf') && d.cams) s.calc = { ...d, n: 3 };
    if (e.ev === 'addon') s.adds.add(d.id);
  }
  return [...map.values()];
}

function srcOf(v) {
  if (!v) return 'Прямой заход';
  const s = (v.src || '').toLowerCase(), r = v.ref || '', sr = s + ' ' + r;
  if (/insta|^ig$/.test(s) || v.app === 'instagram' || /instagram/.test(r)) return 'Instagram';
  if (/face|^fb$|meta/.test(s) || v.app === 'facebook' || v.ad === 'meta' || /facebook|fb\.(com|me)/.test(r)) return 'Facebook';
  if (/tiktok/.test(sr) || v.app === 'tiktok') return 'TikTok';
  if (/telegram|^tg$/.test(s) || v.app === 'telegram' || /(^|\.)t\.me|telegram/.test(r)) return 'Telegram';
  if (/whatsapp|^wa$/.test(s) || /whatsapp|wa\.me/.test(r)) return 'WhatsApp';
  if (/2gis/.test(sr)) return '2ГИС';
  if (v.ad === 'google' || (/google/.test(s) && /cpc|ads|paid/.test(v.med || ''))) return 'Google Реклама';
  if (/google/.test(sr)) return 'Google';
  if (v.ad === 'yandex' || /yandex|(^|\.)ya\.ru/.test(sr)) return 'Яндекс';
  if (/olx/.test(sr)) return 'OLX';
  return s || r || 'Прямой заход';
}

function stCount(events, leads) {
  const ss = stSessions(events);
  const contact = (s) => CONTACT.some((k) => s.evs[k]);
  return {
    ss,
    visitors: new Set(events.map((e) => e.vid)).size,
    visits: ss.length,
    views: events.filter((e) => e.ev === 'view').length,
    started: ss.filter((s) => s.maxStep >= 0).length,
    scheme: ss.filter((s) => s.maxStep >= 3).length,
    contacted: ss.filter(contact).length,
    leads: leads.length,
    contact,
  };
}

// ---------- вёрстка: плитки, полосы, столбцы, таблицы ----------

const stEsc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function kpi(label, val, prev, show = num, hint = '') {
  let d = '';
  if (prev !== undefined && prev !== null) {
    if (!prev && !val) d = '<span class="kp__d">как и раньше</span>';
    else if (!prev) d = '<span class="kp__d is-up">▲ было 0</span>';
    else {
      const ch = Math.round((val - prev) / prev * 100);
      d = `<span class="kp__d${ch > 0 ? ' is-up' : ch < 0 ? ' is-down' : ''}">${ch > 0 ? '▲' : ch < 0 ? '▼' : '='} ${ch > 0 ? '+' : ''}${ch}%</span>`;
    }
  }
  return `<div class="kp"${hint ? ` data-tip="${stEsc(hint)}"` : ''}><span class="kp__l">${label}</span><b class="kp__v">${show(val)}</b>${d}</div>`;
}

// горизонтальные полосы: [{ l, v, note? }] — подпись и число сверху, полоса снизу; доля — от максимума
function bars(rows, { total, empty = 'Пока нет данных', max } = {}) {
  rows = rows.filter((r) => r.v > 0 || r.keep);
  if (!rows.length) return `<p class="st__empty">${empty}</p>`;
  const top = max || Math.max(...rows.map((r) => r.v));
  return `<div class="hb">${rows.map((r) => `<div class="hb__r"${r.tip ? ` data-tip="${stEsc(r.tip)}"` : ''}>
      <span class="hb__l">${stEsc(r.l)}</span>
      <span class="hb__v">${num(r.v)}${total ? `<small>${pct(r.v, total)}</small>` : ''}${r.note ? `<small>${r.note}</small>` : ''}</span>
      <span class="hb__t"><i style="width:${top ? Math.max(r.v / top * 100, r.v ? 1.5 : 0) : 0}%"></i></span>
    </div>`).join('')}</div>`;
}

const topOf = (counts, n = 10) => Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);
const tally = (list, key) => list.reduce((m, x) => { const k = key(x); if (k != null) m[k] = (m[k] || 0) + 1; return m; }, {});

// столбцы: [{ l, v, tip }] — подписи оси реже, если столбцов много
function cols(list, { every } = {}) {
  const top = Math.max(0, ...list.map((c) => c.v));
  if (!top) return '<p class="st__empty">Пока нет данных</p>';
  const step = every || Math.ceil(list.length / 7);
  const nice = top <= 2 ? 2 : top <= 4 ? 4 : Math.ceil(top / 4) * 4; // шкала 0 · половина · верх — целыми
  return `<div class="vc">
    <div class="vc__grid"><span>${num(nice)}</span><span>${num(nice / 2)}</span><span>0</span></div>
    <div class="vc__plot" style="--n:${list.length}">${list.map((c, i) => `<div class="vc__c" data-tip="${stEsc(c.tip || `${c.l}: ${num(c.v)}`)}">
        <i style="height:${c.v / nice * 100}%"></i><span class="vc__x">${i % step === 0 ? stEsc(c.l) : ''}</span></div>`).join('')}</div>
  </div>`;
}

// right — номера колонок с числами (по правому краю)
function table(head, rows, empty = 'Пока нет данных', right = head.map((_, i) => i > 0), mod = '') {
  if (!rows.length) return `<p class="st__empty">${empty}</p>`;
  const cls = (i) => (right[i] ? ' class="n"' : '');
  return `<div class="tb${mod}"><table><thead><tr>${head.map((h, i) => `<th${cls(i)}>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td${cls(i)}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

const card = (title, sub, body, cls = '') => `<section class="card st__card ${cls}"><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}${body}</section>`;

// ---------- разделы ----------

function stRender() {
  const box = $('#stBox');
  $('#stPeriods').innerHTML = ST_PERIODS.map(([k, l]) => `<button type="button" data-p="${k}" aria-pressed="${k === stPeriod}">${l}</button>`).join('');
  $('#stUpd').textContent = stLoading ? 'Загружаем…' : stAt ? `Обновлено в ${stAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}` : '';
  if (!stEvents) { box.innerHTML = '<section class="card"><p class="st__empty">Загружаем…</p></section>'; return; }

  const { from, prev, to, prevTo } = stRange();
  const inP = (t) => !from || (t >= from && t <= to);
  const inPrev = (t) => prev && t >= prev && t < prevTo;
  const ev = stEvents.filter((e) => inP(e.t)), evPrev = prev ? stEvents.filter((e) => inPrev(e.t)) : null;
  const leads = (stLeads || []).filter((l) => inP(l.t)), leadsPrev = prev ? (stLeads || []).filter((l) => inPrev(l.t)) : null;
  const c = stCount(ev, leads), p = evPrev && stCount(evPrev, leadsPrev);
  const P = (k) => (p ? p[k] : null);

  const html = [];
  if (stErr) html.push(card('Ошибка', '', `<p class="st__warn">${stErr}</p>`, 'st__full'));
  if (stNoTable) {
    html.push(card('Сбор статистики ещё не включён', '', `<p class="st__warn">Сайт пока не записывает посещения. Один раз выполните
      <b>baqyla-crm/supabase/site-analytics.sql</b> в Supabase → SQL Editor — цифры начнут копиться с этого момента.
      Заявки из CRM ниже считаются уже сейчас.</p>`, 'st__full'));
  }

  // главное
  html.push(`<div class="kps">
    ${kpi('Посетители', c.visitors, P('visitors'), num, 'Разные люди (браузеры), которые заходили на сайт')}
    ${kpi('Визиты', c.visits, P('visits'), num, 'Заходы на сайт. Новый визит — после 30 минут без действий')}
    ${kpi('Просмотры страниц', c.views, P('views'))}
    ${kpi('Начали расчёт', c.started, P('started'), num, 'Выбрали объект в калькуляторе или пришли по ссылке на расчёт')}
    ${kpi('Дошли до сметы', c.scheme, P('scheme'), num, 'Дошли до последнего шага — схема и смета')}
    ${kpi('Связались', c.contacted, P('contacted'), num, 'Визиты с заявкой, WhatsApp или звонком')}
    ${kpi('Конверсия', c.visits ? c.contacted / c.visits : 0, p ? (p.visits ? p.contacted / p.visits : 0) : null, (v) => pct(v, 1), 'Доля визитов, после которых связались')}
    ${kpi('Заявки в CRM', c.leads, P('leads'), num, 'Отправили заявку с сайта — она в CRM на этапе «Новая»')}
  </div>`);

  // посещаемость
  html.push(card('Посещаемость', stPeriod === 'today' ? 'Посетители по часам' : 'Посетители по дням', stTraffic(ev, from, to), 'st__wide'));

  // воронка калькулятора
  const idx = c.ss.filter((s) => s.index || s.maxStep >= 0);
  const fun = [
    ['Открыли расчёт', idx.length],
    ['Выбрали объект', idx.filter((s) => s.maxStep >= 0).length],
    ['Камеры', idx.filter((s) => s.maxStep >= 1).length],
    ['Запись и интернет', idx.filter((s) => s.maxStep >= 2).length],
    ['Схема и смета', idx.filter((s) => s.maxStep >= 3).length],
    ['Связались или скачали PDF', idx.filter((s) => c.contact(s) || s.evs.pdf).length],
  ];
  html.push(card('Воронка расчёта', 'Сколько визитов дошли до каждого шага калькулятора и где уходят',
    bars(fun.map(([l, v], i) => ({ l, v, keep: true, note: i && fun[i - 1][1] ? `−${pct(fun[i - 1][1] - v, fun[i - 1][1])} ушли` : '' })), { total: fun[0][1], max: fun[0][1] }), 'st__wide'));

  // откуда
  const bySrc = {};
  for (const s of c.ss) {
    const k = srcOf(s.view), r = bySrc[k] || (bySrc[k] = { visits: 0, started: 0, scheme: 0, contacted: 0 });
    r.visits++; if (s.maxStep >= 0) r.started++; if (s.maxStep >= 3) r.scheme++; if (c.contact(s)) r.contacted++;
  }
  const camps = tally(c.ss.filter((s) => s.view && s.view.camp), (s) => `${s.view.camp}${s.view.src ? ` · ${s.view.src}` : ''}`);
  html.push(card('Откуда приходят', 'По первой странице визита. «Прямой заход» — набрали адрес, закладка или ссылка из мессенджера без метки',
    table(['Источник', 'Визиты', 'Начали расчёт', 'Дошли до сметы', 'Связались', 'Конверсия'],
      Object.entries(bySrc).sort((a, b) => b[1].visits - a[1].visits).map(([k, r]) => [stEsc(k), num(r.visits), num(r.started), num(r.scheme), num(r.contacted), pct(r.contacted, r.visits)]))
    + (Object.keys(camps).length ? `<h3>Рекламные кампании (utm_campaign)</h3>${bars(topOf(camps).map(([l, v]) => ({ l, v })), { total: c.visits })}` : ''), 'st__wide'));

  // обращения
  const cnt = (k, f = () => true) => ev.filter((e) => e.ev === k && f(e)).length;
  html.push(card('Обращения', 'Сколько раз нажимали', bars([
    { l: 'Заявка отправлена', v: cnt('lead', (e) => !e.data.again), keep: true },
    { l: 'WhatsApp из расчёта', v: cnt('wa', (e) => e.data.where === 'calc'), keep: true },
    { l: 'WhatsApp из контактов', v: cnt('wa', (e) => e.data.where !== 'calc'), keep: true },
    { l: 'Звонок', v: cnt('call'), keep: true },
    { l: 'Скачали расчёт (PDF)', v: cnt('pdf'), keep: true },
    { l: 'Открыли форму заявки, но не отправили', v: Math.max(0, new Set(ev.filter((e) => e.ev === 'lead_open').map((e) => e.sid)).size - new Set(ev.filter((e) => e.ev === 'lead').map((e) => e.sid)).size) },
    { l: 'Заявка не ушла (ошибка)', v: cnt('lead_err') },
  ])));

  // аудитория
  const views1 = c.ss.filter((s) => s.view);
  const langSw = ev.filter((e) => e.ev === 'lang');
  html.push(card('Аудитория', '', `<h3>Устройство</h3>${bars([
      { l: 'Телефон', v: views1.filter((s) => s.view.dev === 'mobile').length },
      { l: 'Компьютер', v: views1.filter((s) => s.view.dev === 'desktop').length },
      { l: 'Планшет', v: views1.filter((s) => s.view.dev === 'tablet').length }], { total: views1.length })}
    <h3>Язык на входе</h3>${bars([
      { l: 'Русский', v: views1.filter((s) => s.view.lang !== 'kk').length },
      { l: 'Қазақша', v: views1.filter((s) => s.view.lang === 'kk').length }], { total: views1.length })}
    <h3>Новые и вернувшиеся</h3>${bars([
      { l: 'Первый раз на сайте', v: views1.filter((s) => s.view.nv).length },
      { l: 'Уже заходили раньше', v: views1.filter((s) => !s.view.nv).length }], { total: views1.length })}
    <p class="st__note">Переключали язык: ${num(langSw.length)} ${plural(langSw.length, 'раз', 'раза', 'раз')}${langSw.length ? ` (на казахский — ${num(langSw.filter((e) => e.data.to === 'kk').length)})` : ''}</p>`));

  // что считают
  html.push(card('Что считают', 'По визитам, которые дошли до сметы', stCalc(c.ss), 'st__wide'));

  // страницы и каталог
  html.push(card('Страницы', '', `<h3>Просмотры</h3>${bars(Object.entries(tally(ev.filter((e) => e.ev === 'view'), (e) => e.page)).map(([k, v]) => ({ l: ST_PAGES[k] || k, v })).sort((a, b) => b.v - a.v), { total: c.views })}
    <h3>Комплекты — «Открыть в расчёте»</h3>${bars(topOf(tally(ev.filter((e) => e.ev === 'kit'), (e) => e.data.name || e.data.id)).map(([l, v]) => ({ l, v })), { empty: 'Пока не открывали' })}
    <h3>Оборудование — переходы в Kaspi</h3>${bars(topOf(tally(ev.filter((e) => e.ev === 'kaspi'), (e) => e.data.name || e.data.id)).map(([l, v]) => ({ l, v })), { empty: 'Пока не переходили' })}
    <h3>Оборудование — какие разделы открывали</h3>${bars(topOf(tally(ev.filter((e) => e.ev === 'eq_tab'), (e) => (EQ_TYPES.find((t) => t.id === e.data.type) || {}).t || e.data.type)).map(([l, v]) => ({ l, v })), { empty: 'Пока не переключали' })}`));

  // когда
  const hours = Array(24).fill(0), days = Array(7).fill(0);
  for (const s of c.ss) { hours[s.t.getHours()]++; days[(s.t.getDay() + 6) % 7]++; }
  html.push(card('Когда заходят', 'Визиты по времени начала', `<h3>По часам</h3>${cols(hours.map((v, h) => ({ l: `${h}`, v, tip: `${h}:00–${h}:59 — ${num(v)} ${plural(v, 'визит', 'визита', 'визитов')}` })), { every: 3 })}
    <h3>По дням недели</h3>${cols(days.map((v, i) => ({ l: ST_DAYS[i], v, tip: `${ST_DAYS[i]} — ${num(v)} ${plural(v, 'визит', 'визита', 'визитов')}` })), { every: 1 })}`));

  // CRM
  html.push(card('Заявки с сайта в CRM', 'Этап и сумма — как сейчас в CRM. По дате заявки', stCrm(leads, p && leadsPrev), 'st__wide'));

  box.innerHTML = html.join('');
}

function stTraffic(ev, from, to) {
  const vis = (list) => new Set(list.map((e) => e.vid)).size;
  if (stPeriod === 'today') {
    const h = Array.from({ length: 24 }, () => []);
    ev.forEach((e) => h[e.t.getHours()].push(e));
    return cols(h.map((list, i) => ({ l: `${i}`, v: vis(list), tip: `${i}:00 — посетители ${num(vis(list))}, просмотры ${num(list.filter((e) => e.ev === 'view').length)}` })), { every: 3 });
  }
  const start = new Date(from || (ev[0] ? ev[0].t : to));
  start.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(to).setHours(0, 0, 0, 0) - start) / 864e5) + 1;
  const week = days > 92; // длинный период — по неделям
  const buckets = new Map();
  for (let i = 0; i < days; i += week ? 7 : 1) { const d = new Date(start); d.setDate(d.getDate() + i); buckets.set(dayKey(d), { d, list: [] }); }
  const keys = [...buckets.keys()];
  ev.forEach((e) => {
    let k = dayKey(e.t);
    if (week) { const i = Math.floor((new Date(e.t).setHours(0, 0, 0, 0) - start) / 864e5 / 7); k = keys[Math.min(i, keys.length - 1)]; }
    if (buckets.has(k)) buckets.get(k).list.push(e);
  });
  return cols([...buckets.values()].map(({ d, list }) => {
    const v = vis(list), vv = new Set(list.map((e) => e.sid)).size, pv = list.filter((e) => e.ev === 'view').length;
    return { l: dayName(d), v, tip: `${week ? 'Неделя с ' : ''}${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: week ? undefined : 'short' })}: посетители ${num(v)}, визиты ${num(vv)}, просмотры ${num(pv)}` };
  }));
}

function stCalc(ss) {
  const done = ss.filter((s) => s.calc);
  if (!done.length) return '<p class="st__empty">Пока никто не дошёл до сметы</p>';
  const cams = done.map((s) => s.calc.cams || 0), sums = done.map((s) => s.calc.sum || 0).filter(Boolean).sort((a, b) => a - b);
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const med = sums.length ? sums[Math.floor(sums.length / 2)] : 0;
  const bucket = (n) => (n <= 2 ? '1–2 камеры' : n <= 4 ? '3–4 камеры' : n <= 8 ? '5–8 камер' : n <= 16 ? '9–16 камер' : '17 и больше');
  const order = ['1–2 камеры', '3–4 камеры', '5–8 камер', '9–16 камер', '17 и больше'];
  const camT = tally(done, (s) => bucket(s.calc.cams || 0));
  const addT = {};
  ss.forEach((s) => s.adds.forEach((id) => { addT[id] = (addT[id] || 0) + 1; }));
  const objT = tally(ss.filter((s) => s.obj), (s) => s.obj);
  const viaLink = done.filter((s) => s.calc.via === 'link' || (s.view && s.view.from)).length;
  return `<div class="kps kps--in">
      ${kpi('Расчётов', done.length)}
      ${kpi('Камер в среднем', avg(cams), null, (v) => v.toFixed(1).replace('.', ','))}
      ${kpi('Сумма сметы в среднем', avg(sums), null, (v) => (v ? fmt(v) : '—'), 'Предварительная сумма, которую увидел клиент. Без позиций «по запросу»')}
      ${kpi('Сумма сметы, медиана', med, null, (v) => (v ? fmt(v) : '—'), 'Половина смет меньше этой суммы, половина — больше')}
    </div>
    <div class="st__two"><div>
    <h3>Объект</h3>${bars(Object.keys(PLANS).map((k) => ({ l: objName(k), v: objT[k] || 0 })), { total: Object.values(objT).reduce((a, b) => a + b, 0) })}
    <h3>Сколько камер</h3>${bars(order.map((l) => ({ l, v: camT[l] || 0 })), { total: done.length })}
    </div><div>
    <h3>Где камеры</h3>${bars([
      { l: 'Снаружи', v: done.reduce((a, s) => a + (s.calc.out || 0), 0), note: `в среднем ${avg(done.map((s) => s.calc.out || 0)).toFixed(1).replace('.', ',')}` },
      { l: 'Внутри', v: done.reduce((a, s) => a + (s.calc.inn || 0), 0), note: `в среднем ${avg(done.map((s) => s.calc.inn || 0)).toFixed(1).replace('.', ',')}` },
      { l: 'В лифте', v: done.reduce((a, s) => a + (s.calc.lift || 0), 0) }])}
    <h3>Запись</h3>${bars(topOf(tally(done, (s) => recName(s.calc.rec))).map(([l, v]) => ({ l, v })), { total: done.length })}
    <h3>Интернет на объекте</h3>${bars([
      { l: 'Есть', v: done.filter((s) => s.calc.net === 'yes').length },
      { l: 'Нет', v: done.filter((s) => s.calc.net === 'no').length },
      { l: 'Не ответили', v: done.filter((s) => !s.calc.net).length }], { total: done.length })}
    </div></div>
    <h3>«Дополнительно» — что выбирают</h3>${bars(topOf(addT, 16).map(([id, v]) => ({ l: (ADDON[id] || {}).t || id, v })), { total: done.length, empty: 'Пока ничего не выбирали' })}
    ${viaLink ? `<p class="st__note">Из них пришли сразу на схему по ссылке (комплект или «Поделиться»): ${num(viaLink)}</p>` : ''}`;
}

function stCrm(leads, prevLeads) {
  const stage = (l) => (l.deal ? l.deal.stage : null);
  const won = leads.filter((l) => stage(l) === 'done'), lost = leads.filter((l) => stage(l) === 'lost');
  const sum = (list) => list.reduce((a, l) => a + (+(l.deal && l.deal.amount) || 0), 0);
  const label = (k) => ((stStages || ST_STAGES).find((s) => s[0] === k) || [, k ? 'Этап убран' : 'Сделку удалили'])[1];
  const st = tally(leads, (l) => stage(l) || '');
  const reasons = tally(lost, (l) => (l.deal.lostReason || 'Без причины').trim());
  const fmtD = (t) => t.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '') + ', ' + t.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  return `<div class="kps kps--in">
      ${kpi('Заявок', leads.length, prevLeads ? prevLeads.length : null)}
      ${kpi('Сумма по сметам', sum(leads), prevLeads ? sum(prevLeads) : null, (v) => fmt(v), 'Сумма сделок по заявкам с сайта — как сейчас в CRM')}
      ${kpi('Сданы', won.length, null, num, 'Заявки, которые дошли до этапа «Сдан»')}
      ${kpi('Выручка со сданных', sum(won), null, (v) => fmt(v))}
      ${kpi('Заявка → сдан', leads.length ? won.length / leads.length : 0, null, (v) => pct(v, 1))}
      ${kpi('Отказы', lost.length)}
    </div>
    <div class="st__two">
      <div><h3>Где сейчас заявки</h3>${bars((stStages || ST_STAGES).map(([k]) => ({ l: label(k), v: st[k] || 0 })).concat(st[''] ? [{ l: 'Сделку удалили', v: st[''] }] : []), { total: leads.length, empty: 'Заявок за период нет' })}</div>
      <div><h3>Причины отказа</h3>${bars(topOf(reasons).map(([l, v]) => ({ l, v })), { empty: 'Отказов нет' })}</div>
    </div>
    <h3>Все заявки</h3>${stLeadList(leads, (l) => label(stage(l)), fmtD)}`;
}

const stPhone = (p) => String(p || '').replace(/^\+7(\d{3})(\d{3})(\d{2})(\d{2})$/, '+7 $1 $2 $3 $4');

// строка — коротко; по нажатию — клиент с телефоном, что посчитал на сайте и смета, как сейчас в CRM
function stLeadList(leads, stageOf, fmtD) {
  if (!leads.length) return '<p class="st__empty">Заявок за период нет</p>';
  return `<div class="ld"><div class="ld__h"><span>Когда</span><span>Заявка</span><span>Телефон</span><span class="n">Сумма</span><span>Этап</span></div>
    ${leads.map((l) => {
      const d = l.deal || {}, est = l.est, phone = (est && est.phone) || (l.client && l.client.phone) || '';
      // заметка site_lead — строки расчёта через «. »: «Объект: …. Камер: …»
      const calc = (l.note || (est && est.note) || '').split(/\.\s+(?=[А-ЯЁA-Z«])/).map((s) => s.trim().replace(/\.$/, '')).filter(Boolean);
      const lines = est && Array.isArray(est.lines) ? est.lines : [];
      const sub = lines.reduce((a, x) => a + (+x.qty || 0) * (+x.price || 0), 0), disc = est ? +est.discount || 0 : 0;
      return `<details class="ld__i"><summary>
          <span class="ld__t">${fmtD(l.t)}</span>
          <span class="ld__n">${stEsc(d.title || '—')}</span>
          <span class="ld__p">${stEsc(stPhone(phone) || '—')}</span>
          <span class="ld__s n">${+d.amount ? fmt(d.amount) : '—'}</span>
          <span class="ld__st">${stEsc(stageOf(l))}</span>
        </summary><div class="ld__b">
          <p class="ld__c"><b>${stEsc((l.client && l.client.name) || 'Клиент')}</b>${phone ? ` <a href="tel:${stEsc(phone)}">${stEsc(stPhone(phone))}</a>
            <a href="https://wa.me/${phone.replace(/\D/g, '')}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</p>
          ${calc.length ? `<h4>Расчёт клиента</h4><dl class="ld__calc">${calc.map((s) => {
            const i = s.indexOf(': ');
            return i > 0 ? `<dt>${stEsc(s.slice(0, i))}</dt><dd>${stEsc(s.slice(i + 2))}</dd>` : `<dd class="ld__w">${stEsc(s)}</dd>`;
          }).join('')}</dl>` : ''}
          ${est ? `<h4>Смета №${stEsc(est.number)}</h4>${table(['Позиция', 'Кол-во', 'Цена', 'Сумма'],
            lines.map((x) => [stEsc(x.name), `${num(+x.qty || 0)} ${stEsc(x.unit || '')}`, fmt(+x.price || 0), fmt((+x.qty || 0) * (+x.price || 0))])
              .concat(disc ? [['Скидка', '', `${num(disc)}%`, `−${fmt(sub * disc / 100)}`]] : [])
              .concat([['<b>Итого</b>', '', '', `<b>${fmt(sub * (1 - disc / 100))}</b>`]]), 'Позиций нет', [false, true, true, true], ' tb--est')}` : '<p class="st__empty">Смету удалили в CRM</p>'}
        </div></details>`;
    }).join('')}</div>`;
}

// ---------- подсказки по наведению и касанию ----------

const stTip = document.createElement('div');
stTip.className = 'st__tip';
stTip.setAttribute('role', 'tooltip');
document.body.appendChild(stTip);
function tipAt(el, x, y) {
  stTip.textContent = el.dataset.tip;
  stTip.classList.add('is-on');
  const w = stTip.offsetWidth, h = stTip.offsetHeight;
  stTip.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, x - w / 2))}px`;
  stTip.style.top = `${y - h - 12 < 8 ? y + 18 : y - h - 12}px`;
}
$('#tabStats').addEventListener('pointermove', (e) => {
  const el = e.target.closest('[data-tip]');
  if (!el) { stTip.classList.remove('is-on'); return; }
  tipAt(el, e.clientX, e.clientY);
});
$('#tabStats').addEventListener('pointerleave', () => stTip.classList.remove('is-on'));
addEventListener('scroll', () => stTip.classList.remove('is-on'), { passive: true });

$('#stPeriods').addEventListener('click', (e) => {
  const b = e.target.closest('[data-p]');
  if (!b || b.dataset.p === stPeriod) return;
  stPeriod = b.dataset.p;
  const need = stRange().prev;
  // уже загружено с запасом — просто пересчитываем; нужен более ранний период — догружаем
  if (stEvents && (stNoTable || stLoadedFrom === null || (need && stLoadedFrom && need >= stLoadedFrom))) stRender(); else stLoad();
});
$('#stRefresh').addEventListener('click', () => { stLeads = null; stLoad(); });

function statsOpen() { if (!stEvents && !stLoading) stLoad(); }
if (typeof tab !== 'undefined' && tab === 'stats' && session) statsOpen();
