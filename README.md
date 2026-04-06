## Saree Pro

Saree Pro is being built as a real multi-role delivery platform, not a static showcase.

Current repository focus:

- local-first backend foundation
- typed commerce and logistics models
- premium frontend shell
- gradual evolution into customer, merchant, driver, staff, and owner workspaces

Important:

- the large product vision discussed in planning is not fully implemented yet
- the source of truth for current scope is the codebase plus the documents in [`docs/`](./docs)

Start here:

- [`docs/product-blueprint.md`](./docs/product-blueprint.md)
- [`docs/implementation-phases.md`](./docs/implementation-phases.md)

## Local Development

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Local data layer

The app currently boots from a local SQLite database file:

- `prisma/dev.db`

It is initialized by:

- [`lib/sqlite.ts`](./lib/sqlite.ts)

Health check endpoint:

- [`app/api/health/route.ts`](./app/api/health/route.ts)

## Verification

Validated recently with:

- `npm run lint`
- `npm run build`
