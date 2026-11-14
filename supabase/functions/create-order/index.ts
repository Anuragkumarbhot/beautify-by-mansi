// Supabase Edge Function: create-order
// Required secrets: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
// RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'Method not allowed'},405);
 try{
  const url=Deno.env.get('SUPABASE_URL')!,anon=Deno.env.get('SUPABASE_ANON_KEY')!,service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const auth=req.headers.get('Authorization');if(!auth)return json({error:'Authentication required'},401);
  const userClient=createClient(url,anon,{global:{headers:{Authorization:auth}}});
  const {data:{user},error:userError}=await userClient.auth.getUser();if(userError||!user)return json({error:'Invalid session'},401);
  const body=await req.json();const profileId=String(body.profile_id||'');const planCode=String(body.plan_code||'');
  if(!/^[0-9a-f-]{36}$/i.test(profileId)||!/^[a-z0-9_-]{2,40}$/.test(planCode))return json({error:'Invalid profile or plan'},400);
  const admin=createClient(url,service);
  const [{data:profile,error:profileError},{data:plan,error:planError}]=await Promise.all([
   admin.from('business_profiles').select('id,owner_id').eq('id',profileId).maybeSingle(),
   admin.from('subscription_plans').select('code,name,amount_paise,currency,duration_days').eq('code',planCode).eq('active',true).maybeSingle()
  ]);
  if(profileError||!profile||profile.owner_id!==user.id)return json({error:'Profile not found or not owned by this account'},403);
  if(planError||!plan)return json({error:'Plan unavailable'},404);
  const keyId=Deno.env.get('RAZORPAY_KEY_ID')!,keySecret=Deno.env.get('RAZORPAY_KEY_SECRET')!;
  const basic=btoa(keyId+':'+keySecret);
  const rp=await fetch('https://api.razorpay.com/v1/orders',{method:'POST',headers:{Authorization:'Basic '+basic,'Content-Type':'application/json'},body:JSON.stringify({amount:plan.amount_paise,currency:plan.currency,receipt:'bm_'+crypto.randomUUID().replaceAll('-','').slice(0,20),notes:{user_id:user.id,profile_id:profile.id,plan_code:plan.code}})});
  const order=await rp.json();if(!rp.ok)return json({error:'Payment provider could not create order'},502);
  const {error:insertError}=await admin.from('customer_subscriptions').insert({owner_id:user.id,profile_id:profile.id,plan_code:plan.code,razorpay_order_id:order.id,amount_paise:plan.amount_paise,currency:plan.currency,status:'created'});
  if(insertError)return json({error:'Could not save payment order'},500);
  return json({order_id:order.id,amount:order.amount,currency:order.currency,key_id:keyId,plan_name:plan.name});
 }catch(_){return json({error:'Unexpected server error'},500)}
});
