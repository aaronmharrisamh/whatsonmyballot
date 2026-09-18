# B.5 / v0.1.6 verification

Checked on September 14, 2026 in Microsoft Edge 153 with Playwright.

## Browser and interaction checks

19 behavior groups passed across the main, motion, and extra suites:

- Populated first view, red guide rows, oval personal marks, and half-opacity oval guide symbols.
- Show opinion guide hides guide treatments while manual opinions still work.
- Adjacent Back/Next chips, all 28 sections, page changes, and final review navigation.
- Compact portrait paper, fixed plus pattern, modal margins, and one expanded section.
- Zoom, plus/minus, slider limits, 75% navigation, full-width Snap, and the edge return indicator.
- Smooth click-to-expand, anchored opinion interactions, and drag-release snapping within and across columns.
- Stable screen-pixel green frame without restarting its animation during movement.
- Touch pinch stays free with Snap on; keyboard pan/Home and reduced-motion behavior work.
- The 3/30/60-second idle reminder ladder responds to movement.
- Local editing, dirty guards, save, restore, draft recovery, and conflicting saves from a second tab.
- Personal choice limits, write-ins, clearing across reload, review, and the original PDF link.
- Phone and desktop layouts, short screens, GitHub Pages prefixes, and nested dialogs.

Four viewport layouts passed: 320×740, 390×390, 844×390, and 1440×1000. Seven axe accessibility scans reported no violations. Scaled paper targets are excluded from the target-size rule; the fixed viewer controls are checked. Final gallery images come from fresh browser contexts with the populated fictional baseline.

## Data checks

Ten data groups and 19 malformed-file cases passed. The checks cover 148 filled notes, 120 annotation targets, 55 THIS/OR marks, choice limits, first-visit seeding, explicit sample reload, independent historical storage, revision conflicts, failed saves, recovery, and SVG oval assets. Invalid demo fixtures fail before choices are changed.

## Release checks

All 396 public links/imports and four schema/release groups passed. Four launcher fixture groups passed. The actual launch.bat selected B.5 / v0.1.6, used an available port, loaded the app, and stopped its server. All 162 earlier mockup/reference files matched their v0.1.5 manifest hashes.

The release process also checks manifest hashes, ZIP extraction, and behavior from the extracted public files. B.5 is included beside every earlier mockup. Development scripts, research, and local agent instructions are excluded.

## Limits

These are automated browser checks and visual review, not an accessibility certification or testing with actual voters. Touch uses browser emulation; physical devices, Safari, and assistive-device testing remain future checks.

The paper and minimap follow the reference structure and estimated section sizes. Interactive expansion changes heights, so the HTML is not a pixel-for-pixel PDF. Snap keeps a nearby row in place where paper boundaries allow it.

All B.5 identities and opinions are fictional layout filler. Its random marks are not real endorsements. The historical PDF remains a separate, labeled layout reference. Admin is local browser storage; there is no authentication or server database.
