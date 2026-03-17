/* ─── main.js ─── */
(function () {
  var lastTime = 0;
  var animating = false;

  // Grab state: track which object is grabbed per hand
  var grabbed = { left: null, right: null };

  document.addEventListener('DOMContentLoaded', function () {
    // Show permission screen on load (it's visible by default in HTML)
    document.getElementById('allow-btn').addEventListener('click', function () {
      CameraManager.requestPermission();
      startExperience();
    });
  });

  function startExperience() {
    // Small delay to let camera init before scene
    setTimeout(function () {
      SceneManager.init();
      ObjectManager.init(SceneManager.getScene());
      ParticleSystem.init(SceneManager.getScene());
      GestureDetector.init();

      if (!animating) {
        animating = true;
        requestAnimationFrame(loop);
      }
    }, 100);
  }

  function loop(timestamp) {
    requestAnimationFrame(loop);

    var deltaTime = (timestamp - lastTime) / 1000;
    if (deltaTime > 0.1) deltaTime = 0.1; // clamp
    lastTime = timestamp;

    var handData = HandTracker.getHandData();

    // Collect all fingertip positions
    var allFingertips = [];
    var sides = ['left', 'right'];
    for (var s = 0; s < sides.length; s++) {
      var side = sides[s];
      var hand = handData[side];
      if (hand && hand.isTracked) {
        for (var f = 0; f < hand.fingertips.length; f++) {
          allFingertips.push(hand.fingertips[f]);
        }
      }
    }

    var objects = ObjectManager.getObjects();

    // Physics
    PhysicsEngine.applyRepulsion(objects, allFingertips);
    PhysicsEngine.applyDamping(objects);
    PhysicsEngine.applyBoundaries(objects);
    PhysicsEngine.applyReturnForce(objects);

    // Release grabs for hands no longer tracked
    for (var s2 = 0; s2 < sides.length; s2++) {
      var side2 = sides[s2];
      if (!handData[side2].isTracked && grabbed[side2]) {
        grabbed[side2].grabbedBy = null;
        grabbed[side2] = null;
      }
    }

    // Gesture detection
    var gestures = GestureDetector.detect(handData);

    for (var g = 0; g < gestures.length; g++) {
      var gesture = gestures[g];

      if (gesture.type === 'pinch') {
        ParticleSystem.triggerExplosion(gesture.position.x, gesture.position.y, gesture.position.z);
      }

      if (gesture.type === 'grab') {
        var handSide = gesture.hand;
        if (!grabbed[handSide]) {
          // Find nearest object
          var nearest = null;
          var nearestDist = Infinity;
          for (var i = 0; i < objects.length; i++) {
            if (objects[i].grabbedBy) continue;
            var dx = objects[i].mesh.position.x - gesture.position.x;
            var dy = objects[i].mesh.position.y - gesture.position.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist && dist < 3) {
              nearestDist = dist;
              nearest = objects[i];
            }
          }
          if (nearest) {
            nearest.grabbedBy = handSide;
            grabbed[handSide] = nearest;
          }
        }
        // Move grabbed object to hand position
        if (grabbed[handSide]) {
          grabbed[handSide].mesh.position.x = gesture.position.x;
          grabbed[handSide].mesh.position.y = gesture.position.y;
          grabbed[handSide].mesh.position.z = gesture.position.z;
          grabbed[handSide].velocity.x = 0;
          grabbed[handSide].velocity.y = 0;
          grabbed[handSide].velocity.z = 0;
        }
      } else {
        // Release grab if not currently a grab gesture for this hand
        var gh = gesture.hand;
        if (grabbed[gh] && gesture.type !== 'grab') {
          grabbed[gh].grabbedBy = null;
          grabbed[gh] = null;
        }
      }

      if (gesture.type === 'swipe') {
        var swipeForce = 0.3;
        var gx = gesture.position.x;
        var gy = gesture.position.y;
        for (var j = 0; j < objects.length; j++) {
          var o = objects[j];
          if (o.grabbedBy) continue;
          var ddx = o.mesh.position.x - gx;
          var ddy = o.mesh.position.y - gy;
          var ddist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (ddist < 4) {
            var vx = gesture.velocity ? gesture.velocity.x : 0;
            var vy = gesture.velocity ? gesture.velocity.y : 0;
            var speed = Math.sqrt(vx * vx + vy * vy) || 1;
            o.velocity.x += (vx / speed) * swipeForce;
            o.velocity.y += (vy / speed) * swipeForce;
          }
        }
      }
    }

    // Update & render
    ObjectManager.update();
    ParticleSystem.update(deltaTime);
    SceneManager.render();
  }
})();
