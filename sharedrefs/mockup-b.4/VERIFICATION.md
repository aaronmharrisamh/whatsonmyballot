# B.4 / v0.1.5 verification

Checked on September 14, 2026 in Microsoft Edge 153 with Playwright.

## Completed browser checks

15 behavior groups passed:

- Default phone section, soft controls, single count, guide toggle, and weighted progress.
- Inline opinions, personal filled circles, and selection-specific straight-party notes.
- All 28 sections across both source pages at 75% and 100% fits.
- Zoom slider and stationary opinion/information interactions.
- Independent THIS/OR editing, colors, dirty guards, save, cancel, restore, and automatic opinions.
- Selection limits, partial counts, write-ins, review, and the source PDF.
- Notes editing, annotation export/import validation, and original-data restore.
- Phone/desktop shell, 320-pixel screens, short portrait/landscape, and enlarged text.
- Smooth 650 ms anchored zoom and stationary note closing.
- The 3/30/60-second idle hint sequence and nested-dialog pause.
- Touch pinch, keyboard pan/Home, and reduced-motion behavior.
- Unsaved annotation recovery and a conflicting write from a second tab.
- Dirty editing within Ballot View and navigation to the gallery.
- GitHub Pages-style path prefixes and short-screen editor controls.

Detailed group names and outputs are in local verification reports.

10 automated accessibility scans passed with no reported violations across readable sections, annotated sections, editor, viewer, nested details, review, desktop shell, Admin examples, and gallery. Scans cover WCAG A/AA rules available in axe. Scaled ballot-paper target sizes are excluded from the target-size rule; fixed viewer controls are checked.

## Data and recovery

16 data/storage groups passed, including 22 malformed-file cases:

- Annotation schema 1.0.0 validates 120 immutable option identities.
- All six color presets and independent THIS/OR values work.
- Import rejects extra fields, unknown schemas, invalid IDs, invalid colors, and duplicate records.
- Saves increment revisions. Stale writers and quota failures preserve the saved version.
- Unreadable annotations stay exportable and require explicit restore.
- Unsaved mark and note drafts remain separate from saved records.
- The 148 notes, legacy 27-race choice save, separate party choice, and dynamic minimap remain compatible.
- Progress weights derive from source page/column layout and content size.

## Release and preview

The gallery includes B.4 and preserves earlier mockups. Public runtime dependencies use the project and sharedrefs folders. All 342 public links/imports passed checks. Four launcher fixture groups passed; the actual launch.bat selected B.4 / v0.1.5 and stopped its server. Dotted revisions are sorted by number. The release process checks public links, schema fixtures, manifest hashes, extracted files, and behavior from the extracted ZIP.

## Limits

These are automated browser checks and visual review, not an accessibility certification or testing with actual voters. Touch gestures use browser emulation. Physical phones, Safari, native zoom, on-screen keyboards, and assistive-device user testing remain future checks.

The progress bar and minimap use stable estimated section proportions, not measurements of the official PDF. A completion check means at least one saved choice; it does not require filling every permitted choice. Earlier undecided sections remain undecided.

Guide mark examples are fictional and appear in Admin. No generated endorsements are assigned to real candidates. Local edits are stored only in this browser; there is no authentication or server-backed Admin yet. The historical source is Akron Township, Precinct 1AF, November 2024.
