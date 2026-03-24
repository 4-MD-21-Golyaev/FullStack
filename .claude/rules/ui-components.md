---
name: ui-components
description: UI component rules — composition, CSS tokens, agent workflow
paths:
  - "src/shared/ui/**"
  - "src/widgets/**"
  - "src/app/**/page.tsx"
  - "src/app/**/layout.tsx"
---

# Agent Workflow — UI Component Implementation

Every UI component follows a mandatory two-phase workflow: **implement → review**.
The review always runs as a separate agent after implementation.

## Phase 1 — Implementation agent prompt (include verbatim)

```
Before writing any code:
1. Read src/shared/ui/index.ts — this is the authoritative list of existing components.
2. Use existing components instead of raw HTML. Rules in .claude/rules/ui-components.md
   section "UI Component Composition" are mandatory and non-negotiable.
3. Place the new component in the correct shared/ui group (icons/buttons/inputs/feedback/data/).
4. Export it from src/shared/ui/index.ts.
5. For every CSS value from Figma, map it to a token using this priority:
   component token (--button-*, --card-*…) if one already exists for this component →
   context token (--ctx-*) that semantically matches the intent →
   if nothing fits: add the missing token to src/styles/tokens/context.css, never hardcode.
   STRICT: --primitive-* tokens are FORBIDDEN in CSS Modules and component.css.
   font-weight is NEVER a token — write a numeric literal with a Figma text style comment:
     font-weight: 500; /* [Desktop]/Utilities/Medium */
   --ctx-font-size-h1/h2/h3/h4 are ONLY for heading roles matching Figma [Desktop]/Headings/*.
   Do NOT create a new --mycomp-* token family unless it's a true override or a fixed Figma dimension.
```

## Phase 2 — Review agent prompt (include verbatim)

```
Review the component at <path>. Check each item and report PASS or FAIL with evidence:

1. RAW HTML — search the file for <button, <input, <textarea, <select, <a .
   Each must be replaced by an existing shared/ui component. FAIL if any found.
2. BARREL — open src/shared/ui/index.ts and confirm the new component is exported.
   FAIL if missing.
3. GROUP — confirm the file is inside one of: icons/ buttons/ inputs/ feedback/ data/.
   FAIL if placed at shared/ui root or in wrong group.
4. TOKENS — search the CSS module for:
   a) hex values (#) or named colors — FAIL if a matching ctx/component token exists.
   b) px literals other than 0, 1px/2px borders, or values with a "/* Figma: … */" comment — FAIL.
   c) --primitive-* references — ALWAYS FAIL, no exceptions.
5. IMPORTS — confirm cross-group imports inside shared/ui use relative paths (../../group/…).
   FAIL if @/shared/ui barrel is used inside the library itself.
6. TYPESCRIPT — run: npx tsc --noEmit. FAIL if any errors.

Return a summary table: rule | result | detail.
If any FAIL: fix the issue, then re-run the failed check to confirm it passes.
```

---

# UI Component Composition — CRITICAL RULES

## Rule 1 — Read the barrel first

**Always read `src/shared/ui/index.ts` before implementing any component.** Never reimplement something that already exists.

## Rule 2 — Compose, don't reimplement

Import and use existing components — never rewrite their HTML/CSS from scratch.

- `Search` = `InputBase` + `IconButton` — not `<input>` + `<button>`
- `CartButton` = `IconButton` + badge `<span>` — not `<button>` + `<Icon>`
- `MobilePanelCartButton` = `MobilePanelButton` + badge `<span>`

## Rule 3 — HTML → component substitution table

```
Raw HTML                          → Use instead
─────────────────────────────────────────────────────────
<button> with icon only           → IconButton (xs/sm/md/lg × white/gray/red)
<button> with text                → Button (primary/secondary/tertiary/ghost)
<button> arrow navigation         → ArrowButton (sm/md/lg × left/right)
<input type="text"> standalone    → InputBase (size/color/error)
<input type="text"> + label/hint  → Input (wraps InputBase)
<textarea>                        → TextField
Two ArrowButtons side by side     → ArrowsContainer
Heart toggle button               → LikeButton
Social network button             → SocialButton (whatsapp/telegram/vk)
Cart icon button with badge       → CartButton
Mobile nav item                   → MobilePanelButton
Mobile nav cart item              → MobilePanelCartButton
```

`src/shared/ui/index.ts` is authoritative — always read it before implementing.

## Rule 4 — Placement

```
icons/    — standalone visual primitives (Icon, Logo, decorative SVGs)
buttons/  — any interactive element that triggers an action
inputs/   — any element that accepts user text/selection input
feedback/ — status indicators, overlays, notifications
data/     — tables, cards, stat displays
```

Never add to the flat `shared/ui/` root. If no group fits, create a new group.

---

# CSS Token System

## Three-layer rule (STRICT)

- `primitive.css` → `context.css` → `component.css` → CSS Module
- `--primitive-*` only in `context.css`. Forbidden everywhere else.
- `--ctx-*` in CSS Modules and `component.css`.
- Component tokens (`--button-*`, `--card-*`) justified **only** when:
  - **(a)** fixed Figma value not in ctx layer (e.g. `240px`, `rgba(255,255,255,0.08)`), OR
  - **(b)** combines multiple ctx-tokens into a multi-value shorthand.
- **Single-line alias FORBIDDEN:** `--comp-x: var(--ctx-y)` — use ctx token directly.

## font-weight — never tokenized

```css
font-weight: 450; /* [Desktop]/Utilities/Regular */
font-weight: 500; /* [Desktop]/Utilities/Medium */
font-weight: 600; /* Semibold */
font-weight: 700; /* Bold */
```

## Figma text styles → tokens

| Figma text style | Token | Weight |
|---|---|---|
| [Desktop]/Headings/Heading 1 | `--ctx-font-size-h1` (40px) | `700` |
| [Desktop]/Headings/Heading 2 | `--ctx-font-size-h2` (36px) | `700` |
| [Desktop]/Headings/Heading 3 | `--ctx-font-size-h3` (24px) | `700` |
| [Desktop]/Headings/Heading 4 | `--ctx-font-size-h4` (20px) | `700` |
| [Desktop]/Body / H5 | `--ctx-font-size-body` (18px) | `450` or `500` |
| [Desktop]/Utilities/Caption | `--ctx-font-size-caption` (16px) | `450` |
| [Desktop]/Utilities/Secondary | `--ctx-font-size-label` (14px) | `500` |
| [Mobile]/Utilities/Secondary | `--ctx-font-size-xs` (12px) | `450` |

`--ctx-font-size-h1/h2/h3/h4` are **only** for heading roles. Do not use as arbitrary size aliases.
