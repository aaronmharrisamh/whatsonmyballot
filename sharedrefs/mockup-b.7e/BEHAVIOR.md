# B.7E behavior and data

App version 0.2.4; isolated dataset b7e-fictional-ballot-demo; area catalog b7e-sample-areas. B.7E is a direct copy of B.7D. Ballot, notes, annotations, and area schemas are unchanged. No B.8 code or architecture is used.

My Guide projects saved Admin annotations, never visitor choices. It lists every THIS and OR choice with its matching opinion when that opinion has content. It keeps the recommendation and optional labels distinct. The guide omits unmarked choices, races without recommendations, neutral profiles, and unrelated header opinions. Its opinions are always visible; there is no explanation toggle. A guide with no recommendations shows a short empty state.

The Back to sections button and previous party-mark and personal-guide footer text are removed. Rounded category containers and the PDF/Print controls remain. Printing uses the same admin recommendation cheatsheet.

At viewport widths of 800 CSS pixels or less, the pinned jump bar contains only rendered guide categories. It allows up to two rows. Capsule widths follow measured category heights; each capsule's background fills as its group is read. The active section is indicated, and a click moves to that group's top without hiding its heading under the pinned bar. Wider screens retain the two-column group layout and omit this navigation bar.

Ballot remains the visitor's practice area. Practice selections, recommendation filters, and camera changes cannot change My Guide. Saved Admin edits and restored original recommendations can change it. Browser namespaces isolate B.7E from earlier mockups. Existing nearest-center Snap, front/back spread, dirty-draft guards, and local content editing remain inherited from B.7D.
