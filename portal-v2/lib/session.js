import { sb } from './supabase.js';

export async function loadIdentity(){
  const {data:{session},error:sessionError}=await sb.auth.getSession();
  if(sessionError)throw sessionError;
  if(!session)return {session:null,profile:null};
  const {data,error}=await sb.rpc('get_my_profile');
  if(error)throw error;
  const profile=Array.isArray(data)?data[0]:data;
  return {session,profile:profile||null};
}

export async function signOut(){
  await sb.auth.signOut();
  location.reload();
}
