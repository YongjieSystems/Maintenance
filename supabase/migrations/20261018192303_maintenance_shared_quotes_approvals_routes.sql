-- Additive maintenance integration; existing inspection prices and routes are retained.
create table yj_private.repair_pricebook (org_id uuid primary key references public.yj_organizations(id), catalogue jsonb not null);
create table public.yj_repair_jobs (
 case_id uuid primary key references public.yj_cases(id),org_id uuid not null references public.yj_organizations(id),
 number text not null,revision integer not null,source_revision integer not null,origin_direct boolean not null,
 workflow text not null default 'REVIEW' check(workflow in ('REVIEW','APPROVED')),
 approved_revision integer,approved_by uuid references auth.users(id),approved_at timestamptz,
 approval_reason text,customer_consent text,updated_at timestamptz not null default now(),unique(org_id,number)
);
create table public.yj_repair_versions (
 case_id uuid not null references public.yj_repair_jobs(case_id),revision integer not null,snapshot jsonb not null,
 fingerprint text not null,created_by uuid not null references auth.users(id),created_at timestamptz not null default now(),primary key(case_id,revision)
);
create index on public.yj_repair_jobs(org_id,updated_at desc);
alter table public.yj_repair_jobs enable row level security;
alter table public.yj_repair_versions enable row level security;
revoke all on yj_private.repair_pricebook from public,anon,authenticated;
revoke all on public.yj_repair_jobs,public.yj_repair_versions from public,anon,authenticated;
grant select on public.yj_repair_jobs,public.yj_repair_versions to authenticated;
create policy repair_job_read on public.yj_repair_jobs for select to authenticated using(yj_private.actor_role(org_id) in ('MANAGER','STAFF') or (yj_private.actor_role(org_id)='ENGINEER' and yj_private.can_read_case(case_id)));
create policy repair_version_read on public.yj_repair_versions for select to authenticated using(exists(select 1 from public.yj_repair_jobs j where j.case_id=yj_repair_versions.case_id));

create function yj_private.repair_amount(n jsonb,k text,d numeric default 0) returns numeric language plpgsql immutable set search_path='' as $$
declare t text:=n->>k; v numeric;
begin
 if n ? k and n->k='null'::jsonb then raise exception '無效數字：%',k; end if;
 if t is null or t='' then return d; end if;
 if t !~ '^[0-9]{1,9}([.][0-9]{1,6})?$' then raise exception '無效數字：%',k; end if;
 v:=t::numeric;
 if v>100000000 or (k<>'finalEstimatedTime' and v<>round(v,2)) then raise exception '金額過大或小數超過兩位：%',k; end if;
 return v;
end;
$$;

create function yj_private.save_repair(p_org uuid,p_case uuid,p_expected integer,p_source_expected integer,p_draft jsonb,p_credit numeric,p_service text,p_window text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.yj_cases; j public.yj_repair_jobs; n jsonb:=p_draft->'note'; h jsonb:=p_draft->'handoverState';
 cat jsonb; v_model jsonb; issue jsonb; snap jsonb; source jsonb; v_id uuid:=coalesce(p_case,gen_random_uuid());
 v_direct boolean; v_rev integer; v_num text; v_fingerprint text; prev public.yj_repair_versions;
 parts_lo numeric;parts_hi numeric;extra numeric;hours numeric;rate numeric;labor numeric;shipping numeric;discount numeric;handover numeric:=0;
 calc_lo numeric;calc_hi numeric;lo numeric;hi numeric;inspection numeric:=0;transport numeric:=0;overlap numeric:=0;paid numeric:=0;total numeric;
begin
 perform 1 from public.yj_organizations where id=p_org for update;
 perform yj_private.require_role(p_org,array['MANAGER','STAFF']);
 if p_expected is null or p_expected<0 or p_source_expected is null or p_source_expected<0 or p_credit is null or p_credit<0 or p_credit>100000000 or p_credit<>round(p_credit,2) then raise exception '版本或折抵金額無效'; end if;
 if p_draft is null or octet_length(p_draft::text)>50000 or jsonb_typeof(n) is distinct from 'object' or jsonb_typeof(h) is distinct from 'object' then raise exception '請先選設備及故障，完成報價'; end if;
 select value into cat from yj_private.repair_pricebook b cross join lateral jsonb_array_elements(b.catalogue) where b.org_id=p_org and value->>'id'=p_draft->>'categoryId';
 select value into v_model from jsonb_array_elements(cat->'models') where value->>'id'=p_draft->>'modelId';
 select value into issue from jsonb_array_elements(v_model->'issues') where value->>'id'=p_draft->>'issueId';
 if issue is null then raise exception '此項目未列入共用價目表，請主管確認；原收費未變更'; end if;
 select coalesce(jsonb_object_agg(key,value),'{}') into n from jsonb_each(n) where key=any(array['manualBasePartsCost','customPartsCost','customPartName','finalEstimatedTime','manualLaborRate','shippingCost','specialDiscount','manualTotalMin','manualTotalMax','adjustmentReason','customerName','quotationDepartment','quotationPersonnel','serialNumber','pageCount','technicianNotes','activeParts']);
 if length(coalesce(n->>'customerName',''))>500 or length(coalesce(n->>'technicianNotes',''))>4000 or length(coalesce(n->>'adjustmentReason',''))>500 or length(coalesce(n->>'serialNumber',''))>500 or length(coalesce(p_window,''))>500 then raise exception '文字欄位過長'; end if;
 if n->>'pageCount' is not null and n->>'pageCount'<>'' and n->>'pageCount'!~'^[0-9]{1,12}$' then raise exception '使用張數須為非負整數'; end if;
 if jsonb_typeof(n->'activeParts') is distinct from 'array' or jsonb_array_length(n->'activeParts')>50 then raise exception '零件項目無效'; end if;
 parts_lo:=yj_private.repair_amount(n,'manualBasePartsCost',greatest(0,(issue->>'estimatedCostMin')::numeric-(issue->>'estimatedTimeHours')::numeric*350));
 parts_hi:=yj_private.repair_amount(n,'manualBasePartsCost',greatest(0,(issue->>'estimatedCostMax')::numeric-(issue->>'estimatedTimeHours')::numeric*350));
 extra:=yj_private.repair_amount(n,'customPartsCost');hours:=yj_private.repair_amount(n,'finalEstimatedTime');rate:=yj_private.repair_amount(n,'manualLaborRate',350);labor:=round(hours*rate,2);
 if labor>100000000 then raise exception '工時計價過大'; end if;
 shipping:=yj_private.repair_amount(n,'shippingCost');discount:=yj_private.repair_amount(n,'specialDiscount');
 if cat->>'id'='new-used-equipment' and h->'pcDriver'='true'::jsonb then
  if h->>'pcCountType'='4-6' then handover:=500;
  elsif h->>'pcCountType'='7+' then handover:=yj_private.repair_amount(h,'pcManualPrice');
  elsif h->>'pcCountType' is distinct from '1-3' then raise exception '交機台數無效'; end if;
 end if;
 calc_lo:=round(parts_lo+extra+labor+shipping+handover-discount,2);calc_hi:=round(parts_hi+extra+labor+shipping+handover-discount,2);
 if calc_lo<0 then raise exception '折扣超過最低費用小計'; end if;
 lo:=yj_private.repair_amount(n,'manualTotalMin',calc_lo);hi:=yj_private.repair_amount(n,'manualTotalMax',case when coalesce(n->>'manualTotalMin','')<>'' then lo else calc_hi end);
 if coalesce(n->>'manualTotalMin','')='' and coalesce(n->>'manualTotalMax','')<>'' then raise exception '請先輸入總額下限'; end if;
 if hi<lo then raise exception '最高價不得低於最低價'; end if;
 if (lo<>calc_lo or hi<>calc_hi) and length(trim(coalesce(n->>'adjustmentReason','')))=0 then raise exception '請填寫報價調整原因'; end if;
 select * into c from public.yj_cases where id=v_id for update;
 if found then
  if c.org_id<>p_org then raise exception '沒有此案件權限' using errcode='42501'; end if;
  if c.revision<>p_source_expected then raise exception '檢測案件已更新，請重新載入' using errcode='PT409'; end if;
  if c.workflow in ('DONE','CANCELLED') or exists(select 1 from public.yj_route_stops s where s.case_id=c.id and s.leg='RETURN' and s.status='DONE') then raise exception '已結案或回送，請另建案件'; end if;
  select * into j from public.yj_repair_jobs where case_id=c.id for update;
  v_direct:=coalesce(j.origin_direct,false);
  if coalesce(j.revision,0)<>p_expected then raise exception '維修報價已更新，請載入最新版本' using errcode='PT409'; end if;
  select record into source from public.yj_quote_versions where case_id=c.id and revision=c.revision;
  if not v_direct then
   if coalesce(n->>'customerName','')<>c.customer then raise exception '客戶名稱與檢測案件不同，請先確認是否連錯案件或更新檢測資料'; end if;
   if source->'state'->>'billingStage'='REPAIR' then raise exception '此案件已在檢測程式改為維修報價，不能再疊加維修費；請另建案件或保留原流程'; end if;
   inspection:=coalesce((source->>'total')::numeric,0);paid:=yj_private.repair_amount(source->'state','paidAmount');
   if c.service='ON_SITE' then transport:=(source->'state'->'pricing'->'TRANSPORT'->(source->'state'->>'zone')->>'price')::numeric;
   elsif c.service='PICKUP' and source->'state'->'feeConfirmed'='true'::jsonb then transport:=yj_private.repair_amount(source->'state','logisticsFee'); end if;
  end if;
  if v_direct then
   update public.yj_cases set customer=coalesce(n->>'customerName',''),model=v_model->>'name',problem=issue->>'name',updated_at=now() where id=c.id returning * into c;
  end if;
 else
  if p_case is not null or p_expected<>0 or p_source_expected<>0 then raise exception '案件不存在' using errcode='PT409'; end if;
  if p_service is null or p_service not in ('IN_STORE','PICKUP') then raise exception '請選擇到店或收送'; end if;
  if p_service='PICKUP' and length(trim(coalesce(p_window,'')))=0 then raise exception '收送案件請填約定時段及範圍'; end if;
  v_direct:=true;
  insert into public.yj_cases(id,org_id,revision,customer,model,problem,service) values(v_id,p_org,1,coalesce(n->>'customerName',''),v_model->>'name',issue->>'name',p_service) returning * into c;
  insert into public.yj_quote_versions(case_id,revision,record,created_by) values(v_id,1,jsonb_build_object('total',0,'problem',issue->>'name','state',jsonb_build_object('schemaVersion',2,'repairOrigin',true,'billingStage','REPAIR','repairConfirmed',false,'repairFee',lo,'customerName',c.customer,'deviceModel',c.model,'service',p_service,'logisticsFee',shipping,'logisticsWindow',p_window,'feeConfirmed',true,'windowConfirmed',true)),auth.uid());
 end if;
 if p_credit>greatest(0,inspection-transport) then raise exception '檢測折抵不可超過檢測報價扣除收送費後的金額'; end if;
 overlap:=least(transport,shipping);
 p_draft:=jsonb_build_object('categoryId',cat->>'id','modelId',v_model->>'id','issueId',issue->>'id','note',n,'handoverState',h);
 v_fingerprint:=md5(jsonb_build_object('draft',p_draft,'credit',p_credit,'source',c.revision,'service',c.service,'window',p_window)::text);
 select * into prev from public.yj_repair_versions where case_id=v_id and revision=j.revision;
 if prev.fingerprint=v_fingerprint then return jsonb_build_object('case_id',v_id,'revision',j.revision,'snapshot',prev.snapshot); end if;
 v_rev:=coalesce(j.revision,0)+1;v_num:=coalesce(j.number,'R'||to_char(now() at time zone 'Asia/Taipei','YYMMDD')||upper(substr(replace(v_id::text,'-',''),1,8)));
 snap:=jsonb_build_object('orderId',v_num,'caseId',v_id,'revision',v_rev,'sourceRevision',c.revision,'draft',p_draft||jsonb_build_object('note',n),
  'customer',c.customer,'category',cat->>'name','model',v_model->>'name','issue',issue->>'name','partsMin',parts_lo,'partsMax',parts_hi,'extra',extra,'labor',labor,'shipping',shipping,'discount',discount,'handover',handover,
  'repairMin',lo,'repairMax',hi,'adjustmentMin',lo-calc_lo,'adjustmentMax',hi-calc_hi,'inspectionTotal',inspection,'inspectionCredit',p_credit,'transportOverlap',overlap,'paidReference',paid,
  'totalMin',inspection+lo-p_credit-overlap,'totalMax',inspection+hi-p_credit-overlap,'remainingMin',greatest(0,inspection+lo-p_credit-overlap-paid),'remainingMax',greatest(0,inspection+hi-p_credit-overlap-paid),
  'deliveryWindow',p_window,'createdAt',now());
 insert into public.yj_repair_jobs(case_id,org_id,number,revision,source_revision,origin_direct) values(v_id,p_org,v_num,v_rev,c.revision,v_direct)
 on conflict(case_id) do update set revision=v_rev,source_revision=c.revision,workflow='REVIEW',approved_revision=null,approved_by=null,approved_at=null,approval_reason=null,customer_consent=null,updated_at=now();
 insert into public.yj_repair_versions(case_id,revision,snapshot,fingerprint,created_by) values(v_id,v_rev,snap,v_fingerprint,auth.uid());
 perform yj_private.audit(p_org,'REPAIR_SAVED',v_id,jsonb_build_object('revision',v_rev,'sourceRevision',c.revision));
 return jsonb_build_object('case_id',v_id,'revision',v_rev,'snapshot',snap);
end;
$$;

create function yj_private.approve_repair(p_case uuid,p_expected integer,p_source_expected integer,p_reason text,p_consent text) returns void language plpgsql security definer set search_path='' as $$
declare j public.yj_repair_jobs;c public.yj_cases;s jsonb;
begin
 select org_id into j.org_id from public.yj_repair_jobs where case_id=p_case;
 perform 1 from public.yj_organizations where id=j.org_id for update;
 perform yj_private.require_role(j.org_id,array['MANAGER']);
 select * into j from public.yj_repair_jobs where case_id=p_case for update;
 select * into c from public.yj_cases where id=p_case for update;
 if p_expected is null or p_source_expected is null or j.revision<>p_expected or c.revision<>p_source_expected or j.source_revision<>c.revision or c.workflow in ('DONE','CANCELLED') or j.workflow<>'REVIEW' then raise exception '案件或檢測版本已變更，請重新載入' using errcode='PT409'; end if;
 if length(trim(coalesce(p_reason,''))) not between 1 and 500 or length(trim(coalesce(p_consent,''))) not between 1 and 500 then raise exception '請填主管核准理由及客戶同意方式／時間'; end if;
 select snapshot into s from public.yj_repair_versions where case_id=p_case and revision=j.revision;
 if s->>'repairMin'<>s->>'repairMax' then raise exception '正式核准前須確認單一維修金額，不能使用預估區間'; end if;
 if not j.origin_direct and (c.workflow<>'APPROVED' or c.approved_revision is distinct from c.revision) then raise exception '請先核准最新檢測報價'; end if;
 update public.yj_repair_jobs set workflow='APPROVED',approved_revision=revision,approved_by=auth.uid(),approved_at=now(),approval_reason=trim(p_reason),customer_consent=trim(p_consent) where case_id=p_case;
 if j.origin_direct then update public.yj_cases set workflow='APPROVED',approved_revision=revision,updated_at=now() where id=p_case; end if;
 perform yj_private.audit(j.org_id,'REPAIR_APPROVED',p_case,jsonb_build_object('revision',j.revision,'reason',p_reason,'consent',p_consent));
end;
$$;

create function yj_private.export_repair(p_case uuid,p_expected integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.yj_repair_jobs;c public.yj_cases;s jsonb;
begin
 select * into j from public.yj_repair_jobs where case_id=p_case;
 perform 1 from public.yj_organizations where id=j.org_id for share;
 perform yj_private.require_role(j.org_id,array['MANAGER','STAFF']);
 select * into j from public.yj_repair_jobs where case_id=p_case;
 select * into c from public.yj_cases where id=p_case;
 if p_expected is null or j.revision<>p_expected or j.approved_revision is distinct from j.revision or j.workflow<>'APPROVED' or j.source_revision<>c.revision or c.workflow<>'APPROVED' or c.approved_revision is distinct from c.revision then raise exception '最新檢測與維修報價尚未完成核准，不能輸出正式報價' using errcode='PT409'; end if;
 select snapshot into s from public.yj_repair_versions where case_id=p_case and revision=j.revision;
 return s||jsonb_build_object('approvedAt',j.approved_at,'approvalReason',j.approval_reason,'customerConsent',j.customer_consent);
end;
$$;

create function yj_private.guard_repair_return() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='yj_routes' then
 if new.status='PUBLISHED' then
  if exists(select 1 from public.yj_route_stops s join public.yj_repair_jobs j on j.case_id=s.case_id join public.yj_cases c on c.id=j.case_id where s.route_id=new.id and s.leg='RETURN' and (j.workflow<>'APPROVED' or j.approved_revision is distinct from j.revision or j.source_revision<>c.revision)) then raise exception '回送前須核准最新維修報價及客戶同意紀錄'; end if;
 end if;
 elsif tg_table_name='yj_route_stops' then
 if new.leg='RETURN' and new.status='DONE' then
  if exists(select 1 from public.yj_repair_jobs j join public.yj_cases c on c.id=j.case_id where j.case_id=new.case_id and (j.workflow<>'APPROVED' or j.approved_revision is distinct from j.revision or j.source_revision<>c.revision)) then raise exception '維修報價已變更，請主管重新核准後再回送'; end if;
 end if;
 elsif tg_table_name='yj_cases' then
 if new.workflow='DONE' then
  if exists(select 1 from public.yj_repair_jobs j where j.case_id=new.id and (j.workflow<>'APPROVED' or j.approved_revision is distinct from j.revision or j.source_revision<>new.revision)) then raise exception '請先完成最新維修報價核准'; end if;
 end if;
 end if;
 return new;
end;
$$;
create trigger repair_route_guard before update on public.yj_routes for each row execute function yj_private.guard_repair_return();
create trigger repair_stop_guard before update on public.yj_route_stops for each row execute function yj_private.guard_repair_return();
create trigger repair_close_guard before update on public.yj_cases for each row execute function yj_private.guard_repair_return();

create function public.yj_save_repair(p_org uuid,p_case uuid,p_expected integer,p_source_expected integer,p_draft jsonb,p_credit numeric,p_service text,p_window text) returns jsonb language sql security invoker set search_path='' as $$select yj_private.save_repair(p_org,p_case,p_expected,p_source_expected,p_draft,p_credit,p_service,p_window);$$;
create function public.yj_approve_repair(p_case uuid,p_expected integer,p_source_expected integer,p_reason text,p_consent text) returns void language sql security invoker set search_path='' as $$select yj_private.approve_repair(p_case,p_expected,p_source_expected,p_reason,p_consent);$$;
create function public.yj_export_repair(p_case uuid,p_expected integer) returns jsonb language sql security invoker set search_path='' as $$select yj_private.export_repair(p_case,p_expected);$$;
revoke all on function yj_private.repair_amount(jsonb,text,numeric),yj_private.save_repair(uuid,uuid,integer,integer,jsonb,numeric,text,text),yj_private.approve_repair(uuid,integer,integer,text,text),yj_private.export_repair(uuid,integer),yj_private.guard_repair_return(),public.yj_save_repair(uuid,uuid,integer,integer,jsonb,numeric,text,text),public.yj_approve_repair(uuid,integer,integer,text,text),public.yj_export_repair(uuid,integer) from public,anon,authenticated;
grant execute on function yj_private.save_repair(uuid,uuid,integer,integer,jsonb,numeric,text,text),yj_private.approve_repair(uuid,integer,integer,text,text),yj_private.export_repair(uuid,integer),public.yj_save_repair(uuid,uuid,integer,integer,jsonb,numeric,text,text),public.yj_approve_repair(uuid,integer,integer,text,text),public.yj_export_repair(uuid,integer) to authenticated;


insert into yj_private.repair_pricebook(org_id,catalogue) select id,'[{"id":"desktop","name":"桌上型電腦","iconName":"Monitor","models":[{"id":"generic-desktop","name":"一般組裝電腦","issues":[{"id":"issue_001","name":"無法開機 (No Power)","description":"按下電源鍵無反應，風扇未轉動","estimatedCostMin":800,"estimatedCostMax":3500,"estimatedTimeHours":2,"potentialParts":["電源供應器 (PSU)","主機板電容","電源開關模組"]},{"id":"issue_002","name":"畫面破圖 / 藍屏","description":"顯示卡異常或記憶體錯誤","estimatedCostMin":1500,"estimatedCostMax":8000,"estimatedTimeHours":3,"potentialParts":["獨立顯示卡","記憶體 (RAM)","顯示排線"]},{"id":"issue_clean_maintenance","name":"主機內部清潔保養","description":"更換散熱膏、整線、風扇除塵","estimatedCostMin":800,"estimatedCostMax":1500,"estimatedTimeHours":1.5,"potentialParts":["散熱膏","風扇"]},{"id":"issue_hdd_failure","name":"硬碟故障","description":"更換硬碟 / 系統轉移","estimatedCostMin":1500,"estimatedCostMax":4500,"estimatedTimeHours":3,"potentialParts":["SSD硬碟","機械硬碟","作業系統"]},{"id":"issue_no_display_signal","name":"有開機但螢幕沒畫面","description":"疑難雜症","estimatedCostMin":800,"estimatedCostMax":4500,"estimatedTimeHours":2,"potentialParts":["記憶體","顯示卡","螢幕線插錯"]},{"id":"issue_boot_loop","name":"開機卡在 LOGO / 無限重開","description":"疑難雜症","estimatedCostMin":800,"estimatedCostMax":3500,"estimatedTimeHours":2.5,"potentialParts":["硬碟異常","BIOS 設定錯誤","系統更新"]},{"id":"issue_system_slow","name":"系統很慢、卡到懷疑人生","description":"疑難雜症","estimatedCostMin":800,"estimatedCostMax":4500,"estimatedTimeHours":2.5,"potentialParts":["傳統硬碟老化","記憶體不足","開機程式過多"]},{"id":"issue_network_failure","name":"網路連不上","description":"疑難雜症","estimatedCostMin":800,"estimatedCostMax":3000,"estimatedTimeHours":2,"potentialParts":["網卡驅動","網路線壞掉","路由器/集線器故障"]},{"id":"issue_assembly_byo","name":"代客組裝(自備零件)","description":"協助客戶升級","estimatedCostMin":1200,"estimatedCostMax":3000,"estimatedTimeHours":2.5,"potentialParts":["客戶零件","作業系統","軟體"]},{"id":"issue_complex_troubleshooting","name":"疑難雜症","description":"疑難雜症處理","estimatedCostMin":800,"estimatedCostMax":5000,"estimatedTimeHours":2,"potentialParts":["處理器","塔扇","冷排","主機板","記憶體","電源供應器","硬碟","風扇","線材","機殼","CMOS電池","SATA線","RGB","電源開關","顯示卡","作業系統","軟體","技術處理"]}]},{"id":"gaming-desktop","name":"高階電競主機","issues":[{"id":"issue_003","name":"水冷散熱異常","description":"CPU 溫度過高，幫浦異音","estimatedCostMin":3000,"estimatedCostMax":6000,"estimatedTimeHours":4,"potentialParts":["一體式水冷","散熱膏","風扇控制器"]}]}]},{"id":"laptop","name":"筆記型電腦","iconName":"Laptop","models":[{"id":"ultrabook","name":"高效能筆電","issues":[{"id":"issue_004","name":"液晶螢幕破裂","description":"顯示黑屏、線條或玻璃破裂","estimatedCostMin":3500,"estimatedCostMax":6500,"estimatedTimeHours":2.5,"potentialParts":["LCD 面板","螢幕排線"]},{"id":"issue_005","name":"電池無法蓄電","description":"拔除電源隨即關機","estimatedCostMin":2000,"estimatedCostMax":3500,"estimatedTimeHours":1,"potentialParts":["鋰電池模組","主機板","變壓器"]},{"id":"issue_laptop_os","name":"筆電重灌 / 系統安裝 / 軟體","description":"系統錯誤或客戶軟體安裝","estimatedCostMin":800,"estimatedCostMax":1500,"estimatedTimeHours":2,"potentialParts":["作業系統","軟體","除錯"]},{"id":"issue_overheating","name":"溫度異常 / 效能降低","description":"溫度異常、散熱不佳、風扇不轉","estimatedCostMin":1500,"estimatedCostMax":3000,"estimatedTimeHours":2,"potentialParts":["風扇","散熱套件","散熱膏"]},{"id":"issue_laptop_no_power","name":"無法開機(無過電)","description":"按電源無反應且無燈號","estimatedCostMin":3500,"estimatedCostMax":6000,"estimatedTimeHours":4,"potentialParts":["主機板","晶片更換","電阻/電容/電感","飛線"]},{"id":"issue_laptop_bsod","name":"使用時異常 / 藍屏","description":"無故當機，病毒及速度過慢","estimatedCostMin":1500,"estimatedCostMax":4500,"estimatedTimeHours":3,"potentialParts":["主機板","硬碟","作業系統","記憶體","軟體"]},{"id":"issue_laptop_complex","name":"疑難雜症","description":"疑難雜症處理","estimatedCostMin":800,"estimatedCostMax":5000,"estimatedTimeHours":2,"potentialParts":["處理器","主機板","散熱器","記憶體","WIFI模組","硬碟","喇叭","螢幕","排線","變壓器","外殼"]}]},{"id":"office-laptop","name":"文書筆電","issues":[{"id":"issue_office_004","name":"液晶螢幕破裂","description":"顯示黑屏、線條或玻璃破裂","estimatedCostMin":3500,"estimatedCostMax":6500,"estimatedTimeHours":2.5,"potentialParts":["LCD 面板","螢幕排線"]},{"id":"issue_office_005","name":"電池無法蓄電","description":"拔除電源隨即關機","estimatedCostMin":2000,"estimatedCostMax":3500,"estimatedTimeHours":1,"potentialParts":["鋰電池模組","主機板","變壓器"]},{"id":"issue_office_os","name":"筆電重灌 / 系統安裝 / 軟體","description":"系統錯誤或客戶軟體安裝","estimatedCostMin":800,"estimatedCostMax":1500,"estimatedTimeHours":2,"potentialParts":["作業系統","軟體","除錯"]},{"id":"issue_office_overheating","name":"溫度異常 / 效能降低","description":"溫度異常、散熱不佳、風扇不轉","estimatedCostMin":1500,"estimatedCostMax":3000,"estimatedTimeHours":2,"potentialParts":["風扇","散熱套件","散熱膏"]},{"id":"issue_office_no_power","name":"無法開機(無過電)","description":"按電源無反應且無燈號","estimatedCostMin":3500,"estimatedCostMax":6000,"estimatedTimeHours":4,"potentialParts":["主機板","晶片更換","電阻/電容/電感","飛線"]},{"id":"issue_office_bsod","name":"使用時異常 / 藍屏","description":"無故當機，病毒及速度過慢","estimatedCostMin":1500,"estimatedCostMax":4500,"estimatedTimeHours":3,"potentialParts":["主機板","硬碟","作業系統","記憶體","軟體"]},{"id":"issue_office_complex","name":"疑難雜症","description":"疑難雜症處理","estimatedCostMin":800,"estimatedCostMax":5000,"estimatedTimeHours":2,"potentialParts":["處理器","主機板","散熱器","記憶體","WIFI模組","硬碟","喇叭","螢幕","排線","變壓器","外殼"]}]}]},{"id":"laser-printer","name":"雷射印表機","iconName":"Printer","models":[{"id":"office-laser","name":"黑白 / 彩色 / 多功能雷射","issues":[{"id":"issue_006","name":"列印髒汙 / 黑線","description":"感光鼓受損或碳粉外漏","estimatedCostMin":1500,"estimatedCostMax":4000,"estimatedTimeHours":1.5,"potentialParts":["感光鼓","碳粉匣","清潔刮刀","異物"]},{"id":"issue_007","name":"經常性卡紙","description":"進紙輪磨損或定影組異常","estimatedCostMin":1200,"estimatedCostMax":3000,"estimatedTimeHours":2,"potentialParts":["進紙滾輪","分頁器","電磁閥","進紙組","定影組"]},{"id":"issue_laser_no_power","name":"無法開機(不過電)","description":"無法開機，插電及開關沒反應，沒燈號","estimatedCostMin":2500,"estimatedCostMax":5500,"estimatedTimeHours":2.5,"potentialParts":["電源板","主機板","變壓器"]},{"id":"issue_laser_skew","name":"列印紙張歪斜及碳粉不均","description":"碳粉列印傾斜，顏色不均","estimatedCostMin":2000,"estimatedCostMax":5000,"estimatedTimeHours":2,"potentialParts":["轉印單元","雷射組"]},{"id":"issue_laser_59c0","name":"59.C0","description":"主傳動處理","estimatedCostMin":2500,"estimatedCostMax":5500,"estimatedTimeHours":2.5,"potentialParts":["取紙輪","電磁閥","主傳動","齒輪組"]},{"id":"issue_laser_complex","name":"疑難雜症","description":"疑難雜症技術處理","estimatedCostMin":800,"estimatedCostMax":6000,"estimatedTimeHours":2,"potentialParts":["取紙輪","分頁器","進紙組","電磁閥","主傳動","齒輪組","轉印單元","紙匣","碳粉","光鼓","加熱器","掃描平台","ADF","主機板","電源板","取粉螺桿","外殼","雙面列印器","雷射組","韌體更新"]}]}]},{"id":"inkjet-printer","name":"噴墨印表機","iconName":"Droplet","models":[{"id":"tank-printer","name":"連續供墨機型","issues":[{"id":"issue_008","name":"噴頭堵塞 / 斷線","description":"久未列印導致墨水堵塞","estimatedCostMin":800,"estimatedCostMax":2500,"estimatedTimeHours":3,"potentialParts":["噴頭","墨水管線","廢墨棉"]},{"id":"issue_tank_no_power","name":"無法開機(不過電)","description":"無法開機且無燈號","estimatedCostMin":1500,"estimatedCostMax":3500,"estimatedTimeHours":2,"potentialParts":["電源板","主機板","變壓器"]},{"id":"issue_tank_paper_feed","name":"無法進紙","description":"無法進紙 / 多張進紙","estimatedCostMin":1200,"estimatedCostMax":3500,"estimatedTimeHours":2,"potentialParts":["取紙輪","進紙組","分頁器","異物","雙面列印器","齒輪組","電磁閥"]},{"id":"issue_tank_complex","name":"疑難雜症","description":"疑難雜症處理","estimatedCostMin":800,"estimatedCostMax":5000,"estimatedTimeHours":2,"potentialParts":["取紙輪","分頁器","進紙組","電磁閥","齒輪組","紙匣","墨水","掃描平台","ADF","主機板","電源板","外殼","雙面列印器","感應器","集墨棉","歸零程式","套件組","噴頭","晶片","機芯"]}]},{"id":"cartridge-printer","name":"一般墨匣","issues":[{"id":"issue_cartridge_008","name":"噴頭堵塞 / 斷線","description":"久未列印導致墨水堵塞","estimatedCostMin":800,"estimatedCostMax":2500,"estimatedTimeHours":3,"potentialParts":["噴頭","墨水管線","廢墨棉"]},{"id":"issue_cartridge_no_power","name":"無法開機(不過電)","description":"無法開機且無燈號","estimatedCostMin":1500,"estimatedCostMax":3500,"estimatedTimeHours":2,"potentialParts":["電源板","主機板","變壓器"]},{"id":"issue_cartridge_paper_feed","name":"無法進紙","description":"無法進紙 / 多張進紙","estimatedCostMin":1200,"estimatedCostMax":3500,"estimatedTimeHours":2,"potentialParts":["取紙輪","進紙組","分頁器","異物","雙面列印器","齒輪組","電磁閥"]},{"id":"issue_cartridge_complex","name":"疑難雜症","description":"疑難雜症處理","estimatedCostMin":800,"estimatedCostMax":5000,"estimatedTimeHours":2,"potentialParts":["取紙輪","分頁器","進紙組","電磁閥","齒輪組","紙匣","墨水","掃描平台","ADF","主機板","電源板","外殼","雙面列印器","感應器","集墨棉","歸零程式","套件組","噴頭","晶片","機芯"]}]}]},{"id":"nas","name":"NAS 儲存裝置","iconName":"HardDrive","models":[{"id":"4bay-nas","name":"1/2/4/8/16-Bay & 機架式 企業級NAS","issues":[{"id":"issue_009","name":"硬碟燈號異常 (Degraded)","description":"RAID 降級或硬碟損壞","estimatedCostMin":3000,"estimatedCostMax":12000,"estimatedTimeHours":5,"potentialParts":["NAS 專用硬碟","SATA 背板"]},{"id":"issue_010","name":"無法連線 (Network Error)","description":"網路晶片故障或系統崩潰","estimatedCostMin":2000,"estimatedCostMax":5000,"estimatedTimeHours":3,"potentialParts":["主機板","網路卡"]}]}]},{"id":"motherboard","name":"精密主機板","iconName":"Cpu","models":[{"id":"industrial-mb","name":"工控主機板","issues":[{"id":"issue_011","name":"電容爆漿 / 漏液","description":"長時間高溫運作導致元件老化","estimatedCostMin":1500,"estimatedCostMax":4500,"estimatedTimeHours":4,"potentialParts":["固態電容","MOSFET","穩壓晶片"]},{"id":"issue_012","name":"BIOS 資料遺失","description":"韌體損壞無法開機","estimatedCostMin":800,"estimatedCostMax":1500,"estimatedTimeHours":1,"potentialParts":["BIOS 晶片","CMOS 電池"]}]}]},{"id":"surveillance","name":"監控及弱電","iconName":"Video","models":[{"id":"sv-host-camera","name":"維修主機及鏡頭","issues":[{"id":"issue_sv_001","name":"各廠牌主機及鏡頭","description":"維修更換","estimatedCostMin":1500,"estimatedCostMax":6000,"estimatedTimeHours":2,"potentialParts":["需更換主機","需更換鏡頭"]}]},{"id":"sv-network-equipment","name":"維修網路設備","issues":[{"id":"issue_sv_002","name":"各廠牌網路設備","description":"維修更換","estimatedCostMin":800,"estimatedCostMax":3500,"estimatedTimeHours":1.5,"potentialParts":["需更換網路線","需更換接頭","需更換分享器","需更換集線器","需更換AP","需更換路由器","需更換天線","需更換防火牆","需更換小烏龜","需更換NAS","需更換設定","需更換零件"]}]},{"id":"sv-cable-repair","name":"網路線路維修","issues":[{"id":"issue_sv_003","name":"各廠牌網路線路維修","description":"維修更換","estimatedCostMin":1200,"estimatedCostMax":4000,"estimatedTimeHours":2,"potentialParts":["需更換網路線","需更換接頭","需更換分享器","需更換集線器","需更換AP","需更換路由器","需更換天線","需更換防火牆","需更換小烏龜","需更換NAS","需更換設定","需更換零件"]}]},{"id":"sv-cable-reorg","name":"網路線路重整","issues":[{"id":"issue_sv_004","name":"網路線路重整","description":"維修更換","estimatedCostMin":2500,"estimatedCostMax":8000,"estimatedTimeHours":4,"potentialParts":["需更換網路線","需更換接頭","需更換分享器","需更換集線器","需更換AP","需更換路由器","需更換天線","需更換防火牆","需更換小烏龜","需更換NAS","需更換設定","需更換零件"]}]},{"id":"sv-pbx-repair","name":"電話總機及線路維修","issues":[{"id":"issue_sv_005","name":"電話總機及線路維修","description":"維修更換","estimatedCostMin":1500,"estimatedCostMax":5000,"estimatedTimeHours":2.5,"potentialParts":["需更換網路線","需更換接頭","需更換集線器","需更換路由器","需更換天線","需更換設定","需更換零件"]}]},{"id":"sv-network-wiring","name":"網路及RJ配線","issues":[{"id":"issue_sv_006","name":"網路及RJ配線","description":"維修更換","estimatedCostMin":2000,"estimatedCostMax":6000,"estimatedTimeHours":3,"potentialParts":["需增加網路線","需增加電話線","需更換網路線","需更換接頭","需更換集線盒","需更換總機","需更換天線","需更換設定","需更換零件"]}]}]},{"id":"3c-install","name":"3C設備安裝","iconName":"Wrench","models":[{"id":"print-server","name":"列印伺服器","issues":[{"id":"issue_install_print_server","name":"一般安裝","description":"遠端安裝或到府安裝","estimatedCostMin":800,"estimatedCostMax":1500,"estimatedTimeHours":1,"potentialParts":["設定費"]}]},{"id":"other-device-install","name":"其他設備","issues":[{"id":"issue_install_other","name":"一般安裝","description":"遠端安裝或到府安裝","estimatedCostMin":800,"estimatedCostMax":2000,"estimatedTimeHours":1,"potentialParts":["設定費"]}]}]},{"id":"new-used-equipment","name":"全新/二手設備交機","iconName":"Package","models":[{"id":"new-handover-model","name":"全新設備交機","issues":[{"id":"issue_new_handover_base","name":"全新交機服務","description":"基本交機檢測與設定","estimatedCostMin":0,"estimatedCostMax":0,"estimatedTimeHours":1,"potentialParts":[]}]},{"id":"used-handover-model","name":"二手設備交機","issues":[{"id":"issue_used_handover_base","name":"二手交機服務","description":"基本交機檢測與設定","estimatedCostMin":0,"estimatedCostMax":0,"estimatedTimeHours":1,"potentialParts":[]}]}]}]'::jsonb from public.yj_organizations on conflict(org_id) do nothing;
