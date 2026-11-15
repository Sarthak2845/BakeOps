import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'The short version of the rules for using BakeOps.',
};

export default function TermsPage() {
  return (
    <section className="page">
      <div className="container prose">
        <span className="eyebrow">Last updated 13 November 2026</span>
        <h1>Terms of use</h1>
        <p>By using BakeOps you agree to these terms. They&apos;re short; please read them.</p>

        <h2>Your account</h2>
        <ul>
          <li>Keep your login safe. You&apos;re responsible for what happens in your account.</li>
          <li>Give accurate details about your shop.</li>
        </ul>

        <h2>Your data</h2>
        <ul>
          <li>Your shop&apos;s data belongs to you. We only use it to run BakeOps for you (see the <Link href="/privacy/">privacy policy</Link>).</li>
          <li>
            You&apos;re responsible for having your customers&apos; permission to store their details and to message them, and for sharing
            receipt and tracking links only with the right customer.
          </li>
        </ul>

        <h2>Fair use</h2>
        <ul>
          <li>Don&apos;t use BakeOps for anything illegal, to send spam, or to try to break or overload the service.</li>
          <li>We may suspend accounts that do.</li>
        </ul>

        <h2>Early access</h2>
        <ul>
          <li>BakeOps is free during early access and is improving quickly, so features may change.</li>
          <li>
            We work hard to keep it running and your data safe, but the service is provided “as is”. Keep your own records of anything
            important, such as invoices you&apos;re legally required to keep.
          </li>
          <li>To the extent the law allows, we aren&apos;t liable for lost sales or indirect losses caused by downtime or errors.</li>
        </ul>

        <h2>Invoices and taxes</h2>
        <p>BakeOps helps you create invoices, but you remain responsible for your prices, GST and tax filings.</p>

        <h2>Changes and ending</h2>
        <ul>
          <li>We may update these terms; we&apos;ll update the date above and tell you in the app about big changes.</li>
          <li>
            You can stop using BakeOps and ask us to delete your account at any time from the <Link href="/contact/">contact page</Link>.
          </li>
        </ul>

        <h2>Law</h2>
        <p>These terms are governed by the laws of India, with courts in Pune, Maharashtra.</p>
      </div>
    </section>
  );
}
