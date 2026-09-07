# 📡 DETOUR.MA — EVENT CONTRACTS SPECIFICATION

> **Standard Envelope Format**:
> All domain and outbox events adhere to the strict JSON contract:

```json
{
  "eventId": "ObjectId / UUID",
  "eventType": "string (e.g. passenger.boarded)",
  "aggregateType": "string (e.g. PASSENGER_JOURNEY)",
  "aggregateId": "ObjectId",
  "occurredAt": "ISO-8601 Timestamp",
  "schemaVersion": "1.0.0",
  "payload": {}
}
```

---

## Registered Event Contracts

| Event Name | Aggregate Type | Payload Shape |
| :--- | :--- | :--- |
| `passenger.booked` | `PASSENGER_JOURNEY` | `{ journeyId, tripInstanceId, passengerId, fareAmountMad, paymentType }` |
| `trip.driver_arrived` | `PASSENGER_JOURNEY` | `{ journeyId, tripInstanceId, passengerId }` |
| `passenger.boarded` | `PASSENGER_JOURNEY` | `{ journeyId, tripInstanceId, passengerId }` |
| `passenger.dropped_off` | `PASSENGER_JOURNEY` | `{ journeyId, tripInstanceId, passengerId, taxSnapshot }` |
| `passenger.cancelled` | `PASSENGER_JOURNEY` | `{ journeyId, tripInstanceId, cancelledBy, refundAmountMad, driverCompensationMad }` |
| `passenger.no_show` | `PASSENGER_JOURNEY` | `{ journeyId, tripInstanceId, driverCompensationMad }` |
| `dispute.created` | `DISPUTE` | `{ disputeId, journeyId, tripInstanceId }` |
| `dispute.resolved` | `DISPUTE` | `{ disputeId, journeyId, status, refundAmountMad, driverPayoutMad }` |
| `withdrawal.requested` | `WITHDRAWAL` | `{ withdrawalId, driverId, amountMad }` |
| `withdrawal.rejected` | `WITHDRAWAL` | `{ withdrawalId, driverId, reason }` |
| `withdrawal.payout_completed` | `WITHDRAWAL` | `{ withdrawalId, driverId, amount, transactionRef }` |
| `trip.assigned` | `TRIP_INSTANCE` | `{ tripInstanceId, assignmentId, driverId, passengerId, journeyId, fareAmountMad }` |
