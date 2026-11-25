// Products have no photos yet, so each one gets a coloured tile with its initials.
const TINTS = {
  electronics: { bg: '#d9e8ff', fg: '#1d3f8a' },
  home: { bg: '#fde9c9', fg: '#8a4b0f' },
  fashion: { bg: '#f9d9e4', fg: '#8a1f48' },
  stationery: { bg: '#dcefd9', fg: '#2b6a1f' },
};
const FALLBACK = { bg: '#e4e7ea', fg: '#34404a' };

export function categoryStyle(category) {
  const tint = TINTS[category] || FALLBACK;
  return { '--tile-bg': tint.bg, '--tile-fg': tint.fg };
}

export function productMark(name) {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}
