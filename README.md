# Executive Function Tester

Browser-based continuous performance test (CPT) with response-inhibition
and distractor conditions. Built in Phaser 3, fully static (no backend).

## What it measures

Each session is two laps of ~3:20 each.

- **Lap 1** — CPT + NoGo bombs, no distractors.
- **Lap 2** — same, plus animated distractor GIFs at the side of the screen.

Per-lap metrics:

- `ready` — correctly clicked meat in its ready (orange) window.
- `raw` — clicked too early (impulsivity).
- `burnt` — let it burn (reaction time / vigilance).
- `bomb errors (set-shifting)` — clicks during the red NoGo flash, plus
  burns within 2s of the flash ending. Binned by latency.
- `accuracy %` = `(ready − bomb errors) / (ready + raw + burnt) × 100`,
  floored at 0.

CSV export of both laps is on the end screen.

## Run locally

Phaser needs HTTP, not `file://`:

```
python3 -m http.server 8000
```

Open <http://localhost:8000>.

## Layout

```
index.html             # single page, cache-busted script loads
main.js                # Phaser.Game boot + config
runtime/
  gvars.js             # global state, level/bomb/distractor schedules
  h.js                 # tiny utility helpers
  sizing.js            # window/canvas sizing
  instructions.js      # bilingual EN/HE start overlay + CSV download
scenes/
  LoadingScene.js      # asset preload, anim setup
  GameScene.js         # grid, spawn loop, NoGo, distractors, lap transition
  HudScene.js          # live counters + countdown
  EndScene.js          # per-lap results + download button
assets/
  data/                # multi-atlas JSON
  images/              # gamePack-0/1.png + distractor GIFs + bomb.gif
```

## Tuning

All experiment parameters live in `runtime/gvars.js`:

- `levelSchedule` — fixed level pattern across 20 × 10s segments.
- `speedMultiplier` — global pacing knob (1.0 = original, 1.25 = current).
- `bombFirstAppearanceMs`, `bombIntervalMs`, `bombDurationMs` — NoGo cadence.
- `distractorFirstAppearanceMs`, `distractorIntervalMs`,
  `distractorDurationMs`, `distractorSchedule` — lap-2 distractor pattern.
