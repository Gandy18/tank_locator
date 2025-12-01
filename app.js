const DEFAULT_CENTER = { lat: 52.8, lng: -1.6 };
const DEFAULT_ZOOM = 6;

let map;
let markers = [];
let openInfoWindow = null;

function calorIcon() {
  return {
    url: "assets/calor.png",
    scaledSize: new google.maps.Size(32, 32),
    anchor: new google.maps.Point(16, 16)
  };
}

async function init() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    mapTypeId: "hybrid",
    streetViewControl: true,
    mapTypeControl: false,
    fullscreenControl: false,
    zoomControl: false,   // removed zoom controls
    panControl: false,     // removed camera/pan controls
    disableDefaultUI: true,
    streetViewZoomControl: false
  });

  const points = await fetchPoints();
  if (!points || points.length === 0) return;

  addMarkers(points);
  wireSearch(points);
  wireLocateMe();
  locateUser();
}

async function fetchPoints() {
  try {
    const res = await fetch("data/delivery_points.json");
    if (!res.ok) throw new Error("Failed to load data/delivery_points.json");
    const json = await res.json();
    return json.map(p => ({
      dp_number: String(p.dp_number || "").trim(),
      dp_name: String(p.dp_name || "").trim(),
      latitude: Number(p.latitude),
      longitude: Number(p.longitude)
    })).filter(p => !isNaN(p.latitude) && !isNaN(p.longitude));
  } catch (e) {
    console.error(e);
    return [];
  }
}

function addMarkers(points) {
  markers.forEach(m => m.marker.setMap(null));
  markers = [];

  points.forEach(point => {
    const marker = new google.maps.Marker({
      position: { lat: point.latitude, lng: point.longitude },
      map,
      title: point.dp_name || point.dp_number,
      icon: calorIcon()
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="font-family: system-ui; line-height:1.4">
          <strong style="font-size:1.2rem;">${escapeHTML(point.dp_name || "Unknown")}</strong><br/>
          <span style="font-size:1.1rem;">DP#: ${escapeHTML(point.dp_number || "N/A")}</span><br/>
          <button onclick="navigateTo(${point.latitude}, ${point.longitude})"
            style="margin-top:6px; padding:12px 16px; border:none; border-radius:8px; background:#1a73e8; color:#fff; font-size:1rem; font-weight:bold; cursor:pointer;">
            Navigate to…
          </button>
          <button onclick="zoomTo(${point.latitude}, ${point.longitude})"
            style="margin-top:6px; margin-left:6px; padding:12px 16px; border:none; border-radius:8px; background:#34A853; color:#fff; font-size:1rem; font-weight:bold; cursor:pointer;">
            Zoom In
          </button>
        </div>
      `
    });

    marker.addListener("click", () => {
      if (openInfoWindow) openInfoWindow.close();
      infoWindow.open(map, marker);
      openInfoWindow = infoWindow;
    });

    marker.addListener("dblclick", () => {
      const streetView = map.getStreetView();
      streetView.setPosition({ lat: point.latitude, lng: point.longitude });
      streetView.setPov({ heading: 0, pitch: 0 });
      streetView.setVisible(true);
    });

    markers.push({ marker, infoWindow, point });
  });
}

function wireSearch(points) {
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");
  btn.addEventListener("click", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) return;

    const match = points.find(p =>
      (p.dp_number && p.dp_number.toLowerCase().includes(q)) ||
      (p.dp_name && p.dp_name.toLowerCase().includes(q))
    );

    if (match) {
      const m = markers.find(m => m.point.dp_number === match.dp_number);
      if (m) {
        map.panTo({ lat: match.latitude, lng: match.longitude });
        map.setZoom(16);
        if (openInfoWindow) openInfoWindow.close();
        m.infoWindow.open(map, m.marker);
        openInfoWindow = m.infoWindow;
      }
    } else {
      searchByPostcode(q);
    }
  });
}

function searchByPostcode(postcode) {
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: postcode }, (results, status) => {
    if (status === "OK" && results[0]) {
      const loc = results[0].geometry.location;
      map.setCenter(loc);
      map.setZoom(16);
    } else {
      alert("Postcode not found. Please check and try again.");
    }
  });
}

// Google-style Locate Me button, always visible
function wireLocateMe() {
  const btn = document.createElement("div");
  btn.style.cssText = `
    position: absolute;
    bottom: 72px;
    right: 12px;
    z-index: 9999;
    background: #fff;
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    cursor: pointer;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  const dot = document.createElement("div");
  dot.style.cssText = `
    width: 12px;
    height: 12px;
    background: #1a73e8;
    border-radius: 50%;
  `;
  btn.appendChild(dot);

  document.body.appendChild(btn);

  btn.addEventListener("click", () => {
    const streetView = map.getStreetView();
    if (streetView.getVisible()) {
      // Exit Street View back to map
      streetView.setVisible(false);
      map.setCenter(DEFAULT_CENTER);
      map.setZoom(DEFAULT_ZOOM);
    } else {
      locateUser();
    }
  });
}

function locateUser() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        const circle = new google.maps.Circle({
          center: loc, radius: 30 * 1609.34
        });
        map.fitBounds(circle.getBounds());
        new google.maps.Marker({
          position: loc, map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: "#00f",
            fillOpacity: 0.8,
            strokeColor: "#fff",
            strokeWeight: 2
          },
          title: "Your Location"
        });
      },
      err => {
        let message = "Unable to get your location.";
        if (err.code === 1) message = "Location permission denied. Please allow location access.";
        if (err.code === 2) message = "Location unavailable. Check GPS or network.";
        if (err.code === 3) message = "Location request timed out. Try again.";
        alert(message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  } else {
    alert("Geolocation not supported by this browser.");
  }
}

function navigateTo(lat, lng) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  window.open(url, "_blank");
}

function zoomTo(lat, lng) {
  map.setCenter({ lat, lng });
  map.setZoom(21);
}

function escapeHTML(str) {
  return String(str).replace(/[&<>'"]/g, tag => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[tag]));
}

window.addEventListener("load", init);
