/**
 * Self-check for the announcement stream, against the repository's real data.
 *
 *   cd web && node --experimental-strip-types src/lib/announcements.test.ts
 *
 * Three consumers read one stream: the front page's handful, the register at
 * `/lately/`, and `/rss.xml`. They cannot disagree about what "everything" is
 * because they call the same function — what needs guarding is the properties
 * that function promises: every item is addressable, every item carries the
 * record it came from, the kinds add up to the items, and a manuscript under
 * review is named as undated rather than announced in the year it is aimed at.
 */
import assert from 'node:assert/strict';
import { announcements, slug, TEMPLATES } from './announcements.ts';
import { bibliography, SOURCES } from './record.ts';

const feed = announcements();

// The stream is not empty and not a handful: this is the whole register.
assert.ok(feed.items.length > 40, `only ${feed.items.length} announcements`);

// Every item is addressable, and no two share an address. The RSS guid is this
// anchor, so a collision would make two announcements one item in a reader.
const ids = new Set(feed.items.map((item) => item.id));
assert.equal(ids.size, feed.items.length, 'two announcements share an anchor');
for (const item of feed.items) {
  assert.match(item.id, /^[a-z0-9][a-z0-9-]*$/, `not an HTML id fragment: ${item.id}`);
  // Provenance is generated, never written: every item names the file it came
  // from, and a bibliography or talk item names the entry key inside it.
  assert.ok(item.source.startsWith('content/'), `not a record path: ${item.source}`);
  assert.ok(item.kind.length > 0, `an item with no kind: ${item.text}`);
  assert.ok(item.html.length > 0 && item.text.length > 0);
}

// The kinds are a partition of the items — the filter on `/lately/` shows one
// per chip and "All" is the sum, so a kind missing from this list would be a
// row no filter can reach.
assert.equal(
  feed.kinds.reduce((total, kind) => total + kind.count, 0),
  feed.items.length,
  'the kind counts do not add up to the items',
);
for (const item of feed.items) {
  const kind = feed.kinds.find((candidate) => candidate.name === item.kind);
  assert.ok(kind, `no kind entry for ${item.kind}`);
  // The page writes `data-kind` with `slug(item.kind)` and the generated CSS
  // rule keys on `kind.slug`. They must be the same string.
  assert.equal(slug(item.kind), kind.slug);
}
// Slugs are unique too, or one radio would filter two kinds.
assert.equal(new Set(feed.kinds.map((kind) => kind.slug)).size, feed.kinds.length);

// Newest first, and the year markers on the register follow from that ordering
// alone: a year that appeared twice would print two markers for one year.
const years = feed.items.map((item) => item.stamp.slice(0, 4));
assert.deepEqual(
  [...years].sort((a, b) => b.localeCompare(a)),
  years,
  'the feed is not ordered',
);

// Nothing is announced at a precision its source does not state.
for (const item of feed.items) {
  assert.ok(item.stamp.startsWith(String(item.at.getUTCFullYear())));
  if (item.precision === 'year') assert.match(item.stamp, /^\d{4}$/);
}

// A manuscript under review states the year it is aimed at, not a date anything
// happened on. It is on /publications/ and it is named in `undated` — it is not
// in the stream, and it did not simply vanish.
const underReview = bibliography().entries.filter(
  (entry) => entry.underReview && !entry.fields.announced,
);
assert.ok(underReview.length > 0, 'no manuscript under review to check the rule against');
for (const entry of underReview) {
  assert.ok(
    !feed.items.some((item) => item.text.includes(entry.title)),
    `an unannounced manuscript reached the feed: ${entry.title}`,
  );
  const named = feed.undated.find((fact) => fact.what === entry.title);
  assert.ok(named, `an unannounced manuscript is not named as undated: ${entry.title}`);
  assert.ok(named.why.length > 20, 'an undated fact with no reason is a gap with a label on it');
  assert.ok(named.source.startsWith(SOURCES.bibliography));
}

// The undated block is what the register shows under inspect, so every entry in
// it must be printable: a fact, a reason and a file.
for (const fact of feed.undated) {
  assert.ok(fact.what.length > 0 && fact.why.length > 0);
  assert.ok(fact.source.startsWith('content/'), `not a record path: ${fact.source}`);
}

// The sentence table is still the only place a sentence lives, and it still
// covers what the stream structurally produces.
for (const name of ['Talk', 'Writing', 'Submitted', 'default'])
  assert.equal(typeof TEMPLATES[name], 'function', `no template for ${name}`);

console.log(
  `announcements: ${feed.items.length} items, ${feed.kinds.length} kinds, ${feed.undated.length} undated — ` +
    feed.kinds.map((kind) => `${kind.count} ${kind.name.toLowerCase()}`).join(', '),
);
