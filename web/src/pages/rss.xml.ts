import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getPublishedPosts } from '../lib/content';
import { profile } from '../lib/record';

export const GET: APIRoute = async (context) => {
  const posts = await getPublishedPosts();
  const { name } = profile();

  return rss({
    title: name,
    description: `Posts by ${name}.`,
    // `context.site` comes from the `site` option in astro.config.mjs.
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      categories: [...post.data.categories, ...post.data.tags],
      link: `/blog/${post.id}/`,
    })),
  });
};
