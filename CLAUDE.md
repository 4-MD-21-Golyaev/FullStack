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
INTERNAL_JOB_SECRET       # Bearer secret for /api/internal/jobs/* routes (fail-closed if missing)
CRON_SECRET               # Bearer secret for /api/cron/* routes (fail-closed if missing)
OTP_HMAC_SECRET           # HMAC-SHA256 key for OTP hashing (defaults to dev value if missing)
MOYSKLAD_TOKEN            # MoySklad API token
MOYSKLAD_ORGANIZATION_ID  # MoySklad organization ID
MOYSKLAD_AGENT_ID         # MoySklad counterparty (agent) ID
```

## Architecture

This is a **Next.js e-commerce order management system** following **Hexagonal (Ports & Adapters) / Clean Architecture**.

### Layer Structure

```
src/
├── domain/          # Entities, enums, state machine, domain errors — pure TypeScript, no dependencies
├── application/     # Use cases + port interfaces (Repository & Gateway abstractions)
│   └── ports/       # Interfaces that infrastructure must implement
├── infrastructure/  # Concrete implementations: Prisma repositories, Yookassa/MoySklad gateways, auth
└── app/api/         # Next.js App Router HTTP layer — thin handlers that instantiate and call use cases
```

**Dependency rule:** domain ← application ← infrastructure ← HTTP layer. Inner layers never import outer layers.

### Order Lifecycle (State Machine)

```
CREATED → PICKING → PAYMENT → DELIVERY_ASSIGNED → OUT_FOR_DELIVERY → DELIVERED → CLOSED
                 ↘ CANCELLED (from CREATED, PICKING, or PAYMENT)
                                                ↘ DELIVERY_ASSIGNED (delivery failed — retry)
```

> **Note:** `DELIVERY` enum value exists for backward compatibility with old DB records only — it is `@deprecated`. All new transitions use the extended delivery states.

State transitions are enforced in `src/domain/order/transitions.ts`. Attempting an illegal transition throws `InvalidOrderStateError` from `src/domain/order/errors.ts`.

#### Transition functions

| Function | Transition |
|---|---|
| `createOrder()` | — → CREATED (validates items, address, prices) |
| `startPicking()` | CREATED → PICKING |
| `registerPayment()` | PICKING → PAYMENT |
| `startDelivery()` | PAYMENT → DELIVERY_ASSIGNED |
| `startOutForDelivery()` | DELIVERY_ASSIGNED → OUT_FOR_DELIVERY |
| `confirmDelivered()` | OUT_FOR_DELIVERY → DELIVERED |
| `markDeliveryFailed()` | OUT_FOR_DELIVERY → DELIVERY_ASSIGNED (retry) |
| `closeOrder()` | DELIVERED → CLOSED |
| `cancelOrder()` | CREATED/PICKING/PAYMENT → CANCELLED |

#### Use cases mapped to transitions

| Use case | Role | Transition |
|---|---|---|
| `CreateOrderUseCase` | Customer | — → CREATED |
| `StartPickingUseCase` | Picker | CREATED → PICKING |
| `UpdateOrderItemsUseCase` | Picker | (items mutation in PICKING) |
| `CompletePickingUseCase` | Picker | PICKING → PAYMENT |
| `InitiatePaymentUseCase` | Customer | — (creates Yookassa payment, order stays PAYMENT) |
| `ConfirmPaymentUseCase` | Webhook | PAYMENT → DELIVERY_ASSIGNED (or CANCELLED on failure) |
| `PayOrderUseCase` | Internal | PAYMENT → DELIVERY_ASSIGNED (direct, no gateway — testing/internal) |
| `CourierStartDeliveryUseCase` | Courier | DELIVERY_ASSIGNED → OUT_FOR_DELIVERY |
| `CourierConfirmDeliveredUseCase` | Courier | OUT_FOR_DELIVERY → DELIVERED |
| `CourierMarkDeliveryFailedUseCase` | Courier | OUT_FOR_DELIVERY → DELIVERY_ASSIGNED |
| `CloseOrderUseCase` | System/Admin | DELIVERED → CLOSED |
| `CancelOrderUseCase` | Customer/Admin | CREATED/PICKING/PAYMENT → CANCELLED |
| `OrderPaymentTimeoutUseCase` | Background job | PAYMENT → CANCELLED (timeout) |

### Payment Flow (Yookassa)

1. `POST /api/orders/[id]/pay` → `InitiatePaymentUseCase` → validates stock → creates `Payment` record (PENDING) → calls `YookassaGateway` → returns `confirmationUrl`
2. User completes payment on Yookassa's site and is redirected back
3. Yookassa posts to `POST /api/webhooks/yookassa` → `ConfirmPaymentUseCase` → deducts stock → marks payment SUCCESS → advances order to DELIVERY_ASSIGNED

The webhook handler always returns HTTP 200 to prevent Yookassa retries, even on internal errors. In production, incoming IPs are validated against Yookassa's whitelist (`src/infrastructure/payment/yookassaIpWhitelist.ts`); IP checking is skipped in development.

Both `InitiatePaymentUseCase` and `ConfirmPaymentUseCase` are idempotent.

### Picker Workflow

Pickers claim CREATED orders to begin picking. An order can only be claimed by one picker at a time.

| Route | Use case |
|---|---|
| `GET /api/picker/orders/available` | `PickerListAvailableUseCase` |
| `GET /api/picker/orders/me` | `PickerListMyOrdersUseCase` |
| `POST /api/picker/orders/[id]/claim` | `PickerClaimOrderUseCase` |
| `POST /api/picker/orders/[id]/release` | `PickerReleaseOrderUseCase` |

After claiming, the picker uses `POST /api/orders/[id]/start-picking` (StartPickingUseCase) and `POST /api/orders/[id]/complete-picking` (CompletePickingUseCase) to drive the order through PICKING → PAYMENT.

### Courier Workflow

Couriers claim DELIVERY_ASSIGNED orders. Delivery has SLA tracking (`src/domain/order/DeliverySla.ts`): assignment SLA = 30 min, en-route SLA = 1 hour.

| Route | Use case |
|---|---|
| `GET /api/courier/orders/available` | `CourierListAvailableUseCase` |
| `GET /api/courier/orders/me` | `CourierListMyOrdersUseCase` |
| `POST /api/courier/orders/[id]/claim` | `CourierClaimOrderUseCase` |
| `POST /api/courier/orders/[id]/release` | `CourierReleaseOrderUseCase` |
| `POST /api/courier/orders/[id]/start-delivery` | `CourierStartDeliveryUseCase` |
| `POST /api/courier/orders/[id]/confirm-delivered` | `CourierConfirmDeliveredUseCase` |
| `POST /api/courier/orders/[id]/mark-delivery-failed` | `CourierMarkDeliveryFailedUseCase` |

### Admin Operations

| Route | Use case |
|---|---|
| `GET /api/admin/orders` | `AdminListOrdersUseCase` |
| `GET /api/admin/payments/issues` | `AdminPaymentIssuesUseCase` |
| `POST /api/admin/payments/[id]/retry` | `AdminRetryPaymentUseCase` |
| `POST /api/admin/payments/[id]/mark-failed` | `AdminMarkPaymentFailedUseCase` |
| `POST /api/admin/jobs/[jobName]/run` | `AdminRunJobUseCase` |
| `GET /api/admin/jobs/[jobName]/status` | `AdminGetJobStatusUseCase` |

### MoySklad Integration

- `POST /api/webhooks/moysklad` — receives product update webhooks
- `POST /api/internal/jobs/sync-products` — `SyncProductsUseCase` pulls product catalog from MoySklad via `HttpMoySkladGateway`
- Order export to MoySklad runs via the **outbox pattern** (`ProcessOutboxUseCase` + `OutboxEvent` table) to guarantee at-least-once delivery without coupling to the order transaction.

### Background Jobs

| Route | Trigger | Use case |
|---|---|---|
| `POST /api/cron/payment-timeout` | Cron (external) | `PaymentTimeoutUseCase` |
| `POST /api/internal/jobs/payment-timeout` | Internal | `OrderPaymentTimeoutUseCase` |
| `POST /api/internal/jobs/process-outbox` | Internal | `ProcessOutboxUseCase` |
| `POST /api/internal/jobs/sync-products` | Internal | `SyncProductsUseCase` |

`CRON_SECRET` / `INTERNAL_JOB_SECRET` are required Bearer tokens; routes fail-closed if the secret is missing.

### Authentication

OTP-based email authentication. Flow: `RequestCodeUseCase` → sends OTP via email → `VerifyCodeUseCase` → issues JWT access token + refresh token. Refresh tokens stored in DB (`RefreshToken` table).

| Route | Use case |
|---|---|
| `POST /api/auth/register` | `RegisterUseCase` |
| `POST /api/auth/request-code` | `RequestCodeUseCase` |
| `POST /api/auth/verify-code` | `VerifyCodeUseCase` |
| `POST /api/auth/refresh` | `RefreshUseCase` |
| `POST /api/auth/logout` | `LogoutUseCase` |
| `GET /api/auth/me` | `GetMeUseCase` |

### Code Style

- **Аккуратность и лаконичность:** код должен быть чистым и компактным — без лишних абстракций, без дублирования, без избыточных комментариев там, где код говорит сам за себя.
- **Декомпозиция повторяющегося кода:** если одинаковая логика встречается в двух и более местах — она выносится в отдельную вспомогательную функцию. Дублирование через copy-paste недопустимо. Один источник истины для каждого поведения.
- **Размер функций:** функция делает одно дело. Если функция разрослась — ищи части, которые можно именовать и вынести.

### Key Conventions

- **Money is stored in rubles** with two decimal places (`Decimal(10,2)` in DB, `number` in domain). `YookassaGateway` passes the value directly to Yookassa as-is. Prisma repositories convert `Prisma.Decimal` → `number` via `.toNumber()` at the infrastructure boundary.
- **OrderItem snapshots** product name, article, and price at order creation time — product data changes do not affect existing orders.
- **Status lookup tables**: `OrderStatus` and `PaymentStatus` are database lookup tables (not DB enums), keyed by `code`. Prisma repositories resolve status IDs at runtime. The seed must be run before any status-dependent operations.
- **Outbox pattern**: MoySklad export events are written to `OutboxEvent` table inside the order transaction, then processed asynchronously by `ProcessOutboxUseCase`. Never call external systems inside a transaction.
- **Claim fields**: `Order` has `pickerClaimUserId/pickerClaimedAt` and `deliveryClaimUserId/deliveryClaimedAt` for tracking who is working on it.
- **Delivery timestamps**: `outForDeliveryAt` and `deliveredAt` are set by courier transitions and used for SLA calculation.
- Use cases receive repositories/gateways via constructor injection; HTTP route handlers are responsible for wiring dependencies.
- Path alias `@/*` maps to `src/*`.

### Infrastructure Layout

```
src/infrastructure/
├── auth/            # JoseTokenService, NodemailerEmailGateway
├── db/              # prismaClient, PrismaTransactionRunner
├── payment/         # YookassaGateway, yookassaIpWhitelist
├── moysklad/        # HttpMoySkladGateway
└── repositories/    # 11 Prisma repository implementations
```

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
| DELIVERY_ASSIGNED | immutable | immutable | waiting for courier claim |
| OUT_FOR_DELIVERY | immutable | immutable | courier en route; SLA tracked |
| DELIVERED | immutable | immutable | confirmed delivery |
| CLOSED / CANCELLED | — | — | terminal |

### Order invariants
1. Order is always in exactly one state.
2. Composition immutable after PAYMENT.
3. Total immutable after PAYMENT.
4. Order cannot exist without User.
5. Cancellation forbidden in DELIVERY_ASSIGNED, OUT_FOR_DELIVERY, DELIVERED, and CLOSED.
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
- Stock is deducted **only** during PAYMENT → DELIVERY_ASSIGNED transition.
- Not deducted at order creation or during picking.
- Stock is re-validated immediately before deduction.

### Transaction boundaries
Must execute inside a transaction: ConfirmOrder, ConfirmPayment, CancelOrder, PAYMENT → DELIVERY_ASSIGNED transition.
Must execute outside: external export (MoySklad) — use outbox pattern instead.

### Forbidden states (implementation is invalid if any is reachable)
- DELIVERY_ASSIGNED/OUT_FOR_DELIVERY/DELIVERED/CLOSED without SUCCESS payment
- CLOSED without DELIVERED
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
- **MoySklad** for product catalog sync and order export
- **jose** for JWT signing/verification
- **nodemailer** for email OTP delivery
- **Vitest** for unit tests; test files live in `__tests__/` subdirectories alongside the code they test
