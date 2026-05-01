// Window/canvas sizing helpers — match the API names the original used.
function getGameSize() {
  const w = Math.min(window.innerWidth || 800, 1280);
  const h = Math.min(window.innerHeight || 600, 800);
  return { width: w, height: h };
}

function resize(width, height) {
  // Original did aspect-ratio fitting; Phaser's Scale.FIT handles that for us.
  return { width, height };
}
