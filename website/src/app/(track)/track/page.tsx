import type { Metadata } from 'next';
import { TrackClient } from '@/components/TrackClient';

export const metadata: Metadata = {
  title: 'Track your order',
  description: 'See where your order is, live: received, confirmed, baking, ready and delivered. No app or login needed.',
  // Each link is one customer's order; keep them out of search results.
  robots: { index: false, follow: false },
  openGraph: {
    title: 'Track your order',
    description: 'See your order’s status live, from received to delivered.',
    images: [{ url: '/og-track.png', width: 1200, height: 630, alt: 'Track your order' }],
  },
};

// One static page serves every /track/<shop>/<order> link: the host rewrites
// those paths here, and the page reads the shop and order from the URL.
// Customers only see their order: no site navbar, footer or app download.
export default function TrackPage() {
  return (
    <main id="main" className="track-page">
      <div className="blob blob--1" />
      <div className="blob blob--2" />
      <div className="container">
        <div className="track-wrap">
          <TrackClient />
        </div>
      </div>
    </main>
  );
}
