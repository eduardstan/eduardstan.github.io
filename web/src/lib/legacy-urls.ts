/**
 * URLs the Jekyll site published that this site does not.
 *
 * Every other address on this site is derived from a record. These are not:
 * they are a historical fact about what `eduardstan.github.io` served before
 * the cutover, and the records that produced them (`_news/`, the archive
 * plugin's generated pages) are gone. Freezing the list here is the only way
 * to keep them from becoming silent 404s for anyone who linked to one.
 *
 * The inventory that produced this list, and the disposition of every live URL
 * it found, is `docs/url-parity.md`.
 *
 * `_news/` items published at `/news/<month>-<day>-<slug>/` — the year lived in
 * the directory and was dropped from the address. Each announcement they carried
 * is now generated from the fact it announces, so there is no per-item page to
 * land on: they redirect to the feed that contains them.
 */
const NEWS_SLUGS = [
  '06-10-pc-aaai2025',
  '07-16-new-position-unimib',
  '07-22-paper-modalfp-growth-efficient-extraction-of-modal-association-rules-from-non-tabular-data-accepted',
  '07-22-paper-symbolic-audio-classification-via-modal-decision-tree-learning-accepted',
  '08-02-post-xai2-manifesto',
  '08-07-paper-ic2024-online',
  '08-21-reviewer-jbhi',
  '08-26-reviewer-iclr2025',
  '10-22-paper-time2024-online',
  '01-11-ac-ijcnn2025',
  '01-13-pc-ijcai2025',
  '01-13-reviewer-eaai',
  '02-18-paper-authenticated-robotic-teleoperation-with-task-recognition-accepted',
  '03-03-associate-editor-frontiers-in-ai',
  '04-01-technical-committee-mda-ctsoc',
  '04-22-pc-ecai2025',
  '07-18-pc-aaai2026',
  '08-06-paper-telemonitoring-and-wearables-accepted',
  '09-09-ac-icassp2026',
  '09-23-pc-iclr-2026',
  '10-26-associate-editor-neurcomputing',
  '12-10-pc-ijcai2026',
];

/**
 * `jekyll-archives` generated a page per year, per tag and per category, and
 * every post row on `/blog/` linked to them. This site has one blog listing,
 * so they land there.
 */
const BLOG_ARCHIVES = [
  '/blog/2024',
  '/blog/2025',
  '/blog/tag/xai',
  '/blog/tag/tutorial',
  '/blog/category/reviews',
];

/** `{ oldPath: newPath }`, in the shape `astro.config.mjs` wants. */
export const legacyRedirects: Record<string, string> = {
  // The feed's own address. The Jekyll site published it at `/news/` and this
  // site publishes the same register at `/lately/`, the name it carries on the
  // front page. The old address stays alive rather than 404ing.
  '/news': '/lately/',
  ...Object.fromEntries(NEWS_SLUGS.map((slug) => [`/news/${slug}`, '/lately/'])),
  ...Object.fromEntries(BLOG_ARCHIVES.map((path) => [path, '/blog/'])),
};
