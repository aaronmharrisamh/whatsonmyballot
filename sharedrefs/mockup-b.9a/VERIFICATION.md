# B.9A verification

App version: v0.3.1. Canonical ballot schema: 1.0.0, unchanged. B.9A is copied from B.9; B.8 remains outmoded.

Verified in Microsoft Edge:

- 16 interaction checks cover recommendation visibility, unannotated imports, reload and Fresh Start, dirty editors, invalid files, app/dialog/shell drops, queued saves and imports, PDF preparation, prior-version isolation, and GitHub Pages prefixes.
- Six focused file-drop/workspace groups cover file-only detection, text/link drag preservation, validation errors, stale workspace protection, separate storage, shell forwarding, readiness handshakes, and message-origin checks.
- Five handoff groups cover seven fresh preview captures and four focused release workflows for filtering, outer-preview drops, dialog drops, invalid files, and reload.
- Five accessibility audits cover the desktop guide shell, phone ballot, phone guide, phone Admin, and gallery. No WCAG A/AA violations were reported.
- Eight static groups validate 1,148 public links and dependencies. Nine launcher groups pass. The actual launcher selects B.9A / v0.3.1 and closes its check-owned server.
- All 805 preservation-baseline files retain their original hashes. The schema example and canonical schema are byte-identical to B.9.

The release procedure checks every public manifest hash, extracts a fresh ZIP, retains the 37 earlier package checks, and adds four B.9A filtering/drop workflows. Ignored research, tools, agent files, and private practice choices are excluded.

Automated checks complement review on physical phones, assistive technology, and printers. The existing ballot and print designs remain the B.9 starting point.
