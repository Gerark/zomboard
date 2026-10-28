# Add a mission

1. Add the mission image to `assets/`.
2. Open `missions-data.js` and duplicate a complete object inside the `missions` array, before the closing `];`. Separate objects with commas.
3. Set a unique `id`, the next two-digit `number`, and replace the mission text and objectives.
4. Set `category` to `'field'` or `'base'`, `status` to `'available'` or `'claimed'`, and `risk` to `'LOW'`, `'MEDIUM'`, `'HIGH'`, or `'SEVERE'`.
5. Set `image` to the asset path, such as `'assets/medical-run.png'`, matching filename casing. Add `imageAlt` for screenshots or maps.
6. Open `index.html` in a browser and check the new mission's briefing, objectives, and image.
