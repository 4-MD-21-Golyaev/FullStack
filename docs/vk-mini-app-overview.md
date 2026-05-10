# VK Mini App — сводка по реализации

## 1. Назначение

VK Mini App встроен в систему как альтернативный способ входа для сотрудников (сборщиков, курьеров, администраторов). Вместо ввода e-mail и одноразового кода сотрудник открывает приложение прямо из VK — авторизация происходит автоматически на основе подписанных параметров запуска.

Покупатели через VK Mini App не входят — Mini App предназначен исключительно для рабочих панелей (`/admin`, `/picker`, `/courier`).

---

## 2. Архитектура

```
┌──────────────────────────────────────────────┐
│  ВКонтакте                                   │
│                                              │
│  Пользователь пишет боту сообщества          │
│           ↓                                  │
│  Бот отвечает кнопкой «Открыть панель»       │
│           ↓                                  │
│  VK открывает Mini App:                      │
│    https://your-domain/vk                    │
│    ?vk_user_id=123&vk_app_id=456             │
│    &vk_ts=...&sign=<hmac-sha256>             │
└──────────────────┬───────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│  Next.js — страница /vk                      │
│                                              │
│  1. Читает launch params из URL              │
│  2. POST /api/auth/vk { queryString }        │
│  3. Получает JWT в httpOnly cookie           │
│  4. GET /api/auth/me → узнаёт роль           │
│  5. router.replace('/admin' | '/picker' ...) │
└──────────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│  PostgreSQL (через Prisma)                   │
│                                              │
│  VkIdentity: vkUserId ↔ userId              │
│  User: роль, email, статус                   │
└──────────────────────────────────────────────┘
```

**Ключевые файлы:**

| Слой | Файл |
|------|------|
| Клиент (страница) | `src/app/vk/VkEntryPage.tsx` |
| API-роут авторизации | `src/app/api/auth/vk/route.ts` |
| Use-case | `src/application/auth/VkAuthUseCase.ts` |
| Валидация подписи | `src/lib/auth/vk-signature.ts` |
| Репозиторий привязки | `src/infrastructure/repositories/VkIdentityRepository.prisma.ts` |
| VK Bot (webhook) | `src/app/api/vk/webhook/route.ts` |
| Отправка сообщений | `src/lib/vk/send-message.ts` |

---

## 3. Флоу аутентификации

```
VK запускает Mini App по URL с параметрами:
  vk_user_id, vk_app_id, vk_ts, vk_sign_ts, sign

          │
          ▼
  /vk (клиент, useEffect)
          │
          ├── читает window.location.search (или VKWebAppGetLaunchParams через vk-bridge)
          │
          ▼
  POST /api/auth/vk
  { queryString: "vk_user_id=123&...&sign=..." }
          │
          ▼
  VkAuthUseCase.execute()
          │
          ├── validateVkSignature()
          │     → 401 если подпись неверна
          │
          ├── VkIdentityRepository.findUserIdByVkUserId()
          │     → 403 если VK-аккаунт не привязан
          │     → переход к форме привязки (OTP + автоматическая привязка)
          │
          ├── UserRepository.findById()
          │     → 404 если пользователь удалён
          │
          └── TokenService.signAccessToken() + signRefreshToken()
                → JWT в httpOnly cookies
          │
          ▼
  клиент: GET /api/auth/me → { role }
          │
          ▼
  router.replace('/admin' | '/picker' | '/courier')
```

---

## 4. Валидация подписи VK (HMAC-SHA256)

VK подписывает параметры запуска с помощью `client_secret` приложения. Алгоритм проверки:

1. Из строки запроса выбрать все параметры, начинающиеся с `vk_`
2. Отсортировать их по имени ключа (алфавитно)
3. Собрать строку вида `key=value&key=value&...`
4. Вычислить `HMAC-SHA256(строка, VK_APP_SECRET)`, закодировать в `base64url`
5. Сравнить с параметром `sign` из запроса

```
Строка запроса:
  vk_user_id=123&vk_app_id=456&vk_ts=1700000000&sign=<hash>

Шаг 1 — фильтр vk_*:
  vk_app_id=456, vk_ts=1700000000, vk_user_id=123

Шаг 2 — сортировка:
  vk_app_id=456, vk_ts=1700000000, vk_user_id=123

Шаг 3 — payload:
  "vk_app_id=456&vk_ts=1700000000&vk_user_id=123"

Шаг 4 — HMAC-SHA256 → base64url

Шаг 5 — сравнение со значением sign
```

Реализация: `src/lib/auth/vk-signature.ts` — функция `validateVkSignature(queryString, clientSecret)`.

---

## 5. Привязка VK-аккаунта

Перед первым входом через VK необходимо связать VK ID сотрудника с его учётной записью в системе.

### Способ A — через форму в Mini App (рекомендуется)

Если сотрудник открыл Mini App, но его VK-аккаунт ещё не привязан, сервер возвращает `403`. Клиент переходит в режим привязки:

1. Отображается форма OTP-авторизации (ввод e-mail → код → вход).
2. После успешного OTP-входа клиент автоматически вызывает:

```http
POST /api/auth/vk/link
Authorization: (cookie-сессия из шага 2)
{ "queryString": "<launch params>" }
```

3. Сервер проверяет подпись и сохраняет `VkIdentity(vkUserId, userId)`.
4. Дальнейшие входы через VK выполняются без OTP — автоматически.

### Способ B — вручную через SQL

```sql
INSERT INTO "VkIdentity" ("vkUserId", "userId", "createdAt")
VALUES ('123456789', 'uuid-пользователя', now());
```

VK User ID виден в URL профиля ВКонтакте.

### Отвязка

```http
DELETE /api/auth/vk/link
```

---

## 6. VK Bot

Бот нужен для одной цели: отправить кнопку, открывающую Mini App, в ответ на любое входящее сообщение.

### Подтверждение вебхука

При первоначальной настройке VK отправляет `POST /api/vk/webhook` с `type: "confirmation"`. Сервер должен вернуть строку-подтверждение из настроек:

```http
HTTP/1.1 200 OK
Content-Type: text/plain

abc123confirmationstring
```

### Обработка входящих сообщений

На `message_new` сервер отвечает сообщением с клавиатурой типа `open_app`:

```
VK Bots API — messages.send
  user_id      → vkUserId отправителя
  message      → "Добро пожаловать!"
  keyboard     → кнопка open_app (тип mini-app)
  access_token → VK_GROUP_TOKEN
  v            → 5.199
```

Структура кнопки:
```json
{
  "action": {
    "type": "open_app",
    "app_id": <VK_APP_ID>,
    "owner_id": <VK_GROUP_ID>,
    "label": "Открыть панель"
  }
}
```

VK требует ответ `{ response: "ok" }` в течение 5 секунд. Тяжёлая логика выносится в фон.

---

## 7. Маршрутизация по роли

После успешной авторизации клиент запрашивает `/api/auth/me` и выполняет редирект:

| Роль | Рабочая панель |
|------|---------------|
| `ADMIN` | `/admin` |
| `PICKER` | `/picker` |
| `STAFF` | `/picker` |
| `COURIER` | `/courier` |
| `CUSTOMER` или неизвестная | Сообщение об ошибке доступа |

Существующие layout-файлы (`/admin/layout.tsx`, `/picker/layout.tsx`, `/courier/layout.tsx`) содержат `useRoleGuard` — они самостоятельно защищают страницы от неавторизованного доступа.

---

## 8. Обработка ошибок

| HTTP-код | Причина | Сообщение пользователю |
|----------|---------|------------------------|
| 200 | Успех | редирект |
| 401 | Подпись VK невалидна | «Не удалось войти. Попробуйте закрыть и открыть приложение заново.» |
| 403 | VK-аккаунт не привязан | переход к форме OTP-привязки |
| 404 | Пользователь удалён из системы | «Аккаунт не найден. Обратитесь к администратору.» |
| 503 | `VK_APP_SECRET` не задан | «Сервис временно недоступен.» |

---

## 9. Особенности cookies

Сессия хранится в `httpOnly`-cookie с `sameSite: lax`.

| Контекст | Работает? | Пояснение |
|----------|-----------|-----------|
| VK Mobile (iOS / Android) — WebView | Да | Mini App открывается как отдельная страница |
| VK Web (vk.com) — iframe | Нет | `sameSite: lax` блокирует cookies в кросс-сайт iframe |

Для поддержки браузерной версии VK потребовалось бы изменить `sameSite: 'none'` + `secure: true` в `src/lib/auth/session.ts`, что требует HTTPS на продакшене.

---

## 10. Переменные окружения

```env
VK_APP_SECRET=            # client_secret Mini App — для проверки подписи
VK_GROUP_TOKEN=           # ключ доступа сообщества — для отправки сообщений ботом
VK_APP_ID=                # числовой ID Mini App — для кнопки open_app
VK_GROUP_ID=              # числовой ID сообщества (отрицательный для группы)
VK_CONFIRMATION_STRING=   # строка подтверждения вебхука из настроек VK
```
