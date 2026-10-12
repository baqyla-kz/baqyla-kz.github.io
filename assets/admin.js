// Админка (admin.html): настройки расчёта → Supabase, таблица site_settings, ключ SETTINGS_KEY (data.js).
// Вход — логин и пароль CRM (Supabase Auth, «логин» → логин@team.baqyla.kz), код 2FA — если MFA = true; менять может только тот, у кого право на сайт (is_site_admin).
// Значения по умолчанию и проверка — в data.js (HOME, FLATS, BIZ, PRICE.install, applySettings, calcSettings), сайт читает то же.

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const LOGIN_DOMAIN = 'team.baqyla.kz';
const SESSION = 'baqyla-admin-session-v2';
// 2FA пока выключена: вход по логину и паролю. Включить — true здесь и is_site_admin() с aal2 в site-security.sql
const MFA = false;
let session = null, dirty = false;

const fmtDate = (iso) => new Date(iso).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
const loginOf = (email) => (email || '').replace(`@${LOGIN_DOMAIN}`, '');

function msg(text, kind = '') {
  $('#msg').textContent = text;
  $('#msg').className = `msg${kind ? ` is-${kind}` : ''}`;
}

// ---------- вход: пароль → (если MFA) код из приложения ----------
// Правила записи — в baqyla-crm/supabase/site-security.sql.

const jwtOf = (token) => { try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch (_) { return {}; } };

function restoreSession() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION));
    if (s && s.exp > Date.now() / 1000 + 60 && (!MFA || jwtOf(s.token).aal === 'aal2')) return s;
  } catch (_) { /* нет сессии */ }
  return null;
}

const auth = (path, token, opt = {}) => fetch(`${CRM.url}/auth/v1/${path}`, {
  ...opt,
  headers: { apikey: CRM.key, ...(token && { Authorization: `Bearer ${token}` }), 'Content-Type': 'application/json' },
});
const sessionOf = (d, email) => ({ token: d.access_token, email: (d.user && d.user.email) || email, exp: Math.floor(Date.now() / 1000) + (d.expires_in || 3600) });

async function signIn(login, password) { // → вход по паролю, ещё без кода
  const l = login.trim().toLowerCase();
  const email = l.includes('@') ? l : `${l}@${LOGIN_DOMAIN}`;
  const r = await auth('token?grant_type=password', null, { method: 'POST', body: JSON.stringify({ email, password }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(r.status === 400 ? 'Неверный логин или пароль' : r.status === 429 ? 'Слишком много попыток — подождите пару минут' : 'Не получилось войти, попробуйте ещё раз');
  return sessionOf(d, email);
}

let pending = null; // вход по паролю, ждём код: { token, email, exp, factor }

async function startMfa(s) {
  // право на сайт — до кода, чтобы не заводить 2FA тем, кому сайт менять нельзя
  const r = await fetch(`${CRM.url}/rest/v1/rpc/is_site_editor`, { method: 'POST', headers: { apikey: CRM.key, Authorization: `Bearer ${s.token}`, 'Content-Type': 'application/json' }, body: '{}' });
  if (r.status === 404) throw new Error('В Supabase не выполнен site-security.sql');
  if (!r.ok) throw new Error('Не получилось войти, попробуйте ещё раз');
  if (await r.json() !== true) throw new Error('У этого входа нет права менять сайт');
  if (!MFA) { keep(s); $('#login').hidden = true; return openEditor(); }

  const u = await (await auth('user', s.token)).json().catch(() => ({}));
  const totp = (u.factors || []).filter((f) => f.factor_type === 'totp');
  let factor = totp.find((f) => f.status === 'verified');
  $('#mfaNew').hidden = !!factor;
  if (!factor) { // первый вход — заводим 2FA: недоделанные попытки убираем, показываем QR
    for (const f of totp) await auth(`factors/${f.id}`, s.token, { method: 'DELETE' }).catch(() => {});
    const e = await auth('factors', s.token, { method: 'POST', body: JSON.stringify({ factor_type: 'totp', friendly_name: 'Baqyla', issuer: 'Baqyla' }) });
    const d = await e.json().catch(() => ({}));
    if (!e.ok || !d.totp) throw new Error('Не получилось включить 2FA — проверьте в Supabase: Authentication → MFA → TOTP');
    factor = d;
    $('#mfaQr').src = d.totp.qr_code;
    $('#mfaKey').textContent = d.totp.secret;
  }
  pending = { ...s, factor: factor.id };
  $('#login').hidden = true;
  $('#mfa').hidden = false;
  $('#mfaMsg').textContent = '';
  $('#mfaCode').value = '';
  $('#mfaCode').focus();
}

async function verifyMfa(code) {
  const c = await auth(`factors/${pending.factor}/challenge`, pending.token, { method: 'POST', body: '{}' });
  const ch = await c.json().catch(() => ({}));
  if (c.status === 401) throw new Error('expired');
  if (!c.ok) throw new Error(c.status === 429 ? 'Слишком много попыток — подождите пару минут' : 'Не получилось проверить код, попробуйте ещё раз');
  const v = await auth(`factors/${pending.factor}/verify`, pending.token, { method: 'POST', body: JSON.stringify({ challenge_id: ch.id, code }) });
  const d = await v.json().catch(() => ({}));
  if (v.status === 401) throw new Error('expired');
  if (!v.ok) throw new Error(v.status === 429 ? 'Слишком много попыток — подождите пару минут' : 'Неверный код');
  keep(sessionOf(d, pending.email));
  pending = null;
}

function keep(s) {
  session = s;
  try { sessionStorage.setItem(SESSION, JSON.stringify(s)); } catch (_) { /* приватный режим — до перезагрузки */ }
}

function logout(text) {
  if (session) auth('logout', session.token, { method: 'POST' }).catch(() => {}); // гасим сессию и на сервере
  session = null;
  pending = null;
  try { sessionStorage.removeItem(SESSION); } catch (_) { /* */ }
  $('#editor').hidden = true;
  $('#bar').hidden = true;
  $('#mfa').hidden = true;
  $('#login').hidden = false;
  $('#lgMsg').className = 'msg is-bad';
  $('#lgMsg').textContent = text || '';
}

const api = (path, opt = {}) => fetch(`${CRM.url}/rest/v1/${path}`, {
  ...opt,
  headers: { apikey: CRM.key, Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json', ...opt.headers },
});

$('#loginForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  $('#lgBtn').disabled = true;
  $('#lgMsg').className = 'msg';
  $('#lgMsg').textContent = 'Входим…';
  try {
    const s = await signIn($('#lgUser').value, $('#lgPass').value);
    $('#lgPass').value = '';
    $('#lgMsg').textContent = '';
    await startMfa(s);
  } catch (err) {
    $('#lgMsg').className = 'msg is-bad';
    $('#lgMsg').textContent = err.message;
  } finally {
    $('#lgBtn').disabled = false;
  }
});

$('#mfaForm').addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const code = $('#mfaCode').value.replace(/\D/g, '');
  if (code.length !== 6) { $('#mfaMsg').className = 'msg is-bad'; $('#mfaMsg').textContent = 'Нужно 6 цифр'; return; }
  $('#mfaBtn').disabled = true;
  $('#mfaMsg').className = 'msg';
  $('#mfaMsg').textContent = 'Проверяем…';
  try {
    await verifyMfa(code);
    $('#mfa').hidden = true;
    $('#mfaKey').textContent = '';
    $('#mfaQr').removeAttribute('src');
    await openEditor();
  } catch (err) {
    if (err.message === 'expired') { logout('Вход устарел — войдите снова'); return; }
    $('#mfaMsg').className = 'msg is-bad';
    $('#mfaMsg').textContent = err.message;
    $('#mfaCode').select();
  } finally {
    $('#mfaBtn').disabled = false;
  }
});

$('#mfaBack').addEventListener('click', () => logout());

$('#logout').addEventListener('click', () => logout());

// ---------- форма ----------

const getPath = (o, p) => p.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o);
function setPath(o, p, v) {
  const keys = p.split('.'), last = keys.pop();
  const t = keys.reduce((a, k) => (a[k] = a[k] && typeof a[k] === 'object' ? a[k] : {}), o);
  if (v === undefined) delete t[last]; else t[last] = v;
}
const numOf = (el) => {
  const v = el.value.trim().replace(',', '.');
  if (v === '') return undefined;
  const n = Number(v);
  return isFinite(n) && n >= 0 ? ('int' in el.dataset ? Math.round(n) : n) : undefined;
};

const money = (attrs) => `<span class="money"><input class="in in--num" type="number" min="0" step="1" inputmode="numeric" placeholder="нет цены" ${attrs}></span>`;

// разделы объектов — одинаковые, ключи полей: home.… / flats.… / business.…
const PATH_CARDS = [['home', 'Частный дом', 'частный дом'], ['flats', 'Многоквартирный дом', 'многоквартирный дом'], ['business', 'Коммерческий объект', 'коммерческий объект']];
const field = (k, label) => `<label class="f"><span>${label}</span><input class="in" data-k="${k}"></label>`;
const priceField = (k) => `<label class="f"><span>Цена за камеру</span>${money(`data-k="${k}" data-num`)}</label>`;

function pathCards(p, title, low) {
  return `<section class="card" data-path="${p}">
    <h2>${title}</h2>
    <p>Пустая цена — позиция в смете без цены, итог показывается «от …».</p>
    <div class="rule">Wi-Fi камеры без регистратора, если камер всего не больше
      <input class="in in--num" type="number" min="0" max="32" step="1" inputmode="numeric" data-k="${p}.wifiMaxCams" data-num data-int>
    </div>

    <h3>Камеры</h3>
    <div class="grid">
      ${field(`${p}.camWifi.name`, 'Wi-Fi камера (<span data-wifi-le></span>) — наименование')}${priceField(`${p}.camWifi.price`)}
      ${field(`${p}.cam.name`, 'Камера (<span data-wifi-gt></span>) — наименование')}${priceField(`${p}.cam.price`)}
      ${field(`${p}.camTalk.name`, 'Камера с динамиком (<span data-wifi-gt></span>, выбрано «Говорить через камеру») — наименование')}${priceField(`${p}.camTalk.price`)}
    </div>

    <h3>Регистратор (<span data-wifi-gt></span>)</h3>
    <div class="grid">${field(`${p}.nvr.name`, 'Наименование (в смете — «Регистратор 8 каналов»)')}</div>
    <div class="hdd" data-nvr></div>

    <h3>Запись</h3>
    <div class="grid">
      ${field(`${p}.sd.name`, 'SD-карта (<span data-wifi-le></span>, в смете «в комплекте» с камерой) — наименование')}
      <span></span>
      ${field(`${p}.hdd.name`, 'Жёсткий диск (<span data-wifi-gt></span>) — наименование')}
    </div>
    <div class="hdd" data-hdd></div>
    ${p === 'flats' ? `
    <h3>Камеры в лифте</h3>
    <p>Есть хоть одна камера в лифте — все камеры с регистратором, даже если камер мало. Камера — та же, что выше.</p>
    <div class="grid">
      ${field(`${p}.lift.bridge.name`, 'Радиомост (на каждую камеру в лифте) — наименование')}<label class="f"><span>Цена за шт</span>${money(`data-k="${p}.lift.bridge.price" data-num`)}</label>
      ${field(`${p}.lift.install.name`, 'Установка камеры в лифт (вместо обычной установки) — наименование')}<label class="f"><span>Цена за камеру</span>${money(`data-k="${p}.lift.install.price" data-num`)}</label>
    </div>` : ''}
  </section>

  <section class="card" data-path="${p}">
    <h2>Доп. материалы — ${low}</h2>
    <p>В смете — одна строка «Доп. материалы». Цена строки — сумма позиций; пока хоть у одной нет цены, строка без цены.</p>
    <h3>Wi-Fi камеры (<span data-wifi-le></span>) — на каждую камеру</h3>
    <div class="mt" data-group="wifi"></div>
    <h3>Камеры с регистратором (<span data-wifi-gt></span>) — на каждую камеру</h3>
    <div class="mt" data-group="poe"></div>
    <h3>Уличные камеры — на каждую, при любом количестве</h3>
    <div class="mt" data-group="out"></div>
    ${p === 'flats' ? `<h3>Камеры в лифте — на каждую</h3>
    <div class="mt" data-group="lift"></div>` : ''}
  </section>`;
}
$('#paths').innerHTML = PATH_CARDS.map(([p, t, l]) => pathCards(p, t, l)).join('');

function wifiLabels() {
  for (const [p] of PATH_CARDS) {
    const n = Number($(`[data-k="${p}.wifiMaxCams"]`).value) || 0;
    $$(`[data-path="${p}"] [data-wifi-le]`).forEach((e) => { e.textContent = `до ${n} ${plural(n, 'камеры', 'камер', 'камер')}`; });
    $$(`[data-path="${p}"] [data-wifi-gt]`).forEach((e) => { e.textContent = `больше ${n} ${plural(n, 'камеры', 'камер', 'камер')}`; });
  }
}

function materialRow(p, m = {}) {
  const cable = m.perCam === 'cable';
  const row = document.createElement('div');
  row.className = 'mt__row';
  row.innerHTML = `<label class="f"><span>Наименование</span><input class="in" data-m="name"></label>
    <label class="f"><span>Ед.</span><input class="in" data-m="unit"></label>
    <div class="mt__per"><label class="f"><span>На камеру</span><input class="in in--num" type="number" min="0" step="any" inputmode="decimal" data-m="perCam"></label>
      <label><input type="checkbox" data-m="cable"> по длине кабеля (${PLANS[p].cable} м)</label></div>
    <label class="f"><span>Цена за ед.</span>${money('data-m="price"')}</label>
    <button type="button" class="mt__del" aria-label="Удалить позицию">×</button>`;
  $('[data-m="name"]', row).value = m.name || '';
  $('[data-m="unit"]', row).value = m.unit || 'шт';
  $('[data-m="perCam"]', row).value = cable ? PLANS[p].cable : m.perCam ?? 1;
  $('[data-m="perCam"]', row).disabled = cable;
  $('[data-m="cable"]', row).checked = cable;
  $('[data-m="price"]', row).value = typeof m.price === 'number' ? m.price : '';
  return row;
}

function fill(v) {
  $$('[data-k]').forEach((el) => {
    const x = getPath(v, el.dataset.k);
    el.value = x === undefined || x === null ? '' : x;
  });
  for (const [p] of PATH_CARDS) {
    $(`[data-path="${p}"] [data-hdd]`).innerHTML = HDD_SIZES.map((tb) => `<label class="f"><span>Диск ${tb} ТБ</span>${money(`data-k="${p}.hdd.prices.${tb}" data-num`)}</label>`).join('');
    $(`[data-path="${p}"] [data-nvr]`).innerHTML = NVR_CH.map((ch, i) => `<label class="f"><span>${ch} ${plural(ch, 'канал', 'канала', 'каналов')} (${i ? `${NVR_CH[i - 1] + 1}–${ch}` : `до ${ch}`} камер)</span>${money(`data-k="${p}.nvr.prices.${ch}" data-num`)}</label>`).join('');
  }
  $$('[data-hdd] [data-k], [data-nvr] [data-k]').forEach((el) => { const x = getPath(v, el.dataset.k); el.value = typeof x === 'number' ? x : ''; });
  $$('.mt[data-group]').forEach((box) => {
    const g = box.dataset.group, p = box.closest('[data-path]').dataset.path;
    box.innerHTML = `<div class="mt__row mt__head"><span>Наименование</span><span>Ед.</span><span>На камеру</span><span>Цена за ед.</span><span></span></div>`;
    (v[p].materials[g] || []).forEach((m) => box.appendChild(materialRow(p, m)));
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'mt__add';
    add.textContent = '+ Добавить позицию';
    box.appendChild(add);
  });
  wifiLabels();
  frames = JSON.parse(JSON.stringify(v.addons));
  renderPhotos();
}

function collect() {
  const v = calcSettings();
  for (const [p] of PATH_CARDS) { v[p].hdd.prices = {}; v[p].nvr.prices = {}; }
  $$('[data-k]').forEach((el) => {
    if ('num' in el.dataset) setPath(v, el.dataset.k, numOf(el));
    else setPath(v, el.dataset.k, el.value.trim());
  });
  $$('.mt[data-group]').forEach((box) => {
    v[box.closest('[data-path]').dataset.path].materials[box.dataset.group] = $$('.mt__row:not(.mt__head)', box).map((row) => {
      const m = { name: $('[data-m="name"]', row).value.trim(), unit: $('[data-m="unit"]', row).value.trim() || 'шт' };
      m.perCam = $('[data-m="cable"]', row).checked ? 'cable' : numOf($('[data-m="perCam"]', row)) ?? 0;
      const p = numOf($('[data-m="price"]', row));
      if (p !== undefined) m.price = Math.round(p);
      return m;
    }).filter((m) => m.name);
  });
  v.addons = JSON.parse(JSON.stringify(frames));
  return v;
}

$('#editor').addEventListener('input', (e) => {
  if (e.target.matches('[data-k$=".wifiMaxCams"]')) wifiLabels();
  dirty = true;
  msg('Есть несохранённые изменения');
});
$('#editor').addEventListener('change', (e) => {
  if (e.target.matches('[data-m="cable"]')) {
    const per = $('[data-m="perCam"]', e.target.closest('.mt__row'));
    per.disabled = e.target.checked;
    if (e.target.checked) per.value = PLANS[e.target.closest('[data-path]').dataset.path].cable;
  }
});
$('#editor').addEventListener('click', (e) => {
  if (e.target.closest('.mt__del')) {
    e.target.closest('.mt__row').remove();
  } else if (e.target.closest('.mt__add')) {
    const btn = e.target.closest('.mt__add');
    const row = materialRow(btn.closest('[data-path]').dataset.path);
    btn.before(row);
    $('[data-m="name"]', row).focus();
  } else return;
  dirty = true;
  msg('Есть несохранённые изменения');
});

addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault(); });


// ---------- фото «Дополнительно» ----------
// frames[id]: обычная карточка — { pic, move: [x, y, масштаб] } (фото вписано целиком и сдвинуто на x/y % рамки),
// «до | после» — { ba: [{ pic, cover: [x, y, масштаб], l }, …] } (фото заполняет половину, x/y — точка кадра).
let frames = {};
const phActive = {}; // у «до | после» — какая половина правится: 0 / 1

const MOVE_ZOOM = [0.3, 3], COVER_ZOOM = [1, 4];
const frameOf = (id, half) => (frames[id].ba ? frames[id].ba[half] : frames[id]);
const imgStyle = (f) => (f.move
  ? `transform:translate(${f.move[0]}%, ${f.move[1]}%) scale(${f.move[2]})`
  : `object-position:${f.cover[0]}% ${f.cover[1]}%;transform-origin:${f.cover[0]}% ${f.cover[1]}%;transform:scale(${f.cover[2]})`);
const imgTag = (f) => `<img class="${f.move ? 'is-fit' : ''}" src="${picUrl(f.pic)}" alt="" draggable="false" style="${imgStyle(f)}">`;

function phTile(a) {
  const f = frames[a.id], ba = !!f.ba, h = phActive[a.id] || 0, cur = frameOf(a.id, h);
  const z = cur.move ? cur.move[2] : cur.cover[2], [lo, hi] = cur.move ? MOVE_ZOOM : COVER_ZOOM;
  return `<div class="ph" data-id="${a.id}">
    <span class="ad__frame" data-frame="${a.id}">${ba
      ? f.ba.map((x, i) => `<span class="ad__half ad__half--${i ? 'b' : 'a'}${i === h ? ' is-act' : ''}">${imgTag(x)}<span class="ad__lbl">${esc(x.l)}</span></span>`).join('')
      : imgTag(f)}</span>
    <span class="ph__t">${a.t}</span>
    ${ba ? `<span class="ph__seg">${['«До»', '«После»'].map((t, i) => `<button type="button" data-half="${i}" aria-pressed="${i === h}">${t}</button>`).join('')}</span>
      <label class="f"><span>Подпись ${h ? '«после»' : '«до»'}</span><input class="in" data-lbl maxlength="24" value="${esc(cur.l)}"></label>` : ''}
    <label class="ph__zoom">Масштаб<input type="range" data-zoom min="${lo}" max="${hi}" step="0.01" value="${z}"><output>${Math.round(z * 100)}%</output></label>
    <span class="ph__acts">
      <label class="btn btn--ghost">Заменить фото<input type="file" accept="image/*" data-file></label>
      <button type="button" class="btn btn--ghost" data-reset>Сбросить кадр</button>
    </span>
  </div>`;
}

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const tileOf = (id) => $(`.ph[data-id="${id}"]`);
function renderPhotos() {
  $('#phGrid').innerHTML = Object.values(ADDON).map(phTile).join('');
}
function rerenderTile(id) { tileOf(id).outerHTML = phTile(ADDON[id]); }
function paintImg(id, half) { // во время перетаскивания — только стиль картинки
  const box = $(`[data-frame="${id}"]`, tileOf(id));
  const img = frames[id].ba ? box.querySelectorAll('.ad__half img')[half] : box.querySelector('img');
  img.style.cssText = imgStyle(frameOf(id, half));
}
function phDirty() { dirty = true; msg('Есть несохранённые изменения'); }

// перетаскивание кадра
let phDrag = null;
$('#phGrid').addEventListener('pointerdown', (e) => {
  const box = e.target.closest('[data-frame]');
  if (!box) return;
  e.preventDefault();
  const id = box.dataset.frame, r = box.getBoundingClientRect();
  let half = 0;
  if (frames[id].ba) {
    half = e.clientX - r.left < r.width / 2 ? 0 : 1;
    if ((phActive[id] || 0) !== half) { phActive[id] = half; rerenderTile(id); }
  }
  const f = frameOf(id, half), el = $(`[data-frame="${id}"]`, tileOf(id));
  const img = frames[id].ba ? el.querySelectorAll('.ad__half img')[half] : el.querySelector('img');
  const ratio = img.naturalWidth / img.naturalHeight || 4 / 3, cover = Math.max(r.width / ratio, r.height);
  phDrag = { id, half, el, sx: e.clientX, sy: e.clientY, w: r.width, h: r.height, rw: cover * ratio, rh: cover, start: [...(f.move || f.cover)] };
  el.classList.add('is-drag');
  el.setPointerCapture(e.pointerId);
});
$('#phGrid').addEventListener('pointermove', (e) => {
  if (!phDrag) return;
  const d = phDrag, f = frameOf(d.id, d.half), dx = e.clientX - d.sx, dy = e.clientY - d.sy;
  if (f.move) {
    const c = (v) => +Math.max(-100, Math.min(100, v)).toFixed(1);
    f.move[0] = c(d.start[0] + dx / d.w * 100);
    f.move[1] = c(d.start[1] + dy / d.h * 100);
  } else {
    const z = f.cover[2], ox = d.rw * z - d.w, oy = d.rh * z - d.h, c = (v) => +Math.max(0, Math.min(100, v)).toFixed(1);
    if (ox > 1) f.cover[0] = c(d.start[0] - dx / ox * 100);
    if (oy > 1) f.cover[1] = c(d.start[1] - dy / oy * 100);
  }
  paintImg(d.id, d.half);
});
const phEnd = () => {
  if (!phDrag) return;
  phDrag.el.classList.remove('is-drag');
  const f = frameOf(phDrag.id, phDrag.half);
  if ((f.move || f.cover).some((v, i) => v !== phDrag.start[i])) phDirty();
  phDrag = null;
};
$('#phGrid').addEventListener('pointerup', phEnd);
$('#phGrid').addEventListener('pointercancel', phEnd);

$('#phGrid').addEventListener('input', (e) => {
  const t = e.target.closest('.ph');
  if (!t) return;
  e.stopPropagation(); // не путать с полями цен
  const id = t.dataset.id, half = phActive[id] || 0, f = frameOf(id, half);
  if (e.target.matches('[data-zoom]')) {
    (f.move || f.cover)[2] = +e.target.value;
    e.target.nextElementSibling.textContent = `${Math.round(e.target.value * 100)}%`;
    paintImg(id, half);
  } else if (e.target.matches('[data-lbl]')) {
    f.l = e.target.value;
    $$('.ad__lbl', t)[half].textContent = f.l;
  } else return;
  phDirty();
});
$('#phGrid').addEventListener('click', (e) => {
  const t = e.target.closest('.ph');
  if (!t) return;
  const id = t.dataset.id;
  const hb = e.target.closest('[data-half]');
  if (hb) { phActive[id] = +hb.dataset.half; rerenderTile(id); return; }
  if (e.target.closest('[data-reset]')) {
    const f = frameOf(id, phActive[id] || 0);
    if (f.move) f.move = [0, 0, 1]; else f.cover = [50, 50, 1];
    rerenderTile(id);
    phDirty();
  }
});

// новое фото: сжимаем в WebP (до 1600 px по длинной стороне) и сразу кладём в Supabase Storage, папка site/addons
async function toWebp(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad(new Error('webp'))), 'image/webp', 0.85));
}
$('#phGrid').addEventListener('change', async (e) => {
  if (!e.target.matches('[data-file]')) return;
  e.stopPropagation();
  const file = e.target.files[0], t = e.target.closest('.ph'), id = t.dataset.id, half = phActive[id] || 0;
  if (!file) return;
  if (!file.type.startsWith('image/')) return msg('Это не картинка', 'bad');
  t.classList.add('ph__busy');
  msg('Загружаем фото…');
  try {
    const blob = await toWebp(file);
    const path = `addons/${id}${frames[id].ba ? `-${half ? 'b' : 'a'}` : ''}-${Date.now()}.webp`;
    const r = await fetch(`${CRM.url}/storage/v1/object/site/${path}`, {
      method: 'POST',
      headers: { apikey: CRM.key, Authorization: `Bearer ${session.token}`, 'Content-Type': 'image/webp' },
      body: blob,
    });
    if (r.status === 401) return logout('Сессия истекла — войдите снова');
    if (!r.ok) throw new Error(r.status === 403 ? 'Нет прав загружать фото' : 'Не получилось загрузить фото');
    const f = frameOf(id, half);
    f.pic = SITE_IMG + path;
    if (f.move) f.move = [0, 0, 1]; else f.cover = [50, 50, 1];
    rerenderTile(id);
    dirty = true;
    msg('Фото загружено — нажмите «Сохранить», чтобы оно появилось на сайте');
  } catch (err) {
    msg(err.message === 'webp' ? 'Не получилось обработать картинку' : err.message, 'bad');
    t.classList.remove('ph__busy');
  }
});

// ---------- загрузка и сохранение ----------

function stamp(row) {
  $('#stamp').textContent = row && row.updated_at ? `Изменено ${fmtDate(row.updated_at)}${row.updated_by ? ` · ${loginOf(row.updated_by)}` : ''}` : 'Ещё не сохранялось — показаны значения по умолчанию';
}

async function openEditor() {
  $('#login').hidden = true;
  $('#editor').hidden = false;
  $('#bar').hidden = false;
  $('#who').textContent = `Вход: ${loginOf(session.email)}`;
  msg('');
  let row = null;
  try {
    const r = await api(`site_settings?key=eq.${SETTINGS_KEY}&select=value,updated_at,updated_by`);
    if (r.status === 401) return logout('Сессия истекла — войдите снова');
    if (!r.ok) throw new Error(r.status);
    row = (await r.json())[0] || null;
    if (row) applySettings(row.value);
  } catch (_) {
    msg('Не получилось загрузить сохранённое — показаны значения по умолчанию. Выполнен ли site-settings.sql в Supabase?', 'bad');
  }
  stamp(row);
  fill(calcSettings());
  dirty = false;
}

$('#save').addEventListener('click', async () => {
  const btn = $('#save');
  const value = collect();
  btn.disabled = true;
  msg('Сохраняем…');
  try {
    const now = new Date().toISOString();
    const r = await api('site_settings?on_conflict=key', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ key: SETTINGS_KEY, value, updated_at: now, updated_by: session.email }),
    });
    if (r.status === 401) return logout('Сессия истекла — войдите снова, изменения не сохранены');
    if (r.status === 403) throw new Error('Нет прав менять настройки сайта');
    if (r.status === 404) throw new Error('В Supabase нет таблицы настроек — выполните site-settings.sql в SQL Editor и нажмите «Сохранить» ещё раз');
    if (!r.ok) throw new Error('Не получилось сохранить, попробуйте ещё раз');
    applySettings(value);
    fill(calcSettings()); // показываем то, что реально применится (пустые строки, кривые числа — отброшены)
    stamp({ updated_at: now, updated_by: session.email });
    dirty = false;
    msg('Сохранено — на сайте уже новые значения', 'ok');
  } catch (err) {
    msg(err.message, 'bad');
  } finally {
    btn.disabled = false;
  }
});

session = restoreSession();
if (session) openEditor();
