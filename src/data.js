export async function request(path,options={}) {
 const headers={'X-Augenblick':'1',...options.headers};if(options.body&&typeof options.body==='string')headers['Content-Type']='application/json';
 const r=await fetch('/api'+path,{...options,headers,credentials:'same-origin'});const b=await r.json();if(!r.ok)throw Object.assign(new Error(b.error||'Anfrage fehlgeschlagen'),{status:r.status});return b;
}
export const post=(path,data)=>request(path,{method:'POST',body:JSON.stringify(data)});
let opened;
async function db(){if(!opened)opened=new Promise((res,rej)=>{const r=indexedDB.open('augenblick-offline',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});return opened;}
export async function cached(key,value){const d=await db();return new Promise((res,rej)=>{const t=d.transaction('data',value===undefined?'readonly':'readwrite'),s=t.objectStore('data'),r=value===undefined?s.get(key):s.put(value,key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
export async function clearCache(){const d=await db();return new Promise((res,rej)=>{const t=d.transaction('data','readwrite');t.objectStore('data').clear();t.oncomplete=res;t.onerror=()=>rej(t.error);});}
export const date=s=>s?new Date(s).toLocaleDateString('de-DE'):'—';
export const today=()=>new Date().toISOString().slice(0,10);
export function nextDate(months=12){const d=new Date();d.setMonth(d.getMonth()+months);return d.toISOString().slice(0,10);}
export function latest(assetId,records,type){return records.filter(r=>r.kind==='inspections'&&r.assetId===assetId&&(!type||(r.type||'annual')===type)).sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0];}
export function currentInspections(asset,records){return (asset.fsa?['annual','monthly']:['annual']).map(t=>latest(asset.id,records,t)).filter(Boolean);}
export function status(asset,records){const required=asset.fsa?['annual','monthly']:['annual'],checks=required.map(t=>latest(asset.id,records,t));if(checks.some(c=>c&&['Mit Mängeln','Schwerwiegende Mängel'].includes(c.result)))return 'Mängel';if(checks.some(c=>c?.result==='Nicht prüfbar'))return 'Nicht prüfbar';if(checks.some(c=>c?.nextDate<today()))return 'Überfällig';if(checks.some(c=>!c))return 'Nicht geprüft';if(checks.some(c=>c.nextDate<=nextDate(1)))return 'Bald fällig';return 'Geprüft';}
export function download(name,data,type='application/json'){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function csv(rows,columns){const cell=s=>'"'+String(s??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';return '\ufeff'+[columns,...rows.map(r=>columns.map(c=>r[c]||''))].map(row=>row.map(cell).join(';')).join('\r\n');}
export function parseCsv(text){const lines=[];let row=[],s='',q=false;const sep=text.split('\n')[0].includes(';')?';':',';for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(q&&text[i+1]==='"'){s+='"';i++;}else q=!q;}else if(c===sep&&!q){row.push(s);s='';}else if(c==='\n'&&!q){row.push(s.replace(/\r$/,''));lines.push(row);row=[];s='';}else s+=c;}if(s||row.length){row.push(s.replace(/\r$/,''));lines.push(row);}const heads=(lines.shift()||[]).map(x=>x.replace(/^\ufeff/,''));return lines.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(heads.map((h,i)=>[h,r[i]||''])));}
