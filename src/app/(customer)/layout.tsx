import Header from '@/widgets/customer/Header/Header';
import Footer from '@/widgets/customer/Footer/Footer';
import CustomerBreadcrumbs from '@/widgets/customer/CustomerBreadcrumbs/CustomerBreadcrumbs';
import { BreadcrumbsProvider } from './BreadcrumbsContext';
import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { AuthModalRenderer } from './AuthModalRenderer';
import styles from './layout.module.css';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <BreadcrumbsProvider>
          <Header />
          <main className={styles.main}>
            <CustomerBreadcrumbs />
            {children}
          </main>
          <Footer />
          <AuthModalRenderer />
        </BreadcrumbsProvider>
      </CartProvider>
    </AuthProvider>
  );
}
