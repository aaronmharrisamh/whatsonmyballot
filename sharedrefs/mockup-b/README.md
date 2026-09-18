# B1: The ballot comes first

Open [B1](../../finishedmockups/Mockup%20B/index.html) through the local preview or your Pages site. [Open just the app](../../finishedmockups/Mockup%20B/app.html) for a direct phone check. B1 is part of app release **0.1.1**. [version.js](../../version.js) supplies the visible version.

## Two ways to read

**Whole ballot** opens first. It uses the complete two-page historical sample with all 28 printed items and 78 candidate/ticket entries. Fit fills the canvas width. Drag, scroll, or use the Move buttons to move through the page. Pinch, Ctrl-scroll over the canvas, or use the zoom controls to look closer. Zoom runs from 0.25× to 6× the fitted width. The 2× and 3× buttons are quick stops. Reset returns to Fit width and the top of the current page. Front/Back changes the source page and resets its view.

**One section** shows one race in ordinary HTML, with the same section bar, title, instruction, ovals, and ruled candidate rows. It does not use the zoom canvas. Next, Back, and Skip move through the 27 candidate races. Find a race opens that race in the current reading mode. In the virtual ballot, it moves to the matching source page and brings the race into view.

A chevron expands a short explanation in place. A magnifying glass opens a longer reading dialog beside the same content. The dialog remains outside the zoom transform and does not move the ballot. Profiles and explanatory text remain labeled examples.

Small controls in the scaled ballot have full-size equivalents in One section. That view remains available above the canvas. The Straight Party Ticket item is preserved as a source reference; choices are recorded race by race.

## Try B1 in five minutes

1. Open the whole ballot. Try 2×, 3×, dragging, Move, and Reset. Switch to the back page.
2. Use Find a race to open a race. Open a chevron, then a magnifying glass. Close the reading dialog and check your place.
3. Mark an oval. Confirm that a choice does not move you ahead.
4. Choose One section. Use a write-in, clear a race, or Skip. Open My guide to review the choices and the [original sample PDF](../ballots/2024-11-05-akron-1af.pdf).
5. Open Admin. Edit a short field, try Cancel, then Save. Return to the ballot. A1–A5 and B1 share saved choices and text at this site.

The desktop preview opens wide. Use Phone to compare a phone frame. On a phone, the app fills the available width. A designs returns to the earlier mockups; a dirty editor draft must be resolved before that switch.

## Content, theme, and limits

The source remains **Akron Township, Precinct 1AF, November 5, 2024**. Lake Orion remains a later source replacement. The PDF, profile Markdown, and source provenance are shared with A. Content schema and baseline remain `1.0.0`; the app version is separate. The existing [content editing rules](../mockup-a/CONTENT.md) and [hosting instructions](../mockup-a/HOSTING.md) apply.

The [District 9 website](https://midistrict9.org/) supplied the visual reference: a muted USA flag, warm neutral backgrounds, and dark headings. B1 uses navy, soft white, small red accents, and a simple flag mark. It uses no party logo or voting recommendations. No external font or image is needed at runtime.

Use the same ballot task when comparing B1 with A. Record whether the whole-ballot view helps people find their place, whether they notice One section, and whether the chevron and magnifying glass are clear. Physical-phone, native browser-zoom, Safari, and assistive-technology user testing remain follow-up checks. Automated touch emulation is not a physical-device pass.

| Review item | Device / browser | Observation |
| --- | --- | --- |
| Find and read a race in the whole ballot | | |
| Pinch, drag, and Reset without losing your place | | |
| Open quick notes and full information | | |
| Read One section without zooming | | |
| Reach controls in portrait and landscape | | |
| Edit text with the phone keyboard open | | |

See the [recorded B1 checks](VERIFICATION.md). The public project layout includes both A and B, all shared references, and the root preview helper. Run `node preview.mjs` from the repository root. Local research, tools, and agent instructions are excluded from the public app.
