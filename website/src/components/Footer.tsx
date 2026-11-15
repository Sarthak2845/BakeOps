import Link from 'next/link';
import Image from 'next/image';
import { EMAIL, GITHUB_ISSUES, SITE_HOST, whatsappLink } from '@/lib/site';

export function Footer() {
  const wa = whatsappLink(`Hi! I found BakeOps on ${SITE_HOST} and have a question.`);
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <div className="brand">
            <Image src="/icon.png" alt="" width={32} height={32} className="brand__mark" />
            <span className="brand__name">BakeOps</span>
          </div>
          <p className="muted">Orders, deliveries and payments for home bakers and small food businesses. Made in Pune, India.</p>
        </div>
        <div className="footer__col">
          <h4>Product</h4>
          <Link href="/#features">Features</Link>
          <Link href="/download/">Download</Link>
          <Link href="/track/">Track an order</Link>
          <Link href="/track/?demo=1">Tracking demo</Link>
        </div>
        <div className="footer__col">
          <h4>Help</h4>
          <Link href="/contact/">Contact</Link>
          {wa ? <a href={wa} target="_blank" rel="noopener">WhatsApp</a> : null}
          {EMAIL ? <a href={`mailto:${EMAIL}`}>Email</a> : null}
          <a href={GITHUB_ISSUES} target="_blank" rel="noopener">Report a bug</a>
        </div>
        <div className="footer__col">
          <h4>Legal</h4>
          <Link href="/privacy/">Privacy policy</Link>
          <Link href="/terms/">Terms of use</Link>
        </div>
      </div>
      <div className="container footer__bottom muted">
        <span>© {new Date().getFullYear()} BakeOps</span>
        <span>{SITE_HOST}</span>
      </div>
    </footer>
  );
}
