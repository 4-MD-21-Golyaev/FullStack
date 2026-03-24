---
name: backend
description: Backend rules — transitions, routes, testing, domain invariants
paths:
  - "src/domain/**"
  - "src/application/**"
  - "src/infrastructure/**"
  - "src/app/api/**"
---

# Backend Testing — MANDATORY

**Any addition or change to backend code requires full test coverage before the task is considered done.**

- **New use case** → unit tests: all success paths, all error paths (invalid state, not found, permission denied), edge cases.
- **New domain function / transition** → unit tests for every valid and invalid transition / invariant.
- **New repository method** → happy path + not-found / empty result.
- **New API route** → 2xx response, 4xx validation errors, 401/403 auth failures.
- **Modified code** → update existing tests so coverage does not regress.
- Tests live in `__tests__/` subdirectories alongside the code, using **Vitest**.
- After writing tests run `npx vitest run <path>` to confirm all pass.
- Do NOT mark a backend task complete if any new/changed code path is untested.

---

# Order Lifecycle

```
CREATED → PICKING → PAYMENT → DELIVERY_ASSIGNED → OUT_FOR_DELIVERY → DELIVERED → CLOSED
                 ↘ CANCELLED (from CREATED, PICKING, or PAYMENT)
                                                ↘ DELIVERY_ASSIGNED (delivery failed — retry)
```

> `DELIVERY` enum value is `@deprecated` — backward compat only. All new transitions use extended delivery states.

State transitions enforced in `src/domain/order/transitions.ts`. Illegal transitions throw `InvalidOrderStateError`.

## Transition functions

| Function | Transition |
|---|---|
| `createOrder()` | — → CREATED |
| `startPicking()` | CREATED → PICKING |
| `registerPayment()` | PICKING → PAYMENT |
| `startDelivery()` | PAYMENT → DELIVERY_ASSIGNED |
| `startOutForDelivery()` | DELIVERY_ASSIGNED → OUT_FOR_DELIVERY |
| `confirmDelivered()` | OUT_FOR_DELIVERY → DELIVERED |
| `markDeliveryFailed()` | OUT_FOR_DELIVERY → DELIVERY_ASSIGNED |
| `closeOrder()` | DELIVERED → CLOSED |
| `cancelOrder()` | CREATED/PICKING/PAYMENT → CANCELLED |

## Use cases

| Use case | Role | Transition |
|---|---|---|
| `CreateOrderUseCase` | Customer | — → CREATED |
| `StartPickingUseCase` | Picker | CREATED → PICKING |
| `UpdateOrderItemsUseCase` | Picker | items mutation in PICKING |
| `CompletePickingUseCase` | Picker | PICKING → PAYMENT |
| `InitiatePaymentUseCase` | Customer | creates Yookassa payment |
| `ConfirmPaymentUseCase` | Webhook | PAYMENT → DELIVERY_ASSIGNED |
| `PayOrderUseCase` | Internal | PAYMENT → DELIVERY_ASSIGNED (no gateway) |
| `CourierStartDeliveryUseCase` | Courier | DELIVERY_ASSIGNED → OUT_FOR_DELIVERY |
| `CourierConfirmDeliveredUseCase` | Courier | OUT_FOR_DELIVERY → DELIVERED |
| `CourierMarkDeliveryFailedUseCase` | Courier | OUT_FOR_DELIVERY → DELIVERY_ASSIGNED |
| `CloseOrderUseCase` | System/Admin | DELIVERED → CLOSED |
| `CancelOrderUseCase` | Customer/Admin | CREATED/PICKING/PAYMENT → CANCELLED |
| `OrderPaymentTimeoutUseCase` | Background job | PAYMENT → CANCELLED |

---

# API Routes

## Payment (Yookassa)
1. `POST /api/orders/[id]/pay` → `InitiatePaymentUseCase` → validates stock → creates PENDING Payment → calls gateway → returns `confirmationUrl`
2. Yookassa posts to `POST /api/webhooks/yookassa` → `ConfirmPaymentUseCase` → deducts stock → SUCCESS → DELIVERY_ASSIGNED

Webhook always returns HTTP 200. IPs validated in production (`yookassaIpWhitelist.ts`), skipped in dev. Both use cases are idempotent.

## Picker
| Route | Use case |
|---|---|
| `GET /api/picker/orders/available` | `PickerListAvailableUseCase` |
| `GET /api/picker/orders/me` | `PickerListMyOrdersUseCase` |
| `POST /api/picker/orders/[id]/claim` | `PickerClaimOrderUseCase` |
| `POST /api/picker/orders/[id]/release` | `PickerReleaseOrderUseCase` |

## Courier
Delivery SLA: assignment = 30 min, en-route = 1 hour (`src/domain/order/DeliverySla.ts`).

| Route | Use case |
|---|---|
| `GET /api/courier/orders/available` | `CourierListAvailableUseCase` |
| `GET /api/courier/orders/me` | `CourierListMyOrdersUseCase` |
| `POST /api/courier/orders/[id]/claim` | `CourierClaimOrderUseCase` |
| `POST /api/courier/orders/[id]/release` | `CourierReleaseOrderUseCase` |
| `POST /api/courier/orders/[id]/start-delivery` | `CourierStartDeliveryUseCase` |
| `POST /api/courier/orders/[id]/confirm-delivered` | `CourierConfirmDeliveredUseCase` |
| `POST /api/courier/orders/[id]/mark-delivery-failed` | `CourierMarkDeliveryFailedUseCase` |

## Admin
| Route | Use case |
|---|---|
| `GET /api/admin/orders` | `AdminListOrdersUseCase` |
| `GET /api/admin/payments/issues` | `AdminPaymentIssuesUseCase` |
| `POST /api/admin/payments/[id]/retry` | `AdminRetryPaymentUseCase` |
| `POST /api/admin/payments/[id]/mark-failed` | `AdminMarkPaymentFailedUseCase` |
| `POST /api/admin/jobs/[jobName]/run` | `AdminRunJobUseCase` |
| `GET /api/admin/jobs/[jobName]/status` | `AdminGetJobStatusUseCase` |

## Auth
OTP email flow: `RequestCodeUseCase` → OTP via email → `VerifyCodeUseCase` → JWT + refresh token.

| Route | Use case |
|---|---|
| `POST /api/auth/register` | `RegisterUseCase` |
| `POST /api/auth/request-code` | `RequestCodeUseCase` |
| `POST /api/auth/verify-code` | `VerifyCodeUseCase` |
| `POST /api/auth/refresh` | `RefreshUseCase` |
| `POST /api/auth/logout` | `LogoutUseCase` |
| `GET /api/auth/me` | `GetMeUseCase` |

## Background Jobs
| Route | Trigger | Use case |
|---|---|---|
| `POST /api/cron/payment-timeout` | Cron | `PaymentTimeoutUseCase` |
| `POST /api/internal/jobs/payment-timeout` | Internal | `OrderPaymentTimeoutUseCase` |
| `POST /api/internal/jobs/process-outbox` | Internal | `ProcessOutboxUseCase` |
| `POST /api/internal/jobs/sync-products` | Internal | `SyncProductsUseCase` |

`CRON_SECRET` / `INTERNAL_JOB_SECRET` required Bearer tokens; fail-closed if missing.

---

# Infrastructure Layout

```
src/infrastructure/
├── auth/            # JoseTokenService, NodemailerEmailGateway
├── db/              # prismaClient, PrismaTransactionRunner
├── payment/         # YookassaGateway, yookassaIpWhitelist
├── moysklad/        # HttpMoySkladGateway
└── repositories/    # 11 Prisma repository implementations
```

---

# Domain Rules & Invariants

**Core principle:** invalid domain states must be impossible, not just unlikely.

### Architectural constraints
- State machine lives **only** in `transitions.ts`. No layer may bypass it.
- Domain must not depend on infrastructure. Presentation contains no business rules.

### Cart vs Order
- Cart is mutable and uncommitted — it is **not** an Order.
- Order created **only** on confirmation. No persistent Order exists before that.
- Unauthenticated cart: local storage. Authenticated cart: DB, managed via use cases.

### Order state semantics

| State | Composition | Total | Notes |
|---|---|---|---|
| CREATED | fixed | fixed | cancellation allowed |
| PICKING | may change | may change | absence strategy; return to CREATED forbidden |
| PAYMENT | immutable | immutable | 10-min timeout active |
| DELIVERY_ASSIGNED | immutable | immutable | waiting for courier |
| OUT_FOR_DELIVERY | immutable | immutable | SLA tracked |
| DELIVERED | immutable | immutable | confirmed |
| CLOSED / CANCELLED | — | — | terminal |

### Order invariants
1. Always in exactly one state.
2. Composition immutable after PAYMENT.
3. Total immutable after PAYMENT.
4. Cannot exist without User.
5. Cancellation forbidden in DELIVERY_ASSIGNED, OUT_FOR_DELIVERY, DELIVERED, CLOSED.
6. Transition PICKING → CREATED forbidden.

### Payment rules
- SUCCESS and FAILED are terminal.
- FAILED allows new Payment; SUCCESS forbids it.
- Only one PENDING Payment per Order at a time.
- Timeout: PAYMENT > 10 min with PENDING → auto-cancel.

### Race conditions
- SUCCESS has priority over Cancel. Requires: transactional boundaries + row-level locking or optimistic versioning + state validation inside transaction.

### Stock handling
- Deducted **only** during PAYMENT → DELIVERY_ASSIGNED.
- Re-validated immediately before deduction.

### Transaction boundaries
- Inside transaction: ConfirmOrder, ConfirmPayment, CancelOrder, PAYMENT → DELIVERY_ASSIGNED.
- Outside transaction: MoySklad export — use outbox pattern.

### Forbidden states
- DELIVERY_ASSIGNED/OUT_FOR_DELIVERY/DELIVERED/CLOSED without SUCCESS payment
- CLOSED without DELIVERED
- Multiple SUCCESS Payments for one Order
- Composition change after PAYMENT
- Order without User
- Return from PICKING to CREATED
