# Architecture

## Overview

Next.js e-commerce order management system following **Hexagonal (Ports & Adapters) / Clean Architecture**.

**Stack:** Next.js 16, React 19, TypeScript (strict), PostgreSQL, Prisma 7 (`@prisma/adapter-pg`), Yookassa payment gateway, Vitest.

**Dependency rule:** domain ← application ← infrastructure ← HTTP layer. Inner layers never import outer layers.

---

## Directory Structure

```
src/
├── domain/              # Pure TypeScript — entities, enums, state machine, errors
├── application/         # Use cases + port interfaces
│   └── ports/           # Repository & Gateway abstractions
├── infrastructure/      # Prisma repositories, Yookassa gateway, transaction runner
├── app/api/             # Next.js App Router — thin HTTP handlers
├── lib/auth/            # JWT, OTP, email, session utilities
└── instrumentation.ts   # Node.js cron job bootstrap
prisma/
├── schema.prisma
└── seed.ts
```

---

## Domain Layer (`src/domain/`)

### Entities

| File | Description |
|------|-------------|
| `order/Order.ts` | `{ id, userId, items, totalAmount, state, address, absenceResolutionStrategy, createdAt, updatedAt }` |
| `order/OrderItem.ts` | `{ productId, name, article, price, quantity }` — immutable snapshot |
| `order/OrderState.ts` | Enum: `CREATED \| PICKING \| PAYMENT \| DELIVERY \| CLOSED \| CANCELLED` |
| `order/AbsenceResolutionStrategy.ts` | Enum: `CALL_REPLACE \| CALL_REMOVE \| AUTO_REMOVE \| AUTO_REPLACE` |
| `order/errors.ts` | `InvalidOrderStateError`, `OrderNotFoundError`, `InsufficientStockError` |
| `payment/Payment.ts` | `{ id, orderId, amount, status, externalId?, createdAt }` |
| `payment/PaymentStatus.ts` | Enum: `PENDING \| SUCCESS \| FAILED` |
| `product/Product.ts` | `{ id, name, article, price, stock, imagePath, categoryId }` |
| `category/Category.ts` | `{ id, name, imagePath, parentId }` |
| `cart/CartItem.ts` | `{ userId, productId, quantity }` |

### Order State Machine (`order/transitions.ts`)

```
CREATED ──→ PICKING ──→ PAYMENT ──→ DELIVERY ──→ CLOSED
   │            │            │
   └────────────┴────────────┴──→ CANCELLED
```

Transition functions:

| Function | Transition |
|----------|-----------|
| `createOrder()` | → CREATED |
| `startPicking()` | CREATED → PICKING |
| `registerPayment()` | PICKING → PAYMENT |
| `startDelivery()` | PAYMENT → DELIVERY |
| `closeOrder()` | DELIVERY → CLOSED |
| `cancelOrder()` | CREATED / PICKING / PAYMENT → CANCELLED |

**Invariants enforced in domain:**
- Order always in exactly one state
- Items are immutable name/article/price snapshots (fixed at creation)
- Total immutable after PAYMENT
- Composition changes only allowed in PICKING
- Cannot return from PICKING to CREATED
- Cancellation forbidden in DELIVERY and CLOSED
- DELIVERY requires prior SUCCESS payment (enforced by flow)

---

## Application Layer (`src/application/`)

### Port Interfaces (`ports/`)

**OrderRepository**
```typescript
findById(id: string): Promise<Order | null>
findByUserId(userId: string): Promise<Order[]>
save(order: Order): Promise<void>
```

**PaymentRepository**
```typescript
findById(id: string): Promise<Payment | null>
findByOrderId(orderId: string): Promise<Payment | null>
findPendingByOrderId(orderId: string): Promise<Payment | null>
findByExternalId(externalId: string): Promise<Payment | null>
findStalePending(olderThan: Date): Promise<Payment[]>
save(payment: Payment): Promise<void>
```

**PaymentGateway**
```typescript
createPayment(params: CreatePaymentParams): Promise<{ externalId: string; confirmationUrl: string }>
// params.internalPaymentId used as Yookassa Idempotence-Key
```

**ProductRepository**
```typescript
findById(id: string): Promise<Product | null>
findAll(): Promise<Product[]>
findByCategoryId(categoryId: string): Promise<Product[]>
save(product: Product): Promise<void>  // stock updates only
```

**CartRepository**
```typescript
findByUserId(userId: string): Promise<CartItem[]>
findByUserAndProduct(userId: string, productId: string): Promise<CartItem | null>
save(item: CartItem): Promise<void>
remove(userId: string, productId: string): Promise<void>
clear(userId: string): Promise<void>
```

**CategoryRepository**
```typescript
findByParentId(parentId: string | null): Promise<Category[]>
```

**TransactionRunner**
```typescript
run<T>(work: (ctx: { orderRepository, paymentRepository, productRepository }) => Promise<T>): Promise<T>
// Serializable isolation level
```

### Use Cases

#### Order Use Cases (`application/order/`)

| Use Case | Input | Key Behaviour |
|----------|-------|---------------|
| `CreateOrderUseCase` | userId, address, strategy, items[] | Validates stock → snapshots items → CREATED; runs in tx |
| `StartPickingUseCase` | orderId | CREATED → PICKING |
| `CompletePickingUseCase` | orderId | PICKING → PAYMENT |
| `InitiatePaymentUseCase` | orderId, returnUrl | Idempotent; validates stock; creates PENDING Payment; calls gateway; returns confirmationUrl |
| `ConfirmPaymentUseCase` | externalId, event | Idempotent; inside tx: re-validates stock → deducts stock → SUCCESS → DELIVERY (or FAILED → CANCELLED) |
| `PayOrderUseCase` | orderId | PAYMENT → DELIVERY directly (no gateway — for testing/internal) |
| `CancelOrderUseCase` | orderId | Validates cancellable state → CANCELLED; tx |
| `CloseOrderUseCase` | orderId | DELIVERY → CLOSED |
| `UpdateOrderItemsUseCase` | orderId, items[] | Only in PICKING; preserves existing snapshots; recalculates total; tx |
| `PaymentTimeoutUseCase` | timeoutMs | Finds stale PENDING payments → per-payment tx: FAILED + CANCELLED |
| `RepeatOrderToCartUseCase` | orderId, userId | Copies completed order items to cart (increments if already present) |

#### Cart Use Cases (`application/cart/`)

| Use Case | Behaviour |
|----------|-----------|
| `AddToCartUseCase` | Adds or increments item; validates product exists |
| `GetCartUseCase` | Returns items with current product stock/price/image |
| `RemoveFromCartUseCase` | Removes item |
| `UpdateCartItemUseCase` | Updates quantity (must be > 0) |
| `SyncCartUseCase` | Replaces entire cart (local-storage → DB sync after login) |

---

## Infrastructure Layer (`src/infrastructure/`)

### Prisma Repositories (`repositories/`)

All repositories accept an optional `DbClient` (PrismaClient | Prisma.TransactionClient) enabling transactional use.

- **PrismaOrderRepository** — upserts Order + nested OrderItems (deleteMany + createMany); converts `status.code` → `OrderState`; `Prisma.Decimal` → `number`
- **PrismaPaymentRepository** — upserts Payment with status lookup; `findStalePending` filters PENDING before cutoff date
- **PrismaCartRepository** — upsert on composite key (userId, productId); `clear()` for bulk delete
- **PrismaProductRepository** — `save()` updates only stock field; price converted to number
- **PrismaCategoryRepository** — queries by parentId; sorted alphabetically

### Transaction Support (`db/`)

**PrismaTransactionRunner** — wraps `prisma.$transaction()` at Serializable isolation level; instantiates all three transactional repositories inside the callback and passes them as `ctx`.

**prismaClient.ts** — singleton PrismaClient with `@prisma/adapter-pg`; development-mode caching.

### Payment Gateway (`payment/`)

**YookassaGateway**
- Basic auth from `YOOKASSA_SHOP_ID` + `YOOKASSA_SECRET_KEY`
- POST `https://api.yookassa.ru/v3/payments`
- `Idempotence-Key` header = `internalPaymentId`
- Amount as `string` via `.toFixed(2)`
- Returns `{ externalId: data.id, confirmationUrl }`

**yookassaIpWhitelist.ts** — CIDR validation against Yookassa's published IP ranges; skipped in development.

---

## HTTP Layer (`src/app/api/`)

Thin route handlers: parse request → wire dependencies → call use case → return response. No business logic.

### Authentication (`api/auth/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/request-code` | POST | Generates 6-digit OTP (10-min expiry); sends email; dev mode returns code in response |
| `/api/auth/verify-code` | POST | Verifies OTP → find-or-create user → sign JWT → set httpOnly session cookie (7 days) |
| `/api/auth/logout` | POST | Clears session cookie |
| `/api/auth/me` | GET | Returns `{ userId, email, role }` from session |

**JWT:** HS256, payload `{ sub, role, email }`, 7-day expiry, secret from `JWT_SECRET`.
**Cookie:** `session`, httpOnly, SameSite=lax, Secure in production.

### Orders (`api/orders/`)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/orders` | GET | x-user-id | List user's orders (sorted by createdAt desc) |
| `/api/orders` | POST | x-user-id | Create order from cart; clears cart |
| `/api/orders/[id]` | GET | x-user-id | Get order; CUSTOMER sees own only |
| `/api/orders/[id]/items` | PATCH | — | Update items (PICKING only) |
| `/api/orders/[id]/start-picking` | POST | — | CREATED → PICKING |
| `/api/orders/[id]/complete-picking` | POST | — | PICKING → PAYMENT |
| `/api/orders/[id]/pay` | POST | — | Initiate Yookassa payment → `{ confirmationUrl }` |
| `/api/orders/[id]/cancel` | POST | x-user-id | Cancel order; CUSTOMER sees own only |
| `/api/orders/[id]/close` | POST | — | DELIVERY → CLOSED |
| `/api/orders/[id]/repeat` | POST | x-user-id | Copy order items to cart |

### Cart (`api/cart/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cart` | GET | List cart items with current product details |
| `/api/cart` | POST | Add item `{ productId, quantity }` |
| `/api/cart/[productId]` | POST | Update item quantity |
| `/api/cart/sync` | POST | Replace entire cart |

### Products & Metadata

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/products` | GET | All products or filtered by `?categoryId=` |
| `/api/products/[id]` | GET | Single product |
| `/api/categories` | GET | Categories by `?parentId=` (null = roots) |
| `/api/order-statuses` | GET | `{ code, name }` lookup list |
| `/api/user-roles` | GET | `{ code, name }` lookup list |
| `/api/absence-resolution-strategies` | GET | `{ code, name }` lookup list |

### Webhooks & Cron

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhooks/yookassa` | POST | IP-validated; handles `payment.succeeded` / `payment.canceled`; always returns 200 |
| `/api/cron/payment-timeout` | POST | Manual trigger for PaymentTimeoutUseCase |

---

## Database Schema (`prisma/schema.prisma`)

### Lookup Tables

| Table | Codes |
|-------|-------|
| `OrderStatus` | CREATED, PICKING, PAYMENT, DELIVERY, CLOSED, CANCELLED |
| `PaymentStatus` | PENDING, SUCCESS, FAILED |
| `AbsenceResolutionStrategy` | CALL_REPLACE, CALL_REMOVE, AUTO_REMOVE, AUTO_REPLACE |
| `UserRole` | CUSTOMER, STAFF, ADMIN |

### Core Tables

```
User
  id, phone?, email?, address?, role → UserRole.code

EmailOtp
  id, email (indexed), code, expiresAt, used

Category
  id, name, imagePath?, parentId → Category.id  (self-referential, hierarchical)

Product
  id, name, article, price Decimal(10,2), stock, imagePath?, categoryId → Category.id

CartItem
  userId → User.id, productId → Product.id, quantity
  UNIQUE (userId, productId)

Order
  id, userId → User.id, statusId → OrderStatus.id
  totalAmount Decimal(10,2), address, deliveryAt?
  absenceResolutionStrategyId → AbsenceResolutionStrategy.id
  createdAt, updatedAt

OrderItem
  id, orderId → Order.id (CASCADE DELETE)
  productId → Product.id
  name (snapshot), article (snapshot), price (snapshot) Decimal(10,2)
  quantity

Payment
  id, orderId → Order.id, statusId → PaymentStatus.id
  externalId? (Yookassa ID), amount Decimal(10,2), createdAt
```

**Money:** stored as `Decimal(10,2)` (rubles); converted to `number` at the infrastructure boundary via `.toNumber()`.

---

## Key Algorithms

### Payment Flow

```
POST /orders/[id]/pay
  └─ InitiatePaymentUseCase
       ├─ check order not in terminal state
       ├─ check no existing PENDING payment (idempotency)
       ├─ validate stock for all items
       ├─ create Payment (PENDING)
       ├─ YookassaGateway.createPayment()  [internalPaymentId as idempotency key]
       └─ return confirmationUrl

  [User completes payment on Yookassa]

POST /webhooks/yookassa  { event: "payment.succeeded", object: { id } }
  └─ ConfirmPaymentUseCase  [transaction, Serializable]
       ├─ pre-check idempotency (outside tx)
       ├─ inside tx:
       │    ├─ re-check idempotency  (race guard)
       │    ├─ re-validate product stock
       │    ├─ deduct stock from all products
       │    ├─ mark Payment → SUCCESS
       │    └─ transition Order → DELIVERY
       └─ always return 200
```

### Payment Timeout

```
[cron, every minute via instrumentation.ts]
  └─ PaymentTimeoutUseCase.execute(10 * 60 * 1000)
       ├─ findStalePending(now - 10min)
       └─ for each Payment (separate transaction):
            ├─ re-verify Payment still PENDING
            ├─ re-verify Order still in PAYMENT
            ├─ mark Payment → FAILED
            └─ cancel Order
```

### Stock Validation — Three-Check Strategy

1. **Order creation** — validate stock exists (not deducted)
2. **InitiatePaymentUseCase** — re-validate before creating payment
3. **ConfirmPaymentUseCase** — re-validate inside transaction immediately before deduction

### Race Condition Handling

- `ConfirmPaymentUseCase` uses idempotency double-check (outside + inside transaction)
- SUCCESS committed first → subsequent Cancel is rejected
- Serializable isolation prevents concurrent interleaving of PAYMENT → DELIVERY transition
- Payment timeout uses per-payment transactions to avoid blocking on partial failures

---

## Cron & Background Jobs

**instrumentation.ts** (Next.js Instrumentation API, Node.js runtime only):
- Starts on server bootstrap
- Schedules `* * * * *` (every minute)
- Runs `PaymentTimeoutUseCase`
- Logs errors; does not crash the server

Alternative: `POST /api/cron/payment-timeout` for external cron services (Vercel Cron, etc.)

---

## Dependency Injection

Route handlers wire all dependencies manually — no DI container:

```typescript
// Example: payment initiation route
const prisma = getPrismaClient();
const orderRepo   = new PrismaOrderRepository(prisma);
const paymentRepo = new PrismaPaymentRepository(prisma);
const productRepo = new PrismaProductRepository(prisma);
const txRunner    = new PrismaTransactionRunner(prisma);
const gateway     = new YookassaGateway();

const useCase = new InitiatePaymentUseCase(
  orderRepo, paymentRepo, productRepo, txRunner, gateway
);
const result = await useCase.execute({ orderId, returnUrl });
```

Transaction-bound use cases receive `TransactionRunner`, which instantiates fresh repository instances inside the transaction context and passes them as `ctx`.

---

## Testing

**Framework:** Vitest
**Location:** `__tests__/` subdirectories alongside the code under test

| Test File | What it Tests |
|-----------|---------------|
| `domain/order/__tests__/order.spec.ts` | State machine transitions, invariants |
| `application/order/__tests__/` | All order use cases (mocked repositories) |
| `application/cart/__tests__/` | Cart use cases |
| `infrastructure/payment/__tests__/yookassaIpWhitelist.spec.ts` | CIDR matching |
| `lib/auth/__tests__/` | JWT sign/verify, OTP generation |
| `__tests__/middleware.spec.ts` | Auth middleware |
| `app/api/auth/__tests__/` | Auth API routes |

```bash
npm run test                          # all tests
npx vitest run src/path/to/file.spec.ts  # single file
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `YOOKASSA_SHOP_ID` | Yookassa shop identifier |
| `YOOKASSA_SECRET_KEY` | Yookassa secret key |
| `YOOKASSA_RETURN_URL` | Base URL for post-payment redirect (default: `http://localhost:3000`) |
| `JWT_SECRET` | HS256 signing key, min 32 characters |
| `SMTP_HOST` | SMTP host |
| `SMTP_PORT` | 587 or 465 |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | Sender address |
| `NODE_ENV` | `development` / `production` — affects IP validation, cron, logging |