# ZomBoard

A public, read-only Project Zomboid mission board. Visitors can browse briefings and copy mission links; they cannot claim or complete missions. Built with plain HTML, CSS, and JavaScript, with no dependencies or build step.

Site: [gerark.github.io/zomboard](https://gerark.github.io/zomboard/)

## Local preview

Open `index.html` directly, or run this from the repository root:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Then visit [localhost:8000](http://127.0.0.1:8000/). JavaScript is required to display missions.

## Edit missions

Mission content lives in the `const missions` array in [`missions-data.js`](missions-data.js). Rendering and interactions live in `missions.js`.

To add a mission:

1. Put its image in `assets/` (`.png`, `.jpg`, `.webp`, or `.svg`).
2. Copy a complete mission object inside the `missions` array in `missions-data.js`, before the closing `];`. Separate objects with commas. Array order controls the card and quest-list order.
3. Give it a unique, stable `id` such as `'medical-run'` and the next two-digit `number` such as `'12'`. Preserve existing IDs so shared links keep working, and check numbered narrative references if you reorder missions.
4. Replace `title`, `kicker`, `teaser`, `description`, `location`, `crew`, `note`, and the nonempty `objectives` list with plain text. Set `category` to `'field'` or `'base'`, `status` to `'available'` or `'claimed'`, and `risk` to `'LOW'`, `'MEDIUM'`, `'HIGH'`, or `'SEVERE'`. Status is internal metadata; it does not display assignment badges.
5. Set `image` to the relative path, such as `'assets/medical-run.png'`, with matching filename casing. Add `imageAlt` for informative screenshots or maps. This is JavaScript: escape apostrophes inside single-quoted strings (`'don\'t'`) or use double quotes (`"don't"`).
6. Update both mission-count descriptions in `index.html`. Preview the board, open the new briefing, check its image and objectives, and test a link such as `?mission=medical-run`. If Node.js is installed, run `node --check missions-data.js` to catch syntax errors.
7. Include the data file, new image, and metadata changes together in your commit. Publishing follows the steps below.

Page structure and metadata live in `index.html`; layout, colors, and typography live in `styles.css`.

## Publish with GitHub Pages

1. Push the site files to `main` in [Gerark/zomboard](https://github.com/Gerark/zomboard), with `index.html` at the repository root.
2. In [Settings → Pages](https://github.com/Gerark/zomboard/settings/pages), select **Deploy from a branch**, **main**, **/ (root)**, then **Save**.
3. Check the **pages build and deployment** run in [Actions](https://github.com/Gerark/zomboard/actions).

Later pushes to `main` publish automatically. Keep `index.html`, `styles.css`, `missions-data.js`, `missions.js`, `.nojekyll`, and `assets/` in their current relative locations. No custom build or workflow is required. See [GitHub's publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

The site and root documentation are public. Keep private information and credentials out of the repository.
