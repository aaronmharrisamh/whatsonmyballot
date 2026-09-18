# B.7F verification

Checked with Microsoft Edge and Playwright on September 16, 2026.

- Eight author-cheatsheet workflows pass: all 52 THIS/OR recommendations and opinions appear across 27 races; practice marks, private write-ins, and reader filters stay separate; Admin edits update the guide; empty states, escaped text, and readable group layouts work.
- Five phone-navigation groups and a live-app check pass for measured capsule widths, progress, focus, short final groups, wrapped labels, cleanup, the full-width header-adjacent row, instant jumps under normal motion, desktop hiding, and duplicated output controls.
- Four integration groups pass for fresh phone/desktop previews, multiple ballot bundles and isolated saves, unavailable areas, dirty-draft recovery and navigation guards, GitHub Pages paths, and short-screen editors.
- Forty camera checks pass: 14 inherited two-sheet Snap cases, 12 end-recovery fixtures, and 14 live-app navigation cases. These cover nearby sections, sheet crossings, All, reduced motion, long and short section endings, final-section navigation, and keeping Next clear of the floating All button.
- Nine output-browser groups pass for author-only PDF and print snapshots, complete recommendations, two-page PDF generation, readable print columns, safe text, empty recommendations, unsupported characters, and oversized content handling. The baseline PDF has two Letter pages with 11.5-point names; the complete opinion guide prints on four Letter pages with 12-point opinion text.
- Seven actual-PDF inspections pass: all 28 section titles and 52 recommendation names are searchable; Front/Back and County/Township office context remain clear; private and later edits stay excluded; empty recommendations are honest; all 52 opinions print completely; text stays within page bounds; both print columns are used on every page.
- Five guide, shell, and gallery accessibility audits report no violations. A separate phone viewer audit records an inherited target-size limitation: floating zoom and All controls can partly cover underlying ballot detail buttons at some pan positions. Panning reveals them. This is not a claim that the full viewer passes every WCAG check.
- Six static groups check 839 public links/imports, shared references, public-file boundaries, and pinned PDF dependency hashes. Nine launcher groups pass. The direct launcher check selects B.7F / v0.2.5 and stops its own server.

Six public previews were captured from B.7F. Phone checks use browser emulation. The existing 528 mockup, reference, and package files remain byte-for-byte unchanged. All seven copied data JSON files match B.7E after the explicit dataset, catalog, and mockup-label changes.

Release preparation uses an explicit public-file allow-list. The extracted-package suite retains earlier mockup checks and adds B.7F checks for locked phone navigation, instant jumps, a locally generated two-page PDF, prepared print content, and section controls in Snap. It checks extracted files against the manifest and excludes local research and development files.

Open the [review guide](README.md) for the walkthrough.
