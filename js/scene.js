/* ─── scene.js ─── */
window.SceneManager = (function () {
  var renderer, scene, camera;

  function init() {
    var canvas = document.getElementById('hypnochic-canvas');

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 1);

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 12);

    // Ambient light
    var ambient = new THREE.AmbientLight(0x7c3aed, 0.3);
    scene.add(ambient);

    // Point light
    var point = new THREE.PointLight(0xa78bfa, 1.0);
    point.position.set(5, 5, 5);
    scene.add(point);

    // Second fill light
    var fill = new THREE.PointLight(0xec4899, 0.5);
    fill.position.set(-5, -3, 3);
    scene.add(fill);

    // Resize handler
    window.addEventListener('resize', function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  function getScene()    { return scene;    }
  function getCamera()   { return camera;   }
  function getRenderer() { return renderer; }

  function render() {
    renderer.render(scene, camera);
  }

  return { init: init, getScene: getScene, getCamera: getCamera, getRenderer: getRenderer, render: render };
// L1-A: missing closing })(); — SyntaxError, IIFE never closed
