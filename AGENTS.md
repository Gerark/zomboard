# Repository guidance

## Owner instructions and scope

- Do not change code without the owner's permission. An analysis or documentation request authorizes inspection and the requested documentation, not website fixes or refactoring.
- Act as a Senior/Principal Developer: question error-prone approaches, investigate assumptions, and consider relevant edge cases before proposing changes.
- Separate observed behavior from hypotheses. Explain the impact and evidence for a suspected defect; do not silently repair it during analysis.
- Keep authorized changes focused. Inspect the working tree first and preserve unrelated work. Do not stage, commit, publish, or deploy unless requested.

## Product and architecture

ZomBoard is a public, read-only Project Zomboid mission board themed around the McCoy Logging Co. safehouse near Muldraugh, Knox County. The page opens directly onto compact mission cards below the ZomBoard brand header. There is no visible board heading, tagline, location/signal block, search, filtering, hero section, or emergency-broadcast strip.

- It is a single-page static website using plain HTML, CSS, and two deferred classic JavaScript scripts: mission data first, then rendering and interactions.
- There is no framework, package manifest, build process, backend, database, authentication, game integration, saved mission progress, or browser-storage layer.
- Mission content is curated in source. Visitors can browse all missions, open briefings, and copy links; they cannot claim or complete missions.
- Objective lists are informational numbered lists, not interactive checkboxes or completion tracking.
- All mission images are local files: fourteen PNG screenshots, a PNG bunker tour flyer, and two SVG illustrations. Google Fonts is the only external resource service referenced by the site; CSS supplies fallback fonts.
- Mission content requires JavaScript: the initial HTML contains an empty mission grid and no non-JavaScript mission fallback.

## File responsibilities

| Path | Responsibility |
| --- | --- |
| `index.html` | Page structure, metadata, font loading, brand header, accessible mission-section heading, quest sidebar, mission grid container, and dialog shell. |
| `missions-data.js` | The `missions` array: mission content and display order. Loaded before `missions.js`. |
| `missions.js` | HTML escaping, card/list/briefing templates, sidebar highlighting and scrolling, modal lifecycle, URL state, and clipboard handling. |
| `styles.css` | Design tokens, component styles, image cropping, responsive layouts, focus styling, and reduced-motion overrides. |
| `assets/` | Fifteen PNG mission images, two SVG mission illustrations, the social-preview image `hero-mccoy.svg`, and `favicon.svg`. |
| `.nojekyll` | Disables Jekyll processing for direct static publication on GitHub Pages. Keep this file in the publishing root. |
| `README.md` | End-user customization, local preview, GitHub Pages setup, and publishing instructions. |

Keep the site usable as directly served files. Do not introduce modules, a fetch-based data file, dependencies, a router, or a build tool without approval for that architectural change. Such changes must also account for the README's direct-file preview workflow.

## Mission data contract

The `missions` array in `missions-data.js` is the source of truth for mission content and display order. All fields below are expected except optional `images`, `imageAlt`, `outdatedLead`, and `relatedMission`. Supply either a nonempty `images` array or the single-image `image` field; there is no runtime schema validation.

| Field | Expected value and coupling |
| --- | --- |
| `id` | Unique, stable URL identifier. Existing shared links use `?mission=<id>`. Preserve existing IDs unless a link migration is explicitly approved. |
| `number` | Two-digit display string such as `'01'`; independent of the array index and used in cards and briefings. Keep numbering consistent with ordering and narrative references. |
| `title`, `kicker`, `teaser` | Plain text used in cards; title and kicker also appear in briefings. |
| `category` | Exactly `'field'` or `'base'`; controls card classification. |
| `risk` | Uppercase `'LOW'`, `'MEDIUM'`, `'HIGH'`, or `'SEVERE'`; lowercased to form CSS classes. |
| `images` | Optional ordered array of `{ src, alt }` objects. Each `src` is an existing, case-correct local asset path; `alt` is optional plain text, required by convention for informative images. The first image is the card thumbnail; all images appear in the briefing in order. A nonempty array takes precedence over `image` and `imageAlt`. |
| `image` | Single-image asset path such as `'assets/bunker.png'`, used when `images` is absent or empty. Must exist and match filename casing. |
| `imageAlt` | Optional plain-text description for the single-image briefing. Provide it for informative screenshots and maps; decorative placeholders may omit it. Card thumbnails remain decorative. |
| `location`, `crew` | Plain text shown in briefings; crew also appears on cards. Requirements are descriptive, not enforced. |
| `description`, `note` | Plain-text briefing copy and field notes. |
| `outdatedLead` | Optional plain text shown with a RULED-OUT LEAD label and semantic strikethrough in the briefing. Records an incorrect lead, not objective or mission completion. |
| `relatedMission` | Optional exact ID of a different mission. Its current number and title label a button that opens that briefing. Keep references valid; an unknown ID produces no button. Narrative connection only, without progress tracking or mission locking. |
| `objectives` | Nonempty array of plain-text strings, rendered in order. |

The baseline is fourteen missions: nine field runs and five base jobs. Existing IDs, in order, are `bunker`, `groceries`, `palisade`, `coop`, `chickens`, `mechanics`, `police`, `greenes`, `garden`, `vhs`, `dumbbell`, `drag-race`, `seb`, and `winter`. The VHS quest collects tapes from the movie store in Muldraugh and uses `assets/vhs.png`. Operation Dumbbell recovers gym equipment and snacks before setting up a safehouse workout area, and uses `assets/dumbbell.png`. The drag-race quest recovers one more fast car to race against the car already brought home, then prepares both cars and scouts a highway stretch; it uses `assets/drag-race.png`. Its NOS reference is narrative banter, not a confirmed game mechanic or required item.

Mission 08 keeps its Greene’s ID and screenshot, but rules out the store as a gardening source and prioritizes finding sacks elsewhere for the rooftop garden. Its old lead uses `outdatedLead`. Seb knew a farm he wanted to show the group, but died tragically before he could; its location and supplies remain unconfirmed. Missions 08 and 13 use reciprocal `relatedMission` references to connect the farm lead with his recovery and burial. Mission 09 explicitly depends on those sacks and farming supplies. Mission 13, `seb`, searches for Seb’s fallen survivor, puts him down if reanimated, and prepares a safehouse cemetery for burial. Mission 14, `winter`, retrieves a wood stove, partitions smaller enclosed rooms, stocks fuel, and tests the heating setup. Their images, `assets/cemetery.svg` and `assets/winter-stove.svg`, are editable SVG illustrations in the original mission-art style; their alternative text identifies them as illustrations rather than gameplay screenshots or confirmed locations.

Narrative dependencies are not executable rules. For example, the garden's note refers to supplies from mission 08; changing mission ordering or numbering can invalidate this copy.

The bunker uses an ordered `images` list: `assets/bunker-flyer.png` first and the retained annotated map `assets/bunker.png` second. The groceries quest likewise uses `assets/grocery-store.png` first and its retained annotated map `assets/grocery.png` second. The police raid uses `assets/police-station.png` first and its retained annotated map `assets/police.png` second. Other missions retain their single-image fields.

### Mission counts

Keep both metadata descriptions in `index.html` generic, without a mission count. The briefing denominator in `missions.js` derives the total from the array. When adding, removing, or recategorizing missions, update the documented baseline above.

## Runtime behavior and DOM contracts

- Both scripts are loaded with `defer`, with `missions-data.js` before `missions.js`. Keep them as classic scripts in this order so the shared `missions` binding and direct-file preview work. The runtime assumes the required HTML elements exist when it runs: `mission-grid`, `mission-list`, `mission-dialog`, `dialog-content`, and `dialog-close`.
- Briefing markup supplies `dialog-title`, matching the dialog's `aria-labelledby`, and `copy-mission`, whose listener is attached after each briefing render.
- `render()` displays the complete mission array in source order. There is no footer, assignment counter, search, filter state, or no-results UI.
- `render()` replaces the grid and quest list contents from the same mission array and refreshes their ID maps. Both sets of buttons use delegated `data-open` clicks; cards expose `data-mission-id` for sidebar highlighting. Avoid per-card or per-entry listeners that would disappear on re-render.
- Desktop quest-list hover and keyboard focus highlight the matching card and entry. After 150ms, an offscreen card scrolls into view with 24px clearance where possible; oversized cards align at the top. Reduced motion uses instant scrolling. Hover/focus do not change the URL or move focus to the card.
- Only actual pointer movement selects a hovered entry, preventing scrolling from repeatedly selecting rows under a stationary pointer. Pending scrolling and highlights clear when the dialog opens or the sidebar breakpoint changes; leaving an entry cancels its pending scroll.
- `showMission()` looks up an exact ID, renders a briefing, opens the native `<dialog>` if necessary, and normally sets the `mission` query parameter.
- Related-mission buttons use a delegated `dialog-content` click handler and `showMission()`, preserving the original opener for focus return. Switching briefings scrolls to the top and focuses the persistent close button. It uses the same URL replacement behavior as opening a card, preserving other parameters and the hash.
- Briefings start with the title and one wrapping row of category, risk, location, and crew facts. Labels and values sit inline without outlined badges or separate label/value blocks. Keep long values readable without truncation.
- Omit company branding from briefing chrome and administrative locations. Use `Safehouse`, `Safehouse vehicle yard`, `Safehouse rooftop`, and `Muldraugh Police Station / Safehouse` where applicable. Preserve McCoy references in narrative titles, descriptions, objectives, and accurate image descriptions.
- The palisade note reads: "Our contractor has taken this job. Respect the craftsmanship." No other assignment indicator is displayed, including on its grid card.
- Opening and closing a briefing use `history.replaceState`, not `pushState`. Opening a card does not create a new Back-button history entry. Other query parameters and the hash are preserved.
- A valid `?mission=bunker`-style URL opens a briefing on initial load. Unknown IDs are ignored; the invalid parameter remains in the URL.
- The close button, Escape cancellation, and backdrop clicks call `closeMission()`, which removes the query parameter and restores the prior focus if that element is still connected. If a list button opened the briefing and resizing has hidden the sidebar, focus returns to the matching card instead.
- A `popstate` listener also opens or closes the dialog without rewriting the navigated URL. Its close branch uses the same focus-restoration helper, including the hidden-sidebar fallback. If an unknown ID arrives while a dialog is already open, the current briefing is left open. Reassess these paths if navigation behavior is changed.
- Copying a mission link uses `navigator.clipboard.writeText`; failure or an unavailable clipboard falls back to a prompt containing the link. Test both paths when changing this feature.

## Rendering and content safety

- Rendering uses template strings and `innerHTML`. Preserve `escapeHtml()` for text and quoted attribute values already passed through it; do not treat mission copy as HTML.
- The class interpolation derived from `risk` is inserted without HTML escaping. Its safety depends on the controlled data contract above. Treat future external or visitor-supplied data as a separate design change requiring validation and a rendering review.
- Escaping an image path does not validate its URL or make it a local asset. Keep paths within the intended public assets unless remote resources are explicitly approved.
- Duplicate IDs select the first matching mission; missing or mistyped fields can break rendering. Validate data consistency when editing mission content.
- Keep paths relative and match filename casing. A path that works on Windows can fail on a case-sensitive host.
- All deployed content is public. Keep credentials, private information, and internal-only files out of the published directory.

## Visual and accessibility conventions

- Preserve the established survivor-bulletin style: dark green surfaces, cream text, orange accents, condensed display headings, monospaced labels, grain, and illustrated cards. Use the existing `:root` tokens before adding competing values.
- Use editable SVG for new illustrative mission art, matching the original geometric shapes, heavy outlines, muted palette, grain and corner marks. The owner prefers this style over raster image-generation artwork. Keep actual gameplay screenshots as screenshots.
- Typography uses Barlow Condensed for display text, IBM Plex Mono for labels, and DM Sans for body copy. Verify fallback-font layout if fonts are unavailable.
- Default mission layout is a 232px quest sidebar, a 24px gap, and three card columns within the existing 1220px wrapper. The sidebar sticks 24px from the viewport top, uses at most `100dvh - 48px` in height, and scrolls internally when needed. At widths up to 1100px it is hidden (including keyboard access); the grid keeps three columns, then two up to 820px, and one up to 550px. Cards use compact padding and typography, with shorter images on mobile.
- Briefing titles use `clamp(30px, 4.5vw, 46px)`, facts use 13px type, text sections use 16px spacing, and objective rows use 8px vertical padding. Preserve the top clearance for the sticky close button on desktop and mobile.
- Card thumbnails use the first image and are cropped with `object-fit: cover`. Briefing images appear in source order directly after field notes and before the action controls, using their natural aspect ratio without cropping. Each has a **View full image** link that opens the original asset in a new tab; multiple images and their links have matching image numbers. Preserve full map annotations in briefings; do not reintroduce a fixed image height there. The social-preview SVG has a `1000 650` viewBox.
- Preserve real buttons, `aria-live` on the grid, dialog labeling, keyboard access, visible focus, and reduced-motion overrides.
- Card thumbnails use empty alternative text; briefing images use each image's `alt`, or the legacy `imageAlt` for single-image fields. Keep informative screenshot descriptions accurate and preserve uncertainty in annotated possible locations. A visually hidden `h1` labels the mission section without adding a visible board heading; card titles are `h2` elements.
- Use the existing English setting and darkly humorous game-fiction voice. Keep functional controls clear.

## Local workflow and verification

Run commands from the repository root. There is no configured install, build, lint, automated-test, or CI workflow; do not invent `npm` commands or add tooling solely for a routine edit.

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/`. The README also supports opening `index.html` directly; check that workflow when changing URL handling, resource loading, or the clipboard fallback. Do not assume file URLs behave identically to HTTP. Stop a temporary server when it is no longer needed.

If Node.js is available, run `node --check missions-data.js` and `node --check missions.js` to check syntax without installing anything. These checks do not validate DOM behavior or mission data consistency.

For approved behavior, content, or styling changes, select the relevant checks below and report what was actually verified:

1. Confirm expected mission totals, unique IDs, valid field values, correct briefing totals, generic metadata descriptions, existing image paths, and successful asset loading. Check the browser console for errors.
2. Confirm all missions render in source order and the page initializes without references to removed footer/search/filter elements.
3. Open each briefing. Verify the inline facts, copy, objectives, and images, with no visible availability/assignment badges or company overline. Only the palisade has its contractor note. Close using the button, Escape, and the backdrop, including keyboard focus return.
4. Load and reload a valid deep link, try an unknown ID, copy a link successfully and through the fallback, and check Back/Forward behavior. Include unrelated query parameters and a hash when URL logic changes.
5. Inspect desktop, tablet, and narrow mobile widths, including breakpoint boundaries. Check long titles, wrapping facts (especially bunker crew and Operation Dumbbell location/crew), image cropping, dialog scrolling, close-button clearance, zoom, and horizontal overflow.
6. Check keyboard navigation, focus visibility, reduced motion, and fallback-font rendering when the affected change warrants it. Static source inspection alone does not establish browser or accessibility compatibility.

For documentation-only changes, verify the described contracts against source and confirm the site files remain unchanged; a browser smoke test is not required. Avoid adding a test framework without a demonstrated need and approval.

## Publishing and handoff

The hosting target is GitHub Pages for `Gerark/zomboard`, at `https://gerark.github.io/zomboard/`. The publishing source is the `main` branch, `/ (root)`, using **Deploy from a branch** in repository Settings > Pages. GitHub manages the Pages build/deployment workflow; no custom workflow or application build is required.

The site requires `index.html`, `styles.css`, `missions-data.js`, `missions.js`, and `assets/`, with `.nojekyll` and `index.html` at the deployment root. Preserve relative URLs so assets and query-string mission links work under `/zomboard/`. Publishing from the root also makes documentation files publicly reachable; do not commit private material to this public repository.

Pushes to `main` publish automatically after Pages is enabled. Before an authorized push, review the intended files and check the managed **pages build and deployment** run afterward. A deployment can be inspected in the repository's Actions tab. Feature branches do not publish to the live site.

Publishing requires the owner's instruction; do not infer permission to publish from an analysis-only request. Verify current hosting requirements if publishing is requested; do not assume the README's external service instructions are permanently current. Report the concrete change, verification performed, and unresolved issues. Keep this guide and the README aligned with any approved architectural or behavior changes.
