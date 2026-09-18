import { envelope, validateEnvelope, MAX_IMPORT_BYTES } from './content-contract.js';
import { clone, canonical, applyFields, collections, editableValues, changedGroups } from './content-fields.js';

export class ContentConflict extends Error {}
export function createContentStore({ seed, original, storage, basePath, locks = null }) {
  const prefix = `whatsonmyballot:${basePath}:${seed.datasetId}:`;
  const key = `${prefix}content:v1`, recoveryKey = `${prefix}recovery:v1`;
  let current = envelope(seed, original), previous = null, token = null, warning = '', unreadableRaw = null;
  function read() {
    if (!storage) throw new Error('Browser saving is unavailable.');
    return storage.getItem(key);
  }
  // Store only edits. The complete baseline (including large Markdown and
  // attachments) already lives in IndexedDB and must not consume localStorage.
  function pack(snapshot) {
    return { format: 'whatsonmyballot-content-edits', contentRevision: snapshot.contentRevision, exportedAt: snapshot.exportedAt,
      fields: changedGroups(original, snapshot.content).map(({id, group}) => ({id, group, values: editableValues(snapshot.content[collections[group]].find(item => item.id === id), group)})) };
  }
  function unpack(snapshot) {
    if (snapshot?.format !== 'whatsonmyballot-content-edits') return snapshot;
    if (!Number.isSafeInteger(snapshot.contentRevision) || snapshot.contentRevision < 0 || !Array.isArray(snapshot.fields)) throw new Error('Invalid saved edits.');
    const content = clone(original), seen = new Set();
    for (const draft of snapshot.fields) { const identity = draft.group + ':' + draft.id; if (seen.has(identity)) throw new Error('Repeated saved edit.'); seen.add(identity); applyFields(content, original, draft, {mutate:true}); }
    return {...envelope(seed, content, snapshot.contentRevision), exportedAt: snapshot.exportedAt};
  }
  function decode(raw) {
    if (!raw) return { current: envelope(seed, original), previous: null };
    if (new TextEncoder().encode(raw).byteLength > MAX_IMPORT_BYTES * 2 + 2048) throw new Error('Saved content is too large.');
    const value = JSON.parse(raw);
    if (!value || Object.keys(value).sort().join(',') !== 'current,format,previous,schemaVersion' || value.format !== 'whatsonmyballot-local-content' || value.schemaVersion !== '1.0.0') throw new Error('Unknown saved-content format.');
    value.current = unpack(value.current); if (value.previous !== null) value.previous = unpack(value.previous);
    validateEnvelope(value.current, seed, original);
    if (value.previous !== null) validateEnvelope(value.previous, seed, original);
    return value;
  }
  function load() {
    let raw = null;
    try {
      raw = read(); const loaded = decode(raw);
      current = loaded.current; previous = loaded.previous; token = raw; warning = ''; unreadableRaw = null;
    } catch { current = envelope(seed, original); previous = null; token = null; unreadableRaw = raw; warning = 'Saved content could not be read. The bundled original is shown. To replace unreadable content, review Restore original content.'; }
    return clone(current);
  }
  async function commit(content, expectedRevision, { replaceUnreadable = false } = {}) {
    const operation = () => {
      const raw = read();
      const replacing = replaceUnreadable && unreadableRaw !== null && raw === unreadableRaw && canonical(content) === canonical(original);
      try { decode(raw); } catch { if (!replacing) throw new Error('Saved content is unreadable. Export your draft, then use Restore original content in Admin.'); }
      if ((!replacing && raw !== token) || expectedRevision !== current.contentRevision) throw new ContentConflict('Saved content changed in another tab. Reload the saved version or export your draft.');
      const next = envelope(seed, content, current.contentRevision + 1);
      validateEnvelope(next, seed, original);
      if (new TextEncoder().encode(JSON.stringify(next)).byteLength > MAX_IMPORT_BYTES) throw new Error('Content exceeds the 5 MiB limit.');
      // A single atomic localStorage write includes the previous saved version.
      const serialized = JSON.stringify({ format: 'whatsonmyballot-local-content', schemaVersion: '1.0.0', current: pack(next), previous: pack(current) });
      storage.setItem(key, serialized);
      previous = current; current = next; token = serialized; warning = ''; unreadableRaw = null;
      return clone(current);
    };
    return locks?.request ? locks.request(key, operation) : operation();
  }
  function saveRecovery(draft, owner) {
    try {
      if (!storage) throw new Error();
      const record = { format: 'whatsonmyballot-draft', schemaVersion: '1.0.0', datasetId: seed.datasetId, baseDatasetVersion: seed.baseDatasetVersion, baseRevision: draft.revision, baseToken: token, savedAt: new Date().toISOString(), owner, draft: clone(draft) };
      const serialized = JSON.stringify(record);
      if (new TextEncoder().encode(serialized).byteLength > MAX_IMPORT_BYTES * 3) throw new Error();
      storage.setItem(`${recoveryKey}:${owner}`, serialized);
      return true;
    } catch { return false; }
  }
  function recoveries() {
    if (!storage) return [];
    const found = [];
    try {
      for (let i = 0; i < storage.length; i++) {
        const name = storage.key(i); if (!name?.startsWith(`${recoveryKey}:`)) continue;
        try {
          const raw = storage.getItem(name); if (raw.length > MAX_IMPORT_BYTES * 3) continue;
          const record = JSON.parse(raw), draft = record.draft;
          if (record.format !== 'whatsonmyballot-draft' || record.schemaVersion !== '1.0.0' || record.datasetId !== seed.datasetId || record.baseDatasetVersion !== seed.baseDatasetVersion || !draft || !['edit', 'import'].includes(draft.kind) || record.baseRevision !== draft.revision || !Number.isSafeInteger(draft.revision) || draft.revision < 0 || typeof record.owner !== 'string' || name !== `${recoveryKey}:${record.owner}`) continue;
          validateEnvelope(envelope(seed, draft.baseContent), seed, original);
          if (draft.kind === 'import') validateEnvelope(envelope(seed, draft.proposed), seed, original);
          else {
            const savedRecord = current.content[collections[draft.group]]?.find(item => item.id === draft.id);
            if (!savedRecord || canonical(Object.keys(draft.values).sort()) !== canonical(Object.keys(editableValues(savedRecord, draft.group)).sort()) || Object.values(draft.values).some(value => typeof value !== 'string' || value.length > 200000)) continue;
            applyFields(current.content, original, draft); // Shape validation; an unfinished field may still need correction.
          }
          found.push({ ...record, key: name, matching: record.baseRevision === current.contentRevision && record.baseToken === token });
        } catch { /* Ignore unrelated/corrupt recovery records; never publish them. */ }
      }
    } catch { return []; }
    return found.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
  }
  function clearRecovery(owner) { try { storage?.removeItem(`${recoveryKey}:${owner}`); } catch { /* Best effort. A stale revision can never auto-apply. */ } }
  return { key, recoveryKey, load, commit, saveRecovery, recoveries, clearRecovery,
    get current() { return clone(current); }, get previous() { return previous ? clone(previous) : null; }, get warning() { return warning; }, get hasUnreadable() { return unreadableRaw !== null; },
    changedExternally() { try { const raw = read(); return raw !== token && !(unreadableRaw !== null && raw === unreadableRaw); } catch { return false; } },
  };
}
