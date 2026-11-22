import { defineCollection } from 'astro/content/config';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { FEATURES } from './data/features';

const featureSlugs = FEATURES.map((f) => f.slug) as [string, ...string[]];

/**
 * Magazine articles. Every article names its sources, links to one feature page and ends with a call to action.
 * Tax, legal and compliance articles carry `generalInformation: true`, which prints the general-information notice.
 */
const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string().min(10).max(70),
    description: z.string().min(50).max(170),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    category: z.enum(['Close and control', 'Treasury', 'Records and compliance', 'Planning', 'Assets', 'Security']),
    feature: z.enum(featureSlugs),
    cta: z.enum(['demo', 'waitlist', 'talk']),
    generalInformation: z.boolean(),
    sources: z.array(z.object({ title: z.string(), publisher: z.string(), url: z.url() })).min(1),
  }),
});

export const collections = { articles };
