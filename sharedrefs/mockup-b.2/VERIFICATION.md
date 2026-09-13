# B.2 verification

App version: **0.1.3**. The source remains the complete November 2024 Akron Township 1AF historical sample.

Seventeen browser check groups cover the B.2 interactions, preview shell, normal animation, and idle timing. They include all 28 sections, actual viewport labels, fixed title height, hidden inactive tools, one toolbar, exact section-width fitting, anchored expansion, stationary information dialogs, SVG fractions, write-ins, party-choice persistence, the minimap, and local Admin saves.

Seven automated accessibility scans passed in Edge 153. Tests cover 320- and 390-pixel phone layouts, desktop, short landscape, and the mobile preview shell. Target-size measurements are excluded only inside scaled paper; readable controls and the toolbar are checked separately. Enlarged text, keyboard controls, reduced motion, and emulated touch are included.

The animation checks verify the one-second focus outline and smooth 650 ms zoom. A controlled browser clock verifies the 3-, 30-, and repeating 60-second reminder waits and the dialog pause.

Eight storage and data groups passed, including eleven invalid note-file cases, revision conflicts, failed-save preservation, draft recovery, legacy individual-race compatibility, separate party saves, and minimap adaptation to additional pages and columns.

The launcher passed four fixture groups and its real batch-entry check. It chose **Mockup B.2 / v0.1.3**, used a free port, loaded the app, and stopped its own server. An existing preview on another port was left running.

The release checks validate public links, schema compatibility, each extracted file's SHA-256 hash, and the portable ZIP. The extracted project exercises A5, B1, B.1, and B.2, including the PDF, shared Admin text, SVG assets, party choice, and a GitHub Pages style repository prefix.

These automated checks are not a full accessibility certification. Physical-phone touch, native phone keyboards, Safari, native browser zoom, and assistive-technology user testing remain unverified. Detailed reports stay in the developer's ignored docs/verification folder.
