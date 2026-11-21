// Harbour Dusk — round state, input, timer, scoring and drawing.
// Two panels side by side on one canvas; click either panel to mark a
// difference. Keyboard: arrows move a gold ring, Enter/Space marks.

import { PANEL_W, PANEL_H, dealDifferences, differenceAt } from './diffs.js';
import { paintPanel } from './scene.js';
import { soundFound, soundWrong, soundWin, soundHint } from './audio.js';

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const els = {
  found: document.getElementById('hud-found'),
  total: document.getElementById('hud-total'),
  remaining: document.getElementById('hud-remaining'),
  time: document.getElementById('hud-time'),
  score: document.getElementById('hud-score'),
  hints: document.getElementById('hud-hints'),
  message: document.getElementById('message'),
  start: document.getElementById('btn-start'),
  hint: document.getElementById('btn-hint'),
  restart: document.getElementById('btn-restart'),
};

const LEFT_X = 10;
const RIGHT_X = 610;
const PANEL_Y = 40;
const TIME_LIMIT = 180;

const params = new URLSearchParams(window.location.search);
const shotMode = params.get('shot');
let seed = Number.parseInt(params.get('seed') ?? '1', 10);
if (!Number.isFinite(seed)) seed = 1;

const state = {
  phase: 'title', // title | playing | won | lost
  differences: [],
  score: 0,
  hintsLeft: 3,
  elapsed: 0,
  lastTick: 0,
  cursor: { panel: 0, x: 280, y: 170 },
  wrongMark: null, // {panel, x, y, until}
  hintMark: null, // {diff, until}
  shakeUntil: 0,
};

function remainingCount() {
  return state.differences.filter((d) => !d.found).length;
}

function foundCount() {
  return state.differences.length - remainingCount();
}

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function syncHud() {
  els.found.textContent = String(foundCount());
  els.total.textContent = String(state.differences.length);
  els.remaining.textContent = String(remainingCount());
  els.time.textContent = formatTime(state.elapsed);
  els.score.textContent = String(state.score);
  els.hints.textContent = String(state.hintsLeft);
  els.hint.disabled = state.phase !== 'playing' || state.hintsLeft <= 0;
}

function say(text) {
  els.message.textContent = text;
}

function startRound(nextSeed) {
  seed = nextSeed;
  state.differences = dealDifferences(seed);
  state.phase = 'playing';
  state.score = 0;
  state.hintsLeft = 3;
  state.elapsed = 0;
  state.lastTick = performance.now();
  state.wrongMark = null;
  state.hintMark = null;
  state.cursor = { panel: 0, x: 280, y: 170 };
  say('Find all ' + state.differences.length + ' differences. Good hunting!');
  syncHud();
  draw();
}

function endRound(won) {
  state.phase = won ? 'won' : 'lost';
  if (won) {
    const timeBonus = Math.max(0, TIME_LIMIT - Math.floor(state.elapsed)) * 2;
    state.score += timeBonus;
    say('You found them all in ' + formatTime(state.elapsed) + '! Score ' + state.score + '.');
    soundWin();
  } else {
    say('Time is up — ' + remainingCount() + ' still hiding. Try a new round!');
  }
  syncHud();
  draw();
}

function markAt(panel, px, py) {
  if (state.phase !== 'playing') return;
  const diff = differenceAt(state.differences, px, py);
  const now = performance.now();
  if (diff && !diff.found) {
    diff.found = true;
    state.score += 100;
    say('Found: ' + diff.label + '. ' + remainingCount() + ' to go.');
    soundFound();
    if (remainingCount() === 0) endRound(true);
  } else {
    state.score = Math.max(0, state.score - 25);
    state.elapsed += 5;
    state.wrongMark = { panel, x: px, y: py, until: now + 700 };
    state.shakeUntil = now + 250;
    say(diff ? 'Already marked that one.' : 'Not there — minus 25 points, plus 5 seconds.');
    soundWrong();
  }
  syncHud();
  draw();
}

function useHint() {
  if (state.phase !== 'playing' || state.hintsLeft <= 0) return;
  const open = state.differences.filter((d) => !d.found);
  if (!open.length) return;
  const pick = open[Math.floor(Math.random() * open.length)];
  state.hintsLeft -= 1;
  state.score = Math.max(0, state.score - 40);
  state.hintMark = { diff: pick, until: performance.now() + 1600 };
  say('Hint: look near the pulsing ring.');
  soundHint();
  syncHud();
  draw();
}

function panelPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const cx = (event.clientX - rect.left) * scaleX;
  const cy = (event.clientY - rect.top) * scaleY;
  const py = cy - PANEL_Y;
  if (py < 0 || py > PANEL_H) return null;
  if (cx >= LEFT_X && cx < LEFT_X + PANEL_W) return { panel: 0, x: cx - LEFT_X, y: py };
  if (cx >= RIGHT_X && cx < RIGHT_X + PANEL_W) return { panel: 1, x: cx - RIGHT_X, y: py };
  return null;
}

function drawMarker(x, y, radius, colour, width) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function draw() {
  const now = performance.now();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#101c3a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let shakeX = 0;
  if (now < state.shakeUntil) shakeX = Math.round(Math.sin(now / 18) * 4);

  ctx.save();
  ctx.translate(shakeX, 0);
  paintPanel(ctx, LEFT_X, PANEL_Y, 'left');
  paintPanel(ctx, RIGHT_X, PANEL_Y, 'right');
  ctx.restore();

  // Found markers on both panels: a soft outer glow plus a gentle
  // breathing pulse so already-found spots stay easy to track at a
  // glance. Each marker pulses on its own phase (from its position)
  // so the rings do not all swell in lockstep.
  for (const diff of state.differences) {
    if (!diff.found) continue;
    const breathe = Math.sin(now / 420 + (diff.x + diff.y) * 0.05) * 2.5;
    const radius = diff.r + 4 + breathe;
    drawMarker(LEFT_X + diff.x, PANEL_Y + diff.y, radius + 5, 'rgba(53,224,138,0.35)', 2);
    drawMarker(RIGHT_X + diff.x, PANEL_Y + diff.y, radius + 5, 'rgba(53,224,138,0.35)', 2);
    drawMarker(LEFT_X + diff.x, PANEL_Y + diff.y, radius, '#35e08a', 3);
    drawMarker(RIGHT_X + diff.x, PANEL_Y + diff.y, radius, '#35e08a', 3);
  }

  // Hint pulse.
  if (state.hintMark && now < state.hintMark.until) {
    const d = state.hintMark.diff;
    const pulse = d.r + 10 + Math.sin(now / 90) * 5;
    drawMarker(LEFT_X + d.x, PANEL_Y + d.y, pulse, '#ffd166', 3);
    drawMarker(RIGHT_X + d.x, PANEL_Y + d.y, pulse, '#ffd166', 3);
  }

  // Wrong-click cross.
  if (state.wrongMark && now < state.wrongMark.until) {
    const baseX = state.wrongMark.panel === 0 ? LEFT_X : RIGHT_X;
    const wx = baseX + state.wrongMark.x;
    const wy = PANEL_Y + state.wrongMark.y;
    ctx.strokeStyle = '#ff5a5a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wx - 10, wy - 10);
    ctx.lineTo(wx + 10, wy + 10);
    ctx.moveTo(wx + 10, wy - 10);
    ctx.lineTo(wx - 10, wy + 10);
    ctx.stroke();
  }

  // Keyboard cursor ring.
  if (state.phase === 'playing') {
    const baseX = state.cursor.panel === 0 ? LEFT_X : RIGHT_X;
    drawMarker(baseX + state.cursor.x, PANEL_Y + state.cursor.y, 16, '#ffd166', 2.5);
  }

  // Panel labels and the remaining counter inside the frame.
  ctx.fillStyle = '#e8eefc';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('ORIGINAL', LEFT_X + 6, 26);
  ctx.fillText('CHANGED', RIGHT_X + 6, 26);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  ctx.fillText(remainingCount() + ' REMAINING', RIGHT_X + PANEL_W - 6, 26);
  ctx.textAlign = 'left';

  if (state.phase === 'title') {
    ctx.fillStyle = 'rgba(6,10,24,0.72)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HARBOUR DUSK', canvas.width / 2, 170);
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('Spot the 7 differences between the two pictures', canvas.width / 2, 206);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#ffd166';
    ctx.fillText('Press Start — or click a picture — to play', canvas.width / 2, 240);
    ctx.textAlign = 'left';
  }

  if (state.phase === 'won') {
    ctx.fillStyle = 'rgba(6,24,14,0.55)';
    ctx.fillRect(0, PANEL_Y + PANEL_H + 4, canvas.width, 36);
    ctx.fillStyle = '#35e08a';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ALL 7 FOUND — YOU WIN!  Score ' + state.score, canvas.width / 2, PANEL_Y + PANEL_H + 29);
    ctx.textAlign = 'left';
  }
}

function tick(now) {
  if (state.phase === 'playing') {
    state.elapsed += (now - state.lastTick) / 1000;
    state.lastTick = now;
    if (state.elapsed >= TIME_LIMIT) {
      state.elapsed = TIME_LIMIT;
      endRound(false);
    } else {
      syncHud();
      draw();
    }
  }
  requestAnimationFrame(tick);
}

canvas.addEventListener('click', (event) => {
  canvas.focus();
  if (state.phase === 'title') {
    startRound(seed);
    return;
  }
  const point = panelPoint(event);
  if (point) markAt(point.panel, point.x, point.y);
});

canvas.addEventListener('keydown', (event) => {
  const step = event.shiftKey ? 28 : 12;
  const c = state.cursor;
  if (event.key === 'ArrowLeft') { c.x -= step; if (c.x < 0 && c.panel === 1) { c.panel = 0; c.x = PANEL_W + c.x; } c.x = Math.max(0, c.x); event.preventDefault(); }
  else if (event.key === 'ArrowRight') { c.x += step; if (c.x > PANEL_W && c.panel === 0) { c.panel = 1; c.x -= PANEL_W; } c.x = Math.min(PANEL_W, c.x); event.preventDefault(); }
  else if (event.key === 'ArrowUp') { c.y = Math.max(0, c.y - step); event.preventDefault(); }
  else if (event.key === 'ArrowDown') { c.y = Math.min(PANEL_H, c.y + step); event.preventDefault(); }
  else if (event.key === 'Enter' || event.key === ' ') {
    if (state.phase === 'title') startRound(seed);
    else markAt(c.panel, c.x, c.y);
    event.preventDefault();
  } else if (event.key === 'h' || event.key === 'H') useHint();
  else if (event.key === 'r' || event.key === 'R') startRound(seed + 1);
  draw();
});

els.start.addEventListener('click', () => startRound(seed));
els.hint.addEventListener('click', useHint);
els.restart.addEventListener('click', () => startRound(seed + 1));

// Deterministic screenshot setups: ?shot=start|play|end&seed=1
function applyShotMode() {
  if (!shotMode) return;
  startRound(seed);
  if (shotMode === 'start') {
    state.phase = 'title';
    say('Find all 7 differences.');
  } else if (shotMode === 'play') {
    for (let i = 0; i < 3; i += 1) state.differences[i].found = true;
    state.score = 300;
    state.elapsed = 42;
    say('Found 3 — 4 still hiding.');
  } else if (shotMode === 'end') {
    for (const d of state.differences) d.found = true;
    state.elapsed = 87;
    state.score = 700;
    state.phase = 'won';
    say('You found them all!');
  }
  syncHud();
  draw();
}

state.differences = dealDifferences(seed);
syncHud();
draw();
applyShotMode();
requestAnimationFrame(tick);
