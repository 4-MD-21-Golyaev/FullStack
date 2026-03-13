# Интернет-магазин «КомпанияН»

eGrocery-платформа, разработанная в рамках ВКР. Система покрывает полный цикл работы с заказом — от добавления товара в корзину до закрытия доставленного заказа — и включает операционные роли для сборщиков, курьеров и администраторов.

> Весь код проекта разработан с использованием возможностей ИИ-агента — **Claude Code** (Anthropic).

---

## Посмотреть вживую

Проект доступен по адресу: **https://blackfly-causeless-camie.ngrok-free.dev/**

Перед тем как открыть ссылку, напишите в Telegram: **[@likekushka](https://t.me/likekushka)** — сервер запускается по запросу.

### Тестовые страницы

| Страница | URL | Что можно проверить |
|----------|-----|---------------------|
| Жизненный цикл заказа | `/test-order` | Создание заказа, оплата, переходы по статусам |
| Личный кабинет | `/test-cabinet` | История заказов, повтор заказа |
| Сборщик | `/test-picker` | Захват заказа, корректировка состава, завершение сборки |
| Курьер | `/test-courier` | Захват заказа, выезд, подтверждение вручения / неудача |
| Администратор | `/test-admin-ops` | Просмотр всех заказов, управление платежами, запуск задач |
| Матрица доступа | `/test-access-matrix` | Ролевая модель: кто что может делать |
| Операционные сценарии | `/test-ops` | Совместный сценарий picker + courier + admin |
| Интеграция МойСклад | `/admin/moysklad` | Синхронизация каталога, экспорт заказов |

---

## Что это за проект

Это REST API + минимальный фронтенд (текущая реализация) для онлайн-магазина с доставкой. Основная ценность — продуманная доменная модель и явная реализация жизненного цикла заказа с сохранением инвариантов на уровне бизнес-логики, а не базы данных.

**Пользовательские роли:**

| Роль | Что делает |
|------|-----------|
| Покупатель | Формирует корзину, оформляет заказ, оплачивает, отслеживает статус |
| Сборщик  | Берёт заказ в работу, собирает по факту наличия, закрывает сборку |
| Курьер | Принимает заказ на доставку, подтверждает вручение или фиксирует неудачу |
| Администратор | Видит все заказы, управляет платёжными инцидентами и фоновыми задачами |

---

## Жизненный цикл заказа

```
CREATED ──► PICKING ──► PAYMENT ──► DELIVERY_ASSIGNED ──► OUT_FOR_DELIVERY ──► DELIVERED ──► CLOSED
    │           │            │                                     │
    └───────────└────────────┴──► CANCELLED          DELIVERY_ASSIGNED ◄── (неудача доставки)
```

**Правила переходов:**

- `CREATED → PICKING` — сборщик берёт заказ в работу
- `PICKING → PAYMENT` — сборщик завершил комплектацию
- `PAYMENT → DELIVERY_ASSIGNED` — платёж успешно подтверждён (через webhook ЮKassa)
- `DELIVERY_ASSIGNED → OUT_FOR_DELIVERY` — курьер выехал
- `OUT_FOR_DELIVERY → DELIVERED` — курьер подтвердил вручение
- `OUT_FOR_DELIVERY → DELIVERY_ASSIGNED` — вручение не удалось, повторная попытка
- `DELIVERED → CLOSED` — заказ закрыт
- `CANCELLED` — доступна из `CREATED`, `PICKING` и `PAYMENT`

**Ключевые инварианты:**

- Состав и сумма заказа фиксируются на переходе в `PAYMENT` и далее неизменны
- Списание остатков происходит только в момент `PAYMENT → DELIVERY`
- В состоянии `PAYMENT` может существовать не более одного `PENDING`-платежа
- Если заказ завис в `PAYMENT` дольше 10 минут — автоматическая отмена
- Переход из `PICKING` обратно в `CREATED` запрещён

**Стратегия отсутствия товаров при сборке:**

На заказе хранится поле `absenceStrategy`: `CALL_REPLACE` / `CALL_REMOVE` / `AUTO_REPLACE` / `AUTO_REMOVE`. Корректировка состава разрешена только в состоянии `PICKING`.

---

## Платёжный поток (ЮKassa)

```
POST /api/orders/{id}/pay
        │
        ▼
InitiatePaymentUseCase
  · проверяет остатки
  · создаёт Payment(PENDING)
  · вызывает YookassaGateway → получает confirmationUrl
        │
        ▼ (пользователь оплачивает на стороне ЮKassa)
        │
POST /api/webhooks/yookassa
        │
        ▼
ConfirmPaymentUseCase
  · идемпотентен (повторный webhook безопасен)
  · SUCCESS → списывает остатки → Order переходит в DELIVERY_ASSIGNED
  · FAILED  → Payment закрыт, Order можно оплатить повторно
```

В продакшене входящие IP webhook-уведомлений проверяются по whitelist ЮKassa.

---

## Архитектура

Проект следует **Hexagonal (Ports & Adapters) / Clean Architecture**. Зависимости направлены строго внутрь:

```
app/api  ──►  infrastructure  ──►  application  ──►  domain
(HTTP)         (Prisma, внешние    (use-cases,         (сущности,
               сервисы)            порты)               state machine)
```

```
src/
├── domain/          # Сущности, enum'ы, state machine, domain errors
│                    # Чистый TypeScript — без каких-либо зависимостей
├── application/     # Use-cases + интерфейсы портов (репозитории, gateway)
├── infrastructure/  # Prisma-репозитории, YookassaGateway, MoySkladGateway,
│                    # JoseTokenService, NodemailerEmailGateway
└── app/api/         # Тонкие Next.js route handlers — только инициализация
                     # зависимостей и вызов use-case
```

**Каждый use-case получает зависимости через конструктор** — тестируется изолированно, без HTTP-слоя.

---

## Домен

**Ключевые сущности:**

| Сущность | Описание |
|----------|----------|
| `Order` | Заказ: состояние, состав, суммы, адрес, claim сборщика/курьера |
| `OrderItem` | Снимок товара на момент создания заказа (имя, артикул, цена не меняются) |
| `Payment` | Запись о платеже со статусом `PENDING / SUCCESS / FAILED` |
| `CartItem` | Элемент корзины — не является частью домена заказа |
| `Product` | Товар каталога: цена, остаток, категория |
| `AuditLog` | Иммутабельный лог действий |
| `OutboxEvent` | Событие для асинхронной обработки (паттерн Transactional Outbox) |

**Деньги** хранятся в рублях с двумя знаками (`Decimal(10,2)`). На уровне домена используется `number`.

---

## API

<details>
<summary>Аутентификация</summary>

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/request-code` | Запрос OTP на email |
| POST | `/api/auth/verify-code` | Подтверждение OTP, получение токенов |
| POST | `/api/auth/refresh` | Обновление access-токена |
| GET  | `/api/auth/me` | Текущий пользователь |
| POST | `/api/auth/logout` | Выход |

</details>

<details>
<summary>Корзина</summary>

| Метод | URL | Описание |
|-------|-----|----------|
| GET    | `/api/cart` | Получить корзину |
| POST   | `/api/cart` | Добавить товар |
| PATCH  | `/api/cart/[productId]` | Изменить количество |
| DELETE | `/api/cart/[productId]` | Удалить позицию |
| POST   | `/api/cart/sync` | Слить анонимную корзину с авторизованной |

</details>

<details>
<summary>Заказы (покупатель)</summary>

| Метод | URL | Описание |
|-------|-----|----------|
| GET  | `/api/orders` | История заказов |
| POST | `/api/orders` | Создать заказ из корзины |
| GET  | `/api/orders/[id]` | Детали заказа |
| POST | `/api/orders/[id]/pay` | Инициировать оплату |
| POST | `/api/orders/[id]/cancel` | Отменить заказ |
| POST | `/api/orders/[id]/repeat` | Повторить заказ (перенос в корзину) |

</details>

<details>
<summary>Операционные роли (Picker / Courier / Admin)</summary>

**Picker:**
- `GET /api/picker/orders/available` — доступные заказы для сборки
- `POST /api/picker/orders/[id]/claim` / `release` — взять / отпустить заказ
- `POST /api/orders/[id]/start-picking` — начать сборку
- `PATCH /api/orders/[id]/items` — скорректировать состав
- `POST /api/orders/[id]/complete-picking` — завершить сборку

**Courier:**
- `GET /api/courier/orders/available` — заказы, готовые к доставке
- `POST /api/courier/orders/[id]/claim` / `release` — взять / отпустить
- `POST /api/courier/orders/[id]/start-delivery` — выехал
- `POST /api/courier/orders/[id]/confirm-delivered` — вручено
- `POST /api/courier/orders/[id]/mark-delivery-failed` — не вручено

**Admin:**
- `GET /api/admin/orders` — все заказы
- `GET /api/admin/payments/issues` — проблемные платежи
- `POST /api/admin/payments/[id]/retry` / `mark-failed` — управление платежом
- `GET /api/admin/jobs/[jobName]/status` — статус фоновой задачи
- `POST /api/admin/jobs/[jobName]/run` — ручной запуск задачи

</details>

<details>
<summary>Webhooks и внутренние задачи</summary>

| URL | Описание |
|-----|----------|
| `POST /api/webhooks/yookassa` | Уведомление об оплате от ЮKassa |
| `POST /api/webhooks/moysklad` | Уведомление от МойСклад |
| `POST /api/internal/jobs/payment-timeout` | Авто-отмена просроченных платежей |
| `POST /api/internal/jobs/process-outbox` | Обработка Outbox-событий (экспорт в МойСклад) |
| `POST /api/internal/jobs/sync-products` | Синхронизация каталога из МойСклад |
| `POST /api/cron/payment-timeout` | Cron-обёртка над payment-timeout |

</details>

---

## Интеграции

**ЮKassa** — приём платежей. Создание платёжной сессии, получение webhook, IP-whitelist в продакшене.

**МойСклад** — ERP-интеграция. Синхронизация каталога товаров (остатки, цены), экспорт доставленных заказов. Реализована через Transactional Outbox: при переходе заказа в `CLOSED` создаётся `OutboxEvent`, который фоновая задача передаёт в МойСклад.

---

## Стек

- **Next.js 16** (App Router), **React 19**, **TypeScript** (strict)
- **PostgreSQL** + **Prisma 7** (`@prisma/adapter-pg`)
- **ЮKassa** — платёжный шлюз
- **МойСклад** — ERP
- **Nodemailer** — отправка OTP по email
- **jose** — JWT (HS256)
- **Vitest** — юнит- и интеграционные тесты
