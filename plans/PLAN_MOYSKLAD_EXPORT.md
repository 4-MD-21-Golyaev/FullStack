# ПЛАН: МойСклад Export (Outbox pattern) — п.3 UNIMPLEMENTED_PLAN.md

Экспорт заказов в МойСклад после перехода в статус DELIVERY.
Реализуется через паттерн Outbox: событие записывается **внутри** транзакции,
а HTTP-вызов в МойСклад выполняется **вне** транзакции фоновым job'ом.

**Заказ пользователя не блокируется:** к моменту экспорта заказ уже в статусе
DELIVERY — любой исход экспорта не влияет на пользователя.

---

## Принцип работы

```
ConfirmPaymentUseCase (транзакция)
  → PAYMENT → DELIVERY
  → OutboxEvent { eventType: "ORDER_DELIVERED", payload: {orderId, items} }   ← запись в той же транзакции

ProcessOutboxUseCase (вне транзакции, по расписанию)
  → findPending()   ← только события без processedAt и failedAt, retryCount < MAX_RETRIES
  → для каждого события:
      try: MoySkladGateway.exportOrder(orderId, items) → markProcessed(id)
      catch MoySkladProductNotFoundError → markFailed(id, message)        // без retry
      catch другая ошибка → если retryCount >= MAX_RETRIES → markFailed   // исчерпан лимит
                          → иначе incrementRetry(id)                      // повтор при следующем запуске
```

### Классификация ошибок

| Тип ошибки | Класс | Поведение |
|---|---|---|
| Товар не найден по артикулу | `MoySkladProductNotFoundError` | Сразу `markFailed` — повторов нет |
| Сеть / 5xx МойСклад | `Error` (любой другой) | `incrementRetry` до `MAX_RETRIES`, затем `markFailed` |

`MAX_RETRIES = 3` — константа в `ProcessOutboxUseCase`.

---

## Файлы

| Файл | Статус |
|------|--------|
| `prisma/schema.prisma` | изменить — добавить `OutboxEvent` |
| `src/application/ports/MoySkladGateway.ts` | новый — порт + `MoySkladProductNotFoundError` |
| `src/application/ports/OutboxRepository.ts` | новый |
| `src/infrastructure/repositories/OutboxRepository.prisma.ts` | новый |
| `src/application/ports/TransactionRunner.ts` | изменить — добавить `outboxRepository` в контекст |
| `src/infrastructure/db/PrismaTransactionRunner.ts` | изменить — подключить `PrismaOutboxRepository` |
| `src/infrastructure/moysklad/HttpMoySkladGateway.ts` | новый |
| `src/application/order/ConfirmPaymentUseCase.ts` | изменить — запись OutboxEvent |
| `src/application/order/ProcessOutboxUseCase.ts` | новый |
| `src/app/api/internal/jobs/process-outbox/route.ts` | новый |
| `src/proxy.ts` | изменить — INTERNAL_JOB_SECRET bypass |
| `src/application/order/__tests__/ProcessOutboxUseCase.spec.ts` | новый |
| `src/application/order/__tests__/ConfirmPaymentUseCase.spec.ts` | изменить — добавить assert на OutboxEvent |

---

## Шаг 1 — Prisma schema

Добавить модель в `prisma/schema.prisma`:

```prisma
model OutboxEvent {
  id           String    @id @default(uuid())
  eventType    String    // "ORDER_DELIVERED"
  payload      Json
  createdAt    DateTime  @default(now())
  processedAt  DateTime?
  failedAt     DateTime? // проставляется при исчерпании попыток или бизнес-ошибке
  errorMessage String?   // причина сбоя (артикулы / текст ошибки)
  retryCount   Int       @default(0)
}
```

После — создать миграцию:
```
npx prisma migrate dev --name add_outbox_event
```

---

## Шаг 2 — OutboxRepository (порт + Prisma-реализация)

### Порт (`src/application/ports/OutboxRepository.ts`)

```typescript
export interface OutboxEvent {
    id: string;
    eventType: string;
    payload: unknown;
    createdAt: Date;
    processedAt: Date | null;
    failedAt: Date | null;
    errorMessage: string | null;
    retryCount: number;
}

export interface OutboxRepository {
    save(event: Omit<OutboxEvent, 'createdAt' | 'processedAt' | 'failedAt' | 'errorMessage' | 'retryCount'>): Promise<void>;
    findPending(maxRetries: number): Promise<OutboxEvent[]>;
    markProcessed(id: string): Promise<void>;
    markFailed(id: string, errorMessage: string): Promise<void>;
    incrementRetry(id: string): Promise<void>;
}
```

### Prisma-реализация (`src/infrastructure/repositories/OutboxRepository.prisma.ts`)

```typescript
export class PrismaOutboxRepository implements OutboxRepository {
    constructor(private db: PrismaClient | Prisma.TransactionClient = prisma) {}

    async save(event) {
        await this.db.outboxEvent.create({ data: event });
    }

    async findPending(maxRetries: number) {
        return this.db.outboxEvent.findMany({
            where: {
                processedAt: null,
                failedAt: null,
                retryCount: { lt: maxRetries },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    async markProcessed(id: string) {
        await this.db.outboxEvent.update({
            where: { id },
            data: { processedAt: new Date() },
        });
    }

    async markFailed(id: string, errorMessage: string) {
        await this.db.outboxEvent.update({
            where: { id },
            data: { failedAt: new Date(), errorMessage },
        });
    }

    async incrementRetry(id: string) {
        await this.db.outboxEvent.update({
            where: { id },
            data: { retryCount: { increment: 1 } },
        });
    }
}
```

---

## Шаг 3 — TransactionContext + PrismaTransactionRunner

### Изменение `TransactionRunner.ts`

Добавить `outboxRepository` в `TransactionContext`:

```typescript
import { OutboxRepository } from './OutboxRepository';

export interface TransactionContext {
    orderRepository:   OrderRepository;
    paymentRepository: PaymentRepository;
    productRepository: ProductRepository;
    outboxRepository:  OutboxRepository;   // ← добавить
}
```

### Изменение `PrismaTransactionRunner.ts`

```typescript
import { PrismaOutboxRepository } from '../repositories/OutboxRepository.prisma';

// В методе run():
return work({
    orderRepository:   new PrismaOrderRepository(tx),
    paymentRepository: new PrismaPaymentRepository(tx),
    productRepository: new PrismaProductRepository(tx),
    outboxRepository:  new PrismaOutboxRepository(tx),  // ← добавить
});
```

---

## Шаг 4 — MoySkladGateway (порт + реализация)

### Порт (`src/application/ports/MoySkladGateway.ts`)

```typescript
import { OrderItem } from '@/domain/order/OrderItem';

/** Бросается когда хотя бы один товар из заказа не найден в МойСклад по артикулу. */
export class MoySkladProductNotFoundError extends Error {
    constructor(public readonly missingArticles: string[]) {
        super(`МойСклад: товары не найдены по артикулам: ${missingArticles.join(', ')}`);
        this.name = 'MoySkladProductNotFoundError';
    }
}

export interface MoySkladGateway {
    // Export (п.3)
    exportOrder(orderId: string, items: OrderItem[]): Promise<void>;

    // Import (п.4) — добавит SyncProductsUseCase позже
    // fetchFolders(): Promise<MoySkladFolder[]>;
    // fetchProducts(): Promise<MoySkladProduct[]>;
}
```

> Когда будет реализован Import (п.4), методы `fetchFolders` и `fetchProducts`
> добавляются в этот же интерфейс и реализацию.

### Реализация (`src/infrastructure/moysklad/HttpMoySkladGateway.ts`)

Конструктор принимает конфигурацию:
```typescript
constructor(private config: {
    token: string;
    organizationId: string;  // MOYSKLAD_ORGANIZATION_ID
    agentId: string;         // MOYSKLAD_AGENT_ID (контрагент по умолчанию)
}) {}
```

#### `exportOrder(orderId, items)`

Алгоритм:
```
1. Для каждого item: найти товар в МойСклад по артикулу
   GET /entity/product?filter=code%3D{item.article}&limit=1
   → если не найден → добавить article в список missingArticles
   → если найден → href = rows[0].meta.href

2. Если missingArticles не пуст → throw MoySkladProductNotFoundError(missingArticles)
   (заказ в МойСклад НЕ создаётся)

3. Сформировать positions (все товары найдены):
   {
     "quantity": item.quantity,
     "price": item.price * 100,   // рубли → копейки (МойСклад хранит в копейках)
     "assortment": { "meta": { "href": href, ... } }
   }

4. POST /entity/customerorder
   {
     "organization": { "meta": { "href": ".../organization/{organizationId}" } },
     "agent":        { "meta": { "href": ".../counterparty/{agentId}"      } },
     "description":  "Order #{orderId}",
     "positions":    [...]
   }

5. Если ответ не 2xx → throw Error(`МойСклад exportOrder failed: ${status}`)
```

**Базовый URL:** `https://api.moysklad.ru/api/remap/1.2`
**Заголовок:** `Authorization: Bearer ${token}`, `Content-Type: application/json`

---

## Шаг 5 — Изменение `ConfirmPaymentUseCase`

Внутри блока `payment.succeeded`, сразу после `await orderRepository.save(updated)`:

```typescript
// Записываем событие в outbox (внутри той же транзакции)
await outboxRepository.save({
    id: randomUUID(),
    eventType: 'ORDER_DELIVERED',
    payload: {
        orderId: updated.id,
        items: updated.items.map(i => ({
            productId: i.productId,
            article:   i.article,
            name:      i.name,
            price:     i.price,
            quantity:  i.quantity,
        })),
    },
});
```

`outboxRepository` берётся из `TransactionContext` (деструктурировать в `run(async ({ ..., outboxRepository }) => ...)`).

**Ключевое свойство:** если транзакция откатится (например, из-за нехватки остатков),
OutboxEvent тоже откатится — событие не будет ложно отправлено.

---

## Шаг 6 — `ProcessOutboxUseCase`

### Файл: `src/application/order/ProcessOutboxUseCase.ts`

```typescript
import { MoySkladProductNotFoundError } from '@/application/ports/MoySkladGateway';

const MAX_RETRIES = 3;

interface ProcessOutboxResult {
    processed: number;
    retried: number;
    failed: number;
}

export class ProcessOutboxUseCase {
    constructor(
        private outboxRepository: OutboxRepository,
        private moySkladGateway: MoySkladGateway,
    ) {}

    async execute(): Promise<ProcessOutboxResult> {
        const events = await this.outboxRepository.findPending(MAX_RETRIES);
        let processed = 0;
        let retried = 0;
        let failed = 0;

        for (const event of events) {
            try {
                if (event.eventType === 'ORDER_DELIVERED') {
                    const { orderId, items } = event.payload as any;
                    await this.moySkladGateway.exportOrder(orderId, items);
                }
                await this.outboxRepository.markProcessed(event.id);
                processed++;
            } catch (err) {
                if (err instanceof MoySkladProductNotFoundError) {
                    // Бизнес-ошибка: повторы бессмысленны
                    await this.outboxRepository.markFailed(event.id, err.message);
                    console.error(`[Outbox] Permanent failure for event ${event.id}:`, err.message);
                    failed++;
                } else {
                    // Временная ошибка (сеть, 5xx): retry до MAX_RETRIES
                    const nextRetry = event.retryCount + 1;
                    if (nextRetry >= MAX_RETRIES) {
                        const msg = err instanceof Error ? err.message : String(err);
                        await this.outboxRepository.markFailed(event.id, msg);
                        console.error(`[Outbox] Max retries reached for event ${event.id}:`, msg);
                        failed++;
                    } else {
                        await this.outboxRepository.incrementRetry(event.id);
                        console.warn(`[Outbox] Retry ${nextRetry}/${MAX_RETRIES} for event ${event.id}`);
                        retried++;
                    }
                }
            }
        }

        return { processed, retried, failed };
    }
}
```

**Заказ пользователя не затронут:** статус `DELIVERY` уже выставлен внутри транзакции,
`ProcessOutboxUseCase` работает полностью вне неё.

---

## Шаг 7 — Route handler + proxy.ts

### Route handler (`src/app/api/internal/jobs/process-outbox/route.ts`)

```typescript
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    // Авторизация обрабатывается в proxy.ts
    try {
        const useCase = new ProcessOutboxUseCase(
            new PrismaOutboxRepository(),
            new HttpMoySkladGateway({
                token:          process.env.MOYSKLAD_TOKEN!,
                organizationId: process.env.MOYSKLAD_ORGANIZATION_ID!,
                agentId:        process.env.MOYSKLAD_AGENT_ID!,
            }),
        );
        const result = await useCase.execute();
        return NextResponse.json({ ok: true, result });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
```

### Изменение `proxy.ts`

Оба internal job'а (`process-outbox` и `sync-products` из п.4) требуют одинаковой логики.
Добавить в proxy **перед** JWT-проверкой:

```typescript
// Internal jobs: доступны по INTERNAL_JOB_SECRET заголовку
const INTERNAL_JOB_SECRET = process.env.INTERNAL_JOB_SECRET;
if (pathname.startsWith('/api/internal/jobs/')) {
    const authHeader = req.headers.get('authorization') ?? '';
    if (INTERNAL_JOB_SECRET && authHeader === `Bearer ${INTERNAL_JOB_SECRET}`) {
        return NextResponse.next(); // пропускаем JWT-проверку
    }
    // Иначе — продолжаем стандартную проверку (ADMIN через JWT тоже допустим)
}
```

---

## Шаг 8 — Тесты

### `ProcessOutboxUseCase.spec.ts` (7 тестов)

| # | Тест | Проверяем |
|---|------|-----------|
| 1 | Успешная обработка | `gateway.exportOrder` вызван; `markProcessed` вызван; `{ processed: 1, retried: 0, failed: 0 }` |
| 2 | Пустой outbox | `gateway.exportOrder` не вызван; `{ processed: 0, retried: 0, failed: 0 }` |
| 3 | `MoySkladProductNotFoundError` | `markFailed` вызван с сообщением об артикулах; `incrementRetry` НЕ вызван; `failed: 1` |
| 4 | Временная ошибка (первая попытка, retryCount=0) | `incrementRetry` вызван; `markFailed` НЕ вызван; `retried: 1` |
| 5 | Временная ошибка (retryCount = MAX_RETRIES-1) | `markFailed` вызван; `incrementRetry` НЕ вызван; `failed: 1` |
| 6 | Несколько событий — частичный сбой | `processed + retried + failed` = кол-во событий; события продолжают обрабатываться после сбоя |
| 7 | Неизвестный eventType | `markProcessed` вызван (событие потреблено без вызова gateway) |

### Дополнение к `ConfirmPaymentUseCase.spec.ts` (1 тест)

| # | Тест | Проверяем |
|---|------|-----------|
| + | При `payment.succeeded` OutboxEvent записывается | `outboxRepository.save` вызван с `eventType: 'ORDER_DELIVERED'` и корректным payload |

> Мок `outboxRepository` добавляется в тестовый `TransactionContext`.

---

## Переменные окружения (добавить в `.env`)

```env
MOYSKLAD_TOKEN=               # Bearer-токен МойСклад API
MOYSKLAD_ORGANIZATION_ID=     # UUID организации в МойСклад
MOYSKLAD_AGENT_ID=            # UUID контрагента по умолчанию (для customerorder)
INTERNAL_JOB_SECRET=          # Секрет для cron-эндпоинтов
```

---

## Порядок реализации

1. `prisma/schema.prisma` — добавить `OutboxEvent` + миграция
2. `MoySkladGateway.ts` — порт + `MoySkladProductNotFoundError`
3. `OutboxRepository` порт + Prisma-реализация
4. `TransactionRunner.ts` + `PrismaTransactionRunner.ts` — добавить `outboxRepository`
5. `HttpMoySkladGateway.ts` — реализация `exportOrder`
6. `ConfirmPaymentUseCase.ts` — запись OutboxEvent
7. `ProcessOutboxUseCase.ts` + тесты
8. Route handler + `proxy.ts`
9. Пометить п.3 как DONE в `UNIMPLEMENTED_PLAN.md`
