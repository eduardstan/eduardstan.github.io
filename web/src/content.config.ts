import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Schemas only. Real content is migrated in a later task — the entries under
// src/content/ exist to prove the pipeline (schema validation, rendering,
// routing, RSS) actually works end to end.

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    /** Omit from listings, feeds and sitemap. */
    draft: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    categories: z.array(z.string()).default([]),
  }),
});

const news = defineCollection({
  loader: glob({ base: './src/content/news', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string().optional(),
    date: z.coerce.date(),
    /** Short items render inline in listings; long ones get their own page. */
    inline: z.boolean().default(false),
    related_posts: z.array(z.string()).default([]),
  }),
});

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** Lower numbers sort first. */
    order: z.number().default(0),
    category: z.string().optional(),
    /** Show with a larger card on the projects index. */
    featured: z.boolean().default(false),
    github: z.url().optional(),
    website: z.url().optional(),
  }),
});

export const collections = { blog, news, projects };
