# B.7H verification

Checked with Microsoft Edge and Playwright on September 16, 2026.

- Four page-row groups pass for centered labels, matching dashboard SVGs, a 25% height increase, all app pages, phone/desktop widths, and fixed positioning. Two accessibility audits report no violations.
- Four integration groups pass for fresh views, all 52 author recommendations and opinions across 27 races, separate ballot-bundle saves, unavailable areas, dirty-draft recovery and navigation guards, GitHub Pages paths, and short-screen editors. Three guide, shell, and gallery accessibility audits report no violations. Six public previews were captured from B.7H; phone and desktop guide images were visually reviewed.
- Seventy camera groups pass: 20 gesture, 36 source-column, and 14 nearest-section/Snap groups. These cover continuous anchored wheel input, direction reversal, normalized wheel units, Ctrl-wheel pinch, two-touch pinch and remaining-finger pan, bounded zoom, both motion preferences, top and bottom recovery, persistent column navigation, and Front-to-Back movement.
- Thirteen browser output groups pass for author-only data, complete recommendation opinions, highlighted header opinions, source links, safe text, empty recommendations, extended text, Unicode handling, additional categories, and quiet downloads. Twelve actual-PDF inspection groups pass for complete text, page bounds, fonts, source links, continuation labels, sequential reading order, and long-content flow. Actual Letter PDFs have six ballot pages (Front 1-4, Back 5-6) and four printed-guide pages. All 28 races, 52 recommendations with full opinions and authors, and four highlighted header opinions appear in the ballot PDF. Opinions use 10.5-point text, choice names use 11.5-point text, and author/source labels use 9.5-point text. The printed guide is one page shorter than B.7G while retaining full opinions and category capsules. Long content adds readable single-column continuation pages instead of clipping; the extended-content fixture spans ten pages with its full text intact.
- Eight static groups check 967 public links/imports, release boundaries, stable shared references, and pinned PDF dependency hashes. Nine launcher groups pass; the direct launcher check selects B.7H / v0.2.7 and stops its own server.

All 656 prior mockup, reference, and package files remain byte-for-byte unchanged. Seven copied data JSON files match B.7G after explicit dataset, catalog, and mockup-label changes. B.8 supplied no code or reference.

The release checker retains earlier mockup checks and adds the centered H page row, complete opinion PDF generation, compact print capsules, quiet success, and persistent viewer navigation. Extracted files are compared with the manifest, and ignored local research and development files are excluded.

Camera touch checks use real browser input through the browser automation protocol, not physical phone hardware. Printer settings can change pagination. The inherited floating zoom and All controls can partly cover underlying detail buttons at some pan positions; panning reveals them. Clean page and guide accessibility audits are not a claim that the full Ballot Viewer passes every WCAG check.

Open the [review guide](README.md) for the walkthrough.
