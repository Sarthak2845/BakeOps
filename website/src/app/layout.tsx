import type { Metadata, Viewport } from 'next';
import { Figtree, Fredoka } from 'next/font/google';
import { SITE_NAME, SITE_URL, TAGLINE } from '@/lib/site';
import './globals.css';

const fredoka = Fredoka({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-fredoka', display: 'swap' });
const figtree = Figtree({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-figtree', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}: the app for home bakeries`, template: `%s · ${SITE_NAME}` },
  description: `${TAGLINE} Take orders, plan deliveries, send WhatsApp receipts and let customers track their order live.`,
  applicationName: SITE_NAME,
  icons: { icon: '/favicon.png', apple: '/icon.png' },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    url: SITE_URL,
    title: `${SITE_NAME}: the app for home bakeries`,
    description: TAGLINE,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'BakeOps' }],
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image', images: ['/og.png'] },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f6fd' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0b1a' },
  ],
};

// Runs before paint so the page never flashes the wrong theme.
const themeScript = `(function(){try{var t=localStorage.getItem('bakeops.theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})();`;

// Bare shell shared by everything. The marketing pages add the navbar and
// footer in (site)/layout.tsx; the customer tracking page stays chrome-free.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${figtree.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
