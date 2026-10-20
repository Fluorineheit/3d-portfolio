// src/ui/ProjectsScreen.js
// The videotron as a Windows 95 desktop. From the plaza it runs a slideshow of the projects; once
// focused it shows a window with Projects / Skills / Experience tabs. Everything is painted onto the
// screen mesh (SurfaceDisplay); the skills ticker in the taskbar is a separate strip that scrolls by
// moving its texture, so the big screen texture is only re-uploaded when something actually changes.
import * as THREE from 'three';
import { SurfaceDisplay } from './SurfaceDisplay.js';
import { projectsData, skillsData } from './data/projectsData.js';
import { workData, projectYears } from './data/experienceData.js';

const W = 1600;                     // layout pixels; the screen is 10.73 x 5.86 units
const H = 874;
const FONT = 'Tahoma, "MS Sans Serif", Arial, sans-serif';
const TASKBAR_H = 60;
const TICKER = { x: 150, y: H - 48, w: W - 300, h: 38 };
const SLIDE_SECONDS = 3.5;
const TICKER_SPEED = 70;            // layout pixels per second
const B = 3;                        // bevel line width

const COL = {
  desk: '#008080', face: '#c0c0c0', hi: '#ffffff', lo: '#808080', dark: '#000000', soft: '#dfdfdf',
  title: '#000080', text: '#000000', muted: '#404040', sel: '#000080', link: '#000080',
};

// ---------- Win95 drawing helpers ----------
function frame(ctx, x, y, w, h, kind = 'raised', fill = COL.face) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  const [o1, o2, i1, i2] = kind === 'raised' ? [COL.soft, COL.dark, COL.hi, COL.lo] : [COL.lo, COL.hi, COL.dark, COL.soft];
  ctx.fillStyle = o1; ctx.fillRect(x, y, w, B); ctx.fillRect(x, y, B, h);
  ctx.fillStyle = o2; ctx.fillRect(x, y + h - B, w, B); ctx.fillRect(x + w - B, y, B, h);
  ctx.fillStyle = i1; ctx.fillRect(x + B, y + B, w - 2 * B, B); ctx.fillRect(x + B, y + B, B, h - 2 * B);
  ctx.fillStyle = i2; ctx.fillRect(x + B, y + h - 2 * B, w - 2 * B, B); ctx.fillRect(x + w - 2 * B, y + B, B, h - 2 * B);
}

function focusRect(ctx, x, y, w, h) {
  ctx.save();
  ctx.strokeStyle = COL.dark;
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 3]);
  ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);
  ctx.restore();
}

function text(ctx, str, x, y, { size = 22, bold = false, color = COL.text, align = 'left' } = {}) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  ctx.fillText(str, x, y);
}

// Short text for a project: its description, or the first sentence of the long one
function summaryOf(p) {
  return p.description || (p.longDescription ?? '').split(/(?<=\.)\s/)[0];
}

function button(ctx, regions, id, label, x, y, w, h, { hovered, disabled = false, bold = false, size = 22 } = {}) {
  frame(ctx, x, y, w, h, 'raised');
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (disabled) {
    ctx.fillStyle = COL.hi; ctx.fillText(label, x + w / 2 + 2, y + h / 2 + 2);
    ctx.fillStyle = COL.lo; ctx.fillText(label, x + w / 2, y + h / 2);
    return;
  }
  ctx.fillStyle = COL.text;
  ctx.fillText(label, x + w / 2, y + h / 2);
  if (hovered === id) focusRect(ctx, x, y, w, h);
  regions.push({ id, x, y, w, h });
}

function wrap(ctx, str, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of str.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function paragraph(ctx, str, x, y, maxWidth, maxHeight, { size = 22, lineHeight = 31, color = COL.text } = {}) {
  ctx.font = `${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const lines = wrap(ctx, str, maxWidth);
  const fit = Math.max(1, Math.floor(maxHeight / lineHeight));
  lines.slice(0, fit).forEach((l, i) => {
    const last = i === fit - 1 && lines.length > fit;
    ctx.fillText(last ? `${l.replace(/\s+\S*$/, '')}...` : l, x, y + i * lineHeight);
  });
}

function windowChrome(ctx, regions, x, y, w, h, title, hovered) {
  frame(ctx, x, y, w, h, 'raised');
  ctx.fillStyle = COL.title;
  ctx.fillRect(x + 6, y + 6, w - 12, 44);
  text(ctx, title, x + 18, y + 15, { size: 22, bold: true, color: COL.hi });
  const bx = x + w - 6 - 44;
  frame(ctx, bx, y + 10, 38, 34, 'raised');
  text(ctx, '×', bx + 19, y + 9, { size: 30, bold: true, align: 'center' });
  if (hovered === 'close') focusRect(ctx, bx - 4, y + 6, 46, 42);
  regions.push({ id: 'close', x: bx, y: y + 10, w: 38, h: 34 });
}

function drawImageCover(ctx, img, x, y, w, h) {
  if (!img?.complete || !img.naturalWidth) {
    ctx.fillStyle = COL.lo;
    text(ctx, 'Loading...', x + w / 2, y + h / 2 - 12, { size: 20, color: COL.lo, align: 'center' });
    return;
  }
  const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / s, sh = h / s;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
}

// ---------- the screen ----------
export class ProjectsScreen {
  constructor(mesh, basis) {
    this.basis = basis;
    this.focused = false;
    this.tab = 'projects';
    this.index = 0;
    this.expanded = false;
    this.selectedRow = null;
    this.slide = 0;
    this.slideTime = 0;
    this.clock = '';
    this.compact = false;   // large-print layout for phones (set by MenuController)
    this.page = 0;          // page of the long description in the compact layout
    this.pageCount = 1;

    this.images = projectsData.map((p) => {
      const img = new Image();
      img.onload = () => this.display?.redraw();
      img.src = p.image;
      return img;
    });
    this.display = new SurfaceDisplay(mesh, { width: W, height: H, scale: 1.25, draw: (ctx, w, h, hov) => this.draw(ctx, hov) });
    this.ticker = this.makeTicker(mesh);
  }

  // SurfaceDisplay-compatible surface for MenuController
  get mesh() { return this.display.mesh; }
  get width() { return W; }
  get height() { return H; }
  get hovered() { return this.display.hovered; }
  regionAt(uv) { return this.display.regionAt(uv); }
  setHovered(id) { this.display.setHovered(id); }

  setFocused(on) {
    this.focused = on;
    this.expanded = false;
    this.page = 0;
    if (on) this.index = this.slide;   // open on the project the slideshow was showing
    this.updateTicker();
    this.display.redraw();
  }

  setCompact(on) {
    if (on === this.compact) return;
    this.compact = on;
    this.page = 0;
    this.updateTicker();
    this.display.redraw();
  }

  // The compact window covers the taskbar, so the ticker strip on top of it hides too
  updateTicker() {
    this.ticker.mesh.visible = !(this.focused && this.compact);
  }

  // Returns 'back' to close, true if handled
  click(id) {
    const p = projectsData[this.index];
    if (id === 'close') return 'back';
    if (id.startsWith('tab:')) { this.tab = id.slice(4); this.expanded = false; }
    else if (id === 'prev') this.step(-1);
    else if (id === 'next') this.step(1);
    else if (id === 'more') { this.expanded = !this.expanded; this.page = 0; }
    else if (id === 'page') this.page = (this.page + 1) % this.pageCount;
    else if (id === 'live' && p.liveUrl) window.open(p.liveUrl, '_blank', 'noopener');
    else if (id === 'github' && p.githubUrl) window.open(p.githubUrl, '_blank', 'noopener');
    else if (id.startsWith('row:')) {
      const row = this.rows()[Number(id.slice(4))];
      if (row?.kind === 'project') { this.tab = 'projects'; this.index = row.index; this.expanded = false; }
      else this.selectedRow = Number(id.slice(4));
    } else return false;
    this.display.redraw();
    return true;
  }

  step(dir) {
    this.index = (this.index + dir + projectsData.length) % projectsData.length;
    this.expanded = false;
    this.display.redraw();
  }

  rows() {
    return [
      ...workData.map((w) => ({ kind: 'work', name: `${w.company} - ${w.role}`, type: 'Work', date: w.dates ?? '', desc: w.summary ?? '' })),
      ...projectsData.map((p, i) => ({ kind: 'project', index: i, name: p.title, type: p.type, date: projectYears[p.title] ?? '', desc: summaryOf(p) })),
    ];
  }

  update(dt) {
    // Ticker scrolls by texture offset (cheap); the screen only redraws on slide/clock changes
    this.ticker.map.offset.x = (this.ticker.map.offset.x + (TICKER_SPEED * dt) / this.ticker.cycle) % 1;
    if (!this.focused) {
      this.slideTime += dt;
      if (this.slideTime >= SLIDE_SECONDS) {
        this.slideTime = 0;
        this.slide = (this.slide + 1) % projectsData.length;
        this.display.redraw();
      }
    }
    const now = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (now !== this.clock) { this.clock = now; this.display.redraw(); }
  }

  // ---------- drawing ----------
  draw(ctx, hovered) {
    const regions = [];
    ctx.fillStyle = COL.desk;
    ctx.fillRect(0, 0, W, H);
    if (this.focused && this.compact) {
      this.drawCompactWindow(ctx, regions, hovered);
    } else {
      if (this.focused) this.drawWindow(ctx, regions, hovered); else this.drawSlideshow(ctx);
      this.drawTaskbar(ctx);
    }
    this.drawCrt(ctx);
    return regions;
  }

  drawSlideshow(ctx) {
    const p = projectsData[this.slide];
    const w = 900, h = 470, x = (W - w) / 2, y = (H - TASKBAR_H - h) / 2;
    frame(ctx, x, y, w, h, 'raised');
    ctx.fillStyle = COL.title;
    ctx.fillRect(x + 6, y + 6, w - 12, 44);
    text(ctx, 'Slideshow.exe', x + 18, y + 15, { bold: true, color: COL.hi });
    const ix = x + 24, iy = y + 70, iw = 480, ih = 300;
    frame(ctx, ix - 6, iy - 6, iw + 12, ih + 12, 'sunken', COL.hi);
    drawImageCover(ctx, this.images[this.slide], ix, iy, iw, ih);
    const tx = ix + iw + 30, tw = x + w - 24 - tx;
    text(ctx, 'Now showing', tx, iy, { size: 20, color: COL.muted });
    ctx.font = `bold 32px ${FONT}`;
    wrap(ctx, p.title, tw).slice(0, 2).forEach((l, i) => text(ctx, l, tx, iy + 32 + i * 40, { size: 32, bold: true }));
    paragraph(ctx, p.type, tx, iy + 120, tw, 64, { color: COL.muted });
    text(ctx, 'Click to open...', tx, iy + ih - 30, { size: 24, color: COL.link, bold: true });
    // progress dots
    projectsData.forEach((_, i) => {
      ctx.fillStyle = i === this.slide ? COL.title : COL.lo;
      ctx.fillRect(x + w / 2 - projectsData.length * 14 + i * 28, y + h - 50, 16, 16);
    });
  }

  drawWindow(ctx, regions, hovered) {
    const x = 50, y = 30, w = W - 100, h = H - TASKBAR_H - 50;
    windowChrome(ctx, regions, x, y, w, h, 'Fluorineheit - Portfolio', hovered);

    // tabs
    const tabs = [['projects', 'Projects'], ['skills', 'Skills'], ['experience', 'Experience']];
    const ty = y + 62, th = 46, panelY = ty + th;
    let tx = x + 16;
    tabs.forEach(([key, label]) => {
      const tw = 190, on = this.tab === key;
      const yy = on ? ty - 4 : ty, hh = on ? th + 6 : th;
      ctx.fillStyle = COL.face; ctx.fillRect(tx, yy, tw, hh);
      ctx.fillStyle = COL.hi; ctx.fillRect(tx, yy, tw, B); ctx.fillRect(tx, yy, B, hh);
      ctx.fillStyle = COL.dark; ctx.fillRect(tx + tw - B, yy, B, hh);
      text(ctx, label, tx + tw / 2, yy + 11, { bold: on, align: 'center' });
      if (hovered === `tab:${key}`) focusRect(ctx, tx, yy, tw, hh);
      regions.push({ id: `tab:${key}`, x: tx, y: yy, w: tw, h: hh });
      tx += tw - 2;
    });

    // panel
    const px = x + 16, pw = w - 32, ph = y + h - 16 - panelY;
    frame(ctx, px, panelY, pw, ph, 'raised');
    ctx.fillStyle = COL.face; ctx.fillRect(px + B, panelY - 1, pw - 2 * B, B + 1);  // open edge under the active tab
    const area = { x: px + 24, y: panelY + 24, w: pw - 48, h: ph - 48 };
    if (this.tab === 'projects') this.drawProjects(ctx, regions, hovered, area);
    else if (this.tab === 'skills') this.drawSkills(ctx, area);
    else this.drawExperience(ctx, regions, hovered, area);
  }

  drawProjects(ctx, regions, hovered, a) {
    const p = projectsData[this.index];
    const iw = 620, ih = 388;
    frame(ctx, a.x, a.y, iw + 12, ih + 12, 'sunken', COL.hi);
    drawImageCover(ctx, this.images[this.index], a.x + 6, a.y + 6, iw, ih);

    const tx = a.x + iw + 48, tw = a.x + a.w - tx;
    text(ctx, `${this.index + 1} of ${projectsData.length}`, tx, a.y, { size: 20, color: COL.muted });
    ctx.font = `bold 34px ${FONT}`;
    const titleLines = wrap(ctx, p.title, tw).slice(0, 2);
    titleLines.forEach((l, i) => text(ctx, l, tx, a.y + 30 + i * 42, { size: 34, bold: true }));
    let yy = a.y + 30 + titleLines.length * 42 + 6;
    text(ctx, p.type, tx, yy, { size: 22, color: COL.muted });
    yy += 44;

    const buttonsY = a.y + a.h - 58 - 70;
    paragraph(ctx, this.expanded ? p.longDescription : summaryOf(p), tx, yy, tw, buttonsY - yy - 12,
      { size: this.expanded ? 19 : 22, lineHeight: this.expanded ? 26 : 31 });

    let bx = tx;
    button(ctx, regions, 'more', this.expanded ? '< Summary' : 'More info...', bx, buttonsY, 190, 52, { hovered });
    bx += 204;
    button(ctx, regions, 'live', 'Live', bx, buttonsY, 120, 52, { hovered, disabled: !p.liveUrl });
    bx += 134;
    button(ctx, regions, 'github', 'GitHub', bx, buttonsY, 140, 52, { hovered, disabled: !p.githubUrl });

    // wizard-style navigation, bottom right of the panel
    ctx.fillStyle = COL.lo; ctx.fillRect(a.x, a.y + a.h - 62, a.w, 2);
    ctx.fillStyle = COL.hi; ctx.fillRect(a.x, a.y + a.h - 60, a.w, 2);
    const ny = a.y + a.h - 48;
    button(ctx, regions, 'next', 'Next >', a.x + a.w - 170, ny, 170, 52, { hovered });
    button(ctx, regions, 'prev', '< Back', a.x + a.w - 350, ny, 170, 52, { hovered });
  }

  drawSkills(ctx, a) {
    const cols = 7, cw = a.w / cols, chh = 130;
    skillsData.forEach((s, i) => {
      const cx = a.x + (i % cols) * cw + cw / 2;
      const cy = a.y + Math.floor(i / cols) * chh;
      frame(ctx, cx - 32, cy, 64, 64, 'raised', s.color || COL.face);
      text(ctx, s.name, cx, cy + 76, { size: 20, align: 'center' });
    });
  }

  drawExperience(ctx, regions, hovered, a) {
    const rows = this.rows();
    const statusH = 52, listH = a.h - statusH - 16;
    frame(ctx, a.x, a.y, a.w, listH, 'sunken', COL.hi);
    const cols = [{ label: 'Name', w: 0.5 }, { label: 'Type', w: 0.32 }, { label: 'Date', w: 0.18 }];
    const ix = a.x + B * 2, iw = a.w - B * 4;
    let cx = ix;
    cols.forEach((c) => {
      const w = iw * c.w;
      frame(ctx, cx, a.y + B * 2, w, 40, 'raised');
      text(ctx, c.label, cx + 12, a.y + B * 2 + 9, { size: 20 });
      cx += w;
    });
    const rowH = 42;
    const maxRows = Math.floor((listH - 56) / rowH);
    rows.slice(0, maxRows).forEach((r, i) => {
      const ry = a.y + B * 2 + 44 + i * rowH;
      const selected = this.selectedRow === i;
      if (selected) { ctx.fillStyle = COL.sel; ctx.fillRect(ix, ry, iw, rowH); }
      const color = selected ? COL.hi : COL.text;
      let x = ix;
      [r.name, r.type, r.date].forEach((v, k) => {
        const w = iw * cols[k].w;
        ctx.save(); ctx.beginPath(); ctx.rect(x, ry, w - 8, rowH); ctx.clip();
        text(ctx, v, x + 12, ry + 10, { size: 20, color });
        ctx.restore();
        x += w;
      });
      if (hovered === `row:${i}`) focusRect(ctx, ix - 6, ry - 6, iw + 12, rowH + 12);
      regions.push({ id: `row:${i}`, x: ix, y: ry, w: iw, h: rowH });
    });
    // status bar: the selected work entry, or a hint
    frame(ctx, a.x, a.y + a.h - statusH, a.w, statusH, 'sunken');
    const sel = this.selectedRow !== null ? rows[this.selectedRow] : null;
    const status = sel ? sel.desc : `${rows.length} object(s)  -  click a project to open it`;
    ctx.save(); ctx.beginPath(); ctx.rect(a.x + 8, a.y + a.h - statusH, a.w - 16, statusH); ctx.clip();
    text(ctx, status, a.x + 16, a.y + a.h - statusH + 14, { size: 20 });
    ctx.restore();
  }

  // ---------- large print (phones): the window fills the screen, text 2-3x bigger ----------
  drawCompactWindow(ctx, regions, hovered) {
    frame(ctx, 0, 0, W, H, 'raised');
    ctx.fillStyle = COL.title;
    ctx.fillRect(6, 6, W - 12, 82);
    text(ctx, 'Fluorineheit - Portfolio', 24, 22, { size: 42, bold: true, color: COL.hi });
    const bx = W - 92;
    frame(ctx, bx, 12, 80, 70, 'raised');
    text(ctx, '×', bx + 40, 8, { size: 60, bold: true, align: 'center' });
    if (hovered === 'close') focusRect(ctx, bx - 4, 8, 88, 78);
    regions.push({ id: 'close', x: bx, y: 12, w: 80, h: 70 });

    const tabs = [['projects', 'Projects'], ['skills', 'Skills'], ['experience', 'Experience']];
    const ty = 100, th = 92, tw = (W - 24) / 3;
    tabs.forEach(([key, label], i) => {
      const tx = 12 + i * tw, on = this.tab === key;
      const yy = on ? ty - 6 : ty, hh = on ? th + 8 : th;
      ctx.fillStyle = COL.face; ctx.fillRect(tx, yy, tw - 2, hh);
      ctx.fillStyle = COL.hi; ctx.fillRect(tx, yy, tw - 2, B); ctx.fillRect(tx, yy, B, hh);
      ctx.fillStyle = COL.dark; ctx.fillRect(tx + tw - 2 - B, yy, B, hh);
      text(ctx, label, tx + tw / 2, yy + 20, { size: 50, bold: on, align: 'center' });
      if (hovered === `tab:${key}`) focusRect(ctx, tx, yy, tw - 2, hh);
      regions.push({ id: `tab:${key}`, x: tx, y: yy, w: tw - 2, h: hh });
    });

    const panelY = ty + th, px = 12, pw = W - 24, ph = H - 12 - panelY;
    frame(ctx, px, panelY, pw, ph, 'raised');
    ctx.fillStyle = COL.face; ctx.fillRect(px + B, panelY - 1, pw - 2 * B, B + 1);
    const area = { x: px + 24, y: panelY + 20, w: pw - 48, h: ph - 40 };
    if (this.tab === 'projects') this.drawProjectsCompact(ctx, regions, hovered, area);
    else if (this.tab === 'skills') this.drawSkillsCompact(ctx, area);
    else this.drawExperienceCompact(ctx, regions, hovered, area);
  }

  drawProjectsCompact(ctx, regions, hovered, a) {
    const p = projectsData[this.index];
    const bh = 96, by = a.y + a.h - bh;
    const opts = { hovered, size: 46 };
    const links = (x, y) => {
      button(ctx, regions, 'live', 'Live', x, y, 200, bh, { ...opts, disabled: !p.liveUrl });
      button(ctx, regions, 'github', 'GitHub', x + 216, y, 240, bh, { ...opts, disabled: !p.githubUrl });
    };

    if (!this.expanded) {
      const iw = 600, ih = 375;
      frame(ctx, a.x, a.y, iw + 12, ih + 12, 'sunken', COL.hi);
      drawImageCover(ctx, this.images[this.index], a.x + 6, a.y + 6, iw, ih);
      button(ctx, regions, 'prev', '< Back', a.x, by, 298, bh, opts);
      button(ctx, regions, 'next', 'Next >', a.x + 314, by, 298, bh, opts);

      const tx = a.x + iw + 52, tw = a.x + a.w - tx;
      text(ctx, `${this.index + 1} / ${projectsData.length}`, tx, a.y, { size: 38, color: COL.muted });
      ctx.font = `bold 64px ${FONT}`;
      const titleLines = wrap(ctx, p.title, tw).slice(0, 2);
      titleLines.forEach((l, i) => text(ctx, l, tx, a.y + 50 + i * 72, { size: 64, bold: true }));
      let yy = a.y + 50 + titleLines.length * 72 + 6;
      text(ctx, p.type, tx, yy, { size: 42, color: COL.muted });
      yy += 62;
      paragraph(ctx, summaryOf(p), tx, yy, tw, by - 16 - yy, { size: 48, lineHeight: 60 });
      button(ctx, regions, 'more', 'More info...', tx, by, 330, bh, opts);
      links(tx + 346, by);
      return;
    }

    // Long description across the whole panel, in pages
    ctx.font = `bold 56px ${FONT}`;
    text(ctx, wrap(ctx, p.title, a.w)[0], a.x, a.y, { size: 56, bold: true });
    ctx.font = `46px ${FONT}`;
    const lines = wrap(ctx, p.longDescription ?? summaryOf(p), a.w);
    const top = a.y + 78, lineH = 58;
    const perPage = Math.max(1, Math.floor((by - 20 - top) / lineH));
    this.pageCount = Math.max(1, Math.ceil(lines.length / perPage));
    this.page = Math.min(this.page, this.pageCount - 1);
    lines.slice(this.page * perPage, (this.page + 1) * perPage)
      .forEach((l, i) => text(ctx, l, a.x, top + i * lineH, { size: 46 }));

    button(ctx, regions, 'more', '< Summary', a.x, by, 330, bh, opts);
    links(a.x + 346, by);
    if (this.pageCount > 1) {
      const label = this.page < this.pageCount - 1 ? `Page ${this.page + 1}/${this.pageCount} >` : `< Page 1/${this.pageCount}`;
      button(ctx, regions, 'page', label, a.x + a.w - 360, by, 360, bh, opts);
    }
  }

  drawSkillsCompact(ctx, a) {
    const cols = 4, rows = Math.ceil(skillsData.length / cols);
    const cw = a.w / cols, ch = a.h / rows, icon = 72;
    skillsData.forEach((s, i) => {
      const cx = a.x + (i % cols) * cw + cw / 2;
      const cy = a.y + Math.floor(i / cols) * ch + (ch - icon - 52) / 2;
      frame(ctx, cx - icon / 2, cy, icon, icon, 'raised', s.color || COL.face);
      text(ctx, s.name, cx, cy + icon + 10, { size: 44, align: 'center' });
    });
  }

  drawExperienceCompact(ctx, regions, hovered, a) {
    const rows = this.rows();
    const statusH = 80, listH = a.h - statusH - 16;
    frame(ctx, a.x, a.y, a.w, listH, 'sunken', COL.hi);
    const cols = [{ label: 'Name', w: 0.72 }, { label: 'Date', w: 0.28 }];
    const ix = a.x + B * 2, iw = a.w - B * 4;
    let cx = ix;
    cols.forEach((c) => {
      const w = iw * c.w;
      frame(ctx, cx, a.y + B * 2, w, 64, 'raised');
      text(ctx, c.label, cx + 16, a.y + B * 2 + 12, { size: 40 });
      cx += w;
    });
    const rowH = 80;
    const maxRows = Math.floor((listH - 76) / rowH);
    rows.slice(0, maxRows).forEach((r, i) => {
      const ry = a.y + B * 2 + 68 + i * rowH;
      const selected = this.selectedRow === i;
      if (selected) { ctx.fillStyle = COL.sel; ctx.fillRect(ix, ry, iw, rowH); }
      const color = selected ? COL.hi : COL.text;
      let x = ix;
      [r.name, r.date].forEach((v, k) => {
        const w = iw * cols[k].w;
        ctx.save(); ctx.beginPath(); ctx.rect(x, ry, w - 8, rowH); ctx.clip();
        text(ctx, v, x + 16, ry + 16, { size: 46, color });
        ctx.restore();
        x += w;
      });
      if (hovered === `row:${i}`) focusRect(ctx, ix - 6, ry - 6, iw + 12, rowH + 12);
      regions.push({ id: `row:${i}`, x: ix, y: ry, w: iw, h: rowH });
    });
    frame(ctx, a.x, a.y + a.h - statusH, a.w, statusH, 'sunken');
    const sel = this.selectedRow !== null ? rows[this.selectedRow] : null;
    const status = sel ? sel.desc : `${rows.length} object(s)  -  tap a project to open it`;
    ctx.save(); ctx.beginPath(); ctx.rect(a.x + 8, a.y + a.h - statusH, a.w - 16, statusH); ctx.clip();
    text(ctx, status, a.x + 20, a.y + a.h - statusH + 18, { size: 40 });
    ctx.restore();
  }

  drawTaskbar(ctx) {
    const y = H - TASKBAR_H;
    ctx.fillStyle = COL.face; ctx.fillRect(0, y, W, TASKBAR_H);
    ctx.fillStyle = COL.hi; ctx.fillRect(0, y, W, B);
    frame(ctx, 8, y + 9, 126, TASKBAR_H - 16, 'raised');
    text(ctx, 'Start', 71, y + 19, { bold: true, align: 'center' });
    frame(ctx, TICKER.x, TICKER.y, TICKER.w, TICKER.h, 'sunken');           // the ticker strip sits on top of this
    frame(ctx, W - 142, y + 9, 134, TASKBAR_H - 16, 'sunken');
    text(ctx, this.clock, W - 75, y + 20, { size: 20, align: 'center' });
  }

  // Subtle CRT: faint scanlines and darker corners
  drawCrt(ctx) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
    for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62);
    g.addColorStop(0, 'rgba(0, 0, 0, 0)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // ---------- ticker strip ----------
  makeTicker(screenMesh) {
    const scale = 2;
    const label = `${skillsData.map((s) => s.name).join('   ·   ')}   ·   `;
    const measure = document.createElement('canvas').getContext('2d');
    measure.font = `${20 * scale}px ${FONT}`;
    const cycle = Math.ceil(measure.measureText(label).width / scale);
    const innerW = TICKER.w - 4 * B, innerH = TICKER.h - 4 * B;

    const canvas = document.createElement('canvas');
    canvas.width = cycle * scale;
    canvas.height = innerH * scale;
    const ctx = canvas.getContext('2d');
    const paint = () => {
      ctx.fillStyle = COL.face;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `${20 * scale}px ${FONT}`;
      ctx.fillStyle = COL.text;
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, canvas.height / 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
      for (let y = 0; y < canvas.height; y += 4 * scale) ctx.fillRect(0, y, canvas.width, scale);
      map.needsUpdate = true;
    };
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = THREE.RepeatWrapping;
    map.repeat.x = innerW / cycle;
    paint();
    document.fonts?.ready.then(paint);

    // Place the strip on the screen, just in front of the sunken ticker area
    const { origin, right, down, normal, width } = this.basis;
    const s = width / W;
    const geo = new THREE.PlaneGeometry(innerW * s, innerH * s);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map, toneMapped: false }));
    const center = origin.clone()
      .addScaledVector(right, (TICKER.x + 2 * B + innerW / 2) * s)
      .addScaledVector(down, (TICKER.y + 2 * B + innerH / 2) * s)
      .addScaledVector(normal, 0.01);
    mesh.position.copy(center);
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, down.clone().negate(), normal));
    mesh.raycast = () => {};            // clicks go to the screen behind it
    mesh.name = 'ProjectsScreen_Ticker';
    screenMesh.parent.add(mesh);
    return { mesh, map, cycle };
  }
}
