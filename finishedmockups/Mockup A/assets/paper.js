export function mountPaper(viewport, paper, saved, onChange) {
  let state = { ...saved }, fit = 0, disposed = false;
  const pointers = new Map();
  let lastCenter = null, lastDistance = 0, moved = false, downPoint = null;
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const scale = () => fit * state.zoom;
  function constrain() {
    const width = paper.offsetWidth * scale(), height = paper.offsetHeight * scale();
    state.x = width <= viewport.clientWidth ? (viewport.clientWidth - width) / 2 : clamp(state.x, viewport.clientWidth - width, 0);
    state.y = height <= viewport.clientHeight ? (viewport.clientHeight - height) / 2 : clamp(state.y, viewport.clientHeight - height, 0);
  }
  function paint() {
    constrain();
    paper.style.transform = `translate(${state.x}px,${state.y}px) scale(${scale()})`;
    viewport.dataset.zoom = state.zoom.toFixed(3);
    viewport.dataset.panX = state.x.toFixed(2); viewport.dataset.panY = state.y.toFixed(2);
    onChange({ ...state });
  }
  function resize() {
    const previous = scale();
    fit = Math.min(viewport.clientWidth / paper.offsetWidth, viewport.clientHeight / paper.offsetHeight) * .94;
    if (previous > 0) { state.x *= scale() / previous; state.y *= scale() / previous; }
    paint();
  }
  function zoomTo(zoom, point = { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 }) {
    const oldScale = scale(); state.zoom = clamp(zoom, 1, 6);
    const ratio = scale() / oldScale;
    state.x = point.x - (point.x - state.x) * ratio;
    state.y = point.y - (point.y - state.y) * ratio;
    paint();
  }
  function local(event) {
    const box = viewport.getBoundingClientRect();
    // Account for the desktop review shell scaling the whole iframe.
    return { x: (event.clientX - box.left) * viewport.clientWidth / box.width,
      y: (event.clientY - box.top) * viewport.clientHeight / box.height };
  }
  function geometry() {
    const values = [...pointers.values()];
    if (values.length >= 2) return { center: { x: (values[0].x + values[1].x) / 2, y: (values[0].y + values[1].y) / 2 },
      distance: Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y) };
    return { center: values[0], distance: 0 };
  }
  function down(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const point = local(event); pointers.set(event.pointerId, point);
    if (pointers.size === 1) { moved = false; downPoint = point; }
    const geo = geometry(); lastCenter = geo.center; lastDistance = geo.distance;
  }
  function movePointer(event) {
    if (!pointers.has(event.pointerId)) return;
    const point = local(event); pointers.set(event.pointerId, point);
    if (downPoint && Math.hypot(point.x - downPoint.x, point.y - downPoint.y) > 5) moved = true;
    const geo = geometry();
    if (pointers.size > 1) moved = true;
    if (moved) {
      event.preventDefault(); viewport.setPointerCapture(event.pointerId); viewport.classList.add('dragging');
      if (lastDistance > 0 && geo.distance > 0) zoomTo(state.zoom * geo.distance / lastDistance, lastCenter);
      if (lastCenter) { state.x += geo.center.x - lastCenter.x; state.y += geo.center.y - lastCenter.y; }
      paint();
    }
    lastCenter = geo.center; lastDistance = geo.distance;
  }
  function up(event) {
    pointers.delete(event.pointerId);
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    const geo = geometry(); lastCenter = geo.center; lastDistance = geo.distance;
    if (!pointers.size) viewport.classList.remove('dragging');
  }
  function click(event) { if (moved) { event.preventDefault(); event.stopImmediatePropagation(); moved = false; } }
  viewport.addEventListener('pointerdown', down); viewport.addEventListener('pointermove', movePointer);
  viewport.addEventListener('pointerup', up); viewport.addEventListener('pointercancel', up);
  viewport.addEventListener('click', click, true);
  const observer = new ResizeObserver(() => { if (!disposed) resize(); }); observer.observe(viewport);
  resize();
  return {
    zoomTo,
    reset() { state = { zoom: 1, x: 0, y: 0 }; paint(); },
    move(direction) {
      const step = Math.max(70, viewport.clientWidth * .3);
      if (direction === 'left') state.x += step;
      if (direction === 'right') state.x -= step;
      if (direction === 'up') state.y += step;
      if (direction === 'down') state.y -= step;
      paint();
    },
    destroy() {
      disposed = true; observer.disconnect();
      viewport.removeEventListener('pointerdown', down); viewport.removeEventListener('pointermove', movePointer);
      viewport.removeEventListener('pointerup', up); viewport.removeEventListener('pointercancel', up);
      viewport.removeEventListener('click', click, true);
    },
  };
}
