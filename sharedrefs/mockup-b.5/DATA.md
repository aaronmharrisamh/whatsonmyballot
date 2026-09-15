# B.5 demo data

App version: 0.1.6. Dataset: `b5-fictional-ballot-demo`. Dataset baseline: 1.0.0.

The B.5 data files live in [the mockup data folder](../../finishedmockups/Mockup%20B.5/data/ballot.seed.json). Candidate and option IDs are fictional and independent of the historical dataset. Contest IDs, page/column placement, and choice limits retain the reference structure for the interface.

## Separate records

| File | Purpose |
| --- | --- |
| ballot.seed.json | Fictional names and profiles in the 28-section layout |
| notes.seed.json | 148 neutral sample notes, with fictional editor attribution |
| annotations.seed.json | 120 guide records; 55 use THIS or OR; all use the red preset |
| demo-choices.seed.json | Personal choices in 21 sections, within each section's limit |
| variants.json | Demo design settings for the isolated dataset |

Annotations keep [schema 1.0.0](../mockup-b.4/ANNOTATIONS.md), with none/this/or marks and independent preset colors. Opinion records keep their existing versioned contract. B.5 uses its own dataset namespace for visitor choices, content, annotations, notes, drafts, and display preferences. Loading B.5 does not migrate or overwrite an earlier mockup's data.

## First-visit choices

The fixture format is `whatsonmyballot-demo-choices`, schemaVersion `1.0.0`. It identifies its dataset and deterministic seed. Records list known section IDs, candidate or option IDs, and write-ins. All 28 sections must occur once.

The loader validates the entire fixture before changing choices. It rejects unknown fields or identities, duplicates, wrong datasets or schemas, and selections above the section limit. A seed marker prevents a later reload from undoing a visitor's clear or edit. Existing B.5 saves take priority. An explicit Example selections action can reload the sample.

The fixture is reproducible across visits and devices; it does not shuffle while someone reads. Guide marks and visitor choices are separate. The fictional guide fixture permits several THIS/OR alternatives independently of personal selection limits.

## Source boundary

No fictional candidate maps to a real candidate for recommendations. Public biographies, attribution, and opinions are layout filler. The original PDF and provenance remain unchanged and are labeled as the layout reference. Expanded interactive content changes the paper's height; this HTML view is not a pixel-for-pixel PDF reproduction.
