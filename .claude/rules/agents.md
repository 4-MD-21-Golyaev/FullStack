---
name: agent-usage
description: Rules for when and how to use subagents
---

# Agent Usage

## When to use agents

- Task reads 5+ files — delegate to preserve main conversation context
- Output is verbose (test runs, codebase search, log analysis) — subagent returns clean summary
- Multiple independent tasks can run at the same time — spawn in parallel
- Isolated read-only check needed (review, lint, type-check) — use restricted agent

## When NOT to use agents

- Quick fix in 1–2 files with clear scope — do directly
- Tight iteration on unclear approach — main conversation keeps context
- Phases depend on each other (plan → implement → test as one flow) — keep in main context
- Task modifies many shared files — one agent coordinates, not many

## Parallelization

- Independent searches and file reads → call multiple tools in one message
- Independent subtasks → spawn multiple agents in one message
- Never run agents in parallel if they write to the same files

## Writing agent prompts

- Give a concrete checklist, not an abstract description
- State the expected output format explicitly
- Pass file paths explicitly when known
- Describe what to check AND what to return

## UI component workflow

Every UI component follows a mandatory two-phase flow:
1. **Implementation agent** — writes the component (prompt in `ui-components.md`)
2. **Review agent** — checks it against all rules (prompt in `ui-components.md`)

The review phase is non-negotiable and always runs as a separate agent after implementation.
