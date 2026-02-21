# Интернет-магазин «КомпанияН»

**Автор:** Голяев Игнатий

Выпускная квалификационная работа по проектированию и разработке веб-системы онлайн-продаж продуктовой розничной сети.

---

## Демо

Демостенд доступен по адресу: https://blackfly-causeless-camie.ngrok-free.dev

> Для получения доступа предварительно свяжитесь в Telegram: [@likekushka](https://t.me/likekushka)

### Тестовые страницы

| Страница | URL | Описание |
|---|---|---|
| Жизненный цикл заказа | [/test-order](/test-order) | Каталог, корзина, оформление и прохождение заказа по всем статусам |
| Личный кабинет | [/test-cabinet](/test-cabinet) | История заказов, детальный просмотр, повтор и отмена заказа |

---

## Дизайн

Макет интерфейса доступен в Figma: [ВКР — Figma](https://www.figma.com/design/TcdOTCNzWomMEaytw9T4sm/%D0%92%D0%9A%D0%A0?node-id=1-6&t=y6X8jl4kgPGdnPWo-1)

---

## Назначение

Реализация устойчивой eGrocery-платформы с поддержкой полного сценария покупки: от формирования заказа до подтверждения доставки. Система интегрируется с внешним платёжным шлюзом ЮKassa и включает строгое управление жизненным циклом заказа.

---

## Архитектура

Проект следует **гексагональной (Ports & Adapters) / Clean Architecture**.

```
src/
├── domain/          # Сущности, перечисления, конечный автомат состояний, доменные ошибки
├── application/     # Use cases + порты (интерфейсы репозиториев и шлюзов)
│   └── ports/       # Абстракции, которые реализует инфраструктура
├── infrastructure/  # Реализации: Prisma-репозитории, платёжный шлюз ЮKassa
└── app/api/         # Next.js App Router — тонкие HTTP-обработчики
```

**Правило зависимостей:** domain ← application ← infrastructure ← HTTP. Внутренние слои не импортируют внешние.

---

## Жизненный цикл заказа

```
CREATED → PICKING → PAYMENT → DELIVERY → CLOSED
                 ↘ CANCELLED (из CREATED, PICKING или PAYMENT)
```

| Use case | Переход |
|---|---|
| `StartPickingUseCase` | CREATED → PICKING |
| `CompletePickingUseCase` | PICKING → PAYMENT |
| `InitiatePaymentUseCase` | создаёт платёж ЮKassa, заказ остаётся в PAYMENT |
| `ConfirmPaymentUseCase` | PAYMENT → DELIVERY (или CANCELLED при неудаче) |
| `CloseOrderUseCase` | DELIVERY → CLOSED |
| `CancelOrderUseCase` | CREATED / PICKING / PAYMENT → CANCELLED |
| `UpdateOrderItemsUseCase` | изменение состава заказа в PICKING |
| `PaymentTimeoutUseCase` | автоотмена при нахождении в PAYMENT > 10 минут |

Переходы реализованы через конечный автомат в `src/domain/order/transitions.ts`. Недопустимый переход выбрасывает `InvalidOrderStateError`. Состав заказа фиксируется при переходе в PAYMENT и не может быть изменён после.

---

## Ключевые особенности реализации

- **Транзакционные границы** — `ConfirmPaymentUseCase`, `CancelOrderUseCase`, `CreateOrderUseCase` выполняются в `prisma.$transaction` с блокировкой строк (`SELECT FOR UPDATE`), что предотвращает гонки при параллельных запросах.
- **Идемпотентность вебхука** — повторный вызов `ConfirmPaymentUseCase` с уже обработанным платежом безопасно игнорируется.
- **Единственный PENDING-платёж** — `InitiatePaymentUseCase` проверяет отсутствие существующего PENDING-платежа перед созданием нового.
- **Стратегия отсутствия товара** — поле `absenceResolutionStrategy` на заказе (`CALL_REPLACE | CALL_REMOVE | AUTO_REMOVE | AUTO_REPLACE`) определяет поведение при нехватке товара во время сборки.
- **Списание остатков** — только при переходе PAYMENT → DELIVERY, после повторной проверки наличия.
- **Таймаут оплаты** — фоновый cron-job (`node-cron`) автоматически отменяет заказы, задержавшиеся в PAYMENT более 10 минут.

---

## API

| Метод | URL | Описание |
|---|---|---|
| `POST` | `/api/orders` | Создать заказ |
| `POST` | `/api/orders/[id]/start-picking` | Начать сборку |
| `PATCH` | `/api/orders/[id]/items` | Изменить состав в PICKING |
| `POST` | `/api/orders/[id]/complete-picking` | Завершить сборку |
| `POST` | `/api/orders/[id]/pay` | Инициировать оплату (ЮKassa) |
| `POST` | `/api/orders/[id]/cancel` | Отменить заказ |
| `POST` | `/api/orders/[id]/close` | Закрыть заказ |
| `POST` | `/api/webhooks/yookassa` | Вебхук подтверждения оплаты |
| `GET` | `/api/products` | Список товаров |
| `GET` | `/api/products/[id]` | Товар по ID |
| `GET` | `/api/categories` | Список категорий |

---

## Технологии

- **Next.js 16** (App Router, гибридный рендеринг)
- **React 19**, **TypeScript** (strict mode)
- **PostgreSQL** — хранилище данных
- **Prisma 7** (`@prisma/adapter-pg`) — ORM и миграции
- **ЮKassa** — платёжный шлюз
- **node-cron** — фоновые задачи (таймаут оплаты)
- **Vitest** — юнит-тесты

---

## Локальный запуск

### Переменные окружения

```env
DATABASE_URL=postgresql://...
YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
YOOKASSA_RETURN_URL=http://localhost:3000
```

### Команды

```bash
npm install

npx prisma migrate dev   # Применить миграции
npx prisma db seed       # Заполнить справочники статусов (обязательно перед запуском)

npm run dev              # Запустить dev-сервер (localhost:3000)
npm run build            # Сборка для продакшена
npm run test             # Запустить все тесты
npm run lint             # Проверка линтером
```
