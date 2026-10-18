// Shared by the screen, saved quotations and exports. Price-book values stay unchanged.
export const money = value => Math.round((value + Number.EPSILON) * 100) / 100;
export const amountText = (min, max = min) => min === max
  ? `$${min.toLocaleString('zh-TW')}` : `$${min.toLocaleString('zh-TW')} ~ $${max.toLocaleString('zh-TW')}`;
export const adjustmentText = (min, max = min) => min === max ? amountText(min) : `最低價差額 ${amountText(min)}；最高價差額 ${amountText(max)}`;

export function calculateQuote(note, baseMin, baseMax, handover = 0) {
  const errors = [];
  const read = (value, label, fallback = 0) => {
    const n = value === '' || value == null ? fallback : Number(value);
    if (!Number.isFinite(n) || n < 0 || n > 100000000) {
      errors.push(`${label}請輸入 0 至 100,000,000 之間的有效數字。`);
      return 0;
    }
    if (label !== '工時' && Math.abs(n * 100 - Math.round(n * 100)) > 0.000001) errors.push(`${label}最多輸入小數點後兩位。`);
    return n;
  };
  const partsMin = read(note.manualBasePartsCost, '零件／設備費', baseMin);
  const partsMax = note.manualBasePartsCost === '' ? read(baseMax, '零件／設備費上限') : partsMin;
  const extra = read(note.customPartsCost, '額外費用');
  const hours = read(note.finalEstimatedTime, '工時');
  const rate = read(note.manualLaborRate, '每小時計價', 350);
  const labor = money(hours * rate);
  if (labor > 100000000) errors.push('工時與每小時計價的乘積過大，請確認輸入。');
  const shipping = read(note.shippingCost, '運費');
  const discount = read(note.specialDiscount, '折扣');
  const delivery = read(handover, '交機加價');
  const subtotalMin = money(partsMin + extra + labor + shipping + delivery);
  const subtotalMax = money(partsMax + extra + labor + shipping + delivery);
  if (discount > subtotalMin) errors.push('折扣不可超過最低費用小計；請先確認零件費及折扣。');
  const calcMin = money(Math.max(0, subtotalMin - discount));
  const calcMax = money(Math.max(0, subtotalMax - discount));
  const manual = note.manualTotalMin !== '';
  const min = manual ? read(note.manualTotalMin, '手動總額下限') : calcMin;
  const max = manual ? read(note.manualTotalMax, '手動總額上限', min) : calcMax;
  if (!manual && note.manualTotalMax !== '') errors.push('請先輸入手動總額下限，或清空上限以使用自動計價。');
  if (max < min) errors.push('最高金額不可小於最低金額。');
  const adjustmentMin = money(min - calcMin), adjustmentMax = money(max - calcMax);
  const adjusted = manual && (adjustmentMin !== 0 || adjustmentMax !== 0);
  if (adjusted && !note.adjustmentReason?.trim()) errors.push('手動總額與明細不同，請填寫報價調整原因。');
  if (note.pageCount !== '' && note.pageCount != null && (!Number.isSafeInteger(Number(note.pageCount)) || Number(note.pageCount) < 0)) errors.push('使用張數請輸入非負整數。');
  return {partsMin, partsMax, extra, hours, rate, labor, shipping, discount, calcMin, calcMax,
    min: money(min), max: money(max), adjustmentMin, adjustmentMax, adjusted, errors};
}

export function createOrderId(existing = [], now = new Date(), random = () => crypto.randomUUID()) {
  const day = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Taipei', year:'2-digit', month:'2-digit', day:'2-digit'}).format(now).replaceAll('-', '');
  for (let attempt = 0; attempt < 100; attempt++) {
    const id = `R${day}${random().replaceAll('-', '').slice(0, 8).toUpperCase()}`;
    if (!existing.some(item => item.orderId === id)) return id;
  }
  throw new Error('無法建立單號，請稍後重試。');
}

export function quoteVersion(history, orderId, fingerprint) {
  const saved = history.filter(item => item.orderId === orderId);
  const latest = saved.reduce((best, item) => !best || (item.revision || 1) > (best.revision || 1) ? item : best, null);
  return latest?.fingerprint === fingerprint ? latest.revision || 1 : Math.max(0, ...saved.map(item => item.revision || 1)) + 1;
}

export function validateIssue(issue) {
  const values = [issue.estimatedCostMin, issue.estimatedCostMax, issue.estimatedTimeHours].map(Number);
  return values.every(n => Number.isFinite(n) && n >= 0 && n <= 100000000) && values[1] >= values[0];
}
