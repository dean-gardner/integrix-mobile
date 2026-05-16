/** Inline canvas signature pad for WebView (no external CDN). */
export function buildSignaturePadHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; background: #f4f5f8; touch-action: none; }
  #wrap { width: 100%; height: 100%; padding: 8px; }
  canvas {
    width: 100%;
    height: 100%;
    display: block;
    background: #fff;
    border: 1px solid #d8dce6;
    border-radius: 8px;
    touch-action: none;
  }
</style>
</head>
<body>
<div id="wrap"><canvas id="sig"></canvas></div>
<script>
(function () {
  var canvas = document.getElementById('sig');
  var ctx = canvas.getContext('2d');
  var drawing = false;
  var hasInk = false;
  var dpr = window.devicePixelRatio || 1;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a1d26';
  }

  function post(type, extra) {
    var payload = { type: type };
    if (extra) {
      for (var k in extra) {
        if (Object.prototype.hasOwnProperty.call(extra, k)) payload[k] = extra[k];
      }
    }
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }

  function pointFromEvent(e) {
    var rect = canvas.getBoundingClientRect();
    var touch = e.touches && e.touches[0];
    var clientX = touch ? touch.clientX : e.clientX;
    var clientY = touch ? touch.clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function start(e) {
    e.preventDefault();
    drawing = true;
    var p = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    var p = pointFromEvent(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    hasInk = true;
  }

  function end(e) {
    if (!drawing) return;
    e.preventDefault();
    drawing = false;
    if (hasInk) {
      try {
        var dataUrl = canvas.toDataURL('image/png');
        post('change', { signature: dataUrl, empty: false });
      } catch (err) {
        post('error', { message: String(err) });
      }
    }
  }

  function clearPad() {
    var rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    hasInk = false;
    post('change', { signature: null, empty: true });
  }

  window.addEventListener('message', function (ev) {
    try {
      var data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
      if (data && data.type === 'clear') clearPad();
    } catch (_) {}
  });

  document.addEventListener('touchstart', start, { passive: false });
  document.addEventListener('touchmove', move, { passive: false });
  document.addEventListener('touchend', end, { passive: false });
  document.addEventListener('touchcancel', end, { passive: false });
  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mouseup', end);
  canvas.addEventListener('mouseleave', end);

  window.addEventListener('resize', resize);
  resize();
  post('ready', {});
})();
</script>
</body>
</html>`;
}

export function stripDataUrlPrefix(dataUrl: string): string {
  const match = /^data:image\/[a-z+]+;base64,(.+)$/i.exec(dataUrl.trim());
  return match ? match[1] : dataUrl.trim();
}
