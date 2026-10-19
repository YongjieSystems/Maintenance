import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {TEAM_CONFIG} from '../team-config.js';
const file=new URL('../.repair-test.local',import.meta.url),setup=JSON.parse(await readFile(file,'utf8'));
const make=()=>createClient(TEAM_CONFIG.url,TEAM_CONFIG.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(u,i={})=>fetch(u,{...i,signal:AbortSignal.timeout(20000)})}});
const manager=make(),staff=make(),driver=make(),anon=make();let passed=0;
const check=r=>{if(r.error)throw r.error;return r.data};
async function invite(body,actor){
 const headers={'Content-Type':'application/json',apikey:TEAM_CONFIG.publishableKey};if(actor)headers.Authorization='Bearer '+check(await actor.auth.getSession()).session.access_token;
 const response=await fetch(TEAM_CONFIG.url+'/functions/v1/team-onboard',{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 const data=await response.json();if(!response.ok)throw Error(data.error || 'QA activation failed');return data.url;
}
async function activate(client,body,actor){const url=await invite(body,actor),hash=new URLSearchParams(new URL(url).hash.slice(1)).get('team_token_hash');const result=check(await client.auth.verifyOtp({token_hash:hash,type:'email'}));setup.users.push(result.user.id);await writeFile(file,JSON.stringify(setup));return result.user.id;}
const draft={categoryId:'desktop',modelId:'generic-desktop',issueId:'issue_001',note:{customerName:'QA repair fixture, not customer',activeParts:[],manualBasePartsCost:'',customPartsCost:0,finalEstimatedTime:2,manualLaborRate:350,shippingCost:300,specialDiscount:0,manualTotalMin:'1000',manualTotalMax:'',adjustmentReason:'QA test only',pageCount:''},handoverState:{pcDriver:false}};
try{
 await activate(manager,{mode:'bootstrap',token:setup.token});
 setup.org=check(await manager.from('yj_memberships').select('org_id').single()).org_id;await writeFile(file,JSON.stringify(setup));
 for(const [client,label,role] of [[staff,'staff','STAFF'],[driver,'driver','DRIVER']]){
  const email=`yj-repair-${setup.nonce}-${label}@example.com`;
  check(await manager.rpc('yj_set_employee',{p_org:setup.org,p_email:email,p_name:'QA '+label,p_role:role,p_active:true}));await activate(client,{mode:'invite',orgId:setup.org,email},manager);
 }
 passed++;assert.ok((await anon.from('yj_repair_jobs').select('*')).error);passed++;
 const state={schemaVersion:2,device:'DESKTOP',service:'PICKUP',zone:'ZONE_A',urgency:'NORMAL',source:'OTHER',warranty:'OUT',billingStage:'DIAGNOSIS',logisticsPlan:'DEDICATED',logisticsFee:300,feeConfirmed:true,windowConfirmed:true,logisticsWindow:'QA fixture appointment',paidAmount:200,customerName:draft.note.customerName};
 const inspection=check(await staff.rpc('yj_save_case',{p_org:setup.org,p_case:null,p_expected:0,p_record:{state,problem:'QA test only'},p_costs:null}));
 setup.caseId=inspection.id;await writeFile(file,JSON.stringify(setup));
 const args={p_org:setup.org,p_case:inspection.id,p_expected:0,p_source_expected:1,p_draft:draft,p_credit:500,p_service:'PICKUP',p_window:'QA appointment'};
 const repair=check(await staff.rpc('yj_save_repair',args));assert.equal(repair.snapshot.totalMin,1000);assert.equal(repair.snapshot.transportOverlap,300);assert.equal(repair.snapshot.remainingMin,800);passed++;
 assert.equal(check(await manager.from('yj_repair_jobs').select('*')).length,1);passed++;
 assert.equal(check(await driver.from('yj_repair_versions').select('*')).length,0);passed++;
 assert.equal((await staff.rpc('yj_approve_repair',{p_case:inspection.id,p_expected:1,p_source_expected:1,p_reason:'unauthorized',p_consent:'not allowed'})).error?.code,'42501');passed++;
 check(await manager.rpc('yj_approve_case',{p_case:inspection.id,p_expected:1,p_reason:'QA inspection approved'}));
 check(await manager.rpc('yj_approve_repair',{p_case:inspection.id,p_expected:1,p_source_expected:1,p_reason:'QA repair approved',p_consent:'QA consent only'}));
 assert.equal(check(await staff.rpc('yj_export_repair',{p_case:inspection.id,p_expected:1})).totalMin,1000);passed++;
 const changed={...args,p_expected:1,p_draft:{...draft,note:{...draft.note,manualTotalMin:'1100'}}};check(await staff.rpc('yj_save_repair',changed));
 assert.equal((await staff.rpc('yj_export_repair',{p_case:inspection.id,p_expected:1})).error?.code,'PT409');passed++;
 assert.equal((await staff.rpc('yj_save_repair',changed)).error?.code,'PT409');passed++;
 const route=check(await staff.rpc('yj_save_route',{p_org:setup.org,p_route:null,p_expected:0,p_name:'QA REPAIR route',p_driver:setup.users[2],p_start:'2026-10-26T01:00:00Z',p_end:'2026-10-26T03:00:00Z',p_stops:[
  {case_id:inspection.id,leg:'PICKUP',address:'QA test address',starts_at:'2026-10-26T01:00:00Z',ends_at:'2026-10-26T01:20:00Z'},
  {case_id:inspection.id,leg:'RETURN',address:'QA test address',starts_at:'2026-10-26T02:00:00Z',ends_at:'2026-10-26T02:20:00Z'}]}));
 setup.routeId=route.id;await writeFile(file,JSON.stringify(setup));
 assert.ok((await manager.rpc('yj_publish_route',{p_route:route.id,p_expected:1})).error);passed++;
 check(await manager.rpc('yj_approve_repair',{p_case:inspection.id,p_expected:2,p_source_expected:1,p_reason:'QA revision approved',p_consent:'QA updated consent'}));
 check(await manager.rpc('yj_publish_route',{p_route:route.id,p_expected:1}));assert.equal(check(await driver.from('yj_routes').select('*')).length,1);passed++;
 const tasks=check(await driver.from('yj_route_stops').select('*').eq('route_id',route.id).order('position'));
 check(await driver.rpc('yj_update_stop',{p_stop:tasks[0].id,p_route_revision:2,p_status:'DONE',p_note:'QA pickup'}));
 check(await staff.rpc('yj_save_repair',{...changed,p_expected:2,p_draft:{...draft,note:{...draft.note,manualTotalMin:'1200'}}}));
 assert.ok((await driver.rpc('yj_update_stop',{p_stop:tasks[1].id,p_route_revision:3,p_status:'DONE',p_note:'QA return blocked'})).error);passed++;
 const screenEmail=`yj-repair-${setup.nonce}-screen@example.com`;
 check(await manager.rpc('yj_set_employee',{p_org:setup.org,p_email:screenEmail,p_name:'QA manager screen','p_role':'MANAGER',p_active:true}));
 setup.screenUrl=await invite({mode:'invite',orgId:setup.org,email:screenEmail},manager);
 setup.screenEmail=screenEmail;
 check(await manager.rpc('yj_set_employee',{p_org:setup.org,p_email:`yj-repair-${setup.nonce}-staff@example.com`,p_name:'QA staff',p_role:'STAFF',p_active:false}));
 assert.equal(check(await staff.from('yj_repair_jobs').select('*')).length,0);passed++;
 setup.checks=passed;await writeFile(file,JSON.stringify(setup));console.log(JSON.stringify({liveChecksPassed:passed,qaOrg:setup.org,screenReady:true}));
}catch(error){console.error(JSON.stringify({failed:true,code:error.code,message:error.message,passed}));process.exitCode=1}
finally{await writeFile(file,JSON.stringify(setup));for(const c of [manager,staff,driver])try{await c.auth.signOut({scope:'local'})}catch{}}
