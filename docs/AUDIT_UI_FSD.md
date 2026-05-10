# Аудит UI-компонентов: нарушения FSD

Дата: 2026-05-10

Аудит провёл агент-исследователь по запросу «что не так с UI-компонентами, особенно в разрезе FSD». Ниже — сводка нарушений и приоритеты исправлений.

## Что действительно ломает FSD

### 1. `AccountTabs` живёт в `shared/ui`, но это не shared

Файл: `src/shared/ui/inputs/AccountTabs/AccountTabs.tsx` (строки 3, 24, 34)

- импортирует `useRouter` из `next/navigation`
- зашиты маршруты `/profile`, `/profile/discounts`, `/orders`
- знает состав вкладок личного кабинета

По смыслу это полноценный widget личного кабинета покупателя. Должен быть в `widgets/customer/AccountNavigation/` (или `features/`), а в `shared/ui` — максимум примитив `TabButton`/`Tabs`, принимающий `items` и `onChange`.

### 2. Доменные сущности в `shared/ui/data/`

| Компонент | Файл | Доменное знание |
|---|---|---|
| `WideProductCard` | `src/shared/ui/data/WideProductCard/` | карточка **товара**, форматирование цен, варианты `cart/history` |
| `NarrowProductCard` | `src/shared/ui/data/NarrowProductCard/` | карточка **товара** |
| `OrderSummary` | `src/shared/ui/data/OrderSummary/` | сводка **заказа** (вес, итоги, ₽) |
| `Category` | `src/shared/ui/data/Category/` | категория товаров |
| `Price` | `src/shared/ui/data/Price/` | форматирование цен (₽, локализация) |
| `Breadcrumbs` | `src/shared/ui/data/Breadcrumbs/` | хлебные крошки навигации |

По FSD это `entities/product`, `entities/order`, `entities/category` — тонкие компоненты, рендерящие доменную модель поверх примитивов из `shared/ui`. Сейчас граница «design system ↔ домен» размыта, и `shared/ui` тащит знание о товарах и заказах.

## Что спорно, но стоит решить осознанно

### 3. `next/link`, `next/image` в `shared/ui`

Затронутые компоненты:

| Компонент | Файл | Импорт |
|---|---|---|
| `Logo` | `src/shared/ui/icons/Logo/Logo.tsx:1` | `next/link` |
| `Link` | `src/shared/ui/buttons/Link/Link.tsx:1` | `next/link` |
| `AppMarketButton` | `src/shared/ui/buttons/AppMarketButton/AppMarketButton.tsx:1` | `next/link` |
| `Category` | `src/shared/ui/data/Category/Category.tsx:1-2` | `next/link`, `next/image` |
| `CardImage` | `src/shared/ui/data/CardImage/CardImage.tsx:1` | `next/image` |
| `Breadcrumbs` | `src/shared/ui/data/Breadcrumbs/Breadcrumbs.tsx:1` | `next/link` |

Формально FSD это не запрещает (направление импортов между слоями не нарушено). Но `shared/ui` перестаёт быть фреймворк-агностичным — design system намертво пришит к Next.js. Возможные решения:

- оставить как есть и зафиксировать «shared/ui = Next-only»;
- вынести Next-обёртки в `widgets/`/`features/`;
- сделать примитив с `as`/`renderLink`-проп и Next-обёртку отдельно.

### 4. `Modal` и другие клиентские компоненты без `'use client'`

Файл: `src/shared/ui/feedback/Modal/Modal.tsx` (строки 19–25)

Используется `useEffect`, слушается `keydown` на `document`, но директивы `'use client'` нет. Это не FSD-проблема, а гигиена RSC; стоит проверить, не критично, если потребители уже client-компоненты.

Аналогичные кандидаты на проверку: `SliderContainer`, `FilterBar`, `SlaTimer`, `ConfirmDialog`.

## Чего нет (это хорошо)

- Восходящих импортов из `shared/ui`/`entities`/`features` в нижние слои нет.
- Глубоких импортов в обход barrel `@/shared/ui` нет.
- `CartContext`/`AuthContext` в `shared/ui` нет.

Направление импортов между слоями соблюдается. Ломается **семантика слоёв** — в `shared/ui` лежит то, что туда по смыслу не относится.

## Приоритет исправлений

1. Вытащить `AccountTabs` из `shared/ui` (явный widget с роутингом и доменными ссылками).
2. Перенести `WideProductCard`/`NarrowProductCard` → `entities/product/` или соответствующие `widgets/customer/`.
3. Перенести `OrderSummary` → `entities/order/`.
4. Принять решение по `next/link`/`next/image` в `shared/ui`: документировать как Next-only design system либо выносить обёртки.
5. Проверить и при необходимости добавить `'use client'` в клиентские компоненты `shared/ui`.
