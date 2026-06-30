# Navigation & Routing Audit

This document fulfills Step 2 of the Deep Dive Audit for `frontend/app`.

## Current Routing Structure (Expo Router)

### 1. Authentication `(auth)`
- `login.tsx`
- `signup.tsx`
- `role-selection.tsx`
- `forgot-password.tsx`
- `reset-password.tsx`

**Findings:** Standard auth flows are present. The `role-selection.tsx` correctly segregates new users before they enter the client/driver layouts.

### 2. Passenger / Client `(client)`
- `index.tsx` (Map/Home)
- `trips.tsx` (History)
- `requests.tsx` (Active requests)
- `trip-details.tsx` (Detail view)
- `profile.tsx` (Profile view)
- `places.tsx` (Saved places)
- `routes.tsx` (Saved routes)
- `add-route.tsx`

**Findings:** The `trip-details.tsx` exists, but there is also a global `active-trip/[id].tsx`. The passenger app uses bottom tabs (`(client)/_layout.tsx`) to separate Map, Trips, and Profile.

### 3. Driver `(driver)`
- `index.tsx` (Map/Home/Status)
- `find-clients.tsx` (Driver search view)
- `trips.tsx` (History)
- `requests.tsx` (Driver side requests)
- `cars.tsx`, `add-car.tsx`, `assign-car.tsx` (Vehicle management)
- `verification.tsx` (Driver verification flow)
- `profile.tsx`
- `places.tsx`, `routes.tsx`, `add-route.tsx`

**Findings:** Vehicle management and driver verification are correctly gated within the `(driver)` segment.

### 4. Global / Shared Routes
- `active-trip/[id].tsx`: Handles the real-time ride tracking for both Driver and Passenger.
- `chat.tsx`: The real-time messaging interface.
- `finance/wallet.tsx`: Handles transaction history and balance.
- `reclamations/index.tsx`, `new.tsx`, `[id].tsx`: Support tickets.
- `notifications.tsx`: Global notification list.

## Missing Features & Broken Navigation
- **Missing Admin Routes:** The prompt requested Admin Routes, but they are housed in the entirely separate Vite `admin-panel` application.
- **Role Guards (useRouteGuard.ts):** The `useRouteGuard` hook checks if a user is fully authenticated and redirects based on `user.role` (client vs driver). However, if a user manually forces a deep link into `/(driver)` while being a `client`, the `useRouteGuard` handles redirection back.
- **Deep Links:** There is no specific `linking` configuration exported in `_layout.tsx` to handle standard deep links (e.g., `detour://ride/123`). This needs to be configured in `app.json` and the main layout for production push notifications and emails to work perfectly.
- **Payments:** While `wallet.tsx` exists, there is no route for standard credit card payment processing (e.g., `payment-method.tsx` or `checkout.tsx`).
- **Settings/Preferences:** A dedicated `settings.tsx` for pushing configurations (Language, Map themes, Notification toggles) is missing.
