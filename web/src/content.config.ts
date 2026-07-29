import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// The blog is the only content collection, and it lives in `content/posts/`
// with everything else an adopter edits. Everything the site shows —
// publications, talks, service, projects, the CV, the announcement feed — is
// read from `content/` by `src/lib/record.ts` and `src/lib/cv.ts`, so it has
// exactly one source and cannot drift from the CV.
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
