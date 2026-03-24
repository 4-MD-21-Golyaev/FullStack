'use client';

import { Logo, Link, SocialButton, AppMarketButton, IconButton } from '@/shared/ui';
import styles from './Footer.module.css';

interface FooterProps {
  className?: string;
}

const COMPANY_LINKS = [
  { label: 'О нас',      href: '#' },
  { label: 'Контакты',   href: '#' },
  { label: 'Вакансии',   href: '#' },
];

const BUYER_LINKS = [
  { label: 'Каталог',               href: '#' },
  { label: 'Помощь',                href: '#' },
  { label: 'Программа лояльности',  href: '#' },
];

const LEGAL_LINKS = [
  { label: 'Правила программы лояльности',    href: '#' },
  { label: 'Условия обмена и возврата',        href: '#' },
  { label: 'Пользовательское соглашение',      href: '#' },
  { label: 'Политика конфиденциальности',      href: '#' },
  { label: 'Политика обработки файлов cookie', href: '#' },
];

const STORES: { name: string; href: string; }[] = [
  { name: 'НК Сити',    href: 'https://maps.yandex.ru' },
  { name: 'НК Гродеков', href: 'https://maps.yandex.ru' },
];

const STORE_ADDRESSES: Record<string, string> = {
  'НК Сити':     'Улица Карла Маркса, 76',
  'НК Гродеков': 'Комсомольская улица, 45',
};

export function Footer({ className }: FooterProps) {
  return (
    <footer className={[styles.root, className ?? ''].filter(Boolean).join(' ')}>
      <div className={styles.inner}>

        {/* Logo */}
        <Logo variant="default" className={styles.logo} />

        {/* Main content rows */}
        <div className={styles.content}>

          {/* Row 1: columns */}
          <div className={styles.row}>

            {/* Support column */}
            <div className={styles.support}>
              <div className={styles.supportHeader}>
                <span className={styles.colTitle}>Служба поддержки</span>
                <span className={styles.supportSchedule}>пн-вс c 08:00 до 18:00</span>
              </div>

              <div className={styles.contacts}>
                {/* Hot line */}
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

                {/* Quality dept */}
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

            {/* Company column */}
            <div className={styles.column}>
              <span className={styles.colTitle}>Компания</span>
              <nav className={styles.linkList}>
                {COMPANY_LINKS.map(({ label, href }) => (
                  <Link key={label} href={href} size="M">{label}</Link>
                ))}
              </nav>
            </div>

            {/* Buyers column */}
            <div className={styles.column}>
              <span className={styles.colTitle}>Покупателям</span>
              <nav className={styles.linkList}>
                {BUYER_LINKS.map(({ label, href }) => (
                  <Link key={label} href={href} size="M">{label}</Link>
                ))}
              </nav>
            </div>

            {/* Legal column */}
            <div className={styles.column}>
              <span className={styles.colTitle}>Правовая информация</span>
              <nav className={styles.linkList}>
                {LEGAL_LINKS.map(({ label, href }) => (
                  <Link key={label} href={href} size="M">{label}</Link>
                ))}
              </nav>
            </div>
          </div>

          {/* Row 2: addresses + app store buttons */}
          <div className={styles.rowBottom}>
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

            <div className={styles.appButtons}>
              <AppMarketButton store="google-play" href="#" />
              <AppMarketButton store="app-store"   href="#" />
              <AppMarketButton store="appgallery"  href="#" />
              <AppMarketButton store="rustore"     href="#" />
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
      </div>
    </footer>
  );
}

export default Footer;
