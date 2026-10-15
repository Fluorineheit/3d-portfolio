// src/ui/ViewControls.js

const HINT_CLOSED_KEY = 'controlsHintClosed';

const DESKTOP = [
  ['Drag', 'look around'],
  ['Right-drag', 'move'],
  ['Scroll', 'zoom'],
  ['Click', 'the menu board'],
];
const TOUCH = [
  ['Drag', 'look around'],
  ['Two fingers', 'move & zoom'],
  ['Tap', 'the menu board'],
];

const ICON_RESET = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v6h6"/></svg>';
const ICON_CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

function readClosed() {
  try { return localStorage.getItem(HINT_CLOSED_KEY) === '1'; } catch { return false; }
}
function saveClosed(closed) {
  try {
    if (closed) localStorage.setItem(HINT_CLOSED_KEY, '1');
    else localStorage.removeItem(HINT_CLOSED_KEY);
  } catch { /* storage blocked: the hint just shows again next visit */ }
}

/**
 * On-screen helpers for the free view (bottom of the screen):
 *  - the "how to move" hint, closable with x and brought back with the ? button
 *  - a Reset view button, shown once the camera has left the opening shot
 * Both hide while a section (Projects / About / Credits) is open; those have their own way back.
 */
export class ViewControls {
  constructor({ cameraController, menuController, controls }) {
    this.cameraController = cameraController;
    this.menuController = menuController;
    this.controls = controls;
    this.ready = false;
    this.hintOpen = !readClosed();

    this.hint = this.makeHint();
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'view-toolbar';

    this.resetButton = this.makeButton(ICON_RESET, 'Reset view', () => this.resetView());
    this.resetButton.classList.add('view-toolbar__reset');
    this.helpButton = this.makeButton('?', 'Show controls', () => this.setHintOpen(!this.hintOpen));
    this.toolbar.append(this.resetButton, this.helpButton);
    document.body.append(this.hint, this.toolbar);
  }

  // Called once the loading screen is gone
  show() {
    this.ready = true;
    this.update();
  }

  makeButton(icon, label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'view-toolbar__button';
    button.innerHTML = icon;
    button.title = label;
    button.setAttribute('aria-label', label);
    button.addEventListener('click', onClick);
    return button;
  }

  makeHint() {
    const touch = window.matchMedia('(pointer: coarse)').matches;
    const el = document.createElement('div');
    el.className = 'controls-hint';
    el.setAttribute('role', 'note');
    const items = document.createElement('div');
    items.className = 'controls-hint__items';
    for (const [key, action] of touch ? TOUCH : DESKTOP) {
      const item = document.createElement('span');
      item.className = 'controls-hint__item';
      const kbd = document.createElement('kbd');
      kbd.textContent = key;
      item.append(kbd, ` ${action}`);
      items.append(item);
    }
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'controls-hint__close';
    close.innerHTML = ICON_CLOSE;
    close.title = 'Hide controls';
    close.setAttribute('aria-label', 'Hide controls');
    close.addEventListener('click', () => this.setHintOpen(false));
    el.append(items, close);
    return el;
  }

  setHintOpen(open) {
    this.hintOpen = open;
    saveClosed(!open);
    this.update();
  }

  resetView() {
    if (this.cameraController.getIsAnimating() || this.menuController.isInSection()) return;
    this.cameraController.resetCamera();
  }

  // Whether the camera is away from the opening shot
  isAway() {
    const cc = this.cameraController;
    return this.controls.target.distanceTo(cc.originalTarget) > 0.5
      || this.cameraController.camera.position.distanceTo(cc.originalCameraPosition) > 0.5;
  }

  // Per frame; only touches the DOM when something changes
  update() {
    const free = this.ready && !this.menuController.isInSection();
    const showReset = free && !this.cameraController.getIsAnimating() && this.isAway();
    const showHint = free && this.hintOpen;
    if (showReset !== this.shownReset) {
      this.shownReset = showReset;
      this.resetButton.classList.toggle('is-visible', showReset);
      this.resetButton.tabIndex = showReset ? 0 : -1;
    }
    if (showHint !== this.shownHint) {
      this.shownHint = showHint;
      this.hint.classList.toggle('is-visible', showHint);
      this.helpButton.classList.toggle('is-active', showHint);
      this.helpButton.setAttribute('aria-pressed', String(showHint));
    }
    if (free !== this.shownToolbar) {
      this.shownToolbar = free;
      this.toolbar.classList.toggle('is-visible', free);
    }
  }
}
