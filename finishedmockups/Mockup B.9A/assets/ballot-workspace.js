// One active B.9A ballot. The full portable bundle is an atomic IndexedDB record.
// A new generation isolates choices, preferences and drafts, even for the same ID.
const copy = value => structuredClone(value);
export async function openWorkspace({ indexedDB = globalThis.indexedDB, storage = globalThis.localStorage, scope = new URL('../', import.meta.url).pathname } = {}) {
  if (!indexedDB) throw new Error('This browser cannot save a ballot workspace. Enable IndexedDB and try again.');
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('whatsonmyballot-b9a:' + scope, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('workspace');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('The ballot workspace could not be opened.'));
    request.onblocked = () => reject(new Error('Close another B.9A tab and try again.'));
  });
  db.onversionchange = () => db.close();
  let currentGeneration;
  async function load() {
    return new Promise((resolve, reject) => {
      const tx = db.transaction('workspace', 'readonly');
      const request = tx.objectStore('workspace').get('active');
      let result;
      request.onsuccess = () => { result = request.result || null; };
      tx.oncomplete = () => {
        if (result && (result.format !== 'whatsonmyballot-b9a-workspace' || typeof result.generation !== 'string' || !result.ballot)) return reject(new Error('The saved ballot workspace is unreadable.'));
        currentGeneration = result?.generation || null;
        resolve(result ? { ballot: copy(result.ballot), generation: result.generation } : null);
      };
      tx.onerror = tx.onabort = () => reject(new Error('The saved ballot could not be read.'));
    });
  }
  async function replace(ballot) {
    const generation = crypto.randomUUID();
    const next = { format: 'whatsonmyballot-b9a-workspace', schemaVersion: '1.0.0', generation, ballot: copy(ballot) };
    // Read and replace in the same transaction; stale tabs cannot silently replace
    // a newer import. No local data is removed until persistence succeeds.
    await new Promise((resolve, reject) => {
      const tx = db.transaction('workspace', 'readwrite');
      const objectStore = tx.objectStore('workspace');
      const request = objectStore.get('active');
      let conflict = false;
      request.onsuccess = () => {
        if (currentGeneration !== undefined && (request.result?.generation || null) !== currentGeneration) { conflict = true; tx.abort(); return; }
        try { objectStore.put(next, 'active'); } catch { try { tx.abort(); } catch {} }
      };
      tx.oncomplete = resolve;
      tx.onerror = tx.onabort = () => reject(new Error(conflict ? 'Another B.9A tab imported a ballot. Reload before importing again.' : 'The new ballot could not be saved. The current ballot is unchanged.'));
    });
    currentGeneration = generation;
    // B.9A-generated dataset IDs are namespaced independently of all old mockups.
    try {
      const remove = [];
      for (let i = 0; i < storage?.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith('whatsonmyballot:' + scope + ':')) remove.push(key);
      }
      remove.forEach(key => storage.removeItem(key));
    } catch { /* Generation isolation remains effective when storage is unavailable. */ }
    return { ballot: copy(next.ballot), generation };
  }
  return { load, replace, close: () => db.close(), scope };
}
