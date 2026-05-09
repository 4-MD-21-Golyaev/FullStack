# План: Рекомендательная система для e-commerce проекта

## Context

Научный руководитель предложил добавить рекомендации в рамках ВКР: на главной — топ-3 самых покупаемых категорий, в каталоге — сортировка категорий и товаров по частоте покупок текущего пользователя, на странице товара — блок «с этим товаром покупают». Мотивация: углубить тему ВКР практическим разделом про персонализацию e-commerce и дать материал для главы со сравнением подходов и метрик.

Подход: **popularity-based + item-to-item collaborative filtering (Jaccard)**, с **time decay как опцией** и **офлайн-оценкой качества** (Precision@K, Recall@K, Hit Rate, Coverage). Гости видят глобальный топ.

Ограничения проекта:
- Hexagonal Architecture — domain (plain TS) ← application (use cases + ports) ← infrastructure (Prisma) ← API routes.
- FSD на фронте; UI-правки делаются через агентов (CLAUDE.md, hard rules).
- Кеширование (`unstable_cache`) в проекте сейчас не используется — вводим точечно.
- Индексы на `Order.userId`, `OrderItem.productId`, `Product.categoryId` отсутствуют — нужна миграция.

---

## 1. Миграция БД — индексы

Один Prisma migration `add_recommendation_indexes`. В `prisma/schema.prisma` добавить:

- `Order` — `@@index([userId, statusId])`, `@@index([statusId, createdAt])`
- `OrderItem` — `@@index([productId])`, `@@index([orderId, productId])`
- `Product` — `@@index([categoryId])`

PostgreSQL не индексирует FK автоматически — все нужны явно. Это критично: без индексов агрегации делают seq scan по миллионам строк в проде.

Команда: `npx prisma migrate dev --name add_recommendation_indexes`.

---

## 2. Domain слой — `src/domain/recommendation/`

Plain TypeScript-интерфейсы (как `Product.ts`, `Category.ts`):

- `PopularCategory.ts` — `{ categoryId: string; orderCount: number; score: number }`
- `PopularProduct.ts` — `{ productId: string; orderCount: number; quantitySum: number; score: number }`
- `RelatedProduct.ts` — `{ productId: string; coOccurrenceCount: number; jaccardScore: number }`
- `RecommendationStatusFilter.ts` — экспортирует константу `INCLUDED_ORDER_CODES = ['DELIVERED', 'CLOSED'] as const`. Единый источник истины — нигде в SQL не дублировать массив статусов.

`score` всегда `number`, конвертация из `Decimal`/`bigint` — на границе infrastructure (`Number(value)`).

---

## 3. Application слой — `src/application/recommendation/`

### Ports — `src/application/ports/`

Два порта по агрегату (консистентно с разделением `ProductRepository` / `CategoryRepository`):

**`CategoryRecommendationRepository.ts`**
```ts
interface CategoryRecommendationRepository {
  findTopCategories(opts: { limit: number; statusCodes: readonly string[]; rootOnly?: boolean; withTimeDecay?: boolean }): Promise<PopularCategory[]>;
  findTopCategoriesForUser(userId: string, opts: { limit: number; statusCodes: readonly string[]; withTimeDecay?: boolean }): Promise<PopularCategory[]>;
}
```

**`ProductRecommendationRepository.ts`**
```ts
interface ProductRecommendationRepository {
  findTopProductsForUser(userId: string, opts: { categoryIds?: string[]; limit: number; statusCodes: readonly string[]; withTimeDecay?: boolean }): Promise<PopularProduct[]>;
  findTopProductsGlobal(opts: { categoryIds?: string[]; limit: number; statusCodes: readonly string[]; withTimeDecay?: boolean }): Promise<PopularProduct[]>;
  findRelatedProductsJaccard(productId: string, opts: { limit: number; minCoOccurrence: number; statusCodes: readonly string[] }): Promise<RelatedProduct[]>;
}
```

`statusCodes` всегда инжектируется из доменной константы `INCLUDED_ORDER_CODES`.

### Use cases

Простые классы с DI через конструктор (паттерн `ListProductsByCategoryUseCase`):

- `GetTopCategoriesUseCase` — глобальный топ для главной/гостей, `execute(limit)`.
- `GetUserCategoryAffinityUseCase` — `execute(userId, limit)`. Если результат пуст (новый пользователь) → fallback на `GetTopCategoriesUseCase`. Возвращает `{ items, personalized: boolean }`.
- `GetUserPopularProductsUseCase` — `execute(userId, categoryId | null, limit)`. Если `categoryId` — раскрутить дерево потомков (переиспользовать `collectDescendantIds` из `src/app/api/products/route.ts`, вынести в `src/domain/category/utils.ts`). Fallback на `GetGlobalPopularProductsUseCase`.
- `GetGlobalPopularProductsUseCase` — для гостей и fallback.
- `GetRelatedProductsUseCase` — `execute(productId, limit)`. Если `< minCoOccurrence` соседей (порог 3) → fallback `GetGlobalPopularProductsUseCase` по той же категории, исключая сам товар.

---

## 4. Infrastructure — `src/infrastructure/repositories/`

Файлы: `CategoryRecommendationRepository.prisma.ts`, `ProductRecommendationRepository.prisma.ts`. Принимают опциональный `DbClient`, паттерн `PrismaProductRepository`.

Prisma `groupBy` не поддерживает JOIN с фильтром по `OrderStatus.code` — все агрегации через `$queryRaw`.

### Ключевые SQL-запросы

**findTopCategories (глобально):**
```sql
SELECT p."categoryId" AS category_id,
       COUNT(DISTINCT o.id) AS order_count
FROM "OrderItem" oi
JOIN "Order" o ON o.id = oi."orderId"
JOIN "OrderStatus" s ON s.id = o."statusId"
JOIN "Product" p ON p.id = oi."productId"
WHERE s.code = ANY($1::text[])
GROUP BY p."categoryId"
ORDER BY order_count DESC
LIMIT $2;
```
`rootOnly`: получить все категории через `CategoryRepository.findAll()`, in-memory подняться к корню каждой `categoryId`, дедуплицировать по `rootId`, обрезать до `limit`.

**findTopCategoriesForUser:** тот же запрос + `AND o."userId" = $3`.

**findTopProductsForUser / findTopProductsGlobal:**
```sql
SELECT oi."productId",
       COUNT(DISTINCT o.id) AS order_count,
       SUM(oi.quantity) AS quantity_sum
FROM "OrderItem" oi
JOIN "Order" o ON o.id = oi."orderId"
JOIN "OrderStatus" s ON s.id = o."statusId"
JOIN "Product" p ON p.id = oi."productId"
WHERE s.code = ANY($1::text[])
  AND ($2::uuid[] IS NULL OR p."categoryId" = ANY($2::uuid[]))
  AND ($3::uuid IS NULL OR o."userId" = $3::uuid)
GROUP BY oi."productId"
ORDER BY order_count DESC, quantity_sum DESC
LIMIT $4;
```

**findRelatedProductsJaccard (item-to-item CF):**
```sql
WITH target_orders AS (
  SELECT DISTINCT o.id
  FROM "OrderItem" oi
  JOIN "Order" o ON o.id = oi."orderId"
  JOIN "OrderStatus" s ON s.id = o."statusId"
  WHERE oi."productId" = $1 AND s.code = ANY($2::text[])
),
target_count AS (SELECT COUNT(*)::float AS c FROM target_orders),
co AS (
  SELECT oi."productId" AS pid, COUNT(DISTINCT oi."orderId")::float AS inter
  FROM "OrderItem" oi
  WHERE oi."orderId" IN (SELECT id FROM target_orders)
    AND oi."productId" <> $1
  GROUP BY oi."productId"
),
candidate_orders AS (
  SELECT oi."productId" AS pid, COUNT(DISTINCT o.id)::float AS total
  FROM "OrderItem" oi
  JOIN "Order" o ON o.id = oi."orderId"
  JOIN "OrderStatus" s ON s.id = o."statusId"
  WHERE s.code = ANY($2::text[]) AND oi."productId" IN (SELECT pid FROM co)
  GROUP BY oi."productId"
)
SELECT co.pid AS product_id,
       co.inter::int AS co_occurrence_count,
       (co.inter / NULLIF((SELECT c FROM target_count) + ca.total - co.inter, 0)) AS jaccard_score
FROM co
JOIN candidate_orders ca ON ca.pid = co.pid
WHERE co.inter >= $3
ORDER BY jaccard_score DESC, co.inter DESC
LIMIT $4;
```

### Time decay (опция, `withTimeDecay: true`)

Заменить `COUNT(DISTINCT o.id)` на:
```sql
SUM(CASE
  WHEN o."createdAt" > NOW() - INTERVAL '30 days' THEN 1.0
  WHEN o."createdAt" > NOW() - INTERVAL '90 days' THEN 0.5
  ELSE 0.25
END)
```
Дискретные веса проще в обсуждении ВКР (можно показать веса в таблице) и не требуют параметра `λ`. Включаем для top-categories (там сезонность важна), оставляем выключенным для CF (стабильность связей).

`bigint` из `COUNT` → `Number(value)` в маппере. `null` jaccard защищён через `NULLIF`.

---

## 5. API роуты — `src/app/api/recommendations/`

Все читают `req.headers.get('x-user-id')` (middleware `src/proxy.ts` уже проставляет). `null` — гость, никаких 401.

Контракт: `{ items: T[], personalized: boolean, fallbackUsed: boolean }`. `fallbackUsed` важен для отладки и метрик.

- `GET /api/recommendations/top-categories?limit=3` — публичный, для главной.
- `GET /api/recommendations/categories?limit=N` — auth опциональна.
- `GET /api/recommendations/products?categoryId=X&limit=N` — auth опциональна.
- `GET /api/recommendations/related?productId=X&limit=6` — публичный.

Все API возвращают полные объекты (`Category`, `Product`), не только id — фронт не делает N+1.

Валидация `limit`: `Math.min(parseInt || 20, 50)` — паттерн из `src/app/api/products/route.ts`.

---

## 6. Кеширование

Минимальное и осознанное:

- **`/api/recommendations/top-categories`** и **`/api/recommendations/related`** — `unstable_cache` с `revalidate: 600` (10 мин), теги `['recommendations:global']` и `['recommendations:related', productId]`.
- **Per-user эндпоинты** — без кеша в первой итерации; при индексах §1 запросы должны быть < 50 мс. Если бенчмарк покажет иначе — добавить in-memory LRU.
- **Инвалидация:** `revalidateTag('recommendations:global')` в use case закрытия заказа после `DELIVERED → CLOSED` (найти в `src/application/order/`). Per-user не инвалидируем — sub-час stale допустим.

---

## 7. Frontend — последовательность правок

UI-файлы делаются через агентов (CLAUDE.md hard rule: implementation agent + review agent для каждого файла; для смешанных задач — параллельно с backend).

Создать `src/features/recommendations/`:
- `api.ts` — `fetchTopCategories`, `fetchPersonalizedCategories`, `fetchPersonalizedProducts`, `fetchRelatedProducts`.
- `hooks/useTopCategories.ts`, `useRelatedProducts.ts`, `usePersonalizedCategorySort.ts`, `usePersonalizedProductSort.ts`. Каждый берёт `useAuth().user?.userId` как ключ перезагрузки и возвращает `{ data, loading, fallbackUsed }`.

### Точки встраивания

1. **`src/app/(customer)/page.tsx`** — заменить hardcoded `CATEGORY_IDS` (строки 93-110) на `useTopCategories(3)`. SaleSlider оборачивается в `.map()` по результату.
2. **`src/app/(customer)/catalog/page.tsx`** — обернуть `rootCategories` через `usePersonalizedCategorySort`. Хук смешивает базовый порядок с персонализированными affinity-скорами; для гостей возвращает исходный массив.
3. **`src/app/(customer)/catalog/[categoryId]/page.tsx`** — после fetch продуктов в leaf-категории применить `usePersonalizedProductSort(products, categoryId)`. Сортировка — клиентская, на основе ответа отдельного API; альтернатива (передавать `sortBy` в `/api/products`) хуже — смешивает домены.
4. **`src/app/(customer)/catalog/product/[id]/page.tsx`** — после `tabContent` (строка 205) добавить `<RelatedProductsSection productId={product.id} />`. Новый виджет `src/widgets/customer/RelatedProducts/` — переиспользует `ProductCard` и сетку 4-6 карточек (взять стили `SaleSlider` или `SubcategoryList`).

---

## 8. Офлайн-оценка качества — `scripts/recommendations-eval.ts`

Standalone-скрипт, читает БД через те же репозитории, **ничего не пишет**. Запуск: `npx tsx scripts/recommendations-eval.ts`.

Алгоритм:
1. **Train/test split по времени:** все заказы со статусом `DELIVERED`/`CLOSED` сортируются по `createdAt`. Первые 80% → train, последние 20% → test.
2. **Подходы для сравнения:**
   - `random` — случайный baseline.
   - `global-popular` — топ-N глобально (на train).
   - `user-popular` — топ-N для каждого пользователя (на train).
   - `cf-jaccard` — item-to-item Jaccard.
   - `global-popular + time decay` — для сравнения эффекта decay.
3. **Метрики (для каждого подхода):**
   - `Precision@K = |recommended ∩ test_purchased| / K`
   - `Recall@K = |recommended ∩ test_purchased| / |test_purchased|`
   - `Hit Rate@K = users_with_at_least_one_hit / total_users`
   - `Coverage = unique_recommended_products / total_catalog`
   - `Diversity = avg_categorical_entropy_in_top_K`
4. **Output:** консольная таблица + CSV-файл `docs/eval-results.csv` для вставки в ВКР.

Скрипт — отдельная папка `scripts/`, не часть production-кода. Использует те же репозитории через DI (передаём фиктивный отрезок данных). Это даёт чистую главу ВКР и ничего не ломает в проде.

---

## 9. Edge cases и риски

- **Холодный старт пользователя** — fallback на global в use case + `personalized: false` в ответе.
- **Холодный старт товара** — `< 3` co-occurrence соседей → fallback на category-popular, исключая сам товар.
- **CANCELLED / неоплаченные** — строгая фильтрация по `INCLUDED_ORDER_CODES` (только `DELIVERED`, `CLOSED`).
- **Удалённые товары** — JOIN c `Product` отфильтровывает.
- **Доминирование одной категории** на главной — `rootOnly: true` + дедупликация по корню.
- **Popularity bias («богатые богатеют»)** — документировать как ограничение в ВКР; митигация частично через time decay.
- **Безопасность** — `userId` берётся из `x-user-id` header (middleware), никогда из query.
- **Concurrent заказы во время агрегации** — read-only, eventual consistency приемлема.
- **Малый seed** — для главы метрик ВКР, возможно, понадобится обогатить seed разнообразными заказами; решать после первых прогонов скрипта.

---

## 10. Тесты (Vitest, паттерн `.claude/rules/testing.md`)

Все backend-изменения требуют test+review агента (CLAUDE.md hard rule).

**Use cases** — `src/application/recommendation/__tests__/`:
- Success path, empty repo, fewer-than-limit, fallback на global для нового пользователя/товара.
- Mock портов через конструктор: `vi.fn().mockResolvedValue(...)`.

**Repositories** — `src/infrastructure/repositories/__tests__/`:
- Mock `db.$queryRaw` с `vi.fn().mockResolvedValue([{...}])`. Проверка форматирования параметров.
- Маппинг `bigint → number`, `null jaccard → 0`.

**API routes** — `src/app/api/recommendations/__tests__/`:
- 200 для гостя (без header), 200 для auth (с header), 400 на невалидный `limit`, 200 с пустым результатом.

---

## 11. Порядок работ

1. **Backend, последовательно:**
   1. Prisma migration (индексы) — direct edit, прогнать `prisma migrate dev`.
   2. Domain слой — direct (5 файлов interface).
   3. Application + Infrastructure — backend implementation agent + test+review agent.
   4. API routes — backend implementation agent + test+review agent.
   5. Кеш + инвалидация в `CloseOrderUseCase` — direct.
2. **Frontend** (после backend, через UI-агентов):
   1. `src/features/recommendations/` (api + hooks) — implementation + review.
   2. Главная — implementation + review.
   3. Каталог + категория — implementation + review.
   4. Страница товара + новый виджет `RelatedProducts` — implementation + review.
3. **Метрики:** `scripts/recommendations-eval.ts` — direct, прогнать, сохранить CSV.
4. **Финальная проверка:** `npx tsc --noEmit`, `npm run lint`, `npm run test`.

---

## 12. Verification (как тестировать end-to-end)

1. Применить миграцию: `npx prisma migrate dev`.
2. Прогнать `npm run test` — все новые юнит-тесты зелёные.
3. Запустить `npm run dev`, открыть `localhost:3000`:
   - Главная: топ-3 категории появились вместо hardcode (отличаются от старого набора, если seed разнообразен).
   - Залогиниться, сделать тестовый заказ через корзину, перейти `DELIVERED` (через picker/courier flow или напрямую в БД для теста), вернуться в каталог — категории и товары пересортированы.
   - Зайти на любую карточку товара — снизу блок «С этим товаром покупают» с 4-6 карточками.
   - Разлогиниться — каталог и главная показывают глобальный топ.
   - DevTools → Network: эндпоинты `/api/recommendations/*` отвечают `personalized` и `fallbackUsed` корректно.
4. Запустить `npx tsx scripts/recommendations-eval.ts` — таблица метрик в консоли + CSV в `docs/eval-results.csv`.
5. `npx tsc --noEmit` — без ошибок.

---

## Critical Files

**Образцы паттернов (читать перед реализацией):**
- `src/infrastructure/repositories/ProductRepository.prisma.ts` — паттерн репозитория
- `src/application/product/ListProductsByCategoryUseCase.ts` — паттерн use case
- `src/app/api/products/route.ts` — паттерн API route + `collectDescendantIds`
- `src/app/(customer)/AuthContext.tsx` — `useAuth()` для фронта
- `src/proxy.ts` — middleware с `x-user-id`

**Файлы к изменению:**
- `prisma/schema.prisma` — индексы
- `src/domain/recommendation/` (новая) — 4 интерфейса + константа статусов
- `src/application/ports/CategoryRecommendationRepository.ts`, `ProductRecommendationRepository.ts` (новые)
- `src/application/recommendation/` (новая) — 5 use cases + тесты
- `src/infrastructure/repositories/CategoryRecommendationRepository.prisma.ts`, `ProductRecommendationRepository.prisma.ts` (новые) + тесты
- `src/app/api/recommendations/{top-categories,categories,products,related}/route.ts` (новые) + тесты
- `src/application/order/CloseOrderUseCase.ts` — добавить `revalidateTag('recommendations:global')`
- `src/features/recommendations/` (новая) — api + hooks
- `src/widgets/customer/RelatedProducts/` (новая)
- `src/app/(customer)/page.tsx` — заменить hardcode
- `src/app/(customer)/catalog/page.tsx` — сортировка категорий
- `src/app/(customer)/catalog/[categoryId]/page.tsx` — сортировка товаров
- `src/app/(customer)/catalog/product/[id]/page.tsx` — блок related
- `scripts/recommendations-eval.ts` (новый)
