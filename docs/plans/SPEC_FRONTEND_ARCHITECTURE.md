# SPEC: Frontend Architecture — Styling & Component System

## Статус: Принята к исполнению

---

## Обзор

Фронтенд строится по двум параллельным трёхслойным моделям с жёстким разделением ответственности.
Единственный разрешённый механизм стилизации — **CSS Modules**.

```
Токены:     Primitive  →  Context  →  Component
Компоненты: ui/        →  (слой без разделения)  →  admin/ | customer/ | picker/ | courier/
```

Семантика нарастает от слоя к слою. Каждый следующий слой ссылается на предыдущий через `var()` — никогда не на значения напрямую. Разделение на контуры появляется **только на последнем слое** обеих моделей.

---

## Слой 1 — Design Tokens

Токены реализованы как CSS custom properties и разбиты на **три подслоя** с нарастающей семантикой.

### Расположение

```
src/styles/
├── tokens/
│   ├── primitive.css    ← сырые значения палитры и шкал
│   ├── context.css      ← семантические псевдонимы, ссылаются на primitive
│   └── component.css    ← компонентные токены, ссылаются на context
├── globals.css          ← @import всех трёх + reset + base html/body
└── typography.css       ← @font-face (если нужны кастомные шрифты)
```

---

### Токен-слой 1: Primitive

Сырые значения без какой-либо семантики. Описывают полные шкалы палитры и метрик.
**Не используются в CSS Modules компонентов напрямую** — только через context-токены.

```css
/* tokens/primitive.css */
/* Значения — источник истины: Figma (eV3fLo7RMJcyNqnFeuwHmg) */
:root {

  /* ── Нейтральная шкала ── */
  --primitive-color-neutral-0:   #fefefe;   /* White/Enabled */
  --primitive-color-neutral-50:  #fcfcfc;   /* White/Hovered */
  --primitive-color-neutral-75:  #f7f7f7;   /* Light gray — фон страницы */
  --primitive-color-neutral-100: #f2f2f2;   /* Gray/Enabled — subtle фон */
  --primitive-color-neutral-200: #ededed;   /* Gray/Hovered — граница/hover */
  --primitive-color-neutral-300: #cccccc;   /* Gray/Disabled */
  --primitive-color-neutral-400: #9c9999;   /* Dark Gray/Enabled — иконки secondary */
  --primitive-color-neutral-500: #999999;   /* Gray contrast — вторичный текст */
  --primitive-color-neutral-900: #282828;   /* Signal black — основной текст */

  /* ── Фирменная красная шкала (бренд/акцент) ── */
  --primitive-color-red-300: #af3732;   /* Red/Focused */
  --primitive-color-red-400: #9f322d;   /* Red/Hovered */
  --primitive-color-red-500: #8f2d29;   /* Red/Enabled — основной акцент */
  --primitive-color-red-700: #620c04;   /* Red/Disabled */
  --primitive-color-red-900: #500a03;   /* Ripe Wine — декоративный тёмный */

  /* ── Ошибка / Деструктивное ── */
  --primitive-color-error-50:  #faf0f0;   /* Error | Destructive/Background */
  --primitive-color-error-500: #ba6a66;   /* Error | Destructive/Enabled */

  /* ── Акцент предупреждения ── */
  --primitive-color-orange-400: #f5a12b;   /* Orange */

  /* ── Пастельная шкала (фоны статусов/тегов) ── */
  --primitive-color-pastel-cream:  #fff8e4;
  --primitive-color-pastel-orange: #fdf0e2;
  --primitive-color-pastel-green:  #e8fcea;
  --primitive-color-pastel-pink:   #ffebeb;
  --primitive-color-pastel-blue:   #e9f0fc;
  --primitive-color-pastel-purple: #f3e9fb;

  /* ── Spacing scale (базовая единица 4px) ── */
  --primitive-space-0:  0px;
  --primitive-space-1:  4px;
  --primitive-space-2:  8px;
  --primitive-space-3:  12px;
  --primitive-space-4:  16px;
  --primitive-space-6:  24px;
  --primitive-space-8:  32px;
  --primitive-space-12: 48px;
  --primitive-space-16: 64px;

  /* ── Typography scale ── */
  --primitive-font-family-sans: 'PT Root UI VF', system-ui, sans-serif;
  --primitive-font-family-mono: 'JetBrains Mono', monospace;

  --primitive-font-size-xs:   12px;
  --primitive-font-size-sm:   14px;
  --primitive-font-size-md:   16px;
  --primitive-font-size-lg:   18px;   /* основной body */
  --primitive-font-size-xl:   20px;
  --primitive-font-size-2xl:  24px;
  --primitive-font-size-3xl:  36px;
  --primitive-font-size-4xl:  40px;

  /* PT Root UI VF — variable font, поддерживает дробные значения */
  --primitive-font-weight-regular:  450;
  --primitive-font-weight-medium:   500;
  --primitive-font-weight-semibold: 600;
  --primitive-font-weight-bold:     700;

  --primitive-line-height-tight:  1.10;
  --primitive-line-height-normal: 1.15;
  --primitive-line-height-loose:  1.20;

  /* ── Border radius scale ── */
  --primitive-radius-none: 0px;
  --primitive-radius-sm:   4px;    /* Radius/100 */
  --primitive-radius-md:   8px;    /* Radius/200 */
  --primitive-radius-lg:   12px;   /* Radius/300 */
  --primitive-radius-xl:   16px;   /* Radius/400 */
  --primitive-radius-2xl:  32px;   /* Radius/800 */
  --primitive-radius-full: 9999px; /* Radius/FULL */

  /* ── Shadow scale ── */
  /* Drop Shadow/200 (Figma) — двухслойная мягкая тень */
  --primitive-shadow-card:
    0 1px 4px rgba(12,12,13,0.05),
    0 1px 4px rgba(12,12,13,0.10);
  /* Drop Shadow/Modal */
  --primitive-shadow-modal:
    0 4px 6px  rgba(0,0,0,0.12),
    0 10px 20px rgba(0,0,0,0.20);

  /* ── Duration scale ── */
  --primitive-duration-fast:   100ms;
  --primitive-duration-normal: 200ms;
  --primitive-duration-slow:   300ms;

  /* ── Z-index scale ── */
  --primitive-z-dropdown: 100;
  --primitive-z-modal:    200;
  --primitive-z-toast:    300;
}
```

---

### Токен-слой 2: Context

Семантические псевдонимы. Отвечают на вопрос **«для чего»**, а не «какое значение».
Ссылаются исключительно на primitive-токены. Компонентные CSS Modules ссылаются на этот слой — не на primitive.

```css
/* tokens/context.css */
:root {

  /* ── Цвет текста ── */
  --ctx-color-text-default:   var(--primitive-color-neutral-900);
  --ctx-color-text-secondary: var(--primitive-color-neutral-500);
  --ctx-color-text-disabled:  var(--primitive-color-neutral-300);
  --ctx-color-text-inverse:   var(--primitive-color-neutral-0);
  --ctx-color-text-danger:    var(--primitive-color-error-500);

  /* ── Цвет фона ── */
  --ctx-color-bg-page:         var(--primitive-color-neutral-75);
  --ctx-color-bg-surface:      var(--primitive-color-neutral-0);
  --ctx-color-bg-subtle:       var(--primitive-color-neutral-100);
  --ctx-color-bg-subtle-hover: var(--primitive-color-neutral-200);
  --ctx-color-bg-overlay:      rgba(0,0,0,0.4);

  /* ── Цвет границ ── */
  --ctx-color-border-default: var(--primitive-color-neutral-200);
  --ctx-color-border-focus:   var(--primitive-color-red-500);
  --ctx-color-border-danger:  var(--primitive-color-error-500);

  /* ── Действия (кнопки, ссылки) ── */
  --ctx-color-action-primary:        var(--primitive-color-red-500);
  --ctx-color-action-primary-hover:  var(--primitive-color-red-400);
  --ctx-color-action-primary-active: var(--primitive-color-red-300);
  --ctx-color-action-danger:         var(--primitive-color-error-500);
  --ctx-color-action-danger-bg:      var(--primitive-color-error-50);

  /* ── Статус-цвета (feedback) ── */
  --ctx-color-status-warning:     var(--primitive-color-orange-400);
  --ctx-color-status-success-bg:  var(--primitive-color-pastel-green);
  --ctx-color-status-warning-bg:  var(--primitive-color-pastel-orange);
  --ctx-color-status-danger-bg:   var(--primitive-color-pastel-pink);
  --ctx-color-status-info-bg:     var(--primitive-color-pastel-blue);
  --ctx-color-status-payment-bg:  var(--primitive-color-pastel-purple);
  --ctx-color-status-neutral-bg:  var(--primitive-color-pastel-cream);

  /* ── Статусы заказа (bg + text пара для бейджей) ── */
  --ctx-color-order-created-bg:           var(--primitive-color-pastel-blue);
  --ctx-color-order-created-text:         var(--primitive-color-red-500);
  --ctx-color-order-picking-bg:           var(--primitive-color-pastel-orange);
  --ctx-color-order-picking-text:         var(--primitive-color-neutral-900);
  --ctx-color-order-payment-bg:           var(--primitive-color-pastel-purple);
  --ctx-color-order-payment-text:         var(--primitive-color-neutral-900);
  --ctx-color-order-delivery-bg:          var(--primitive-color-pastel-green);
  --ctx-color-order-delivery-text:        var(--primitive-color-neutral-900);
  --ctx-color-order-delivered-bg:         var(--primitive-color-pastel-green);
  --ctx-color-order-delivered-text:       var(--primitive-color-neutral-900);
  --ctx-color-order-closed-bg:            var(--primitive-color-neutral-100);
  --ctx-color-order-closed-text:          var(--primitive-color-neutral-500);
  --ctx-color-order-cancelled-bg:         var(--primitive-color-pastel-pink);
  --ctx-color-order-cancelled-text:       var(--primitive-color-error-500);

  /* ── Отступы по контексту использования ── */
  --ctx-space-inset-sm:      var(--primitive-space-2);   /* padding маленьких компонентов */
  --ctx-space-inset-md:      var(--primitive-space-4);   /* padding кнопок, инпутов */
  --ctx-space-inset-lg:      var(--primitive-space-6);   /* padding карточек */
  --ctx-space-stack-sm:      var(--primitive-space-2);   /* вертикальный gap мелкий */
  --ctx-space-stack-md:      var(--primitive-space-4);
  --ctx-space-stack-lg:      var(--primitive-space-8);
  --ctx-space-inline-sm:     var(--primitive-space-2);   /* горизонтальный gap */
  --ctx-space-inline-md:     var(--primitive-space-4);
  --ctx-space-page-desktop:  var(--primitive-space-8);   /* 32px — padding страницы */
  --ctx-space-page-mobile:   var(--primitive-space-3);   /* 12px */

  /* ── Типографика по контексту ── */
  --ctx-font-body:         var(--primitive-font-family-sans);
  --ctx-font-code:         var(--primitive-font-family-mono);
  --ctx-font-size-body:    var(--primitive-font-size-lg);    /* 18px */
  --ctx-font-size-caption: var(--primitive-font-size-md);    /* 16px */
  --ctx-font-size-label:   var(--primitive-font-size-sm);    /* 14px */
  --ctx-font-size-heading: var(--primitive-font-size-xl);    /* 20px */

  /* ── Форма (border-radius) ── */
  --ctx-radius-control: var(--primitive-radius-md);    /* 8px — кнопки, инпуты */
  --ctx-radius-card:    var(--primitive-radius-xl);    /* 16px — карточки */
  --ctx-radius-badge:   var(--primitive-radius-full);  /* 9999px — бейджи */
  --ctx-radius-modal:   var(--primitive-radius-2xl);   /* 32px — модальные окна */

  /* ── Прочее ── */
  --ctx-shadow-card:    var(--primitive-shadow-card);
  --ctx-shadow-modal:   var(--primitive-shadow-modal);
  --ctx-transition:     var(--primitive-duration-normal) ease;
  --ctx-z-dropdown:     var(--primitive-z-dropdown);
  --ctx-z-modal:        var(--primitive-z-modal);
  --ctx-z-toast:        var(--primitive-z-toast);
}
```

---

### Токен-слой 3: Component

Токены конкретного компонента. Ссылаются на context-токены.
Позволяют переопределить стиль одного компонента без изменения context-слоя.
Объявляются в том же файле `component.css`, сгруппированные по компоненту.

```css
/* tokens/component.css */
:root {

  /* ── Button ── */
  --button-font-size:          var(--ctx-font-size-label);
  --button-font-weight:        var(--primitive-font-weight-medium);
  --button-radius:             var(--ctx-radius-control);
  --button-transition:         var(--ctx-transition);

  --button-primary-bg:         var(--ctx-color-action-primary);
  --button-primary-bg-hover:   var(--ctx-color-action-primary-hover);
  --button-primary-text:       var(--ctx-color-text-inverse);

  --button-secondary-bg:       var(--ctx-color-bg-subtle);
  --button-secondary-bg-hover: var(--ctx-color-border-default);
  --button-secondary-text:     var(--ctx-color-text-default);

  --button-danger-bg:          var(--ctx-color-action-danger);
  --button-danger-bg-hover:    var(--ctx-color-action-danger);
  --button-danger-text:        var(--ctx-color-text-inverse);

  --button-padding-sm: var(--ctx-space-inset-sm) var(--primitive-space-3);
  --button-padding-md: var(--ctx-space-inset-sm) var(--ctx-space-inset-md);
  --button-padding-lg: var(--primitive-space-3)  var(--ctx-space-inset-lg);

  /* ── Input ── */
  --input-font-size:        var(--ctx-font-size-body);
  --input-radius:           var(--ctx-radius-control);
  --input-border:           1px solid var(--ctx-color-border-default);
  --input-border-focus:     2px solid var(--ctx-color-border-focus);
  --input-border-danger:    1px solid var(--ctx-color-border-danger);
  --input-bg:               var(--ctx-color-bg-surface);
  --input-text:             var(--ctx-color-text-default);
  --input-placeholder:      var(--ctx-color-text-disabled);
  --input-padding:          var(--ctx-space-inset-sm) var(--ctx-space-inset-md);

  /* ── Badge ── */
  --badge-font-size:    var(--ctx-font-size-caption);
  --badge-font-weight:  var(--primitive-font-weight-semibold);
  --badge-radius:       var(--ctx-radius-badge);
  --badge-padding:      var(--primitive-space-1) var(--primitive-space-2);

  /* ── Card ── */
  --card-bg:      var(--ctx-color-bg-surface);
  --card-radius:  var(--ctx-radius-card);
  --card-shadow:  var(--ctx-shadow-card);
  --card-border:  1px solid var(--ctx-color-border-default);
  --card-padding: var(--ctx-space-inset-lg);

  /* ── Modal ── */
  --modal-bg:      var(--ctx-color-bg-surface);
  --modal-radius:  var(--ctx-radius-modal);
  --modal-shadow:  var(--ctx-shadow-modal);
  --modal-overlay: var(--ctx-color-bg-overlay);
  --modal-z:       var(--ctx-z-modal);

  /* ── Table (admin) ── */
  --table-header-bg:    var(--ctx-color-bg-subtle);
  --table-header-text:  var(--ctx-color-text-secondary);
  --table-row-hover-bg: var(--ctx-color-bg-subtle);
  --table-border:       var(--ctx-color-border-default);
  --table-cell-padding: var(--ctx-space-inset-sm) var(--ctx-space-inset-md);

  /* ── SlaTimer ── */
  --sla-color-ok:      var(--ctx-color-status-success-bg);
  --sla-color-warning: var(--ctx-color-status-warning);
  --sla-color-overdue: var(--ctx-color-action-danger);

  /* ── Sidebar (admin) ── */
  --sidebar-bg:           var(--primitive-color-neutral-900);
  --sidebar-text:         var(--primitive-color-neutral-400);
  --sidebar-text-active:  var(--primitive-color-neutral-0);
  --sidebar-item-active-bg: rgba(255,255,255,0.08);
  --sidebar-width:        240px;
  --sidebar-width-collapsed: 56px;
}
```

---

### Правила работы с токенами

| Правило | Описание |
|---|---|
| Primitive → только в context | `primitive.*` нельзя использовать в CSS Modules компонентов напрямую |
| Context → в компонентных модулях | Компоненты ссылаются на `ctx.*` или `component-specific.*` |
| Component → переопределение | Если нужно точечно изменить стиль компонента — меняется его токен в `component.css`, не context |
| Без хардкода | Запрещены hex, px-литералы и named colors в CSS Modules — только `var()` |
| Figma-экспорт → только primitive | При обновлении дизайна из Figma меняются значения в `primitive.css`. Context и component остаются стабильными |
| Статусы заказа | `--ctx-color-order-*` — единственный источник цветов статусов во всём проекте |

---

## Слой 2 — Primitive Components

### Что это

Базовые UI-компоненты без бизнес-логики и без знания о контуре (admin/customer).
Принимают данные и callback'и через props. Стилизованы через CSS Modules, потребляют только токены.

### Расположение

```
src/components/ui/
├── Button/
│   ├── Button.tsx
│   └── Button.module.css
├── Input/
│   ├── Input.tsx
│   └── Input.module.css
├── Badge/
│   ├── Badge.tsx
│   └── Badge.module.css
├── Modal/
│   ├── Modal.tsx
│   └── Modal.module.css
├── Toast/
│   ├── Toast.tsx
│   └── Toast.module.css
├── Spinner/
│   ├── Spinner.tsx
│   └── Spinner.module.css
├── Skeleton/
│   ├── Skeleton.tsx
│   └── Skeleton.module.css
└── index.ts        ← реэкспорт всех примитивов
```

### Правила Primitive Components

1. Не импортируют ничего из `src/domain`, `src/application`, `src/infrastructure`.
2. Не содержат бизнес-логики (нет обращений к API, нет использования stores).
3. Стилизуются **только через собственный CSS Module** — никаких inline styles, никаких className из внешних файлов.
4. Props типизированы явно; нет `any`, нет неконтролируемого распространения `...rest` без типизации.
5. Варианты оформления передаются через props (`variant`, `size`, `state`) — не через дополнительные className снаружи.

### Пример структуры компонента

```tsx
// Button.tsx
import styles from './Button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={[
        styles.root,
        styles[variant],
        styles[size],
        loading ? styles.loading : '',
      ].join(' ')}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className={styles.spinner} /> : null}
      {children}
    </button>
  );
}
```

```css
/* Button.module.css */
.root {
  display: inline-flex;
  align-items: center;
  gap: var(--ctx-space-inline-sm);
  border-radius: var(--button-radius);
  font-weight: var(--button-font-weight);
  font-size: var(--button-font-size);
  transition: background-color var(--button-transition);
  cursor: pointer;
  border: none;
}

.primary {
  background-color: var(--button-primary-bg);
  color: var(--button-primary-text);
}

.primary:hover:not(:disabled) {
  background-color: var(--button-primary-bg-hover);
}

.danger {
  background-color: var(--button-danger-bg);
  color: var(--button-danger-text);
}

.sm { padding: var(--button-padding-sm); }
.md { padding: var(--button-padding-md); }
.lg { padding: var(--button-padding-lg); }

.root:disabled { opacity: 0.5; cursor: not-allowed; }
.loading { pointer-events: none; }
```

---

## Слой 3 — Layer Components

### Что это

Domain-специфичные и layout-специфичные компоненты, собранные из примитивов.
**Здесь происходит разделение на контуры.**

### Расположение

```
src/components/
├── ui/              ← примитивы + кросс-контурные компоненты
│   ├── Button/
│   ├── Input/
│   ├── Badge/
│   ├── Modal/
│   ├── Toast/
│   ├── Spinner/
│   ├── Skeleton/
│   ├── OrderStatusBadge/   ← используется в admin / picker / courier
│   ├── PaymentStatusBadge/ ← используется в admin / courier
│   └── SlaTimer/           ← используется в courier и admin Order Detail
│
├── admin/           ← компоненты admin-контура
│   ├── DataTable/
│   ├── FilterBar/
│   ├── StatCard/
│   ├── JobCard/
│   └── AuditEntry/
│
├── picker/          ← компоненты picker-контура
│   ├── PickingWorkspace/
│   ├── PickingItemRow/
│   └── OrderPickCard/
│
├── courier/         ← компоненты courier-контура
│   ├── DeliveryWorkspace/
│   └── OrderDeliveryCard/
│
└── customer/        ← FUTURE — появится при реализации клиентского frontend
    └── ...
```

### Правила Layer Components

1. Импортируют примитивы из `src/components/ui`.
2. Могут импортировать типы из `src/domain` (только типы, не реализации).
3. Не обращаются к API напрямую — данные получают через props или через хуки TanStack Query.
4. Стилизуются через собственный CSS Module.
5. Компонент `admin/` не импортирует из `customer/` и наоборот — контуры не смешиваются.

---

## Правила CSS Modules (обязательные)

### Разрешено

```css
/* Использование токенов */
.title { color: var(--color-neutral-900); }

/* Псевдоклассы и псевдоэлементы */
.button:hover { background: var(--color-brand-600); }
.input::placeholder { color: var(--color-neutral-400); }

/* Media queries */
@media (max-width: 768px) {
  .sidebar { display: none; }
}

/* Анимации через @keyframes внутри модуля */
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal { animation: fadeIn var(--transition-normal); }

/* Композиция через composes (только внутри модуля или из tokens) */
.primaryText { composes: baseText; color: var(--color-brand-500); }
```

### Запрещено

```tsx
// ❌ Inline styles
<div style={{ color: '#0070f3' }}>

// ❌ Tailwind utility classes в JSX
<div className="flex items-center gap-2 text-blue-500">

// ❌ Глобальные классы без :global wrapper
// (случайное использование чужого модуля)
import outsideStyles from '../other/Other.module.css';
<div className={outsideStyles.someClass}>

// ❌ Хардкод цветовых значений в CSS
.badge { color: #0070f3; }  /* использовать var(--color-brand-500) */

// ❌ Магические числа в CSS
.card { padding: 16px; }  /* использовать var(--space-4) */
```

### Соглашения именования

```css
/* Корневой элемент компонента — всегда .root */
.root { ... }

/* Варианты — прямое имя варианта */
.primary { ... }
.secondary { ... }

/* Состояния — camelCase */
.isLoading { ... }
.isDisabled { ... }
.isActive { ... }

/* Дочерние элементы — camelCase */
.headerTitle { ... }
.bodyContent { ... }
.footerActions { ... }
```

---

## Совместимость с экспортом из Figma

### Стратегия

При экспорте дизайна из Figma ожидается получение:
- Обновлённых значений токенов → вносятся **только в `tokens.css`**, компоненты не меняются
- Новых компонентов → размещаются в `src/components/customer/` (слой 3, customer-контур)

### Что защищает admin от изменений при экспорте

1. `admin/` и `customer/` компоненты изолированы в разных директориях слоя 3
2. Токены общие — если дизайн-экспорт изменит значение токена, это затронет оба контура. Если изменение нежелательно для admin — токен разбивается на два: `--color-brand-admin` и `--color-brand-customer`
3. CSS Modules гарантируют скопированные стили — глобальные правила из экспорта не пробьются в admin-компоненты

---

## Применение к существующей кодовой базе

На момент написания спецификации в проекте существуют тестовые страницы (`src/app/test-*`) с inline-стилями. Они не являются частью production frontend и не подпадают под эту спецификацию.

Все новые страницы и компоненты, создаваемые в рамках `src/app/admin/`, `src/app/picker/`, `src/app/courier/` и `src/app/(auth)/`, **обязаны** следовать данной спецификации с первого коммита.

---

## Итоговая схема

```
ТОКЕНЫ — нарастание семантики
──────────────────────────────────────────────────────────────────
  primitive.css          context.css              component.css
  ┌─────────────┐        ┌──────────────────┐     ┌─────────────────────┐
  │ --primitive- │  var() │ --ctx-           │var()│ --button-           │
  │ color-blue-  ├───────►│ color-action-    ├────►│ primary-bg          │
  │ 500: #0070f3 │        │ primary          │     │                     │
  │              │        │                  │     │ --table-            │
  │ --primitive- │  var() │ --ctx-           │var()│ header-bg           │
  │ color-       ├───────►│ color-order-     ├────►│                     │
  │ orange-500   │        │ picking          │     │ --sla-color-ok      │
  └─────────────┘        └──────────────────┘     └─────────────────────┘
  Сырые значения.        Семантика.               Компонентная изоляция.
  Меняются при           Стабильны при            Позволяют точечный
  Figma-экспорте.        смене палитры.           override.

КОМПОНЕНТЫ — нарастание специфики
──────────────────────────────────────────────────────────────────
  ui/ (primitive)        (общий слой)             layer components
  ┌─────────────┐                                 ┌───────────────────┐
  │ Button      │                                 │ admin/            │
  │ Input       │──────── используются в ────────►│   DataTable       │
  │ Badge       │                                 │   StatCard        │
  │ Modal       │                                 │   JobCard         │
  │ Toast       │                                 ├───────────────────┤
  │ Skeleton    │                                 │ picker/           │
  └─────────────┘                                 │   PickingWorkspace│
  Без бизнес-логики.                              ├───────────────────┤
  Потребляют                                      │ courier/          │
  component-токены.                               │   DeliveryWorkspace│
                                                  ├───────────────────┤
                                                  │ customer/ (future)│
                                                  │   ProductCard     │
                                                  └───────────────────┘
  Разделение на контуры появляется только здесь.
```
