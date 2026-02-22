# UNIMPLEMENTED_PLAN.md
# Нереализованные функции — описаны в спецификации, отсутствуют в коде

---

## 1. Таймаут оплаты — 10-минутный фоновый job (§11) — (DONE)

**Что требует спецификация:**
> §11: "Timeout starts at the moment of transition to PAYMENT state. If Order remains in PAYMENT more than 10 minutes and Payment = PENDING → automatic transition to CANCELLED. Implemented via scheduled background job."
> §20 (критерий завершённости): "payment timeout implemented"

**Что отсутствует:**
Никакого фонового процесса нет. Если заказ застрял в PAYMENT с PENDING-платежом, он останется в этом состоянии вечно.

**Что реализовать:**

### 1.1 Scheduled job (Next.js Route Handler + внешний cron)
Создать endpoint `GET /api/internal/jobs/expire-payments`, защищённый секретным заголовком (`Authorization: Bearer INTERNAL_JOB_SECRET`):

- Выборка всех Order в состоянии PAYMENT, у которых `updatedAt < now - 10 min`
- Для каждого: вызов `CancelOrderUseCase` + пометка Payment как FAILED

Или реализовать как Vercel Cron Job (`vercel.json`) / Next.js Route с `export const dynamic = 'force-dynamic'`.

### 1.2 OrderRepository (новый метод порта)
```typescript
findStalePaymentOrders(olderThan: Date): Promise<Order[]>;
```
Возвращает заказы в PAYMENT, чей `updatedAt` старше заданного времени.

### 1.3 ExpirePaymentsUseCase (новый use-case)
```typescript
class ExpirePaymentsUseCase {
  async execute(): Promise<{expired: number}>;
}
```
Логика:
1. `orderRepo.findStalePaymentOrders(new Date(Date.now() - 10 * 60 * 1000))`
2. Для каждого заказа: `paymentRepo.findByOrderId(order.id)` → если PENDING, обновить на FAILED
3. `cancelOrder(order)` → `orderRepo.save(order)`

**Файлы:**
- `src/application/order/ExpirePaymentsUseCase.ts` (новый)
- `src/application/ports/OrderRepository.ts` (добавить `findStalePaymentOrders`)
- `src/infrastructure/repositories/OrderRepository.prisma.ts` (реализовать)
- `src/app/api/internal/jobs/expire-payments/route.ts` (новый)
- `src/application/order/__tests__/ExpirePaymentsUseCase.spec.ts` (новый)

---

## 2. Защита от гонок: блокировка на уровне БД (§12) — (DONE)

**Что требует спецификация:**
> §12: "row-level locking or optimistic versioning"
> "Priority rule: SUCCESS has priority over Cancel. If SUCCESS is committed first → Cancel forbidden. If Cancel committed first → SUCCESS ignored."

**Что отсутствует:**
В репозиториях нет SELECT FOR UPDATE или оптимистичного версионирования. Порядок коммитов при параллельных запросах не гарантирован.

**Что реализовать:**

### Вариант А: Optimistic versioning (рекомендуется для Prisma)
1. Добавить поле `version Int @default(0)` в модель `Order` (Prisma schema).
2. В `OrderRepository.prisma.ts` при `save(order)` выполнять:
   ```prisma
   UPDATE orders SET ... WHERE id = ? AND version = ?
   ```
   Если `count === 0` → выбрасывать `OptimisticLockError`.
3. В `ConfirmPaymentUseCase` и `CancelOrderUseCase` перехватывать `OptimisticLockError` и перечитывать / отклонять.

### Вариант Б: Row-level lock через raw SQL
В рамках транзакции (п. 1 в CORRECTIONS_PLAN):
```sql
SELECT * FROM orders WHERE id = $1 FOR UPDATE;
```
Через `prisma.$queryRaw` или `prisma.$executeRaw`.

**Файлы:**
- `prisma/schema.prisma` (добавить `version`)
- `src/infrastructure/repositories/OrderRepository.prisma.ts`
- `src/domain/order/errors.ts` (новый `OptimisticLockError`)
- `src/application/order/ConfirmPaymentUseCase.ts`
- `src/application/order/CancelOrderUseCase.ts`

---

## 3. Интеграция с МойСклад (§15)

**Что требует спецификация:**
> §15 Import: "product updates, price updates, availability updates"
> §15 Export: "executed after DELIVERY, must not affect Order validity, implemented via outbox pattern"

**Что отсутствует:**
Ни импорт, ни экспорт не реализованы.

### 3.1 Export (Outbox pattern)

#### 3.1.1 Prisma schema — таблица OutboxEvent
```prisma
model OutboxEvent {
  id          String   @id @default(uuid())
  eventType   String   // "ORDER_DELIVERED"
  payload     Json
  createdAt   DateTime @default(now())
  processedAt DateTime?
}
```

#### 3.1.2 В ConfirmPaymentUseCase (внутри транзакции)
После перевода заказа в DELIVERY — запись в `OutboxEvent` с `payload: {orderId, items}`.

#### 3.1.3 MoySkladGateway (порт + реализация)
```typescript
interface MoySkladGateway {
  exportOrder(orderId: string, items: OrderItem[]): Promise<void>;
}
```

#### 3.1.4 ProcessOutboxUseCase
- Читает необработанные события из `OutboxEvent`
- Вызывает `MoySkladGateway.exportOrder`
- Помечает событие как обработанное (`processedAt`)

#### 3.1.5 Job endpoint
`GET /api/internal/jobs/process-outbox` — запускает `ProcessOutboxUseCase`.

### 3.2 Import (синхронизация ассортимента)

#### 3.2.1 MoySkladGateway (расширение)
```typescript
interface MoySkladGateway {
  exportOrder(...): Promise<void>;
  fetchProducts(): Promise<MoySkladProduct[]>;
}
```

#### 3.2.2 SyncProductsUseCase
- Вызывает `MoySkladGateway.fetchProducts()`
- Сравнивает с локальными данными
- Обновляет название, цену, доступность через `ProductRepository`

#### 3.2.3 Job endpoint
`GET /api/internal/jobs/sync-products`

**Файлы:**
- `prisma/schema.prisma` (OutboxEvent)
- `src/application/ports/MoySkladGateway.ts` (новый)
- `src/infrastructure/moysklad/MoySkladGateway.ts` (новый)
- `src/application/order/ProcessOutboxUseCase.ts` (новый)
- `src/application/product/SyncProductsUseCase.ts` (новый)
- `src/application/ports/OutboxRepository.ts` (новый)
- `src/infrastructure/repositories/OutboxRepository.prisma.ts` (новый)
- `src/app/api/internal/jobs/process-outbox/route.ts` (новый)
- `src/app/api/internal/jobs/sync-products/route.ts` (новый)

---

## 4. Корзина (§5) — (DONE)

### Бизнес-логика

Корзина — это **незафиксированный заказ**: она хранит выбор пользователя до момента подтверждения. Корзина не является Order и не создаёт его — Order возникает только при явном подтверждении.

#### Хранение по типу пользователя

| Состояние | Хранение | Примечание |
|-----------|----------|------------|
| Неавторизованный | `localStorage` на клиенте | Данные не отправляются в БД |
| Авторизованный | Таблица `CartItem` в БД | Управляется через use-cases |

#### Синхронизация при авторизации

При успешном логине происходит слияние корзин по правилу **приоритета локальной**:

- **Локальная корзина непустая** → она полностью заменяет DB-корзину (`SyncCartUseCase`). `localStorage` очищается.
- **Локальная корзина пустая** → DB-корзина загружается без изменений.

Реализовано через `POST /api/cart/sync`.

#### Различие CartItem и OrderItem

| | `CartItem` | `OrderItem` |
|--|------------|-------------|
| Состав | ссылка: `productId + quantity` | snapshot: `name, article, price, quantity` |
| Цена | «живая» — берётся из `Product` при отображении | зафиксирована на момент подтверждения |
| Изменяемость | да — пользователь редактирует | нет — неизменна после создания Order |

#### Подтверждение заказа

`POST /api/orders` с телом `{ address, absenceResolutionStrategy, items: [{productId, quantity}] }`:
1. `CreateOrderUseCase` читает переданные позиции, для каждой запрашивает `Product` и **фиксирует** `name, article, price` в `OrderItem`
2. После создания Order роут вызывает `cartRepository.clear(userId)` — корзина очищается

#### Правила состояния корзины (инварианты)

- Корзина не является Order и не имеет состояния заказа
- Composition adjustment разрешена в любой момент до подтверждения
- После перехода заказа в PAYMENT состав OrderItem неизменен (корзина к этому уже очищена)
- При выходе из системы `localStorage` очищается; DB-корзина остаётся нетронутой

### Реализованные файлы

**Domain / Application:**
- `src/domain/cart/CartItem.ts` — `{ userId, productId, quantity }`
- `src/application/ports/CartRepository.ts` — `findByUserId, findByUserAndProduct, save, remove, clear`
- `src/application/cart/AddToCartUseCase.ts` — добавить / увеличить количество
- `src/application/cart/RemoveFromCartUseCase.ts` — убрать позицию
- `src/application/cart/UpdateCartItemUseCase.ts` — изменить количество
- `src/application/cart/GetCartUseCase.ts` — получить с текущими ценами (`CartItemView`)
- `src/application/cart/SyncCartUseCase.ts` — заменить DB-корзину локальной при логине

**Infrastructure:**
- `src/infrastructure/repositories/CartRepository.prisma.ts` — upsert по `@@unique([userId, productId])`
- `prisma/migrations/20260221000000_add_cart_item_unique/` — уникальный индекс на `(userId, productId)`

**HTTP layer:**
- `src/app/api/cart/route.ts` — `GET` (GetCart), `POST` (AddToCart)
- `src/app/api/cart/[productId]/route.ts` — `PATCH` (UpdateCartItem), `DELETE` (RemoveFromCart)
- `src/app/api/cart/sync/route.ts` — `POST` (SyncCart при логине)
- `src/app/api/orders/route.ts` — `POST` дополнен очисткой корзины после фиксации заказа

**Тесты:** 18 unit-тестов (AddToCart·5, RemoveFromCart·1, UpdateCartItem·5, GetCart·3, SyncCart·4)

---

## 5. Личный кабинет пользователя — API (§18) — (DONE)

**Что требует спецификация:**
> §18 Allowed: "view orders, view status, repeat order"
> §18 Forbidden: "modify DELIVERY, modify CLOSED, bypass state machine"

**Что реализовано:**
- ~~`findByUserId` в OrderRepository (порт + Prisma-реализация)~~
- ~~`GET /api/orders` — список заказов аутентифицированного пользователя~~

**Что остаётся реализовать:**

### 5.1 Use cases
- `RepeatOrderUseCase` — создать новый заказ на основе состава существующего

Логика `RepeatOrderUseCase`:
1. Найти исходный заказ по `orderId`
2. Проверить, что пользователь совпадает
3. Для каждого `OrderItem` найти актуальный `Product` (новая цена)
4. Проверить доступность и остатки
5. Вызвать `CreateOrderUseCase` с новым составом

### 5.2 API endpoints
```
GET  /api/orders/[id]             — просмотр одного заказа
POST /api/orders/[id]/repeat      — RepeatOrderUseCase
```

**Файлы:**
- `src/application/order/RepeatOrderUseCase.ts` (новый)
- `src/app/api/orders/[id]/route.ts` (новый — GET)
- `src/app/api/orders/[id]/repeat/route.ts` (новый)

---

## 6. Аутентификация и ролевой доступ (RBAC) — (DONE)

**Что требует спецификация:**
> §18 Forbidden: "modify DELIVERY, modify CLOSED, bypass state machine"
> Складские операции (PICKING, изменение состава) не должны быть доступны обычному клиенту.

**Что реализовано:**
- Email OTP аутентификация (`/api/auth/request-code`, `/api/auth/verify-code`)
- JWT-сессия в HttpOnly cookie (`signJwt`, `verifyJwt`, `setSessionCookie`)
- Регистрация пользователя (`/api/auth/register`)
- Просмотр сессии (`/api/auth/me`), выход (`/api/auth/logout`)
- `src/proxy.ts` — защита всех `/api/` роутов: публичные префиксы, RBAC для STAFF-only операций, стриппинг спуфинга заголовков
- Тесты: middleware (11), register (4), request-code (4), verify-code (5), me (2), logout (1)

**Разграничение по ролям (реализовано в proxy.ts):**

| Эндпоинт | CUSTOMER | STAFF | ADMIN |
|----------|----------|-------|-------|
| `POST /api/orders` | ✅ | ✅ | ✅ |
| `GET /api/orders` | ✅ | ✅ | ✅ |
| `POST /api/orders/[id]/cancel` | ✅ | ✅ | ✅ |
| `POST /api/orders/[id]/start-picking` | ❌ | ✅ | ✅ |
| `PATCH /api/orders/[id]/items` | ❌ | ✅ | ✅ |
| `POST /api/orders/[id]/complete-picking` | ❌ | ✅ | ✅ |

---

## Сводная таблица нереализованных функций

| # | Функция | Приоритет | Критерий §20 | Статус |
|---|---------|-----------|-------------|--------|
| 1 | Payment timeout (10 мин → CANCELLED) | Высокий | Да | DONE |
| 2 | Row-level locking / optimistic versioning | Высокий | Да (race conditions) | DONE |
| 3 | MoySklad Export (outbox pattern) | Средний | — | — |
| 4 | MoySklad Import (sync продуктов) | Средний | — | — |
| 5 | Cart use-cases + API | Средний | — | DONE |
| 6 | Личный кабинет (список заказов, повтор) | Средний | — | DONE |
| 7 | Аутентификация и ролевой доступ (RBAC) | Высокий | — | DONE |

---

## Порядок реализации (рекомендация)

1. ~~п. 2 (блокировки)~~ — DONE
2. ~~п. 1 (таймаут оплаты)~~ — DONE
3. ~~п. 7 (аутентификация и роли)~~ — DONE
4. ~~п. 5 (корзина)~~ — DONE
5. ~~п. 6 (личный кабинет)~~ — DONE
6. **В конце** — п. 3 и 4 (МойСклад — серверная интеграция, не зависит от ролей и пользователей)