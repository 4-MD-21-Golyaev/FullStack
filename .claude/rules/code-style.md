---
name: code-style
description: Code style and general conventions
---

# Code Style

- **Чистота и лаконичность:** без лишних абстракций, дублирования и избыточных комментариев там, где код говорит сам за себя.
- **Декомпозиция:** одинаковая логика в двух и более местах → выносится в вспомогательную функцию. Copy-paste недопустимо.
- **Размер функций:** функция делает одно дело. Разрослась — ищи части, которые можно именовать и вынести.

# Key Conventions

- **Money** stored in rubles, two decimal places (`Decimal(10,2)` in DB, `number` in domain). Prisma repos convert via `.toNumber()` at the infrastructure boundary.
- **OrderItem** snapshots product name, article, and price at creation — product changes don't affect existing orders.
- **Status lookup tables**: `OrderStatus` and `PaymentStatus` are DB lookup tables keyed by `code`. Seed must run before any status-dependent operations.
- **Outbox pattern**: MoySklad export events written to `OutboxEvent` inside the order transaction, processed async by `ProcessOutboxUseCase`. Never call external systems inside a transaction.
- **Claim fields**: `pickerClaimUserId/pickerClaimedAt` and `deliveryClaimUserId/deliveryClaimedAt` track who is working on an order.
- **Delivery timestamps**: `outForDeliveryAt` and `deliveredAt` set by courier transitions, used for SLA.
- Use cases receive repos/gateways via constructor injection; HTTP handlers wire dependencies.
- Path alias `@/*` maps to `src/*`.
- **Customer layout**: all customer-facing containers use `max-width: var(--ctx-layout-max-width)` and `padding-inline: var(--ctx-space-page-desktop)`. Never use 1440/150 hardcoded values or `--primitive-*` in CSS Modules.
