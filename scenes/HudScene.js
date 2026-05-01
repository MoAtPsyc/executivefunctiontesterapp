// HudScene — three counters + session timer + current segment/level.
// Schedule is fixed for norming, so HUD is read-only (no manual override).
class HudScene extends Phaser.Scene {
  constructor() { super("HudScene"); }

  create() {
    const W = this.scale.gameSize.width;
    const FONT = "Menlo, Consolas, 'Courier New', monospace";

    this.title = this.add.text(12, 8, "Flip — CPT clone", {
      fontFamily: FONT, fontSize: "13px", color: "#ddd",
    });
    this.lapText = this.add.text(W / 2, 8,
      `lap ${gvars.lapNumber}/2  ${gvars.distractorCondition ? "(distractors)" : "(no distractors)"}`,
      { fontFamily: FONT, fontSize: "13px", color: "#ffd86b" }).setOrigin(0.5, 0);

    this.readyText = this.add.text(12, 30, "ready: 0",
      { fontFamily: FONT, fontSize: "16px", color: "#9ad17b" });
    this.rawText = this.add.text(12, 52, "raw (impulsive): 0",
      { fontFamily: FONT, fontSize: "16px", color: "#ff8888" });
    this.burntText = this.add.text(12, 74, "burnt (reaction time): 0",
      { fontFamily: FONT, fontSize: "16px", color: "#ffffff" });
    this.flexText = this.add.text(12, 96, "bomb errors (set-shifting): 0",
      { fontFamily: FONT, fontSize: "16px", color: "#ffaa00" });
    this.bombStateText = this.add.text(12, 118, "",
      { fontFamily: FONT, fontSize: "14px", color: "#ff4040" });

    this.timerText = this.add.text(W - 12, 8, "0:00",
      { fontFamily: FONT, fontSize: "20px", color: "#ddd" }).setOrigin(1, 0);

    const game = this.scene.get("GameScene");
    game.events.on("metric", () => this.refreshCounters());
    game.events.on("bombStart", () => this.bombStateText.setText("⚠ BOMB — do not click"));
    game.events.on("bombEnd", () => this.bombStateText.setText(""));
  }

  update() {
    if (gvars.sessionStartMs === 0) return;
    const totalMs = gvars.levelSchedule.length * gvars.segmentDurationMs;
    const elapsedMs = Math.min(Date.now() - gvars.sessionStartMs, totalMs);
    const remainingMs = Math.max(0, totalMs - elapsedMs);
    this.timerText.setText(fmt(remainingMs));
  }

  refreshCounters() {
    this.readyText.setText("ready: " + gvars.readyMeat);
    this.rawText.setText("raw (impulsive): " + gvars.rawMeat);
    this.burntText.setText("burnt (reaction time): " + gvars.burntMeat);
    this.flexText.setText("bomb errors (set-shifting): " + gvars.flexibility);
  }
}

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
