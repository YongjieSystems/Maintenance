create policy repair_pricebook_rpc_only on yj_private.repair_pricebook for all to authenticated using(false) with check(false);
create policy repair_pricebook_history_rpc_only on yj_private.repair_pricebook_versions for all to authenticated using(false) with check(false);
