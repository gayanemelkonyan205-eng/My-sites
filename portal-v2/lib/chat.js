import { sb } from './supabase.js';

export function normalizeMessageBody(value){
  const body=String(value??'').trim();
  return body?body:null;
}

export async function sendMessage({conversationId,userId,body}){
  const normalized=normalizeMessageBody(body);
  if(!normalized)return {data:null,error:new Error('EMPTY_MESSAGE')};
  const result=await sb.from('messages').insert({conversation_id:conversationId,sender_id:userId,type:'TEXT',body:normalized}).select('id,conversation_id,sender_id,body,created_at').single();
  return result;
}

export async function loadMessages(conversationId){
  return sb.from('messages').select('*,sender:profiles(first_name,last_name,username)').eq('conversation_id',conversationId).is('deleted_at',null).order('created_at').limit(200);
}

export function subscribeToConversation(conversationId,onInsert){
  const channel=sb.channel(`v2-messages-${conversationId}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages',filter:`conversation_id=eq.${conversationId}`},onInsert).subscribe();
  return ()=>sb.removeChannel(channel);
}
