# What's on My Ballot? — Mockup A

Phase 1 is complete. Open [A5](../../finishedmockups/Mockup%20A/index.html?design=a5) through HTTP or GitHub Pages. A new browser starts with blank choices. All five designs share one ballot and one visitor guide.

Use the [client walkthrough and feedback sheet](REVIEW.md) for a short review. Preview and deploy the public repository files directly. The root [file manifest](../../release-manifest.json) records those files; shared references and the Node preview helper stay in the repository.

## Five designs

| Design | Visible information |
| --- | --- |
| [A1: Simplest](../../finishedmockups/Mockup%20A/index.html?design=a1) | Race, official instruction, names, choices, and navigation. Details start closed. |
| [A2: Light guidance](../../finishedmockups/Mockup%20A/index.html?design=a2) | Adds a purpose sentence and next-step cue. |
| [A3: More context](../../finishedmockups/Mockup%20A/index.html?design=a3) | Adds a candidate overview line and status above the choices. |
| [A4: Most detailed](../../finishedmockups/Mockup%20A/index.html?design=a4) | Shows the office explanation, full summaries, and source metadata. It requires more scrolling. |
| [A5: 2026 UX Developer's Choice](../../finishedmockups/Mockup%20A/index.html?design=a5) | Short guidance and visible choice status. Candidate details open on request. |

A5 is a design recommendation, not a result from a user study. No design removes candidates or changes selection limits. The gallery screenshots show the same congressional race with blank choices. Copy uses short, familiar STE100-style English; no certified language review is claimed.

## Visitor flow

1. Confirm the sample area and press **Start my guide**.
2. Choose a name, then press **Next**. **Details** does not select a candidate. A presidential ticket is one choice.
3. **Skip** leaves a race undecided. If it has choices, confirm that they should be cleared. **All races** opens direct navigation.
4. **Review** brings the choices together in readable rows. **Change** opens a race with a route back to review.
5. Open the source PDF or print the guide. Undecided races can stay undecided.

Multi-seat limits include write-ins. Empty write-in fields do not count. An excess choice is rejected with an explanation, preserving earlier choices. **Clear this race** also works for single-choice races.

The printed Straight Party Ticket section is preserved as a reference. It does not fill other races automatically. This guide records individual race choices. No voting recommendations or partisan opinion overlay are included.

## Paper view and print

Rows open first. **Show ballot view** opens a semantic HTML guide with **Front** and **Back** pages. Both pages together preserve all 28 source items.

Use **Fit**, **2×**, and **3×**, or plus/minus for closer views up to **6×** the fitted size. Pinch and dragging are optional. Direction buttons move the paper. Reset restores Fit and centered bounds. A page change starts that page at Fit; resize recalculates bounds.

Details open in an unscaled window without moving the paper. **Find a race** provides full-size buttons for the same details when the fitted paper controls are small.

**Open official sample ballot (PDF)** opens the matching source in a new tab. Choices and Admin edits never change it. **Print my guide** always prints readable rows, including from paper view, and hides the shell, navigation, and editing controls. **Show explanations** adds labeled example text to review and print.

## Preview shell

On a phone, the app fills the width above the preview footer. Desktop starts with a fitted 390 × 867 outer phone frame. **Desktop/Mobile** switches the device. **Fit** toggles fitted and actual size on desktop; on a phone it returns to full-width mobile view.

Changing device preserves the page, choices, and editor draft. Changing design uses the same live app. A dirty draft first offers Save, Discard, or Keep editing.

**5 designs** opens the manual gallery. Use its buttons or arrow keys; it never advances automatically. [Open the gallery directly](../../finishedmockups/Mockup%20A/index.html#mockups).

**Demo** contains Start fresh, Example selections, Clear personal choices, Restore original content, and Developer notes. Each reset explains its scope. The optional example uses one labeled demo write-in and does not recommend a real candidate. Nothing is preselected without an explicit action.

## Admin editing

Open **Admin** and choose a content group, or turn on Edit buttons and open a race. Editors cover race titles, candidate names and websites, summary and detail text, office explanations, source details, and the shared Markdown example. Preview uses the same Markdown renderer as the reader.

- **Save** validates and keeps the complete content record in this browser. Reload preserves it.
- **Cancel** keeps the saved content and guards a dirty draft.
- **Restore original** fills the draft; Save applies it. Returning a field to its saved value clears dirty state.
- **Export saved content** downloads versioned JSON with embedded Markdown and no personal choices.
- **Import** validates a file, shows changed groups, and waits for **Apply import**.
- **Review previous saved version** and **Restore original content** preview a replacement while keeping personal choices.

Draft recovery is separate from saved content. A returned draft is offered for recovery, never applied automatically. A failed save keeps the draft and offers Retry or a recovery export. Another tab's save blocks a stale draft from replacing newer content.

Changes to printed titles, names, and source details are marked as local edits. The source PDF stays unchanged. The Admin button is a local demo control, not authentication. See [the content guide](CONTENT.md) for the schema, limits, recovery, and storage behavior.

## Source and content

This is **Akron Township, Precinct 1AF, Tuscola County, Michigan — November 5, 2024**, the authorized fallback. Lake Orion remains preferred once its exact historical ballot is verified.

The [seed](../../finishedmockups/Mockup%20A/data/ballot.seed.json) contains 28 ballot items: 27 candidate races and the straight-party section. It preserves 78 candidate/ticket entries, seven party options, and 35 write-in spaces. Eight entries are paired tickets, for 86 named people. This style has no proposals.

The [sample excerpt](../ballots/2024-11-05-akron-1af.pdf) contains viewer pages 1–2 of [Tuscola County's original collection](https://www.tuscolacounty.org/elections/2024/11/2024-11-05%20Sample%20Ballots.pdf). [Provenance](../ballots/2024-11-05-akron-1af-provenance.json) records the hashes and mapping. The unchanged county original remains in the developer's ignored docs/references folder and is not required by the published app.

Profiles are labeled **Example content**. The shared [Markdown profile](../candidates/profile-example.md) demonstrates the format; no website was archived. Website fields explicitly say that no verified link has been added. The portrait is generic. Null party and term fields mean those labels were not printed.

## Data handoff

The seed format is `whatsonmyballot-content`, schema version `1.0.0`, dataset `mi-2024-11-05-tuscola-akron-1af`, baseline `1.0.0`, and content revision `0`. IDs are assigned once and retained. Edited names and array positions are not saved-choice keys. A1–A5 use [shared settings](../../finishedmockups/Mockup%20A/data/variants.json).

Visitor choices are stored separately under a key containing the app path, dataset, and guide format. Loaded choices are checked against race IDs, candidate IDs, and limits. Missing, corrupt, or denied storage leaves a new or temporary guide. Clearing choices never clears unrelated storage.

Admin maintains a frozen original, the latest saved content, and a separate draft. The [schema](../../finishedmockups/Mockup%20A/data/schemas/ballot-content.v1.schema.json) and compatibility checks protect IDs, ordering, limits, dates, and PDF mappings. A single storage write preserves the new and previous valid versions. Content and recovery never write into the choice key.

The Markdown wrapper uses locally bundled marked and DOMPurify, with limited tags, HTTPS links, and validated bundled document links. It does not execute raw HTML or fetch candidate websites. The seed keeps stable document keys; the [reference registry](../registry.js) resolves them to shared files, and every export embeds the saved body. This keeps prior valid saved content and exports compatible after the folder move.

## Serve or relocate

Keep the public project layout together: root entry files, `version.js`, `finishedmockups/`, and `sharedrefs/`. There is no runtime backend, CDN, remote font, or AI dependency. Development tools are not needed by the published app.

From the repository root, run `node preview.mjs`, then open `http://127.0.0.1:4173/finishedmockups/`. No package installation is needed. Use HTTP; opening HTML directly with file: does not reliably support modules and JSON requests.

For GitHub Pages, publish the public project layout and use its finishedmockups path. The Mockup A folder alone does not include its shared references. Files are prepared locally; they have not been committed, pushed, or published.

See [verification](VERIFICATION.md) for actual checked browsers and remaining device checks. The next step is a client comparison and the remaining real-device checks in [REVIEW.md](REVIEW.md). [HOSTING.md](HOSTING.md) explains local preview, moving content, and GitHub Pages preparation.
