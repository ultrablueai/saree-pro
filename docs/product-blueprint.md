# Saree Pro Product Blueprint

## Why this document exists

This project has a large product vision:

- multi-role delivery platform
- customer, driver, merchant, staff, and owner experiences
- maps and precise addressing
- escrow and financial split
- loyalty, wallet, coupons, subscriptions
- compliance and document verification
- analytics, AI, WhatsApp, support, and operations

Not all of that exists in the code today.

This document separates:

1. What is real now
2. What is planned
3. What we should build first

## Current reality in this repository

These parts are already present in code:

- Next.js application shell
- premium marketing-style homepage
- typed business domain models in `types/index.ts`
- local SQLite bootstrap in `lib/sqlite.ts`
- seeded sample data for users, merchant, menu, driver, and order
- dashboard metrics helper in `lib/dashboard-metrics.ts`
- health endpoint in `app/api/health/route.ts`
- Prisma schema draft for future database evolution in `prisma/schema.prisma`

These parts are not built yet:

- real authentication
- role-based dashboards
- live order lifecycle UI
- real map provider integration
- precise address pinning and building photo upload
- payment capture and escrow
- wallet, loyalty, subscriptions, coupons
- document verification workflows
- WhatsApp order intake pipeline
- AI search and AI operations tooling
- legal document acceptance flows
- offline-first sync

## Product shape

Saree Pro should be one product with multiple role-aware workspaces:

- Customer app
- Driver app
- Merchant app
- Staff console
- Owner console

The owner console must never be publicly selectable. It should be permission-based only.

## Core business flows

### Customer

- Browse merchants and menus
- Search intelligently
- Save precise addresses
- Place order
- Pay or use cash
- Track order
- Report issue
- Rate merchant and driver

### Driver

- Complete onboarding and compliance
- Upload legal and tax documents
- Go online or offline
- Receive nearby orders
- Accept stacked deliveries on compatible routes
- Navigate to pickup and drop-off
- Confirm delivery or open dispute
- Track payouts and invoices

### Merchant

- Manage catalog and availability
- Receive and prepare orders
- Mark order ready
- View payouts and commissions
- Run offers and ad placements

### Staff

- Handle support
- Review disputes
- Review onboarding documents
- Process operational exceptions

### Owner

- Control pricing rules
- Review finance and ledger
- Manage taxes and legal policies
- Manage countries, currencies, and operations
- Review growth and performance analytics

## Global architecture decisions

### 1. One platform, region-aware

The system should support multiple countries in one codebase, with:

- country
- currency
- tax rules
- language set
- payout rails
- legal policy versions

### 2. Explicit money states

Money must never jump directly from paid to distributed without state tracking.

Required states:

- authorized
- held in escrow
- released
- refunded
- disputed
- settled to partners

### 3. Explicit permissions

Roles are not enough by themselves. We need permission scopes.

Examples:

- `orders.read`
- `orders.assign`
- `payments.settle`
- `drivers.verify`
- `finance.export`
- `owner.access`

### 4. Compliance is workflow, not static text

Legal documents, KYC, merchant compliance, and tax information must be modeled as records with:

- status
- submittedAt
- reviewedAt
- reviewerId
- expiryDate
- evidence files

## What to build first

The correct order is:

1. Authentication and session model
2. User profile and role model
3. Merchant catalog and menu UI
4. Order placement and order lifecycle
5. Driver dispatch basics
6. Finance ledger and escrow states
7. Support, disputes, and compliance
8. Growth systems like ads, subscriptions, loyalty, AI

## What not to do yet

Do not start with:

- drone delivery
- investor dashboards
- advanced AI copilots
- complex offline sync
- multi-country launch logic

Those are valuable later, but not before the transactional core works.
