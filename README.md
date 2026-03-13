# Интернет-магазин «КомпанияН»

Бэкенд/API для eGrocery-платформы в рамках ВКР: оформление заказа, сборка, оплата, доставка и операционные роли (picker/courier/admin).

## Стек

- Next.js 16 (App Router), React 19, TypeScript (strict)
- PostgreSQL + Prisma 7 (`@prisma/adapter-pg`)
- ЮKassa (платежи), MoySklad (выгрузка)
- Nodemailer (OTP по email)
- Vitest (unit + route tests)

## Архитектура

Проект следует Hexagonal (Ports & Adapters) / Clean Architecture:

```text
src/
├── domain/          # сущности, enum'ы, state machine, domain errors
├── application/     # use-cases + портовые интерфейсы
│   └── ports/       # контракты репозиториев/шлюзов
├── infrastructure/  # Prisma-репозитории, внешние gateway, db-адаптеры
└── app/api/         # HTTP-слой (тонкие route handlers)
```

Правило зависимостей: `domain <- application <- infrastructure <- app/api`.

## Жизненный цикл заказа

```text
CREATED -> PICKING -> PAYMENT -> DELIVERY -> CLOSED
                 \-> CANCELLED (из CREATED/PICKING/PAYMENT)
```

Ключевые правила:

- переходы валидируются только в `src/domain/order/transitions.ts`
- состав и сумма заказа можно менять только в `PICKING`
- списание stock только в `PAYMENT -> DELIVERY`
- webhook Yookassa и инициирование платежа идемпотентны
- в `PAYMENT` допускается только один `PENDING` платеж
- таймаут оплаты: авто-отмена при зависании в `PAYMENT` > 10 минут

## Платежный поток (Yookassa)

1. `POST /api/orders/[id]/pay` создает `Payment(PENDING)` и `confirmationUrl`.
2. Пользователь оплачивает на стороне ЮKassa.
3. `POST /api/webhooks/yookassa` подтверждает платеж:
   - `SUCCESS` -> перевод заказа в `DELIVERY`
   - `FAILED` -> отмена/неуспех по бизнес-правилам

В продакшене входящий IP webhook проверяется по whitelist.

## API (основные группы)

- Справочники: `/api/products`, `/api/categories`, `/api/order-statuses`, `/api/absence-resolution-strategies`, `/api/user-roles`
- Auth: `/api/auth/register`, `/api/auth/request-code`, `/api/auth/verify-code`, `/api/auth/refresh`, `/api/auth/me`, `/api/auth/logout`
- Cart: `/api/cart`, `/api/cart/[productId]`, `/api/cart/sync`
- Orders: `/api/orders`, `/api/orders/[id]`, `/api/orders/[id]/start-picking`, `/api/orders/[id]/items`, `/api/orders/[id]/complete-picking`, `/api/orders/[id]/pay`, `/api/orders/[id]/cancel`, `/api/orders/[id]/close`, `/api/orders/[id]/repeat`
- Picker: `/api/picker/orders/available`, `/api/picker/orders/me`, `/api/picker/orders/[id]/claim`, `/api/picker/orders/[id]/release`
- Courier: `/api/courier/orders/available`, `/api/courier/orders/me`, `/api/courier/orders/[id]/claim`, `/api/courier/orders/[id]/start-delivery`, `/api/courier/orders/[id]/confirm-delivered`, `/api/courier/orders/[id]/mark-delivery-failed`, `/api/courier/orders/[id]/release`
- Admin: `/api/admin/orders`, `/api/admin/payments/issues`, `/api/admin/payments/[id]/retry`, `/api/admin/payments/[id]/mark-failed`, `/api/admin/jobs/[jobName]/status`, `/api/admin/jobs/[jobName]/run`
- Webhooks: `/api/webhooks/yookassa`, `/api/webhooks/moysklad`
- Internal jobs: `/api/internal/jobs/payment-timeout`, `/api/internal/jobs/process-outbox`, `/api/internal/jobs/sync-products`
- Cron endpoint: `/api/cron/payment-timeout`

## Тестовые страницы

- `/test-order` - жизненный цикл заказа
- `/test-cabinet` - личный кабинет/история заказов
- `/test-picker` - сценарии сборщика
- `/test-courier` - сценарии курьера
- `/test-admin-ops` - админ-операции
- `/test-access-matrix` - матрица прав
- `/test-ops` - операционные сценарии
- `/admin/moysklad` - панель интеграции MoySklad

## Переменные окружения

Минимальный набор для локального запуска:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-min-32-chars
YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
YOOKASSA_RETURN_URL=http://localhost:3000
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
```

Также используются:

```env
OTP_HMAC_SECRET=...
CRON_SECRET=...
INTERNAL_JOB_SECRET=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
MOYSKLAD_TOKEN=...
MOYSKLAD_ORGANIZATION_ID=...
MOYSKLAD_AGENT_ID=...
```

Примечания:

- `OTP_HMAC_SECRET` опционален для dev (есть fallback), но обязателен для production.
- `CRON_SECRET` нужен для `/api/cron/*`.
- `INTERNAL_JOB_SECRET` нужен для `/api/internal/jobs/*`.
- перед первым запуском обязательно выполнить `seed`, чтобы заполнить lookup-таблицы статусов.

## Локальный запуск

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Прочие команды:

```bash
npm run build
npm run start
npm run lint
npm run test
npx vitest run src/path/to/file.spec.ts
```
