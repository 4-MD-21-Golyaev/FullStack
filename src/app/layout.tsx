import '@/styles/globals.css';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'КН Супермаркет',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const userAgent = (await headers()).get('user-agent') ?? '';
  const initialIsMobile = /mobile/i.test(userAgent);

  return (
    <html lang="ru">
      <head>
        <link
          rel="preload"
          href="/fonts/pt-root-ui_vf.woff2"
          as="font"
          type="font/woff2"
          crossOrigin=""
        />
      </head>
      <body>
        <Providers initialIsMobile={initialIsMobile}>{children}</Providers>
      </body>
    </html>
  );
}
