/**
 * Shadow maps are redrawn only when something that casts a shadow, or a light, actually
 * changes (a door swinging, the sun moving, a new design) instead of on every frame.
 * Anything that changes calls bumpShadows(); the canvas redraws them for that many frames.
 */
let dirty = 90;
export const bumpShadows = (frames = 2) => {
  if (frames > dirty) dirty = frames;
};
export const takeShadowFrame = () => {
  if (dirty <= 0) return false;
  dirty--;
  return true;
};
