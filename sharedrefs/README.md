# Shared app references

This tracked folder contains the documents used by the app and its demo: the [two-page historical ballot](ballots/2024-11-05-akron-1af.pdf), its [provenance](ballots/2024-11-05-akron-1af-provenance.json), the [example profile](candidates/profile-example.md), the [Mockup A review guides](mockup-a/README.md), the [B1 review guide](mockup-b/README.md), the [B.1 review guide](mockup-b.1/README.md), and the [B.2 review guide](mockup-b.2/README.md).

The full county PDFs, research, plans, and detailed test reports stay in local, ignored `/docs/`. They are not required by the app. Development scripts stay in ignored `/tools/`.

Keep this folder beside `finishedmockups/`, `version.js`, and `preview.mjs` when copying or publishing the site. The ZIP includes this layout.

`registry.js` maps existing content reference keys to these physical files. The `markdownPath` and PDF `path` values in the ballot JSON remain stable identifiers for saved-content compatibility. The app resolves them through this registry. App code must not treat those identifiers as direct deployment URLs. Unlisted keys are rejected.
