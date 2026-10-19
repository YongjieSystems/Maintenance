import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import Babel from '@babel/standalone';
import * as core from './repair-core.js';
import {createHash} from 'node:crypto';

// Component integration tests use an isolated mock browser and synthetic quotations.
// No real credentials, browser storage, production records or authenticated sessions are read.
const html=fs.readFileSync(new URL('./index.html',import.meta.url),'utf8');
const jsx=html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/)[1];
const compiled=Babel.transform(jsx+'\n globalThis.AppUnderTest=App; globalThis.catalogue=INITIAL_DATA;', {presets:['react'],plugins:['transform-modules-commonjs']}).code;
test('all original preset prices, service options and hourly rate stay unchanged',()=>{
 const block=html.match(/\/\/ --- BEGIN_INJECTED_DATA ---([\s\S]*?)\/\/ --- END_INJECTED_DATA ---/)[1].replaceAll('\r\n','\n');
 assert.equal(createHash('sha256').update(block).digest('hex'),'e4abd90035c67f916097d556bd5cbef346dfc536206a3a8c800ac2b4d98061d0');
 assert.match(html,/const LABOR_RATE = 350;/);
});
function harness(seed={}) {
 const hooks=[], store=new Map(Object.entries(seed)), alerts=[], effects=[], clipboard=[], downloads=[];
 let cursor=0, tree, printed=0, failWrite=false;const elements=new Map();
 const React={
   createElement:(type,props,...children)=>({type,props:{...props,children:children.flat(Infinity)}}),
   useState(initial){const i=cursor++;if(!(i in hooks))hooks[i]=i===0?true:typeof initial==='function'?initial():initial;return [hooks[i],value=>{hooks[i]=typeof value==='function'?value(hooks[i]):value}];},
   useRef(initial){const i=cursor++;return hooks[i]??=( {current:initial} );},
   useMemo(fn){cursor++;return fn();},
   useEffect(fn,deps){const i=cursor++;if(!hooks[i]||deps?.some((d,n)=>d!==hooks[i][n])){hooks[i]=deps;effects.push(fn);}},
 };
 const context={console,crypto:globalThis.crypto,Intl,Date,Math,Number,JSON,Array,Set,Object,Blob,
   alert:m=>alerts.push(m),confirm:()=>true,
   localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>{if(failWrite)throw Error('quota');store.set(k,v)},removeItem:k=>store.delete(k)},
   navigator:{clipboard:{writeText:async text=>{clipboard.push(text)}}},
   window:{print:()=>printed++},
   URL:{createObjectURL:blob=>{downloads.push(blob);return 'blob:test'},revokeObjectURL:()=>{}},
   document:{getElementById:id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id)},createElement:()=>({click(){}})},
   exports:{},require:name=>name==='react'?React:name==='react-dom/client'?{createRoot:()=>({render(){}})}:name.startsWith('./repair-core.js')?core:name.startsWith('./repair-team.js')?{initRepairTeam(){},resetRepairLink(){},openRepairTeam(){}}:new Proxy({},{get:(_,key)=>String(key)})};
 vm.runInNewContext(compiled,context);
 const render=()=>{cursor=0;tree=context.AppUnderTest();while(effects.length)effects.shift()();cursor=0;tree=context.AppUnderTest();return tree;};
 const walk=node=>node&&typeof node==='object'?[node,...(node.props?.children||[]).flatMap(walk)]:[];
 const nodes=()=>walk(tree);
 const text=node=>!node?'':typeof node==='string'||typeof node==='number'?String(node):(node.props?.children||[]).map(text).join('');
 const find=label=>{const node=nodes().find(n=>n.props?.onClick&&text(n).includes(label));assert.ok(node,`control ${label}`);return node;};
 const click=label=>{find(label).props.onClick();return render();};
 const input=(field,value)=>{const node=nodes().find(n=>n.props?.onChange?.toString().includes(field));assert.ok(node,`input ${field}`);node.props.onChange({target:{value}});render();};
 const history=()=>JSON.parse(store.get('yjst_repair_history_v1')||'[]');
 const select=()=>{click('桌上型電腦');click('一般組裝電腦');click('無法開機 (No Power)');};
 render();return {render,nodes,text,find,click,input,history,select,alerts,clipboard,downloads,store,context,get printText(){return elements.get('customer-print-text')?.textContent},get printed(){return printed},set failWrite(v){failWrite=v}};
}
test('quote UI → validation → save → dedupe → revision → load → new case',()=>{
 const h=harness();h.select();assert.match(h.text(h.render()),/800/);
 h.input('manualTotalMin','100');assert.equal(h.find('儲存報價').props.disabled,true);
 h.input('adjustmentReason','測試專案');h.input('customerName','測試客戶');h.click('儲存報價');h.click('儲存報價');
 assert.equal(h.history().length,1);assert.equal(h.history()[0].revision,1);
 const first=h.history()[0];assert.equal(first.totalMin,100);assert.equal(first.calculatedMin+first.adjustmentMin,100);assert.equal(first.calculatedMax+first.adjustmentMax,100);
 h.input('manualTotalMin','200');h.click('儲存報價');assert.equal(h.history().length,2);assert.equal(h.history()[0].revision,2);
 // Invoke the history modal's public load callback with the original saved snapshot.
 h.click('估價紀錄');const modal=h.nodes().find(n=>n.props?.onLoad);modal.props.onLoad(first);h.render();
 assert.equal(h.nodes().find(n=>n.props?.onChange?.toString().includes('customerName')).props.value,'測試客戶');
 h.click('儲存報價');assert.equal(h.history()[0].revision,3);
 h.click('＋ 新案件');assert.equal(h.nodes().some(n=>n.props?.value==='測試客戶'),false);assert.equal(h.history().length,3);
});
test('copy, Excel and print share customer totals without internal adjustments',async()=>{
 const h=harness();h.select();h.input('manualTotalMin','100');h.input('adjustmentReason','測試議價');
 h.click('複製摘要');await Promise.resolve();h.render();assert.match(h.clipboard[0],/維修整包費用：\$100/);assert.doesNotMatch(h.clipboard[0],/價差|測試議價|報價人員|共用案件/);assert.match(h.clipboard[0],/草稿/);
 const sheets=[];h.context.XLSX={utils:{book_new:()=>({}),aoa_to_sheet:rows=>{sheets.push(rows);return {}},book_append_sheet(){}},writeFile(){}};
 h.click('Excel');const rows=sheets[0];assert.ok(rows.some(row=>row[0]==='維修整包費用：$100'));assert.ok(!JSON.stringify(rows).includes('測試議價'));assert.equal(h.history().length,1);
 h.click('儲存並列印');assert.equal(h.printed,1);assert.equal(h.printText,h.clipboard[0]);assert.equal(h.history().length,1);
 h.input('shippingCost',-1);assert.equal(h.find('儲存並列印').props.disabled,true);
});
test('storage failure is visible and prevents print',()=>{
 const h=harness();h.select();h.failWrite=true;h.click('儲存並列印');assert.equal(h.printed,0);assert.match(h.text(h.render()),/本機儲存失敗/);assert.equal(h.history().length,0);
});
test('backup and restore merge without overwriting current records',async()=>{
 const h=harness();h.select();h.click('儲存報價');h.click('案件備份');
 const content=await h.downloads[0].text(), parsed=JSON.parse(content);assert.equal(parsed.format,'yjst-maintenance-backup');assert.equal(parsed.history.length,1);assert.ok(parsed.data.length);
 h.click('＋ 新案件');h.select();h.click('儲存報價');
 const fileInput=h.nodes().find(n=>n.props?.type==='file');
 await fileInput.props.onChange({target:{files:[{size:content.length,text:async()=>content}],value:'backup.json'}});h.render();assert.equal(h.history().length,2);
 await fileInput.props.onChange({target:{files:[{size:5,text:async()=>'{bad'}],value:'bad.json'}});assert.equal(h.history().length,2);assert.match(h.alerts.at(-1),/無法還原/);
});
test('handover retains its existing base fee and 4–6 device surcharge',()=>{
 const h=harness();h.click('全新/二手設備交機');const cat=h.context.catalogue.find(c=>c.id==='new-used-equipment');h.click(cat.models[0].name);h.render();
 const base=h.nodes().find(n=>n.props?.onChange?.toString().includes('finalEstimatedTime'));assert.ok(base);
 h.click('儲存報價');const initial=h.history()[0];
 const driver=h.nodes().find(n=>n.props?.onChange?.toString().includes('pcDriver'));assert.ok(driver);driver.props.onChange({target:{checked:true}});h.render();
 const count=h.nodes().find(n=>n.props?.onChange?.toString().includes('pcCountType'));assert.ok(count);count.props.onChange({target:{value:'4-6'}});h.render();h.click('儲存報價');assert.equal(h.history()[0].totalMin,initial.totalMin+500);
});
test('more than 50 quotation versions remain available',()=>{
 const h=harness();h.select();h.input('adjustmentReason','測試議價');
 for(let n=1;n<=51;n++){h.input('manualTotalMin',String(n));h.click('儲存報價');}
 assert.equal(h.history().length,51);assert.equal(h.history()[0].revision,51);
});
test('a stale tab cannot overwrite another saved revision',()=>{
 const h=harness();h.select();h.click('儲存報價');h.input('manualTotalMin','100');h.input('adjustmentReason','測試議價');
 const original=h.history()[0], remote={...original,revision:2,fingerprint:'other-tab',totalText:'$300'};
 h.store.set('yjst_repair_history_v1',JSON.stringify([remote,original]));
 h.click('儲存報價');assert.equal(h.history()[0].totalText,'$300');assert.match(h.text(h.render()),/其他分頁已更新/);
 h.click('儲存報價');assert.equal(h.history()[0].revision,3);assert.equal(h.history()[1].fingerprint,'other-tab');
});
