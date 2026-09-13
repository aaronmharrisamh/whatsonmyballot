# B.2: Stay with the ballot

[Open B.2](../../finishedmockups/Mockup%20B.2/index.html), or [open the app alone](../../finishedmockups/Mockup%20B.2/app.html). B.2 is part of app **v0.1.3**.

## Look around

The single toolbar has **Extents**, **Section**, **Prev**, and **Next**. Extents shows the whole current ballot page. Section returns to the green selected section and fits its width. Prev and Next visit all 28 sections, including the second page.

The bold label above the ballot describes the section that occupies the most visible space. It says **Whole Ballot** when the page is zoomed out. Panning changes this label while the green selection stays in place.

Tap a section to select it. Its lime border arrives over one second, then glows softly. Pinch, drag, or scroll to move. Ctrl-scroll changes the zoom. Arrow keys pan the focused canvas; Home shows the page. Reduced-motion settings remove the animations.

## Open information

Only the selected section shows its chevrons and two large buttons.

- Tap ballot text or its inline chevron to show one neutral sentence below it.
- Tap the magnifying glass for more information.
- Tap the scales for an attributed opinion in a gray panel.
- Tap the separate oval to mark a choice.

Information opens without moving a ballot that is already at reading size. From a distant view, the ballot zooms toward the clicked row and keeps its vertical place in the window. Page boundaries can limit this movement.

**One section** uses ordinary HTML scrolling. Its upper-right map shows both ballot pages and the selected section. Tap the map to find a section.

## Marks and opinions

SVG files draw the complete empty, checked, and partial marks. **1/2*** means one of two choices is marked; **1/3*** and **2/3*** work the same way. You can leave a section partly marked. Write-in names count toward the limit.

Straight Party Ticket accepts one party mark. This demo saves it separately and does not fill other races. Its section-level opinion opens the note for the selected party. Each party has its own editable note. The guide lists the party mark alongside the other 27 sections.

All 148 note targets start with **neutral demonstration text**, attributed to **Demo editor (fictional)**. These are placeholders for reviewing the feature, not party endorsements. Previously saved notes take priority, including empty notes. The local Admin can edit each synopsis, author, opinion, and source link.

Save, Cancel, Restore original, draft recovery, import review, and stale-save checks remain available. Restoring an original note fills the draft; Save keeps it. Notes JSON and ballot-content JSON exclude personal choices.

## Data and reuse

The [notes seed](../../finishedmockups/Mockup%20B.2/data/notes.seed.json) retains companion schema **1.0.0**, its 148 stable IDs, dataset ID, and revision. B.1 and B.2 share saved notes at the same site path. The new party-choice save has its own format and schema **1.0.0**; existing individual-race saves remain compatible with the earlier mockups.

The minimap module builds source page and column order from the ballot JSON. It estimates section heights from the content and can accept measured section sizes for more accurate proportions. It is a schematic overview, not a PDF image.

The source remains **Akron Township, Precinct 1AF, November 5, 2024**. [Open the actual sample PDF](../ballots/2024-11-05-akron-1af.pdf). Candidate profiles are examples. The personal guide does not cast a vote.

The 3-, 30-, and repeating 60-second idle reminder remains available. Movement dismisses it; dialogs pause it.

[Verification](VERIFICATION.md) lists the checks and their limits. For a local preview, double-click the ignored tools/launch.bat file. It discovers B.2 as the latest ready mockup.
