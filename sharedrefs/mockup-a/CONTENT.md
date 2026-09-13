# Content editing and exchange

Phase 1 is complete. Open **Admin** to edit a content group, export saved content, or review an imported JSON file. All five designs use the same saved content at the same app path.

## Try the editor

1. Open Admin and choose a **Content group**, then **Edit selected group**. You can also turn on Edit buttons and open a race.
2. Change text and check the preview. Candidate summaries have three sentence fields, a short overview, and five detail paragraphs. The document editor accepts Markdown.
3. Press **Save**. Reload the page to check the saved text. Changes stay in this browser, subject to browser storage availability.
4. **Restore original** fills the draft with the bundled text. Save applies it. Cancel can still keep the saved local edit.
5. **Export saved content** downloads a JSON file with the saved text. Import the file to see a preview of changed groups. Expand a group to compare the saved and proposed text, then choose **Apply import**.

Cancel, Close, Escape, guarded design changes, and leaving an editor all use the same dirty-state check. A dirty draft offers Save/Apply, Discard, or Keep editing. Changing the preview device preserves the draft. The Save, Cancel, and Restore original footer stays outside the scrolling editor body.

The document is one shared example linked from every candidate in this dataset. Editing it changes that shared example. It is not an archived candidate website. Example classifications remain fixed in this demo.

## File contract

The formal [JSON Schema](../../finishedmockups/Mockup%20A/data/schemas/ballot-content.v1.schema.json) uses Draft 2020-12. [content-contract.js](../../finishedmockups/Mockup%20A/assets/content-contract.js) adds ballot identity, safe-link, and structural compatibility checks.

| Field | Rule |
| --- | --- |
| `format` | `whatsonmyballot-content` |
| `schemaVersion` | Exactly `1.0.0`; no implicit migration |
| `datasetId` | Must match the loaded dataset |
| `baseDatasetVersion` | Must match the bundled original |
| `contentRevision` | Nonnegative integer; a local save issues the next revision |
| `exportedAt` | Valid UTC timestamp ending in `Z` |
| `content` | Validated records with embedded Markdown bodies |

Unknown fields are rejected, including visitor-choice fields. The initial seed references a bundled Markdown file; loading resolves its body before any content is displayed or saved. Exported files contain the body, with no generated HTML. Portraits and PDFs remain references to bundled files; their binary content is not embedded.

The import limit is **5 MiB**. A Markdown body is limited to **200,000 characters**, and each other text field to **4,000 characters**. Browser quota can prevent saving a file below these limits; the app reports that failure and keeps the draft.

IDs, relationships, collection order, dates, selection limits, source hashes, asset paths, and PDF mappings must match the original. Version 1 imports support the same editable groups as the inline editor. Structural changes require a new compatible release and an explicit migration, rather than an unreviewed file import.

Changes to printed race titles or candidate names receive `demo-edited` status. Source details and candidate links edited locally lose their verified status. Restore original restores the original status. This never changes the source PDF or claims that a local edit was independently verified.

Source URLs must use HTTPS or match an existing stable document key. For this sample, `references/official-sample-ballot.pdf` resolves to the PDF in `/sharedrefs/`; `content/candidates/profile-example.md` resolves to the shared profile. These keys are preserved in existing saved content and JSON exports. The [reference registry](../registry.js) controls their deployment locations. Candidate websites must use HTTPS. Credentials, executable schemes, path traversal, unlisted local files, active HTML, embedded Markdown images, and unsupported content are rejected. Imported links are not fetched. Markdown is rendered with the same wrapper in the reader and editor/import previews. Raw HTML is displayed as text; rendered output is sanitized with an explicit tag list.

Line endings normalize to LF. Meaningful Markdown spaces, paragraph breaks, and list order are preserved. Canonical comparison sorts JSON object members, while preserving array order. Content equality excludes the envelope's revision and export time.

## Saved content and recovery

[content-fields.js](../../finishedmockups/Mockup%20A/assets/content-fields.js) defines editable groups and comparison. [content-store.js](../../finishedmockups/Mockup%20A/assets/content-store.js) isolates browser persistence from the UI.

| State | Storage and behavior |
| --- | --- |
| Original | Deep-frozen normalized bundle in memory |
| Saved content | One namespaced record containing the current and previous valid versions |
| Editor draft | Separate copy of its base content and editable values or proposed import |
| Draft recovery | Separate record per open app instance, with dataset, baseline, revision, and base-record identity |
| Personal guide | Separate choice key; never included in content exports or recovery content |

The namespace is `whatsonmyballot:<app-base-path>:<dataset-id>:`. Suffixes are `content:v1`, `recovery:v1:<instance-id>`, and the existing `guide:v1`. A copied folder or different hosting path has independent storage. No operation calls `localStorage.clear()`.

Save checks the expected revision and original stored value, validates the complete proposed content, then uses one `localStorage.setItem` to write both current and previous versions. Only a successful write updates the visible saved state. Web Locks serialize cooperating tabs when available. Without them, revision and exact-record comparisons provide best-effort conflict detection; this is not a database transaction system.

Another tab's save produces a storage event. A tab with a draft keeps it and offers **Reload saved version** or **Export draft for recovery**. Reload explicitly discards that draft. A failed write displays **Changes were not saved**, retains the previous saved content, and offers Retry and a validated recovery export. Invalid draft content must be corrected before it can be exported.

Recovery writes run after a 400 ms debounce and when the page becomes hidden. The secondary `beforeunload` guard is installed only while the draft is dirty. Browser prompts are not guaranteed, especially on phones.

On return, matching recovery data offers **Recover draft** or **Discard recovery copy**; it never auto-saves. A draft from an older saved revision can be exported for review but cannot be recovered onto newer content. Each recovery export contains the draft's own content snapshot, not a merge with another tab's text. Choosing **Later** leaves the recovery copy for a later reload. Recovery storage is best effort and may fail when storage is blocked or full.

**Review previous saved version** previews the one retained prior version; restoring it creates a new local revision. **Restore original content** does the same with the bundled baseline. Both keep personal choices. If a saved record is unreadable, the app displays the original and prevents an ordinary save from silently overwriting that record. The separate restore preview explains that confirming Restore replaces the unreadable record. It cannot recover text from corrupt JSON.

## Build and checks

The runtime includes a standalone validator generated with pinned AJV 8.20.0, ajv-formats 3.0.1, and esbuild 0.28.2. It does not compile schemas or evaluate generated code in the browser. Dependencies, source links, and licenses are recorded in [vendor notes](../../finishedmockups/Mockup%20A/assets/vendor/README.md).

The following commands require the developer's ignored `/tools/` folder and pinned test dependencies. Those files are local and are not included in a fresh clone or the portable ZIP. Running the app only requires the root preview helper.

From the development workspace root:

```powershell
node tools/ui-check/content-check.mjs
node tools/ui-check/admin-check.mjs
node tools/ui-check/check.mjs
node tools/ui-check/integration-check.mjs
node tools/ui-check/static-check.mjs
```

To rebuild the schema and browser validator after an intentional schema change:

```powershell
node tools/ui-check/build-content-validator.mjs
```

Development packages are pinned in `tools/ui-check/package-lock.json`; install them with `npm ci` in that folder. The static app does not need development packages or a backend to run.

The shared choice model also supports option answers for the isolated Yes/No development fixture. No proposal was added to this historical style; the bundled content schema still permits only its actual item types.

This is a local Admin demo without authentication or shared publishing. A future server adapter needs authenticated editors, server-side validation, concurrency checks, and a publication process. Database credentials do not belong in the browser bundle.
