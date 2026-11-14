# beautify-by-mansi
# Beautify by Mansi — Festive Season Price & Offer Web App

An interactive luxury bridal, festive makeup, and nail art rate card & WhatsApp booking estimator built for **Beautify by Mansi**.

## ✨ Key Features
- **Interactive Client Booking Calculator**: Clients can browse 13 festive packages across Party Makeup, Bridal, Nail Extensions/Press-Ons, and Value Combos, see their instant savings, and send a formatted booking inquiry directly to WhatsApp.
- **Signature Nail Shade Bar**: Interactive swatch selector for Maroon & Silver Festive Glam, Dusty Rose, Maroon French Tips, and Champagne Glitter Ombre.
- **Printable A4 Rate Card / Pamphlet Mode**: One-click switch to a print-optimized rate card ready for PDF export or Instagram Story / WhatsApp Status screenshots.
- **Studio settings & price editor**: Browser-local editing of studio details and package prices.
- **Supabase cloud booking**: Customer requests can be stored in a shared Postgres database; administrator sign-in and Row Level Security protect booking records.
- **Booking Manager**: Authenticated admins can review, update, delete, export and receive live booking-table updates.

## Supabase configuration
Follow [`supabase/SETUP.md`](supabase/SETUP.md). Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor, create the administrator user and allow-list its UUID, then configure `assets/js/supabase-config.js` with the project's public URL and anon/publishable key. Never put a Supabase service-role key in browser code.

Until Supabase is configured, the booking manager falls back to browser-local storage. That fallback is not shared or suitable for sensitive customer records.

## 📁 Project Structure
```text
beautify-by-mansi/
├── index.html                  # Main Festive Web App & Rate Card
├── README.md                   # Documentation & setup guide
├── assets/
│   ├── css/
│   │   └── style.css           # Luxury Maroon, Dusty Rose & Gold styles
│   ├── js/
│   │   └── app.js              # Pricing calculator, pamphlet & WhatsApp generator
│   └── images/                 # Portfolio photos, nail swatches, and banners
└── .github/
    └── workflows/
        └── deploy.yml          # GitHub Pages CI/CD deployment workflow


## GitHub Pages deployment
The site is deployed from the repository root by the GitHub Actions workflow at `.github/workflows/deploy.yml`. In the repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. Then open **Actions → Deploy Beautify by Mansi to GitHub Pages** and run the workflow (or push a commit to `main`). The public site URL is `https://anuragkumarbhot.github.io/beautify-by-mansi/` once the deployment succeeds.

## Hybrid Business Studio
Open [`business-studio.html`](business-studio.html) to preview a luxury digital business card, configure public contact details, generate a QR code for a website/review destination, and print a matching business stamp. The first version saves the profile in the current browser only; hosted customer profiles, authentication, shared cloud storage, and analytics are roadmap items and are not yet enabled.

## Cloud business profiles

The Business Studio now includes Supabase email authentication, private cloud drafts, a publish action, and a public profile route.

- Studio: [business-studio.html](business-studio.html)
- Public profile renderer: [profile.html](profile.html) (requires a published `?slug=` query parameter)
- Client auth/data integration: [assets/js/business-studio-cloud.js](assets/js/business-studio-cloud.js)
- Database migration and setup: [supabase/migrations/001_business_profiles.sql](supabase/migrations/001_business_profiles.sql) and [supabase/SETUP.md](supabase/SETUP.md)

Apply the migration and configure Supabase email authentication before testing cloud features. The browser uses only the public publishable key; RLS protects customer data. Never add a service-role key to this repository.
