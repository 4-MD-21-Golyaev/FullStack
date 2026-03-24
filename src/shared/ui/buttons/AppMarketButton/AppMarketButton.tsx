import NextLink from 'next/link';
import styles from './AppMarketButton.module.css';

export type AppMarket = 'google-play' | 'app-store' | 'appgallery' | 'rustore';

export interface AppMarketButtonProps {
  store: AppMarket;
  href: string;
  className?: string;
}

const STORE_LABELS: Record<AppMarket, string> = {
  'google-play': 'Google Play',
  'app-store':   'App Store',
  'appgallery':  'AppGallery',
  'rustore':     'RuStore',
};

function GooglePlayIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M48 28.8C48 12.8 62.4 2.4 75.2 8L320 128 134.4 313.6 48 28.8Z" fill="#00D2FF"/>
      <path d="M48 483.2C48 499.2 62.4 509.6 75.2 504L320 384 134.4 198.4 48 483.2Z" fill="#23D45B"/>
      <path d="M464 224C480 233.6 480 278.4 464 288L320 384 198.4 262.4 320 128 464 224Z" fill="#FFCC00"/>
      <path d="M75.2 8L320 128 198.4 249.6 75.2 8Z" fill="#1BC0E9"/>
      <path d="M75.2 504L320 384 198.4 262.4 75.2 504Z" fill="#1ABA54"/>
      <path d="M320 128L464 224 320 384 198.4 262.4 320 128Z" fill="#FF9400"/>
    </svg>
  );
}

function AppStoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="512" height="512" rx="114" fill="url(#appstore-grad)"/>
      <defs>
        <linearGradient id="appstore-grad" x1="256" y1="0" x2="256" y2="512" gradientUnits="userSpaceOnUse">
          <stop stopColor="#18BFFF"/>
          <stop offset="1" stopColor="#0070F3"/>
        </linearGradient>
      </defs>
      <path d="M341 102h-8c-6 0-11 2-15 6l-62 70-62-70c-4-4-9-6-15-6h-8c-8 0-13 9-9 16l72 128-72 128c-4 7 1 16 9 16h8c6 0 11-2 15-6l62-70 62 70c4 4 9 6 15 6h8c8 0 13-9 9-16l-72-128 72-128c4-7-1-16-9-16Z" fill="white"/>
      <path d="M174 358H130c-9 0-14 10-9 17l10 16c3 5 8 8 14 8h60l-31-41ZM338 358h44c9 0 14 10 9 17l-10 16c-3 5-8 8-14 8h-60l31-41Z" fill="white"/>
    </svg>
  );
}

function AppGalleryIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="120" height="120" rx="26" fill="#CF0A2C"/>
      <circle cx="60" cy="60" r="34" stroke="white" strokeWidth="8" fill="none"/>
      <circle cx="60" cy="60" r="16" fill="white"/>
    </svg>
  );
}

function RuStoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="120" height="120" rx="26" fill="#1B69F6"/>
      <path d="M32 28h32c17.7 0 24 10.7 24 22 0 9-4.6 17.2-13 20.4L91 92H71L58 72H50v20H32V28Zm18 16v14h12c5 0 8-2.8 8-7s-3-7-8-7H50Z" fill="white"/>
    </svg>
  );
}

const STORE_ICONS: Record<AppMarket, React.ReactElement> = {
  'google-play': <GooglePlayIcon />,
  'app-store':   <AppStoreIcon />,
  'appgallery':  <AppGalleryIcon />,
  'rustore':     <RuStoreIcon />,
};

export function AppMarketButton({ store, href, className }: AppMarketButtonProps) {
  return (
    <NextLink
      href={href}
      className={[styles.root, className ?? ''].join(' ').trim()}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className={styles.icon} aria-hidden>
        {STORE_ICONS[store]}
      </span>
      <span className={styles.text}>
        <span className={styles.caption}>Загрузите в</span>
        <span className={styles.name}>{STORE_LABELS[store]}</span>
      </span>
    </NextLink>
  );
}
