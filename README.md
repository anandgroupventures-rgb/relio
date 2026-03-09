# Relio

> Your leads. Your follow-ups. Nothing missed.

A mobile-first CRM built for the solo Indian real estate broker.

## Tech Stack

- **Next.js 14** — App Router
- **Firebase** — Auth, Firestore, Storage
- **Vercel** — Hosting & CI/CD

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Add environment variables
# .env.local is already configured with Firebase keys

# 3. Start dev server
npm run dev

# Open http://localhost:3000
```

## Project Structure

```
src/
  app/
    (auth)/login/       → Login & signup
    (app)/today/        → Today screen (main dashboard)
    (app)/leads/        → Lead management
    (app)/inventory/    → Inventory management
    (app)/calendar/     → Calendar & follow-ups
    (app)/stats/        → Analytics
  components/
    layout/BottomNav    → Bottom navigation
  lib/
    firebase/           → config, auth, leads, inventory
    hooks/useAuth       → Auth state hook
  styles/globals.css    → Brand tokens & base styles
middleware.js           → Route protection
```

## Deployment

Push to `main` branch → Vercel auto-deploys.

Add these environment variables in Vercel dashboard:
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

## Firestore Rules

Deploy security rules:
```bash
firebase deploy --only firestore:rules
```

## Roadmap

- [x] Phase 0 — Foundation, auth, routing
- [ ] Phase 1 — Leads, inventory, home screen
- [ ] Phase 2 — Push notifications, PWA
- [ ] Phase 3 — Intelligence, WhatsApp templates
- [ ] Phase 4 — Offline mode, polish, launch
