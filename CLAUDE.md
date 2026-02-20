# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Next.js development server (localhost:3000)
npm run build      # Build for production
npm run lint       # Run ESLint
npm run test       # Run all tests with Vitest
npx vitest run src/path/to/file.spec.ts  # Run a single test file

npx prisma migrate dev    # Apply migrations in development
npx prisma db seed        # Seed the database (required before first run — populates status lookup tables)
npx prisma studio         # Open Prisma Studio GUI
```

## Environment Variables

```
DATABASE_URL              # PostgreSQL connection string
YOOKASSA_SHOP_ID          # Yookassa shop identifier
YOOKASSA_SECRET_KEY       # Yookassa secret key
YOOKASSA_RETURN_URL       # Base URL for payment redirect (default: http://localhost:3000)
JWT_SECRET                # HS256 key, minimum 32 characters
SMTP_HOST                 # SMTP host
SMTP_PORT                 # SMTP port (587 or 465)
SMTP_USER                 # SMTP username
SMTP_PASS                 # SMTP password
SMTP_FROM                 # Sender address
```

## Architecture

This is a **Next.js e-commerce order management system** following **Hexagonal (Ports & Adapters) / Clean Architecture**.

### Layer Structure

```
src/
├── domain/          # Entities, enums, state machine, domain errors — pure TypeScript, no dependencies
├── application/     # Use cases + port interfaces (Repository & Gateway abstractions)
│   └── ports/       # Interfaces that infrastructure must implement
├── infrastructure/  # Concrete implementations: Prisma repositories, Yookassa payment gateway
└── app/api/         # Next.js App Router HTTP layer — thin handlers that instantiate and call use cases
```

**Dependency rule:** domain ← application ← infrastructure ← HTTP layer. Inner layers never import outer layers.

### Order Lifecycle (State Machine)

```
CREATED → PICKING → PAYMENT → DELIVERY → CLOSED
                 ↘ CANCELLED (from CREATED, PICKING, or PAYMENT)
```

State transitions are enforced in `src/domain/order/transitions.ts`. Attempting an illegal transition throws `InvalidOrderStateError` from `src/domain/order/errors.ts`.

Use cases map to transitions:

| Use case | Transition |
|---|---|
| `StartPickingUseCase` | CREATED → PICKING |
| `CompletePickingUseCase` | PICKING → PAYMENT |
| `InitiatePaymentUseCase` | — (creates Yookassa payment while order stays PAYMENT) |
| `ConfirmPaymentUseCase` | PAYMENT → DELIVERY (or CANCELLED on failure) |
| `CloseOrderUseCase` | DELIVERY → CLOSED |
| `CancelOrderUseCase` | CREATED/PICKING/PAYMENT → CANCELLED |
| `PayOrderUseCase` | PAYMENT → DELIVERY (direct, no gateway — used for testing/internal) |

### Payment Flow (Yookassa)

1. `POST /api/orders/[id]/pay` → `InitiatePaymentUseCase` → validates stock → creates `Payment` record (PENDING) → calls `YookassaGateway` → returns `confirmationUrl`
2. User completes payment on Yookassa's site and is redirected back
3. Yookassa posts to `POST /api/webhooks/yookassa` → `ConfirmPaymentUseCase` → deducts stock → marks payment SUCCESS → advances order to DELIVERY

The webhook handler always returns HTTP 200 to prevent Yookassa retries, even on internal errors. In production, incoming IPs are validated against Yookassa's whitelist (`src/infrastructure/payment/yookassaIpWhitelist.ts`); IP checking is skipped in development.

Both `InitiatePaymentUseCase` and `ConfirmPaymentUseCase` are idempotent.

### Key Conventions

- **Money is stored in rubles** with two decimal places (`Decimal(10,2)` in DB, `number` in domain). `YookassaGateway` passes the value directly to Yookassa as-is. Prisma repositories convert `Prisma.Decimal` → `number` via `.toNumber()` at the infrastructure boundary.
- **OrderItem snapshots** product name, article, and price at order creation time — product data changes do not affect existing orders.
- **Status lookup tables**: `OrderStatus` and `PaymentStatus` are database lookup tables (not DB enums), keyed by `code`. Prisma repositories resolve status IDs at runtime. The seed must be run before any status-dependent operations.
- Use cases receive repositories/gateways via constructor injection; HTTP route handlers are responsible for wiring dependencies.
- Path alias `@/*` maps to `src/*`.

## Domain Rules & Invariants

**Core principle:** Domain correctness has priority over UI behavior. Invalid domain states must be impossible, not just unlikely.

### Architectural constraints
- State machine exists **only** in domain (`transitions.ts`). No layer may bypass state transitions.
- Domain must not depend on infrastructure. Presentation contains no business rules.

### Cart vs Order
- Cart is mutable and uncommitted — it is **not** an Order and does not create one.
- Order is created **only** on confirmation. No persistent Order exists before that moment.
- Unauthenticated cart: stored locally, not in DB. Authenticated cart: stored in DB, managed via use-cases.

### Order state semantics
| State | Composition | Total | Notes |
|---|---|---|---|
| CREATED | fixed | fixed | cancellation allowed |
| PICKING | **may change** | **may change** | absence strategy applied; return to CREATED forbidden |
| PAYMENT | immutable | immutable | 10-minute timeout active |
| DELIVERY | immutable | immutable | stock already deducted |
| CLOSED / CANCELLED | — | — | terminal |

### Order invariants
1. Order is always in exactly one state.
2. Composition immutable after PAYMENT.
3. Total immutable after PAYMENT.
4. Order cannot exist without User.
5. Cancellation forbidden in DELIVERY and CLOSED.
6. Transition from PICKING back to CREATED forbidden.

### Absence resolution strategy
Field on Order: `CALL_REPLACE | CALL_REMOVE | AUTO_REMOVE | AUTO_REPLACE`
- Composition adjustment and total recalculation allowed **only in PICKING**.
- After transition to PAYMENT, no further modifications allowed.

### Payment rules
- SUCCESS and FAILED are terminal statuses.
- FAILED allows creating a new Payment; SUCCESS forbids it.
- Only **one PENDING Payment** allowed per Order at a time.
- Payment timeout: if Order stays in PAYMENT > 10 min with PENDING payment → auto-cancel (background job).

### Race conditions
- SUCCESS has priority over Cancel. If SUCCESS committed first → Cancel forbidden. If Cancel committed first → SUCCESS ignored.
- Implementation requires: transactional boundaries + row-level locking or optimistic versioning + state validation inside transaction.

### Stock handling
- Stock is deducted **only** during PAYMENT → DELIVERY transition.
- Not deducted at order creation or during picking.
- Stock is re-validated immediately before deduction.

### Transaction boundaries
Must execute inside a transaction: ConfirmOrder, ConfirmPayment, CancelOrder, PAYMENT → DELIVERY transition.
Must execute outside: external export (MoySklad).

### Forbidden states (implementation is invalid if any is reachable)
- DELIVERY without SUCCESS payment
- CLOSED without DELIVERY
- SUCCESS without Order
- Multiple SUCCESS Payments for one Order
- Composition change after PAYMENT
- Order without User
- Return from PICKING to CREATED

### Completion criteria (§20)
Backend is complete when: all transitions covered by tests · race conditions resolved · payment timeout implemented · webhook idempotent · no forbidden states reachable · cart isolated from domain model · composition mutation restricted to PICKING.

---

## Tech Stack

- **Next.js 16** (App Router), **React 19**, **TypeScript** (strict)
- **PostgreSQL** via **Prisma 7** (`@prisma/adapter-pg`)
- **Yookassa** as payment gateway (Russian payment processor)
- **Vitest** for unit tests; test files live in `__tests__/` subdirectories alongside the code they test
