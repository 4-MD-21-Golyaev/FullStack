import Header from '@/widgets/customer/Header/Header';
import Footer from '@/widgets/customer/Footer/Footer';
import CustomerBreadcrumbs from '@/widgets/customer/CustomerBreadcrumbs/CustomerBreadcrumbs';
import styles from './layout.module.css';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.container}>
          <CustomerBreadcrumbs />
        </div>
        {children}
      </main>
      <Footer />
    </>
  );
}
