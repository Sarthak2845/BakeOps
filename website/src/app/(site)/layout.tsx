import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';

/** Marketing pages: navbar + footer. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Nav />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
