# Frontend Architecture

## Structure — Feature-Sliced Design (FSD)

```
src/
├── shared/ui/       Pure design system. No business logic. No API calls.
│   ├── icons/       Icon, Logo
│   ├── buttons/     Button, IconButton, ArrowButton, ArrowsContainer, ArrowBg,
│   │                LikeButton, SocialButton, CartButton,
│   │                MobilePanelButton, MobilePanelCartButton
│   ├── inputs/      InputBase, Input, TextField, Search,
│   │                Select, Counter, Switch, Radio, Chips… (growing)
│   ├── feedback/    Badge, Spinner, Skeleton, Modal, Toast,
│   │                ConfirmDialog, SlaTimer, OrderStatusBadge, PaymentStatusBadge
│   ├── data/        StatCard, DataTable, FilterBar
│   └── index.ts     ← single public barrel
│
├── entities/        Domain entity UI components
│   ├── product/ui/  ProductCard, Price, Category, Rating…
│   └── order/ui/    OrderCard, Tracker, Stage, Roadmap…
│
├── features/        User interaction flows
│   ├── cart/ui/
│   └── auth/ui/
│
├── widgets/         Page-level composite blocks
│   ├── customer/    Header, Footer, Hero, Slider, LoyaltySection
│   ├── admin/
│   ├── courier/
│   ├── picker/
│   └── WorkerHeader/
│
└── app/             Next.js App Router (pages + API routes)
```

---

## Import Direction — STRICT, NEVER VIOLATE

```
app  →  widgets  →  features  →  entities  →  shared/ui
```

- `shared/ui` imports **nothing** from any other FSD layer
- `entities` imports only from `shared/ui`
- `features` imports from `shared/ui` + `entities`
- `widgets` imports from `shared/ui` + `entities` + `features`
- `app` imports from any layer

**Cross-group imports inside shared/ui** use relative paths:
```ts
// buttons/IconButton/ importing from icons group:
import { Icon } from '../../icons/Icon/Icon';

// inputs/Search/ importing from buttons group:
import { IconButton } from '../../buttons/IconButton/IconButton';
```

**External consumers** (widgets, entities, features, app) always import from the barrel:
```ts
import { Button, InputBase, Icon } from '@/shared/ui';
```

---

## Component Composition Rules

### 1. Read the barrel before writing anything

```bash
# Before implementing, always check what already exists:
cat src/shared/ui/index.ts
```

### 2. Compose from existing components — never re-implement

| You need | Use this |
|---|---|
| Button with icon only | `IconButton` |
| Button with text | `Button` |
| Arrow navigation button | `ArrowButton` |
| Two arrows (prev/next) | `ArrowsContainer` |
| Text input (standalone) | `InputBase` |
| Text input + label/hint | `Input` |
| Textarea | `TextField` |
| Search field | `Search` (= `InputBase` + `IconButton`) |
| Heart toggle | `LikeButton` |
| Social auth button | `SocialButton` |
| Cart button with count | `CartButton` (= `IconButton` + badge) |
| Mobile nav item | `MobilePanelButton` |
| Mobile nav cart item | `MobilePanelCartButton` (= `MobilePanelButton` + badge) |

### 3. Group placement for new shared/ui components

| Group | What goes here |
|---|---|
| `icons/` | Standalone visual primitives — Icon, Logo, decorative SVG shapes |
| `buttons/` | Any interactive element that triggers an action |
| `inputs/` | Any element accepting user text or selection input |
| `feedback/` | Status indicators, overlays, loading states, notifications |
| `data/` | Tables, stat cards, display-only data structures |

Never add a component at the flat `shared/ui/` root — always use a group.

---

## CSS Token System

Tokens are CSS custom properties split into three layers with increasing semantics.
Each layer references the previous via `var()` — never direct values.

### Token file locations

```
src/styles/
├── tokens/
│   ├── primitive.css    ← raw palette and scale values
│   ├── context.css      ← semantic aliases, reference primitive
│   └── component.css    ← component-specific tokens, reference context
├── globals.css          ← @import of all three + reset + base html/body
└── typography.css       ← @font-face
```

### Layer 1 — Primitive

Raw values with no semantics. **Never referenced in CSS Modules or component.css** — only context.css may reference primitives.

```css
/* tokens/primitive.css */
/* Source of truth: Figma (eV3fLo7RMJcyNqnFeuwHmg) */
:root {

    /* ── Neutral scale ── */
    --primitive-color-neutral-0:   #fefefe;   /* White/Enabled */
    --primitive-color-neutral-50:  #fcfcfc;   /* White/Hovered */
    --primitive-color-neutral-75:  #f7f7f7;   /* Light gray — page bg */
    --primitive-color-neutral-100: #f2f2f2;   /* Gray/Enabled — subtle bg */
    --primitive-color-neutral-150: #f0f0f0;   /* White/Activated */
    --primitive-color-neutral-200: #ededed;   /* Gray/Hovered */
    --primitive-color-neutral-250: #dedede;   /* Gray/Focused */
    --primitive-color-neutral-300: #cccccc;   /* Gray/Disabled */
    --primitive-color-neutral-400: #9c9999;   /* Dark Gray — secondary icons */
    --primitive-color-neutral-500: #999999;   /* Gray — secondary text */
    --primitive-color-neutral-900: #282828;   /* Signal black — primary text */

    /* ── Red brand scale ── */
    --primitive-color-red-300: #af3732;
    --primitive-color-red-400: #9f322d;
    --primitive-color-red-500: #8f2d29;   /* primary action */
    --primitive-color-red-700: #620c04;
    --primitive-color-red-900: #500a03;

    /* ── Error / Destructive ── */
    --primitive-color-error-50:  #faf0f0;
    --primitive-color-error-500: #ba6a66;

    /* ── Warning + status ── */
    --primitive-color-orange-400: #f5a12b;
    --primitive-color-green-500:  #0a9e5c;
    --primitive-color-blue-500:   #0070f3;

    /* ── Pastel backgrounds ── */
    --primitive-color-cream-50:  #fff8e4;
    --primitive-color-orange-50: #fdf0e2;
    --primitive-color-green-50:  #e8fcea;
    --primitive-color-pink-50:   #ffebeb;
    --primitive-color-blue-50:   #e9f0fc;
    --primitive-color-purple-50: #f3e9fb;

    /* ── Spacing scale (base unit 4px) ── */
    --primitive-space-100:  4px;
    --primitive-space-200:  8px;
    --primitive-space-300:  12px;
    --primitive-space-400:  16px;
    --primitive-space-600:  24px;
    --primitive-space-800:  32px;
    --primitive-space-1200: 48px;
    --primitive-space-1600: 64px;

    /* ── Typography scale ── */
    --primitive-font-family-sans: 'PT Root UI VF', system-ui, sans-serif;
    --primitive-font-family-mono: 'JetBrains Mono', monospace;

    /* Numeric naming matches Figma token names */
    --primitive-font-size-12: 12px;
    --primitive-font-size-14: 14px;
    --primitive-font-size-16: 16px;
    --primitive-font-size-18: 18px;
    --primitive-font-size-20: 20px;
    --primitive-font-size-24: 24px;
    --primitive-font-size-36: 36px;
    --primitive-font-size-40: 40px;

    /* PT Root UI VF — variable font, supports fractional values */
    --primitive-font-weight-450: 450;
    --primitive-font-weight-500: 500;
    --primitive-font-weight-600: 600;
    --primitive-font-weight-700: 700;

    --primitive-line-height-110: 1.10;
    --primitive-line-height-115: 1.15;
    --primitive-line-height-120: 1.20;

    /* ── Border radius scale ── */
    --primitive-radius-100:  4px;     /* Radius/100 */
    --primitive-radius-200:  8px;     /* Radius/200 */
    --primitive-radius-300:  12px;    /* Radius/300 */
    --primitive-radius-400:  16px;    /* Radius/400 */
    --primitive-radius-800:  32px;    /* Radius/800 */
    --primitive-radius-FULL: 9999px;  /* Radius/FULL */

    /* ── Shadow scale ── */
    --primitive-shadow-card:  0 1px 4px rgba(12,12,13,.05), 0 1px 4px rgba(12,12,13,.10);
    --primitive-shadow-modal: 0 4px 6px rgba(0,0,0,.12), 0 10px 20px rgba(0,0,0,.20);

    /* ── Duration scale ── */
    --primitive-duration-100: 100ms;
    --primitive-duration-200: 200ms;
    --primitive-duration-300: 300ms;

    /* ── Z-index scale ── */
    --primitive-z-dropdown: 100;
    --primitive-z-modal:    200;
    --primitive-z-toast:    300;
}
```

### Layer 2 — Context

Semantic aliases. Answer **"what for"**, not "what value".
Reference only `--primitive-*` tokens. CSS Modules and component.css reference this layer — **never primitive directly**.

```css
/* tokens/context.css */
:root {

    /* ── Text color ── */
    --ctx-color-text-default:   var(--primitive-color-neutral-900);
    --ctx-color-text-secondary: var(--primitive-color-neutral-500);
    --ctx-color-text-disabled:  var(--primitive-color-neutral-300);
    --ctx-color-text-inverse:   var(--primitive-color-neutral-0);
    --ctx-color-text-link:      var(--primitive-color-red-500);
    --ctx-color-text-danger:    var(--primitive-color-error-500);

    /* ── Background color ── */
    --ctx-color-bg-page:           var(--primitive-color-neutral-75);
    --ctx-color-bg-surface:        var(--primitive-color-neutral-0);
    --ctx-color-bg-surface-hover:  var(--primitive-color-neutral-50);
    --ctx-color-bg-surface-active: var(--primitive-color-neutral-150);
    --ctx-color-bg-subtle:         var(--primitive-color-neutral-100);
    --ctx-color-bg-subtle-hover:   var(--primitive-color-neutral-200);
    --ctx-color-bg-subtle-focus:   var(--primitive-color-neutral-250);
    --ctx-color-bg-overlay:        rgba(0, 0, 0, 0.4);

    /* ── Border color ── */
    --ctx-color-border-default: var(--primitive-color-neutral-200);
    --ctx-color-border-focus:   var(--primitive-color-red-500);
    --ctx-color-border-danger:  var(--primitive-color-error-500);

    /* ── Icon color ── */
    --ctx-color-icon-default:   var(--primitive-color-neutral-900);
    --ctx-color-icon-secondary: var(--primitive-color-neutral-400);
    --ctx-color-icon-disabled:  var(--primitive-color-neutral-300);

    /* ── Accent (stars, rating) ── */
    --ctx-color-accent: var(--primitive-color-orange-400);

    /* ── Actions (buttons, links) ── */
    --ctx-color-action-primary:          var(--primitive-color-red-500);
    --ctx-color-action-primary-hover:    var(--primitive-color-red-400);
    --ctx-color-action-primary-active:   var(--primitive-color-red-300);
    --ctx-color-action-primary-disabled: var(--primitive-color-red-700);
    --ctx-color-action-danger:           var(--primitive-color-error-500);
    --ctx-color-action-danger-bg:        var(--primitive-color-error-50);

    /* ── Status colors ── */
    --ctx-color-status-success: var(--primitive-color-green-500);
    --ctx-color-status-warning: var(--primitive-color-orange-400);
    --ctx-color-status-danger:  var(--primitive-color-error-500);
    --ctx-color-status-info:    var(--primitive-color-blue-500);
    --ctx-color-status-success-bg: var(--primitive-color-green-50);
    --ctx-color-status-warning-bg: var(--primitive-color-orange-50);
    --ctx-color-status-danger-bg:  var(--primitive-color-pink-50);
    --ctx-color-status-info-bg:    var(--primitive-color-blue-50);
    --ctx-color-status-payment-bg: var(--primitive-color-purple-50);
    --ctx-color-status-neutral-bg: var(--primitive-color-cream-50);

    /* ── Order status colors (bg + text pair for badges) ── */
    --ctx-color-order-created-bg:     var(--primitive-color-blue-50);
    --ctx-color-order-created-text:   var(--primitive-color-red-500);
    --ctx-color-order-picking-bg:     var(--primitive-color-orange-50);
    --ctx-color-order-picking-text:   var(--primitive-color-neutral-900);
    --ctx-color-order-payment-bg:     var(--primitive-color-purple-50);
    --ctx-color-order-payment-text:   var(--primitive-color-neutral-900);
    --ctx-color-order-delivery-bg:    var(--primitive-color-green-50);
    --ctx-color-order-delivery-text:  var(--primitive-color-neutral-900);
    --ctx-color-order-delivered-bg:   var(--primitive-color-green-50);
    --ctx-color-order-delivered-text: var(--primitive-color-neutral-900);
    --ctx-color-order-closed-bg:      var(--primitive-color-neutral-100);
    --ctx-color-order-closed-text:    var(--primitive-color-neutral-500);
    --ctx-color-order-cancelled-bg:   var(--primitive-color-pink-50);
    --ctx-color-order-cancelled-text: var(--primitive-color-error-500);

    /* ── Spacing by usage context ── */
    --ctx-space-inset-xs:     var(--primitive-space-100);   /* 4px */
    --ctx-space-inset-sm:     var(--primitive-space-200);   /* 8px */
    --ctx-space-inset-md:     var(--primitive-space-400);   /* 16px */
    --ctx-space-inset-lg:     var(--primitive-space-600);   /* 24px */
    --ctx-space-stack-sm:     var(--primitive-space-200);   /* 8px */
    --ctx-space-stack-md:     var(--primitive-space-400);   /* 16px */
    --ctx-space-stack-lg:     var(--primitive-space-800);   /* 32px */
    --ctx-space-stack-xl:     var(--primitive-space-1200);  /* 48px */
    --ctx-space-inline-sm:    var(--primitive-space-200);   /* 8px */
    --ctx-space-inline-md:    var(--primitive-space-400);   /* 16px */
    --ctx-space-inline-lg:    var(--primitive-space-600);   /* 24px */
    --ctx-space-page-desktop: var(--primitive-space-800);   /* 32px */
    --ctx-space-page-mobile:  var(--primitive-space-300);   /* 12px */

    /* ── Typography by context ── */
    --ctx-font-body: var(--primitive-font-family-sans);
    --ctx-font-code: var(--primitive-font-family-mono);

    /* Font sizes — Figma [Desktop] text styles */
    --ctx-font-size-xs:      var(--primitive-font-size-12);   /* 12px — [Mobile]/Utilities/Secondary */
    --ctx-font-size-label:   var(--primitive-font-size-14);   /* 14px — [Desktop]/Utilities/Secondary */
    --ctx-font-size-caption: var(--primitive-font-size-16);   /* 16px — [Desktop]/Utilities/Caption */
    --ctx-font-size-body:    var(--primitive-font-size-18);   /* 18px — [Desktop]/Body, H5 */
    --ctx-font-size-h4:      var(--primitive-font-size-20);   /* 20px — [Desktop]/Headings/H4 */
    --ctx-font-size-h3:      var(--primitive-font-size-24);   /* 24px — [Desktop]/Headings/H3 */
    --ctx-font-size-h2:      var(--primitive-font-size-36);   /* 36px — [Desktop]/Headings/H2 */
    --ctx-font-size-h1:      var(--primitive-font-size-40);   /* 40px — [Desktop]/Headings/H1 */

    /* Line heights */
    --ctx-line-height-tight:  var(--primitive-line-height-110);  /* 1.10 */
    --ctx-line-height-normal: var(--primitive-line-height-115);  /* 1.15 */
    --ctx-line-height-loose:  var(--primitive-line-height-120);  /* 1.20 */

    /* ── Shape (border-radius) ── */
    --ctx-radius-sm:      var(--primitive-radius-100);    /* 4px */
    --ctx-radius-card:    var(--primitive-radius-200);    /* 8px — cards */
    --ctx-radius-lg:      var(--primitive-radius-300);    /* 12px */
    --ctx-radius-control: var(--primitive-radius-400);    /* 16px — buttons, inputs */
    --ctx-radius-modal:   var(--primitive-radius-800);    /* 32px — modals */
    --ctx-radius-badge:   var(--primitive-radius-FULL);   /* 9999px — badges */

    /* ── Misc ── */
    --ctx-shadow-card:  var(--primitive-shadow-card);
    --ctx-shadow-modal: var(--primitive-shadow-modal);
    --ctx-transition:   var(--primitive-duration-200) ease;
    --ctx-z-dropdown:   var(--primitive-z-dropdown);
    --ctx-z-modal:      var(--primitive-z-modal);
    --ctx-z-toast:      var(--primitive-z-toast);
}
```

### Layer 3 — Component

Per-component tokens. Reference `--ctx-*` tokens only.

**When to create a component token family:**
- Real semantic override: the component's color/shape must differ from the context default (e.g. Sidebar uses a dark theme; Link's default color is `text-default`, not `text-link`)
- Fixed Figma dimensions: px values from Figma spec that have no ctx equivalent (card sizes, button heights, image dimensions) — add with a `/* Figma: … */` comment

**Do NOT create a component token family just because it's a component.** If a `--ctx-*` token already covers the value, use it directly in the CSS Module.

```css
/* tokens/component.css */
:root {

    /* ── Button ── */
    --button-radius:           var(--ctx-radius-control);
    --button-transition:       var(--ctx-transition);
    --button-font-size:        var(--ctx-font-size-label);
    --button-font-weight:      500; /* [Desktop]/Utilities/Medium */
    --button-primary-bg:       var(--ctx-color-action-primary);
    --button-primary-bg-hover: var(--ctx-color-action-primary-hover);
    --button-primary-text:     var(--ctx-color-text-inverse);
    --button-secondary-bg:     var(--ctx-color-bg-subtle);
    --button-secondary-bg-hover: var(--ctx-color-bg-subtle-hover);
    --button-secondary-text:   var(--ctx-color-text-default);
    --button-danger-bg:        var(--ctx-color-action-danger);
    --button-danger-bg-hover:  var(--ctx-color-action-primary-active);
    --button-danger-text:      var(--ctx-color-text-inverse);
    /* Non-scale padding recipes */
    --button-padding-sm: var(--ctx-space-inset-sm) 12px;
    --button-padding-md: var(--ctx-space-inset-sm) var(--ctx-space-inset-md);
    --button-padding-lg: var(--ctx-space-inset-md) var(--ctx-space-inset-lg);

    /* ── Input ── */
    --input-radius:        var(--ctx-radius-control);
    --input-font-size:     var(--ctx-font-size-body);
    --input-border:        1px solid var(--ctx-color-border-default);
    --input-border-focus:  2px solid var(--ctx-color-border-focus);
    --input-border-danger: 1px solid var(--ctx-color-border-danger);
    --input-bg:            var(--ctx-color-bg-surface);
    --input-text:          var(--ctx-color-text-default);
    --input-placeholder:   var(--ctx-color-text-disabled);
    --input-padding:       var(--ctx-space-inset-sm) var(--ctx-space-inset-md);
    /* Fixed Figma heights */
    --input-height-lg: 56px;
    --input-height-md: 52px;
    --input-height-sm: 44px;

    /* ── Badge — only non-scale padding values ── */
    --badge-padding-s: var(--ctx-space-inset-xs) var(--ctx-space-inset-sm);  /* 4/8 */
    --badge-padding-m: 6px 12px;   /* Figma: 6px/12px not in scale */

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
    --table-row-hover-bg: var(--ctx-color-bg-subtle-hover);
    --table-border:       var(--ctx-color-border-default);
    --table-cell-padding: var(--ctx-space-inset-sm) var(--ctx-space-inset-md);

    /* ── SlaTimer (override: maps timer states to status colors) ── */
    --sla-color-ok:      var(--ctx-color-status-success);
    --sla-color-warning: var(--ctx-color-status-warning);
    --sla-color-overdue: var(--ctx-color-status-danger);

    /* ── Sidebar (admin dark theme — no ctx equivalents) ── */
    --sidebar-bg:              var(--primitive-color-neutral-900);
    --sidebar-text:            var(--primitive-color-neutral-400);
    --sidebar-text-active:     var(--primitive-color-neutral-0);
    --sidebar-item-active-bg:  rgba(255, 255, 255, 0.08);
    --sidebar-width:           240px;
    --sidebar-width-collapsed: 56px;

    /* ── Link (override: default color ≠ text-link) ── */
    --link-color:       var(--ctx-color-text-default);
    --link-color-hover: var(--ctx-color-text-link);
    --link-icon-offset: 2px;   /* optical alignment */

    /* ── Price (fixed Figma sizes only) ── */
    --price-current-font-size-m: var(--ctx-font-size-h4);
    --price-current-font-size-l: var(--ctx-font-size-h3);
    --price-old-font-size:       var(--ctx-font-size-caption);

    /* ── ProductCard / Rating / AppMarketButton / Slider / Header / Footer
       (fixed Figma dimensions — see component.css for full list) ── */
}
```

### Token usage rules

| Rule | Description |
|---|---|
| Primitive → context.css only | `--primitive-*` must NEVER appear in CSS Modules or component.css — only in context.css |
| CSS Modules → ctx or component | Components reference `--ctx-*` or component tokens; no `--primitive-*` ever |
| Component tokens → only overrides | Do not create a `--mycomp-*` family unless the value genuinely differs from context or is a fixed Figma dimension |
| font-weight is never a token | Always write a numeric literal with a Figma text style comment: `font-weight: 500; /* [Desktop]/Utilities/Medium */` |
| `--ctx-font-size-h*` = heading roles only | Use `h1/h2/h3/h4` only where a Figma heading text style applies — not as generic size aliases |
| No hardcoded hex or colors | Hex, named colors are forbidden in CSS Modules — use `var()` only |
| px literals only for Figma-fixed dims | Raw px values are allowed only for dimensions explicitly fixed in Figma spec — add `/* Figma: … */` comment |
| Figma export → primitive only | When updating from Figma, change values in `primitive.css`. Context and component stay stable |
| Order status colors | `--ctx-color-order-*` is the only source of order status colors in the entire project |

### Figma value → token mapping (priority order)

When a Figma design shows a raw value (color, size, radius, shadow), select a token using this priority:

1. **Component token** (`--button-*`, `--card-*`, `--input-*`…) — if one already exists for this component
2. **Context token** (`--ctx-*`) — if the value semantically fits an existing context alias
3. **Primitive token** (`--primitive-*`) — only as a last resort, and only inside `context.css`, never in component CSS Modules
4. **No token exists** → add it to the correct layer in `src/styles/tokens/`, **never hardcode the value**

```
Figma: border-radius 16px  →  --ctx-radius-card (cards) or --primitive-radius-xl (inside context.css)
Figma: color #8f2d29       →  --ctx-color-action-primary (buttons) or --primitive-color-red-500 (inside context.css)
Figma: gap 8px             →  --ctx-space-inline-sm or --primitive-space-2
```

---

## CSS Rules

- **CSS Modules only** — no Tailwind, no inline styles
- All design tokens come from CSS custom properties (`--primitive-*`, `--ctx-*`)
- Component-specific tokens (e.g. `--button-primary-bg`) are defined in the global token file
- No hardcoded colors inside components **except** when the color is not in the token system (document why)

### Allowed

```css
/* Token usage */
.title { color: var(--ctx-color-text-default); }

/* Pseudo-classes and pseudo-elements */
.button:hover { background: var(--ctx-color-action-primary-hover); }
.input::placeholder { color: var(--ctx-color-text-disabled); }

/* Media queries */
@media (max-width: 768px) {
  .sidebar { display: none; }
}

/* Animations via @keyframes inside the module */
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
.modal { animation: fadeIn var(--ctx-transition); }
```

### Forbidden

```tsx
// ❌ Inline styles
<div style={{ color: '#0070f3' }}>

// ❌ Tailwind utility classes in JSX
<div className="flex items-center gap-2 text-blue-500">

// ❌ Global classes without :global wrapper
import outsideStyles from '../other/Other.module.css';
<div className={outsideStyles.someClass}>

// ❌ Hardcoded color values in CSS
.badge { color: #0070f3; }  /* use var(--ctx-color-action-primary) */

// ❌ Magic numbers in CSS
.card { padding: 16px; }  /* use var(--ctx-space-inset-md) */

// ❌ Primitive tokens in CSS Modules
.title { color: var(--primitive-color-neutral-900); }  /* use var(--ctx-color-text-default) */
```

### Naming conventions

```css
/* Root element — always .root */
.root { ... }

/* Variants — direct variant name */
.primary { ... }
.secondary { ... }

/* States — camelCase with is- prefix */
.isLoading { ... }
.isDisabled { ... }
.isActive { ... }

/* Child elements — camelCase */
.headerTitle { ... }
.bodyContent { ... }
.footerActions { ... }
```

---

## Pure Components

All `shared/ui` components are **pure** — props only, no API calls, no store access, no routing.
API/store connection happens at `widgets` or `features` level.

---

## Checklist for adding a new shared/ui component

- [ ] Read `src/shared/ui/index.ts` — does it already exist?
- [ ] Placed in the correct group (`icons/`, `buttons/`, `inputs/`, `feedback/`, `data/`)
- [ ] Exported from `src/shared/ui/index.ts`
- [ ] Uses existing components where applicable (no raw HTML reimplementation)
- [ ] Props-only — no API calls, no side effects
- [ ] CSS Modules only
- [ ] TypeScript strict — no `any`
- [ ] `npx tsc --noEmit` passes clean
