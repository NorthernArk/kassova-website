import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE, absolute } from '../site';
import { xml } from '../xml';

export const GET: APIRoute = async () => {
  const articles = (await getCollection('articles')).sort((a, b) => b.data.published.getTime() - a.data.published.getTime());
  const items = articles.map((a) => {
    const url = absolute(`/insights/${a.id}/`);
    return [
      '    <item>',
      `      <title>${xml(a.data.title)}</title>`,
      `      <link>${xml(url)}</link>`,
      `      <guid isPermaLink="true">${xml(url)}</guid>`,
      `      <description>${xml(a.data.description)}</description>`,
      `      <category>${xml(a.data.category)}</category>`,
      `      <pubDate>${a.data.published.toUTCString()}</pubDate>`,
      '    </item>',
    ].join('\n');
  });
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${xml(SITE.name)} insights</title>`,
    `    <link>${xml(absolute('/insights/'))}</link>`,
    `    <atom:link href="${xml(absolute('/rss.xml'))}" rel="self" type="application/rss+xml" />`,
    `    <description>${xml('Plain, sourced notes on multi-entity books, the close, cash, records and controls.')}</description>`,
    '    <language>en-us</language>',
    ...(articles[0] ? [`    <lastBuildDate>${articles[0].data.published.toUTCString()}</lastBuildDate>`] : []),
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
