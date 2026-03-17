/* ─── physics.js ─── */
window.PhysicsEngine = (function () {
  var repulsionRadius = 1.5;
  var repulsionForce  = 0.08;
  var damping         = 0.95;
  var returnForce     = 0.002;

  function applyRepulsion(objects, fingerPositions) {
    for (var f = 0; f < fingerPositions.length; f++) {
      var fp = fingerPositions[f];
      for (var i = 0; i < objects.length; i++) {
        var o = objects[i];
        if (o.grabbedBy) continue;
        var dx = o.mesh.position.x - fp.x;
        var dy = o.mesh.position.y - fp.y;
        var dz = o.mesh.position.z - fp.z;
        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < repulsionRadius && dist > 0.001) {
          var force = repulsionForce / (dist * o.mass);
          o.velocity.x += (dx / dist) * force;
          o.velocity.y += (dy / dist) * force;
          o.velocity.z += (dz / dist) * force * 0.3;
        }
      }
    }
  }

  function applyDamping(objects) {
    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];
      o.velocity.x *= damping;
      o.velocity.y *= damping;
      o.velocity.z *= damping;
    }
  }

  function applyBoundaries(objects) {
    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];
      if (o.grabbedBy) continue;
      if (o.mesh.position.x > 8)  { o.mesh.position.x = 8;  o.velocity.x *= -0.6; }
      if (o.mesh.position.x < -8) { o.mesh.position.x = -8; o.velocity.x *= -0.6; }
      if (o.mesh.position.y > 5)  { o.mesh.position.y = 5;  o.velocity.y *= -0.6; }
      if (o.mesh.position.y < -5) { o.mesh.position.y = -5; o.velocity.y *= -0.6; }
    }
  }

  function applyReturnForce(objects) {
    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];
      if (o.grabbedBy) continue;
      o.velocity.x += (o.basePosition.x - o.mesh.position.x) * returnForce;
      o.velocity.y += (o.basePosition.y - o.mesh.position.y) * returnForce;
      o.velocity.z += (o.basePosition.z - o.mesh.position.z) * returnForce;
    }
  }

  return {
    applyRepulsion:  applyRepulsion,
    applyDamping:    applyDamping,
    applyBoundaries: applyBoundaries,
    applyReturnForce: applyReturnForce
  };
})();
