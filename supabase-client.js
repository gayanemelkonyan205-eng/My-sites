const withTimeout=(promise,ms,label)=>Promise.race([
  promise,
  new Promise((_,reject)=>setTimeout(()=>reject(new Error(`${label} timed out`)),ms))
]);

let createClient;
const sources=[
  ['jsDelivr',()=>import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/+esm')],
  ['esm.sh',()=>import('https://esm.sh/@supabase/supabase-js@2.57.4?bundle')],
  ['unpkg',()=>import('https://unpkg.com/@supabase/supabase-js@2.57.4/dist/module/index.js')]
];
let lastError=null;
for(const [name,load] of sources){
  try{
    ({createClient}=await withTimeout(load(),4500,name));
    if(createClient)break;
  }catch(error){
    lastError=error;
    console.warn(`[Supabase] ${name} failed`,error);
  }
}
if(!createClient)throw lastError||new Error('Supabase client failed to load');

export const AUTH_STORAGE_KEY='sb-yknzcvooglrsvyidestj-auth-token';

export function clearLocalAuthSession(){
  try{localStorage.removeItem(AUTH_STORAGE_KEY)}
  catch(error){console.warn('Could not clear local auth storage:',error)}
}

export const sb=createClient(
  'https://yknzcvooglrsvyidestj.supabase.co',
  'sb_publishable_BntzoD9F20GkbI5A0yhmQw_1Z5-WrtJ',
  {
    auth:{
      storageKey:AUTH_STORAGE_KEY,
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:true,
      flowType:'pkce'
    },
    global:{fetch:async(url,options={})=>{
      const controller=new AbortController();
      const abort=()=>controller.abort();
      const upload=/\/storage\/v1\/object\//.test(String(url))&&['POST','PUT'].includes(options.method);
      const timer=setTimeout(abort,upload?120000:10000);
      if(options.signal?.aborted)abort();
      else options.signal?.addEventListener('abort',abort,{once:true});
      try{
        const response=await fetch(url,{...options,signal:controller.signal});
        if(!response.body)return response;
        const body=await response.arrayBuffer();
        return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});
      }finally{
        clearTimeout(timer);
        options.signal?.removeEventListener('abort',abort);
      }
    }}
  }
);
