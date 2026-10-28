# Add a mission

1. Add the mission images to `assets/`.
2. Open `missions-data.js` and duplicate a complete object inside the `missions` array, before the closing `];`. Separate objects with commas.
3. Set a unique `id`, the next two-digit `number`, and replace the mission text and objectives.
4. Set `category` to `'field'` or `'base'` and `risk` to `'LOW'`, `'MEDIUM'`, `'HIGH'`, or `'SEVERE'`.
5. For one image, set `image` to the asset path, such as `'assets/medical-run.png'`, matching filename casing. Add `imageAlt` for screenshots or maps. For multiple images, use the ordered `images` list below.
6. Open `index.html` in a browser and check the new mission's card, briefing, objectives, images, and full-image links.

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
