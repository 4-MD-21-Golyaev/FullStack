# Отчёт по фактической реализации проекта

## 1. Архитектура

Проект реализован как fullstack-монолит на Next.js. Серверная часть организована по схеме `domain -> application -> infrastructure -> app/api`. Клиентская часть организована по FSD-подобной структуре `app`, `widgets`, `features`, `shared`, `lib`.

Краткая схема взаимодействия компонентов:

```text
Пользовательский экран (src/app/*)
-> widgets / features / shared/ui / lib/api
-> HTTP-запрос в src/app/api/*
-> use case из src/application/*
-> repository / gateway из src/infrastructure/*
-> PostgreSQL / внешние сервисы
```

Ключевые директории и их роли:

- `src/app` — страницы App Router, layouts, контексты клиента, API routes.
- `src/app/api` — HTTP-слой, маршруты для customer/admin/picker/courier/auth/webhooks/jobs.
- `src/domain` — доменные типы, state machine заказа, доменные ошибки, payment timeout rules.
- `src/application` — use-case классы и портовые интерфейсы.
- `src/infrastructure` — Prisma repositories, transaction runner, YooKassa gateway, MoySklad gateway, email gateway, image storage.
- `src/widgets` — крупные прикладные UI-блоки экранов customer/admin/picker/courier.
- `src/features` — изолированные пользовательские сценарии и элементы поведения: авторизация, выбор адреса, поиск товара.
- `src/shared/ui` — общий UI-kit: buttons, inputs, feedback, data, layout, icons.
- `src/lib` — клиентские API-обёртки, auth helpers, status config, internal job auth.
- `src/styles/tokens` — дизайн-токены.
- `prisma` — schema, migrations, seed.

Фактические особенности архитектурной композиции:

- Backend и frontend находятся в одном репозитории и используют общие типы и enum’ы из `src/domain`.
- API routes не ограничиваются транспортной функцией: в них есть ownership-check, role-check, ручная сборка concrete dependencies.
- Frontend использует `src/lib/api/*` для вызова backend API, а также напрямую импортирует доменные enum’ы `OrderState`, `AbsenceResolutionStrategy`, `PaymentStatus`.
- Авторизация API выполняется централизованно в `src/proxy.ts`, где маршруты делятся на public, admin, picker, courier, internal jobs и cron.

Основные backend цепочки:

- customer API: `src/app/api/orders/*`, `src/app/api/cart/*`, `src/app/api/user/addresses/*`
- auth API: `src/app/api/auth/*`
- admin API: `src/app/api/admin/*`
- picker API: `src/app/api/picker/*`
- courier API: `src/app/api/courier/*`
- background jobs: `src/app/api/internal/jobs/*`, `src/app/api/cron/payment-timeout/route.ts`
- webhooks: `src/app/api/webhooks/yookassa/route.ts`, `src/app/api/webhooks/moysklad/route.ts`

## 2. Данные

Источник фактической модели данных: `prisma/schema.prisma` и SQL-миграции в `prisma/migrations`.

### Сущности и поля

`UserRole`

- `code` PK
- `name`
- связь `users`

`User`

- `id` PK
- `phone`
- `email` unique
- `address` nullable
- `role` FK -> `UserRole.code`
- связи: `orders`, `cartItems`, `refreshTokens`, `pickerClaims`, `deliveryClaims`, `vkIdentity`, `addresses`

`VkIdentity`

- `vkUserId` PK
- `userId` unique FK -> `User.id`
- `createdAt`

`EmailOtp`

- `id` PK
- `email`
- `code`
- `expiresAt`
- `used`
- `attemptCount`
- `createdAt`

`RefreshToken`

- `id` PK
- `userId` FK -> `User.id`
- `revoked`
- `expiresAt`
- `createdAt`

`Category`

- `id` PK
- `name`
- `imagePath` nullable
- `parentId` nullable FK -> `Category.id`
- связи: `parent`, `children`, `products`

`Product`

- `id` PK
- `name`
- `article`
- `price` decimal(10,2)
- `stock` int
- `imagePath` nullable
- `categoryId` FK -> `Category.id`
- связи: `cartItems`, `orderItems`

`CartItem`

- `id` PK
- `userId` FK -> `User.id`
- `productId` FK -> `Product.id`
- `quantity`
- unique composite key: `userId + productId`

`OrderStatus`

- `id` PK
- `code` unique
- `name`
- связь `orders`

`AbsenceResolutionStrategy`

- `id` PK
- `code` unique
- `name`
- связь `orders`

`Order`

- `id` PK
- `userId` FK -> `User.id`
- `statusId` FK -> `OrderStatus.id`
- `totalAmount` decimal(10,2)
- `deliveryAt` nullable
- `address`
- `scheduledDate` nullable
- `scheduledTimeSlot` nullable
- `absenceResolutionStrategyId` FK -> `AbsenceResolutionStrategy.id`
- `pickerClaimUserId` nullable FK -> `User.id`
- `pickerClaimedAt` nullable
- `deliveryClaimUserId` nullable FK -> `User.id`
- `deliveryClaimedAt` nullable
- `outForDeliveryAt` nullable
- `deliveredAt` nullable
- `moySkladId` nullable
- `createdAt`
- `updatedAt`
- связи: `items`, `payments`, `pickerClaimer`, `deliveryClaimer`

`UserAddress`

- `id` PK
- `userId` FK -> `User.id`
- `address`
- `createdAt`

`OrderItem`

- `id` PK
- `orderId` FK -> `Order.id`
- `productId` FK -> `Product.id`
- `name`
- `article`
- `price` decimal(10,2)
- `quantity`

`OutboxEvent`

- `id` PK
- `eventType`
- `payload` json
- `createdAt`
- `processedAt` nullable
- `failedAt` nullable
- `errorMessage` nullable
- `retryCount`
- `claimedAt` nullable

`PaymentStatus`

- `id` PK
- `code` unique
- `name`
- связь `payments`

`Payment`

- `id` PK
- `orderId` FK -> `Order.id`
- `statusId` FK -> `PaymentStatus.id`
- `externalId` nullable
- `amount` decimal(10,2)
- `pendingOrderLock` nullable
- `createdAt`

`AuditLog`

- `id` PK
- `actorUserId`
- `actorRole`
- `action`
- `targetType`
- `targetId`
- `before` json nullable
- `after` json nullable
- `reason` nullable
- `correlationId`
- `timestamp`

`JobRunLog`

- `id` PK
- `jobName`
- `startedAt`
- `finishedAt` nullable
- `status`
- `initiatedBy` nullable
- `processed` nullable
- `failed` nullable
- `errorSummary` nullable

### Ключевые связи

- `User 1:N Order`
- `User 1:N CartItem`
- `User 1:N RefreshToken`
- `User 1:N UserAddress`
- `User 1:1 VkIdentity`
- `Category 1:N Product`
- `Category 1:N Category` через `parentId`
- `Order 1:N OrderItem`
- `Order 1:N Payment`
- `Product 1:N CartItem`
- `Product 1:N OrderItem`
- `OrderStatus 1:N Order`
- `PaymentStatus 1:N Payment`
- `AbsenceResolutionStrategy 1:N Order`

### Реализация заказа

- Заказ хранится в `Order`.
- Позиции заказа хранятся в `OrderItem`.
- Цена товара в заказе фиксируется в `OrderItem.price`.
- В `OrderItem` также фиксируются snapshot-поля `name` и `article`.
- Итоговая сумма заказа хранится в `Order.totalAmount`.
- Пользователь заказа хранится по `Order.userId`.
- Стратегия обработки отсутствующего товара хранится в `Order.absenceResolutionStrategyId`.
- Выбранные дата и слот доставки хранятся в `Order.scheduledDate` и `Order.scheduledTimeSlot`.
- Назначение сборщика и курьера хранится прямо в `Order` через claim-поля.

### Реализация корзины

- Для авторизованного пользователя корзина хранится в таблице `CartItem`.
- Для гостя корзина хранится в `localStorage` под ключом `nk_cart` в `src/app/(customer)/CartContext.tsx`.
- После логина локальная корзина синхронизируется в DB через `POST /api/cart/sync`.

### Пользователь и адреса

- Пользователь хранится в `User`.
- Роли хранятся через lookup-таблицу `UserRole`.
- Email OTP хранится в `EmailOtp`.
- Refresh tokens хранятся в `RefreshToken`.
- Привязка VK хранится в `VkIdentity`.
- Список пользовательских адресов вынесен в `UserAddress`.

### Остатки и платежные ограничения

- Остатки хранятся в `Product.stock`.
- Ограничение на один pending-платёж на заказ реализовано через `Payment.pendingOrderLock` и partial unique index в миграции `20260312000001_payment_pending_lock`.
- Механизм claim/retry для outbox реализован через `OutboxEvent.claimedAt`.

## 3. Бизнес-логика

### Корзина

- `AddToCartUseCase` добавляет товар в DB-корзину авторизованного пользователя и проверяет положительное количество и достаточный `Product.stock`.
- `UpdateCartItemUseCase` обновляет количество в корзине.
- `RemoveFromCartUseCase` удаляет позицию.
- `GetCartUseCase` возвращает корзину вместе с данными товара.
- `SyncCartUseCase` очищает DB-корзину и пересоздаёт её из локального состояния после логина.
- Guest-режим корзины реализован в `CartContext`: операции происходят только в `localStorage`.

### Создание заказа

- Checkout вызывает `ordersApi.createOrder`.
- `POST /api/orders` создаёт `CreateOrderUseCase`.
- В `CreateOrderUseCase` для каждой позиции:
  - читается `Product`
  - валидируется существование товара
  - валидируется `quantity > 0`
  - проверяется достаточность остатков
  - формируется snapshot `OrderItem`
- Доменная функция `createOrder` создаёт заказ в статусе `CREATED`.
- После сохранения заказа в outbox добавляются события `ORDER_CREATED` и `ORDER_CONFIRMED`.
- После успешного оформления очищается DB-корзина пользователя.

### Сборка заказа

- `StartPickingUseCase` переводит заказ `CREATED -> PICKING`.
- `UpdateOrderItemsUseCase` разрешает изменение состава только в `PICKING`.
- При обновлении состава:
  - для существующих позиций сохраняются исходные snapshot `name`, `article`, `price`
  - для новых позиций snapshot берётся из текущего `Product`
  - позиции с количеством `0` исключаются
  - `totalAmount` пересчитывается
- `CompletePickingUseCase` переводит заказ `PICKING -> PAYMENT`, если:
  - нет необработанных позиций
  - после сборки осталось хотя бы одно наименование
- После завершения сборки в outbox добавляется `ORDER_PICKED`.

### Оплата

- `InitiatePaymentUseCase` загружает заказ, проверяет истечение payment window и отменяет устаревший заказ при необходимости.
- Внутри транзакции:
  - ищется существующий `PENDING` payment
  - повторно проверяются остатки по всем позициям
  - при нехватке остатков заказ отменяется
  - создаётся `Payment` в статусе `PENDING`
- После транзакции вызывается `YookassaGateway.createPayment`.
- При ошибке внешнего gateway `Payment` переводится в `FAILED`.
- После успешного ответа gateway сохраняется `externalId` и возвращается `confirmationUrl`.

### Подтверждение оплаты webhook’ом

- `POST /api/webhooks/yookassa` принимает события `payment.succeeded` и `payment.canceled`.
- В production дополнительно проверяется IP-адрес отправителя.
- `ConfirmPaymentUseCase` идемпотентен:
  - если `Payment` уже `SUCCESS` или `FAILED`, обработка прекращается
- Для `payment.canceled`:
  - `Payment -> FAILED`
  - `Order -> CANCELLED`
- Для `payment.succeeded`:
  - повторно проверяются остатки
  - при нехватке остатков `Payment -> FAILED`, `Order -> CANCELLED`, после коммита пытается выполниться refund через gateway
  - при наличии остатков списывается `Product.stock`
  - `Payment -> SUCCESS`
  - заказ переводится в `DELIVERY_ASSIGNED`
  - в outbox добавляется `PAYMENT_RECEIVED`

### Доставка

- Для picker/courier реализованы отдельные claim/release use-case’ы.
- Claim выполняется через SQL update в репозитории и журналируется в `AuditLog`.
- `CourierStartDeliveryUseCase` переводит заказ в `OUT_FOR_DELIVERY`, фиксирует `outForDeliveryAt`, пишет `ORDER_OUT_FOR_DELIVERY` в outbox.
- `CourierConfirmDeliveredUseCase` сначала переводит заказ в `DELIVERED`, затем сразу в `CLOSED`, пишет `ORDER_COMPLETED` и `ORDER_DELIVERED` в outbox.
- `CourierMarkDeliveryFailedUseCase` возвращает заказ из `OUT_FOR_DELIVERY` в `DELIVERY_ASSIGNED`, снимает claim-поля и пишет запись в аудит.

### Фоновые процессы

- `PaymentTimeoutUseCase` ищет устаревшие `PENDING` payments и переводит их в `FAILED`.
- `OrderPaymentTimeoutUseCase` ищет заказы, долго находящиеся в `PAYMENT`, и отменяет их, если для них уже нет активного pending-платежа.
- `ProcessOutboxUseCase` обрабатывает outbox:
  - экспортирует заказ в MoySklad
  - обновляет заказ в MoySklad после сборки
  - создаёт payment-in в MoySklad после оплаты
  - переводит заказ MoySklad в состояние отгрузки
  - отправляет email-уведомления `ORDER_CONFIRMED`, `ORDER_OUT_FOR_DELIVERY`, `ORDER_DELIVERED`
- `SyncProductsUseCase` синхронизирует категории, товары, остатки и изображения из MoySklad.

### Валидации, ошибки, транзакции

- Транзакции запускаются через `PrismaTransactionRunner` с уровнем `Serializable`.
- Транзакционные use-case’ы: создание заказа, завершение сборки, подтверждение оплаты, dev-оплата, timeout-обработчики, courier state changes.
- Бизнес-ошибки возвращаются как `400`, `403`, `404`, `422`, `429` в зависимости от маршрута.
- Ошибки webhook’а YooKassa делятся на retryable и non-retryable.

### Фактическая state machine заказа

- `CREATED`
- `PICKING`
- `PAYMENT`
- `DELIVERY_ASSIGNED`
- `OUT_FOR_DELIVERY`
- `DELIVERED`
- `CLOSED`
- `CANCELLED`
- `DELIVERY` присутствует в коде как legacy-state для совместимости с существующими записями.

## 4. Сценарий

Полный фактический flow покупки:

1. Пользователь открывает customer-часть приложения.
2. Категории и товары загружаются через `/api/categories` и `/api/products`.
3. В карточке товара пользователь добавляет товар в корзину.
4. Если пользователь не авторизован, корзина хранится только в `localStorage`.
5. После авторизации `AuthContext` запрашивает `/api/auth/me`; если нужно, перед этим выполняется `/api/auth/refresh`.
6. После логина `CartContext` вызывает `/api/cart/sync` и переносит локальную корзину в DB.
7. На странице корзины пользователь изменяет количество, удаляет позиции или переходит к оформлению.
8. Если пользователь не авторизован, кнопка checkout открывает auth modal с последующим redirect на `/checkout`.
9. На checkout пользователь выбирает:
   - тип получения
   - адрес из `UserAddress` или создаёт новый
   - дату
   - временной слот
   - стратегию отсутствия товара
10. При submit checkout вызывается `POST /api/orders`.
11. На этом этапе создаётся реальный `Order`; до этого persistent order не существует.
12. После создания заказа frontend сохраняет `lastOrderId` в `sessionStorage`.
13. Сразу после этого вызывается `POST /api/orders/[id]/pay`.
14. Сервер создаёт pending payment и получает `confirmationUrl` от YooKassa.
15. Браузер делает redirect на внешнюю страницу оплаты.
16. После внешней оплаты YooKassa отправляет webhook в `/api/webhooks/yookassa`.
17. Webhook переводит payment и order в следующее состояние, списывает остатки и создаёт outbox event.
18. Заказ попадает в операционный flow picker/courier.
19. Пользователь может просматривать список заказов и карточку конкретного заказа в `/orders` и `/orders/[id]`.

Реализация входа:

- Вход построен на email OTP.
- `POST /api/auth/request-code` создаёт код и отправляет email.
- `POST /api/auth/verify-code` проверяет код, создаёт access/refresh token cookies.
- Если пользователь не найден, auth form переводит сценарий в регистрацию через `POST /api/auth/register`.

## 5. UI

### Реализованные экраны

Customer:

- `/` — главная страница.
- `/catalog` — корневой каталог.
- `/catalog/[categoryId]` — страница категории.
- `/catalog/product/[id]` — карточка товара.
- `/cart` — корзина.
- `/checkout` — оформление заказа.
- `/checkout/success` — success page после оформления.
- `/orders` — список заказов пользователя.
- `/orders/[id]` — детальная страница заказа.

Auth:

- `/login` — отдельная страница логина.
- auth modal в customer layout — встроенный сценарий OTP-входа и регистрации.

Admin:

- `/admin` — dashboard.
- `/admin/orders` — список заказов.
- `/admin/orders/[id]` — карточка заказа.
- `/admin/payments/issues` — проблемные платежи.
- `/admin/jobs` — фоновые задачи.
- `/admin/users` — список пользователей.

Picker / Courier:

- `/picker` — рабочее место сборщика.
- `/courier` — рабочее место курьера.

Service / test pages:

- `/test-access-matrix`
- `/test-admin-ops`
- `/test-cabinet`
- `/test-courier`
- `/test-ops`
- `/test-order`
- `/test-picker`
- `/vk`

### Фактическая готовность экранов

Полностью подключены к backend flow:

- каталог
- корзина
- checkout
- список и карточка заказа
- picker workspace
- courier workspace
- admin dashboard
- admin orders
- admin payment issues
- admin jobs
- auth flow

Частично реализованы:

- карточка товара — основная загрузка товара и добавление в корзину работают, но вкладки характеристик, пищевой ценности, хранения, состава и описания заполнены placeholder-текстом.
- `/admin/users` — есть экран и `usersApi`, но backend routes `/api/admin/users` и `/api/admin/users/[id]` отсутствуют.
- checkout success page существует, но `pay` route формирует `returnUrl` вида `/orders/{id}/result`, при этом страницы `/orders/[id]/result` в `src/app` нет.

Дополнительные UI-особенности:

- customer layout использует глобальные контексты `AuthContext`, `CartContext`, `BreadcrumbsContext`.
- picker и courier построены через общий `WorkerPage` и специализированные workspace-компоненты.
- admin интерфейс использует общий sidebar/header и таблицы.

### Дизайн-система / UI-kit

Фактическая дизайн-система реализована через:

- `src/shared/ui` — общий UI-слой
- `src/styles/tokens/primitive.css` — примитивные токены
- `src/styles/tokens/context.css` — семантические токены
- `src/styles/tokens/component.css` — component-level tokens

Содержимое UI-kit:

- `buttons` — `Button`, `IconButton`, `Link`, `CartButton`, `LikeButton`, mobile buttons.
- `inputs` — `Input`, `TextField`, `Counter`, `Radio`, `Select`, `Switch`, `Multiselect`, `CodeInput` и др.
- `feedback` — `Badge`, `Modal`, `ConfirmDialog`, `Toast`, `Spinner`, `Skeleton`, `OrderStatusBadge`, `PaymentStatusBadge`, `SlaTimer`, `Roadmap`.
- `data` — `DataTable`, `OrderSummary`, `InfoField`, `Category`, `WideProductCard`, `NarrowProductCard`, `Slider`.
- `layout` — `Container`, `Grid`, `GridItem`.
- `icons` — `Icon`, `Logo`.

Фактически унифицировано:

- цветовая палитра и статусные цвета
- spacing, typography, radii, shadows, z-index
- кнопки и варианты кнопок
- формы и состояния инпутов
- таблицы и карточки
- status badges
- modal/dialog behaviour
- layout-примитивы

Фактически локально остаётся на уровне экранов и виджетов:

- бизнес-специфичные layout-сценарии customer/admin/picker/courier
- рабочие зоны сборщика и курьера
- admin cards/jobs layout
- product page gallery/tabs

Дополнительные факты по токенам:

- в `primitive.css` зафиксированы raw values для цветов, spacing, fonts, radii, shadows.
- в `context.css` введены semantic aliases для text/bg/border/icon/action/status/order-state/layout/typography.
- в `component.css` есть отдельные токены для button, input, badge, table, sidebar, cards, slider, header, footer и SLA timer.

## 6. Интеграции

### YooKassa

Используется реально.

Точки использования:

- создание платежа через `src/infrastructure/payment/YookassaGateway.ts`
- запуск оплаты из `InitiatePaymentUseCase`
- webhook `src/app/api/webhooks/yookassa/route.ts`
- refund в `ConfirmPaymentUseCase` при успешной оплате и нехватке остатков

Передаваемые данные:

- `internalPaymentId`
- `orderId`
- `amount`
- `description`
- `returnUrl`
- при refund: `externalId`, `amount`, `idempotencyKey`

Момент вызова:

- при действии пользователя на checkout
- при webhook callback от YooKassa

### MoySklad

Используется реально.

Точки использования:

- `HttpMoySkladCatalogGateway` — импорт каталога, папок, остатков, изображений
- `HttpMoySkladOrderGateway` — экспорт customer order, payment-in, update state
- webhook `/api/webhooks/moysklad`
- internal job `/api/internal/jobs/sync-products`
- internal job `/api/internal/jobs/process-outbox`

Передаваемые данные:

- категории и товары из MoySklad в локальную БД
- остатки из MoySklad в `Product.stock`
- изображения товаров в disk storage
- заказные позиции и суммы из outbox в customer order MoySklad
- payment-in после успешной оплаты

Момент вызова:

- фоново через internal jobs
- webhook MoySklad инициирует полную синхронизацию, а не точечную обработку payload
- outbox processing экспортирует изменения заказа после оформления, сборки, оплаты и завершения

### Email

Используется реально через `NodemailerEmailGateway`.

Отправляются:

- подтверждение оформления заказа
- уведомление о передаче в доставку
- уведомление о доставке

Момент вызова:

- во время `ProcessOutboxUseCase`

### Yandex Suggest

Используется реально через `/api/suggest`.

Особенности:

- route проксирует запросы в `https://suggest-maps.yandex.ru/v1/suggest`
- используется для адресных подсказок

## 7. Тесты

Тестовый стек — Vitest.

Покрытые группы:

- domain:
  - `src/domain/order/__tests__/order.spec.ts` — state machine и доменные переходы
- application:
  - auth use cases
  - cart use cases
  - order use cases
  - picker use cases
  - courier use cases
  - admin use cases
  - user address use cases
- API routes:
  - auth routes
  - `/api/orders/[id]/pay`
  - `/api/webhooks/yookassa`
- infrastructure:
  - `yookassaIpWhitelist`
  - `ProductRepository.prisma`
- lib/auth:
  - JWT
  - OTP hash
  - VK signature
- middleware:
  - `src/__tests__/middleware.spec.ts`

Фактически покрываются:

- state machine заказа
- создание и подтверждение оплаты
- отмена и закрытие заказа
- timeout use cases
- outbox processing
- cart operations
- auth operations
- picker/courier flows
- role-based API gating в middleware/proxy

## 8. Ограничения

- Карточка товара содержит placeholder-контент во вкладках характеристик, хранения, состава, описания и пищевой ценности.
- В дереве `src/app` присутствуют test/service pages, не отделённые в отдельный служебный пакет.
- В коде сохраняется legacy-state `DELIVERY` наряду с фактической новой цепочкой `DELIVERY_ASSIGNED -> OUT_FOR_DELIVERY -> DELIVERED`.
- `CourierConfirmDeliveredUseCase` переводит заказ в `DELIVERED`, а затем сразу в `CLOSED`; отдельного устойчивого пользовательского состояния `DELIVERED` в persisted flow не остаётся.
- `/api/suggest` содержит hardcoded `YANDEX_API_KEY` в исходном коде.
- Webhook MoySklad не анализирует конкретные события из payload, а всегда запускает полную синхронизацию ассортимента.
- Repositories содержат SQL-операции claim/release и фильтрацию по бизнес-статусам, то есть часть прикладной логики распределена между application и persistence-слоем.
