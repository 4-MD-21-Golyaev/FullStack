# ПЛАН: Личный кабинет — п.6 UNIMPLEMENTED_PLAN.md

Реализует оставшуюся часть §18: просмотр одного заказа и повтор заказа.

---

## Контекст

**Уже готово:**
- `GET /api/orders` — список заказов пользователя
- `OrderRepository.findById` — порт + Prisma-реализация
- `CreateOrderUseCase` — создание заказа с фиксацией цен и проверкой остатков

**Нужно реализовать:**
- `GET /api/orders/[id]` — просмотр одного заказа (с проверкой владельца)
- `RepeatOrderUseCase` — создать новый заказ на основе состава существующего
- `POST /api/orders/[id]/repeat` — HTTP-эндпоинт для повтора

---

## Файлы

| Файл | Статус |
|------|--------|
| `src/app/api/orders/[id]/route.ts` | новый |
| `src/application/order/RepeatOrderUseCase.ts` | новый |
| `src/app/api/orders/[id]/repeat/route.ts` | новый |
| `src/application/order/__tests__/RepeatOrderUseCase.spec.ts` | новый |

Изменений в существующих файлах не требуется: порт `OrderRepository` уже содержит `findById`, в `proxy.ts` новые паттерны не нужны (оба эндпоинта требуют аутентификации, что обеспечивается дефолтным поведением middleware).

---

## Шаг 1 — `GET /api/orders/[id]/route.ts`

Просмотр одного заказа. Паттерн идентичен `cancel/route.ts`.

```typescript
export async function GET(req, { params }) {
    const { id } = await params;
    const userId   = req.headers.get('x-user-id');
    const userRole = req.headers.get('x-user-role');

    const order = await new PrismaOrderRepository().findById(id);

    if (!order) return 404;

    // CUSTOMER видит только свои заказы
    if (userRole === 'CUSTOMER' && order.userId !== userId) return 403;

    return 200 + order;
}
```

**RBAC:**
- CUSTOMER: может читать только `order.userId === userId`
- STAFF / ADMIN: могут читать любой заказ

---

## Шаг 2 — `RepeatOrderUseCase`

### Интерфейс

```typescript
interface RepeatOrderInput {
    orderId: string;
    userId: string;
}
```

### Зависимости (конструктор)

- `OrderRepository` — найти исходный заказ (read-only, вне транзакции)
- `TransactionRunner` — передаётся в `CreateOrderUseCase` для создания нового заказа

### Логика (5 шагов)

```
1. orderRepository.findById(input.orderId)
       → null  → throw Error('Order not found')

2. order.userId !== input.userId
       → throw Error('Forbidden')

3. order.items.length === 0
       → throw Error('Original order has no items')

4. new CreateOrderUseCase(this.transactionRunner).execute({
       userId:                    input.userId,
       address:                   order.address,           // адрес из оригинала
       absenceResolutionStrategy: order.absenceResolutionStrategy,
       items: order.items.map(i => ({
           productId: i.productId,
           quantity:  i.quantity,
       })),
   })
   // CreateOrderUseCase внутри:
   //   - находит актуальный Product (текущая цена)
   //   - проверяет stock
   //   - фиксирует name/article/price в новых OrderItem

5. return newOrder
```

**Почему не передаём цену из OrderItem оригинала:**
`CreateOrderUseCase` всегда читает `Product` и фиксирует текущую цену. Это гарантирует, что повтор создаёт честный заказ по актуальным ценам — бизнес-правило не нарушается.

**Почему адрес из оригинала:**
"Повторить заказ" подразумевает сохранение условий доставки. Пользователь может отменить новый заказ и создать вручную с другим адресом, если нужно.

---

## Шаг 3 — `POST /api/orders/[id]/repeat/route.ts`

```typescript
export async function POST(req, { params }) {
    try {
        const { id } = await params;
        const userId = req.headers.get('x-user-id');
        if (!userId) return 401;

        const order = await new RepeatOrderUseCase(
            new PrismaOrderRepository(),
            new PrismaTransactionRunner(),
        ).execute({ orderId: id, userId });

        return 201 + order;
    } catch (error) {
        // 'Forbidden'       → 403
        // 'Order not found' → 404
        // остальное         → 400
    }
}
```

**Коды ответов:**

| Ситуация | HTTP |
|----------|------|
| Успех | 201 (новый заказ) |
| `Order not found` | 404 |
| `Forbidden` (чужой заказ) | 403 |
| Нет остатков / товар удалён | 400 |
| Не авторизован | 401 |

---

## Шаг 4 — Тесты `RepeatOrderUseCase.spec.ts`

Тест-паттерн идентичен `CancelOrderUseCase.spec.ts` — мок `orderRepository` + мок `transactionRunner`.

| # | Тест | Ожидание |
|---|------|----------|
| 1 | Успешный повтор | возвращает новый Order; `orderRepository.findById` вызван с `orderId`; новый заказ создан |
| 2 | Заказ не найден | `throw Error('Order not found')` |
| 3 | Чужой заказ | `throw Error('Forbidden')` |
| 4 | Пустой состав | `throw Error('Original order has no items')` |
| 5 | Адрес и стратегия из оригинала | новый заказ создан с `address` и `absenceResolutionStrategy` исходного заказа |

Итого: **5 тестов**.

---

## Порядок реализации

1. `RepeatOrderUseCase.ts` + тесты → убедиться, что 5/5 проходят
2. `GET /api/orders/[id]/route.ts`
3. `POST /api/orders/[id]/repeat/route.ts`
4. Обновить тестовую страницу: добавить список прошлых заказов с кнопкой «Повторить»
5. Пометить п.6 как DONE в `UNIMPLEMENTED_PLAN.md`

---

## Что НЕ меняется

- `proxy.ts` — новые паттерны не нужны; оба маршрута защищены аутентификацией по умолчанию
- `OrderRepository` порт — `findById` уже есть
- `PrismaOrderRepository` — реализация уже есть
- `CreateOrderUseCase` — используется как есть, без изменений
