/* ─── main.js ─── */
(function () {
  var lastTime  = 0;
  var animating = false;
  var modeEl;

  var MODES = {
    point:     { label: '⊳  REPEL',     color: '#a78bfa' },
    palm:      { label: '✦  ATTRACT',   color: '#ec4899' },
    fist:      { label: '◉  SHOCKWAVE', color: '#ff6400' },
    'fist-hold':{ label: '◉  SHOCKWAVE', color: '#ff6400' },
    pinch:     { label: '✺  EXPLODE',   color: '#ffffff' },
    none:      { label: '',             color: '#555'    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    modeEl = document.getElementById('gesture-mode');

    document.getElementById('allow-btn').addEventListener('click', function () {
      CameraManager.requestPermission();
    });

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

  function setModeUI(type) {
    if (!modeEl) return;
    var m = MODES[type] || MODES.none;
    modeEl.textContent  = m.label;
    modeEl.style.color  = m.color;
    modeEl.style.textShadow = '0 0 12px ' + m.color;
    modeEl.style.opacity = m.label ? '1' : '0';
  }

  function loop(timestamp) {
    requestAnimationFrame(loop);

    var deltaTime = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    var handData = HandTracker.getHandData();
    var objects  = ObjectManager.getObjects();

    // Detect gesture for this frame
    var gesture = GestureDetector.detect(handData);
    setModeUI(gesture.type);

    // Draw skeleton + cursor on 2D canvas overlay
    HandTracker.draw(gesture.type);

    // Physics based on gesture
    if (gesture.position) {
      if (gesture.type === 'point') {
        PhysicsEngine.applyRepulsion(objects, [gesture.position]);
      }

      if (gesture.type === 'palm') {
        PhysicsEngine.applyAttraction(objects, gesture.position);
      }

      if (gesture.type === 'fist') {
        PhysicsEngine.applyShockwave(objects, gesture.position);
        // Visual ring on the canvas
        if (gesture.raw) HandTracker.addRing(gesture.raw, '#ff6400');
      }

      if (gesture.type === 'pinch') {
        ParticleSystem.triggerExplosion(gesture.position.x, gesture.position.y, gesture.position.z);
        if (gesture.raw) HandTracker.addRing(gesture.raw, '#ffffff');
      }
    }

    // Standard physics pass every frame
    PhysicsEngine.applyDamping(objects);
    PhysicsEngine.applyBoundaries(objects);
    PhysicsEngine.applyReturnForce(objects);

    ObjectManager.update();
    ParticleSystem.update(deltaTime);
    SceneManager.render();
  }
})();
