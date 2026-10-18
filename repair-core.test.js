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
