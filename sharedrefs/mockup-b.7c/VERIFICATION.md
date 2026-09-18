# B.7C verification

Checked with Microsoft Edge and Playwright on September 16, 2026.

- 11 browser groups cover pointer and keyboard focus, colored ovals and retained guide overlays, shared filtering, Snap/All, cross-sheet navigation, camera anchors, wheel/slider/keyboard limits, normal and reduced motion, and emulated touch pinch. Four viewer sizes were checked.
- 7 Admin header workflow groups cover inline placement, highlight defaults and color scope, dirty guards, save/reload, restore, draft recovery, typed notes import/export, and empty controls in both views.
- 12 notes contract groups cover schema 1.1.0, strict field scopes, colors, recovery, stale writers, and retained note identities.
- 4 own-content edit groups and 2 style/navigation groups cover independent opinion/details controls, source-only content, changed recommendation colors, persistence, and removed duplicate controls.
- Dedicated desktop and phone camera checks fit all 28 sections, cross both sheets without replacing them, keep paper heights equal, and keep Front/Back labels readable and within the viewport.
- 3 integration groups cover separate ballot bundles and personal saves, unavailable areas, recovered drafts, shell navigation guards, GitHub Pages paths, and short-screen editors.
- 8 accessibility audits report no violations across readable views, headers, viewer states, and gallery. Small controls inside the scalable paper are excluded from target-size rules; the surrounding viewer controls are checked.
- Static checks cover public links, runtime paths, version consistency, and public-file boundaries. Nine launcher groups and a direct launcher check confirm B.7C is latest and test processes close cleanly.
- 363 earlier mockup/reference files match their before-work SHA-256 hashes, including B.7B and the outmoded B.8.

The release manifest and ZIP use an explicit public-file allow-list. Extracted-package checks cover the new B.7C workflow and the prior mockups, local PDFs, durable edits, exports, and GitHub Pages path prefixes.

Touch checks use browser emulation, not a physical phone. Fresh previews include readable sections, selected ovals, and both sheets. Open the [review guide](README.md) for the walkthrough.
