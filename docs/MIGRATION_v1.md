# Detour.ma — MIGRATION_v1.md

This document outlines the strict, non-destructive **Strangler Fig Architecture** migration path to transition the platform from the legacy `Trip` model to the frozen `ARCHITECTURE_v1.md` (`TripTemplate`, `TripInstance`, `TripAssignment`).

---

## 1. CURRENT ARCHITECTURE
Currently, the platform relies on `Trip.js` to represent both the matching result and the physical ride execution, while `RideRequest.js` handles intent, and `Route.js` represents recurring rides. This creates fragmented business logic, overloaded schemas, and fragile status transitions.

## 2. TARGET ARCHITECTURE
The new architecture is a linear flow:
`TripTemplate` (Intent) → `TripInstance` (Lifecycle) → `TripAssignment` (Driver execution binding).
Legacy endpoints, models, and socket events will be entirely replaced.

---

## 3. MIGRATION ORDER

### Phase 1: Model Coexistence
- Create `TripTemplate.js`, `TripInstance.js`, `TripAssignment.js`, and the updated `Offer.js`.
- Keep `Trip.js`, `RideRequest.js`, and `Route.js` fully operational.
- No legacy code or APIs are modified.

### Phase 2: Dual Services (Backend)
- Implement `pricingService.js`, `notificationService.js`, and the pipeline-driven `dispatchService.js`.
- Create new `/api/v2/dispatch/*` routes.
- Legacy routes (`/api/ride/*`) continue to point to `rideService.js` and `Trip.js`.

### Phase 3: Frontend Strangler (Client Updates)
- Use feature flags (`ENABLE_V2_DISPATCH`) on the frontend to incrementally redirect API calls from `/api/ride` to `/api/v2/dispatch`.
- Passengers and Drivers are gracefully shifted to the new stores and sockets.
- Verify compatibility.

### Phase 4: Data Migration
- Run background scripts to read existing `Trip`, `RideRequest`, and `Route` documents and seamlessly map them to `TripTemplate`, `TripInstance`, and `TripAssignment` collections.
- Verify integrity, indexes, references, and ensure receipts/analytics match exactly.

### Phase 5: Parallel Validation
- Observe logs to ensure the new models handle edge cases equivalently to the old flow.
- Ensure Wallet calculations and ledger entries are identical.

### Phase 6: Sunsetting (Destructive Phase)
- Only after 100% verification and successful production running:
- Delete `Trip.js`, `RideRequest.js`, `Route.js`.
- Delete `/api/ride` routes and `rideService.js`.
- Run complete regression testing.

---

## 4. BACKWARD COMPATIBILITY
- During Phases 1-5, all APIs remain backward compatible. Old mobile clients hitting `/api/ride` will still interact with `Trip.js`.
- Notifications and sockets will be emitted to both legacy channels and new v2 channels simultaneously to prevent dropped messages.

## 5. DATABASE MIGRATION STRATEGY
A migration script (`scripts/migrate-trips-v2.js`) will:
1. Iterate over all historical `Trip` documents.
2. Map fields to a historical `TripInstance` and `TripAssignment`.
3. Preserve native `_id`s where possible, or store `legacyTripId` references on the new instances to ensure receipts and analytics can gracefully fail over during the transition.

## 6. ROLLBACK STRATEGY
- **Code Level**: Revert the `ENABLE_V2_DISPATCH` feature flag to immediately redirect all traffic back to `Trip.js`.
- **Database Level**: Since Phase 4 migration does NOT delete legacy data, rolling back requires zero database restoration. The legacy collections remain exactly as they were.

## 7. FEATURE FLAGS
- `ENABLE_V2_DISPATCH_PASSENGER`: Enables new flow for passengers creating requests.
- `ENABLE_V2_DISPATCH_DRIVER`: Enables new flow for drivers receiving offers.
- `ENABLE_V2_MATCHING_ENGINE`: Routes legacy `RideRequests` through the new Matching Engine behind the scenes.

## 8. VALIDATION PLAN
- **Unit Tests**: Ensure new state machines throw errors on invalid transitions.
- **Data Parity**: Compare wallet balance changes made by legacy trips vs v2 trips.
- **Load Testing**: Ensure the new pipeline matching engine performs equally or better than the legacy `$geoNear` query.

## 9. REGRESSION CHECKLIST
- [ ] Passenger can request a Ride Now.
- [ ] Passenger can schedule a ride.
- [ ] Driver receives real-time offer.
- [ ] Driver can accept/reject offer.
- [ ] Ride can be completed and paid.
- [ ] Wallet ledger entries correctly track commissions.
- [ ] Old trips are visible in User History.
- [ ] Analytics dashboard correctly aggregates legacy + v2 trips.
