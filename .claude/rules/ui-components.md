---
name: ui-components
description: UI component rules — agent prompts, composition, CSS tokens
paths:
  - "src/shared/ui/**"
  - "src/widgets/**"
  - "src/features/**"
  - "src/entities/**"
  - "src/app/**/page.tsx"
  - "src/app/**/layout.tsx"
---

# UI Component Agent Prompts

Two mandatory phases. Claude never writes UI code directly — always delegates to agents.

## Phase 1 — Implementation agent prompt (include verbatim)

```
Implement: <description>

### Pre-implementation
1. Read `src/shared/ui/index.ts` — authoritative list of existing components.
2. Read `.claude/rules/ui-components.md` — mandatory composition and token rules.
3. Read the file(s) you will modify and their direct imports.

### Implementation
4. Use existing shared/ui components instead of raw HTML (see substitution table in ui-components.md Rule 3).
5. New shared/ui components go in the correct group: icons/ buttons/ inputs/ feedback/ data/ layout/.
6. Export new components from `src/shared/ui/index.ts`.
7. CSS tokens:
   - Spacing (padding, margin, gap): use --primitive-space-* directly. NEVER create ctx-space-* or component-level spacing tokens.
   - Border-radius: use --primitive-radius-* directly. NEVER create ctx-radius-* or component-level radius tokens.
   - Everything else (color, font, shadow): use --ctx-* tokens or existing component tokens.
   - --primitive-color-*, --primitive-font-*, --primitive-shadow-* are FORBIDDEN in CSS Modules.
   - font-weight: numeric literal with Figma comment, never a token.
   - No matching non-spacing/non-radius token? Add to src/styles/tokens/context.css — never hardcode.

### Self-check (mandatory before returning)
8. Grep file for <button, <input, <textarea, <select — each must be a shared/ui component. Fix if found.
9. Grep CSS module for --primitive-color-*, --primitive-font-*, --primitive-shadow-* — must be zero. Fix if found.
   --primitive-space-* is ALLOWED and REQUIRED for all spacing (padding, margin, gap).
   --primitive-radius-* is ALLOWED and REQUIRED for all border-radius.
10. Confirm barrel export in src/shared/ui/index.ts. Add if missing.
11. Run: npx tsc --noEmit. Fix errors if any.
```

## Phase 2 — Review agent prompt (include verbatim)

```
Review the implementation at <paths>.
Read `.claude/rules/ui-components.md` for composition and token rules.

### Step 0 — Lint (run first, fix all errors before manual checks)
Run the linter scoped to the files you changed:
`npx eslint <file1> <file2> ...`

Fix every error that appears **in those files**. Ignore errors in other files — they are pre-existing and out of scope.

The linter enforces automatically — do NOT duplicate these as manual checks:
- @typescript-eslint/no-explicit-any, no-unused-vars, consistent-type-imports
- react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
- FSD boundaries: shared/ui → upper layers; domain → outer layers; application → infrastructure/app
- @next/next/no-img-element

### Manual checks (report PASS / FAIL with evidence)

#### Structural
1. RAW HTML — grep for <button, <input, <textarea, <select, <a.
   FAIL if any should be a shared/ui component.
2. BARREL — new components exported from src/shared/ui/index.ts. FAIL if missing.
3. GROUP — file inside icons/buttons/inputs/feedback/data/layout/. FAIL if at shared/ui root.
4. TOKENS — grep CSS for --primitive-color-*, --primitive-font-*, --primitive-shadow-* → FAIL.
   --primitive-space-* is REQUIRED for spacing — ctx-space-* or hardcoded px spacing → FAIL.
   --primitive-radius-* is REQUIRED for border-radius — ctx-radius-* or hardcoded px radius → FAIL.
   Hardcoded colors where ctx token exists → FAIL.

#### Business logic
5. SPEC — identify source of truth (ADR, plan, task). Every requirement implemented. FAIL if gap.
6. LAYERS — linter covers shared/ui, domain, application. Manually verify: widgets/entities/features
   do not import from app layer or violate FSD direction. FAIL on violation.
7. EDGE CASES — empty states, boundaries, errors handled. FAIL if obvious case ignored.
8. CONSISTENCY — matches existing patterns in the same layer. FAIL if incompatible.

Return table: check | result | detail.
For every FAIL: fix the issue, re-run that check.
```

---

# UI Component Composition

## Rule 1 — Read the barrel first

Always read `src/shared/ui/index.ts` before implementing. Never reimplement what already exists.

## Rule 2 — Compose, don't reimplement

Import existing components — never rewrite their HTML/CSS.

- `Search` = `InputBase` + `IconButton` — not `<input>` + `<button>`
- `CartButton` = `IconButton` + badge — not `<button>` + `<Icon>`

## Rule 3 — Substitution table

| Raw HTML | Use instead |
|---|---|
| `<button>` icon only | `IconButton` (xs/sm/md/lg × white/gray/red) |
| `<button>` with text | `Button` (primary/secondary/tertiary/ghost) |
| `<button>` arrow | `ArrowButton` (sm/md/lg × left/right) |
| `<input type="text">` | `InputBase` (size/color/error) |
| `<input>` + label/hint | `Input` (wraps InputBase) |
| `<textarea>` | `TextField` |
| Two ArrowButtons | `ArrowsContainer` |
| Heart toggle | `LikeButton` |
| Social button | `SocialButton` (whatsapp/telegram/vk) |
| Cart icon + badge | `CartButton` |
| Mobile nav item | `MobilePanelButton` |
| Mobile nav cart | `MobilePanelCartButton` |

This table may be incomplete — `src/shared/ui/index.ts` is always authoritative.

## Rule 4 — Placement

| Group | What goes here |
|---|---|
| icons/ | Visual primitives (Icon, Logo, SVGs) |
| buttons/ | Interactive elements triggering actions |
| inputs/ | User text/selection input |
| feedback/ | Status indicators, overlays, notifications |
| data/ | Tables, cards, stat displays |
| layout/ | Container, Grid, structural wrappers |

Never add to flat `shared/ui/` root.

---

# CSS Token Rules

- **Spacing** (`padding`, `margin`, `gap`, `top/right/bottom/left`): use **`--primitive-space-*` directly**. FORBIDDEN to create `ctx-space-*` or component-level spacing tokens.
- **Border-radius**: use **`--primitive-radius-*` directly**. FORBIDDEN to create `ctx-radius-*` or component-level radius tokens.
- **Color, font, shadow**: use **`--ctx-*`** tokens. `--primitive-color-*`, `--primitive-font-*`, `--primitive-shadow-*` FORBIDDEN in CSS Modules.
- **Component tokens** (`--button-*`, `--card-*`) only for: (a) fixed Figma value not in any token layer, or (b) multi-value shorthand. Never for spacing aliases.
- **Single-line alias FORBIDDEN:** `--comp-x: var(--ctx-y)` — use ctx token directly.
- **font-weight: never tokenized.** Numeric literal + Figma text style comment.
- **`--ctx-font-size-h1..h4`** only for heading roles. Not arbitrary size aliases.
