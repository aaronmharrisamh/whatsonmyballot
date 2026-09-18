# B.9 portable ballot JSON

[SCHEMAEXAMPLE.json](../../finishedmockups/Mockup%20B.9/SCHEMAEXAMPLE.json) is the permanent, fictional blueprint. Download it separately from the active ballot. It includes required/optional field instructions, every supported contest and option kind, all six colors, blank notes/details, multiple-selection voting, three pages, two authors, source references, Markdown, and working embedded PDF, PNG, plain-text and Markdown files. Imports never rewrite this file.

[ballot.schema.json](../../finishedmockups/Mockup%20B.9/data/ballot.schema.json) is the Draft 2020-12 structural schema. Runtime validation also checks identifiers, relationships, page placement, content, byte limits, attachment hashes and file types. Passing the structural schema alone is insufficient for activation.

## One document, one ballot

Required root fields are `format`, `schemaVersion`, `id`, `title`, `revision`, `election`, `area`, `groups`, `pages`, and `contests`. The format is `whatsonmyballot-ballot`, schema version `1.0.0`. Exactly one election and area belong to the document. Authors, sources, files, details and opinions are optional. Omitted author/source/attachment arrays become empty arrays. Empty details or opinion text are supported.

All record IDs are globally unique. Pages and columns define reading order, and every contest must occur exactly once. The app accepts 1–100 pages, each with 1–12 columns, rather than a fixed Front/Back layout. An empty column is allowed; an empty page is not. Candidate contests can permit multiple selections; straight-party, proposal and retention contests permit one. Straight-party sections are optional. Author recommendations never cast visitor votes.

Recommendations use `this`, `or`, or `none`, and one of `red`, `orange`, `yellow`, `green`, `blue`, `gray`. Contest opinions additionally support `highlighted` and `color`; these affect the header notice independently of candidate recommendations. Option opinions have no header-only fields. `_comment` is optional on every record; root `_instructions` contains portable instructions as strict JSON text.

## Actual file bytes

Attachments have `id`, `fileName`, `mimeType`, `encoding`, `data`, `uncompressedBytes`, and `sha256`. Only their byte payload is compressed: `encoding` is `gzip-base64`, `data` is canonical base64 of gzip bytes, and size/hash describe the original bytes. Other JSON text remains readable. Allowed types are PDF, PNG, JPEG, WebP, GIF, UTF-8 plain text and UTF-8 Markdown. HTML and SVG attachments are rejected. Obvious active PDF actions are rejected; external documents are still opened as documents, not injected into the page.

The limit is 25 MiB for JSON, 25 MiB for each expanded file and 100 MiB for all expanded files, with at most 100 attachments. The decoder reads a bounded stream and cancels it at the claimed size or global cap. Gzip integrity, declared length, SHA-256 and type signatures are checked before activation. A candidate photo must reference an image. A source can refer to a HTTPS URL, attachment, or both. Markdown file links use `attachment:ID` and resolve only through the prepared resource registry. Renderers must also sanitize Markdown and allow safe URLs.

An AI must never predict base64, gzip, byte counts, hashes, or ballot facts. Supply real source content, and encode actual bytes with tools. When an optional file cannot be produced, omit that file and all references to it. The generated fictional documents in the example must never be relabelled as official source evidence.

## Runtime boundary

All APIs are ES module exports:

- `validateBallot(value)` returns `{ok, errors, ballot}`; valid output is a detached clone with missing root author arrays normalized. It checks plain JSON values and rejects custom prototypes, accessors, hidden properties, unsafe keys, extra fields, invalid relationships and active markup.
- `parseBallot(text)` is asynchronous and returns that validated clone or throws `ContractError`. It enforces the UTF-8 input limit before parsing.
- `serializeBallot(value)` validates and emits readable strict JSON. It does not include visitor state.
- `prepareResources(attachments, {signal}?)` verifies every file, returning `{url(id), get(id), has(id), dispose(), size, expandedBytes}`. `get(id)` supplies `{attachment, bytes, blob, url}`. Failed preparation revokes all temporary Blob URLs; the old active document remains the caller's responsibility until commit.
- `encodeAttachment({id,fileName,mimeType,bytes})` generates a valid gzip record and computes the original-byte hash. `bytes` may be UTF-8 text or bytes.

Import callers must finish structural/semantic validation, await all file preparation, and persist a complete replacement before swapping active data. Call `dispose()` when discarding or replacing prepared resources. A `Map` handles identity lookups, including valid IDs such as `constructor`. Unknown versions are rejected by explicit version dispatch; no future version is silently relabelled or given a fictional migration.

Author export preserves imported sources, attachments and documentation while incorporating saved edits. Personal practice choices, view settings and unsaved drafts are separate from this document. The app version is independent of schema version.

## Verification and maintenance

The development tools `build-b9-contract.mjs` and `build-b9-example.mjs` generate the schema/standalone AJV validator and permanent example. The latter generates real PDF/PNG bytes and compresses/hashes those files. Rebuilding the example is a development operation, never an import operation.

The contract suite covers formal-schema validity, round trips, global IDs/references, layout/limits, omission/blank semantics, unsupported versions, hostile prototypes, HTML/scripts, gzip corruption, expansion bombs, incorrect hashes/types, cancellation and resource cleanup. Browser verification also decodes the PNG, fetches PDF/text/Markdown Blob URLs, exercises browser gzip APIs and confirms URL revocation. These checks do not claim a full PDF malware scanner or physical-device coverage.

Implementation references: [AJV standalone generation](https://ajv.js.org/standalone.html) and the [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API).
