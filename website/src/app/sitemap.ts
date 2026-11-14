import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', 'download/', 'track/', 'contact/', 'privacy/', 'terms/'];
  return pages.map((p) => ({
    url: `${SITE_URL}/${p}`,
    changeFrequency: p === '' ? 'weekly' : 'monthly',
    priority: p === '' ? 1 : 0.6,
  }));
}
