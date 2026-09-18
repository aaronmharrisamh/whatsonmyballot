# B.9A behavior

B.9A preserves B.9’s ballot format and interface. The app version is v0.3.1; canonical schema version remains 1.0.0.

A ballot with no recommended or optional marks starts with Showing All and its filter switch is disabled until guide marks exist. Recommendation filtering applies only to sections that have guide marks. An unmarked section always keeps its choices visible, including in the Ballot Viewer. This prevents the filter from creating an empty ballot section.

A JSON file can be dropped on the app, its dialogs, or the surrounding preview. Valid imports use the same validation and atomic replacement path as the Admin file picker. Drops received while the app is busy wait until the import can run. There is no extra approval step or success dialog. Errors appear in a small visible notice; the active ballot remains intact on failure.

Successful replacement clears practice choices and activates the imported ballot locally. Author content and embedded resources retain the B.9 contract. The schema example stays byte-for-byte unchanged.
