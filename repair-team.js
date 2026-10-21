import {initTeamWorkspace} from './team-workspace.js?v=2.5.0';
import {amountText,adjustmentText,customerRepairSummary} from './repair-core.js?v=2.5.0';
import {teamError} from './team-core.js?v=2.5.0';
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
  if(!context?.org){jobs=[];box.replaceChildren();return}
  jobs=check(await context.client.from('yj_repair_jobs').select('*').eq('org_id',context.org).order('updated_at',{ascending:false}).limit(200));render();
 }
 function linkInspection(record,meta){
  const original=context.cases.find(c=>c.id===meta.caseId);if(!original)throw Error('案件不可讀取，請更新資料');const item={...original,revision:meta.revision || original.revision};
  if(!confirm('將此檢測案件連結至目前維修草稿並帶入客戶與故障說明？請先保存目前表單。'))return;
  const job=jobs.find(j=>j.case_id===item.id);
  if(job)throw Error('此案件已有維修版本，請使用上方「載入維修」避免覆蓋同事版本。');
  link=item;selectedRevision=0;bridge.onInspection(record);render();close();message('已連結檢測案件，請選維修項目，完成後回團隊頁同步。');
 }
 function render(){
  for(const e of box.querySelectorAll('[data-form-key]'))formValues.set(e.dataset.formKey,e.value);
  box.replaceChildren();if(!context?.user)return;
  const operator=['MANAGER','STAFF'].includes(context.role),manager=context.role==='MANAGER';
  if(operator){
   const card=node('section',undefined,'bg-white p-6 border rounded-2xl space-y-4');card.append(node('h3','維修報價同步與檢測費整合','text-xl font-bold'));
   card.append(node('p',link?`目前連結：${link.customer || link.id} · 檢測版本 ${link.revision} · 維修版本 ${selectedRevision}`:'尚未連結：可選取檢測案件，或將目前草稿建立成新的共用維修案件。','text-sm'));
   const source=field(card,'選擇已有檢測案件','select');option(source,'','請選擇');
   for(const item of context.cases.filter(c=>!['DONE','CANCELLED'].includes(c.workflow)))option(source,item.id,`${item.customer || '未填客戶'} · ${item.model} · ${item.id}`);
   button(card,'連結並帶入檢測客戶資料',async()=>{
    const item=context.cases.find(c=>c.id===source.value);if(!item)throw Error('請先選擇檢測案件');
    const latest=check(await context.client.from('yj_cases').select('*').eq('id',item.id).single());
    const quote=check(await context.client.from('yj_quote_versions').select('record').eq('case_id',item.id).eq('revision',latest.revision).single());
    linkInspection(quote.record,{caseId:latest.id,revision:latest.revision});
   });
   const credit=field(card,'檢測費折抵（預設 0，主管核准後生效）','number','0');credit.min='0';credit.step='0.01';
   const service=field(card,'新案件服務方式（已連結案件沿用原設定）','select');option(service,'IN_STORE','到店維修');option(service,'PICKUP','收送維修');
   const delivery=field(card,'約定收送時段與範圍（新收送案件必填）');delivery.maxLength=500;
   if(link){const job=jobs.find(j=>j.case_id===link.id);if(job){credit.value=box.dataset.credit || '0';delivery.value=box.dataset.window || ''}}
   button(card,'同步目前維修草稿（送主管核准）',async()=>{
    const local=bridge.getSnapshot();if(!local)throw Error('請先完成維修估價並修正紅色提示');
    const result=await rpc('yj_save_repair',{p_org:context.org,p_case:link?.id || null,p_expected:selectedRevision,p_source_expected:link?.revision || 0,p_draft:local.draft,p_credit:Number(credit.value || 0),p_service:service.value,p_window:delivery.value});
    link={...(link || {}),id:result.case_id,revision:result.snapshot.sourceRevision,customer:result.snapshot.customer};selectedRevision=result.revision;
    box.dataset.credit=String(result.snapshot.inspectionCredit);box.dataset.window=result.snapshot.deliveryWindow || '';
    await refreshRepairs();message(`維修 ${result.snapshot.orderId} 第 ${result.revision} 版已同步；請更新團隊列表以編排路線，正式輸出須主管核准。`);
   });
   button(card,'解除案件連結（保留表單，下一次建立新案）',async()=>resetLink());
   box.append(card);
  }
  const list=node('section',undefined,'bg-white p-6 border rounded-2xl space-y-4');list.append(node('h3','共用維修案件與主管核准','text-xl font-bold'),node('p','檢測、維修共用同一案件與路線。修改任何報價後須核准最新版本；回送也會再次檢查。未同步的本機草稿不代表正式報價。','text-sm'));
  if(!jobs.length)list.append(node('p','尚無可讀取的維修案件。'));
  for(const job of jobs){
   const row=node('div',undefined,'border p-4 rounded-xl space-y-3');row.dataset.form=job.case_id;const source=context.cases.find(c=>c.id===job.case_id);const fresh=source?.revision===job.source_revision;
   row.append(node('p',`${job.number} · 維修第 ${job.revision} 版 · ${job.workflow==='APPROVED'&&fresh?'已核准':'待核准／檢測版本已變更'}`,'font-bold'),node('p',`${source?.customer || job.case_id} · 共用案件 ${job.case_id}`,'text-sm break-all'));
   const detail=node('div',undefined,'text-sm whitespace-pre-wrap');row.append(detail);
   const readSnapshot=async revision=>check(await context.client.from('yj_repair_versions').select('snapshot').eq('case_id',job.case_id).eq('revision',revision).single()).snapshot;
   button(row,'檢視此版明細',async()=>{detail.textContent=repairSummary(await readSnapshot(job.revision),false,true)});
   if(operator){
    button(row,'載入維修（修改後另存版本）',async()=>{
     const latest=check(await context.client.from('yj_repair_jobs').select('*').eq('case_id',job.case_id).single());
     const s=await readSnapshot(latest.revision);if(!bridge.onLoad(s.draft))return;
     link={...(source || {}),id:job.case_id,revision:source?.revision || latest.source_revision,customer:s.customer};selectedRevision=latest.revision;box.dataset.credit=String(s.inspectionCredit);box.dataset.window=s.deliveryWindow || '';formValues.clear();box.replaceChildren();render();close();
    });
    button(row,'查看歷史版本（唯讀）',async()=>{
     const versions=check(await context.client.from('yj_repair_versions').select('revision,snapshot,created_at').eq('case_id',job.case_id).order('revision',{ascending:false}).limit(100));
     detail.replaceChildren(...versions.map(v=>{const d=node('details',undefined,'border p-3 rounded-lg my-2');d.append(node('summary',`第 ${v.revision} 版 · ${new Date(v.created_at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}`),node('p',repairSummary(v.snapshot,false,true),'whitespace-pre-wrap mt-2'));return d}));
    });
   }
   if(manager&&job.workflow==='REVIEW'){
    const reason=field(row,'主管核准理由');reason.maxLength=500;
    const consent=field(row,'客戶同意方式與時間（例如電話／LINE及時間）');consent.maxLength=500;
    button(row,'核准本版維修與折抵',async()=>{await rpc('yj_approve_repair',{p_case:job.case_id,p_expected:job.revision,p_source_expected:job.source_revision,p_reason:reason.value,p_consent:consent.value});await refreshRepairs();message('主管已核准目前維修版本及客戶同意紀錄。')});
   }
   if(operator){
    const getOfficial=()=>rpc('yj_export_repair',{p_case:job.case_id,p_expected:job.revision});
    const copy=button(row,'複製正式報價',async()=>{const s=await getOfficial();await navigator.clipboard.writeText(repairSummary(s,true));message('已核對後端最新核准版本，正式摘要已複製。')});
    const print=button(row,'下載正式報價（可列印）',async()=>{
     const s=await getOfficial(),text=repairSummary(s,true),escaped=text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
     const html=`<!doctype html><html lang="zh-TW"><meta charset="utf-8"><title>${s.orderId} 維修報價</title><style>body{font:16px/1.8 "Microsoft JhengHei",sans-serif;max-width:780px;margin:32px auto;padding:20px}pre{font:inherit;white-space:pre-wrap}@media print{button{display:none}}</style><button onclick="window.print()">列印報價</button><pre>${escaped}</pre></html>`;
     const url=URL.createObjectURL(new Blob([html],{type:'text/html'}));const a=node('a');a.href=url;a.download=`${s.orderId}-v${s.revision}.html`;a.click();URL.revokeObjectURL(url);
    });
    copy.disabled=print.disabled=!(job.workflow==='APPROVED'&&fresh);
   }
   list.append(row);
  }
  box.append(list);for(const e of box.querySelectorAll('[data-form-key]'))if(formValues.has(e.dataset.formKey))e.value=formValues.get(e.dataset.formKey);
 }
 initTeamWorkspace({getRecord:()=>{throw Error('請使用維修同步按鈕')},onSaved:()=>{},onOpenRecord:linkInspection,
  onContext:async value=>{if(context?.org!==value.org){jobs=[];link=null;selectedRevision=0;formValues.clear();box.replaceChildren()}context=value;bridge.onAuthenticated(!!value.user && !!value.org && ['MANAGER','STAFF'].includes(value.role));if(value.user && value.org && value.role){await refreshRepairs()}else{jobs=[];link=null;selectedRevision=0;formValues.clear();box.replaceChildren()}}
 });
}
export function repairSummary(s,official=false,internal=false){
 if(!internal)return customerRepairSummary(s,official);
 return `永捷維修${official?'正式報價':'估價草稿（未代表核准）'}\n單號：${s.orderId}／第 ${s.revision} 版\n共用案件：${s.caseId}\n檢測版本：${s.sourceRevision}\n客戶：${s.customer || '未填'}\n設備：${s.category}／${s.model}\n處理項目：${s.issue}\n零件／設備：${amountText(s.partsMin,s.partsMax)}\n額外費用：${amountText(s.extra)}（${s.draft.note.customPartName || '無'}）\n工資：${amountText(s.labor)}\n交機加價：${amountText(s.handover)}\n本次收送：${amountText(s.shipping)}\n折扣：-${amountText(s.discount)}\n報價調整：${adjustmentText(s.adjustmentMin,s.adjustmentMax)}（${s.draft.note.adjustmentReason || '無'}）\n維修小計：${amountText(s.repairMin,s.repairMax)}\n原檢測報價（含原收送）：${amountText(s.inspectionTotal)}\n檢測折抵：-${amountText(s.inspectionCredit)}\n重疊收送扣除：-${amountText(s.transportOverlap)}\n案件合計：${amountText(s.totalMin,s.totalMax)}\n原檢測紀錄已收金額參考：${amountText(s.paidReference)}\n預估待收：${amountText(s.remainingMin,s.remainingMax)}\n已收金額請核對公司收款紀錄；此系統不會執行扣款。${official?'\n主管核准時間：'+new Date(s.approvedAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'}):''}`;
}
