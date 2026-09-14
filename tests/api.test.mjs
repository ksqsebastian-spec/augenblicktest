import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {database} from '../backend/local-db.js';
import {api} from '../backend/api.js';
const DB=database(),files=new Map(),env={DB,SETUP_TOKEN:'test-setup-secret',FILES:{async put(id,b){files.set(id,b);},async get(id){return files.has(id)?{body:files.get(id)}:null;}}};
let admin='',inspector='';
async function call(path,method='GET',b,cookie=admin,extra={}){const r=await api(new Request('http://localhost/api'+path,{method,headers:{'Content-Type':'application/json','X-Augenblick':'1','Cookie':cookie,...extra},...(b?{body:JSON.stringify(b)}:{})}),env);return {status:r.status,body:await r.json(),cookie:r.headers.get('Set-Cookie')?.split(';')[0]};}
before(async()=>{DB.sql.exec(await readFile(new URL('../migrations/0001_initial.sql',import.meta.url),'utf8'));DB.sql.exec(await readFile(new URL('../migrations/0002_external_access.sql',import.meta.url),'utf8'));DB.sql.exec(await readFile(new URL('../migrations/0003_email.sql',import.meta.url),'utf8'));DB.sql.exec(await readFile(new URL('../migrations/0004_workspaces.sql',import.meta.url),'utf8'));});
after(()=>DB.sql.close());
test('private data rejects anonymous access',async()=>{assert.equal((await call('/records','GET',null,'')).status,401);});
test('setup is secret gated and only runs once',async()=>{const b={email:'admin@example.test',password:'testing-only-password',name:'Test Admin',token:env.SETUP_TOKEN};assert.equal((await call('/auth/setup','POST',{...b,token:'wrong'})).status,403);const r=await call('/auth/setup','POST',b);assert.equal(r.status,200);admin=r.cookie;assert.match(admin,/augenblick_session=/);assert.equal((await call('/auth/setup','POST',{...b,email:'second@example.test'})).status,409);});
test('login validates password and sets session',async()=>{assert.equal((await call('/auth/login','POST',{email:'admin@example.test',password:'wrong'})).status,401);assert.equal((await call('/auth/login','POST',{email:'admin@example.test',password:'testing-only-password'})).status,200);});
test('same origin mutation guard',async()=>{assert.equal((await call('/invites','POST',{},admin,{'Origin':'https://evil.example'})).status,403);});
test('invitation is single use and enforces roles',async()=>{const r=await call('/invites','POST',{name:'Inspector',email:'inspector@example.test',role:'inspector'});assert.equal(r.status,200);const token=new URLSearchParams(new URL(r.body.link).hash.slice(1)).get('invite');const data={email:'inspector@example.test',name:'Inspector',password:'inspector-password-test',token};const accepted=await call('/auth/accept','POST',data);assert.equal(accepted.status,200);inspector=accepted.cookie;assert.equal((await call('/auth/accept','POST',data)).status,400);assert.equal((await call('/invites','POST',{email:'x@example.test',role:'admin'},inspector)).status,403);assert.equal((await call('/records/settings','PUT',{id:'company',name:'Overwrite'},inspector)).status,403);});
test('objects, buildings and assets persist and validate links',async()=>{assert.equal((await call('/records/objects','PUT',{id:'o1',name:'Test',address:'Musterstraße 13'})).status,200);assert.equal((await call('/records/buildings','PUT',{id:'b1',name:'Flügel A',objectId:'o1'})).status,200);assert.equal((await call('/records/assets','PUT',{id:'bad',code:'BAD',location:'EG',category:'BST',buildingId:'missing'})).status,400);assert.equal((await call('/records/assets','PUT',{id:'a1',code:'BST-B16A',location:'EG, Treppenhaus',category:'BST',buildingId:'b1',specs:{Hersteller:'Hörmann'}})).status,200);assert.equal((await call('/records/assets','PUT',{id:'a2',code:'BST-B16A',location:'EG',category:'BST',buildingId:'b1'})).status,409);});
test('updates reject stale versions and preserve concurrent edits',async()=>{assert.equal((await call('/records/objects','PUT',{id:'o1',name:'Updated',version:1})).status,200);assert.equal((await call('/records/objects','PUT',{id:'o1',name:'Lost update',version:1})).status,409);assert.equal((await call('/records')).body.records.find(r=>r.id==='o1').name,'Updated');});
const inspection={id:'i1',assetId:'a1',checks:[{label:'Tür schließt',value:'ok'}],result:'Ohne Mängel',notes:'',nextDate:'2027-09-14',_requestId:'offline-request-1'};
test('inspection validation, snapshots, idempotent offline sync',async()=>{assert.equal((await call('/records/inspections','PUT',{...inspection,checks:[{label:'Tür schließt',value:''}]},inspector)).status,400);assert.equal((await call('/records/inspections','PUT',{...inspection,checks:[{label:'Tür schließt',value:'fail'}]},inspector)).status,400);const r=await call('/records/inspections','PUT',inspection,inspector);assert.equal(r.status,200);assert.equal(r.body.record.inspector,'Inspector');assert.equal(r.body.record.assetSnapshot.code,'BST-B16A');assert.equal((await call('/records/inspections','PUT',inspection,inspector)).status,200);const all=(await call('/records')).body.records;assert.equal(all.filter(r=>r.kind==='inspections').length,1);});
test('completed inspections cannot be rewritten; admins can archive',async()=>{const r=(await call('/records')).body.records.find(r=>r.id==='i1');assert.equal((await call('/records/inspections','PUT',{...r,result:'Mit Mängeln'})).status,403);assert.equal((await call('/records/inspections','PUT',{...r,archived:true},inspector)).status,403);const archive=await call('/records/inspections','PUT',{...r,archived:true});assert.equal(archive.status,200,JSON.stringify(archive.body));});
test('team tasks validate assignment and share state',async()=>{const users=(await call('/users')).body.users,u=users.find(u=>u.role==='inspector');const b={id:'t1',title:'Tür prüfen',status:'Offen',priority:'Hoch',dueDate:'2026-10-01',objectId:'o1',assignee:u.id};assert.equal((await call('/records/tasks','PUT',b)).status,200);assert.equal((await call('/records','GET',null,inspector)).body.records.find(r=>r.id==='t1').title,b.title);});
test('private uploads require auth and reject executable content',async()=>{let r=await api(new Request('http://localhost/api/files',{method:'POST',headers:{'Cookie':admin,'X-Augenblick':'1','Content-Type':'text/html'},body:'<script>alert(1)</script>'}),env);assert.equal(r.status,415);r=await api(new Request('http://localhost/api/files',{method:'POST',headers:{'Cookie':admin,'X-Augenblick':'1','Content-Type':'image/png','X-Filename':'test.png'},body:new Uint8Array([137,80,78,71])}),env);assert.equal(r.status,200);const file=await r.json();assert.equal((await call('/files/'+file.id,'GET',null,'')).status,401);const loaded=await api(new Request('http://localhost'+file.url,{headers:{Cookie:inspector}}),env);assert.equal(loaded.status,200);assert.equal(loaded.headers.get('Cache-Control'),'private, no-store');});
test('disabled users immediately lose access',async()=>{const u=(await call('/users')).body.users.find(u=>u.role==='inspector');assert.equal((await call('/users/'+u.id,'PATCH',{role:'inspector',active:0})).status,200);assert.equal((await call('/records','GET',null,inspector)).status,403);assert.equal((await call('/audit')).status,200);});
test('labels, protocols and SLA validate and preserve authoritative deadlines',async()=>{
 assert.equal((await call('/records/labels','PUT',{id:'label-1',name:'Dringend',color:'#ef5350'})).status,200);
 assert.equal((await call('/records/labels','PUT',{id:'label-bad',name:'Bad',color:'javascript:bad'})).status,400);
 assert.equal((await call('/records/settings','PUT',{id:'sla-Hoch',priority:'Hoch',active:true,reactionMinutes:30,resolutionMinutes:60})).status,200);
 assert.equal((await call('/records/settings','PUT',{id:'sla-Mittel',priority:'Mittel',active:true,reactionMinutes:-1,resolutionMinutes:60})).status,400);
 let r=await call('/records/tasks','PUT',{id:'sla-task',title:'SLA-Test',status:'Offen',priority:'Hoch',dueDate:'2027-01-01',labels:['label-1'],reactionDue:'2099-01-01'});
 assert.equal(r.status,200);assert.ok(Date.parse(r.body.record.reactionDue)<Date.now()+31*60000);
 let task=r.body.record;r=await call('/records/tasks','PUT',{...task,status:'In Bearbeitung',reactionDue:'2099-01-01'});assert.equal(r.status,200);assert.equal(r.body.record.reactionDue,task.reactionDue);assert.ok(r.body.record.startedAt);
 const protocol={id:'custom-1',name:'Sichtprüfung',checks:['Kontrolle'],objectIds:['o1'],fields:[{key:'serial',label:'Seriennummer'}],inspectionTypes:['Erstprüfung'],maintenance:[],intervalOk:12,intervalDefect:6};
 assert.equal((await call('/records/customProtocols','PUT',protocol)).status,200);
 assert.equal((await call('/records/customProtocols','PUT',{...protocol,id:'custom-bad',intervalOk:0})).status,400);
 assert.equal((await call('/files/storage')).status,200);
});
test('external invitations isolate records, attachments and management access',async()=>{
 await call('/records/objects','PUT',{id:'private-object',name:'Private'});
 await call('/records/buildings','PUT',{id:'private-building',name:'Private',objectId:'private-object'});
 await call('/records/assets','PUT',{id:'private-asset',category:'FLS',code:'PRIVATE',location:'Private',buildingId:'private-building'});
 const invite=await call('/invites','POST',{email:'external@example.test',role:'admin',external:true,days:7,restricted:true,objectIds:['o1'],buildingIds:[],createAssets:false});assert.equal(invite.status,200);
 const token=new URLSearchParams(new URL(invite.body.link).hash.slice(1)).get('invite');
 const accepted=await call('/auth/accept','POST',{email:'external@example.test',name:'External',password:'external-test-password',token});assert.equal(accepted.status,200);const c=accepted.cookie;assert.ok(accepted.body.user.access);
 const records=(await call('/records','GET',null,c)).body.records;assert.ok(records.some(r=>r.id==='a1'));assert.ok(!records.some(r=>r.id==='private-asset'||r.id==='private-object'));
 assert.equal((await call('/records/assets','PUT',{id:'evil',category:'FLS',code:'EVIL',location:'EG',buildingId:'b1'},c)).status,403);
 assert.equal((await call('/records/objects','PUT',{id:'private-object',name:'Overwrite',version:1},c)).status,403);
 assert.equal((await call('/records/settings','PUT',{id:'external-setting',name:'Overwrite'},c)).status,403);
 assert.equal((await call('/invites','POST',{email:'escalate@example.test',role:'admin'},c)).status,403);
 assert.equal((await call('/audit','GET',null,c)).status,403);
 assert.equal((await call('/users','GET',null,c)).body.users.length,1);
 const file=DB.sql.prepare('SELECT id FROM files LIMIT 1').get();assert.equal((await call('/files/'+file.id,'GET',null,c)).status,403);
 const ownAsset=records.find(r=>r.id==='a1');
 assert.equal((await call('/records/assets','PUT',{...ownAsset,notes:file.id},c)).status,200);
 assert.equal((await call('/files/'+file.id,'GET',null,c)).status,403,'A file ID in a note must not grant file access');
 assert.equal((await call('/records/plans','PUT',{id:'forged-plan',name:'Forged',level:0,buildingId:'b1',file:{id:file.id,url:'/api/files/'+file.id},pins:[]},c)).status,403);
 assert.equal((await call('/contractors/'+accepted.body.user.id,'DELETE')).status,200);
 assert.equal((await call('/records','GET',null,c)).status,403);
 const revokedLogin=await call('/auth/login','POST',{email:'external@example.test',password:'external-test-password'});assert.equal(revokedLogin.status,200);assert.equal(revokedLogin.body.user.workspaceId,'none');
});
test('password changes verify old password and invalidate other sessions',async()=>{
 const second=await call('/auth/login','POST',{email:'admin@example.test',password:'testing-only-password'});
 assert.equal((await call('/auth/password','POST',{currentPassword:'wrong',password:'new-testing-password'})).status,403);
 assert.equal((await call('/auth/password','POST',{currentPassword:'testing-only-password',password:'new-testing-password'})).status,200);
 assert.equal((await call('/records','GET',null,second.cookie)).status,401);
 assert.equal((await call('/records')).status,200);
 assert.equal((await call('/auth/login','POST',{email:'admin@example.test',password:'testing-only-password'})).status,401);
 assert.equal((await call('/auth/login','POST',{email:'admin@example.test',password:'new-testing-password'})).status,200);
});
test('scheduled SLA escalation is recorded once without losing task data',async()=>{
 const {maintainWorkspace}=await import('../backend/scheduled.js');
 const r=await call('/records/tasks','PUT',{id:'escalation-test',title:'Background SLA',status:'Offen',priority:'Hoch',dueDate:'2027-01-01'});assert.equal(r.status,200);
 const at=Date.now()+61*60000;await maintainWorkspace(env,at);
 let t=JSON.parse(DB.sql.prepare('SELECT data FROM records WHERE id=?').get('escalation-test').data);assert.equal(t.title,'Background SLA');assert.ok(t.escalatedAt);
 await maintainWorkspace(env,at+60000);
 assert.equal(DB.sql.prepare("SELECT COUNT(*) as n FROM audit WHERE record_id='escalation-test' AND action='SLA überschritten'").get().n,1);
});
test('email reminders deduplicate daily delivery and reset links are single use',async()=>{
 const sent=[],emailEnv={...env,EMAIL_FROM:'noreply@example.test',APP_URL:'https://example.test',EMAIL:{async send(message){sent.push(message);return {messageId:'test-only'};}}};
 const adminUser=DB.sql.prepare("SELECT id FROM users WHERE email='admin@example.test'").get();
 await call('/records/settings','PUT',{id:'reminders',enabled:true,days:30,recipientIds:[adminUser.id]});
 const {sendReminders}=await import('../backend/email.js');
 await sendReminders(emailEnv,Date.parse('2027-09-13'));await sendReminders(emailEnv,Date.parse('2027-09-13T01:00:00Z'));assert.equal(sent.length,1);assert.match(sent[0].text,/BST-B16A/);
 const invoke=async(path,b)=>api(new Request('http://localhost/api'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Augenblick':'1'},body:JSON.stringify(b)}),emailEnv);
 assert.equal((await invoke('/auth/forgot',{email:'admin@example.test'})).status,200);
 assert.equal(sent.length,2);const token=decodeURIComponent(sent[1].text.split('#reset=')[1]);
 assert.equal((await invoke('/auth/reset',{token,password:'reset-test-password'})).status,200);
 assert.equal((await invoke('/auth/reset',{token,password:'reset-test-password'})).status,400);
 assert.equal((await call('/auth/login','POST',{email:'admin@example.test',password:'reset-test-password'})).status,200);
});
test('trash cascades and restores a hierarchy while preserving archived evidence',async()=>{
 admin=(await call('/auth/login','POST',{email:'admin@example.test',password:'reset-test-password'})).cookie;
 let r=await call('/trash/o1','POST',{});assert.equal(r.status,200,JSON.stringify(r.body));assert.ok(r.body.count>=4);
 const hidden=(await call('/records')).body.records;assert.equal(hidden.find(r=>r.id==='a1').trashId,'o1');assert.equal(hidden.find(r=>r.id==='i1').trashId,'o1');
 assert.equal((await call('/records/inspections','PUT',{...inspection,id:'deleted-parent-test'})).status,400);
 r=await call('/trash/o1','POST',{restore:true});assert.equal(r.status,200);
 const restored=(await call('/records')).body.records;assert.equal(restored.find(r=>r.id==='a1').archived,false);assert.equal(restored.find(r=>r.id==='i1').archived,true);assert.equal(restored.find(r=>r.id==='i1').trashId,undefined);
});

test('inspection metadata overrides are validated and frozen without changing the device',async()=>{
 const original=(await call('/records')).body.records.find(r=>r.id==='a1');
 const draft={...inspection,id:'metadata-inspection',_requestId:'metadata-inspection',specsOverrides:{Hersteller:'Bei Prüfung abgelesen',Rauchschutz:'Ja','FSA-Hersteller':'FSA Test'}};
 const r=await call('/records/inspections','PUT',draft);
 assert.equal(r.status,200,JSON.stringify(r.body));
 assert.equal(r.body.record.assetSnapshot.specs.Hersteller,'Bei Prüfung abgelesen');
 assert.equal(r.body.record.assetSnapshot.specs.Rauchschutz,'Ja');
 assert.deepEqual((await call('/records')).body.records.find(r=>r.id==='a1').specs,original.specs);
 assert.equal((await call('/records/inspections','PUT',{...r.body.record,specsOverrides:{Hersteller:'Geändert'}})).status,403);
 assert.equal((await call('/records/inspections','PUT',{...draft,id:'invalid-metadata',_requestId:'invalid-metadata',specsOverrides:{Hersteller:{code:'injected'}}})).status,400);
});

test('floor plans validate page coordinates and device membership',async()=>{
 const file=DB.sql.prepare('SELECT * FROM files LIMIT 1').get();
 const plan={id:'plan-test',name:'Testplan',level:1,buildingId:'b1',file:{id:file.id},pins:[{assetId:'a1',page:2,x:.25,y:.75}]};
 const r=await call('/records/plans','PUT',plan);assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.record.file.url,'/api/files/'+file.id);
 for(const pin of [{assetId:'a1',page:0,x:.2,y:.3},{assetId:'a1',page:1,x:2,y:.3},{assetId:'private-asset',page:1,x:.2,y:.3}])assert.equal((await call('/records/plans','PUT',{...r.body.record,pins:[pin]})).status,400);
 assert.equal((await call('/records/plans','PUT',{...r.body.record,pins:[]})).status,200);
});

test('open inspections can be signed once and the signature is immutable',async()=>{
 let r=await call('/records/inspections','PUT',{...inspection,id:'signature-test',_requestId:'signature-test',completion:'open'});assert.equal(r.status,200);let draft=r.body.record;
 const signature={strokes:[[[.1,.2],[.4,.5],[.8,.2]]]};
 assert.equal((await call('/records/inspections','PUT',{...draft,completion:'complete',signature:{strokes:[[[2,0],[0,0]]]}})).status,400);
 assert.equal((await call('/records/inspections','PUT',{...draft,completion:'complete',signature:null})).status,400);
 r=await call('/records/inspections','PUT',{...draft,completion:'complete',signature,submittedAt:'2000-01-01'});assert.equal(r.status,200,JSON.stringify(r.body));assert.deepEqual(r.body.record.signature,signature);assert.ok(Date.parse(r.body.record.submittedAt)>Date.now()-60000);
 assert.equal((await call('/records/inspections','PUT',{...r.body.record,signature:{strokes:[[[0,0],[1,1]]]}})).status,403);
 assert.equal((await call('/records/inspections','PUT',{...r.body.record,completion:'open'})).status,403);
});
test('not-performable completion requires a persisted reason',async()=>{
 const b={...inspection,id:'not-performable',_requestId:'not-performable',completion:'complete',result:'Nicht prüfbar',signature:null};
 assert.equal((await call('/records/inspections','PUT',b)).status,400);
 const r=await call('/records/inspections','PUT',{...b,nonInspectionReason:'Tür verschlossen'});assert.equal(r.status,200);assert.equal(r.body.record.nonInspectionReason,'Tür verschlossen');assert.equal(r.body.record.signature,null);
});

test('workspaces isolate identical record IDs, roles, files and invitations',async()=>{
 const second=await call('/workspaces','POST',{name:'Zweite Testfirma'});assert.equal(second.status,200,JSON.stringify(second.body));const wid=second.body.workspaceId,w={'X-Workspace':wid};
 assert.equal((await call('/auth/me','GET',null,admin,w)).body.user.workspaceId,wid);
 assert.deepEqual((await call('/records','GET',null,admin,w)).body.records,[]);
 assert.equal((await call('/records/objects','PUT',{id:'o1',name:'Second company object'},admin,w)).status,200);
 assert.notEqual((await call('/records','GET',null,admin,w)).body.records.find(r=>r.id==='o1').name,(await call('/records')).body.records.find(r=>r.id==='o1').name);
 assert.equal((await call('/records/assets','PUT',{id:'cross-building',category:'FLS',code:'BAD-CROSS',location:'EG',buildingId:'b1'},admin,w)).status,400);
 const firstFile=DB.sql.prepare('SELECT id FROM files LIMIT 1').get();assert.equal((await call('/files/'+firstFile.id,'GET',null,admin,w)).status,404);
 assert.equal((await call('/records','GET',null,admin,{'X-Workspace':'bad-id'})).status,403);
 const invite=await call('/invites','POST',{name:'Second member',email:'second-workspace@example.test',role:'inspector'},admin,w);assert.equal(invite.status,200);
 const token=new URLSearchParams(new URL(invite.body.link).hash.slice(1)).get('invite');
 const joined=await call('/auth/accept','POST',{name:'Second member',email:'second-workspace@example.test',password:'second-workspace-test-password',token},'');assert.equal(joined.status,200,JSON.stringify(joined.body));const member=joined.cookie;assert.equal(joined.body.user.workspaceId,wid);
 assert.equal((await call('/records','GET',null,member)).status,403);
 assert.equal((await call('/records','GET',null,member,w)).body.records.length,1);
 assert.equal((await call('/users','GET',null,member,w)).body.users.length,2);
 assert.equal((await call('/records/settings','PUT',{id:'company',name:'Escalation'},member,w)).status,403);
 const accountInvite=await call('/invites','POST',{email:'second-workspace@example.test',role:'inspector',external:true,days:7,restricted:true,objectIds:['o1'],buildingIds:[],createAssets:false});assert.equal(accountInvite.status,200);
 const redeem=await call('/workspaces/redeem','POST',{token:accountInvite.body.link},member,w);assert.equal(redeem.status,200,JSON.stringify(redeem.body));
 const members=(await call('/workspaces','GET',null,member,w)).body.workspaces;assert.equal(members.length,2);
 assert.equal((await call('/auth/me','GET',null,member)).body.user.access.restricted,true);
 assert.ok(!(await call('/records','GET',null,member)).body.records.some(r=>r.id==='private-object'));
 assert.equal((await call('/workspaces/redeem','POST',{token:accountInvite.body.link},member,w)).status,400);
 const id=joined.body.user.id;assert.equal((await call('/contractors/'+id,'DELETE')).status,200);assert.equal((await call('/records','GET',null,member)).status,403);assert.equal((await call('/records','GET',null,member,w)).status,200);
 const login=await call('/auth/login','POST',{email:'second-workspace@example.test',password:'second-workspace-test-password'},'');assert.equal(login.status,200);assert.equal(login.body.user.workspaceId,wid);
 const accountRows=(await call('/users')).body.users;assert.equal(accountRows.find(u=>u.id===id).role,'inspector');
});
