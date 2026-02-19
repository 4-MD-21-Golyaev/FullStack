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

## Tech Stack

- **Next.js 16** (App Router), **React 19**, **TypeScript** (strict)
- **PostgreSQL** via **Prisma 7** (`@prisma/adapter-pg`)
- **Yookassa** as payment gateway (Russian payment processor)
- **Vitest** for unit tests; test files live in `__tests__/` subdirectories alongside the code they test
