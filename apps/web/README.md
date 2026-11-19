# Beautify by Mansi — V2 Web App

This is the isolated Next.js V2 application. The V1 static website remains at the repository root and is not replaced by this workspace.

## Requirements
- Node.js 20+
- npm 10+

## Local development
From the repository root:

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
npm run dev:web
```

Open http://localhost:3000.

The initial home page is a V2 foundation preview. Shop, booking, authentication, and payment routes are placeholders in the architecture and are not yet connected to live data or payment providers.

## Commands

```bash
npm run build:web
npm run lint:web
npm run typecheck:web
```

## Environment safety
Only values prefixed with `NEXT_PUBLIC_` may be exposed to client bundles. Service-role keys and payment secrets must be used exclusively in server-side code or trusted Edge Functions. Do not commit `.env.local`.

## Deployment
Deploy this app as a separate Vercel project/root directory `apps/web` after CI and preview testing. Do not change the existing production project's root directory or production domain during foundation work.
