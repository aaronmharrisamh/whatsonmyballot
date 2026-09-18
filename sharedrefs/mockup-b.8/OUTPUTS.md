# My guide, PDF and print

My guide is the selected author's recommendation cheatsheet. It does not report the visitor's personal marks. Reader filters, temporary reveals, camera position, and collapsed notes do not change exported content.

## Cheatsheet

The header uses the imported election date, area path, ballot, district labels, guide and author. The optional author logo appears onscreen; print/PDF use a small app mark or text header. The original JSON retains all supplied resources.

Partisan groups use red headings; Nonpartisan groups use blue. These groups sit side by side on desktop and stack on phones. Proposals use a separate full-width blue section. Every contest remains present. An unmarked contest says **— No recommendations**.

THIS entries appear before OR alternatives, preserving source order within each category. Joint tickets remain one option. Arrows and OR hints sit above empty ovals; the guide never fills those ovals with personal votes.

Recommendation opinions start open. The mini scale button can collapse or reopen them; useful detail content has a magnifier. The same own-content and disabled-icon rules apply as in the ballot reader. Section opinions remain available, including explanations of a no-recommendation state.

The top and bottom output buttons perform identical actions.

## PDF of Ballot with Recommendations

This button downloads a real PDF. It captures the current saved collection revision, area, ballot and guide when clicked. Switching guides while it runs does not change that download. The next download uses the newly selected guide.

The PDF includes every original contest and option in source page/column order, full instructions and proposal wording, THIS/OR hints, recommendation opinions and section opinions. Unrecommended choices keep their normal labels and blank ovals. Their exception opinions remain available in the interactive ballot.

Content reflows onto readable Letter pages. It is a generated reference, not a photographic reproduction of a ballot. Each contest identifies its source side/page and column. Continued pages have identifying labels and page counts. Long names, questions and notes continue without shrinking a whole source ballot to fit one sheet.

The filename identifies the area, ballot, guide, election date, generation date, saved revision and app version. Generated output is not added to collection attachments.

Progress appears beside the output controls. Competing output jobs are disabled. Cancel stops the worker. A failed download preserves the collection and reports a retry action. Temporary output URLs are revoked after the browser has accepted the download and on page exit.

## Print my Guide

Printing uses a fresh recommendation projection, not the visible screen. It includes every recommendation opinion even if collapsed onscreen, and every authored section opinion. Personal marks, toolbars and interactive buttons are excluded.

Short contests use the two-column layout. Very long entries use the full page width so paragraphs can continue across pages. Proposals occupy a separate full-width section. Additional pages keep readable type rather than forcing the guide onto one sheet.

The current Chromium print engine supplies page-margin labels and page counts. Other browsers can vary in pagination and margin-box support. Turn off the browser's extra URL/date headers if they duplicate the guide's own labels. Closing or canceling print restores the controls and focus.

## Local PDF dependencies and text support

The published app bundles **pdfmake 0.3.11**, its dependency notices, and **Roboto 3.014** fonts. It loads no PDF service or runtime CDN. See [the dependency manifest](../../finishedmockups/Mockup%20B.8/assets/vendor/pdf/PDF-DEPENDENCIES.json), [MIT license](../../finishedmockups/Mockup%20B.8/assets/vendor/pdf/pdfmake.LICENSE), [Roboto OFL](../../finishedmockups/Mockup%20B.8/assets/vendor/pdf/Roboto.OFL.txt), and [dependency notices](../../finishedmockups/Mockup%20B.8/assets/vendor/pdf/DEPENDENCY-NOTICES.txt).

Roboto-supported text is embedded, searchable text. Voting marks are vectors. A line containing characters outside that font's coverage uses a high-resolution browser-font image fallback. Chinese and Arabic sample names were visually checked on Windows Edge. These fallback lines are not text-searchable in the PDF, and their available fonts depend on the operating system. Review names on the device used to generate a real guide. Browser printing uses its normal font fallback.

Implementation references: [pdfmake client setup](https://pdfmake.github.io/docs/0.3/getting-started/client-side/), [embedded fonts](https://pdfmake.github.io/docs/0.3/fonts/custom-fonts-client-side/vfs/), [page layout](https://pdfmake.github.io/docs/0.3/document-definition-object/page/), and [tables](https://pdfmake.github.io/docs/0.3/document-definition-object/tables/).

## Module boundaries

- `guide-output.js` creates a detached, frozen snapshot. It accepts no visitor choices or view state.
- `guide-view.js` builds the cheatsheet, complete print markup and safe page-margin labels.
- `ballot-ui.js` supplies shared own-content availability, SVG marks and opinion controls.
- `pdf-layout.js` builds complete paginated ballot content.
- `pdf-client.js` prepares unsupported text and coordinates `pdf-worker.js`.
- `output-controller.js` manages progress, cancellation, download URLs, print lifecycle and focus.
