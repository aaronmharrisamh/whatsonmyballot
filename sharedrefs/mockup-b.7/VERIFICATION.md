# B.7 verification

Checked in Microsoft Edge through Playwright on September 15, 2026.

- 10 browser behavior groups: fresh state, filtering, saved choices, opinion states, navigation, Admin edits, and areas.
- 8 motion and touch groups: arrow and oval animation, smooth and repeated wheel input, pan-only Snap, pinch, camera bounds, backdrop closing, and idle hints.
- 9 data groups, including 16 malformed catalog cases, independent dataset saves, and stale editor protection.
- 3 integration groups: a second ballot bundle, draft recovery and the preview-shell guard, and GitHub Pages path prefixes.
- 5 automated accessibility scans with no reported violations. The zoomable ballot drawing keeps its existing small-target exception; the surrounding controls are checked without that exception.
- Viewport checks at 320 × 568, 390 × 867, 867 × 390, and 1440 × 1000. Both phone and desktop preview images were refreshed and visually inspected.

The release check verifies the extracted ZIP, runtime links, file hashes, earlier mockups, and the absence of ignored research or tools. The local launcher selects dotted revisions numerically and selects B.7 as the latest mockup.

Automated touch emulation is not a physical iPhone or Android device test. Review the [demo](../../finishedmockups/Mockup%20B.7/index.html) on the devices used for your presentation.
