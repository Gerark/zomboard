# Repository guidance

## Owner instructions and scope

- Do not change code without the owner's permission. An analysis or documentation request authorizes inspection and the requested documentation, not website fixes or refactoring.
- Act as a Senior/Principal Developer: question error-prone approaches, investigate assumptions, and consider relevant edge cases before proposing changes.
- Separate observed behavior from hypotheses. Explain the impact and evidence for a suspected defect; do not silently repair it during analysis.
- Keep authorized changes focused. Inspect the working tree first and preserve unrelated work. Do not stage, commit, publish, or deploy unless requested.

## Product and architecture

ZomBoard is a public, read-only Project Zomboid mission board themed around the McCoy Logging Co. safehouse near Muldraugh, Knox County. The page opens directly onto the job board below the ZomBoard brand header; there is no hero section or emergency-broadcast strip.

- It is a single-page static website using plain HTML, CSS, and a deferred classic JavaScript script.
- There is no framework, package manifest, build process, backend, database, authentication, game integration, saved mission progress, or browser-storage layer.
- Mission availability is curated in source. Visitors can browse, filter, search, open briefings, and copy links; they cannot claim or complete missions.
- Objective lists are informational numbered lists, not interactive checkboxes. The README's word "checklists" does not imply completion tracking.
- All illustrations are local SVGs. Google Fonts is the only external resource service referenced by the site; CSS supplies fallback fonts.
- Mission content requires JavaScript: the initial HTML contains an empty mission grid and no non-JavaScript mission fallback.

## File responsibilities

| Path | Responsibility |
| --- | --- |
| `index.html` | Page structure, metadata, font loading, brand header, filter controls, search input, mission grid container, footer, and dialog shell. |
| `missions.js` | The `missions` array, HTML escaping, card and briefing templates, filtering, search, modal lifecycle, URL state, and clipboard handling. |
| `styles.css` | Design tokens, component styles, illustration cropping, responsive layouts, focus styling, and reduced-motion overrides. |
| `assets/` | Nine mission illustrations, the social-preview image `hero-mccoy.svg`, and `favicon.svg`. |
| `.nojekyll` | Disables Jekyll processing for direct static publication on GitHub Pages. Keep this file in the publishing root. |
| `README.md` | End-user customization, local preview, GitHub Pages setup, and publishing instructions. |

Keep the site usable as directly served files. Do not introduce modules, a fetch-based data file, dependencies, a router, or a build tool without approval for that architectural change. Such changes must also account for the README's direct-file preview workflow.

## Mission data contract

The `missions` array at the top of `missions.js` is the source of truth for mission content and display order. All fields below are expected; there is no runtime schema validation.

| Field | Expected value and coupling |
| --- | --- |
| `id` | Unique, stable URL identifier. Existing shared links use `?mission=<id>`. Preserve existing IDs unless a link migration is explicitly approved. |
| `number` | Two-digit display string such as `'01'`; independent of the array index and used in cards and briefings. Keep numbering consistent with ordering and narrative references. |
| `title`, `kicker`, `teaser` | Plain text used in cards; title and kicker also appear in briefings. |
| `category` | Exactly `'field'` or `'base'`; controls category filters and card classification. |
| `status` | Exactly `'available'` or `'claimed'`; controls assignment badges and the claimed filter. |
| `risk` | Uppercase `'LOW'`, `'MEDIUM'`, `'HIGH'`, or `'SEVERE'`; lowercased to form CSS classes. |
| `image` | Existing, case-correct local asset path such as `'assets/bunker.svg'`. |
| `location`, `crew` | Plain text shown in briefings; crew also appears on cards. Requirements are descriptive, not enforced. |
| `description`, `note` | Plain-text briefing copy and field notes. |
| `objectives` | Nonempty array of plain-text strings, rendered in order. |

The baseline is nine missions: five field runs, four base jobs, and one claimed mission (`palisade`). Existing IDs, in order, are `bunker`, `groceries`, `palisade`, `coop`, `chickens`, `mechanics`, `police`, `greenes`, and `garden`.

Narrative dependencies are not executable rules. For example, the garden's note refers to supplies from mission 08; changing mission ordering or numbering can invalidate this copy.

### Counts are maintained in multiple places

Adding, removing, or recategorizing missions requires checking all affected representations:

- `index.html`: filter button counts, job-board heading count, initial display count, metadata descriptions, and copy that says "Nine".
- `missions.js`: the briefing's literal `/ 09` denominator. Only the footer count in `render()` derives both its visible count and total from the array.
- `README.md`: mission totals, customization instructions, and claimed-mission description.

Filter button counts represent the complete dataset, not the current search results. Do not change this meaning unintentionally.

## Runtime behavior and DOM contracts

- The script is loaded with `defer`. It assumes the required HTML elements exist when it runs: `mission-grid`, `filters`, `search`, `mission-dialog`, `dialog-content`, `dialog-close`, `no-results`, and `display-count`.
- Briefing markup supplies `dialog-title`, matching the dialog's `aria-labelledby`, and `copy-mission`, whose listener is attached after each briefing render.
- `render()` replaces the grid's entire `innerHTML`. Card clicks use delegation through `data-open`; filter clicks use `data-filter`. Avoid per-card listeners that would disappear on re-render.
- Search and the selected filter are combined. Search trims input and performs a case-insensitive substring match across title, kicker, location, teaser, crew, and risk. It does not search description, objectives, note, status, ID, or number.
- Search and filter state live only in memory and are not encoded in links or persisted across reloads.
- `showMission()` looks up an exact ID, renders a briefing, opens the native `<dialog>` if necessary, and normally sets the `mission` query parameter.
- Opening and closing a briefing use `history.replaceState`, not `pushState`. Opening a card does not create a new Back-button history entry. Other query parameters and the hash are preserved.
- A valid `?mission=bunker`-style URL opens a briefing on initial load. Unknown IDs are ignored; the invalid parameter remains in the URL.
- The close button, Escape cancellation, and backdrop clicks call `closeMission()`, which removes the query parameter and restores the prior focus if that element is still connected.
- A `popstate` listener also opens or closes the dialog. Its close branch calls `dialog.close()` directly, bypassing the explicit focus-restoration helper. If an unknown ID arrives while a dialog is already open, the current briefing is left open. Reassess these paths if navigation behavior is changed.
- Copying a mission link uses `navigator.clipboard.writeText`; failure or an unavailable clipboard falls back to a prompt containing the link. Test both paths when changing this feature.

## Rendering and content safety

- Rendering uses template strings and `innerHTML`. Preserve `escapeHtml()` for text and quoted attribute values already passed through it; do not treat mission copy as HTML.
- `number` and the class interpolation derived from `risk` are currently inserted without HTML escaping. Their safety depends on the controlled data contract above. Treat future external or visitor-supplied data as a separate design change requiring validation and a rendering review.
- Escaping an image path does not validate its URL or make it a local asset. Keep paths within the intended public assets unless remote resources are explicitly approved.
- Duplicate IDs select the first matching mission; missing or mistyped fields can break rendering. Validate data consistency when editing mission content.
- Keep paths relative and match filename casing. A path that works on Windows can fail on a case-sensitive host.
- All deployed content is public. Keep credentials, private information, and internal-only files out of the published directory.

## Visual and accessibility conventions

- Preserve the established survivor-bulletin style: dark green surfaces, cream text, orange accents, condensed display headings, monospaced labels, grain, stamps, and illustrated cards. Use the existing `:root` tokens before adding competing values.
- Typography uses Barlow Condensed for display text, IBM Plex Mono for labels, and DM Sans for body copy. Verify fallback-font layout if fonts are unavailable.
- Default mission layout is three columns; at widths up to 820px it becomes two, and at widths up to 550px it becomes one. The 1100px breakpoint adjusts spacing and typography.
- Artwork is cropped with `object-fit: cover`; the supplied non-favicon SVGs have a `1000 650` viewBox. Keep important content away from crop edges when replacing images.
- Preserve real buttons, the search label, filter `aria-pressed` state, `aria-live` on the grid, dialog labeling, keyboard access, visible focus, and reduced-motion overrides.
- Card and briefing images currently use empty alternative text. Reconsider alternatives if replacement artwork conveys information absent from the accompanying copy. The job-board title is the page's main `h1`.
- Use the existing English setting and darkly humorous game-fiction voice. Keep functional controls clear.

## Local workflow and verification

Run commands from the repository root. There is no configured install, build, lint, automated-test, or CI workflow; do not invent `npm` commands or add tooling solely for a routine edit.

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/`. The README also supports opening `index.html` directly; check that workflow when changing URL handling, resource loading, or the clipboard fallback. Do not assume file URLs behave identically to HTTP. Stop a temporary server when it is no longer needed.

If Node.js is available, `node --check missions.js` checks syntax without installing anything. It does not validate DOM behavior or mission data.

For approved behavior, content, or styling changes, select the relevant checks below and report what was actually verified:

1. Confirm expected mission totals, unique IDs, valid field values, matching HTML counters, existing image paths, and successful asset loading. Check the browser console for errors.
2. Exercise all four filters, search alone and with a filter, whitespace-only input, no results, and clearing the search. Check that the empty message, footer count, and filter pressed states agree.
3. Open available and claimed briefings. Verify their copy, objectives, badges, and images; close using the button, Escape, and the backdrop, including keyboard focus return.
4. Load and reload a valid deep link, try an unknown ID, copy a link successfully and through the fallback, and check Back/Forward behavior. Include unrelated query parameters and a hash when URL logic changes.
5. Inspect desktop, tablet, and narrow mobile widths, including breakpoint boundaries. Check long titles and crew labels, search/filter wrapping, image cropping, dialog scrolling, zoom, and horizontal overflow.
6. Check keyboard navigation, focus visibility, reduced motion, and fallback-font rendering when the affected change warrants it. Static source inspection alone does not establish browser or accessibility compatibility.

For documentation-only changes, verify the described contracts against source and confirm the site files remain unchanged; a browser smoke test is not required. Avoid adding a test framework without a demonstrated need and approval.

## Publishing and handoff

The hosting target is GitHub Pages for `Gerark/zomboard`, at `https://gerark.github.io/zomboard/`. The publishing source is the `main` branch, `/ (root)`, using **Deploy from a branch** in repository Settings > Pages. GitHub manages the Pages build/deployment workflow; no custom workflow or application build is required.

The site requires `index.html`, `styles.css`, `missions.js`, and `assets/`, with `.nojekyll` and `index.html` at the deployment root. Preserve relative URLs so assets and query-string mission links work under `/zomboard/`. Publishing from the root also makes documentation files publicly reachable; do not commit private material to this public repository.

Pushes to `main` publish automatically after Pages is enabled. Before an authorized push, review the intended files and check the managed **pages build and deployment** run afterward. A deployment can be inspected in the repository's Actions tab. Feature branches do not publish to the live site.

Publishing requires the owner's instruction; do not infer permission to publish from an analysis-only request. Verify current hosting requirements if publishing is requested; do not assume the README's external service instructions are permanently current. Report the concrete change, verification performed, and unresolved issues. Keep this guide and the README aligned with any approved architectural or behavior changes.
