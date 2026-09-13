import { referenceUrl } from '../../../sharedrefs/registry.js';
import { marked } from './vendor/marked.esm.js';
import { safeHttps } from './shared.js';
import { safeContentLink } from './content-contract.js';

export function renderMarkdown(markdown, content = null) {
  const tokens = marked.lexer(markdown, { gfm: true });
  function stripHtml(items) {
    for (const token of items) {
      if (token.type === 'html') { token.type = 'text'; token.text = token.raw.replaceAll('<', '&lt;').replaceAll('>', '&gt;'); }
      if (token.tokens) stripHtml(token.tokens);
      if (token.items) stripHtml(token.items);
    }
  }
  stripHtml(tokens);
  const clean = globalThis.DOMPurify.sanitize(marked.parser(tokens), {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'a', 'blockquote', 'code', 'pre', 'br', 'hr'],
    ALLOWED_ATTR: ['href', 'title'],
  });
  const template = document.createElement('template');
  template.innerHTML = clean;
  for (const link of template.content.querySelectorAll('a')) {
    const value = link.getAttribute('href');
    const href = content ? safeContentLink(value, content) : safeHttps(value);
    if (href) { link.href = safeHttps(href) || referenceUrl(href); link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    else link.removeAttribute('href');
  }
  return template.innerHTML;
}
