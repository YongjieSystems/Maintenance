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

// Customer exports exclude operational identifiers and staff notes; adjustment reasons are customer-facing.
export function customerRepairSummary(s, official=false) {
 const cloud=Object.hasOwn(s,'caseId'),note=s.draft?.note||{},fmt=amountText;
 const adjusted=!!s.adjusted || !!s.adjustmentMin || !!s.adjustmentMax;
 const parts=cloud?fmt(s.partsMin,s.partsMax):s.basePartText;
 const hasParts=cloud?(s.partsMin>0||s.partsMax>0):Number(s.basePartValue)>0||/\d*[1-9]/.test(parts||'');
 const extra=cloud?s.extra:s.extraPartsCost, shipping=cloud?s.shipping:s.shipping;
 return [
 '【永捷維修'+(official?'正式報價':'報價')+'】',
 '單號：'+s.orderId+'／第'+(s.revision||1)+'版',
 ...(s.dateStr?['日期：'+s.dateStr]:[]),
 ...((cloud?s.customer:s.customerName)?['客戶：'+(cloud?s.customer:s.customerName)]:[]),
 '設備：'+[cloud?s.category:s.categoryName,cloud?s.model:s.modelName].filter(Boolean).join('／'),
 ...((s.issue||s.issueName)?['處理：'+(s.issue||s.issueName)]:[]),
 ...((cloud?note.serialNumber:s.serialNumber)?['序號：'+(cloud?note.serialNumber:s.serialNumber)]:[]),
 '',
 ...(adjusted?['維修整包費用：'+(cloud?fmt(s.repairMin,s.repairMax):s.totalText), '已含本案約定項目及服務'+(shipping>0?'（含本次收送）':'')+'。']:[
 ...(hasParts?[(s.partsLabel||'零件／設備')+'：'+parts]:[]),
 ...(extra>0?[(cloud?note.customPartName:s.extraPartsName)||'額外項目'].map(name=>name+'：'+fmt(extra)):[]),
 ...((cloud?s.labor:s.laborCost)>0?[(s.laborLabel||'工資')+'：'+fmt(cloud?s.labor:s.laborCost)]:[]),
 ...((cloud?s.handover:s.handoverCost)>0?['交機服務：'+fmt(cloud?s.handover:s.handoverCost)]:[]),
 ...(shipping>0?['本次收送：'+fmt(shipping)]:[]),
 ...(s.discount>0?['優惠：−'+fmt(s.discount)]:[]),
 (cloud?'維修小計':'預估合計')+'：'+(cloud?fmt(s.repairMin,s.repairMax):s.totalText),
 ]),
 ...((s.adjustmentReason || note.adjustmentReason)?.trim()?['報價調整原因：'+(s.adjustmentReason || note.adjustmentReason).trim()]:[]),
 ...((cloud?note.activeParts:s.activeParts)?.length?['約定零件：'+(cloud?note.activeParts:s.activeParts).join('、')]:[]),
 ...(s.handoverItems?.length?['交機項目：'+s.handoverItems.join('、')]:[]),
 ...(cloud?[
 ...(s.inspectionTotal>0?['原檢測與收送：'+fmt(s.inspectionTotal)]:[]),
 ...(s.inspectionCredit>0?['檢測費折抵'+(official?'':'（待核准）')+'：−'+fmt(s.inspectionCredit)]:[]),
 ...(s.transportOverlap>0?['重疊收送扣除：−'+fmt(s.transportOverlap)]:[]),
 '案件合計：'+fmt(s.totalMin,s.totalMax),
 ...(s.paidReference>0?['原已收紀錄參考：'+fmt(s.paidReference),'預估待收：'+fmt(s.remainingMin,s.remainingMax)+'（實際以收款紀錄核對）']:[]),
 ...(s.deliveryWindow?['收送時段：'+s.deliveryWindow]:[]),
 ]:[]),
 '',
 '以上依約定維修範圍估價；新增零件或費用須先取得同意。',
 ...(!cloud?['檢測費折抵及收送依確認案件另列，勿與本單重複計費。']:[]),
 '金額及服務範圍依雙方確認內容辦理。',
 ].join('\n');
}
