# Bundled validation and Markdown dependencies

The app uses local copies of marked 18.0.12 and DOMPurify 3.4.15. Their license files are in this folder. No CDN request is made at runtime.

The [marked documentation](https://marked.js.org/) explains that generated HTML requires sanitization. The [DOMPurify project](https://github.com/cure53/DOMPurify) documents the allowed-tag configuration. The wrapper in `../content-renderer.js` disables active raw HTML, uses an explicit tag list, and restricts links to HTTPS or validated bundled document paths.

The schema validator is generated with [AJV 8.20.0](https://ajv.js.org/standalone.html), [ajv-formats 3.0.1](https://github.com/ajv-validator/ajv-formats), and [esbuild 0.28.2](https://esbuild.github.io/). AJV uses its Draft 2020-12 implementation. The standalone validator and its helper functions are bundled in `validate-content.js`; schema compilation happens only during development, with no runtime `eval` or CDN. AJV and ajv-formats MIT licenses are included here. Esbuild is a development tool, not a runtime dependency.

The dependency source and exact versions are recorded in `tools/ui-check/package-lock.json` at the repository root. These browser copies are the runtime artifacts; the tools folder is not needed to serve this mockup.
