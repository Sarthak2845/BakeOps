import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { Phone } from '@/components/Phone';
import { APK_URL, whatsappLink } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Download',
  description: 'Download BakeOps for Android and set up your shop in a minute.',
};

export default function DownloadPage() {
  const notify = whatsappLink('Hi! Please let me know when the BakeOps app is ready to download.');

  return (
    <section className="page">
      <div className="container dl-grid">
        <div>
          <div className="page__head">
            <span className="eyebrow">Android app</span>
            <h1>
              Get <span className="gradient-text">BakeOps</span>
            </h1>
            <p className="muted" style={{ fontSize: '1.15rem' }}>
              Install it straight from this page. It&apos;s free while we&apos;re in early access.
            </p>
          </div>

          {APK_URL ? (
            <a href={APK_URL} className="btn btn--primary btn--lg">
              <Icon name="download" size={18} /> Download for Android (APK)
            </a>
          ) : (
            <div className="note">
              <Icon name="clock" size={20} />
              <div>
                <strong>The first public build is on its way.</strong>
                <br />
                {notify ? (
                  <>
                    <a href={notify} target="_blank" rel="noopener">
                      Message us on WhatsApp
                    </a>{' '}
                    and we&apos;ll send you the link as soon as it&apos;s ready.
                  </>
                ) : (
                  <>
                    Check back soon, or <Link href="/contact/">get in touch</Link>.
                  </>
                )}
              </div>
            </div>
          )}

          <h2 style={{ fontSize: '1.5rem', marginTop: 44 }}>Installing on Android</h2>
          <ol className="install-steps">
            <li>
              <div>
                <strong>Tap the download button</strong>
                <p>Your phone downloads <code>BakeOps.apk</code>. Open it from the notification or your Downloads folder.</p>
              </div>
            </li>
            <li>
              <div>
                <strong>Allow the install</strong>
                <p>
                  Android asks to allow installing from your browser or WhatsApp (“Install unknown apps”). Turn it on once; you won&apos;t be
                  asked again.
                </p>
              </div>
            </li>
            <li>
              <div>
                <strong>Tap “Install anyway” if Play Protect asks</strong>
                <p>The app isn&apos;t on the Play Store yet, so Google may say it doesn&apos;t recognise it. That&apos;s expected.</p>
              </div>
            </li>
            <li>
              <div>
                <strong>Open BakeOps and set up your shop</strong>
                <p>Add your shop name, phone and logo, then paste your menu. You&apos;re ready to take orders.</p>
              </div>
            </li>
          </ol>

          <div className="note" style={{ marginTop: 28 }}>
            <Icon name="refresh" size={20} />
            <div>
              <strong>Updates arrive by themselves.</strong> New features and fixes download in the background and apply the next time you
              open the app. You only reinstall for rare big updates, and we&apos;ll tell you when.
            </div>
          </div>

          <div className="note" style={{ marginTop: 12 }}>
            <Icon name="smartphone" size={20} />
            <div>
              <strong>On iPhone?</strong> An iPhone version is planned. Your customers can already open receipts and tracking links on
              any phone.
            </div>
          </div>
        </div>

        <div className="row" style={{ justifyContent: 'center', paddingTop: 20 }}>
          <Phone src="/screens/home-light.png" alt="BakeOps Today dashboard" priority />
        </div>
      </div>
    </section>
  );
}
