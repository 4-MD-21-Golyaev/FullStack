'use client';

import { Button, Modal } from '@/shared/ui';
import styles from './CancelOrderModal.module.css';

interface CancelOrderModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function CancelOrderModal({ open, onClose, onConfirm }: CancelOrderModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Отмена заказа">
      <p className={styles.description}>
        Вы уверены, что хотите отменить заказ? Цены на товары могут измениться
      </p>
      <div className={styles.actions}>
        <Button variant="primary" size="lg" onClick={onClose}>
          Не отменять
        </Button>
        <Button variant="secondary" size="lg" onClick={onConfirm}>
          Отменить заказ
        </Button>
      </div>
    </Modal>
  );
}

export default CancelOrderModal;
