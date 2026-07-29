/**
 * The feed, from the same stream `/lately/` and the front page render.
 *
 * It used to carry the blog alone, which made the site's one subscribable
 * address the smallest of its four sources. It now carries every announcement
 * the repository generates — posts included, as `Writing` items — so a reader
 * subscribed here sees exactly what the register shows.
 *
 * There is no page per announcement, so every item's link is its anchor in the
 * register. That is also its guid: distinct per item, and it lands the reader
 * on the row rather than at the top of the page.
 */
import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { announcements, formatStamp } from '../lib/announcements';
import { profile } from '../lib/record';

export const GET: APIRoute = async (context) => {
  const feed = announcements();
  const { name } = profile();

  return rss({
    title: name,
    description: `Announcements by ${name}, generated from the records they announce.`,
    // `context.site` comes from the `site` option in astro.config.mjs.
    site: context.site!,
    // Every link ends in a fragment, and the default would append the site's
    // trailing slash after it — `/lately/#id/` is not the anchor.
    trailingSlash: false,
    items: feed.items.map((item) => ({
      // The date is in the title because `pubDate` is often finer than the
      // source: an item whose record states only a year is dated 1 January
      // there, and must not be read as having happened on that day.
      title: `${item.kind} · ${formatStamp(item)}`,
      description: item.text,
      content: item.html,
      pubDate: item.at,
      categories: [item.kind],
      link: `/lately/#${item.id}`,
    })),
  });
};
