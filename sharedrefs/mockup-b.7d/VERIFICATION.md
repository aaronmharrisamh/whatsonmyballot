# B.7D verification

Checked with Microsoft Edge and Playwright on September 16, 2026.

- Four My Guide workflow groups cover the removed introduction and Change buttons, all 28 choice summaries, saved personal marks, explanations, stacked phone containers, two desktop columns, and existing PDF/print controls.
- Four integration groups cover responsive guide captures, independent ballot bundles and personal saves, unavailable areas, draft recovery, shell navigation guards, GitHub Pages paths, and short-screen editors.
- Fourteen camera checks across phone and desktop cover Snap to unselected sections on either sheet, the closest section from the sheet gap or beyond the paper, unchanged zoom when Snap is turned off, All fitting both sheets, and existing section-tap/Next behavior.
- Five accessibility audits report no violations across empty phone My Guide, populated phone and desktop My Guide, the desktop shell, and the gallery.
- Five static groups check 723 public links/imports, shared references, runtime paths, and public-file boundaries. Nine launcher groups and a direct launcher check confirm B.7D is latest and the check's preview process stops cleanly.

Fresh previews include readable sections, selected ovals, both sheets, and phone/desktop My Guide containers. Guide captures contain a deliberate example personal mark; a fresh visit still starts with no personal choices. Phone checks use browser emulation.

Release preparation uses an explicit public-file allow-list. The extracted-package suite retains the previous mockups and adds B.7D checks for its grouped guide, PDF link, nearest-center Snap, and All. It checks every extracted file against the release manifest and excludes local research and development folders.

Open the [review guide](README.md) for the walkthrough.
