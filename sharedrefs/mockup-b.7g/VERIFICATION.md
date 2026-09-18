# B.7G verification

Checked with Microsoft Edge and Playwright on September 16, 2026.

- Nine page-layout groups across two independent suites pass for fixed labels on District, Ballot, My Guide, Admin, and Help; phone and desktop widths; immediate category jumps; and all 52 filled recommendation symbols. Seven guide, page-label, shell, and gallery accessibility audits report no violations.
- Four integration groups pass for fresh phone/desktop views, 52 author recommendations and opinions across 27 races, multiple ballot bundles with isolated saves, unavailable areas, dirty-draft recovery and navigation guards, GitHub Pages paths, and short-screen editors. Six public previews were captured from B.7G and visually reviewed.
- Forty-two camera groups pass: 28 column-boundary cases and 14 inherited nearest-section Snap cases. These cover five populated columns, nine persistent Back/Next controls, both motion preferences, phone/desktop layouts, Front-to-Back navigation, section reading, final-column recovery, and final Next opening My Guide without adding personal marks.
- Eleven browser output groups pass for author-only snapshots, complete recommendations, darker PDF section bands, grouped print columns, safe text, empty recommendations, unsupported characters, oversized content, an additional Proposals category, and quiet downloads from both buttons.
- Nine actual-PDF inspection groups pass for the two-page Letter ballot PDF and five-page Letter guide. The ballot PDF keeps readable 11.5-point names and titles. Print uses 12-point opinions and 12.5-point names, with all 52 opinions complete. Category headers repeat on continuation pages: Partisan on pages 1–4 and Non-Partisan on page 5. Text and capsule content stay within page bounds; both columns are used. The additional Proposals fixture retains its own capsule and columns.
- Seven static groups check public links/imports, shared references, release boundaries, and pinned PDF dependency hashes. Nine launcher groups pass; the direct launcher check selects B.7G / v0.2.6 and stops its own server.

The inherited floating zoom and All controls can partly cover underlying ballot detail buttons at some pan positions. Panning reveals them. The clean guide audits are not a claim that the full viewer passes every WCAG check. Phone checks use browser emulation; printer settings can change print pagination.

All 591 prior mockup, reference, and package files remain byte-for-byte unchanged. All seven copied data JSON files match B.7F after explicit dataset, catalog, and mockup-label changes. B.8 supplied no code or reference for B.7G.

Release preparation uses an explicit public-file allow-list. The extracted-package suite retains previous mockup checks and adds fixed G page labels, filled guide ovals, local two-page PDF generation, grouped print capsules, silent success, and persistent column navigation. It compares the extracted files with the manifest and excludes local research and development files.

Open the [review guide](README.md) for the walkthrough.
