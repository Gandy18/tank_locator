// Basic config: starting zoom and default center (UK midpoint as fallback)
const DEFAULT_CENTER = { lat: 52.8, lng: -1.6 };
const DEFAULT_ZOOM = 6;

// Globals
let map;
let markers = [];
let openInfoWindow = null;

// Utility: create a custom heart icon (local asset)
function heartIcon() {
  return {
    url: "assets/heart.png",
    scaledSize: new google.maps.Size(32, 32),
    anchor: new google.maps.Point(16, 16) // center the icon nicely
  };
}

// Initialize the map and load data
async function init() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
    mapTypeId: "satellite",   // satellite view
    streetViewControl: true   // pegman enabled
  });

  const points = await fetchPoints();
  if (!points || points.length === 0) {
    console.warn("No delivery points found.");
    return;
  }

  addMarkers(points);

  wireSearch(points);
  wireLocateMe();

  // Try to centre on current location at startup
  locateUser();
}

// Fetch JSON data
async function fetchPoints() {
  try {
    const res = await fetch("data/delivery_points.json");
    if (!res.ok) throw new Error("Failed to load data/delivery_points.json");
    const json = await res.json();

    // Validate and normalize numbers
    return json
      .map(p => ({
        dp_number: String(p.dp_number || "").trim(),
        dp_name: String(p.dp_name || "").trim(),
        latitude: Number(p.latitude),
        longitude: Number(p.longitude)
      }))
      .filter(p => !isNaN(p.latitude) && !isNaN(p.longitude));
  } catch (e) {
    console.error(e);
    return [];
  }
}

// Add markers with toggleable InfoWindows
function addMarkers(points) {
  markers.forEach(m => m.setMap(null));
  markers = [];

  points.forEach(point => {
    const marker = new google.maps.Marker({
      position: { lat: point.latitude, lng: point.longitude },
      map,
      title: point.dp_name || point.dp_number,
      icon: heartIcon()
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="font-family: system-ui; line-height:1.4">
          <strong>${escapeHTML(point.dp_name || "Unknown")}</strong><br/>
          <span>DP#: ${escapeHTML(point.dp_number || "N/A")}</span><br/>
          <button onclick="navigateTo(${point.latitude}, ${point.longitude})"
            style="margin-top:6px; padding:6px 10px; border:1px solid #1a73e8; border-radius:4px; background:#1a73e8; color:#fff; cursor:pointer;">
            Navigate to…
          </button>
          <button onclick="zoomTo(${point.latitude}, ${point.longitude})"
            style="margin-top:6px; margin-left:6px; padding:6px 10px; border:1px solid #34A853; border-radius:4px; background:#34A853; color:#fff; cursor:pointer;">
            Zoom In
          </button>
        </div>
      `
    });

    let isOpen = false;
    marker.addListener("click", () => {
      if (isOpen) {
        infoWindow.close();
        isOpen = false;
        openInfoWindow = null;
      } else {
        if (openInfoWindow) openInfoWindow.close();
        infoWindow.open(map, marker);
        isOpen = true;
        openInfoWindow = infoWindow;
      }
    });

    // Double‑click to open Street View directly
    marker.addListener("dblclick", () => {
      const streetView = map.getStreetView();
      streetView.setPosition({ lat: point.latitude, lng: point.longitude });
      streetView.setPov({ heading: 0, pitch: 0 });
      streetView.setVisible(true);
    });

    markers.push({ marker, infoWindow, point });
  });
}

// Simple search by dp_number or dp_name
function wireSearch(points) {
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");

  // Style search button blue
  btn.style.cssText = `
    padding:8px 12px; border:1px solid #1a73e8; border-radius:6px;
    background:#1a73e8; color:#fff; cursor:pointer; font-family:system-ui;
  `;

  btn.addEventListener("click", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) return;

    const match = points.find(p =>
      (p.dp_number && p.dp_number.toLowerCase().includes(q)) ||
      (p.dp_name && p.dp_name.toLowerCase().includes(q))
    );

    if (!match) {
      alert("No matching delivery point found.");
      return;
    }

    const m = markers.find(m => m.point.dp_number === match.dp_number);
    if (m) {
      map.panTo({ lat: match.latitude, lng: match.longitude });
      map.setZoom(16);

      if (openInfoWindow) openInfoWindow.close();
      m.infoWindow.open(map, m.marker);
      openInfoWindow = m.infoWindow;
    }
  });
}

// Locate Me button (blue with white border, always visible)
function wireLocateMe() {
  const btn = document.createElement("button");
  btn.textContent = "Locate Me";
  btn.style.cssText = `
    position:absolute; bottom:12px; left:12px; z-index:2;
    padding:8px 12px; border:2px solid #fff; border-radius:6px;
    background:#1a73e8; color:#fff; cursor:pointer; font-family:system-ui;
    font-weight:bold;
    box-shadow:0 2px 6px rgba(0,0,0,0.4);
    text-shadow:0 1px 2px rgba(0,0,0,0.6);
  `;
  document.body.appendChild(btn);

  btn.addEventListener("click", () => {
    const streetView = map.getStreetView();
    if (streetView.getVisible()) {
      // If Street View is active, reload to default view
      location.reload();
    } else {
      // Otherwise, locate user
      locateUser();
    }
  });
}

// Centre on current location with ~30 mile radius
function locateUser() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
        const circle = new google.maps.Circle({
          center: loc,
          radius: 30 * 1609.34 // 30 miles in meters
        });
        map.fitBounds(circle.getBounds());

        new google.maps.Marker({
          position: loc,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            fillColor: "#00f",
            fillOpacity: 0.8,
            strokeColor: "#fff",
            strokeWeight: 2
          },
          title: "Your Location"
        });
      },
      err => {
        console.warn("Geolocation failed:", err);
        alert("Unable to get your location.");
      }
    );
  } else {
    alert("Geolocation not supported by this browser.");
  }
}

// Android-friendly navigation function
function navigateTo(lat, lng) {
  // Use a geo URI instead of Google Maps API link
  const url = `geo:${lat},${lng}?q=${lat},${lng}`;
  window.location.href = url;
}

// Zoom In helper
function zoomTo(lat, lng) {
  map.setCenter({ lat, lng });
  map.setZoom(18); // adjust zoom level as needed
}

// Basic HTML escape
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Start
window.addEventListener("load", init);
