# План: OrderCard + imageSrc в позициях заказа

## Цель

Реализовать виджет `OrderCard` и обогатить `OrderItemDto` изображениями товаров
чтобы карточка заказа отображала миниатюры позиций.

## Подход к изображениям

`OrderItem` уже связан с `Product.imagePath` через `productId`. Миграция не нужна —
достаточно include'нуть `product` в запросе репозитория. `imageSrc` — актуальное
изображение товара (не снимок на момент заказа), что приемлемо.

---

## Объём: 5 файлов, 2 слоя

### Слой 1 — Backend (3 файла)

| Файл | Действие |
|---|---|
| `src/lib/api/orders.ts` | Добавить `imageSrc?: string \| null` в `OrderItemDto` |
| `src/infrastructure/repositories/OrderRepository.prisma.ts` | Include `product.imagePath` в запросах, маппинг в `imageSrc` |
| тесты репозитория (если есть) | Обновить моки |

### Слой 2 — Widget (2 файла)

| Файл | Действие |
|---|---|
| `src/widgets/customer/OrderCard/OrderCard.tsx` | **НОВЫЙ** |
| `src/widgets/customer/OrderCard/OrderCard.module.css` | **НОВЫЙ** |

---

## Детали реализации

### 1. `OrderItemDto` (src/lib/api/orders.ts)

```typescript
export interface OrderItemDto {
  productId: string;
  name: string;
  article: string;
  price: number;
  quantity: number;
  imageSrc?: string | null; // ← добавить
}
```

### 2. `OrderRepository.prisma.ts`

В методах где включаются `items` (findByUserId, findById и др.) добавить в select:

```typescript
items: {
  select: {
    productId: true,
    name: true,
    article: true,
    price: true,
    quantity: true,
    product: {
      select: { imagePath: true },
    },
  },
},
```

Маппер:
```typescript
imageSrc: item.product?.imagePath ?? null,
```

### 3. `OrderCard` (widgets/customer/OrderCard/)

**Интерфейс:**

```typescript
import type { OrderState } from '@/domain/order/OrderState';

export interface OrderCardProps {
  orderId: string;        // id.slice(0,8) — отображается как "№ {orderId}"
  date: string;           // отформатированная строка: "Заказ от 20 июля"
  state: OrderState;      // для OrderStatusBadge
  items: Array<{
    productId: string;
    imageSrc?: string | null;
  }>;
  itemCount: number;      // для pluralize "N товаров"
  totalAmount: number;    // для Price
  onViewDetails: () => void;
  onCancel?: () => void;  // если undefined — кнопка "Отменить" не рендерится
  size?: 'M' | 'S';      // default 'M'
  className?: string;
}
```

**Структура (Figma node 1097-22386):**

```tsx
'use client'

<article className={root + sizeM/S + className}>

  {/* Строка 1: дата + бейдж | цена */}
  <div className={styles.header}>
    <div className={styles.headerLeft}>
      <span className={styles.date}>{date}</span>
      <OrderStatusBadge label={...} bgColor={...} color="var(--ctx-color-text-inverse)" />
    </div>
    <Price value={totalAmount} />
  </div>

  {/* Строка 2: № заказа · N товаров */}
  <div className={styles.meta}>
    <span>№ {orderId}</span>
    <span>·</span>
    <span>{pluralizeItems(itemCount)}</span>
  </div>

  {/* Строка 3: изображения | кнопки */}
  <div className={styles.row}>
    <div className={styles.images}>
      {items.slice(0, 6).map((item) =>
        item.imageSrc ? (
          <CardImage key={item.productId} src={item.imageSrc} size="M" />
        ) : (
          <div key={item.productId} className={styles.imagePlaceholder} aria-hidden="true" />
        )
      )}
    </div>
    <div className={styles.buttons}>
      <Button variant="secondary" size="md" onClick={onViewDetails}>
        Посмотреть детали
      </Button>
      {onCancel && (
        <Button variant="tertiary" size="md" onClick={onCancel}>
          Отменить
        </Button>
      )}
    </div>
  </div>

</article>
```

`getCustomerOrderStatusConfig(state)` → props для `OrderStatusBadge`.

**CSS (Figma specs):**

```css
.root {
  border-bottom: 1px solid var(--ctx-color-border-default);
  padding-block: 16px;           /* Figma: spacing/400 */
  display: flex;
  flex-direction: column;
  gap: 12px;                     /* Figma: spacing/300 */
}

.header { display: flex; align-items: center; justify-content: space-between; gap: var(--ctx-space-inline-md); }
.headerLeft { display: flex; align-items: center; gap: 12px; min-width: 0; }

.date {
  font-size: var(--ctx-font-size-body);   /* 18px M */
  font-weight: 700;                        /* [Desktop]/H5 */
  color: var(--ctx-color-text-default);
  white-space: nowrap;
}
.sizeS .date { font-size: var(--ctx-font-size-caption); } /* 16px S */

.meta {
  display: flex;
  align-items: center;
  gap: 4px;                              /* Figma: spacing/100 */
  font-size: var(--ctx-font-size-label); /* 14px */
  font-weight: 450;                      /* [Desktop]/Utilities/Secondary */
  color: var(--ctx-color-text-secondary);
}

.row { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--ctx-space-inline-md); }
.sizeS .row { flex-direction: column; align-items: flex-start; gap: 16px; }

.images { display: flex; gap: 12px; }
.sizeS .images { overflow-x: auto; width: 100%; }

.imagePlaceholder {
  width: 60px; height: 60px;            /* Figma: CardImage M = 60×60 */
  flex-shrink: 0;
  border-radius: var(--ctx-radius-card); /* 8px */
  background: var(--ctx-color-bg-surface);
}

.buttons { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
.sizeS .buttons { width: 100%; }
```

---

## Порядок реализации

1. `OrderItemDto` — добавить `imageSrc`
2. `OrderRepository.prisma.ts` — include `product.imagePath`, маппинг
3. Backend Test+Review agent (обязателен по правилам проекта)
4. `OrderCard` — реализовать виджет
5. UI Review agent
6. `npx tsc --noEmit`

---

## Зависимости

- `OrderCard` реализуется **после** шага 3 (нужен `imageSrc` в DTO)
- Страница `/orders` использует `OrderCard` — реализуется после этого плана
