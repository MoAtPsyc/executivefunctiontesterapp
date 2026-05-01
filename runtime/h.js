// `h` — minimal stand-in for the original utility framework.
// Add helpers here as scenes start needing them.
window.h = {
  getGameWidth() {
    return getGameSize().width;
  },
  getGameHeight() {
    return getGameSize().height;
  },

  addSprite(scene, key, x, y) {
    return scene.add.sprite(x, y, key);
  },

  // Original game loaded JSON packs from a CDN. Locally, return whatever
  // the LoadingScene cached, or an empty object as a safe default.
  getDataJson(scene, key) {
    if (scene && scene.cache && scene.cache.json.exists(key)) {
      return scene.cache.json.get(key);
    }
    console.warn("[h.getDataJson] missing key:", key);
    return {};
  },

  // Stub for the multi-atlas loader the original uses. We just no-op;
  // LoadingScene loads simple images instead.
  loadMultiAtlas(/* scene, key, prefix, count, jsonName */) {
    // intentional no-op in local clone
  },

  // Pick helper used a lot in the original; thin wrapper for clarity.
  pick(arr) {
    return Phaser.Utils.Array.GetRandom(arr);
  },
};
