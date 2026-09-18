export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const paths = {
  ballot: '<path d="M5 13v7h16v-9h-5M7 3l10 3-4 11-10-3Z"/><path d="m7 10 2 2 4-4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  next: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  back: '<path d="M20 12H5m6-6-6 6 6 6"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  list: '<path d="M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01"/>',
  review: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="m8 9 2 2 5-5M8 16h8"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-1 .4-1 1-1 1.7M12 17h.01"/>',
  edit: '<path d="m15 5 4 4M4 20l5-1L21 7l-4-4L5 15Z"/>',
  source: '<path d="M14 3h7v7m0-7L10 14M10 3H4v17h17v-6"/>',
  pdf: '<path d="M14 2H5v20h14V7Zm0 0v6h5M8 13h8M8 17h5"/>',
  print: '<path d="M6 9V3h12v6M6 17H3V9h18v8h-3M6 14h12v7H6ZM17 12h.01"/>',
  reset: '<path d="M3 11a9 9 0 1 1 2 7M3 4v7h7"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  fit: '<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>',
  desktop: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4M7 21h10"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  play: '<path d="m8 4 13 8-13 8Z"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
};
export function icon(name, extra = '') { return `<svg class="icon ${extra}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.help}</svg>`; }
export const designId = (value) => /^a[1-5]$/i.test(value || '') ? value.toUpperCase() : 'A5';
export function safeHttps(value) { try { if (typeof value !== 'string' || /[\s\\\u0000-\u001f]/.test(value)) return null; const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; } }
