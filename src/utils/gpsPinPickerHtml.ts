/** Leaflet map HTML for in-app GPS pin selection (WebView). */
export function buildLeafletPickerHtml(lat: number, lng: number): string {
  const la = Number.isFinite(lat) ? lat : 0;
  const ln = Number.isFinite(lng) ? lng : 0;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <style>
    html, body { margin: 0; padding: 0; height: 100%; width: 100%; }
    #map { height: 100%; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      var LAT = ${la};
      var LNG = ${ln};
      function postMove(lat, lng) {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'move', lat: lat, lng: lng }));
        }
      }
      var map = L.map('map', { zoomControl: true }).setView([LAT, LNG], 16);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);
      var marker = L.marker([LAT, LNG], { draggable: true }).addTo(map);
      marker.on('dragend', function (e) {
        var p = e.target.getLatLng();
        postMove(p.lat, p.lng);
      });
      map.on('click', function (e) {
        marker.setLatLng(e.latlng);
        map.panTo(e.latlng);
        postMove(e.latlng.lat, e.latlng.lng);
      });
      setTimeout(function () {
        try { map.invalidateSize(); } catch (e) {}
      }, 200);
      setTimeout(function () {
        try { map.invalidateSize(); } catch (e) {}
      }, 600);
      postMove(LAT, LNG);
    })();
  </script>
</body>
</html>`;
}
