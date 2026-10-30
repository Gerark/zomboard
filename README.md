# Add a mission 

1. Add the mission images to `assets/`.
2. Open `missions-data.js` and duplicate a complete object inside the `missions` array, before the closing `];`. Separate objects with commas.
3. Set a unique `id`, the next two-digit `number`, and replace the mission text and objectives.
4. Set `category` to `'field'` or `'base'` and `risk` to `'LOW'`, `'MEDIUM'`, `'HIGH'`, or `'SEVERE'`.
5. Set `completed` to `false` for a new active quest, or `true` for a completed quest. Use a boolean, without quotes.
6. For one image, set `image` to the asset path, such as `'assets/medical-run.png'`, matching filename casing. Local PNG screenshots and SVG illustrations are supported. Match the original SVG style for new illustrated art, as in `assets/cemetery.svg` and `assets/winter-stove.svg`. Add descriptive `imageAlt` text. For multiple images, use the ordered `images` list below.
7. Open `index.html` in a browser and check the new mission's card, briefing, objectives, images, and full-image links.

## Completed quests

Every mission in `missions-data.js` has a required `completed` boolean. Set it to `true` when the group finishes a quest. Completed quests appear under **COMPLETED QUESTS** in the sidebar and in a separate card grid below the active quests. Their card images display a large **COMPLETED** overlay, and the cards remain clickable to open their briefings. Both groups preserve source order, original mission numbers, links and access to full briefings. The completed sections are hidden when there are no completed quests.

The VHS retrieval quest, `vhs` (mission 10), is the first completed quest. All other quests currently use `completed: false`. Completion is curated in source for everyone viewing the board; visitors cannot change it, and the site does not store personal progress.

## Multiple images

Replace a mission's `image` and `imageAlt` fields with an `images` array:

```js
images: [
  { src: 'assets/bunker-flyer.png', alt: 'Bunker tour flyer with directions and a labeled floor plan.' },
  { src: 'assets/bunker.png', alt: 'Annotated map marking a possible bunker location.' }
],
```

The first image is the card thumbnail. The briefing shows every image in order, without cropping, with a full-image link for each. Supply descriptive `alt` text for informative images.

A list with one image uses that image in both places. A nonempty `images` list takes precedence over `image` and `imageAlt`; existing quests using those single-image fields continue to work. If `images` is absent or empty, the single-image fields are used.

## Updating a ruled-out lead

Keep the existing mission `id` and `number` so shared links and narrative references remain valid. Update its description, location, teaser and objectives to reflect the current plan. If an old lead should remain visible, add an optional plain-text `outdatedLead` field:

```js
outdatedLead: 'Search Greene’s for gardening supplies, tools and seeds.',
```

The briefing labels this text **RULED-OUT LEAD** and crosses it out. This records an incorrect lead; it does not mark objectives or the mission complete. Keep mission copy as plain text, without HTML tags.

## Linking related missions

Add an optional `relatedMission` field containing another mission's exact `id`, for example `relatedMission: 'seb'`. The briefing displays a button with that mission's current number and title. It opens the related briefing and updates its shareable URL. Add the reverse reference to the other mission when both briefings should link to each other. These links express narrative connections; they do not lock missions or track progress.

## Discord mission previews

The GitHub Pages build generates `share/<mission-id>.html` for every mission. Each page contains the mission's title, teaser and first image in static Open Graph and Twitter Card metadata. It uses the existing mission image directly; no card screenshots or new artwork are generated. SVG images are exported to PNG for preview compatibility, while the board retains its original SVG files. The general board preview also gets a PNG export of `hero-mccoy.svg`.

Use **Copy Mission Link** on the deployed board to get the mission's share URL. Visitors opening it continue to `index.html?mission=<id>` and the existing briefing. Without JavaScript, the share page shows the title, teaser, image and an **Open mission briefing** link. Existing `?mission=<id>` URLs still work, but their metadata remains the generic board preview.

Share links include a content version derived from the title, teaser and first image. Changes to those fields produce a new copied URL and image content version, helping avoid stale cached previews. Existing Discord messages can retain old previews; test a newly copied link after deployment. Discord controls the embed's layout and whether a preview is displayed.

`missions-data.js` remains the only source of mission content. Generated share pages, PNG exports and the deployed copy-link configuration exist only in `_site/`, which is ignored by Git. Do not maintain or commit those generated files.

## One-time GitHub Pages setup

1. Open [Gerark/zomboard → Settings → Pages](https://github.com/Gerark/zomboard/settings/pages).
2. Under **Build and deployment**, change **Source** from **Deploy from a branch** to **GitHub Actions**.
3. Commit and push the prepared source changes, including `.github/workflows/pages.yml` and `package-lock.json`, to `main`.
4. Open [Actions](https://github.com/Gerark/zomboard/actions) and confirm **Build and deploy GitHub Pages** finishes successfully. A manual run is also available from that workflow's **Run workflow** menu on `main`.
5. Open the deployed board, copy a mission link, and paste that new link in Discord to check its preview.

No custom secret or manual local generation step is required. If Actions are disabled or restricted for the repository, enable the workflow and the official `actions/*` actions. Deployment uses the standard `github-pages` environment; any environment approval or branch-protection rules still apply.

Every push to `main` now runs the tests, generates the website and share pages, uploads `_site/`, and deploys that artifact. Pull requests targeting `main` run validation and a build without deployment. The build reads the public base URL from GitHub Pages configuration, including the `/zomboard/` path or a configured custom domain. The workflow does not write generated files or commits back to the repository. Only the website files and `assets/` enter the deployment artifact; repository documentation, tests, dependencies and build scripts are excluded.

This uses GitHub's [custom Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages). Keep `.nojekyll` in the source and deployment root.

## Local preview and optional build checks

Opening the source `index.html` directly still works. You can also serve the source:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/`. The unbuilt source and direct-file previews copy the existing `?mission=<id>` links, since generated share pages are not required for those workflows.

To check the generated deployment locally, use Node.js 24 (the version used by GitHub Actions):

```powershell
npm ci --ignore-scripts
npm test
npm run build -- --base-url http://127.0.0.1:8000/
python -m http.server 8000 --bind 127.0.0.1 --directory _site
```

Run one preview server at a time and stop it with Ctrl+C when finished. Share links copied from that generated HTTP preview point at the local server. Discord needs the publicly deployed URLs to fetch metadata and images.

The build script replaces only its own `_site/` output. It refuses to overwrite an existing `_site/` without its `.zomboard-output` marker. The sole development dependency, `sharp`, handles SVG-to-PNG conversion and image dimensions; no package or build runtime is sent to visitors. Plain source preview does not require Node.js or installing dependencies.
