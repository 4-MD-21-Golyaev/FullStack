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
:root {

  /* ── Color palette ── */
  --primitive-color-blue-50:    #eff6ff;
  --primitive-color-blue-100:   #dbeafe;
  --primitive-color-blue-500:   #0070f3;
  --primitive-color-blue-600:   #0057c2;
  --primitive-color-blue-900:   #1e3a5f;

  --primitive-color-violet-500: #7b3fbf;
  --primitive-color-violet-600: #6230a0;

  --primitive-color-green-500:  #0a9e5c;
  --primitive-color-green-600:  #0a7e50;

  --primitive-color-orange-500: #e07b00;
  --primitive-color-orange-600: #b86200;

  --primitive-color-red-500:    #cc0000;
  --primitive-color-red-600:    #a80000;

  --primitive-color-neutral-0:   #ffffff;
  --primitive-color-neutral-50:  #f9fafb;
  --primitive-color-neutral-100: #f3f4f6;
  --primitive-color-neutral-200: #e5e7eb;
  --primitive-color-neutral-300: #d1d5db;
  --primitive-color-neutral-400: #9ca3af;
  --primitive-color-neutral-500: #6b7280;
  --primitive-color-neutral-700: #374151;
  --primitive-color-neutral-800: #1f2937;
  --primitive-color-neutral-900: #111827;

  /* ── Spacing scale (базовая единица 4px) ── */
  --primitive-space-0:  0px;
  --primitive-space-1:  4px;
  --primitive-space-2:  8px;
  --primitive-space-3:  12px;
  --primitive-space-4:  16px;
  --primitive-space-5:  20px;
  --primitive-space-6:  24px;
  --primitive-space-8:  32px;
  --primitive-space-10: 40px;
  --primitive-space-12: 48px;
  --primitive-space-16: 64px;

  /* ── Typography scale ── */
  --primitive-font-family-sans: 'Inter', system-ui, sans-serif;
  --primitive-font-family-mono: 'JetBrains Mono', monospace;

  --primitive-font-size-xs:   12px;
  --primitive-font-size-sm:   14px;
  --primitive-font-size-base: 16px;
  --primitive-font-size-lg:   18px;
  --primitive-font-size-xl:   20px;
  --primitive-font-size-2xl:  24px;
  --primitive-font-size-3xl:  30px;

  --primitive-font-weight-regular:  400;
  --primitive-font-weight-medium:   500;
  --primitive-font-weight-semibold: 600;
  --primitive-font-weight-bold:     700;

  --primitive-line-height-tight:  1.25;
  --primitive-line-height-normal: 1.5;

  /* ── Border radius scale ── */
  --primitive-radius-none: 0px;
  --primitive-radius-sm:   4px;
  --primitive-radius-md:   8px;
  --primitive-radius-lg:   12px;
  --primitive-radius-xl:   16px;
  --primitive-radius-full: 9999px;

  /* ── Shadow scale ── */
  --primitive-shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --primitive-shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --primitive-shadow-lg: 0 10px 15px rgba(0,0,0,0.10);

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
  --ctx-color-text-disabled:  var(--primitive-color-neutral-400);
  --ctx-color-text-inverse:   var(--primitive-color-neutral-0);
  --ctx-color-text-link:      var(--primitive-color-blue-500);
  --ctx-color-text-danger:    var(--primitive-color-red-500);

  /* ── Цвет фона ── */
  --ctx-color-bg-page:        var(--primitive-color-neutral-50);
  --ctx-color-bg-surface:     var(--primitive-color-neutral-0);
  --ctx-color-bg-subtle:      var(--primitive-color-neutral-100);
  --ctx-color-bg-overlay:     rgba(0,0,0,0.4);

  /* ── Цвет границ ── */
  --ctx-color-border-default: var(--primitive-color-neutral-200);
  --ctx-color-border-focus:   var(--primitive-color-blue-500);
  --ctx-color-border-danger:  var(--primitive-color-red-500);

  /* ── Действия (кнопки, ссылки) ── */
  --ctx-color-action-primary:         var(--primitive-color-blue-500);
  --ctx-color-action-primary-hover:   var(--primitive-color-blue-600);
  --ctx-color-action-danger:          var(--primitive-color-red-500);
  --ctx-color-action-danger-hover:    var(--primitive-color-red-600);

  /* ── Статус-цвета (обратная связь) ── */
  --ctx-color-status-success: var(--primitive-color-green-500);
  --ctx-color-status-warning: var(--primitive-color-orange-500);
  --ctx-color-status-danger:  var(--primitive-color-red-500);
  --ctx-color-status-info:    var(--primitive-color-blue-500);

  /* ── Статусы заказа ── */
  --ctx-color-order-created:            var(--primitive-color-blue-500);
  --ctx-color-order-picking:            var(--primitive-color-orange-500);
  --ctx-color-order-payment:            var(--primitive-color-violet-500);
  --ctx-color-order-delivery-assigned:  var(--primitive-color-green-500);
  --ctx-color-order-out-for-delivery:   var(--primitive-color-green-600);
  --ctx-color-order-delivered:          var(--primitive-color-neutral-500);
  --ctx-color-order-closed:             var(--primitive-color-neutral-700);
  --ctx-color-order-cancelled:          var(--primitive-color-red-500);

  /* ── Отступы по контексту использования ── */
  --ctx-space-inset-sm:   var(--primitive-space-2);   /* padding внутри маленьких компонентов */
  --ctx-space-inset-md:   var(--primitive-space-4);   /* padding внутри средних компонентов */
  --ctx-space-inset-lg:   var(--primitive-space-6);   /* padding внутри больших секций */
  --ctx-space-stack-sm:   var(--primitive-space-2);   /* вертикальный gap между элементами */
  --ctx-space-stack-md:   var(--primitive-space-4);
  --ctx-space-stack-lg:   var(--primitive-space-8);
  --ctx-space-inline-sm:  var(--primitive-space-2);   /* горизонтальный gap */
  --ctx-space-inline-md:  var(--primitive-space-4);

  /* ── Типографика по контексту ── */
  --ctx-font-body:        var(--primitive-font-family-sans);
  --ctx-font-code:        var(--primitive-font-family-mono);
  --ctx-font-size-body:   var(--primitive-font-size-base);
  --ctx-font-size-label:  var(--primitive-font-size-sm);
  --ctx-font-size-caption:var(--primitive-font-size-xs);
  --ctx-font-size-heading:var(--primitive-font-size-xl);

  /* ── Форма (border-radius) ── */
  --ctx-radius-control: var(--primitive-radius-md);   /* кнопки, инпуты */
  --ctx-radius-card:    var(--primitive-radius-lg);   /* карточки */
  --ctx-radius-badge:   var(--primitive-radius-full); /* бейджи */
  --ctx-radius-modal:   var(--primitive-radius-xl);

  /* ── Прочее ── */
  --ctx-shadow-card:    var(--primitive-shadow-sm);
  --ctx-shadow-modal:   var(--primitive-shadow-lg);
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
  --button-danger-bg-hover:    var(--ctx-color-action-danger-hover);
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
  --sla-color-ok:      var(--ctx-color-status-success);
  --sla-color-warning: var(--ctx-color-status-warning);
  --sla-color-overdue: var(--ctx-color-status-danger);

  /* ── Sidebar (admin) ── */
  --sidebar-bg:           var(--primitive-color-neutral-900);
  --sidebar-text:         var(--primitive-color-neutral-300);
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
