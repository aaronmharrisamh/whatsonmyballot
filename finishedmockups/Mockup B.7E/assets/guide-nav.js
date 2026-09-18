// Mobile-only guide navigation. The guide's rendered height is the source of truth.
export function mountGuideNav(scrollRoot, guideRoot) {
  const nav = guideRoot?.querySelector('.b-guide-jumps');
  if (!scrollRoot || !nav) return { destroy() {} };
  const buttons = [...nav.querySelectorAll('[data-guide-jump]')];
  const sections = [...guideRoot.querySelectorAll('.b-review-capsule[data-review-category]')];
  const entries = buttons.map(button => ({
    button,
    section: sections.find(section => section.dataset.reviewCategory === button.dataset.guideJump),
  })).filter(entry => entry.section);
  if (!entries.length) return { destroy() {} };
  const mobile = matchMedia('(max-width: 800px)');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let destroyed = false, frame = 0, needsMeasure = true, measurements = [];
  let jumpIntent = null;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function schedule(measure = false) {
    if (destroyed) return;
    needsMeasure ||= measure;
    if (!frame) frame = requestAnimationFrame(update);
  }
  function measure() {
    const rootTop = scrollRoot.getBoundingClientRect().top + scrollRoot.clientTop;
    const offset = nav.getBoundingClientRect().height + 10;
    const maxScroll = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight);
    const heights = entries.map(({ section }) => Math.max(1, section.getBoundingClientRect().height));
    const total = heights.reduce((sum, height) => sum + height, 0);
    measurements = entries.map((entry, index) => {
      const top = entry.section.getBoundingClientRect().top - rootTop + scrollRoot.scrollTop;
      const weight = (100 * heights[index] / total).toFixed(4);
      if (entry.button.style.getPropertyValue('--guide-weight') !== weight) {
        entry.button.style.setProperty('--guide-weight', weight);
      }
      return { ...entry, height: heights[index], target: clamp(top - offset, 0, maxScroll) };
    });
    nav.style.setProperty('--guide-nav-height', offset + 'px');
    needsMeasure = false;
  }
  function setCurrent(current) {
    for (const entry of entries) {
      const selected = entry === current || entry.button === current?.button;
      entry.button.classList.toggle('is-current', selected);
      if (selected) entry.button.setAttribute('aria-current', 'location');
      else entry.button.removeAttribute('aria-current');
    }
  }
  function update() {
    frame = 0;
    if (destroyed || !mobile.matches) return;
    if (needsMeasure) measure();
    const top = scrollRoot.scrollTop;
    const maxScroll = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight);
    let current = measurements[0];
    for (const entry of measurements) {
      if (entry.target <= top + 2) current = entry;
    }
    if (jumpIntent && Math.abs(jumpIntent.target - top) <= 2) current = jumpIntent;
    for (let index = 0; index < measurements.length; index++) {
      const entry = measurements[index];
      const end = measurements[index + 1]?.target ?? maxScroll;
      const distance = end - entry.target;
      const progress = distance > 1 ? clamp((top - entry.target) / distance, 0, 1) : (top >= end - 1 ? 1 : 0);
      const value = progress.toFixed(4);
      if (entry.button.style.getPropertyValue('--guide-progress') !== value) {
        entry.button.style.setProperty('--guide-progress', value);
        entry.button.dataset.guideProgress = value;
      }
    }
    setCurrent(current);
  }
  function onScroll() { schedule(); }
  function onResize() { schedule(true); }
  function clearIntent() { jumpIntent = null; }
  function onKey(event) {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) clearIntent();
  }
  function onClick(event) {
    const button = event.target.closest('[data-guide-jump]');
    if (!button || !nav.contains(button) || !mobile.matches) return;
    measure();
    const entry = measurements.find(item => item.button === button);
    if (!entry) return;
    jumpIntent = entry;
    setCurrent(entry);
    const heading = entry.section.querySelector('h2') || entry.section;
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    scrollRoot.scrollTo({ top: entry.target, behavior: reduceMotion.matches ? 'instant' : 'smooth' });
    schedule();
  }
  nav.addEventListener('click', onClick);
  scrollRoot.addEventListener('scroll', onScroll, { passive: true });
  scrollRoot.addEventListener('wheel', clearIntent, { passive: true });
  scrollRoot.addEventListener('pointerdown', clearIntent, { passive: true });
  scrollRoot.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize, { passive: true });
  mobile.addEventListener('change', onResize);
  const resizeObserver = new ResizeObserver(onResize);
  resizeObserver.observe(scrollRoot);
  resizeObserver.observe(nav);
  for (const entry of entries) resizeObserver.observe(entry.section);
  document.fonts?.ready.then(() => schedule(true));
  schedule(true);
  return {
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      nav.removeEventListener('click', onClick);
      scrollRoot.removeEventListener('scroll', onScroll);
      scrollRoot.removeEventListener('wheel', clearIntent);
      scrollRoot.removeEventListener('pointerdown', clearIntent);
      scrollRoot.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      mobile.removeEventListener('change', onResize);
    },
  };
}
