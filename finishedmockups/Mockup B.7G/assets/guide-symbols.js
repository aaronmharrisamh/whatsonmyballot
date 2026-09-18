// Author recommendation symbols; these never represent visitor practice marks.
export function guideChoiceSymbol(mark){
 const shape=mark==='or'
  ? '<ellipse cx="28" cy="26" rx="26" ry="14" fill="currentColor"/><text x="28" y="32" text-anchor="middle" font-family="Arial,sans-serif" font-size="17" font-weight="700" fill="#fff">OR</text>'
  : '<path d="M22 1h12v11h8L28 25 14 12h8Z" fill="currentColor"/><ellipse cx="28" cy="36" rx="25" ry="9" fill="currentColor"/>';
 return '<svg class="b-guide-choice-symbol" data-guide-symbol="'+(mark==='or'?'or':'this')+'" viewBox="0 0 56 46" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">'+shape+'</svg>';
}
