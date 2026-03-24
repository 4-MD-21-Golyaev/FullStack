# Очередь реализации страниц

Файл: `eV3fLo7RMJcyNqnFeuwHmg` (Figma)

**Статусы:** ✅ Готово · 🔄 В процессе · ⏳ Ожидает · 🧪 Требует тестирования

---

## Контур: Admin / Picker / Courier

Страницы реализованы, требуют тестирования. Компоненты не прототипированы в Figma.

| # | Страница | Маршрут | Статус | Примечание |
|---|---|---|---|---|
| 1 | Дашборд | `/admin` | 🧪 | Статистика, последние заказы |
| 2 | Список заказов | `/admin/orders` | 🧪 | Таблица, фильтры |
| 3 | Детали заказа | `/admin/orders/[id]` | 🧪 | Статус, позиции, оплата |
| 4 | Список пользователей | `/admin/users` | 🧪 | |
| 5 | Детали пользователя | `/admin/users/[id]` | 🧪 | |
| 6 | Каталог товаров | `/admin/catalog/products` | 🧪 | |
| 7 | Проблемы с оплатой | `/admin/payments/issues` | 🧪 | |
| 8 | Фоновые задания | `/admin/jobs` | 🧪 | |
| 9 | Рабочее место комплектовщика | `/picker` | 🧪 | |
| 10 | Рабочее место курьера | `/courier` | 🧪 | |

---

## Контур: Auth

| # | Страница | Маршрут | Статус | Figma node-id | Примечание |
|---|---|---|---|---|---|
| 11 | Вход (OTP) | `/login` | ⏳ | — | Запрос кода + ввод CodeInput |

### Авторизация / регистрация (модальный поток)

Customer-авторизация — не отдельные страницы, а **модальные окна** поверх текущей страницы (в дизайне — поверх корзины).

| # | Вариант | Figma node | Примечание |
|---|---|---|---|
| — | Ввод телефона | `1676:57235` | Input ✅ + Button primary ✅ + IconButton ✅ |
| — | Ввод кода | `1673:54865` | CodeInput ✅ + IconButton ✅ |
| — | Ошибка кода | `1678:33927` | CodeInput ✅ + Button tertiary ✅ + IconButton ✅ |
| — | Регистрация: данные | `606:25676` | Input × 3 ✅ + Button ✅ + IconButton ✅ |
| — | Регистрация: адрес | `1687:56520` | Input × N ✅ + IconButton ✅ |
| — | Регистрация: карта | `1687:80036` | Input ✅ + Button ✅ + IconButton ✅ + Map (external) |

**Новых shared/ui компонентов не требует** — все зависимости уже реализованы ✅.

---

## Контур: Customer

Приоритетный контур для защиты. Реализуется в порядке пользовательского пути.

| # | Страница | Маршрут | Статус | Figma node-id | Примечание |
|---|---|---|---|---|---|
| 12 | Главная | `/` | ⏳ | `606:24335` | Hero, слайдер, категории, хиты |
| 13 | Каталог (верх, 2 уровень, нижн) | `/catalog` | ⏳ | `606:25173` / `606:25242` / `606:25265` | Плитки категорий, сайдбар, подкатегории |
| 14 | Карточка товара | `/catalog/[slug]` | ⏳ | `606:25383` | Фото, описание, Tabs, Counter, кнопка в корзину |
| 15 | Корзина | `/cart` | ⏳ | `606:25552` | Позиции, итого, переход к оформлению |
| 16 | Оформление заказа | `/checkout` | ⏳ | `606:26048`…`606:27312` | Адрес, способ оплаты, подтверждение |
| 17 | Спасибо | `/checkout/success` | ⏳ | `606:27368` | Header + текст + Button + Footer |
| 18 | ЛК — история заказов | `/account/orders` | ⏳ | `606:25948` | Список заказов пользователя |
| 19 | ЛК — детали заказа | `/account/orders/[id]` | ⏳ | `1097:43020` | Детали заказа, статус, позиции |

---

## Карты зависимостей по компонентам

Транзитивные зависимости. Каждая страница → виджеты → shared/ui компоненты → вложенные атомы.

### Главная (`/`) — node `606:24335`

Структура страницы:
- **Header** (виджет) — навигация
- **Hero** — баннер-слайдер
- **Sale slider × 4** — горизонтальные слайдеры товаров
- **Loyalty section** — блок программы лояльности (custom layout)
- **Footer** (виджет) — нижний колонтитул

#### shared/ui компоненты

| Компонент | Figma node | Статус | Используется в |
|---|---|---|---|
| Logo | — | ✅ | Header, Footer, Loyalty |
| Icon | — | ✅ | Стрелки, чекмарки |
| Button | — | ✅ | «Каталог» в Header |
| IconButton | — | ✅ | Поиск, Профиль, Избранное, Адреса |
| ArrowButton | — | ✅ | Навигация слайдера |
| ArrowsContainer | — | ✅ | Hero-слайдер |
| ArrowBg | — | ✅ | Декор ArrowButton |
| LikeButton | — | ✅ | На ProductCard |
| SocialButton | — | ✅ | WA/TG в Footer |
| CartButton | — | ✅ | Header |
| **PaginationBullet** | `731:36037` | ⏳ | Hero-слайдер (точки) |
| **Pagination** | `95:3501` | ⏳ | Hero-слайдер, оборачивает PaginationBullet |
| **SaleSliderTitle** | `1396:113459` | ⏳ | Заголовок каждого Sale slider |
| **ProductCard** | `49:8613` | ⏳ | Внутри Slider (L/S, Enabled/In cart) |
| **Price** | `73:2363` | ⏳ | Внутри ProductCard (актуальная + зачёркнутая) |
| **Badge** | `270:10355` | ⚠️ | Скидка на ProductCard; существующий Badge (admin) не подходит — нужен red-pill вариант |
| **CardImage** | `1103:109741` | ⏳ | Контейнер изображения в ProductCard |
| **Slider** | `1106:58701` | ⏳ | Горизонтальный список ProductCard |
| **SliderContainer** | `1121:47056` | ⏳ | Обёртка Slider + стрелки навигации |
| **Link** | `145:4987` | ⏳ | Ссылки в Footer, Loyalty |
| **AppMarketButton** | `706:23000`–`980:46785` | ⏳ | Google Play / App Store / AppGallery / RuStore (Footer + Loyalty) |
| **Rating** | `1103:98494` | ⏳ | Опционально на ProductCard (showRating=false по умолчанию) |

#### Виджеты (`src/widgets/customer/`)

| Виджет | Статус | Зависит от shared/ui |
|---|---|---|
| **Header** | ⏳ | Logo, IconButton, CartButton, Button |
| **Footer** | ⏳ | Logo, Link, SocialButton, AppMarketButton, IconButton |

#### Критический путь (минимум для рендера страницы)

Без Rating (опционально) и без OldPrice (опционально через `showOld`):

```
Главная
├── Header → Logo, IconButton, CartButton, Button               [всё ✅]
├── Hero
│   ├── ArrowsContainer → ArrowButton, ArrowBg, Icon           [всё ✅]
│   └── Pagination → PaginationBullet                          [⏳ ⏳]
├── Sale slider × 4
│   ├── SaleSliderTitle                                         [⏳]
│   └── SliderContainer → Slider → ProductCard
│                                   ├── LikeButton             [✅]
│                                   ├── Price (+ OldPrice)     [⏳]
│                                   ├── Badge (discount)       [⏳]
│                                   ├── CardImage              [⏳]
│                                   └── IconButton             [✅]
├── Loyalty section
│   ├── Logo, Icon                                             [всё ✅]
│   ├── Link                                                   [⏳]
│   └── AppMarketButton × 4                                    [⏳]
└── Footer → Logo, Link, SocialButton, AppMarketButton, IconButton
```

**Итого нужно реализовать:** 10 shared/ui компонентов + 2 виджета

### Каталог (`/catalog`) — nodes `606:25173` / `606:25242` / `606:25265`

Три вида одной страницы: верхний уровень (плитки категорий), 2-й уровень (подкатегории + SubcategoryList), нижний (SubcategoryList без плиток).

#### shared/ui компоненты (сверх Главной)

| Компонент | Figma node | Статус | Используется в |
|---|---|---|---|
| CategoryNavItem | — | ✅ | Сайдбар категорий |
| **Breadcrumbs** | `1196:68225` | ⏳ | Хлебные крошки; только Icon (стрелка) внутри, нет вложенных shared/ui |
| **Category** (плитка) | `1121:43467` | ⏳ | Сетка категорий верхнего уровня; содержит CategoryImage (img) |
| **SubcategoryList** | `1196:70878` | ⏳ | Блок «название + Link + SliderContainer»; зависит от Link, SliderContainer, ProductCard |
| *(все компоненты Главной)* | — | ⏳/✅ | Header, Footer, ProductCard, Price, Badge, CardImage, Slider, SliderContainer, Link, AppMarketButton |

Критический путь дополнения:
```
Каталог верх: Category (плитка) → CategoryImage (inline img)
Каталог 2/3:  SubcategoryList → Link + SliderContainer → Slider → ProductCard → (Price, Badge, CardImage, LikeButton✅, IconButton✅)
```

---

### Карточка товара (`/catalog/[slug]`) — nodes `606:25383` / `606:25493` / `1976:46874`

Три варианта: базовый · «нет в наличии» (out-of-stock) · «в наличии» (in-stock с Counter).

#### shared/ui компоненты (сверх Каталога)

| Компонент | Figma node | Статус | Используется в |
|---|---|---|---|
| Tab | `79:4000` | ✅ | Вкладки «Характеристики / Пищевая ценность / …» |
| Counter | — | ✅ | Количество (только in-stock вариант: `1976:46874`) |
| **Image** | `1103:57777` | ⏳ | L (350px, default) · S/Enabled (64px thumbnail) · S/Activated (selected); кнопки для S |
| *(все компоненты Каталога)* | — | ⏳/✅ | Breadcrumbs, ProductCard в «Похожих» / «Недавно просмотренных» |

Уточнения по Price и Badge из вариантов:
- **Price L** (product page) = actual (24px) + OldPrice + **Badge** (inline в секции Old). Размер отличается от Price M на ProductCard.
- **Badge** — самостоятельный компонент; на ProductCard стоит абсолютно над CardImage, в Price L — inline рядом с OldPrice.
- Out-of-stock вариант: нет Price → показывается «Нет в наличии», кнопка «Уведомить о поступлении».

Custom layouts (не shared/ui):
- **Gallery** — вертикальный список `Image(S)` слева + крупный `Image(L)` справа
- **Product specs** — Tabs + список строк `Row` (label · dotted line · value)
- **Pricing block** — Price + Button + Counter/LikeButton
- Секции «Похожие» и «Недавно просмотренные» → повторно используют SubcategoryList

---

### Корзина (`/cart`) — node `606:25552`

Структура страницы:
- **Header** (виджет)
- Cart section
  - Title + Link «очистить»
  - List
    - «В наличии» → **WideProductCard** × N
    - «Нет в наличии» → **WideProductCard** × N (с состоянием out-of-stock)
    - «Можно заменить» → **SliderContainer** → **ProductCard**
  - Ordering sidebar
    - Button primary ✅
    - **OrderSummary**
    - **AlertBlock** (предупреждения)
- «Недавно просмотренные» → **SliderContainer** → **ProductCard**
- **Footer** (виджет)

#### shared/ui компоненты (сверх Товара)

| Компонент | Figma node | Статус | Используется в |
|---|---|---|---|
| **WideProductCard** | `196:8569` | ⏳ | Список позиций корзины (В наличии / Нет в наличии) |
| **OrderSummary** | `777:20579` | ⏳ | Sidebar итого; содержит Price + Badge (скидка) |
| **AlertBlock** | `1621:30302` | ⏳ | Предупреждения в sidebar |

Критический путь дополнения:
```
WideProductCard → CardImage, Price, Counter✅, LikeButton✅, IconButton✅
OrderSummary    → Price, Badge
AlertBlock      → (автономный, inline icon + text)
```

---

### Чекаут (`/checkout`) — nodes `606:26048`…`606:27312`

Четыре этапа в одном маршруте, переключаются через **Roadmap**.

#### Общие компоненты всех этапов

| Компонент | Figma node | Статус | Используется в |
|---|---|---|---|
| **Roadmap** | `850:31020` | ⏳ | Прогресс-трекер 4 этапа; содержит Stage + StageIcon |
| **Stage** | `1735:52934` | ⏳ | Один шаг Roadmap (label + StageIcon + линия) |
| **StageIcon** | `222:7856` | ⏳ | Иконка этапа (64px круг, active/inactive) |
| **OrderSummary** | `777:20579` | ⏳ | Sidebar итого (этапы 2–4) |

#### Этап 1 — Способ доставки (node `606:26048` / `606:26149` / `1735:53917`)

- RadioLabel ✅ — выбор способа доставки
- Tab ✅ — переключение «Курьер / Самовывоз»

#### Этап 2 — Адрес и контакты (node `1718:48233`)

- TextField ✅ — поле адреса
- LabelInput ✅ — имя, телефон получателя

#### Этап 3 — Оплата (node `606:26100`)

- RadioLabel ✅ — выбор способа оплаты

#### Этап 4 — Подтверждение (node `606:27312` / `606:26207`)

| Компонент | Figma node | Статус | Используется в |
|---|---|---|---|
| **InfoField** | `1738:46288` | ⏳ | Карточка параметра: name + param + кнопка редактирования |
| **NarrowProductCard** | `247:8394` | ⏳ | Компактная горизонтальная карточка (48px CardImage + Price S) |
| **AlertBlock** | `1621:30302` | ⏳ | Информационные блоки |

```
Roadmap   → Stage → StageIcon
InfoField → (автономный, IconButton✅ для edit/transition)
NarrowProductCard → CardImage, Price S
```

---

### Спасибо (`/checkout/success`) — node `606:27368`

Простая страница: Header + центрированный контент + Button + Footer.
Никаких новых shared/ui компонентов не требует — все зависимости уже перечислены выше.

---

### ЛК — История заказов (`/account/orders`) — node `606:25948`

Структура страницы:
- **Header** (виджет)
- **AccountTabs** sidebar — список AccountTab ✅ + Button tertiary «Выйти» ✅
- History section
  - Title + Chips-фильтры (Все / Активные / Завершенные) ✅
  - Order list — строки с `CardImage` + `OrderStateBadge` (customer) + `Price` + кнопки
- **Footer** (виджет)

Строки заказов — custom page-level layout, не отдельный shared/ui компонент.

#### shared/ui компоненты (сверх Чекаута)

| Компонент | Figma node | Статус | Используется в |
|---|---|---|---|
| **AccountTabs** | `1047:41265` | ⏳ | Sidebar ЛК (обёртка над AccountTab list + кнопка выхода) |
| **OrderStateBadge** (customer) | `1097:18614` | ⚠️ | Badge для статуса заказа: В сборке / В пути / Доставлен / Отменен. Существующий `OrderStatusBadge` в shared/ui — admin-вариант, нужно проверить совместимость |

```
AccountTabs → AccountTab✅ × N + Button tertiary✅
Order row → CardImage⏳, Price⏳, OrderStateBadge(customer)
```

---

### ЛК — Детали заказа (`/account/orders/[id]`) — node `1097:43020`

Структура страницы:
- **Header** (виджет)
- **AccountTabs** sidebar
- Order detail section
  - Title + OrderStateBadge + Button secondary/tertiary
  - Two-column info:
    - **ProfileField** × 6 — readonly поля (Получатель, Способ получения, Адрес, Комментарий, …)
    - **OrderSummary** + **ProfileField** «Способ оплаты»
  - Product list — **WideProductCard** (type=History) × N
- **Footer** (виджет)

#### shared/ui компоненты (сверх Истории заказов)

| Компонент | Figma node | Статус | Используется в |
|---|---|---|---|
| **ProfileField** | `4031:48892` | ⏳ | Readonly поле: label + value (Получатель, адрес и т.д.) |

```
ProfileField → (автономный, только текст)
WideProductCard (type=History) → CardImage⏳, Price⏳, LikeButton✅, IconButton✅
OrderSummary → Price⏳, Badge⏳
```

---

## Сводная таблица: все недостающие компоненты

Упорядочены по уровню зависимостей (атомы → молекулы → виджеты).

| # | Компонент | Figma node | Нужен для страниц | Зависит от |
|---|---|---|---|---|
| 1 | **PaginationBullet** | `731:36037` | Главная | — |
| 2 | **Breadcrumbs** | `1196:68225` | Каталог, Товар | Icon✅ |
| 3 | **SaleSliderTitle** | `1396:113459` | Главная | — |
| 4 | **Category** (плитка) | `1121:43467` | Каталог верх | — |
| 5 | **StageIcon** | `222:7856` | Чекаут | — |
| 6 | **Price** | `73:2363` | Главная, Каталог, Товар, Корзина, Чекаут | Badge (для L-варианта) |
| 7 | **Badge** (discount) | `270:10355` | ProductCard (abs), Price L (inline), OrderSummary | — |
| 8 | **CardImage** | `1103:109741` | Главная, Каталог, Товар, Корзина, Чекаут | — |
| 9 | **Image** (product) | `1103:57777` | Товар | — |
| 10 | **Link** | `145:4987` | Главная, Каталог, Корзина | — |
| 11 | **AlertBlock** | `1621:30302` | Корзина, Чекаут | — |
| 12 | **AppMarketButton** × 4 | `706:23000`… | Главная, все (Footer) | — |
| 13 | **Pagination** | `95:3501` | Главная | PaginationBullet |
| 14 | **Stage** | `1735:52934` | Чекаут | StageIcon |
| 15 | **InfoField** | `1738:46288` | Чекаут (этап 4) | IconButton✅ |
| 16 | **ProductCard** | `49:8613` | Главная, Каталог, Товар, Корзина | Price, Badge, CardImage, LikeButton✅, IconButton✅ |
| 17 | **NarrowProductCard** | `247:8394` | Чекаут (этап 4) | CardImage, Price |
| 18 | **WideProductCard** | `196:8569` | Корзина | CardImage, Price, Counter✅, LikeButton✅ |
| 19 | **Slider** | `1106:58701` | Главная, Каталог, Товар, Корзина | ProductCard |
| 20 | **SliderContainer** | `1121:47056` | Главная, Каталог, Товар, Корзина | Slider, ArrowButton✅ |
| 21 | **SubcategoryList** | `1196:70878` | Каталог, Товар | Link, SliderContainer, ProductCard |
| 22 | **OrderSummary** | `777:20579` | Корзина, Чекаут, ЛК заказ | Price, Badge |
| 23 | **Roadmap** | `850:31020` | Чекаут | Stage, StageIcon |
| 24 | **ProfileField** | `4031:48892` | ЛК заказ | — |
| 25 | **AccountTabs** | `1047:41265` | ЛК все страницы | AccountTab✅, Button✅ |
| — | **Header** (виджет) | `765:25905` | все | Logo✅, IconButton✅, CartButton✅, Button✅ |
| — | **Footer** (виджет) | `1121:55505` | все | Logo✅, Link, SocialButton✅, AppMarketButton, IconButton✅ |
| — | **Rating** | `1103:98494` | опционально | — |

**Итого: 25 shared/ui компонентов + 2 виджета** (Rating — опциональный, можно отложить)

> `OrderStateBadge` (customer) — **заменяет** существующий `OrderStatusBadge`: существующий компонент расширяется customer-состояниями (В сборке / В пути / Доставлен / Отменен) и переименовывается. Отдельный компонент не создаётся.

---

## Примечание

---

## Решение об архитектуре реализации

**Принятый подход: Page-Driven Development**

Фронтенд реализуется не в порядке «сначала весь UI Kit, потом страницы», а **страница за страницей по приоритету пользовательского пути**. Для каждой страницы:
1. Определяется минимальный набор компонентов, необходимых для её рендера
2. Реализуются только эти компоненты (в порядке зависимостей: атомы → молекулы → виджеты)
3. Собирается страница
4. Переход к следующей странице

Это позволяет получить рабочий пользовательский путь как можно раньше и избежать реализации компонентов, которые не войдут в финальный объём.

---

## Итоговый реестр работ

### Компоненты: только новые / расширяемые

Из 86 компонентов UI Kit для реализации всех customer-страниц нужен 21 новый + 1 расширение:

| # | Компонент | Figma node | Нужен для |
|---|---|---|---|
| 1 | **Link** | `145:4987` | Главная, Каталог, Корзина, Footer |
| 2 | **PaginationBullet** | `731:36037` | Главная |
| 3 | **SaleSliderTitle** | `1396:113459` | Главная |
| 4 | **Badge** (discount, red-pill) | `270:10355` | ProductCard, Price L, OrderSummary |
| 5 | **Price** | `73:2363` | Главная, Каталог, Товар, Корзина, Чекаут, ЛК |
| 6 | **CardImage** | `1103:109741` | Главная, Каталог, Товар, Корзина, ЛК |
| 7 | **Image** (product gallery) | `1103:57777` | Карточка товара |
| 8 | **AlertBlock** | `1621:30302` | Корзина, Чекаут |
| 9 | **StageIcon** | `222:7856` | Чекаут |
| 10 | **AppMarketButton** (4 варианта) | `706:23000`… | Главная, Footer |
| 11 | **Breadcrumbs** | `1196:68225` | Каталог, Товар |
| 12 | **Category** (плитка) | `1121:43467` | Каталог верхний |
| 13 | **Pagination** | `95:3501` | Главная |
| 14 | **Stage** | `1735:52934` | Чекаут |
| 15 | **InfoField** | `1738:46288` | Чекаут этап 4 |
| 16 | **ProfileField** | `4031:48892` | ЛК заказ |
| 17 | **AccountTabs** | `1047:41265` | ЛК все страницы |
| 18 | **ProductCard** | `49:8613` | Главная, Каталог, Товар, Корзина |
| 19 | **NarrowProductCard** | `247:8394` | Чекаут этап 4 |
| 20 | **WideProductCard** | `196:8569` | Корзина, ЛК заказ |
| 21 | **OrderSummary** | `777:20579` | Корзина, Чекаут, ЛК заказ |
| 22 | **Slider** | `1106:58701` | Главная, Каталог, Корзина |
| 23 | **SliderContainer** | `1121:47056` | Главная, Каталог, Корзина |
| 24 | **SubcategoryList** | `1196:70878` | Каталог, Товар |
| 25 | **Roadmap** | `850:31020` | Чекаут |
| ↺ | **OrderStatusBadge** (расширить) | `1097:18614` | ЛК история, ЛК заказ — добавить customer-состояния |

### Виджеты: новые

| # | Виджет | Figma node | Нужен для |
|---|---|---|---|
| 1 | **Header** | `765:25905` | Все customer-страницы |
| 2 | **Footer** | `1121:55505` | Все customer-страницы |
| 3 | **MobilePanel** | `1702:46474` | Мобильная навигация (все страницы) |
| 4 | **CartPanel** | `1732:36508` | Мобильная панель корзины |
| 5 | **OrderPanel** | `1738:50199` | Мобильная панель заказа |
| 6 | **MobileOverlay** | `1732:34767` | Обёртка для CartPanel и OrderPanel |

MobilePanel зависит от MobilePanelButton ✅ и MobilePanelCartButton ✅ (уже реализованы).
MobileOverlay зависит от CartPanel и OrderPanel.

### Итог

| Категория | Кол-во |
|---|---|
| Новые shared/ui компоненты | **25** |
| Расширение существующего компонента | **1** (OrderStatusBadge) |
| Новые виджеты | **6** |
| **Итого единиц работ** | **32** |

Из 86 компонентов UI Kit **56 не нужны** для текущего объёма (реализуются по мере появления новых требований).
