import { APP_VERSION_LABEL } from '../../../version.js';
import { icon, escapeHtml as h, designId } from './shared.js';
document.querySelector('[data-app-version]').textContent = APP_VERSION_LABEL;
const iframe = document.querySelector('#app-frame');
const stage = document.querySelector('#stage'), frameSpace = document.querySelector('#frame-space'), device = document.querySelector('#device');
const dialog = document.querySelector('#shell-dialog');
const initial = designId(new URLSearchParams(location.search).get('design'));
let current = initial, mode = 'phone', fitted = true, galleryIndex = Number(initial.slice(1)) - 1, ready = false, lastFocus;
const descriptions = [
  { id: 'A1', label: 'Simplest', note: 'Just the race, the names, and your next step.', detail: 'The lightest screen. Office and candidate explanations stay behind Details. Every candidate and source is still available.', question: 'Can you make your way through with this much context?' },
  { id: 'A2', label: 'Light guidance', note: 'A little guidance at each step.', detail: 'Adds one purpose sentence and a short next-step cue. Candidate summaries stay closed until you ask for them.', question: 'Does a little guidance help you feel more certain?' },
  { id: 'A3', label: 'More context', note: 'A short introduction beside each name.', detail: 'Adds a one-line candidate overview and more selection feedback. Details opens the full example summary and its sources.', question: 'Does the added context help, or slow you down?' },
  { id: 'A4', label: 'Most detailed', note: 'More to read, already on the screen.', detail: 'Shows all three summary sentences, the office explanation, and source metadata. Text and controls keep their comfortable size.', question: 'Which details help? Which ones feel like too much?' },
  { id: 'A5', label: "2026 UX Developer's Choice", note: 'Clear choices. Details when you need them.', detail: 'Balances a short purpose sentence, clear choice feedback, and a calm next step. Candidate details open when you need them.', question: 'Does this balance make the task feel manageable?' },
];
const send = (type, data = {}) => iframe.contentWindow.postMessage({ channel: 'ballot-preview-v1', type, ...data }, location.origin);
if (initial !== 'A5') iframe.src = `app.html?design=${initial.toLowerCase()}`;
function updateCaption() {
  const design = descriptions.find((item) => item.id === current);
  document.querySelector('#caption-id').textContent = current;
  document.querySelector('#caption-title').textContent = design.label;
  document.querySelector('#caption-note').textContent = design.note;
  document.querySelector('#preview-design').textContent = current;
  document.title = `${current} · What's on My Ballot? · Mockup A`;
}
function layout() {
  const small = matchMedia('(max-width:700px)').matches;
  document.body.classList.toggle('desktop-mode', mode === 'desktop');
  document.body.classList.toggle('fit-off', !fitted && !small);
  const availableWidth = stage.clientWidth - (small ? 0 : 56);
  const availableHeight = stage.clientHeight - (small ? 0 : 36);
  let width = 390, height = 867, scale = 1;
  if (small && mode === 'phone') { width = availableWidth; height = availableHeight; }
  else if (mode === 'desktop') {
    width = small ? 1180 : Math.max(768, Math.min(1280, availableWidth));
    height = small ? Math.max(780, availableHeight * (width / availableWidth)) : Math.max(550, availableHeight);
    scale = Math.min(1, availableWidth / width, availableHeight / height);
  } else if (fitted) scale = Math.min(1, availableWidth / width, availableHeight / height);
  frameSpace.style.width = `${width * scale}px`; frameSpace.style.height = `${height * scale}px`;
  device.style.width = `${width}px`; device.style.height = `${height}px`; device.style.transform = `scale(${scale})`;
  document.querySelector('#frame-caption').textContent = `${mode === 'phone' ? 'Phone' : 'Desktop'} · ${small && mode === 'phone' ? 'Full width' : fitted ? 'Fit' : 'Actual size'}`;
  document.querySelector('#device-button').innerHTML = `${icon(mode === 'phone' ? 'desktop' : 'phone')}<span>${mode === 'phone' ? 'Desktop' : 'Mobile'}</span>`;
  document.querySelector('#fit-button').innerHTML = `${icon('fit')}<span>${fitted ? 'Fit' : 'Actual size'}</span>`;
  document.querySelector('#fit-button').setAttribute('aria-pressed', String(fitted));
}
const observer = new ResizeObserver(layout); observer.observe(stage);
window.visualViewport?.addEventListener('resize', layout);
function showDialog(title, body, cls = '') {
  if (!dialog.open) lastFocus = document.activeElement;
  dialog.className = `shell-dialog ${cls}`;
  dialog.innerHTML = `<header class="shell-dialog-header"><h2 id="shell-dialog-title" tabindex="-1">${h(title)}</h2><button type="button" class="shell-close" data-shell="close" aria-label="Close">${icon('close')}</button></header><div class="shell-dialog-content">${body}</div>`;
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('h2').focus();
}
function closeDialog() { dialog.close(); if (lastFocus?.isConnected) lastFocus.focus(); }
function gallery() {
  const design = descriptions[galleryIndex];
  showDialog('Find the right amount of detail', `<p class="gallery-intro">The same ballot. Five levels of visible information.<br>Use the buttons to compare at your own pace.</p><div class="gallery-card"><div class="gallery-image"><img src="assets/previews/${design.id.toLowerCase()}.png" alt="${h(design.id)} race screen capture" width="390" height="867"></div><div class="gallery-copy"><span class="gallery-id">${design.id}${design.id === 'A5' ? ' · Suggested' : ''}</span><h3>${h(design.label)}</h3><p>${h(design.detail)}</p><button type="button" class="gallery-open" data-shell="open-design" data-design="${design.id}">Try ${design.id} ${icon('next')}</button></div></div><div class="gallery-controls" aria-label="Choose a design"><button type="button" data-shell="previous-design" aria-label="Previous design">${icon('back')}</button>${descriptions.map((item, i) => `<button type="button" data-shell="gallery-design" data-index="${i}" aria-label="View ${item.id}" aria-pressed="${i === galleryIndex}">${item.id}</button>`).join('')}<button type="button" data-shell="next-design" aria-label="Next design">${icon('next')}</button></div><p class="gallery-status">${galleryIndex + 1} of 5 · ${h(design.question)}</p>`);
  dialog.dataset.view = 'gallery';
}
function demo() {
  showDialog('Demo controls', `<p>Try a scenario in the same shared preview.</p>${[['fresh','Start fresh'],['example','Example selections'],['clear','Clear personal choices'],['restore','Restore original content']].map(([action,label]) => `<button type="button" class="demo-row" data-shell="scenario" data-scenario="${action}">${label}${icon('next')}</button>`).join('')}<button type="button" class="demo-row" data-shell="notes">Developer notes ${icon('next')}</button>`, 'demo-dialog'); dialog.dataset.view = 'demo';
}
function notes() {
  showDialog('Design notes', `<span class="eyebrow">MOCKUP A · SEPTEMBER 2026</span><h3 style="margin-top:14px">A calm path through a long ballot.</h3><p>A1–A4 increase the amount of information on screen. A5 is the proposed balance: clear choices, a short cue, and more detail on request.</p><ul class="notes-list"><li>All five designs share the same complete historical ballot and your choices.</li><li>The app opens at a real phone width on a phone. Desktop reviewers can switch between a fitted phone and a full desktop preview.</li><li>Selecting a name does not move to the next race. Details and choice controls are separate.</li><li>Row review comes first. The optional paper view has zoom, move, and reset buttons.</li></ul><div class="note-box"><strong>Current build: ${h(APP_VERSION_LABEL)} · Phase 1 complete</strong><p>Visitor choices and Admin content save separately in this browser. Admin includes Markdown and source editors, draft recovery, revision checks, and JSON import/export with a change preview. Shared editing and sign-in are later work.</p></div><h3>Source and examples</h3><p>This is the November 5, 2024 sample for Akron Township, Precinct 1AF, in Tuscola County. Lake Orion is the preferred later replacement. The candidate profiles are labeled format examples. No voting recommendations are included.</p><p>A5 is a design recommendation, not a result from a user study. Large controls and short steps are intended to support readability; the client review will help choose the final density.</p><a href="../../sharedrefs/mockup-a/README.md" target="_blank" rel="noopener noreferrer">Open the complete handoff notes ${icon('source')}</a><p><a href="../../sharedrefs/mockup-a/REVIEW.md" target="_blank" rel="noopener noreferrer">Review steps and feedback sheet ${icon('source')}</a></p><p class="shell-note-footer">Shared documents and the app version ship with the mockups. No account, live AI call, or external font is needed.</p>`); dialog.dataset.view = 'notes';
}
document.querySelector('#demo-button').innerHTML = `${icon('play')}<span>Demo</span>`;
document.querySelector('#gallery-button').innerHTML = `${icon('grid')}<span>5 designs</span>`;
document.querySelector('#demo-button').addEventListener('click', demo);
document.querySelector('#gallery-button').addEventListener('click', () => { galleryIndex = Number(current.slice(1)) - 1; gallery(); });
document.querySelector('#header-notes').addEventListener('click', notes);
document.querySelector('#device-button').addEventListener('click', () => { mode = mode === 'phone' ? 'desktop' : 'phone'; fitted = true; layout(); });
document.querySelector('#fit-button').addEventListener('click', () => { if (matchMedia('(max-width:700px)').matches) { mode = 'phone'; fitted = true; } else fitted = !fitted; layout(); });
dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeDialog(); });
dialog.addEventListener('click', (event) => {
  const el = event.target.closest('[data-shell]'); if (!el) return;
  if (el.dataset.shell === 'close') closeDialog();
  if (el.dataset.shell === 'notes') notes();
  if (el.dataset.shell === 'previous-design' || el.dataset.shell === 'next-design') { galleryIndex = (galleryIndex + (el.dataset.shell === 'next-design' ? 1 : 4)) % 5; gallery(); }
  if (el.dataset.shell === 'gallery-design') { galleryIndex = Number(el.dataset.index); gallery(); }
  if (el.dataset.shell === 'open-design') { closeDialog(); send('design', { id: el.dataset.design }); iframe.focus(); }
  if (el.dataset.shell === 'scenario') { closeDialog(); send('demo', { action: el.dataset.scenario }); iframe.focus(); }
});
dialog.addEventListener('keydown', (event) => { if (dialog.dataset.view !== 'gallery' || !['ArrowLeft','ArrowRight'].includes(event.key)) return; event.preventDefault(); galleryIndex = (galleryIndex + (event.key === 'ArrowRight' ? 1 : 4)) % 5; gallery(); });
window.addEventListener('message', (event) => {
  if (event.source !== iframe.contentWindow || event.origin !== location.origin || event.data?.channel !== 'ballot-preview-v1') return;
  if (['ready','design-applied'].includes(event.data.type) && /^A[1-5]$/.test(event.data.id)) {
    ready = true; current = event.data.id; updateCaption();
    const url = new URL(location.href); url.searchParams.set('design', current.toLowerCase()); history.replaceState(null, '', url);
  }
});
updateCaption(); layout();
if (location.hash === '#mockups') gallery();
