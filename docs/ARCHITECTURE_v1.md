# Detour.ma — ARCHITECTURE_v1.md (Source of Truth)

This document is the **immutable source of truth** for the Detour.ma platform architecture. Future sprints may extend this architecture but must not redefine core domains unless an explicit architecture review is approved. Architecture drift is strictly prohibited.

---

## 1. DOMAIN-DRIVEN STRUCTURE

The platform is organized into distinct **Domains**, rather than user roles (Passenger, Driver, Admin are consumers of these domains).

1. **Identity Domain**: User authentication, profiles, verification, preferences.
2. **Trip Domain**: Intent (Templates) and Execution (Instances, Assignments).
3. **Dispatch Domain**: Matching Engine, Offers, Service Orchestration.
4. **Pricing Domain**: Quotes, peak pricing, promotions, coupons.
5. **Finance Domain**: Ledger-based wallet balances, commissions, transactions.
6. **Location Domain**: Proximity tracking, Geolocation updates, routing.
7. **Communication Domain**: Chat, disputes, support.
8. **Recurring Mobility Domain**: Background scheduling, cron generation.
9. **Analytics Domain**: Telemetry, metrics, KPIs.
10. **Operations Domain**: Administrative controls, system configurations.

---

## 2. THE TRIP DOMAIN (Unified Ride Architecture)

**We do not duplicate ride models.** The system relies entirely on a linear flow:
`TripTemplate` → `TripInstance` → `TripAssignment`

### A. TripTemplate
Defines the spatial intent and the temporal strategy. It does not execute.
- **SchedulingStrategy**: `IMMEDIATE`, `SCHEDULED`, `RECURRING`.
- **Properties**: `startPoint`, `endPoint`, `waypoints`, `schedulingStrategy`, `scheduleConfig`.

### B. TripInstance
Exactly one executable ride occurrence. **Owns the entire ride lifecycle.**
- **Properties**: `scheduledTime`, `pickup`, `destination`, `waypoints`, `seatCapacity`, `reservedSeats`, `passengerIds[]`, `pricingSnapshot`, `assignmentId`, `status`.
- **Status Machine**: `DRAFT` → `SEARCHING` → `OFFERS_OPEN` → `ASSIGNED` → `EN_ROUTE` → `ARRIVED` → `BOARDED` → `STARTED` → `COMPLETED` → `CANCELLED`.
- *Note: Multi-passenger rides simply involve pushing to `passengerIds[]` and updating `reservedSeats`.*

### C. TripAssignment (Lightweight)
Owns the specific relationship between the Driver, Vehicle, and TripInstance.
- **Properties**: `tripInstanceId`, `driverId`, `vehicleId`, `assignedAt`.

---

## 3. THE DISPATCH DOMAIN

**Dispatch is a Service, not a Database Entity.** It coordinates `TripInstance`, `Offer`, `Assignment`, `Notifications`, and `Matching`.

### A. Offer (First-Class Domain Object)
A discrete, negotiable proposal connecting a driver to a passenger's trip.
- **Properties**: `id`, `tripInstanceId`, `driverId`, `passengerId`, `vehicleId`, `price`, `estimatedArrival`, `estimatedDuration`, `expiresAt`, `status`.
- **Advanced Fields**: `counterOfferHistory`, `negotiationHistory`.
- **Future Support**: AI pricing, automatic negotiation, multi-driver bidding.

### B. Matching Engine Pipeline
Matching is an independently testable pipeline.
1. `Candidate Discovery`: Geospatial query.
2. `Eligibility Filter`: Driver verification status.
3. `Distance Filter`: Within expanding radius.
4. `Vehicle Filter`: Matches trip requirements.
5. `Seat Availability`: `seatsAvailable >= reservedSeats`.
6. `Driver Verification`: Active, verified.
7. `Preference Matching`: Ratings, gender preferences.
8. `Scoring`: Rank best candidates.
9. `Offer Generation`: Create Offer objects.
10. `Dispatch`: Publish events.

---

## 4. INDEPENDENT DOMAIN SERVICES

### A. Pricing Engine
- **Independent Service**: Dispatch *requests* pricing; Dispatch *never calculates* pricing.
- **Future Support**: Peak pricing, Promotions, Recurring discounts, Corporate pricing, Coupons, Loyalty.

### B. Notification Engine
- **Event-Driven**: Dispatch publishes domain events (`OfferSent`). The Notification Engine decides delivery (Socket, Push, SMS, Email).
- No notification transport logic exists inside Dispatch.

---

## 5. FINANCE DOMAIN (Ledger-Based Model)
Wallet balances must **never** be updated directly via basic overrides (e.g., `wallet += amount`).
- **Ledger Model**: Every balance change requires an immutable ledger transaction.
- **Support**: Trip earnings, Commissions, Refunds, Withdrawals, Bonuses, Adjustments.
- Balances are derived by summing the ledger entries.

---

## 6. IDENTITY & DRIVER MODEL
Driver state is deeply separated to prevent overloaded status fields.
- **Presence**: `ONLINE` | `OFFLINE`
- **Availability**: `AVAILABLE` | `BUSY` | `BREAK`
- **Trip Status**: `NONE` | `TO_PICKUP` | `ACTIVE`
- **Verification**: `PENDING` | `APPROVED` | `SUSPENDED` | `BLOCKED`

---

## 7. RECURRING MOBILITY DOMAIN
Recurring rides reuse the standard Dispatch Engine perfectly.
- **Flow**: `TripTemplate` → `Background Scheduler` → `TripInstance` → `Dispatch` → `Offer` → `Assignment`.
- No special dispatch paths are built for recurring logic. It behaves exactly like a scheduled ride once the instance is generated.

---

## 8. OBSERVABILITY & EVENTS
Every domain publishes structured domain events.
- **Events**: `TripCreated`, `OfferSent`, `OfferAccepted`, `DriverAssigned`, `TripStarted`, `TripCompleted`, `PaymentCompleted`, `RideCancelled`.
- **Consumers**: These events feed Logs, Analytics, Notifications, and Audit trails.

---

## 9. ARCHITECTURAL PRINCIPLES
1. **Single Source of Truth**: Data is never duplicated.
2. **Explicit State Machines**: Invalid transitions must throw system errors.
3. **Independent Domain Services**: Loose coupling, high cohesion.
4. **Composition over Inheritance**.
5. **Event-Driven**: Asynchronous pub/sub where appropriate.
6. **Backward-Compatible Migrations**: Database changes must not break older app versions.
7. **Feature Flags**: Guard incomplete capabilities (like AI Negotiation).

=========================================================
*End of ARCHITECTURE_v1.md*
