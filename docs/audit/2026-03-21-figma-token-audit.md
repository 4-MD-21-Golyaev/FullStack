# Figma Token Audit — 2026-03-21

Файл: `eV3fLo7RMJcyNqnFeuwHmg` (ВКР · страница Design)
Фреймы: Desktop 1440px, Mobile 360px

---

## Контекст

Figma-файл — это дизайн **клиентского frontend** (Main, Catalog, Product, Cart, Checkout, Personal Cabinet).
Admin/Picker/Courier дизайна в Figma нет — их спецификация (`SPEC_FRONTEND_ARCHITECTURE.md`) определена
отдельно с собственной палитрой (blue-based). Ниже анализируются только токены клиентского дизайна.

---

## Проблема 1 — Page Padding (критическая)

### Текущее состояние

Токен `Spacing/Page paddings desktop` = **150px** — применяется как горизонтальный padding фрейма 1440px,
что даёт контент-зону **1140px** (1440 − 2×150).

### Что имелось в виду

> «максимальная ширина контента 1200 и паддинги 30» (хотят изменить паддинги на 32)

Это означало: контейнер шириной 1200px, центрированный на 1440px, с внутренним padding 30px:

```
[  120px margin  |  30px  |  контент 1140px  |  30px  |  120px margin  ]
                  └──────────────────────────────────┘
                            итого 1200px
```

Отсюда 120 + 30 = **150px** от края — значение верное по сумме, но **концептуально ошибочное**:
в Figma это единое число скрывает два разных понятия (отступ до контейнера и внутренний gutter).

### Что должно быть

```
[  120px margin  |  32px  |  контент 1136px  |  32px  |  120px margin  ]
                  └──────────────────────────────────┘
                            итого 1200px
```

**Правильное значение токена** = 120 + 32 = **152px** (если оставить единым числом).
Либо — разбить на два токена:

| Токен | Значение | Назначение |
|---|---|---|
| `Spacing/Page margin desktop` | 120px | расстояние от края 1440 до контейнера |
| `Spacing/Page padding desktop` | 32px | внутренний gutter контейнера |

Мобильный `Spacing/Page paddings mobile` = 12px — оставить, актуально.

**Во всех фреймах** нужно обновить горизонтальные padding с 150 → 152
(или перестроить на Auto Layout с двумя токенами).

---

## Проблема 2 — Цвета: нет семантического слоя

### Текущее состояние

Все цвета — **примитивы**, именованные по оттенку + состоянию.
Семантического слоя (типа `color/primary`, `color/surface`, `color/text/default`) нет.

### Полный список фактических Figma-имён

| Figma-токен | Hex | Роль в UI |
|---|---|---|
| `Signal black` | `#282828` | основной текст |
| `Gray contrast` | `#999999` | вторичный текст, placeholder |
| `Gray/Disabled` | `#CCCCCC` | отключённый текст |
| `Dark Gray/Enabled` | `#9C9999` | вторичные иконки |
| `White/Enabled` | `#FEFEFE` | обратный текст, фон поверхности |
| `White/Hovered` | `#FCFCFC` | hover белого |
| `White/Focused` | `#F2F2F2` | focus/pressed белого |
| `Light gray` | `#F7F7F7` | фон страницы |
| `Gray/Enabled` | `#F2F2F2` | тонкий фон (subtle) |
| `Gray/Hovered` | `#EDEDED` | hover серого фона / граница |
| `Red/Enabled` | `#8F2D29` | основной акцент (CTA, кнопки) |
| `Red/Hovered` | `#9F322D` | hover акцента |
| `Red/Focused` | `#AF3732` | focus/active акцента |
| `Red/Disabled` | `#620C04` | disabled акцента |
| `Ripe Wine` | `#500A03` | тёмно-бордовый (декоративный) |
| `Orange` | `#F5A12B` | предупреждение, акцентный скидки |
| `Error \| Destructive/Enabled` | `#BA6A66` | деструктивное действие |
| `Error \| Destructive/Background` | `#FAF0F0` | фон ошибки |
| `Pastel/Cream` | `#FFF8E4` | фон тега/категории (нейтральный) |
| `Pastel/Orange` | `#FDF0E2` | фон тега оранжевый |
| `Pastel/Green` | `#E8FCEA` | фон успеха / доставлено |
| `Pastel/Pink` | `#FFEBEB` | фон ошибки / отменено |
| `Pastel/Blue` | `#E9F0FC` | фон информации |
| `Pastel/Purple` | `#F3E9FB` | фон оплаты |

### Как это должно выглядеть (требуемый маппинг)

> Это исправление `SPEC_FIGMA_TOKEN_MAP.md` — предполагаемые имена в том файле неверны.
> Фактические имена — в колонке «Figma-токен» выше.

| Figma-токен (факт) | Целевой CSS-токен | Слой |
|---|---|---|
| `Red/Enabled` | `--ctx-color-action-primary` | context |
| `Red/Hovered` | `--ctx-color-action-primary-hover` | context |
| `Red/Focused` | `--ctx-color-action-primary-active` | context (новый) |
| `Red/Disabled` | (через `opacity: 0.5` на компоненте, токен не нужен) | — |
| `Error \| Destructive/Enabled` | `--ctx-color-action-danger` | context |
| `Error \| Destructive/Background` | `--ctx-color-action-danger-bg` | context (новый) |
| `Signal black` | `--ctx-color-text-default` | context |
| `Gray contrast` | `--ctx-color-text-secondary` | context |
| `Gray/Disabled` | `--ctx-color-text-disabled` | context |
| `White/Enabled` | `--ctx-color-text-inverse` | context |
| `White/Enabled` | `--ctx-color-bg-surface` | context (второй alias) |
| `Light gray` | `--ctx-color-bg-page` | context |
| `Gray/Enabled` | `--ctx-color-bg-subtle` | context |
| `Gray/Hovered` | `--ctx-color-bg-subtle-hover` | context (новый) |
| `Gray/Hovered` | `--ctx-color-border-default` | context (второй alias) |
| `Orange` | `--ctx-color-status-warning` | context |
| `Pastel/Green` | `--ctx-color-status-success-bg` | context (новый) |
| `Pastel/Pink` | `--ctx-color-status-danger-bg` | context (новый) |
| `Pastel/Blue` | `--ctx-color-status-info-bg` | context (новый) |
| `Pastel/Purple` | `--ctx-color-status-payment-bg` | context (новый) |
| `Pastel/Orange` | `--ctx-color-status-warning-bg` | context (новый) |
| `Pastel/Cream` | `--ctx-color-bg-tag-neutral` | context (новый) |
| `Ripe Wine` | `--ctx-color-brand-dark` | context (новый, декоративный) |
| `Dark Gray/Enabled` | `--ctx-color-icon-secondary` | context (новый) |

### Статусы заказа (пастели)

Текущий `SPEC_FRONTEND_ARCHITECTURE.md` определял статусы заказа как сплошные цвета
(`--ctx-color-order-created: blue-500` и т.д.) — это для admin-панели.
Для клиентского UI статусы используют **пастельные фоны** из Figma:

| Статус | Пастель | Текст |
|---|---|---|
| Оформлен / CREATED | `Pastel/Blue` `#E9F0FC` | `Red/Enabled` `#8F2D29` |
| Сборка / PICKING | `Pastel/Orange` `#FDF0E2` | `Signal black` |
| Оплата / PAYMENT | `Pastel/Purple` `#F3E9FB` | `Signal black` |
| Доставляется / DELIVERY | `Pastel/Green` `#E8FCEA` | `Signal black` |
| Доставлен | `Pastel/Green` `#E8FCEA` | `Signal black` |
| Отменён | `Pastel/Pink` `#FFEBEB` | `Error | Destructive/Enabled` |

---

## Проблема 3 — Spacing: тройное дублирование

### Текущее состояние

В файле одновременно существуют **три** системы для одних и тех же значений:

**Числовая** (Figma-нативная):

| Токен | px |
|---|---|
| `Spacing/50` | 2 |
| `Spacing/100` | 4 |
| `Spacing/200` | 8 |
| `Spacing/300` | 12 |
| `Spacing/400` | 16 |
| `Spacing/600` | 24 |
| `Spacing/800` | 32 |
| `Spacing/1200` | 48 |
| `Spacing/1600` | 64 |
| `Spacing/3200` | 128 |

**T-shirt aliases** (дублируют числовые):

| Токен | px |
|---|---|
| `Spacing/XXXS` | 4 |
| `Spacing/XXS` | 8 |
| `Spacing/XS` | 12 |
| `Spacing/S` | 16 |
| `Spacing/M` | 24 |
| `Spacing/L` | 32 |
| `Spacing/XL` | 48 |
| `Spacing/XXL` | 64 |

**SDS CSS-переменные** (утёк из внешней дизайн-системы, не относится к проекту):

`var(--sds-size-space-050)` = 2, `var(--sds-size-space-200)` = 8, `var(--sds-size-space-300)` = 12,
`var(--sds-size-space-400)` = 16, `var(--sds-size-space-600)` = 24, `var(--sds-size-space-800)` = 32,
`var(--sds-size-space-1200)` = 48

### Что делать

1. **Удалить** T-shirt aliases — они не добавляют смысла, только путаницу.
2. **Удалить** все `var(--sds-size-space-*)` — это мусор из чужой системы.
3. **Оставить** только числовую систему `Spacing/N` — она совпадает с `--primitive-space-N` из спецификации.
4. **Маппинг** в CSS (уже определён в `SPEC_FRONTEND_ARCHITECTURE.md`) остаётся без изменений:

| Figma `Spacing/N` | Primitive CSS | px |
|---|---|---|
| `Spacing/100` | `--primitive-space-1` | 4 |
| `Spacing/200` | `--primitive-space-2` | 8 |
| `Spacing/300` | `--primitive-space-3` | 12 |
| `Spacing/400` | `--primitive-space-4` | 16 |
| `Spacing/600` | `--primitive-space-6` | 24 |
| `Spacing/800` | `--primitive-space-8` | 32 |
| `Spacing/1200` | `--primitive-space-12` | 48 |
| `Spacing/1600` | `--primitive-space-16` | 64 |

`Spacing/50` = 2px и `Spacing/3200` = 128px не имеют аналогов в текущей спецификации — добавить или игнорировать по необходимости.

---

## Проблема 4 — Border Radius: смешанные конвенции + SDS-мусор

### Текущее состояние

| Токен | px | Проблема |
|---|---|---|
| `Radius/100` | 4 | OK (числовая система) |
| `Radius/200` | 8 | OK |
| `Radius/M` | 8 | **Дубль** `Radius/200` — T-shirt alias |
| `Radius/300` | 12 | OK |
| `Radius/400` | 16 | OK |
| `var(--sds-size-radius-400)` | 16 | **Мусор** из SDS |
| `Radius/800` | 32 | OK |
| `Radius/FULL` | 9999 | OK |

### Что делать

1. **Удалить** `Radius/M` — дубль `Radius/200`.
2. **Удалить** `var(--sds-size-radius-400)` — SDS-мусор.
3. Нет `Radius/50` (4px?) и `Radius/NONE` (0) — добавить если нужны.

**Маппинг** Figma → CSS:

| Figma `Radius/N` | CSS-токен | Назначение |
|---|---|---|
| `Radius/100` | `--primitive-radius-sm` (4px) | мелкие акценты |
| `Radius/200` | `--ctx-radius-control` (8px) | кнопки, инпуты |
| `Radius/300` | *(нет в спецификации, добавить)* | — |
| `Radius/400` | `--ctx-radius-card` (→ изменить с 12px на 16px) | карточки |
| `Radius/800` | *(нет в спецификации)* | крупные блоки |
| `Radius/FULL` | `--ctx-radius-badge` (9999px) | бейджи, аватары |

> **Замечание:** в спецификации `--ctx-radius-card = --primitive-radius-lg = 12px`,
> но в Figma карточки используют `Radius/400 = 16px`. Нужно скорректировать спецификацию.

---

## Проблема 5 — Тени: не хватает модальной

### Текущее состояние

Определён только один эффект:

**`Drop Shadow/200`** — двухслойная мягкая тень:
- `rgba(12,12,13, 0.05)`, offset (0, 1), blur 4, spread 0
- `rgba(12,12,13, 0.10)`, offset (0, 1), blur 4, spread 0

Соответствует `--ctx-shadow-card` из спецификации.

### Что делать

Добавить `Drop Shadow/Modal` (соответствует `--ctx-shadow-modal`):
- Более глубокая, например: `rgba(0,0,0, 0.15)`, offset (0, 10), blur 15, spread 0

---

## Проблема 6 — Устаревшие типографические токены

Два токена без платформенного префикса используют **Gill Sans Nova** (не PT Root UI VF):

| Токен | Шрифт | Статус |
|---|---|---|
| `Body/Medium` | Gill Sans Nova, 18px, 500 | **Legacy, удалить** |
| `Utilities/Secondary` | Gill Sans Nova, 14px, 400 | **Legacy, удалить** |

Всё остальное — `PT Root UI VF` (variable font) с префиксами `[Desktop]/` и `[Mobile]/`. Это в порядке.

---

## Итоговая карта проблем

| # | Проблема | Приоритет | Действие |
|---|---|---|---|
| 1 | Page padding = 150px (должно быть 152px или два отдельных токена) | Высокий | Изменить токен / перестроить Auto Layout |
| 2 | Нет семантического слоя цветов | Высокий | Добавить Variables с семантическими именами, привязать к примитивам |
| 3 | Тройная дублирующая система spacing | Средний | Удалить T-shirt aliases и SDS vars |
| 4 | `Radius/M` дубль + SDS-мусор в radius | Низкий | Удалить дубли |
| 5 | Нет тени для модальных окон | Низкий | Добавить `Drop Shadow/Modal` |
| 6 | Два legacy Gill Sans Nova токена | Низкий | Удалить |

---

## Ошибки в `SPEC_FIGMA_TOKEN_MAP.md`

Файл написан на основе **предполагаемых** имён Figma-стилей (`color/primary`, `color/state/created`).
Эти имена в файле **не существуют**. Файл нужно полностью переписать с использованием
фактических имён из таблицы выше (Проблема 2).

Конкретные несоответствия:

| Предположение в SPEC_FIGMA_TOKEN_MAP.md | Фактическое имя в Figma |
|---|---|
| `color/primary` | `Red/Enabled` |
| `color/primary-hover` | `Red/Hovered` |
| `color/danger` | `Error \| Destructive/Enabled` |
| `color/text/default` | `Signal black` |
| `color/text/secondary` | `Gray contrast` |
| `color/text/disabled` | `Gray/Disabled` |
| `color/text/inverse` | `White/Enabled` |
| `color/bg/page` | `Light gray` |
| `color/bg/surface` | `White/Enabled` |
| `color/bg/subtle` | `Gray/Enabled` |
| `color/state/created` | *(нет — только пастели, см. таблицу статусов)* |
| `color/state/picking` | *(нет)* |
| `color/status/success` | *(нет прямого — только `Pastel/Green` как bg)* |
| `color/status/warning` | `Orange` |
| `color/status/danger` | `Error \| Destructive/Enabled` |

> После исправления Figma `SPEC_FIGMA_TOKEN_MAP.md` нужно обновить в соответствии с этим аудитом.
