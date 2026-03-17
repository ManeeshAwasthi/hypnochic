/* ─── objects.js ─── */
window.ObjectManager = (function () {
  var objects = [];

  var COLORS = {
    primary:   0x7c3aed,
    secondary: 0xa78bfa,
    accent:    0xec4899
  };

  var objectCount = 20;
  var colorList = [COLORS.primary, COLORS.secondary, COLORS.accent];

  function randomBetween(a, b) {
    return a + Math.random() * (b - a);
  }

  function createGeometry(index) {
    var type = index % 4;
    switch (type) {
      case 0: return new THREE.SphereGeometry(0.3 + Math.random() * 0.3, 16, 16);
      case 1: return new THREE.BoxGeometry(
        0.4 + Math.random() * 0.3,
        0.4 + Math.random() * 0.3,
        0.4 + Math.random() * 0.3
      );
      case 2: return new THREE.OctahedronGeometry(0.35 + Math.random() * 0.25);
      case 3: return new THREE.TorusGeometry(0.3 + Math.random() * 0.2, 0.1, 12, 24);
      default: return new THREE.SphereGeometry(0.3, 16, 16);
    }
  }

  function init(scene) {
    objects = [];
    for (var i = 0; i < objectCount; i++) {
      var geo = createGeometry(i);
      var color = colorList[i % colorList.length];
      var mat = new THREE.MeshPhongMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.2,
        shininess: 80,
        transparent: true,
        opacity: 0.9
      });
      var mesh = new THREE.Mesh(geo, mat);

      var bx = randomBetween(-7, 7);
      var by = randomBetween(-4, 4);
      var bz = randomBetween(-2, 2);

      mesh.position.set(bx, by, bz);

      var obj = {
        mesh: mesh,
        velocity: {
          x: randomBetween(-0.02, 0.02),
          y: randomBetween(-0.02, 0.02),
          z: 0
        },
        rotationSpeed: {
          x: randomBetween(-0.01, 0.01),
          y: randomBetween(-0.02, 0.02),
          z: randomBetween(-0.005, 0.005)
        },
        basePosition: { x: bx, y: by, z: bz },
        mass: randomBetween(0.5, 2.0),
        grabbedBy: null
      };

      scene.add(mesh);
      objects.push(obj);
    }
  }

  function getObjects() {
    return objects;
  }

  function update() {
    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];
      if (!o.grabbedBy) {
        o.mesh.position.x += o.velocity.x;
        o.mesh.position.y += o.velocity.y;
        o.mesh.position.z += o.velocity.z;
      }
      o.mesh.rotation.x += o.rotationSpeed.x;
      o.mesh.rotation.y += o.rotationSpeed.y;
      o.mesh.rotation.z += o.rotationSpeed.z;
    }
  }

  return { init: init, getObjects: getObjects, update: update };
})();
