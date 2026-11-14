// Supabase Edge Function: razorpay-webhook
// Required secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RAZORPAY_WEBHOOK_SECRET
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes)).map((x) => x.toString(16).padStart(2, '0')).join('');

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const raw = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';
    const eventId = req.headers.get('x-razorpay-event-id') || '';
    const secret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') || '';
    if (!secret || !signature || !eventId ||
      !safeEqual(await hmac(secret, raw), signature)) {
      return new Response('Invalid signature', { status: 401 });
    }

    const event = JSON.parse(raw);
    const eventType = String(event.event || '');
    if (!['payment.captured', 'payment.failed'].includes(eventType)) {
      return new Response('Ignored', { status: 200 });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const payment = event.payload?.payment?.entity;
    if (!payment?.order_id) return new Response('Missing order', { status: 400 });

    const { data: sub, error: findError } = await admin
      .from('customer_subscriptions')
      .select('id,amount_paise,currency,status')
      .eq('razorpay_order_id', payment.order_id)
      .maybeSingle();
    if (findError || !sub) return new Response('Order not found', { status: 404 });

    if (eventType === 'payment.captured') {
      if (Number(payment.amount) !== sub.amount_paise ||
        payment.currency !== sub.currency || !payment.id) {
        return new Response('Amount or currency mismatch', { status: 400 });
      }
      const { error } = await admin.rpc('activate_customer_subscription', {
        p_order_id: payment.order_id,
        p_payment_id: payment.id,
        p_amount_paise: Number(payment.amount),
        p_currency: payment.currency
      });
      if (error) return new Response('Subscription activation failed; provider may retry', { status: 500 });
    } else if (sub.status === 'created') {
      const { error } = await admin.from('customer_subscriptions')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', sub.id).eq('status', 'created');
      if (error) return new Response('Payment status update failed', { status: 500 });
    }

    // Record the event only after the corresponding state transition succeeds.
    const { error: eventError } = await admin.from('payment_webhook_events')
      .insert({ event_id: eventId, event_type: eventType });
    if (eventError && eventError.code !== '23505') {
      return new Response('Event persistence failed; provider may retry', { status: 500 });
    }
    return new Response('ok', { status: 200 });
  } catch (_error) {
    return new Response('Webhook processing error', { status: 500 });
  }
});
