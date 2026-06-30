# Maps & Location Audit

This document fulfills Step 7 of the Deep Dive Audit.

## 1. Map Implementation (`frontend/components/Map.tsx`)
- **Library:** `react-native-maps` is used natively. There are comments referencing Leaflet (`require('leaflet/dist/leaflet.css')`) which implies an attempt at web compatibility, but React Native Maps is primarily for iOS/Android.
- **Rendering Modes:** The map handles multiple complex modes: `picker`, `trip`, `route`, and `view`. This creates a very bloated component (870+ lines).
- **Optimization:** The map uses `react-native-reanimated` for smooth polyline rendering (`AnimatedPolyline`). This is a great performance optimization for real-time tracking.

## 2. Location Tracking Strategy
- **Permissions:** `Location.requestForegroundPermissionsAsync()` is called in `(client)/index.tsx`. 
- **Background Tracking:** There is NO background location tracking (`Location.requestBackgroundPermissionsAsync()` and `Location.startLocationUpdatesAsync()`). If a driver locks their phone or switches apps, the GPS updates stop. This is a critical failure point for a ride-hailing app.
- **Geocoding:** `RouteService.reverseGeocode` is used to turn LatLng into addresses. 

## 3. UI Overlays & Markers
- **Saved Places:** Custom icons (`getSavedPlaceIcon`) are rendered for Home, Work, Gym, etc. 
- **Driver Car:** Uses an Image marker. Needs to ensure the marker rotates based on the driver's heading (`driverLocation.heading`).
- **Clustering:** There is no marker clustering implemented. If there are 50 active drivers on a map, the map will become cluttered and performance will drop significantly on older devices.
- **Polyline Decoding:** `decodePolyline` is used, indicating that the backend or an external routing API (like Google Directions API or OSRM) provides encoded polylines.

## 4. Edge Cases
- **Missing GPS:** The app assumes GPS is always available and accurate. It does not handle "Location Accuracy: Low" warnings or prompt the user to enable Wi-Fi for better triangulation.
- **Mock Locations:** Drivers using Fake GPS apps are not detected. `expo-location` provides a `mocked: boolean` flag in the location object that should be checked to prevent driver fraud.
