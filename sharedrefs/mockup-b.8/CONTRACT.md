# Collection API 1.0.0

The app version is independent from this schema. The B.8 modules have no dependency on B.7 identities, content validators, fixed source PDFs, browser storage or the old shared-reference registry.

## Entry points

`collection-contract.js` exports:

- `parseCollection(string | Uint8Array | Blob, {fileName?, signal?, onProgress?})`: validate input, structure, IDs, relationships, ballot/guide rules and attachments. Return `{value, stats, bytesById}` only on complete success.
- `validateCollection(value, options)`: same checks for a plain JSON object.
- `loadCollection(input, options)`: return `{model, stats, resources}`.
- `exportCollection(value, {exportedAt?, signal?})`: validate the full author collection and return a JSON Blob. Preserve all supported fields and unchanged attachment payloads. The caller owns revision increments.
- `validateStructure`, `validateRelationships` and `safeHttps` for focused checks. Structure alone does not prove import validity.

`collection-client.js` provides worker operations for the browser:

```js
import { loadCollectionInWorker, collectionOperation } from './assets/collection-client.js';

const loaded = await loadCollectionInWorker(file, {
  signal: controller.signal,
  onProgress: progress => updateProgress(progress)
});
// Validate and persist before replacing current app state.
const nextModel = loaded.model;
// Later, dispose replaced or rejected resources:
loaded.resources.dispose();

const jsonBlob = await collectionOperation('export', authorCollection);
const attachment = await collectionOperation('encode', uploadedFile, {
  id: 'candidate-photo', fileName: 'candidate.png', mediaType: 'image/png'
});
```

Each operation owns a dedicated module worker. Parsing, schema/semantic checks, gzip, SHA-256 and export run there. Cancellation terminates it. Workers never touch app state or IndexedDB. Normalization clones and freezes validated data; very large collections still have some main-thread model cost. Keep Part 2 transitions responsive and measure real imports.

Native Compression Streams and Web Crypto are feature-detected. No CDN or runtime dependency download is used. The current Edge verification target supports them; unsupported attachment operations report a browser capability error. No fallback is shipped yet. The gzip API's format rules are defined by the [Compression Streams Standard](https://compression.spec.whatwg.org/). The browser validator is locally generated using [AJV standalone validation](https://ajv.js.org/standalone.html), AJV 8.20.0 and ajv-formats 3.0.1. MIT license files are bundled beside it.

## Read model

`normalizeCollection` consumes only validated data. Its frozen records remain in printed order.

- `get(id)` and `ownerId(id)` resolve collection records and enclosing owners.
- `areaPath(id)`, `childrenOf(parentId)` and `ballotsFor(areaId)` drive District selection.
- `guidesFor(ballotId)` supplies zero/one/multiple guides; Part 2 shows a chooser only for multiple guides.
- `detailsAvailable(id)` checks only that header or choice. Nonblank summary/Markdown, direct detail attachments, usable detail source links, or a choice image count. A title-only provenance reference does not.
- `sectionOpinion(guideId, contestId)` checks only the header. It never falls back to an option.
- `choiceGuide(guideId, choiceId)` yields `{mark, recommended, color, opinion}`. Nonempty opinions resolve a named author.
- `recommendationsFor(ballotId, guideId)` retains every contest and the recommended THIS/OR choices in printed order. It reports no-recommendation sections.
- `ballotProjection(ballotId, guideId)` retains every choice, including unmarked ones. Future recommendation PDF output uses this, independently from the reader filter.
- `layoutFor(ballotId)` returns ordered pages and columns with their contests.
- `canMark(contestId, choiceIds)` enforces the personal limit and ownership without changing author data.

There is no stored personal selection in this format. A ticket counts as one option; a write-in slot is an option with its own ID. Personal write-in text belongs to the later visitor-state layer. Guide marks can exceed personal selection limits. A guide from another ballot cannot supply marks or notes.

## Validation order and bounds

Input bytes → strict JSON tree/schema → globally unique IDs → typed references/ownership → ballot mechanics and guide targets → bounded attachment decoding → normalization.

Each declared page and group contains a contest. Pages have 1–6 columns. Contest order is page, column, then source order. Column numbers cannot exceed the assigned page. Candidate/ticket/party/answer/write-in kinds must match their contest mechanics. Proposals require both answers and a question, in a proposals group.

IDs are globally unique across all record types; the envelope collectionId identifies the collection namespace. A parent's hierarchy level immediately precedes its child's level, preventing cycles. Every ballot is assigned to a leaf area. Default selection is available and its guide belongs to its ballot.

No unknown fields or unsupported versions are silently retained. The supported documentation object is retained as data. JSON nesting is limited to 80 levels and tree traversal to one million nodes. These complexity errors use JSN-E03.

File limit is 25,000,000 bytes. Expanded limit is 100,000,000 bytes. Actual stream output is bounded. Resources decode sequentially and count once by ID. Compressed counts, raw counts, base64 canonical form, gzip integrity, SHA-256 and allowlisted media signatures must agree. Signature checks are basic format checks, not a complete media parser or malware scanner.

`attachments.js` exposes `encodeAttachment` and `decodeAttachment`. Replace a changed attachment with a newly encoded item before export. Unchanged items retain their validated original bytes and payload. `createAttachmentResolver` lazily creates typed Blob URLs; `release(id)` revokes one URL and `dispose()` revokes all and releases decoded buffers. Call disposal on replacement, cancellation after load, or discarded staged imports. Render imported content as text or sanitized Markdown; never inject an imported filename or text as HTML.

## Local verification

Development tools live in ignored tools/ui-check. Rebuild schema with `node tools/ui-check/build-b8-schema.mjs` and fixtures with `node tools/ui-check/build-b8-fixtures.mjs`. Run `node tools/ui-check/b8-contract-check.mjs`, `node tools/ui-check/b8-browser-check.mjs` and `node tools/ui-check/validate-b8-collection.mjs path/to/file.json`.

The development test report includes all nine error families, real over-expansion, corrupt gzip, digest/media mismatches, independent ballots, source-schema agreement, authoring field coverage, immutability, resource disposal, and full author-content round trips. Browser tests exercise module workers, cancellation, attachment rendering, responsiveness and portable paths.


## Part 2 application layer

The current B.8 index is the Phone/Desktop shell; app.html owns the workspace. Import runs in the app even when a file is dropped outside the iframe. The shell accepts messages only from its iframe and expected origin; the app accepts only its parent and expected origin. Drops during startup queue until the coordinator is ready. Ordinary text drags are ignored.

- **collection-store.js**: path-scoped IndexedDB with meta, collections, preferences, personal and drafts stores. It accepts already validated author data. The active pointer contains generation, collectionId and revision. replace compares that token and commits the new original/working snapshots, reset preferences and old-generation cleanup atomically. save compares the same token, preserves the imported baseline, increments the author revision, and repairs dependent preferences in the same transaction. A session-only store supports the fallback demo but refuses imports.
- **collection-session.js**: validates saved data through the Part 1 worker, owns the frozen model and resource resolver, and disposes replaced resources. It exposes save, replace, setPreferences, setChoices, clearChoices, export and reload. A change event announces author/preference updates; choices is separate. BroadcastChannel marks another tab stale, while IndexedDB token comparison remains the authoritative conflict check. validPreferences repairs removed/foreign guide selections and clamps section positions.
- **import-coordinator.js**: one import(files) path for all entry points. It handles dirty-editor decisions, validation, staging, cancellation and storage. Before the transaction commits, a failure leaves active data unchanged. After success, District proposes imported defaults and requires Use this area.
- **editor-adapters.js**: converts target-specific form data into an updated collection. Opinion edits are guide-scoped; detail edits are shared facts. The complete result must validate before store.save. Attachment removal reports all live references; it ignores blueprint documentation examples.
- **app.js / views.js**: own the active UI, shared guide selection, personal choices, local recovery and safe rendering. The ballot reader, camera and guide outputs share this collection and guide state; outputs capture an immutable recommendation projection.

Editor recoveries include target kind/ID, guide ID, generation, collection ID, base revision, form baseline, imported-original values and current draft values. They never appear in author exports. Recovery from another generation/revision can be exported for manual repair and cannot save over current data. A clean import removes previous B.8 recovery records atomically.

The app uses own-property lookup for data-driven IDs. Valid IDs such as constructor must not resolve to JavaScript prototype properties.

A saved snapshot that cannot load is not overwritten automatically. Startup provides raw download for repair, normal import and explicit restore-demo. Storage and worker failures remain operational errors, separate from JSN schema diagnostics.

Local Part 2 checks: b8-part2-ui-check.mjs, b8-part2-store-check.mjs, b8-part2-failure-ui-check.mjs, b8-browser-check.mjs, and b8-preservation-check.mjs --part2. These check names describe the historical Part 2 work. Current preview uses `node preview.mjs` from the repository root; deployment uses the public repository files and their manifest directly. Do not create stage packages or release ZIPs.
