import { getCollection } from 'astro:content';

/**
 * Published blog posts, newest first. The single place the draft rule and the
 * sort order are defined, so listings, post routes and the feed cannot drift.
 */
export async function getPublishedPosts() {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** Shared date rendering for every listing, post page and feed entry. */
export const dateFormat = new Intl.DateTimeFormat('en', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});
