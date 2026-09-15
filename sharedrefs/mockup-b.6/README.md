# B.6 / v0.1.7 review guide

Open [B.6](../../finishedmockups/Mockup%20B.6/index.html). Phone view remains the default.

## Start fresh

New B.6 visits open Our example ballot in Sample Township, Precinct DEMO, with no personal choices. The 148 neutral sample opinions and 55 red guide marks remain populated. The dataset has its own save namespace, so B.5 choices do not enter B.6.

A faint check or OR sits inside the voting oval on the left. Its symbol stays steady while the outline moves and a soft glow pulses. A saved personal choice replaces it with a filled oval and stops that hint's animation. Clearing the choice restores the guide hint. Reduced-motion settings use static outlines.

The guide notes say Opinion — Choose This or Opinion — Optional. Unmarked rows keep the ordinary blue theme when their opinions are opened. Show opinion guide is a switch that hides guide marks, highlights, and automatic opinion openings. Personal choices remain saved.

## Choose an area

Open District in the bottom navigation. Known location names appear as text. A dropdown appears only when more than one choice exists. A ballot icon marks an option with available data; unavailable options have a softer appearance and an explicit No ballot data label.

The current area remains active while you change the form. Press Use this area to activate it. Areas without data show a notice and disable Ballot, My guide, and View. The menu, Help, and Admin remain accessible. Create ballot is a clearly labeled placeholder.

The selected area is remembered, and each dataset keeps its own personal choices and Admin saves. Returning to the example area restores its prior choices. The [catalog contract](AREAS.md) describes how more areas and ballot bundles can be added.

## Explore Ballot Viewer

View and the existing minimap both open the viewer zoomed out. The white paper floats over the fixed plus pattern. All rows have slim information buttons, and every highlighted row has its opinion open. This makes the paper longer than the original layout reference.

Zoom first fits the current section, then switches back to the whole page. Next and Prev align the next section's top without changing magnification. Snap recenters after a drag at the same zoom and keeps the nearby row in place. Plus, minus, the slider, and pinch remain independent zoom controls.

The right-hand pill floats over the full-width canvas. Panning can move beyond the paper's edges. The edge arrow returns to the selected section at the current zoom. Click the backdrop or X to close. A drag that ends outside the viewer does not close it.

## Menu and editing

The hamburger contains Demo, Admin, and Help. The bottom navigation is District, Ballot, My guide, and View.

Fresh Start clears personal choices and returns to the first section. Example selections is an explicit way to fill sample choices. Neither action changes the opinion guide or saved text. Admin retains local Save, Cancel, Restore original, dirty-state protection, and separate JSON exports.

All locations and candidate names in B.6 are fictional. Random guide marks show the interface; they do not endorse real candidates or parties. The original historical PDF remains a separate layout reference.
