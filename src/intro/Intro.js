// src/intro/Intro.js

const SEEN_KEY = 'introSeen';
const TUBE_STAGGER = 90;   // ms between tubes when progress jumps (e.g. a cached load)
const SETTLE = 600;        // let the last tube finish flickering before offering Enter
const FLIGHT = 1300;       // sign flies into its place on the cafe

function readSeen() {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
}
function saveSeen() {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* storage blocked: Enter shows again next time */ }
}

/**
 * The neon-sign intro (markup in index.html, styles in intro.css). Its tubes light up with the real
 * loading progress; when the scene is ready it offers Enter (first visit) or goes straight in, then
 * flies the sign onto the real one on the cafe while the overlay fades out.
 */
export class Intro {
  constructor(root = document.getElementById('intro')) {
    this.root = root;
    this.sign = root.querySelector('.intro__sign');
    this.backdrop = root.querySelector('.intro__backdrop');
    this.percent = root.querySelector('.intro__percent');
    this.button = root.querySelector('.intro__enter');
    this.tubes = [...root.querySelectorAll('.neon-tube')];
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.progress = 0;
    this.lit = 0;
    this.timer = null;
    this.state = 'loading';  // loading -> settling -> ready -> leaving

    // Unlit glass under every tube
    for (const tube of this.tubes) {
      const dead = tube.cloneNode(true);
      dead.setAttribute('class', 'neon-dead');
      dead.removeAttribute('filter');
      dead.removeAttribute('data-buzz');
      dead.setAttribute('aria-hidden', 'true');
      tube.before(dead);
    }

    this.button.addEventListener('click', () => this.enter());
    this.onKey = (event) => {
      if (event.key === 'Enter' && this.state === 'ready') this.enter();
    };
    window.addEventListener('keydown', this.onKey);
  }

  // 0..1; only ever moves forward
  setProgress(value) {
    if (this.state !== 'loading' && this.state !== 'settling') return;
    this.progress = Math.max(this.progress, Math.min(1, value));
    this.percent.textContent = `${Math.round(this.progress * 100)}%`;
    this.lightTubes();
  }

  lightTubes() {
    const want = this.progress >= 1 ? this.tubes.length : Math.floor(this.progress * this.tubes.length);
    if (this.timer || this.lit >= want) return;
    this.tubes[this.lit++].classList.add('is-on');
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.lit < this.tubes.length) this.lightTubes();
      else if (this.state === 'settling') setTimeout(() => this.becomeReady(), SETTLE);
    }, this.reduced ? 0 : TUBE_STAGGER);
  }

  /**
   * The scene is loaded and rendered behind the overlay.
   * signRect(): the real sign's rectangle on screen (CSS px) or null; onReveal(): start the scene's
   * own reveal (called as the overlay starts to fade).
   */
  ready({ signRect, onReveal }) {
    this.handlers = { signRect, onReveal };
    this.state = 'settling';
    this.setProgress(1);
    if (!this.timer && this.lit >= this.tubes.length) setTimeout(() => this.becomeReady(), SETTLE);
  }

  becomeReady() {
    if (this.state !== 'settling') return;
    this.state = 'ready';
    // Returning visitors go straight in; the first visit gets the Enter moment
    if (readSeen()) {
      this.enter();
      return;
    }
    this.root.classList.add('is-ready');
    this.button.focus({ preventScroll: true });
  }

  enter() {
    if (this.state !== 'ready') return;
    this.state = 'leaving';
    saveSeen();
    window.removeEventListener('keydown', this.onKey);
    this.root.classList.add('is-leaving');

    const target = this.handlers.signRect?.();
    const from = this.sign.getBoundingClientRect();
    let end = 'scale(1.06)';
    if (target && from.width > 0) {
      const dx = target.x + target.width / 2 - (from.x + from.width / 2);
      const dy = target.y + target.height / 2 - (from.y + from.height / 2);
      end = `translate(${dx}px, ${dy}px) scale(${target.width / from.width})`;
    }

    const duration = this.reduced ? 400 : FLIGHT;
    const easing = 'cubic-bezier(0.65, 0, 0.25, 1)';
    if (!this.reduced) {
      // The sign lands on the real one, then crossfades into it
      this.sign.animate(
        [
          { transform: 'none', opacity: 1 },
          { transform: end, opacity: 1, offset: 0.75 },
          { transform: end, opacity: 0 },
        ],
        { duration, easing, fill: 'forwards' },
      );
    } else {
      this.sign.animate([{ opacity: 1 }, { opacity: 0 }], { duration, fill: 'forwards' });
    }
    this.backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: duration * 0.7, delay: duration * 0.2, easing: 'ease-in-out', fill: 'forwards',
    });

    setTimeout(() => this.handlers.onReveal?.(), duration * 0.35);
    setTimeout(() => this.root.remove(), duration + 50);
  }

  fail(message) {
    clearTimeout(this.timer);
    this.state = 'failed';
    this.root.classList.add('is-failed');
    this.percent.textContent = message;
  }
}

/** Download fraction from a loader progress event (falls back to an estimate when the size is unknown). */
export function downloadFraction(event, expectedBytes = 11e6) {
  if (event.lengthComputable && event.total > 0) return event.loaded / event.total;
  return 1 - Math.exp(-event.loaded / expectedBytes * 2);
}
