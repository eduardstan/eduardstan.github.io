// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { consistency, report } from './src/lib/consistency.ts';
import { legacyRedirects } from './src/lib/legacy-urls.ts';

/**
 * The consistency gate, with teeth.
 *
 * `astro:build:done` runs on `astro build` and never on `astro dev` — no
 * environment sniffing, no `CI=true`, no flag. The author editing `cv.yaml` at
 * 2am sees the findings render live under the inspect switch and keeps working;
 * nothing publishable ships a contradiction. Locally and in CI it is the same
 * code and the same message, because a CI failure nobody can reproduce locally
 * is a CI failure people learn to click through.
 */
/** @returns {import('astro').AstroIntegration} */
function consistencyGate() {
  return {
    name: 'consistency-gate',
    hooks: {
      'astro:build:done': ({ logger }) => {
        const gate = consistency();
        const text = report(gate);
        if (gate.contradictions.length + gate.exceptionProblems.length > 0) throw new Error(text);
        logger.info(text);
      },
    },
  };
}

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: 'https://eduardstan.github.io',
  // Addresses the Jekyll site published and this one does not generate. See
  // `src/lib/legacy-urls.ts` for why they are written down rather than derived.
  redirects: legacyRedirects,
  markdown: {
    // Astro 7 renders Markdown with Sätteri by default, and Sätteri's plugin API
    // is deliberately not remark/rehype compatible. The existing posts rely on
    // remark-math + rehype-katex, so opt back into the unified processor.
    // `@astrojs/mdx` inherits `markdown.processor`, so .mdx gets math too.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [rehypeKatex],
    }),
    syntaxHighlight: 'shiki',
    shikiConfig: {
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      // Emit both palettes as CSS variables so the dark-mode toggle can switch
      // highlighting without a second render pass. See src/styles/global.css.
      defaultColor: false,
      wrap: true,
    },
  },
  integrations: [mdx(), sitemap(), consistencyGate()],
  vite: {
    plugins: [tailwindcss()],
  },
});
