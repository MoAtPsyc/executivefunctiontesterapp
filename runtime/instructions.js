// Instructions overlay — shown once at the start of the test.
// Bilingual (English + Hebrew RTL). Begin button starts gameplay.
window.showInstructions = function (onBegin) {
  let el = document.getElementById("instructions");
  if (el) el.remove();

  el = document.createElement("div");
  el.id = "instructions";
  el.innerHTML = `
    <style>
      #instructions {
        position: fixed; inset: 0; z-index: 1000;
        background: rgba(10,12,18,0.94);
        display: flex; align-items: stretch; justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
        color: #f0f0f0;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        padding: 16px;
        box-sizing: border-box;
      }
      #instructions .panel {
        margin: auto;
        width: 100%; max-width: 880px;
        padding: 24px 28px; background: #1a1d27;
        border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.6);
        display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
        box-sizing: border-box;
      }
      #instructions h1 { font-size: 20px; margin: 0 0 10px; color: #ffd86b; }
      #instructions ul { line-height: 1.6; padding-inline-start: 20px; margin: 0; font-size: 15px; }
      #instructions li { margin-bottom: 6px; }
      #instructions .he { direction: rtl; text-align: right; }
      #instructions .begin {
        grid-column: 1 / -1;
        margin-top: 4px; padding: 18px 0; font-size: 20px; font-weight: 600;
        background: #2bb673; color: white; border: 0; border-radius: 12px;
        cursor: pointer; letter-spacing: 1px;
      }
      #instructions .begin:hover { background: #34cf85; }
      #instructions .ok { color: #9ad17b; }
      #instructions .no { color: #ff7a7a; }
      #instructions .examples {
        grid-column: 1 / -1;
        display: flex; justify-content: center; gap: 18px; flex-wrap: wrap;
        margin-top: 4px; padding: 14px; background: #11141d; border-radius: 12px;
      }
      #instructions .ex { display: flex; flex-direction: column; align-items: center; gap: 4px; }
      #instructions .ex canvas {
        width: 90px; height: 90px; background: #2a2a2a; border-radius: 50%;
      }
      #instructions .ex .label { font-size: 12px; color: #ccc; text-align: center; }
      #instructions .ex .label .he { display: block; font-size: 11px; color: #999; }
      /* Phones / narrow screens: stack the two language columns */
      @media (max-width: 720px) {
        #instructions .panel {
          grid-template-columns: 1fr;
          padding: 18px 18px;
          gap: 16px;
        }
        #instructions h1 { font-size: 18px; }
        #instructions ul { font-size: 14px; }
        #instructions .ex canvas { width: 76px; height: 76px; }
        #instructions .begin { font-size: 18px; padding: 16px 0; }
      }
    </style>
    <div class="panel">
      <div class="en">
        <h1>How to play</h1>
        <ul>
          <li><span class="ok">Click</span> meat when its ring is <b>orange</b> (ready).</li>
          <li><span class="no">Do not click</span> when the ring is red (raw) or after it burns.</li>
          <li><span class="no">Do not click anything</span> when the screen edges flash <b>red</b>.</li>
          <li>Ignore the videos that appear at the side — they are distractions.</li>
        </ul>
      </div>
      <div class="he" lang="he">
        <h1>הוראות</h1>
        <ul>
          <li><span class="ok">לחץ</span> על הבשר כשהטבעת <b>כתומה</b> (מוכן).</li>
          <li><span class="no">אל תלחץ</span> כשהטבעת אדומה (נא) או אחרי שהבשר נשרף.</li>
          <li><span class="no">אל תלחץ בכלל</span> כשקצוות המסך מהבהבים ב<b>אדום</b>.</li>
          <li>התעלם מהסרטונים בצדדים — הם מסיחי דעת.</li>
        </ul>
      </div>
      <div class="examples">
        <div class="ex">
          <canvas id="exRaw" width="220" height="220"></canvas>
          <div class="label"><span class="no">RAW — don't click</span><span class="he" lang="he">נא — אל תלחץ</span></div>
        </div>
        <div class="ex">
          <canvas id="exReady" width="220" height="220"></canvas>
          <div class="label"><span class="ok">READY — click!</span><span class="he" lang="he">מוכן — לחץ!</span></div>
        </div>
        <div class="ex">
          <canvas id="exBurnt" width="220" height="220"></canvas>
          <div class="label"><span class="no">BURNT — too late</span><span class="he" lang="he">שרוף — מאוחר מדי</span></div>
        </div>
      </div>
      <button class="begin" id="instructionsBegin">Begin / התחל</button>
    </div>
  `;
  document.body.appendChild(el);

  // Draw the three meat states using the custom burger images.
  const samples = [
    { id: "exRaw",   src: "assets/images/burger_raw.png",   ringColor: "#d14a4a" },
    { id: "exReady", src: "assets/images/burger_ready.png", ringColor: "#e89a3a" },
    { id: "exBurnt", src: "assets/images/burger_burnt.png", ringColor: "#222222" },
  ];
  samples.forEach(({ id, src, ringColor }) => {
    const c = document.getElementById(id);
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(c.width / 2, c.height / 2, 95, 0, Math.PI * 2);
    ctx.stroke();
    const img = new Image();
    img.onload = () => {
      const dw = 140, dh = 140;
      ctx.drawImage(img, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
    };
    img.src = src;
  });

  document.getElementById("instructionsBegin").addEventListener("click", () => {
    el.remove();
    onBegin && onBegin();
  });
};

// Trigger a CSV download of the per-lap results.
window.downloadResults = function (lap1, lap2) {
  const headers = [
    "lap", "ready", "raw", "burnt",
    "bomb_errors_total",
    "bomb_click_0_1s", "bomb_click_1_2s", "bomb_click_2_5s",
    "bomb_postburn_0_1s", "bomb_postburn_1_2s",
    "total_trials", "accuracy_pct",
  ];
  const rowFor = (lap, r) => {
    if (!r) return [lap, ...Array(headers.length - 1).fill("")];
    const total = r.readyMeat + r.rawMeat + r.burntMeat;
    const net = Math.max(0, r.readyMeat - r.flexibility);
    const acc = total > 0 ? Math.round((net / total) * 100) : 0;
    return [
      lap, r.readyMeat, r.rawMeat, r.burntMeat,
      r.flexibility,
      r.flexibility_0_1, r.flexibility_1_2, r.flexibility_2_5,
      r.flexibility_post_0_1 || 0, r.flexibility_post_1_2 || 0,
      total, acc,
    ];
  };
  const lines = [
    headers.join(","),
    rowFor(1, lap1).join(","),
    rowFor(2, lap2).join(","),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  a.download = `flip_cpt_results_${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
