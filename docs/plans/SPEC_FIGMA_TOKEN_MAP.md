# SPEC: Figma → Code Token Mapping

## Статус: Актуален. Figma-файл не изменяется — все несоответствия устраняются через правила интерпретации ниже.

---

## Принцип работы

```
Figma Variable (Context)          CSS (code)
────────────────────────          ──────────────────────────
Context/Color/Action/Primary  ──► var(--ctx-color-action-primary)
Context/Space/Inset/MD        ──► var(--ctx-space-inset-md)
Context/Radius/Control        ──► var(--ctx-radius-control)
```

Figma Context-переменные и CSS context-токены — взаимно однозначное соответствие.
При обновлении дизайна из Figma меняются значения в Figma Primitive,
CSS primitive.css обновляется под новые hex/px, context и component остаются стабильными.

---

## Правила интерпретации (Figma не изменяется)

Эти правила применяются **всегда** при реализации компонентов и страниц из Figma.
Figma-файл содержит исторические значения — код использует интерпретированные.

### Правило 1 — Page Padding (критическое)

**Что показывает Figma:** горизонтальный padding фрейма 1440px = **150px** с каждой стороны.

**Как интерпретировать в коде:**
```css
/* НЕ делать: padding: 0 150px */

/* Делать: */
.page {
  max-width: 1200px;
  margin-inline: auto;
  padding-inline: var(--ctx-space-page-desktop); /* 32px */
}
```

Логика: 150px = 120px (центрирование 1200px на 1440px) + 30px (старый gutter). В коде это раскладывается на `max-width` + `padding-inline: 32px`. Число 150 из Figma в CSS не попадает никогда.

**Мобильный фрейм (360px):** padding 12px → `padding-inline: var(--ctx-space-page-mobile)` (12px, значение верное, интерпретация не нужна).

### Правило 2 — Цвета без семантических переменных

Figma-файл использует примитивные цвета (`Red/Enabled`, `Signal black` и т.д.) вместо Context-переменных. При реализации каждый hex-цвет из Figma переводится по таблице ниже — напрямую в CSS hex не попадает.

Таблица маппинга — в разделе «Цвета» этого файла.

### Правило 3 — T-shirt aliases и SDS-переменные в spacing

Если Figma показывает `Spacing/M`, `Spacing/L` или `var(--sds-size-space-*)` — использовать только числовой эквивалент из таблицы spacing ниже, а из него — соответствующий CSS context-токен.

| Figma (встречается) | Числовой эквивалент | CSS token |
|---|---|---|
| `Spacing/XXS` / `Spacing/200` | 8px | `--ctx-space-inset-sm` / `--ctx-space-stack-sm` / `--ctx-space-inline-sm` |
| `Spacing/S` / `Spacing/400` | 16px | `--ctx-space-inset-md` / `--ctx-space-stack-md` / `--ctx-space-inline-md` |
| `Spacing/M` / `Spacing/600` | 24px | `--ctx-space-inset-lg` |
| `Spacing/L` / `Spacing/800` | 32px | `--ctx-space-stack-lg` |
| `var(--sds-size-space-*)` | по числу (см. таблицу spacing) | по назначению |

### Правило 4 — Radius/M

`Radius/M` = 8px = `Radius/200` → `--ctx-radius-control`.

### Правило 5 — Gill Sans Nova токены

Токены `Body/Medium` и `Utilities/Secondary` с Gill Sans Nova — устаревшие, в коде не используются. При встрече заменять на ближайший `[Desktop]/...` токен с PT Root UI VF.

---

## Цвета — действия

| Figma Context | CSS token | px / hex |
|---|---|---|
| `Context/Color/Action/Primary` | `--ctx-color-action-primary` | `#8F2D29` |
| `Context/Color/Action/PrimaryHover` | `--ctx-color-action-primary-hover` | `#9F322D` |
| `Context/Color/Action/PrimaryActive` | `--ctx-color-action-primary-active` | `#AF3732` |
| `Context/Color/Action/Danger` | `--ctx-color-action-danger` | `#BA6A66` |
| `Context/Color/Action/DangerBg` | `--ctx-color-action-danger-bg` | `#FAF0F0` |

## Цвета — текст

| Figma Context | CSS token | hex |
|---|---|---|
| `Context/Color/Text/Default` | `--ctx-color-text-default` | `#282828` |
| `Context/Color/Text/Secondary` | `--ctx-color-text-secondary` | `#999999` |
| `Context/Color/Text/Disabled` | `--ctx-color-text-disabled` | `#CCCCCC` |
| `Context/Color/Text/Inverse` | `--ctx-color-text-inverse` | `#FEFEFE` |
| `Context/Color/Text/Danger` | `--ctx-color-text-danger` | `#BA6A66` |

## Цвета — фон

| Figma Context | CSS token | hex |
|---|---|---|
| `Context/Color/Bg/Page` | `--ctx-color-bg-page` | `#F7F7F7` |
| `Context/Color/Bg/Surface` | `--ctx-color-bg-surface` | `#FEFEFE` |
| `Context/Color/Bg/Subtle` | `--ctx-color-bg-subtle` | `#F2F2F2` |
| `Context/Color/Bg/SubtleHover` | `--ctx-color-bg-subtle-hover` | `#EDEDED` |

## Цвета — границы

| Figma Context | CSS token | hex |
|---|---|---|
| `Context/Color/Border/Default` | `--ctx-color-border-default` | `#EDEDED` |
| `Context/Color/Border/Danger` | `--ctx-color-border-danger` | `#BA6A66` |

## Цвета — статусы (feedback)

| Figma Context | CSS token | hex |
|---|---|---|
| `Context/Color/Status/Warning` | `--ctx-color-status-warning` | `#F5A12B` |
| `Context/Color/Status/SuccessBg` | `--ctx-color-status-success-bg` | `#E8FCEA` |
| `Context/Color/Status/WarningBg` | `--ctx-color-status-warning-bg` | `#FDF0E2` |
| `Context/Color/Status/DangerBg` | `--ctx-color-status-danger-bg` | `#FFEBEB` |
| `Context/Color/Status/InfoBg` | `--ctx-color-status-info-bg` | `#E9F0FC` |
| `Context/Color/Status/PaymentBg` | `--ctx-color-status-payment-bg` | `#F3E9FB` |
| `Context/Color/Status/NeutralBg` | `--ctx-color-status-neutral-bg` | `#FFF8E4` |

## Цвета — статусы заказа (клиентский UI)

| Figma Context | CSS token bg | CSS token text |
|---|---|---|
| `Context/Color/Order/Created/*` | `--ctx-color-order-created-bg` | `--ctx-color-order-created-text` |
| `Context/Color/Order/Picking/*` | `--ctx-color-order-picking-bg` | `--ctx-color-order-picking-text` |
| `Context/Color/Order/Payment/*` | `--ctx-color-order-payment-bg` | `--ctx-color-order-payment-text` |
| `Context/Color/Order/Delivery/*` | `--ctx-color-order-delivery-bg` | `--ctx-color-order-delivery-text` |
| `Context/Color/Order/Cancelled/*` | `--ctx-color-order-cancelled-bg` | `--ctx-color-order-cancelled-text` |

> Значения: bg = соответствующий Pastel, text = `#282828` кроме Cancelled (`#BA6A66`) и Created (`#8F2D29`)

---

## Spacing

| Figma Context | CSS token | px |
|---|---|---|
| `Context/Space/Inset/SM` | `--ctx-space-inset-sm` | 8 |
| `Context/Space/Inset/MD` | `--ctx-space-inset-md` | 16 |
| `Context/Space/Inset/LG` | `--ctx-space-inset-lg` | 24 |
| `Context/Space/Stack/SM` | `--ctx-space-stack-sm` | 8 |
| `Context/Space/Stack/MD` | `--ctx-space-stack-md` | 16 |
| `Context/Space/Stack/LG` | `--ctx-space-stack-lg` | 32 |
| `Context/Space/Inline/SM` | `--ctx-space-inline-sm` | 8 |
| `Context/Space/Inline/MD` | `--ctx-space-inline-md` | 16 |
| `Context/Space/Page/Desktop` | `--ctx-space-page-desktop` | 32 |
| `Context/Space/Page/Mobile` | `--ctx-space-page-mobile` | 12 |

> При реализации: `max-width: 1200px; margin: 0 auto; padding-inline: var(--ctx-space-page-desktop)`

Figma Primitive → CSS Primitive (числовая шкала):

| Figma Primitive | CSS primitive | px |
|---|---|---|
| `Primitive/Space/100` | `--primitive-space-1` | 4 |
| `Primitive/Space/200` | `--primitive-space-2` | 8 |
| `Primitive/Space/300` | `--primitive-space-3` | 12 |
| `Primitive/Space/400` | `--primitive-space-4` | 16 |
| `Primitive/Space/600` | `--primitive-space-6` | 24 |
| `Primitive/Space/800` | `--primitive-space-8` | 32 |
| `Primitive/Space/1200` | `--primitive-space-12` | 48 |
| `Primitive/Space/1600` | `--primitive-space-16` | 64 |

---

## Border Radius

| Figma Context | CSS token | px |
|---|---|---|
| `Context/Radius/Control` | `--ctx-radius-control` | 8 |
| `Context/Radius/Card` | `--ctx-radius-card` | 16 |
| `Context/Radius/Badge` | `--ctx-radius-badge` | 9999 |
| `Context/Radius/Modal` | `--ctx-radius-modal` | 32 |

Figma Primitive → CSS Primitive:

| Figma Primitive | CSS primitive | px |
|---|---|---|
| `Primitive/Radius/100` | `--primitive-radius-sm` | 4 |
| `Primitive/Radius/200` | `--primitive-radius-md` | 8 |
| `Primitive/Radius/300` | `--primitive-radius-lg` | 12 |
| `Primitive/Radius/400` | `--primitive-radius-xl` | 16 |
| `Primitive/Radius/800` | `--primitive-radius-2xl` | 32 |
| `Primitive/Radius/FULL` | `--primitive-radius-full` | 9999 |

> Замечание: в `SPEC_FRONTEND_ARCHITECTURE.md` `--ctx-radius-card` был 12px (`Radius/300`).
> Исправить на 16px (`Radius/400`) — Figma является источником истины для значений.

---

## Тени

| Figma Effect | CSS token | Описание |
|---|---|---|
| `Drop Shadow/200` | `--ctx-shadow-card` | мягкая двухслойная тень для карточек |
| `Drop Shadow/Modal` | `--ctx-shadow-modal` | глубокая тень для модальных окон |

---

## Типографика

Типографика уже структурирована корректно. Маппинг:

| Figma Variable | CSS token |
|---|---|
| `[Desktop]/Body/Weight 450` | `--ctx-font-size-body` (18px, w450) |
| `[Desktop]/Utilities/Caption` | `--ctx-font-size-caption` (16px, w450) |
| `[Desktop]/Utilities/Secondary` | `--ctx-font-size-label` (14px, w450) |
| `[Desktop]/Headings/Heading 4` | `--ctx-font-size-heading` (20px, w700) |

> Шрифт `PT Root UI VF` — variable font. В CSS: `font-family: 'PT Root UI VF', sans-serif`.
> Указывать `font-weight` числом (450, 500, 600, 700) — variable font поддерживает промежуточные значения.

---

## Связь с `SPEC_FRONTEND_ARCHITECTURE.md`

Единая система токенов для всех контуров (customer, admin, picker, courier).
Специализация происходит **только на уровне component-токенов** — не на уровне primitive и context.

`SPEC_FRONTEND_ARCHITECTURE.md` обновлён в соответствии с Figma-значениями:
primitive.css содержит реальную палитру проекта (red brand, neutral шкала из Figma),
context.css ссылается на неё. Все контуры потребляют одни и те же context-токены.
