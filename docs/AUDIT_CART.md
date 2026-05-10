# Аудит работы корзины

Дата: 2026-05-10

## Архитектура (контекст)

- **Клиент**: `CartContext` с двумя режимами — гость (localStorage) и авторизованный (server-as-truth + оптимистичные апдейты).
- **Очередь**: `cartUpdateQueue` дебаунсит PATCH-запросы по `productId` (300 ms), коалесцирует in-flight.
- **API**: `GET/POST /api/cart`, `PATCH/DELETE /api/cart/[productId]`, `POST /api/cart/sync`.
- **Auth**: `src/proxy.ts` (Next 16 middleware) верифицирует JWT из cookie и подставляет `x-user-id` после удаления любых spoofed клиентских заголовков (`proxy.ts:60-62`, `151`). **Уязвимости подделки нет.**
- **Use cases**: `AddToCart`, `UpdateCartItem`, `RemoveFromCart`, `GetCart`, `SyncCart`. Composite unique `(userId, productId)` гарантирует одну строку на товар.

---

## CRITICAL — потеря данных и неконсистентность

### C1. На каждом page-refresh залогиненного пользователя вызывается `sync`, а не `GET`

`src/app/(customer)/CartContext.tsx:138-160`

```ts
const prevUserId = prevUserIdRef.current;          // null на первом рендере
const currentUserId = user?.userId ?? null;
if (currentUserId && !prevUserId) {                 // ← всегда true при F5 авторизованным
    serverSync(localRead()...)
}
else if (currentUserId && prevUserId === currentUserId) { ... }  // мёртвая ветка на первом рендере
```

`prevUserIdRef` инициализируется `null`, поэтому ветка для page-refresh **никогда не срабатывает** — все случаи идут через `serverSync`. На стороне сервера sync route мягко митигирует это: при пустом `items` пропускает `SyncCartUseCase` (`sync/route.ts:21`). Но если в `localStorage` остались старые гостевые данные:

**Сценарий потери данных:**
1. User A залогинен, в DB корзина с 5 товарами.
2. Logout — `localClear()` отрабатывает, но если другая вкладка успела что-то записать, или logout прервался на network, `localStorage` ненулевой.
3. F5 на странице — sync с локальными items: `SyncCartUseCase.clear(userId)` стирает все 5 товаров из DB и заменяет «гостевой» корзиной.

То же самое реалистично:
- Гость накидал 3 товара → залогинился под уже существующим аккаунтом с 10 товарами в DB → DB-корзина (10) **полностью затирается** гостевой (3). Это «design choice» (см. комментарий в `SyncCartUseCase.ts:15`), но **никогда не показывается пользователю** перед слиянием. Mainstream-решения (Amazon, OZON) объединяют корзины или спрашивают.

### C2. На ошибку sync — расхождение UI и БД с дальнейшим повреждением операций

`CartContext.tsx:144-149`

```ts
serverSync(...)
  .then(serverItems => { setItems(serverItems); localClear(); })
  .catch(() => {/* keep local items on error */});
```

При фейле sync (сеть, 500, JWT истёк между `me` и `sync`):
- `items` остаются «локальные», `localStorage` не очищен.
- `isAuthed === true`, поэтому effect на `localWrite` **не пишет** (`CartContext.tsx:166`), **но и не очищает** старый localStorage.
- Каждое следующее действие пользователя идёт через server-API: `serverAdd/serverUpdate/serverRemove` работают с пустой DB-корзиной, а UI показывает «локальную». Полный рассинхрон без уведомления.
- `console.error` — единственный сигнал, тоста нет (TODO в коде).

### C3. `removeItem` не оптимистичен — UI «зависает» при сетевой задержке

`CartContext.tsx:205-214`

```ts
serverRemove(productId).then(() =>
  setItems(prev => prev.filter(i => i.productId !== productId))
).catch(() => {/* ignore */});
```

В отличие от `addItem` (оптимистично + откат), удаление **сначала ждёт сервер**, потом обновляет UI. На медленной сети товар после клика остаётся видимым 1–3 сек. На ошибке — навсегда, без сообщения.

### C4. `clearCart`: при частичной ошибке UI не очищается, а сервер уже почистил часть

`CartContext.tsx:242-250`

```ts
Promise.all(items.map(i => serverRemove(i.productId)))
  .then(() => setItems([]))
  .catch(() => {/* ignore */});
```

`Promise.all` reject на первой же ошибке → `setItems([])` **не вызывается**, хотя N−1 товаров на сервере уже удалены. Пользователь видит «полную» корзину; следующий refresh покажет пустую. Плюс одновременный шторм из N DELETE-запросов вместо одного `DELETE /api/cart`.

### C5. Цена не снапшотится при добавлении в корзину

`prisma/schema.prisma`, модель `CartItem` хранит только `quantity`. `GetCartUseCase` каждый раз джойнит актуальный `Product.price`. Между добавлением и checkout цена может измениться — пользователь увидит другую сумму на оформлении. Для корзины это classic data-loss-by-omission.

---

## HIGH — race conditions

### H1. Быстрые клики `addItem` — обратный порядок ответов перетирает state

`CartContext.tsx:171-188`. Snapshot для отката берётся до `serverAdd`, но если два `addItem` вызваны подряд:
- T1: snapshot=A, optimistic=B, serverAdd1 in flight.
- T2: snapshot=B, optimistic=C, serverAdd2 in flight.
- Если ответы приходят в порядке T2 → T1, последний `setItems(response1)` вернёт корзину к состоянию после первого add (без второго).

Нет request-id / version, нет коалесцирования, нет mutex.

### H2. `updateQuantity` использует stale `items` из замыкания

`CartContext.tsx:222-230`

```ts
const item = items.find(i => i.productId === productId);   // closure
if (!item) return;
...
updateQueue.schedule(productId, cappedQty, item.quantity); // confirmed = optimistic, не серверное
```

Два следствия:
1. После только что выполненного `addItem` для нового товара React ещё не отрендерил → `items.find` вернёт `undefined` → апдейт **молча проглатывается**.
2. `currentConfirmed = item.quantity` — это **оптимистичное** значение, а не подтверждённое сервером. Если сервер откатит, `onError` вернёт UI к этому фантомному «confirmed», а не к реальному серверному значению.

### H3. `removeItem` не отменяет уже улетевший PATCH

`updateQueue.cancel` снимает только `timer`; `inFlight` PATCH завершится. Сервер увидит порядок: PATCH(qty=N) → DELETE. Если PATCH дойдёт после DELETE (out-of-order на сети), а `CartRepository.save` реализован как `upsert` — товар может **воскреснуть** с qty=N. Нужно подтвердить чтением `CartRepository.prisma.ts:save`.

### H4. `clearCart` + параллельный `addItem`

`Promise.all(serverRemove)` итерирует по snapshot `items`. Если в это же время сработал `addItem` — новый товар на сервере добавится, `setItems([])` затрёт его в UI, но в БД он останется. После refresh «появится из ниоткуда».

---

## MEDIUM — UX и валидация

### M1. Stock в `CartItem` — снапшот, не живой

`items[i].stock` — то, что было при последнем GET/sync. Между визитами:
- Если stock уменьшился до < `quantity` → клиент **молчит** до следующего GET. На checkout вылезет ошибка.
- При `updateQuantity(qty)` клиент капит до старого `stock`, сервер уже считает по новому → 400 → onError откат.

Нет периодического полла стока, нет обновления через WS.

### M2. API возвращает 400 на любую ошибку

`route.ts:40-42`, `[productId]/route.ts:25-27/45`: всё через `catch (error: any) → 400`.

Mix-up: «Product not found» должно быть 404, «Insufficient stock» — 409 или 422, «Quantity must be positive» — 422. Клиент не может различать причину для разных UX-реакций («товар закончился» vs «нет такого»).

### M3. Нет валидации входа в API

Ни `POST /api/cart`, ни `PATCH/DELETE [productId]`, ни sync не валидируют типы:
- `body.productId` может быть числом, массивом, `null` — упадёт глубже с невнятной ошибкой.
- `body.quantity` не проверяется на integer/finite (передача `1.5`, `"5"`, `Infinity` пропустится и упадёт в БД).
- Нет zod/valibot.

### M4. SyncCartUseCase молча отбрасывает «исчезнувшие» товары

`SyncCartUseCase.ts:28-29`:

```ts
if (!product) continue;            // удалён
if (product.stock === 0) continue; // out of stock
```

Гость добавил 3 товара, один из них к моменту логина удалён администратором — он **тихо пропадает** при sync. Никакого уведомления пользователю. Лучше: возвращать список «не перенесли по причине X».

### M5. «Отмена удаления» на странице корзины ассимметрична с серверным удалением

В `cart/page.tsx` логика undo: при удалении item кладётся в `pending`, через 10 сек реально удаляется. Но `removeItem` для авторизованного **сразу** уходит на сервер (`serverRemove`). Значит:
- На странице корзины «отмена удаления» показывается с countdown 10 сек, но сервер уже узнал об удалении синхронно с кликом.
- Если в это время другая вкладка делает GET — товара уже нет.
- Восстановление через `addItem(product, item.quantity)` — это новый POST, может попасть на «Insufficient stock», если stock уменьшился.

### M6. localStorage edge cases

`CartContext.tsx:79-103`:
- `QuotaExceededError` проглатывается → данные не сохранены, пользователь не знает.
- Невалидный JSON → пустая корзина без предупреждения.
- Изменение схемы `CartItem` (добавили поле) → старые сохранения молча валидируются как `as CartItem[]` через type assertion → возможен runtime crash при доступе к новому полю.
- Multi-tab: одна вкладка `localWrite`, другая не подписана на `storage` event → расхождение между вкладками для гостей.

### M7. `clearCart` — N сетевых запросов вместо одного

При 30 товарах — 30 параллельных DELETE. Нет endpoint `DELETE /api/cart` для batch-операции.

### M8. Logout не зачищает DB-корзину

`CartContext.tsx:150-153` — стирает только локально. Это может быть by-design (сохранить корзину между сессиями), но в сочетании с C1 даёт «амнезию» при следующем гостевом визите.

---

## LOW — код и maintainability

### L1. Странный паттерн в logout-ветке

`CartContext.tsx:153`:

```ts
void Promise.resolve([] as CartItem[]).then(setItems);
```

Замена просто `setItems([])` через микротаск. Без комментария причины — выглядит как остаток от bug-fix React-batching. Должно быть либо обычный `setItems([])`, либо комментарий «зачем».

### L2. Дублирование интерфейсов

`CartItem` (`CartContext.tsx:7`) и `ServerCartItem` (`CartContext.tsx:29`) — идентичны. `serverGetCart` возвращает `Promise<CartItem[]>`, `serverSync` — `Promise<ServerCartItem[]>`. Без причины.

### L3. Нет `userId` в ключе localStorage

При logout `localStorage` не привязан к userId, что в комбинации с C1 рождает «гостевое отравление DB».

### L4. `serverGetCart` молча возвращает `[]` при любой ошибке

`CartContext.tsx:38-42`. Network down → корзина пустая в UI; пользователь думает, что всё пропало. Лучше различать «401 → авторизация истекла» vs «500 → попробуйте позже» vs «empty».

### L5. Тесты `cartUpdateQueue` покрывают только сам queue

В тестах нет интеграционных сценариев для главных багов: race на ответах addItem, sync-failure flow, removeItem race с PATCH.

---

## Сценарии-edge cases (чеклист)

| # | Сценарий | Текущее поведение |
|---|---|---|
| 1 | F5 залогиненного с пустым localStorage | sync → SyncCart skip → GetCart. OK, но через лишний роут. |
| 2 | F5 залогиненного с непустым localStorage (stale из прошлой сессии) | **C1: DB-корзина перезаписана.** |
| 3 | Гость → добавил товары → login | sync — текущая DB замещается локальной. Никакого UX-выбора. |
| 4 | Sync падает (network/500) | **C2: UI показывает локальную, сервер пустой, операции рассинхронизируют.** |
| 5 | addItem на сервере падает | Откат к snapshot. OK, но `console.error` only. |
| 6 | Два addItem подряд, ответы out-of-order | **H1: возможна потеря оптимистичного состояния.** |
| 7 | updateQuantity сразу после addItem нового товара | **H2: молча проглатывается (stale items).** |
| 8 | Быстрая последовательность qty 1→5→2→3 | OK, queue коалесцирует, отправит 3. |
| 9 | qty изменён, сервер вернул 400 (stock < qty) | onError откатит к `currentConfirmed` (оптимистическому, не серверному — H2). |
| 10 | removeItem, потом сразу addItem того же товара | Оба запроса параллельны; в БД зависит от порядка. Нет линеаризации. |
| 11 | removeItem — сетевая задержка 2s | **C3: UI висит 2s, потом исчезает.** |
| 12 | removeItem fails | Товар остаётся в UI, ошибка в консоль. |
| 13 | clearCart, один из DELETE падает | **C4: UI не очищается, БД частично пустая.** |
| 14 | clearCart на 50 товарах | 50 параллельных DELETE — M7. |
| 15 | Гость, добавил товар → товар удалён админом → login | **M4: тихо пропадает при sync.** |
| 16 | Гость, добавил qty=5 → stock на сервере упал до 2 → login | sync делает clamp до 2, без уведомления. |
| 17 | localStorage переполнен / privacy mode Safari | M6: молча не сохраняется. |
| 18 | localStorage с битым JSON | Корзина пустая без предупреждения. |
| 19 | Multi-tab гость: добавил в одной, открыл другую | M6: вторая вкладка не видит изменений до F5. |
| 20 | JWT истёк во время сессии — addItem | 401 от proxy → `serverAdd` throw → откат. AuthContext не знает, что user разлогинен. |
| 21 | Цена товара изменилась после добавления | **C5: на checkout сумма другая.** |
| 22 | Stock уменьшился после добавления | M1: клиент не знает до checkout/PATCH. |
| 23 | API получает `quantity = 1.5` или `"5"` | **M3: пропускается до БД.** |
| 24 | API получает `productId = null` или массив | **M3: упадёт глубже.** |
| 25 | Logout с непустой корзиной | DB-корзина остаётся (M8); local стёрт. |
| 26 | SSR: первый рендер | useState инициализируется на сервере как `[]`, на клиенте — из localStorage. Header защищён `mounted` флагом, остальные места могут моргать. |
| 27 | Стресс: 100 addItem за секунду | Нет rate limit, нет дедупликации. |
| 28 | DELETE `/api/cart/{рандомный uuid}` авторизованным | Use case кинет «not found» → 400. Нет защиты от спама. |

---

## Приоритетный порядок починки

1. **C1 + C5 + C2** — самые опасные с точки зрения данных.
   - C1: различать первый рендер по `wasInitializedRef` + использовать loading-флаг для синхронности.
   - C5: добавить `priceAtAdd` в `CartItem` модель.
   - C2: обработать ошибку sync явно — блокирующий тост «не удалось синхронизировать» + retry.
2. **C3, C4** — сделать симметрично с `addItem` (оптимистично + откат). Добавить `DELETE /api/cart` для clear.
3. **H1, H2, H3** — ввести version/seq на каждое изменение items; в `updateQuantity` использовать функциональный `setItems(prev => ...)` и брать `currentConfirmed` из ref, не из state.
4. **M2, M3** — нормальные HTTP-коды + zod-валидация бодей.
5. **M4** — sync route должен возвращать `{ cart, dropped: [{productId, reason}] }`, UI — показать предупреждение.
6. **L4, M6** — общий error reporter / тосты + `storage`-event для multi-tab.
