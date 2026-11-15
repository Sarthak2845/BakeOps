import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    // Individual order links are private to each customer.
    rules: { userAgent: '*', allow: '/', disallow: ['/track/*/'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
