# ПЛАН: МойСклад Import — п.4 UNIMPLEMENTED_PLAN.md

Периодическая синхронизация ассортимента из МойСклад в локальную БД.

---

## Бизнес-логика

### Что синхронизируется

| МойСклад | Локальная БД | Примечание |
|-----------|-------------|------------|
| `code` | `Product.article` | Ключ сопоставления |
| `name` | `Product.name` | Обновляется |
| `salePrices[0].value / 100` | `Product.price` | МойСклад хранит в копейках |
| `quantity` (из stock-отчёта) | `Product.stock` | Обновляется |
| папка (`productFolder`) | `Category` | Иерархия 1:1 |

### Правила сопоставления и мутации

| Ситуация | Действие |
|----------|----------|
| `article` совпал с локальным Product | Обновить `name`, `price`, `stock`, `categoryId` |
| Товар есть в МойСклад, нет локально | Создать новый `Product` (`imagePath = null`) |
| Товар есть локально, нет в МойСклад | `stock = 0` (скрыт от заказа, запись остаётся) |
| Папка есть в МойСклад, нет локально | Создать `Category` автоматически |
| Товар без папки в МойСклад | Пропустить (не импортировать) |

### Правила синхронизации категорий

- Сопоставление: по `(name, parentId)` — папка МойСклад → `Category`
- Иерархия сохраняется: вложенная папка → `Category.parentId` указывает на родительскую
- Обход топологический: сначала создаём/находим родителей, потом детей
- Категории не удаляются при отсутствии в МойСклад (могут быть нужны для существующих товаров)

### Цена: преобразование

```
МойСклад: salePrices[0].value = 150000  →  price = 150000 / 100 = 1500 руб.
```

Если `salePrices` пуст или отсутствует — `price = 0` (товар создаётся, но не продаётся).

### Триггер запуска

- **Cron (основной):** `GET /api/internal/jobs/sync-products` с заголовком `Authorization: Bearer INTERNAL_JOB_SECRET`
- **Ручной (ADMIN):** тот же эндпоинт, но с JWT-сессией роли ADMIN (proxy проверяет роль)

---

## МойСклад API

**Базовый URL:** `https://api.moysklad.ru/api/remap/1.2`
**Аутентификация:** `Authorization: Bearer ${MOYSKLAD_TOKEN}` (env var)

### Запрос 1 — Папки (категории)

```
GET /entity/productfolder?limit=100
```

Ответ (упрощённо):
```json
{
  "rows": [
    {
      "id": "uuid-1",
      "name": "Климатическая техника",
      "productFolder": null
    },
    {
      "id": "uuid-2",
      "name": "Кондиционеры",
      "productFolder": { "meta": { "href": ".../uuid-1" } }
    }
  ]
}
```

`parentId` извлекается из `productFolder.meta.href` — последний сегмент URL.

### Запрос 2 — Товары с остатками

```
GET /report/stock/all?expand=assortment&limit=1000
```

Ответ (упрощённо):
```json
{
  "rows": [
    {
      "assortment": {
        "id": "uuid-p1",
        "name": "Кондиционер Haier AC12",
        "code": "HAI-AC12",
        "salePrices": [{ "value": 4500000, "currency": {...} }],
        "productFolder": { "meta": { "href": ".../uuid-2" } }
      },
      "quantity": 5
    }
  ]
}
```

Фильтрация: пропускать строки без `assortment.code` (услуги, комплекты без артикула).

---

## Файлы

### Новые

| Файл | Назначение |
|------|------------|
| `src/domain/moysklad/MoySkladProduct.ts` | Типы DTO из МойСклад |
| `src/application/ports/MoySkladGateway.ts` | Порт: интерфейс Gateway |
| `src/infrastructure/moysklad/HttpMoySkladGateway.ts` | Реализация: реальный HTTP-клиент |
| `src/application/product/SyncProductsUseCase.ts` | Use case синхронизации |
| `src/app/api/internal/jobs/sync-products/route.ts` | HTTP-обработчик cron/ручного запуска |
| `src/application/product/__tests__/SyncProductsUseCase.spec.ts` | Тесты |

### Изменяемые существующие

| Файл | Что меняется |
|------|-------------|
| `src/application/ports/ProductRepository.ts` | Добавить `findByArticle()`, расширить `save()` контракт |
| `src/application/ports/CategoryRepository.ts` | Добавить `findAll()`, `findByNameAndParent()`, `save()` |
| `src/infrastructure/repositories/ProductRepository.prisma.ts` | Реализовать `findByArticle()`, обновить `save()` (upsert по id, все поля) |
| `src/infrastructure/repositories/CategoryRepository.prisma.ts` | Реализовать `findAll()`, `findByNameAndParent()`, `save()` (upsert) |
| `src/proxy.ts` | Добавить `/api/internal/jobs/sync-products` в обработку ADMIN |
| `.env.example` / документация | Добавить `MOYSKLAD_TOKEN`, `INTERNAL_JOB_SECRET` |

---

## Шаг 1 — Domain types (`MoySkladProduct.ts`)

```typescript
// DTO, которые возвращает Gateway — независимы от HTTP-деталей МойСклад

export interface MoySkladFolder {
    id: string;
    name: string;
    parentId: string | null;
}

export interface MoySkladProduct {
    article: string;        // code из МойСклад
    name: string;
    price: number;          // уже в рублях (копейки / 100)
    stock: number;          // остаток, >= 0
    folderId: string | null; // id папки МойСклад
}
```

---

## Шаг 2 — Порт Gateway (`MoySkladGateway.ts`)

```typescript
import { MoySkladProduct, MoySkladFolder } from '@/domain/moysklad/MoySkladProduct';

export interface MoySkladGateway {
    fetchFolders(): Promise<MoySkladFolder[]>;
    fetchProducts(): Promise<MoySkladProduct[]>;
}
```

---

## Шаг 3 — HTTP-реализация (`HttpMoySkladGateway.ts`)

Два метода — два HTTP-запроса к api.moysklad.ru.

**`fetchFolders()`:**
- `GET /entity/productfolder?limit=100`
- Из каждой строки: `id`, `name`, `parentId` (из `productFolder.meta.href` — split по `/`, последний элемент)

**`fetchProducts()`:**
- `GET /report/stock/all?expand=assortment&limit=1000`
- Фильтр: `r.assortment?.code` должен быть непустым
- Маппинг: `code → article`, `name`, `salePrices[0].value / 100 → price`, `Math.max(0, quantity) → stock`, `productFolder id → folderId`

Если запрос вернул не 2xx — бросить `Error('МойСклад API error: ${status}')`.

Токен инжектируется через конструктор: `constructor(private token: string)`.
В роуте создаётся: `new HttpMoySkladGateway(process.env.MOYSKLAD_TOKEN!)`.

---

## Шаг 4 — Расширение портов репозиториев

### ProductRepository (добавить)

```typescript
findByArticle(article: string): Promise<Product | null>;
// save() расширяется семантически: обновляет name, price, stock, categoryId, imagePath
// (текущая реализация обновляет только stock — нужно расширить)
```

### CategoryRepository (добавить)

```typescript
findAll(): Promise<Category[]>;
findByNameAndParent(name: string, parentId: string | null): Promise<Category | null>;
// save(category) — upsert по id (создать или обновить)
```

### Prisma-реализации

`ProductRepository.prisma.ts`:
- `findByArticle`: `findUnique({ where: { article } })` — но `article` не уникален в схеме!
  → **Нужно добавить `@@unique([article])` в Prisma-схему** + миграция
  → Либо использовать `findFirst({ where: { article } })` (без изменения схемы, приемлемо для VКР)
- `save()`: заменить `update({ data: { stock } })` на `upsert` по `id` с полным набором полей

`CategoryRepository.prisma.ts`:
- `findAll()`: `findMany()`
- `findByNameAndParent()`: `findFirst({ where: { name, parentId } })`
- `save()`: `upsert({ where: { id }, update: { name, parentId }, create: { ... } })`

---

## Шаг 5 — `SyncProductsUseCase`

### Конструктор

```typescript
constructor(
    private gateway: MoySkladGateway,
    private productRepository: ProductRepository,
    private categoryRepository: CategoryRepository,
)
```

### Алгоритм

```
execute() → { created, updated, hidden, categoriesProcessed }

1. folders = await gateway.fetchFolders()
2. folderIdToLocalCategoryId = await syncCategories(folders)

3. msProducts = await gateway.fetchProducts()
4. localProducts = await productRepository.findAll()

5. localByArticle = Map<article, Product>(localProducts)
6. msArticles = Set<article>(msProducts)

7. for each msProduct:
     localCategory = folderIdToLocalCategoryId.get(msProduct.folderId)
     if (!localCategory) → skip (нет категории — нет товара)

     local = localByArticle.get(msProduct.article)
     if (local):
         save({ ...local, name, price, stock, categoryId: localCategory })
         updated++
     else:
         save({ id: randomUUID(), name, article, price, stock, categoryId, imagePath: null })
         created++

8. for each localProduct where article NOT IN msArticles:
     save({ ...localProduct, stock: 0 })
     hidden++

9. return { created, updated, hidden, categoriesProcessed: folders.length }
```

### syncCategories (вспомогательный метод)

```
1. localCategories = await categoryRepository.findAll()
2. localByNameAndParent = Map<"name|parentId", Category>
3. folderIdToLocalId = new Map()

4. Топологическая сортировка folders: сначала корневые (parentId = null), потом вложенные

5. for each folder (в топологическом порядке):
     parentLocalId = folder.parentId
         ? folderIdToLocalId.get(folder.parentId)
         : null

     existing = localByNameAndParent.get(`${folder.name}|${parentLocalId ?? 'root'}`)

     if (existing):
         folderIdToLocalId.set(folder.id, existing.id)
     else:
         newId = randomUUID()
         await categoryRepository.save({
             id: newId, name: folder.name,
             parentId: parentLocalId ?? null,
             imagePath: null
         })
         folderIdToLocalId.set(folder.id, newId)

6. return folderIdToLocalId
```

---

## Шаг 6 — Route handler

```
GET /api/internal/jobs/sync-products
```

**Авторизация (двойная):**
1. Если `Authorization: Bearer ${INTERNAL_JOB_SECRET}` → разрешить (cron)
2. Если JWT-сессия с `role === 'ADMIN'` → разрешить (ручной запуск)
3. Иначе → 401

**Тело ответа:**
```json
{
    "ok": true,
    "result": { "created": 3, "updated": 47, "hidden": 2, "categoriesProcessed": 8 }
}
```

Исключения возвращать как `{ "ok": false, "error": "..." }` с HTTP 500.

**Примечание о proxy.ts:**
Путь `/api/internal/` не в PUBLIC_PREFIXES, значит стандартный middleware потребует JWT.
Для cron-заголовка нужно добавить логику в proxy: если путь `/api/internal/jobs/` И заголовок `Authorization` совпадает с `INTERNAL_JOB_SECRET` → пропускать без JWT-проверки.

---

## Шаг 7 — Тесты (`SyncProductsUseCase.spec.ts`)

Мок Gateway, мок ProductRepository, мок CategoryRepository.

| # | Сценарий | Проверяем |
|---|----------|-----------|
| 1 | Обновление существующего товара | `productRepository.save` вызван с новыми `name`, `price`, `stock` |
| 2 | Создание нового товара | `productRepository.save` вызван для товара, которого нет локально |
| 3 | Скрытие отсутствующего товара | `productRepository.save` вызван с `stock = 0` для локального товара без пары в МойСклад |
| 4 | Создание новой категории | `categoryRepository.save` вызван для папки без локального аналога |
| 5 | Переиспользование существующей категории | `categoryRepository.save` не вызван, folderId смаплен на существующую Category |
| 6 | Товар без папки игнорируется | Товар с `folderId = null` не попадает в `productRepository.save` |
| 7 | Возвращаемый счётчик корректен | `{ created, updated, hidden }` соответствуют действиям |

Итого: **7 тестов**.

---

## Порядок реализации

1. Domain types + Gateway port
2. Расширить порты `ProductRepository` и `CategoryRepository` (+ Prisma-реализации)
3. `HttpMoySkladGateway` (реальный клиент)
4. `SyncProductsUseCase` + тесты (мок Gateway)
5. Route handler + обновление proxy.ts
6. Ручное тестирование через `curl` с мок-данными или реальным токеном
7. Пометить п.4 как DONE в `UNIMPLEMENTED_PLAN.md`

---

## Переменные окружения (добавить в `.env`)

```env
MOYSKLAD_TOKEN=        # Bearer-токен МойСклад API
INTERNAL_JOB_SECRET=   # Секрет для cron-эндпоинтов
```
