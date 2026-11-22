import type { APIRoute } from 'astro';
import { indexableRoutes } from '../data/routes';
import { absolute } from '../site';
import { xml } from '../xml';

export const GET: APIRoute = async () => {
  const routes = await indexableRoutes();
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...routes.map((r) => `  <url><loc>${xml(absolute(r.path))}</loc>${r.lastmod ? `<lastmod>${r.lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}</url>`),
    '</urlset>',
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
