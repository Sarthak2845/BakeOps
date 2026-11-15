const trim = (v: string | undefined) => (v ?? '').trim();

/** Public address of this site; tracking links are <site>/track/<shop>/<order>. */
export const SITE_URL = trim(process.env.NEXT_PUBLIC_SITE_URL).replace(/\/+$/, '') || 'https://bakeops.sarthak-rana.me';
/** The address without https://, for showing to people. */
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');
export const SITE_NAME = 'BakeOps';
export const TAGLINE = 'Orders, deliveries and payments for your home bakery, in one app.';

export const API_URL = trim(process.env.NEXT_PUBLIC_API_URL).replace(/\/+$/, '') || 'https://bakeops-api-njig.onrender.com';
export const APK_URL = trim(process.env.NEXT_PUBLIC_APK_URL);
export const WHATSAPP = trim(process.env.NEXT_PUBLIC_WHATSAPP).replace(/\D/g, '');
export const EMAIL = trim(process.env.NEXT_PUBLIC_EMAIL);

export const GITHUB_ISSUES = 'https://github.com/Sarthak2845/BakeOps/issues';

export function whatsappLink(message: string): string | null {
  if (!WHATSAPP) return null;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
}

export type OrderStatus = 'INQUIRY' | 'CONFIRMED' | 'IN_PROGRESS' | 'READY' | 'DELIVERED' | 'CANCELLED';

/** The pipeline shown to customers; Cancelled is handled separately. */
export const PIPELINE: { status: OrderStatus; label: string; blurb: string }[] = [
  { status: 'INQUIRY', label: 'Received', blurb: 'The shop has your order' },
  { status: 'CONFIRMED', label: 'Confirmed', blurb: 'Date and items confirmed' },
  { status: 'IN_PROGRESS', label: 'Baking', blurb: 'Being made right now' },
  { status: 'READY', label: 'Ready', blurb: 'Packed and waiting for you' },
  { status: 'DELIVERED', label: 'Delivered', blurb: 'Enjoy!' },
];

export function formatMoney(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}
