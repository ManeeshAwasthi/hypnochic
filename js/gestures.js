/* ─── gestures.js ─── */
window.GestureDetector = (function () {

  var pinchCooldown  = 0;
  var fistCooldown   = 0;
  var wristHistory   = [];
  var HIST_LEN       = 4;

  function init() {
    pinchCooldown = 0;
    fistCooldown  = 0;
    wristHistory  = [];
  }

  // Is a finger extended? tip.y noticeably above mcp.y (raw 0-1 coords, y increases downward)
  function isExtended(lms, tipIdx, mcpIdx) {
    return lms[tipIdx].y < lms[mcpIdx].y - 0.04;
  }

  function dist2D(a, b) {
    var dx = a.x - b.x, dy = a.y - b.y;
    return Math.sqrt(dx*dx + dy*dy);
  }

  function detect(handData) {
    if (!handData.isTracked || handData.rawLandmarks.length < 21) {
      return { type: 'none', position: null, raw: null };
    }

    var raw = handData.rawLandmarks; // smoothed 0-1 coords

    // ── Pinch: thumb tip (4) close to index tip (8) ──
    if (pinchCooldown > 0) {
      pinchCooldown--;
    } else {
      var pd = dist2D(raw[4], raw[8]);
      if (pd < 0.05) {
        pinchCooldown = 18;
        var px = (raw[4].x + raw[8].x) / 2;
        var py = (raw[4].y + raw[8].y) / 2;
        return {
          type: 'pinch',
          position: { x: (px-0.5)*16, y: -(py-0.5)*10, z: 0 },
          raw: { x: px, y: py }
        };
      }
    }

    // Count extended fingers (index, middle, ring, pinky)
    // tip/mcp pairs: 8/5, 12/9, 16/13, 20/17
    var extIndex  = isExtended(raw, 8,  5);
    var extMiddle = isExtended(raw, 12, 9);
    var extRing   = isExtended(raw, 16, 13);
    var extPinky  = isExtended(raw, 20, 17);
    var extCount  = (extIndex?1:0)+(extMiddle?1:0)+(extRing?1:0)+(extPinky?1:0);

    // ── Open palm: 3+ fingers extended → ATTRACT ──
    if (extCount >= 3) {
      var palmX = (raw[0].x + raw[9].x) / 2;
      var palmY = (raw[0].y + raw[9].y) / 2;
      return {
        type: 'palm',
        position: { x: (palmX-0.5)*16, y: -(palmY-0.5)*10, z: 0 },
        raw: raw[9]
      };
    }

    // ── Point: only index extended → REPEL RAY ──
    if (extIndex && !extMiddle && !extRing && !extPinky) {
      return {
        type: 'point',
        position: { x: (raw[8].x-0.5)*16, y: -(raw[8].y-0.5)*10, z: 0 },
        raw: raw[8]
      };
    }

    // ── Fist: 0-1 fingers extended → SHOCKWAVE (cooldown-gated) ──
    if (extCount <= 1) {
      if (fistCooldown > 0) {
        fistCooldown--;
        return { type: 'fist-hold', position: { x: (raw[0].x-0.5)*16, y: -(raw[0].y-0.5)*10, z: 0 }, raw: raw[0] };
      } else {
        fistCooldown = 45; // ~1.5s at 30fps
        return {
          type: 'fist',
          position: { x: (raw[0].x-0.5)*16, y: -(raw[0].y-0.5)*10, z: 0 },
          raw: raw[0]
        };
      }
    }

    return { type: 'none', position: null, raw: null };
  }

  return { init: init, detect: detect };
})();
