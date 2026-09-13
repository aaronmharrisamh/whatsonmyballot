# What's on My Ballot?

A static historical-ballot demo with A1–A5, B1, B.1, and the new B.2 virtual ballot, local Admin editing, and a mobile/desktop review shell.

From the repository root, run:

```powershell
node preview.mjs
```

Open [the mockups](http://127.0.0.1:4173/finishedmockups/). Node is only needed for local preview; no package installation is required. The root entry also works under a GitHub Pages repository path.

[version.js](version.js) is the single app-version source, currently `0.1.3`. It supplies the landing page, preview footer, design notes, Help, and Admin. App versions are separate from the content schema and saved-content revisions.

The sample is **Akron Township, Precinct 1AF, November 5, 2024**. Lake Orion remains the preferred later replacement. Candidate profiles are labeled examples. The [two-page sample PDF](sharedrefs/ballots/2024-11-05-akron-1af.pdf) and [client review guide](sharedrefs/mockup-a/REVIEW.md) are included.

The app and demo documents live in tracked [sharedrefs](sharedrefs/README.md). Research and full county PDFs stay in ignored `/docs/`; development scripts stay in ignored `/tools/`. `.claude/`, root `AGENTS.md`, and root `CLAUDE.md` are also ignored. A fresh clone does not include those local files. The preview helper only serves the public app folders and root runtime files.

Read the [B.2 review guide](sharedrefs/mockup-b.2/README.md) and [verification](sharedrefs/mockup-b.2/VERIFICATION.md). Read the [B.1 review guide](sharedrefs/mockup-b.1/README.md) and [verification](sharedrefs/mockup-b.1/VERIFICATION.md). For B1, read the [B1 review guide](sharedrefs/mockup-b/README.md) and [B1 verification](sharedrefs/mockup-b/VERIFICATION.md). For the original designs, read the [handoff](sharedrefs/mockup-a/README.md), [content guide](sharedrefs/mockup-a/CONTENT.md), [hosting guide](sharedrefs/mockup-a/HOSTING.md), and [verification notes](sharedrefs/mockup-a/VERIFICATION.md).

Keep `sharedrefs/`, `finishedmockups/`, `version.js`, and the root entry files together. A generated portable ZIP is available in `finishedmockups/packages/`; it contains the public project layout and its release manifest, with no research or development folders. Nothing has been committed, pushed, or published by this work.
