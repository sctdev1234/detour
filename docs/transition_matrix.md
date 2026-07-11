# Platform State Transition Matrix

This document catalogs every state machine, its complete transition matrix, and strict guards.

## 1. Trip Lifecycle (`TripStateMachine`)
Governs the core progression of a `TripInstance`.

| Current State | Allowed Next States | Terminal | Description |
|---|---|---|---|
| **DRAFT** (Initial) | `SEARCHING`, `CANCELLED` | No | Instantiated by recurring scheduler or draft passenger booking. |
| **SEARCHING** | `OFFERS_OPEN`, `CANCELLED` | No | Actively running through dispatch matching pipeline. |
| **OFFERS_OPEN** | `ASSIGNED`, `SEARCHING`, `CANCELLED` | No | Offers sent to candidates; awaiting driver acceptance. |
| **ASSIGNED** | `EN_ROUTE`, `CANCELLED` | No | Driver accepted; Trip assigned to driver. |
| **EN_ROUTE** | `ARRIVED`, `CANCELLED` | No | Driver is navigating to pickup. |
| **ARRIVED** | `BOARDED`, `CANCELLED` | No | Driver arrived at pickup location. |
| **BOARDED** | `STARTED`, `CANCELLED` | No | Passenger is in the vehicle. |
| **STARTED** | `COMPLETED`, `CANCELLED` | No | Trip is physically in progress towards destination. |
| **COMPLETED** (Terminal)| None | Yes | Successfully reached destination and settled. |
| **CANCELLED** (Terminal)| None | Yes | Aborted at any non-terminal stage. |

## 2. Offer Lifecycle (`OfferStateMachine`)
Governs the negotiation of a dispatch `Offer`.

| Current State | Allowed Next States | Terminal | Description |
|---|---|---|---|
| **PENDING** (Initial) | `ACCEPTED`, `REJECTED`, `EXPIRED`, `WITHDRAWN`, `COUNTER_OFFERED` | No | Initial dispatch offer sent to driver. |
| **COUNTER_OFFERED** | `ACCEPTED`, `REJECTED`, `EXPIRED`, `WITHDRAWN`, `COUNTER_OFFERED` | No | Driver or passenger counter-proposed a price. |
| **ACCEPTED** (Terminal) | None | Yes | Accepted by driver. |
| **REJECTED** (Terminal) | None | Yes | Explicitly declined by driver. |
| **EXPIRED** (Terminal) | None | Yes | TTL elapsed with no response. |
| **WITHDRAWN** (Terminal) | None | Yes | Revoked by passenger or dispatch engine (e.g. another driver accepted). |

## 3. Driver Availability Lifecycle
Governs `User.driverStatus`.

| Current State | Allowed Next States | Terminal | Description |
|---|---|---|---|
| **OFFLINE** (Initial) | `ONLINE` | No | Driver is not receiving dispatch offers. |
| **ONLINE** | `OFFLINE`, `BUSY`, `BREAK` | No | Driver is available for matching. |
| **BUSY** | `ONLINE`, `OFFLINE` | No | Driver is currently executing a trip. |
| **BREAK** | `ONLINE`, `OFFLINE` | No | Driver is on a temporary pause but intends to return. |

## 4. Transaction / Finance Lifecycle
Governs wallet transactions and `TripInstance.financialStatus`.

| Current State | Allowed Next States | Terminal | Description |
|---|---|---|---|
| **UNSETTLED** (Initial) | `HOLD_PENDING`, `SETTLED`, `CANCELLED` | No | Trip created, payment not processed. |
| **HOLD_PENDING** | `HELD`, `FAILED`, `CANCELLED` | No | Authorization hold requested (credit card). |
| **HELD** | `SETTLED`, `REFUNDED` | No | Funds authorized. |
| **SETTLED** (Terminal) | `REFUNDED` | Yes* | Funds transferred to driver wallet. (*Can be transitioned to REFUNDED exceptionally). |
| **REFUNDED** (Terminal) | None | Yes | Reversed back to passenger. |
| **FAILED** (Terminal) | `UNSETTLED`, `CANCELLED` | No | Hold or capture failed. Can retry. |
| **CANCELLED** (Terminal) | None | Yes | Trip aborted before settlement. |

## 5. Recurring Template Lifecycle
Governs `TripTemplate.status`.

| Current State | Allowed Next States | Terminal | Description |
|---|---|---|---|
| **ACTIVE** (Initial) | `PAUSED`, `CANCELLED` | No | Template is actively generating trip instances. |
| **PAUSED** | `ACTIVE`, `CANCELLED` | No | Temporarily suspended (e.g. vacation mode). |
| **EXPIRED** (Terminal) | None | Yes | End date passed. |
| **CANCELLED** (Terminal) | None | Yes | Permanently disabled by user. |

## 6. Withdrawal Lifecycle
Governs `Transaction` (category: withdrawal).

| Current State | Allowed Next States | Terminal | Description |
|---|---|---|---|
| **pending** (Initial) | `approved`, `rejected` | No | Withdrawal requested by driver, funds escrowed. |
| **approved** (Terminal) | None | Yes | Funds dispatched by admin. |
| **rejected** (Terminal) | None | Yes | Request denied, funds returned to wallet. |
