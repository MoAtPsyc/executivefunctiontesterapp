// Boot entry — assembled after DOMContentLoaded so scene classes & stubs exist.
document.addEventListener("DOMContentLoaded", function () {
  const size = getGameSize();

  const config = {
    type: Phaser.CANVAS,
    title: "ExecutiveFunctionTester",
    parent: "game",
    width: size.width,
    height: size.height,
    backgroundColor: "#1d1d24",

    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: size.width,
      height: size.height,
    },

    scene: [LoadingScene, GameScene, HudScene, EndScene],

    fps: { min: 5, target: 30 },

    render: {
      clearBeforeRender: false,
      transparent: true,
    },
  };

  window.game = new Phaser.Game(config);

  // Re-fit and re-layout when the viewport changes (orientation flip,
  // browser resize, mobile chrome bars showing/hiding). Phaser's FIT mode
  // rescales the canvas, but a full restart of GameScene re-runs the layout
  // math (BBQ size, grid, perimeter) against the new dimensions.
  let resizeT = null;
  const onResize = () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      const s = getGameSize();
      window.game.scale.resize(s.width, s.height);
      const gs = window.game.scene.getScene("GameScene");
      const hud = window.game.scene.getScene("HudScene");
      if (gs && gs.scene.isActive()) {
        if (hud && hud.scene.isActive()) hud.scene.stop();
        gs.scene.restart();
      }
    }, 200);
  };
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", onResize);
});
