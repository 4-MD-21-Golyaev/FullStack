'use client';

import { useAuth } from './AuthContext';
import { AuthModal } from './AuthModal';

export function AuthModalRenderer() {
  const { authModalOpen, closeAuthModal } = useAuth();
  return <AuthModal open={authModalOpen} onClose={closeAuthModal} />;
}
