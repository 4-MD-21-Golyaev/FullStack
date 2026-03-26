'use client';

import { Modal } from '@/shared/ui';
import { AuthForm } from '@/features/auth/AuthForm';
import { useAuth } from './AuthContext';
import styles from './AuthModal.module.css';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { refresh } = useAuth();

  return (
    <Modal open={open} onClose={onClose} className={styles.modal}>
      <AuthForm
        onClose={onClose}
        onSuccess={async () => { await refresh(); onClose(); }}
      />
    </Modal>
  );
}
