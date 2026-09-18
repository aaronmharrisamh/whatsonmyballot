# Part 1 verification

Scope: B.8 collection foundation for target app v0.2.0. The shared version remains v0.1.8 until Part 4. This is a development handoff, not the completed B.8 ballot interface.

- **63 contract checks**: schema agreement and field coverage, independent ballots, author/guide relationships, supported mechanics, personal/guide separation, all nine JSN error families, actual size boundaries, corrupt gzip, media/hash checks, resource disposal and lossless author-content round trips.
- **9 browser check groups** in Edge: project-path module loading, permanent blueprint download, native gzip and worker operations, attachment display, all three image formats, export/reimport, cancellation, unsupported capability reporting and responsive large-resource handling.
- The 390-pixel review page has no horizontal overflow and no automated WCAG A/AA violations. Screenshots were inspected. This is not a physical-device audit of the future ballot UI.
- A 2,000,000-byte text attachment encoded and validated in a worker while animation frames continued.
- The real outer-file boundary accepts 25,000,000 bytes and rejects a larger file. Actual decompression past 100,000,000 bytes rejects even when metadata claims a small file.
- The permanent blueprint is about 87 KB of readable JSON, including its schema and four tiny attachments. The presentation demo is separate and has 30 fictional contests with no stored personal selections.
- All 267 prior mockup/shared-reference files and the previous v0.1.8 ZIP match their starting SHA-256 values.
- Public-link, legacy schema, launcher, manifest and extracted-package checks cover the handoff. The B.8 package is named with a `b8-part1` suffix to preserve the prior ZIP.

Local reports and screenshots are in ignored tools/ui-check/artifacts/b8-part1 and docs/verification. Development tools remain outside the package. The review page and bundled files require no external runtime requests.

Remaining work is tracked in Parts 2–4: transactional import/storage and Admin; new ballot controls and viewer; recommendation cheatsheet, generated PDF/print and full UI/release verification. A current browser with native Compression Streams and Web Crypto is required for attachments; no fallback is bundled. Media signatures are basic format checks, not complete document parsing.
