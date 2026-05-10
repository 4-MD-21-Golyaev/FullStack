# План: Оплата только после сборки + UI “Подтвердить заказ”

## Summary
Изменяем пользовательский поток: после оформления заказа пользователь не оплачивает сразу, а видит заказ в статусе CREATED/ПИКИНГ. Оплата доступна только после сборки (PAYMENT). Кнопка оплаты показывается и в списке, и в деталях, но активна только в PAYMENT. После завершения сборки отправляется письмо “заказ собран, можно оплатить”.

## Detailed Implementation

### 1) Checkout flow
- Файл: D:\Учеба\ВКР\Реализация\project\src\app\(customer)\checkout\page.tsx
- Изменить финальную кнопку:
  - Текст: “Подтвердить заказ” вместо “Оплатить …”.
  - Поведение: только createOrder, без initiatePayment.
- После успешного createOrder:
  - сохраняем order.id в sessionStorage (можно оставить как сейчас),
  - редирект: router.push(`/orders/${order.id}`) сразу после создания.
- Ошибки создания заказа остаются в AlertBlock.

### 2) Order detail page (оплата)
- Файл: D:\Учеба\ВКР\Реализация\project\src\app\(customer)\orders\[id]\page.tsx
- Добавить состояния payError, isPaying.
- Добавить блок “Оплата” в правой колонке:
  - Текст “Оплата доступна после сборки”.
  - Кнопка “Оплатить”.
- Логика:
  - order.state !== PAYMENT: кнопка disabled.
  - order.state === PAYMENT: кнопка активна, по клику:
    - ordersApi.initiatePayment(order.id)
    - редирект на confirmationUrl.
  - Ошибки — отображаются пользователю.

### 3) Order list card
- Файл: D:\Учеба\ВКР\Реализация\project\src\widgets\customer\OrderCard\OrderCard.tsx
- Добавить props:
  - onPay?: () => void
  - payEnabled?: boolean (default false)
- Отображение:
  - Если onPay передан — показывать кнопку “Оплатить”.
  - Если payEnabled === false — disabled.

- Файл: D:\Учеба\ВКР\Реализация\project\src\app\(customer)\orders\page.tsx
  - Для каждого заказа:
    - const canPay = order.state === OrderState.PAYMENT
    - onPay вызывает ordersApi.initiatePayment
    - payEnabled = canPay

### 4) Customer status labels
- Файл: D:\Учеба\ВКР\Реализация\project\src\lib\order-status-config.ts
- Обновить CUSTOMER_ORDER_STATUS_CONFIG:
  - PAYMENT label → “Готов к оплате” или “Ожидает оплаты”.

### 5) Backend guard
- Файл: D:\Учеба\ВКР\Реализация\project\src\application\order\InitiatePaymentUseCase.ts
- Если order.state !== PAYMENT → throw new Error('Order is not in PAYMENT state').

### 6) Email после сборки
- Файл: D:\Учеба\ВКР\Реализация\project\src\application\order\CompletePickingUseCase.ts
  - Добавить outbox event:
    - eventType: ORDER_READY_FOR_PAYMENT
    - payload: { orderId }
- Файл: D:\Учеба\ВКР\Реализация\project\src\application\order\ProcessOutboxUseCase.ts
  - Новый case ORDER_READY_FOR_PAYMENT:
    - emailGateway.sendOrderReadyForPayment(email, order.id, order.totalAmount)
- Файл: D:\Учеба\ВКР\Реализация\project\src\application\ports\EmailGateway.ts
  - Добавить метод sendOrderReadyForPayment(to, orderId, totalAmount)
- Файл: D:\Учеба\ВКР\Реализация\project\src\infrastructure\auth\NodemailerEmailGateway.ts
  - Шаблон письма:
    - subject: “Заказ #XXXX собран — можно оплатить”
    - body: “Заказ готов, перейдите в кабинет и оплатите. Сумма: …”

## API / Interfaces Changes
- EmailGateway: новый метод sendOrderReadyForPayment.
- OrderCard props: onPay, payEnabled.

## Test Plan
1. InitiatePaymentUseCase: ошибка при state !== PAYMENT.
2. ProcessOutboxUseCase: событие ORDER_READY_FOR_PAYMENT вызывает sendOrderReadyForPayment.
3. CompletePickingUseCase: эмитит ORDER_READY_FOR_PAYMENT.
4. Manual UI:
   - Checkout → createOrder → редирект /orders/[id], без оплаты.
   - CREATED/PICKING: кнопка оплаты disabled.
   - PAYMENT: кнопка активна, редирект на YooKassa.
   - Список заказов: кнопка оплаты работает так же.

## Assumptions
- Письмо “заказ принят” остаётся при создании (ORDER_CONFIRMED).
- Новое письмо “заказ собран, можно оплатить” отправляется после CompletePickingUseCase.
- Кнопка оплаты нужна и в списке, и в деталях.
- Экран /checkout/success остаётся, но не используется в основном потоке.
