Status: РЕАЛИЗОВАН
Priority: P0
Почему: Критично для безопасности/контроля доступа.
---

# P0 Plan: Закрыть доступ к `/api/internal/jobs/*` для JWT-пользователей

## Summary
Цель: internal job endpoints должны быть доступны только по `INTERNAL_JOB_SECRET` и работать в fail-closed режиме.
Критерий успеха: ни `CUSTOMER`, ни `STAFF`, ни `ADMIN` через JWT не могут вызвать internal jobs; доступ только по корректному `Authorization: Bearer <secret>`.

## Implementation Changes
1. Усилить авторизацию в middleware/proxy
- В `proxy` для префикса `/api/internal/jobs/` сделать отдельную ветку с ранним `return`.
- Логика:
  - `INTERNAL_JOB_SECRET` отсутствует/пустой -> `500` с нейтральным текстом (`Internal jobs auth misconfigured`).
  - Секрет есть, но `Authorization` не совпадает -> `403`.
  - Совпадает -> пропуск запроса.
- Убрать fallback к JWT для internal jobs (это и есть текущая уязвимость).

2. Добавить defense-in-depth в сами internal routes
- В `process-outbox` и `sync-products` добавить одинаковую локальную проверку секрета.
- Даже при ошибке/рефакторинге proxy endpoint остаётся закрыт.
- Единый helper (например `assertInternalJobAuth(req): {ok: true} | NextResponse`) чтобы не дублировать и не разъехались ответы.

3. Уточнить контракты и поведение ошибок
- Для internal jobs зафиксировать:
  - `403` для неверного/отсутствующего Bearer.
  - `500` только для misconfiguration (секрет не задан).
- Не логировать токен/заголовок целиком; логировать только факт отказа и path.

## Test Plan
1. Middleware tests
- `/api/internal/jobs/process-outbox` + корректный secret -> pass-through.
- Тот же путь + неверный secret -> `403`.
- Тот же путь + без secret env -> `500`.
- Тот же путь + валидный JWT admin, но без Bearer secret -> `403`.

2. Route tests (defense-in-depth)
- Прямой вызов route handler без валидного Bearer -> `403`.
- С валидным Bearer -> normal flow (`200`/`500` по бизнес-результату, но не `403`).

3. Regression tests
- Обычные `/api/*` маршруты продолжают использовать JWT как раньше.
- Public маршруты (`/api/products`, webhooks, `/api/cron` по текущей политике) не меняют поведение.

## Evaluation Criteria (Done Definition)
1. Безопасность
- JWT-пользователь любого role не может вызвать `/api/internal/jobs/*` без секрета.
- Internal jobs доступны только при точном совпадении Bearer secret.

2. Fail-closed
- При unset `INTERNAL_JOB_SECRET` endpoint не открывается.

3. Стабильность
- Все существующие тесты проходят.
- Добавленные security-тесты покрывают 4 ключевых кейса: valid secret / invalid secret / missing secret / JWT-only.

4. Операционная проверка
- Ручной smoke: 3 запроса (`valid`, `invalid`, `jwt-only`) дают ожидаемые статусы.
- В логах нет утечки значения секрета.

## Assumptions
- Internal jobs не предназначены для ручного запуска через JWT (даже ADMIN).
- `Authorization` в формате `Bearer <secret>` остаётся единственным каналом авторизации для internal jobs.
