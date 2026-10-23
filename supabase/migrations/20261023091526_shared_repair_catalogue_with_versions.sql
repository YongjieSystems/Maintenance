-- Shared repair catalogue: existing prices remain unchanged. Only managers maintain it.
begin;
alter table yj_private.repair_pricebook add column revision integer not null default 1,add column updated_at timestamptz not null default now(),add column updated_by uuid references auth.users(id);
alter table yj_private.repair_pricebook enable row level security;
create table yj_private.repair_pricebook_versions(org_id uuid not null references public.yj_organizations(id),revision integer not null,catalogue jsonb not null,created_at timestamptz not null default now(),created_by uuid references auth.users(id),primary key(org_id,revision));
alter table yj_private.repair_pricebook_versions enable row level security;
revoke all on yj_private.repair_pricebook_versions from public,anon,authenticated;
insert into yj_private.repair_pricebook_versions(org_id,revision,catalogue) select org_id,revision,catalogue from yj_private.repair_pricebook;
create function yj_private.validate_repair_catalogue(p_data jsonb) returns void language plpgsql set search_path='' as $$
declare c jsonb;m jsonb;i jsonb;items jsonb;v jsonb;seen text[]:='{}';names text[];k text;n numeric;
begin
 if jsonb_typeof(p_data) is distinct from 'array' or jsonb_array_length(p_data) not between 1 and 200 or octet_length(p_data::text)>2000000 then raise exception '價目表格式或大小不正確';end if;
 names:='{}';for c in select value from jsonb_array_elements(p_data) loop
 if jsonb_typeof(c) is distinct from 'object' or length(trim(coalesce(c->>'name',''))) not between 1 and 150 or lower(trim(c->>'name'))=any(names) then raise exception '類別名稱空白、過長或重複';end if;names:=array_append(names,lower(trim(c->>'name')));
 if jsonb_typeof(c->'models') is distinct from 'array' or jsonb_array_length(c->'models')>500 then raise exception '型號格式不正確';end if;
 end loop;
 for items in select p_data union all select c.value->'models' from jsonb_array_elements(p_data)c union all select m.value->'issues' from jsonb_array_elements(p_data)c cross join lateral jsonb_array_elements(c.value->'models')m loop
 names:='{}';for v in select value from jsonb_array_elements(items) loop
 if length(coalesce(v->>'id','')) not between 1 and 100 or (v->>'id')=any(seen) then raise exception '項目代碼遺失或重複';end if;seen:=array_append(seen,v->>'id');
 if length(trim(coalesce(v->>'name',''))) not between 1 and 150 or lower(trim(v->>'name'))=any(names) then raise exception '名稱不可空白、過長或與同層重複';end if;names:=array_append(names,lower(trim(v->>'name')));
 end loop;end loop;
 for c in select value from jsonb_array_elements(p_data) loop
 for m in select value from jsonb_array_elements(c->'models') loop
 if jsonb_typeof(m->'issues') is distinct from 'array' or jsonb_array_length(m->'issues')>500 then raise exception '故障格式不正確';end if;
 for i in select value from jsonb_array_elements(m->'issues') loop
 foreach k in array array['estimatedCostMin','estimatedCostMax','estimatedTimeHours'] loop
 if jsonb_typeof(i->k) is distinct from 'number' then raise exception '價格及工時必須是數字';end if;n:=(i->>k)::numeric;
 if n<0 or n>100000000 or (k<>'estimatedTimeHours' and n<>round(n,2)) then raise exception '價格及工時超出範圍';end if;
 end loop;
 if (i->>'estimatedCostMax')::numeric<(i->>'estimatedCostMin')::numeric then raise exception '最高價不可低於最低價';end if;
 if jsonb_typeof(i->'description') is distinct from 'string' or length(i->>'description')>2000 or jsonb_typeof(i->'potentialParts') is distinct from 'array' or jsonb_array_length(i->'potentialParts')>50 then raise exception '描述或零件格式不正確';end if;
 for v in select value from jsonb_array_elements(i->'potentialParts') loop if jsonb_typeof(v) is distinct from 'string' or length(trim(v#>>'{}')) not between 1 and 150 then raise exception '零件名稱無效';end if;end loop;
 end loop;end loop;end loop;
end;$$;
create function yj_private.get_repair_catalogue(p_org uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare b yj_private.repair_pricebook;begin perform yj_private.require_role(p_org,array['MANAGER','STAFF']);select * into b from yj_private.repair_pricebook where org_id=p_org;if not found then raise exception '團隊尚未設定維修價目表';end if;return jsonb_build_object('catalogue',b.catalogue,'revision',b.revision,'updatedAt',b.updated_at);end;$$;
create function yj_private.save_repair_catalogue(p_org uuid,p_expected integer,p_catalogue jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare b yj_private.repair_pricebook;v_id text;begin
 perform 1 from public.yj_organizations where id=p_org for update;perform yj_private.require_role(p_org,array['MANAGER']);
 select * into b from yj_private.repair_pricebook where org_id=p_org for update;
 if b.org_id is null then raise exception '團隊尚未設定維修價目表';end if;
 if p_expected is distinct from b.revision then raise exception '價目表已更新，請重新整理後再修改；本次未覆蓋同事資料' using errcode='PT409';end if;
 perform yj_private.validate_repair_catalogue(p_catalogue);
 -- Existing handover calculations use these stable identifiers. They may be renamed but not removed or moved.
 foreach v_id in array array['new-used-equipment','new-handover-model','used-handover-model','issue_new_handover_base','issue_used_handover_base'] loop
 if jsonb_path_exists(b.catalogue,'$.**.id ? (@ == $key)',jsonb_build_object('key',v_id)) and not jsonb_path_exists(p_catalogue,'$.**.id ? (@ == $key)',jsonb_build_object('key',v_id)) then raise exception '交機內建項目須保留，請修改名稱或價格，不可移除';end if;end loop;
 if exists(select 1 from jsonb_array_elements(b.catalogue)c where c->>'id'='new-used-equipment') and not exists(select 1 from jsonb_array_elements(p_catalogue)c where c->>'id'='new-used-equipment' and exists(select 1 from jsonb_array_elements(c->'models')m where m->>'id'='new-handover-model' and exists(select 1 from jsonb_array_elements(m->'issues')i where i->>'id'='issue_new_handover_base')) and exists(select 1 from jsonb_array_elements(c->'models')m where m->>'id'='used-handover-model' and exists(select 1 from jsonb_array_elements(m->'issues')i where i->>'id'='issue_used_handover_base'))) then raise exception '交機內建項目的類別、型號與故障關係必須保留';end if;
 if p_catalogue=b.catalogue then return yj_private.get_repair_catalogue(p_org);end if;
 update yj_private.repair_pricebook set catalogue=p_catalogue,revision=revision+1,updated_at=now(),updated_by=auth.uid() where org_id=p_org returning * into b;
 insert into yj_private.repair_pricebook_versions(org_id,revision,catalogue,created_by) values(p_org,b.revision,b.catalogue,auth.uid());
 perform yj_private.audit(p_org,'REPAIR_CATALOGUE_SAVED',p_org,jsonb_build_object('revision',b.revision));return yj_private.get_repair_catalogue(p_org);
end;$$;
create function public.yj_get_repair_catalogue(p_org uuid) returns jsonb language sql security invoker set search_path='' as $$select yj_private.get_repair_catalogue(p_org)$$;
create function public.yj_save_repair_catalogue(p_org uuid,p_expected integer,p_catalogue jsonb) returns jsonb language sql security invoker set search_path='' as $$select yj_private.save_repair_catalogue(p_org,p_expected,p_catalogue)$$;
revoke all on function yj_private.validate_repair_catalogue(jsonb),yj_private.get_repair_catalogue(uuid),yj_private.save_repair_catalogue(uuid,integer,jsonb),public.yj_get_repair_catalogue(uuid),public.yj_save_repair_catalogue(uuid,integer,jsonb) from public,anon;
grant execute on function yj_private.get_repair_catalogue(uuid),yj_private.save_repair_catalogue(uuid,integer,jsonb),public.yj_get_repair_catalogue(uuid),public.yj_save_repair_catalogue(uuid,integer,jsonb) to authenticated;
-- Refuse stale quote calculation instead of silently using a different catalogue.
do $migration$
declare src text;begin
 src:=pg_get_functiondef('yj_private.save_repair(uuid,uuid,integer,integer,jsonb,numeric,text,text)'::regprocedure);
 src:=replace(src,'if p_credit is distinct from 0 then',E'if ((select revision from yj_private.repair_pricebook where org_id=p_org)>1 or p_draft ? ''pricebookRevision'') and (p_draft->>''pricebookRevision'') is distinct from (select revision::text from yj_private.repair_pricebook where org_id=p_org) then raise exception ''公司價目已更新，請更新價目並重新選擇故障後再保存；原報價未更動'' using errcode=''PT409''; end if;\n if p_credit is distinct from 0 then');
 src:=replace(src,'''handoverState'',h);','''handoverState'',h,''pricebookRevision'',(select revision from yj_private.repair_pricebook where org_id=p_org));');
 execute src;
end;$migration$;
notify pgrst,'reload schema';
commit;
