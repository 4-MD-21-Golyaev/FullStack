import Header from '@/widgets/customer/Header/Header';
import Footer from '@/widgets/customer/Footer/Footer';
import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { FavoritesProvider } from './FavoritesContext';
import { AuthModalRenderer } from './AuthModalRenderer';
import styles from './layout.module.css';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FavoritesProvider>
        <CartProvider>
          <Header />
          <main className={styles.main}>
            {children}
          </main>
          <Footer />
          <AuthModalRenderer />
        </CartProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}
