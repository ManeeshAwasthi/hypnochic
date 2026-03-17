/* ─── handTracker.js ─── */
window.HandTracker = (function () {
  var handData = {
    left:  { landmarks: [], rawLandmarks: [], fingertips: [], isTracked: false },
    right: { landmarks: [], rawLandmarks: [], fingertips: [], isTracked: false }
  };

  var hands;

  // Fingertip landmark indices
  var FINGERTIP_INDICES = [4, 8, 12, 16, 20];

  function convertToThreeJS(landmark) {
    return {
      x: (landmark.x - 0.5) * 16,
      y: -(landmark.y - 0.5) * 10,
      z: (landmark.z || 0) * -5
    };
  }

  function onResults(results) {
    // Reset
    handData.left.isTracked  = false;
    handData.right.isTracked = false;
    handData.left.landmarks  = [];
    handData.left.rawLandmarks = [];
    handData.right.landmarks = [];
    handData.right.rawLandmarks = [];
    handData.left.fingertips  = [];
    handData.right.fingertips = [];

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return;

    for (var h = 0; h < results.multiHandLandmarks.length; h++) {
      var rawLandmarks = results.multiHandLandmarks[h];
      var handedness   = results.multiHandedness[h];
      // MediaPipe returns "Left"/"Right" from camera perspective (mirrored)
      // We flip so it matches user's actual hand
      var side = (handedness.label === 'Left') ? 'right' : 'left';

      var converted = rawLandmarks.map(function (lm) {
        return convertToThreeJS(lm);
      });

      var fingertips = FINGERTIP_INDICES.map(function (idx) {
        return converted[idx];
      });

      handData[side].landmarks     = converted;
      handData[side].rawLandmarks  = rawLandmarks;
      handData[side].fingertips    = fingertips;
      handData[side].isTracked     = true;
    }
  }

  function init(videoElement) {
    hands = new Hands({
      locateFile: function (file) {
        return 'https://cdn.jsdelivr.net/npm/@mediapipe/hands/' + file;
      }
    });

    hands.setOptions({
      maxNumHands:            2,
      modelComplexity:        1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence:  0.7
    });

    hands.onResults(onResults);

    var camera = new Camera(videoElement, {
      onFrame: function () {
        return hands.send({ image: videoElement });
      },
      width: 640,
      height: 480
    });

    camera.start();
  }

  function getHandData() {
    return handData;
  }

  return { init: init, getHandData: getHandData, convertToThreeJS: convertToThreeJS };
})();
