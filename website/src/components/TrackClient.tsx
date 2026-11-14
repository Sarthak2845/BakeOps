'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { API_URL, PIPELINE, formatMoney, type OrderStatus } from '@/lib/site';
import { Icon } from './Icon';
import { ThemeToggle } from './ThemeToggle';
import { Timeline } from './Timeline';

interface Tracking {
  business: { name: string; slug: string; logoUrl: string | null; phone: string | null };
  order: {
    id: string;
    status: OrderStatus;
    orderDate: string;
    deliveryDate: string | null;
    occasionTag: string | null;
    updatedAt: string;
    customerFirstName: string;
    items: { description: string; quantity: number }[];
    totalAmount: number;
    advancePaid: number;
    balanceDue: number;
    invoice: {
      invoiceNumber: string;
      paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
      receiptPath: string;
      pdfPath: string;
    } | null;
  };
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; data: Tracking; fetchedAt: number }
  | { kind: 'notfound' }
  | { kind: 'offline'; data?: Tracking; fetchedAt?: number };

const POLL_MS = 15_000;

/** Reads /track/<slug>/<orderId>, or ?shop=&order= (handy in local dev where there's no rewrite rule). */
function readTarget(): { slug: string; orderId: string } | null {
  const m = /^\/track\/([^/]+)\/([^/]+)\/?$/.exec(window.location.pathname);
  if (m) return { slug: decodeURIComponent(m[1]), orderId: decodeURIComponent(m[2]) };
  const q = new URLSearchParams(window.location.search);
  const slug = q.get('shop');
  const orderId = q.get('order');
  return slug && orderId ? { slug, orderId } : null;
}

function describeDelivery(iso: string | null): string {
  if (!iso) return 'Date to be confirmed';
  const d = new Date(iso);
  const today = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const day = sameDay(d, today) ? 'Today' : sameDay(d, tomorrow) ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const anyTime = d.getHours() === 0 && d.getMinutes() === 0;
  return anyTime ? day : `${day}, ${d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}`;
}

function ago(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)} min ago`;
}

const DEMO: Tracking = {
  business: { name: "Sunita's Cake Studio", slug: 'demo', logoUrl: null, phone: null },
  order: {
    id: 'demo',
    status: 'IN_PROGRESS',
    orderDate: new Date().toISOString(),
    deliveryDate: (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(17, 0, 0, 0);
      return d.toISOString();
    })(),
    occasionTag: 'Birthday',
    updatedAt: new Date().toISOString(),
    customerFirstName: 'Priya',
    items: [
      { description: 'Black Forest Cake 1kg', quantity: 1 },
      { description: 'Cupcakes (box of 6)', quantity: 2 },
    ],
    totalAmount: 1390,
    advancePaid: 500,
    balanceDue: 890,
    invoice: { invoiceNumber: 'SUNI-2026-0042', paymentStatus: 'PARTIAL', receiptPath: '', pdfPath: '' },
  },
};

export function TrackClient() {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [target, setTarget] = useState<{ slug: string; orderId: string } | null | undefined>(undefined);
  const [demo, setDemo] = useState(false);
  const [, tick] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get('demo')) {
      setDemo(true);
      setTarget(null);
      return;
    }
    setTarget(readTarget());
  }, []);

  const load = useCallback(async () => {
    if (!target) return;
    setState((s) => (s.kind === 'ok' ? s : { kind: 'loading' }));
    try {
      const res = await fetch(`${API_URL}/api/track/${encodeURIComponent(target.slug)}/${encodeURIComponent(target.orderId)}`, { cache: 'no-store' });
      if (res.status === 404) {
        setState({ kind: 'notfound' });
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Tracking;
      setState({ kind: 'ok', data, fetchedAt: Date.now() });
    } catch {
      setState((s) => (s.kind === 'ok' ? { kind: 'offline', data: s.data, fetchedAt: s.fetchedAt } : { kind: 'offline' }));
    }
  }, [target]);

  // Poll while the tab is visible; the API never caches this response.
  useEffect(() => {
    if (!target) return;
    void load();
    const start = () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(() => void load(), POLL_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void load();
        start();
      } else if (timer.current) {
        clearInterval(timer.current);
      }
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    const t = setInterval(() => tick((n) => n + 1), 5000);
    return () => {
      if (timer.current) clearInterval(timer.current);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(t);
    };
  }, [target, load]);

  // Demo mode: walk through the statuses so visitors see it move.
  const [demoIndex, setDemoIndex] = useState(2);
  useEffect(() => {
    if (!demo) return;
    const t = setInterval(() => setDemoIndex((n) => (n + 1) % PIPELINE.length), 2600);
    return () => clearInterval(t);
  }, [demo]);

  const view = useMemo<{ data: Tracking; fetchedAt: number; stale: boolean } | null>(() => {
    if (demo) return { data: { ...DEMO, order: { ...DEMO.order, status: PIPELINE[demoIndex].status } }, fetchedAt: Date.now(), stale: false };
    if (state.kind === 'ok') return { data: state.data, fetchedAt: state.fetchedAt, stale: false };
    if (state.kind === 'offline' && state.data) return { data: state.data, fetchedAt: state.fetchedAt ?? Date.now(), stale: true };
    return null;
  }, [demo, demoIndex, state]);

  if (target === undefined) return <div className="track-skeleton" aria-busy="true" />;

  const topbar = (live: boolean) => (
    <div className="track__topbar">
      <span className="track__live">
        {live ? <span className="track__live-dot" /> : null} {live ? 'Live order tracking' : 'Order tracking'}
      </span>
      <ThemeToggle />
    </div>
  );

  // No order in the URL: explain how tracking links work.
  if (!demo && target === null) {
    return (
<div className="track">
{topbar(false)}
      <div className="card track-landing">
        <div className="track-landing__icon">
          <Icon name="truck" size={28} />
        </div>
        <h1>Track your order</h1>
        <p className="muted">
          Your shop sends you a tracking link on WhatsApp when they take your order. Open that link to see where your order is, from
          received to delivered. There&apos;s nothing to install and no login.
        </p>
        <p className="muted small">Links look like <code>bakeops.me/track/your-shop/…</code></p>
        <div className="row">
          <Link href="/track/?demo=1" className="btn btn--primary">
            See a demo <Icon name="arrow" size={16} />
          </Link>
          <Link href="/" className="btn btn--ghost">
            Back to bakeops.me
          </Link>
        </div>
      </div>
</div>
    );
  }

  if (!demo && state.kind === 'notfound') {
    return (
<div className="track">
{topbar(false)}
      <div className="card track-landing">
        <div className="track-landing__icon track-landing__icon--muted">
          <Icon name="search" size={28} />
        </div>
        <h1>Order not found</h1>
        <p className="muted">
          This link doesn&apos;t match any order. Check that you opened the full link your shop sent you, or ask them to send it again.
        </p>
      </div>
</div>
    );
  }

  if (!view) {
    if (state.kind === 'offline') {
      return (
<div className="track">
{topbar(false)}
        <div className="card track-landing">
          <div className="track-landing__icon track-landing__icon--muted">
            <Icon name="refresh" size={28} />
          </div>
          <h1>Can&apos;t reach the shop right now</h1>
          <p className="muted">Check your internet connection. We&apos;ll keep trying every few seconds.</p>
          <button type="button" className="btn btn--primary" onClick={() => void load()}>
            Try again
          </button>
        </div>
</div>
      );
    }
    return <div className="track-skeleton" aria-busy="true" />;
  }

  const { business, order } = view.data;
  const cancelled = order.status === 'CANCELLED';
  const delivered = order.status === 'DELIVERED';
  const current = PIPELINE.find((s) => s.status === order.status);

  return (
    <div className="track">
      {topbar(true)}

      {demo ? (
        <p className="track__demo-note">
          <Icon name="sparkles" size={14} /> This is a demo. Real pages update by themselves as the shop moves your order along.
        </p>
      ) : null}

      <header className="card track__shop">
        {business.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={business.logoUrl} alt="" className="avatar avatar--img" />
        ) : (
          <div className="avatar">{business.name.trim()[0]?.toUpperCase() ?? 'B'}</div>
        )}
        <div className="track__shop-text">
          <div className="eyebrow">Your order from</div>
          <h1 className="track__shop-name">{business.name}</h1>
        </div>
        {business.phone ? (
          <a className="icon-btn" href={`tel:${business.phone}`} aria-label={`Call ${business.name}`} title="Call the shop">
            <Icon name="phone" />
          </a>
        ) : null}
      </header>

      <section className={`card track__status ${cancelled ? 'track__status--cancelled' : delivered ? 'track__status--done' : ''}`}>
        {cancelled ? (
          <>
            <div className="track__status-head">
              <div>
                <div className="eyebrow">Hi {order.customerFirstName || 'there'}, your order was</div>
                <h2 className="track__status-title track__status-title--muted">Cancelled</h2>
                <p className="muted">The shop has cancelled this order and won&apos;t be delivering it.</p>
              </div>
              <span className="pill pill--cancelled">Cancelled</span>
            </div>
            <Timeline status={order.status} />
            <div className="track__cancel-note">
              <span className="track__cancel-icon">
                <Icon name="x" size={16} />
              </span>
              <p>
                Not expecting this?{' '}
                {business.phone ? (
                  <>
                    <a href={`tel:${business.phone}`}>Call {business.name}</a> and they&apos;ll sort it out.
                  </>
                ) : (
                  <>Get in touch with {business.name} and they&apos;ll sort it out.</>
                )}
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="track__status-head">
              <div>
                <div className="eyebrow">Hi {order.customerFirstName || 'there'}, your order is</div>
                <h2 className="track__status-title">{current?.label ?? order.status}</h2>
                <p className="muted">{current?.blurb}</p>
              </div>
              <span className={`pill pill--${order.status.toLowerCase()}`}>{current?.label}</span>
            </div>
            <Timeline status={order.status} />
          </>
        )}
      </section>

      {!cancelled ? (
      <div className="track__grid">
        <section className="card">
          <h3 className="card__title">
            <Icon name="calendar" size={18} /> Delivery
          </h3>
          <p className="track__big">{describeDelivery(order.deliveryDate)}</p>
          {order.occasionTag ? (
            <p className="muted small">
              <Icon name="gift" size={14} /> {order.occasionTag}
            </p>
          ) : null}
        </section>

        <section className="card">
          <h3 className="card__title">
            <Icon name="wallet" size={18} /> Payment
          </h3>
          {order.balanceDue > 0 ? (
            <>
              <p className="track__big">{formatMoney(order.balanceDue)}</p>
              <p className="muted small">
                to pay on delivery{order.advancePaid > 0 ? ` · ${formatMoney(order.advancePaid)} advance received` : ''}
              </p>
            </>
          ) : (
            <>
              <p className="track__big track__big--ok">Fully paid</p>
              <p className="muted small">Total {formatMoney(order.totalAmount)}</p>
            </>
          )}
        </section>
      </div>

      ) : null}

      <section className="card">
        <h3 className="card__title">
          <Icon name="cake" size={18} /> Items
        </h3>
        <ul className="track__items">
          {order.items.map((item, i) => (
            <li key={i}>
              <span className="track__qty">{item.quantity}×</span>
              <span>{item.description}</span>
            </li>
          ))}
        </ul>
      </section>

      {order.invoice ? (
        <section className="card track__receipt">
          <div className="track__receipt-head">
            <h3 className="card__title">
              <Icon name="list" size={18} /> Receipt
            </h3>
            <span className="muted small">{order.invoice.invoiceNumber}</span>
          </div>
          {demo ? (
            <div className="track__receipt-actions">
              <span className="btn btn--ghost" aria-disabled="true">
                <Icon name="link" size={16} /> View receipt
              </span>
              <span className="btn btn--primary" aria-disabled="true">
                <Icon name="download" size={16} /> Download PDF
              </span>
            </div>
          ) : (
            <div className="track__receipt-actions">
              <a className="btn btn--ghost" href={`${API_URL}${order.invoice.receiptPath}`} target="_blank" rel="noopener">
                <Icon name="link" size={16} /> View receipt
              </a>
              <a className="btn btn--primary" href={`${API_URL}${order.invoice.pdfPath}`} target="_blank" rel="noopener">
                <Icon name="download" size={16} /> Download PDF
              </a>
            </div>
          )}
        </section>
      ) : null}

      <p className="track__updated muted small">
        {view.stale ? (
          <>
            <Icon name="refresh" size={14} /> Offline · showing the last update from {ago(Date.now() - view.fetchedAt)}
          </>
        ) : (
          <>
            <Icon name="refresh" size={14} /> Updates automatically · checked {ago(Date.now() - view.fetchedAt)}
          </>
        )}
      </p>

      <p className="track__powered muted small">
        Powered by BakeOps
      </p>
    </div>
  );
}
