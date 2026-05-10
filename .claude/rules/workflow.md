---
name: workflow
description: How to approach all tasks — delegation, planning, scope, error handling
---

# Workflow Rules

## 1. Read-first

TRIGGER: About to modify any file.
ACTION: Read the file and its direct dependencies before changing anything. Understand existing patterns, naming, structure.
VERIFY: Can describe what the file does and how the change fits before writing code.

For UI: always read `src/shared/ui/index.ts` before implementation.

## 2. Scope lock

TRIGGER: Received a task from the user.
ACTION: Do exactly what was asked. Do not refactor surrounding code, add features, improve naming, or clean up things beyond the request.
VERIFY: Every change in the diff directly serves the user's request.

Expanding scope requires explicit user approval.

## 3. Plan gate

TRIGGER: Task touches 3+ files or crosses 2+ architectural layers (e.g. domain + UI, or application + infrastructure + API route).
ACTION: Present a brief plan before writing code — list files to change, approach, order of work.
VERIFY: User approved the plan or said to proceed.

Skip for tasks with obvious, contained scope.

## 4. Plan composition

TRIGGER: Writing a plan — in response to rule 3, or any document under `docs/plans/`.
ACTION: Include only **declarative** artifacts. Exclude **procedural** artifacts — those are the implementation agent's job.
VERIFY: Every code-like snippet in the plan describes a contract, shape, or invariant — never a function body, JSX tree, or control flow.

**Declarative — keep in plans:**
- Port signatures and interface types: `OrderRepository.findById(id: string): Promise<Order | null>`
- Prisma schema deltas — added/changed fields and relations
- API request/response shapes as typed JSON
- State machines and transition tables
- Invariants stated as declarative assertions (e.g. WHERE-condition, when the form of the expression IS the decision)
- Pseudocode of an algorithm ONLY when the algorithm itself is the architectural decision (e.g. cart merge, conflict resolution)

**Procedural — leave to the implementation agent:**
- Function bodies, use case method bodies
- JSX trees, hook compositions, component markup
- Validation, error handling, control flow implementation
- Concrete TypeScript syntax of components or hooks

**Principle:** if the artifact answers **what** (contract, data shape, invariant) — it belongs in the plan. If it answers **how** (body, control flow, realization syntax) — it belongs to the implementation agent.

A plan removes ambiguity about what to build. It does not prescribe how to build it.

A plan must contain:
- Architectural decisions — affected layers, ports/contracts introduced or changed, fit with FSD/hexagonal
- Data and invariants — Prisma schema, migrations, state transitions, idempotency
- Boundary contracts — request/response shapes, what is validated and where
- Edge cases and failure modes that must be handled explicitly
- File-by-file breakdown — which files change and **what** changes conceptually
- Order of work and dependencies
- Open questions requiring user decision
- Test strategy — what to verify, not how to write the test

## 5. Agent delegation

TRIGGER: Any implementation task beyond a trivial fix.

### UI changes

Paths: `src/shared/ui/**`, `src/widgets/**`, `src/features/**`, `src/entities/**`, `src/app/**/page.tsx`, `src/app/**/layout.tsx`

**Claude NEVER writes UI code directly in the main conversation.** Always delegate:

1. **Implementation agent** — implements + structural self-check. Prompt in `ui-components.md` Phase 1.
2. **Review agent** — independent check against spec + architecture. Prompt in `ui-components.md` Phase 2.

Both agents mandatory, run sequentially.

### Backend changes

Paths: `src/domain/**`, `src/application/**`, `src/infrastructure/**`, `src/app/api/**`

1. **Implementation** — directly for small changes, agent for complex (new use case, refactor, new domain logic).
2. **Test+Review agent** — **ALWAYS, no exceptions.** Prompt in `testing.md`.

### When agents are NOT required

Only genuinely non-code changes: fixing a typo in a string literal, updating a comment, changing a static text value — with no logic touched.

Everything else follows the rules above regardless of file count or line count.

### Mixed tasks (frontend + backend)

Apply plan gate (rule 3). Then spawn agents per area in parallel (single message, multiple Agent calls):
- **Backend implementation agent** + **UI implementation agent** → run in parallel
- After both finish: **Backend test+review agent** + **UI review agent** → run in parallel

For mixed tasks, backend implementation must always go to an agent (not done directly) — this is what enables parallelization. Never serialize work that can run concurrently.

## 6. Error protocol

TRIGGER: Agent returns FAIL, test fails, tsc errors, build breaks.
ACTION:
1. Read the error output fully.
2. Fix the root cause, not the symptom.
3. Re-run the exact check that failed.
4. Do NOT ignore, skip, retry blindly, or work around.

## 7. Post-completion

TRIGGER: All implementation and agents finished.
ACTION: Run `npx tsc --noEmit`. Fix any errors before reporting done.
