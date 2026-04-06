# Saree Pro Implementation Phases

## Phase 0: Foundation

Status: partially done

Done:

- app shell
- local database bootstrap
- seeded sample records
- base domain types

Missing:

- auth
- reusable data access layer
- route protection

## Phase 1: Identity and access

Goal:

- real sign-in
- hidden owner access
- staff permissions
- profile records

Deliverables:

- auth provider
- users table refinement
- role + permission model
- login, logout, protected routes

## Phase 2: Merchant operations

Goal:

- merchants can manage products and availability

Deliverables:

- merchant dashboard
- categories CRUD
- menu items CRUD
- store open or close switch

## Phase 3: Customer ordering

Goal:

- customers can browse, search, and place real orders

Deliverables:

- merchant listing page
- merchant details page
- cart
- address book
- checkout
- order creation API

## Phase 4: Driver operations

Goal:

- drivers can accept and fulfill work

Deliverables:

- driver onboarding
- online or offline toggle
- task queue
- stacked order eligibility logic
- pickup and drop-off actions

## Phase 5: Finance core

Goal:

- every order has an auditable money lifecycle

Deliverables:

- ledger entries
- escrow states
- commission rules
- taxes
- partner payout records

## Phase 6: Compliance and support

Goal:

- reduce legal and operational risk

Deliverables:

- driver document review
- merchant legal document review
- disputes
- refunds
- support inbox

## Phase 7: Growth layer

Goal:

- improve retention and acquisition

Deliverables:

- coupons
- loyalty
- subscriptions
- ads
- referral tracking

## Phase 8: Smart systems

Goal:

- add intelligence after core reliability exists

Deliverables:

- search ranking
- demand prediction
- dynamic pricing
- support AI
- merchant insights

## Recommended immediate next sprint

Build these next, in order:

1. Real login and protected app shell
2. Hidden owner portal access by permission, not UI selection
3. Merchant dashboard with category and item CRUD
4. Customer merchant list and merchant detail page
5. Order creation from cart into local database
