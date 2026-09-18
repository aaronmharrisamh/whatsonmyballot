# B.9 verification

App version: v0.3.0. B.9 continues from B.7H. B.8 remains outmoded and supplied no code or reference.

Verified in Microsoft Edge on 2026-09-16:

- 62 schema/contract checks cover complete examples, invalid files, references, IDs, version handling, and attachment limits.
- 27 adapter checks cover canonical round trips, saved author edits, original option order, source links, metadata, and the full H example.
- 13 application workflows cover instant import, export, reload, edits, embedded images, one-page ballots without a straight-party contest, invalid imports, and private-choice isolation.
- Four additional workflows cover dirty-draft replacement, prior-generation cleanup, corrupt compressed files, three-page label geometry, and multiple source/Markdown displays.
- Seven browser resource groups cover compressed files, hashes, image/PDF/text/Markdown decoding, and URL cleanup.
- Seven layout/output groups plus six PDF inspection groups cover named source pages, explicit empty columns, proposal ballots, custom groups, full opinions, source titles, long labels, reading order, and page bounds.
- Five release workflow/capture groups and five accessibility audits cover the desktop shell, phone ballot, phone guide, phone Admin, and gallery. The audits reported no WCAG A/AA violations.
- Eight static groups resolve 1,060 public links and dependencies. Nine launcher groups pass; the actual local launcher selects B.9 / v0.3.0 and closes its check-owned server.
- All 721 files in the preservation baseline retain their original hashes, including earlier mockups and archives.

Seven fresh phone/desktop screenshots are included in the mockup. Automated checks complement review; they do not replace testing on physical phones, assistive technology, or a printer.

The release process records public-file hashes in the root release manifest, creates a ZIP, extracts it, and runs the earlier mockup checks plus B.9 import/export/reload and layout workflows against that extracted copy. No local research, tools, ignored agent files, or private practice choices belong in the archive.
