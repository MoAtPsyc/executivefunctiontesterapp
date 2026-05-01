// LoadingScene — loads the multi-atlas (gamePack-0/1) used for the BBQ +
// meat sprites, then registers per-meat-type animations (raw/ready/burnt).
class LoadingScene extends Phaser.Scene {
  constructor() {
    super("LoadingScene");
  }

  preload() {
    const { width, height } = this.scale.gameSize;
    const bar = this.add.rectangle(width / 2, height / 2, 4, 12, 0xffffff);
    this.load.on("progress", (p) => { bar.width = Math.max(4, 320 * p); });

    this.load.multiatlas("game", "assets/data/gamePack.json", "assets/images");
    // custom grill replacement (atlas BBQ sprite is unused now)
    this.load.image("grill", "assets/images/grill.png");
    // Custom meat sprites — one PNG per (type, state). Texture key convention
    // is `<type>_<state>` so Meat code can build it as `${type}_${state}`.
    ["burger", "chicken", "sausage"].forEach((t) => {
      ["raw", "ready", "burnt"].forEach((s) => {
        this.load.image(`${t}_${s}`, `assets/images/${t}_${s}.png`);
      });
    });
  }

  create() {
    // Build the animations runtime.js used: each meat type has frames
    // <type>0 (raw), <type>1 (ready), <type>2 (cooked/flipped). The original
    // didn't actually play these as anims — it manually called nextFrame().
    // We register them so we can setFrame() by index easily.
    ["burger", "chicken", "sausage"].forEach((type) => {
      this.anims.create({
        key: type,
        frames: [0, 1, 2].map((i) => ({ key: "game", frame: `${type}${i}` })),
        frameRate: 1,
        repeat: 0,
      });
    });

    // flame anim: 6 frames, looping
    this.anims.create({
      key: "flame",
      frames: [0, 1, 2, 3, 4, 5].map((i) => ({ key: "game", frame: `flame${i}` })),
      frameRate: 12,
      repeat: -1,
    });

    // Show bilingual instructions overlay; start the game only after the
    // user clicks Begin. The session clock starts inside GameScene.create(),
    // so nothing ticks until the user is ready.
    showInstructions(() => {
      this.scene.start("GameScene");
      this.scene.launch("HudScene");
    });
  }
}
