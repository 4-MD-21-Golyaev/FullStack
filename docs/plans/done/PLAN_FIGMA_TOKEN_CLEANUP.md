# PLAN: Figma Token Cleanup

## Цель

Привести структуру токенов Figma в соответствие со спецификацией (`SPEC_FRONTEND_ARCHITECTURE.md`).

**Источник истины:**
- Структура и именование — спецификация
- Конкретные значения (hex, px, шрифты) — Figma

После выполнения всех шагов Figma становится источником истины для реализации.

---

## Шаг 1 — Удалить мусор

### 1.1 Spacing — удалить T-shirt aliases

Удалить переменные (оставить только числовую систему `Spacing/N`):

```
Spacing/XXXS
Spacing/XXS
Spacing/XS
Spacing/S
Spacing/M
Spacing/L
Spacing/XL
Spacing/XXL
```

### 1.2 Spacing — удалить SDS-переменные

Удалить переменные, начинающиеся с `var(--sds-size-space-*)`:

```
var(--sds-size-space-050)
var(--sds-size-space-200)
var(--sds-size-space-300)
var(--sds-size-space-400)
var(--sds-size-space-600)
var(--sds-size-space-800)
var(--sds-size-space-1200)
```

### 1.3 Radius — удалить дубль и SDS-мусор

```
Radius/M           ← дублирует Radius/200
var(--sds-size-radius-400)  ← SDS-мусор
```

### 1.4 Typography — удалить legacy Gill Sans Nova

```
Body/Medium        ← Gill Sans Nova, не используется
Utilities/Secondary ← Gill Sans Nova, не используется
```

---

## Шаг 2 — Исправить Page Padding

**Текущее значение:** `Spacing/Page paddings desktop` = 150px
**Правильное значение:** 32px

Логика: `max-width: 1200px` центрируется через `margin: auto`, `padding-inline: 32px` — это и есть page padding.

Переименовать токен для ясности:
- Было: `Spacing/Page paddings desktop`
- Стало: `Spacing/Page padding desktop` = **32**

---

## Шаг 3 — Переименовать цветовые примитивы

Текущие цветовые переменные именуются как `Red/Enabled`, `Signal black` и т.д. —
это не примитивы, а смесь примитивов и состояний.

Создать новую коллекцию **Primitive** с группами по цветовым шкалам.
Значения берутся из текущих Figma-переменных (не меняются).

### Нейтральная шкала

| Новое имя | Значение | Источник (старое имя) |
|---|---|---|
| `Primitive/Color/Neutral/0` | `#FEFEFE` | `White/Enabled` |
| `Primitive/Color/Neutral/50` | `#FCFCFC` | `White/Hovered` |
| `Primitive/Color/Neutral/75` | `#F7F7F7` | `Light gray` |
| `Primitive/Color/Neutral/100` | `#F2F2F2` | `Gray/Enabled` = `White/Focused` |
| `Primitive/Color/Neutral/200` | `#EDEDED` | `Gray/Hovered` |
| `Primitive/Color/Neutral/300` | `#CCCCCC` | `Gray/Disabled` |
| `Primitive/Color/Neutral/400` | `#9C9999` | `Dark Gray/Enabled` |
| `Primitive/Color/Neutral/500` | `#999999` | `Gray contrast` |
| `Primitive/Color/Neutral/900` | `#282828` | `Signal black` |

### Красная/акцентная шкала (бренд)

| Новое имя | Значение | Источник |
|---|---|---|
| `Primitive/Color/Red/300` | `#AF3732` | `Red/Focused` |
| `Primitive/Color/Red/400` | `#9F322D` | `Red/Hovered` |
| `Primitive/Color/Red/500` | `#8F2D29` | `Red/Enabled` |
| `Primitive/Color/Red/700` | `#620C04` | `Red/Disabled` |
| `Primitive/Color/Red/900` | `#500A03` | `Ripe Wine` |

### Error/Destructive

| Новое имя | Значение | Источник |
|---|---|---|
| `Primitive/Color/Error/500` | `#BA6A66` | `Error \| Destructive/Enabled` |
| `Primitive/Color/Error/50` | `#FAF0F0` | `Error \| Destructive/Background` |

### Прочие акценты

| Новое имя | Значение | Источник |
|---|---|---|
| `Primitive/Color/Orange/400` | `#F5A12B` | `Orange` |

### Пастельная шкала (фоны тегов/статусов)

| Новое имя | Значение | Источник |
|---|---|---|
| `Primitive/Color/Pastel/Cream` | `#FFF8E4` | `Pastel/Cream` |
| `Primitive/Color/Pastel/Orange` | `#FDF0E2` | `Pastel/Orange` |
| `Primitive/Color/Pastel/Green` | `#E8FCEA` | `Pastel/Green` |
| `Primitive/Color/Pastel/Pink` | `#FFEBEB` | `Pastel/Pink` |
| `Primitive/Color/Pastel/Blue` | `#E9F0FC` | `Pastel/Blue` |
| `Primitive/Color/Pastel/Purple` | `#F3E9FB` | `Pastel/Purple` |

---

## Шаг 4 — Добавить Context-слой (семантические псевдонимы)

Создать коллекцию **Context** — все переменные ссылаются на Primitive, не содержат raw-значений.

### Текст

| Переменная | Ссылка |
|---|---|
| `Context/Color/Text/Default` | → `Primitive/Color/Neutral/900` |
| `Context/Color/Text/Secondary` | → `Primitive/Color/Neutral/500` |
| `Context/Color/Text/Disabled` | → `Primitive/Color/Neutral/300` |
| `Context/Color/Text/Inverse` | → `Primitive/Color/Neutral/0` |
| `Context/Color/Text/Danger` | → `Primitive/Color/Error/500` |

### Фон

| Переменная | Ссылка |
|---|---|
| `Context/Color/Bg/Page` | → `Primitive/Color/Neutral/75` |
| `Context/Color/Bg/Surface` | → `Primitive/Color/Neutral/0` |
| `Context/Color/Bg/Subtle` | → `Primitive/Color/Neutral/100` |
| `Context/Color/Bg/SubtleHover` | → `Primitive/Color/Neutral/200` |

### Границы

| Переменная | Ссылка |
|---|---|
| `Context/Color/Border/Default` | → `Primitive/Color/Neutral/200` |
| `Context/Color/Border/Danger` | → `Primitive/Color/Error/500` |

### Действия (кнопки, ссылки)

| Переменная | Ссылка |
|---|---|
| `Context/Color/Action/Primary` | → `Primitive/Color/Red/500` |
| `Context/Color/Action/PrimaryHover` | → `Primitive/Color/Red/400` |
| `Context/Color/Action/PrimaryActive` | → `Primitive/Color/Red/300` |
| `Context/Color/Action/Danger` | → `Primitive/Color/Error/500` |
| `Context/Color/Action/DangerBg` | → `Primitive/Color/Error/50` |

### Статусы (feedback)

| Переменная | Ссылка |
|---|---|
| `Context/Color/Status/Warning` | → `Primitive/Color/Orange/400` |
| `Context/Color/Status/SuccessBg` | → `Primitive/Color/Pastel/Green` |
| `Context/Color/Status/WarningBg` | → `Primitive/Color/Pastel/Orange` |
| `Context/Color/Status/DangerBg` | → `Primitive/Color/Pastel/Pink` |
| `Context/Color/Status/InfoBg` | → `Primitive/Color/Pastel/Blue` |
| `Context/Color/Status/PaymentBg` | → `Primitive/Color/Pastel/Purple` |
| `Context/Color/Status/NeutralBg` | → `Primitive/Color/Pastel/Cream` |

### Статусы заказа (бейджи в клиентском UI)

| Переменная | Ссылка (bg) | Ссылка (text) |
|---|---|---|
| `Context/Color/Order/Created/Bg` | → `Primitive/Color/Pastel/Blue` | — |
| `Context/Color/Order/Created/Text` | → `Primitive/Color/Red/500` | — |
| `Context/Color/Order/Picking/Bg` | → `Primitive/Color/Pastel/Orange` | — |
| `Context/Color/Order/Picking/Text` | → `Primitive/Color/Neutral/900` | — |
| `Context/Color/Order/Payment/Bg` | → `Primitive/Color/Pastel/Purple` | — |
| `Context/Color/Order/Payment/Text` | → `Primitive/Color/Neutral/900` | — |
| `Context/Color/Order/Delivery/Bg` | → `Primitive/Color/Pastel/Green` | — |
| `Context/Color/Order/Delivery/Text` | → `Primitive/Color/Neutral/900` | — |
| `Context/Color/Order/Cancelled/Bg` | → `Primitive/Color/Pastel/Pink` | — |
| `Context/Color/Order/Cancelled/Text` | → `Primitive/Color/Error/500` | — |

---

## Шаг 5 — Переименовать Spacing и Radius

### Spacing (числовая система остаётся, уточнить именование)

Текущие `Spacing/N` → переименовать в `Primitive/Space/N` для соответствия спецификации.
Значения не меняются.

| Было | Стало | px |
|---|---|---|
| `Spacing/50` | `Primitive/Space/50` | 2 |
| `Spacing/100` | `Primitive/Space/100` | 4 |
| `Spacing/200` | `Primitive/Space/200` | 8 |
| `Spacing/300` | `Primitive/Space/300` | 12 |
| `Spacing/400` | `Primitive/Space/400` | 16 |
| `Spacing/600` | `Primitive/Space/600` | 24 |
| `Spacing/800` | `Primitive/Space/800` | 32 |
| `Spacing/1200` | `Primitive/Space/1200` | 48 |
| `Spacing/1600` | `Primitive/Space/1600` | 64 |
| `Spacing/3200` | `Primitive/Space/3200` | 128 |
| `Spacing/Page padding desktop` | `Primitive/Space/Page padding desktop` | 32 |
| `Spacing/Page paddings mobile` | `Primitive/Space/Page padding mobile` | 12 |

### Radius

| Было | Стало | px |
|---|---|---|
| `Radius/100` | `Primitive/Radius/100` | 4 |
| `Radius/200` | `Primitive/Radius/200` | 8 |
| `Radius/300` | `Primitive/Radius/300` | 12 |
| `Radius/400` | `Primitive/Radius/400` | 16 |
| `Radius/800` | `Primitive/Radius/800` | 32 |
| `Radius/FULL` | `Primitive/Radius/FULL` | 9999 |

---

## Шаг 6 — Добавить Context Spacing и Radius

Context-слой для spacing и radius — по аналогии с цветами.

### Context Spacing

| Переменная | Ссылка | Назначение |
|---|---|---|
| `Context/Space/Inset/SM` | → `Primitive/Space/200` (8px) | padding маленьких компонентов |
| `Context/Space/Inset/MD` | → `Primitive/Space/400` (16px) | padding кнопок, инпутов |
| `Context/Space/Inset/LG` | → `Primitive/Space/600` (24px) | padding карточек |
| `Context/Space/Stack/SM` | → `Primitive/Space/200` (8px) | вертикальный gap мелкий |
| `Context/Space/Stack/MD` | → `Primitive/Space/400` (16px) | вертикальный gap средний |
| `Context/Space/Stack/LG` | → `Primitive/Space/800` (32px) | вертикальный gap крупный |
| `Context/Space/Inline/SM` | → `Primitive/Space/200` (8px) | горизонтальный gap (иконка+текст) |
| `Context/Space/Inline/MD` | → `Primitive/Space/400` (16px) | горизонтальный gap средний |
| `Context/Space/Page/Desktop` | → `Primitive/Space/Page padding desktop` (32px) | padding страницы |
| `Context/Space/Page/Mobile` | → `Primitive/Space/Page padding mobile` (12px) | padding страницы mobile |

### Context Radius

| Переменная | Ссылка | Назначение |
|---|---|---|
| `Context/Radius/Control` | → `Primitive/Radius/200` (8px) | кнопки, инпуты |
| `Context/Radius/Card` | → `Primitive/Radius/400` (16px) | карточки |
| `Context/Radius/Badge` | → `Primitive/Radius/FULL` (9999px) | бейджи |
| `Context/Radius/Modal` | → `Primitive/Radius/800` (32px) | модальные окна |

---

## Шаг 7 — Добавить тень для модальных окон

Текущая `Drop Shadow/200` используется для карточек. Добавить:

**`Drop Shadow/Modal`** (более глубокая):
- 2 слоя: `rgba(0,0,0, 0.12)` offset (0, 4) blur 6 + `rgba(0,0,0, 0.20)` offset (0, 10) blur 20

---

## Итог: структура Variable collections в Figma

```
Primitive/
├── Color/
│   ├── Neutral/   (0, 50, 75, 100, 200, 300, 400, 500, 900)
│   ├── Red/       (300, 400, 500, 700, 900)
│   ├── Error/     (50, 500)
│   ├── Orange/    (400)
│   └── Pastel/    (Cream, Orange, Green, Pink, Blue, Purple)
├── Space/         (50...3200, Page padding desktop/mobile)
└── Radius/        (100, 200, 300, 400, 800, FULL)

Context/
├── Color/
│   ├── Text/      (Default, Secondary, Disabled, Inverse, Danger)
│   ├── Bg/        (Page, Surface, Subtle, SubtleHover)
│   ├── Border/    (Default, Danger)
│   ├── Action/    (Primary, PrimaryHover, PrimaryActive, Danger, DangerBg)
│   ├── Status/    (Warning, SuccessBg, WarningBg, DangerBg, InfoBg, PaymentBg, NeutralBg)
│   └── Order/     (Created, Picking, Payment, Delivery, Cancelled — по Bg и Text)
├── Space/
│   ├── Inset/     (SM, MD, LG)
│   ├── Stack/     (SM, MD, LG)
│   ├── Inline/    (SM, MD)
│   └── Page/      (Desktop, Mobile)
└── Radius/        (Control, Card, Badge, Modal)
```

Typography и Drop Shadow — остаются в текущих коллекциях (они уже структурированы корректно).
