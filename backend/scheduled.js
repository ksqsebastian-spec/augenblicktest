import {sendReminders} from './email.js';
import {taskSla} from '../src/advanced-data.js';
export async function maintainWorkspace(env,now=Date.now()){
 const tasks=(await env.DB.prepare("SELECT id,data,version FROM records WHERE kind='tasks'").all()).results;
 for(const row of tasks){const t=JSON.parse(row.data);if(t.escalatedAt||!taskSla(t,now).breached)continue;
  const at=new Date(now).toISOString();
  const r=await env.DB.prepare('UPDATE records SET data=?,version=version+1,updated=? WHERE id=? AND version=?').bind(JSON.stringify({...t,escalatedAt:at}),at,row.id,row.version).run();
  if(r.meta.changes)await env.DB.prepare('INSERT INTO audit VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),'System','SLA überschritten',row.id,at).run();
 }
 await sendReminders(env,now);
 await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires<?').bind(now),env.DB.prepare('DELETE FROM attempts WHERE expires<?').bind(now),env.DB.prepare('DELETE FROM invites WHERE expires<?').bind(now)]);
}
