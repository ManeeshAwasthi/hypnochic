/**
 * scene.js – Hypnochic scene manager
 * Handles canvas setup, resize, and render loop.
 */

(function () {
  'use strict';

  const canvas = document.getElementById('hypno-canvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resize);
  resize();

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Scene draw calls go here
    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
