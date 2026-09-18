# B.3: One section, more room

[Open B.3](../../finishedmockups/Mockup%20B.3/index.html), or [open the app alone](../../finishedmockups/Mockup%20B.3/app.html). B.3 is part of app **v0.1.4**.

## Start with one section

The preview shell opens in **Phone view**, including on desktop. The Desktop button remains available for comparison.

The app opens one readable ballot section. The former view toggle, section-finder button, and Skip button are removed. Use **Back** and **Next** to move through the 28 sections. Next leaves any unmarked section undecided. The last section leads to My guide.

A small ballot map sits to the left of Back. It stays visible while the section scrolls. Its green mark follows the selected section.

## Open the whole-ballot tool

Tap the bottom map to open a nearly full-screen ballot dialog with a dimmed backdrop and a large **X** close button.

It first shows the full current source page. The lower row contains four chips:

- **Extents** shows the full current page.
- **Section** fits the selected section across the window.
- **Prev** moves to the previous section.
- **Next** moves to the next section, including the other source page.

Pinch to zoom and drag to pan. On a computer, ordinary scrolling pans and Ctrl-scroll zooms. Arrow keys pan the focused canvas; Home shows the page.

Tap a ballot section to select it. Its green border and tools show which section is active. The label above the canvas follows what is actually in view. The page indicator also shows the selected section's position among all 28 sections.

Close the tool to read its selected section in the main view. Closing without changing sections restores the prior reading scroll position.

## Keep working inside the tool

The ballot tool keeps the B.2 selection marks, inline neutral synopses, information dialogs, gray opinion panels, and write-in editor. Opening information at reading size preserves the ballot position. A distant view zooms toward the clicked row.

Information and Admin editors open above the ballot tool. Escape closes the top window. Tab and Shift+Tab stay inside it. Save, Cancel, Restore original, draft recovery, and unsaved-change guards remain available.

The idle pinch reminder runs only while the ballot tool is available. It pauses while an information or editing dialog is open. Closing the tool removes its canvas and listeners.

## Data and source

Personal selections, party marks, content, and notes keep their existing storage namespaces and schema versions. B.3 reuses the same 148 stable note targets and all 28 printed ballot sections. A party mark remains separate from individual races.

The opinions use neutral demonstration text attributed to a fictional editor. Previously saved notes take priority. Content and notes JSON exports exclude personal choices.

The historical source remains **Akron Township, Precinct 1AF, November 5, 2024**. [Open the original sample PDF](../ballots/2024-11-05-akron-1af.pdf). Candidate profiles are examples. This personal guide does not cast a vote.

[Verification](VERIFICATION.md) describes the checks and their limits. The local tools/launch.bat file discovers B.3 as the latest ready mockup. Development tools and detailed reports remain ignored by Git.
