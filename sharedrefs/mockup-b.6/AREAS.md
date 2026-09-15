# B.6 area catalog

The [area catalog](../../finishedmockups/Mockup%20B.6/data/areas.json) uses format `whatsonmyballot-area-catalog`, schemaVersion `1.0.0`, catalogId `b6-sample-areas`, and a nonnegative revision.

The [JSON Schema](../../finishedmockups/Mockup%20B.6/data/schemas/areas.v1.schema.json) checks the file shape. The [catalog module](../../finishedmockups/Mockup%20B.6/assets/areas.js) also checks identities, parent relationships, default availability, and page references.

## Records

| Field | Purpose |
| --- | --- |
| levels | Ordered location labels and stable IDs. The demo uses district, county, community, and precinct. |
| locations | Stable location IDs, level IDs, parent IDs, display labels, and an optional ballot ID. |
| ballots | Stable ballot IDs, dataset IDs, labels, bundle base paths, and optional page labels. |
| defaultAreaId | A leaf location with an available ballot. |

The hierarchy is data-driven. A simpler deployment can use fewer levels. Each child uses the next level after its parent. Only leaf locations hold ballot IDs. An unavailable leaf has ballotId null. Parent availability is derived from descendants.

A ballot entry can serve several areas. Different ballots should use different dataset IDs. This keeps choices, content, guide marks, notes, and drafts separate. A new ballot bundle must have matching dataset IDs in its seed, settings, notes, annotations, and demo-choice fixture.

## Bundle paths

basePath is relative to the catalog file. The example uses `./`. Additional entries can use paths such as `./ballots/sample-two/`. Parent-directory paths, absolute paths, and external URLs are rejected.

Each bundle supplies ballot.seed.json, variants.json, notes.seed.json, annotations.seed.json, annotation-examples.json, and demo-choices.seed.json. Shared document references continue to use the public reference registry.

Each pages entry has an integer page and a display label. The example labels page 1 Front and page 2 Back. Progress uses a visible split only when all source pages have catalog labels. Empty pages arrays retain the combined progress bar.

## Activation and saves

The picker maintains a draft area separately from the active area. Use this area commits the leaf selection. Dropdowns with one option become plain text. Changing a parent picks an available descendant where possible, but still requires activation.

An unavailable active area blocks ballot tools without deleting the previous ballot's saves. Admin shows the Create ballot placeholder instead of another area's editable ballot. When a different available bundle is activated, the app loads that bundle and its own dataset saves.

The area selection uses a versioned browser-storage record and a consistent area URL parameter. Catalog and ballot editing are separate: the area catalog is maintained as project JSON; the demo Admin edits the active ballot's existing content. It cannot create a new ballot yet.
