# B.7E verification

Checked with Microsoft Edge and Playwright on September 16, 2026.

- Eight cheatsheet workflows pass: all 52 THIS/OR recommendations and 52 opinions appear across 27 races; practice marks, private write-ins and reader filters do not affect the guide; print contains the admin's guide; saved Admin edits update it; empty guides have a clear state; author text is escaped; layouts stay readable.
- Five projection checks pass for deterministic author-only output, candidate/party/write-in labels, missing opinions, empty data, wrong-race rejection, and data-provided proposal or other categories.
- Five phone-navigation checks pass for measured capsule widths, jump alignment and focus, scroll progress in both directions, short final groups, resized content, desktop hiding, wrapped labels, and event cleanup.
- Four integration groups pass for fresh phone/desktop previews, multiple ballot bundles and separate saves, unavailable areas, draft recovery and navigation guards, GitHub Pages paths, and short-screen editors.
- Fourteen camera cases pass across phone and desktop: nearest-center Snap on either sheet, from gaps or blank areas; Snap-off preservation; All fitting both sheets; and existing taps/Next behavior.
- Five accessibility audits report no violations across phone and desktop cheatsheets, the desktop shell, and the gallery.
- Five static groups check 778 public links/imports, shared references, runtime paths, and public-file boundaries. Nine launcher groups pass. A direct launcher check selects B.7E / v0.2.4 and stops its own preview server cleanly.

All six public previews were captured from B.7E. My Guide images show the admin's recommendations with no personal practice choices. Phone checks use browser emulation.

Release preparation uses an explicit public-file allow-list. The extracted-package suite retains previous mockup checks and adds B.7E checks for the author-only cheatsheet, opinions, phone jumps, desktop layout, PDF reference, and inherited two-sheet Snap/All. It checks every extracted file against the release manifest and excludes local research and development files.

Open the [review guide](README.md) for the walkthrough.
