# ZomBoard feed v2

The website build generates `api/v2/missions.json` from `missions-data.js`.
The browser continues to use its classic scripts and source data directly; the
feed is not a browser runtime dependency. All published data is public HTTPS
JSON and PNG. Never evaluate downloaded JavaScript, Lua, HTML or JARs.

## Version and migration

V2 replaces string objectives with objects and supports optional map targets on
quests and individual objectives. The envelope uses integer `schemaVersion: 2`.
Production v1 output is no longer generated; rebuilding the owned `_site/`
directory removes stale `api/v1/` files. There is no compatibility endpoint.
The separate synthetic `mod-proof/` fixtures retain their v1 format.

The current v1-only mod cannot consume this feed. Its parser, bridge/UI support
and configured feed URL require a separate follow-up. Local build/test results
do not establish in-game v2 compatibility or deployment. See the
[historical v1 contract](mod-feed-v1.md) for the superseded format.

## Envelope and mission data

The envelope has `schemaVersion`, a lowercase 64-hex `revision`, and an ordered
`missions` array. An empty array is valid. The producer hashes compact canonical
JSON with recursively sorted object keys, excluding `revision` itself. All
exported fields, objective/image/mission ordering, supplied map values and asset
identities participate. No timestamp is included. Object key order does not
affect the revision.

Each mission carries `id`, `number`, `title`, `kicker`, `teaser`, `category`,
`completed`, `risk`, `location`, `crew`, `description`, `note`, `objectives` and
`images`. Optional fields are `outdatedLead`, `relatedMission` and `mapTarget`.
IDs are unique lowercase slugs; display numbers are strings, not array indices.
Category is `field` or `base`; risk is `LOW`, `MEDIUM`, `HIGH` or `SEVERE`;
completion is an owner-curated boolean, not visitor progress.

Objectives are a nonempty ordered array of objects with required plain-text
`text` and optional `mapTarget`. Source and export both require objects; legacy
strings are rejected. Strings remain data, including literal markup characters.
The website escapes and renders only objective text and numbering. Related
mission links are informational, not progress rules.

### Optional map targets

This fragment illustrates the format; these are not confirmed quest locations:

```json
{
  "mapTarget": { "x": 10620, "y": 9750, "zoom": 18 },
  "objectives": [
    {
      "text": "Reach the search area",
      "mapTarget": { "x": 10620, "y": 9750 }
    },
    { "text": "Return to the safehouse" }
  ]
}
```

- Omit `mapTarget` when unspecified. If present it must be an object, not null or
  an array, with both `x` and `y` as safe integers in the inclusive range
  -9,007,199,254,740,991 through 9,007,199,254,740,991. Zero and negative values
  are valid. There are no imposed vanilla-map boundaries.
- Optional `zoom` must be a finite positive number; fractions are allowed. Omit
  it to leave zoom unspecified. No default value is inserted.
- Missing coordinates, quoted numbers, booleans, nulls, non-finite values and
  fractional coordinates are rejected. Explicit undefined optional values in
  source are invalid; omit the property instead.
- Quest and objective targets are independent. A missing objective target stays
  absent even if the quest has one. No target/zoom inheritance or in-game map
  action is defined by this producer.
- The exporter writes only `x`, `y` and supplied `zoom` from targets. Map values
  are public in source and JSON but absent from rendered website markup.

## Images and limits

Source order is preserved. A nonempty source `images` array takes precedence
over legacy `image`/`imageAlt`. Every briefing image is exported.

Each image has `url`, `alt`, `sha256`, `bytes`, `width`, `height`, and optional
`thumbnail` metadata with the same fields except `alt`. URLs are absolute,
same-origin PNG URLs under `api/v2/assets/<full-sha256>.png`, resolved against
the configured Pages base (including its subpath or custom domain). Hashes
identify exact served bytes. Existing PNGs retain their bytes; SVGs become PNGs.
Generated thumbnails fit within 512×320 without cropping or enlargement.

| Item | Producer limit |
| --- | --- |
| Feed | 1 MiB, UTF-8 |
| Missions | 128 |
| Mission ID | 80 characters, lowercase slug |
| Images per mission | 8 |
| Objectives per mission | 1–16 objects; 512 characters per text |
| Title/kicker/facts/display number | 256 characters |
| Teaser / alt | 512 characters |
| Absolute asset URL | 2,048 characters, same origin as the feed |
| Description/note/optional narrative fields | 8,192 characters |
| PNG/source image | 8 MiB; 4096 per dimension; 8,000,000 decoded pixels |
| Aggregate prepared image buffers | 256 MiB |

Text limits use UTF-16 code units. The producer rejects unpaired surrogates and
ISO control characters (U+0000–U+001F and U+007F–U+009F) except tab and line feed.
Existing consumer cache/texture/request limits are documented in the historical
v1 contract; this producer change does not implement a v2 consumer.

## Build and publication

The normal Pages build reads source once, validates/prepares the feed and images
before replacing output, and writes `_site/api/v2/missions.json` and its assets.
Invalid data retains previous build output. An empty source array produces an
empty feed and no mission share pages. There is no separate JSON content list.

Use `npm run build -- --base-url https://gerark.github.io/zomboard/` for production
URLs. The exporter also permits loopback HTTP for local previews. The existing
Pages workflow uploads the whole generated `_site/`; after an authorized
deployment, the expected feed URL is
`https://gerark.github.io/zomboard/api/v2/missions.json`. Generation alone does
not publish that endpoint. Do not edit or commit generated output.
