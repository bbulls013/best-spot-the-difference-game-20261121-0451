// Seeded placement of the seven harbour differences.
// Panel coordinates: the picture is PANEL_W x PANEL_H; every difference
// carries a centre and a click radius in that space, plus which variant
// each side shows ("left" value vs "right" value).

export const PANEL_W = 560;
export const PANEL_H = 340;

// Small deterministic PRNG (mulberry32) so a seed always deals the same round.
export function makeRng(seed) {
  let state = (seed >>> 0) || 1;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The seven difference kinds, anchored to named scene features. The seed
// nudges each anchor a little so rounds feel fresh without breaking the
// scene layout that scene.js paints.
const KINDS = [
  { kind: 'bird', label: 'a missing bird', x: 150, y: 62, r: 26 },
  { kind: 'flag', label: 'the mast flag colour', x: 338, y: 158, r: 24 },
  { kind: 'window', label: 'a lit house window', x: 73, y: 177, r: 24 },
  { kind: 'star', label: 'a missing star', x: 468, y: 44, r: 24 },
  { kind: 'sail', label: 'a stripe on the sail', x: 360, y: 196, r: 30 },
  { kind: 'beam', label: 'the lighthouse beam', x: 470, y: 100, r: 34 },
  { kind: 'smoke', label: 'chimney smoke', x: 196, y: 196, r: 26 },
];

export function dealDifferences(seed) {
  const rng = makeRng(seed);
  return KINDS.map((base, index) => {
    const jx = Math.round((rng() - 0.5) * 10);
    const jy = Math.round((rng() - 0.5) * 8);
    return {
      id: index,
      kind: base.kind,
      label: base.label,
      x: base.x + jx,
      y: base.y + jy,
      r: base.r,
      found: false,
    };
  });
}

export function differenceAt(differences, px, py) {
  for (const diff of differences) {
    const dx = px - diff.x;
    const dy = py - diff.y;
    if (dx * dx + dy * dy <= diff.r * diff.r) return diff;
  }
  return null;
}
