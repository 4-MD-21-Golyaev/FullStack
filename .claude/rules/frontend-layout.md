---
name: frontend-layout
description: Customer-facing layout system — Container, Grid, CSS patterns, tokens, breakpoints
paths:
  - "src/app/(customer)/**"
  - "src/shared/ui/layout/**"
  - "src/widgets/customer/**"
---

# Customer Layout & Grid System

## Токены

**Layout (context.css):**
```
--ctx-grid-columns:      12       — число колонок
--ctx-grid-gutter:       12px     — gap между колонками и карточками
--ctx-layout-max-width:  1200px   — максимальная ширина контента
--ctx-layout-narrow-width: 480px  — узкий центрированный контент
```

**Отступы страницы (primitive.css — использовать напрямую):**
```
--primitive-space-800  = 32px  — боковые отступы desktop
--primitive-space-300  = 12px  — боковые отступы mobile
```

Стандартные брейкпоинты: `1200px`, `900px`, `600px`. Не изобретать свои.

---

## Три паттерна — выбирать по ситуации

### 1. Обёртка страницы → `<Container>`

Любой customer-facing контейнер с ограниченной шириной. Заменяет ручной `max-width + margin-inline + padding-inline`.

```tsx
<Container className={styles.pageInner}>...</Container>
```

- Вертикальные отступы — через `className` на самом `Container`
- Никогда не дублировать `max-width`/`padding-inline` вручную в CSS Module

### 2. Смешанные колонки из Figma → `<Grid>` + `<GridItem>`

Только когда элементы в одной строке занимают **разное** число колонок — как в Figma-сетке.

```tsx
<Grid>
  <GridItem span={8} spanSm={12}><Banner /></GridItem>
  <GridItem span={4} spanSm={12}><Card /></GridItem>
</Grid>
```

- `span` — desktop (обязательный)
- `spanLg` ≤1200px, `spanMd` ≤900px, `spanSm` ≤600px — опциональны, наследуются от более широкого
- Адаптив работает через CSS custom properties на элементе — JS не нужен

**Не применять** для однородных сеток (все элементы одинаковой ширины) — там CSS Module проще.

### 3. Однородные сетки и sidebar+content → CSS Modules

**Продуктовые сетки:**
```css
.grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--ctx-grid-gutter);
}
@media (max-width: 900px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }
```

**Sidebar + content (4 + 8 колонок):**
```css
.layout {
  display: grid;
  grid-template-columns: 4fr minmax(0, 8fr);
  gap: var(--ctx-grid-gutter);
  align-items: start;
}
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar { display: none; }
}
```

---

## Обязательные правила

- **`minmax(0, ...)` для контентных колонок** — `fr` без него = `minmax(auto, fr)`, трек расширяется под контент и ломает лейаут. Всегда: `minmax(0, Xfr)` или `minmax(0, 1fr)`.
- **Spacing — только `--primitive-space-*`** напрямую в CSS Modules. Создавать `ctx-space-*` или component-level spacing токены ЗАПРЕЩЕНО.
- **Цвет, радиус, шрифт, тени — только `--ctx-*`** токены. `--primitive-color-*` и прочие примитивы не для spacing запрещены в CSS Modules.
- **Числовые значения запрещены** для `max-width`, `padding-inline`, `gap` — только токены.
- **Адаптив колонок — в CSS Module**, не в токенах и не через JS.
