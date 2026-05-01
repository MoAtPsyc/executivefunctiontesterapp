// EndScene — final results across both laps.
// Lap 1: CPT + bombs (no distractors).
// Lap 2: same, with distractor GIFs. Comparing the two isolates the
// distractor cost on attention/impulsivity/inhibition.
class EndScene extends Phaser.Scene {
  constructor() { super("EndScene"); }

  create() {
    const W = this.scale.gameSize.width;
    const H = this.scale.gameSize.height;
    const FONT = "Menlo, Consolas, 'Courier New', monospace";

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7);

    this.add.text(W / 2, 50, "Test complete",
      { fontFamily: FONT, fontSize: "30px", color: "#fff" }).setOrigin(0.5);

    const colW = Math.min(W * 0.42, 480);
    const left = W / 2 - colW / 2 - 10;
    const right = W / 2 + colW / 2 + 10;

    this.renderColumn(left, 110, "Lap 1 — no distractors", gvars.lap1Results);
    this.renderColumn(right, 110, "Lap 2 — with distractors", gvars.lap2Results);

    // Download CSV button (DOM, so it gets native button styling).
    let dl = document.getElementById("downloadResultsBtn");
    if (dl) dl.remove();
    dl = document.createElement("button");
    dl.id = "downloadResultsBtn";
    dl.textContent = "⬇  Download results (CSV)";
    Object.assign(dl.style, {
      position: "fixed",
      left: "50%",
      bottom: "30px",
      transform: "translateX(-50%)",
      padding: "14px 28px",
      fontSize: "16px",
      fontWeight: "600",
      background: "#2bb673",
      color: "white",
      border: "0",
      borderRadius: "10px",
      cursor: "pointer",
      zIndex: "1000",
      letterSpacing: "0.5px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    });
    dl.addEventListener("click", () => {
      downloadResults(gvars.lap1Results, gvars.lap2Results);
    });
    document.body.appendChild(dl);
    this.events.once("shutdown", () => dl.remove());
  }

  renderColumn(x, y, title, r) {
    const FONT = "Menlo, Consolas, 'Courier New', monospace";
    const headStyle = { fontFamily: FONT, fontSize: "16px", color: "#ffd86b" };
    const lineStyle = { fontFamily: FONT, fontSize: "15px", color: "#dddddd" };

    this.add.text(x, y, title, headStyle).setOrigin(0.5, 0);

    if (!r) {
      this.add.text(x, y + 36, "(not run)", lineStyle).setOrigin(0.5, 0);
      return;
    }

    const total = r.readyMeat + r.rawMeat + r.burntMeat;
    const net = Math.max(0, r.readyMeat - r.flexibility);
    const accuracy = total > 0 ? Math.round((net / total) * 100) : 0;

    const lines = [
      `ready (correct):     ${r.readyMeat}`,
      `raw (impulsive):     ${r.rawMeat}`,
      `burnt (reaction time): ${r.burntMeat}`,
      `bomb errors total:   ${r.flexibility}`,
      ` clicks during bomb`,
      `  0–1s (hardest):    ${r.flexibility_0_1}`,
      `  1–2s (moderate):   ${r.flexibility_1_2}`,
      `  2–5s (easiest):    ${r.flexibility_2_5}`,
      ` burns after bomb`,
      `  0–1s post (worst): ${r.flexibility_post_0_1 || 0}`,
      `  1–2s post:         ${r.flexibility_post_1_2 || 0}`,
      ``,
      `total trials:        ${total}`,
      `accuracy:            ${accuracy}%`,
    ];
    lines.forEach((l, i) => {
      this.add.text(x, y + 36 + i * 24, l, lineStyle).setOrigin(0.5, 0);
    });
  }
}
