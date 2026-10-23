import {validateIssue} from './repair-core.js';
const clean=v=>String(v??'').trim();
export function validateCatalogue(data){
 if(!Array.isArray(data)||!data.length||data.length>200)throw Error('類別須有1至200項');
 const ids=new Set();
 const level=(items,max,label)=>{if(!Array.isArray(items)||items.length>max)throw Error(label+'數量或格式不正確');const names=new Set();for(const item of items){if(!item||!clean(item.id)||ids.has(item.id))throw Error('項目代碼重複或遺失');ids.add(item.id);const name=clean(item.name);if(!name||name.length>150||names.has(name.toLocaleLowerCase()))throw Error(label+'名稱不可空白、超過150字或與同層重複');names.add(name.toLocaleLowerCase());}};
 level(data,200,'類別');for(const cat of data){level(cat.models,500,'型號');for(const model of cat.models){level(model.issues,500,'故障');for(const issue of model.issues){if(!validateIssue(issue)||[issue.estimatedCostMin,issue.estimatedCostMax,issue.estimatedTimeHours].some(v=>v===''||v===null||v===undefined))throw Error('價格與工時須為非負數字，最高價不可小於最低價');if(typeof issue.description!=='string'||issue.description.length>2000||!Array.isArray(issue.potentialParts)||issue.potentialParts.length>50||issue.potentialParts.some(v=>typeof v!=='string'||!v.trim()||v.length>150))throw Error('故障描述或零件格式不正確');}}}
 return data;
}
export function changeCatalogue(data,{action,type,id,parentId,values}){
 const copy=structuredClone(data),cat=type==='category'?null:copy.find(c=>type==='model'?c.id===parentId:c.models.some(m=>m.id===parentId)),model=type==='issue'?cat?.models.find(m=>m.id===parentId):null;
 const items=type==='category'?copy:type==='model'?cat?.models:model?.issues;
 if(!items)throw Error('上層類別或型號不存在，請重新選擇');
 const index=items.findIndex(item=>item.id===id);
 if(action!=='add'&&index<0)throw Error('項目已不存在，請更新價目');
 if(action==='delete')items.splice(index,1);
 else{const allowed=type==='issue'?['name','description','estimatedCostMin','estimatedCostMax','estimatedTimeHours','potentialParts']:type==='category'?['name','iconName']:['name'];const value=Object.fromEntries(allowed.filter(k=>Object.hasOwn(values,k)).map(k=>[k,values[k]]));value.name=clean(value.name);if(type==='issue'){value.description=clean(value.description);value.potentialParts=[...new Set((value.potentialParts||[]).map(clean).filter(Boolean))];}
 if(action==='add')items.push({...value,id,...(type==='category'?{models:[]}:type==='model'?{issues:[]}:{})});else items[index]={...items[index],...value};}
 return validateCatalogue(copy);
}
