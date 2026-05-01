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
    },

    scene: [LoadingScene, GameScene, HudScene, EndScene],

    fps: { min: 5, target: 30 },

    render: {
      clearBeforeRender: false,
      transparent: true,
    },
  };

  window.game = new Phaser.Game(config);
});
