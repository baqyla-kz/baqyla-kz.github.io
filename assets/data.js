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
  cable: { name: 'Кабель UTP Cat.5e', price: 250 },
  conduit: { name: 'Гофра 20 мм', price: 150 },
  rj45: { name: 'Коннектор RJ45', price: 100, perCam: 2 },
  box: { name: 'Распаячная коробка', price: 1500, perCam: 1 },
  labor: { name: 'Монтаж камер', price: 12000 },
  setup: { name: 'Пусконаладка и настройка телефона', price: 15000 },
  gbPerCamDay: 30, // 4 Мп, H.265, запас на движение
  maxCams: 16,
};

// План: x/y — точка крепления, a — куда смотрит камера (градусы, 0 = вправо, 90 = вниз).
const PLANS = {
  home: {
    tab: 'Дом',
    title: 'ДОМ',
    cable: 15,
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
  business: {
    tab: 'Бизнес',
    title: 'МАГАЗИН',
    cable: 15,
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
  farm: {
    tab: 'Хозяйство',
    title: 'КРЕСТЬЯНСКОЕ ХОЗЯЙСТВО',
    cable: 25,
    draw: `
      <path class="p-fence" d="M520 420 H20 V20 H620 V420 H600"/>
      <text class="p-label" x="560" y="434" text-anchor="middle">ВОРОТА</text>
      <rect class="p-build" x="60" y="60" width="280" height="110"/>
      <path class="p-wall" d="M130 60 V170 M200 60 V170 M270 60 V170"/>
      <text class="p-label" x="200" y="48" text-anchor="middle">КОРОВНИК</text>
      <rect class="p-build p-build--minor" x="400" y="60" width="180" height="90"/>
      <text class="p-label" x="490" y="110" text-anchor="middle">СКЛАД КОРМОВ</text>
      <rect class="p-pen" x="60" y="220" width="280" height="150"/>
      <text class="p-label" x="200" y="300" text-anchor="middle">ЗАГОН</text>
      <rect class="p-build p-build--minor" x="430" y="250" width="110" height="80"/>
      <text class="p-label" x="485" y="294" text-anchor="middle">СТОРОЖКА</text>
    `,
    slots: [
      { x: 540, y: 330, a: 50, t: 'out', l: 'ворота' },
      { x: 60, y: 370, a: 315, t: 'out', l: 'загон' },
      { x: 580, y: 150, a: 60, t: 'out', l: 'двор' },
      { x: 430, y: 250, a: 210, t: 'out', l: 'техника' },
      { x: 200, y: 170, a: 90, t: 'out', l: 'вход в коровник' },
      { x: 72, y: 115, a: 0, t: 'in', l: 'коровник' },
      { x: 328, y: 115, a: 180, t: 'in', l: 'коровник' },
      { x: 412, y: 105, a: 0, t: 'in', l: 'склад кормов' },
    ],
  },
};

const KITS = [
  { name: 'Дом', plan: 'home', on: [0, 1, 2, 3], text: 'Четыре уличные камеры по углам дома' },
  { name: 'Дом+', plan: 'home', on: [0, 1, 2, 3, 4, 5], text: 'Шесть камер: углы дома, въезд и задний двор' },
  { name: 'Бизнес', plan: 'business', on: [0, 1, 2, 3, 4, 5, 6, 7], text: 'Улица и торговый зал: восемь камер' },
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

function estimate(s) {
  const c = counts(s);
  const eq = [], work = [];
  if (!c.total) return { c, eq, work, total: 0 };
  const add = (list, name, qty, unit, price) => qty > 0 && list.push({ name, qty, unit, price, sum: qty * price });

  add(eq, PRICE.camOut.name, c.out, 'шт', PRICE.camOut.price);
  add(eq, PRICE.camIn.name, c.inn, 'шт', PRICE.camIn.price);

  const nvr = PRICE.nvr.find((r) => r.ch >= c.total) || PRICE.nvr[PRICE.nvr.length - 1];
  add(eq, nvr.name, 1, 'шт', nvr.price);

  const needTb = (c.total * s.days * PRICE.gbPerCamDay) / 1000;
  const disk = PRICE.hdd.find((d) => d.tb >= needTb);
  if (disk) add(eq, `Жёсткий диск ${disk.tb} ТБ`, 1, 'шт', disk.price);
  else {
    const big = PRICE.hdd[PRICE.hdd.length - 1];
    add(eq, `Жёсткий диск ${big.tb} ТБ`, Math.ceil(needTb / big.tb), 'шт', big.price);
  }

  const meters = c.total * s.cable;
  add(eq, PRICE.cable.name, meters, 'м', PRICE.cable.price);
  add(eq, PRICE.rj45.name, c.total * PRICE.rj45.perCam, 'шт', PRICE.rj45.price);
  add(eq, PRICE.box.name, c.total * PRICE.box.perCam, 'шт', PRICE.box.price);
  add(eq, PRICE.conduit.name, meters, 'м', PRICE.conduit.price);

  add(work, PRICE.labor.name, c.total, 'усл', PRICE.labor.price);
  add(work, PRICE.setup.name, 1, 'усл', PRICE.setup.price);

  const total = [...eq, ...work].reduce((a, l) => a + l.sum, 0);
  return { c, eq, work, total, diskTb: disk ? disk.tb : null };
}
