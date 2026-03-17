/* ─── handTracker.js ─── */
window.HandTracker = (function () {

  // Smoothed hand data (Three.js coords) exposed to the rest of the app
  var handData = {
    left:  { landmarks: [], rawLandmarks: [], fingertips: [], isTracked: false },
    right: { landmarks: [], rawLandmarks: [], fingertips: [], isTracked: false }
  };

  // Internal smoothed raw (0-1) landmarks for drawing
  var smoothed = {
    left:  null,
    right: null
  };

  var SMOOTH = 0.35; // lerp factor — lower = smoother but more lag

  // Fingertip indices
  var FINGERTIP_INDICES = [4, 8, 12, 16, 20];

  // Hand skeleton connections (MediaPipe standard)
  var CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],         // thumb
    [0,5],[5,6],[6,7],[7,8],         // index
    [0,9],[9,10],[10,11],[11,12],    // middle
    [0,13],[13,14],[14,15],[15,16],  // ring
    [0,17],[17,18],[18,19],[19,20],  // pinky
    [5,9],[9,13],[13,17]             // palm cross
  ];

  // Canvas for skeleton overlay
  var handCanvas, ctx;

  function initCanvas() {
    handCanvas = document.getElementById('hand-canvas');
    ctx = handCanvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    handCanvas.width  = window.innerWidth;
    handCanvas.height = window.innerHeight;
  }

  function lerpLandmarks(prev, next) {
    if (!prev) return next.map(function (lm) {
      return { x: lm.x, y: lm.y, z: lm.z || 0 };
    });
    return next.map(function (lm, i) {
      return {
        x: prev[i].x + (lm.x - prev[i].x) * SMOOTH,
        y: prev[i].y + (lm.y - prev[i].y) * SMOOTH,
        z: (prev[i].z || 0) + ((lm.z || 0) - (prev[i].z || 0)) * SMOOTH
      };
    });
  }

  function convertToThreeJS(landmark) {
    return {
      x: (landmark.x - 0.5) * 16,
      y: -(landmark.y - 0.5) * 10,
      z: (landmark.z || 0) * -5
    };
  }

  function drawSkeleton(rawLms, color) {
    var w = handCanvas.width;
    var h = handCanvas.height;

    // Helper: convert 0-1 landmark to mirrored canvas px
    function px(lm) {
      return {
        x: (1 - lm.x) * w,   // mirror X so it feels natural
        y: lm.y * h
      };
    }

    // Draw connections
    ctx.lineWidth = 2;
    for (var c = 0; c < CONNECTIONS.length; c++) {
      var a = px(rawLms[CONNECTIONS[c][0]]);
      var b = px(rawLms[CONNECTIONS[c][1]]);

      var grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, color.line0);
      grad.addColorStop(1, color.line1);
      ctx.strokeStyle = grad;
      ctx.shadowColor  = color.glow;
      ctx.shadowBlur   = 8;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Draw joints
    for (var i = 0; i < rawLms.length; i++) {
      var p = px(rawLms[i]);
      var isFingertip = FINGERTIP_INDICES.indexOf(i) !== -1;
      var radius = isFingertip ? 5 : 3;

      ctx.shadowBlur  = 14;
      ctx.shadowColor = color.glow;
      ctx.fillStyle   = isFingertip ? color.tip : color.joint;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  var LEFT_COLORS = {
    line0: 'rgba(167,139,250,0.9)',
    line1: 'rgba(124,58,237,0.9)',
    glow:  '#7c3aed',
    joint: 'rgba(167,139,250,1)',
    tip:   '#ffffff'
  };

  var RIGHT_COLORS = {
    line0: 'rgba(236,72,153,0.9)',
    line1: 'rgba(167,139,250,0.9)',
    glow:  '#ec4899',
    joint: 'rgba(236,72,153,1)',
    tip:   '#ffffff'
  };

  function onResults(results) {
    // Clear skeleton canvas
    ctx.clearRect(0, 0, handCanvas.width, handCanvas.height);

    // Reset tracking
    handData.left.isTracked  = false;
    handData.right.isTracked = false;
    handData.left.landmarks  = [];
    handData.left.rawLandmarks = [];
    handData.right.landmarks = [];
    handData.right.rawLandmarks = [];
    handData.left.fingertips  = [];
    handData.right.fingertips = [];

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      smoothed.left  = null;
      smoothed.right = null;
      return;
    }

    var tracked = { left: false, right: false };

    for (var h = 0; h < results.multiHandLandmarks.length; h++) {
      var rawLandmarks = results.multiHandLandmarks[h];
      var handedness   = results.multiHandedness[h];
      var side = (handedness.label === 'Left') ? 'right' : 'left';

      tracked[side] = true;

      // Smooth raw landmarks
      smoothed[side] = lerpLandmarks(smoothed[side], rawLandmarks);

      // Draw skeleton using smoothed positions
      drawSkeleton(smoothed[side], side === 'left' ? LEFT_COLORS : RIGHT_COLORS);

      // Convert smoothed to Three.js coords
      var converted = smoothed[side].map(function (lm) {
        return convertToThreeJS(lm);
      });

      var fingertips = FINGERTIP_INDICES.map(function (idx) {
        return converted[idx];
      });

      handData[side].landmarks     = converted;
      handData[side].rawLandmarks  = smoothed[side];
      handData[side].fingertips    = fingertips;
      handData[side].isTracked     = true;
    }

    // Clear smoothed state for hands that disappeared
    if (!tracked.left)  smoothed.left  = null;
    if (!tracked.right) smoothed.right = null;
  }

  function init(videoElement) {
    initCanvas();

    var hands = new Hands({
      locateFile: function (file) {
        return 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/' + file;
      }
    });

    hands.setOptions({
      maxNumHands:            2,
      modelComplexity:        1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence:  0.5
    });

    hands.onResults(onResults);

    var cam = new Camera(videoElement, {
      onFrame: function () {
        return hands.send({ image: videoElement });
      },
      width: 640,
      height: 480
    });

    cam.start();
  }

  function getHandData() {
    return handData;
  }

  return { init: init, getHandData: getHandData, convertToThreeJS: convertToThreeJS };
})();
