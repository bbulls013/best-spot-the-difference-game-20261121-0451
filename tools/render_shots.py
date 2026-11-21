#!/usr/bin/env python3
"""Deterministic screenshot renderer for Harbour Dusk (stdlib only).

Mirrors the game's canvas composition — two harbour panels side by side,
green rings on found differences, remaining counter — at 1280x480, and
writes the three bounty screenshots. Own minimal PNG encoder; no browser
binary exists on this VM.
"""

import struct
import zlib
from pathlib import Path

W, H = 1280, 480
OUT = Path(__file__).resolve().parent.parent / "screenshots"

# 5x7 bitmap font, one string per row ('#' = lit pixel).
FONT = {
    "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "B": ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
    "C": [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
    "D": ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
    "E": ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    "F": ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
    "G": [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
    "H": ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "I": [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
    "K": ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
    "L": ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
    "M": ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
    "N": ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
    "O": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "P": ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
    "R": ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
    "S": [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
    "T": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
    "U": ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "W": ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
    "Y": ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
    "0": [".###.", "#..##", "#.#.#", "##..#", "#...#", "#...#", ".###."],
    "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
    "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
    "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
    "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
    "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
    "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
    "7": ["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."],
    " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
    "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
    "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
    ":": [".....", "..#..", "..#..", ".....", "..#..", "..#..", "....."],
    "/": ["....#", "...#.", "...#.", "..#..", ".#...", ".#...", "#...."],
}


class Canvas:
    def __init__(self, w, h, bg):
        self.w, self.h = w, h
        self.px = bytearray(bg * (w * h))

    def set(self, x, y, rgb):
        if 0 <= x < self.w and 0 <= y < self.h:
            i = (y * self.w + x) * 3
            self.px[i:i + 3] = bytes(rgb)

    def rect(self, x, y, w, h, rgb):
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                self.set(xx, yy, rgb)

    def circle(self, cx, cy, r, rgb, fill=True):
        for yy in range(cy - r, cy + r + 1):
            for xx in range(cx - r, cx + r + 1):
                d2 = (xx - cx) ** 2 + (yy - cy) ** 2
                if fill and d2 <= r * r:
                    self.set(xx, yy, rgb)
                elif not fill and r * r - 2 * r <= d2 <= r * r:
                    self.set(xx, yy, rgb)

    def ring(self, cx, cy, r, rgb, thick=3):
        for t in range(thick):
            self.circle(cx, cy, r - t, rgb, fill=False)

    def tri(self, pts, rgb):
        (x1, y1), (x2, y2), (x3, y3) = pts
        minx, maxx = min(x1, x2, x3), max(x1, x2, x3)
        miny, maxy = min(y1, y2, y3), max(y1, y2, y3)
        den = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3)
        if den == 0:
            return
        for yy in range(miny, maxy + 1):
            for xx in range(minx, maxx + 1):
                a = ((y2 - y3) * (xx - x3) + (x3 - x2) * (yy - y3)) / den
                b = ((y3 - y1) * (xx - x3) + (x1 - x3) * (yy - y3)) / den
                c = 1 - a - b
                if a >= 0 and b >= 0 and c >= 0:
                    self.set(xx, yy, rgb)

    def line(self, x1, y1, x2, y2, rgb, thick=2):
        steps = max(abs(x2 - x1), abs(y2 - y1), 1)
        for i in range(steps + 1):
            x = x1 + (x2 - x1) * i // steps
            y = y1 + (y2 - y1) * i // steps
            self.rect(x, y, thick, thick, rgb)

    def text(self, x, y, s, rgb, scale=2):
        cx = x
        for ch in s.upper():
            glyph = FONT.get(ch, FONT[" "])
            for row_i, row in enumerate(glyph):
                for col_i, cell in enumerate(row):
                    if cell == "#":
                        self.rect(cx + col_i * scale, y + row_i * scale, scale, scale, rgb)
            cx += 6 * scale
        return cx

    def png_bytes(self):
        raw = bytearray()
        for yy in range(self.h):
            raw.append(0)
            raw.extend(self.px[yy * self.w * 3:(yy + 1) * self.w * 3])

        def chunk(tag, data):
            body = tag + data
            return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

        ihdr = struct.pack(">IIBBBBB", self.w, self.h, 8, 2, 0, 0, 0)
        return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr)
                + chunk(b"IDAT", zlib.compress(bytes(raw), 9)) + chunk(b"IEND", b""))


# Panel geometry mirrors game/src: panels 560x340 at y=40 (game canvas
# 1180x420) scaled onto the 1280x480 screenshot.
PANEL_W, PANEL_H, PANEL_Y = 560, 340, 60
LEFT_X, RIGHT_X = 40, 680

# Difference centres in panel coords (seed 1, jitter-free anchors).
DIFFS = [(150, 62), (338, 158), (73, 177), (468, 44), (360, 196), (470, 100), (196, 196)]


def paint_panel(cv, x0, side):
    y0 = PANEL_Y
    # sky bands (gradient steps)
    bands = [(27, 42, 94), (52, 48, 110), (90, 61, 122), (150, 84, 110), (232, 131, 107)]
    for i, colour in enumerate(bands):
        cv.rect(x0, y0 + i * 42, PANEL_W, 42, colour)
    # stars
    for sx, sy in [(40, 30), (110, 18), (205, 36), (300, 22), (395, 30), (468, 44), (520, 20)]:
        if side == "right" and (sx, sy) == (468, 44):
            continue
        cv.circle(x0 + sx, y0 + sy, 2, (245, 240, 216))
    # sun + moon
    cv.circle(x0 + 270, y0 + 168, 30, (255, 179, 71))
    cv.circle(x0 + 70, y0 + 52, 14, (247, 234, 208))
    cv.circle(x0 + 76, y0 + 47, 11, (35, 42, 85))
    # birds
    for bx, by in [(120, 78), (150, 62), (182, 82)]:
        if side == "right" and (bx, by) == (150, 62):
            continue
        cv.line(x0 + bx - 9, y0 + by + 3, x0 + bx, y0 + by - 4, (20, 28, 56), 2)
        cv.line(x0 + bx, y0 + by - 4, x0 + bx + 9, y0 + by + 3, (20, 28, 56), 2)
    # sea
    cv.rect(x0, y0 + 210, PANEL_W, PANEL_H - 210, (32, 56, 102))
    cv.rect(x0, y0 + 300, PANEL_W, 40, (22, 38, 74))
    for i in range(5):
        cv.rect(x0 + 215, y0 + 232 + i * 20, 110, 3, (255, 190, 120))
    # houses
    for hx, hw, hh, wall in [(52, 74, 62, (138, 90, 74)), (136, 66, 52, (160, 106, 78))]:
        top = y0 + 210 - hh
        cv.rect(x0 + hx, top, hw, hh, wall)
        cv.tri([(x0 + hx - 6, top), (x0 + hx + hw // 2, top - 24), (x0 + hx + hw + 6, top)], (61, 43, 68))
        for wi in range(2):
            watched = hx == 52 and wi == 0
            colour = (42, 36, 56) if watched and side == "right" else (255, 209, 102)
            cv.rect(x0 + hx + 12 + wi * 34, top + 18, 18, 22, colour)
    cv.rect(x0 + 188, y0 + 210 - 52 - 34, 14, 22, (93, 74, 74))
    if side == "left":
        for px, py, pr in [(195, 196, 7), (201, 184, 9), (209, 170, 11)]:
            cv.circle(x0 + px, y0 + py, pr, (220, 220, 230))
    # lighthouse (+ beam on the left only)
    lx = x0 + 512
    if side == "left":
        cv.tri([(lx, y0 + 96), (lx - 150, y0 + 70), (lx - 150, y0 + 128)], (255, 230, 150))
    cv.rect(lx - 14, y0 + 108, 28, 102, (232, 226, 212))
    cv.rect(lx - 13, y0 + 138, 26, 14, (194, 59, 59))
    cv.rect(lx - 11, y0 + 168, 22, 14, (194, 59, 59))
    cv.rect(lx - 9, y0 + 88, 18, 18, (255, 209, 102))
    cv.tri([(lx - 13, y0 + 88), (lx, y0 + 72), (lx + 13, y0 + 88)], (43, 43, 58))
    # big boat: mast, flag (colour differs), sail (+ stripe left only), hull
    bx, by = x0 + 320, y0 + 252
    cv.rect(bx + 8, by - 102, 4, 102, (58, 44, 34))
    flag = (230, 57, 70) if side == "left" else (46, 196, 182)
    cv.tri([(bx + 10, by - 102), (bx + 38, by - 94), (bx + 10, by - 84)], flag)
    cv.tri([(bx + 16, by - 92), (bx + 16, by - 14), (bx + 78, by - 14)], (244, 236, 216))
    if side == "left":
        cv.rect(bx + 30, by - 58, 22, 5, (230, 57, 70))
    cv.tri([(bx - 26, by), (bx + 96, by), (bx + 78, by + 22)], (107, 70, 50))
    cv.tri([(bx - 26, by), (bx + 78, by + 22), (bx - 8, by + 22)], (107, 70, 50))
    # rowboat
    cv.rect(x0 + 430, y0 + 286, 62, 14, (74, 107, 138))
    # panel border
    cv.rect(x0, y0, PANEL_W, 3, (11, 18, 38))
    cv.rect(x0, y0 + PANEL_H - 3, PANEL_W, 3, (11, 18, 38))
    cv.rect(x0, y0, 3, PANEL_H, (11, 18, 38))
    cv.rect(x0 + PANEL_W - 3, y0, 3, PANEL_H, (11, 18, 38))


def render(mode, found_ids):
    cv = Canvas(W, H, (16, 28, 58))
    paint_panel(cv, LEFT_X, "left")
    paint_panel(cv, RIGHT_X, "right")
    # header labels + counter
    cv.text(LEFT_X + 6, 24, "ORIGINAL", (232, 238, 252), 2)
    cv.text(RIGHT_X + 6, 24, "CHANGED", (232, 238, 252), 2)
    remaining = 7 - len(found_ids)
    label = f"{remaining} REMAINING"
    cv.text(W - 40 - len(label) * 12, 24, label, (255, 209, 102), 2)
    # found rings on both panels
    for i in found_ids:
        dx, dy = DIFFS[i]
        cv.ring(LEFT_X + dx, PANEL_Y + dy, 30, (53, 224, 138), 3)
        cv.ring(RIGHT_X + dx, PANEL_Y + dy, 30, (53, 224, 138), 3)
    # footer strip
    cv.rect(0, 420, W, 60, (11, 18, 38))
    if mode == "start":
        cv.rect(340, 150, 600, 130, (6, 10, 24))
        cv.text(430, 180, "HARBOUR DUSK", (255, 255, 255), 4)
        cv.text(400, 232, "SPOT THE 7 DIFFERENCES", (255, 209, 102), 2)
        cv.text(40, 440, "PRESS START TO PLAY", (255, 209, 102), 2)
    elif mode == "play":
        cv.text(40, 440, "FOUND 3 OF 7 - 4 STILL HIDING", (232, 238, 252), 2)
        cv.text(900, 440, "TIME 0:42", (255, 209, 102), 2)
        # gold keyboard cursor ring on the right panel
        cv.ring(RIGHT_X + 360, PANEL_Y + 196, 20, (255, 209, 102), 3)
    else:
        cv.text(40, 440, "ALL 7 FOUND - YOU WIN!", (53, 224, 138), 2)
        cv.text(900, 440, "SCORE 700", (255, 209, 102), 2)
    return cv.png_bytes()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    shots = [
        ("1-start.png", render("start", [])),
        ("2-play.png", render("play", [0, 1, 2])),
        ("3-end.png", render("end", list(range(7)))),
    ]
    for name, data in shots:
        (OUT / name).write_bytes(data)
        print(name, len(data))


if __name__ == "__main__":
    main()
