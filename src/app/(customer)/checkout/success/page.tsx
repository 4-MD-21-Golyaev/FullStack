'use client';

import { useState } from 'react';
import NextLink from 'next/link';
import { Button, Container } from '@/shared/ui';
import styles from './success.module.css';

export default function CheckoutSuccessPage() {
  const [orderId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const id = sessionStorage.getItem('lastOrderId');
    if (id) sessionStorage.removeItem('lastOrderId');
    return id;
  });

  return (
    <Container className={styles.page}>
      <div className={styles.content}>
        <h1 className={styles.title}>Заказ оформлен!</h1>
        <p className={styles.text}>
          Спасибо за покупку. Мы уже начинаем сборку вашего заказа.
        </p>
        {orderId && (
          <NextLink href={`/orders/${orderId}`}>
            <Button variant="secondary" size="lg">Посмотреть заказ</Button>
          </NextLink>
        )}
        <NextLink href="/catalog">
          <Button variant="primary" size="lg">Продолжить покупки</Button>
        </NextLink>
      </div>
    </Container>
  );
}
