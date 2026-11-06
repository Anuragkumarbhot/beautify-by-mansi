import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';

const configured =
  /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL) &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_ANON_KEY.includes('YOUR_');

const client = configured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  : null;

const cloud = {
  configured,
  async getSession() {
    if (!client) return null;
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  },
  async signIn(email, password) {
    if (!client) throw new Error('Supabase is not configured yet.');
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.session;
  },
  async signOut() {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },
  onAuthStateChange(callback) {
    if (!client) return () => {};
    const { data } = client.auth.onAuthStateChange((_event, session) => callback(session));
    return () => data.subscription.unsubscribe();
  },
  async createBooking(booking) {
    if (!client) throw new Error('Cloud booking is not configured.');
    const row = {
      customer_name: booking.name,
      customer_phone: booking.phone,
      event_type: booking.event,
      event_date: booking.date,
      preferred_time: booking.time,
      service_location: booking.location,
      nail_style: booking.shade || '',
      notes: booking.notes || '',
      services: booking.services || [],
      regular_total: booking.regularTotal,
      savings: booking.savings,
      offer_total: booking.offerTotal,
      advance: booking.advance,
      balance: booking.balance,
      status: 'New'
    };
    const { data, error } = await client.from('bookings').insert(row).select('id,created_at,status').single();
    if (error) throw error;
    return data;
  },
  async listBookings() {
    if (!client) throw new Error('Cloud booking is not configured.');
    const { data, error } = await client.from('bookings').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async updateBooking(id, status) {
    const allowed = ['New', 'Contacted', 'Confirmed', 'Completed', 'Cancelled'];
    if (!allowed.includes(status)) throw new Error('Invalid booking status.');
    const { error } = await client.from('bookings').update({ status }).eq('id', id);
    if (error) throw error;
  },
  async deleteBooking(id) {
    const { error } = await client.from('bookings').delete().eq('id', id);
    if (error) throw error;
  }
};

window.BeautifyCloud = cloud;
window.dispatchEvent(new CustomEvent('beautify-cloud-ready'));
