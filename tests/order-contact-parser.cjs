// Run: node tests/order-contact-parser.cjs. Fixtures are fictional.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../orders/index.html'), 'utf8');
const fields = {};
const element = id => fields[id] ??= { value: '', dataset: {} };
const context = {
  document: { getElementById: element },
  toast: text => context.message = text,
  setDel: value => context.delivery = value,
  renderOrderPreview() {}, setSourceValue: value => element('source').value = value,
  orderItems: [], renderLineItems() {}, setCat() {}, currentCat: 'tissue',
  getStyleValue: () => '短Ｔ'
};
vm.createContext(context);
vm.runInContext(html.slice(html.indexOf('function cleanPastedText'), html.indexOf('function getItems')), context);
vm.runInContext(html.slice(html.indexOf('function isShirtHeading'), html.indexOf('function collectCurrentItems')), context);
const address = '台北市內湖區測試路35巷16號10樓';
const name = '陳小明';
const phone = '0912345678';
const fixtures = [
  `${address}\n${name}${phone}`,
  `${name}${phone}\n${address}`,
  `${name}\n${phone}\n${address}`,
  `${phone}\n${address}\n${name}`,
  `${address} ${name}${phone}`,
  `${name} ${phone} ${address}`,
  `${name}${phone}${address}`,
  `${address}${name}${phone}`,
  `寄送地址：${address}\n收件人：${name}\n連絡電話：${phone}`,
  `姓名 ${name}\n電話 ${phone}\n地址 ${address}`,
  `地址:${address} 姓名:${name} 手機:${phone}`,
  `${address}\r${name} 0912-345-678`,
  `${address}\n${name} +886 912 345 678`,
  `${address}\n${name} ０９１２３４５６７８`,
  `${address}\n${name}${phone}\n麻煩下午寄送，謝謝`,
  `${address}\n${name}${phone}\n備註：週末不要寄`,
];
let count = 0;
for (const [box, fn] of [['f-quick-customer', 'parseCustomerInfo'], ['f-order-notebook', 'parseOrderNotebook']]) {
  for (const text of fixtures) {
    Object.keys(fields).forEach(key => delete fields[key]); context.orderItems = [];
    element(box).value = text; context[fn]();
    assert.equal(element('f-recipient-name').value, name, `${fn}: name, fixture ${count}`);
    assert.equal(element('f-recipient-phone').value, phone, `${fn}: phone, fixture ${count}`);
    assert.equal(element('f-address').value, address, `${fn}: address, fixture ${count}`);
    assert.equal(element('f-customer').value, name, `${fn}: nickname, fixture ${count}`);
    count++;
  }
}
for (const [text, expected] of [
  [`${address}\n陳小明 小姐${phone}`, { recipient: '陳小明 小姐', phone, address }],
  [`${address}\n賴小明${phone}`, { recipient: '賴小明', phone, address }],
  [`${address}\n王大明 (02)2345-6789`, { recipient: '王大明', phone: '0223456789', address }],
  [`114 ${address}\n${name}${phone}`, { recipient: name, phone, address: `114 ${address}` }],
  [`內湖區測試路16號3樓之2\n${name}${phone}`, { recipient: name, phone, address: '內湖區測試路16號3樓之2' }],
  [`${address}\n${phone}\n面紙500\n請打電話`, { recipient: '', phone, address }],
  [`${address}\n陳小明\n王大明\n${phone}`, { recipient: '', phone, address }],
  [`${address}\n${name}\n${phone}\n0987654321`, { recipient: name, phone: '', address }],
]) {
  const parsed = context.parseContactDetails(text);
  for (const [key, value] of Object.entries(expected)) assert.equal(parsed[key], value, `${key}: additional fixture ${count}`);
  count++;
}
assert.equal(context.parseNotebookSource(`賴小明${phone}`), '');
Object.keys(fields).forEach(key => delete fields[key]); context.orderItems = [];
element('f-order-notebook').value = `測試買家 @ig\n面紙500\n客製短T 白色 S 3\n${address}\n${name}${phone}`;
context.parseOrderNotebook();
assert.equal(element('f-customer').value, '測試買家');
assert.equal(element('f-recipient-name').value, name);
assert.equal(element('source').value, 'IG');
assert.equal(context.orderItems.length, 2);
assert.equal(context.orderItems[0].qty, 500);
assert.equal(context.orderItems[1].size, 'S');
context.parseOrderNotebook(); assert.equal(context.orderItems.length, 2);
element('f-quick-customer').value = `${address}\n${name}${phone}`;
context.parseCustomerInfo(); assert.equal(element('f-customer').value, '測試買家');
assert.equal(context.parseContactDetails(`${name}\n${phone}\n0987654321`).warnings.length, 1);
assert.equal(context.parseContactDetails(`${address}\n新北市板橋區測試路2號\n${name}${phone}`).address, '');

for (const match of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
console.log(`PASS: ${count} contact cases across both paste entry points; inline script syntax.`);

const expectedShirts = rows => JSON.parse(JSON.stringify(rows.map(({color,size,qty})=>({color,size,qty}))));
const expected = [{color:'黑',size:'M',qty:5},{color:'白',size:'XL',qty:5}];
for(const note of ['短Ｔ\n黑 M*5\n白 XL*5','短T\n黑M×5\n白XL＊5','短T 黑 M*5、白 XL*5']) {
  Object.keys(fields).forEach(key=>delete fields[key]); context.orderItems=[];
  element('f-shirt-bulk').value=note;
  assert.deepEqual(expectedShirts(context.parseShirtBulkRows()),expected);
  element('f-order-notebook').value=note;
  context.parseOrderNotebook();
  assert.deepEqual(expectedShirts(context.orderItems),expected);
  assert.ok(context.orderItems.every(item=>/短[ＴT]/.test(item.style)));
  assert.equal(element('f-recipient-name').value,'');
}
assert.deepEqual(expectedShirts(context.parseShirtBulkLine('白色 S 3、M 4、黑色 L 2')),[{color:'白色',size:'S',qty:3},{color:'白色',size:'M',qty:4},{color:'黑色',size:'L',qty:2}]);
assert.equal(context.parseShirtBulkLine('黑 M*0').length,0);
assert.equal(context.parseShirtBulkLine('黑 XXL*2')[0].size,'XXL');
assert.equal(context.parseShirtBulkLine('短T黑色M*5')[0].color,'黑色');
console.log('PASS: shirt notebook and full-order notebook, multipliers, product heading, color changes and size inheritance.');
