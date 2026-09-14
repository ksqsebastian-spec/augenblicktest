import {mailReady,sendMail} from './email.js';
import {visibleRecords,mayWrite} from './access.js';
const encoder = new TextEncoder();
const kinds = new Set(['objects','buildings','assets','inspections','tasks','contractors','plans','templates','settings','reports','labels','customProtocols','uuidCodes']);
const adminKinds = new Set(['templates','settings','contractors','labels','customProtocols']);
const roles = new Set(['admin','lead','inspector']);
const categories = new Set(['FLS','BST','BSK','BSB','RWM','CPR']);
export const uid = () => crypto.randomUUID();
const hex = a => Array.from(new Uint8Array(a), b => b.toString(16).padStart(2,'0')).join('');
const hash = async s => hex(await crypto.subtle.digest('SHA-256',encoder.encode(s)));
export async function passwordHash(password,salt) {
  const key = await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:100000,hash:'SHA-256'},key,256));
}
const equal = (a,b) => { if(typeof a !== 'string'||typeof b !== 'string'||a.length!==b.length)return false; let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0; };
const fail = (status,message) => { throw Object.assign(new Error(message),{status}); };
const json = (data,status=200,headers={}) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const pub = u => ({id:u.id,email:u.email,name:u.name,role:u.role,active:u.active,created:u.created,...(u.access?{access:u.access}:{})});
const stmt = (db,sql,...args) => db.prepare(sql).bind(...args);
const first = (db,sql,...args) => stmt(db,sql,...args).first();
const run = (db,sql,...args) => stmt(db,sql,...args).run();
const audit = (db,u,action,id) => stmt(db,'INSERT INTO audit VALUES (?,?,?,?,?)',uid(),u.name,action,id,new Date().toISOString());
function credentials(b) {
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email||'')||String(b.email).length>254)fail(400,'Gültige E-Mail-Adresse erforderlich.');
  if(typeof b.password!=='string'||b.password.length<12||b.password.length>256)fail(400,'Passwort muss 12 bis 256 Zeichen enthalten.');
  if(typeof b.name!=='string'||!b.name.trim()||b.name.length>150)fail(400,'Name erforderlich.');
}
async function body(req) {
  if(!req.headers.get('Content-Type')?.includes('application/json'))fail(415,'JSON erwartet.');
  const t=await req.text(); if(t.length>500000)fail(413,'Datensatz zu groß.');
  try {const b=JSON.parse(t);if(!b||Array.isArray(b)||typeof b!=='object')fail(400,'Ungültige Daten.');return b;}catch{fail(400,'Ungültiges JSON.');}
}
async function throttle(db,key) {
  const now=Date.now(),k=await hash(key);
  await run(db,'INSERT INTO attempts VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END, expires=CASE WHEN expires<? THEN ? ELSE expires END',k,now+600000,now,now,now+600000);
  if((await first(db,'SELECT count FROM attempts WHERE key=?',k)).count>15)fail(429,'Zu viele Versuche. Bitte in zehn Minuten erneut versuchen.');
}
async function loginResponse(req,db,u) {
  const g=await first(db,'SELECT data FROM external_access WHERE user_id=?',u.id);if(g){u.access=JSON.parse(g.data);if(u.access.revoked||u.access.expires<Date.now())fail(403,'Externer Zugang abgelaufen oder widerrufen.');}
  const token=uid()+uid(),expires=Date.now()+86400000;
  await run(db,'INSERT INTO sessions VALUES (?,?,?)',await hash(token),u.id,expires);
  const secure=new URL(req.url).protocol==='https:'?'; Secure':'';
  return json({user:pub(u)},200,{'Set-Cookie':`augenblick_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${secure}`});
}
async function allRecords(db){return (await db.prepare('SELECT * FROM records ORDER BY created').all()).results.map(r=>({...JSON.parse(r.data),id:r.id,kind:r.kind,version:r.version,created:r.created,updated:r.updated}));}
async function record(db,id,kind) {
  const r=await first(db,'SELECT * FROM records WHERE id=?',id);
  if(!r||kind&&r.kind!==kind||JSON.parse(r.data).trashId)fail(400,'Verknüpfter Datensatz fehlt.');
  return {...JSON.parse(r.data),id:r.id,version:r.version,kind:r.kind};
}
async function validate(db,kind,b,u,old) {
  if(adminKinds.has(kind)&&u.role!=='admin')fail(403,'Nur Administratoren dürfen diese Daten ändern.');
  if(b.archived!==undefined&&typeof b.archived!=='boolean')fail(400,'Ungültiger Archivstatus.');
  if(['objects','buildings','contractors','plans'].includes(kind)&&!String(b.name||'').trim())fail(400,'Name erforderlich.');
  if(kind==='buildings')await record(db,b.objectId,'objects');
  if(['assets','plans'].includes(kind))await record(db,b.buildingId,'buildings');
  if(kind==='assets') {
    if(!categories.has(b.category)||!String(b.code||'').trim()||!String(b.location||'').trim())fail(400,'Kategorie, Code und Standort sind erforderlich.');
    const duplicate=await first(db,"SELECT id FROM records WHERE kind='assets' AND json_extract(data,'$.code')=? AND id<>?",b.code,b.id);
    if(duplicate)fail(409,'Dieser Gerätecode ist bereits vergeben.');
  }
  if(kind==='inspections') {
    if(old?.trashId)fail(403,'Bitte den gelöschten übergeordneten Datensatz zuerst wiederherstellen.');
    if(old) {
      const o={...old},n={...b};for(const k of ['version','kind','archived']){delete o[k];delete n[k];}
      if(JSON.stringify(o)!==JSON.stringify(n))fail(403,'Abgeschlossene Prüfungen sind unveränderlich. Bitte eine neue Prüfung erstellen.');
      if(u.role!=='admin')fail(403,'Nur Administratoren können Prüfungen archivieren.');
      return;
    }
    const asset=await record(db,b.assetId,'assets');
    if(b.type==='monthly'&&!asset.fsa)fail(400,'Monatsprüfung setzt eine Feststellanlage voraus.');
    if(b.protocolId||asset.protocolId){const protocol=await record(db,b.protocolId||asset.protocolId,'customProtocols');const building=await record(db,asset.buildingId,'buildings');if(protocol.archived||(protocol.objectIds?.length&&!protocol.objectIds.includes(building.objectId)))fail(403,'Protokoll für dieses Objekt nicht freigegeben.');b.protocolSnapshot=protocol;}
    const company=await first(db,"SELECT data FROM records WHERE id='company' AND kind='settings'");b.companySnapshot=company?JSON.parse(company.data):null;
    if(!['Ohne Mängel','Mit Mängeln','Schwerwiegende Mängel','Nicht prüfbar'].includes(b.result))fail(400,'Gesamtbewertung erforderlich.');
    if(!Array.isArray(b.checks)||b.checks.length<1||b.checks.length>200)fail(400,'Prüfpunkte erforderlich.');
    if(b.result!=='Nicht prüfbar'&&b.checks.some(c=>!c.label||!['ok','fail','na'].includes(c.value)))fail(400,'Bitte alle Prüfpunkte bewerten.');
    if(b.result==='Ohne Mängel'&&(b.checks.some(c=>c.value==='fail')||(b.defects||[]).length))fail(400,'Mängel vorhanden: Gesamtbewertung prüfen.');
    if(b.result!=='Ohne Mängel'&&!String(b.notes||'').trim()&&!(b.defects||[]).some(d=>d.text?.trim()))fail(400,'Bitte Mangel oder Begründung dokumentieren.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(b.nextDate||''))fail(400,'Nächsten Prüftermin angeben.');
    const performed=Date.parse(b.date||'');
    if(!Number.isFinite(performed)||performed>Date.now()+300000) b.date=new Date().toISOString();
    b.recordedAt=new Date().toISOString();
    b.inspector=u.name;b.inspectorId=u.id;b.assetSnapshot=asset;
    const building=await record(db,asset.buildingId,'buildings');b.buildingId=building.id;b.objectId=building.objectId;
    b.buildingSnapshot=building;b.objectSnapshot=await record(db,building.objectId,'objects');
  }
  if(kind==='tasks') {
    if(!String(b.title||'').trim()||!b.dueDate)fail(400,'Titel und Fälligkeitsdatum erforderlich.');
    if(!['Offen','In Bearbeitung','Erledigt','Abgebrochen'].includes(b.status)||!['Niedrig','Mittel','Hoch'].includes(b.priority))fail(400,'Ungültiger Aufgabenstatus.');
    if(b.objectId)await record(db,b.objectId,'objects');
    if(b.assignee&&!await first(db,'SELECT id FROM users WHERE id=? AND active=1',b.assignee))fail(400,'Mitarbeiter nicht gefunden.');
  }
  if(kind==='labels'&&(!String(b.name||'').trim()||b.name.length>60||!/^#[a-f0-9]{6}$/i.test(b.color||'')))fail(400,'Label benötigt einen Namen (max. 60 Zeichen) und eine Farbe.');
  if(kind==='uuidCodes'&&(!categories.has(b.category)||!String(b.code||'').trim()))fail(400,'Kategorie und UUID erforderlich.');
  if(kind==='customProtocols'){
    if(!String(b.name||'').trim()||!Array.isArray(b.checks)||!b.checks.length||b.checks.length>200||b.checks.some(c=>typeof c!=='string'||!c.trim()||c.length>1000))fail(400,'Name und 1 bis 200 Prüfpunkte erforderlich.');
    if(![b.intervalOk,b.intervalDefect].every(n=>Number.isInteger(n)&&n>=1&&n<=120))fail(400,'Prüfintervall muss 1 bis 120 Monate betragen.');
    if(!Array.isArray(b.objectIds)||!Array.isArray(b.fields)||!Array.isArray(b.inspectionTypes)||!Array.isArray(b.maintenance))fail(400,'Protokollfelder ungültig.');
    for(const id of b.objectIds)await record(db,id,'objects');
    if(b.fields.some(f=>!f.key?.trim()||!f.label?.trim())||new Set(b.fields.map(f=>f.key)).size!==b.fields.length)fail(400,'Stammdatenfelder benötigen eindeutige Schlüssel und Bezeichnungen.');
  }
  if(kind==='settings'&&b.id==='reminders'){if(typeof b.enabled!=='boolean'||!Number.isInteger(b.days)||b.days<1||b.days>90||!Array.isArray(b.recipientIds)||b.recipientIds.length>50||b.enabled&&!b.recipientIds.length)fail(400,'Vorlauf (1 bis 90 Tage) und Empfänger erforderlich.');for(const id of b.recipientIds)if(!await first(db,'SELECT id FROM users WHERE id=? AND active=1',id))fail(400,'Empfänger nicht gefunden.');}
  if(kind==='settings'&&b.id.startsWith('sla-')&&(!['Hoch','Mittel','Niedrig'].includes(b.priority)||b.id!=='sla-'+b.priority||![b.reactionMinutes,b.resolutionMinutes].every(n=>Number.isInteger(n)&&n>0&&n<=525600)||typeof b.active!=='boolean'))fail(400,'SLA-Zeiten müssen zwischen 1 und 525600 Minuten liegen.');
  if(kind==='tasks'){
    const now=new Date().toISOString();b.escalatedAt=old?.escalatedAt||null;b.createdAt=old?.createdAt||old?.created||now;
    b.startedAt=old?.startedAt||(['In Bearbeitung','Erledigt'].includes(b.status)?now:null);
    b.completedAt=b.status==='Erledigt'?(old?.completedAt||now):null;
    if(!old||old.priority!==b.priority){const policy=await first(db,"SELECT data FROM records WHERE id=? AND kind='settings'",'sla-'+b.priority),p=policy?JSON.parse(policy.data):null;b.reactionDue=p?.active?new Date(Date.now()+p.reactionMinutes*60000).toISOString():null;b.resolutionDue=p?.active?new Date(Date.now()+p.resolutionMinutes*60000).toISOString():null;}else{b.reactionDue=old.reactionDue;b.resolutionDue=old.resolutionDue;}
    if(b.labels!==undefined){if(!Array.isArray(b.labels)||b.labels.length>50)fail(400,'Ungültige Labels.');for(const id of b.labels)await record(db,id,'labels');}
  }
  if(kind==='templates'&&(!Array.isArray(b.checks)||!b.checks.length||b.checks.length>200||b.checks.some(c=>typeof c!=='string'||!c.trim()||c.length>1000)))fail(400,'Vorlage benötigt 1 bis 200 Prüfpunkte.');
}
export async function api(req,env) {
  const db=env.DB,url=new URL(req.url),p=url.pathname,m=req.method;
  try {
    if(!['GET','HEAD'].includes(m)) {
      if(req.headers.get('X-Augenblick')!=='1')fail(403,'Anfrage nicht erlaubt.');
      const origin=req.headers.get('Origin');if(origin&&origin!==url.origin)fail(403,'Fremde Herkunft nicht erlaubt.');
    }
    if(p==='/api/health')return json({ok:true});
    if(p==='/api/auth/status')return json({initialized:!!await first(db,'SELECT id FROM users LIMIT 1')});
    if(p==='/api/mail/status'&&m==='GET')return json({configured:mailReady(env)});
    if(p==='/api/auth/forgot'&&m==='POST'){
      if(!mailReady(env))fail(503,'E-Mail-Versand ist noch nicht eingerichtet. Bitte Ihren Administrator kontaktieren.');
      const b=await body(req),email=String(b.email||'').trim().toLowerCase();await throttle(db,'forgot:'+req.headers.get('CF-Connecting-IP'));await throttle(db,'forgot-email:'+email);
      const found=await first(db,'SELECT id,email FROM users WHERE email=? AND active=1',email);
      if(found){const reset=uid()+uid();await run(db,'INSERT INTO password_resets VALUES (?,?,?)',await hash(reset),found.id,Date.now()+1800000);try{await sendMail(env,email,'Augenblick: Passwort zurücksetzen',`Öffnen Sie diesen Link innerhalb von 30 Minuten: ${env.APP_URL}/#reset=${encodeURIComponent(reset)}`);}catch{console.error('Password reset email delivery failed');}}
      return json({ok:true});
    }
    if(p==='/api/auth/reset'&&m==='POST'){
      const b=await body(req);credentials({email:'reset@example.test',name:'Reset',password:b.password});await throttle(db,'reset:'+req.headers.get('CF-Connecting-IP'));
      const t=await hash(String(b.token||'')),reset=await first(db,'SELECT * FROM password_resets WHERE token=? AND expires>?',t,Date.now());if(!reset)fail(400,'Link ungültig oder abgelaufen.');
      const salt=uid(),pw=await passwordHash(b.password,salt);
      const r=await db.batch([stmt(db,'UPDATE users SET password=?,salt=? WHERE id=? AND active=1 AND EXISTS(SELECT 1 FROM password_resets WHERE token=? AND expires>?)',pw,salt,reset.user_id,t,Date.now()),stmt(db,'DELETE FROM password_resets WHERE user_id=?',reset.user_id),stmt(db,'DELETE FROM sessions WHERE user_id=?',reset.user_id)]);if(!r[0].meta.changes)fail(400,'Link bereits verwendet.');return json({ok:true});
    }
    if(p==='/api/auth/setup'&&m==='POST') {
      await throttle(db,'setup:'+req.headers.get('CF-Connecting-IP'));
      const b=await body(req);credentials(b);
      if(!env.SETUP_TOKEN||!equal(b.token,env.SETUP_TOKEN))fail(403,'Einrichtungsschlüssel ungültig.');
      const u={id:uid(),email:b.email.toLowerCase().trim(),name:b.name.trim(),role:'admin',active:1,created:new Date().toISOString()};
      const salt=uid(),pw=await passwordHash(b.password,salt);
      const r=await run(db,"INSERT INTO users SELECT ?,?,?,?, ?,?,1,? WHERE NOT EXISTS (SELECT 1 FROM users)",u.id,u.email,u.name,u.role,pw,salt,u.created);
      if(!r.meta.changes)fail(409,'Arbeitsbereich wurde bereits eingerichtet.');
      return await loginResponse(req,db,u);
    }
    if(p==='/api/auth/login'&&m==='POST') {
      const b=await body(req),email=String(b.email||'').toLowerCase().trim();
      await throttle(db,'ip:'+req.headers.get('CF-Connecting-IP'));await throttle(db,'email:'+email);
      if(typeof b.password!=='string'||b.password.length>256)fail(400,'Ungültige Anmeldung.');
      const u=await first(db,'SELECT * FROM users WHERE email=? AND active=1',email);
      const pw=await passwordHash(b.password,u?.salt||'invalid-user-salt');
      if(!u||!equal(pw,u.password))fail(401,'E-Mail oder Passwort falsch.');
      return await loginResponse(req,db,u);
    }
    if(p==='/api/auth/accept'&&m==='POST') {
      const b=await body(req);credentials(b);await throttle(db,'invite:'+req.headers.get('CF-Connecting-IP'));
      const token=await hash(String(b.token)),invite=await first(db,'SELECT * FROM invites WHERE token=? AND used=0 AND expires>?',token,Date.now());
      if(!invite||invite.email!==b.email.trim().toLowerCase())fail(400,'Einladung ungültig oder abgelaufen.');
      const u={id:uid(),email:invite.email,name:b.name.trim(),role:invite.role,active:1,created:new Date().toISOString()},salt=uid();
      const pw=await passwordHash(b.password,salt);
      const result=await db.batch([stmt(db,'INSERT INTO users SELECT ?,?,?,?,?,?,1,? WHERE EXISTS (SELECT 1 FROM invites WHERE token=? AND used=0)',u.id,u.email,u.name,u.role,pw,salt,u.created,token),stmt(db,'UPDATE invites SET used=1 WHERE token=?',token),stmt(db,'INSERT INTO external_access SELECT ?,data FROM invite_scopes WHERE token=?',u.id,token)]);
      if(!result[0].meta.changes)fail(409,'Einladung wurde bereits angenommen.');
      return await loginResponse(req,db,u);
    }
    const raw=req.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('augenblick_session='))?.slice(19)||'';
    const token=await hash(raw),u=await first(db,'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>? AND u.active=1',token,Date.now());
    if(!u)fail(401,'Bitte anmelden.');
    const grant=await first(db,'SELECT data FROM external_access WHERE user_id=?',u.id),access=grant?JSON.parse(grant.data):null;
    if(access&&(access.revoked||access.expires<Date.now()))fail(403,'Externer Zugang abgelaufen oder widerrufen.');
    if(access)u.access=access;
    if(access&&['/api/users','/api/invites','/api/audit','/api/contractors','/api/files/storage'].some(x=>p===x||p.startsWith(x+'/'))){if(p==='/api/users'&&m==='GET')return json({users:[pub(u)]});fail(403,'Für externe Zugänge nicht freigegeben.');}
    if(p==='/api/contractors'&&m==='GET'){
      if(u.role!=='admin')fail(403,'Administrator erforderlich.');
      const invites=(await db.prepare('SELECT i.email,i.role,i.expires,i.used,s.data FROM invites i JOIN invite_scopes s ON s.token=i.token').all()).results.map(r=>({...r,access:JSON.parse(r.data),data:undefined}));
      const members=(await db.prepare('SELECT u.id,u.name,u.email,u.role,u.active,e.data FROM external_access e JOIN users u ON u.id=e.user_id').all()).results.map(r=>({...r,access:JSON.parse(r.data),data:undefined}));return json({invites,members});
    }
    if(p.startsWith('/api/contractors/')&&m==='DELETE'){
      if(u.role!=='admin')fail(403,'Administrator erforderlich.');const id=p.split('/').pop(),g=await first(db,'SELECT data FROM external_access WHERE user_id=?',id);if(!g)fail(404,'Externer Zugang nicht gefunden.');await db.batch([stmt(db,'UPDATE external_access SET data=? WHERE user_id=?',JSON.stringify({...JSON.parse(g.data),revoked:true}),id),stmt(db,'DELETE FROM sessions WHERE user_id=?',id),audit(db,u,'Externer Zugang widerrufen',id)]);return json({ok:true});
    }
    if(p==='/api/auth/password'&&m==='POST'){
      const b=await body(req);await throttle(db,'password:'+u.id);credentials({email:u.email,name:u.name,password:b.password});
      if(typeof b.currentPassword!=='string'||b.currentPassword.length>256||!equal(await passwordHash(b.currentPassword,u.salt),u.password))fail(403,'Aktuelles Passwort falsch.');
      const salt=uid(),pw=await passwordHash(b.password,salt);await db.batch([stmt(db,'UPDATE users SET password=?,salt=? WHERE id=?',pw,salt,u.id),stmt(db,'DELETE FROM sessions WHERE user_id=? AND token<>?',u.id,token),audit(db,u,'Passwort geändert',u.id)]);return json({ok:true});
    }
    if(p==='/api/files/storage'&&m==='GET'){if(u.role!=='admin')fail(403,'Administrator erforderlich.');return json(await first(db,'SELECT COUNT(*) AS count, COALESCE(SUM(size),0) AS bytes FROM files'));}
    if(p==='/api/auth/me')return json({user:pub(u)});
    if(p==='/api/auth/logout'&&m==='POST') {await run(db,'DELETE FROM sessions WHERE token=?',token);return json({ok:true},200,{'Set-Cookie':'augenblick_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'});}
    if(p==='/api/users'&&m==='GET')return json({users:(await db.prepare('SELECT id,email,name,role,active,created FROM users ORDER BY created').all()).results});
    if(p.startsWith('/api/users/')&&m==='PATCH') {
      if(u.role!=='admin')fail(403,'Administrator erforderlich.');const id=p.split('/').pop(),b=await body(req);
      if(id===u.id)fail(400,'Eigenen Administratorzugang nicht deaktivieren.');
      if(!roles.has(b.role)||![0,1].includes(b.active))fail(400,'Ungültige Rolle.');
      await db.batch([stmt(db,'UPDATE users SET role=?,active=? WHERE id=?',b.role,b.active,id),stmt(db,'DELETE FROM sessions WHERE user_id=?',id),audit(db,u,'Mitglied geändert',id)]);return json({ok:true});
    }
    if(p==='/api/invites'&&m==='POST') {
      if(u.role!=='admin')fail(403,'Administrator erforderlich.');const b=await body(req);
      if(!roles.has(b.role)||!String(b.email||'').includes('@'))fail(400,'E-Mail und Rolle erforderlich.');
      let scope=null;
      if(b.external){const days=Number(b.days);if(![7,14,30,60].includes(days)||!Array.isArray(b.objectIds)||!Array.isArray(b.buildingIds))fail(400,'Gültigkeit und Freigaben erforderlich.');for(const id of b.objectIds)await record(db,id,'objects');for(const id of b.buildingIds)await record(db,id,'buildings');if(b.restricted&&!b.objectIds.length&&!b.buildingIds.length&&!b.createObjects)fail(400,'Mindestens ein Objekt oder Gebäude freigeben.');scope={restricted:!!b.restricted,objectIds:b.objectIds,buildingIds:b.buildingIds,createObjects:!!b.createObjects,createBuildings:!!b.createBuildings,createAssets:!!b.createAssets,expires:Date.now()+days*86400000,note:String(b.note||'').slice(0,500)};}
      const token=uid()+uid();await run(db,'INSERT INTO invites VALUES (?,?,?,?,?,0)',await hash(token),b.email.toLowerCase().trim(),String(b.name||''),b.role,scope?.expires||Date.now()+7*86400000);
      if(scope)await run(db,'INSERT INTO invite_scopes VALUES (?,?)',await hash(token),JSON.stringify(scope));
      await audit(db,u,'Einladungslink erstellt',null).run();
      const link=`${url.origin}/#invite=${encodeURIComponent(token)}&email=${encodeURIComponent(b.email)}`;let emailSent=false;if(b.sendEmail&&mailReady(env)){try{await sendMail(env,b.email,'Einladung zu Augenblick',`Sie wurden zum Arbeitsbereich eingeladen. Ihr persönlicher Einladungslink: ${link}`);emailSent=true;}catch{}}return json({link,emailSent});
    }
    if(p==='/api/audit'&&m==='GET') {
      if(u.role==='inspector')fail(403,'Teamleitung erforderlich.');
      return json({events:(await db.prepare('SELECT * FROM audit ORDER BY at DESC LIMIT 500').all()).results});
    }
    if(p.startsWith('/api/trash/')&&m==='POST'){
      if(u.role!=='admin'||access)fail(403,'Workspace-Administrator erforderlich.');
      const id=p.split('/').pop(),b=await body(req),records=await allRecords(db),root=records.find(r=>r.id===id);if(!root||!['objects','buildings','assets','plans'].includes(root.kind))fail(404,'Datensatz nicht gefunden.');
      let affected;
      if(b.restore){affected=records.filter(r=>r.trashId===id);if(!affected.length)fail(400,'Datensatz liegt nicht im Papierkorb.');}
      else{if(root.trashId)fail(400,'Datensatz wurde bereits gelöscht.');const ids=new Set([id]);let changed=true;while(changed){changed=false;for(const r of records)if(!ids.has(r.id)&&((r.kind==='buildings'&&ids.has(r.objectId))||(['assets','plans'].includes(r.kind)&&ids.has(r.buildingId))||(r.kind==='inspections'&&ids.has(r.assetId)))){ids.add(r.id);changed=true;}}affected=records.filter(r=>ids.has(r.id)&&!r.trashId);}
      const now=new Date().toISOString();const expected=affected.map(r=>{const data={...r};delete data.version;delete data.kind;delete data.created;delete data.updated;if(b.restore){data.archived=!!data.previousArchived;delete data.trashId;delete data.previousArchived;}else{data.previousArchived=!!data.archived;data.archived=true;data.trashId=id;}return {id:r.id,version:r.version,data:JSON.stringify(data)};});
      const result=await run(db,`WITH expected AS MATERIALIZED (SELECT json_extract(value,'$.id') id,json_extract(value,'$.version') version,json_extract(value,'$.data') data FROM json_each(?)), ready AS MATERIALIZED (SELECT COUNT(*)=? ok FROM records r JOIN expected e ON r.id=e.id AND r.version=e.version) UPDATE records SET data=(SELECT data FROM expected WHERE expected.id=records.id),version=version+1,updated=? WHERE id IN(SELECT id FROM expected) AND (SELECT ok FROM ready)=1`,JSON.stringify(expected),expected.length,now);
      if(result.meta.changes!==expected.length)fail(409,'Daten wurden gleichzeitig geändert. Bitte aktualisieren.');await audit(db,u,b.restore?'Aus Papierkorb wiederhergestellt':'In Papierkorb verschoben',id).run();return json({ok:true,count:affected.length});
    }
    if(p==='/api/records'&&m==='GET')return json({records:visibleRecords(await allRecords(db),access,u.id)});
    if(p.startsWith('/api/records/')&&m==='PUT') {
      const kind=p.split('/')[3];if(!kinds.has(kind))fail(404,'Bereich nicht gefunden.');
      const b=await body(req);if(!/^[\w-]{1,100}$/.test(b.id||''))fail(400,'Ungültige ID.');
      const existing=await first(db,'SELECT * FROM records WHERE id=?',b.id);
      if(access&&!mayWrite(kind,b,existing?JSON.parse(existing.data):null,await allRecords(db),access,u.id))fail(403,'Datensatz außerhalb Ihrer Freigabe.');
      if(kind==='reports')b.creatorId=u.id;
      if(existing&&existing.kind!==kind)fail(409,'ID bereits vergeben.');
      if(existing&&b.version===undefined&&JSON.parse(existing.data)._requestId===b._requestId&&b._requestId)return json({record:{...JSON.parse(existing.data),kind,version:existing.version}});
      if(existing&&b.version!==existing.version)fail(409,'Datensatz wurde von jemand anderem geändert. Bitte aktualisieren.');
      const old=existing?{...JSON.parse(existing.data),version:existing.version}:null;
      delete b.kind;delete b.created;delete b.updated;
      await validate(db,kind,b,u,old);
      const now=new Date().toISOString(),version=(existing?.version||0)+1;delete b.version;
      let result;
      if(existing)result=await db.batch([stmt(db,'UPDATE records SET data=?,version=version+1,updated=? WHERE id=? AND version=?',JSON.stringify(b),now,b.id,existing.version),audit(db,u,kind+' aktualisiert',b.id)]);
      else result=await db.batch([stmt(db,'INSERT INTO records VALUES (?,?,?,1,?,?,?)',b.id,kind,JSON.stringify(b),now,now,u.id),audit(db,u,kind+' erstellt',b.id)]);
      if(!result[0].meta.changes)fail(409,'Datensatz wurde zwischenzeitlich geändert.');
      if(access&&kind==='objects'&&!existing){access.objectIds=[...access.objectIds,b.id];await run(db,'UPDATE external_access SET data=? WHERE user_id=?',JSON.stringify(access),u.id);}
      return json({record:{...b,kind,version,created:existing?.created||now,updated:now}});
    }
    if(p==='/api/files'&&m==='POST') {
      if(!env.FILES)fail(503,'Dateispeicher nicht eingerichtet.');
      const mime=req.headers.get('Content-Type')?.split(';')[0];
      if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(mime))fail(415,'Bitte JPG, PNG, WebP oder PDF hochladen.');
      if(Number(req.headers.get('Content-Length')||0)>10485760)fail(413,'Maximal 10 MB pro Datei.');
      const data=await req.arrayBuffer();if(data.byteLength>10485760)fail(413,'Maximal 10 MB pro Datei.');
      const id=uid(),name=decodeURIComponent(req.headers.get('X-Filename')||'Datei').slice(0,200);
      await env.FILES.put(id,data,{httpMetadata:{contentType:mime}});
      await run(db,'INSERT INTO files VALUES (?,?,?,?,?,?)',id,name,mime,data.byteLength,u.id,new Date().toISOString());return json({id,name,mime,url:'/api/files/'+id});
    }
    if(p.startsWith('/api/files/')&&m==='GET') {
      const id=p.split('/').pop(),file=await first(db,'SELECT * FROM files WHERE id=?',id);if(!file)fail(404,'Datei nicht gefunden.');
      if(access&&file.author!==u.id){const allowed=visibleRecords(await allRecords(db),access,u.id);if(!allowed.some(r=>JSON.stringify(r).includes(id)))fail(403,'Datei außerhalb Ihrer Freigabe.');}
      const obj=await env.FILES.get(id);if(!obj)fail(404,'Datei nicht gefunden.');
      return new Response(obj.body,{headers:{'Content-Type':file.mime,'X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,'Content-Security-Policy':"sandbox"}});
    }
    fail(404,'Nicht gefunden.');
  } catch(e) {if(!e.status)console.error('API failure',e.message);return json({error:e.status?e.message:'Serverfehler. Bitte erneut versuchen.'},e.status||500);}
}
