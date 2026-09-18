# Shared app references

This tracked folder contains the documents used by the app and its demo: the [two-page historical ballot](ballots/2024-11-05-akron-1af.pdf), its [provenance](ballots/2024-11-05-akron-1af-provenance.json), the [example profile](candidates/profile-example.md), the [Mockup A review guides](mockup-a/README.md), the [B1 review guide](mockup-b/README.md), the [B.1 review guide](mockup-b.1/README.md), the [B.2 review guide](mockup-b.2/README.md), the [B.3 review guide](mockup-b.3/README.md), the [B.4 review guide](mockup-b.4/README.md), the [B.5 review guide](mockup-b.5/README.md), the [B.6 review guide](mockup-b.6/README.md), the [B.7 review guide](mockup-b.7/README.md), the [B.7B review guide](mockup-b.7b/README.md), the [B.7C review guide](mockup-b.7c/README.md), the [B.7D review guide](mockup-b.7d/README.md), the [B.7E review guide](mockup-b.7e/README.md), the [B.7F review guide](mockup-b.7f/README.md), the [B.7G review guide](mockup-b.7g/README.md), and the current [B.7H review guide](mockup-b.7h/README.md).

The full county PDFs, research, plans, and detailed test reports stay in local, ignored `/docs/`. They are not required by the app. Development scripts stay in ignored `/tools/`.

Keep this folder beside `finishedmockups/`, `version.js`, and `preview.mjs` when copying or publishing the site. Run `node preview.mjs` from the repository root.

`registry.js` maps existing content reference keys to these physical files. The `markdownPath` and PDF `path` values in the ballot JSON remain stable identifiers for saved-content compatibility. The app resolves them through this registry. App code must not treat those identifiers as direct deployment URLs. Unlisted keys are rejected.

The outmoded B.8 reference uses an independent [collection contract](mockup-b.8/README.md) and [permanent schema blueprint](mockup-b.8/SCHEMASAMPLE.JSON). Imported attachments resolve through collection IDs and Blob URLs; the legacy registry stays unchanged.

Current: [B.9 review guide](mockup-b.9/README.md), [portable ballot contract](mockup-b.9/CONTRACT.md), and [verification](mockup-b.9/VERIFICATION.md).
