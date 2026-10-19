import {randomBytes,createHash} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {CONFIG} from '../supabase/fixtures/inspection-prices.js';
const token=randomBytes(32).toString('hex'),nonce=randomBytes(8).toString('hex'),email=`yj-repair-qa-${nonce}@example.com`;
await writeFile(new URL('../.repair-test.local',import.meta.url),JSON.stringify({token,nonce,email,users:[]}),{mode:0o600});
const literal=s=>"'"+s.replaceAll("'","''")+"'";
const sql=`with org as (insert into public.yj_organizations(name,pricebook) values(${literal('QA REPAIR TEMP '+nonce)},${literal(JSON.stringify(CONFIG))}::jsonb) returning id), member as (insert into public.yj_memberships(org_id,email,display_name,role) select id,${literal(email)},'QA REPAIR manager','MANAGER' from org), price as (insert into yj_private.repair_pricebook(org_id,catalogue) select org.id,b.catalogue from org cross join (select catalogue from yj_private.repair_pricebook limit 1) b), challenge as (insert into yj_private.bootstrap_challenges(token_hash,org_id,email,expires_at) select ${literal(createHash('sha256').update(token).digest('hex'))},id,${literal(email)},now()+interval '30 minutes' from org) select id from org;`;
await writeFile(new URL('../.repair-qa-setup.local',import.meta.url),sql);
console.log('QA challenge prepared (token not displayed).');
