import type { Metadata } from 'next';
import Link from 'next/link';
import { EMAIL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'What BakeOps stores, where it is stored, who can see it, and how to delete your account.',
};

const UPDATED = '13 November 2026';

export default function PrivacyPage() {
  const contact = EMAIL ? <a href={`mailto:${EMAIL}`}>{EMAIL}</a> : <Link href="/contact/">our contact page</Link>;

  return (
    <section className="page">
      <div className="container prose">
        <span className="eyebrow">Last updated {UPDATED}</span>
        <h1>Privacy policy</h1>
        <p>
          BakeOps is an app that helps small food businesses (“shops”) manage orders, deliveries and payments. This policy explains what we
          store, why, where, and the choices you have. We keep it short and plain on purpose.
        </p>

        <h2>Who this covers</h2>
        <ul>
          <li>
            <strong>Shop owners</strong> who use the BakeOps app.
          </li>
          <li>
            <strong>Their customers</strong>, whose details a shop enters into the app, and who may open a receipt or tracking link.
          </li>
        </ul>

        <h2>What we store</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Examples</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Your account</td>
              <td>Name, email, password (stored only as a secure hash)</td>
              <td>To log you in</td>
            </tr>
            <tr>
              <td>Shop details</td>
              <td>Shop name, phone, address, GSTIN, logo</td>
              <td>To show on receipts and tracking pages</td>
            </tr>
            <tr>
              <td>Customers</td>
              <td>Name, phone number, optional email, address, notes, birthdays/anniversaries</td>
              <td>To take orders and remind you of occasions</td>
            </tr>
            <tr>
              <td>Orders &amp; money</td>
              <td>Items, prices, delivery dates, status, invoices, payments</td>
              <td>To run your shop and keep your accounts</td>
            </tr>
            <tr>
              <td>Products</td>
              <td>Your menu items and prices</td>
              <td>To fill in orders quickly</td>
            </tr>
            <tr>
              <td>Technical logs</td>
              <td>Request times, error messages, anonymous request IDs</td>
              <td>To fix bugs and keep the service running</td>
            </tr>
          </tbody>
        </table>
        <p>
          We do <strong>not</strong> sell data, show ads, or use your shop&apos;s data to train AI models. We don&apos;t use tracking
          cookies on this website.
        </p>

        <h2>Who can see it</h2>
        <ul>
          <li>Only you, logged into your shop account, can see your shop&apos;s customers, orders and money.</li>
          <li>
            A <strong>receipt link</strong> shows that one invoice. A <strong>tracking link</strong> shows that one order&apos;s items,
            delivery time, status and balance, with the customer&apos;s first name only. Neither shows phone numbers, notes, or any other
            customer. Links use long random IDs that can&apos;t be guessed.
          </li>
          <li>Anyone you forward a link to can open it, so share links only with the customer they belong to.</li>
        </ul>

        <h2>Where it is stored</h2>
        <p>We use a few trusted providers to run BakeOps. Data travels to them over encrypted (HTTPS) connections.</p>
        <ul>
          <li>
            <strong>Neon</strong>: the database that holds accounts, customers, orders and payments.
          </li>
          <li>
            <strong>Render</strong>: runs the BakeOps server that the app and website talk to.
          </li>
          <li>
            <strong>Cloudinary</strong>: stores shop logos you upload.
          </li>
          <li>
            <strong>Expo</strong>: delivers app updates to your phone. It doesn&apos;t receive your shop data.
          </li>
        </ul>
        <p>These providers may store data outside India. They process it only to provide their service to us.</p>

        <h2>How long we keep it</h2>
        <p>
          We keep your data while your account is active. If you delete your account, we delete your shop, customers, orders, products and
          invoices within 30 days, apart from anything we are legally required to keep.
        </p>

        <h2>Your choices</h2>
        <ul>
          <li>
            <strong>See or correct</strong> your data any time in the app.
          </li>
          <li>
            <strong>Delete a customer</strong> or an order from the app.
          </li>
          <li>
            <strong>Delete your account</strong>: contact us at {contact} from your account&apos;s email and we&apos;ll remove everything.
          </li>
          <li>
            <strong>Customers</strong> who want their details removed can ask the shop, or contact us and we&apos;ll help.
          </li>
        </ul>

        <h2>Children</h2>
        <p>BakeOps is meant for businesses and isn&apos;t directed at children under 13.</p>

        <h2>Changes</h2>
        <p>If we change this policy, we&apos;ll update the date at the top. Big changes will also be announced in the app.</p>

        <h2>Contact</h2>
        <p>Questions about privacy? Reach us at {contact}.</p>
      </div>
    </section>
  );
}
