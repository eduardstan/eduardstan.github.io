import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// The blog is the only content collection. Everything else the site shows —
// publications, talks, service, projects, the CV, the announcement feed — is
// read from the repository's own data files by `src/lib/record.ts` and
// `src/lib/cv.ts`, so it has exactly one source and cannot drift from the CV.
//
// There was a `projects` collection holding an al-folio template stub. It is
// gone: `/projects/` renders `cv/cv.yaml`'s `projects[]`.

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

export const collections = { blog };
