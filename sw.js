self.addEventListener('push',event=>{
  let data={title:'9Ա դասարան',body:'Նոր ծանուցում',url:'./'};
  try{data={...data,...event.data?.json()}}catch{}
  event.waitUntil(self.registration.showNotification(data.title,{
    body:data.body||'',
    tag:data.tag||undefined,
    renotify:false,
    data:{url:data.url||'./'}
  }));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'./',self.location.origin).href;
  event.waitUntil((async()=>{
    const clientsList=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of clientsList){
      if('focus' in client){
        if('navigate' in client)await client.navigate(target);
        return client.focus();
      }
    }
    return clients.openWindow?clients.openWindow(target):undefined;
  })());
});
