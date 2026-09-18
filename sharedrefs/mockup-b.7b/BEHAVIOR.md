# B.7B behavior and data

App version 0.2.1; isolated dataset b7b-fictional-ballot-demo; area catalog b7b-sample-areas. Content, notes, annotations, and catalog versions remain 1.0.0. B.7B starts from B.7's separate JSON files, local editor, and camera.

Each control uses the exact item's own content. Opinions never fall back from a selected party to the section heading. Details may contain the item's synopsis, relevant HTTPS source, candidate website, assigned editorial prose, or assigned document. A title, voting instruction, portrait, opinion alone, or general ballot provenance does not activate the magnifier. Detail rendering uses the same resolved content as availability.

Notes accept a blank synopsis; when supplied, it remains subject to the existing length and one-sentence checks. The Straight Party header keeps B.7's notes-only detail presentation. Candidate editorial validation remains unchanged. The demo includes three empty-detail examples: the Straight Party header, Example Group D, and one write-in slot. Candidate profiles remain populated.

A selected oval uses two ellipse shapes separated by a white gap. The guide arrow/OR and caption stay visible; their motion and oval glow stop for a personal selection. Clearing that selection restores the existing motion, subject to reduced-motion settings.

The recommendation filter remains one shared boolean, with labels Only Recommended and Showing All. Temporary Show all choices still resets on section navigation and never deletes personal marks. Back to Start remains implemented behind ballotUI.showBackToStart=false.

Every viewer opening fits the current page with Snap off. Snap, section taps, and Next/Prev enable section-width fitting. Row controls preserve a comfortable view; opening an opinion during a fit must not cancel its zoom. Snap controls the green outline and offscreen indicator. Unchecking Snap preserves the immediate camera position. All fits the current page and disables Snap. Free pinch and wheel zoom remain bounded between page fit and section width; with Snap on, wheel input scrolls. The source's existing page boundaries and 1020px paper coordinates remain unchanged.

The [active-line file](../../finishedmockups/mockups.json) tells the local launcher to follow B.7 from suffix B upward. B.8 is excluded as outmoded. Update this small configuration deliberately when changing development lines; folder modification times do not determine the current mockup.
