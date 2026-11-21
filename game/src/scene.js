// Paints one harbour-at-dusk picture into a panel-sized region.
// `side` is "left" or "right": the right picture quietly changes the seven
// features listed in diffs.js. Everything is canvas shapes — no images.

import { PANEL_W, PANEL_H } from './diffs.js';

function sky(ctx, x0, y0) {
  const grad = ctx.createLinearGradient(0, y0, 0, y0 + 210);
  grad.addColorStop(0, '#1b2a5e');
  grad.addColorStop(0.55, '#5a3d7a');
  grad.addColorStop(1, '#e8836b');
  ctx.fillStyle = grad;
  ctx.fillRect(x0, y0, PANEL_W, 210);
}

function stars(ctx, x0, y0, side) {
  ctx.fillStyle = '#f5f0d8';
  const spots = [
    [40, 30], [110, 18], [205, 36], [300, 22], [395, 30], [468, 44], [520, 20],
  ];
  for (const [sx, sy] of spots) {
    if (side === 'right' && sx === 468 && sy === 44) continue; // missing star
    ctx.beginPath();
    ctx.arc(x0 + sx, y0 + sy, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function sunAndMoon(ctx, x0, y0) {
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.arc(x0 + 270, y0 + 168, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7ead0';
  ctx.beginPath();
  ctx.arc(x0 + 70, y0 + 52, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#232a55';
  ctx.beginPath();
  ctx.arc(x0 + 76, y0 + 47, 11, 0, Math.PI * 2);
  ctx.fill();
}

function birds(ctx, x0, y0, side) {
  ctx.strokeStyle = '#141c38';
  ctx.lineWidth = 2.4;
  const flock = [[120, 78], [150, 62], [182, 82]];
  for (const [bx, by] of flock) {
    if (side === 'right' && bx === 150 && by === 62) continue; // missing bird
    ctx.beginPath();
    ctx.moveTo(x0 + bx - 9, y0 + by + 3);
    ctx.quadraticCurveTo(x0 + bx - 3, y0 + by - 5, x0 + bx, y0 + by + 1);
    ctx.quadraticCurveTo(x0 + bx + 3, y0 + by - 5, x0 + bx + 9, y0 + by + 3);
    ctx.stroke();
  }
}

function sea(ctx, x0, y0) {
  const grad = ctx.createLinearGradient(0, y0 + 210, 0, y0 + PANEL_H);
  grad.addColorStop(0, '#2c4a7c');
  grad.addColorStop(1, '#16264a');
  ctx.fillStyle = grad;
  ctx.fillRect(x0, y0 + 210, PANEL_W, PANEL_H - 210);
  ctx.strokeStyle = 'rgba(255,190,120,0.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i += 1) {
    const wy = y0 + 232 + i * 20;
    ctx.beginPath();
    ctx.moveTo(x0 + 215, wy);
    ctx.lineTo(x0 + 325, wy);
    ctx.stroke();
  }
}

function houses(ctx, x0, y0, side) {
  const rows = [
    { x: 52, w: 74, h: 62, wall: '#8a5a4a', roof: '#4a2f3a' },
    { x: 136, w: 66, h: 52, wall: '#a06a4e', roof: '#3d2b44' },
  ];
  for (const house of rows) {
    const top = y0 + 210 - house.h;
    ctx.fillStyle = house.wall;
    ctx.fillRect(x0 + house.x, top, house.w, house.h);
    ctx.fillStyle = house.roof;
    ctx.beginPath();
    ctx.moveTo(x0 + house.x - 6, top);
    ctx.lineTo(x0 + house.x + house.w / 2, top - 24);
    ctx.lineTo(x0 + house.x + house.w + 6, top);
    ctx.closePath();
    ctx.fill();
    // chimney on the second house
    if (house.x === 136) {
      ctx.fillStyle = '#5d4a4a';
      ctx.fillRect(x0 + 188, top - 34, 14, 22);
      if (side === 'left') {
        ctx.fillStyle = 'rgba(220,220,230,0.75)';
        for (const [px, py, pr] of [[195, 196, 7], [201, 184, 9], [209, 170, 11]]) {
          ctx.beginPath();
          ctx.arc(x0 + px, y0 + py, pr, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // windows: two per house; the watched one is house 1, left window
    for (let w = 0; w < 2; w += 1) {
      const wx = x0 + house.x + 12 + w * 34;
      const wy = top + 18;
      const watched = house.x === 52 && w === 0;
      ctx.fillStyle = watched && side === 'right' ? '#2a2438' : '#ffd166';
      ctx.fillRect(wx, wy, 18, 22);
      ctx.strokeStyle = '#241a20';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(wx, wy, 18, 22);
    }
  }
}

function lighthouse(ctx, x0, y0, side) {
  const lx = x0 + 512;
  const baseY = y0 + 210;
  if (side === 'left') {
    ctx.fillStyle = 'rgba(255,230,150,0.30)';
    ctx.beginPath();
    ctx.moveTo(lx, y0 + 96);
    ctx.lineTo(lx - 150, y0 + 70);
    ctx.lineTo(lx - 150, y0 + 128);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#e8e2d4';
  ctx.beginPath();
  ctx.moveTo(lx - 16, baseY);
  ctx.lineTo(lx - 10, y0 + 108);
  ctx.lineTo(lx + 10, y0 + 108);
  ctx.lineTo(lx + 16, baseY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c23b3b';
  ctx.fillRect(lx - 13, y0 + 138, 26, 14);
  ctx.fillRect(lx - 11, y0 + 168, 22, 14);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(lx - 9, y0 + 88, 18, 18);
  ctx.fillStyle = '#2b2b3a';
  ctx.beginPath();
  ctx.moveTo(lx - 13, y0 + 88);
  ctx.lineTo(lx, y0 + 72);
  ctx.lineTo(lx + 13, y0 + 88);
  ctx.closePath();
  ctx.fill();
}

function boats(ctx, x0, y0, side) {
  // Big boat with mast, flag and sail.
  const bx = x0 + 320;
  const by = y0 + 252;
  ctx.strokeStyle = '#3a2c22';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(bx + 10, by);
  ctx.lineTo(bx + 10, by - 102);
  ctx.stroke();
  // flag: red on the left, teal on the right
  ctx.fillStyle = side === 'left' ? '#e63946' : '#2ec4b6';
  ctx.beginPath();
  ctx.moveTo(bx + 10, by - 102);
  ctx.lineTo(bx + 38, by - 94);
  ctx.lineTo(bx + 10, by - 84);
  ctx.closePath();
  ctx.fill();
  // sail, with a stripe only on the left
  ctx.fillStyle = '#f4ecd8';
  ctx.beginPath();
  ctx.moveTo(bx + 16, by - 92);
  ctx.lineTo(bx + 16, by - 14);
  ctx.lineTo(bx + 78, by - 14);
  ctx.closePath();
  ctx.fill();
  if (side === 'left') {
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(bx + 30, by - 56);
    ctx.lineTo(bx + 52, by - 56);
    ctx.stroke();
  }
  ctx.fillStyle = '#6b4632';
  ctx.beginPath();
  ctx.moveTo(bx - 26, by);
  ctx.lineTo(bx + 96, by);
  ctx.lineTo(bx + 78, by + 22);
  ctx.lineTo(bx - 8, by + 22);
  ctx.closePath();
  ctx.fill();
  // Small rowboat.
  ctx.fillStyle = '#4a6b8a';
  ctx.beginPath();
  ctx.moveTo(x0 + 430, y0 + 286);
  ctx.lineTo(x0 + 492, y0 + 286);
  ctx.lineTo(x0 + 480, y0 + 302);
  ctx.lineTo(x0 + 442, y0 + 302);
  ctx.closePath();
  ctx.fill();
}

export function paintPanel(ctx, x0, y0, side) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, PANEL_W, PANEL_H);
  ctx.clip();
  sky(ctx, x0, y0);
  stars(ctx, x0, y0, side);
  sunAndMoon(ctx, x0, y0);
  birds(ctx, x0, y0, side);
  sea(ctx, x0, y0);
  houses(ctx, x0, y0, side);
  lighthouse(ctx, x0, y0, side);
  boats(ctx, x0, y0, side);
  ctx.restore();
  ctx.strokeStyle = '#0b1226';
  ctx.lineWidth = 2;
  ctx.strokeRect(x0, y0, PANEL_W, PANEL_H);
}
