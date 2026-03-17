/* ─── main.js ─── */
(function () {
  var lastTime  = 0;
  var animating = false;
  var grabbed   = { left: null, right: null };

  document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('allow-btn').addEventListener('click', function () {
      CameraManager.requestPermission();
    });

    // Start 3D scene only AFTER camera + MediaPipe are confirmed ready
    window.addEventListener('hypnochic-ready', function () {
      SceneManager.init();
      ObjectManager.init(SceneManager.getScene());
      ParticleSystem.init(SceneManager.getScene());
      GestureDetector.init();

      if (!animating) {
        animating = true;
        lastTime  = performance.now();
        requestAnimationFrame(loop);
      }
    });
  });

  function loop(timestamp) {
    requestAnimationFrame(loop);

    var deltaTime = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
    lastTime = timestamp;

    var handData = HandTracker.getHandData();
    var objects  = ObjectManager.getObjects();

    // Collect all fingertip positions from both hands
    var allFingertips = [];
    var sides = ['left', 'right'];
    for (var s = 0; s < sides.length; s++) {
      var hand = handData[sides[s]];
      if (hand && hand.isTracked) {
        for (var f = 0; f < hand.fingertips.length; f++) {
          allFingertips.push(hand.fingertips[f]);
        }
      }
    }

    // Physics pass
    PhysicsEngine.applyRepulsion(objects, allFingertips);
    PhysicsEngine.applyDamping(objects);
    PhysicsEngine.applyBoundaries(objects);
    PhysicsEngine.applyReturnForce(objects);

    // Release grabs for hands that disappeared
    for (var s2 = 0; s2 < sides.length; s2++) {
      var side2 = sides[s2];
      if (!handData[side2].isTracked && grabbed[side2]) {
        grabbed[side2].grabbedBy = null;
        grabbed[side2] = null;
      }
    }

    // Gesture handling
    var gestures = GestureDetector.detect(handData);
    var activeGrabHands = {};

    for (var g = 0; g < gestures.length; g++) {
      var gesture = gestures[g];
      var gh = gesture.hand;

      if (gesture.type === 'pinch') {
        ParticleSystem.triggerExplosion(gesture.position.x, gesture.position.y, gesture.position.z);
      }

      if (gesture.type === 'grab') {
        activeGrabHands[gh] = true;
        if (!grabbed[gh]) {
          // Lock onto nearest ungrabbed object within range
          var nearest = null;
          var nearestDist = Infinity;
          for (var i = 0; i < objects.length; i++) {
            if (objects[i].grabbedBy) continue;
            var dx = objects[i].mesh.position.x - gesture.position.x;
            var dy = objects[i].mesh.position.y - gesture.position.y;
            var d  = Math.sqrt(dx * dx + dy * dy);
            if (d < nearestDist && d < 3) { nearestDist = d; nearest = objects[i]; }
          }
          if (nearest) { nearest.grabbedBy = gh; grabbed[gh] = nearest; }
        }
        // Smoothly move grabbed object to palm position
        if (grabbed[gh]) {
          var gobj = grabbed[gh];
          gobj.mesh.position.x += (gesture.position.x - gobj.mesh.position.x) * 0.3;
          gobj.mesh.position.y += (gesture.position.y - gobj.mesh.position.y) * 0.3;
          gobj.velocity.x = 0;
          gobj.velocity.y = 0;
        }
      }

      if (gesture.type === 'swipe') {
        var swipeForce = 0.25;
        var vx = gesture.velocity ? gesture.velocity.x : 0;
        var vy = gesture.velocity ? gesture.velocity.y : 0;
        var spd = Math.sqrt(vx * vx + vy * vy) || 1;
        for (var j = 0; j < objects.length; j++) {
          if (objects[j].grabbedBy) continue;
          var ddx = objects[j].mesh.position.x - gesture.position.x;
          var ddy = objects[j].mesh.position.y - gesture.position.y;
          if (Math.sqrt(ddx * ddx + ddy * ddy) < 4) {
            objects[j].velocity.x += (vx / spd) * swipeForce;
            objects[j].velocity.y += (vy / spd) * swipeForce;
          }
        }
      }
    }

    // Release grab for any hand that no longer has a grab gesture this frame
    for (var s3 = 0; s3 < sides.length; s3++) {
      var side3 = sides[s3];
      if (grabbed[side3] && !activeGrabHands[side3]) {
        grabbed[side3].grabbedBy = null;
        grabbed[side3] = null;
      }
    }

    ObjectManager.update();
    ParticleSystem.update(deltaTime);
    SceneManager.render();
  }
})();
