import {maintainAllWorkspaces} from './scheduled.js';
import {api} from './api.js';
export default {
  async fetch(request,env) {
    if(new URL(request.url).pathname.startsWith('/api/'))return api(request,env);
    const response=await env.ASSETS.fetch(request);
    const headers=new Headers(response.headers);
    headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','no-referrer');
    headers.set('X-Frame-Options','DENY');
    headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; frame-src 'self' blob:; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
    return new Response(response.body,{status:response.status,headers});
  },
  async scheduled(_event,env) {
    await maintainAllWorkspaces(env);
  }
};
