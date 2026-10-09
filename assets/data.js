// Цены, планы и комплекты Baqyla — общие для страниц «Расчёт» и «Комплекты».
// Цены и комплекты совпадают с CRM (~/dev/baqyla-crm/src/lib/seed.ts):
// комплект «Дом» здесь даёт те же 209 800 ₸ оборудования + 63 000 ₸ работы.
// Поменять цены — только в PRICE ниже.

const WA_PHONE = '77089804260';

const PRICE = {
  camOut: { name: 'Уличная камера 4 Мп ColorVu', price: 28000 },
  camIn: { name: 'Камера-турель 4 Мп', price: 23800 },
  nvr: [
    { ch: 4, name: 'Регистратор 4 канала с PoE', price: 37000 },
    { ch: 8, name: 'Регистратор 8 каналов с PoE', price: 57800 },
    { ch: 16, name: 'Регистратор 16 каналов с PoE', price: 110000 }, // нет в CRM — уточнить
  ],
  hdd: [
    { tb: 1, price: 22000 }, // нет в CRM — уточнить
    { tb: 2, price: 30000 },
    { tb: 4, price: 45000 },
    { tb: 6, price: 62000 }, // нет в CRM — уточнить
    { tb: 8, price: 78000 }, // нет в CRM — уточнить
  ],
  sd: { name: 'Карта памяти microSD 64 ГБ', gb: 64, price: 6000 }, // нет в CRM — ЦЕНА-ЗАГЛУШКА, уточнить
  cable: { name: 'Кабель UTP Cat.5e', price: 250 },
  conduit: { name: 'Гофра 20 мм', price: 150 },
  rj45: { name: 'Коннектор RJ45', price: 100, perCam: 2 },
  box: { name: 'Распаячная коробка', price: 1500, perCam: 1 },
  labor: { name: 'Монтаж камер', price: 12000 },
  setup: { name: 'Пусконаладка и настройка телефона', price: 15000 },
  gbPerCamDay: 30, // 4 Мп, H.265, запас на движение
  sdMaxCams: 3, // SD-карту (запись в саму камеру, без регистратора) предлагаем при 1–3 камерах…
  sdMaxCamsBusiness: 2, // …а в коммерции от 3 камер — всегда регистратор
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
    cable: 25,
    base: { out: [0, 1, 2, 3], in: [6, 7] },
    zones: {
      out: { t: 'Снаружи дома', d: 'Входы, двор, парковка', photo: 'flats-out', pos: [50, 31.3], zoom: 1 },
      in: { t: 'Внутри подъезда', d: 'Холл, лифт, этажи', photo: 'flats-in', pos: [50, 100], zoom: 1 },
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

const KITS = [
  { name: 'Дом', plan: 'home', on: [0, 1, 2, 3], store: '2x1', text: 'Четыре уличные камеры по углам дома' },
  { name: 'Дом+', plan: 'home', on: [0, 1, 2, 3, 4, 5], store: '4x1', text: 'Шесть камер: углы дома, въезд и задний двор' },
  { name: 'Бизнес', plan: 'business', on: [0, 1, 2, 3, 4, 5, 6, 7], store: '4x1', text: 'Улица и торговый зал: восемь камер' },
];

const fmt = (n) => Math.round(n).toLocaleString('ru-RU').replace(/ /g, ' ') + ' ₸';

function plural(n, one, few, many) {
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
  return { out, inn, total: out + inn };
}

// ---------- носитель записи ----------
// Ключи: 'sd' — карта в каждой камере; '2x1' — один диск 2 ТБ; '8x2' — два диска по 8 ТБ.
// Клиент выбирает носитель, дни записи считаются от числа камер и показываются примерно («6–8 дней»).

const DISKS = [
  ...PRICE.hdd.map((d) => ({ key: `${d.tb}x1`, tb: d.tb, qty: 1 })),
  ...[2, 3, 4].map((q) => ({ key: `8x${q}`, tb: 8, qty: q })), // на 17–32 камеры одного диска мало
];
const SD = { key: 'sd', sd: true };

const sdAllowed = (s, n) => n >= 1 && n <= (s.plan === 'business' ? PRICE.sdMaxCamsBusiness : PRICE.sdMaxCams);

// дней записи: карта — своя у каждой камеры, диск — общий на все камеры
const storeDays = (o, n) => (o.sd ? PRICE.sd.gb : o.tb * o.qty * 1000 / n) / PRICE.gbPerCamDay;

// «6–8 дней»: от расчётного (с запасом на движение) до спокойного дня; больше двух месяцев — в месяцах
function daysRange(d) {
  const lo = Math.max(1, Math.floor(d));
  if (lo >= 60) return { num: `${Math.floor(lo / 30)}+`, unit: 'мес.', text: `больше ${Math.floor(lo / 30)} мес.` };
  const hi = Math.max(lo + 1, Math.round(d * 1.25));
  const unit = plural(hi, 'день', 'дня', 'дней');
  return { num: `${lo}–${hi}`, unit, text: `${lo}–${hi} ${unit}` };
}

// варианты на шаге «Запись»: SD первой (если можно), дальше три диска, начиная с того, где хватит хотя бы на 3 дня
function storeOptions(s) {
  const n = counts(s).total;
  if (!n) return [];
  let i = DISKS.findIndex((d) => storeDays(d, n) >= 3);
  if (i < 0) i = DISKS.length - 1;
  const sd = sdAllowed(s, n);
  const disks = DISKS.slice(Math.min(i, DISKS.length - (sd ? 2 : 3)), i + (sd ? 2 : 3));
  return sd ? [SD, ...disks] : disks;
}

// что считаем в смете: выбранный носитель, а пока не выбран (или стал недоступен) — диск примерно на 2 недели
function storeOf(s) {
  const opts = storeOptions(s), n = counts(s).total;
  return opts.find((o) => o.key === s.store)
    || opts.find((o) => !o.sd && storeDays(o, n) >= 14)
    || opts[opts.length - 1];
}

const storeLabel = (o) => (o.sd ? `Карта ${PRICE.sd.gb} ГБ в каждой камере` : o.qty > 1 ? `${o.qty} диска по ${o.tb} ТБ` : `Диск ${o.tb} ТБ`);

function estimate(s) {
  const c = counts(s);
  const eq = [], work = [];
  if (!c.total) return { c, eq, work, total: 0 };
  const add = (list, name, qty, unit, price) => qty > 0 && list.push({ name, qty, unit, price, sum: qty * price });

  add(eq, PRICE.camOut.name, c.out, 'шт', PRICE.camOut.price);
  add(eq, PRICE.camIn.name, c.inn, 'шт', PRICE.camIn.price);

  const store = storeOf(s);
  if (store.sd) {
    // запись в саму камеру: регистратор и диск не нужны
    add(eq, PRICE.sd.name, c.total, 'шт', PRICE.sd.price);
  } else {
    // камер больше, чем каналов у самого большого регистратора, — ставим несколько больших
    const top = PRICE.nvr[PRICE.nvr.length - 1];
    const nvr = PRICE.nvr.find((r) => r.ch >= c.total);
    if (nvr) add(eq, nvr.name, 1, 'шт', nvr.price);
    else add(eq, top.name, Math.ceil(c.total / top.ch), 'шт', top.price);
    add(eq, `Жёсткий диск ${store.tb} ТБ`, store.qty, 'шт', PRICE.hdd.find((d) => d.tb === store.tb).price);
  }

  const meters = c.total * s.cable;
  add(eq, PRICE.cable.name, meters, 'м', PRICE.cable.price);
  add(eq, PRICE.rj45.name, c.total * PRICE.rj45.perCam, 'шт', PRICE.rj45.price);
  add(eq, PRICE.box.name, c.total * PRICE.box.perCam, 'шт', PRICE.box.price);
  add(eq, PRICE.conduit.name, meters, 'м', PRICE.conduit.price);

  add(work, PRICE.labor.name, c.total, 'усл', PRICE.labor.price);
  add(work, PRICE.setup.name, 1, 'усл', PRICE.setup.price);

  const total = [...eq, ...work].reduce((a, l) => a + l.sum, 0);
  return { c, eq, work, total, store };
}
