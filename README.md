markdown
# Tank Locator App

A Progressive Web App (PWA) for drivers to quickly locate delivery points (DPs) by number, name, or postcode.  
Built with the Google Maps JavaScript API, it provides a clean, mobile‑friendly interface styled to resemble Google Maps.

---

## 🚀 Features

- **Search bar across the top**: Full‑width, adaptive input for DP number, name, or postcode.
- **Markers**: Red heart icons (or flame icons if configured) for each delivery point.
- **Info windows**: Show DP name and number with two buttons:
  - **Navigate to…** → Opens Google Maps directions.
  - **Zoom In** → Centers and zooms to max level.
- **Locate Me button**: Finds your current location and marks it with a larger blue dot.
- **Street View**: Double‑click a marker to open Street View at that location.
- **Postcode search**: Falls back to Google Geocoder if no DP match is found.
- **Responsive design**: Buttons sized for Android tap targets (≥44px).
- **PWA installability**: Add to Home Screen on phones and tablets for fullscreen, app‑like experience.

---

## 📂 Project Structure

/index.html → Main page with map container and search bar /app.js → Core logic: map init, markers, search, geolocation /manifest.json → Web App Manifest (PWA metadata) /service-worker.js → Minimal service worker for caching and install prompt /data/delivery_points.json → Delivery point data (DP number, name, lat/lng) /assets/heart.png → Marker icon (replace with flame or other icons if needed)

---

## ⚙️ Setup

1. **Clone or download** this repository.
2. **Add your Google Maps API key** in `index.html`:
   ```html
   <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY"></script>
Serve over HTTPS (GitHub Pages already does this).

Open the site in Chrome/Edge/Safari.

On mobile/tablet, use Add to Home Screen to install it as a PWA.

📱 Progressive Web App (PWA)
manifest.json
Defines how the app behaves when installed:

name/short_name: App title shown on device.

start_url: Where the app opens.

display: standalone: Launches fullscreen without browser chrome.

theme/background colors: Control UI bar colors.

icons: Used for home screen and splash screen.

You can include a "__comment" field in the manifest for developer notes. Browsers ignore it.

service-worker.js
Handles caching and enables install prompts:

Install event: Caches key files (index.html, app.js, icons, manifest).

Fetch event: Serves cached files when offline or faster than network.

Required for Chrome/Edge to show “Add to Home Screen.”

🛠 Development Notes
Styling: Buttons and search bar mimic Google Maps for driver familiarity.

Locate Me button: Positioned above the Google logo, aligned with Pegman.

EscapeHTML: Sanitises DP names/numbers to prevent injection.

Zoom levels: “Zoom In” jumps to level 21 (max).

Data file: delivery_points.json must contain valid lat/lng coordinates.

📖 Future Enhancements
Cluster markers for dense areas.

Add ADR tunnel code overlays for compliance.

Offline map tiles for poor signal areas.

Driver‑specific UI tweaks (bigger fonts, colour‑coded DPs).

🧾 License
This project is for internal driver logistics use.
