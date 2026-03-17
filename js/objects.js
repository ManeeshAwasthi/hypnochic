/* ─── objects.js ─── */
window.ObjectManager = (function () {
  var objects = [];

  var COLORS = { primary: 0x7c3aed, secondary: 0xa78bfa, accent: 0xec4899 };
  var COLOR_LIST = [COLORS.primary, COLORS.secondary, COLORS.accent];
  var TRAIL_LEN = 12;

  function rand(a, b) { return a + Math.random() * (b - a); }

  function createGeometry(i) {
    switch (i % 4) {
      case 0: return new THREE.SphereGeometry(0.28 + Math.random()*0.25, 16, 16);
      case 1: return new THREE.BoxGeometry(0.38+Math.random()*0.28, 0.38+Math.random()*0.28, 0.38+Math.random()*0.28);
      case 2: return new THREE.OctahedronGeometry(0.3+Math.random()*0.25);
      case 3: return new THREE.TorusGeometry(0.28+Math.random()*0.18, 0.09, 12, 24);
      default: return new THREE.SphereGeometry(0.3, 16, 16);
    }
  }

  function init(scene) {
    objects = [];

    for (var i = 0; i < 20; i++) {
      var color = COLOR_LIST[i % COLOR_LIST.length];
      var mat   = new THREE.MeshPhongMaterial({
        color: color, emissive: color, emissiveIntensity: 0.15,
        shininess: 90, transparent: true, opacity: 0.92
      });
      var mesh = new THREE.Mesh(createGeometry(i), mat);
      var bx = rand(-7, 7), by = rand(-4, 4), bz = rand(-2, 2);
      mesh.position.set(bx, by, bz);

      // Trail line
      var trailPos  = new Float32Array(TRAIL_LEN * 3);
      for (var t = 0; t < TRAIL_LEN; t++) {
        trailPos[t*3] = bx; trailPos[t*3+1] = by; trailPos[t*3+2] = bz;
      }
      var trailGeo  = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
      var trailMat  = new THREE.LineBasicMaterial({
        color: color, transparent: true, opacity: 0.28, depthWrite: false
      });
      var trailLine = new THREE.Line(trailGeo, trailMat);
      scene.add(trailLine);

      var obj = {
        mesh: mesh,
        velocity: { x: rand(-0.015, 0.015), y: rand(-0.015, 0.015), z: 0 },
        rotationSpeed: { x: rand(-0.008,0.008), y: rand(-0.015,0.015), z: rand(-0.005,0.005) },
        basePosition: { x: bx, y: by, z: bz },
        mass:   rand(0.6, 1.8),
        locked: false,
        trailPos:  trailPos,
        trailGeo:  trailGeo,
        trailMat:  trailMat,
        trailLine: trailLine
      };

      scene.add(mesh);
      objects.push(obj);
    }
  }

  function update() {
    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];

      if (!o.locked) {
        o.mesh.position.x += o.velocity.x;
        o.mesh.position.y += o.velocity.y;
        o.mesh.position.z += o.velocity.z;
      }
      o.mesh.rotation.x += o.rotationSpeed.x;
      o.mesh.rotation.y += o.rotationSpeed.y;
      o.mesh.rotation.z += o.rotationSpeed.z;

      // Emissive intensity pulses with speed
      var spd = Math.sqrt(o.velocity.x*o.velocity.x + o.velocity.y*o.velocity.y);
      o.mesh.material.emissiveIntensity = 0.15 + Math.min(spd * 3, 0.65);

      // Shift trail backward and insert current position at front
      var tp = o.trailPos;
      for (var t = TRAIL_LEN - 1; t > 0; t--) {
        tp[t*3]   = tp[(t-1)*3];
        tp[t*3+1] = tp[(t-1)*3+1];
        tp[t*3+2] = tp[(t-1)*3+2];
      }
      tp[0] = o.mesh.position.x;
      tp[1] = o.mesh.position.y;
      tp[2] = o.mesh.position.z;
      o.trailGeo.attributes.position.needsUpdate = true;

      // Trail opacity scales with speed
      o.trailMat.opacity = Math.min(0.05 + spd * 1.2, 0.5);
    }
  }

  function getObjects() { return objects; }

  return { init: init, getObjects: getObjects, update: update };
})();
