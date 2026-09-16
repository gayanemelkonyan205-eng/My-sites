import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4?bundle';

export const SUPABASE_URL='https://yknzcvooglrsvyidestj.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY='sb_publishable_BntzoD9F20GkbI5A0yhmQw_1Z5-WrtJ';

export const sb=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
});
