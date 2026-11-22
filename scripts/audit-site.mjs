#!/usr/bin/env node
/**
 * The gate on the built site (dist/). The mirror is public, so this is what stands between the repo and the web.
 *
 *   node scripts/audit-site.mjs dist                       merge request builds (forms may be offline)
 *   node scripts/audit-site.mjs dist --require-endpoint    release builds: every form must post to the Logic App
 *
 * It fails on: anything loaded from another origin, any script other than JSON-LD, a form posting anywhere but an
 * Azure Logic App, internal hosts, sign-in or app vocabulary, prices or plans, brand words we do not use, a page
 * without title, description, canonical, CSP or exactly one h1, an indexable page without a call to action, an
 * article without structured data, a feature link, sources or a call to action, a squeeze page with navigation or
 * more than one form, and a sitemap that does not list exactly the indexable pages.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN = 'https://kassova.com';
const LOGIC_APP_ACTION = /^https:\/\/[a-z0-9.-]+\.logic\.azure\.com(:443)?\/workflows\/[0-9a-f]+\/triggers\/[A-Za-z0-9_]+\/paths\/invoke\?/;
const MIN_ARTICLES = 12;
const INTAKE_PATHS = ['/demo/', '/waitlist/', '/contact/'];

/** Content rules for every published text file. The form action is removed before these run. */
export const BANNED = [
  { name: 'internal host', re: /developerdojo\.org|focuspass\.com|focuscell\.org|taofinances\.com|hypersystem|svc\.cluster\.local|app\.kassova\.com|\bziti\b|keycloak/i },
  { name: 'private address', re: /\b(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/ },
  { name: 'sign-in vocabulary', re: /sign[ -]?(in|up)\b|\blog[ -]?(in|on)\b|password|create an account|\/auth\b|oauth|\boidc\b/i },
  { name: 'app reference', re: /(^|[^a-z])api([^a-z]|$)|openapi|graphql/i },
  { name: 'price or plan', re: /[$€£¥] ?[0-9]|\b(usd|eur|gbp) ?[0-9]|per (month|year|seat|user)\b|\/mo\b|(?<!transfer )pricing|free trial|checkout|\bplans?\b (start|from)|subscribe now|buy now/i },
  { name: 'brand word we do not use', re: /seamless|effortless|revolutionary|game-changing|supercharge|ai-powered|single source of truth|zero-day close|every entity|done for you|wealth intelligence|coming soon/i },
];

const ALLOWED_LINKS_ON_SQUEEZE = ['/privacy/'];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const pathOf = (root, file) => {
  const rel = relative(root, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
};

const all = (html, re) => [...html.matchAll(re)].map((m) => m[0]);
const attr = (tag, name) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1] ?? null;

export function auditHtml(path, html, { requireEndpoint }) {
  const problems = [];
  const p = (msg) => problems.push(`${path}: ${msg}`);
  const noindex = /<meta name="robots" content="noindex"/.test(html);

  if (!/^<!DOCTYPE html>/i.test(html.trimStart())) p('no doctype');
  if (!/<html lang="en"/.test(html)) p('html has no lang="en"');
  if (all(html, /<title>[^<]{5,}<\/title>/g).length !== 1) p('needs exactly one non-empty title');
  const desc = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '';
  if (desc.length < 50 || desc.length > 200) p(`meta description is ${desc.length} characters (50 to 200)`);
  if (path !== '/404.html') {
    const canonical = /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1];
    if (canonical !== `${ORIGIN}${path}`) p(`canonical is ${canonical ?? 'missing'}, expected ${ORIGIN}${path}`);
  }
  if (!/<meta http-equiv="Content-Security-Policy" content="default-src 'none';/.test(html)) p('no Content-Security-Policy meta');
  if (all(html, /<h1[\s>]/g).length !== 1) p('needs exactly one h1');

  // Nothing runs and nothing loads from elsewhere.
  for (const tag of all(html, /<script\b[^>]*>/g)) if (attr(tag, 'type') !== 'application/ld+json' || attr(tag, 'src')) p(`script that is not inline JSON-LD: ${tag}`);
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(m[1]); } catch { p('JSON-LD that does not parse'); }
  }
  if (/<(iframe|object|embed|video|audio)\b/.test(html)) p('embedded media or frame');
  for (const tag of all(html, /<(img|source|link)\b[^>]*>/g)) {
    const url = attr(tag, 'src') ?? (attr(tag, 'rel') === 'canonical' || attr(tag, 'rel') === 'alternate' ? null : attr(tag, 'href'));
    if (url && /^(https?:)?\/\//.test(url)) p(`loads from another origin: ${tag}`);
  }
  if (/url\(\s*['"]?(https?:)?\/\//.test(html) || /@import/.test(html)) p('stylesheet loads from another origin');
  if (/\son[a-z]+="/.test(html)) p('inline event handler');

  // Forms: only the lead form, only to the Logic App.
  const forms = all(html, /<form\b[^>]*>/g);
  for (const tag of forms) {
    const action = attr(tag, 'action');
    if (action === null) {
      if (requireEndpoint) p('form without the intake endpoint in a release build');
    } else if (!LOGIC_APP_ACTION.test(action.replace(/&amp;/g, '&'))) p('form posts somewhere other than an Azure Logic App trigger');
    if (attr(tag, 'method') !== 'post') p('form is not method="post"');
  }
  if (forms.length > 0) {
    if (!/name="website" tabindex="-1"/.test(html)) p('form without the honeypot field');
    if (!/name="consent" value="yes" required/.test(html)) p('form without the consent box');
    for (const key of ['form', 'source', 'campaign']) if (!new RegExp(`type="hidden" name="${key}" value="[^"]+"`).test(html)) p(`form without hidden ${key}`);
    const source = /type="hidden" name="source" value="([^"]*)"/.exec(html)?.[1];
    if (source && source !== path) p(`hidden source is ${source}, expected ${path}`);
  }

  // Squeeze pages: one offer, one form, no navigation.
  if (path.startsWith('/go/')) {
    if (forms.length !== 1) p(`squeeze page has ${forms.length} forms, needs one`);
    if (/<nav\b|class="site-header"|class="site-footer"/.test(html)) p('squeeze page has navigation');
    const campaign = /type="hidden" name="campaign" value="([^"]*)"/.exec(html)?.[1] ?? '';
    if (!campaign.startsWith('sq-')) p(`squeeze campaign ${campaign} does not start with sq-`);
    for (const tag of all(html, /<a\b[^>]*>/g)) {
      const href = attr(tag, 'href');
      if (href && !ALLOWED_LINKS_ON_SQUEEZE.includes(href)) p(`squeeze page links away to ${href}`);
    }
  } else if (!noindex && path !== '/404.html' && forms.length === 0) {
    // Every other indexable page carries a call to action.
    if (!INTAKE_PATHS.some((t) => html.includes(`href="${t}"`))) p('no call to action');
  }

  // Articles: structured data, a feature link, sources and a call to action.
  if (/^\/insights\/[^/]+\/$/.test(path)) {
    if (!html.includes('"@type":"Article"')) p('article without Article structured data');
    if (!/<a href="\/features\/[a-z0-9-]+\/">/.test(html)) p('article without an internal link to a feature page');
    if (!/id="sources"/.test(html)) p('article without sources');
    if (!/class="cta"/.test(html)) p('article without the call to action');
  }
  return { problems, noindex };
}

export function auditText(path, text) {
  const scrubbed = text.replace(/\saction="[^"]*"/g, ' action=""');
  const visible = path.endsWith('.html') ? scrubbed.replace(/<style[\s\S]*?<\/style>/g, '') : scrubbed;
  return BANNED.filter((rule) => rule.re.test(visible)).map((rule) => `${path}: ${rule.name} (${rule.re.exec(visible)?.[0]})`);
}

export function auditSite(root, { requireEndpoint = false } = {}) {
  const problems = [];
  if (!existsSync(root)) return [`${root} does not exist; build first`];
  const files = walk(root);
  const read = (f) => readFileSync(f, 'utf8');

  if (!existsSync(join(root, 'CNAME')) || read(join(root, 'CNAME')).trim() !== 'kassova.com') problems.push('CNAME is not kassova.com');
  if (!existsSync(join(root, '.nojekyll'))) problems.push('.nojekyll is missing');

  const indexable = [];
  let articles = 0;
  for (const file of files) {
    const path = pathOf(root, file);
    if (/\.(html|xml|txt|json|css|js|svg|md)$/.test(file)) problems.push(...auditText(path, read(file)));
    if (file.endsWith('.js')) problems.push(`${path}: a JavaScript file was emitted`);
    if (!file.endsWith('.html')) continue;
    const { problems: found, noindex } = auditHtml(path, read(file), { requireEndpoint });
    problems.push(...found);
    if (!noindex && path !== '/404.html') indexable.push(path);
    if (/^\/insights\/[^/]+\/$/.test(path)) articles += 1;
  }
  if (articles < MIN_ARTICLES) problems.push(`${articles} articles, at least ${MIN_ARTICLES} expected`);
  if (!indexable.some((p) => p.startsWith('/go/'))) problems.push('no squeeze pages were built');

  const sitemapFile = join(root, 'sitemap.xml');
  if (!existsSync(sitemapFile)) problems.push('sitemap.xml is missing');
  else {
    const listed = [...read(sitemapFile).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(ORIGIN, '')).sort();
    const built = [...indexable].sort();
    for (const p of built) if (!listed.includes(p)) problems.push(`sitemap.xml does not list ${p}`);
    for (const p of listed) if (!built.includes(p)) problems.push(`sitemap.xml lists ${p}, which is not an indexable page`);
  }
  const rssFile = join(root, 'rss.xml');
  if (!existsSync(rssFile)) problems.push('rss.xml is missing');
  else if ((read(rssFile).match(/<item>/g) ?? []).length !== articles) problems.push('rss.xml does not carry every article');
  const robotsFile = join(root, 'robots.txt');
  if (!existsSync(robotsFile) || !read(robotsFile).includes(`Sitemap: ${ORIGIN}/sitemap.xml`)) problems.push('robots.txt does not name the sitemap');

  return { problems, articles, indexable };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const root = process.argv[2] ?? 'dist';
  const requireEndpoint = process.argv.includes('--require-endpoint');
  const result = auditSite(root, { requireEndpoint });
  if (Array.isArray(result)) { console.error(result.join('\n')); process.exit(1); }
  const { problems, articles, indexable } = result;
  console.log(`audited ${root}: ${indexable.length} indexable pages, ${articles} articles, squeeze pages: ${indexable.filter((p) => p.startsWith('/go/')).join(' ')}`);
  if (problems.length > 0) {
    console.error(problems.map((x) => `  ${x}`).join('\n'));
    console.error(`site audit failed: ${problems.length} problem(s)`);
    process.exit(1);
  }
  console.log('site audit passed');
}
