# Административный контур (работники компании)

Ниже описан фактический административный контур системы: администраторы, сборщики и курьеры, а также всё, что связано с рабочими процессами персонала. Основано только на существующем коде.

## 1. Роли и доступ

Роли в системе (lookup `UserRole.code`):

- `ADMIN`
- `PICKER`
- `STAFF`
- `COURIER`
- `CUSTOMER`

Доступ к административному контуру определяется в двух местах:

- `src/proxy.ts` — серверный guard для API-роутов.
- `src/lib/auth/guards.tsx` — клиентский guard на уровне страниц.

Правила доступа API в `src/proxy.ts`:

- `ADMIN` — доступ ко всем `/api/admin/*`.
- `PICKER` и `STAFF` — доступ ко всем `/api/picker/*` и legacy-операциям по заказам:
  - `POST /api/orders/:id/start-picking`
  - `POST /api/orders/:id/complete-picking`
  - `POST /api/orders/:id/close`
  - `PATCH /api/orders/:id/items`
- `COURIER` — доступ ко всем `/api/courier/*`.
- `ADMIN` — дополнительно имеет доступ ко всем picker и courier операциям.

Правила клиентских guard’ов:

- `src/app/admin/layout.tsx` использует `useRoleGuard(['ADMIN'])`.
- `ROLE_HOME` в `src/lib/auth/guards.tsx` перенаправляет:
  - `ADMIN -> /admin`
  - `PICKER`/`STAFF -> /picker`
  - `COURIER -> /courier`
  - `CUSTOMER -> /`

## 2. Данные, связанные с персоналом

Поля заказа, связанные с персоналом:

- `Order.pickerClaimUserId`, `Order.pickerClaimedAt` — назначение сборщика.
- `Order.deliveryClaimUserId`, `Order.deliveryClaimedAt` — назначение курьера.
- `Order.outForDeliveryAt`, `Order.deliveredAt` — SLA-таймстемпы доставки.

Аудит действий персонала:

- `AuditLog` хранит:
  - `actorUserId`, `actorRole`
  - `action`, `targetType`, `targetId`
  - `before`, `after`, `reason`
  - `correlationId`, `timestamp`

Задачи администратора:

- `JobRunLog` фиксирует запуск/статус/результаты фоновый задач.

## 3. UI и экраны административного контура

Админ-панель:

- `/admin` — dashboard (KPI по статусам заказов, проблемные платежи, фоновые задачи).
- `/admin/orders` — список заказов с фильтрами.
- `/admin/orders/[id]` — детальная карточка заказа.
- `/admin/payments/issues` — проблемные платежи, возможность retry и mark-failed.
- `/admin/jobs` — управление фоновыми задачами.
- `/admin/users` — экран пользователей (UI-часть).

Рабочие места:

- `/picker` — рабочее место сборщика.
- `/courier` — рабочее место курьера.

Ключевые UI-компоненты административного контура:

- `src/widgets/admin/AdminSidebar` — навигация админ-панели.
- `src/widgets/admin/AdminHeader` — текущий пользователь + logout.
- `src/widgets/admin/AdminOrderDetail` — детальная карточка заказа, кнопки cancel/close, SLA.
- `src/widgets/worker/WorkerPage` — общий список доступных заказов и активного заказа.
- `src/widgets/picker/OrderPickCard` — карточка заказа в очереди сборщика.
- `src/widgets/picker/PickingWorkspace` — рабочее пространство сборщика.
- `src/widgets/courier/OrderDeliveryCard` — карточка заказа в очереди курьера.
- `src/widgets/courier/DeliveryWorkspace` — рабочее пространство курьера.

Степень реализации (факт по коду):

- Все экраны admin/picker/courier подключены к клиентским API.
- Экран `/admin/users` использует `usersApi`, серверные routes для `/api/admin/users` отсутствуют в коде.

## 4. API-роуты административного контура

Админ-роуты:

- `GET /api/admin/orders` — список заказов с фильтрами.
- `GET /api/admin/payments/issues` — проблемные платежи.
- `POST /api/admin/payments/:id/retry` — повторный запуск оплаты.
- `POST /api/admin/payments/:id/mark-failed` — пометка платежа как failed.
- `GET /api/admin/jobs/:jobName/status` — статус фоновой задачи.
- `POST /api/admin/jobs/:jobName/run` — запуск фоновой задачи.

Picker-роуты:

- `GET /api/picker/orders/available` — доступные заказы на сборку.
- `GET /api/picker/orders/me` — текущий заказ сборщика.
- `POST /api/picker/orders/:id/claim` — взять заказ в работу.
- `POST /api/picker/orders/:id/release` — освободить заказ.

Courier-роуты:

- `GET /api/courier/orders/available` — доступные заказы на доставку.
- `GET /api/courier/orders/me` — текущий заказ курьера.
- `POST /api/courier/orders/:id/claim` — взять доставку.
- `POST /api/courier/orders/:id/release` — освободить доставку.
- `POST /api/courier/orders/:id/start-delivery` — начать доставку.
- `POST /api/courier/orders/:id/confirm-delivered` — подтвердить доставку.
- `POST /api/courier/orders/:id/mark-delivery-failed` — отметить срыв доставки.

## 5. Use-case логика административного контура

Picker:

- `PickerListAvailableUseCase` — заказы в статусах `CREATED`/`PICKING` без claim.
- `PickerListMyOrdersUseCase` — заказы, закреплённые за текущим сборщиком.
- `PickerClaimOrderUseCase` — claim заказа, audit log, конфликт -> 409.
- `PickerReleaseOrderUseCase` — release заказа:
  - владелец может снять claim;
  - админ может override, но требуется `reason`;
  - все действия пишутся в `AuditLog`.

Courier:

- `CourierListAvailableUseCase` — заказы в `DELIVERY_ASSIGNED` без claim.
- `CourierListMyOrdersUseCase` — заказы, закреплённые за курьером.
- `CourierClaimOrderUseCase` — claim заказа, audit log.
- `CourierReleaseOrderUseCase` — release заказа:
  - владелец может снять claim;
  - админ может override с `reason`;
  - аудитируется.
- `CourierStartDeliveryUseCase`:
  - переход в `OUT_FOR_DELIVERY`,
  - фиксация `outForDeliveryAt`,
  - outbox event `ORDER_OUT_FOR_DELIVERY`,
  - аудит.
- `CourierConfirmDeliveredUseCase`:
  - `DELIVERED -> CLOSED`,
  - outbox `ORDER_COMPLETED` и `ORDER_DELIVERED`,
  - аудит.
- `CourierMarkDeliveryFailedUseCase`:
  - переход `OUT_FOR_DELIVERY -> DELIVERY_ASSIGNED`,
  - сброс claim,
  - аудит с `reason`.

Admin:

- `AdminListOrdersUseCase` — список заказов с фильтрами и пагинацией.
- `AdminPaymentIssuesUseCase` — список проблемных платежей (stale pending > 5 мин).
- `AdminRetryPaymentUseCase` — повторное создание оплаты в YooKassa, audit log.
- `AdminMarkPaymentFailedUseCase` — перевод `PENDING -> FAILED` с audit log.
- `AdminGetJobStatusUseCase` — последние запуски фоновых задач.
- `AdminRunJobUseCase` — запуск internal job по `INTERNAL_JOB_SECRET`.

Дополнительно:

- Админ интерфейс использует те же order endpoints для cancel/close, что и customer, но доступ к ним ограничен `proxy.ts`.

## 6. Сценарии работы персонала

### Сборщик (picker)

1. Открывает `/picker`.
2. Видит доступные заказы (`GET /api/picker/orders/available`).
3. Берёт заказ в работу (`POST /api/picker/orders/:id/claim`).
4. Переходит к `PickingWorkspace`:
   - стартует сборку (`POST /api/orders/:id/start-picking`);
   - отмечает количество и замены, изменения идут через `PUT /api/orders/:id/items`;
   - завершает сборку (`POST /api/orders/:id/complete-picking`).
5. При необходимости освобождает заказ (`POST /api/picker/orders/:id/release`).

### Курьер (courier)

1. Открывает `/courier`.
2. Видит доступные доставки (`GET /api/courier/orders/available`).
3. Берёт доставку (`POST /api/courier/orders/:id/claim`).
4. Начинает доставку (`POST /api/courier/orders/:id/start-delivery`).
5. Завершает доставку:
   - `POST /api/courier/orders/:id/confirm-delivered`, либо
   - `POST /api/courier/orders/:id/mark-delivery-failed` с причиной.
6. Может освобождать доставку (`POST /api/courier/orders/:id/release`).

### Администратор

1. Открывает `/admin` для обзорных KPI.
2. Управляет заказами через `/admin/orders` и `/admin/orders/[id]`.
3. Работает с проблемными платежами через `/admin/payments/issues`:
   - retry платежа,
   - mark-failed с причиной.
4. Запускает фоновые задачи через `/admin/jobs`:
   - `payment-timeout`
   - `process-outbox`
   - `sync-products`

## 7. Аудит и журналирование

Действия персонала фиксируются в `AuditLog` через `PrismaAuditLogRepository`. Аудит включает:

- claim/release picker и courier (включая override админом).
- отказ в release (forbidden) для не-владельца.
- retry платежей и failed платежи админом.
- действия курьера по доставке и срыву доставки.

## 8. Взаимосвязь с другими подсистемами

Административный контур связан с основными подсистемами следующим образом:

- Заказы и статусные переходы напрямую отражаются на picker/courier workflows.
- Админ может инициировать закрытие и отмену заказа через общие order endpoints.
- Retry payment вызывает YooKassa gateway и порождает новый confirmation URL.
- Фоновые задачи admin запускают outbox processing и синхронизацию ассортимента.
