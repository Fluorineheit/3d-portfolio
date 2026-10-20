// src/ui/surfaceDesigns.js
// What gets painted onto the in-scene surfaces. Each draw function returns its clickable areas.
import { panels } from './data/panelsData.js';

function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Credits billboard: same look as the videotron UI (navy gradient, hollow title, red back, cyan accents)
export function drawCredits(ctx, W, H, hovered) {
  const data = panels.credits;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1c2d49');
  g.addColorStop(1, '#0a121b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const pad = W * 0.06;
  ctx.textBaseline = 'top';

  // Back (top left)
  ctx.font = 'bold 64px "Searider Falcon"';
  ctx.fillStyle = hovered === 'back' ? '#ff4a4e' : '#BE2528';
  ctx.textAlign = 'left';
  ctx.fillText('← Back', pad, pad * 0.8);
  const backW = ctx.measureText('← Back').width;

  // Title (top right)
  ctx.font = 'bold 150px "Searider Falcon Hollow"';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.fillText(data.title.toUpperCase(), W - pad, pad * 0.6);

  // Intro
  ctx.textAlign = 'left';
  ctx.font = '58px "Conthrax"';
  ctx.fillStyle = '#e0e0e0';
  let y = H * 0.3;
  for (const p of data.paragraphs) {
    for (const line of wrap(ctx, p, W - pad * 2)) {
      ctx.fillText(line, pad, y);
      y += 76;
    }
  }

  // Groups side by side
  const colW = (W - pad * 2) / data.groups.length;
  data.groups.forEach((group, i) => {
    const x = pad + colW * i;
    let gy = y + 80;
    ctx.font = '48px "Conthrax"';
    ctx.fillStyle = '#00ffff';
    ctx.fillText(group.heading.toUpperCase(), x, gy);
    gy += 96;
    ctx.font = '64px "Conthrax"';
    ctx.fillStyle = '#ffffff';
    for (const item of group.items) {
      ctx.fillText(item, x, gy);
      gy += 98;
    }
  });

  return [{ id: 'back', x: pad - 20, y: pad * 0.8 - 20, w: backW + 40, h: 104 }];
}

// The note pinned on the cork board: paper with the bio written on it, link "stickers" at the bottom
export function drawAboutNote(ctx, W, H, hovered, view) {
  if (view?.compact) return drawAboutNoteCompact(ctx, W, H, hovered, view);
  const data = panels.about;
  ctx.fillStyle = '#f3ecd8';
  ctx.fillRect(0, 0, W, H);
  // faint ruled lines
  ctx.strokeStyle = 'rgba(70, 110, 160, 0.18)';
  ctx.lineWidth = 2;
  for (let ly = 120; ly < H - 20; ly += 40) {
    ctx.beginPath(); ctx.moveTo(30, ly); ctx.lineTo(W - 30, ly); ctx.stroke();
  }

  const pad = 52;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';

  ctx.font = 'bold 52px "Conthrax"';
  ctx.fillStyle = '#2b2440';
  ctx.fillText(data.title, pad, 40);

  // Back (top right)
  ctx.font = 'bold 30px "Searider Falcon"';
  ctx.textAlign = 'right';
  ctx.fillStyle = hovered === 'back' ? '#ff4a4e' : '#BE2528';
  ctx.fillText('← Back', W - pad, 52);
  const backW = ctx.measureText('← Back').width;
  const regions = [{ id: 'back', x: W - pad - backW - 16, y: 36, w: backW + 32, h: 64 }];

  // Bio
  ctx.textAlign = 'left';
  ctx.font = '25px "Conthrax"';
  ctx.fillStyle = '#2b2a33';
  let y = 124;
  for (const p of data.paragraphs) {
    for (const line of wrap(ctx, p, W - pad * 2)) {
      ctx.fillText(line, pad, y);
      y += 34;
    }
    y += 12;
  }

  // Links as small stickers, centered and above the tape strips on the bottom corners
  ctx.font = 'bold 26px "Conthrax"';
  const gap = 18;
  const widths = data.links.map((l) => ctx.measureText(l.label).width + 40);
  let x = (W - (widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1))) / 2;
  const linkY = H - 150;
  for (const [i, link] of data.links.entries()) {
    const w = widths[i];
    const on = hovered === link.href;
    roundRect(ctx, x, linkY, w, 52, 26);
    ctx.fillStyle = on ? '#ff8cc8' : '#ff5fb2';
    ctx.fill();
    ctx.fillStyle = '#1a1424';
    ctx.fillText(link.label, x + 20, linkY + 13);
    regions.push({ id: link.href, x, y: linkY, w, h: 52 });
    x += w + gap;
  }
  return regions;
}

// Large print for phones: same note, bigger text. The bio is split into pages, keeping paragraphs
// together where they fit. The bottom corners are under the note's tape strips (3D objects), so the
// link stickers sit centred above them and "Next >" between them.
function drawAboutNoteCompact(ctx, W, H, hovered, view) {
  const data = panels.about;
  const pad = 44;
  const lineH = 46;
  ctx.fillStyle = '#f3ecd8';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(70, 110, 160, 0.18)';
  ctx.lineWidth = 2;
  for (let ly = 126; ly < H - 20; ly += lineH) {
    ctx.beginPath(); ctx.moveTo(24, ly); ctx.lineTo(W - 24, ly); ctx.stroke();
  }
  ctx.textBaseline = 'top';

  ctx.textAlign = 'left';
  ctx.font = 'bold 64px "Conthrax"';
  ctx.fillStyle = '#2b2440';
  ctx.fillText(data.title, pad, 30);

  ctx.font = 'bold 44px "Searider Falcon"';
  ctx.textAlign = 'right';
  ctx.fillStyle = hovered === 'back' ? '#ff4a4e' : '#BE2528';
  ctx.fillText('← Back', W - pad, 40);
  const backW = ctx.measureText('← Back').width;
  const regions = [{ id: 'back', x: W - pad - backW - 24, y: 20, w: backW + 48, h: 92 }];

  // Pages of lines (null = paragraph gap)
  ctx.textAlign = 'left';
  ctx.font = '34px "Conthrax"';
  const linkY = H - 196;
  const top = 132;
  const perPage = Math.floor((linkY - 16 - top) / lineH);
  const pages = [];
  let current = [];
  for (const paragraph of data.paragraphs) {
    let lines = wrap(ctx, paragraph, W - pad * 2);
    const gap = current.length ? 1 : 0;
    if (current.length + gap + lines.length <= perPage) {
      if (gap) current.push(null);
      current.push(...lines);
      continue;
    }
    if (current.length) pages.push(current);
    // A paragraph longer than a page is split across pages
    while (lines.length > perPage) {
      pages.push(lines.slice(0, perPage));
      lines = lines.slice(perPage);
    }
    current = lines;
  }
  if (current.length) pages.push(current);
  view.pages = pages.length;
  const page = Math.min(view.page, pages.length - 1);
  ctx.fillStyle = '#2b2a33';
  (pages[page] ?? []).forEach((line, i) => {
    if (line) ctx.fillText(line, pad, top + i * lineH);
  });

  // Link stickers (left) and page turn (right) along the bottom
  ctx.font = 'bold 32px "Conthrax"';
  const gap = 14;
  const widths = data.links.map((l) => ctx.measureText(l.label).width + 40);
  const stickersW = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
  let x = (W - stickersW) / 2;
  for (const [i, link] of data.links.entries()) {
    const w = widths[i];
    roundRect(ctx, x, linkY, w, 72, 36);
    ctx.fillStyle = hovered === link.href ? '#ff8cc8' : '#ff5fb2';
    ctx.fill();
    ctx.fillStyle = '#1a1424';
    ctx.fillText(link.label, x + 20, linkY + 19);
    regions.push({ id: link.href, x, y: linkY, w, h: 72 });
    x += w + gap;
  }
  if (pages.length > 1) {
    const label = page < pages.length - 1 ? `Next > ${page + 1}/${pages.length}` : `< Prev ${page + 1}/${pages.length}`;
    ctx.font = 'bold 32px "Conthrax"';
    ctx.textAlign = 'center';
    ctx.fillStyle = hovered === 'page' ? '#ff4a4e' : '#BE2528';
    const pageY = H - 96;
    ctx.fillText(label, W / 2, pageY);
    const w = ctx.measureText(label).width;
    regions.push({ id: 'page', x: (W - w) / 2 - 24, y: pageY - 20, w: w + 48, h: 76 });
  }
  return regions;
}
