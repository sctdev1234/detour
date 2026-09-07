# 🔍 DETOUR.MA — PHASE 2 IMPLEMENTATION AUDIT REPORT

> **Document Version**: 1.0.0  
> **Evaluation**: Phase 2 Actual Code vs Approved Phase 2 Specification  
> **Status**: COMPLETED — HARDENING ROADMAP DEFINED

---

## 1. Requirement-by-Requirement Compliance Matrix (A through Z)

| Area | Component | Classification | Finding / Audit Detail | Action Required in Phase 3 |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `TripTemplate` | `[PASS]` | Segregated to driver recurring schedules. | Retain as recurring schedule blueprint. |
| **B** | `TripInstance` | `[PASS]` | Contains `segmentCapacity`, `driverId`, `vehicleId`, and canonical states. | Ensure index on `[scheduledDepartureTime, status]`. |
| **C** | `PassengerJourney` | `[PASS]` | Supports waypoints, OTP, paymentType, TaxSnapshot, and sub-journey lifecycle. | Add indexes on `[passengerId, status]`. |
| **D** | `RecurringRideRequest`| `[PASS]` | Dedicated model for passenger demand. | Wire into dispatch query. |
| **E** | `RideRequest` | `[PASS]` | Exists for on-demand passenger requests. | Ensure atomic conversion on Offer accept. |
| **F** | `Offer` | `[PASS]` | Exists with status state machine. | Guard against expired offer acceptance. |
| **G** | `FinancialJournal` | `[PASS]` | Groups double-entry debits/credits with pre-validate balancing hook. | Retain as immutable accounting group. |
| **H** | `FinancialLedgerEntry`| `[PASS]` | Immutable ledger entries across all 8 chart accounts in integer centimes. | Connect to wallet materialized views. |
| **I** | `TaxSnapshot` | `[PASS]` | Captures gross, tax strategy, rates, commission, net driver earnings. | Ensure persistence on settlement. |
| **J** | `IdempotencyKey` | `[PASS]` | Has requestHash, in-flight locks, TTL index, and cached responses. | Wire as express middleware on all mutations. |
| **K** | `OutboxEvent` | `[PASS]` | Captures aggregateType, eventType, payload within ACID transactions. | Implement background relay worker cron. |
| **L** | `Capacity Engine` | `[PASS]` | Calculates $N-1$ segments, validates intervals $[i, j-1]$, blocks overbooking. | Wrap inside atomic Mongo transaction locks. |
| **M** | `Escrow Engine` | `[PARTIAL]` | Handles digital holds & 50 MAD cash gate; needs cancellation release hooks. | Add refund & cancellation ledger operations. |
| **N** | `Settlement Engine` | `[PASS]` | Double-entry split for digital & cash commission with tax snapshots. | Wire into dropoff HTTP endpoints. |
| **O** | `Wallet Integration` | `[PARTIAL]` | Materialized balance views updated; need reconciliation check against ledger. | Add ledger-to-wallet reconciliation tool. |
| **P** | `V1 Adapter` | `[PARTIAL]` | Adapter exists; needs complete integration across legacy controller endpoints. | Wire into `controllers/tripController.js`. |
| **Q** | `MongoDB Indexes` | `[PARTIAL]` | Most models have 2dsphere; need to ensure GeoJSON coordinate order `[lng, lat]`. | Audit all geo queries across pipeline. |
| **R** | `MongoDB Transactions`| `[PASS]` | Session-based multi-document ACID transactions utilized in all core flows. | Maintain session propagation. |
| **S** | `Redis Integration` | `[PARTIAL]` | Socket.io supports Redis adapter; needs fallback to in-memory event bus. | Ensure graceful fallback when Redis offline. |
| **T** | `Event Architecture` | `[PARTIAL]` | DomainEventBus and Outbox exist; need unified typed event contracts. | Create `docs/EVENT_CONTRACTS.md`. |
| **U** | `Lifecycle Transitions`| `[PASS]` | State machines protect illegal transitions (e.g. no double boarding/dropoff). | Enforce at service layer. |
| **V** | `Cancellation Engine` | `[MISSING]` | Dedicated cancellation calculator with timing tiers needs dedicated service. | Implement `services/cancellationService.js`. |
| **W** | `Dispute Engine` | `[PARTIAL]` | `DisputeRecord` model exists; needs admin resolution settlement service. | Implement `services/disputeService.js`. |
| **X** | `Recurring Scheduler` | `[FAIL]` | References undefined variable `instance` instead of `generatedInstance`. | Fix scheduler bug in `recurringScheduler.js`. |
| **Y** | `Cash Booking` | `[PASS]` | 50 MAD driver balance check + exact calculated commission escrow pre-debit. | Fully verified in unit test suite. |
| **Z** | `Digital Booking` | `[PASS]` | Passenger balance check + full fare escrow hold inside transaction. | Fully verified in unit test suite. |

---

## 2. Critical Defects Identified & Fix Roadmap

1. **`recurringScheduler.js`**: Variable reference bug on lines 137-143 (`instance` $\rightarrow$ `generatedInstance`) and import path.
2. **`dispatchListeners.js`**: Replaced inverted GeoJSON coordinates $[0]$ (lng) and $[1]$ (lat) when passing to distance calculations.
3. **`cancellationService.js`**: Implement canonical timing windows ($>24\text{h}$, $2-24\text{h}$, $<2\text{h}$, no-show) with double-entry ledger entries.
4. **`disputeService.js`**: Implement admin adjudication logic (Client Refund, Driver Payout, Custom Split) with double-entry ledger entries.
5. **`withdrawalService.js`**: Implement 50 MAD minimum withdrawal gate, atomic balance deduction, and approval/rejection lifecycle.
6. **V1 Adapter Routing**: Wire legacy endpoints (`POST /api/routes/:id/join`, `POST /api/trips/:id/verify-client`, `POST /api/trips/:id/finish`) through `v1TripAdapter`.
