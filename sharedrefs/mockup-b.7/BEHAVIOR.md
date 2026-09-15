# B.7 behavior and data

App version: 0.1.8. Content, notes, annotations, and area catalog schemas remain 1.0.0. B.7 uses dataset b7-fictional-ballot-demo and catalog b7-sample-areas. Earlier mockups and their saves remain independent.

The guide visibility boolean remains internal and defaults true. The reader preference onlyRecommendations defaults true and persists independently from personal choices. Both views share it. A transient revealedSectionId overrides the filter for one section; changing section or using Back to Start clears that override. Filtering never deletes or adds personal choices, and the choice count includes hidden saved choices. Fresh Start clears choices and restores the default filter while preserving saved editor content.

Annotation marks remain none, this, and or. THIS produces an animated down arrow, an empty marching oval, and RECOMMENDED. OR sits above an empty oval with OPTIONAL below. A personal choice hides the hint and uses a solid oval. Reduced motion removes arrow, outline, and glow motion.

A blank or whitespace-only opinion disables its button and keeps its panel closed. A nonrecommended option with an opinion uses a scale-and-asterisk SVG and the heading Opinion — Not recommended. Section-level notes use Opinion. Recommended and optional notes retain Choose This and Optional. Editors can leave unrelated notes blank. The fictional fixture includes 40 blank notes and a final section with no guide marks.

Viewer coordinates use a 1020px-wide paper and three source columns. Minimum scale fits the current page with 9% total padding. Maximum scale fits the selected section width. The slider maps logarithmically between these bounds. Wheel input zooms around the cursor with a short animation and accumulated wheel deltas; Snap switches wheel input to pan followed by recentering. Navigation and drag Snap preserve magnification unless a changed viewport or section requires clamping. Pinch remains free within the same limits. Filtering and expanding notes remeasure the page and preserve an anchor where possible.

The [B.6 area catalog contract](../mockup-b.6/AREAS.md) still applies. Runtime files live in this mockup and sharedrefs; research and development tools are excluded from the public package.
