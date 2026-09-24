import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../supabase-client.js',import.meta.url),'utf8');
const key=source.match(/sb_publishable_[\w-]+/)[0];
const base='https://yknzcvooglrsvyidestj.supabase.co';
const settings=await fetch(`${base}/auth/v1/settings`,{headers:{apikey:key},signal:AbortSignal.timeout(15000)});
const data=await settings.json();
console.log(JSON.stringify({authStatus:settings.status,emailEnabled:data.external?.email,googleEnabled:data.external?.google,signupDisabled:data.disable_signup,emailConfirmationRequired:!data.mailer_autoconfirm}));
for(const table of ['profiles','messages','system_secrets']){
  const response=await fetch(`${base}/rest/v1/${table}?select=*&limit=1`,{headers:{apikey:key},signal:AbortSignal.timeout(15000)});
  const body=await response.json();
  const denied=response.status===401||response.status===403||(table==='system_secrets'&&response.status===404)||(response.ok&&Array.isArray(body)&&body.length===0);
  console.log(JSON.stringify({table,status:response.status,anonymousAccessDenied:denied}));
  if(!denied)process.exitCode=1;
}
