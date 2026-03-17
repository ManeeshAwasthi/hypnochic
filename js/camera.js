/* ─── camera.js ─── */
window.CameraManager = (function () {

  function init() {
    var permScreen = document.getElementById('permission-screen');
    var video      = document.getElementById('webcam');

    permScreen.style.display = 'none';

    return navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false })
      .then(function (stream) {
        video.srcObject = stream;
        return new Promise(function (resolve) {
          video.onloadedmetadata = function () {
            video.play().then(resolve).catch(resolve);
          };
        });
      })
      .then(function () {
        HandTracker.init(video);
        // Signal that camera + MediaPipe are wired up — scene can now start
        window.dispatchEvent(new Event('hypnochic-ready'));
      });
  }

  function requestPermission() {
    init().catch(function (err) {
      console.error('Camera error:', err);
      var box = document.getElementById('permission-box');
      // Avoid duplicate error messages
      if (!document.getElementById('cam-error')) {
        var msg = document.createElement('p');
        msg.id = 'cam-error';
        msg.style.color = '#ec4899';
        msg.style.marginTop = '1rem';
        msg.textContent = 'Camera access denied. Please allow camera and refresh.';
        box.appendChild(msg);
      }
      document.getElementById('permission-screen').style.display = 'flex';
    });
  }

  return { init: init, requestPermission: requestPermission };
})();
