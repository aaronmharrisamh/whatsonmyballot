# B.5 / v0.1.6 review guide

Open [the B.5 preview](../../finishedmockups/Mockup%20B.5/index.html). Phone view is the default.

## Read a populated guide

The first visit loads 28 fictional sections with 148 neutral placeholder opinions, 55 red THIS/OR guide marks, and personal choices in 21 sections. Names such as Sample Person and Example Group are fictional. Random marks demonstrate the interface; they do not recommend real candidates or parties.

- A filled oval is a personal choice.
- A faint checkmark inside an oval is a guide THIS mark.
- A faint OR inside an oval is a guide alternative.
- Marked rows have a red highlight and an open sample opinion.
- Show opinion guide hides the guide colors, symbols, and automatic opinion openings. Personal choices remain. You can still open any opinion by hand.
- Back and Next chips outside the section show nearby section names. Clear Selection clears only the current section.

The bottom Ballot Viewer map opens the full paper. Both navigation methods keep the selected section in sync.

## Explore the paper

The viewer sits inside a dimmed backdrop. Its plus pattern stays fixed while the paper pans and zooms. The paper uses three joined columns, gray section headers, right-side ovals, and portrait proportions based on the supplied layout reference. Page two keeps the reference's blank third column.

Only the active section expands to show controls and sample opinions. Zoom returns to a compact whole-page view. The plus/minus buttons and slider share one vertical capsule. Pinch remains available at any time.

Snap starts off. Prev and Next fit the active section to about 75% of the viewport width. With Snap on, navigation fits the full width. Releasing a single-pointer drag near a section selects the section under the center, recenters it, and keeps the nearby row at roughly the same screen height. Pinch does not trigger a snap.

A labeled arrow hugs the viewer edge when the selected section is mostly offscreen. Select it to return. The green frame uses fixed screen-pixel edges; its arrival animation runs when the selected section changes.

## Edit and reset

Admin keeps text, opinions, and guide marks separate from personal choices. Save, Cancel, Restore original, draft recovery, revision checks, and JSON import/export remain available. All changes stay in this browser.

Demo > Example selections reloads the bundled personal choices. Clear personal choices stays clear after a reload. The seed runs only for a new B.5 visitor save. Restoring original guide marks returns to the populated fictional baseline.

The [data contract](DATA.md) describes dataset isolation and the versioned fixture. The [verification record](VERIFICATION.md) describes checks and limits. The [original PDF](../ballots/2024-11-05-akron-1af.pdf) remains available as a clearly labeled layout reference.
