# PLAN: Frontend Admin Panel — Admin + Picker + Courier

## Статус: К реализации

---

## Контекст

Backend полностью реализован. Существует три ролевых контура:
- **ADMIN** — мониторинг, управление платежами, джобы, аудит
- **PICKER** — рабочее место сборщика заказов
- **COURIER** — рабочее место курьера

Цель: разработать единое Next.js-приложение с role-based routing, покрывающее все три роли.

---

## Изоляция от клиентского frontend

### Принцип

Admin/Picker/Courier frontend **полностью изолирован от клиентского frontend** на уровне страниц, layouts и domain-специфичных компонентов. В будущем планируется миграция стилей и компонентов из клиентского frontend.

### Граница изоляции

Изоляция проводится по **двум уровням**, а не по всем компонентам целиком:

```
src/components/
├── ui/              ← SHARED primitives — шарятся со дня 1
│   │                  (Button, Input, Badge, Modal, Toast, Skeleton)
│   │                  Это атомы без бизнес-логики — дублировать их нецелесообразно
│   └── ...
│
├── admin/           ← ISOLATED — только для admin-контура
│   └── (DataTable, FilterBar, StatCard, JobCard, AuditEntry, ...)
│
├── picker/          ← ISOLATED — только для picker-контура
│   └── (PickingWorkspace, PickingItemRow, OrderPickCard, ...)
│
├── courier/         ← ISOLATED — только для courier-контура
│   └── (DeliveryWorkspace, OrderDeliveryCard, SlaTimer, ...)
│
└── customer/        ← FUTURE — появится при разработке клиентского frontend
    └── (ProductCard, CartItem, CheckoutForm, ...)
```

**Layouts полностью изолированы:** `AdminLayout`, `WorkerLayout` и будущий `CustomerLayout` не имеют общих обёрток.

**Pages полностью изолированы:** `/admin/*`, `/picker/*`, `/courier/*` — отдельные деревья маршрутов.

### Почему именно так

| Вариант | Проблема |
|---|---|
| Полная изоляция (включая Button/Input) | Двойная поддержка примитивов; расхождение дизайна между панелями |
| Полное смешивание | Изменение customer UI ломает admin; разные UX-парадигмы конфликтуют |
| **Изоляция на уровне приложения, шаринг примитивов** | Оптимально: независимые layouts/pages, единые атомы |

### Стратегия при появлении клиентского frontend

1. Клиентские компоненты создаются в `src/components/customer/` — изолированно.
2. Если компонент нужен обоим контурам (например `OrderStatusBadge`) — он переносится в `src/components/ui/`.
3. Стили (CSS custom properties из `primitive.css` / `context.css`) уже общие — миграция не требуется.
4. "Мигрировать стили потом" **не применяется к примитивам** — они общие с первого дня, чтобы избежать ситуации, когда "потом" превращается в "никогда".

---

## Архитектура: единое приложение, три контура

```
src/app/
├── (auth)/
│   └── login/                 ← единый вход, редирект по роли
│
├── admin/                     ← ADMIN role
│   ├── layout.tsx
│   ├── page.tsx               ← dashboard
│   ├── orders/
│   ├── payments/
│   ├── users/
│   ├── catalog/
│   ├── jobs/
│   └── audit/
│
├── picker/                    ← PICKER role
│   ├── layout.tsx
│   └── page.tsx               ← единственный экран рабочего места
│
└── courier/                   ← COURIER role
    ├── layout.tsx
    └── page.tsx               ← единственный экран рабочего места
```

**После логина** — редирект по роли:
- `ADMIN` → `/admin`
- `PICKER` → `/picker`
- `COURIER` → `/courier`
- `CUSTOMER` → (вне этого плана)

---

## Модули по ролям

---

### Роль: PICKER — Рабочее место сборщика

Picker работает с одним заказом за раз. Интерфейс — пошаговое рабочее место, не таблица.

**Состояния рабочего места:**

```
[Нет активного заказа]
    → список доступных CREATED заказов
    → кнопка "Взять в работу" (claim)

[Заказ взят, ещё не начат]
    → карточка заказа с кнопкой "Начать сборку"

[Идёт сборка (PICKING)]
    → чеклист позиций заказа
    → стратегия отсутствия (CALL_REPLACE / AUTO_REMOVE / ...)
    → изменение состава (UpdateOrderItems)
    → "Завершить сборку" → PAYMENT

[Заказ завершён → PAYMENT]
    → подтверждение, освобождение интерфейса
```

**Экраны и API:**

| Экран | Что показывает | API |
|---|---|---|
| Available Orders | Список CREATED заказов: ID, адрес, кол-во позиций, сумма | `GET /api/picker/orders/available` |
| My Active Order | Текущий взятый заказ | `GET /api/picker/orders/me` |
| Picking Workspace | Чеклист позиций + редактирование | `GET /api/orders/[id]` + `PUT /api/orders/[id]/items` |

**Действия пользователя:**
- Claim → `POST /api/picker/orders/[id]/claim`
- Начать сборку → `POST /api/orders/[id]/start-picking`
- Изменить позицию → `PUT /api/orders/[id]/items`
- Завершить сборку → `POST /api/orders/[id]/complete-picking`
- Освободить → `POST /api/picker/orders/[id]/release`

**UX-специфика:** mobile-first, большие touch-targets, live пересчёт суммы при изменениях, absence strategy выбирается прямо в карточке позиции.

---

### Роль: COURIER — Рабочее место курьера

Courier работает с одним заказом за раз. Акцент на SLA-таймерах и статусах.

**Состояния рабочего места:**

```
[Нет активного заказа]
    → список доступных DELIVERY_ASSIGNED заказов
    → кнопка "Взять в доставку" (claim)

[Заказ взят, DELIVERY_ASSIGNED]
    → адрес доставки, контакт клиента
    → таймер SLA (30 мин до начала доставки)
    → кнопка "Начать доставку" → OUT_FOR_DELIVERY

[В пути, OUT_FOR_DELIVERY]
    → адрес, таймер SLA (1 час en-route)
    → "Доставлено" → DELIVERED
    → "Не удалось доставить" + причина → DELIVERY_ASSIGNED (retry)

[Доставлено]
    → подтверждение, освобождение
```

**Экраны и API:**

| Экран | Что показывает | API |
|---|---|---|
| Available Orders | DELIVERY_ASSIGNED заказы: адрес, сумма, время назначения | `GET /api/courier/orders/available` |
| My Active Order | Текущий заказ с SLA | `GET /api/courier/orders/me` |
| Delivery Workspace | Адрес, контакт, SLA-таймер, действия | `GET /api/orders/[id]` |

**Действия пользователя:**
- Claim → `POST /api/courier/orders/[id]/claim`
- Начать доставку → `POST /api/courier/orders/[id]/start-delivery`
- Подтвердить доставку → `POST /api/courier/orders/[id]/confirm-delivered`
- Не удалось доставить → `POST /api/courier/orders/[id]/mark-delivery-failed`
- Освободить → `POST /api/courier/orders/[id]/release`

**UX-специфика:** SLA-таймер меняет цвет (зелёный → жёлтый → красный), адрес кликабелен (открывает карту), кнопка "Не удалось" требует обязательного комментария.

---

### Роль: ADMIN — Панель управления

**Экраны:**

| Экран | Функции | Backend |
|---|---|---|
| Dashboard | KPI cards, orders by state chart, payment issues widget, jobs strip | Существующие endpoints (см. примечание) |
| Orders List | Таблица + FilterBar (status multi, date range, search) + пагинация | `GET /api/admin/orders` |
| Order Detail | State Timeline, items, payment card, picker/courier info, Cancel/Close | `GET /api/orders/[id]` |
| Payment Issues | Auto-refresh (30s), retry / mark-failed с причиной | `GET /api/admin/payments/issues` |
| Users | Список + detail с историей заказов | ⚠️ **Требует новых backend endpoints** |
| Catalog / Products | Список + sync trigger | `GET /api/internal/jobs/sync-products` |
| Catalog / Categories | Tree | ⚠️ **Требует нового backend endpoint** |
| Jobs | Карточки 3 jobs + Run Now + последний статус | `GET/POST /api/admin/jobs/[jobName]/*` |
| Audit Log | Timeline с expandable JSON diff | ⚠️ **Требует нового backend endpoint** |

> **Примечание по Dashboard KPI:**
> - *Реализуемо без новых endpoints:* количество заказов по каждому статусу (параллельные запросы `GET /api/admin/orders?status=X&limit=1` → поле `total`), orders today (с фильтром `dateFrom`/`dateTo`), payment issues count, jobs status strip.
> - *Недостижимо без новых endpoints:* active pickers count, active couriers count, SLA violations count. Эти KPI-карточки исключаются из реализации или заменяются на достижимые метрики.

**Admin видит picker/courier активность (в Order Detail):**
- Кто сейчас собирает заказ (pickerClaimUserId) — данные есть в `GET /api/orders/[id]`
- Кто везёт заказ, SLA-таймер (deliveryClaimUserId, outForDeliveryAt) — данные есть в `GET /api/orders/[id]`

---

## Структура навигации

### Admin Sidebar
```
📊 Dashboard
📦 Заказы          /admin/orders
💳 Платежи         /admin/payments/issues   [badge: N]
👥 Пользователи    /admin/users
🛍️ Каталог         /admin/catalog/products
⚙️ Задачи          /admin/jobs
📋 Аудит           /admin/audit
```

### Picker / Courier Layout
```
[Логотип]  [Имя]  [Выйти]
───────────────────────────
[Рабочее место — одна страница]
```

---

## Карта экранов

```
/login
 └── OTP form → редирект по роли

── ADMIN ──────────────────────────────────────────────

/admin
 ├── KPI: orders today | pending payments | SLA violations | active pickers | active couriers
 ├── Orders by state bar chart
 ├── Payment Issues top-5 widget
 └── Jobs status strip

/admin/orders
 ├── FilterBar: status (multi), dateFrom/To, search
 ├── DataTable: id | user | status | total | created | time-in-state | picker | courier
 └── Pagination

/admin/orders/[id]
 ├── Header: id, status badge, actions (Cancel / Close)
 ├── State Timeline stepper
 ├── Items table
 ├── Payment card: amount, status, externalId, age
 ├── Picker card: кто, когда взял
 ├── Courier card: кто, SLA таймер, outForDeliveryAt, deliveredAt
 └── Link → Audit log по этому заказу

/admin/payments/issues
 ├── Auto-refresh badge (30s)
 ├── Table: orderId | amount | created | age
 └── Actions per row: [Retry] [Mark Failed + reason textarea]

/admin/users
 └── Table: email | phone | role | createdAt

/admin/users/[id]
 ├── Profile card
 └── Orders history table

/admin/catalog/products
 ├── Search + category filter
 ├── Table: article | name | price | stock | active
 └── Sync button → toast с результатом

/admin/catalog/categories
 └── Tree с expand/collapse

/admin/jobs
 └── Cards: payment-timeout | process-outbox | sync-products
     каждая: last run | status | processed | failed | duration | [Run Now]

/admin/audit
 ├── Filters: actor, action type, date range
 └── Timeline: time | actor | action | target | expandable JSON diff

── PICKER ─────────────────────────────────────────────

/picker
 ├── [STATE: нет заказа]
 │   └── Available list: id | кол-во позиций | сумма | адрес → [Взять в работу]
 ├── [STATE: взят, не начат]
 │   └── Order card + [Начать сборку] + [Освободить]
 └── [STATE: идёт сборка]
     ├── Order header: id, total (live)
     ├── Items checklist: фото | name | article | qty spinner | absence action
     └── [Завершить сборку] (активна когда все позиции обработаны)

── COURIER ────────────────────────────────────────────

/courier
 ├── [STATE: нет заказа]
 │   └── Available list: id | адрес | сумма | assigned ago → [Взять в доставку]
 ├── [STATE: взят, DELIVERY_ASSIGNED]
 │   ├── Address card
 │   ├── SLA timer (30 мин, зелёный/жёлтый/красный)
 │   ├── [Начать доставку]
 │   └── [Освободить]
 └── [STATE: в пути, OUT_FOR_DELIVERY]
     ├── Address card
     ├── SLA timer en-route (1 час)
     ├── [Доставлено ✓]
     └── [Не удалось → textarea причина → подтвердить]
```

---

## Дизайн-система

### Компонентная иерархия

```
Atoms:
  OrderStatusBadge(state)
  PaymentStatusBadge(status)
  SlaTimer(from, limitSeconds, state)  — live countdown
  Button(variant, loading, size)
  Spinner / Skeleton

Molecules:
  ConfirmDialog(title, description, onConfirm)
  ToastProvider
  EmptyState(icon, title, action?)
  SearchInput (debounced 300ms)
  DateRangePicker
  StatusFilter (multi-select checkboxes)

Admin Organisms:
  DataTable(columns, data, pagination, loading)
  FilterBar(config)
  StatCard(label, value, icon, delta?)
  JobCard(job)
  AuditEntry(log)

Picker Organisms:
  OrderPickCard(order)
  PickingItemRow(item, onChange)
  PickingWorkspace(order)

Courier Organisms:
  OrderDeliveryCard(order)
  DeliveryWorkspace(order)
```

### Палитра статусов заказа
```
CREATED           → #0070f3
PICKING           → #e07b00
PAYMENT           → #7b3fbf
DELIVERY_ASSIGNED → #0a9e5c
OUT_FOR_DELIVERY  → #0a7e50
DELIVERED         → #555
CLOSED            → #444
CANCELLED         → #c00
```

### Технологический стек
```
Next.js 16 App Router + TypeScript strict
CSS Modules          — единственный механизм стилизации
TanStack Query       — server state, кэш, polling
React Hook Form + Zod — формы + валидация
Recharts             — charts (admin dashboard)
date-fns             — SLA calculations
lucide-react         — иконки
```

> Компонентная архитектура (Tokens → Primitives → Layer Components) и правила CSS Modules
> зафиксированы в `plans/SPEC_FRONTEND_ARCHITECTURE.md`

---

## Roadmap разработки

### Этап 1 — Фундамент (2 дня)
- Установка: TanStack Query, React Hook Form, Zod, Recharts, lucide-react
- `src/lib/api/` — типизированный API-клиент под каждый endpoint
- Login page + OTP flow + JWT хранение + role-based redirect
- Route guards: `withAdminGuard`, `withPickerGuard`, `withCourierGuard`
- `AdminLayout`, `WorkerLayout`

### Этап 2 — Layout и навигация (1 день)
- `AdminSidebar` с иконками, active-state, payment-issues badge
- `AdminHeader` (user info, logout)
- `WorkerLayout` (простой header)
- Responsive sidebar collapse

### Этап 3 — Shared-компоненты (2 дня)
- `DataTable` (sorting, skeleton, empty state)
- `FilterBar`, `OrderStatusBadge`, `PaymentStatusBadge`
- `SlaTimer` (live countdown, 3 цвета)
- `ConfirmDialog`, `ToastProvider`, `StatCard`

### Этап 4 — Admin-модули (3-4 дня)
- Orders: List + Detail с State Timeline
- Payment Issues: polling dashboard + actions
- Jobs Dashboard
- Users: List + Detail
- Catalog: Products + Categories + sync
- Audit Log

### Этап 5 — Picker рабочее место (1-2 дня)
- Picker: available → claim → start → checklist → complete

### Этап 6 — Courier рабочее место (1-2 дня)
- Courier: available → claim → start → SLA timer → confirm/fail

### Этап 7 — Dashboard Admin (1-2 дня)
- KPI cards (реализуемые без новых endpoints), bar chart, payment issues widget, jobs strip

### Этап 8 — UX-оптимизация (1-2 дня)
- Optimistic updates
- Auto-refresh: Payment Issues (30s), Available orders (15s)
- Mobile-first доработка Picker / Courier
- Error boundaries по модулям

---

## MVP по ролям

### Admin MVP
| Экран | Функции |
|---|---|
| Orders List | Таблица + фильтр по статусу + поиск |
| Order Detail | Состав, статус, оплата, picker/courier info, Cancel/Close |
| Payment Issues | Список + Retry + Mark Failed |
| Jobs | 3 карточки + Run Now |
| Layout | Sidebar, header, logout |

> **Вне MVP (требуют новых backend endpoints):** Users, Catalog/Categories, Audit Log. Реализуются только после добавления соответствующих API routes.

### Picker MVP
| Экран | Функции |
|---|---|
| Workspace | Available list → Claim → Start → Checklist → Complete |

### Courier MVP
| Экран | Функции |
|---|---|
| Workspace | Available list → Claim → Start → SLA Timer → Confirm/Fail |

---

## Критерии реализации для AI-агента

> Этот раздел формализует требования так, чтобы AI-агент мог реализовать каждый шаг автономно и верифицировать результат.

---

### Общие правила (применяются ко всем этапам)

1. **Не изменять backend.** Никаких правок в `src/domain`, `src/application`, `src/infrastructure`, `src/app/api`. Только добавление файлов в `src/app/(auth)`, `src/app/admin`, `src/app/picker`, `src/app/courier`, `src/lib`, `src/components`.

2. **Типизация строгая.** Все компоненты, хуки и API-функции — TypeScript strict. Запрещено использование `any`. Типы для API-ответов выводить из доменных интерфейсов в `src/domain`.

3. **Зависимость только вниз.** Компоненты импортируют из `src/lib/api`, `src/components`, `src/lib/utils`. Никаких импортов из `src/infrastructure` или `src/application` в frontend-коде.

4. **Один источник истины для статусов.** Цвета и лейблы статусов заказа — только из одного файла `src/lib/order-status-config.ts`. Нигде больше хардкод цветов не допускается.

5. **Запросы только через TanStack Query.** Прямые вызовы `fetch` в компонентах запрещены. Каждый endpoint имеет свою query/mutation function в `src/lib/api/`.

6. **Формы через React Hook Form + Zod.** Все формы (mark-failed reason, absence strategy) используют `useForm` + `zodResolver`. Нет неконтролируемых инпутов.

7. **Деструктивные действия требуют `ConfirmDialog`.** Cancel order, Mark Failed — всегда через диалог подтверждения.

---

### Критерии этапа 1 — Фундамент

**Реализовано, когда:**
- [ ] `GET /api/auth/me` вызывается при загрузке и результат кешируется в TanStack Query
- [ ] Неавторизованный пользователь на `/admin/*`, `/picker/*`, `/courier/*` редиректится на `/login`
- [ ] Авторизованный пользователь с ролью PICKER на `/admin` редиректится на `/picker`
- [ ] После логина через OTP токен сохраняется в `localStorage` или `httpOnly cookie` (cookie предпочтительно)
- [ ] `src/lib/api/index.ts` экспортирует типизированные функции для всех используемых endpoint'ов
- [ ] Logout очищает токен и редиректит на `/login`

**Файлы, которые должны появиться:**
```
src/lib/api/auth.ts
src/lib/api/orders.ts
src/lib/api/payments.ts
src/lib/api/jobs.ts
src/lib/api/users.ts
src/lib/api/products.ts
src/lib/api/picker.ts
src/lib/api/courier.ts
src/lib/auth/guards.tsx        — HOC или middleware для route guards
src/app/(auth)/login/page.tsx
```

---

### Критерии этапа 2 — Layout

**Реализовано, когда:**
- [ ] `AdminLayout` рендерит sidebar + header + `{children}`
- [ ] Активный пункт sidebar подсвечен на основе текущего `pathname`
- [ ] Badge на "Платежи" показывает количество issues (запрос `GET /api/admin/payments/issues`, polling 60s)
- [ ] `WorkerLayout` рендерит простой header с именем пользователя и кнопкой выйти
- [ ] На ширине < 768px admin sidebar скрывается / доступен через burger

**Файлы:**
```
src/app/admin/layout.tsx
src/app/picker/layout.tsx
src/app/courier/layout.tsx
src/components/admin/AdminSidebar.tsx
src/components/admin/AdminHeader.tsx
src/components/WorkerHeader.tsx
```

---

### Критерии этапа 3 — Shared-компоненты

**Реализовано, когда:**
- [ ] `DataTable` поддерживает: колонки с кастомным render, loading skeleton (N строк), empty state, controlled pagination (page, pageSize)
- [ ] `OrderStatusBadge` корректно отображает все 8 статусов с цветами из `order-status-config.ts`
- [ ] `SlaTimer` принимает `startedAt: Date`, `limitSeconds: number`; обновляется каждую секунду; меняет цвет: зелёный (>50% времени), жёлтый (20-50%), красный (<20% или просрочено)
- [ ] `ConfirmDialog` блокирует UI до подтверждения; поддерживает `loading` состояние кнопки подтверждения
- [ ] Toast показывается при успехе и ошибке любого мутирующего запроса

**Файлы:**
```
src/components/ui/DataTable.tsx
src/components/ui/FilterBar.tsx
src/components/ui/OrderStatusBadge.tsx
src/components/ui/PaymentStatusBadge.tsx
src/components/ui/SlaTimer.tsx
src/components/ui/ConfirmDialog.tsx
src/components/ui/StatCard.tsx
src/lib/order-status-config.ts
```

---

### Критерии этапа 4 — Admin-модули

**Orders List — реализовано, когда:**
- [ ] Таблица загружает данные из `GET /api/admin/orders` с параметрами `status`, `dateFrom`, `dateTo`, `search`, `limit`, `offset`
- [ ] Изменение любого фильтра сбрасывает пагинацию на страницу 1
- [ ] Поисковое поле debounced 300ms
- [ ] Клик по строке открывает `/admin/orders/[id]`
- [ ] Колонка "time-in-state" показывает время в текущем статусе в читаемом формате (например "2ч 15м")

**Order Detail — реализовано, когда:**
- [ ] State Timeline отображает все 8 статусов; текущий статус подсвечен; завершённые — отмечены галочкой
- [ ] Кнопка "Отменить" видна только если статус CREATED / PICKING / PAYMENT
- [ ] Кнопка "Закрыть" видна только если статус DELIVERED
- [ ] Обе кнопки открывают `ConfirmDialog` перед выполнением
- [ ] После успешного действия данные заказа инвалидируются и перезагружаются

**Payment Issues — реализовано, когда:**
- [ ] Данные автоматически обновляются каждые 30 секунд
- [ ] "Mark Failed" открывает диалог с обязательным полем причины (минимум 5 символов)
- [ ] После retry или mark-failed строка исчезает из таблицы (оптимистично или после refetch)
- [ ] Колонка "age" показывает живое время с момента создания платежа

**Jobs — реализовано, когда:**
- [ ] Все три джоба отображаются: `payment-timeout`, `process-outbox`, `sync-products`
- [ ] `GET /api/admin/jobs/[jobName]/status` вызывается для каждого при загрузке
- [ ] Кнопка [Run Now] делает `POST /api/admin/jobs/[jobName]/run`, показывает spinner, обновляет статус после завершения
- [ ] Если job RUNNING — кнопка [Run Now] задизейблена

---

### Критерии этапа 5 — Picker Workspace

**Реализовано, когда:**
- [ ] При открытии `/picker` сначала проверяется `GET /api/picker/orders/me` — если есть активный заказ, сразу показывается workspace
- [ ] Если нет активного заказа — список из `GET /api/picker/orders/available`, polling каждые 15 секунд
- [ ] Claim выполняется оптимистично: заказ сразу отображается как взятый
- [ ] В workspace все позиции заказа отображаются как карточки с qty-spinner и полем absence strategy
- [ ] `PUT /api/orders/[id]/items` вызывается при каждом изменении qty или absence action (debounced 500ms или по blur)
- [ ] Итоговая сумма пересчитывается локально при изменениях и синхронизируется с backend после сохранения
- [ ] Кнопка "Завершить сборку" активна только когда все позиции имеют заполненную absence strategy (или qty > 0)
- [ ] После complete-picking workspace очищается и показывается список доступных заказов

---

### Критерии этапа 6 — Courier Workspace

**Реализовано, когда:**
- [ ] При открытии `/courier` сначала проверяется `GET /api/courier/orders/me` — если есть активный заказ, сразу показывается workspace
- [ ] Список доступных заказов polling каждые 15 секунд
- [ ] SlaTimer для DELIVERY_ASSIGNED считает от `deliveryClaimedAt`, лимит 30 минут
- [ ] SlaTimer для OUT_FOR_DELIVERY считает от `outForDeliveryAt`, лимит 60 минут
- [ ] Кнопка "Не удалось доставить" показывает форму с обязательным полем причины (минимум 10 символов)
- [ ] После confirm-delivered или mark-delivery-failed workspace очищается
- [ ] Адрес доставки рендерится как ссылка `https://yandex.ru/maps/?text={encodeURIComponent(address)}`

---

### Критерии этапа 7 — Dashboard

**Реализовано, когда:**
- [ ] KPI cards загружаются параллельными запросами (или одним агрегирующим, если добавлен endpoint)
- [ ] Bar chart показывает количество заказов в каждом статусе с правильными цветами
- [ ] Payment Issues widget показывает топ-5 проблемных платежей со ссылками на заказы
- [ ] Jobs strip показывает последний статус каждого job с цветовой индикацией SUCCESS/FAILED/RUNNING

---

### Критерии этапа 8 — UX

**Реализовано, когда:**
- [ ] Каждый модуль обёрнут в `ErrorBoundary` — ошибка в одном не ломает остальные
- [ ] Все списки имеют skeleton-загрузку (не спиннер посередине экрана)
- [ ] Все списки имеют empty state с понятным текстом
- [ ] При потере сессии (401 от любого запроса) — автоматический редирект на `/login` с сохранением текущего пути в `?returnTo`
- [ ] Picker и Courier workspace корректно отображаются на экране 375px шириной

---

## Запрещённые паттерны

| Паттерн | Причина |
|---|---|
| `fetch()` напрямую в компоненте | Используй TanStack Query |
| `useState` + `useEffect` для загрузки данных | Используй `useQuery` |
| Хардкод цветов статуса вне `order-status-config.ts` | Нарушает единый источник истины |
| Импорт из `src/infrastructure` в frontend | Нарушает архитектурные границы |
| `any` в TypeScript | Использовать типы из `src/domain` |
| Мутация без `ConfirmDialog` для деструктивных действий | UX-требование |
| Inline-стили через `style={{}}` | Использовать CSS Modules + токены |

---

## Критерий готовности всего плана

Реализация считается завершённой, если выполнено всё из следующего:

1. Сборщик может взять заказ, обработать все позиции с учётом стратегий отсутствия и завершить сборку без обращения к БД
2. Курьер может взять заказ, отслеживать SLA-таймер и подтвердить доставку или сообщить о неудаче
3. Администратор может найти любой заказ по ID/email/телефону, просмотреть его полный lifecycle и при необходимости отменить или закрыть
4. Администратор может устранить зависший платёж (retry или mark-failed) без доступа к БД
5. Администратор может запустить любую фоновую задачу вручную и увидеть результат
6. Все деструктивные действия требуют подтверждения
7. Ошибки отображаются через toast, не ломают интерфейс
8. TypeScript компилируется без ошибок (`npm run build` проходит)
