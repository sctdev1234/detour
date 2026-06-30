# Prioritized Implementation Roadmap

This document fulfills Step 15 of the Deep Dive Audit.

## 🔴 CRITICAL PRIORITY (Blockers for Production)
*These must be addressed before any real users touch the platform.*

1. **Database Geospatial Indexing (Backend)**
   - *Effort:* Low (1 day)
   - *Task:* Add `2dsphere` indexes to `Route` and `SavedPlace` models. Update all `$near` queries.
2. **Background Location Tracking (Frontend / Expo)**
   - *Effort:* High (3-4 days)
   - *Task:* Implement `Location.startLocationUpdatesAsync()` to allow drivers to broadcast location even when the app is minimized.
3. **Transaction Safety (Backend)**
   - *Effort:* Medium (2 days)
   - *Task:* Wrap trip creation, cancellation fees, and wallet deductions in MongoDB multi-document transactions.
4. **JWT Security (Backend)**
   - *Effort:* Medium (2 days)
   - *Task:* Implement Refresh Tokens and use `expo-secure-store` on the frontend for storage.

## 🟠 HIGH PRIORITY (Core UX & Stability)
*Essential for a smooth user experience and mitigating common failure points.*

5. **Socket Reconnection & State Recovery (Backend/Frontend)**
   - *Effort:* High (4 days)
   - *Task:* If a client drops during `TRIP_STARTED`, they need to sync the current state upon reconnection instead of missing the event.
6. **Robust Role Guards (Frontend)**
   - *Effort:* Medium (2 days)
   - *Task:* Fix `useRouteGuard.ts` so users cannot force-navigate to `/(driver)` via deep links if they are not verified.
7. **Trip Lifecycle Concurrency (Backend)**
   - *Effort:* High (3 days)
   - *Task:* Refactor `Trip.clients` updates to use `$elemMatch` atomic operators so rapid "Picked Up" button presses by a driver don't overwrite each other.

## 🟡 MEDIUM PRIORITY (Features & Refinements)
*Valuable additions that complete the intended feature set.*

8. **Payment Gateway Integration (Backend/Frontend)**
   - *Effort:* High (1-2 weeks)
   - *Task:* Wire up Stripe/similar gateway for top-ups in `wallet.tsx`.
9. **Driver Verification Flow (Admin/Frontend)**
   - *Effort:* Medium (3 days)
   - *Task:* Build the Admin UI to bulk approve/reject drivers, and enforce the `verified` status actively via sockets.
10. **Map Marker Clustering (Frontend)**
    - *Effort:* Medium (2 days)
    - *Task:* Integrate `react-native-map-clustering` to handle >50 drivers on the screen gracefully.

## 🟢 LOW PRIORITY (Polish & Technical Debt)
*To be done during stabilization sprints.*

11. **Pagination for Admin APIs (Backend)**
    - *Effort:* Low (1-2 days)
    - *Task:* Add `limit/skip` to `/api/users`, `/api/trips`, etc.
12. **Dockerization & CI/CD (DevOps)**
    - *Effort:* Medium (2 days)
    - *Task:* Containerize the backend, set up GitHub Actions for tests and deployments.
13. **SMS OTP / 2FA (Backend)**
    - *Effort:* High (1 week)
    - *Task:* Integrate Twilio for phone number verification during signup to prevent bot accounts.
