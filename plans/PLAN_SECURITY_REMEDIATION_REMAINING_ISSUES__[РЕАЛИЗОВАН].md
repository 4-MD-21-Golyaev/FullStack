Status: НЕРЕАЛИЗОВАН
Priority: P0-P2
Почему: В файле смешаны пункты разного приоритета (критичные и средние).
---

# Набор планов для остальных выявленных проблем (P0-P2)

## Summary
Ниже — decision-complete планы в том же формате, что и для проблемы №1: что меняем, как тестируем, какие критерии готовности.
Покрыты проблемы №2–№7 из аудита + незакрытый риск с возвратом после успешной оплаты.

---

## План №2 (P0): Запрет оплаты чужого заказа (`/orders/[id]/pay`)

### Implementation Changes
- В endpoint оплаты добавить проверку ownership/role:
  - `CUSTOMER` может платить только свой заказ.
  - `STAFF/ADMIN` — по продуктовой политике: либо разрешено, либо только просмотр. Рекомендуемый default: только владелец (CUSTOMER) + STAFF/ADMIN разрешено.
- Вынести проверку в переиспользуемый helper `assertOrderAccess(userId, role, order, action='pay')`.
- Возвращать:
  - `401` если нет пользователя,
  - `404` если заказ не найден,
  - `403` если доступ запрещен.

### Test Plan
- `CUSTOMER` + свой order -> `200`.
- `CUSTOMER` + чужой order -> `403`.
- `STAFF/ADMIN` + любой order -> ожидаемое разрешение по принятой политике.
- Регрессия: создание оплаты для своего заказа не сломано.

### Evaluation Criteria
- Нельзя инициировать оплату чужого заказа под `CUSTOMER`.
- Поведение кодов ответа стабильно (`401/403/404` без смешения).
- Все тесты зеленые.

### Assumptions
- По умолчанию оставляем `STAFF/ADMIN` право платить любой заказ (как операционную функцию).

---

## План №3 (P0): Гонка по инварианту “один PENDING payment на заказ”

### Implementation Changes
- Перенести проверку “нет PENDING” внутрь той же транзакции, где создается payment.
- Добавить БД-ограничение:
  - partial unique index на `Payment(orderId)` для записей со статусом `PENDING` (через SQL migration).
- В случае конфликта уникальности возвращать доменную ошибку `PaymentAlreadyInProgressError`.
- Обновить use-case: optimistic retry не нужен; достаточно детерминированного fail с корректной ошибкой.

### Test Plan
- Unit: при существующем pending -> ожидаемая ошибка.
- Concurrency (интеграционный): два параллельных initiate на один order -> один успех, один controlled fail.
- Регрессия: при `FAILED`/`SUCCESS` создание нового `PENDING` не блокируется некорректно.

### Evaluation Criteria
- В БД физически невозможно иметь два `PENDING` на один заказ.
- Параллельные запросы не ломают инвариант.
- Ошибка клиенту предсказуемая, не `500`.

### Assumptions
- Статус хранится через lookup table; index строится на `statusId` для кода `PENDING`.

---

## План №4 (P0): Replay race в refresh token rotation

### Implementation Changes
- Сделать атомарное “consume token”:
  - `UPDATE ... WHERE id = :jti AND revoked = false AND expiresAt > now()`.
  - Успех только если `count == 1`; иначе `InvalidRefreshTokenError`.
- Выполнить ротацию в транзакции:
  - атомарно revoke текущего + create нового refresh record.
- Добавить repository-метод `consumeActive(id, now): boolean`.

### Test Plan
- Два параллельных refresh по одному токену -> только один успешный.
- Revoked/expired токен -> `401`.
- Успешный refresh создает новый refresh token и инвалидирует старый.

### Evaluation Criteria
- Один refresh token невозможно использовать более одного раза.
- Нет окна TOCTOU между `findById` и `revoke`.
- Все auth-тесты проходят.

### Assumptions
- Access token остается stateless JWT, без server-side blacklist.

---

## План №5 (P1): Надежность Yookassa webhook при транзиентных ошибках

### Implementation Changes
- Изменить стратегию ответа webhook:
  - транзиентные/инфраструктурные ошибки -> `5xx` (чтобы провайдер ретраил).
  - необратимые бизнес-ошибки идемпотентной обработки -> `200`.
- Добавить классификацию ошибок (`retryable` vs `non-retryable`).
- Добавить structured logs с `externalId`, `event`, `classification`.
- (Опционально) fallback в локальный inbox/outbox для ручного reprocess.

### Test Plan
- Транзиентная ошибка БД/транзакции -> `500`.
- Повтор webhook после временной ошибки успешно обрабатывается.
- Невалидный/неинтересный event -> `200`.
- Идемпотентный повтор success/cancel -> `200` без дублей.

### Evaluation Criteria
- Событие не теряется из-за разового сбоя.
- Повторы не создают двойной обработки.
- Наблюдаемость достаточна для расследования.

### Assumptions
- Yookassa действительно ретраит на не-2xx.

---

## План №6 (P1): Усиление OTP (brute-force + хранение в plaintext)

### Implementation Changes
- Хешировать OTP (рекомендуется HMAC-SHA256 с server secret + salt/email/context).
- Ввести лимиты:
  - `request-code`: per email + per IP rate limit,
  - `verify-code`: max attempts на окно жизни кода.
- Нормализовать ответы (без user enumeration и утечки деталей).
- TTL и single-use сохранить; после успеха инвалидировать конкурирующие активные OTP для email.

### Test Plan
- Код в БД не равен исходному 6-digit.
- Превышение лимита запроса/проверки -> `429`.
- После успешной верификации повтор с тем же кодом -> fail.
- Неверные коды после лимита блокируются до окончания окна.

### Evaluation Criteria
- Нельзя массово перебирать OTP без ограничений.
- Компрометация БД не раскрывает OTP в открытом виде.
- UX и API статусы предсказуемы.

### Assumptions
- Можно добавить `OTP_SECRET` в окружение и миграцию для полей счетчика попыток/блокировки.

---

## План №7 (P1): Закрыть публичный доступ к `/api/cron/payment-timeout`

### Implementation Changes
- Убрать `/api/cron` из public-префиксов proxy.
- Для cron endpoint ввести auth:
  - либо `CRON_SECRET` в `Authorization: Bearer`,
  - либо унифицировать с `INTERNAL_JOB_SECRET`.
- Fail-closed при отсутствии секрета.
- В route добавить defense-in-depth проверку секрета.

### Test Plan
- Без секрета -> `403` (или `500` при misconfiguration, если так выбрано).
- С верным секретом -> `200`.
- JWT-only пользователь не может вызвать cron.
- Регрессия: cron логика timeout use case не меняется.

### Evaluation Criteria
- Внешний анонимный вызов cron невозможен.
- Нет деградации бизнес-поведения timeout use case.

### Assumptions
- Планировщик может передавать Bearer token.

---

## План №8 (P1): Компенсация/возврат при `payment.succeeded`, но товар недоступен

### Implementation Changes
- Реализовать компенсационный флоу в `ConfirmPaymentUseCase`:
  - при недостатке stock после успешного платежа инициировать refund через gateway,
  - сохранять состояние refund (минимум в логах/событии; лучше отдельная сущность/поле).
- Зафиксировать доменную политику:
  - order -> `CANCELLED`,
  - payment -> `FAILED` (или отдельный статус `REFUNDED`, recommended).
- Добавить retry-механику для refund при временных сбоях.

### Test Plan
- `payment.succeeded` + stock shortage -> refund вызван, order cancelled.
- Сбой refund -> событие уходит в retry/queue, не теряется.
- Повтор webhook после refund не ломает идемпотентность.

### Evaluation Criteria
- Нет сценария “деньги списаны, заказ отменен, возврат не инициирован”.
- Состояния платежа и заказа консистентны и трассируемы.

### Assumptions
- В gateway доступен API возврата; если нет — создается outbox-интеграция для асинхронного refund worker.

---

## Общие критерии приёмки для всего набора
- Добавленные тесты покрывают security + concurrency + idempotency для каждой проблемы.
- `npm run test` полностью зеленый.
- Ошибки авторизации и бизнес-ошибки возвращают стабильные и ожидаемые HTTP-коды.
- Ни один из исходных инвариантов доменной модели не нарушается после исправлений.
