# Ride Lifecycle State Machine Audit

This document fulfills Step 9 of the Deep Dive Audit.

## 1. Global Trip States (Driver Perspective)
The `Trip` document maintains a global `status`:
`CREATED` -> `PENDING` -> `FULL` -> `CONFIRMED` -> `STARTING_SOON` -> `STARTED` -> `IN_PROGRESS` -> `ARRIVED_PICKUP` -> `CLIENT_PICKED_UP` -> `CLIENT_DROPPED_OFF` -> `COMPLETED`

**Findings & Missing Edges:**
- The transitions between `STARTED`, `IN_PROGRESS`, and `ARRIVED_PICKUP` are vague. In a carpool scenario with 3 passengers, `ARRIVED_PICKUP` is not a global state; it happens 3 separate times. Making this a global trip state will cause state collisions.
- There is no `PAYMENT_PENDING` state at the end of the trip to lock the UI until the transaction clears.

## 2. Client Statuses (Passenger Perspective)
Each passenger inside `trip.clients` has their own `status`:
`WAITING` -> `READY` -> `PICKUP_INCOMING` -> `IN_CAR` -> `DROPPED_OFF` -> `COMPLETED`

**Findings & Missing Edges:**
- This individual passenger tracking is correct for carpooling.
- **Disputes:** `PICKUP_DISPUTED` and `DROPOFF_DISPUTED` exist, which is excellent for handling situations where a passenger claims they were not picked up but the driver claims they were. However, there is no state transition defined in the backend services to move a trip from `DISPUTED` to `RESOLVED`.
- **Cancellation penalties:** `CANCELLED_AT_PICKUP` vs `CANCELLED` is tracked. But the backend does not automatically trigger the penalty fee deduction in the Wallet when this state is reached.

## 3. Concurrency Issues
- When a driver presses "Picked up Client A", the backend must update `trip.clients[0].status`. If the driver immediately presses "Picked up Client B", two parallel requests hit the server. Without `$elemMatch` atomic updates or MongoDB transactions, the second update will overwrite the first (lost update anomaly).
