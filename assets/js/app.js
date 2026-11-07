const STORAGE_KEY = 'beautify_by_mansi_state_v1';

const DEFAULT_STATE = {
    studio: {
        brandName: 'Beautify by Mansi',
        tagline: 'Makeup • Hair • Nail Extensions • Festive Glam',
        whatsappPhone: '919877339755',
        displayPhone: '+91 98773 39755',
        location: 'Studio & Venue Service Available',
        seasonBadge: 'Karwa Chauth • Diwali • Wedding Season Special Offers'
    },
    selectedShade: 'Maroon & Silver Festive Glam',
    selectedPackageIds: ['party-hd', 'nails-presson'],
    activeCategory: 'all',
    searchQuery: '',
    bookings: [],
    packages: [
        // 1. FESTIVE & PARTY MAKEUP (4)
        {
            id: 'party-glow',
            category: 'party',
            categoryTitle: '💄 Festive & Party Makeup',
            name: 'Classic Festive Glow Makeup',
            badge: 'Karwa Chauth Hit',
            price: 1999,
            originalPrice: 2800,
            description: 'Flawless soft-glam festive base with basic hairstyling (curls/straightening) and saree/dupatta draping.',
            features: ['Kryolan / Forever52 HD Base', 'Basic Hairstyling Included', 'Complimentary Lash Application']
        },
        {
            id: 'party-hd',
            category: 'party',
            categoryTitle: '💄 Festive & Party Makeup',
            name: 'Signature High-Definition (HD) Glam',
            badge: 'Bestseller',
            price: 2999,
            originalPrice: 4200,
            description: 'Camera-ready international HD makeup (MAC / Huda Beauty) with pro hairdo and complete outfit draping.',
            features: ['MAC / Huda / NARS Products', 'Advanced Bun / Hollywood Waves', '3D Mink Lashes & Lens Assist']
        },
        {
            id: 'party-airbrush',
            category: 'party',
            categoryTitle: '💄 Festive & Party Makeup',
            name: 'Luxury Waterproof Airbrush Party Glam',
            badge: 'Sweat-Proof 16 Hrs',
            price: 4499,
            originalPrice: 6000,
            description: 'Ultra-lightweight silicon airbrush finish ideal for humid wedding nights, cocktail parties & receptions.',
            features: ['Temptu / Dinair Airbrush', 'Textured Messy Braid or Updo', 'Zero Transfer & Waterproof']
        },
        {
            id: 'party-group',
            category: 'party',
            categoryTitle: '💄 Festive & Party Makeup',
            name: 'Family / Group Festive Glam (Per Person)',
            badge: 'Min. 3 Bookings',
            price: 2499,
            originalPrice: 3500,
            description: 'Special group rate for sisters, mothers & bridesmaids booking together for the same event date.',
            features: ['Full HD Makeup & Hairstyling', 'Free Venue Travel (3+ Pax)', 'Draping & Eyelashes Included']
        },

        // 2. PRE-WEDDING & BRIDAL (4)
        {
            id: 'bridal-haldi',
            category: 'bridal',
            categoryTitle: '👰 Pre-Wedding & Bridal Packages',
            name: 'Haldi / Mehndi Dewy Floral Look',
            badge: 'Pre-Wedding',
            price: 4999,
            originalPrice: 6800,
            description: 'Fresh glass-skin dewy finish paired with customized floral braid or bohemian hairstyle.',
            features: ['Glass-Skin Dewy Prep', 'Boho Braid & Floral Setting', 'Water-Resistant Base']
        },
        {
            id: 'bridal-roka',
            category: 'bridal',
            categoryTitle: '👰 Pre-Wedding & Bridal Packages',
            name: 'Roka / Engagement / Sagan Royal Look',
            badge: 'Most Booked',
            price: 7999,
            originalPrice: 10500,
            description: 'High-glam engagement look with sculpted contour, shimmering eye art, luxury hairdo & jewelry setting.',
            features: ['Charlotte Tilbury / NARS Base', 'Intricate Hairdo + Extensions Assist', 'Premium Faux Mink Lashes']
        },
        {
            id: 'bridal-hd',
            category: 'bridal',
            categoryTitle: '👰 Pre-Wedding & Bridal Packages',
            name: 'Signature Royal HD Bridal Package',
            badge: 'Complete Bridal',
            price: 15999,
            originalPrice: 22000,
            description: 'Bespoke traditional or modern HD bridal transformation with double dupatta setting & luxury skin prep.',
            features: ['100% Luxury International Vanity', 'Double Dupatta & Heavy Jewelry Pinning', 'Free Custom Bridal Press-On Nails']
        },
        {
            id: 'bridal-airbrush',
            category: 'bridal',
            categoryTitle: '👰 Pre-Wedding & Bridal Packages',
            name: 'Ultra-Luxury HD Airbrush Bridal Package',
            badge: 'VIP Bridal',
            price: 21999,
            originalPrice: 30000,
            description: 'Tear-proof, 24-hour silicon airbrush bridal mastery with complimentary mother/sister touch-up.',
            features: ['HD Silicon Airbrush Finish', 'Luxury Hydrating Facial Prep', 'Complimentary Bridal Nail Extensions']
        },

        // 3. NAIL ART & PRESS-ONS (3)
        {
            id: 'nails-presson',
            category: 'nails',
            categoryTitle: '💅 Nail Art & Custom Press-On Bar',
            name: 'Custom Festive Press-On Nails Set (10 Nails)',
            badge: 'Flat 38% OFF',
            price: 499,
            originalPrice: 799,
            description: 'Reusable handcrafted luxury press-ons in Maroon & Silver, Dusty Rose, or French Tips with prep kit.',
            features: ['Reusable up to 5 Times', 'Includes Glue Tabs, Liquid Glue & Buffer', 'Custom Sized to Your Fingers']
        },
        {
            id: 'nails-gel',
            category: 'nails',
            categoryTitle: '💅 Nail Art & Custom Press-On Bar',
            name: 'Acrylic / Gel Nail Extensions + Festive Art',
            badge: 'Long Lasting',
            price: 1199,
            originalPrice: 1899,
            description: 'Natural-looking gel or acrylic extensions with 2 accent glitter/foil/chrome art nails per hand.',
            features: ['3–4 Weeks Chip-Free Wear', 'Choice of Almond, Coffin or Square', 'Cuticle Care & Gel Polish Included']
        },
        {
            id: 'nails-bridal3d',
            category: 'nails',
            categoryTitle: '💅 Nail Art & Custom Press-On Bar',
            name: 'Bridal 3D Swarovski & Chrome Extensions',
            badge: 'Bridal Exclusive',
            price: 1699,
            originalPrice: 2499,
            description: 'Bespoke bridal nail extensions featuring French ombre, cat-eye magnetic shimmer, and crystal stones.',
            features: ['Swarovski & Pearl Embellishments', 'Cat-Eye / Chrome / French Ombre', 'High-Strength Builder Gel']
        },

        // 4. EXCLUSIVE COMBOS (2)
        {
            id: 'combo-festive',
            category: 'combos',
            categoryTitle: '🎁 Exclusive Festive Value Combos',
            name: 'Karwa Chauth / Diwali Glam + Press-On Combo',
            badge: 'Super Saver',
            price: 2299,
            originalPrice: 3599,
            description: 'Complete Festive Glow Makeup, Hairstyling, Saree Draping + 1 Custom Festive Press-On Nail Set.',
            features: ['Party Makeup + Hairdo + Draping', '1 Custom Press-On Set Included', 'Free Eyelashes & Instant Application']
        },
        {
            id: 'combo-bridesmaid',
            category: 'combos',
            categoryTitle: '🎁 Exclusive Festive Value Combos',
            name: 'Bridesmaid HD Glam + Gel Nail Extensions',
            badge: 'Save ₹1,901',
            price: 3899,
            originalPrice: 5800,
            description: 'Signature HD Party Makeup & Pro Hairstyling paired with full Gel Nail Extensions & Festive Nail Art.',
            features: ['MAC / Huda HD Makeup & Hairdo', 'Full Gel Extensions + Nail Art', 'Priority Festive Slot Booking']
        }
    ]
};

let appState = loadState();
let cloudAdminBookings = [];
let cloudAdminSession = null;
let cloudBookingsSubscription = null;

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
        const parsed = JSON.parse(raw);
        const savedStudio = { ...DEFAULT_STATE.studio, ...(parsed.studio || {}) };
        // Migrate the previous default studio WhatsApp number to the owner-provided number.
        if (String(savedStudio.whatsappPhone).replace(/\\D/g, '') === '919876543210') {
            savedStudio.whatsappPhone = DEFAULT_STATE.studio.whatsappPhone;
            savedStudio.displayPhone = DEFAULT_STATE.studio.displayPhone;
        }
        return {
            ...JSON.parse(JSON.stringify(DEFAULT_STATE)),
            ...parsed,
            studio: savedStudio
        };
    } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
}

function persistState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (e) {
        console.error('Could not save state:', e);
    }
}


function formatINR(value) {
    const amount = Number(value || 0);
    return window.BeautifyPricing ? window.BeautifyPricing.formatINR(amount) :
        '₹' + amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}
function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function switchAppMode(mode) {
    ['booking','pamphlet','editor','admin'].forEach(key => {
        const view=document.getElementById('view'+key[0].toUpperCase()+key.slice(1));
        const btn=document.getElementById('modeBtn'+key[0].toUpperCase()+key.slice(1));
        if(view) view.classList.toggle('hidden',key!==mode);
        if(btn) btn.classList.toggle('active',key===mode);
    });
    if(mode==='pamphlet') renderPamphletView();
    if(mode==='editor') renderEditorView();
    if(mode==='admin') renderAdminDashboard();
}
function selectNailShade(shade) {
    appState.selectedShade=shade; persistState();
    document.querySelectorAll('.nail-swatch-btn').forEach(b=>b.classList.toggle('selected',b.dataset.shade===shade));
    const el=document.getElementById('selectedShadeLabel'); if(el) el.textContent=shade;
}
function filterCategory(cat) {
    appState.activeCategory=cat;
    document.querySelectorAll('.cat-tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.cat===cat));
    renderPackagesList();
}
function handleSearchPackages(q) { appState.searchQuery=String(q||'').trim().toLowerCase(); renderPackagesList(); }
function togglePackageSelection(id) {
    if(!appState.packages.some(p=>p.id===id)) return;
    const i=appState.selectedPackageIds.indexOf(id);
    if(i>=0) appState.selectedPackageIds.splice(i,1); else appState.selectedPackageIds.push(id);
    persistState(); renderPackagesList(); updateCalculatorSummary();
}
function clearSelectedPackages() { appState.selectedPackageIds=[]; persistState(); renderPackagesList(); updateCalculatorSummary(); }
function getSelectedPackages() { return appState.packages.filter(p=>appState.selectedPackageIds.includes(p.id)); }
function renderPackagesList() {
    const host=document.getElementById('packagesListContainer'); if(!host) return;
    const q=appState.searchQuery;
    const filtered=appState.packages.filter(p=>(appState.activeCategory==='all'||p.category===appState.activeCategory)&&
        (!q||[p.name,p.description,...(p.features||[])].some(x=>String(x).toLowerCase().includes(q))));
    if(!filtered.length) { host.innerHTML='<div class="empty-state">No matching packages. Try another search or category.</div>'; return; }
    const cats=['party','bridal','nails','combos'];
    host.innerHTML=cats.map(cat=>{
        const items=filtered.filter(p=>p.category===cat); if(!items.length) return '';
        return '<section class="package-group"><div class="group-heading"><h3>'+escapeHTML(items[0].categoryTitle)+'</h3><span>'+items.length+' options</span></div><div class="package-grid">'+items.map(p=>{
            const selected=appState.selectedPackageIds.includes(p.id);
            const discount=p.originalPrice>0?Math.max(0,Math.round((p.originalPrice-p.price)/p.originalPrice*100)):0;
            return '<article class="package-card '+(selected?'is-selected':'')+'"><div class="package-top"><span class="package-badge">'+escapeHTML(p.badge)+'</span><span class="discount">Save '+discount+'%</span></div><h4>'+escapeHTML(p.name)+'</h4><p>'+escapeHTML(p.description)+'</p><ul>'+(p.features||[]).map(f=>'<li>✓ '+escapeHTML(f)+'</li>').join('')+'</ul><div class="package-bottom"><div><del>'+formatINR(p.originalPrice)+'</del><strong>'+formatINR(p.price)+'</strong></div><button class="btn '+(selected?'btn-dark':'btn-light')+'" type="button" onclick="togglePackageSelection(\''+escapeHTML(p.id)+'\')">'+(selected?'✓ Selected':'+ Add to booking')+'</button></div></article>';
        }).join('')+'</div></section>';
    }).join('');
}
function updateCalculatorSummary() {
    const selected=getSelectedPackages();
    const totals=window.BeautifyPricing.calculateTotals(selected);
    const list=document.getElementById('selectedPackagesList');
    const count=document.getElementById('selectedCountBadge');
    if(count) count.textContent=selected.length;
    if(list) list.innerHTML=selected.length?selected.map(p=>'<div class="selected-row"><div><b>'+escapeHTML(p.name)+'</b><small><del>'+formatINR(p.originalPrice)+'</del></small></div><strong>'+formatINR(p.price)+'</strong><button aria-label="Remove '+escapeHTML(p.name)+'" onclick="togglePackageSelection(\''+escapeHTML(p.id)+'\')">×</button></div>').join(''):'<p class="muted">Choose packages to build your quote.</p>';
    const early=document.getElementById('earlyBirdCheckbox')?.checked;
    const advance=early?500:0;
    const savings=window.BeautifyPricing.getSavings(totals.regularTotal,totals.offerTotal);
    const ids={calcOriginalTotal:totals.regularTotal,calcTotalSavings:savings,calcFinalTotal:totals.offerTotal};
    Object.entries(ids).forEach(([id,n])=>{const el=document.getElementById(id);if(el)el.textContent=(id==='calcTotalSavings'?'- ':'')+formatINR(n);});
    const advanceEl=document.getElementById('advanceAmount'); if(advanceEl) advanceEl.textContent=formatINR(advance);
    const balance=document.getElementById('balanceAmount'); if(balance) balance.textContent=formatINR(Math.max(0,totals.offerTotal-advance));
    const countLabel=document.getElementById('quotePackageCount'); if(countLabel) countLabel.textContent=selected.length;
}
async function sendWhatsAppBooking() {
    const selected=getSelectedPackages();
    if(!selected.length) { alert('Please select at least one service package.'); return; }
    const name=(document.getElementById('clientNameInput')?.value||'').trim();
    const phone=(document.getElementById('clientPhoneInput')?.value||'').trim();
    const phoneDigits=phone.replace(/\D/g,'');
    const date=(document.getElementById('eventDateInput')?.value||'').trim();
    const event=(document.getElementById('eventTypeInput')?.value||'').trim();
    const time=(document.getElementById('eventTimeInput')?.value||'').trim();
    const location=(document.getElementById('serviceLocationInput')?.value||'').trim();
    const notes=(document.getElementById('bookingNotesInput')?.value||'').trim();
    if(!name) { alert('Please enter your name before booking.'); document.getElementById('clientNameInput')?.focus(); return; }
    if(phoneDigits.length<10||phoneDigits.length>15) { alert('Please enter a valid contact number with 10 to 15 digits.'); document.getElementById('clientPhoneInput')?.focus(); return; }
    if(!event) { alert('Please select or enter your event type.'); document.getElementById('eventTypeInput')?.focus(); return; }
    if(!date) { alert('Please choose your event date.'); document.getElementById('eventDateInput')?.focus(); return; }
    const today=new Date(); today.setHours(0,0,0,0);
    const eventDay=new Date(date+'T00:00:00');
    if(Number.isNaN(eventDay.getTime())||eventDay<today) { alert('Please choose today or a future event date.'); document.getElementById('eventDateInput')?.focus(); return; }
    if(!time) { alert('Please choose a preferred time slot.'); document.getElementById('eventTimeInput')?.focus(); return; }
    if(!location) { alert('Please choose the service location.'); document.getElementById('serviceLocationInput')?.focus(); return; }
    const totals=window.BeautifyPricing.calculateTotals(selected);
    const savings=window.BeautifyPricing.getSavings(totals.regularTotal,totals.offerTotal);
    const advance=document.getElementById('earlyBirdCheckbox')?.checked?500:0;
    const digits=String(appState.studio.whatsappPhone||'').replace(/\D/g,'');
    if(digits.length<10||digits.length>15) { alert('The studio WhatsApp number is not valid. Please update it in Edit Prices & Phone Number.'); return; }
    const whatsappWindow=window.open('about:blank','_blank');
    if(!whatsappWindow) { alert('Please allow pop-ups for this website, then submit the booking request again.'); return; }
    const booking={
        id:'BM-'+Date.now(),
        createdAt:new Date().toISOString(),
        name,phone,event,date,time,location,notes,
        shade:appState.selectedShade,
        services:selected.map(p=>({name:p.name,price:Number(p.price)})),
        regularTotal:totals.regularTotal,
        savings,
        offerTotal:totals.offerTotal,
        advance,
        balance:Math.max(0,totals.offerTotal-advance),
        status:'New'
    };
    if (window.BeautifyCloud?.configured) {
        try {
            const saved = await window.BeautifyCloud.createBooking(booking);
            booking.id = saved.id;
            booking.createdAt = saved.created_at;
            booking.status = saved.status;
        } catch (error) {
            console.error('Cloud booking failed:', error);
            whatsappWindow.close();
            alert('Your booking could not be saved to the cloud. Please try again or contact the studio directly. No booking was recorded.');
            return;
        }
    } else {
        appState.bookings=Array.isArray(appState.bookings)?appState.bookings:[];
        appState.bookings.unshift(booking);
        persistState();
    }
    const lines=['Hello '+appState.studio.brandName+'! I would like to request a booking.','Booking reference: '+booking.id,'Name: '+name,'Customer contact: '+phone,'Event: '+event,'Event date: '+date,'Preferred time: '+time,'Service location: '+location,'Preferred nail style: '+appState.selectedShade,'Additional notes: '+(notes||'None'),'','Requested services:',...selected.map(p=>'• '+p.name+' — '+formatINR(p.price)),'','Regular total: '+formatINR(totals.regularTotal),'Savings: '+formatINR(savings),'Estimated offer total: '+formatINR(totals.offerTotal),'Indicative advance: '+formatINR(advance),'Indicative balance: '+formatINR(Math.max(0,totals.offerTotal-advance)),'','Please confirm slot availability, final pricing and payment instructions. This message is a booking request, not a confirmed appointment.'];
    whatsappWindow.opener=null;
    whatsappWindow.location.href='https://wa.me/'+digits+'?text='+encodeURIComponent(lines.join('\n'));
}
function renderPamphletView() {
    const host=document.getElementById('pamphletContent'); if(!host)return;
    host.innerHTML='<div class="pamphlet-head"><p>'+escapeHTML(appState.studio.seasonBadge)+'</p><h2>'+escapeHTML(appState.studio.brandName)+'</h2><p>'+escapeHTML(appState.studio.tagline)+'</p><small>'+escapeHTML(appState.studio.location)+' · '+escapeHTML(appState.studio.displayPhone)+'</small></div>'+
    ['party','bridal','nails','combos'].map(cat=>{const items=appState.packages.filter(p=>p.category===cat);return items.length?'<section><h3>'+escapeHTML(items[0].categoryTitle)+'</h3>'+items.map(p=>'<div class="pamphlet-item"><span><b>'+escapeHTML(p.name)+'</b><small>'+escapeHTML(p.description)+'</small></span><strong>'+formatINR(p.price)+'</strong></div>').join('')+'</section>':'';}).join('');
}
function renderEditorView() {
    const host=document.getElementById('editorContent'); if(!host)return;
    host.innerHTML='<form id="studioEditorForm" class="editor-form"><h3>Studio details</h3><label>Brand name<input name="brandName" required maxlength="80" value="'+escapeHTML(appState.studio.brandName)+'"></label><label>Tagline<input name="tagline" maxlength="140" value="'+escapeHTML(appState.studio.tagline)+'"></label><label>WhatsApp number (country code + number)<input name="whatsappPhone" inputmode="numeric" required pattern="[0-9+ ]{10,18}" value="'+escapeHTML(appState.studio.whatsappPhone)+'"></label><label>Display phone<input name="displayPhone" value="'+escapeHTML(appState.studio.displayPhone)+'"></label><label>Location<input name="location" value="'+escapeHTML(appState.studio.location)+'"></label><label>Season banner<input name="seasonBadge" value="'+escapeHTML(appState.studio.seasonBadge)+'"></label><button class="btn btn-dark" type="submit">Save studio details</button></form><h3 class="editor-title">Package pricing</h3><div class="price-editor">'+appState.packages.map(p=>'<form class="price-form" data-id="'+escapeHTML(p.id)+'"><b>'+escapeHTML(p.name)+'</b><label>Offer price (₹)<input name="price" type="number" min="0" step="1" required value="'+Number(p.price)+'"></label><label>Regular price (₹)<input name="originalPrice" type="number" min="0" step="1" required value="'+Number(p.originalPrice)+'"></label><button class="btn btn-light" type="submit">Update price</button></form>').join('')+'</div><button class="btn btn-outline" type="button" onclick="resetAppData()">Reset all local edits to defaults</button>';
    document.getElementById('studioEditorForm').addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.currentTarget);for(const k of Object.keys(appState.studio))if(data.has(k))appState.studio[k]=String(data.get(k)).trim();persistState();syncStudioHeader();alert('Studio details saved on this device.');});
    host.querySelectorAll('.price-form').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();const p=appState.packages.find(x=>x.id===form.dataset.id);if(!p)return;const data=new FormData(form);const price=Number(data.get('price')),regular=Number(data.get('originalPrice'));if(!Number.isFinite(price)||!Number.isFinite(regular)||price<0||regular<price){alert('Enter valid prices. Regular price must be at least the offer price.');return;}p.price=price;p.originalPrice=regular;persistState();renderPackagesList();updateCalculatorSummary();alert('Package pricing updated on this device.');}));
}
function normalizeCloudBooking(row) {
    return {
        id: row.id,
        createdAt: row.created_at,
        name: row.customer_name,
        phone: row.customer_phone,
        event: row.event_type,
        date: row.event_date,
        time: row.preferred_time,
        location: row.service_location,
        notes: row.notes,
        shade: row.nail_style,
        services: row.services || [],
        regularTotal: row.regular_total,
        savings: row.savings,
        offerTotal: row.offer_total,
        advance: row.advance,
        balance: row.balance,
        status: row.status
    };
}
async function updateBookingStatus(id,status) {
    const allowed=['New','Contacted','Confirmed','Completed','Cancelled'];
    if(!allowed.includes(status))return;
    if(window.BeautifyCloud?.configured) {
        try { await window.BeautifyCloud.updateBooking(id,status); await renderAdminDashboard(); }
        catch(error) { alert('Could not update booking: '+error.message); }
        return;
    }
    const booking=(appState.bookings||[]).find(b=>b.id===id);
    if(!booking)return;
    booking.status=status;persistState();renderAdminDashboard();
}
async function deleteBooking(id) {
    if(!confirm('Delete this booking record? This cannot be undone.'))return;
    if(window.BeautifyCloud?.configured) {
        try { await window.BeautifyCloud.deleteBooking(id); await renderAdminDashboard(); }
        catch(error) { alert('Could not delete booking: '+error.message); }
        return;
    }
    appState.bookings=(appState.bookings||[]).filter(b=>b.id!==id);
    persistState();renderAdminDashboard();
}
function exportBookingsCSV() {
    const rows=window.BeautifyCloud?.configured?cloudAdminBookings:(appState.bookings||[]);
    if(!rows.length){alert('There are no booking records to export.');return;}
    const cols=['id','createdAt','name','phone','event','date','time','location','services','offerTotal','status','notes'];
    const cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    const csv=[cols.join(','),...rows.map(b=>cols.map(k=>cell(k==='services'?(b.services||[]).map(x=>x.name).join(' | '):b[k])).join(','))].join('\\r\\n');
    const blob=new Blob(['\\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='beautify-bookings.csv';a.click();URL.revokeObjectURL(url);
}
async function renderAdminDashboard() {
    const host=document.getElementById('adminDashboardContent');if(!host)return;
    if(window.BeautifyCloud?.configured) {
        try {
            const session=await window.BeautifyCloud.getSession();
            cloudAdminSession=session;
            if(!session) {
                host.innerHTML='<div class="cloud-login"><h3>Studio administrator sign in</h3><p class="muted">Sign in with the administrator account created in Supabase Authentication.</p><form id="cloudAdminLogin" class="editor-form"><label>Admin email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button class="btn btn-dark" type="submit">Sign in securely</button><p id="cloudLoginError" class="muted" role="alert"></p></form></div>';
                document.getElementById('cloudAdminLogin')?.addEventListener('submit',async e=>{
                    e.preventDefault();const data=new FormData(e.currentTarget);const button=e.currentTarget.querySelector('button');button.disabled=true;button.textContent='Signing in…';
                    try { await window.BeautifyCloud.signIn(String(data.get('email')).trim(),String(data.get('password'))); await renderAdminDashboard(); }
                    catch(error) { const errorHost=document.getElementById('cloudLoginError');if(errorHost)errorHost.textContent='Sign-in failed. Check the email/password and confirm this account is listed in booking_admins.';button.disabled=false;button.textContent='Sign in securely';console.error(error); }
                });
                return;
            }
            cloudAdminBookings=(await window.BeautifyCloud.listBookings()).map(normalizeCloudBooking);
            if(!cloudBookingsSubscription) cloudBookingsSubscription=window.BeautifyCloud.subscribeBookings(()=>{renderAdminDashboard();});
            const rows=cloudAdminBookings;
            const counts=['New','Contacted','Confirmed','Completed','Cancelled'].map(status=>({status,count:rows.filter(b=>b.status===status).length}));
            host.innerHTML='<div class="admin-actions"><p class="muted">Cloud database · signed in as '+escapeHTML(session.user.email||'administrator')+'</p><button class="btn btn-light" type="button" id="cloudSignOut">Sign out</button></div><div class="admin-summary">'+counts.map(x=>'<div class="admin-stat"><span>'+x.status+'</span><strong>'+x.count+'</strong></div>').join('')+'</div><div class="admin-actions"><p class="muted">'+rows.length+' booking record(s) in Supabase.</p><button class="btn btn-outline" type="button" onclick="exportBookingsCSV()">Export CSV</button></div>'+
            (rows.length?'<div class="admin-bookings">'+rows.map(b=>'<article class="admin-booking"><div class="admin-booking-head"><div><b>'+escapeHTML(b.name)+'</b><small>'+escapeHTML(b.id)+' · '+escapeHTML(new Date(b.createdAt).toLocaleString('en-IN'))+'</small></div><strong>'+formatINR(b.offerTotal)+'</strong></div><p>'+escapeHTML(b.event)+' · '+escapeHTML(b.date)+' · '+escapeHTML(b.time)+'</p><p>'+escapeHTML(b.phone)+' · '+escapeHTML(b.location)+'</p><p>'+escapeHTML((b.services||[]).map(x=>x.name).join(', '))+'</p>'+(b.notes?'<p class="muted">Notes: '+escapeHTML(b.notes)+'</p>':'')+'<div class="admin-booking-controls"><label>Status<select aria-label="Booking status" onchange="updateBookingStatus(\''+escapeHTML(b.id)+'\',this.value)">'+['New','Contacted','Confirmed','Completed','Cancelled'].map(st=>'<option'+(b.status===st?' selected':'')+'>'+st+'</option>').join('')+'</select></label><button class="btn btn-light" type="button" onclick="deleteBooking(\''+escapeHTML(b.id)+'\')">Delete</button></div></article>').join('')+'</div>':'<div class="empty-state">No cloud booking requests yet.</div>')+
            '<p class="muted admin-warning">Bookings are stored in Supabase. Only authenticated users added to the booking_admins allow-list can view or manage them.</p>';
            document.getElementById('cloudSignOut')?.addEventListener('click',async()=>{try{if(cloudBookingsSubscription){cloudBookingsSubscription();cloudBookingsSubscription=null;}await window.BeautifyCloud.signOut();await renderAdminDashboard();}catch(error){alert(error.message);}});
        } catch(error) {
            host.innerHTML='<p class="admin-warning" role="alert">Cloud dashboard could not load. Verify the Supabase URL/key, SQL schema and administrator allow-list. '+escapeHTML(error.message)+'</p>';
            console.error(error);
        }
        return;
    }
    const rows=Array.isArray(appState.bookings)?appState.bookings:[];
    const counts=['New','Contacted','Confirmed','Completed','Cancelled'].map(status=>({status,count:rows.filter(b=>b.status===status).length}));
    host.innerHTML='<div class="admin-summary">'+counts.map(x=>'<div class="admin-stat"><span>'+x.status+'</span><strong>'+x.count+'</strong></div>').join('')+'</div>'+
    '<div class="admin-actions"><p class="muted">'+rows.length+' booking record(s) saved in this browser only.</p><button class="btn btn-outline" type="button" onclick="exportBookingsCSV()">Export CSV</button></div>'+
    (rows.length?'<div class="admin-bookings">'+rows.map(b=>'<article class="admin-booking"><div class="admin-booking-head"><div><b>'+escapeHTML(b.name)+'</b><small>'+escapeHTML(b.id)+' · '+escapeHTML(new Date(b.createdAt).toLocaleString('en-IN'))+'</small></div><strong>'+formatINR(b.offerTotal)+'</strong></div><p>'+escapeHTML(b.event)+' · '+escapeHTML(b.date)+' · '+escapeHTML(b.time)+'</p><p>'+escapeHTML(b.phone)+' · '+escapeHTML(b.location)+'</p><p>'+escapeHTML((b.services||[]).map(x=>x.name).join(', '))+'</p>'+(b.notes?'<p class="muted">Notes: '+escapeHTML(b.notes)+'</p>':'')+'<div class="admin-booking-controls"><label>Status<select aria-label="Booking status" onchange="updateBookingStatus(\''+escapeHTML(b.id)+'\',this.value)">'+['New','Contacted','Confirmed','Completed','Cancelled'].map(st=>'<option'+(b.status===st?' selected':'')+'>'+st+'</option>').join('')+'</select></label><button class="btn btn-light" type="button" onclick="deleteBooking(\''+escapeHTML(b.id)+'\')">Delete</button></div></article>').join('')+'</div>':'<div class="empty-state">No booking enquiries saved yet.</div>')+
    '<p class="muted admin-warning">Local-only fallback is active. Configure Supabase to sync bookings across devices.</p>';
}
function syncStudioHeader() {
    const phone=document.getElementById('headerPhoneDisplay');if(phone)phone.textContent=appState.studio.displayPhone||'Book on WhatsApp';
    const loc=document.getElementById('topBarLocation');if(loc)loc.textContent=appState.studio.location;
    const season=document.getElementById('seasonBadge');if(season)season.textContent=appState.studio.seasonBadge;
    const brand=document.querySelectorAll('[data-brand-name]');brand.forEach(el=>el.textContent=appState.studio.brandName);
    const link=document.getElementById('headerWhatsAppQuick');if(link)link.href='https://wa.me/'+String(appState.studio.whatsappPhone).replace(/\D/g,'');
}
function resetAppData(){if(!confirm('Reset all package and studio edits stored on this device?'))return;localStorage.removeItem(STORAGE_KEY);appState=loadState();syncStudioHeader();renderPackagesList();updateCalculatorSummary();renderEditorView();}
function copyInstagramCaption(){const caption='A little festive glam, a lot of confidence ✨ Book your look with '+appState.studio.brandName+' 💄💅';if(navigator.clipboard?.writeText)navigator.clipboard.writeText(caption).then(()=>alert('Caption copied.')).catch(()=>prompt('Copy your caption:',caption));else prompt('Copy your caption:',caption);}
document.addEventListener('DOMContentLoaded',()=>{
    syncStudioHeader();
    document.querySelectorAll('.nail-swatch-btn').forEach(b=>b.classList.toggle('selected',b.dataset.shade===appState.selectedShade));
    const shade=document.getElementById('selectedShadeLabel');if(shade)shade.textContent=appState.selectedShade;
    const search=document.getElementById('packageSearch');if(search)search.addEventListener('input',e=>handleSearchPackages(e.target.value));
    const dateInput=document.getElementById('eventDateInput');
    if(dateInput){const now=new Date();const localToday=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);dateInput.min=localToday;}
    renderPackagesList();updateCalculatorSummary();
});
