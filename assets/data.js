// Цены, планы и комплекты Baqyla — общие для страниц «Расчёт» и «Комплекты».
// Цены оборудования и материалов — у каждого объекта свои (HOME / FLATS / BIZ ниже), правятся в админке;
// в PRICE — общее для всех объектов: установка, носители, 4G-роутер.

const WA_PHONE = '77089804260';
const INSTALLER_PHONE = '77787943760'; // «Отправить расчёт монтажнику» на шаге «Схема»

// Заявки «Отправить на рассмотрение» → CRM (Supabase, функция site_lead — ~/dev/baqyla-crm/supabase/site-leads.sql).
// Ключ publishable — публичный по назначению: сайт может только вызвать site_lead, читать CRM им нельзя.
const CRM = { url: 'https://gzwexqyxllqkyiarrcae.supabase.co', key: 'sb_publishable_GXCmslqlrDBPmlUySnpuGg_AOS0lt7Q' };

const PRICE = {
  hddTb: [1, 2, 4, 6, 8], // объёмы дисков на шаге «Запись»; цены — у объекта (HOME.hdd.prices…)
  sd: { gb: 64 }, // SD-карта в Wi-Fi камере: объём для подсчёта дней; название — у объекта
  // наша работа за камеру — на всех шагах и для всех объектов
  install: { name: 'Установка камер', price: 15000 },
  // нет интернета на объекте — роутер с SIM в аренду: ежемесячно, в разовый итог не входит
  router4g: { name: 'Мобильный 4G-роутер с интернетом', price: 8000 },
  // ТЕХДОЛГ: коммутатор (иконка assets/icons/switch.webp) — правило, когда нужен, и цена; см. README «Техдолг»
  gbPerCamDay: 30, // 4 Мп, H.265, запас на движение
  maxPerZone: 16, // не больше 16 уличных и 16 внутренних камер; больше — считаем вручную
};

// План: x/y — точка крепления, a — куда смотрит камера (градусы, 0 = вправо, 90 = вниз).
// zones — карточки шага «Сколько камер и где?»: фото из assets/photos/, кадр pos = [x%, y%] и zoom
// выставлены в редакторе drafts/step2.html (не в git; запуск: python3 drafts/server.py . → http://localhost:5192/drafts/step2.html),
// правило то же: object-position + transform-origin = pos, scale(zoom).
const PLANS = {
  home: {
    tab: 'Дом',
    title: 'ЧАСТНЫЙ ДОМ',
    cable: 15,
    base: { out: [0, 1, 2, 3], in: [6, 7] }, // в каком порядке точки схемы заполняются счётчиками шага 2
    zones: {
      out: { t: 'Во дворе', d: 'Ворота, въезд, вокруг дома', photo: 'home-out', pos: [0, 71], zoom: 1.01 },
      in: { t: 'Внутри дома', d: 'Прихожая, гостиная, детская', photo: 'home-in', pos: [50, 76.5], zoom: 1 },
    },
    draw: `
      <path class="p-fence" d="M260 420 H20 V20 H620 V420 H360"/>
      <text class="p-label" x="310" y="434" text-anchor="middle">ВОРОТА</text>
      <path class="p-drive" d="M270 420 V290 M350 420 V290"/>
      <rect class="p-build" x="210" y="120" width="220" height="150"/>
      <path class="p-wall" d="M300 120 V200 M300 230 V270 M300 200 H360 M390 200 H430"/>
      <text class="p-label" x="320" y="105" text-anchor="middle">ДОМ</text>
      <rect class="p-build p-build--minor" x="50" y="50" width="90" height="64"/>
      <text class="p-label" x="95" y="87" text-anchor="middle">БАНЯ</text>
      <rect class="p-build p-build--minor" x="480" y="300" width="110" height="88"/>
      <text class="p-label" x="535" y="349" text-anchor="middle">ГАРАЖ</text>
    `,
    slots: [
      { x: 210, y: 120, a: 225, t: 'out', l: 'угол дома' },
      { x: 430, y: 120, a: 315, t: 'out', l: 'угол дома' },
      { x: 430, y: 270, a: 45, t: 'out', l: 'угол дома' },
      { x: 210, y: 270, a: 135, t: 'out', l: 'угол дома' },
      { x: 320, y: 270, a: 90, t: 'out', l: 'въезд и ворота' },
      { x: 285, y: 120, a: 270, t: 'out', l: 'задний двор' },
      { x: 222, y: 200, a: 0, t: 'in', l: 'прихожая' },
      { x: 375, y: 132, a: 90, t: 'in', l: 'гостиная' },
    ],
  },
  flats: {
    tab: 'Многоквартирный',
    title: 'МНОГОКВАРТИРНЫЙ ДОМ',
    cable: 15,
    base: { out: [0, 1, 2, 3], in: [6, 7] },
    zones: {
      out: { t: 'Снаружи дома', d: 'Входы, двор, парковка', photo: 'flats-out', pos: [50, 31.3], zoom: 1 },
      in: { t: 'Внутри подъезда', d: 'Холл, лестница, этажи', photo: 'flats-in', pos: [50, 100], zoom: 1 },
      lift: { t: 'В лифте', d: 'Кабина лифта', photo: 'flats-lift', pos: [22, 55], zoom: 1.1 }, // своя схема «Лифт» (scenes.js)
    },
    draw: `
      <path class="p-fence" d="M540 420 H20 V20 H620 V420 H610"/>
      <text class="p-label" x="575" y="434" text-anchor="middle">ВЪЕЗД</text>
      <rect class="p-build" x="60" y="40" width="520" height="110"/>
      <path class="p-wall" d="M233 40 V150 M407 40 V150"/>
      <path class="p-door" d="M135 150 H165 M305 150 H335 M475 150 H505"/>
      <text class="p-label" x="150" y="100" text-anchor="middle">ПОДЪЕЗД 1</text>
      <text class="p-label" x="320" y="100" text-anchor="middle">ПОДЪЕЗД 2</text>
      <text class="p-label" x="490" y="100" text-anchor="middle">ПОДЪЕЗД 3</text>
      <path class="p-drive" d="M40 260 H190 M40 310 H190 M40 360 H190 M90 230 V400 M140 230 V400"/>
      <text class="p-label" x="115" y="220" text-anchor="middle">ПАРКОВКА</text>
      <rect class="p-pen" x="250" y="220" width="190" height="120"/>
      <text class="p-label" x="345" y="285" text-anchor="middle">ДЕТСКАЯ ПЛОЩАДКА</text>
      <rect class="p-build p-build--minor" x="470" y="330" width="56" height="30"/>
      <text class="p-label" x="498" y="374" text-anchor="middle">БАКИ</text>
    `,
    slots: [
      { x: 150, y: 150, a: 90, t: 'out', l: 'подъезд 1' },
      { x: 320, y: 150, a: 90, t: 'out', l: 'подъезд 2' },
      { x: 490, y: 150, a: 90, t: 'out', l: 'подъезд 3' },
      { x: 60, y: 150, a: 120, t: 'out', l: 'парковка' },
      { x: 580, y: 150, a: 140, t: 'out', l: 'детская площадка' },
      { x: 600, y: 300, a: 100, t: 'out', l: 'въезд' },
      { x: 150, y: 52, a: 90, t: 'in', l: 'холл подъезда' },
      { x: 320, y: 52, a: 90, t: 'in', l: 'лифт' },
    ],
  },
  business: {
    tab: 'Бизнес',
    title: 'КОММЕРЧЕСКИЙ ОБЪЕКТ',
    cable: 15,
    base: { out: [0, 1, 2, 3], in: [4, 5, 6, 7] },
    zones: {
      out: { t: 'У входа и на улице', d: 'Вход, витрина, парковка', photo: 'biz-out', pos: [44.7, 64.2], zoom: 1.22 },
      in: { t: 'В помещении', d: 'Торговый зал, касса, склад', photo: 'biz-in', pos: [50, 93.6], zoom: 1 },
    },
    draw: `
      <rect class="p-street" x="0" y="392" width="640" height="48"/>
      <text class="p-label" x="320" y="421" text-anchor="middle">УЛИЦА</text>
      <path class="p-fence" d="M20 60 V380 H130"/>
      <path class="p-drive" d="M40 300 H130 M40 250 H130 M40 200 H130"/>
      <text class="p-label" x="74" y="190" text-anchor="middle">ПАРКОВКА</text>
      <rect class="p-build" x="150" y="60" width="420" height="280"/>
      <path class="p-wall" d="M440 60 V140 M440 170 V190 H570 M150 280 H200 M230 280 H260 V340"/>
      <text class="p-label" x="320" y="185" text-anchor="middle">ТОРГОВЫЙ ЗАЛ</text>
      <text class="p-label" x="505" y="130" text-anchor="middle">СКЛАД</text>
      <text class="p-label" x="205" y="316" text-anchor="middle">КАССА</text>
      <path class="p-door" d="M340 340 H390"/>
    `,
    slots: [
      { x: 365, y: 340, a: 90, t: 'out', l: 'вход' },
      { x: 150, y: 340, a: 150, t: 'out', l: 'парковка' },
      { x: 570, y: 60, a: 315, t: 'out', l: 'разгрузка' },
      { x: 570, y: 340, a: 45, t: 'out', l: 'угол здания' },
      { x: 162, y: 72, a: 40, t: 'in', l: 'торговый зал' },
      { x: 428, y: 200, a: 150, t: 'in', l: 'торговый зал' },
      { x: 250, y: 292, a: 180, t: 'in', l: 'касса' },
      { x: 452, y: 72, a: 40, t: 'in', l: 'склад' },
    ],
  },
};

// Шаг 1 расчёта: какой объект. icon — файл в assets/icons/.
const OBJECTS = [
  { plan: 'home', icon: 'house', t: 'Частный дом', d: 'Дом, дача, участок' },
  { plan: 'flats', icon: 'apartments', t: 'Многоквартирный дом', d: 'Подъезд, двор, парковка' },
  { plan: 'business', icon: 'office', t: 'Коммерческий объект', d: 'Магазин, офис, кафе, склад' },
];

// комплекты по умолчанию — пока в админке (вкладка «Комплекты») ничего не сохраняли; on — заготовленные места камер (slots).
// Старые ссылки ?kit=N из расчёта ведут сюда же, по номеру.
const KITS = [
  { name: 'Дом 1 камера', plan: 'home', on: [0], store: 'sd', text: '' },
  { name: 'Камера во двор', plan: 'flats', on: [0, 6], store: 'sd', text: '' },
  { name: 'Бизнес', plan: 'business', on: [0, 1, 2, 3, 4, 5, 6, 7], store: '4x1', text: 'Улица и торговый зал: восемь камер' },
  { name: 'Двор и подъезд', plan: 'flats', on: [0, 1, 2, 3, 6, 7], store: '4x1', text: 'Входы, парковка и холлы подъездов' },
];

// Блок «Дополнительно» под схемой: что клиент может добавить к системе.
// pic — assets/<pic>.webp. move: [x, y, масштаб] — фото вписано в рамку 4:3 целиком и сдвинуто на x/y % рамки;
// cover: [x, y, масштаб] — фото заполняет рамку (кадр как у фото шага 2). Кадры выставлены в drafts/addons-photos.html.
// ba — «до | после»: рамка пополам, слева кадр «до», справа «после».
// price: null — цены нет: в смете «по запросу», в итог не входит. per: 'cam' — на каждую камеру, 'one' — одна на объект.
// from: true — цена «от»: в смете «от 15 000 ₸», в итог идёт сама цена, итог тоже «от …». ic — иконка строки сметы (assets/icons), иначе контурный значок.
const ADDONS = [
  { g: 'Звук и камеры', items: [
    { id: 'mic', t: 'Микрофон в камере', d: 'Запись звука вместе с видео', pic: 'addons/mic', move: [0.2, -13.7, 1], wave: true, price: null, per: 'cam' },
    { id: 'talk', t: 'Говорить через камеру', d: 'Двусторонняя связь из приложения', pic: 'addons/talk', move: [33, 3.3, 1.75], price: null, per: 'cam' },
    { id: 'siren', t: 'Сирена и свет', d: 'Видит человека ночью — включает свет и сирену', pic: 'addons/siren', move: [0, 0, 1], price: null, per: 'cam' },
    { id: 'ptz', t: 'Поворотная камера', d: 'Поворот и приближение с телефона', pic: 'addons/ptz', move: [-24.2, -26.2, 2], price: null, per: 'one' },
    { id: 'zoom', t: 'Камера с зумом', d: 'Приближает дальние ворота и номера машин', price: null, per: 'one', ba: [
      { pic: 'photos/home-out', cover: [50, 40, 1], l: 'Без зума' },
      { pic: 'photos/home-out', cover: [72, 30, 3], l: 'Зум ×4' },
    ] },
    { id: 'wifi', t: 'Wi‑Fi камера', d: 'Где нельзя протянуть кабель', pic: 'addons/wifi', move: [0, 0, 1], price: null, per: 'one' },
    { id: 'monitor', t: 'Монитор', d: 'Смотреть камеры на месте', pic: 'addons/monitor', move: [0, 0, 1], price: 15000, from: true, ic: 'monitor', per: 'one' }, // в смете «от 15 000 ₸», в итог — 15 000 ₸
  ] },
  { g: 'Умная аналитика', items: [
    { id: 'human', t: 'Отличает людей и машины', d: 'Без ложных тревог от кошек и листвы', pic: 'addons/human', move: [0, 0, 1.158], price: null, per: 'cam' },
    { id: 'line', t: 'Пересечение линии', d: 'Уведомление, если зашли за забор', pic: 'addons/line', move: [33.2, 21.1, 1.87], price: null, per: 'one' },
    { id: 'plate', t: 'Распознавание номеров', d: 'Въезд, шлагбаум, список своих машин', pic: 'addons/plate', move: [-8.9, 23.9, 2.38], price: null, per: 'one' },
    { id: 'face', t: 'Распознавание лиц', d: 'Свои и чужие на входе', pic: 'addons/face', move: [15, 1.8, 1.341], price: null, per: 'one' },
    { id: 'count', t: 'Подсчёт посетителей', d: 'Сколько людей зашло за день', pic: 'addons/count', move: [0, 0, 1.478], price: null, per: 'one' },
  ] },
  { g: 'Охрана и датчики', items: [
    { id: 'pir', t: 'Датчик движения', d: 'Срабатывает, когда в помещении кто-то есть', pic: 'addons/pir', move: [0, 0, 1.712], price: null, per: 'one' },
    { id: 'door', t: 'Датчик двери или окна', d: 'Сообщит, что открыли', pic: 'addons/door', move: [-24.5, 52.4, 2.529], price: null, per: 'one' },
  ] },
];
const ADDON = Object.fromEntries(ADDONS.flatMap((g) => g.items.map((a) => [a.id, a])));

const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₸';

// по-казахски после числа форма слова одна: «5 камера»
function plural(n, one, few, many) {
  if (I18N.lang === 'kk') return t(one);
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

// ---------- расчёт ----------

function counts(s) {
  const plan = PLANS[s.plan];
  let out = s.extraOut, inn = s.extraIn;
  for (const i of s.on[s.plan]) plan.slots[i].t === 'out' ? out++ : inn++;
  const lift = plan.zones.lift ? s.extraLift || 0 : 0; // камеры в лифте — только у ЖК; в смете — как камеры внутри
  return { out, inn, lift, total: out + inn + lift };
}

// ---------- носитель записи ----------
// Ключи: 'sd' — карта в каждой камере; '2x1' — один диск 2 ТБ; '8x2' — два диска по 8 ТБ.
// Клиент выбирает носитель, дни записи считаются от числа камер и показываются примерно («6–8 дней»).

const DISKS = [
  ...PRICE.hddTb.map((tb) => ({ key: `${tb}x1`, tb, qty: 1 })),
  ...[2, 3, 4].map((q) => ({ key: `8x${q}`, tb: 8, qty: q })), // на 17–32 камеры одного диска мало
];
const SD = { key: 'sd', sd: true };

// дней записи: карта — своя у каждой камеры, диск — общий на все камеры
const storeDays = (o, n) => (o.sd ? PRICE.sd.gb : o.tb * o.qty * 1000 / n) / PRICE.gbPerCamDay;

// «6–8 дней»: от расчётного (с запасом на движение) до спокойного дня; больше двух месяцев — в месяцах
function daysRange(d) {
  const lo = Math.max(1, Math.floor(d));
  if (lo >= 60) return { num: `${Math.floor(lo / 30)}+`, unit: L('мес.', 'ай'), text: L(`больше ${Math.floor(lo / 30)} мес.`, `${Math.floor(lo / 30)} айдан көп`) };
  const hi = Math.max(lo + 1, Math.round(d * 1.25));
  const unit = plural(hi, 'день', 'дня', 'дней');
  return { num: `${lo}–${hi}`, unit, text: `${lo}–${hi} ${unit}` };
}

// варианты на шаге «Запись»: до wifiMaxCams камер — Wi-Fi камеры без регистратора, только SD;
// больше — регистратор, три диска, начиная с того, где хватит хотя бы на 3 дня
function storeOptions(s) {
  const c = counts(s), n = c.total;
  if (!n) return [];
  if (!wired(PATHS[s.plan], c)) return [SD];
  let i = DISKS.findIndex((d) => storeDays(d, n) >= 3);
  if (i < 0) i = DISKS.length - 1;
  return DISKS.slice(Math.max(0, Math.min(i, DISKS.length - 3)), i + 3);
}

// что считаем в смете: выбранный носитель; не выбран (или стал недоступен) — null, носителя в смете нет
const storeOf = (s) => storeOptions(s).find((o) => o.key === s.store) || null;

const diskLabel = (o) => (o.qty > 1 ? L(`${o.qty} диска по ${o.tb} ТБ`, `${o.tb} ТБ-тан ${o.qty} диск`) : L(`Диск ${o.tb} ТБ`, `${o.tb} ТБ диск`));
const storeLabel = (o) => (o.sd ? L(`Карта ${PRICE.sd.gb} ГБ в каждой камере`, `Әр камерада ${PRICE.sd.gb} ГБ карта`) : diskLabel(o));

// ---------- смета по объекту (шаги «Камеры», «Запись и интернет», «Схема», PDF, WhatsApp) ----------
// Ниже — значения по умолчанию частного дома (HOME); многоквартирный (FLATS) и коммерция (BIZ) — их копии, правятся отдельно.
// Их меняют в админке (admin.html): сохранённое лежит в Supabase
// (таблица site_settings, ключ 'calc') и накладывается поверх при загрузке сайта — applySettings().
// Нет цены (price не задан) → строка в смете без цены, в итог не входит, итог «от …».
const HOME = {
  plan: 'home',
  wifiMaxCams: 3, // до 3 камер всего — Wi-Fi камеры без регистратора, запись на SD; больше — камеры + регистратор + диск
  camWifi: { name: 'Камера' }, // до wifiMaxCams камер
  cam: { name: 'Камера 2 Мп', price: 19000 }, // больше wifiMaxCams, стандарт — 2 Мп без динамика
  camTalk: { name: 'Камера 2 Мп с динамиком', price: 28500 }, // больше wifiMaxCams и в «Дополнительно» выбрано «Говорить через камеру»
  // регистратор — по числу камер: до 4 — 4 канала, до 8 — 8, до 16 — 16, больше — 32; в смете «Регистратор 8 каналов»
  nvr: { name: 'Регистратор', prices: { 4: 49000, 8: 60000, 16: 123000, 32: 313000 } }, // по числу каналов
  sd: { name: 'Карта памяти microSD 64 ГБ' }, // до wifiMaxCams — всегда в смете «в комплекте» (Ezviz кладёт карту в коробку с камерой)
  hdd: { name: 'Жёсткий диск', prices: { 1: 35000, 2: 55000, 4: 80000 } }, // в смете «Жёсткий диск 2 ТБ»; prices — { '1': …, '2': … } по объёму в ТБ
  // «Доп. материалы» — в смете одна строка (иконка коробок), состав — здесь; perCam — сколько на одну камеру
  materials: {
    wifi: [ // до wifiMaxCams камер — на каждую камеру
      { name: 'Кабель-удлинитель питания', unit: 'м', perCam: 5, price: 250 },
    ],
    poe: [ // больше wifiMaxCams — на каждую камеру (питание идёт по кабелю от регистратора)
      { name: 'Кабель UTP Cat.5e (PoE)', unit: 'м', perCam: 'cable', price: 190 }, // 'cable' — метров на камеру из PLANS[…].cable
      { name: 'Коннектор RJ45', unit: 'шт', perCam: 2, price: 20 },
    ],
    out: [ // только уличные камеры, при любом количестве
      { name: 'Гофра 20 мм', unit: 'м', perCam: 5, price: 75 },
      { name: 'Гермобокс', unit: 'шт', perCam: 1 },
    ],
  },
};

// многоквартирный дом и коммерция — тот же путь, что частный: по умолчанию те же камеры, регистраторы, диски и материалы,
// но Wi-Fi камеры (Ezviz, SD-карта в комплекте) — только до 2 камер, с 3 камер — регистратор
const FLATS = { ...JSON.parse(JSON.stringify(HOME)), plan: 'flats', wifiMaxCams: 2 };
// камеры в лифте (только ЖК): хоть одна — все камеры проводные, с регистратором (каналы — по всем камерам вместе);
// на каждую камеру в лифте — радиомост (сигнал из шахты по воздуху), своя установка и материалы из materials.lift
FLATS.lift = {
  bridge: { name: 'Радиомост до 1 км', price: 45000 },
  install: { name: 'Установка камеры в лифт', price: 20000 }, // вместо обычной установки
};
FLATS.materials.lift = [{ name: 'Гермобокс', unit: 'шт', perCam: 1 }];
const BIZ = { ...JSON.parse(JSON.stringify(HOME)), plan: 'business', wifiMaxCams: 2 };
const PATHS = { home: HOME, flats: FLATS, business: BIZ }; // ключ — PLANS

const hasPrice = (p) => typeof p === 'number';
// камеры с регистратором: больше wifiMaxCams или есть камера в лифте
const wired = (P, c) => c.total > P.wifiMaxCams || c.lift > 0;

// состав «Доп. материалов»: [{ name, qty, unit, price? }]; P — HOME, FLATS или BIZ
function pathMaterials(P, s, c) {
  const m = P.materials, per = (p) => (p.perCam === 'cable' ? s.cable : p.perCam);
  const take = (list, cams) => list.map((p) => ({ name: t(p.name), qty: cams * per(p), unit: t(p.unit), price: p.price }));
  const all = [...take(wired(P, c) ? m.poe : m.wifi, c.total), ...take(m.out, c.out), ...take(m.lift || [], c.lift)].filter((p) => p.qty > 0);
  // одна позиция в разных группах (гермобокс на улицу и в лифт) — одной строкой
  return all.reduce((acc, p) => {
    const same = acc.find((q) => q.name === p.name && q.unit === p.unit && q.price === p.price);
    if (same) same.qty += p.qty; else acc.push({ ...p });
    return acc;
  }, []);
}

// строки сметы объекта; без цены — price не задан (undefined), sum 0. Названия — уже на языке страницы (t, L)
function pathLines(P, s, c, store) {
  const eq = [], work = [];
  const add = (list, name, qty, unit, price, ic) => qty > 0 && list.push({ name: t(name), qty, unit: t(unit), price, sum: hasPrice(price) ? qty * price : 0, ic });
  const wifi = !wired(P, c);
  const cam = wifi ? P.camWifi : (s.addons || []).includes('talk') ? P.camTalk : P.cam;
  add(eq, cam.name, c.total, 'шт', cam.price, 'camera');
  if (wifi) eq.push({ name: t(P.sd.name), qty: c.total, unit: t('шт'), price: 0, sum: 0, included: true, ic: 'sd' }); // в комплекте с камерой
  if (!wifi) {
    const ch = NVR_CH.find((n) => n >= c.total) || NVR_CH[NVR_CH.length - 1];
    add(eq, L(`${P.nvr.name} ${ch} ${plural(ch, 'канал', 'канала', 'каналов')}`, `${ch} арналы ${lc(t(P.nvr.name))}`), Math.ceil(c.total / ch), 'шт', P.nvr.prices[ch], 'nvr');
  }
  if (store && !store.sd) add(eq, L(`${P.hdd.name} ${store.tb} ТБ`, `${store.tb} ТБ ${lc(t(P.hdd.name))}`), store.qty, 'шт', P.hdd.prices[store.tb], 'hdd');
  if (P.lift) add(eq, P.lift.bridge.name, c.lift, 'шт', P.lift.bridge.price, 'router');
  // «Доп. материалы» — одна строка со стрелкой: внутри состав. Сумма — по позициям с ценой; есть без цены — partial, итог «от»
  const parts = pathMaterials(P, s, c).map((p) => ({ ...p, sum: hasPrice(p.price) ? p.qty * p.price : 0 }));
  const sum = parts.reduce((a, p) => a + p.sum, 0);
  const partial = !parts.every((p) => hasPrice(p.price));
  if (parts.length) eq.push({ name: t('Доп. материалы'), parts, price: sum || !partial ? sum : undefined, sum, partial, ic: 'box' }); // qty нет — одна строка
  add(work, PRICE.install.name, c.total - c.lift, 'шт', PRICE.install.price, 'tools');
  if (P.lift) add(work, P.lift.install.name, c.lift, 'шт', P.lift.install.price, 'tools');
  return { eq, work };
}

// ---------- настройки из админки ----------
// Объект настроек: { install: { name, price }, home: { …как HOME… }, flats: { …как FLATS… }, business: { …как BIZ… }, addons }.
// Всё проверяется: чужое и кривое — пропускаем. Нет flats / business (ещё не сохраняли) — берут настройки частного дома,
// кроме порога Wi-Fi камер (у них свой — 2).
const SETTINGS_KEY = 'calc';
const NVR_CH = [4, 8, 16, 32]; // каналы регистраторов
const HDD_SIZES = [...new Set(DISKS.map((d) => d.tb))];

// фото карточек «Дополнительно»: обычная — { pic, move }, «до | после» — { ba: [{ pic, cover, l }, …] }
const addonFrame = (a) => (a.ba ? { ba: a.ba.map(({ pic, cover, l }) => ({ pic, cover, l })) } : { pic: a.pic, move: a.move });

function calcSettings() { // текущие значения — для админки и сохранения
  const path = ({ plan, ...rest }) => rest;
  const addons = Object.fromEntries(Object.values(ADDON).map((a) => [a.id, addonFrame(a)]));
  return JSON.parse(JSON.stringify({ install: PRICE.install, home: path(HOME), flats: path(FLATS), business: path(BIZ), addons }));
}

// картинка: своя из assets ('addons/mic' → assets/addons/mic.webp; фото товаров — 'products/…') или загруженная в админке (Supabase Storage, папка site)
const SITE_IMG = `${CRM.url}/storage/v1/object/public/site/`;
const picOk = (p) => typeof p === 'string' && (/^[a-z0-9_-]+(\/[a-z0-9_-]+)*$/.test(p) || (p.startsWith(SITE_IMG) && !p.includes('..') && /^[\w./-]+$/.test(p.slice(SITE_IMG.length))));
const picUrl = (p) => (p.startsWith('https://') ? p : `assets/${p}.webp`);

// названия из админки сайт вставляет как HTML — без < > " ни тег, ни атрибут не подставить
const cleanStr = (x, d, max = 80) => (typeof x === 'string' && x.trim() ? x.replace(/[<>"]/g, '').trim().slice(0, max) || d : d);
const cleanNum = (x) => (typeof x === 'number' && isFinite(x) && x >= 0 && x <= 1e8 ? Math.round(x) : undefined);

function applySettings(v) {
  if (!v || typeof v !== 'object') return false;
  const str = cleanStr, num = cleanNum;
  const int = (x, lo, hi, d) => (Number.isInteger(x) && x >= lo && x <= hi ? x : d);
  const item = (src, def) => { // { name, price } — цена может отсутствовать
    const o = { name: str(src && src.name, def.name) };
    const p = num(src && src.price);
    if (p !== undefined) o.price = p;
    return o;
  };
  if (v.addons && typeof v.addons === 'object') {
    const n3 = (a, lo, hi, zlo, zhi) => Array.isArray(a) && a.length === 3 && a.every((x) => typeof x === 'number' && isFinite(x))
      && a[0] >= lo && a[0] <= hi && a[1] >= lo && a[1] <= hi && a[2] >= zlo && a[2] <= zhi ? a.map((x) => Math.round(x * 1000) / 1000) : null;
    for (const a of Object.values(ADDON)) {
      const f = v.addons[a.id];
      if (!f || typeof f !== 'object') continue;
      if (a.ba && Array.isArray(f.ba)) {
        a.ba = a.ba.map((half, i) => {
          const h = f.ba[i] || {};
          return { pic: picOk(h.pic) ? h.pic : half.pic, cover: n3(h.cover, 0, 100, 1, 6) || half.cover, l: str(h.l, half.l).replace(/[<>&"]/g, '').slice(0, 24) };
        });
      } else if (!a.ba) {
        if (picOk(f.pic)) a.pic = f.pic;
        a.move = n3(f.move, -100, 100, 0.2, 6) || a.move;
      }
    }
  }
  if (v.install) Object.assign(PRICE.install, { name: str(v.install.name, PRICE.install.name), price: num(v.install.price) ?? PRICE.install.price });
  const path = (P, h) => {
    if (!h || typeof h !== 'object') return;
    P.wifiMaxCams = int(h.wifiMaxCams, 0, 32, P.wifiMaxCams);
    P.camWifi = item(h.camWifi, P.camWifi);
    P.cam = item(h.cam, P.cam);
    P.camTalk = item(h.camTalk, P.camTalk);
    const nvrPrices = {};
    for (const ch of NVR_CH) { const p = num(h.nvr && h.nvr.prices && h.nvr.prices[ch]); if (p !== undefined) nvrPrices[ch] = p; }
    P.nvr = { name: str(h.nvr && h.nvr.name, P.nvr.name), prices: nvrPrices };
    P.sd = item(h.sd, P.sd);
    const prices = {};
    for (const tb of HDD_SIZES) { const p = num(h.hdd && h.hdd.prices && h.hdd.prices[tb]); if (p !== undefined) prices[tb] = p; }
    P.hdd = { name: str(h.hdd && h.hdd.name, P.hdd.name), prices };
    // лифт ещё ни разу не сохраняли в админке — остаются значения по умолчанию (FLATS.lift)
    if (P.lift && h.lift) for (const k of ['bridge', 'install']) if (h.lift[k]) P.lift[k] = item(h.lift[k], P.lift[k]);
    if (h.materials && typeof h.materials === 'object') {
      for (const g of ['wifi', 'poe', 'out', 'lift']) {
        if (g === 'lift' && !P.lift) continue;
        const list = h.materials[g];
        if (!Array.isArray(list)) continue;
        P.materials[g] = list.slice(0, 20).filter((m) => m && str(m.name)).map((m) => {
          const o = { name: str(m.name), unit: str(m.unit, 'шт').slice(0, 10), perCam: m.perCam === 'cable' ? 'cable' : typeof m.perCam === 'number' && m.perCam >= 0 && m.perCam <= 1000 ? m.perCam : 1 };
          const p = num(m.price);
          if (p !== undefined) o.price = p;
          return o;
        });
      }
    }
    // материалы лифта ещё не сохраняли — цена гермобокса та же, что у уличного
    if (P.lift && !(h.materials && Array.isArray(h.materials.lift))) {
      P.materials.lift = P.materials.lift.map((m) => {
        const same = m.price === undefined && P.materials.out.find((o) => o.name === m.name && hasPrice(o.price));
        return same ? { ...m, price: same.price } : m;
      });
    }
  };
  path(HOME, v.home);
  path(FLATS, v.flats || (v.home && { ...v.home, wifiMaxCams: FLATS.wifiMaxCams }));
  path(BIZ, v.business || (v.home && { ...v.home, wifiMaxCams: BIZ.wifiMaxCams }));
  return true;
}

// ---------- каталог «Оборудование» ----------
// Карточки правятся в админке (вкладка «Оборудование») → site_settings, ключ CATALOG_KEY: { cards: [карточка, …] }.
// Карточка: { id, type (раздел из EQ_TYPES), name, nameKk, spec, specKk, price?, from, per, pic, url, params, paramsKk, hidden }.
// url — ссылка на товар (Kaspi): есть — плитка открывает её в новой вкладке. params — строки под кнопкой «Параметры».
// Текст по-казахски — своё поле; пустое — перевод по словарю KK, нет и там — по-русски. Нет цены — «по запросу».
// Каталог ещё не сохраняли — карточки собираются из цен расчёта частного дома (catalogDefaults).
const CATALOG_KEY = 'catalog';
const CATALOG_MAX = 100;
const EQ_TYPES = [
  { id: 'cam', t: 'Камеры', ic: 'camera' },
  { id: 'nvr', t: 'Регистраторы', ic: 'nvr' },
  { id: 'hdd', t: 'Диски', ic: 'hdd' },
  { id: 'more', t: 'Дополнительно', ic: 'box' },
];
const EQ_PER = { month: 'в месяц', m: 'за метр' }; // после цены; на сайте — «в месяц» и «/ м»
let CATALOG = null; // null — из админки ещё не сохраняли
const cleanList = (a) => (Array.isArray(a) ? a.map((x) => cleanStr(x, '', 120)).filter(Boolean).slice(0, 12) : []);
const urlOk = (u) => typeof u === 'string' && u.length <= 400 && /^https:\/\/[^\s<>"']+$/.test(u);

function applyCatalog(v) {
  if (!v || !Array.isArray(v.cards)) return false;
  const ids = new Set();
  CATALOG = v.cards.slice(0, CATALOG_MAX).filter((c) => c && EQ_TYPES.some((ty) => ty.id === c.type) && cleanStr(c.name)).map((c, i) => {
    let id = typeof c.id === 'string' && /^[\w-]{1,40}$/.test(c.id) ? c.id : `c${i}`;
    if (ids.has(id)) id = `${id}-${i}`;
    ids.add(id);
    const o = {
      id, type: c.type,
      name: cleanStr(c.name), nameKk: cleanStr(c.nameKk, ''),
      spec: cleanStr(c.spec, '', 120), specKk: cleanStr(c.specKk, '', 120),
      from: c.from === true, per: Object.prototype.hasOwnProperty.call(EQ_PER, c.per) ? c.per : '',
      pic: picOk(c.pic) ? c.pic : `icons/${EQ_TYPES.find((ty) => ty.id === c.type).ic}`,
      url: urlOk(c.url) ? c.url : '',
      params: cleanList(c.params), paramsKk: cleanList(c.paramsKk),
      hidden: c.hidden === true,
    };
    const p = cleanNum(c.price);
    if (p !== undefined) o.price = p;
    return o;
  });
  return true;
}

// карточки по умолчанию — из цен расчёта (частный дом; радиомост — многоквартирный), позиции без цены не берём
function catalogDefaults() {
  const build = () => {
    const P = HOME, out = [];
    const add = (type, id, o) => hasPrice(o.price) && out.push({ id, type, ...o });
    add('cam', 'cam-wifi', { name: t(P.camWifi.name), spec: L('Wi‑Fi, запись на карту в камере', 'Wi‑Fi, камерадағы картаға жазады'), price: P.camWifi.price, pic: 'products/ezviz-h3c',
      url: 'https://kaspi.kz/shop/p/ezviz-kamera-videonabljudenija-h3c-2k-3mp-rasshirenie-2304x1296-173026430/?c=750000000',
      params: [L('Подключение по Wi‑Fi', 'Wi‑Fi арқылы қосылады'), L('Разрешение: 3\u00a0Мп', 'Ажыратымдылығы: 3\u00a0Мп'),
        L('Ночная съёмка: ИК‑подсветка до 30\u00a0м', 'Түнде түсіреді: ИҚ жарығы 30\u00a0м-ге дейін')] });
    // Hikvision Dual Light (LIU): одно фото на все, цена «от» — Kaspi + 10% запаса
    for (const [mp, model, price, ir] of [[2, 'DS-2CD1023G2-LIU', 23810, 30], [4, 'DS-2CD1043G2-LIU', 35130, 30], [6, 'DS-2CD1063G2-LIU', 41158, 40], [8, 'DS-2CD1083G2-LIU', 49292, 30]]) {
      add('cam', `hik-${mp}mp`, { name: L(`Камера Hikvision ${mp}\u00a0Мп`, `Hikvision ${mp}\u00a0Мп камерасы`), spec: model, price, from: true, pic: 'products/hikvision-liu',
        params: [L('Уличная, цилиндрическая', 'Көшеге арналған, цилиндр пішінді'), L('Подключение по кабелю (PoE)', 'Кабельмен қосылады (PoE)'),
          L('Встроенный микрофон', 'Ішінде микрофоны бар'), L(`Ночная съёмка: ИК‑подсветка до ${ir}\u00a0м`, `Түнде түсіреді: ИҚ жарығы ${ir}\u00a0м-ге дейін`),
          L('Защита от пыли и воды: IP67', 'Шаң мен судан қорғалған: IP67'), L('Сжатие видео: H.265', 'Видео сығымдау: H.265')] });
    }
    // регистраторы Hikvision: цена «от» — Kaspi + 15% запаса; фото — одно на 4 и 8 каналов, своё у 16- и 32-канальных. 4K на 8 камер — ставим 16-канальный.
    // [каналы, PoE-портов, камеры до (4 Мп / 4K / 12 Мп), модель, цена, дисков]; общие карточки расчёта заменены ими
    const ch_ = (n) => `${n}\u00a0${plural(n, 'канал', 'канала', 'каналов')}`;
    for (const [ch, poe, res, model, price, hdd] of [
      [4, 0, 4, 'DS‑7104NI‑Q1(D)', 31815], [4, 0, '4K', 'DS‑7604NI‑Q1(E)', 50209],
      [4, 4, 4, 'DS‑7104NI‑Q1/4P(D)', 57055], [4, 4, '4K', 'DS‑7604NI‑Q1/4P(E)', 73419],
      [8, 0, 4, 'DS‑7108NI‑Q1(D)', 39974], [16, 0, '4K', 'DS‑7616NI‑Q1(E)', 54204],
      [8, 8, 4, 'DS‑7108NI‑Q1/8P(D)', 79960], [16, 16, '4K', 'DS‑7616NI‑Q2/16P(E)', 136975, 2],
      [32, 0, 12, 'DS‑7632NXI‑K2(E)', 178523, 2]]) {
      const k4 = res === '4K', r = k4 ? '4K' : `${res}\u00a0Мп`;
      const m = `${hdd ? `, ${hdd}\u00a0${plural(hdd, 'диск', 'диска', 'дисков')}` : ''} · ${model}`, mKk = `${hdd ? `, ${hdd}\u00a0диск` : ''} · ${model}`;
      add('nvr', `hik-nvr-${ch}${poe ? `-poe${poe}` : ''}${k4 ? '-4k' : ''}`, {
        name: L(`Регистратор Hikvision ${k4 ? '4K, ' : ''}${ch_(ch)}${poe ? ` + ${poe}\u00a0PoE` : ''}`, `Hikvision ${k4 ? '4K, ' : ''}${ch} арналы${poe ? ` + ${poe}\u00a0PoE` : ''} регистраторы`),
        spec: L(`Для камер до ${r}${m}`, `${r}‑ге дейінгі камераларға${mKk}`), price, from: true, pic: `products/hikvision-nvr-${ch >= 16 ? ch : 4}ch` });
    }
    // диски WD Purple (для видеонаблюдения): цена «от» — как на Kaspi; общие карточки расчёта заменены ими. [ТБ, модель, цена, фото]
    for (const [tb, model, price, pic] of [[0.5, 'WD5000PURX', 11992, '500gb'], [1, 'WD10PURZ', 36592, '1tb'], [2, 'WD20PURZ', 54999, '2tb'],
      [3, 'WD30PURZ', 74999, '3tb'], [4, 'WD40PURZ', 83436, '4tb'], [8, 'WD80PURZ', 299999, '8tb']]) {
      const r = daysRange(storeDays({ tb, qty: 1 }, 4)), size = tb < 1 ? `${tb * 1000}\u00a0ГБ` : `${tb}\u00a0ТБ`;
      add('hdd', `wd-${pic}`, { name: L(`${P.hdd.name} WD Purple ${size}`, `WD Purple ${size} ${lc(t(P.hdd.name))}`),
        spec: L(`4 камеры пишут ${r.text}\u00a0· ${model}`, `4 камера ${r.text} жазады\u00a0· ${model}`), price, from: true, pic: `products/wd-purple-${pic}` });
    }
    add('hdd', 'sd', { name: t(P.sd.name), spec: L('Для Wi‑Fi камеры', 'Wi‑Fi камераға'), price: hasPrice(P.sd.price) ? P.sd.price : 6000, pic: 'icons/sd' }); // 6000 — пример из вайрфрейма
    const m = ADDON.monitor;
    add('more', 'monitor', { name: t(m.t), spec: t(m.d), price: m.price, from: !!m.from, pic: 'icons/monitor' });
    add('more', 'bridge', { name: t(FLATS.lift.bridge.name), spec: L('Сигнал из лифта без кабеля', 'Лифттен сигналды кабельсіз жеткізеді'), price: FLATS.lift.bridge.price, pic: 'icons/router' });
    add('more', 'switch', { name: L('Коммутатор PoE', 'PoE коммутатор'), spec: L('Питание и сеть по одному кабелю', 'Қуат пен интернет бір кабельмен'), price: 18000, pic: 'icons/switch' }); // пример из вайрфрейма
    add('more', 'router4g', { name: t(PRICE.router4g.name), spec: L('Если на объекте нет интернета', 'Интернет жоқ болса'), price: PRICE.router4g.price, per: 'month', pic: 'icons/router' });
    // материалы: одна позиция в разных группах (гермобокс и на улицу, и в лифт) — одной карточкой
    const seen = new Set();
    for (const p of Object.values(P.materials).flat()) {
      if (seen.has(p.name)) continue;
      seen.add(p.name);
      const pic = /RJ45/i.test(p.name) ? 'rj45' : /гофр/i.test(p.name) ? 'conduit' : /кабел/i.test(p.name) ? 'cable' : 'box';
      add('more', `mat-${seen.size}`, { name: t(p.name), spec: '', price: p.price, per: p.unit === 'м' ? 'm' : '', pic: `icons/${pic}` });
    }
    return out;
  };
  const ru = inLang('ru', build), kk = inLang('kk', build);
  return ru.map((c, i) => ({ from: false, per: '', url: '', params: [], hidden: false, ...c, nameKk: kk[i].name, specKk: kk[i].spec, paramsKk: kk[i].params || [] }));
}

const catalogCards = () => CATALOG || catalogDefaults();

// ---------- комплекты (страница «Комплекты») ----------
// Правятся в админке (вкладка «Комплекты») → site_settings, ключ KITS_KEY: { kits: [комплект, …] }.
// Комплект: { id, plan (раздел — ключ PLANS), name, nameKk, text, textKk, out, in (камер снаружи и внутри), store (запись: '2x1', 'sd' …),
//   price? (своя цена «под ключ»; нет — по смете), pic? (своё фото; нет — фото объекта с шага 2), hidden }.
// Состав и цена считаются тем же расчётом, что на странице «Расчёт» (estimate). Ещё не сохраняли — из KITS выше (kitsDefaults).
const KITS_KEY = 'kits';
const KITS_MAX = 30;
let KITS_SAVED = null; // null — из админки ещё не сохраняли

function applyKits(v) {
  if (!v || !Array.isArray(v.kits)) return false;
  const ids = new Set(), cams = (x) => (Number.isInteger(x) && x >= 0 && x <= PRICE.maxPerZone ? x : 0);
  KITS_SAVED = v.kits.slice(0, KITS_MAX).filter((k) => k && PLANS[k.plan] && cleanStr(k.name)).map((k, i) => {
    let id = typeof k.id === 'string' && /^[\w-]{1,40}$/.test(k.id) ? k.id : `k${i}`;
    if (ids.has(id)) id = `${id}-${i}`;
    ids.add(id);
    const o = {
      id, plan: k.plan,
      name: cleanStr(k.name), nameKk: cleanStr(k.nameKk, ''),
      text: cleanStr(k.text, '', 120), textKk: cleanStr(k.textKk, '', 120),
      out: cams(k.out), in: cams(k.in),
      store: typeof k.store === 'string' && /^(sd|\d+x\d+)$/.test(k.store) ? k.store : '',
      hidden: k.hidden === true,
    };
    const p = cleanNum(k.price);
    if (p !== undefined) o.price = p;
    if (picOk(k.pic)) o.pic = k.pic;
    return o;
  }).filter((k) => k.out + k.in > 0);
  return true;
}

function kitsDefaults() {
  return KITS.map((k, i) => {
    const c = counts({ plan: k.plan, on: { [k.plan]: new Set(k.on) }, extraOut: 0, extraIn: 0 });
    return { id: `kit-${i}`, plan: k.plan, name: k.name, nameKk: inLang('kk', () => t(k.name)), text: k.text, textKk: inLang('kk', () => t(k.text)),
      out: c.out, in: c.inn, store: k.store, hidden: false };
  });
}

const kitList = () => KITS_SAVED || kitsDefaults();
// комплект → состояние расчёта: камеры — счётчиками шага 2 (без заготовленных мест), запись — выбранная
const kitState = (k) => ({ plan: k.plan, on: { [k.plan]: new Set() }, extraOut: k.out, extraIn: k.in, extraLift: 0, store: k.store, cable: PLANS[k.plan].cable });
// «Открыть в расчёте» — та же ссылка, что у «Поделиться»: сразу на схему с этими камерами и записью
const kitHref = (k) => `index.html?${new URLSearchParams({ obj: k.plan, out: k.out, in: k.in, rec: k.store })}`;

// настройки из админки (admin.html → Supabase site_settings): сначала последние известные из браузера — без мигания цен,
// потом свежие с сервера → fresh() (перерисовать страницу); не получилось — остаются значения по умолчанию.
// withCatalog — ещё и карточки «Оборудования», withKits — комплекты
const SETTINGS_CACHE = 'baqyla-settings-v1';
const CATALOG_CACHE = 'baqyla-catalog-v1';
const KITS_CACHE = 'baqyla-kits-v1';
function loadSettings(fresh, withCatalog, withKits) {
  const parts = [[SETTINGS_KEY, SETTINGS_CACHE, applySettings]];
  if (withCatalog) parts.push([CATALOG_KEY, CATALOG_CACHE, applyCatalog]);
  if (withKits) parts.push([KITS_KEY, KITS_CACHE, applyKits]);
  for (const [, cache, apply] of parts) {
    try { apply(JSON.parse(localStorage.getItem(cache))); } catch (_) { /* нет кэша */ }
  }
  fetch(`${CRM.url}/rest/v1/site_settings?key=in.(${parts.map((p) => p[0]).join(',')})&select=key,value`, { headers: { apikey: CRM.key } })
    .then((r) => (r.ok ? r.json() : []))
    .then((rows) => {
      let got = false;
      for (const [key, cache, apply] of parts) {
        const row = rows.find((x) => x.key === key);
        if (!row || !apply(row.value)) continue;
        got = true;
        try { localStorage.setItem(cache, JSON.stringify(row.value)); } catch (_) { /* приватный режим */ }
      }
      if (got) fresh();
    })
    .catch(() => {});
}

function estimate(s) {
  const c = counts(s);
  if (!c.total) return { c, eq: [], work: [], extra: [], total: 0, monthly: [] };
  const store = storeOf(s);
  const P = PATHS[s.plan];
  const { eq, work } = pathLines(P, s, c, store);

  // «Дополнительно»: без цены — строка «по запросу», в итог не входит (sum 0, price null)
  // с регистратором: «Говорить через камеру» уже в цене камеры (камера с динамиком) — отдельной строкой не дублируем
  const inCam = (id) => id === 'talk' && wired(P, c);
  const extra = (s.addons || []).filter((id) => ADDON[id] && !inCam(id)).map((id) => {
    const a = ADDON[id], qty = a.per === 'cam' ? c.total : 1;
    return { name: t(a.t), qty, unit: t('шт'), price: a.price, sum: a.price === null ? 0 : qty * a.price, addon: id, ic: a.ic, from: a.from };
  });

  const total = [...eq, ...work, ...extra].reduce((a, l) => a + l.sum, 0);
  const monthly = [];
  if (s.net === 'no') monthly.push({ name: t(PRICE.router4g.name), qty: 1, unit: t('шт'), price: PRICE.router4g.price, sum: PRICE.router4g.price, ic: 'router' });
  // draft — в смете есть позиции без цены: итог показываем «от …»
  const draft = eq.some((l) => l.price === undefined || l.partial) || extra.some((l) => l.from);
  return { c, eq, work, extra, total, store, monthly, draft };
}

