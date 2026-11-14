// Supabase Edge Function: razorpay-webhook
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAZORPAY_WEBHOOK_SECRET
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const hex=b=>Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,'0')).join('');
async function hmac(secret,data){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(data)))}
function safeEqual(a,b){if(a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 try{
  const raw=await req.text(),signature=req.headers.get('x-razorpay-signature')||'',eventId=req.headers.get('x-razorpay-event-id')||'';
  const secret=Deno.env.get('RAZORPAY_WEBHOOK_SECRET')!;if(!signature||!eventId||!safeEqual(await hmac(secret,raw),signature))return new Response('Invalid signature',{status:401});
  const event=JSON.parse(raw),eventType=String(event.event||'');
  if(!['payment.captured','payment.failed'].includes(eventType))return new Response('Ignored',{status:200});
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const payment=event.payload?.payment?.entity;if(!payment?.order_id)return new Response('Missing order',{status:400});
  const {data:sub,error:findError}=await admin.from('customer_subscriptions').select('id,plan_code,profile_id,amount_paise').eq('razorpay_order_id',payment.order_id).maybeSingle();
  if(findError||!sub)return new Response('Order not found',{status:404});
  const {error:dedupeError}=await admin.from('payment_webhook_events').insert({event_id:eventId,event_type:eventType});
  if(dedupeError){if(dedupeError.code==='23505')return new Response('Duplicate',{status:200});return new Response('Event persistence failed',{status:500})}
  if(eventType==='payment.captured'){
   if(Number(payment.amount)!==sub.amount_paise||payment.currency!=='INR')return new Response('Amount mismatch',{status:400});
   const {data:plan}=await admin.from('subscription_plans').select('duration_days').eq('code',sub.plan_code).single();
   const start=new Date(),end=new Date(start.getTime()+Number(plan.duration_days)*86400000);
   const {error}=await admin.from('customer_subscriptions').update({status:'paid',razorpay_payment_id:payment.id,starts_at:start.toISOString(),ends_at:end.toISOString()}).eq('id',sub.id);
   if(error){await admin.from('payment_webhook_events').delete().eq('event_id',eventId);return new Response('Subscription update failed',{status:500})}
  }else{
   const {error}=await admin.from('customer_subscriptions').update({status:'failed'}).eq('id',sub.id);
   if(error){await admin.from('payment_webhook_events').delete().eq('event_id',eventId);return new Response('Payment status update failed',{status:500})}
  }
  return new Response('ok',{status:200});
 }catch(_){return new Response('Webhook processing error',{status:500})}
});
