/* ─── particles.js ─── */
window.ParticleSystem = (function () {
  var poolSize = 500;
  var burstCount = 50;
  var particleLife = 0.8;

  var positions, colors, opacities;
  var particles = [];
  var points, geometry;
  var scene;

  var COLORS_HEX = [0x7c3aed, 0xa78bfa, 0xec4899];

  function init(sceneRef) {
    scene = sceneRef;
    positions = new Float32Array(poolSize * 3);
    colors    = new Float32Array(poolSize * 3);
    opacities = new Float32Array(poolSize);

    var colorObjs = COLORS_HEX.map(function (hex) { return new THREE.Color(hex); });

    for (var i = 0; i < poolSize; i++) {
      var c = colorObjs[i % colorObjs.length];
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
      opacities[i] = 0;
      particles.push({
        active: false,
        life: 0,
        maxLife: particleLife,
        velocity: { x: 0, y: 0, z: 0 }
      });
    }

    geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color',    new THREE.BufferAttribute(colors,    3));

    var material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    points = new THREE.Points(geometry, material);
    scene.add(points);
  }

  function triggerExplosion(x, y, z) {
    var activated = 0;
    for (var i = 0; i < poolSize && activated < burstCount; i++) {
      if (!particles[i].active) {
        particles[i].active = true;
        particles[i].life   = particleLife;
        particles[i].maxLife = particleLife;

        positions[i * 3]     = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        var speed = 0.05 + Math.random() * 0.1;
        var theta = Math.random() * Math.PI * 2;
        var phi   = Math.random() * Math.PI;
        particles[i].velocity.x = Math.sin(phi) * Math.cos(theta) * speed;
        particles[i].velocity.y = Math.sin(phi) * Math.sin(theta) * speed;
        particles[i].velocity.z = Math.cos(phi) * speed;

        opacities[i] = 1;
        activated++;
      }
    }
    geometry.attributes.position.needsUpdate = true;
  }

  function update(deltaTime) {
    var needsUpdate = false;
    for (var i = 0; i < poolSize; i++) {
      var p = particles[i];
      if (!p.active) continue;

      p.life -= deltaTime;
      if (p.life <= 0) {
        p.active = false;
        opacities[i] = 0;
        positions[i * 3]     = 9999;
        positions[i * 3 + 1] = 9999;
        positions[i * 3 + 2] = 9999;
      } else {
        positions[i * 3]     += p.velocity.x;
        positions[i * 3 + 1] += p.velocity.y;
        positions[i * 3 + 2] += p.velocity.z;
        opacities[i] = p.life / p.maxLife;

        colors[i * 3]     *= 0.99;
        colors[i * 3 + 1] *= 0.99;
        colors[i * 3 + 2] *= 0.99;
      }
      needsUpdate = true;
    }

    if (needsUpdate) {
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate    = true;
    }

    // Set overall opacity via material based on max active opacity
    if (points) {
      points.material.opacity = 1.0;
    }
  }

  return { init: init, triggerExplosion: triggerExplosion, update: update };
})();
