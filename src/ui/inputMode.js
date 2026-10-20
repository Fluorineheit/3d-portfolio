// src/ui/inputMode.js

const coarse = window.matchMedia?.('(pointer: coarse)');
const listeners = new Set();
// Some device switches (e.g. devtools device mode) change the answer without a 'change' event, so it is
// also re-checked every frame (poll, from the render loop); acts only when the media answer changes
let lastCoarse = Boolean(coarse?.matches);

/**
 * Whether the visitor is using touch, kept up to date: the media query can change (devtools device
 * mode, tablets with a keyboard dock), and touchscreen laptops report a mouse until a finger lands.
 */
export const inputMode = {
  touch: Boolean(coarse?.matches),

  poll() {
    const now = Boolean(coarse?.matches);
    if (now === lastCoarse) return;
    lastCoarse = now;
    set(now);
  },

  onChange(listener) {
    listeners.add(listener);
  },
};

function set(touch) {
  if (touch === inputMode.touch) return;
  inputMode.touch = touch;
  listeners.forEach((listener) => listener(touch));
}

coarse?.addEventListener('change', (event) => set(event.matches));
window.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'touch') set(true);
  else if (event.pointerType === 'mouse') set(false);
}, { capture: true, passive: true });
