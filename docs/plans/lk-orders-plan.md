# План: ЛК — История заказов + Детали заказа

## Обзор

Реализовать два экрана личного кабинета по Figma:
- `/orders` — История заказов (node `606:25948`)
- `/orders/[id]` — Детали заказа (node `1097:43020`)

Оба экрана требуют новых shared/ui компонентов, которые сначала реализуются как атомы, затем собираются в страницы.

---

## Объём: 14 файлов, 3 слоя

### Слой 1 — lib (1 файл)
| Файл | Действие |
|---|---|
| `src/lib/order-status-config.ts` | Добавить customer-конфиг состояний |

### Слой 2 — shared/ui (8 файлов)
| Файл | Действие |
|---|---|
| `src/shared/ui/inputs/AccountTab/AccountTab.tsx` | Добавить `active?: boolean` prop |
| `src/shared/ui/inputs/AccountTab/AccountTab.module.css` | Добавить `.active` стиль |
| `src/shared/ui/inputs/AccountTabs/AccountTabs.tsx` | **НОВЫЙ** — sidebar навигация |
| `src/shared/ui/inputs/AccountTabs/AccountTabs.module.css` | **НОВЫЙ** |
| `src/shared/ui/data/ProfileField/ProfileField.tsx` | **НОВЫЙ** — readonly поле |
| `src/shared/ui/data/ProfileField/ProfileField.module.css` | **НОВЫЙ** |
| `src/shared/ui/feedback/OrderStatusBadge/OrderStatusBadge.tsx` | Добавить `variant?: 'admin' \| 'customer'` |
| `src/shared/ui/index.ts` | Экспортировать AccountTabs и ProfileField |

### Слой 3 — pages (4 файла)
| Файл | Действие |
|---|---|
| `src/app/(customer)/orders/page.tsx` | Переписать по Figma |
| `src/app/(customer)/orders/orders.module.css` | Переписать |
| `src/app/(customer)/orders/[id]/page.tsx` | Переписать по Figma |
| `src/app/(customer)/orders/[id]/order.module.css` | Переписать |

---

## Детали компонентов

### 1. `order-status-config.ts` — customer-конфиг

Добавить рядом с существующим `ORDER_STATUS_CONFIG`:

```typescript
export interface CustomerOrderStatusConfig {
  label: string;
  bgColor: string;  // хардкод из Figma — ctx-токена нет, цвета специфичны для этого badge
}

export const CUSTOMER_ORDER_STATUS_CONFIG: Record<OrderState, CustomerOrderStatusConfig> = {
  [OrderState.CREATED]:           { label: 'В сборке',  bgColor: '#AF3732' },
  [OrderState.PICKING]:           { label: 'В сборке',  bgColor: '#AF3732' },
  [OrderState.PAYMENT]:           { label: 'В сборке',  bgColor: '#AF3732' },
  [OrderState.DELIVERY]:          { label: 'В пути',    bgColor: '#9F322D' },
  [OrderState.DELIVERY_ASSIGNED]: { label: 'В пути',    bgColor: '#9F322D' },
  [OrderState.OUT_FOR_DELIVERY]:  { label: 'В пути',    bgColor: '#9F322D' },
  [OrderState.DELIVERED]:         { label: 'Доставлен', bgColor: '#8F2D29' },
  [OrderState.CLOSED]:            { label: 'Доставлен', bgColor: '#8F2D29' },
  [OrderState.CANCELLED]:         { label: 'Отменен',   bgColor: '#620C04' },
};

export function getCustomerOrderStatusConfig(state: OrderState): CustomerOrderStatusConfig {
  return CUSTOMER_ORDER_STATUS_CONFIG[state] ?? CUSTOMER_ORDER_STATUS_CONFIG[OrderState.CREATED];
}
```

### 2. `AccountTab` — расширение

Добавить `active?: boolean` в `AccountTabProps`.
В `.module.css` — класс `.active` переопределяет фон на `var(--ctx-color-action-primary)`,
цвет текста на `var(--ctx-color-text-inverse)`, фон iconFrame на `rgba(255,255,255,0.2)`.

### 3. `AccountTabs` — новый компонент (inputs/)

```typescript
interface AccountTabsProps {
  activeTab?: 'profile' | 'discounts' | 'addresses' | 'payment' | 'orders';
  onLogout?: () => void;
  className?: string;
}
```

Список вкладок с иконками и маршрутами:
| id | Метка | Icon | href |
|---|---|---|---|
| profile | Личные данные | account | /profile |
| discounts | Скидки и бонусы | percent | /profile/discounts |
| addresses | Адреса доставки | location | /profile/addresses |
| payment | Способы оплаты | credit_card | /profile/payment |
| orders | История заказов | shopping_bag | /orders |

Навигация через `useRouter().push(href)` в `onClick` каждого `AccountTab`.

Кнопка выхода: `<Button variant="tertiary">` с иконкой `logout` слева.
Клик: `fetch('/api/auth/logout', { method: 'POST' })` → `refresh()` из AuthContext → `router.push('/')`.

**CSS:**
```css
.root { display: flex; flex-direction: column; gap: 12px; width: 270px; flex-shrink: 0; }
.sections { display: flex; flex-direction: column; /* no gap — tabs flush */ }
```

### 4. `ProfileField` — новый компонент (data/)

```typescript
interface ProfileFieldProps {
  label: string;
  value: string;
  className?: string;
}
```

**CSS:**
```css
.root {
  background: var(--ctx-color-bg-page);       /* #F7F7F7 */
  border-radius: var(--ctx-radius-control);   /* 16px */
  padding: var(--ctx-space-stack-xs) var(--ctx-space-inset-lg);  /* 12px 24px */
  display: flex; flex-direction: column; gap: 8px;
}
.label { font-size: var(--ctx-font-size-caption); /* 16px */ font-weight: 450; color: var(--ctx-color-text-default); }
.value { font-size: var(--ctx-font-size-body);   /* 18px */ font-weight: 700; color: var(--ctx-color-text-default); }
```

### 5. `OrderStatusBadge` — customer variant

Добавить `variant?: 'admin' | 'customer'` (default `'admin'`).
При `variant='customer'` использовать `getCustomerOrderStatusConfig(state)`,
цвет текста — всегда `#FEFEFE` (белый).

---

## Страница `/orders`

**Лейаут (CSS Module):**
```css
.content {
  display: grid;
  grid-template-columns: 270px minmax(0, 1fr);
  gap: var(--ctx-space-inline-lg);
  align-items: start;
  padding-block: var(--ctx-space-stack-xl);
}
@media (max-width: 900px) {
  .content { grid-template-columns: 1fr; }
  /* sidebar скрыт на мобильном */
}
```

**Строка заказа (локальный компонент в page.tsx):**
```
[border-bottom, padding 16px 0]
Строка 1: "Заказ от {d MMMM}" + OrderStatusBadge(variant=customer) │ Price(actual, showOld=false)
Строка 2: "№ {id.slice(0,8)} · {N товаров}" — серый текст 14px
Строка 3: CardImage × min(items.length, 6) (60px each) │ Buttons
  Buttons: Button secondary "Посмотреть детали" → href /orders/[id]
           Button tertiary "Отменить" — только если state IN {CREATED, PICKING}
```

**Фильтры (Chips, client-side):**
```
type Filter = 'all' | 'active' | 'done'
ACTIVE: CREATED, PICKING, PAYMENT, DELIVERY_ASSIGNED, OUT_FOR_DELIVERY
DONE:   DELIVERED, CLOSED, CANCELLED
```

**Состояния страницы:**
- authLoading → skeleton
- !user → empty state + кнопка "Войти"
- isLoading → skeleton list
- orders.length === 0 → empty state "Нет заказов" + кнопка в каталог
- orders → список строк

**Cancel действие:**
```typescript
const cancelMutation = useMutation({
  mutationFn: (id: string) => ordersApi.cancelOrder(id),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-orders'] }),
});
```

---

## Страница `/orders/[id]`

**Лейаут:** те же `.content` (270px + 1fr) что и `/orders`.

**Структура main:**
```
h1 "Заказ от {d MMMM yyyy}" + OrderStatusBadge(variant=customer)   [右: кнопка "Отменить" если cancellable]

infoGrid (2 колонки, gap 24px):
├── ProfileField "Статус"            → customer label
├── ProfileField "Адрес доставки"    → order.address ?? "Не указан"
├── ProfileField "Дата заказа"       → format(createdAt, 'd MMMM yyyy', ru)
├── ProfileField "Номер заказа"      → #order.id.slice(0,8)
└── ProfileField "Позиций"           → pluralizeItems(items.length)

h2 "Состав заказа"
itemList: кастомные строки (без WideProductCard — API не возвращает imageSrc)
  каждая строка: CardImage(src="") │ name + "Арт. {article}" │ {qty} шт × {price} ₽ │ итого: {qty×price} ₽
```

**Примечание:** `WideProductCard (mode=history)` не используется в текущей итерации —
API не возвращает URL изображений товаров. Вместо этого — кастомные строки с CardImage(src="").
Добавление изображений к заказу — отдельная задача после интеграции с каталогом.

---

## Порядок реализации (Implementation agent)

Все шаги выполнить последовательно в одном агенте, сверяясь с правилами из `.claude/rules/ui-components.md`:

1. `order-status-config.ts` — добавить customer-конфиг
2. `AccountTab.tsx` + `.module.css` — добавить `active` prop
3. `AccountTabs/` — создать компонент
4. `ProfileField/` — создать компонент
5. `OrderStatusBadge.tsx` — добавить `variant` prop
6. `src/shared/ui/index.ts` — добавить экспорты AccountTabs, ProfileField
7. `/orders/page.tsx` + `orders.module.css` — переписать
8. `/orders/[id]/page.tsx` + `order.module.css` — переписать
9. `npx tsc --noEmit` — исправить все ошибки

---

## Проверка архитектурных правил

- ✅ Нет сырого `<button>`, `<input>` — AccountTab, Button, Chips
- ✅ Нет `--primitive-*` в CSS Modules
- ✅ FSD: shared/ui ← widgets ← pages (обратное запрещено)
- ✅ AccountTabs → inputs/, ProfileField → data/ (правильные группы)
- ✅ Все новые компоненты в barrel `index.ts`
- ✅ minmax(0,1fr) в grid-template-columns
- ✅ Только `--ctx-*` токены в CSS Modules (hardcoded bgColor в customer badge допустим — токена нет)
