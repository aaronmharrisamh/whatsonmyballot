# Make a portable ballot collection

Give Claude/Astra [SCHEMASAMPLE.JSON](SCHEMASAMPLE.JSON) with the source ballots. Keep the bundled sample unchanged; create a separate collection file. The schema sample contains ordinary JSON documentation fields, not JavaScript comments.

Use this prompt:

> Read the complete schema, instructions, semantic rules and examples in SCHEMASAMPLE.JSON. Transcribe the supplied ballots into a separate whatsonmyballot-collection file using schema 1.0.0. Preserve every printed race, choice, write-in slot, instruction, selection limit and proposal question. Preserve the actual election date, place and printed order. Report missing or unclear facts; do not guess. Leave guides empty until I supply the named author's recommendations. Do not invent attachments, hashes, candidate facts or endorsements. Validate the complete file and correct all reported errors.

1. Create globally unique, stable IDs using lowercase letters, numbers and hyphens. IDs start with a letter or number and have at most 100 characters. Uniqueness includes elections, geography levels, areas, ballots, pages, groups, contests, choices, authors, guides, sources and attachments.
2. Define the ordered geography levels. Each parent uses the preceding level. Assign complete ballot styles to leaf areas. Several precincts may share one style. An area without a ballot assignment is unavailable. A congressional district name alone does not determine a ballot.
3. Copy each page by column, then top to bottom. Preserve all official words, joint ticket members and write-in slots. Source pages may have 1–6 columns; there is no fixed section count. Front/Back labels and layout weights are optional.
4. Use candidate, ticket, straight-party or proposal mechanics. A ticket is one voting option. A proposal has its full question, one Yes and one No answer, and a one-choice limit. Report unsupported voting rules; do not silently convert them.
5. Keep facts and neutral descriptions separate from each author's guide. A guide targets one ballot. A ballot can have zero, one or several guides. Keep recommendations and section opinions empty until the author supplies them.
6. Use `this` for recommended choices, `or` for alternatives, and `none` for an optional exception opinion. An omitted entry is unmarked and has no opinion. There is no limit on guide marks based on the voter limit: a choose-three race can have one THIS and five OR entries. These are suggestions, not personal selections.
7. Attribute nonempty opinions to the guide author or an explicit opinion author. Each header and option owns its content; a selected candidate never fills a missing header opinion. Empty details and whitespace-only opinions are valid. Direct `sourceIds` document provenance; `details.sourceIds` provide information links.
8. Store neutral descriptions as readable text/Markdown. Supply source titles and HTTPS links when known. Candidate website text should have clear source attribution. The UI must use text or sanitized Markdown, never execute imported HTML or schema.
9. Attach files only when useful. A source ballot PDF is optional. Generated ballot PDFs and guide printouts are made on demand from the active saved guide. Do not put personal choices, view preferences, or unsaved drafts in a collection.
10. Validate the complete collection. Correct errors using their code, JSON path and record ID. B.8 Admin imports and exports this format through the same complete validator.

## Optional attachments

The envelope always has `attachments: { "compression": "gzip", "encoding": "base64", "items": [] }`. Each item contains `id`, `fileName`, `mediaType`, `gzipBytes`, `rawBytes`, `sha256` and `data`.

Allowed types are PDF, PNG, JPEG, WebP, UTF-8 Markdown and UTF-8 plain text. SVG application icons remain app assets. Word files, active HTML and scripts are unsupported. Keep normal Markdown in `details.markdown` whenever practical.

Encode the real file bytes as one complete gzip member, then canonical base64. Count compressed bytes before base64 and raw bytes after decompression. SHA-256 is lowercase hex of the raw bytes. Never make up a payload or digest. If the file is not available, omit it and its references. Admin can add it later.

The tiny blueprint image, PDF and text attachments are format examples. They are not candidate photos or generated ballot outputs. References share one attachment ID; do not embed the same file in every note.

The JSON file must be no more than **25,000,000 bytes (25 MB)**. Expanded content must be no more than **100,000,000 bytes (100 MB)**. Expanded content counts compact JSON with attachment `data` properties omitted, plus each unique decoded attachment once. Whitespace and base64 count toward the outer file limit. Actual sizes are checked during reading and decompression.

The decoder checks gzip integrity, counts, hashes and media signatures. Signature checks do not prove that a document is safe or fully well-formed. Imported text must still use safe rendering. A current browser with Compression Streams and Web Crypto is required for attachment operations.

## Round-trip checklist

- Keep a source copy and the unchanged schema sample.
- Validate all ballots, guide targets, authors and attachments.
- Import into a clean working collection, choose the area and guide, then save author edits.
- Export the complete author collection. Reimport it and compare facts, opinions, sources and attachment bytes.
- Confirm that personal selections are absent. Check that the bundled schema sample did not change.

For a no-guide collection, use `guides: []` and `defaultSelection.guideId: null`. For an empty guide, keep its author and ballot reference, with empty `recommendations` and `sectionOpinions` arrays. These variants are tested.

The browser validates using the shipped schema and semantic rules. The documentation copy under `authoring.schema` never replaces that validator. Unknown fields and unsupported schema versions are rejected. Legacy B.7 files require a future migration; no automatic conversion is included.

## First real-ballot trial

Use the prompt above with the unchanged blueprint and the actual source ballots. Import the resulting new JSON in Admin or drop it over the page. A successful import replaces the working collection; choose the area and press **Use this area**. Review every transcribed contest and option against the source before adding guide opinions. Use Admin to create/select a named guide, save THIS/OR choices and opinions, then check My guide, its generated PDF and printed guide. Export the complete JSON and reimport into a fresh browser context to confirm the portable handoff. Keep a separate exported backup before replacing it with another trial.
