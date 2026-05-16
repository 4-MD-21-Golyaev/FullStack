'use client';

import { usePathname } from 'next/navigation';
import { Logo, Link, SocialButton, IconButton, Icon } from '@/shared/ui';
import { COMPANY_LINKS, BUYER_LINKS, LEGAL_LINKS, STORES, STORE_ADDRESSES } from '../Footer/footerData';
import styles from './FooterMobile.module.css';

interface FooterMobileProps {
  className?: string;
}

interface NavGroup {
  title: string;
  links: { label: string; href: string }[];
}

const NAV_GROUPS: NavGroup[] = [
  { title: 'Компания',            links: COMPANY_LINKS },
  { title: 'Покупателям',         links: BUYER_LINKS },
  { title: 'Правовая информация', links: LEGAL_LINKS },
];

export function FooterMobile({ className }: FooterMobileProps) {
  const pathname = usePathname();
  if (pathname?.startsWith('/checkout')) return null;

  return (
    <footer className={[styles.root, className ?? ''].filter(Boolean).join(' ')}>
      <Logo variant="favicon" className={styles.logo} />

      <div className={styles.container}>
        {/* Support block */}
        <div className={styles.support}>
          <div className={styles.supportHeader}>
            <span className={styles.colTitle}>Служба поддержки</span>
            <span className={styles.supportSchedule}>пн-вс c 08:00 до 18:00</span>
          </div>

          <div className={styles.contacts}>
            <div className={styles.contact}>
              <div className={styles.contactText}>
                <span className={styles.contactLabel}>Горячая линия</span>
                <Link href="tel:+79145420292" size="M">+7 (914) 542-02-92</Link>
              </div>
              <div className={styles.messengers}>
                <SocialButton network="whatsapp" variant="white" aria-label="WhatsApp" />
                <SocialButton network="telegram" variant="white" aria-label="Telegram" />
              </div>
            </div>

            <div className={styles.contact}>
              <div className={styles.contactText}>
                <span className={styles.contactLabel}>Отдел качества</span>
                <Link href="tel:+79294101202" size="M">+7 (929) 410-12-02</Link>
              </div>
              <div className={styles.messengers}>
                <SocialButton network="whatsapp" variant="white" aria-label="WhatsApp" />
              </div>
            </div>
          </div>
        </div>

        {/* Accordion groups */}
        <div className={styles.accordions}>
          {NAV_GROUPS.map(({ title, links }) => (
            <details key={title} className={styles.accordion}>
              <summary className={styles.summary}>
                <span className={styles.colTitle}>{title}</span>
                <Icon name="dropdown" size={16} className={styles.chevron} />
              </summary>
              <nav className={styles.linkList}>
                {links.map(({ label, href }) => (
                  <Link key={label} href={href} size="M">{label}</Link>
                ))}
              </nav>
            </details>
          ))}
        </div>

        {/* Address block */}
        <div className={styles.addressBlock}>
          <span className={styles.colTitle}>Адреса магазинов</span>
          <div className={styles.addresses}>
            {STORES.map(({ name, href }) => (
              <div key={name} className={styles.address}>
                <IconButton
                  icon="location_pin"
                  size="md"
                  variant="white"
                  aria-label={name}
                  onClick={() => window.open(href, '_blank')}
                />
                <div className={styles.addressText}>
                  <span className={styles.addressName}>{name}</span>
                  <Link href={href} size="M">{STORE_ADDRESSES[name]}</Link>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Copyright */}
      <div className={styles.copyright}>
        <div className={styles.divider} />
        <p className={styles.copyrightText}>
          © 2025,&nbsp; Общество с ограниченной ответственностью «КН». Все права защищены.
          Информация, размещённая на сайте, не является публичной офертой.
        </p>
      </div>
    </footer>
  );
}

export default FooterMobile;
