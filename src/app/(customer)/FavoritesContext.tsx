'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

export interface FavoriteProduct {
  id: string;
  name: string;
  price: number;
  imagePath: string | null;
  stock: number;
  categoryId: string | null;
}

interface FavoritesContextValue {
  favorites: FavoriteProduct[];
  favoriteIds: Set<string>;
  isLoading: boolean;
  refresh: () => Promise<void>;
  addFavorite: (productId: string) => void;
  removeFavorite: (productId: string) => void;
  toggleFavorite: (productId: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

async function fetchFavorites(): Promise<FavoriteProduct[]> {
  const res = await fetch('/api/favorites');
  if (!res.ok) return [];
  return res.json() as Promise<FavoriteProduct[]>;
}

async function serverAdd(productId: string): Promise<void> {
  await fetch('/api/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId }),
  });
}

async function serverRemove(productId: string): Promise<void> {
  await fetch(`/api/favorites/${productId}`, { method: 'DELETE' });
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading, openAuthModal } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await fetchFavorites();
      setFavorites(data);
    } catch {
      // keep current state on error
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      void refresh();
    } else {
      setFavorites([]);
    }
  }, [authLoading, user, refresh]);

  const favoriteIds = useMemo(() => new Set(favorites.map(f => f.id)), [favorites]);

  const ensureAuthed = () => {
    if (!user) {
      openAuthModal('/favorites');
      return false;
    }
    return true;
  };

  const addFavorite = (productId: string) => {
    if (!ensureAuthed()) return;
    serverAdd(productId).then(refresh).catch(() => { /* ignore */ });
  };

  const removeFavorite = (productId: string) => {
    if (!ensureAuthed()) return;
    // Optimistic: drop locally before the request so the UI updates instantly.
    // On error, resync with the server to recover the correct state.
    setFavorites(prev => prev.filter(f => f.id !== productId));
    serverRemove(productId).catch(() => { void refresh(); });
  };

  const toggleFavorite = (productId: string) => {
    if (!ensureAuthed()) return;
    if (favoriteIds.has(productId)) {
      removeFavorite(productId);
    } else {
      addFavorite(productId);
    }
  };

  return (
    <FavoritesContext.Provider value={{
      favorites,
      favoriteIds,
      isLoading,
      refresh,
      addFavorite,
      removeFavorite,
      toggleFavorite,
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
