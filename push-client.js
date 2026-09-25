import { sb } from './supabase-client.js';

// The signing key is server-side. A browser may have only one subscription for this worker.
const VAPID_PUBLIC_KEY='BMzIze7g8jb3E54_dmAtsvTyIUQ3M6L-__s_2cx2qexhDR2i13iP-YLG6LpwS1WiRmJcd05-OjIs8VMMBJs627Y';
const OPT_OUT_PREFIX='class-portal-push-disabled:';
let syncing=null;

function supported(){
  return globalThis.isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
}

function optedOut(userId){
  try{return localStorage.getItem(OPT_OUT_PREFIX+userId)==='1'}catch{return false}
}

function rememberOptOut(userId,disabled){
  if(!userId)return;
  try{if(disabled)localStorage.setItem(OPT_OUT_PREFIX+userId,'1');else localStorage.removeItem(OPT_OUT_PREFIX+userId)}catch{}
}

function decodeBase64Url(value){
  const padded=value+'='.repeat((4-value.length%4)%4);
  const raw=atob(padded.replace(/-/g,'+').replace(/_/g,'/'));
  return Uint8Array.from(raw,char=>char.charCodeAt(0));
}

async function existingRegistration(){
  return navigator.serviceWorker.getRegistration(new URL('./',location.href).href);
}

async function currentUser(){
  const {data,error}=await sb.auth.getUser();
  if(error||!data?.user)throw error||new Error('Sign in required');
  return data.user;
}

export async function getPushStatus(){
  if(!supported())return 'unsupported';
  if(Notification.permission==='denied')return 'denied';
  if(Notification.permission!=='granted')return 'permission_required';
  const user=await currentUser();
  if(optedOut(user.id))return 'disabled';
  const registration=await existingRegistration();
  const subscription=await registration?.pushManager?.getSubscription();
  if(!subscription)return 'disabled';
  const {data,error}=await sb.from('push_subscriptions').select('id').eq('endpoint',subscription.endpoint).eq('user_id',user.id).maybeSingle();
  if(error)throw error;
  return data?'enabled':'disabled';
}

async function syncPush(force){
  if(!supported()||Notification.permission!=='granted')return false;
  const user=await currentUser();
  if(!force&&optedOut(user.id))return false;
  const registration=await navigator.serviceWorker.register('./sw.js?v=3',{scope:'./'});
  let subscription=await registration.pushManager.getSubscription();
  if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeBase64Url(VAPID_PUBLIC_KEY)});
  const json=subscription.toJSON();
  if(!json.endpoint||!json.keys?.p256dh||!json.keys?.auth)throw new Error('Invalid push subscription');
  const {data,error}=await sb.rpc('claim_push_subscription',{
    p_endpoint:json.endpoint,p_p256dh:json.keys.p256dh,p_auth:json.keys.auth,p_user_agent:navigator.userAgent
  });
  if(error||data!==true)throw error||new Error('Could not link push subscription to this account');
  rememberOptOut(user.id,false);
  window.dispatchEvent(new Event('portal:push-synced'));
  return true;
}

export function syncPushIfAllowed(options={}){
  if(syncing)return options.force===true?syncing.then(result=>result||syncPush(true)):syncing;
  syncing=syncPush(options.force===true).finally(()=>{syncing=null});
  return syncing;
}

export async function enablePush(){
  if(!supported())throw new Error('Push is unsupported');
  if(Notification.permission==='denied')throw new Error('Push permission denied');
  // Only the Settings button may ask for browser permission.
  const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
  if(permission!=='granted')return false;
  return syncPushIfAllowed({force:true});
}

export async function disablePush(options={}){
  if(!supported())return false;
  let user=null;
  if(options.rememberChoice!==false)try{user=await currentUser()}catch{}
  const registration=await existingRegistration();
  const subscription=await registration?.pushManager?.getSubscription();
  if(subscription&&await subscription.unsubscribe()!==true)throw new Error('Could not unsubscribe browser push');
  if(options.rememberChoice!==false)rememberOptOut(user?.id,true);
  if(!subscription)return true;
  if(options.skipServerDelete!==true){
    if(!user)try{user=await currentUser()}catch{}
  }
  if(user&&options.skipServerDelete!==true){
    const {error}=await sb.from('push_subscriptions').delete().eq('endpoint',subscription.endpoint).eq('user_id',user.id);
    if(error)console.warn('Could not remove old push endpoint:',error);
  }
  return true;
}
