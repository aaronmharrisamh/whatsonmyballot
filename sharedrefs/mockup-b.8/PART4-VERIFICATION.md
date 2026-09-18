# B.8 / v0.2.0 release verification

All four planned parts are implemented. The release keeps collection schema 1.0.0 and uses the shared app version 0.2.0.

## New output checks

- 8 pure projection checks cover independent layouts, immutable snapshots, THIS/OR ordering, no-guide output, complete opinions, guide switching and filenames.
- 14 Edge workflow groups cover the actual PDF download, both output-button positions, print completeness and focus restoration, personal-mark/filter isolation, guide switching during generation, cancellation and engine-load failure.
- 9 PDF inspection groups examine 11 generated/downloaded or printed files: complete choice/section/opinion/proposal text, terminal markers in long text, page bounds, empty vector ovals, snapshot consistency and no-guide output.
- The independent fixture has a 2024 election year, three source pages with different column counts, a joint ticket, choose-two alternatives, no-recommendation sections and Yes/No proposals. It is fictional test data, not a transcription of a real 2024 ballot.
- Accented names remain searchable. Chinese and Arabic names render through the documented image fallback. PDF and print pages were rendered and visually reviewed.
- The built-in demo generates 22 readable ballot-reference pages and 12 printed guide pages with its full opinions. The short alternative guide prints on two pages; the long-text test uses seven printed pages. Page count can vary by browser.

## Retained checks

63 collection contract checks, all nine JSN error codes, nine engine browser groups, 17 Admin/import/workspace groups, eight transaction groups, eight failure/recovery groups, 17 ballot UI groups and five extended camera groups passed.

The guide was checked at 320 × 568, 390 × 867, 867 × 390 and 1440 × 1000. Automated WCAG A/AA audits reported no guide violations. Reduced motion, disabled actions and focus restoration were included. Tests used Windows desktop Edge 153.0.4234.32 and emulated touch/viewport sizes, not physical phones.

The release workflow checks local and repository-prefixed paths, manifest hashes, local PDF/font/license assets, import/edit/export and downloaded PDF/print output from a freshly extracted ZIP. It rejects ignored research/tools/local instructions from the package. The launcher selects B.8 using numeric dotted ordering.

273 preservation records cover earlier public mockup/reference files, four prior release/stage archives and immutable B.8 fixtures. Detailed artifacts and local package hashes stay under ignored tools/docs.

A real 2024 ballot transcription by a separate Claude/Astra session is the next content exercise. Follow [AUTHORING.md](AUTHORING.md); no external transcription or physical-device test is claimed here.
