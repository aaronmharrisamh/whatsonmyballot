# Phase 1 final verification

## App v0.1.0: Shared references and clone setup

The public site now uses root `sharedrefs/` and `version.js`. `docs/`, `tools/`, `.claude/`, `AGENTS.md`, and `CLAUDE.md` are local and ignored by Git. Research files are not runtime dependencies. Copy the public project layout or extract the complete ZIP; Mockup A alone is not a standalone site.

Checks repeated for this update passed: the 59 content checks; source transcription and unchanged PDF hashes; the visitor/shell run with 15 pass records, 15 axe states, and 28 layout checks; and all 15 Admin groups with nine axe states and 12 layout checks. The new shared-reference run passed at both root and repository-prefixed URLs, including the PDF bytes, profile Markdown, guide links, version labels, two axe states, and six footer layouts. A phone-width screenshot was inspected. No browser errors or external runtime requests were recorded in these successful runs.

The public-link audit checks HTML, Markdown, and JavaScript imports against the release file list. The versioned ZIP includes the root preview helper, `sharedrefs/`, and `version.js`. Its package check verifies the extracted files against the manifest, exercises visitor and Admin flows, and checks that private local paths are absent. Detailed reports and the ZIP checksum stay in ignored `docs/verification/`.

Content schema `1.0.0`, baseline `1.0.0`, dataset IDs, and stable document keys are unchanged. The registry resolves the old keys to shared files, so existing valid exports remain compatible. The app version is a separate value read from [version.js](../../version.js).

The earlier Phase 1 evidence below remains a historical record. Physical-phone and native browser-zoom checks remain unverified.


Checked on September 12, 2026. This covers the visitor interface, preview shell, and durable Admin content flows. It is not an accessibility certification or evidence of a client user study.

## Part 4: Final integration and handoff

The final run passed **59 content/storage checks**, the complete visitor/shell regression, **15 Admin behavior groups**, and **seven additional integration groups**. The latter include the isolated Yes/No fixture, a keyboard-only walkthrough through **22 controls**, saved content and choices across A1–A5, transfer into a fresh browser context, actual printed PDFs, and landing/direct links.

The schema file and standalone validator agreed on ten valid/invalid fixtures. A static-link audit checked the portable HTML and Markdown links. All five real gallery captures were inspected. A4 deliberately puts more text before the names and requires more scrolling.

Print samples contain all **27 races**, one labeled layout-test write-in, and **26 undecided rows**. Choices-only output is **three A4 pages**; optional explanations use **six pages** for that test state. Paper controls are hidden in print, page margins are 14 mm, and section headings stay with their rows. The generated print pages were inspected in addition to text assertions.

The deliverable includes a ZIP with an entry page, `.nojekyll`, all source/data/assets, a file-hash manifest, and `preview.mjs`. Its extracted copy is checked with that helper: visitor flow, PDF, durable Admin save, export, gallery, and hosting paths. The full repository's root entry preserves a repository-name URL prefix.

The [client walkthrough and feedback sheet](REVIEW.md) and [hosting guide](HOSTING.md) complete the local handoff. Detailed final reports, the ZIP checksum, the verification matrix, and printed PDFs are retained in the repository's `docs/verification` folder.

## Part 3: Content and Admin checks

The content contract and storage runner passed **58 checks**, including schema/version rejection, unknown fields, IDs and relationships, protected ballot fields, safe links and Markdown, canonical round trips, one-write saves, previous versions, failed writes, conflicts, namespace isolation, and recovery.

The Admin browser runner passed **15 behavior groups** in Edge 153.0.4234.32. It checked reload persistence, all editor types, original restoration, export without personal choices, import errors and size limits, preview cancellation, explicit import commit, previous-version restoration, matching recovery, stale recovery export, import recovery, denied/full storage, concurrent tabs, corrupt saved-content restoration, and hosting-path isolation.

Admin checks passed **10 additional axe states**: the panel, Markdown editor, source validation error, import preview, import discard guard, recovery offer, failed save, tab conflict, stale recovery offer, and candidate detail editing controls. Visible Edit labels are included in their accessible names. **12 additional layout checks** cover the panel and Markdown editor at five widths, the short landscape editor, and the import preview. Editor footers stayed visible. Save returns focus to the originating control where it still exists.

The full visitor/shell regression passed again with **15 axe states** and **28 layout checks**. Its results contain 14 behavior groups plus a Chrome version record. Touch/spacing checks passed all 24 cases, and the copied bundle loaded without external requests or missing assets. The source audit passed with unchanged PDF hashes.

No live website was fetched by imported or edited source links. Saved content, recovery files, and personal choices remained separate. JSON exchange embeds Markdown and preserves its meaningful whitespace. See [CONTENT.md](CONTENT.md) for the exact contract and local-storage limits.

## Browsers and behavior

Microsoft Edge **153.0.4234.32** passed the visitor, Admin-interface, and shell checks. Google Chrome **152.0.7977.83** passed a visitor-flow smoke check. Both were controlled headlessly with Playwright 1.63.0.

The checks cover all 27 candidate races, official option order, write-in counts, terms, limits, native radio keyboard behavior, explicit Next, Skip confirmation, direct race navigation, review return, the matching PDF, and print CSS. A generated print sample retained all 27 review rows.

They also cover A1–A5 direct links, increasing A1–A4 density, default A5, Markdown details, Escape and focus return, Admin draft reversion, Save/Cancel/Restore original, guarded design changes, and device changes with an open draft. Demo selection and content resets stayed separate. Denied and corrupt visitor storage did not prevent use.

A copied standalone folder loaded without external runtime requests. The app also loaded under a repository-like URL prefix. The checked run reported no JavaScript errors or failed runtime requests.

## Layout, gestures, and accessibility

All five race designs were checked at widths of **320, 390, 768, 1024, and 1440 CSS pixels**, plus landscape and enlarged-spacing cases. Separate checks covered home, review, Help, and Admin at all five widths. Main content reflowed, and the action bar did not cover its scrolling area.

A 200% CSS text-enlargement stress check at 320 px exposed overflow in long party labels. Wrapping was corrected and the check passed. A short 390 px-high viewport kept the editor footer reachable. These are simulations, not real keyboard or native browser-zoom tests.

Chromium CDP two-finger input reached 2.5× zoom and reset correctly. Front/Back switching preserved the 17 front and 11 back ballot items. Closer zoom clamped at 6×. Pan bounds, reset, detail return, and suppression of a click after dragging passed.

Automated axe checks covered **15 screen/state combinations**, including welcome, candidate details, Markdown, multi-choice, row review, paper view, large paper-detail controls, Admin, A1–A5, gallery, and mobile shell. They reported no unhandled violations in the configured WCAG A/AA checks.

One exception is explicit: scaled paper detail buttons are excluded from automated target-size measurement. Each has an equivalent full-size button under **Find a race**. That unscaled picker contains all 28 items and passed its own axe check. The rest of the paper checks stay enabled. This uses the equivalent-control provision in [WCAG 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html); it does not claim the tiny fitted controls themselves meet the target size.

Manual color calculations checked text, labels, borders, focus rings, and dark footer states:

| Pair | Ratio |
| --- | ---: |
| Main text on white | 15.52:1 |
| White text on the red primary action | 6.57:1 |
| Input border on white | 3.71:1 |
| Blue focus ring on white | 5.41:1 |
| Footer button border on its normal surface | 5.13:1 |
| Footer focus ring on charcoal | 7.23:1 |

The source audit still passes. It compares every printed column with extracted text, validates the shared records, and rejects ten deliberate data errors. The two-page PDF is unchanged.

## Remaining checks and work

No physical phone, real on-screen keyboard, native browser-zoom controls, Safari, or Firefox was tested. Real phone checks of gestures, zoom, and editor reach remain necessary. Automated checks do not replace reading, assistive-technology, or client testing.

Durable Admin content storage, schema validation, recovery, revision conflicts, and JSON exchange are complete. This remains a local demo without authentication or a shared database. Phase 1 is complete for the recorded test environment. The next step is client comparison and the physical-device checks listed in REVIEW.md; no client result or device pass is inferred.

In the repository, scripts are under tools/ui-check and retained reports are in docs/verification. The gallery captures are bundled in assets/previews.
