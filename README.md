# Saree Pro

Multi-role delivery platform built with Next.js 16, React 19, TypeScript, SQLite/Postgres, Supabase, Redis, and Sentry.

## Current state

- The app builds successfully.
- ESLint passes cleanly.
- TypeScript passes with build-time checking enabled.
- Prisma schema validation passes.
- Route protection now lives in `proxy.ts` for Next.js 16 compatibility.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment setup

1. Start from [`.env.example`](./.env.example).
2. Use local SQLite only for development.
3. Use managed Postgres for production `DATABASE_URL`.
4. Replace all placeholder Supabase values before real deployment.
5. Set a private `OWNER_ACCESS_CODE` before enabling owner access outside local development.

## Launch verification

Run the preflight checks before every production deploy:

```bash
npm run launch:verify
npm run lint
npx tsc --noEmit
npm run build
```

The current launch source of truth is [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md).

## Stack

- Next.js 16.2.2
- React 19.2.4
- TypeScript 5.x
- Tailwind CSS 4
- Supabase
- Prisma
- better-sqlite3 and postgres
- Redis via `ioredis`
- Sentry

## Project notes

- This repo uses a newer Next.js version with breaking changes. Check local docs under `node_modules/next/dist/docs/` before making framework-level changes.
- `proxy.ts` replaces `middleware.ts` in the current Next.js setup.
- Realtime chat needs `NEXT_PUBLIC_CHAT_WS_URL`; otherwise it falls back to `ws://localhost:8080`.
- Older deployment markdown files still exist in the repo, but [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md) is the most accurate launch reference.

## Useful commands

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run build
npx prisma validate
npm run launch:verify
```