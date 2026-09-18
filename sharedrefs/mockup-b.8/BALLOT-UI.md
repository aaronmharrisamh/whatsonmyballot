# B.8 ballot controls and viewer

B.8 / v0.2.0 includes the readable ballot, reusable controls and measured paper camera completed in Part 3.

## Readable ballot

Each header and option resolves its own opinion and information. Missing content leaves a visible dashed, disabled button. A selected party never supplies the header's missing note. Information includes assigned details, useful source links and attached resources; general provenance does not enable it.

Personal choices use one outer oval and a smaller filled oval, with a clear gap. Recommendation arrows and OR labels stay visible after a personal mark. Guide suggestions can exceed a section's vote limit; personal choices cannot.

Opinion buttons have stable dimensions. Expanded opinions use a smaller scale plus an upward chevron. A nonrecommended opinion has an asterisk. THIS and OR notes open automatically unless the reader has closed them. Exception opinions keep the normal blue theme.

Only Recommendations and Showing All are the two labels of one saved switch. Reader and viewer share it. Show all choices is temporary for that section and resets on section navigation. Filtering never erases personal marks. A section without recommendations remains present, with a notice and Show all choices.

The map and weighted progress derive from the active ballot's pages, columns, reading order and optional weights. Page labels appear only when supplied. Nearby Back and Next chips include destination counts. Back to Start remains in the reusable renderer behind ballotUI.showBackToStart=false.

## Ballot Viewer

Opening fits the current page with Snap off. Only the current page is mounted. Next/Prev can cross source pages.

| Action | Result |
| --- | --- |
| Snap on | Fit the selected section's width; allow it to extend downward. |
| Snap off | Keep position and zoom; hide the lime focus. |
| Tap a section or its action | Enable Snap and focus it; preserve the clicked control when possible. |
| Next / Prev | Enable Snap, fit the destination width and align its top. |
| All | Fit the current page and turn Snap off. |
| Wheel, Snap off | Zoom around the cursor. |
| Wheel, Snap on | Pan vertically, then settle around a nearby row. |
| Drag, Snap on | Settle on the section under the center; retain a nearby row position. |
| Pinch, slider, + / − | Manual zoom within measured limits; keep the Snap state. |

Limits use current paper and section measurements. Extra pan room remains beyond the paper. A single animation owner handles camera motion. Selection persistence does not cancel focus animation. The lime arrival starts once per newly focused section, then breathes softly. All motion becomes steady under reduced-motion preference.

The floating return button appears when the selected section is outside the canvas. The hint appears after 3 seconds, then 30 seconds, then 60 seconds of idle time; movement dismisses it. Other open dialogs pause it. Backdrop closing requires a pointer press and release on the backdrop. Focus returns to the current opener after the reader rerenders.

## Shared modules

- assets/ballot-ui.js: targetState, scaleIcon, personalOval, actionsView, opinionView, rowView, sectionView, filterView, layoutMap, minimapView, progressView, paperView.
- assets/ballot-camera.js: BallotCamera, cameraLimits and zoomAt. World geometry comes from rendered elements, not historical precinct dimensions.
- CollectionSession remains the only collection/resource owner.
- model.recommendationsFor(ballotId, guideId) includes every contest and only recommended options.
- model.ballotProjection(ballotId, guideId) includes every option plus guide annotations.
- Neither projection takes personal choices or view preferences. The recommendation-only cheatsheet and generated outputs use them through guide-output.js.

The fictional demo demonstrates all four availability combinations for headers and options, an empty straight-party header, choose-two/three suggestions, no recommendations, and opposite Yes/No proposal recommendations. The permanent SCHEMASAMPLE.JSON remains unchanged.
