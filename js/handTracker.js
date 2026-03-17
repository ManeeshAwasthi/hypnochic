/* ─── handTracker.js ─── */
window.HandTracker = (function () {

  // Single hand — flat structure
  var handData = {
    landmarks:    [],   // Three.js coords (smoothed)
    rawLandmarks: [],   // raw 0-1 coords  (smoothed)
    fingertips:   [],   // Three.js coords of fingertips
    isTracked:    false
  };

  var smoothedRaw = null;
  var SMOOTH = 0.4; // lerp factor

  var FINGERTIP_IDX = [4, 8, 12, 16, 20];

  // Canvas overlay
  var handCanvas, ctx;

  // Ring effects (shockwave pulses)
  var rings = [];

  // Hand connections
  var CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17]
  ];

  function initCanvas() {
    handCanvas = document.getElementById('hand-canvas');
    ctx = handCanvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    handCanvas.width  = window.innerWidth;
    handCanvas.height = window.innerHeight;
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function lerpLandmarks(prev, next) {
    if (!prev) return next.map(function (l) {
      return { x: l.x, y: l.y, z: l.z || 0 };
    });
    return next.map(function (l, i) {
      return {
        x: lerp(prev[i].x, l.x, SMOOTH),
        y: lerp(prev[i].y, l.y, SMOOTH),
        z: lerp(prev[i].z || 0, l.z || 0, SMOOTH)
      };
    });
  }

  function toThree(lm) {
    return {
      x:  (lm.x - 0.5) * 16,
      y: -(lm.y - 0.5) * 10,
      z:  (lm.z || 0)  * -5
    };
  }

  // px: raw 0-1 landmark → canvas pixels (NO x-flip — webcam is already mirrored on Windows)
  function px(lm) {
    return { x: lm.x * handCanvas.width, y: lm.y * handCanvas.height };
  }

  function onResults(results) {
    handData.isTracked = false;
    handData.landmarks = [];
    handData.rawLandmarks = [];
    handData.fingertips = [];

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      smoothedRaw = null;
      return;
    }

    // Only first detected hand
    var raw = results.multiHandLandmarks[0];
    smoothedRaw = lerpLandmarks(smoothedRaw, raw);

    var converted = smoothedRaw.map(toThree);
    handData.landmarks    = converted;
    handData.rawLandmarks = smoothedRaw;
    handData.fingertips   = FINGERTIP_IDX.map(function (i) { return converted[i]; });
    handData.isTracked    = true;
  }

  // Called from rAF loop in main.js — draws skeleton + cursor for current gesture mode
  function draw(gestureMode) {
    if (!ctx) return;
    ctx.clearRect(0, 0, handCanvas.width, handCanvas.height);

    // Draw and update ring effects
    for (var r = rings.length - 1; r >= 0; r--) {
      var ring = rings[r];
      ring.radius += ring.speed;
      ring.alpha  -= 0.025;
      if (ring.alpha <= 0) { rings.splice(r, 1); continue; }
      ctx.save();
      ctx.strokeStyle = ring.color;
      ctx.globalAlpha = ring.alpha;
      ctx.lineWidth   = 2;
      ctx.shadowColor = ring.color;
      ctx.shadowBlur  = 12;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (!handData.isTracked || !smoothedRaw) return;

    var lms = smoothedRaw;

    // ── Skeleton bones ──
    ctx.save();
    ctx.lineWidth   = 2;
    ctx.shadowBlur  = 10;
    ctx.shadowColor = '#7c3aed';
    for (var c = 0; c < CONNECTIONS.length; c++) {
      var a = px(lms[CONNECTIONS[c][0]]);
      var b = px(lms[CONNECTIONS[c][1]]);
      var g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, 'rgba(167,139,250,0.85)');
      g.addColorStop(1, 'rgba(124,58,237,0.85)');
      ctx.strokeStyle = g;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.restore();

    // ── Joints ──
    ctx.save();
    for (var j = 0; j < lms.length; j++) {
      var p   = px(lms[j]);
      var tip = FINGERTIP_IDX.indexOf(j) !== -1;
      ctx.shadowBlur  = tip ? 18 : 8;
      ctx.shadowColor = tip ? '#ffffff' : '#a78bfa';
      ctx.fillStyle   = tip ? '#ffffff' : '#a78bfa';
      ctx.beginPath();
      ctx.arc(p.x, p.y, tip ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // ── Cursor / aura per gesture mode ──
    var indexTip = px(lms[8]);
    var wristPx  = px(lms[0]);

    if (gestureMode === 'point') {
      // Pulsing orb at index tip + ray outward
      var palmPx = px(lms[5]);
      var dx = indexTip.x - palmPx.x;
      var dy = indexTip.y - palmPx.y;
      var len = Math.sqrt(dx*dx+dy*dy) || 1;
      var endX = indexTip.x + (dx/len)*120;
      var endY = indexTip.y + (dy/len)*120;

      ctx.save();
      var ray = ctx.createLinearGradient(indexTip.x, indexTip.y, endX, endY);
      ray.addColorStop(0, 'rgba(167,139,250,0.9)');
      ray.addColorStop(1, 'rgba(124,58,237,0)');
      ctx.strokeStyle = ray;
      ctx.lineWidth   = 4;
      ctx.shadowColor = '#7c3aed';
      ctx.shadowBlur  = 20;
      ctx.beginPath(); ctx.moveTo(indexTip.x, indexTip.y); ctx.lineTo(endX, endY); ctx.stroke();
      // orb
      var orbGrad = ctx.createRadialGradient(indexTip.x, indexTip.y, 0, indexTip.x, indexTip.y, 18);
      orbGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
      orbGrad.addColorStop(0.4, 'rgba(167,139,250,0.7)');
      orbGrad.addColorStop(1, 'rgba(124,58,237,0)');
      ctx.fillStyle = orbGrad;
      ctx.beginPath(); ctx.arc(indexTip.x, indexTip.y, 18, 0, Math.PI*2); ctx.fill();
      ctx.restore();

    } else if (gestureMode === 'palm') {
      // Vortex glow at palm center (landmark 9)
      var palmC = px(lms[9]);
      ctx.save();
      var vGrad = ctx.createRadialGradient(palmC.x, palmC.y, 0, palmC.x, palmC.y, 55);
      vGrad.addColorStop(0, 'rgba(236,72,153,0.5)');
      vGrad.addColorStop(0.5,'rgba(167,139,250,0.2)');
      vGrad.addColorStop(1, 'rgba(236,72,153,0)');
      ctx.fillStyle = vGrad;
      ctx.shadowColor = '#ec4899';
      ctx.shadowBlur  = 30;
      ctx.beginPath(); ctx.arc(palmC.x, palmC.y, 55, 0, Math.PI*2); ctx.fill();
      ctx.restore();

    } else if (gestureMode === 'fist') {
      // Red-orange flare at fist/wrist
      ctx.save();
      var fGrad = ctx.createRadialGradient(wristPx.x, wristPx.y, 0, wristPx.x, wristPx.y, 45);
      fGrad.addColorStop(0, 'rgba(255,100,0,0.6)');
      fGrad.addColorStop(1, 'rgba(124,58,237,0)');
      ctx.fillStyle = fGrad;
      ctx.shadowColor = '#ff6400';
      ctx.shadowBlur  = 25;
      ctx.beginPath(); ctx.arc(wristPx.x, wristPx.y, 45, 0, Math.PI*2); ctx.fill();
      ctx.restore();

    } else if (gestureMode === 'pinch') {
      // White flash at pinch point
      var thumbPx = px(lms[4]);
      var cx2 = (indexTip.x + thumbPx.x) / 2;
      var cy2 = (indexTip.y + thumbPx.y) / 2;
      ctx.save();
      var pGrad = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, 30);
      pGrad.addColorStop(0, 'rgba(255,255,255,0.9)');
      pGrad.addColorStop(1, 'rgba(167,139,250,0)');
      ctx.fillStyle = pGrad;
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur  = 20;
      ctx.beginPath(); ctx.arc(cx2, cy2, 30, 0, Math.PI*2); ctx.fill();
      ctx.restore();

    } else {
      // Idle: soft dot at index tip
      ctx.save();
      ctx.fillStyle   = 'rgba(255,255,255,0.4)';
      ctx.shadowColor = '#a78bfa';
      ctx.shadowBlur  = 12;
      ctx.beginPath(); ctx.arc(indexTip.x, indexTip.y, 8, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  // Trigger a visible shockwave ring on the canvas
  function addRing(rawLm, color) {
    var p = px(rawLm);
    rings.push({ x: p.x, y: p.y, radius: 20, speed: 8, alpha: 0.9, color: color || '#7c3aed' });
  }

  function init(videoElement) {
    initCanvas();

    var hands = new Hands({
      locateFile: function (file) {
        return 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/' + file;
      }
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence:  0.5
    });

    hands.onResults(onResults);

    var cam = new Camera(videoElement, {
      onFrame: function () { return hands.send({ image: videoElement }); },
      width: 640,
      height: 480
    });
    cam.start();
  }

  return {
    init: init,
    getHandData: function () { return handData; },
    draw: draw,
    addRing: addRing,
    convertToThreeJS: toThree
  };
})();
