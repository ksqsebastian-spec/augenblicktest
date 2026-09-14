import {coreApi} from './api.js';
import {workspaceSchema} from './workspace-schema.js';
const tablePattern=/\b(users|sessions|invites|records|audit|files|attempts|invite_scopes|external_access|password_resets|email_deliveries|records_kind)\b/g;
const digest=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),v=>v.toString(16).padStart(2,'0')).join('');
const publicAccount=a=>({id:a.id,email:a.email,name:a.name,role:'inspector',active:1,created:a.created,workspaceId:'none',workspaceName:'Kein aktiver Arbeitsbereich'});
const tokenOf=req=>req.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('augenblick_session='))?.slice(19)||'';
export function workspaceDB(db,id){
 if(id==='main')return db;
 if(id!=='identity'&&!/^[a-f0-9]{32}$/.test(id))throw new Error('Ungültiger Arbeitsbereich.');
 const prefix=id==='identity'?'identity_':'w'+id+'_';
 return {prepare(sql){return db.prepare(sql.replace(tablePattern,t=>prefix+t));},batch(statements){return db.batch(statements);}};
}
const response=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const query=(db,sql,...p)=>db.prepare(sql).bind(...p);
const get=(db,sql,...p)=>query(db,sql,...p).first();
async function linkAccount(db,scope,account,invite){
 const now=new Date().toISOString(),role=invite?.role||'admin';
 await scope.prepare('INSERT OR IGNORE INTO users VALUES (?,?,?,?,?,?,1,?)').bind(account.id,account.email,account.name,role,account.password,account.salt,now).run();
 await query(db,'INSERT OR IGNORE INTO workspace_memberships VALUES (?,?)',invite?.workspaceId||'main',account.id).run();
}
async function membership(db,workspaceId,accountId){
 if(!await get(db,'SELECT 1 FROM workspace_memberships WHERE workspace_id=? AND account_id=?',workspaceId,accountId))return null;
 const scope=workspaceDB(db,workspaceId),u=await get(scope,'SELECT id,email,name,role,active,created FROM users WHERE id=? AND active=1',accountId);
 if(!u)return null;const grant=await get(scope,'SELECT data FROM external_access WHERE user_id=?',accountId),access=grant?JSON.parse(grant.data):null;
 if(access&&(access.revoked||access.expires<Date.now()))return null;
 return {...u,...(access?{access}:{})};
}
async function options(db,accountId){const links=(await query(db,'SELECT w.* FROM workspaces w JOIN workspace_memberships m ON m.workspace_id=w.id WHERE m.account_id=? ORDER BY w.created',accountId).all()).results,out=[];for(const w of links){const u=await membership(db,w.id,accountId);if(u){const c=await get(workspaceDB(db,w.id),"SELECT data FROM records WHERE id='company' AND kind='settings'");out.push({...w,name:c?JSON.parse(c.data).name||w.name:w.name,role:u.role,external:!!u.access});}}return out;}
async function acceptExisting(db,workspaceId,account,token){
 const scope=workspaceDB(db,workspaceId),invite=await get(scope,'SELECT * FROM invites WHERE token=? AND used=0 AND expires>?',token,Date.now());
 if(!invite||invite.email!==account.email)return response({error:'Einladung ungültig, abgelaufen oder für eine andere E-Mail-Adresse.'},400);
 if(await membership(db,workspaceId,account.id))return response({error:'Sie sind bereits Mitglied dieses Arbeitsbereichs.'},409);
 const now=new Date().toISOString();
 const statements=[scope.prepare('INSERT INTO users SELECT ?,?,?,?,?,?,1,? WHERE EXISTS (SELECT 1 FROM invites WHERE token=? AND used=0) ON CONFLICT(id) DO UPDATE SET role=excluded.role,active=1').bind(account.id,account.email,account.name,invite.role,account.password,account.salt,now,token),scope.prepare('INSERT INTO external_access SELECT ?,data FROM invite_scopes WHERE token=? ON CONFLICT(user_id) DO UPDATE SET data=excluded.data').bind(account.id,token),scope.prepare('UPDATE invites SET used=1 WHERE token=? AND used=0').bind(token),query(db,'INSERT OR IGNORE INTO workspace_memberships VALUES (?,?)',workspaceId,account.id)];
 const result=await db.batch(statements);if(!result[2].meta.changes)return response({error:'Einladung bereits verwendet.'},409);return response({ok:true,workspaceId});
}
export async function api(req,env){
 const db=env.DB,identity=workspaceDB(db,'identity'),url=new URL(req.url),path=url.pathname,method=req.method;
 try{
  if(!['GET','HEAD'].includes(method)&&(req.headers.get('X-Augenblick')!=='1'||req.headers.get('Origin')&&req.headers.get('Origin')!==url.origin))return response({error:'Anfrage nicht erlaubt.'},403);
  if(path==='/api/health'||path==='/api/mail/status')return coreApi(req,env);
  const sessionToken=await digest(tokenOf(req)),account=await get(identity,'SELECT u.*,s.expires FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>? AND u.active=1',sessionToken,Date.now());
  const authPaths=['/api/auth/status','/api/auth/setup','/api/auth/login','/api/auth/password','/api/auth/forgot','/api/auth/reset','/api/auth/logout'];
  if(authPaths.includes(path)){
    const r=await coreApi(req,{...env,DB:identity});
    if(r.ok&&['/api/auth/setup','/api/auth/login'].includes(path)){
      const data=await r.clone().json();if(path==='/api/auth/setup'){const a=await get(identity,'SELECT * FROM users WHERE id=?',data.user.id);await linkAccount(db,db,a,null);}
      const workspaces=await options(db,data.user.id);const chosen=workspaces.find(w=>w.id===req.headers.get('X-Workspace'))||workspaces[0];
      if(!chosen)return new Response(JSON.stringify({user:publicAccount(data.user)}),{status:200,headers:r.headers});
      const u=await membership(db,chosen.id,data.user.id);return new Response(JSON.stringify({user:{...u,workspaceId:chosen.id,workspaceName:chosen.name}}),{status:r.status,headers:r.headers});
    }
    return r;
  }
  if(path==='/api/auth/accept'&&method==='POST'){
    const b=await req.clone().json(),token=await digest(String(b.token||'')),index=await get(db,'SELECT workspace_id FROM workspace_invites WHERE token=?',token),wid=index?.workspace_id||'main',scope=workspaceDB(db,wid),invite=await get(scope,'SELECT * FROM invites WHERE token=? AND used=0 AND expires>?',token,Date.now());
    if(!invite||invite.email!==String(b.email||'').trim().toLowerCase())return response({error:'Einladung ungültig oder abgelaufen.'},400);
    const existing=await get(identity,'SELECT id FROM users WHERE email=?',invite.email);if(existing)return response({error:'Für diese E-Mail existiert ein Konto. Bitte anmelden und den Einladungslink unter Arbeitsbereiche → Zugangsschlüssel einlösen verwenden.'},409);
    await identity.prepare('INSERT OR IGNORE INTO invites VALUES (?,?,?,?,?,0)').bind(token,invite.email,invite.name,invite.role,invite.expires).run();
    const r=await coreApi(req,{...env,DB:identity});if(!r.ok)return r;
    const data=await r.clone().json(),created=await get(identity,'SELECT * FROM users WHERE id=?',data.user.id),accepted=await acceptExisting(db,wid,created,token);if(!accepted.ok)return accepted;
    const u=await membership(db,wid,created.id),w=await get(db,'SELECT name FROM workspaces WHERE id=?',wid);return new Response(JSON.stringify({user:{...u,workspaceId:wid,workspaceName:w.name}}),{status:200,headers:r.headers});
  }
  if(!account)return response({error:'Bitte anmelden.'},401);
  if(path==='/api/workspaces'&&method==='GET')return response({workspaces:await options(db,account.id)});
  if(path==='/api/workspaces'&&method==='POST'){
    const b=await req.json();if(typeof b.name!=='string'||!b.name.trim()||b.name.length>150)return response({error:'Firmenname erforderlich (maximal 150 Zeichen).'},400);
    if((await get(db,'SELECT COUNT(*) AS n FROM workspace_memberships WHERE account_id=?',account.id)).n>=10)return response({error:'Maximal zehn Arbeitsbereiche pro Konto.'},400);
    const id=crypto.randomUUID().replaceAll('-',''),scope=workspaceDB(db,id);
    const schema=workspaceSchema.split(';').map(x=>x.trim()).filter(x=>x&&!x.startsWith('PRAGMA'));
    await db.batch(schema.map(sql=>scope.prepare(sql)));
    await db.batch([query(db,'INSERT INTO workspaces VALUES (?,?,?)',id,b.name.trim(),new Date().toISOString()),scope.prepare('INSERT INTO users VALUES (?,?,?,?,?,?,1,?)').bind(account.id,account.email,account.name,'admin',account.password,account.salt,new Date().toISOString()),query(db,'INSERT INTO workspace_memberships VALUES (?,?)',id,account.id)]);
    return response({workspaceId:id});
  }
  if(path==='/api/workspaces/redeem'&&method==='POST'){
    const b=await req.json();let raw=String(b.token||'').trim();if(raw.startsWith('https://')||raw.startsWith('http://')){const link=new URL(raw);if(link.origin!==url.origin)return response({error:'Der Einladungslink gehört zu einer anderen Installation.'},400);raw=new URLSearchParams(link.hash.slice(1)).get('invite')||'';}
    const token=await digest(raw),index=await get(db,'SELECT workspace_id FROM workspace_invites WHERE token=?',token);if(!index)return response({error:'Zugangsschlüssel ungültig.'},400);return acceptExisting(db,index.workspace_id,account,token);
  }
  if(path==='/api/auth/me'&&req.headers.get('X-Workspace')==='none'&&!(await options(db,account.id)).length)return response({user:publicAccount(account)});
  const workspaceId=req.headers.get('X-Workspace')||(path.startsWith('/api/files/')?url.searchParams.get('workspace'):null)||'main',u=await membership(db,workspaceId,account.id);if(!u)return response({error:'Für diesen Arbeitsbereich fehlt ein aktiver Zugang.'},403);
  if(path==='/api/auth/me')return response({user:{...u,workspaceId,workspaceName:(await options(db,account.id)).find(w=>w.id===workspaceId)?.name}});
  const scope=workspaceDB(db,workspaceId);
  await scope.prepare('INSERT INTO sessions VALUES (?,?,?) ON CONFLICT(token) DO UPDATE SET expires=excluded.expires').bind(sessionToken,account.id,account.expires).run();
  const r=await coreApi(req,{...env,DB:scope});
  if(r.ok&&path==='/api/invites'&&method==='POST'){
    const data=await r.clone().json(),raw=new URLSearchParams(new URL(data.link).hash.slice(1)).get('invite');await query(db,'INSERT OR REPLACE INTO workspace_invites VALUES (?,?)',await digest(raw),workspaceId).run();
  }
  return r;
 }catch(e){console.error('Workspace API failure',e.message);return response({error:'Arbeitsbereich konnte nicht verarbeitet werden.'},500);}
}
