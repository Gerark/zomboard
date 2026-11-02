# ZomBoard Quest Editor

Version 0.5.0 adds quests and edits one quest's text, details, completion,
objectives and ordered images at a time.
The website, mission data and Pages build remain independent of this folder.

## Open the Windows app

Extract the complete ZIP from `out/0.5.0/make/zip/win32/x64/`, then double-click
**ZomBoard Quest Editor.exe**. Keep its supporting files beside it.
The packaged app includes its runtime; using it requires no Node.js installation.

The uncompressed app is also available in `out/0.5.0/ZomBoard Quest Editor-win32-x64/`.
The package is unsigned and has no installer or updater.

## Browse quests

Click **Open ZomBoard Folder** and choose the folder containing `missions-data.js`
(the source checkout; generated `_site/` output is refused). All quests appear in source order,
with their original numbers and active/completed status. Select a quest to read
its briefing, objectives, notes, related-quest reference and optional map targets.
Images have previews, paths and alternative text in briefing order.

Opening another folder replaces the displayed board only after successful loading;
cancellation or invalid data keeps the last loaded board and draft. Folder selection
is remembered only while this app window is open. To refresh after external edits,
choose the folder again.

## Edit and save one quest

The **Quest text** section edits four fields: title, card teaser, description and
field notes. **Quest details** edits classification, category, risk, location,
crew and shared completion status. Saved IDs and display numbers remain locked
to protect shared links and narrative references.

Use **+ New quest** to start an unsaved active quest at the end of the board.
The app suggests a unique ID from its title and the next available two-digit
display number (or an unused number if 99 was reached). Edit these before saving;
an ID locks after the first save. A repeated display number shows a warning;
duplicate IDs are blocked. If all 01–99 numbers are used, enter a number manually
and review the numbering. Existing quests are never renumbered. Fill every text
field, add at least one objective and choose/import at least one image, then
press **Save quest**. The new quest is appended only after validation and backup.
**Cancel new quest** discards the draft and its pending imports. Empty boards are
supported; the board limit is 128 quests.

**Objectives** supports editing, adding, removing and moving entries
up/down (1–16 objectives, at most 512 characters each). Existing map targets and
other objective metadata remain attached when moving or editing an objective;
new objectives have no target. Targets remain read-only in this milestone.

**Images** supports adding existing assets, importing PNG/SVG files, removing
associations, reordering and editing alternative text (up to 512 characters).
Use 1–8 images. The first is the card thumbnail. Removing an entry keeps its file.
Imports are staged in memory until Save, use digest-based names, preserve original
bytes and never overwrite existing files. Discarding the quest drops its pending
imports. Existing screenshots and SVG illustrations are not retouched.

Press **Save quest** or **Ctrl+S** to save explicitly. Other quests, saved IDs,
numbers and quest-level map targets remain unchanged. Text/detail saves replace only
changed literals. Changed lists may be reformatted within the selected
quest; unchanged objectives retain their source text where possible. Source line
endings, any UTF-8 BOM and unrelated source content are preserved. A changed legacy
single image is represented by a nonempty `images` array, which takes precedence;
the original unused `image`/`imageAlt` properties are retained.

Unsaved changes are marked in the quest list. Switching quests, opening another
folder or closing the window asks before discarding them. **Discard changes**
restores the selected quest's loaded data; it does not undo an earlier save.
The editable fields must be nonempty plain text. Limits match the producer's text
limits: title/classification/location/crew 256, teaser 512,
description/notes 8192 UTF-16 code units. Unsupported
control characters and invalid Unicode are rejected. The full website build is
still required to validate all feed and image constraints before publishing.
Before publishing, preview `index.html`, run the website tests/build, and update
any documented mission inventory in the root README and AGENTS guidance when
adding quests or changing their completion. Related quests, ruled-out leads and
map targets are displayed read-only; this version does not duplicate, reorder or
delete whole quests.

Each changed save creates an exact original-file backup under the selected folder's
`.cache/quest-editor/backups/`, then prepares and flushes a temporary file and replaces
`missions-data.js` by renaming it. Unchanged saves do not rewrite the source or create
a backup. The app never stages, commits, pushes or publishes.

Before saving and immediately before replacement, the app checks the source against
the bytes loaded into this window. External changes block saving and retain the draft.
Copy any draft text you need, then choose the same folder again to reload. This is
optimistic concurrency; arbitrary external editors do not obey the app's save lock.
Cooperating editor instances use `.cache/quest-editor/save.lock` to serialize writes.
If a crash leaves a lock behind, close all editor windows before removing that lock
manually. Temporary files and original backups are retained if a process crashes;
source replacement is a single-file operation. Required imports are installed first,
then the source is replaced. If saving fails after imports are copied, unreferenced
assets may remain; the app retains them rather than risk deleting shared files.

Image validation and previews use Electron's built-in Chromium decoder in isolated,
network-blocked workers, without a separate native image library. Input images must
be at most 8 MiB, 4096 per dimension and 8,000,000 pixels. SVGs must be valid,
self-contained SVG documents without scripts, event handlers, embedded HTML or
document types/entities. The editor checks case-correct paths, refuses symlinks and
detects changes to images observed during preview. Full producer validation remains
necessary before publication, including SVG conversion, output PNG and total-feed
limits. Staged imports are limited to 64 MiB per open draft.

To restore a backup, close the editor, copy the chosen backup over `missions-data.js`,
then reopen the source folder and review the result. Backups and temporary files stay
under the repository's ignored `.cache/`; normal successful saves remove the lock
and temporary file. Editing a symlinked source or writing through a linked cache is
refused. The source checkout's directory must be writable for saving.

The data file is parsed as static JavaScript literals using Acorn, without executing
it. The loader accepts the existing `const missions = [...]` format, comments and
optional `'use strict'` directive. Executable expressions, getters, spreads and
other statements are rejected. Files must be valid UTF-8 and at most 2 MiB.
Structural checks ensure the displayed fields are usable; this is not a substitute
for the website build's full feed and image validation.

## Develop and package

Use Node.js 24 LTS and npm 10.9 or newer. Dependencies are pinned in this folder's
lockfile and are separate from the website's dependencies. From `editor/`:

```powershell
npm ci
npm test
npm start
npm run make
```

`npm run package` builds just the app folder; `npm run make` also creates the ZIP.
Output is versioned under `out/<version>/` so older builds can remain open.
Electron downloads its runtime when needed on first use. Generated output and
dependencies are ignored. The only application runtime dependency is the pure
JavaScript Acorn parser. The sandboxed renderer uses a narrow isolated preload bridge;
source reads, native confirmation dialogs and validated saves run in the main process.
There are no additional native image-processing libraries.

Tests use Node's built-in runner and `*.spec.cjs` names to stay separate from the
website's root test discovery. Temporary reader and save fixtures stay under ignored
`.cache/quest-reader-checks/`, `.cache/quest-store-checks/` and
`.cache/quest-image-checks/` and `.cache/quest-create-checks/` in the repository.
