# Saree Pro Go-Live Checklist

This file is the current source of truth for launch readiness.

## Verified in codebase

- `npm run lint` passes.
- `npx tsc --noEmit` passes.
- `npm run build` passes with TypeScript checking enabled.
- `npx prisma validate` passes.
- Next.js route protection has been migrated to [`proxy.ts`](/c:/Users/abc/Desktop/Sareepro/saree-pro/proxy.ts).

## Blocking items before production launch

1. Move production data off SQLite.
   Use a managed Postgres `DATABASE_URL`. Do not launch on `file:./dev.db` or any local `.db` file.

2. Replace placeholder Supabase credentials.
   Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` with real project values.

3. Set a unique owner access code.
   Configure `OWNER_ACCESS_CODE` and rotate any code that has already been committed or shared.

4. Configure realtime chat if chat is meant to ship.
   Set `NEXT_PUBLIC_CHAT_WS_URL` to the actual WebSocket service. Without it, chat falls back to `ws://localhost:8080`.

5. Configure monitoring.
   Set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` if you want production error tracking.

6. Decide whether Redis is required for the launch scope.
   If yes, set `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD`. If no, ship knowing cache-backed behavior is degraded.

## Recommended launch flow

1. Copy [`.env.example`](/c:/Users/abc/Desktop/Sareepro/saree-pro/.env.example) into the environment you will use for deploy secrets.
2. Fill production secrets with real values.
3. Run `npm run launch:verify`.
4. Run `npm run lint`.
5. Run `npx tsc --noEmit`.
6. Run `npm run build`.
7. Deploy only after all four commands pass.

## Notes

- Several older deployment markdown files still exist in the repo, but this checklist reflects the current codebase more accurately.
- `NEXT_PUBLIC_APP_URL` is useful for links and callbacks, but it is not currently enforced by runtime code.
- There is no confirmed production health endpoint in the current app, so do not rely on old docs that reference `/api/health`.
