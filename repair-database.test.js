import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {CONFIG} from './supabase/fixtures/inspection-prices.js';
const db=new PGlite();
const ids=Object.fromEntries(['org','otherOrg','manager','staff','engineer','driver','outsider'].map((key,i)=>[key,`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`]));
const draft={categoryId:'desktop',modelId:'generic-desktop',issueId:'issue_001',note:{customerName:'QA fixture',activeParts:[],manualBasePartsCost:'',customPartsCost:0,finalEstimatedTime:2,manualLaborRate:350,shippingCost:300,specialDiscount:0,manualTotalMin:'1000',manualTotalMax:'',adjustmentReason:'QA agreed price',pageCount:''},handoverState:{pcDriver:false}};
async function as(user,sql,args=[]){await db.exec('begin;set local role authenticated;');try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[ids[user]||user]);const r=await db.query(sql,args);await db.exec('commit');return r.rows;}catch(e){await db.exec('rollback');throw e}}
const save=(user,caseId=null,expected=0,sourceExpected=0,change={},credit=0,org=ids.org)=>as(user,'select public.yj_save_repair($1,$2,$3,$4,$5,$6,$7,$8) result',[org,caseId,expected,sourceExpected,{...draft,note:{...draft.note,...change}},credit,'PICKUP','QA appointment']).then(r=>r[0].result);
let direct,linked,route;
before(async()=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
 await db.exec(await readFile(new URL('./supabase/fixtures/inspection_workspace.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('./supabase/repair_workspace.sql',import.meta.url),'utf8'));
 await db.query('insert into public.yj_organizations(id,name,pricebook) values($1,$2,$3),($4,$5,$3)',[ids.org,'QA',CONFIG,ids.otherOrg,'Other']);
 const prices=JSON.parse(await readFile(new URL('./supabase/fixtures/repair-prices.json',import.meta.url),'utf8'));
 await db.query('insert into yj_private.repair_pricebook values($1,$2),($3,$2)',[ids.org,prices,ids.otherOrg]);
 for(const [user,role] of [['manager','MANAGER'],['staff','STAFF'],['engineer','ENGINEER'],['driver','DRIVER'],['outsider',null]]){
  await db.query('insert into auth.users values($1,$2,now())',[ids[user],user+'@example.test']);
  if(role)await db.query('insert into public.yj_memberships(org_id,user_id,email,display_name,role) values($1,$2,$3,$4,$5)',[ids.org,ids[user],user+'@example.test',user,role]);
 }
});
after(()=>db.close());
test('database recomputes fees; new direct repair integrates with shared case',async()=>{
 direct=await save('staff');assert.equal(direct.snapshot.totalMin,1000);assert.equal(direct.snapshot.inspectionTotal,0);assert.equal(direct.snapshot.labor,700);assert.equal(direct.snapshot.adjustmentMin,-100);
 assert.equal((await as('manager','select * from public.yj_cases where id=$1',[direct.case_id])).length,1);
 assert.equal((await save('staff',direct.case_id,1,1)).revision,1);
});
test('staff cannot approve, outsiders cannot read; direct writes denied',async()=>{
 await assert.rejects(as('staff','select public.yj_approve_repair($1,1,1,$2,$3)',[direct.case_id,'QA','QA consent']),/權限/);
 await assert.rejects(as('staff',"update public.yj_repair_jobs set workflow='APPROVED'"),/permission denied/);
 assert.equal((await as('outsider','select * from public.yj_repair_jobs')).length,0);
 assert.equal((await as('driver','select * from public.yj_repair_versions')).length,0);
 await assert.rejects(save('staff',null,0,0,{},0,ids.otherOrg),/權限/);
});
test('negative values, discounts and reversed ranges rejected by database',async()=>{
 for(const patch of [{shippingCost:-1},{specialDiscount:50000},{manualTotalMin:100,manualTotalMax:50},{manualTotalMin:100,adjustmentReason:''},{manualLaborRate:Infinity}])await assert.rejects(save('staff',null,0,0,patch));
});
test('inspection fee credit and duplicate transport are explicit and bounded',async()=>{
 const state={schemaVersion:2,device:'DESKTOP',service:'PICKUP',zone:'ZONE_A',urgency:'NORMAL',source:'OTHER',warranty:'OUT',billingStage:'DIAGNOSIS',logisticsPlan:'DEDICATED',logisticsFee:300,feeConfirmed:true,windowConfirmed:true,logisticsWindow:'QA time',paidAmount:200,customerName:'QA fixture'};
 const inspection=(await as('staff','select public.yj_save_case($1,null,0,$2,null) result',[ids.org,{state,problem:'QA'}]))[0].result;
 linked=await save('staff',inspection.id,0,1,{},500);
 assert.equal(linked.snapshot.inspectionTotal,800);assert.equal(linked.snapshot.inspectionCredit,500);assert.equal(linked.snapshot.transportOverlap,300);assert.equal(linked.snapshot.totalMin,1000);assert.equal(linked.snapshot.remainingMin,800);
 await assert.rejects(save('staff',inspection.id,1,1,{},501),/折抵/);
 await as('manager','select public.yj_approve_case($1,1,$2)',[inspection.id,'QA inspection approved']);
});
test('only current fixed amount with consent can be formally exported',async()=>{
 await assert.rejects(as('staff','select public.yj_export_repair($1,1)',[linked.case_id]),/核准/);
 await assert.rejects(as('manager','select public.yj_approve_repair($1,1,1,$2,$3)',[linked.case_id,'QA','']),/客戶同意/);
 await as('manager','select public.yj_approve_repair($1,1,1,$2,$3)',[linked.case_id,'QA approval','QA customer consent']);
 const out=(await as('staff','select public.yj_export_repair($1,1) result',[linked.case_id]))[0].result;assert.equal(out.totalMin,1000);assert.ok(out.approvedAt);
});
test('revision conflicts preserve old version and changing repair revokes approval',async()=>{
 const changed=await save('staff',linked.case_id,1,1,{manualTotalMin:'1100'},500);assert.equal(changed.revision,2);
 await assert.rejects(save('staff',linked.case_id,1,1,{manualTotalMin:'1200'},500),/已更新/);
 await assert.rejects(as('staff','select public.yj_export_repair($1,1)',[linked.case_id]),/核准/);
 assert.equal((await as('staff','select * from public.yj_repair_versions where case_id=$1',[linked.case_id])).length,2);
});
test('return route cannot publish before latest maintenance approval',async()=>{
 route=(await as('staff','select public.yj_save_route($1,null,0,$2,$3,$4,$5,$6) result',[ids.org,'QA route',ids.driver,'2026-10-25T01:00Z','2026-10-25T03:00Z',[
 {case_id:linked.case_id,leg:'PICKUP',address:'QA',starts_at:'2026-10-25T01:00Z',ends_at:'2026-10-25T01:20Z'},
 {case_id:linked.case_id,leg:'RETURN',address:'QA',starts_at:'2026-10-25T02:00Z',ends_at:'2026-10-25T02:20Z'}]]))[0].result;
 await assert.rejects(as('manager','select public.yj_publish_route($1,1)',[route.id]),/維修報價/);
 await as('manager','select public.yj_approve_repair($1,2,1,$2,$3)',[linked.case_id,'QA latest','QA customer latest consent']);
 await as('manager','select public.yj_publish_route($1,1)',[route.id]);
 assert.equal((await as('driver','select * from public.yj_routes where id=$1',[route.id])).length,1);
});
test('a later edit also blocks an already published return task',async()=>{
 const tasks=await as('driver','select * from public.yj_route_stops where route_id=$1 order by position',[route.id]);
 await as('driver','select public.yj_update_stop($1,2,$2,$3)',[tasks[0].id,'DONE','QA pickup']);
 await save('staff',linked.case_id,2,1,{manualTotalMin:'1200'},500);
 await assert.rejects(as('driver','select public.yj_update_stop($1,3,$2,$3)',[tasks[1].id,'DONE','QA return']),/維修報價/);
});
test('a range cannot be approved and engineers read only their assigned repair',async()=>{
 const range=await save('staff',null,0,0,{manualTotalMin:'',manualTotalMax:''});
 await assert.rejects(as('manager','select public.yj_approve_repair($1,1,1,$2,$3)',[range.case_id,'QA','QA consent']),/單一/);
 assert.equal((await as('engineer','select * from public.yj_repair_jobs')).length,0);
 await as('manager','select public.yj_assign_case($1,0,$2)',[direct.case_id,ids.engineer]);
 assert.equal((await as('engineer','select * from public.yj_repair_jobs')).length,1);
 assert.equal((await as('engineer','select * from public.yj_repair_versions where case_id=$1',[range.case_id])).length,0);
 await assert.rejects(as('manager','select public.yj_approve_case($1,1,$2)',[direct.case_id,'try old approval']),/客戶同意/);
});
test('changed inspection quote invalidates maintenance approval and must be refreshed',async()=>{
 const state={schemaVersion:2,device:'DESKTOP',service:'IN_STORE',zone:'ZONE_A',urgency:'NORMAL',source:'OTHER',warranty:'OUT',billingStage:'DIAGNOSIS',customerName:'QA fixture'};
 const inspection=(await as('staff','select public.yj_save_case($1,null,0,$2,null) result',[ids.org,{state,problem:'QA'}]))[0].result;
 const repair=await save('staff',inspection.id,0,1,{shippingCost:0});
 await as('manager','select public.yj_approve_case($1,1,$2)',[inspection.id,'QA inspection']);
 await as('manager','select public.yj_approve_repair($1,1,1,$2,$3)',[inspection.id,'QA repair','QA consent']);
 await as('staff','select public.yj_save_case($1,$2,1,$3,null)',[ids.org,inspection.id,{state:{...state,urgency:'EXPRESS'},problem:'updated QA'}]);
 await assert.rejects(as('staff','select public.yj_export_repair($1,1)',[inspection.id]),/核准/);
 await assert.rejects(save('staff',inspection.id,1,1,{shippingCost:0}),/已更新/);
 const next=await save('staff',inspection.id,1,2,{shippingCost:0});assert.equal(next.snapshot.inspectionTotal,1000);assert.equal(next.revision,2);
});
test('onsite travel is never misidentified as a duplicate collection fee',async()=>{
 const state={schemaVersion:2,device:'DESKTOP',service:'ON_SITE',zone:'ZONE_A',urgency:'NORMAL',source:'OTHER',warranty:'OUT',billingStage:'DIAGNOSIS',customerName:'QA fixture'};
 const inspection=(await as('staff','select public.yj_save_case($1,null,0,$2,null) result',[ids.org,{state,problem:'QA onsite'}]))[0].result;
 const repair=await save('staff',inspection.id,0,1,{},500);assert.equal(repair.snapshot.transportOverlap,0);assert.equal(repair.snapshot.totalMin,1300);
});
test('deactivated account loses repair access even with existing identity',async()=>{
 await as('manager','select public.yj_set_employee($1,$2,$3,$4,false)',[ids.org,'staff@example.test','staff','STAFF']);
 assert.equal((await as('staff','select * from public.yj_repair_jobs')).length,0);
 await assert.rejects(save('staff'),/權限/);
});
