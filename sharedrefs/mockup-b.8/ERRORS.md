# Collection errors

Each invalid collection is rejected as a whole. The contract never changes active app data. Part 2 must keep the current collection until validation and storage both succeed.

| Code | Meaning | Correction |
| --- | --- | --- |
| JSN-E01 | Input is not readable JSON. | Choose one .json file; fix syntax or encoding. |
| JSN-E02 | Unsupported format or schema version. | Use whatsonmyballot-collection / 1.0.0. |
| JSN-E03 | Invalid field, structure or type. | Follow the schema and remove unknown fields. |
| JSN-E04 | A record ID is repeated. | Use a unique ID and update references. |
| JSN-E05 | A reference or ownership link is invalid. | Use an existing record of the correct type and parent. |
| JSN-E06 | Ballot mechanics or layout is invalid. | Check limits, choice kinds, Yes/No answers and page order. |
| JSN-E07 | Guide content has a wrong target or author. | Use choices from its ballot and a valid named author. |
| JSN-E08 | Attachment encoding, content or metadata is invalid. | Regenerate from the real allowed file bytes. |
| JSN-E09 | Actual file or expanded content exceeds limits. | Reduce below 25 MB file / 100 MB expanded. |

Errors contain `code`, `message`, `path`, `recordId`, `expectedVersion`, `receivedVersion` and `hint`. A path or ID is empty/null when input cannot provide it. Up to twelve structural errors are reported; semantic and attachment checks stop at the first failure. Earlier validation stages take precedence.

For example:

```text
JSN-E05: Expected page owned by ballot-township: missing-page
Path: /ballots/0/contests/2/pageId
Record: missing-page
Schema: expected 1.0.0; received 1.0.0
Fix: Use an existing ID of the right record type and check parent relationships.
```

Give the report and JSON to Claude/Astra. Ask it to correct the listed reference using a page ID from that ballot. Do not remove a real contest to suppress the error.

A schema version mismatch does not attempt migration. An invalid attachment makes the whole file invalid, even if the current screen does not display it. Browser capability, worker loading, cancellation and storage failures are operational errors; they do not imply a bad schema. In Part 2, a multiple-file drop maps to JSN-E03, while a non-JSON drop maps to JSN-E01.
