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
├── shared/ui/       # Design system — pure UI components, no business logic (buttons, inputs, icons, etc.)
├── widgets/         # Composite page-level blocks, organized by role:
│   ├── customer/    # Customer-facing (Header, Footer, ProductCard, Slider, etc.)
│   ├── admin/       # Admin interface blocks
│   ├── courier/     # Courier workflow blocks
│   ├── picker/      # Picker workflow blocks
│   └── WorkerHeader/
├── entities/        # Domain entity UI (future: product, order, user)
├── features/        # User interaction flows (future: cart, auth, search)
├── domain/          # Entities, enums, state machine, domain errors — pure TypeScript, no dependencies
├── application/     # Use cases + port interfaces (Repository & Gateway abstractions)
│   └── ports/       # Interfaces that infrastructure must implement
├── infrastructure/  # Concrete implementations: Prisma repositories, Yookassa/MoySklad gateways, auth
└── app/             # Next.js App Router — pages (app/) and API routes (app/api/)
```

**FSD import rule (STRICT — never violate):**
- `shared/ui` imports nothing from `widgets`, `entities`, `features`, or `app`
- `entities` imports only from `shared/ui`
- `features` imports from `shared/ui` and `entities`
- `widgets` imports from `shared/ui`, `entities`, and `features`
- `app` imports from any layer

**shared/ui internal groups:**
```
src/shared/ui/
├── icons/      Icon, Logo
├── buttons/    Button, IconButton, ArrowButton, ArrowsContainer, ArrowBg,
│               LikeButton, SocialButton, CartButton, MobilePanelButton, MobilePanelCartButton
├── inputs/     InputBase, Input, TextField, Search  (+ Select, Counter, Switch, Radio…)
├── feedback/   Badge, OrderStatusBadge, PaymentStatusBadge, Spinner, Skeleton,
│               Modal, Toast, ConfirmDialog, SlaTimer
├── data/       StatCard, DataTable, FilterBar
└── index.ts    ← single public barrel, ALL consumers import from here
```

**Rule: cross-group imports inside shared/ui use relative paths going up to the group level**, e.g. `buttons/IconButton` imports Icon as `../../icons/Icon/Icon`.

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

### Agent Workflow — UI Component Implementation

Every UI component follows a two-phase workflow: **implement → review**.
The review is mandatory and always runs as a separate agent after implementation.

#### Phase 1 — Implementation agent prompt (include verbatim)

```
Before writing any code:
1. Read src/shared/ui/index.ts — this is the authoritative list of existing components.
2. Use existing components instead of raw HTML. Rules in CLAUDE.md section
   "UI Component Composition — CRITICAL RULES" are mandatory and non-negotiable.
3. Place the new component in the correct shared/ui group (icons/buttons/inputs/feedback/data/).
4. Export it from src/shared/ui/index.ts.
5. For every CSS value from Figma, map it to a token using this priority:
   component token (--button-*, --card-*…) if one already exists for this component →
   context token (--ctx-*) that semantically matches the intent →
   if nothing fits: add the missing token to src/styles/tokens/context.css, never hardcode the value.
   STRICT: --primitive-* tokens are FORBIDDEN in CSS Modules and component.css — only context.css may reference them.
   font-weight is NEVER a token — write a numeric literal with a Figma text style comment:
     font-weight: 500; /* [Desktop]/Utilities/Medium */
   --ctx-font-size-h1/h2/h3/h4 are ONLY for heading roles matching Figma [Desktop]/Headings/* styles.
   Do NOT create a new --mycomp-* token family unless it's a true override or a fixed Figma dimension.
```

#### Phase 2 — Review agent prompt (include verbatim)

After implementation, launch a separate review agent with:

```
Review the component at <path>. Check each item and report PASS or FAIL with evidence:

1. RAW HTML — search the file for <button, <input, <textarea, <select, <a .
   Each must be replaced by an existing shared/ui component. FAIL if any found.
2. BARREL — open src/shared/ui/index.ts and confirm the new component is exported.
   FAIL if missing.
3. GROUP — confirm the file is inside one of: icons/ buttons/ inputs/ feedback/ data/.
   FAIL if placed at shared/ui root or in wrong group.
4. TOKENS — search the CSS module for:
   a) hex values (#) or named colors — FAIL if a matching ctx/component token exists.
   b) px literals other than 0, 1px/2px borders, or values with a "/* Figma: … */" comment — FAIL.
   c) --primitive-* references — ALWAYS FAIL, no exceptions (primitives are forbidden in CSS Modules).
5. IMPORTS — confirm cross-group imports inside shared/ui use relative paths (../../group/…).
   FAIL if @/shared/ui barrel is used inside the library itself.
6. TYPESCRIPT — run: npx tsc --noEmit. FAIL if any errors.

Return a summary table: rule | result | detail.
If any FAIL: fix the issue, then re-run the failed check to confirm it passes.
```

---

### UI Component Composition — CRITICAL RULES

These rules are **non-negotiable**. Every agent and developer must follow them.

#### Rule 1 — Read the barrel first

**Always read `src/shared/ui/index.ts` before implementing any component** to see what already exists. Never reimplement something that's already there.

#### Rule 2 — Compose, don't reimplement

When a component is built from other UI components, **import and use those components** — never rewrite their HTML/CSS from scratch.

- `Search` = `InputBase` + `IconButton` — not `<input>` + `<button>`
- `CartButton` = `IconButton` + badge `<span>` — not `<button>` + `<Icon>`
- `MobilePanelCartButton` = `MobilePanelButton` + badge `<span>`

#### Rule 3 — Mandatory HTML → component substitutions

Before writing any raw HTML element, use this table:

```
Raw HTML                          → Use instead
─────────────────────────────────────────────────────────
<button> with icon only           → IconButton (xs/sm/md/lg × white/gray/red)
<button> with text                → Button (primary/secondary/tertiary/ghost)
<button> arrow navigation         → ArrowButton (sm/md/lg × left/right)
<input type="text"> standalone    → InputBase (size/color/error)
<input type="text"> + label/hint  → Input (wraps InputBase)
<textarea>                        → TextField
Two ArrowButtons side by side     → ArrowsContainer
Heart toggle button               → LikeButton
Social network button             → SocialButton (whatsapp/telegram/vk)
Cart icon button with badge       → CartButton
Mobile nav item                   → MobilePanelButton
Mobile nav cart item              → MobilePanelCartButton
```

**This table covers currently implemented components and is not exhaustive.**
`src/shared/ui/index.ts` is the authoritative source — always read it before implementing.

#### Rule 4 — Placement of new shared/ui components

Every new component goes into the correct group:

```
icons/    — standalone visual primitives (Icon, Logo, decorative SVGs)
buttons/  — any interactive element that triggers an action
inputs/   — any element that accepts user text/selection input
feedback/ — status indicators, overlays, notifications
data/     — tables, cards, stat displays
```

If a component doesn't fit any group, create a new group — never add to the flat `shared/ui/` root.

#### CSS Token System — Rules for agents

**Three-layer rule (STRICT):**
- `primitive.css` → `context.css` → `component.css` → CSS Module
- `--primitive-*` only in `context.css`. Forbidden everywhere else.
- `--ctx-*` in CSS Modules and `component.css`.
- Component tokens (`--button-*`, `--card-*` …) are justified **only** when:
  - **(a)** the token contains a fixed value from Figma not present in the ctx layer (px/rem/rgba literals, e.g. `240px`, `6px`, `rgba(255,255,255,0.08)`), OR
  - **(b)** the token combines multiple ctx-tokens into a single multi-value shorthand, e.g. `--button-padding-sm: var(--ctx-space-inset-sm) 12px`.
- **A single-line alias is FORBIDDEN:** `--comp-x: var(--ctx-y)` — use the ctx token directly in the CSS Module. Do NOT create a component token that is a pure pass-through for one ctx token.

**font-weight is never tokenized.** Always write a numeric literal:
```css
font-weight: 450; /* [Desktop]/Utilities/Regular */
font-weight: 500; /* [Desktop]/Utilities/Medium */
font-weight: 600; /* Semibold */
font-weight: 700; /* Bold */
```

**Figma text styles → token mapping:**

| Figma text style | Token | Weight (literal) |
|---|---|---|
| [Desktop]/Headings/Heading 1 | `--ctx-font-size-h1` (40px) | `700` |
| [Desktop]/Headings/Heading 2 | `--ctx-font-size-h2` (36px) | `700` |
| [Desktop]/Headings/Heading 3 | `--ctx-font-size-h3` (24px) | `700` |
| [Desktop]/Headings/Heading 4 | `--ctx-font-size-h4` (20px) | `700` |
| [Desktop]/Body / H5 | `--ctx-font-size-body` (18px) | `450` or `500` |
| [Desktop]/Utilities/Caption | `--ctx-font-size-caption` (16px) | `450` |
| [Desktop]/Utilities/Secondary | `--ctx-font-size-label` (14px) | `500` |
| [Mobile]/Utilities/Secondary | `--ctx-font-size-xs` (12px) | `450` |

`--ctx-font-size-h1/h2/h3/h4` are **only** for heading roles. Do not use them as arbitrary size aliases.

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
- **Customer layout standard**: All customer-facing page containers must use `max-width: var(--ctx-layout-max-width)` and `padding-inline: var(--ctx-space-page-desktop)` on desktop. Do not use 1440/150 legacy values or `--primitive-*` spacing in CSS Modules.

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
