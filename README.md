# ZomBoard

A standalone, read-only Project Zomboid mission board. No accounts, backend, database, frameworks, or build steps are required.

## Publish with GitHub Pages

Repository: [Gerark/zomboard](https://github.com/Gerark/zomboard)

Site address after deployment: [gerark.github.io/zomboard](https://gerark.github.io/zomboard/)

### One-time setup

1. Commit and push the site files to the repository's `main` branch, with `index.html` at the repository root.
2. Open the repository's [Settings → Pages](https://github.com/Gerark/zomboard/settings/pages).
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select branch **main**, folder **/ (root)**, and click **Save**.
5. Wait for the **pages build and deployment** run in [Actions](https://github.com/Gerark/zomboard/actions) to finish, then open the site address above.

The root `.nojekyll` file tells GitHub Pages to serve these static files without Jekyll processing. No custom workflow, package installation, build command, deployment token, or custom domain is needed. GitHub manages the deployment workflow.

### Publish updates

Commit the intended changes and push them to `main`. GitHub Pages redeploys automatically; check Actions if an update does not appear. Other branches do not publish to the live site.

Keep `index.html`, `styles.css`, `missions.js`, `.nojekyll`, and `assets/` in their current relative locations. Relative URLs allow the site and links such as [`?mission=bunker`](https://gerark.github.io/zomboard/?mission=bunker) to work under the `/zomboard/` project path. No SPA rewrite or `404.html` workaround is needed for query-string mission links.

Important: Anyone with the public site link can view the board. There is no authentication.

With publication from the repository root, documentation files are also publicly reachable. Keep private files and credentials out of this public repository.

See [GitHub's publishing-source documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) for the hosting settings.

## Customize missions and artwork

**Text:** Edit the ten mission objects at the top of `missions.js`. Each includes title, description, crew, risk, location, status, objectives, and image path. Use `status: 'claimed'` or `status: 'available'`.

**Images:** Mission artwork lives in `assets/` and is selected by each mission's `image` property in `missions.js`. Eight missions use supplied PNG screenshots: bunker, groceries, palisade, chickens, mechanics, police, rooftop garden, and VHS collection. The chicken-coop and Greene's missions keep their SVG placeholders. Original SVG files are retained.

- To replace an image, put a `.jpg`, `.png`, `.webp`, or `.svg` file in `assets/` and update that mission's `image` path. Add an `imageAlt` description when the image contains useful visual information.
- Card thumbnails are cropped; briefing images appear below the field notes and retain their full aspect ratio so map annotations remain visible. **View full image** opens the original asset in a new tab for closer inspection.
- The social-preview illustration is `assets/hero-mccoy.svg`; update `og:image` in `index.html` to change it.
- The retained SVG illustrations are placeholders and may be replaced.

**Design:** Modify `styles.css` to change the layout, typography, colors, and card style.

## Features

- Ten missions, including VHS collection from the movie store in Muldraugh, with the palisade mission marked claimed
- Compact cards in a responsive layout for desktop, tablet, and mobile
- All missions displayed together, without search or filters
- Detailed mission briefings with objective checklists
- Links directly to any mission using `?mission=bunker` etc.
- Read-only: visitors cannot claim or complete missions

## Local preview

You can double-click `index.html`, or run `python -m http.server 8000` in this folder and open `http://localhost:8000`.

Google Fonts are loaded from Google when online; the site has local font fallbacks and all mission images are stored within this folder.
