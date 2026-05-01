// GameScene — uses the real Flip sprites (BBQ, meats, flames, circle parts).
// Mirrors the runtime.js gameplay: 4x4 grid on the BBQ, arc drawn around each
// meat by dropping circlePart dots, raw->ready->burnt state machine.

class GameScene extends Phaser.Scene {
  constructor() { super("GameScene"); }

  create() {
    const W = this.scale.gameSize.width;
    const H = this.scale.gameSize.height;

    // green grass background (Grass tilesprite — original gameplay bg).
    // Stored so we can tint it red as the NoGo cue (replaces the bomb GIF).
    this.grass = this.add.tileSprite(W / 2, H / 2, W, H, "game", "Grass");
    // Full-screen red wash, on top of the gameplay layer (above BBQ/meats)
    // but below the HudScene which lives in its own scene. Hidden until a
    // NoGo period starts.
    // NoGo cue — a soft red vignette covering only the outer ~20% of the
    // screen (a ring around the perimeter), drawn with a radial gradient so
    // the center stays clear and the edges glow.
    const ringThickness = Math.min(W, H) * 0.2;
    const ringTexKey = "bombRing";
    if (this.textures.exists(ringTexKey)) this.textures.remove(ringTexKey);
    const tex = this.textures.createCanvas(ringTexKey, W, H);
    const ctx = tex.getContext();
    // radial gradient: transparent in the middle, red toward the edges
    const cx = W / 2, cy = H / 2;
    const innerR = Math.min(W, H) / 2 - ringThickness;
    const outerR = Math.hypot(W / 2, H / 2);
    const grd = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
    grd.addColorStop(0, "rgba(255,0,0,0)");
    grd.addColorStop(1, "rgba(255,0,0,1)");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);
    tex.refresh();
    this.bombOverlay = this.add.image(W / 2, H / 2, ringTexKey)
      .setDepth(1000)
      .setAlpha(0);

    // BBQ / grill sprite — uses custom grill.png. Swap the texture key here
    // if you change the grill artwork.
    this.BBQ = this.add.sprite(W / 2, H / 2, "grill");
    const bbqScale = Math.min(W, H) / Math.max(this.BBQ.width, this.BBQ.height) * 0.85;
    this.BBQ.setScale(bbqScale);

    // (Thermometer intentionally omitted — visible difficulty indicator
    // would distract / bias response patterns in a normed test.)

    // 4x4 grid of locations on the BBQ surface (matches original maths)
    gvars.locations = [];
    gvars.positions = Array.from({ length: 16 }, (_, i) => i);
    gvars.allMeat = [];
    gvars.rawMeat = 0; gvars.readyMeat = 0; gvars.burntMeat = 0; gvars.streak = 0;

    // Wider 4x4 grid — spreads spawns across most of the BBQ surface so the
    // player has to actively scan / shift focus instead of foveating one spot.
    // Original used /8 and /7 (tight); we use /5 to roughly double cell pitch.
    const hSpacing = (this.BBQ.displayWidth) / 5;
    const vSpacing = (this.BBQ.displayHeight) / 5;
    let id = 0;
    let startY = this.BBQ.y - 1.5 * vSpacing;
    for (let r = 0; r < 4; r++) {
      let startX = this.BBQ.x - 1.5 * hSpacing;
      for (let c = 0; c < 4; c++) {
        gvars.locations.push({ ID: id++, x: startX, y: startY });
        startX += hSpacing;
      }
      startY += vSpacing;
    }

    // 8 perimeter slots for the bomb (NoGo cue) — outside the BBQ rim,
    // ordered N, NE, E, SE, S, SW, W, NW.
    this.bombPositions = [];
    const perimR = this.BBQ.displayWidth * 0.55;
    for (let i = 0; i < 8; i++) {
      const a = -Math.PI / 2 + i * (Math.PI / 4);
      this.bombPositions.push({
        x: this.BBQ.x + perimR * Math.cos(a),
        y: this.BBQ.y + perimR * Math.sin(a),
      });
    }

    // create the HTML <img> overlay for the bomb (kept hidden until shown).
    // Using <img> preserves the GIF animation — Phaser's image loader only
    // captures the first frame.
    this.ensureBombOverlay();
    this.ensureDistractorOverlay();

    // start the (current lap of the) CPT session at level 1 of the schedule
    gvars.sessionStartMs = Date.now();
    gvars.currentSegment = 0;
    gvars.sessionEnded = false;
    gvars.lastPuzzle = false;
    gvars.bombActive = false;
    gvars.nextBombIndex = 0;
    gvars.distractorActive = false;
    gvars.nextDistractorIndex = 0;
    gvars.resetTrialCounters();
    gvars.difficultyLevel = gvars.levelSchedule[0];
    gvars.updateGameDifficulty();

    // Make sure the HUD is up — needed after a lap restart that stopped it.
    if (!this.scene.isActive("HudScene")) this.scene.launch("HudScene");

    gvars.run = true;
    gvars.state = "cooking";
    this.thermometerChange();

    this.scheduleNextSpawn(0);

    this.events.on("freePosition", (id) => {
      this.time.delayedCall(1000, () => gvars.positions.push(id));
    });

    // global click watcher — counts ANY click while bomb is active as a
    // flexibility failure (response inhibition error). Uses the DOM element
    // so it catches clicks on the bomb overlay too.
    this.input.on("pointerdown", () => {
      if (!gvars.bombActive) return;
      gvars.flexibility++;
      // bin by latency since bomb onset for the end-screen breakdown
      const dt = Date.now() - gvars.bombStartedAt;
      if (dt < 1000) gvars.flexibility_0_1++;
      else if (dt < 2000) gvars.flexibility_1_2++;
      else gvars.flexibility_2_5++;
      this.events.emit("metric", { kind: "flexibility" });
      this.flashBomb();
    });
  }

  ensureBombOverlay() {
    // legacy hook — bomb is now a red background flash, no DOM element needed
  }

  showBombAt(/* pos */) {
    // Pulsing red overlay over the grass — visible NoGo cue without a sprite.
    if (this._bombTween) this._bombTween.stop();
    this._bombTween = this.tweens.add({
      targets: this.bombOverlay,
      alpha: { from: 0.25, to: 0.55 },
      duration: 350,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  hideBomb() {
    if (this._bombTween) { this._bombTween.stop(); this._bombTween = null; }
    if (this.bombOverlay) this.bombOverlay.setAlpha(0);
  }

  flashBomb() {
    // brief brighter flash to acknowledge a click during NoGo
    if (!this.bombOverlay) return;
    this.bombOverlay.setAlpha(0.7);
    this.time.delayedCall(120, () => {
      if (gvars.bombActive && this.bombOverlay) this.bombOverlay.setAlpha(0.35);
    });
  }

  // Called every frame from update() — drives bomb appearances on a fixed
  // schedule independent of meat spawning.
  advanceBombs() {
    if (gvars.sessionEnded) return;
    const elapsed = Date.now() - gvars.sessionStartMs;
    const totalBombs = gvars.bombPositionSchedule.length;

    if (gvars.nextBombIndex >= totalBombs) return;

    const startAt = gvars.bombFirstAppearanceMs + gvars.nextBombIndex * gvars.bombIntervalMs;
    const endAt = startAt + gvars.bombDurationMs;
    const totalMs = gvars.levelSchedule.length * gvars.segmentDurationMs;

    // Skip any bomb whose window would overrun the session — otherwise the
    // red flash spills past the end of the countdown while we wait for the
    // grill to drain.
    if (endAt > totalMs) {
      gvars.nextBombIndex++;
      return;
    }

    if (!gvars.bombActive && elapsed >= startAt && elapsed < endAt) {
      gvars.bombActive = true;
      gvars.bombStartedAt = Date.now();
      const posIdx = gvars.bombPositionSchedule[gvars.nextBombIndex];
      this.showBombAt(this.bombPositions[posIdx]);
      this.events.emit("bombStart", { index: gvars.nextBombIndex, position: posIdx });
    } else if (gvars.bombActive && elapsed >= endAt) {
      gvars.bombActive = false;
      gvars.bombEndedAt = Date.now(); // arm the post-bomb burn window
      this.hideBomb();
      gvars.nextBombIndex++;
      this.events.emit("bombEnd");
    }
  }

  shutdown() {
    if (this.bombEl) this.bombEl.style.display = "none";
    if (this.distractorEl) this.distractorEl.style.display = "none";
  }

  // ---- Lap transition ----
  // Snapshot results, then either start lap 2 (with distractors) or finish.
  endLap() {
    const snap = gvars.snapshotResults();
    if (gvars.lapNumber === 1) {
      gvars.lap1Results = snap;
      gvars.lapNumber = 2;
      gvars.distractorCondition = true;
      // stop HudScene so its event listeners get re-attached on the new
      // GameScene instance after restart (Phaser clears events on shutdown)
      this.scene.stop("HudScene");
      this.scene.restart();
    } else {
      gvars.lap2Results = snap;
      this.scene.launch("EndScene");
      this.scene.bringToTop("EndScene");
    }
  }

  // ---- Distractor (lap 2) ----
  ensureDistractorOverlay() {
    let el = document.getElementById("distractor-overlay");
    if (!el) {
      el = document.createElement("img");
      el.id = "distractor-overlay";
      el.style.position = "fixed";
      el.style.pointerEvents = "none"; // never blocks clicks
      el.style.display = "none";
      el.style.transform = "translate(-50%, -50%)";
      el.style.zIndex = "5";
      document.body.appendChild(el);
    }
    this.distractorEl = el;
  }

  showDistractor(gifFile, side) {
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const sy = rect.top + rect.height / 2;
    // BBQ edges in screen pixels
    const bbqLeft  = rect.left + ((this.BBQ.x - this.BBQ.displayWidth / 2) / this.scale.gameSize.width) * rect.width;
    const bbqRight = rect.left + ((this.BBQ.x + this.BBQ.displayWidth / 2) / this.scale.gameSize.width) * rect.width;
    const sx = side === "left"
      ? (rect.left + bbqLeft) / 2
      : (rect.right + bbqRight) / 2;
    // Size the distractor to (almost) fill the side gap between BBQ and
    // screen edge — large enough to be a real distractor but with a small
    // margin so it doesn't overlap the BBQ.
    const sideGap = side === "left" ? (bbqLeft - rect.left) : (rect.right - bbqRight);
    const size = Math.min(sideGap * 0.9, rect.height * 0.55, 400);
    this.distractorEl.style.width = size + "px";
    this.distractorEl.style.height = size + "px";
    this.distractorEl.style.left = sx + "px";
    this.distractorEl.style.top = sy + "px";
    // re-set src with cache-buster so the GIF restarts from frame 0
    this.distractorEl.src = "assets/images/" + gifFile + "?t=" + Date.now();
    this.distractorEl.style.display = "block";
  }

  hideDistractor() {
    if (this.distractorEl) this.distractorEl.style.display = "none";
  }

  advanceDistractors() {
    if (!gvars.distractorCondition || gvars.sessionEnded) return;
    if (gvars.nextDistractorIndex >= gvars.distractorSchedule.length) {
      if (gvars.distractorActive) { gvars.distractorActive = false; this.hideDistractor(); }
      return;
    }

    const elapsed = Date.now() - gvars.sessionStartMs;
    const startAt = gvars.distractorFirstAppearanceMs
      + gvars.nextDistractorIndex * gvars.distractorIntervalMs;
    const endAt = startAt + gvars.distractorDurationMs;

    if (!gvars.distractorActive && elapsed >= startAt && elapsed < endAt) {
      gvars.distractorActive = true;
      const item = gvars.distractorSchedule[gvars.nextDistractorIndex];
      this.showDistractor(gvars.distractorGifs[item.gifIndex], item.side);
    } else if (gvars.distractorActive && elapsed >= endAt) {
      gvars.distractorActive = false;
      this.hideDistractor();
      gvars.nextDistractorIndex++;
    }
  }

  // Move to whatever segment the elapsed time says we should be in.
  // Idempotent — safe to call every frame.
  advanceSchedule() {
    if (gvars.sessionEnded) return;
    const elapsed = Date.now() - gvars.sessionStartMs;
    const totalMs = gvars.levelSchedule.length * gvars.segmentDurationMs;

    if (elapsed >= totalMs) {
      // session is over — stop spawning, then end once grill clears
      gvars.lastPuzzle = true;
      if (gvars.allMeat.length === 0 && !gvars.sessionEnded) {
        gvars.sessionEnded = true;
        gvars.state = "ended";
        gvars.bombActive = false;
        gvars.distractorActive = false;
        this.hideBomb();
        this.hideDistractor();
        this.endLap();
      }
      return;
    }

    const seg = Math.floor(elapsed / gvars.segmentDurationMs);
    if (seg !== gvars.currentSegment) {
      gvars.currentSegment = seg;
      gvars.difficultyLevel = gvars.levelSchedule[seg];
      gvars.updateGameDifficulty();
      this.thermometerChange();
      this.events.emit("segmentChange", { seg, level: gvars.difficultyLevel });
    }
  }

  scheduleNextSpawn(delay) {
    this.time.delayedCall(delay, () => {
      if (!gvars.run || gvars.lastPuzzle) return;
      this.spawnMeat();
      this.scheduleNextSpawn(Phaser.Math.Between(gvars.pickTickMin, gvars.pickTickMax));
    });
  }

  spawnMeat() {
    if (gvars.positions.length === 0) return;

    // Pick the free position whose minimum distance to any active meat is
    // the largest — forces the eye to travel and prevents clustering.
    // Adds a small random tiebreak so the pattern doesn't feel mechanical.
    const id = this.pickScatteredPosition();
    gvars.positions.splice(gvars.positions.indexOf(id), 1);

    const type = Phaser.Utils.Array.GetRandom(gvars.meatTypes);
    const loc = gvars.locations.find((l) => l.ID === id);
    const lineSpeed = gvars.baseLineSpeed[type] - gvars.lineSpeedIncrease;
    gvars.allMeat.push(new Meat(this, loc.x, loc.y, id, type, lineSpeed));
  }

  pickScatteredPosition() {
    const free = gvars.positions;
    if (gvars.allMeat.length === 0) return Phaser.Utils.Array.GetRandom(free);

    let best = free[0];
    let bestScore = -Infinity;
    for (const id of free) {
      const loc = gvars.locations.find((l) => l.ID === id);
      let minDist = Infinity;
      for (const m of gvars.allMeat) {
        if (m.destroyed) continue;
        const d = Phaser.Math.Distance.Between(loc.x, loc.y, m.x, m.y);
        if (d < minDist) minDist = d;
      }
      const score = minDist + Math.random() * 30; // small jitter to avoid determinism
      if (score > bestScore) { bestScore = score; best = id; }
    }
    return best;
  }

  thermometerChange() {
    // no-op — thermometer removed
  }

  update(_time, delta) {
    this.advanceSchedule();
    this.advanceBombs();
    this.advanceDistractors();
    if (gvars.state !== "cooking") return;
    // Meats keep cooking during a bomb (NoGo) — they can even reach burnt.
    // Scoring is suppressed at the metric site (Meat.onClick / becomeBurnt),
    // not by freezing the world.
    for (let i = gvars.allMeat.length - 1; i >= 0; i--) {
      const m = gvars.allMeat[i];
      if (m && !m.destroyed) m.tick(delta);
    }
  }
}

// Meat — sprite + arc-of-dots + state machine. Click handler distinguishes
// raw (impulsive) from ready (correct).
class Meat {
  constructor(scene, x, y, id, type, lineSpeed) {
    this.scene = scene;
    this.x = x; this.y = y;
    this.ID = id; this.type = type;
    this.lineSpeed = lineSpeed;
    this.lineTimer = 0;
    this.lineProgress = 0;
    this.state = "raw";
    this.destroyed = false;
    this.dots = [];
    this._readyEffectsStarted = false;

    const meatScale = (scene.BBQ.displayWidth / 1875) * gvars.meatScaleFactor;

    this.sprite = scene.add.sprite(x, y, `${type}_raw`)
      .setScale(meatScale)
      .setInteractive({ useHandCursor: true });

    // Cache the arc radius now, based on the final meat size. Don't recompute
    // from sprite.displayWidth later — the spawn-in tween and ready-pulse
    // both change scale, which would make the arc spiral outward.
    this.arcRadius = this.sprite.displayWidth * 0.5 * (gvars.arcRadiusFactor || 1.05);

    this.sprite.setScale(meatScale * 0.2);
    scene.tweens.add({ targets: this.sprite, scale: meatScale, duration: 180, ease: "Back.Out" });

    this.sprite.on("pointerdown", () => this.onClick());
  }

  tick(delta) {
    if (this.destroyed) return;
    this.lineTimer += delta;
    const newProgress = (this.lineTimer * 360) / this.lineSpeed;

    // drop a circlePart dot every ~2 degrees of progress, like the original
    while (this.lineProgress < newProgress && this.lineProgress < 360) {
      this.dropDot(this.lineProgress);
      this.lineProgress += 2;
    }
    this.lineProgress = newProgress;

    if (this.lineProgress >= 360 && this.state !== "burnt") {
      this.becomeBurnt();
    } else if (this.lineProgress >= 220 && this.state === "raw") {
      this.becomeReady();
    }
  }

  dropDot(deg) {
    // Original: e = x + R*cos(p), f = y + R*sin(p); progress in degrees.
    // 0..220 uses circlePart0 (raw, red), 220..360 uses circlePart1 (ready, orange).
    const rad = Phaser.Math.DegToRad(deg - 90); // start at top
    // lineRadius=70 was native at BBQ.width=1337; scale with current display
    const R = this.arcRadius;
    const px = this.x + R * Math.cos(rad);
    const py = this.y + R * Math.sin(rad);
    const frame = deg < 220 ? "circlePart0" : "circlePart1";
    const dot = this.scene.add.image(px, py, "game", frame).setScale(0.7);
    this.dots.push(dot);
  }

  becomeReady() {
    this.state = "ready";
    this.sprite.setTexture(`${this.type}_ready`);
    // ready pulse
    this.scene.tweens.add({
      targets: this.sprite,
      scale: this.sprite.scale * 1.06,
      yoyo: true,
      repeat: -1,
      duration: 400,
      ease: "Sine.InOut",
    });
    // smoke
    this.smokeLoop();
  }

  smokeLoop() {
    if (this.state !== "ready" || this.destroyed) return;
    const smoke = this.scene.add.sprite(this.x, this.y, "game", "smoke").setScale(0.7);
    this.scene.tweens.add({
      targets: smoke, y: smoke.y - 100, alpha: 0, duration: 1500,
      onComplete: () => smoke.destroy(),
    });
    this.scene.time.delayedCall(900, () => this.smokeLoop());
  }

  becomeBurnt() {
    this.state = "burnt";
    this.sprite.disableInteractive();
    this.sprite.setTexture(`${this.type}_burnt`);

    const flame = this.scene.add.sprite(this.x, this.y - 26, "game", "flame0").setScale(0.5);
    flame.play("flame");
    this.flame = flame;

    // During a bomb (NoGo) period, burns are nullified — meat still visually
    // chars and clears from the grill, but doesn't count against the player.
    if (!gvars.bombActive) {
      gvars.burntMeat++;
      gvars.streak = 0;
      this.scene.events.emit("metric", { kind: "burnt" });

      // Post-bomb window: a burn within 2s of the bomb ending also counts as
      // a set-shifting failure (couldn't re-engage in time). It is logged in
      // BOTH burnt (inattentive) AND flexibility (set-shifting).
      const sinceBombEnd = Date.now() - gvars.bombEndedAt;
      if (sinceBombEnd >= 0 && sinceBombEnd < 2000) {
        gvars.flexibility++;
        if (sinceBombEnd < 1000) gvars.flexibility_post_0_1++;
        else gvars.flexibility_post_1_2++;
        this.scene.events.emit("metric", { kind: "flexibility" });
      }
    }

    this.scene.tweens.add({
      targets: [this.sprite, this.flame, ...this.dots],
      alpha: 0,
      duration: 1250,
      onComplete: () => this.cleanup(false),
    });
  }

  onClick() {
    // During a bomb (NoGo) period, meat clicks neither score nor count as
    // raw/ready — they're absorbed by the global flexibility tracker on the
    // scene. Just bail.
    if (gvars.bombActive) return;
    if (this.state === "raw") {
      gvars.rawMeat++;
      gvars.streak = 0;
      this.scene.events.emit("metric", { kind: "raw" });
      this.showFeedback("Too early!", "#ff7a7a");
      this.cleanup(true);
    } else if (this.state === "ready") {
      gvars.readyMeat++;
      gvars.streak++;
      this.scene.events.emit("metric", { kind: "ready" });
      this.spatulaFlip();
      this.cleanup(true);
    }
  }

  spatulaFlip() {
    const sp = this.scene.add.sprite(this.x, this.y - 60, "game", "spatula").setScale(0.25);
    this.scene.tweens.add({
      targets: sp, y: this.y, duration: 200, yoyo: true,
      onComplete: () => sp.destroy(),
    });
    // meat flips
    this.scene.tweens.add({
      targets: this.sprite,
      angle: this.sprite.angle + 360,
      y: this.y - 80,
      yoyo: true,
      duration: 350,
      ease: "Sine.InOut",
    });
  }

  showFeedback(text, color) {
    const t = this.scene.add.text(this.x, this.y - 30, text, {
      fontFamily: "monospace", fontSize: "16px", color,
    }).setOrigin(0.5);
    this.scene.tweens.add({
      targets: t, y: t.y - 50, alpha: 0, duration: 1200,
      onComplete: () => t.destroy(),
    });
  }

  cleanup(animate) {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.events.emit("freePosition", this.ID);

    const idx = gvars.allMeat.indexOf(this);
    if (idx !== -1) gvars.allMeat.splice(idx, 1);

    const targets = [this.sprite, ...this.dots, this.flame].filter(Boolean);
    if (animate) {
      this.scene.tweens.add({
        targets, alpha: 0, duration: 600,
        onComplete: () => targets.forEach((t) => t.destroy && t.destroy()),
      });
    } else {
      targets.forEach((t) => t.destroy && t.destroy());
    }
  }
}
