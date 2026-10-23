import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {CONFIG} from './supabase/fixtures/inspection-prices.js';
import {changeCatalogue,validateCatalogue} from './catalogue-core.js';
const read=p=>readFile(new URL(p,import.meta.url),'utf8');
const db=new PGlite();const ids=Object.fromEntries(['org','other','manager','staff','engineer','driver','disabled','outsider'].map((s,i)=>[s,`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`]));
let original;
async function as(who,sql,args=[]){await db.exec('begin;set local role authenticated;');try{await db.query("select set_config('request.jwt.claim.sub',$1,true)",[ids[who]]);const r=await db.query(sql,args);await db.exec('commit');return r.rows[0]?.r;}catch(e){await db.exec('rollback');throw e;}}
const get=()=>as('staff','select public.yj_get_repair_catalogue($1) r',[ids.org]);
const save=(who,book,revision,org=ids.org)=>as(who,'select public.yj_save_repair_catalogue($1,$2,$3) r',[org,revision,book]);
before(async()=>{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
 await db.exec(await read('./supabase/fixtures/inspection_workspace.sql'));await db.exec(await read('./supabase/repair_workspace.sql'));await db.exec(await read('./supabase/engineer_staff_access.sql'));
 await db.exec("alter table public.yj_cases add column record_kind text not null default 'INSPECTION';");
 const simple=await read('./supabase/simple_workflow.sql');const fn=simple.slice(simple.indexOf('create or replace function yj_private.save_repair('));await db.exec(fn.slice(0,fn.indexOf('\ncreate or replace function',30)));
 await db.query('insert into public.yj_organizations(id,name,pricebook) values($1,$2,$3),($4,$5,$3)',[ids.org,'QA catalogue',CONFIG,ids.other,'Other']);
 original=JSON.parse(await read('./supabase/fixtures/repair-prices.json'));await db.query('insert into yj_private.repair_pricebook values($1,$2),($3,$2)',[ids.org,original,ids.other]);
 for(const [who,role] of [['manager','MANAGER'],['staff','STAFF'],['engineer','ENGINEER'],['driver','DRIVER'],['disabled','STAFF'],['outsider',null]]){await db.query('insert into auth.users values($1,$2,now())',[ids[who],who+'@example.com']);if(role)await db.query('insert into public.yj_memberships(org_id,user_id,email,display_name,role,active,staff_access) values($1,$2,$3,$4,$5,$6,$7)',[ids.org,ids[who],who+'@example.com',who,role,who!=='disabled',who==='engineer']);}
 await db.exec(await read('./supabase/shared_repair_catalogue.sql'));
});
after(()=>db.close());
test('migration preserves original prices; manager, staff and enabled engineer read same catalogue',async()=>{
 validateCatalogue(original);const book=await get();assert.deepEqual(book.catalogue,original);assert.equal(book.revision,1);
 for(const who of ['manager','engineer'])assert.deepEqual((await as(who,'select public.yj_get_repair_catalogue($1) r',[ids.org])).catalogue,original);
});
test('staff, engineers, inactive, outsiders and other teams cannot maintain company prices',async()=>{
 for(const who of ['staff','engineer','driver','disabled','outsider'])await assert.rejects(save(who,original,1),{code:'42501'});
 await assert.rejects(save('manager',original,1,ids.other),{code:'42501'});
 for(const who of ['driver','disabled','outsider'])await assert.rejects(as(who,'select public.yj_get_repair_catalogue($1) r',[ids.org]),{code:'42501'});
 await assert.rejects(as('staff',"update yj_private.repair_pricebook set revision=99"),/permission denied/);
});
test('category, model, issue link correctly; duplicate, orphan, invalid price and duplicate IDs rejected',async()=>{
 let b=changeCatalogue(original,{action:'add',type:'category',id:'qa-cat',values:{name:'QA設備',iconName:'Wrench'}});
 b=changeCatalogue(b,{action:'add',type:'model',id:'qa-model',parentId:'qa-cat',values:{name:'QA型號'}});
 b=changeCatalogue(b,{action:'add',type:'issue',id:'qa-issue',parentId:'qa-model',values:{name:'QA故障',description:'僅測試',estimatedCostMin:1000,estimatedCostMax:1000,estimatedTimeHours:2,potentialParts:['零件']}});
 const saved=await save('manager',b,1);assert.equal(saved.revision,2);assert.equal((await get()).catalogue.at(-1).models[0].issues[0].id,'qa-issue');
 assert.throws(()=>changeCatalogue(b,{action:'add',type:'category',id:'dup',values:{name:' QA設備 '}}),/重複/);
 assert.throws(()=>changeCatalogue(b,{action:'add',type:'model',id:'orphan',parentId:'missing',values:{name:'缺上層'}}),/不存在/);
 for(const mutate of [d=>d.push({...d[0]}),d=>d[0].name=' ',d=>d.at(-1).models[0].issues[0].estimatedCostMax=-1,d=>d.at(-1).models[0].issues[0].estimatedTimeHours='NaN']){const bad=structuredClone(b);mutate(bad);await assert.rejects(save('manager',bad,2));}
 await assert.rejects(save('manager',b,1),{code:'PT409'});assert.equal((await get()).revision,2);
});
test('custom issue saves with same calculated amount; stale catalogue cannot silently reprice; historical snapshots remain intact',async()=>{
 const draft={pricebookRevision:2,categoryId:'qa-cat',modelId:'qa-model',issueId:'qa-issue',note:{customerName:'QA',activeParts:[],manualBasePartsCost:'',customPartsCost:0,finalEstimatedTime:2,manualLaborRate:350,shippingCost:0,specialDiscount:0,manualTotalMin:'',manualTotalMax:'',pageCount:''},handoverState:{pcDriver:false}};
 const first=await as('engineer','select public.yj_save_repair($1,null,0,0,$2,0,$3,$4) r',[ids.org,draft,'IN_STORE','']);assert.equal(first.snapshot.totalMin,1000);
 let b=(await get()).catalogue;b=changeCatalogue(b,{action:'update',type:'issue',id:'qa-issue',parentId:'qa-model',values:{name:'QA故障改名',description:'僅測試',estimatedCostMin:1500,estimatedCostMax:1500,estimatedTimeHours:3,potentialParts:['零件']}});await save('manager',b,2);
 await assert.rejects(as('staff','select public.yj_save_repair($1,null,0,0,$2,0,$3,$4) r',[ids.org,draft,'IN_STORE','']),{code:'PT409'});
 draft.pricebookRevision=3;draft.note.finalEstimatedTime=3;const next=await as('staff','select public.yj_save_repair($1,null,0,0,$2,0,$3,$4) r',[ids.org,draft,'IN_STORE','']);assert.equal(next.snapshot.totalMin,1500);assert.equal(next.snapshot.labor,1050);
 const old=(await db.query('select snapshot from public.yj_repair_versions where case_id=$1',[first.case_id])).rows[0].snapshot;assert.equal(old.totalMin,1000);assert.equal(old.issue,'QA故障');
 assert.equal((await db.query('select count(*)::int n from yj_private.repair_pricebook_versions where org_id=$1',[ids.org])).rows[0].n,3);
});
test('deleting a parent removes its children in current catalogue, retains history; built-in handover cannot disappear',async()=>{
 const b=await get();const next=changeCatalogue(b.catalogue,{action:'delete',type:'category',id:'qa-cat'});const saved=await save('manager',next,b.revision);assert.equal(saved.revision,4);assert.equal(saved.catalogue.some(c=>c.id==='qa-cat'),false);
 await assert.rejects(save('manager',saved.catalogue.filter(c=>c.id!=='new-used-equipment'),4),/交機/);
 assert.equal((await db.query("select count(*)::int n from public.yj_audit_events where event='REPAIR_CATALOGUE_SAVED'")).rows[0].n,3);
});
