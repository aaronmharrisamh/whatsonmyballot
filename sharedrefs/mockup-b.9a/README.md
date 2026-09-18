# B.9A review guide

Open [B.9A](../../finishedmockups/Mockup%20B.9A/index.html). It copies B.9 and makes imported ballots easier to read and load.

1. Load a ballot that has no recommendation marks. It starts with **Showing All**, so every choice is available.
2. With **Only Recommended** on, visit a section with no recommendations. Its choices still appear.
3. Drop a ballot JSON file on the app, an open dialog, or the outer preview. The valid file replaces the current ballot without another approval or success popup.
4. If the app is busy, the drop waits until it can be processed safely. Invalid files show a small error and leave the current ballot intact.
5. Refresh to verify that the imported ballot remains active. Admin import, export, and the schema-example download continue to work.

The example format is unchanged. Read the [behavior](BEHAVIOR.md), [contract compatibility](CONTRACT.md), and [verification](VERIFICATION.md).
