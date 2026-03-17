/* ─── physics.js ─── */
window.PhysicsEngine = (function () {
  var repulsionRadius = 1.8;
  var repulsionForce  = 0.1;
  var attractRadius   = 6.0;
  var attractForce    = 0.06;
  var damping         = 0.94;
  var returnForce     = 0.002;

  function applyRepulsion(objects, positions) {
    for (var f = 0; f < positions.length; f++) {
      var fp = positions[f];
      for (var i = 0; i < objects.length; i++) {
        var o = objects[i];
        if (o.locked) continue;
        var dx = o.mesh.position.x - fp.x;
        var dy = o.mesh.position.y - fp.y;
        var dz = o.mesh.position.z - fp.z;
        var dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < repulsionRadius && dist > 0.001) {
          var force = repulsionForce / (dist * o.mass);
          o.velocity.x += (dx/dist) * force;
          o.velocity.y += (dy/dist) * force;
        }
      }
    }
  }

  function applyAttraction(objects, pos) {
    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];
      if (o.locked) continue;
      var dx = pos.x - o.mesh.position.x;
      var dy = pos.y - o.mesh.position.y;
      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < attractRadius && dist > 0.3) {
        var force = attractForce / o.mass;
        o.velocity.x += (dx/dist) * force;
        o.velocity.y += (dy/dist) * force;
      }
    }
  }

  function applyShockwave(objects, pos) {
    var shockRadius = 7.0;
    var shockForce  = 0.6;
    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];
      if (o.locked) continue;
      var dx = o.mesh.position.x - pos.x;
      var dy = o.mesh.position.y - pos.y;
      var dist = Math.sqrt(dx*dx + dy*dy) || 0.01;
      if (dist < shockRadius) {
        var falloff = 1 - dist / shockRadius;
        var force = shockForce * falloff / o.mass;
        o.velocity.x += (dx/dist) * force;
        o.velocity.y += (dy/dist) * force;
        // Spin boost from shockwave
        o.rotationSpeed.x += (Math.random()-0.5) * 0.08;
        o.rotationSpeed.y += (Math.random()-0.5) * 0.08;
      }
    }
  }

  function applyDamping(objects) {
    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];
      // Clamp max velocity
      var spd = Math.sqrt(o.velocity.x*o.velocity.x + o.velocity.y*o.velocity.y);
      if (spd > 0.5) {
        o.velocity.x = (o.velocity.x/spd)*0.5;
        o.velocity.y = (o.velocity.y/spd)*0.5;
      }
      o.velocity.x *= damping;
      o.velocity.y *= damping;
      o.velocity.z *= damping;
      // Damp rotation back toward base speed
      o.rotationSpeed.x *= 0.98;
      o.rotationSpeed.y *= 0.98;
    }
  }

  function applyBoundaries(objects) {
    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];
      if (o.locked) continue;
      if (o.mesh.position.x >  8) { o.mesh.position.x =  8; o.velocity.x *= -0.6; }
      if (o.mesh.position.x < -8) { o.mesh.position.x = -8; o.velocity.x *= -0.6; }
      if (o.mesh.position.y >  5) { o.mesh.position.y =  5; o.velocity.y *= -0.6; }
      if (o.mesh.position.y < -5) { o.mesh.position.y = -5; o.velocity.y *= -0.6; }
    }
  }

  function applyReturnForce(objects) {
    for (var i = 0; i < objects.length; i++) {
      var o = objects[i];
      if (o.locked) continue;
      o.velocity.x += (o.basePosition.x - o.mesh.position.x) * returnForce;
      o.velocity.y += (o.basePosition.y - o.mesh.position.y) * returnForce;
      o.velocity.z += (o.basePosition.z - o.mesh.position.z) * returnForce;
    }
  }

  return {
    applyRepulsion:   applyRepulsion,
    applyAttraction:  applyAttraction,
    applyShockwave:   applyShockwave,
    applyDamping:     applyDamping,
    applyBoundaries:  applyBoundaries,
    applyReturnForce: applyReturnForce
  };
})();
