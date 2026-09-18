# B.1: Keep your place

[Open B.1](../../finishedmockups/Mockup%20B.1/index.html) through the local preview or Pages site. [Open the app alone](../../finishedmockups/Mockup%20B.1/app.html) for a direct device check. This mockup is part of app **v0.1.2**.

## Ballot navigation

Previous and Next move through all **28 printed sections**, in source order. The count includes Straight Party Ticket. Tap a section to select it. The next section can be on the other source page.

The selected section has a lime border, a text label, and lime controls. Its outline starts 20% beyond each edge and reaches the section border over 1000 ms. A soft green glow then breathes around it. Reduced-motion settings turn these animations off.

**Zoom Section** fits the selected section's width to the canvas. The section can continue below the window; drag or scroll to read it. **Zoom Extents** shows the entire current source page and keeps the selected section. Pinch and drag to explore, then use Zoom Section to return. The old Move, 2×, and 3× buttons are removed.

On a computer, Ctrl-scroll zooms and ordinary scrolling pans. Arrow keys move a focused canvas; plus/minus zoom and Home shows the full page. One section remains available for ordinary HTML reading.

## Notes and choices

- The chevron opens one neutral sentence about the item.
- The magnifying glass opens more information.
- The scales open **Opinion**, with the author's name and an optional source link.

All sections, candidate entries, party options, and write-in slots have note controls: **148 targets**. Opinions start empty. The gray opinion panel keeps attributed views separate from the neutral synopsis. Use Admin to add text.

A selected option shows a count such as **1/2*** when one of two possible choices is marked. The star means fewer than the allowed number are selected; choosing fewer is allowed. The count includes write-ins. A write-in name saves as you type it. Its opinion is attached to the fixed write-in slot, not to a visitor's private name.

Straight Party Ticket remains a source reference in this guide. Its neutral synopsis and opinions are available, but it does not fill other races.

## The reminder

The first **Pinch & Zoom** hint appears after 3 seconds without activity. Pointer movement, touching, scrolling, typing, or navigation dismisses it. The next idle wait is 30 seconds, then 60 seconds for each later reminder. Dialogs and hidden pages pause the hint. It never blocks a control.

## Edit and move notes

In Admin, choose a note under **Synopses and opinions**, or turn on Edit buttons and open a note. Save, Cancel, Restore original, and unsaved-change guards work in the same dialog. Restore original fills the draft; Save keeps it. Draft recovery and checks for changes from another tab are included.

**Export notes JSON** and **Import notes JSON** move the new notes. An import shows changed text before it is saved. Ballot-content import/export remains available separately. Neither export includes personal choices.

The companion [notes JSON](../../finishedmockups/Mockup%20B.1/data/notes.seed.json) has format `whatsonmyballot-notes`, schema `1.0.0`, dataset ID, revision, and stable target IDs. Each target has a neutral synopsis, author, opinion, and optional HTTPS source. These notes have a separate browser-storage record, shared by future B revisions at the same site path. The original ballot content schema and IDs remain unchanged.

The historical source is still **Akron Township, Precinct 1AF, November 5, 2024**. It is not a current Lake Orion ballot. [Open the original two-page PDF](../ballots/2024-11-05-akron-1af.pdf). Candidate profiles remain labeled examples.

## Review on a device

Try a section with two choices, a long candidate list, a write-in, and a page change. Check that you can select a section from Zoom Extents, read its notes, pan down, and return with Zoom Section. Test portrait and landscape, a phone keyboard, reduced motion, and your preferred browser.

Browser tests use emulated touch. Physical-phone, Safari, native browser zoom, and assistive-technology user checks remain follow-up work. See [verification](VERIFICATION.md).

For local use, double-click `tools/launch.bat`. It now understands B.1, B.2, and B.10. The tools folder remains local and ignored by Git.
