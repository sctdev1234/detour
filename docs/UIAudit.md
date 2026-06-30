# UI Assessment Audit

This document fulfills Step 3 of the Deep Dive Audit.

## 1. Design System & Theming
- **Framework:** NativeWind (Tailwind CSS for React Native) is used alongside `expo-linear-gradient` and custom `GlassCard` components.
- **Color Palette:** Centralized in `constants/theme.ts`. Includes standard semantic colors (primary, background, surface, text, border) with dark mode variants.
- **Typography:** Custom components (`PremiumInput`, `PremiumButton`) imply a desire for a polished feel, but the exact fonts (e.g., Inter, Roboto) are not explicitly loaded via `expo-font` globally in a robust manner. Standard system fonts are used as fallback.

## 2. Screen-by-Screen Breakdown

### Passenger App `(client)`
- **`index.tsx` (Home / Map)**
  - *Purpose:* Central hub for map discovery, entering destinations, and tracking active trips.
  - *Components:* Uses `DetourMap`, `TripCreationWizard`, `ActiveTripTracker`.
  - *Loading State:* Minimal skeleton loaders; relies on standard activity indicators.
  - *Responsiveness:* Hardcoded spacing in some overlays could cause clipping on smaller Android devices. Safe areas (`useSafeAreaInsets`) are correctly used to avoid notch overlap.
- **`profile.tsx`**
  - *Purpose:* Manage passenger information, switch to driver role.
  - *Components:* `GlassCard`, Avatar images.
  - *Feedback:* Needs an empty state if no profile image is provided.
- **`trip-details.tsx`**
  - *Purpose:* Show historical trip information.
  - *Spacing:* Dense information. Requires better visual hierarchy between pricing, distance, and timestamps.

### Driver App `(driver)`
- **`index.tsx` (Dashboard)**
  - *Purpose:* Display driver online status, earnings summary, and active requests.
  - *Components:* Wraps `DashboardScreen` which uses a floating UI over a map.
  - *Animations:* Missing micro-interactions when toggling online/offline.
- **`verification.tsx`**
  - *Purpose:* Upload driver documents (License, Registration).
  - *Feedback:* Error states for failed uploads are present via Toasts, but visual validation (red borders) on the image pickers is missing.
- **`add-car.tsx`**
  - *Purpose:* Add vehicle details.
  - *Layout:* Long form. Wrap in `KeyboardAvoidingView` is required to prevent input blocking.

### Admin Panel (Vite/React)
- **Dashboard (`DashboardHome.jsx`)**
  - *Purpose:* Statistical overview.
  - *Styling:* Standard Tailwind CSS dashboard.
- **Entity Pages (`Users.jsx`, `Trips.jsx`, `Cars.jsx`)**
  - *Components:* Standard data tables.
  - *Empty States:* "No data found" is generic.
  - *Loading:* Uses standard spinners instead of skeleton rows.

## 3. General UI Findings
- **Accessibility:** Missing `accessible` and `accessibilityLabel` props on custom interactive elements (e.g., `GlassCard`, custom buttons).
- **Tablet Compatibility:** NativeWind classes do not heavily utilize responsive prefixes (`md:`, `lg:`). The app will stretch awkwardly on iPads.
- **Dark Mode Support:** `colorScheme` is dynamically read using `useColorScheme()`, and `theme.background` vs `theme.surface` is applied. Dark mode works but some map overlays need a darker tile set (Leaflet dark mode).
- **Offline State:** There is no dedicated offline banner if the user loses connectivity (only failed React Query toasts).
