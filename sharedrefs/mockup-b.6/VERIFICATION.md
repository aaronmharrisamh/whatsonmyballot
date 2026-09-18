# B.6 / v0.1.7 verification

Checked on September 14, 2026 in Microsoft Edge 153 with Playwright.

## Browser checks

21 behavior groups passed across the main, motion, and extra suites:

- Fresh first visit, no personal choices, left-hand guide hints, switch, and Front/Back progress.
- Personal marks replace hints and persist after reload. Clearing restores the guide hint.
- Row-colored controls, Choose This/Optional labels, and blue manually opened notes on unmarked rows.
- Dark Back/Next chips, menu navigation, Demo Fresh Start, and keyboard focus.
- Area drafts, Use this area, unavailable-area navigation, reload persistence, and the Admin placeholder.
- White paper, full-width patterned canvas, floating zoom pill, and open guide opinions across the paper.
- Zoom alternation and unchanged magnification through all 28 sections and both pages.
- Row anchoring, Snap, stable focus edges, touch pinch, extended pan bounds, and backdrop closing.
- A drag that ends outside the viewer does not dismiss it.
- Slider limits, Home, and the 3/30/60-second idle hint ladder.
- Local editing, dirty guards, restore, draft recovery, review, and the original PDF.
- A second test ballot loaded through the catalog with separate personal saves.
- GitHub Pages-style prefixes and short-screen editor controls.

Eight axe accessibility scans reported no violations. Scaled paper targets are excluded from the target-size rule; fixed viewer controls are checked. Four viewport layouts passed: 320×740, 390×390, 844×390, and 1440×1000.

Normal-motion checks confirm that the oval outline moves while its symbol stays unchanged. Reduced-motion checks confirm static hints. Final screenshots use fresh browser contexts with no personal choices.

## Data checks

Nine data groups and 16 invalid-catalog cases passed. They cover the JSON Schema, hierarchy, availability, parent and ballot IDs, safe bundle paths, saved area fallbacks, 31 district branches, separate datasets, explicit example loading, stale-writer checks, and optional page labels.

The browser also loaded a second ballot bundle supplied through a test catalog. Switching between ballots preserved each ballot's own choices. Unavailable selections remained unavailable after reload.

## Release checks

All 450 public links/imports and four schema/release groups passed. Four launcher fixture groups passed. The actual launch.bat selected B.6 / v0.1.7, used an available port, loaded the app, and stopped its server. All 195 earlier mockup/reference files matched their v0.1.6 manifest hashes.

The release process also checks manifest hashes, ZIP extraction, and browser behavior from the extracted public project.

## Limits

These are automated browser checks and visual review, not an accessibility certification or testing with actual voters. Touch is browser-emulated. Physical devices, Safari, and assistive-device testing remain future checks.

All B.6 identities and opinions are fictional layout filler. Random guide marks are not real endorsements. Open opinions make the HTML paper longer than the source PDF. Section proportions and the minimap are estimates.

Admin uses local browser storage. Create ballot is a placeholder. The area catalog is maintained as project JSON; there is no authenticated server editor or database.
