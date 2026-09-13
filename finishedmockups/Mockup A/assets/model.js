export function createGuideModel(seed, storage = globalThis.localStorage) {
  const races = seed.content.contests.filter((contest) => contest.guideBehavior === 'individual-choices');
  const byId = new Map(races.map((contest) => [contest.id, contest]));
  const basePath = new URL('../', import.meta.url).pathname;
  const key = `whatsonmyballot:${basePath}:${seed.datasetId}:guide:v1`;
  const empty = () => ({ format: 'whatsonmyballot-personal-guide', schemaVersion: '1.0.0',
    datasetId: seed.datasetId, baseDatasetVersion: seed.baseDatasetVersion,
    currentRaceId: races[0].id, started: false, choices: {}, visited: {} });
  let state = empty();
  let storageAvailable = Boolean(storage);
  const record = (id) => state.choices[id] || { candidateIds: [], writeIns: {} };
  const count = (id) => record(id).candidateIds.length + (record(id).optionIds || []).length + Object.values(record(id).writeIns).filter((name) => name.trim()).length;
  function valid(value) {
    if (!value || value.format !== state.format || value.schemaVersion !== '1.0.0'
      || value.datasetId !== seed.datasetId || value.baseDatasetVersion !== seed.baseDatasetVersion
      || !byId.has(value.currentRaceId) || typeof value.started !== 'boolean'
      || !value.choices || typeof value.choices !== 'object' || Array.isArray(value.choices)
      || !value.visited || typeof value.visited !== 'object' || Array.isArray(value.visited)) return false;
    for (const [id, choice] of Object.entries(value.choices)) {
      const race = byId.get(id);
      if (!race || !choice || !Array.isArray(choice.candidateIds) || !choice.writeIns || typeof choice.writeIns !== 'object') return false;
      if (new Set(choice.candidateIds).size !== choice.candidateIds.length || choice.candidateIds.some((candidate) => !race.candidateIds.includes(candidate))) return false;
      const options = choice.optionIds === undefined ? [] : choice.optionIds;
      if (!Array.isArray(options) || new Set(options).size !== options.length || options.some(option => !race.optionIds.includes(option))) return false;
      const writes = Object.entries(choice.writeIns);
      if (writes.some(([slot, name]) => !race.writeIns.some((row) => row.id === slot) || typeof name !== 'string' || name.length > 120)) return false;
      if (choice.candidateIds.length + options.length + writes.filter(([, name]) => name.trim()).length > race.maxSelections) return false;
    }
    return Object.entries(value.visited).every(([id, status]) => byId.has(id) && ['visited', 'skipped'].includes(status));
  }
  try { const saved = storage?.getItem(key); if (saved) { const parsed = JSON.parse(saved); if (valid(parsed)) state = parsed; } }
  catch { storageAvailable = false; }
  function persist() { try { storage?.setItem(key, JSON.stringify(state)); } catch { storageAvailable = false; } }
  return {
    races, key, get state() { return state; }, get storageAvailable() { return storageAvailable; },
    record, count, answered: () => races.filter((race) => count(race.id) > 0).length,
    visit(id) { if (!byId.has(id)) return; state.started = true; state.currentRaceId = id; state.visited[id] ||= 'visited'; persist(); },
    choose(id, candidateId, checked) {
      const race = byId.get(id);
      if (!race?.candidateIds.includes(candidateId)) return { ok: false, message: 'This choice is not in this race.' };
      const next = structuredClone(record(id));
      if (race.maxSelections === 1) { next.candidateIds = checked ? [candidateId] : []; if (checked) { next.writeIns = {}; delete next.optionIds; } }
      else {
        if (checked && !next.candidateIds.includes(candidateId)) {
          if (count(id) >= race.maxSelections) return { ok: false, message: `You have selected ${race.maxSelections}. Clear one choice before you add another.` };
          next.candidateIds.push(candidateId);
        } else if (!checked) next.candidateIds = next.candidateIds.filter((entry) => entry !== candidateId);
      }
      state.choices[id] = next; state.visited[id] = 'visited'; persist(); return { ok: true };
    },
    chooseOption(id, optionId, checked) {
      const race = byId.get(id);
      if (!race?.optionIds.includes(optionId)) return { ok: false, message: 'This answer is not in this item.' };
      const next = structuredClone(record(id)); next.optionIds ||= [];
      if (race.maxSelections === 1) { next.optionIds = checked ? [optionId] : []; if (checked) { next.candidateIds = []; next.writeIns = {}; } }
      else if (checked && !next.optionIds.includes(optionId)) {
        if (count(id) >= race.maxSelections) return { ok: false, message: 'Clear an answer before you add another.' };
        next.optionIds.push(optionId);
      } else if (!checked) next.optionIds = next.optionIds.filter(option => option !== optionId);
      state.choices[id] = next; state.visited[id] = 'visited'; persist(); return { ok: true };
    },
    write(id, slot, name) {
      const race = byId.get(id);
      if (!race?.writeIns.some((entry) => entry.id === slot) || name.length > 120) return { ok: false, message: 'Use a name of 120 characters or fewer.' };
      const next = structuredClone(record(id));
      if (name.trim() && !next.writeIns[slot]?.trim() && race.maxSelections > 1 && count(id) >= race.maxSelections) {
        return { ok: false, message: `You have selected ${race.maxSelections}. Clear one choice before you add a write-in.` };
      }
      if (race.maxSelections === 1 && name.trim()) { next.candidateIds = []; next.writeIns = {}; delete next.optionIds; }
      if (name.length) next.writeIns[slot] = name; else delete next.writeIns[slot];
      state.choices[id] = next; state.visited[id] = 'visited'; persist(); return { ok: true };
    },
    clearRace(id, skipped = false) { delete state.choices[id]; state.visited[id] = skipped ? 'skipped' : 'visited'; persist(); },
    clearAll() { state = empty(); try { storage?.removeItem(key); } catch { storageAvailable = false; } },
    example() {
      state = empty();
      // A write-in label demonstrates state without recommending any actual candidate.
      const race = races.find((entry) => entry.writeIns.length);
      state.choices[race.id] = { candidateIds: [], writeIns: { [race.writeIns[0].id]: 'Demo name — replace this' } };
      state.visited[race.id] = 'visited';
      state.started = true; state.currentRaceId = race.id; persist();
    },
  };
}
