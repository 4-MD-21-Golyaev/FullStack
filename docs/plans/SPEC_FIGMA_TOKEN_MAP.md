# SPEC: Figma → Code Token Mapping

## Статус: К исполнению

---

## Проблема

Figma-файл использует упрощённую систему токенов, которая не совпадает с трёхслойной архитектурой
спецификации (`primitive → context → component`):

| Что есть в Figma | Что требует спецификация |
|---|---|
| Цвета заданы как стили `color/state` | Три слоя: `primitive` → `ctx-color-*` → `component-token` |
| Spacing и radius используются как примитивы напрямую | Только через context-токены в компонентах |
| Нет context-слоя (семантических псевдонимов) | `--ctx-color-action-primary`, `--ctx-space-inset-md` и т.д. |
| Нет component-слоя | `--button-primary-bg`, `--card-padding` и т.д. |

**Figma остаётся неизменной.** Несоответствие устраняется на этапе реализации через карту маппинга,
которая работает как фильтр: при реализации компонента по Figma-экспорту — используется не имя из
Figma, а соответствующий токен спецификации.

---

## Принцип работы

```
Figma-экспорт          Карта маппинга           Код (CSS Module)
──────────────         ──────────────────        ─────────────────────────
color/primary    ───►  figma → spec lookup  ───► var(--button-primary-bg)
color/state/     ───►                       ───► var(--ctx-color-order-*)
spacing/4        ───►                       ───► var(--ctx-space-inset-md)
radius/md        ───►                       ───► var(--button-radius)
```

Я (AI-агент) не копирую Figma-имена в CSS. Вместо этого я:
1. Нахожу элемент в Figma-экспорте
2. Ищу его Figma-имя в карте ниже
3. Использую соответствующий токен спецификации

---

## Карта маппинга

### Цвета — действия и UI

| Figma style | Spec token | Слой |
|---|---|---|
| `color/primary` | `--ctx-color-action-primary` | context |
| `color/primary-hover` | `--ctx-color-action-primary-hover` | context |
| `color/danger` | `--ctx-color-action-danger` | context |
| `color/danger-hover` | `--ctx-color-action-danger-hover` | context |

### Цвета — текст

| Figma style | Spec token | Слой |
|---|---|---|
| `color/text/default` | `--ctx-color-text-default` | context |
| `color/text/secondary` | `--ctx-color-text-secondary` | context |
| `color/text/disabled` | `--ctx-color-text-disabled` | context |
| `color/text/inverse` | `--ctx-color-text-inverse` | context |
| `color/text/link` | `--ctx-color-text-link` | context |
| `color/text/danger` | `--ctx-color-text-danger` | context |

### Цвета — фон

| Figma style | Spec token | Слой |
|---|---|---|
| `color/bg/page` | `--ctx-color-bg-page` | context |
| `color/bg/surface` | `--ctx-color-bg-surface` | context |
| `color/bg/subtle` | `--ctx-color-bg-subtle` | context |
| `color/bg/overlay` | `--ctx-color-bg-overlay` | context |

### Цвета — статусы заказа (`color/state/*`)

| Figma style | Spec token | Слой |
|---|---|---|
| `color/state/created` | `--ctx-color-order-created` | context |
| `color/state/picking` | `--ctx-color-order-picking` | context |
| `color/state/payment` | `--ctx-color-order-payment` | context |
| `color/state/delivery-assigned` | `--ctx-color-order-delivery-assigned` | context |
| `color/state/out-for-delivery` | `--ctx-color-order-out-for-delivery` | context |
| `color/state/delivered` | `--ctx-color-order-delivered` | context |
| `color/state/closed` | `--ctx-color-order-closed` | context |
| `color/state/cancelled` | `--ctx-color-order-cancelled` | context |

### Цвета — обратная связь

| Figma style | Spec token | Слой |
|---|---|---|
| `color/status/success` | `--ctx-color-status-success` | context |
| `color/status/warning` | `--ctx-color-status-warning` | context |
| `color/status/danger` | `--ctx-color-status-danger` | context |
| `color/status/info` | `--ctx-color-status-info` | context |

### Spacing

Figma экспортирует spacing как числовые значения или именованные шаги (`spacing/4`, `8px` и т.д.).
Маппинг строится по **назначению** в компоненте, а не по числовому значению:

| Контекст использования | Spec token | Primitive значение |
|---|---|---|
| Padding внутри маленького компонента (badge, chip) | `--ctx-space-inset-sm` | 8px |
| Padding внутри кнопки, инпута, ячейки таблицы | `--ctx-space-inset-md` | 16px |
| Padding внутри карточки, секции | `--ctx-space-inset-lg` | 24px |
| Вертикальный gap между элементами списка (мелкий) | `--ctx-space-stack-sm` | 8px |
| Вертикальный gap между блоками | `--ctx-space-stack-md` | 16px |
| Вертикальный gap между крупными секциями | `--ctx-space-stack-lg` | 32px |
| Горизонтальный gap внутри строки (иконка + текст) | `--ctx-space-inline-sm` | 8px |
| Горизонтальный gap между элементами | `--ctx-space-inline-md` | 16px |

> Если Figma задаёт spacing напрямую числом (например `16px`) — определяю контекст и выбираю
> соответствующий context-токен. Числовое значение в CSS не используется.

### Border radius

| Figma style / значение | Spec token | Назначение |
|---|---|---|
| `radius/sm` / `4px` | `--primitive-radius-sm` | только если нет подходящего ctx |
| `radius/md` / `8px` | `--ctx-radius-control` | кнопки, инпуты, теги |
| `radius/lg` / `12px` | `--ctx-radius-card` | карточки |
| `radius/xl` / `16px` | `--ctx-radius-modal` | модальные окна |
| `radius/full` / `9999px` | `--ctx-radius-badge` | бейджи, аватары |

### Типографика

| Figma style | Spec token |
|---|---|
| `text/body` / 16px regular | `--ctx-font-size-body` + `--primitive-font-weight-regular` |
| `text/label` / 14px medium | `--ctx-font-size-label` + `--primitive-font-weight-medium` |
| `text/caption` / 12px | `--ctx-font-size-caption` |
| `text/heading` / 20px | `--ctx-font-size-heading` |

### Тени

| Figma style | Spec token |
|---|---|
| Shadow / card / sm | `--ctx-shadow-card` |
| Shadow / modal / lg | `--ctx-shadow-modal` |

---

## Правила применения маппинга

### 1. Приоритет component-токена над context

Если для компонента есть component-токен — использовать его, не context напрямую:

```css
/* ✅ Правильно — через component-токен */
.root { border-radius: var(--button-radius); }

/* ❌ Неправильно — context напрямую в компоненте, у которого есть свой токен */
.root { border-radius: var(--ctx-radius-control); }
```

Исключение: если component-токен не определён для данного свойства — допустимо использовать
context-токен.

### 2. Spacing по назначению, не по значению

Figma может показать `gap: 8px`. В коде не пишем `8px` и не ищем примитив `--primitive-space-2`.
Спрашиваем: *что это за gap?* Если это горизонтальный gap между иконкой и текстом — `--ctx-space-inline-sm`.

### 3. Незнакомые цвета из Figma

Если Figma-стиль не найден в карте выше:
1. Определить семантику цвета (action? status? text? bg?)
2. Найти ближайший context-токен по смыслу
3. Если не подходит ни один — добавить новый context-токен в `context.css` (не использовать primitive напрямую)
4. Зафиксировать добавление в этом файле

### 4. Figma-стили без аналога в спецификации

Если в Figma есть стиль, для которого в спецификации нет токена (например специфический hover-цвет
для sidebar-item), — добавить component-токен в `component.css`:

```css
/* tokens/component.css */
--sidebar-item-active-bg: rgba(255,255,255,0.08);  /* нет primitive для alpha-white — допустимое исключение */
```

---

## Обновление карты при работе с MCP

Когда будет подключён Figma MCP-сервер, карта уточняется:

1. Читаю все стили из Figma-файла
2. Сопоставляю фактические имена (`color/state/created`) с предположительными в таблицах выше
3. Корректирую таблицы — добавляю несовпадающие имена, удаляю несуществующие
4. Фиксирую результат в этом файле как финальную карту

До подключения MCP — таблицы выше описывают **ожидаемые** имена стилей на основе типичных
Figma-конвенций и информации о структуре файла.

---

## Что НЕ является частью этой спецификации

- Изменения в Figma-файле — файл остаётся неизменным
- Переименование Figma-стилей — не требуется
- Экспорт токенов через плагины (Tokens Studio и т.д.) — не используется

Вся трансформация происходит **в голове агента** при реализации компонента: Figma показывает
визуал → агент применяет маппинг → в CSS появляются правильные `var()`.