---
name: testing
description: Backend testing — mandatory test+review agent, coverage requirements, completion criteria
paths:
  - "src/domain/**"
  - "src/application/**"
  - "src/infrastructure/**"
  - "src/app/api/**"
---

# Backend Testing — MANDATORY

Every backend change requires a Test+Review agent. No exceptions.

## Coverage requirements

| Change type | Required tests |
|---|---|
| New use case | All success paths, all error paths (invalid state, not found, permission), edge cases |
| New domain function / transition | Every valid and invalid transition / invariant |
| New repository method | Happy path + not-found / empty result |
| New API route | 2xx response, 4xx validation, 401/403 auth |
| Modified code | Update existing tests — no coverage regression |

## Completion criteria

Task is NOT done until:
- Every new code path has a test
- `npx vitest run <path>` passes
- Review checks all PASS

## Test+Review agent prompt (include verbatim)

```
Test and review the implementation at <paths>.

### Part 1 — Tests

1. Read the implementation. Identify every code path (success, error, edge case).
2. Create test file in `__tests__/` subdirectory alongside the code.
3. For each code path, write a test:
   - Success: verify return value and side effects.
   - Error: invalid state, not found, permission denied — verify correct error.
   - Edge cases: empty collections, boundary values.
4. Mock ports via constructor injection. Never mock the class under test.
5. Run: `npx vitest run <test-path>`.
6. All tests must pass before proceeding to Part 2.

### Part 2 — Review

Check each item, report PASS or FAIL with evidence:

1. LAYER COMPLIANCE — domain imports nothing from application/infrastructure/app.
   Application imports only from domain and its own ports.
2. DOMAIN INVARIANTS — state transitions only via transitions.ts.
   Money as number (Decimal conversion at infrastructure boundary).
   OrderItem snapshots immutable after PAYMENT.
3. TRANSACTION BOUNDARIES — external calls (MoySklad) via outbox pattern.
   Never inside a transaction.
4. EDGE CASES — empty collections, boundary values, concurrent access handled.
5. CONSISTENCY — follows patterns of existing code in the same layer.

Return table: check | result | detail.
For every FAIL: fix the issue, re-run that check.
```