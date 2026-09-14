export const activeWorkspace=()=>typeof sessionStorage==='undefined'?'main':sessionStorage.getItem('augenblick-workspace')||'main';
export async function request(path,options={}) {
 const headers={'X-Augenblick':'1','X-Workspace':activeWorkspace(),...options.headers};if(options.body&&typeof options.body==='string')headers['Content-Type']='application/json';
 const r=await fetch('/api'+path,{...options,headers,credentials:'same-origin'});const b=await r.json();if(!r.ok)throw Object.assign(new Error(b.error||'Anfrage fehlgeschlagen'),{status:r.status});return b;
}
export const post=(path,data)=>request(path,{method:'POST',body:JSON.stringify(data)});
let opened;
async function db(){if(!opened)opened=new Promise((res,rej)=>{const r=indexedDB.open('augenblick-offline',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});return opened;}
export async function cached(key,value){const scope=activeWorkspace();if(scope!=='main')key='workspace:'+scope+':'+key;const d=await db();return new Promise((res,rej)=>{const t=d.transaction('data',value===undefined?'readonly':'readwrite'),s=t.objectStore('data'),r=value===undefined?s.get(key):s.put(value,key);r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
export async function clearCache(){const d=await db();return new Promise((res,rej)=>{const t=d.transaction('data','readwrite');t.objectStore('data').clear();t.oncomplete=res;t.onerror=()=>rej(t.error);});}
export const date=s=>s?new Date(s).toLocaleDateString('de-DE'):'—';
export const today=()=>new Date().toISOString().slice(0,10);
export function nextDate(months=12){const d=new Date();d.setMonth(d.getMonth()+months);return d.toISOString().slice(0,10);}
export function latest(assetId,records,type){return records.filter(r=>r.kind==='inspections'&&r.completion!=='open'&&r.assetId===assetId&&(!type||(r.type||'annual')===type)).sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0];}
export function currentInspections(asset,records){return (asset.fsa?['annual','monthly']:['annual']).map(t=>latest(asset.id,records,t)).filter(Boolean);}
export function status(asset,records){const required=asset.fsa?['annual','monthly']:['annual'],checks=required.map(t=>latest(asset.id,records,t));if(checks.some(c=>c&&['Mit Mängeln','Schwerwiegende Mängel'].includes(c.result)))return 'Mängel';if(checks.some(c=>c?.result==='Nicht prüfbar'))return 'Nicht prüfbar';if(checks.some(c=>c?.nextDate<today()))return 'Überfällig';if(checks.some(c=>!c))return 'Nicht geprüft';if(checks.some(c=>c.nextDate<=nextDate(1)))return 'Bald fällig';return 'Geprüft';}
export function download(name,data,type='application/json'){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function csv(rows,columns){const cell=s=>'"'+String(s??'').replace(/^[=+@-]/,"'$&").replaceAll('"','""')+'"';return '\ufeff'+[columns,...rows.map(r=>columns.map(c=>r[c]||''))].map(row=>row.map(cell).join(';')).join('\r\n');}
export function parseCsv(text){const lines=[];let row=[],s='',q=false;const sep=text.split('\n')[0].includes(';')?';':',';for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(q&&text[i+1]==='"'){s+='"';i++;}else q=!q;}else if(c===sep&&!q){row.push(s);s='';}else if(c==='\n'&&!q){row.push(s.replace(/\r$/,''));lines.push(row);row=[];s='';}else s+=c;}if(s||row.length){row.push(s.replace(/\r$/,''));lines.push(row);}const heads=(lines.shift()||[]).map(x=>x.replace(/^\ufeff/,''));return lines.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(heads.map((h,i)=>[h,r[i]||''])));}
export async function inspectionPhoto(file){if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Bitte JPG, PNG oder WebP auswählen.');if(file.size>10485760)throw new Error('Maximal 10 MB pro Foto.');try{return await request('/files',{method:'POST',headers:{'Content-Type':file.type,'X-Filename':encodeURIComponent(file.name)},body:file});}catch(e){if(e.status)throw e;const id=crypto.randomUUID();await cached('photo:'+id,file);return {id,name:file.name,mime:file.type,pending:true};}}
export async function uploadPendingPhotos(record){for(let i=0;i<(record.photos||[]).length;i++){const p=record.photos[i];if(!p.pending)continue;let uploaded=await cached('uploaded-photo:'+p.id);if(!uploaded){const file=await cached('photo:'+p.id);if(!file)throw new Error('Offline-Foto fehlt auf diesem Gerät. Bitte erneut hinzufügen.');uploaded=await request('/files',{method:'POST',headers:{'Content-Type':p.mime,'X-Filename':encodeURIComponent(p.name)},body:file});await cached('uploaded-photo:'+p.id,uploaded);}record.photos[i]={...uploaded,localId:p.id};}return record;}
export async function clearUploadedPhotos(record){for(const p of record.photos||[])if(p.localId){await cached('photo:'+p.localId,null);await cached('uploaded-photo:'+p.localId,null);}}
export async function privateFile(url,{force=false}={}){
 if(!/^\/api\/files\/[\w-]+$/.test(url))throw new Error('Ungültiger Dateiverweis.');
 const user=await cached('user');if(!user)throw new Error('Bitte zuerst anmelden.');
 const key='file:'+user.id+':'+url.split('/').pop();
 try{const r=await fetch(url,{credentials:'same-origin',headers:{'X-Workspace':activeWorkspace()}});if(!r.ok)throw Object.assign(new Error('Datei nicht verfügbar ('+r.status+').'),{status:r.status});const blob=await r.blob();await cached(key,blob);return blob;}
 catch(e){if(force||e.status)throw e;const blob=await cached(key);if(blob)return blob;throw new Error('Diese Datei wurde noch nicht für offline gespeichert.');}
}
export function buildingAttachments(buildingId,records){
 const assets=new Set(records.filter(r=>r.kind==='assets'&&r.buildingId===buildingId).map(r=>r.id));const files=new Map();
 function scan(value){if(!value||typeof value!=='object')return;if(value.id&&value.url==='/api/files/'+value.id)files.set(value.id,value);for(const child of Object.values(value))if(child&&typeof child==='object')scan(child);}
 for(const r of records)if(r.buildingId===buildingId||assets.has(r.assetId)||r.kind==='settings'&&r.id==='company')scan(r);
 return [...files.values()];
}

export const fileLink=url=>url+(url.includes('?')?'&':'?')+'workspace='+encodeURIComponent(activeWorkspace());
