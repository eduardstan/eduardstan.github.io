import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// The blog is the only content collection, and it lives in `content/posts/`
// with the other adopter-owned records. Publications, talks, service, projects,
// the CV and the announcement feed are read from `content/` by
// `src/lib/record.ts` and `src/lib/cv.ts`, so each has exactly one source and
// cannot drift from the CV.
//
// The post ids keep their year directory (`2024/xai2-manifesto`), because that
// is the address the posts have always been published at.

const blog = defineCollection({
  loader: glob({ base: '../content/posts', pattern: '**/*.{md,mdx}' }),
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

export const collections = { blog };
