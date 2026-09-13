# Run or host the mockups

## Local preview

At the repository or extracted ZIP root, run:

```powershell
node preview.mjs
```

Open the printed address, then choose a mockup. If port 4173 is busy, use `node preview.mjs 4180`. Press Ctrl+C to stop. This helper needs Node but no packages and binds only to this computer. It serves the public root files, `finishedmockups/`, and `sharedrefs/`; local research and tools are not served.

## GitHub Pages

Publish the public project layout from the repository root. Keep the root `index.html`, `.nojekyll`, `version.js`, `finishedmockups/`, and `sharedrefs/` in the same relative positions. The Node preview helper is for local use. Pages serves the static files.

The root entry forwards to `finishedmockups/` with a relative URL. Shared references use module-relative URLs, so the repository-name prefix remains intact. Do not deploy only the Mockup A folder.

GitHub's [site-creation documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) explains how to select a publishing source. After deployment, verify A1–A5, Markdown, Admin, and the ballot PDF at the actual URL. No publication was performed by this work.

## Copies and saved work

The portable ZIP preserves the public project layout and includes a root `release-manifest.json`. Its version, file sizes, and SHA-256 hashes identify the packaged release. The ZIP excludes ignored research, tools, local settings, and agent instructions.

Browser edits belong to the origin and app path. Export Admin content before moving to a different host, port, path, or browser, then import and review it at the new address. Personal choices are separate and do not travel in that file.

The app keeps the same dataset IDs, baseline, schema, and reference keys after the move to shared references. Existing valid Admin exports remain compatible. The [reference registry](../registry.js) maps those stable keys to the current files.

Read the [review walkthrough](REVIEW.md), [content guide](CONTENT.md), and [verification notes](VERIFICATION.md).
