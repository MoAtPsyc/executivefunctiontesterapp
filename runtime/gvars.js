// Global state — naming mirrors the upstream "Flip" runtime so gameplay
// code reads similarly to the reference implementation.
window.gvars = {
  state: "init",
  showTut: false,
  run: false,
  lastPuzzle: false,
  holdTime: false,

  // entities
  meatTypes: ["burger", "chicken", "sausage"],
  meat: [],
  allMeat: [],

  // grid
  locations: [],                                          // sprite-like position objects
  positions: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],     // free position IDs
  prevPositions: [],                                      // freed-up IDs queued to return

  // arc / circle drawing
  lineRadius: 70,
  lineSpeedIncrease: 0,

  // spawn cadence (ms between spawns) — overwritten by updateGameDifficulty()
  pickTickMin: 1000,
  pickTickMax: 3000,

  // session counters (the three primary metrics)
  rawMeat: 0,    // impulsive clicks (clicked while raw)
  readyMeat: 0,  // correct hits (clicked while ready)
  burntMeat: 0,  // inattentive misses (let it burn)
  streak: 0,

  // difficulty
  difficultyLevel: 1,
  maxDifficulty: 10,

  // ---- CPT (continuous performance test) schedule ----
  // Fixed pattern so every participant gets the same sequence — required for
  // norming data across users. Each entry = level (1–10), held for
  // segmentDurationMs. Total runtime = schedule.length * segmentDurationMs.
  // Shortened schedule — level-1 warm-up segments removed so each lap is
  // ~100s of testing instead of ~200s. Same fixed pattern for every lap.
  levelSchedule: [1, 8, 4, 10, 3, 9, 7, 6, 5, 2],
  segmentDurationMs: 10000,
  // session timing (set at session start)
  sessionStartMs: 0,
  currentSegment: 0,
  sessionEnded: false,

  // ---- BOMB / NoGo inhibition ----
  // A bomb appears at a fixed schedule (every bombIntervalMs) at a
  // predetermined perimeter position. While present:
  //   - meat ticking is paused (no raw/ready/burnt counts can occur)
  //   - any click anywhere = flexibility++ (failed response inhibition)
  bombIntervalMs: 23000,        // bombs every 23s
  bombDurationMs: 5000,
  bombFirstAppearanceMs: 30000, // first bomb at t=30s — yields 3 bombs per ~100s lap
  // Predetermined position indices into GameScene.bombPositions (8 perimeter
  // slots). Fixed so every user sees the same sequence. 5 entries is enough
  // headroom — only the first 3 fit in a lap, the rest are skipped.
  bombPositionSchedule: [0, 3, 6, 1, 4],
  bombActive: false,
  bombStartedAt: 0,   // ms timestamp of current bomb's onset (scene clock)
  nextBombIndex: 0,
  flexibility: 0,         // total clicks while bomb is on-screen (HUD)
  // Three separate latency-binned set-shifting scores, reported only on the
  // end screen. No composite — these are independent metrics.
  flexibility_0_1: 0,     // clicks 0–1000ms into the bomb
  flexibility_1_2: 0,     // clicks 1000–2000ms
  flexibility_2_5: 0,     // clicks 2000–5000ms
  // Post-bomb burns — meat that burns shortly after a NoGo period also
  // reflects failure to switch back / re-engage. Bins are time since the
  // bomb ENDED, so 0–1s = closest to the offset = strongest set-shift cost.
  bombEndedAt: -1e12,     // far-past sentinel until the first bomb ends
  flexibility_post_0_1: 0,
  flexibility_post_1_2: 0,

  // ---- Two-lap test structure ----
  // Lap 1: CPT + bombs only.  Lap 2: same, plus distractor GIFs.
  // Lap 2 starts immediately when lap 1 ends. Final results are reported per
  // lap so condition effects can be compared.
  lapNumber: 1,
  distractorCondition: false,
  lap1Results: null,
  lap2Results: null,

  // ---- Distractor schedule (lap 2 only) ----
  // 8 GIFs, each appears twice (16 total). Pattern is fixed for norming.
  // Cycle: 5s blank then 5s GIF, repeated. First GIF at t=5s.
  distractorGifs: [
    "3XC.gif", "7ue6.gif", "7vYk.gif", "BZXa.gif",
    "CXBk.gif", "I1sO.gif", "LnLg.gif", "XpsZ.gif",
  ],
  distractorSchedule: [
    { gifIndex: 0, side: "left"  }, { gifIndex: 1, side: "right" },
    { gifIndex: 2, side: "left"  }, { gifIndex: 3, side: "right" },
    { gifIndex: 4, side: "right" }, { gifIndex: 5, side: "left"  },
    { gifIndex: 6, side: "right" }, { gifIndex: 7, side: "left"  },
    { gifIndex: 0, side: "right" }, { gifIndex: 1, side: "left"  },
    { gifIndex: 2, side: "right" }, { gifIndex: 3, side: "left"  },
    { gifIndex: 4, side: "left"  }, { gifIndex: 5, side: "right" },
    { gifIndex: 6, side: "left"  }, { gifIndex: 7, side: "right" },
  ],
  distractorIntervalMs: 12000,        // 4s blank + 8s display
  distractorDurationMs: 8000,
  distractorFirstAppearanceMs: 5000,  // first GIF at t=5s
  nextDistractorIndex: 0,
  distractorActive: false,

  // Snapshot the per-trial counters into a plain object — used to freeze a
  // lap's results before resetting for the next lap.
  snapshotResults() {
    return {
      readyMeat: this.readyMeat,
      rawMeat: this.rawMeat,
      burntMeat: this.burntMeat,
      flexibility: this.flexibility,
      flexibility_0_1: this.flexibility_0_1,
      flexibility_1_2: this.flexibility_1_2,
      flexibility_2_5: this.flexibility_2_5,
      flexibility_post_0_1: this.flexibility_post_0_1,
      flexibility_post_1_2: this.flexibility_post_1_2,
    };
  },

  resetTrialCounters() {
    this.readyMeat = 0;
    this.rawMeat = 0;
    this.burntMeat = 0;
    this.streak = 0;
    this.flexibility = 0;
    this.flexibility_0_1 = 0;
    this.flexibility_1_2 = 0;
    this.flexibility_2_5 = 0;
    this.flexibility_post_0_1 = 0;
    this.flexibility_post_1_2 = 0;
    this.bombEndedAt = -1e12;
  },

  // Speed multiplier — 2.0 means everything takes twice as long (50% slower).
  // Tweak this to globally retune pacing without touching the level table.
  speedMultiplier: 1.25,

  // Visual scale knob for meat sprites. 1.0 = native (matches the original
  // atlas sprites). Lower values shrink. Set per the artwork in use.
  meatScaleFactor: 0.6,

  // Progress-arc radius as a fraction of the meat sprite's display width.
  // 1.0 = arc sits on the meat's outer edge. Tweak to taste.
  arcRadiusFactor: 1.05,

  // Original level table from runtime.js — kept verbatim, then scaled by
  // speedMultiplier so the relative difficulty curve is preserved.
  updateGameDifficulty() {
    const M = this.speedMultiplier;
    let min, max, inc;
    switch (this.difficultyLevel) {
      case 1:  min=1000; max=3000; inc=0;    break;
      case 2:  min=900;  max=2500; inc=200;  break;
      case 3:  min=800;  max=2100; inc=300;  break;
      case 4:  min=700;  max=1800; inc=400;  break;
      case 5:  min=600;  max=1500; inc=500;  break;
      case 6:  min=500;  max=1200; inc=700;  break;
      case 7:  min=400;  max=1000; inc=900;  break;
      case 8:  min=300;  max=800;  inc=1000; break;
      case 9:  min=300;  max=800;  inc=1100; break;
      case 10: min=200;  max=800;  inc=1200; break;
    }
    this.pickTickMin = min * M;
    this.pickTickMax = max * M;
    // lineSpeedIncrease is subtracted from baseLineSpeed (also scaled), so
    // scale it the same way to keep the per-level proportional speedup.
    this.lineSpeedIncrease = inc * M;
  },

  // type → base lineSpeed (ms for full 360° arc). Scaled by speedMultiplier
  // via getter so callers always see the tuned values.
  _baseLineSpeed: { burger: 4500, chicken: 5500, sausage: 6000 },
  get baseLineSpeed() {
    const M = this.speedMultiplier;
    return {
      burger: this._baseLineSpeed.burger * M,
      chicken: this._baseLineSpeed.chicken * M,
      sausage: this._baseLineSpeed.sausage * M,
    };
  },
};
