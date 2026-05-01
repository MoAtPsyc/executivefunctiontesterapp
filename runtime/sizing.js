// Use the actual viewport so the canvas fills the device on phones/tablets
// (no fixed-aspect letterboxing). Phaser's Scale.FIT then keeps things
// proportional inside this size.
function getGameSize() {
  const w = window.innerWidth  || document.documentElement.clientWidth  || 800;
  const h = window.innerHeight || document.documentElement.clientHeight || 600;
  return { width: w, height: h };
}

function resize(width, height) {
  return { width, height };
}
