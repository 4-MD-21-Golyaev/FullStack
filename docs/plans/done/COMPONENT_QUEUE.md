# Очередь реализации компонентов UI Kit

Файл: `eV3fLo7RMJcyNqnFeuwHmg` (Figma)
Страница с компонентами: `node-id=1-7`

**Статусы:** ✅ Готово · 🔄 В процессе · ⏳ Ожидает

---

## Группа 0 — Фундамент

| # | Компонент | Figma node-id | Статус | Примечание |
|---|---|---|---|---|
| 1 | Icon | — | ✅ | 46 иконок inline SVG, `IconName` тип |
| 2 | Logo | — | ✅ | Full / Default / Favicon, чистый CSS |

---

## Группа 1 — Кнопки

| # | Компонент | Figma node-id | Статус | Примечание |
|---|---|---|---|---|
| 3 | Button (tertiary) | `926:18962` | ✅ | Расширен существующий Button |
| 4 | IconButton | `34:1136` | ✅ | XS/S/M/L × White/Gray/Red × 4 состояния |
| 5 | ArrowButton | `34:1307` | ✅ | S/M/L × Left/Right × 3 состояния |
| 6 | ArrowsContainer | `1109:17714` | ✅ | Обёртка над двумя ArrowButton |
| 7 | ArrowBg | `1106:22433` | ✅ | Декоративный белый овал, inline SVG S/M/L |
| 8 | LikeButton | `95:4103` | ✅ | 4 состояния, active = красное сердце |
| 9 | SocialButton | `715:45970` | ✅ | White/Gray × 3 состояния (WA/TG/VK) |
| 10 | CartButton | `280:13067` | ✅ | 52px, cart icon + красный бейдж |
| 11 | MobilePanelButton | `1702:46484` | ✅ | 84×64px, icon + Enabled/Focused/Activated |
| 12 | MobilePanelCartButton | `1702:53431` | ✅ | 84×64px, cart + красный бейдж |

---

## Группа 2 — Поля ввода

| # | Компонент | Figma node-id | Статус | Примечание |
|---|---|---|---|---|
| 13 | Input | `18:1099` | ✅ | S/M/L + Color=Gray/White, size/Omit конфликт решён |
| 14 | TextField | `208:8007` | ✅ | textarea L/M, resize icon, error/hint |
| 15 | Search | `1119:92081` | ✅ | L/S × Enabled/Collapsed, анимация max-width |
| 16 | Select | `18:1108` | ✅ | L/S × Enabled/Activated, click-outside, controlled |
| 17 | SelectOption | `18:1129` | ✅ | L/S × Enabled/Hovered/Focused, selected state |
| 18 | Multiselect | `168:6761` | ✅ | L/S × Enabled/Activated, toggle без закрытия, "Выбрано: N" |
| 19 | LabelInput | `479:26948` | ✅ | M/S × Enabled/Activated, floating label, icon slot |
| 20 | NumInput | `188:5831` | ✅ | Amount/Weight × Enabled/Activated, unit overlay |
| 21 | Counter | `188:6195` | ✅ | L/S, controlled, IconButton ±, overflow:hidden pill |
| 22 | Chips | `926:27591` | ✅ | L/M/S × 5 состояний, onDismiss, новый токен neutral-250 |
| 23 | PaymentChips | `220:7493` | ✅ | 4 состояния, logo slot, новый токен neutral-150 |
| 24 | Switch + SwitchLabel | `178:5698` / `178:5704` | ✅ | CSS-only thumb, role=switch, label wrapper |
| 25 | Radio + RadioLabel | `208:7934` / `208:7940` | ✅ | visually-hidden input, ::after dot, label wrapper |
| 26 | Tab | `79:4000` | ✅ | active underline span, border-radius-full |
| 27 | AccountTab | `1315:45789` | ✅ | 3 состояния, Icon arrow via CSS opacity |
| 28 | CodeSegment | `1678:41329` | ✅ | 3 состояния, pure display |
| 29 | CodeInput | `1678:41351` | ✅ | OTP 4-digit, visually-hidden InputBase |
| 30 | CategoryNavItem | `153:5788` | ✅ | Level 1/2, Icon chevron (not IconButton — nested button invalid) |

---

## Группа 3 — Отображение и обратная связь

| # | Компонент | Figma node-id | Статус | Примечание |
|---|---|---|---|---|
| 31 | Price | `73:2363` | ⏳ | XS/S/M/L |
| 32 | OldPrice | `764:73675` | ⏳ | |
| 33 | Badge | `270:10355` | ⏳ | Проверить/доработать S/M (существует) |
| 34 | OrderStateBadge | `1097:18614` | ⏳ | Проверить/доработать (существует) |
| 35 | Rating | `1103:98494` | ⏳ | S/L |
| 36 | AlertBlock | `1621:30302` | ⏳ | Info/Alert |
| 37 | AlertBody | `819:16192` | ⏳ | Caption/Secondary |
| 38 | TooltipBody | `475:20114` | ⏳ | Top/Right/Bottom |
| 39 | Tooltip | `819:16411` | ⏳ | 3 позиции × 2 состояния |

---

## Группа 4 — Навигация

| # | Компонент | Figma node-id | Статус | Примечание |
|---|---|---|---|---|
| 40 | Link | `145:4987` | ⏳ | S/M/L × 4 состояния |
| 41 | LinkGroup | `1687:194380` | ⏳ | Closed/Opened |
| 42 | PaginationBullet | `731:36037` | ⏳ | 4 состояния |
| 43 | PaginationNumber | `731:36021` | ⏳ | 4 состояния |
| 44 | Pagination | `95:3501` | ⏳ | Bullet / Numeric |
| 45 | Breadcrumbs | `1196:68225` | ⏳ | L/S (Figma: "Crumbs") |

---

## Группа 5 — Карточки и поля данных

| # | Компонент | Figma node-id | Статус | Примечание |
|---|---|---|---|---|
| 46 | ProductCard | `49:8613` | ⏳ | L/S × 4 состояния (переделать) |
| 47 | WideProductCard | `196:8569` | ⏳ | M/S × 5 типов |
| 48 | NarrowProductCard | `247:8394` | ⏳ | |
| 49 | Image | `1103:57777` | ⏳ | Изображение товара |
| 50 | CardImage | `1103:109741` | ⏳ | Изображение для карточки |
| 51 | InfoField | `1738:46288` | ⏳ | M/S |
| 52 | InfoFieldForm | `268:9922` | ⏳ | |
| 53 | ProfileField | `4031:48892` | ⏳ | M/S × Readonly/Editable/Deletable |
| 54 | OrderCard | `1097:22386` | ⏳ | M/S × Not complete/Completed (Figma: "Order") |
| 55 | OrderSummary | `777:20579` | ⏳ | |
| 56 | Tracker | `614:23434` | ⏳ | |
| 57 | Timer | `614:23515` | ⏳ | |

---

## Группа 6 — Категории и слайдеры

| # | Компонент | Figma node-id | Статус | Примечание |
|---|---|---|---|---|
| 58 | Category (плитка) | `1121:43467` | ⏳ | L/S × Enabled/Hovered |
| 59 | CategoryFramed | `1554:39007` | ⏳ | S/M/L |
| 60 | CategoryImage | `1309:20530` | ⏳ | Иконка/иллюстрация категории |
| 61 | SaleSliderTitle | `1396:113459` | ⏳ | L/S |
| 62 | SubcategoryList | `1196:70878` | ⏳ | L/S |
| 63 | SliderContainer | `1121:47056` | ⏳ | L/S |
| 64 | Slider | `1106:58701` | ⏳ | L/S (переделать) |

---

## Группа 7 — Отзывы

| # | Компонент | Figma node-id | Статус | Примечание |
|---|---|---|---|---|
| 65 | RatingBlock | `88:2546` | ⏳ | |
| 66 | Review | `90:2608` | ⏳ | |

---

## Группа 8 — Этапы заказа

| # | Компонент | Figma node-id | Статус | Примечание |
|---|---|---|---|---|
| 67 | StageIcon | `222:7856` | ⏳ | Enabled/Activated |
| 68 | Stage | `1735:52934` | ⏳ | L/S |
| 69 | Roadmap | `850:31020` | ⏳ | 4 этапа × L/S |

---

## Группа 9 — Аккаунт и FAQ

| # | Компонент | Figma node-id | Статус | Примечание |
|---|---|---|---|---|
| 70 | AccountTabs | `1047:41265` | ⏳ | |
| 71 | FAQTabs | `1897:52739` | ⏳ | M и S варианты |

---

## Группа 10 — Магазины приложений

| # | Компонент | Figma node-id | Статус | Примечание |
|---|---|---|---|---|
| 72 | AppMarketButton (Google Play) | `706:23000` | ⏳ | Gray/White × L/S × 3 состояния |
| 73 | AppMarketButton (App Store) | `706:23040` | ⏳ | Gray/White × L/S × 3 состояния |
| 74 | AppMarketButton (AppGallery) | `888:57946` | ⏳ | Gray/White × L/S × 3 состояния |
| 75 | AppMarketButton (RuStore) | `980:46785` | ⏳ | Gray/White × L/S × 3 состояния |

---

## Группа 11 — Глобальные блоки

| # | Компонент | Figma node-id | Статус | Примечание |
|---|---|---|---|---|
| 76 | Header | `765:25905` | ⏳ | Standart-L / Rounded-S / Scrolled (переделать) |
| 77 | Footer | `1121:55505` | ⏳ | L / S-Opened / S-Closed (переделать) |
| 78 | MobilePanel | `1702:46474` | ⏳ | Мобильная нижняя навигация; зависит от MobilePanelButton✅, MobilePanelCartButton✅ |
| 79 | CartPanel | `1732:36508` | ⏳ | Мобильная панель корзины |
| 80 | OrderPanel | `1738:50199` | ⏳ | Мобильная панель заказа |
| 81 | MobileOverlay | `1732:34767` | ⏳ | Обёртка Default/Cart/Order; зависит от CartPanel, OrderPanel |

---

## Группа 12 — Прочее

| # | Компонент | Figma node-id | Статус | Примечание |
|---|---|---|---|---|
| 82 | Cell | `1512:30646` | ⏳ | Ячейка таблицы |
| 83 | Shadow | `1678:38153` | ⏳ | |
| 84 | Pattern | `1045:52068` | ⏳ | |
| 85 | PaymentLogos | `1718:45795` | ⏳ | Логотипы платёжных систем |
| 86 | Element | `1534:31317` | ⏳ | Анимация |

---

## Как пополнять node-id

1. В Figma открыть файл `eV3fLo7RMJcyNqnFeuwHmg`
2. Выбрать нужный компонент (кликнуть на основную рамку компонента)
3. В URL появится `?node-id=XXXX-YYYY` → записать как `XXXX:YYYY`

---

## Итог

- Всего компонентов: **86**
- Готово: **30** (Группы 0–2 полностью)
- Ожидают реализации: **56**

### Готово (30)

Группа 0 — Icon, Logo
Группа 1 — Button, IconButton, ArrowButton, ArrowsContainer, ArrowBg, LikeButton, SocialButton, CartButton, MobilePanelButton, MobilePanelCartButton
Группа 2 — Input, TextField, Search, Select, SelectOption, Multiselect, LabelInput, NumInput, Counter, Chips, PaymentChips, Switch+SwitchLabel, Radio+RadioLabel, Tab, AccountTab, CodeSegment, CodeInput, CategoryNavItem
