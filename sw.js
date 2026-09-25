const APP_SCOPE='/My-sites/';
const CACHE_NAME='class-portal-shell-v3';

function toPortalUrl(raw){
  const home=new URL(APP_SCOPE,self.location.origin);
  if(!raw)return home.href;
  try{
    const candidate=new URL(raw,self.location.origin);
    if(candidate.origin!==self.location.origin)return home.href;
    if(candidate.pathname==='/chat'){
      const conversation=candidate.searchParams.get('conversation');
      if(conversation){
        home.searchParams.set('push','chat');
        home.searchParams.set('conversation',conversation);
      }
      return home.href;
    }
    if(candidate.pathname.startsWith(APP_SCOPE))return candidate.href;
    return home.href;
  }catch{return home.href}
}

self.addEventListener('install',event=>event.waitUntil((async()=>{
  try{
    const cache=await caches.open(CACHE_NAME);
    const response=await fetch(APP_SCOPE,{cache:'no-store'});
    if(response.ok)await cache.put(APP_SCOPE,response);
  }catch{}
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names.filter(name=>name.startsWith('class-portal-shell-')&&name!==CACHE_NAME).map(name=>caches.delete(name)));
  await self.clients.claim();
})()));

// Only the portal document is cached. API, auth and Supabase requests always use the network.
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||request.mode!=='navigate')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(APP_SCOPE))return;
  if(url.searchParams.has('code')||url.searchParams.has('access_token')||url.searchParams.has('error'))return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(request);
      if(response.ok){
        const cache=await caches.open(CACHE_NAME);
        await cache.put(APP_SCOPE,response.clone());
      }
      return response;
    }catch{
      return (await caches.match(APP_SCOPE))||Response.error();
    }
  })());
});

self.addEventListener('push',event=>{
  let data={title:'9Ա դասարան',body:'Նոր ծանուցում',url:APP_SCOPE};
  try{data={...data,...event.data?.json()}}catch{}
  event.waitUntil(self.registration.showNotification(data.title,{
    body:data.body||'',
    tag:data.tag||undefined,
    renotify:false,
    icon:`${APP_SCOPE}app-icon.svg`,
    badge:`${APP_SCOPE}app-icon.svg`,
    data:{url:toPortalUrl(data.url)}
  }));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=toPortalUrl(event.notification.data?.url);
  event.waitUntil((async()=>{
    const list=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of list){
      if(new URL(client.url).pathname.startsWith(APP_SCOPE)){
        if('navigate' in client)await client.navigate(target);
        if('focus' in client)return client.focus();
      }
    }
    return self.clients.openWindow?self.clients.openWindow(target):undefined;
  })());
});
