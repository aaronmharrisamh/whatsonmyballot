# Review Mockup A

This demo helps you compare five ways to read a ballot. It uses the **November 5, 2024 Akron Township, Precinct 1AF sample**. Lake Orion is the preferred later replacement. The profiles are format examples. This guide does not cast a vote.

## Open the demo

On the developer's computer, open the [review landing page](http://127.0.0.1:4173/finishedmockups/).

Open a terminal at the repository root, which contains `preview.mjs`, `sharedrefs/`, and `finishedmockups/`. With Node installed, run:

```powershell
node preview.mjs
```

Open the address printed in the terminal. Keep the terminal open while you review. If port 4173 is in use, run `node preview.mjs 4180`. These local addresses work only on the computer running the preview. Use an HTTP preview; opening `app.html` as a local file does not load the app reliably.

## Five-minute walkthrough

1. Start with [A5](../../finishedmockups/Mockup%20A/index.html?design=a5). Press **Start my guide**. Open **Details**, then **Read more**, and open the profile example. Close the window.
2. Make any test choice. Check that selecting it does not move you ahead. Press **Next**, then **Skip** on an empty race.
3. Press **Review**. Find the choice and an undecided race. Use **Change** to go back and return to review.
4. Open **Show ballot view**. Try Front, Back, 2×, 3×, the Move buttons, and Reset view. Open a race's details and close them.
5. Open the **official sample ballot PDF**. Check its date, area, and two pages. Return to readable rows. Try Print with and without **Show explanations**.

The **Demo** menu can clear personal choices without changing the text. **Example selections** uses a labeled sample write-in. To reset the whole review, use **Restore original content** and then **Clear personal choices**, confirming each action.

## Compare the designs

Use **5 designs** to open the gallery, then **Try A1**, **Try A2**, and so on. Device switching changes the frame while keeping your page and draft. On a phone, the default app uses the available width.

Use the same race and starting choices for each comparison. A useful reference is the congressional race, reached through **All races**. Read the same information and complete the same task before choosing a favorite.

| Design | Text visible first | What to assess |
| --- | --- | --- |
| A1 — Simplest | Race, limit, and names | Can you proceed with very little guidance? |
| A2 — Light guidance | Adds a short purpose and next-step cue | Do those cues help? |
| A3 — More context | Adds a short line for each name | Are the extra lines useful? |
| A4 — Most detailed | Shows explanations and full summaries | Is the extra scrolling worth it? |
| A5 — Developer's Choice | Short guidance and visible choice status | Does this balance feel comfortable? |

A5 is a proposed design, not a result from a user study. The designs change how much information is visible. They use the same races, candidates, choices, and saved edits.

Record observations before selecting a design. Do not write down the reviewer's political choices.

| Design | Finished without help? | Hard-to-find control or unclear text | Too little / enough / too much text |
| --- | --- | --- | --- |
| A1 | | | |
| A2 | | | |
| A3 | | | |
| A4 | | | |
| A5 | | | |

Preferred design: __________  Reason: ____________________________________

## Try a local Admin edit

1. Open **Admin**. Choose a content group and press **Edit selected group**, or turn on Edit buttons and open a race.
2. Change a short field. Try Cancel and **Keep editing**. Save the change, then reload to see that it remains.
3. Open the same editor. **Restore original** fills the draft; Save applies it. Cancel can keep the prior saved edit.
4. Edit the shared document to try Markdown. Its preview shows the same reading format used in the guide.
5. Export saved content. Import that JSON file in another browser, review its changed groups, and press **Apply import**. The file carries the text, not personal choices.

This Admin control has no sign-in. Edits stay in this browser and do not publish to other people. A shared document edit affects the example linked from every candidate. See [content editing details](CONTENT.md) for recovery, version checks, and file limits.

## Checks to complete on real devices

The developer checked Edge and Chrome with browser automation. A physical phone, its keyboard, Safari, and Firefox have not been verified. Record the device and browser beside each real-device result.

| Check | Device / browser | Result and observation |
| --- | --- | --- |
| Read names and use Next without enlarging the page | | |
| Rotate the phone; keep the current race and choices | | |
| Pinch, pan to each edge, and Reset the paper view | | |
| Open a long editor with the phone keyboard visible | | |
| Reach Save, Cancel, Close, and the active field | | |
| Enlarge text or use the browser's zoom controls | | |
| Use the guide with a screen reader or other needed aid | | |

Before replacing this historical example, confirm the exact election, municipality, precinct, and ballot style. The current sample contains no proposals; the separate development Yes/No fixture is not in this review package.
