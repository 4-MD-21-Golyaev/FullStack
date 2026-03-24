import Header from '@/widgets/customer/Header/Header';
import Footer from '@/widgets/customer/Footer/Footer';
import CustomerBreadcrumbs from '@/widgets/customer/CustomerBreadcrumbs/CustomerBreadcrumbs';
import { BreadcrumbsProvider } from './BreadcrumbsContext';
import styles from './layout.module.css';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <BreadcrumbsProvider>
      <Header />
      <main className={styles.main}>
        <CustomerBreadcrumbs />
        {children}
      </main>
      <Footer />
    </BreadcrumbsProvider>
  );
}
