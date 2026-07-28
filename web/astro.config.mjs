// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site: 'https://eduardstan.github.io',
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
  integrations: [mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});
