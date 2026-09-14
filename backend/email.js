import {visibleRecords} from './access.js';
import {currentInspections} from '../src/data.js';
export const mailReady=env=>!!(env.EMAIL?.send&&env.EMAIL_FROM&&env.APP_URL);
export async function sendMail(env,to,subject,text){if(!mailReady(env))throw new Error('E-Mail-Versand ist noch nicht eingerichtet.');return env.EMAIL.send({from:env.EMAIL_FROM,to,subject,text});}
export async function sendReminders(env,now=Date.now()){
 if(!mailReady(env))return;
 const row=await env.DB.prepare("SELECT data FROM records WHERE id='reminders' AND kind='settings'").first(),config=row?JSON.parse(row.data):null;
 if(!config?.enabled)return;
 const records=(await env.DB.prepare('SELECT * FROM records').all()).results.map(r=>({...JSON.parse(r.data),id:r.id,kind:r.kind}));
 const users=(await env.DB.prepare('SELECT id,email FROM users WHERE active=1').all()).results.filter(u=>config.recipientIds?.includes(u.id));
 const until=new Date(now+config.days*86400000).toISOString().slice(0,10),day=new Date(now).toISOString().slice(0,10);
 for(const u of users){const grant=await env.DB.prepare('SELECT data FROM external_access WHERE user_id=?').bind(u.id).first(),access=grant?JSON.parse(grant.data):null;if(access&&(access.revoked||access.expires<now))continue;
  const visible=visibleRecords(records,access,u.id),lines=[];
  for(const a of visible.filter(r=>r.kind==='assets'&&!r.archived)){for(const i of currentInspections(a,visible))if(i.nextDate&&i.nextDate<=until)lines.push(`${a.code} · ${i.type==='monthly'?'Monatsprüfung':'Jahreswartung'} · fällig ${i.nextDate}`);}
  if(!lines.length)continue;
  const id='due:'+day+':'+u.id;
  const claim=await env.DB.prepare("INSERT INTO email_deliveries VALUES (?,'sending',?,NULL) ON CONFLICT(id) DO UPDATE SET status='sending',lease_until=excluded.lease_until WHERE email_deliveries.status<>'sent' AND email_deliveries.lease_until<?").bind(id,now+900000,now).run();
  if(!claim.meta.changes)continue;
  try{await sendMail(env,u.email,'Augenblick: Fällige Prüfungen',lines.join('\n')+'\n\nArbeitsbereich: '+env.APP_URL);await env.DB.prepare("UPDATE email_deliveries SET status='sent',sent_at=? WHERE id=?").bind(new Date(now).toISOString(),id).run();}
  catch{await env.DB.prepare("UPDATE email_deliveries SET status='failed',lease_until=? WHERE id=?").bind(now+900000,id).run();}
 }
}
