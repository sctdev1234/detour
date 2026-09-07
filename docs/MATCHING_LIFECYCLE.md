# DETOUR.MA — CANONICAL MATCHING & SEARCHING LIFECYCLE SPECIFICATION

## 1. Passenger Searching Lifecycle
The passenger enters dispatch searching when creating a ride request or entering the V2 searching flow.
```
IDLE
  ↓ (Client requests ride)
SEARCHING / WAITING_FOR_OFFERS
  ↓ (Driver evaluates & counters / offers)
OFFER_RECEIVED / OFFERS_AVAILABLE
  ↓ (Passenger accepts offer & holds escrow)
ASSIGNED
  ↓ (Driver departs toward pickup)
EN_ROUTE
  ↓ (Driver arrives at pickup location)
DRIVER_ARRIVED
  ↓ (Passenger boards vehicle)
BOARDED
  ↓ (Passenger reaches destination)
DROPPED_OFF
  ↓ (Dispute window elapses / rated)
COMPLETED
```
*Frontend Guarantee*: Under no circumstances does the passenger interface render "Driver Assigned" while in `SEARCHING`, `WAITING_FOR_OFFERS`, or `OFFERS_OPEN`. "Driver Assigned" is strictly reserved for the canonical `ASSIGNED` state.

---

## 2. Driver Searching Lifecycle
Drivers search against their own active route corridor, not globally across the entire database.
```
OFFLINE
  ↓ (Driver sets status ONLINE)
ONLINE (Idle)
  ↓ (Driver selects active route & requests matches)
SEARCHING MATCHES ON ACTIVE ROUTE
  ↓ (Backend corridor & invariant evaluation)
VERIFIED MATCHES RETURNED
  ↓ (Driver reviews verified passenger candidates)
DRIVER SENDS OFFER / COUNTER
  ↓ (Passenger accepts)
ASSIGNED
  ↓ (Driver drives to pickup)
EN_ROUTE
  ↓
DRIVER_ARRIVED
  ↓
BOARDING
  ↓
IN_PROGRESS
  ↓
DROPOFF
  ↓
COMPLETED
```

---

## 3. Candidate vs. Verified Match
- **Candidate**: Any active, unexpired ride request in the system within temporal proximity.
- **Verified Match**: A candidate that has passed ALL 14 invariant checks:
  1. Passenger request status is active/searching.
  2. Request has valid coordinates for pickup and dropoff.
  3. Driver user status is `ONLINE`.
  4. Driver owns the active route being queried (enforced via 403 Forbidden).
  5. Driver route is `active`.
  6. Temporal departure compatibility ($\le 2$ hours difference, unexpired).
  7. Passenger pickup $\le 2.5\text{ km}$ perpendicular distance from driver trajectory.
  8. Passenger dropoff $\le 2.5\text{ km}$ perpendicular distance from driver trajectory.
  9. Forward directionality: Pickup route distance < Dropoff route distance (minimum span $\ge 200\text{m}$).
  10. Segment capacity available for every intermediate segment $[i, j-1]$.
  11. Driver passes eligibility check (`driverEligibilityService.checkEligibility`).
  12. Driver has no active conflicting trip (`assertSingleActiveTrip`).
  13. Passenger request is not cancelled, deleted, or completed.
  14. Results are strictly non-authoritative candidate previews; assignment occurs only via explicit offer acceptance.

---

## 4. Route Corridor Algorithm
- Implemented in `backend/utils/corridorMatcher.js`.
- Eliminates the legacy 500 km radius query (`maxDistance: 500000`).
- **Default Corridor Tolerance**: $2,500\text{ meters}$ (2.5 km) perpendicular offset from route trajectory.
- **Trajectory Representation**:
  - Encoded polyline (`routeGeometry`) if available.
  - Or ordered waypoint sequence: StartPoint $\to$ Waypoints $[W_1, \dots, W_n]$ $\to$ EndPoint.
- **Planar Projection**:
  - Projects coordinates onto each segment $[A, B]$ using equirectangular / haversine projection.
  - Computes exact perpendicular offset distance in meters.
  - Computes cumulative route distance progress (meters) from origin to projected point.

---

## 5. Direction Validation
- Computes `pickupRoutePosition` and `dropoffRoutePosition`.
- Directionality Invariant:
  $$\text{passengerProgressSpan} = \text{dropoffRoutePosition} - \text{pickupRoutePosition} \ge 200\text{ m}$$
- Reverses (e.g. Rabat $\to$ Casablanca on a Casablanca $\to$ Rabat route) produce `REVERSE_OR_INSUFFICIENT_DIRECTION` and are rejected.
- Transverse or perpendicular crossings that do not traverse forward along the route are rejected.

---

## 6. Schedule Validation
- Compares driver departure time and passenger requested departure time.
- Same-day or scheduled time tolerance: $\le 120\text{ minutes}$ difference.
- Any request with `expiresAt < now()` or `status === 'CANCELLED'` is discarded before corridor evaluation.

---

## 7. Capacity Validation
- Matching integrates with `capacityService.checkCapacity`.
- Identifies `pickupSegmentIndex` and `dropoffSegmentIndex`.
- Asserts that every route interval segment from `pickupSegmentIndex` to `dropoffSegmentIndex` has:
  $$\text{seatsOccupied} + \text{requestedSeats} \le \text{seatsTotal}$$
- Bottlenecks on any subsegment immediately disqualify the match.

---

## 8. Offer Lifecycle
```
PENDING
  ↓
ACCEPTED (Passenger accepts / Escrow held)  --> Competing offers REJECTED
  OR
REJECTED / EXPIRED / CANCELLED
```
- Validated via `OfferStateMachine.validateTransition`.
- Offer acceptance is atomic and idempotent via MongoDB multi-document transactions.

---

## 9. Assignment Lifecycle
- Matches returned by `GET /api/trip/matches/:routeId` are non-binding spatial candidates.
- Formal assignment creates:
  - `TripAssignment` record.
  - Transitions `TripInstance` to `ASSIGNED`.
  - Transitions `PassengerJourney` to `BOOKED` / `ESCROW_HELD`.
  - Mutates `seatsOccupied` across trajectory segments.

---

## 10. Socket Event Isolation
- Global broadcasting (`this.io.emit('dispatch:trip_searching')`) is completely eradicated.
- `notificationService.handleTripSearching`:
  - Iterates over currently `ONLINE` drivers with active routes.
  - Runs pure corridor evaluation `evaluateCorridorMatch(driverRoute, passengerRequest)`.
  - Dispatches targeted notifications ONLY to matching drivers:
    `this.emitToDriver(driverId, 'dispatch:trip_searching', { instanceId, pickup, destination })`.
  - Emits minimal metadata to trigger driver match list refreshes without broadcasting sensitive client records.

---

## 11. Frontend State Mapping
- Located in `frontend/app/(client)/index.tsx` and `frontend/components/passenger/home/SmartHeader.tsx`.
- Maps state directly from backend dispatch & trip status:
  - `IDLE` $\to$ Normal home view.
  - `SEARCHING` $\to$ "Searching for drivers...".
  - `WAITING_FOR_OFFERS` / `OFFERS_OPEN` $\to$ "Waiting for offers...".
  - `ASSIGNED` $\to$ "Driver Assigned".
  - `EN_ROUTE` $\to$ "Driver is on the way".
  - `DRIVER_ARRIVED` $\to$ "Driver has arrived".
  - `BOARDED` $\to$ "Trip in progress".
  - `DROPPED_OFF` $\to$ "Arrived at destination".
  - `COMPLETED` $\to$ "Trip completed".

---

## 12. Driver Map Rendering Rules
- Located in `frontend/components/dashboard/DashboardScreen.tsx` and `frontend/components/MapLeaflet.tsx`.
- **Zero matches**:
  - No client polylines rendered.
  - No passenger pickup/dropoff markers rendered.
  - Map centers cleanly on driver's active route.
- **Verified matches**:
  - Renders ONLY verified matches returned by `GET /api/trip/matches/:routeId`.
  - Each match displays pickup pin, destination pin, and optional client route polyline.
  - Unrelated clients, offline passengers, or out-of-corridor requests are never rendered.

---

## 13. Failure & Rejection Reasons
Corridor matching returns explicit, debuggable rejection reasons:
- `NO_DRIVER_GEOMETRY`: Driver route lacks coordinates or waypoints.
- `NO_PASSENGER_COORDINATES`: Passenger request missing pickup or dropoff point.
- `PICKUP_OUTSIDE_CORRIDOR`: Pickup point $> 2.5\text{ km}$ from driver route.
- `DROPOFF_OUTSIDE_CORRIDOR`: Dropoff point $> 2.5\text{ km}$ from driver route.
- `REVERSE_OR_INSUFFICIENT_DIRECTION`: Dropoff occurs before pickup along route or span $< 200\text{ m}$.

---

## 14. Concurrency & Idempotency Behavior
- `DispatchServiceV2.acceptOffer` wraps assignment in a MongoDB multi-document transaction with up to 3 automatic retries on `TransientTransactionError`.
- If an offer was already accepted, the existing `TripAssignment` is idempotently returned without creating duplicate assignments or throwing WriteConflict errors.
