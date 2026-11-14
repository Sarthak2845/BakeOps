import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from './ThemeToggle';
import { Icon } from './Icon';

export function Nav() {
  return (
    <header className="nav">
      <div className="container nav__inner">
        <Link href="/" className="brand" aria-label="BakeOps home">
          <Image src="/icon.png" alt="" width={36} height={36} className="brand__mark" priority />
          <span className="brand__name">BakeOps</span>
        </Link>
        <nav className="nav__links" aria-label="Main">
          <Link href="/#features">Features</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/track/">Track an order</Link>
          <Link href="/contact/">Contact</Link>
        </nav>
        <div className="nav__actions">
          <ThemeToggle />
          <Link href="/download/" className="btn btn--primary btn--sm">
            <Icon name="download" size={16} /> Get the app
          </Link>
        </div>
      </div>
    </header>
  );
}
