const STORAGE_KEY = 'beautify_by_mansi_state_v1';

const DEFAULT_STATE = {
    studio: {
        brandName: 'Beautify by Mansi',
        tagline: 'Makeup • Hair • Nail Extensions • Festive Glam',
        whatsappPhone: '919876543210',
        displayPhone: '+91 98765 43210',
        location: 'Studio & Venue Service Available',
        seasonBadge: 'Karwa Chauth • Diwali • Wedding Season Special Offers'
    },
    selectedShade: 'Maroon & Silver Festive Glam',
    selectedPackageIds: ['party-hd', 'nails-presson'],
    activeCategory: 'all',
    searchQuery: '',
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

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
        const parsed = JSON.parse(raw);
        return {
            ...JSON.parse(JSON.stringify(DEFAULT_STATE)),
            ...parsed,
            studio: { ...DEFAULT_STATE.studio, ...(parsed.studio || {}) }
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

function formatINR(num) {
    return '₹' + Number(num || 0).toLocaleString('en-IN');
}

// Switch between Booking, Pamphlet, and Editor views
function switchAppMode(mode) {
    const views = {
        booking: document.getElementById('viewBooking'),
        pamphlet: document.getElementById('viewPamphlet'),
        editor: document.getElementById('viewEditor')
    };
    const buttons = {
        booking: document.getElementById('modeBtnBooking'),
        pamphlet: document.getElementById('modeBtnPamphlet'),
        editor: document.getElementById('modeBtnEditor')
    };

    Object.keys(views).forEach(key => {
        if (key === mode) {
            views[key].classList.remove('hidden');
            buttons[key].className = 'mode-tab-btn px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 bg-gold text-maroon-dark shadow';
        } else {
            views[key].classList.add('hidden');
            buttons[key].className = 'mode-tab-btn px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 text-ivory/85 hover:text-white hover:bg-white/10';
        }
    });

    if (mode === 'pamphlet') renderPamphletView();
    if (mode === 'editor') renderEditorView();
}

// Select Nail Shade
function selectNailShade(shadeName) {
    appState.selectedShade = shadeName;
    persistState();

    document.querySelectorAll('.nail-swatch-btn').forEach(btn => {
        const isMatch = btn.getAttribute('data-shade') === shadeName;
        const checkIcon = btn.querySelector('.swatch-check');
        if (isMatch) {
            btn.className = 'nail-swatch-btn group flex items-center gap-2 px-3 py-2 rounded-xl bg-white border-2 border-maroon shadow-sm transition text-xs font-semibold text-maroon-dark';
            if (checkIcon) checkIcon.classList.remove('hidden');
        } else {
            btn.className = 'nail-swatch-btn group flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 hover:border-rose-dusty shadow-sm transition text-xs font-semibold text-gray-700';
            if (checkIcon) checkIcon.classList.add('hidden');
        }
    });

    const shadeLabel = document.getElementById('selectedShadeLabel');
    if (shadeLabel) shadeLabel.textContent = shadeName;
}

// Filter by Category
function filterCategory(cat) {
    appState.activeCategory = cat;
    document.querySelectorAll('.cat-tab-btn').forEach(btn => {
        if (btn.getAttribute('data-cat') === cat) {
            btn.className = 'cat-tab-btn shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition bg-maroon text-gold-light shadow';
        } else {
            btn.className = 'cat-tab-btn shrink-0 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition bg-ivory-warm text-maroon-dark hover:bg-rose-light/60';
        }
    });
    renderPackagesList();
}

function handleSearchPackages(query) {
    appState.searchQuery = (query || '').trim().toLowerCase();
    renderPackagesList();
}

function togglePackageSelection(pkgId) {
    const idx = appState.selectedPackageIds.indexOf(pkgId);
    if (idx > -1) {
        appState.selectedPackageIds.splice(idx, 1);
    } else {
        appState.selectedPackageIds.push(pkgId);
    }
    persistState();
    renderPackagesList();
    updateCalculatorSummary();
}

function clearSelectedPackages() {
    appState.selectedPackageIds = [];
    persistState();
    renderPackagesList();
    updateCalculatorSummary();
}

// Render Left Column Package Cards
function renderPackagesList() {
    const container = document.getElementById('packagesListContainer');
    if (!container) return;

    const filtered = appState.packages.filter(pkg => {
        const matchesCat = appState.activeCategory === 'all' || pkg.category === appState.activeCategory;
        const matchesQuery = !appState.searchQuery ||
            pkg.name.toLowerCase().includes(appState.searchQuery) ||
            pkg.description.toLowerCase().includes(appState.searchQuery) ||
            pkg.features.some(f => f.toLowerCase().includes(appState.searchQuery));
        return matchesCat && matchesQuery;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="bg-white rounded-2xl p-8 text-center border border-rose-dusty/30">
                <p class="font-serif text-xl text-maroon-dark font-bold">No matching packages found</p>
                <p class="text-xs text-gray-500 mt-1">Try clearing your search filter or switching to "All Festive Offers".</p>
            </div>
        `;
        return;
    }

    const categoriesOrder = ['party', 'bridal', 'nails', 'combos'];
    let html = '';

    categoriesOrder.forEach(catKey => {
        const groupItems = filtered.filter(item => item.category === catKey);
        if (groupItems.length === 0) return;

        html += `
            <div class="space-y-4">
                <div class="flex items-center justify-between border-b border-gold/40 pb-2">
                    <h3 class="font-serif text-xl sm:text-2xl font-bold text-maroon-dark">${groupItems[0].categoryTitle}</h3>
                    <span class="text-xs font-semibold text-maroon bg-rose-light px-2.5 py-1 rounded-full">${groupItems.length} Options</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${groupItems.map(pkg => {
                        const isSelected = appState.selectedPackageIds.includes(pkg.id);
                        const discountPercent = Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100);
                        return `
                            <div onclick="togglePackageSelection('${pkg.id}')" class="card-hover cursor-pointer rounded-2xl p-5 bg-white transition relative flex flex-col justify-between ${isSelected ? 'border-2 border-maroon ring-2 ring-gold/40 bg-maroon-soft/20' : 'border border-rose-dusty/35'}">
                                <div>
                                    <div class="flex items-center justify-between gap-2 mb-2">
                                        <span class="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-ivory-warm text-maroon border border-gold/40">${pkg.badge}</span>
                                        <span class="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Save ${discountPercent}%</span>
                                    </div>
                                    <h4 class="font-serif text-lg font-bold text-maroon-dark leading-snug">${pkg.name}</h4>
                                    <p class="text-xs text-gray-600 mt-1.5 leading-relaxed">${pkg.description}</p>
                                    <ul class="mt-3 space-y-1">
                                        ${pkg.features.map(f => `
                                            <li class="text-xs text-gray-700 flex items-center gap-1.5">
                                                <i class="fa-solid fa-check text-[10px] text-gold-dark"></i>
                                                <span>${f}</span>
                                            </li>
                                        `).join('')}
                                    </ul>
                                </div>

                                <div class="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                                    <div>
                                        <span class="text-xs text-gray-400 line-through block">${formatINR(pkg.originalPrice)}</span>
                                        <span class="font-serif text-2xl font-extrabold text-maroon">${formatINR(pkg.price)}</span>
                                    </div>
                                    <button type="button" class="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${isSelected ? 'bg-maroon text-gold-light shadow' : 'bg-ivory-warm text-maroon-dark hover:bg-rose-light'}">
                                        <i class="fa-solid ${isSelected ? 'fa-circle-check' : 'fa-plus'}"></i>
                                        <span>${isSelected ? 'Selected' : 'Add to Booking'}</span>
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Update Sticky Booking Calculator
function updateCalculatorSummary() {
    const listEl = document.getElementById('selectedPackagesList');
    const countEl = document.getElementById('selectedCountBadge');
    const origEl = document.getElementById('calcOriginalTotal');
    const saveEl = document.getElementById('calcTotalSavings');
    const finalEl = document.getElementById('calcFinalTotal');

    const selectedItems = appState.packages.filter(p => appState.selectedPackageIds.includes(p.id));
    if (countEl) countEl.textContent = selectedItems.length;

    if (selectedItems.length === 0) {
        if (listEl) {
            listEl.innerHTML = `
                <div class="text-center py-4 px-3 rounded-xl bg-ivory text-xs text-gray-500 border border-dashed border-rose-dusty/40">
                    Tap any package card on the left to build your festive quote.
                </div>
            `;
        }
        if (origEl) origEl.textContent = '₹0';
        if (saveEl) saveEl.textContent = '- ₹0';
        if (finalEl) finalEl.textContent = '₹0';
        return;
    }

    let totalOffer = 0;
    let totalRegular = 0;

    if (listEl) {
        listEl.innerHTML = selectedItems.map(item => {
            totalOffer += Number(item.price);
            totalRegular += Number(item.originalPrice);
            return `
                <div class="flex items-center justify-between gap-2 bg-ivory px-3 py-2 rounded-xl border border-gold/25 text-xs">
                    <div class="truncate pr-2">
                        <span class="font-semibold text-maroon-dark block truncate">${item.name}</span>
                        <span class="text-[11px] text-gray-400 line-through">${formatINR(item.originalPrice)}</span>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <span class="font-bold text-maroon">${formatINR(item.price)}</span>
                        <button onclick="togglePackageSelection('${item.id}')" class="text-gray-400 hover:text-red-600">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        selectedItems.forEach(item => {
            totalOffer += Number(item.price);
            totalRegular += Number(item.originalPrice);
        });
    }

    const savings = Math.max(0, totalRegular - totalOffer);
    if (origEl) origEl.textContent = formatINR(totalRegular);
    if (saveEl) saveEl.textContent = '- ' + formatINR(savings);
    if (finalEl) finalEl.textContent = formatINR(totalOffer);
}

// Generate and open WhatsApp Booking Link
function sendWhatsAppBooking() {
    const selectedItems = appState.packages.filter(p => appState.selectedPackageIds.includes(p.id));
    const clientName = (document.getElementById('clientNameInput')?.value || '').trim() || 'Festive Cl
