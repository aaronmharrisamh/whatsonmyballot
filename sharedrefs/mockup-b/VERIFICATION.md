# B1 verification

App version: 0.1.1. Source: the existing complete 2024 Akron Township 1AF historical sample.

The B1 browser checks cover both source pages, all 78 candidate/ticket entries, opening on the virtual ballot, inline chevrons, full profile and Markdown dialogs, position retention, saved choices, zoom stages, bounds, keyboard movement, emulated two-finger pinch, and Reset.

The section-view checks cover source order, single and multi-choice limits, write-ins, Skip, readable review, and the source PDF. Admin checks cover dirty guards, saved edits, export without personal choices, and the same saved data opening in A. Responsive checks use widths from 320 to 1440 CSS pixels. A repository-prefixed URL exercises B1 and its shared references.

Edge 153 automated checks passed: seven main behavior groups, five additional preview/print checks, eight accessibility states, 20 app layouts, and two extra phone-shell layouts. These runs recorded no browser errors, failed resource requests, or external runtime requests. Accessibility results use the scaled-control exception described below. Touch was emulated through Chromium CDP.

The exact reports and screenshots are retained in the developer's ignored `docs/verification/` folder. The portable release manifest identifies the packaged public files. No physical phone, real phone keyboard, native browser zoom UI, Safari, or assistive-technology user pass is claimed.

Only target-size measurements for the scaled ballot controls are excluded from that view's automated accessibility check. The same content is available with full-size controls in One section, which is checked separately. The rest of the ballot's accessibility checks remain enabled.

Read the [B1 guide](README.md) for the client walkthrough and device-review worksheet.
