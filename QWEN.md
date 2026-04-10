# QWEN.md - Saree Pro Project Context

## Project Overview

Saree Pro is a multi-role delivery platform built with Next.js 16, TypeScript, React 19, and a mixed SQLite/Postgres data layer. It supports customer, merchant, driver, admin, and owner roles with RBAC, protected routes, cart, checkout, orders, merchant operations, driver workflows, wallet, disputes, and support surfaces.

## Current Technical State

- Framework: Next.js 16.2.2 App Router
- Language: TypeScript 5.x
- UI: React 19.2.4 and Tailwind CSS 4
- Database: SQLite for local development, Postgres for production
- Auth: Supabase plus custom session handling
- Monitoring: Sentry-ready
- Cache: Redis-ready
- Deployment: Vercel
- Route protection: `proxy.ts` replaces legacy `middleware.ts`

## Important Notes

1. This repo uses a newer Next.js version with breaking changes. Check local docs under `node_modules/next/dist/docs/` before making framework-level changes.
2. Local quality gates currently pass: `npm run lint`, `npx tsc --noEmit`, `npm run build`, and `npx prisma validate`.
3. Production readiness still depends on real environment variables being configured on the deploy target.
4. The launch checklist lives in `GO_LIVE_CHECKLIST.md`.
5. Environment verification can be run with `npm run launch:verify`.

## Common Commands

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run build
npx prisma validate
npm run launch:verify
```

## Key Paths

- `app/` for routes and UI flows
- `components/` for reusable UI
- `lib/` for business logic and integrations
- `services/` for backend service modules
- `proxy.ts` for route protection and edge checks
- `vercel.json` for deployment configuration
- `GO_LIVE_CHECKLIST.md` for launch requirements