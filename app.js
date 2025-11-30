// Basic config: starting zoom and default center (UK midpoint as a sensible default)
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
    mapTypeId: "roadmap",
    streetViewControl: false
  });

  const points = await fetchPoints();
  if (!points || points.length === 0) {
    console.warn("No delivery points found.");
    return;
  }

  addMarkers(points);
  fitToMarkers();

  wireSearch(points);
  wireReset();
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
          <small>Lat: ${point.latitude.toFixed(6)}, Lng: ${point.longitude.toFixed(6)}</small>
        </div>
      `
    });

    let isOpen = false;
    marker.addListener("click", () => {
      // Toggle behavior
      if (isOpen) {
        infoWindow.close();
        isOpen = false;
        openInfoWindow = null;
      } else {
        // Close any other open window for clean UX
        if (openInfoWindow) openInfoWindow.close();
        infoWindow.open(map, marker);
        isOpen = true;
        openInfoWindow = infoWindow;
      }
    });

    markers.push({ marker, infoWindow, point });
  });
}

// Fit map bounds to current markers
function fitToMarkers() {
  if (markers.length === 0) return;
  const bounds = new google.maps.LatLngBounds();
  markers.forEach(({ marker }) => bounds.extend(marker.getPosition()));
  map.fitBounds(bounds);

  // If all points are the same or nearly identical, keep a sensible zoom
  google.maps.event.addListenerOnce(map, "idle", () => {
    if (map.getZoom() > 18) map.setZoom(16);
  });
}

// Simple search by dp_number or dp_name
function wireSearch(points) {
  const input = document.getElementById("searchInput");
  const btn = document.getElementById("searchBtn");

  btn.addEventListener("click", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) return;

    // Find the best match
    const match = points.find(p =>
      (p.dp_number && p.dp_number.toLowerCase().includes(q)) ||
      (p.dp_name && p.dp_name.toLowerCase().includes(q))
    );

    if (!match) {
      alert("No matching delivery point found.");
      return;
    }

    // Find marker for the match
    const m = markers.find(m => m.point.dp_number === match.dp_number);
    if (m) {
      map.panTo({ lat: match.latitude, lng: match.longitude });
      map.setZoom(16);

      // Open info on focus
      if (openInfoWindow) openInfoWindow.close();
      m.infoWindow.open(map, m.marker);
      openInfoWindow = m.infoWindow;
    }
  });
}

// Reset view to show all
function wireReset() {
  const btn = document.getElementById("resetBtn");
  btn.addEventListener("click", () => {
    if (openInfoWindow) { openInfoWindow.close(); openInfoWindow = null; }
    fitToMarkers();
  });
}

// Basic HTML escape to avoid breaking InfoWindow content
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Start
window.addEventListener("load", init);
