import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase-config.js';
const supabase=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);
const authPanel=$('authPanel'),dashboard=$('dashboard');
function status(message){$('authStatus').textContent=message}
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function loadProfiles(){
 $('dataStatus').textContent='Loading directory…';
 const {data,error}=await supabase.from('business_profiles').select('id,business_name,owner_name,category,city,slug,is_published,created_at').order('created_at',{ascending:false}).limit(500);
 if(error){$('dataStatus').textContent=error.message;$('rows').innerHTML='<tr><td colspan="7">Unable to load profiles. Check migration and admin membership.</td></tr>';return}
 const profiles=data||[],published=profiles.filter(p=>p.is_published).length;
 $('total').textContent=profiles.length;$('published').textContent=published;$('drafts').textContent=profiles.length-published;
 $('rows').innerHTML=profiles.length?profiles.map(p=>'<tr><td><strong>'+esc(p.business_name)+'</strong></td><td>'+esc(p.owner_name)+'</td><td>'+esc(p.category)+'</td><td>'+esc(p.city)+'</td><td><a href="profile.html?slug='+encodeURIComponent(p.slug)+'">'+esc(p.slug)+'</a></td><td><span class="pill">'+(p.is_published?'Published':'Draft')+'</span></td><td>'+new Date(p.created_at).toLocaleDateString()+'</td></tr>').join(''):'<tr><td colspan="7">No business profiles found.</td></tr>';
 $('dataStatus').textContent='Showing '+profiles.length+' profiles (maximum 500). QR scans and billing metrics are not yet instrumented.';
}
async function renderSession(){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session){authPanel.hidden=false;dashboard.hidden=true;return}
 const {data:admin,error}=await supabase.from('platform_admins').select('user_id').eq('user_id',session.user.id).maybeSingle();
 if(error||!admin){await supabase.auth.signOut();authPanel.hidden=false;dashboard.hidden=true;status('This account is not provisioned as a platform administrator.');return}
 authPanel.hidden=true;dashboard.hidden=false;$('identity').textContent='Signed in: '+session.user.email;await loadProfiles();
}
$('signIn').addEventListener('click',async()=>{status('Signing in…');const {error}=await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){status(error.message);return}await renderSession()});
$('signOut').addEventListener('click',async()=>{await supabase.auth.signOut();await renderSession()});
$('refresh').addEventListener('click',loadProfiles);
supabase.auth.onAuthStateChange(()=>{renderSession()});
renderSession();
