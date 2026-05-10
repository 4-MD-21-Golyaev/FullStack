# Дорожная карта: улучшения рабочего места сборщика

## Контекст

Текущий picker workspace покрывает MVP-механики (4 состояния позиции по ADR-003, claim/release с защитой от гонок, поиск замены), но в нескольких аспектах остаётся «слепым» и хрупким:

- **Очередь FIFO без приоритетов:** сборщик берёт заказы в порядке поступления, не видит сроков доставки и не понимает, какой заказ «горит». `Order.scheduledDate / scheduledTimeSlot` уже хранятся в БД, но не выводятся.
- **Бедная карточка позиции:** на рабочем месте отсутствуют фото, категория, артикул и цена — это замедляет физический поиск товара на полке. При этом `OrderItemDto.imageSrc` уже передаётся бэкендом.
- **Claim не имеет TTL:** сборщик может захватить заказ и уйти со смены — заказ застревает у несуществующего владельца, в очереди он невидим.
- **Сессия теряется при перезагрузке:** состояние позиций (Отсутствует / Заменено) живёт только в client-state. F5 = всё по нулям, замены пропадают.
- **Замены и отсутствие — только UI-состояние:** `MarkItemAbsentUseCase` отсутствует, связь «замена ↔ оригинал» не сохраняется в домене. Сервер видит только финальный плоский список items без семантики.

Цель — поэтапно закрыть эти три направления так, чтобы UX стал предсказуемым в проде, а доменная модель — целостной (важно для главы ВКР об архитектуре).

## Принципы реализации

- Каждый инкремент — самостоятельно поставляемый, проходит `npx tsc --noEmit`, имеет тесты, не ломает существующие сценарии.
- Доменная модель меняется через миграции Prisma + расширение `OrderItem` снапшотами (поля nullable, чтобы старые заказы остались валидны).
- Mixed-задачи (frontend + backend) — параллельные agent-вызовы согласно `.claude/rules/workflow.md` rule 4.
- ADR-003 не отменяется, расширяется новой записью ADR-004 «Server-side picker snapshot» при инкременте 3.

---

## Инкремент 1 — SLA-очередь и видимость информации

**Тип:** Mixed (UI + backend), низкий риск.

### Подзадача 1.1 — Сортировка очереди по сроку доставки (backend)
- В `PickerListAvailableUseCase` (`src/application/picker/PickerListAvailableUseCase.ts`) и репозитории (`OrderRepository.findAvailableForPicking`) добавить `ORDER BY scheduledDate ASC NULLS LAST, createdAt ASC`.
- Тест: два заказа с разной `scheduledDate` возвращаются в правильном порядке; заказ без даты — последним.

### Подзадача 1.2 — Карточка заказа в очереди (UI)
- Файл: `src/widgets/picker/OrderPickCard/OrderPickCard.tsx`
- Добавить:
  - Срок доставки: `scheduledDate` + `scheduledTimeSlot` форматом «Сегодня, 12:00 – 14:00» / «Завтра, …».
  - Бейдж срочности: «Горит» (≤ 1 час до начала слота), «Сегодня», «Завтра», иначе дата. Используем существующий `Badge` из `shared/ui/feedback`.
  - Стратегия отсутствия мини-чипом (CALL_*/AUTO_*).
- Без изменения API карточки сверх существующих полей `OrderDto` (всё уже есть).

### Подзадача 1.3 — Содержательная строка позиции на рабочем месте (UI)
- Файл: `src/widgets/picker/PickingWorkspace/PickingWorkspace.tsx` → `ItemRow`
- Добавить:
  - Фото товара (40×40, скруглённое, через `next/image`) — берём из `item.imageSrc`. Fallback — серый прямоугольник с инициалом.
  - Артикул и цена за единицу мелким шрифтом под названием.
- Никаких новых данных от бэкенда — `OrderItemDto.imageSrc` уже есть.
- CSS — следовать токенам (`--primitive-space-*`, `--primitive-radius-*`, `--ctx-*`), правила в `.claude/rules/ui-components.md`.

### Делегирование
- 1.1 — backend implementation напрямую (мелкое изменение) + Test+Review agent (`.claude/rules/testing.md`).
- 1.2 + 1.3 — параллельно: UI implementation agent + UI review agent (`.claude/rules/ui-components.md`).

---

## Инкремент 2 — Стабильность claim и автосброс «зависших» заказов

**Тип:** Backend-only, средний риск (затрагивает фоновую логику и SLA).

### Подзадача 2.1 — Cron-задача auto-release stale claims
- Новый use case `ReleaseStalePickerClaimsUseCase` в `src/application/picker/`.
- Логика: найти `Order` где `pickerClaimUserId IS NOT NULL AND statusId IN (CREATED, PICKING) AND pickerClaimedAt < NOW() - INTERVAL '30 minutes'` (TTL — константа в `src/domain/order/`).
- Атомарно сбросить: `pickerClaimUserId = NULL`, `pickerClaimedAt = NULL`. Если order был в `PICKING` — откатить в `CREATED` (но это нарушает state-machine; **альтернатива:** оставить в PICKING с занулённым claim — проверить `transitions.ts`).
- API endpoint: `POST /api/cron/release-stale-picker-claims` под `CRON_SECRET` (по аналогии с другими cron в `src/app/api/cron/`).
- Логировать в `JobRunLog` с полем `processed` = число освобождённых заказов.

### Подзадача 2.2 — Heartbeat активности сборщика
- Расширить `OrderRepository.touchPickerActivity(orderId, userId)`: устанавливает `pickerClaimedAt = NOW()` при каждом `UpdateOrderItems` от owner'а заказа.
- Это сдвигает TTL — пока сборщик активно собирает, claim не сбросится.
- Тест: после `updateItems()` поле `pickerClaimedAt` обновлено.

### Подзадача 2.3 — UI-предупреждение об истекающем claim
- Файл: `src/widgets/picker/PickingWorkspace/PickingWorkspace.tsx`
- Если `Date.now() - pickerClaimedAt > 25 минут` — показать ненавязчивый toast «Заказ скоро освободится автоматически. Продолжить работу?» с кнопкой «Я ещё здесь» → дёргает `updateItems` без изменений (touch).
- Использовать существующий `Toast` из `shared/ui/feedback`.

### Делегирование
- 2.1 + 2.2 — backend implementation agent (новый use case + миграция логики) + Test+Review agent.
- 2.3 — UI implementation agent + UI review agent (после готовности 2.1+2.2).

---

## Инкремент 3 — Серверная модель замен и снапшот picker-state

**Тип:** Mixed (domain + infra + API + UI), высокий риск. Самый ёмкий инкремент. Требует ADR-004.

### Подзадача 3.1 — Расширить схему Prisma
Файл: `prisma/schema.prisma`
```prisma
enum PickerItemState {
  UNPROCESSED
  COLLECTED
  ABSENT
  REPLACED
}

model OrderItem {
  // ...existing fields
  pickerState              PickerItemState? // null = pre-picker order (legacy)
  isReplacement            Boolean  @default(false)
  replacementForOrderItemId String?
  replacementFor           OrderItem?  @relation("ItemReplacements", fields: [replacementForOrderItemId], references: [id])
  replacements             OrderItem[] @relation("ItemReplacements")
  pickedAt                 DateTime?
}
```
- Миграция nullable, чтобы исторические заказы не сломались.
- При `CompletePickingUseCase` — финализировать `pickerState` для всех items (UNPROCESSED → ABSENT, если попал в `unprocessedProductIds`).

### Подзадача 3.2 — `MarkItemAbsentUseCase`
- Файл: `src/application/order/MarkItemAbsentUseCase.ts`
- Принимает `(orderId, orderItemId, actorUserId)`.
- Проверки: order в PICKING, actor — owner claim'а.
- Действие: `pickerState = ABSENT`, `quantity` сохраняется (для аналитики «сколько было запрошено»), `pickedAt = NOW()`.
- API: `POST /api/orders/[orderId]/items/[itemId]/mark-absent`.
- Тесты: успех, чужой order (403), неверный state (409).

### Подзадача 3.3 — `AddReplacementUseCase` / `RemoveReplacementUseCase`
- Заменяет client-only Map. Создаёт новый `OrderItem` с `isReplacement = true`, `replacementForOrderItemId = <ABSENT item id>`.
- Стратегия enforce: для AUTO_REMOVE — отказ (409, «replacement_not_allowed_for_strategy»).
- API: `POST /api/orders/[orderId]/items/[itemId]/replacements`, `DELETE /api/orders/[orderId]/items/[itemId]/replacements/[replacementItemId]`.
- Тесты: добавление, удаление, повторное добавление, AUTO_REMOVE → 403.

### Подзадача 3.4 — Восстановление сессии в UI
- Файл: `src/widgets/picker/PickingWorkspace/PickingWorkspace.tsx`
- Заменить инициализацию `localItems` из server snapshot: `pickerState`, `replacements` берутся из `order.items[].pickerState` и `order.items[].replacements`.
- Удалить `Map<productId, replacedByProductId>` — теперь это серверный граф.
- `handleQtyChange` / `handleMarkAbsent` / `handleSelectReplacement` дёргают новые API endpoints вместо `updateItems` с финальным списком.
- Debounce сохраняется только для qty (для batch'инга).

### Подзадача 3.5 — ADR-004
- Файл: `docs/decisions/ADR-004-server-side-picker-snapshot.md`
- Зафиксировать: что меняется относительно ADR-003, почему перешли на серверный граф, как мигрируют исторические данные, что изменилось в UpdateOrderItemsUseCase.

### Делегирование
- 3.1 + 3.2 + 3.3 — backend implementation agent (домен + инфра + API + миграция) + Test+Review agent.
- 3.4 — UI implementation agent + UI review agent (после готовности backend).
- 3.5 — пишем напрямую (документация без кода), ревью не требуется.

---

## Критические файлы

| Слой | Путь | Что меняется |
|---|---|---|
| Schema | `prisma/schema.prisma` | OrderItem: pickerState, isReplacement, replacementFor, pickedAt (инкремент 3) |
| Domain | `src/domain/order/transitions.ts` | проверка совместимости claim-release с PICKING (инкремент 2) |
| Domain | `src/domain/order/PickerItemState.ts` | новый enum (инкремент 3) |
| Application | `src/application/picker/PickerListAvailableUseCase.ts` | сортировка по SLA (1.1) |
| Application | `src/application/picker/ReleaseStalePickerClaimsUseCase.ts` | новый (2.1) |
| Application | `src/application/order/MarkItemAbsentUseCase.ts` | новый (3.2) |
| Application | `src/application/order/AddReplacementUseCase.ts` / `RemoveReplacementUseCase.ts` | новые (3.3) |
| Application | `src/application/order/UpdateOrderItemsUseCase.ts` | touch `pickerClaimedAt` (2.2); финализация state (3.1) |
| Infra | `src/infrastructure/repositories/OrderRepository.prisma.ts` | findAvailableForPicking ORDER BY (1.1); touchPickerActivity (2.2); replacements relation (3.x) |
| API | `src/app/api/cron/release-stale-picker-claims/route.ts` | новый (2.1) |
| API | `src/app/api/orders/[id]/items/[itemId]/mark-absent/route.ts` | новый (3.2) |
| API | `src/app/api/orders/[id]/items/[itemId]/replacements/route.ts` + `[replacementItemId]/route.ts` | новые (3.3) |
| UI | `src/widgets/picker/OrderPickCard/OrderPickCard.tsx` | срок + бейдж + стратегия (1.2) |
| UI | `src/widgets/picker/PickingWorkspace/PickingWorkspace.tsx` | фото/артикул/цена (1.3); claim-toast (2.3); серверный snapshot (3.4) |
| Lib | `src/lib/api/orders.ts` / `src/lib/api/picker.ts` | методы markAbsent / addReplacement / removeReplacement / heartbeat (3.x, 2.3) |
| Docs | `docs/decisions/ADR-004-server-side-picker-snapshot.md` | новый ADR (3.5) |

## Что переиспользуем

- `Badge` из `src/shared/ui/feedback/Badge` — для бейджей срочности и стратегии (1.2).
- `Toast` и `useToast` (если есть) из `src/shared/ui/feedback` — для предупреждения о claim (2.3).
- `ConfirmDialog` — без изменений.
- `Counter` — без изменений (3.4 продолжит использовать).
- `next/image` — для фото товара (1.3).
- `JobRunLog` модель и cron-pattern из существующих `src/app/api/cron/*` (2.1).
- `OutboxEvent` — не трогаем, MoySklad-интеграция остаётся неизменной (`ORDER_PICKED` создаётся в `CompletePickingUseCase`).

## Верификация

### Инкремент 1
1. `npx vitest run src/application/picker/__tests__` — порядок заказов в `PickerListAvailableUseCase`.
2. `npm run dev`, зайти под picker, увидеть заказы отсортированными по `scheduledDate`. На карточке — бейдж срочности и стратегия.
3. Открыть рабочее место — у каждой позиции фото (или fallback), артикул, цена.
4. `npx tsc --noEmit` без ошибок.

### Инкремент 2
1. `npx vitest run src/application/picker/__tests__/ReleaseStalePickerClaimsUseCase.spec.ts` — сценарии: stale → released, fresh → ignored, completed → ignored.
2. Ручной тест: захватить заказ, вручную проставить `pickerClaimedAt = NOW() - 31 minutes` через `npx prisma studio`, дёрнуть `POST /api/cron/release-stale-picker-claims` с `CRON_SECRET` — заказ освобождён.
3. Запустить `updateItems()`, проверить что `pickerClaimedAt` обновился.
4. UI: дождаться 25 минут (или замокать `Date.now`) — увидеть toast.

### Инкремент 3
1. `npx prisma migrate dev` — миграция применилась без потери данных. Проверить старый завершённый заказ — отображается корректно.
2. `npx vitest run src/application/order/__tests__/MarkItemAbsentUseCase.spec.ts`, `AddReplacementUseCase.spec.ts`, `RemoveReplacementUseCase.spec.ts` — все сценарии (success, forbidden, conflict).
3. Ручной end-to-end: начать сборку, отметить позицию отсутствующей, добавить замену, перезагрузить страницу (F5) — состояние Отсутствует/Заменено восстановилось из БД.
4. AUTO_REMOVE заказ — попытка добавить замену через API возвращает 403.
5. `npx tsc --noEmit` без ошибок; `npm run lint` без новых ошибок.

## Что НЕ входит в эту дорожную карту

(сознательно отложено, чтобы не раздувать scope — можно вернуться отдельным циклом)

- Метрики смены сборщика (PickerSession, виджет «собрано за смену») — отдельная инициатива.
- Поиск/фильтры в очереди (по стратегии, по сумме) — UX-полировка, не блокирует основные сценарии.
- Звуковой/push-алерт о новом заказе.
- Bulk-действия и hotkeys.
- Частичное отсутствие (нашёл 3 из 5).
- Возврат адреса доставки на рабочее место (намеренно убран в коммите `ab9ac54` — без указания пользователя не трогаем).
