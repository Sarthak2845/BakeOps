import Link from 'next/link';
import { Icon, type IconName } from '@/components/Icon';
import { Phone } from '@/components/Phone';
import { Reveal } from '@/components/Reveal';
import { TrackDemo } from '@/components/TrackDemo';
import { APK_URL } from '@/lib/site';

const MARQUEE = ['Birthday cakes', 'Tiffin services', 'Cupcake studios', 'Home bakers', 'Brownie boxes', 'Festival sweets', 'Custom orders', 'Wedding cakes'];

const AUDIENCE: { icon: IconName; title: string; text: string }[] = [
  { icon: 'cake', title: 'Home bakers', text: 'Custom cakes, cupcakes and brownies, taken over WhatsApp.' },
  { icon: 'tiffin', title: 'Tiffin services', text: 'Daily orders, regular customers and monthly dues.' },
  { icon: 'chef', title: 'Small kitchens', text: 'Festival sweets, snacks and party orders.' },
  { icon: 'scissors', title: 'Made-to-order', text: 'Tailors and crafters who take orders with a delivery date.' },
];

const FAQ = [
  {
    q: 'How much does BakeOps cost?',
    a: 'BakeOps is free while we are in early access. If we ever add paid features, everything you use today stays free for early shops.',
  },
  {
    q: 'Is my customers’ data safe?',
    a: 'Your data lives in your own shop account, protected by your login, over encrypted connections. Customer tracking links show only that one order: never phone numbers, notes or other customers. See the privacy policy for the details.',
  },
  {
    q: 'Do my customers need to install anything?',
    a: 'No. Receipts and tracking links open in any phone browser, straight from WhatsApp, with no login.',
  },
  {
    q: 'Does it work on iPhone?',
    a: 'Right now BakeOps is an Android app. An iPhone version is planned. Your customers can use tracking links on any phone today.',
  },
  {
    q: 'Can I add my whole menu at once?',
    a: 'Yes. Paste your menu from Excel, Google Sheets, WhatsApp or Notes, one item per line, and BakeOps imports it in one go. It can also build your menu from the orders you have already taken.',
  },
  {
    q: 'What if I lose my phone?',
    a: 'Everything is stored in your account, not on the phone. Install the app on the new phone, log in, and it is all there.',
  },
];

export default function HomePage() {
  const getApp = APK_URL ? { href: APK_URL, label: 'Download for Android' } : { href: '/download/', label: 'Get the app' };

  return (
    <>
      <Reveal />

      {/* ---------------- Hero ---------------- */}
      <section className="hero">
        <div className="blob blob--1" />
        <div className="blob blob--2" />
        <div className="blob blob--3" />
        <div className="container hero__grid">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <span className="hero__badge">
              <span className="hero__badge-dot">
                <Icon name="sparkles" size={14} />
              </span>
              New: live order tracking for your customers
            </span>
            <h1>
              Run your home bakery <span className="gradient-text">without the chaos</span>
            </h1>
            <p className="hero__lede">
              Orders, deliveries, payments and birthday reminders in one simple app. Built for bakers who take orders on WhatsApp.
            </p>
            <div className="row">
              <a href={getApp.href} className="btn btn--primary btn--lg">
                <Icon name="download" size={18} /> {getApp.label}
              </a>
              <Link href="/track/?demo=1" className="btn btn--ghost btn--lg">
                See tracking demo <Icon name="arrow" size={18} />
              </Link>
            </div>
            <div className="hero__trust">
              <span>
                <Icon name="check" size={16} /> Free in early access
              </span>
              <span>
                <Icon name="check" size={16} /> No login for customers
              </span>
              <span>
                <Icon name="check" size={16} /> Light &amp; dark mode
              </span>
            </div>
          </div>

          <div className="hero__visual">
            <Phone src="/screens/order-light.png" alt="New Order screen in BakeOps" className="phone--back" />
            <Phone src="/screens/home-light.png" alt="BakeOps Today dashboard showing deliveries and money to collect" className="phone--front" priority />

            <div className="float-chip float-chip--a">
              <span className="float-chip__icon" style={{ background: 'var(--gradient)' }}>
                <Icon name="cake" size={18} />
              </span>
              <span>
                3× Black Forest 1kg<small>To bake today</small>
              </span>
            </div>
            <div className="float-chip float-chip--b">
              <span className="float-chip__icon" style={{ background: '#22c55e' }}>
                <Icon name="wallet" size={18} />
              </span>
              <span>
                ₹1,180 received<small>Rahul · Mark paid</small>
              </span>
            </div>
            <div className="float-chip float-chip--c">
              <span className="float-chip__icon" style={{ background: '#fb923c' }}>
                <Icon name="gift" size={18} />
              </span>
              <span>
                Priya’s birthday in 3 days<small>Send a WhatsApp reminder</small>
              </span>
            </div>
          </div>
        </div>

        <div className="marquee" aria-hidden="true">
          <div className="marquee__track">
            {[...MARQUEE, ...MARQUEE].map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Features ---------------- */}
      <section id="features" className="section">
        <div className="container">
          <div className="section__head reveal">
            <span className="eyebrow">Everything in one place</span>
            <h2>
              Less scrolling through chats.
              <br />
              <span className="gradient-text">More time to bake.</span>
            </h2>
            <p>BakeOps replaces the notebook, the calculator and the “did they pay?” guesswork.</p>
          </div>

          <div className="bento">
            <article className="card bento__item bento__item--hero reveal">
              <div className="bento__icon" style={{ background: 'var(--gradient)' }}>
                <Icon name="home" size={22} />
              </div>
              <h3>Your whole day on one screen</h3>
              <p>Today’s deliveries, what’s late, what still needs baking and how much to collect, the moment you open the app.</p>
              <div className="bento__art mini-days">
                {[
                  ['Today', 4],
                  ['Sat', 2],
                  ['Sun', 6],
                  ['Mon', 1],
                  ['Tue', 3],
                ].map(([d, n], i) => (
                  <div key={d} className={`mini-day ${i === 0 ? 'mini-day--on' : ''}`}>
                    {d}
                    <b>{n}</b>
                  </div>
                ))}
              </div>
            </article>

            <article className="card bento__item reveal">
              <div className="bento__icon" style={{ background: '#fb923c' }}>
                <Icon name="list" size={22} />
              </div>
              <h3>Prep list</h3>
              <p>Everything to make, added up across orders.</p>
              <div className="bento__art mini-list">
                <div className="mini-row">
                  <span className="mini-qty">3×</span> Black Forest 1kg
                </div>
                <div className="mini-row">
                  <span className="mini-qty">12×</span> Cupcakes
                </div>
              </div>
            </article>

            <article className="card bento__item bento__item--wide reveal">
              <div className="bento__icon" style={{ background: '#7c3aed' }}>
                <Icon name="search" size={22} />
              </div>
              <h3>Orders in seconds</h3>
              <p>Pick a regular customer, tap items from your saved menu, choose a delivery slot. Prices fill themselves in.</p>
              <div className="bento__art mini-list">
                <div className="mini-row">
                  Red Velvet Cake 1kg <b>₹1,180</b>
                </div>
                <div className="mini-row">
                  Oreo Cake 1/2kg <b>₹420</b>
                </div>
              </div>
            </article>

            <article className="card bento__item bento__item--wide reveal">
              <div className="bento__icon" style={{ background: '#22c55e' }}>
                <Icon name="wallet" size={22} />
              </div>
              <h3>Know who owes what</h3>
              <p>Outstanding money, split into overdue, this week and later. One tap to remind on WhatsApp or mark paid.</p>
              <div className="bento__art">
                <div className="mini-bar">
                  <span style={{ flex: 3, background: '#a78bfa' }} />
                  <span style={{ flex: 2, background: '#fb923c' }} />
                  <span style={{ flex: 1, background: '#ec4899' }} />
                </div>
                <div className="row small muted" style={{ gap: 16 }}>
                  <span>Later ₹3,200</span>
                  <span>This week ₹1,970</span>
                  <span>Overdue ₹790</span>
                </div>
              </div>
            </article>

            <article className="card bento__item reveal">
              <div className="bento__icon" style={{ background: '#ec4899' }}>
                <Icon name="message" size={22} />
              </div>
              <h3>WhatsApp receipts</h3>
              <p>Professional invoices with your logo, sent as a link. PDF included.</p>
            </article>

            <article className="card bento__item reveal">
              <div className="bento__icon" style={{ background: '#fb923c' }}>
                <Icon name="gift" size={22} />
              </div>
              <h3>Never miss a birthday</h3>
              <p>Save customers’ birthdays and anniversaries. Get a reminder to call before the day.</p>
            </article>

            <article className="card bento__item reveal">
              <div className="bento__icon" style={{ background: '#1e1533' }}>
                <Icon name="moon" size={22} />
              </div>
              <h3>Easy on the eyes</h3>
              <p>Light and dark mode, for early starts and late-night icing.</p>
            </article>
          </div>
        </div>
      </section>

      {/* ---------------- Live tracking ---------------- */}
      <section id="tracking" className="section" style={{ background: 'var(--bg-muted)' }}>
        <div className="container showcase">
          <div className="reveal">
            <span className="eyebrow">Live order tracking</span>
            <h2>
              “Is my cake ready?”
              <br />
              <span className="gradient-text">Answered before they ask.</span>
            </h2>
            <p className="muted">
              Send customers a tracking link on WhatsApp. They see their order move from received to delivered, live, without calling you.
            </p>
            <ul className="showcase__list">
              <li>
                <Icon name="check" size={18} /> Opens in any browser. No app, no login
              </li>
              <li>
                <Icon name="check" size={18} /> Updates by itself when you change the status
              </li>
              <li>
                <Icon name="check" size={18} /> Shows only that order: never phone numbers or notes
              </li>
            </ul>
            <Link href="/track/?demo=1" className="btn btn--primary">
              Try the demo <Icon name="arrow" size={16} />
            </Link>
          </div>
          <div className="reveal">
            <TrackDemo />
          </div>
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how" className="section">
        <div className="container">
          <div className="section__head reveal">
            <span className="eyebrow">Get going in minutes</span>
            <h2>How it works</h2>
          </div>
          <div className="steps">
            <div className="card step reveal">
              <h3>Set up your shop</h3>
              <p>Add your shop name, phone and logo. It goes on every receipt your customers see.</p>
            </div>
            <div className="card step reveal">
              <h3>Add your menu</h3>
              <p>Paste your price list from WhatsApp or Excel. BakeOps reads it in one go: names, sizes and prices.</p>
            </div>
            <div className="card step reveal">
              <h3>Take orders</h3>
              <p>Tap to build an order, share the tracking link, move it to ready, collect payment. Done.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Screens ---------------- */}
      <section className="section section--tight">
        <div className="container">
          <div className="section__head reveal">
            <span className="eyebrow">Day or night</span>
            <h2>Looks good at 5 am and 11 pm</h2>
          </div>
          <div className="screens-row reveal">
            <Phone src="/screens/money-light.png" alt="Money screen in light mode" />
            <Phone src="/screens/home-dark.png" alt="Today dashboard in dark mode" />
            <Phone src="/screens/money-dark.png" alt="Money screen in dark mode" />
          </div>
        </div>
      </section>

      {/* ---------------- Who it's for ---------------- */}
      <section className="section section--tight">
        <div className="container">
          <div className="section__head reveal">
            <span className="eyebrow">Made for small businesses</span>
            <h2>Who it’s for</h2>
          </div>
          <div className="audience">
            {AUDIENCE.map((a) => (
              <div key={a.title} className="card reveal">
                <div className="audience__icon">
                  <Icon name={a.icon} size={26} />
                </div>
                <h3>{a.title}</h3>
                <p>{a.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="section">
        <div className="container">
          <div className="section__head reveal">
            <span className="eyebrow">Questions</span>
            <h2>Frequently asked</h2>
          </div>
          <div className="faq reveal">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="section section--tight">
        <div className="container">
          <div className="cta reveal">
            <svg className="cta__sprinkles" viewBox="0 0 800 300" preserveAspectRatio="none" aria-hidden="true">
              {[
                [60, 40, 20],
                [160, 220, -30],
                [300, 60, 45],
                [520, 230, 15],
                [640, 50, -20],
                [740, 180, 60],
                [420, 130, -45],
                [90, 160, 70],
              ].map(([x, y, r], i) => (
                <rect key={i} x={x} y={y} width="26" height="7" rx="3.5" fill={i % 2 ? '#fdba74' : '#fff'} transform={`rotate(${r} ${x} ${y})`} />
              ))}
            </svg>
            <h2>Ready to bake calmer?</h2>
            <p>Set up your shop in a minute. Free while we’re in early access.</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              <a href={getApp.href} className="btn btn--light btn--lg">
                <Icon name="download" size={18} /> {getApp.label}
              </a>
              <Link href="/contact/" className="btn btn--ghost btn--lg">
                Talk to us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
