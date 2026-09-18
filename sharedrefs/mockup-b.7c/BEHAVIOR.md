# B.7C behavior and data

App version 0.2.2; isolated dataset b7c-fictional-ballot-demo; area catalog b7c-sample-areas. B.7C copies B.7B and retains its separate ballot, notes, annotation, and area JSON files. It does not use the B.8 collection architecture.

Notes use companion schema 1.1.0. Section records add headerHighlighted (boolean) and headerColor (blue, green, red, yellow, orange, or gray). Choice records cannot carry those fields. The schema is included at [notes.v1.1.schema.json](../../finishedmockups/Mockup%20B.7C/data/schemas/notes.v1.1.schema.json). Typed drafts, recovery, import/export, and stale-writer protection remain separate from personal choices.

Header opinions render within the header after its buttons. The divider follows the whole header, including an open opinion. A separate Admin flag highlights a header opinion; it is not a THIS/OR ballot recommendation. Only the opinion notice and opinion button receive this highlight. A populated highlighted header opinion auto-opens; other header opinions open by hand. Manual expansion remains view state.

Personal marks retain the outline, white gap, inner fill, and guide overlay from B.7B. Fill and outline follow a highlighted row's preset color. Other rows use the normal slate color. Pointer selection adds no rectangular focus border, while keyboard focus remains visible. A personal selection keeps its guide overlay steady; clearing restores the existing motion unless reduced motion is requested.

Only Recommended / Showing All remains one shared reader setting in both views. The temporary section-local Show all choices control is removed. Filtering never deletes personal choices. The upper Back chip is commented out and is a candidate for later removal; the bottom Back control and lower Next chip remain. Back to Start stays behind ballotUI.showBackToStart=false.

Ballot Viewer keeps both source sides mounted under one camera. Front and Back are separate, top-aligned sheets with the same height, space between them, and titles above. Shorter content leaves blank paper below. Each sheet preserves the source's column order. Opening the viewer and All fit the combined spread with Snap off. Snap, section taps, and Next/Prev fit the selected section width across either sheet. Green focus appears only with Snap on. Unchecking Snap preserves the immediate camera position.

Wheel input zooms with Snap off and scrolls with Snap on. Pinch, slider, and zoom buttons keep their bounded behavior. The widest view fits both sheets; the closest view fits the selected section's width. Opinion and detail actions preserve their clicked-control anchor. Closing and reopening the viewer resets to the full spread.

The [active-line configuration](../../finishedmockups/mockups.json) continues to select lettered B.7 successors. B.8 stays excluded. Earlier mockup folders and their public reference notes are preserved.
