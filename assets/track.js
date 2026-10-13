// Аналитика: анонимные события сайта → Supabase CRM, таблица site_events (baqyla-crm/supabase/site-analytics.sql).
// Смотреть — админка, вкладка «Аналитика» (admin-stats.js). Без имён, телефонов и IP: случайный id браузера и визита,
// страница, откуда пришёл, устройство, язык. Не пишем с localhost и file://, от роботов и из браузера,
// где входили в админку (admin.js ставит baqyla-no-track), — чтобы свои заходы не мешались с клиентскими.
// Подключать после data.js (нужен CRM) и до скрипта страницы: адрес ?utm_…/?obj=… app.js потом убирает.
// track('pdf', { … }) — событие со страницы; звонки и WhatsApp по ссылкам ловятся здесь сами.

const track = (() => {
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (_) { return null; } return v; };
  const on = window.TRACK_TEST || (location.protocol === 'https:' && !navigator.webdriver
    && !/bot|crawl|spider|headless|lighthouse|preview/i.test(navigator.userAgent) && !store('baqyla-no-track'));
  if (!on) return () => {};

  const rnd = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  // браузер — навсегда; визит — новый после 30 минут без действий (общий для всех вкладок)
  let vid = store('baqyla-vid'), isNew = false;
  if (!/^[a-z0-9]{6,24}$/.test(vid || '')) { vid = rnd(); isNew = true; store('baqyla-vid', vid); }
  let visit = {};
  try { visit = JSON.parse(store('baqyla-visit')) || {}; } catch (_) { /* нет */ }
  if (!/^[a-z0-9]{6,24}$/.test(visit.sid || '') || Date.now() - visit.t > 30 * 60e3) visit = { sid: rnd() };
  const page = (location.pathname.match(/([a-z-]+)\.html$/) || [, 'index'])[1].slice(0, 20);

  let dead = false; // таблицы нет (site-analytics.sql не выполнен) — до перезагрузки не стучимся
  function send(ev, data = {}) {
    if (dead) return;
    visit.t = Date.now();
    store('baqyla-visit', JSON.stringify(visit));
    fetch(`${CRM.url}/rest/v1/site_events`, {
      method: 'POST',
      keepalive: true, // уходит, даже если клиент сразу перешёл в WhatsApp
      headers: { apikey: CRM.key, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ vid, sid: visit.sid, ev, page, data }),
    }).then((r) => { if (r.status === 404) dead = true; }).catch(() => {});
  }

  // заход на страницу: откуда, с чего, на чём — адрес читаем сразу, пока страница его не почистила
  const q = new URLSearchParams(location.search), cut = (v) => (v || '').slice(0, 60);
  const ua = navigator.userAgent;
  let ref = '';
  try { const h = new URL(document.referrer).hostname; if (h !== location.hostname) ref = h.replace(/^www\./, ''); } catch (_) { /* прямой заход */ }
  const view = {
    ref,
    src: cut(q.get('utm_source')),
    med: cut(q.get('utm_medium')),
    camp: cut(q.get('utm_campaign')),
    ad: q.has('gclid') ? 'google' : q.has('fbclid') ? 'meta' : q.has('yclid') ? 'yandex' : '',
    app: /Instagram/.test(ua) ? 'instagram' : /FBAN|FBAV|FB_IAB/.test(ua) ? 'facebook' : /musical_ly|TikTok|Bytedance/i.test(ua) ? 'tiktok' : /Telegram/i.test(ua) ? 'telegram' : '',
    dev: /iPad|Tablet/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) ? 'tablet' : /Mobi|Android|iPhone/.test(ua) ? 'mobile' : 'desktop',
    lang: typeof I18N === 'object' ? I18N.lang : 'ru',
    nv: isNew ? 1 : 0,
    from: q.has('obj') ? (q.has('cams') ? 'share' : 'kit') : '',
  };
  for (const k in view) if (view[k] === '') delete view[k];
  send('view', view);

  // звонок и WhatsApp — по любой ссылке на странице; «Отправить расчёт монтажнику» (#send) — из расчёта
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (a.href.startsWith('tel:')) send('call');
    else if (/wa\.me\//.test(a.href)) send('wa', { where: a.id === 'send' ? 'calc' : 'contacts' });
  }, true);
  addEventListener('langchange', () => send('lang', { to: I18N.lang }));

  return send;
})();
