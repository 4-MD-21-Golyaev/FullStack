# VK Bot — реализационный spec

Этот файл описывает точно, что и как реализовать. Читай его перед началом работы по VK-боту.

## Что уже реализовано (не трогать)

- `src/domain/auth/errors.ts` — `InvalidVkSignatureError`, `VkIdentityNotLinkedError`
- `src/lib/auth/vk-signature.ts` — `validateVkSignature(queryString, secret)`
- `src/application/auth/VkAuthUseCase.ts`
- `src/application/ports/VkIdentityRepository.ts`
- `src/infrastructure/repositories/VkIdentityRepository.prisma.ts`
- `src/app/api/auth/vk/route.ts` — `POST /api/auth/vk`
- `src/app/api/auth/vk/link/route.ts` — `POST /api/auth/vk/link`, `DELETE /api/auth/vk/link`
- `prisma/schema.prisma` — модель `VkIdentity`

## Что нужно реализовать

### 1. `src/lib/vk/send-message.ts`

Утилита отправки сообщений через VK API `messages.send`. Не использует никаких VK SDK — только `fetch`.

```
URL: https://api.vk.com/method/messages.send
Method: POST (form-urlencoded)
Params:
  user_id      — числовой VK ID получателя
  message      — текст
  keyboard     — JSON.stringify(keyboard) если передан
  random_id    — Math.floor(Math.random() * 1e9)
  v            — '5.199'
  access_token — process.env.VK_GROUP_TOKEN
```

Функция `sendVkMessage(userId: number, message: string, keyboard?: VkKeyboard): Promise<void>`.

Типы:
```typescript
interface VkKeyboard {
    inline: boolean;
    buttons: VkButton[][];
}

interface VkButton {
    action: {
        type: 'open_app';
        app_id: number;   // Number(process.env.VK_APP_ID)
        owner_id: number; // Number(process.env.VK_GROUP_ID) — отрицательное для группы
        label: string;
    };
}
```

Если `VK_GROUP_TOKEN` не задан — бросить `Error('VK_GROUP_TOKEN is not configured')`.

Ответ VK: `{ response: number }` при успехе или `{ error: { error_msg: string } }` при ошибке. Если в ответе есть `error` — бросить `Error(response.error.error_msg)`.

---

### 2. `src/app/api/vk/webhook/route.ts`

`POST`-обработчик событий от VK Bots API. Должен отвечать в течение 5 секунд.

**Алгоритм:**

1. Читать тело запроса как JSON.
2. Если `body.type === 'confirmation'`:
   - Вернуть `new Response(process.env.VK_CONFIRMATION_STRING ?? '', { status: 200 })` — строго plain text, не JSON.
3. Если `body.type === 'message_new'`:
   - `fromId = body.object.message.from_id` (число).
   - Вызвать `sendVkMessage(fromId, 'Добро пожаловать!', openAppKeyboard())`.
   - `openAppKeyboard()` — локальная функция, возвращает `VkKeyboard` с одной кнопкой `open_app`.
   - `app_id = Number(process.env.VK_APP_ID)`, `owner_id = Number(process.env.VK_GROUP_ID)`.
   - Ответить `NextResponse.json({ response: 'ok' })`.
4. Для всех остальных типов — сразу `NextResponse.json({ response: 'ok' })`.
5. Ошибки внутри `message_new` логировать через `console.error`, но всё равно возвращать `{ response: 'ok' }` — VK не должен получать 5xx.

---

### 3. `src/app/vk/page.tsx` + `src/app/vk/vk.module.css`

Страница-вход Mini App. `'use client'`. Один `useEffect` при монтировании.

Состояния:
```typescript
type State =
    | { status: 'loading' }
    | { status: 'error'; message: string }
```
Изначально `{ status: 'loading' }`.

**Логика `useEffect`:**

```
1. queryString = window.location.search.slice(1)
   Если пустой → error('Не удалось получить данные от VK.')

2. POST /api/auth/vk  { queryString }

3. Если !res.ok:
   401 → 'Не удалось войти. Попробуйте закрыть и открыть приложение заново.'
   403 → 'Ваш VK-аккаунт не привязан к системе. Обратитесь к администратору.'
   404 → 'Аккаунт не найден. Обратитесь к администратору.'
   503 → 'Сервис временно недоступен.'
   иначе → data.message ?? 'Произошла ошибка.'

4. Если res.ok:
   GET /api/auth/me
   role → router.replace(ROLE_REDIRECT[role])
   Если роль не в таблице → error('У вас нет доступа к рабочей панели.')

5. catch → error('Ошибка соединения. Попробуйте снова.')
```

ROLE_REDIRECT:
```typescript
const ROLE_REDIRECT: Record<string, string> = {
    ADMIN:   '/admin',
    PICKER:  '/picker',
    STAFF:   '/picker',
    COURIER: '/courier',
};
```

**JSX:**

- `loading` → `<Spinner size="lg" label="Авторизация..." />` из `@/shared/ui`, по центру экрана.
- `error` → карточка по центру: заголовок «Ошибка входа», текст ошибки. Кнопок нет.

**CSS — только `--ctx-*` токены:**

```css
.page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--ctx-color-bg-page);
    padding: var(--ctx-space-inset-xl);
}

.card {
    background: var(--ctx-color-bg-surface);
    border: var(--card-border);
    border-radius: var(--ctx-radius-card);
    box-shadow: var(--ctx-shadow-card);
    padding: var(--ctx-space-stack-lg);
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: var(--ctx-space-stack-md);
}

.title {
    font-size: var(--ctx-font-size-h3);
    font-weight: 700;
    color: var(--ctx-color-text-default);
    margin: 0;
}

.message {
    font-size: var(--ctx-font-size-label);
    color: var(--ctx-color-text-secondary);
    margin: 0;
}
```

---

## Переменные окружения (добавить в `.env`)

```
VK_APP_SECRET=               # client_secret приложения VK Mini App
VK_GROUP_TOKEN=              # ключ доступа сообщества
VK_APP_ID=                   # числовой ID Mini App
VK_GROUP_ID=                 # числовой ID сообщества (отрицательный для группы)
VK_CONFIRMATION_STRING=      # строка подтверждения вебхука из настроек VK
```

---

## Порядок реализации

1. `src/lib/vk/send-message.ts`
2. `src/app/api/vk/webhook/route.ts`
3. `src/app/vk/vk.module.css` + `src/app/vk/page.tsx`

## Антипаттерны — не делать

- Не использовать `--primitive-*` в CSS
- Не создавать отдельный layout для `/vk`
- Не менять `sameSite` в `src/lib/auth/session.ts` без отдельной задачи
- Не добавлять retry на клиенте — пользователь переоткрывает Mini App сам
- Не логировать через `console.log` в продакшн-коде (только `console.error` в webhook)
