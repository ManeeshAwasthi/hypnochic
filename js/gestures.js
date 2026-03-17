/* ─── gestures.js ─── */
window.GestureDetector = (function () {
  var callback = null;
  var wristHistory = { left: [], right: [] };
  var pinchCooldown = { left: 0, right: 0 };

  var pinchThreshold = 0.05;
  var swipeVelocityThreshold = 0.05;
  var historyLength = 3;

  function init() {
    callback = null;
    wristHistory = { left: [], right: [] };
    pinchCooldown = { left: 0, right: 0 };
  }

  function dist3D(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    var dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function detectPinch(landmarks, handedness) {
    if (pinchCooldown[handedness] > 0) {
      pinchCooldown[handedness]--;
      return null;
    }
    var thumbTip = landmarks[4];
    var indexTip = landmarks[8];
    var d = dist3D(thumbTip, indexTip);
    if (d < pinchThreshold) {
      pinchCooldown[handedness] = 15; // ~0.5s cooldown at 30fps
      return {
        type: 'pinch',
        hand: handedness,
        position: {
          x: (thumbTip.x + indexTip.x) / 2,
          y: (thumbTip.y + indexTip.y) / 2,
          z: ((thumbTip.z || 0) + (indexTip.z || 0)) / 2
        }
      };
    }
    return null;
  }

  function detectGrab(landmarks, handedness) {
    // Fingertip indices: 8,12,16,20  Base knuckle indices: 5,9,13,17
    var tips   = [8, 12, 16, 20];
    var knucks = [5,  9, 13, 17];
    var curledCount = 0;
    for (var i = 0; i < tips.length; i++) {
      if (landmarks[tips[i]].y > landmarks[knucks[i]].y) {
        curledCount++;
      }
    }
    if (curledCount >= 4) {
      return {
        type: 'grab',
        hand: handedness,
        position: {
          x: landmarks[0].x,
          y: landmarks[0].y,
          z: landmarks[0].z || 0
        }
      };
    }
    return null;
  }

  function detectSwipe(landmarks, handedness) {
    var wrist = landmarks[0];
    var hist  = wristHistory[handedness];
    hist.push({ x: wrist.x, y: wrist.y, z: wrist.z || 0 });
    if (hist.length > historyLength) hist.shift();
    if (hist.length < historyLength) return null;

    var oldest = hist[0];
    var newest = hist[hist.length - 1];
    var vx = newest.x - oldest.x;
    var vy = newest.y - oldest.y;
    var speed = Math.sqrt(vx * vx + vy * vy);

    if (speed > swipeVelocityThreshold) {
      return {
        type: 'swipe',
        hand: handedness,
        position: {
          x: wrist.x,
          y: wrist.y,
          z: wrist.z || 0
        },
        velocity: { x: vx, y: vy }
      };
    }
    return null;
  }

  function convertLandmarks(rawLandmarks) {
    return rawLandmarks.map(function (lm) {
      return {
        x: (lm.x - 0.5) * 16,
        y: -(lm.y - 0.5) * 10,
        z: (lm.z || 0) * -5
      };
    });
  }

  function detect(handData) {
    var gestures = [];

    var sides = ['left', 'right'];
    for (var s = 0; s < sides.length; s++) {
      var side = sides[s];
      var hand = handData[side];
      if (!hand || !hand.isTracked || !hand.landmarks || hand.landmarks.length < 21) continue;

      // Use raw (0-1) landmarks for pinch/grab distance, converted for swipe
      var raw = hand.rawLandmarks || hand.landmarks;

      var pinch = detectPinch(raw, side);
      if (pinch) {
        // Convert position to Three.js coords
        pinch.position.x = (pinch.position.x - 0.5) * 16;
        pinch.position.y = -(pinch.position.y - 0.5) * 10;
        pinch.position.z = pinch.position.z * -5;
        gestures.push(pinch);
        if (callback) callback(pinch);
      }

      var grab = detectGrab(raw, side);
      if (grab) {
        grab.position.x = (grab.position.x - 0.5) * 16;
        grab.position.y = -(grab.position.y - 0.5) * 10;
        grab.position.z = grab.position.z * -5;
        gestures.push(grab);
        if (callback) callback(grab);
      }

      var swipe = detectSwipe(raw, side);
      if (swipe) {
        swipe.position.x = (swipe.position.x - 0.5) * 16;
        swipe.position.y = -(swipe.position.y - 0.5) * 10;
        swipe.position.z = swipe.position.z * -5;
        gestures.push(swipe);
        if (callback) callback(swipe);
      }
    }

    return gestures;
  }

  function onGesture(cb) {
    callback = cb;
  }

  return { init: init, detect: detect, onGesture: onGesture };
})();
