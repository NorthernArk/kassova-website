import type { APIRoute } from 'astro';
import { absolute } from '../site';

export const GET: APIRoute = () =>
  new Response(['User-agent: *', 'Allow: /', 'Disallow: /thanks/', 'Disallow: /intake-error/', '', `Sitemap: ${absolute('/sitemap.xml')}`, ''].join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
