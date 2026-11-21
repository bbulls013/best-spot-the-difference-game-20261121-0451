# Harbour Dusk — Spot the Difference

[![make.fun competition](https://make.fun/badge/best-spot-the-difference-game-20261121-0451.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451)
[![make.fun rank](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/bbulls013/best-spot-the-difference-game-20261121-0451/rank.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451)
[![make.fun reward](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/bbulls013/best-spot-the-difference-game-20261121-0451/reward.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451)

A spot-the-difference game set in a harbour at dusk, drawn entirely with
canvas shapes: gradient sky, low sun, sea, fishing boats, a lighthouse,
harbour houses, birds and early stars. The two pictures look the same —
seven details quietly differ.

## How to play

- Compare the left and right pictures. Click (or tap) either picture where
  a detail differs to mark it. Found differences get a green ring on both
  pictures.
- A wrong click costs points and time, and shows a red cross.
- The counter always shows how many differences remain. Find all seven
  before the clock runs out to win the round.
- **Hint** pulses one still-hidden difference (limited uses, small score
  cost). **New round** deals a fresh seed with the differences moved.
- Keyboard: arrow keys move the gold cursor ring across both pictures,
  `Enter` or `Space` marks the spot, `H` asks for a hint, `R` starts a
  new round.

## How to run

The game is plain static files with no build step and no network use.

Serve the `game/` folder with any static file server, for example:

```sh
python3 -m http.server 8080 --directory game
```

then open <http://localhost:8080> in a desktop browser.

To hand the entry in (copy `game/` and `screenshots/` to an output folder
and write `dossier.json`):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Screenshot modes for deterministic captures: append
`?shot=start&seed=1`, `?shot=play&seed=1` or `?shot=end&seed=1` to the
page URL.

## Layout

- `main.ts` — hand-in program (Node 22+, standard library only).
- `vendor/makefun-game.ts` — the kit's dossier builder, unchanged.
- `game/index.html` — page shell.
- `game/src/diffs.js` — seeded difference placement.
- `game/src/scene.js` — the harbour picture painter.
- `game/src/game.js` — round state, input, timer and scoring.
- `game/src/audio.js` — original WebAudio bleeps (no audio files).
- `screenshots/` — three captures of the game (cover first).
- `tools/render_shots.py` — deterministic screenshot renderer (stdlib only).
