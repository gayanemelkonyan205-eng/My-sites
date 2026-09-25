import { sb } from './supabase-client.js';
import { syncPushIfAllowed } from './push-client.js?v=7';

// Permission already granted by the user is enough to link this browser after login.
// This never opens a permission prompt and preserves an explicit site opt-out.
function sync(){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  syncPushIfAllowed().catch(error=>console.warn('Push sync failed:',error));
}

setTimeout(sync,0);
sb.auth.onAuthStateChange((event,session)=>{
  if(session?.user&&['SIGNED_IN','TOKEN_REFRESHED'].includes(event))setTimeout(sync,0);
});
