# B.8 collection workspace

B.8 / v0.2.0 is complete. Open B.8 through the gallery or the local launcher. The preview starts in Phone mode. Collection schema remains 1.0.0.

## Import and share

1. Open Menu, then Admin.
2. Download **SCHEMASAMPLE.JSON**. Give that blueprint and the source ballots to the person or AI preparing the data.
3. Choose **Import JSON ballot data**, or drop one .JSON file over the app or surrounding preview. Several ballots must be in one collection file.
4. The app checks the entire file and its attachments, then saves one complete replacement. Choose **Use this area** in District to activate an imported ballot and guide.
5. Make and save Admin edits. Choose **Export JSON ballot data** to download all saved author content, including every ballot, guide, source and embedded file.

Imports do not merge old opinions. A failed or cancelled import keeps the previous collection. A successful import clears personal choices and old editor recoveries in B.8 only. The bundled blueprint and presentation sample never change.

If an editor is dirty, choose Save and continue, Discard and continue, or Keep editing. Export saved collection is also available there. Saving the old edit does not merge it into the incoming collection.

## District

Geography is read from the collection. Single-choice levels are text; multiple choices use dropdowns. An area with several elections/ballots gets a separate ballot selector. A ballot with multiple guides gets a guide selector with named authors. A single guide is selected without a dropdown. A facts-only ballot remains usable and can get its first guide in Admin.

**Use this area** commits the area, ballot and guide together. Guide switching does not mark personal ovals or clear choices on that ballot. Areas without ballot data disable Ballot, My guide and View; Menu and Admin remain available.

## Admin edits

The Admin workspace includes:

- Create a guide with its own title, named author and theme color.
- Edit guide profile, section opinions and choice recommendations: none, THIS or OR.
- Edit opinion text, author override and source references independently for each guide.
- Edit shared neutral information, Markdown, labels, source links and file/image assignments.
- Add and edit sources. Add or replace PDF, PNG, JPEG, WebP, Markdown and plain-text resources.
- Save, Cancel, Restore original and Export draft.

The editor identifies shared ballot information and the named guide that owns an opinion. Shared information applies to all guides; an opinion edit changes only its guide. Empty opinions and information remain valid.

Files are compressed and checked before saving. A replacement keeps its attachment ID. Removing an assigned file lists the references that must be cleared first; it does not silently remove other uses. Informational file links open validated resources through temporary Blob URLs. Imported text renders as escaped text or sanitized Markdown.

The limits shown in Admin are **25 MB JSON** and **100 MB expanded content**, where MB means 1,000,000 bytes. Current JSON and expanded sizes are shown separately. Actual browser quota can be lower. If encoding or saving fails, the prior saved file remains intact and the editor stays available.

## Saved data and recovery

The B.8 app path owns an IndexedDB database. Each import creates a new generation, even when a file reuses the same collection ID. The imported original, working author data, personal choices, reader preferences and editor recoveries have separate ownership.

A replacement writes its complete new collection, switches the active pointer and removes old B.8 records in one transaction. A failed transaction restores the previous state. Saves compare generation, collection identity and revision, so stale tabs and old drafts cannot overwrite later imports.

A draft can be reviewed after reload. An obsolete draft can be exported for manual recovery; it cannot save over a newer generation or revision. Export draft downloads editor recovery data, not an importable ballot collection.

**Restore original** inside an editor restores that target from this import's baseline. **Restore imported original** in Admin restores the full imported author snapshot and keeps personal choices separate. A record created after import has no imported original; the editor explains this. **Restore bundled demo** is a separate action that replaces the collection.

If storage is unavailable on first load, the built-in demo runs in a clearly labeled session-only mode. You can edit and export it, but importing is refused rather than reporting a false saved import. If a saved collection cannot validate on reload, you can download it for repair or replace it through the same import contract.

## Finished guide and outputs

The [ballot controls and Snap viewer](BALLOT-UI.md) share the collection state. The [recommendation cheatsheet, generated PDF and print guide](OUTPUTS.md) use an independent author-only snapshot.

This prototype has no cloud account, sign-in, server publishing or production database.

See [authoring instructions](AUTHORING.md), [collection contract](CONTRACT.md), [schema blueprint](SCHEMASAMPLE.JSON), and [Part 2 verification](PART2-VERIFICATION.md).

The implementation follows the platform behavior described in [IndexedDB transactions](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB), [file drag and drop](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop), and [checked postMessage communication](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage).
