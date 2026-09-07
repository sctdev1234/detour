# 🗺️ DETOUR.MA — CANONICAL API MAP & ENDPOINT DIRECTORY

> **Document Version**: 1.0.0  
> **Target**: detour.ma Backend Routes & Controllers

---

## 1. Canonical Endpoints (`/api/v2/trips`)

| HTTP Method | Route | Controller Method | Transactional Boundary | Outbox Event | Idempotency |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v2/trips/book-seat` | `CanonicalTripController.bookSeat` | Multi-Doc ACID (`journeyService.bookSeat`) | `passenger.booked` | Header: `Idempotency-Key` |
| `POST` | `/api/v2/trips/driver-arrive` | `CanonicalTripController.driverArrive` | Single-Doc (`journeyService.recordDriverArrived`) | `trip.driver_arrived` | Header: `Idempotency-Key` |
| `POST` | `/api/v2/trips/board-passenger` | `CanonicalTripController.boardPassenger` | Single-Doc (`journeyService.boardPassenger`) | `passenger.boarded` | Header: `Idempotency-Key` |
| `POST` | `/api/v2/trips/dropoff-passenger` | `CanonicalTripController.dropoffPassenger`| Multi-Doc ACID (`settlementService.settlePassengerJourney`) | `passenger.dropped_off` | Header: `Idempotency-Key` |
| `POST` | `/api/v2/trips/cancel-journey` | `CanonicalTripController.cancelJourney` | Multi-Doc ACID (`cancellationService.cancelJourney`) | `passenger.cancelled` | Header: `Idempotency-Key` |
| `POST` | `/api/v2/trips/no-show` | `CanonicalTripController.recordNoShow` | Multi-Doc ACID (`cancellationService.recordNoShow`) | `passenger.no_show` | Header: `Idempotency-Key` |
| `POST` | `/api/v2/trips/dispute` | `CanonicalTripController.openDispute` | Single-Doc (`journeyService.disputeJourney`) | `dispute.created` | Header: `Idempotency-Key` |
| `POST` | `/api/v2/trips/dispute/resolve`| `CanonicalTripController.resolveDispute` | Multi-Doc ACID (`disputeService.resolveDispute`) | `dispute.resolved` | Header: `Idempotency-Key` |
| `POST` | `/api/v2/trips/withdraw` | `CanonicalTripController.requestWithdrawal` | Multi-Doc ACID (`withdrawalService.requestWithdrawal`) | `withdrawal.requested` | Header: `Idempotency-Key` |
| `POST` | `/api/v2/trips/offers/:id/accept`| `CanonicalTripController.acceptOffer` | Multi-Doc ACID (`secondaryMarketplaceService.acceptOffer`) | `trip.assigned` | Header: `Idempotency-Key` |
| `GET` | `/api/v2/trips/active-state` | `CanonicalTripController.getActiveState` | Read-Only | None | N/A |

---

## 2. Legacy V1 Backward-Compatible Endpoints (`v1TripAdapter`)

| Legacy Route | Handled By | Canonical Delegation |
| :--- | :--- | :--- |
| `POST /api/routes/:id/join` | `v1TripAdapter.adaptJoinRequest` | Delegates to `journeyService.bookSeat` |
| `POST /api/trips/:id/verify-client` | `v1TripAdapter.adaptVerifyPassenger` | Delegates to `journeyService.boardPassenger` |
| `POST /api/trips/:id/finish` | `v1TripAdapter.adaptDropoffPassenger` | Delegates to `journeyService.dropoffPassenger` |
