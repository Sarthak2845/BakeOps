import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { EMAIL, GITHUB_ISSUES, whatsappLink } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Questions, feedback or a feature you need? Reach the BakeOps team on WhatsApp or email.',
};

export default function ContactPage() {
  const wa = whatsappLink('Hi! I have a question about BakeOps.');

  return (
    <section className="page">
      <div className="container">
        <div className="page__head">
          <span className="eyebrow">We&apos;re listening</span>
          <h1>
            Talk to <span className="gradient-text">us</span>
          </h1>
          <p className="muted" style={{ fontSize: '1.15rem' }}>
            Questions, feedback, or a feature your shop needs? We read every message.
          </p>
        </div>

        <div className="contact-grid">
          <div className="card">
            <div className="bento__icon" style={{ background: '#22c55e' }}>
              <Icon name="message" size={22} />
            </div>
            <h3>WhatsApp</h3>
            <p className="muted">The fastest way to reach us. Usually replies the same day.</p>
            {wa ? (
              <a href={wa} className="btn btn--whatsapp" target="_blank" rel="noopener">
                Chat on WhatsApp
              </a>
            ) : (
              <span className="muted small">Number coming soon</span>
            )}
          </div>

          <div className="card">
            <div className="bento__icon" style={{ background: 'var(--gradient)' }}>
              <Icon name="mail" size={22} />
            </div>
            <h3>Email</h3>
            <p className="muted">For longer questions, partnerships or account deletion requests.</p>
            {EMAIL ? (
              <a href={`mailto:${EMAIL}`} className="btn btn--ghost">
                {EMAIL}
              </a>
            ) : (
              <span className="muted small">Address coming soon</span>
            )}
          </div>

          <div className="card">
            <div className="bento__icon" style={{ background: '#1e1533' }}>
              <Icon name="github" size={22} />
            </div>
            <h3>Report a bug</h3>
            <p className="muted">Something not working? Tell us what happened and what you expected.</p>
            <a href={GITHUB_ISSUES} className="btn btn--ghost" target="_blank" rel="noopener">
              Open an issue
            </a>
          </div>
        </div>

        <p className="muted small" style={{ marginTop: 32 }}>
          Looking for your order? Use the tracking link your shop sent you, or see <Link href="/track/">how tracking works</Link>.
        </p>
      </div>
    </section>
  );
}
