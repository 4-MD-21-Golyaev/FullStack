# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.
Detailed rules live in `.claude/rules/` and load automatically when relevant files are accessed.

## Commands

```bash
npm run dev        # Start Next.js development server (localhost:3000)
npm run build      # Build for production
npm run lint       # Run ESLint
npm run test       # Run all tests with Vitest
npx vitest run src/path/to/file.spec.ts  # Run a single test file

npx prisma migrate dev    # Apply migrations in development
npx prisma db seed        # Seed the database (required before first run)
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

**Next.js e-commerce order management system** following **Hexagonal (Ports & Adapters) / Clean Architecture**.

### Layer Structure

```
src/
├── shared/ui/       # Design system — pure UI components, no business logic
├── widgets/         # Composite page-level blocks, organized by role:
│   ├── customer/    # Customer-facing (Header, Footer, ProductCard, Slider, etc.)
│   ├── admin/       # Admin interface blocks
│   ├── courier/     # Courier workflow blocks
│   ├── picker/      # Picker workflow blocks
│   └── WorkerHeader/
├── entities/        # Domain entity UI (future: product, order, user)
├── features/        # User interaction flows (future: cart, auth, search)
├── domain/          # Entities, enums, state machine, domain errors — pure TypeScript
├── application/     # Use cases + port interfaces
│   └── ports/       # Interfaces that infrastructure must implement
├── infrastructure/  # Prisma repositories, Yookassa/MoySklad gateways, auth
└── app/             # Next.js App Router — pages and API routes
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
├── layout/     Container, Grid, GridItem
├── icons/      Icon, Logo
├── buttons/    Button, IconButton, ArrowButton, ArrowsContainer, ArrowBg,
│               LikeButton, SocialButton, CartButton, MobilePanelButton, MobilePanelCartButton
├── inputs/     InputBase, Input, TextField, Search  (+ Select, Counter, Switch, Radio…)
├── feedback/   Badge, OrderStatusBadge, PaymentStatusBadge, Spinner, Skeleton,
│               Modal, Toast, ConfirmDialog, SlaTimer
├── data/       StatCard, DataTable, FilterBar
└── index.ts    ← single public barrel, ALL consumers import from here
```

**Cross-group imports inside shared/ui use relative paths**, e.g. `buttons/IconButton` imports Icon as `../../icons/Icon/Icon`.

**Dependency rule:** domain ← application ← infrastructure ← HTTP layer. Inner layers never import outer layers.

### Order Lifecycle

```
CREATED → PICKING → PAYMENT → DELIVERY_ASSIGNED → OUT_FOR_DELIVERY → DELIVERED → CLOSED
                 ↘ CANCELLED (from CREATED, PICKING, or PAYMENT)
                                                ↘ DELIVERY_ASSIGNED (delivery failed — retry)
```

> `DELIVERY` enum value is `@deprecated` — backward compat only. All new transitions use extended delivery states.

State transitions enforced in `src/domain/order/transitions.ts`.

## Tech Stack

- **Next.js 16** (App Router), **React 19**, **TypeScript** (strict)
- **PostgreSQL** via **Prisma 7** (`@prisma/adapter-pg`)
- **Yookassa** — Russian payment gateway
- **MoySklad** — product catalog sync and order export
- **jose** for JWT, **nodemailer** for email OTP
- **Vitest** for unit tests; test files in `__tests__/` subdirectories alongside the code

## Agent Delegation — Hard Rules

These rules apply regardless of task size, file count, or apparent simplicity.

**UI files** (`src/shared/ui/**`, `src/widgets/**`, `src/features/**`, `src/entities/**`, `src/app/**/page.tsx`, `src/app/**/layout.tsx`):
- Never implement directly in main conversation.
- Always: Implementation agent → Review agent (prompts in `.claude/rules/ui-components.md`).
- 1-line change still requires Review agent. No exceptions.

**Backend files** (`src/domain/**`, `src/application/**`, `src/infrastructure/**`, `src/app/api/**`):
- Implementation may be direct for small changes, **unless the task also touches UI** — then always use an agent to enable parallel execution.
- Test+Review agent is always required after any code change (prompt in `.claude/rules/testing.md`).
- No exceptions.

**The only case requiring no agents:** non-code edits — typos in strings, comment updates, static text changes with no logic touched.
