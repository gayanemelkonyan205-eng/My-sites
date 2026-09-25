import { sb } from './supabase-client.js';

// Public VAPID key only. The signing key stays on the server.
const VAPID_PUBLIC_KEY='BMzIze7g8jb3E54_dmAtsvTyIUQ3M6L-__s_2cx2qexhDR2i13iP-YLG6LpwS1WiRmJcd05-OjIs8VMMBJs627Y';

function supported(){
  return globalThis.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
}

function decodeBase64Url(value){
  const padded=value+'='.repeat((4-value.length%4)%4);
  const raw=atob(padded.replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from(raw,char=>char.charCodeAt(0));
}

async function existingRegistration(){
  return navigator.serviceWorker.getRegistration(new URL('./',location.href).href);
}

export async function getPushStatus(){
  if(!supported())return 'unsupported';
  if(Notification.permission==='denied')return 'denied';
  if(Notification.permission!=='granted')return 'permission_required';
  const registration=await existingRegistration();
  const subscription=await registration?.pushManager?.getSubscription();
  if(!subscription)return 'disabled';
  const {data,error}=await sb.from('push_subscriptions').select('id').eq('endpoint',subscription.endpoint).maybeSingle();
  if(error)throw error;
  return data?'enabled':'disabled';
}

export async function enablePush(){
  if(!supported())throw new Error('Push is unsupported');
  if(Notification.permission==='denied')throw new Error('Push permission denied');
  // This function is called directly by the Settings button, preserving the user gesture.
  const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
  if(permission!=='granted')return false;
  const {data:{user},error:userError}=await sb.auth.getUser();
  if(userError||!user)throw userError||new Error('Sign in required');
  const registration=await navigator.serviceWorker.register('./sw.js?v=3',{scope:'./'});
  let subscription=await registration.pushManager.getSubscription();
  if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeBase64Url(VAPID_PUBLIC_KEY)});
  const json=subscription.toJSON();
  if(!json.endpoint||!json.keys?.p256dh||!json.keys?.auth)throw new Error('Invalid push subscription');
  const {error}=await sb.from('push_subscriptions').upsert({user_id:user.id,endpoint:json.endpoint,p256dh:json.keys.p256dh,auth:json.keys.auth,user_agent:navigator.userAgent,updated_at:new Date().toISOString()},{onConflict:'endpoint'});
  if(error)throw error;
  return true;
}

export async function disablePush(){
  if(!supported())return false;
  const registration=await existingRegistration();
  const subscription=await registration?.pushManager?.getSubscription();
  if(!subscription)return true;
  const {error}=await sb.from('push_subscriptions').delete().eq('endpoint',subscription.endpoint);
  if(error)throw error;
  await subscription.unsubscribe();
  return true;
}
