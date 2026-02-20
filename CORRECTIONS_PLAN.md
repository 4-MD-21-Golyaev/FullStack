# CORRECTIONS_PLAN.md
# Корректировки — реализовано, но расходится со спецификацией

---

## 1. Отсутствуют транзакционные границы в критических use-cases (§12, §16) — (DONE)

**Что требует спецификация:**
> §16: "Executed inside transaction: ConfirmOrder, ConfirmPayment, CancelOrder, PAYMENT → DELIVERY transition"
> §12: "Implementation requirements: transactional boundaries, row-level locking or optimistic versioning, state validation inside transaction"

**Что реализовано:**
`ConfirmPaymentUseCase`, `CancelOrderUseCase`, `CreateOrderUseCase` выполняют несколько операций с репозиториями последовательно, без обёртки в единую транзакцию Prisma. Между вызовами `findById`, `save(payment)`, `save(product)`, `save(order)` возможно изменение состояния в базе другим потоком.

**Расхождение:**
Приоритетное правило гонок (§12: SUCCESS имеет приоритет над Cancel) не защищено на уровне БД — только на уровне `alreadyProcessed`-проверки в памяти, что недостаточно при параллельных запросах.

**Что исправить:**

### 1.1 CreateOrderUseCase
Обернуть в `prisma.$transaction`:
- `findById` каждого продукта
- проверку остатков
- `save(order)` (INSERT)

### 1.2 ConfirmPaymentUseCase (PAYMENT → DELIVERY)
Обернуть в `prisma.$transaction` с `SELECT … FOR UPDATE` на Order и Payment:
- `findByExternalId(externalId)` — с блокировкой строки Payment
- `findById(order.id)` — с блокировкой строки Order
- повторная проверка состояний (`alreadyProcessed`)
- `save(product)` — для каждого продукта (списание остатков)
- `save(payment)` — статус SUCCESS
- `save(order)` — статус DELIVERY

### 1.3 CancelOrderUseCase
Обернуть в `prisma.$transaction`:
- `findById(orderId)` — с блокировкой строки Order
- проверка допустимости отмены (`cancelOrder` из domain)
- `save(order)` — статус CANCELLED

**Файлы:**
- `src/application/order/ConfirmPaymentUseCase.ts`
- `src/application/order/CancelOrderUseCase.ts`
- `src/application/order/CreateOrderUseCase.ts`
- `src/infrastructure/repositories/OrderRepository.prisma.ts` (добавить поддержку передачи `tx`)
- `src/infrastructure/repositories/PaymentRepository.prisma.ts` (аналогично)
- `src/infrastructure/repositories/ProductRepository.prisma.ts` (аналогично)

---

## 2. Отсутствует проверка уникальности PENDING-платежа (§10) — (DONE)

**Что требует спецификация:**
> §10: "Only one PENDING Payment allowed at a time"

**Что реализовано:**
`InitiatePaymentUseCase` проверяет только, что Order не находится в DELIVERY/CLOSED. Он не проверяет, существует ли уже Payment со статусом PENDING для данного заказа. Если `InitiatePaymentUseCase` вызывается дважды подряд при заказе в PAYMENT, создаётся два PENDING-платежа.

**Что исправить:**

В `InitiatePaymentUseCase.execute()` после получения заказа:
1. Добавить `PaymentRepository.findByOrderId(orderId)`.
2. Если результат не `null` и `payment.status === PaymentStatus.PENDING` → вернуть уже существующий `confirmationUrl` (повторный вызов idempotent) или выбросить ошибку.
3. Если `payment.status === PaymentStatus.SUCCESS` → отклонить (заказ уже оплачен).

**Дополнительно:** добавить в `PaymentRepository` метод `findPendingByOrderId(orderId)` для явной семантики.

**Файлы:**
- `src/application/order/InitiatePaymentUseCase.ts`
- `src/application/ports/PaymentRepository.ts`
- `src/infrastructure/repositories/PaymentRepository.prisma.ts`

---

## 3. Отсутствует поле `absenceResolutionStrategy` в доменной модели Order (§8) — (DONE)

**Что требует спецификация:**
> §8: "Order field: absenceResolutionStrategy: CALL_REPLACE | CALL_REMOVE | AUTO_REMOVE | AUTO_REPLACE"
> "Composition adjustment allowed only in PICKING. Total recalculated only in PICKING."

**Что реализовано:**
Интерфейс `Order` в `src/domain/order/Order.ts` не содержит поля `absenceResolutionStrategy`. В Prisma-схеме этого поля тоже нет.

**Что исправить:**

### 3.1 Domain
Создать enum `AbsenceResolutionStrategy`:
```typescript
// src/domain/order/AbsenceResolutionStrategy.ts
export enum AbsenceResolutionStrategy {
  CALL_REPLACE = 'CALL_REPLACE',
  CALL_REMOVE = 'CALL_REMOVE',
  AUTO_REMOVE = 'AUTO_REMOVE',
  AUTO_REPLACE = 'AUTO_REPLACE',
}
```

Добавить поле в интерфейс `Order`:
```typescript
absenceResolutionStrategy: AbsenceResolutionStrategy;
```

### 3.2 Domain (transitions.ts)
`createOrder()` должен принимать `absenceResolutionStrategy` как обязательный параметр.

### 3.3 Infrastructure (schema.prisma)
Добавить lookup-таблицу `AbsenceResolutionStrategy` (по аналогии с `OrderStatus`) или колонку `absenceResolutionStrategy String` в таблицу `Order`.

### 3.4 Infrastructure (OrderRepository.prisma.ts)
Маппинг поля при save/findById.

### 3.5 Application (CreateOrderUseCase.ts)
Принимать `absenceResolutionStrategy` во входных параметрах.

### 3.6 HTTP (app/api/orders/route.ts)
Принимать поле в теле запроса.

**Файлы:**
- `src/domain/order/AbsenceResolutionStrategy.ts` (новый)
- `src/domain/order/Order.ts`
- `src/domain/order/transitions.ts`
- `src/application/order/CreateOrderUseCase.ts`
- `src/infrastructure/repositories/OrderRepository.prisma.ts`
- `prisma/schema.prisma`
- `prisma/seed.ts` (если lookup-таблица)
- `src/app/api/orders/route.ts`

---

## 4. PICKING-состояние не поддерживает изменение состава (§7.1, §8)

**Что требует спецификация:**
> §7.1 PICKING: "composition may change, total may change, absence strategy applied"

**Что реализовано:**
Нет use-case для изменения состава заказа в состоянии PICKING. `CompletePickingUseCase` только переводит в PAYMENT. Итого — поведение "состав может меняться" не реализовано ни на уровне use-case, ни на уровне API.

**Что исправить:**

Создать `UpdateOrderItemsUseCase`:
- Входные данные: `orderId`, `items: {productId, quantity}[]`
- Предусловие: `order.state === OrderState.PICKING` (иначе — ошибка)
- Логика: пересчитать `totalAmount`, обновить `items` заказа
- Применить `absenceResolutionStrategy` при необходимости замены/удаления позиции

Добавить endpoint:
`PATCH /api/orders/[id]/items`

**Файлы:**
- `src/application/order/UpdateOrderItemsUseCase.ts` (новый)
- `src/app/api/orders/[id]/items/route.ts` (новый)
- `src/application/ports/OrderRepository.ts` (возможно, расширить)

---

## Итоговый список файлов для корректировок

| # | Файл | Действие | Статус |
|---|------|---------|--------|
| 1 | `src/application/order/ConfirmPaymentUseCase.ts` | Обернуть в транзакцию | DONE |
| 2 | `src/application/order/CancelOrderUseCase.ts` | Обернуть в транзакцию | DONE |
| 3 | `src/application/order/CreateOrderUseCase.ts` | Обернуть в транзакцию | DONE |
| 4 | `src/infrastructure/repositories/OrderRepository.prisma.ts` | Поддержка tx-клиента | DONE |
| 5 | `src/infrastructure/repositories/PaymentRepository.prisma.ts` | Поддержка tx-клиента | DONE |
| 6 | `src/infrastructure/repositories/ProductRepository.prisma.ts` | Поддержка tx-клиента | DONE |
| 7 | `src/application/order/InitiatePaymentUseCase.ts` | Проверка PENDING-платежа | DONE |
| 8 | `src/application/ports/PaymentRepository.ts` | Добавить метод | DONE |
| 9 | `src/infrastructure/repositories/PaymentRepository.prisma.ts` | Реализовать метод | DONE |
| 10 | `src/domain/order/AbsenceResolutionStrategy.ts` | Создать enum | DONE |
| 11 | `src/domain/order/Order.ts` | Добавить поле | DONE |
| 12 | `src/domain/order/transitions.ts` | Добавить параметр | DONE |
| 13 | `src/application/order/CreateOrderUseCase.ts` | Принимать стратегию | DONE |
| 14 | `prisma/schema.prisma` | absenceResolutionStrategy | DONE |
| 15 | `src/application/order/UpdateOrderItemsUseCase.ts` | Создать | — |
| 16 | `src/app/api/orders/[id]/items/route.ts` | Создать | — |
