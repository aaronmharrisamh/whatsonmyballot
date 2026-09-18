# Part 3 verification

Scope: shared ballot controls, recommendation states, dynamic maps and progress, paper layout, and Snap camera.

- **17 interaction groups** pass in Edge: all four own-content combinations, personal oval separation, opinion button states, saved hidden choices, temporary reveals, synchronized filters, page-fit opening, Snap and All, cursor zoom, slider limits, anchored note/detail actions, wheel scrolling, dragging, two-finger pinch, reduced motion, backdrop/focus return, both proposals, imported layouts, and responsive accessibility.
- **5 extended groups** pass: focus animation survives asynchronous selection saves; Next/Prev crosses source pages; choose-two personal limits remain separate from guide suggestions; resize and the offscreen return control work; idle reminders follow 3/30/60-second timing and pause behind another dialog.
- **17 existing workspace groups**, **8 storage transaction groups**, **8 failure/recovery groups**, and **63 collection contract checks** pass.
- Reader and viewer pass automated WCAG A/AA checks at 320×568, 390×844, 844×390 and 1440×960. Screenshots were inspected. Reader text is not reduced to fit the phone.
- Tests exercise an imported ballot with different counts, no straight-party contest, empty columns and long text, plus the unchanged permanent blueprint.
- The presentation demo adds two neutral fictional notes to demonstrate a header with opinion-only content and an exception opinion in the opening section. No personal choices are prefilled.
- The separate Part 3 package is built and tested from the release manifest. Earlier mockups, shared references, three prior stage/release ZIPs and the permanent blueprint are checked against preservation hashes.

Reports and screenshots are in ignored tools/ui-check/artifacts/b8-part3 and docs/verification. Browser tests use desktop Edge, resized viewports and emulated touch input; they are not a physical-device audit. Final recommendation cheatsheet, generated PDFs and print verification remain in Part 4.

App version remains v0.1.8. Part 4 targets v0.2.0.
