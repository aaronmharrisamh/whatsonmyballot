// Stable content keys keep existing saved edits and JSON exports compatible.
// Physical files can move without changing the ballot's content contract.
export const REFERENCE_FILES = Object.freeze({
  'references/official-sample-ballot.pdf': 'ballots/2024-11-05-akron-1af.pdf',
  'content/candidates/profile-example.md': 'candidates/profile-example.md',
});
export function referenceUrl(key) {
  if (!Object.hasOwn(REFERENCE_FILES, key)) throw new Error('Unknown shared reference.');
  return new URL(REFERENCE_FILES[key], import.meta.url).href;
}
