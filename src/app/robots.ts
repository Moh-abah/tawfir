import type { MetadataRoute } from 'next';
import { PUBLIC_URL } from '@/lib/site-config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${PUBLIC_URL}/sitemap.xml`,
  };
}
