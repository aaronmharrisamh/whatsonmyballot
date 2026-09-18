// Both documents accept file drops; only app.js owns ballot validation and import.
export function installFileDrop({ target = window, onFile, onError = () => {} } = {}) {
  if (typeof onFile !== 'function') throw new TypeError('A file-drop callback is required.');
  const isFileDrag = event => {
    const data = event.dataTransfer;
    return Boolean(data && (Array.from(data.types || []).includes('Files') || Array.from(data.items || []).some(item => item.kind === 'file') || data.files?.length));
  };
  const report = error => onError(error instanceof Error ? error : new Error(String(error)));
  const over = event => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    try { event.dataTransfer.dropEffect = 'copy'; } catch { /* Some browsers expose a read-only drag payload. */ }
  };
  const drop = event => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length !== 1) { report(new Error('Drop one ballot JSON file at a time.')); return; }
    const file = files[0];
    if (!/\.json$/i.test(file.name || '')) { report(new Error('Choose a file with a .json extension.')); return; }
    // MIME can be blank for a local JSON file. The shared import validates bytes.
    try { Promise.resolve(onFile(file)).catch(report); } catch (error) { report(error); }
  };
  target.addEventListener('dragover', over, true);
  target.addEventListener('drop', drop, true);
  return () => { target.removeEventListener('dragover', over, true); target.removeEventListener('drop', drop, true); };
}