import Link from 'next/link';
import { Icon } from '@/components/Icon';

export default function NotFound() {
  return (
    <section className="track-page">
      <div className="blob blob--1" />
      <div className="container">
        <div className="track-wrap">
          <div className="card track-landing">
            <div className="track-landing__icon">
              <Icon name="cake" size={28} />
            </div>
            <h1>This page went stale</h1>
            <p className="muted">We couldn&apos;t find what you were looking for. If you came from a tracking link, open the full link your shop sent you.</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <Link href="/" className="btn btn--primary">
                Go home
              </Link>
              <Link href="/track/" className="btn btn--ghost">
                Track an order
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
