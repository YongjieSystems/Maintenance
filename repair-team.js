import {initTeamWorkspace} from './team-workspace.js?v=3.0.0';
import {amountText,adjustmentText,customerRepairSummary} from './repair-core.js?v=3.0.0';
import {teamError} from './team-core.js?v=3.0.0';
let resetLink=()=>{};
export const resetRepairLink=()=>resetLink();
export function openRepairTeam(){document.getElementById('repair-team-panel').hidden=false;}
export function initRepairTeam(bridge){
 const panel=document.getElementById('repair-team-panel'); if(!panel || panel.dataset.ready) return;panel.dataset.ready='true';
 const box=document.getElementById('repair-cloud');let context=null,jobs=[],link=null,selectedRevision=0,busy=false;const formValues=new Map();
 const node=(tag,text,cls='')=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;e.className=cls;return e};
 const message=text=>{document.getElementById('team-status').textContent=text};
 const check=r=>{if(r.error)throw r.error;return r.data};
 const rpc=async(name,args)=>check(await context.client.rpc(name,args));
 const run=async fn=>{if(busy)return;busy=true;try{await fn()}catch(e){message(teamError(e))}finally{busy=false}};
 const button=(parent,label,fn)=>{const b=node('button',label,'p-3 rounded-xl bg-blue-100 text-blue-900');b.type='button';b.onclick=()=>run(fn);parent.append(b);return b};
 const field=(parent,label,type='text',value='')=>{const l=node('label',label,'block text-sm space-y-2');const e=node(type==='select'?'select':'input');if(type!=='select')e.type=type;e.value=value;e.dataset.formKey=(parent.dataset.form || 'sync')+':'+label;e.className='w-full border p-3 rounded-xl';e.setAttribute('aria-label',label);l.append(e);parent.append(l);return e};
 const option=(select,value,label)=>{const o=node('option',label);o.value=value;select.append(o)};
 const close=()=>{panel.hidden=true};document.getElementById('repair-team-back').onclick=close;
 // Existing onboarding links continue to use the inspection application's activation page.
 window.switchTab=()=>openRepairTeam();
 resetLink=()=>{link=null;selectedRevision=0;formValues.clear();box.replaceChildren();box.dataset.credit='0';box.dataset.window='';if(context?.user)render()};
 async function refreshRepairs(){
  const expectedContext=context;
  if(!context?.org){jobs=[];box.replaceChildren();return}
  const result=await context.client.from('yj_repair_jobs').select('*').eq('org_id',context.org).order('updated_at',{ascending:false}).limit(200);if(context!==expectedContext)return;jobs=check(result);render();
 }
 function linkInspection(){message('檢測與維修已獨立，請建立新的維修單，不再帶入檢測資料。')}
 function render(){
  for(const e of box.querySelectorAll('[data-form-key]'))formValues.set(e.dataset.formKey,e.value);
  box.replaceChildren();if(!context?.user)return;
  const operator=['MANAGER','STAFF'].includes(context.role),manager=context.role==='MANAGER';
  if(operator){
   const card=node('section',undefined,'bg-white p-6 border rounded-2xl space-y-4');card.append(node('h3','保存共用維修報價','text-xl font-bold'));
   card.append(node('p',link?`正在修改：${link.customer || link.id} · 維修版本 ${selectedRevision}`:'新維修單獨立計費，完成後保存，同事即可查詢，不需等主管。','text-sm'));
   const credit={value:'0'};
   const service=field(card,'維修交付方式','select');option(service,'IN_STORE','到店維修');option(service,'PICKUP','收送維修');
   const delivery=field(card,'約定收送時段與範圍（新收送案件必填）');delivery.maxLength=500;
   if(link){const job=jobs.find(j=>j.case_id===link.id);if(job){credit.value='0';delivery.value=box.dataset.window || '';service.value=context.cases.find(c=>c.id===link.id)?.service||'IN_STORE';service.disabled=true;}}
   button(card,'保存到團隊',async()=>{
    const local=bridge.getSnapshot();if(!local)throw Error('請先完成維修估價並修正紅色提示');
    const result=await rpc('yj_save_repair',{p_org:context.org,p_case:link?.id || null,p_expected:selectedRevision,p_source_expected:link?.revision || 0,p_draft:local.draft,p_credit:Number(credit.value || 0),p_service:service.value,p_window:delivery.value});
    link={...(link || {}),id:result.case_id,revision:result.snapshot.sourceRevision,customer:result.snapshot.customer};selectedRevision=result.revision;
    box.dataset.credit=String(result.snapshot.inspectionCredit);box.dataset.window=result.snapshot.deliveryWindow || '';
    await refreshRepairs();message(`維修 ${result.snapshot.orderId} 第 ${result.revision} 版已同步；請更新團隊列表以編排路線，已保存共用，可直接報價。`);
   });
   button(card,'另存新維修單（保留表單）',async()=>resetLink());
   box.append(card);
  }
  const list=node('section',undefined,'bg-white p-6 border rounded-2xl space-y-4');list.append(node('h3','共用維修紀錄','text-xl font-bold'),node('p','檢測與維修獨立保存、各自計費。保存後可直接複製或列印，歷史版本與經辦紀錄仍會保留。','text-sm'));
  if(!jobs.length)list.append(node('p','尚無可讀取的維修案件。'));
  for(const job of jobs){
   const row=node('div',undefined,'border p-4 rounded-xl space-y-3');row.dataset.form=job.case_id;const source=context.cases.find(c=>c.id===job.case_id);const fresh=job.origin_direct;
   row.append(node('p',`${job.number} · 維修第 ${job.revision} 版 · ${job.origin_direct?'已保存':'舊關聯紀錄（唯讀）'}`,'font-bold'),node('p',`${source?.customer || job.case_id} · 共用案件 ${job.case_id}`,'text-sm break-all'));
   const detail=node('div',undefined,'text-sm whitespace-pre-wrap');row.append(detail);
   const readSnapshot=async revision=>check(await context.client.from('yj_repair_versions').select('snapshot').eq('case_id',job.case_id).eq('revision',revision).single()).snapshot;
   button(row,'檢視此版明細',async()=>{detail.textContent=repairSummary(await readSnapshot(job.revision),false,true)});
   if(operator){
    button(row,'載入修改',async()=>{
     if(!job.origin_direct)throw Error('此為舊關聯紀錄，請另建獨立維修單，不再帶入檢測費。');
     const latest=check(await context.client.from('yj_repair_jobs').select('*').eq('case_id',job.case_id).single());
     const s=await readSnapshot(latest.revision);if(!bridge.onLoad(s.draft))return;
     link={...(source || {}),id:job.case_id,revision:source?.revision || latest.source_revision,customer:s.customer};selectedRevision=latest.revision;box.dataset.credit=String(s.inspectionCredit);box.dataset.window=s.deliveryWindow || '';formValues.clear();box.replaceChildren();render();close();
    });
    button(row,'查看歷史版本（唯讀）',async()=>{
     const versions=check(await context.client.from('yj_repair_versions').select('revision,snapshot,created_at').eq('case_id',job.case_id).order('revision',{ascending:false}).limit(100));
     detail.replaceChildren(...versions.map(v=>{const d=node('details',undefined,'border p-3 rounded-lg my-2');d.append(node('summary',`第 ${v.revision} 版 · ${new Date(v.created_at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}`),node('p',repairSummary(v.snapshot,false,true),'whitespace-pre-wrap mt-2'));return d}));
    });
   }
   if(operator){
    const getOfficial=()=>rpc('yj_export_repair',{p_case:job.case_id,p_expected:job.revision});
    const copy=button(row,'複製客戶報價',async()=>{const s=await getOfficial();await navigator.clipboard.writeText(repairSummary(s,true));message('✓ 已複製最新保存版本。')});
    const print=button(row,'下載／列印客戶報價',async()=>{
     const s=await getOfficial(),text=repairSummary(s,true),escaped=text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
     const html=`<!doctype html><html lang="zh-TW"><meta charset="utf-8"><title>${s.orderId} 維修報價</title><style>body{font:16px/1.8 "Microsoft JhengHei",sans-serif;max-width:780px;margin:32px auto;padding:20px}pre{font:inherit;white-space:pre-wrap}@media print{button{display:none}}</style><button onclick="window.print()">列印報價</button><pre>${escaped}</pre></html>`;
     const url=URL.createObjectURL(new Blob([html],{type:'text/html'}));const a=node('a');a.href=url;a.download=`${s.orderId}-v${s.revision}.html`;a.click();URL.revokeObjectURL(url);
    });
    copy.disabled=print.disabled=!job.origin_direct;
   }
   list.append(row);
  }
  box.append(list);for(const e of box.querySelectorAll('[data-form-key]'))if(formValues.has(e.dataset.formKey))e.value=formValues.get(e.dataset.formKey);
 }
 initTeamWorkspace({kind:'REPAIR',getRecord:()=>{throw Error('請使用維修同步按鈕')},onSaved:()=>{},onOpenRecord:linkInspection,
  onContext:async value=>{if(context?.org!==value.org){jobs=[];link=null;selectedRevision=0;formValues.clear();box.replaceChildren()}context=value;bridge.onAuthenticated(!!value.user && !!value.org && ['MANAGER','STAFF'].includes(value.role));if(value.user && value.org && value.role){await refreshRepairs()}else{jobs=[];link=null;selectedRevision=0;formValues.clear();box.replaceChildren()}}
 });
}
export function repairSummary(s,official=false,internal=false){
 if(!internal)return customerRepairSummary(s,false);
 return customerRepairSummary(s,false)+'\n\n【內部保存紀錄】\n維修單：'+s.caseId+'\n版本：'+s.revision+'\n保存時間：'+(s.createdAt||'')+(s.inspectionTotal>0?'\n舊關聯紀錄僅供歷史查閱，不可帶入新單。':'');
}
