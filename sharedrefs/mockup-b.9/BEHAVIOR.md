# B.9 behavior

B.9 copies B.7H and adds portable ballot data. Existing reader controls, major guide capsules, recommendation symbols, print styling, and camera gestures remain the starting design.

The JSON file contains election and area information, named groups and pages, explicit columns, contests and options, guide marks, named opinions, sources, and embedded attachments. Admin can download the example, import a replacement, or export saved author state. The [contract](CONTRACT.md) defines fields and limits.

Import validates before replacing the ballot. Invalid files leave the current ballot intact. Successful replacement clears practice choices and saves locally. Reload restores the imported ballot. Exports preserve canonical IDs and attachment data.

Page placement follows the file. Explicit empty columns retain their space; adjacent navigation skips them. Minimap and progress follow actual pages and contests. Partisan, Non-Partisan, and Proposals retain established major capsules; other groups can have custom labels.

PDFs include complete recommendation opinions, authors, highlighted header opinions, and source titles. Named source pages continue across Letter pages when needed. Local attachments print by title without temporary browser links; HTTPS references remain linked. Long labels and edited content flow without clipping.

Practice choices do not enter the author cheatsheet or exported author JSON. This browser demo does not cast a vote.
