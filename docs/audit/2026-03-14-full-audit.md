# Полный аудит решения — 14.03.2026

## Контекст

Проект — e-commerce система управления заказами (Next.js 16 + Prisma + PostgreSQL) с гексагональной архитектурой. Система включает полный жизненный цикл заказа, OTP-аутентификацию, интеграции с Yookassa (платежи) и МойСклад (каталог/экспорт), рабочие пространства пикера и курьера. Аудит проводится для оценки готовности решения и выявления дефектов перед защитой ВКР.

---

## 1. КРИТИЧЕСКИЕ ДЕФЕКТЫ (блокирующие)

### 1.1 InitiatePaymentUseCase нарушает контракт идемпотентности
- **Файл:** `src/application/order/InitiatePaymentUseCase.ts`
- **Проблема:** при наличии PENDING-платежа выбрасывает `PaymentAlreadyInProgressError` вместо возврата существующего платежа
- **Контракт CLAUDE.md:** "Both InitiatePaymentUseCase and ConfirmPaymentUseCase are idempotent"
- **Исправление:** вернуть существующий confirmationUrl вместо ошибки

---

## 2. СЕРЬЁЗНЫЕ ДЕФЕКТЫ (высокий приоритет)

### ✅ 2.1 Отсутствие тестов для picker/courier/admin use cases — ИСПРАВЛЕНО
- **Добавлены тесты (56 тестов, 3 файла):**
  - `src/application/picker/__tests__/picker.spec.ts` — 12 тестов (Claim, Release, ListAvailable, ListMy)
  - `src/application/courier/__tests__/courier.spec.ts` — 21 тест (Claim, Release, StartDelivery, ConfirmDelivered, MarkDeliveryFailed, ListAvailable, ListMy)
  - `src/application/admin/__tests__/admin.spec.ts` — 23 теста (ListOrders, PaymentIssues, RetryPayment, MarkPaymentFailed, RunJob, GetJobStatus)
- Покрыты: happy path, идемпотентность, order not found, конфликт прав, admin override, gateway failure, state transitions

### ✅ 2.2 Минимальное покрытие CreateOrderUseCase — ИСПРАВЛЕНО
- **Файл:** `src/application/order/__tests__/CreateOrderUseCase.spec.ts` — 8 тестов (было 1)
- **Добавлены тесты:** пустая корзина, несуществующий продукт, quantity=0, quantity<0, недостаточный остаток, пустой адрес, адрес из пробелов

### 2.3 MoySklad webhook без верификации
- **Файл:** `src/app/api/webhooks/moysklad/route.ts`
- **Проблема:** нет проверки IP-адреса или подписи запроса (в отличие от Yookassa webhook)
- **Действие:** добавить IP whitelist или проверку подписи

---

## 3. СРЕДНИЕ ДЕФЕКТЫ

### 3.1 CourierConfirmDeliveredUseCase — автоматическое закрытие
- **Файл:** `src/application/courier/CourierConfirmDeliveredUseCase.ts`
- **Поведение:** выполняет 2 перехода: OUT_FOR_DELIVERY → DELIVERED → CLOSED
- **Несоответствие:** CLAUDE.md указывает `CloseOrderUseCase` как отдельный для "System/Admin"
- **Оценка:** допустимое дизайн-решение, но требует документирования или пересмотра

### 3.2 CategoryRepository не поддерживает транзакции
- **Файл:** `src/infrastructure/repositories/CategoryRepository.prisma.ts`
- **Проблема:** не принимает `DbClient`, всегда использует глобальный prisma-клиент
- **Влияние:** низкое (категории редко меняются в транзакции)

### 3.3 Отсутствие валидации userId в домене
- **Файл:** `src/domain/order/transitions.ts` → `createOrder()`
- **Проблема:** не проверяет, что userId непустой
- **Смягчение:** JWT-валидация в proxy предотвращает это на уровне HTTP

---

## 4. НИЗКИЕ / КОСМЕТИЧЕСКИЕ

### 4.1 Lookup-маршруты (`/api/order-statuses`, `/api/user-roles`, `/api/absence-resolution-strategies`)
- Публичные и не требуют аутентификации — убедиться, что это intentional

### 4.2 DiskImageStorageGateway — расширение файла
- **Файл:** `src/infrastructure/storage/DiskImageStorageGateway.ts`
- Расширение берётся из оригинального имени — стоит добавить whitelist расширений

### 4.3 node-cron в instrumentation.ts
- **Файл:** `src/instrumentation.ts`
- Три cron-задачи запускаются каждую минуту; дублируют функционал внешних CRON/internal job маршрутов
- Убедиться, что нет двойного выполнения при наличии внешнего планировщика

---

## 5. ПОЗИТИВНЫЕ АСПЕКТЫ (подтверждены аудитом)

- **Гексагональная архитектура** соблюдена: domain ← application ← infrastructure ← HTTP
- **State machine** в домене полная и корректная, все переходы покрыты тестами
- **Транзакционные границы** соблюдены: Serializable isolation, правильное разделение
- **Race condition SUCCESS vs Cancel** корректно обработан
- **Stock deduction** только при PAYMENT → DELIVERY_ASSIGNED
- **Outbox pattern** для MoySklad с FOR UPDATE SKIP LOCKED
- **OTP безопасность**: HMAC-SHA256, счётчик попыток, одноразовое использование
- **Audit logging**: полный trail с actor, action, target, before/after state
- **Decimal precision**: корректная конвертация на границе инфраструктуры
- **Fail-closed secrets**: INTERNAL_JOB_SECRET и CRON_SECRET
- **Proxy.ts**: авторизация полная и корректная (strip spoofed headers, RBAC, JWT verify) — используется новый паттерн Next.js proxy вместо middleware

---

## 6. ПЛАН ДЕЙСТВИЙ ПО ПРИОРИТЕТУ

| # | Задача | Приоритет |
|---|--------|-----------|
| 1 | Исправить идемпотентность InitiatePaymentUseCase | CRITICAL |
| 2 | ~~Тесты для picker use cases (4 шт)~~ | ✅ DONE |
| 3 | ~~Тесты для courier use cases (7 шт)~~ | ✅ DONE |
| 4 | ~~Тесты для admin use cases (6 шт)~~ | ✅ DONE |
| 5 | ~~Тесты ошибочных сценариев CreateOrderUseCase~~ | ✅ DONE |
| 6 | Верификация MoySklad webhook | MEDIUM |
| 7 | Документировать auto-close в CourierConfirmDelivered | LOW |
| 8 | Whitelist расширений для ImageStorage | LOW |

---

## 7. ВЕРИФИКАЦИЯ

После исправлений:
1. `npm run test` — все тесты зелёные
2. `npm run build` — сборка без ошибок
3. `npm run lint` — без предупреждений
4. Ручная проверка: повторный `POST /api/orders/[id]/pay` → возвращает существующий платёж, не ошибку

---

## 8. СТАТИСТИКА ПРОЕКТА

### Покрытие по слоям

| Слой | Файлов | Тестов | Покрытие |
|------|--------|--------|----------|
| Domain (state machine) | 11 | 1 | Полное |
| Application — order (13 use cases) | 13 | 20 | Полное |
| Application — auth (6 use cases) | 6 | 6 | Полное |
| Application — cart (5 use cases) | 5 | 5 | Полное |
| Application — picker (4 use cases) | 4 | 12 | Полное |
| Application — courier (7 use cases) | 7 | 21 | Полное |
| Application — admin (6 use cases) | 6 | 23 | Полное |
| Infrastructure | 16 | 3 | Частичное |
| API routes | 48 | 9 | Частичное |

### Архитектурное соответствие

| Правило | Статус |
|---------|--------|
| Dependency rule (domain ← app ← infra ← HTTP) | ✅ |
| State machine only in domain | ✅ |
| Transaction boundaries | ✅ |
| Outbox for external calls | ✅ |
| Stock deduction timing | ✅ |
| Forbidden states prevention | ✅ |
| Race condition handling | ✅ |
| Composition mutation restriction (PICKING only) | ✅ |
| Idempotent webhooks | ✅ |
| Idempotent payment initiation | ❌ |
| All transitions tested | ✅ |

### Маршруты API (48 endpoints)

- Auth: 6
- Orders: 9
- Picker: 4
- Courier: 7
- Admin: 5 (+ 1 job status)
- Products: 2
- Cart: 3 (+ sync)
- Categories: 1
- Lookup: 3
- Webhooks: 2
- Cron/Jobs: 4
