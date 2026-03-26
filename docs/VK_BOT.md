# VK Bot + Mini App — документация по реализации

## Оглавление

1. [Архитектура](#1-архитектура)
2. [Настройка VK-приложения](#2-настройка-vk-приложения)
3. [Переменные окружения](#3-переменные-окружения)
4. [Флоу аутентификации](#4-флоу-аутентификации)
5. [Маршрутизация по роли](#5-маршрутизация-по-роли)
6. [Привязка VK-аккаунта к системному пользователю](#6-привязка-vk-аккаунта-к-системному-пользователю)
7. [Реализация бота (VK Bots API)](#7-реализация-бота-vk-bots-api)
8. [Что нужно реализовать в Next.js](#8-что-нужно-реализовать-в-nextjs)
9. [Примечание о cookies](#9-примечание-о-cookies)

---

## 1. Архитектура

```
┌─────────────────────────────────────────────────────────┐
│  VK                                                     │
│                                                         │
│  [Пользователь пишет боту]                              │
│         ↓                                               │
│  [Бот отвечает кнопкой «Открыть панель»]                │
│         ↓                                               │
│  [VK открывает Mini App по URL: https://your-app/vk]    │
│    + подписанные launch params в строке запроса         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Next.js — страница /vk (новая)                         │
│                                                         │
│  1. Читает window.location.search (vk_user_id, sign...) │
│  2. POST /api/auth/vk  { queryString }                  │
│         ↓                                               │
│  3. Сервер проверяет HMAC-SHA256 подпись VK             │
│  4. Ищет vkUserId в таблице VkIdentity → userId        │
│  5. Выдаёт JWT в httpOnly cookies                       │
│         ↓                                               │
│  6. Клиент редиректит на страницу по роли:              │
│     ADMIN   → /admin                                    │
│     PICKER/STAFF → /picker                              │
│     COURIER → /courier                                  │
│     Не привязан → показывает сообщение об ошибке        │
└─────────────────────────────────────────────────────────┘
```

Существующие страницы (`/admin`, `/picker`, `/courier`) не меняются — они уже защищены через `useRoleGuard`.

---

## 2. Настройка VK-приложения

1. Открыть [vk.com/editapp?act=create](https://vk.com/editapp?act=create), тип — **VK Mini Apps**.
2. В настройках приложения:
   - **URL приложения** → `https://your-domain/vk`
   - **Мобильный URL** → тот же `https://your-domain/vk`
3. Перейти в раздел **Боты** → включить бота для сообщества.
4. Настроить **Webhook** для получения событий от бота:
   - URL: `https://your-domain/api/vk/webhook`
   - Версия API: `5.199`
5. В разделе **Ключи доступа** сохранить:
   - `client_secret` → `VK_APP_SECRET`
   - Ключ доступа сообщества → `VK_GROUP_TOKEN`
   - ID приложения → `VK_APP_ID`
   - ID сообщества → `VK_GROUP_ID`

---

## 3. Переменные окружения

Добавить в `.env`:

```env
VK_APP_SECRET=               # client_secret из настроек Mini App (для валидации подписи)
VK_GROUP_TOKEN=              # ключ доступа сообщества (для отправки сообщений от бота)
VK_APP_ID=                   # числовой ID Mini App
VK_GROUP_ID=                 # числовой ID сообщества (отрицательное число для группы)
```

Из уже существующих переменных дополнительно ничего не нужно.

---

## 4. Флоу аутентификации

### Схема (подробно)

```
VK Mini App открывается по URL:
  https://your-domain/vk?vk_user_id=123&vk_app_id=456&vk_ts=...&sign=<hmac>

                │
                ▼
        страница /vk (клиент)
                │
                ├─ читает location.search
                │
                ▼
        POST /api/auth/vk
        { queryString: "vk_user_id=123&...&sign=..." }
                │
                ▼
        VkAuthUseCase.execute()
                │
                ├─ validateVkSignature()   → 401 если невалидна
                ├─ VkIdentityRepository.findUserIdByVkUserId()  → 403 если не найден
                ├─ UserRepository.findById()
                └─ TokenService.sign...()  → JWT в httpOnly cookies
                │
                ▼
        клиент получает { ok: true }
                │
                ▼
        GET /api/auth/me  →  { role: "ADMIN" }
                │
                ▼
        router.replace('/admin')   ← или /picker, /courier
```

### Коды ответа `/api/auth/vk`

| Код | Причина | Что показать пользователю |
|-----|---------|--------------------------|
| 200 | Успех | редирект |
| 401 | Подпись VK невалидна | «Не удалось войти. Попробуйте снова.» |
| 403 | VK-аккаунт не привязан | «Ваш VK-аккаунт не привязан. Обратитесь к администратору.» |
| 404 | Пользователь удалён из системы | «Аккаунт не найден. Обратитесь к администратору.» |
| 503 | `VK_APP_SECRET` не задан | ошибка конфигурации |

---

## 5. Маршрутизация по роли

После успешного `/api/auth/vk` страница `/vk` вызывает `GET /api/auth/me` и редиректит:

```typescript
const ROLE_REDIRECT: Record<string, string> = {
    ADMIN:   '/admin',
    PICKER:  '/picker',
    STAFF:   '/picker',
    COURIER: '/courier',
};
```

Если роль не входит в этот список (например `CUSTOMER`) — показывать сообщение: «У вас нет доступа к рабочей панели».

Существующие layout'ы `/admin/layout.tsx`, `/picker/layout.tsx`, `/courier/layout.tsx` уже содержат `useRoleGuard` — они отклонят неавторизованный доступ и сами вернут на `/login`, если JWT вдруг истёк.

---

## 6. Привязка VK-аккаунта к системному пользователю

Привязка выполняется однократно — до первого входа через VK. Два способа:

### Способ A — через существующий UI (рекомендуется)

Сотрудник:
1. Входит в систему обычным способом (email + OTP).
2. В личном кабинете нажимает «Привязать VK» — кнопка открывает Mini App.
3. Mini App при открытии вызывает:

```http
POST /api/auth/vk/link
Authorization: (cookie-сессия уже есть)
Content-Type: application/json

{ "queryString": "<полная строка запроса из location.search>" }
```

4. Сервер проверяет подпись, сохраняет `VkIdentity(vkUserId, userId)`.

### Способ B — вручную через Prisma Studio / SQL

Если у сотрудника нет возможности войти через UI:

```sql
INSERT INTO "VkIdentity" ("vkUserId", "userId", "createdAt")
VALUES ('123456789', 'uuid-пользователя', now());
```

VK User ID можно узнать в профиле VK (числовой ID в URL страницы).

### Отвязка

```http
DELETE /api/auth/vk/link
```

---

## 7. Реализация бота (VK Bots API)

Бот нужен для одного: отправить кнопку «Открыть панель», которая открывает Mini App.

### Обработка входящих сообщений

VK отправляет события на вебхук `POST /api/vk/webhook`. Структура события:

```json
{
  "type": "message_new",
  "object": {
    "message": {
      "from_id": 123456789,
      "text": "start"
    }
  },
  "group_id": 987654321,
  "secret": "...",
  "v": "5.199"
}
```

### Ответ с кнопкой Mini App

На **любое** входящее сообщение бот отвечает клавиатурой с кнопкой типа `open_app`:

```json
{
  "keyboard": {
    "inline": false,
    "buttons": [
      [
        {
          "action": {
            "type": "open_app",
            "app_id": 12345678,
            "owner_id": -987654321,
            "label": "Открыть панель"
          }
        }
      ]
    ]
  }
}
```

Отправка через VK API `messages.send`:

```
POST https://api.vk.com/method/messages.send
  ?user_id={from_id}
  &message=Добро пожаловать!
  &keyboard={...}
  &random_id={random}
  &v=5.199
  &access_token={VK_GROUP_TOKEN}
```

### Верификация вебхука

При первоначальной настройке VK отправляет запрос типа `confirmation` — нужно вернуть строку-подтверждение из настроек приложения:

```typescript
if (body.type === 'confirmation') {
    return Response.json(process.env.VK_CONFIRMATION_STRING);
}
```

Добавить ещё одну переменную:

```env
VK_CONFIRMATION_STRING=   # строка из настроек вебхука в VK
```

### Роут вебхука — `POST /api/vk/webhook`

Псевдокод обработчика:

```typescript
export async function POST(req: NextRequest) {
    const body = await req.json();

    // Подтверждение вебхука при первоначальной настройке
    if (body.type === 'confirmation') {
        return new Response(process.env.VK_CONFIRMATION_STRING, { status: 200 });
    }

    // Только сообщения
    if (body.type !== 'message_new') {
        return Response.json({ response: 'ok' });
    }

    const userId = body.object.message.from_id;

    await sendVkMessage(userId, 'Добро пожаловать!', openAppKeyboard());

    return Response.json({ response: 'ok' });
}
```

VK требует ответ `{ response: 'ok' }` в течение 5 секунд — тяжёлую логику выносить в фон.

---

## 8. Что нужно реализовать в Next.js

| # | Файл | Что делать |
|---|------|-----------|
| 1 | `src/app/vk/page.tsx` | Страница-вход: читает `location.search`, вызывает `/api/auth/vk`, редиректит по роли или показывает ошибку |
| 2 | `src/app/api/vk/webhook/route.ts` | Обработчик событий VK Bots API (confirmation + message_new) |
| 3 | `src/lib/vk/send-message.ts` | Утилита отправки сообщений через VK API `messages.send` |
| 4 | `.env` | Добавить `VK_APP_SECRET`, `VK_GROUP_TOKEN`, `VK_APP_ID`, `VK_GROUP_ID`, `VK_CONFIRMATION_STRING` |

Существующий бэкенд (`VkAuthUseCase`, `/api/auth/vk`, `/api/auth/vk/link`) уже реализован.

### Страница `/vk` — логика (упрощённо)

```tsx
'use client';

export default function VkEntryPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const queryString = window.location.search.slice(1); // убираем "?"

        fetch('/api/auth/vk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ queryString }),
        })
        .then(async (res) => {
            if (!res.ok) {
                const data = await res.json();
                setError(data.message);
                return;
            }
            // Узнаём роль и редиректим
            const me = await fetch('/api/auth/me').then(r => r.json());
            const redirect = ROLE_REDIRECT[me.role] ?? null;
            if (redirect) router.replace(redirect);
            else setError('У вас нет доступа к рабочей панели.');
        })
        .catch(() => setError('Ошибка соединения. Попробуйте снова.'));
    }, []);

    if (error) return <ErrorScreen message={error} />;
    return <LoadingScreen />;
}
```

---

## 9. Примечание о cookies

Текущая сессия хранится в `httpOnly`-cookie с `sameSite: 'lax'`.

| Контекст | Работает? |
|----------|-----------|
| VK Mobile (iOS / Android) — WebView | **Да** — Mini App открывается как отдельная страница, не iframe |
| VK Web (vk.com) — iframe | **Нет** — `sameSite: 'lax'` блокирует cookies в кросс-сайт iframe |

Если поддержка вк.com (браузер) нужна — изменить `setTokenCookies` в `src/lib/auth/session.ts`:

```typescript
sameSite: 'none',   // вместо 'lax'
secure: true,        // обязательно при none
```

Это требует HTTPS на production. На `localhost` VK Mini App в браузере недоступна в любом случае — тестировать через ngrok или аналог.
