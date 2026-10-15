// src/ui/data/panelsData.js
// Text for the HTML side panels opened from the menu board buttons.
import { contentData, socialMediaData } from './projectsData.js';

// The About lines are written for the 3D screen (manual line breaks); join them back into paragraphs.
const toParagraphs = (lines) =>
  lines.join('\n').split(/\n\s*\n/).map((p) => p.replace(/\n/g, ' ').trim()).filter(Boolean);

const linkLabels = { linkedin: 'LinkedIn', github: 'GitHub', email: 'Email' };

export const panels = {
  about: {
    title: contentData.about.title,
    paragraphs: toParagraphs(contentData.about.lines),
    links: socialMediaData.map((s) => ({ label: linkLabels[s.name] ?? s.name, href: s.url })),
  },
  credits: {
    title: 'Credits',
    paragraphs: ['Designed, modeled, baked and coded by Farhan.'],
    groups: [
      { heading: 'Built with', items: ['three.js', 'GSAP', 'Vite', 'Blender'] },
      { heading: 'Fonts', items: ['Conthrax', 'Searider Falcon'] },
    ],
  },
};
