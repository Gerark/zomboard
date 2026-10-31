# ZomBoard feed v1

**Historical, superseded by [feed v2](mod-feed-v2.md).** This document describes
the former production format and the current v1-only mod. The website build now
generates only `api/v2/`; it no longer generates `api/v1/`. The separate synthetic
`mod-proof/` fixtures retain their existing v1 format. Mod v2 support and its feed
URL migration are a separate follow-up; this document does not establish either.

The full 0.2 consumer accepts public HTTPS JSON and PNG data only. An ordinary
HTML website URL is not a feed. Never evaluate downloaded JavaScript, Lua, HTML
or JARs. The website adds this feed at `api/v1/missions.json` during its build;
its existing browser runtime continues to read `missions-data.js` directly.

## Envelope and mission data

The envelope has integer `schemaVersion: 1`, a lowercase 64-hex `revision`, and
an ordered `missions` array. An empty array is valid. The producer hashes compact
canonical JSON with recursively sorted object keys, excluding `revision` itself.
All fields, mission/image ordering and asset identities participate. No timestamp
is included. The consumer validates revision syntax and separately fingerprints
actual JSON bytes for UI invalidation, so an incorrectly reused producer revision
does not freeze displayed text.

Each mission carries `id`, `number`, `title`, `kicker`, `teaser`, `category`,
`completed`, `risk`, `location`, `crew`, `description`, `note`, `objectives` and
`images`. Preserve optional `outdatedLead` and `relatedMission`. IDs are unique
lowercase slug strings; display numbers are strings, not array indices.
Category is `field` or `base`; risk is `LOW`, `MEDIUM`, `HIGH` or `SEVERE`;
completion is a boolean maintained by the board owner. Objectives are a nonempty
ordered string array. Related links are informational; absent targets are ignored
by navigation. All remote strings remain plain text in the native UI.

The exporter preserves source ordering. A nonempty source `images` array takes
precedence over legacy `image`/`imageAlt`. The native UI groups active/completed
quests without changing order within either group.

## Images

Each image has `url`, `alt`, `sha256`, `bytes`, `width`, `height`, and an optional
`thumbnail` object with the same metadata except `alt`. URLs are absolute, share
the feed's HTTPS origin, and point to PNG bytes. Hashes are full SHA-256 digests
of those exact bytes. File size and dimensions must match the served file.

The website prepares immutable `api/v1/assets/<sha256>.png` paths, resolving
against the configured Pages base, including its hosting subpath/custom domain.
Existing PNGs retain their full bytes; SVG illustrations become PNGs. Thumbnails
fit within 512×320 without enlargement or cropping. Every briefing image is
exported. Without thumbnail metadata, the consumer uses the original image.

The client requests visible thumbnails/briefing images lazily, with at most two
simultaneous image downloads. Only completed, hash/CRC/dimension/decode-checked
files become available for textures. Redirect origins are checked, certificate
validation stays enabled, and requests have bounded deadlines. A numeric-loopback
HTTP exception exists only in standalone development tests, not production settings.

## Limits and failure behavior

| Item | Limit |
| --- | --- |
| Feed | 1 MiB, UTF-8 |
| Missions | 128 |
| Mission ID | 80 characters, lowercase slug |
| Images per mission | 8 |
| Objectives per mission | 1–16, 512 characters each |
| Title/kicker/facts/display number | 256 characters |
| Teaser / alt | 512 characters |
| Absolute asset URL | 2,048 characters, same origin as the feed |
| Description/note/optional narrative fields | 8,192 characters |
| Asset | 8 MiB; 4096 per dimension; 8,000,000 decoded pixels |
| Cache | 256 MiB; 16 feed namespaces; 8192 filesystem entries |
| Native texture pool | 128 MiB of padded RGBA allocation; at most 256 entries |
| Asset request set / queued transfers | 64 / 64, with two active image transfers |

Text limits use UTF-16 code units, matching Java string lengths. The producer
rejects unpaired surrogates and ISO control characters (U+0000–U+001F and
U+007F–U+009F), except tab and line feed, so exported text is accepted by the
consumer. Strings are preserved as data, including any literal markup characters;
they must never be evaluated or interpreted as UI markup.

The exporter additionally caps its aggregate prepared image buffers at 256 MiB,
failing before output replacement rather than exhausting build memory. Invalid
manifests retain the prior valid snapshot. A missing image does not discard quest
text. Cached data is labeled stale/offline when refresh fails. Never-cached feeds
show a no-data state. Blank configuration is a separate no-request state.

Cache roots derive from the game's runtime directory under `ZomBoard/v1/`, with
one digest namespace per feed and hash-only image filenames. Writes finalize
atomically. Cleanup is limited to owned superseded images that are not held by a
native texture, plus old UUID temporary files. A full/unwritable cache is reported;
it does not justify deleting the last valid manifest or in-use resources.

The bridge exposes generation/versioned snapshots, complete mission arrays and
individual image readiness; UI polling does no network or disk work. Texture
decoding runs off-thread, and private texture upload/destruction runs on the game
render context. No global NeatUI or shared-texture cache patches are installed.

## Website generation and deployment

`scripts/build-pages.mjs` reads the curated `missions-data.js` once and passes
that array to `scripts/build-mod-feed.mjs`. The exporter prepares and validates
the manifest, original images and thumbnails before the main build replaces
its generated `_site/` output. There is no separately maintained JSON mission
list. An empty source array generates a valid empty feed and no mission share
pages.

Every normal website build includes `_site/api/v1/missions.json` and all referenced
`_site/api/v1/assets/<full-sha256>.png` files. The existing Pages workflow runs
that build and uploads `_site/` in full, so no separate API publication step is
needed. Once an authorized deployment occurs, the expected feed URL is
`https://gerark.github.io/zomboard/api/v1/missions.json`. Local generation does not
publish that endpoint.

Edit the curated mission data or source images, build and deploy normally, then
use the mod's Refresh to request the new manifest. Exported content and image
changes update the revision and asset identities without rebuilding the mod.
The browser board keeps using the unchanged classic scripts and supports its
existing source-file preview.
