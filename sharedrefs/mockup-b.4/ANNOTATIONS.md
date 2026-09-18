# Guide annotation contract

App version: v0.1.5. Companion schema: 1.0.0.

The [original JSON](../../finishedmockups/Mockup%20B.4/data/annotations.seed.json) contains 120 stable candidate, party, and write-in targets. Section-level opinions remain in the existing 148-record notes companion.

Envelope fields:

| Field | Meaning |
| --- | --- |
| format | whatsonmyballot-guide-annotations |
| schemaVersion | 1.0.0 |
| datasetId | Must match the bundled historical dataset |
| revision | Non-negative integer; each successful local save adds one |
| records | Exactly one record per known ballot option |

Record fields:

| Field | Meaning |
| --- | --- |
| id, kind, raceId, label | Fixed identity from the original ballot/notes data |
| mark | none, this, or or |
| color | blue, green, red, yellow, orange, or gray |

A record has one mark. Any number of records in a section may have THIS or OR. There is no grouping or vote-limit rule on editor marks. They have no effect on the visitor's choices.

Opinion text, author, and HTTPS source use the matching ID in the existing notes schema. Annotation colors are mapped to fixed CSS palettes; imported strings cannot introduce CSS.

The [store module](../../finishedmockups/Mockup%20B.4/assets/annotations.js) validates field names, schema, dataset, immutable identities, unique IDs, revision, colors, and mark values. Imports over 1 MiB are rejected. Before applying a valid file, Admin shows the changed options. The saved revision comes from the current browser state, not the imported revision.

Storage uses the B-series site/dataset namespace with the suffix annotations:v1. Browser locks serialize writers when available; saved bytes and expected revisions are checked before writing. Quota or storage failures preserve the last saved value. Unreadable saved bytes stay available for export and require an explicit restore before replacement.

Unsaved mark drafts use a separate owner key and schema 1.0.0. Matching drafts can be recovered; stale drafts can be exported. Visitor preference for Show guide marks has a separate versioned reader-view record.

The [fictional example JSON](../../finishedmockups/Mockup%20B.4/data/annotation-examples.json) is for the Admin layout preview only. It is not part of the ballot choices or endorsement data.

For a future schema change, add an explicit reader/migration for that schema, validate the result, and retain the original exported data. Do not silently treat an unknown schema as the current format.
