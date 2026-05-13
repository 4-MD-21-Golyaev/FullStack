import Header from '@/widgets/customer/Header/Header';
import Footer from '@/widgets/customer/Footer/Footer';
import FooterMobile from '@/widgets/customer/FooterMobile/FooterMobile';
import MobileBottomNav from '@/widgets/customer/MobileBottomNav/MobileBottomNav';
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
          <FooterMobile />
          <AuthModalRenderer />
          <MobileBottomNav />
        </CartProvider>
      </FavoritesProvider>
    </AuthProvider>
  );
}
