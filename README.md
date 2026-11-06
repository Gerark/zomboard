# Adding missions

You can add missions with the [Windows Quest Editor](editor/README.md), or edit the source manually:

1. Add your PNG screenshot or SVG illustration to `assets/`. Match the existing illustration style when creating new SVG artwork.
2. Open `missions-data.js`, copy a complete mission object and append it inside the `missions` array, before the closing `];`. Separate mission objects with commas.
3. Give it a unique `id` using lowercase letters, digits and single hyphens, and the next unused two-digit `number`. Keep existing missions' IDs and numbers unchanged.
4. Replace `title`, `kicker`, `teaser`, `description`, `location`, `crew` and `note` with the new mission's plain-text content.
5. Set `category` to `'field'` or `'base'`, `risk` to `'LOW'`, `'MEDIUM'`, `'HIGH'` or `'SEVERE'`, and `completed` to `false` for a new active mission. Use a boolean, without quotes.
6. Set `image` to your asset's relative path and provide descriptive `imageAlt` text. Paths and filename casing must match the files exactly:

   ```js
   image: 'assets/your-mission.png',
   imageAlt: 'Describe what the image shows.',
   ```

   For multiple images, replace those two fields with an ordered `images` array. The first image becomes the card thumbnail; all images appear in the briefing:

   ```js
   images: [
     { src: 'assets/your-mission.png', alt: 'Describe the first image.' },
     { src: 'assets/your-mission-map.png', alt: 'Describe the map.' }
   ],
   ```

7. Write the objectives as an ordered array of objects, each with a plain-text `text` field. Use 1–16 objectives, each at most 512 characters:

   ```js
   objectives: [
     { text: 'Reach the search area and check the approach' },
     { text: 'Recover the supplies and bring them home' }
   ],
   ```

8. Remove copied `relatedMission`, `outdatedLead` and quest/objective `mapTarget` fields unless they apply to the new mission. Keep only confirmed coordinates.
9. Open `index.html` in a browser and check the new card, briefing, objectives, images and full-image links. Check its deep link with `?mission=your-mission-id`.
10. Update the mission inventory in `AGENTS.md`.

If Node.js is available, check JavaScript syntax from the repository root:

```powershell
node --check missions-data.js
node --check missions.js
```
