# B.3 verification

App version: **0.1.4**. Source: the existing complete November 2024 Akron Township 1AF historical sample.

Eighteen browser check groups cover the section-first app, default Phone preview, full-screen ballot tool, preview shell, normal animation, and idle timing. The checks include:

- All 28 sections and both source pages.
- A fixed bottom minimap beside Back and Next, with no view toggle, section finder, or Skip button.
- Full use of the modal canvas, a dimmed backdrop, compact control chips, and an accessible close button.
- Tab and Shift+Tab containment, chip focus after a page change, and Escape closing only the top window.
- Return to the selected section, restoration of reading scroll, and cleanup after repeated opening and closing.
- Shared candidate and party choices, SVG fractions, write-ins, review rows, and the saved PDF.
- Nested candidate profiles, opinion dialogs, Admin saves, restore drafts, dirty guards, and notes exports.
- The cross-frame All mockups guard while an editor is open above the ballot tool.

Eight automated accessibility scans passed in Edge 153. Layout checks cover 320- and 390-pixel phone widths, desktop, short landscape, and the phone preview shell. Enlarged text and emulated touch are included. Target-size measurements are excluded only inside scaled paper; the readable controls, modal controls, and dock are checked separately.

Normal-motion checks verify the smooth 650 ms zoom and preservation of the clicked vertical position. A controlled browser clock verifies the 3-, 30-, and repeating 60-second reminder waits. The ballot dialog allows its own reminder; nested dialogs pause it.

Eight storage and data groups passed, including eleven invalid-file cases, revision conflicts, failed-save preservation, recovery records, legacy race saves, separate party marks, and dynamic minimap geometry.

The launcher passed four fixture groups and its real batch-entry check. It selected **B.3 / v0.1.4**, loaded the public preview, and stopped its own server.

Release checks verify public links, schema compatibility, the extracted file hashes, and the portable ZIP. The extracted app exercises A5, B1, B.1, B.2, and B.3, including shared edited content and a GitHub Pages style repository prefix.

These checks are not a full accessibility certification. Physical phones, native keyboards, Safari, native browser zoom, and assistive-technology user testing remain unverified. Detailed reports stay in the ignored docs/verification folder.
