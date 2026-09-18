# Part 2 verification

Scope: collection import/export, IndexedDB, District and guide selection, local Admin, drafts, and attachments.

- **17 browser workflow groups** pass: import errors, page-wide drops, dirty import handling, zero/one/multiple guides, unavailable areas, first guide creation, own-content edits, recovery, attachments, export into a fresh context, reused IDs, modal/shell drops, stale tabs and phone accessibility.
- **8 real IndexedDB transaction groups** pass: separated data ownership, original baseline retention, stale saves, quota rollback, cancellation during staging, competing imports, old-generation drafts and reopening persisted state.
- **8 additional failure/recovery groups** pass: visible storage failure, live worker cancellation, multiple elections per area, source edits, imported-original restore, downloadable corrupt saved data, session-only operation and valid IDs that match JavaScript property names.
- Phone Admin has no horizontal overflow or automated WCAG A/AA violations. Phone, desktop, editor and shell screenshots were inspected.
- Imported Markdown is sanitized. The script/link injection fixture did not execute or leave an unsafe link.
- Complete author exports reimport into a fresh browser context with matching data and attachment payloads. Personal choices stay outside exports.
- Preservation and extracted-package checks cover earlier mockups, shared references and previous ZIPs. The permanent blueprint and separate demo remain unchanged.

Detailed reports and screenshots live in ignored tools/ui-check/artifacts/b8-part2 and docs/verification. No research or development files are runtime dependencies. Checks use desktop Edge with phone-size viewports; physical device and final ballot/PDF verification remain in Parts 3–4.

The Part 2 package uses the suffix b8-part2 and leaves the Part 1 ZIP intact. App version remains v0.1.8 until the planned v0.2.0 release in Part 4.

The existing 63 contract checks and 9 worker/browser groups also pass. The latter verify native gzip, image formats, error reporting, cancellation, resource URLs and responsive 2 MB attachment processing. All 271 preservation checks match: earlier mockup/reference files, two prior ZIPs, the permanent schema blueprint and the separate demo.
