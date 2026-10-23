import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateQuote, quoteVersion, createOrderId, validateIssue} from './repair-core.js';
const original = {manualBasePartsCost:'',customPartsCost:0,finalEstimatedTime:2,manualLaborRate:350,shippingCost:0,specialDiscount:0,manualTotalMin:'',manualTotalMax:'',adjustmentReason:'',pageCount:''};
test('original no-power quotation and rate unchanged',()=>{
 const q=calculateQuote(original,100,2800); assert.equal(q.min,800);assert.equal(q.max,3500);assert.equal(q.labor,700);assert.deepEqual(q.errors,[]);
});
test('manual single amount has explicit paired endpoint adjustments',()=>{
 const q=calculateQuote({...original,manualTotalMin:'100',adjustmentReason:'專案議價'},100,2800);
 assert.equal(q.min,100);assert.equal(q.max,100);assert.equal(q.calcMin+q.adjustmentMin,q.min);assert.equal(q.calcMax+q.adjustmentMax,q.max);assert.equal(q.adjustmentMin,-700);assert.equal(q.adjustmentMax,-3400);assert.deepEqual(q.errors,[]);
});
test('manual range, custom parts, delivery, discount reconcile',()=>{
 const q=calculateQuote({...original,customPartsCost:500,shippingCost:300,specialDiscount:100,manualTotalMin:'1600',manualTotalMax:'4000',adjustmentReason:'整包服務'},100,2800,500);
 assert.equal(q.calcMin+q.adjustmentMin,1600);assert.equal(q.calcMax+q.adjustmentMax,4000);assert.deepEqual(q.errors,[]);
});
test('zero price is accepted but adjustment requires a reason',()=>{
 assert.ok(calculateQuote({...original,manualTotalMin:'0'},100,2800).errors.length);
 const q=calculateQuote({...original,manualTotalMin:'0',adjustmentReason:'保固處理'},100,2800);assert.equal(q.min,0);assert.deepEqual(q.errors,[]);
});
for(const field of ['manualBasePartsCost','customPartsCost','finalEstimatedTime','manualLaborRate','shippingCost','specialDiscount','manualTotalMin','manualTotalMax']) {
 test(`${field} rejects negative, non-finite and overflow`,()=>{for(const value of [-1,Infinity,NaN,100000001])assert.ok(calculateQuote({...original,[field]:value},100,2800).errors.length);});
}
test('bad intervals, orphan upper limit and excessive discounts blocked',()=>{
 for(const patch of [{manualTotalMin:900,manualTotalMax:800},{manualTotalMax:1000},{specialDiscount:801},{pageCount:1.5}])assert.ok(calculateQuote({...original,...patch},100,2800).errors.length);
});
test('same save is idempotent, changed case makes next version',()=>{
 let h=[{orderId:'a',revision:1,fingerprint:'first'},{orderId:'b',revision:9,fingerprint:'other'}];
 assert.equal(quoteVersion(h,'a','first'),1);assert.equal(quoteVersion(h,'a','changed'),2);assert.equal(quoteVersion(h,'new','first'),1);
 h.push({orderId:'a',revision:2,fingerprint:'changed'});assert.equal(quoteVersion(h,'a','first'),3);
});
test('short order ids use Taipei calendar and avoid existing ids',()=>{
 const date=new Date('2026-10-17T17:00:00Z');let n=0;
 const id=createOrderId([{orderId:'R261018AAAAAAAA'}],date,()=>++n===1?'aaaaaaaa-0000':'bbbbbbbb-0000');
 assert.equal(id,'R261018BBBBBBBB');assert.equal(id.length,15);
});
test('pricebook validation rejects backwards and invalid defaults',()=>{
 assert.equal(validateIssue({estimatedCostMin:800,estimatedCostMax:3500,estimatedTimeHours:2}),true);
 for(const v of [-1,NaN,Infinity])assert.equal(validateIssue({estimatedCostMin:v,estimatedCostMax:3500,estimatedTimeHours:2}),false);
 assert.equal(validateIssue({estimatedCostMin:4000,estimatedCostMax:3500,estimatedTimeHours:2}),false);
});
test('fractional money cannot make line items disagree with rounded totals',()=>{
 assert.ok(calculateQuote({...original,customPartsCost:0.001},100,2800).errors.length);
 const q=calculateQuote({...original,customPartsCost:0.25,finalEstimatedTime:1.25},100,2800);
 assert.deepEqual(q.errors,[]);assert.equal(q.min,537.75);
});


test('customer repair summary preserves ranges, credits and overlap without private data',async()=>{
 const {customerRepairSummary}=await import('./repair-core.js');
 const s={caseId:'PRIVATE_CASE',orderId:'RTEST',revision:2,sourceRevision:99,customer:'測試客戶',category:'桌機',model:'測試機',issue:'無法開機',partsMin:500,partsMax:800,extra:100,labor:350,handover:0,shipping:200,discount:50,repairMin:1100,repairMax:1400,inspectionTotal:700,inspectionCredit:500,transportOverlap:200,totalMin:1100,totalMax:1400,paidReference:700,remainingMin:400,remainingMax:700,deliveryWindow:'週三回送',draft:{note:{customPartName:'零件A',adjustmentReason:'專案議價',technicianNotes:'Customer note',quotationPersonnel:'PRIVATE_STAFF',activeParts:['電源供應器']}}};
 const t=customerRepairSummary(s,true);assert.match(t,/\$1,100 ~ \$1,400/);assert.match(t,/檢測費折抵：−\$500/);assert.match(t,/重疊收送扣除：−\$200/);assert.match(t,/預估待收：\$400 ~ \$700/);assert.match(t,/週三回送/);assert.doesNotMatch(t,/PRIVATE|共用案件|檢測版本|核准原因|工時/);
 const adjusted=customerRepairSummary({...s,adjustmentMin:-100,adjustmentMax:-100});assert.match(adjusted,/維修整包費用：\$1,100 ~ \$1,400/);assert.doesNotMatch(adjusted,/價差|核准後另提供|此為草稿/);assert.match(adjusted,/報價調整原因：專案議價/);assert.match(adjusted,/歷史檢測費折抵/);
});


test('local and cloud repair exports share customer declarations and retain necessary conditions',async()=>{
 const {QUOTE_DECLARATIONS}=await import('./customer-declaration.js');const {customerRepairSummary}=await import('./repair-core.js');
 const local={orderId:'TEST',revision:1,customerName:'客戶',categoryName:'桌機',modelName:'一般組裝',issueName:'無法開機',basePartText:'$500',basePartValue:500,laborCost:700,shipping:300,discount:0,totalMin:1500,totalMax:1500,totalText:'$1,500',activeParts:[],adjustmentReason:'專案費用',technicianNotes:'Customer note'};
 const cloud={caseId:'private-id',orderId:'TEST',customer:'客戶',category:'桌機',model:'一般組裝',issue:'無法開機',partsMin:500,partsMax:500,labor:700,shipping:300,repairMin:1500,repairMax:1500,totalMin:1500,totalMax:1500,inspectionTotal:0,deliveryWindow:'週三回送',draft:{note:{technicianNotes:'Customer note',activeParts:[]}}};
 for(const record of [local,cloud]){const text=customerRepairSummary(record);const statement=text.slice(text.indexOf('【報價聲明】'));for(const [i,t] of QUOTE_DECLARATIONS.entries())assert.ok(statement.includes((i+1)+'. '+t));assert.match(text,/本單僅列維修及本次約定收送費/);assert.match(text,/含稅價格/);assert.doesNotMatch(text,/PRIVATE_COST|private-id|成本邏輯|油資|【服務約定】|稅別.*確認/);}
 assert.match(customerRepairSummary(cloud),/週三回送/);
});


test('customer notes are included once and footer has exactly five declarations',async()=>{
 const {customerRepairSummary}=await import('./repair-core.js');const {QUOTE_DECLARATIONS}=await import('./customer-declaration.js');
 for(const record of [{technicianNotes:'Customer note'}, {caseId:'private',partsMin:0,partsMax:0,repairMin:0,repairMax:0,totalMin:0,totalMax:0,draft:{note:{technicianNotes:'Customer note'}}}]){
 const text=customerRepairSummary(record);assert.equal(text.split('Customer note').length-1,1);assert.ok(text.indexOf('Customer note')<text.indexOf('【費用明細】'));assert.equal(text.slice(text.indexOf('【報價聲明】')),'【報價聲明】\n'+QUOTE_DECLARATIONS.map((t,i)=>(i+1)+'. '+t).join('\n'));
 }
 assert.doesNotMatch(customerRepairSummary({technicianNotes:'  '}),/備註：/);
});
