import { getCollection } from 'astro:content';
import { FEATURES } from './features';
import { SQUEEZE } from './squeeze';

export interface Route { path: string; lastmod?: Date }

/**
 * Every indexable page. The sitemap is built from this list and scripts/audit-site.mjs checks it against the built
 * pages, so a page added without a sitemap entry (or the reverse) fails the build. thanks, intake-error and 404 are
 * noindex and stay out.
 */
export async function indexableRoutes(): Promise<Route[]> {
  const articles = await getCollection('articles');
  return [
    { path: '/' },
    { path: '/features/' },
    ...FEATURES.map((f) => ({ path: `/features/${f.slug}/` })),
    { path: '/insights/' },
    ...articles.map((a) => ({ path: `/insights/${a.id}/`, lastmod: a.data.updated ?? a.data.published })),
    { path: '/demo/' },
    { path: '/waitlist/' },
    { path: '/contact/' },
    { path: '/privacy/' },
    ...SQUEEZE.map((s) => ({ path: `/go/${s.slug}/` })),
  ];
}
