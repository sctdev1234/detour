# 📦 DETOUR.MA — LEGACY DATA MIGRATION PLAN (V1 $\rightarrow$ V2)

> **Document Version**: 1.0.0  
> **Status**: APPROVED MIGRATION SPECIFICATION  
> **Safety Class**: Non-Destructive, Idempotent, Auditable

---

## 1. Mapping Strategy

| Source (Legacy V1) | Target (Canonical V2) | Field Mappings | Preservation & Metadata |
| :--- | :--- | :--- | :--- |
| `Route` | `TripTemplate` (Recurring) & `TripInstance` (Ad-hoc) | `startPoint` $\rightarrow$ `origin`<br>`endPoint` $\rightarrow$ `destination`<br>`waypoints` $\rightarrow$ `waypoints`<br>`seats` $\rightarrow$ `seatCapacity` | `_migrationMeta.legacyId = Route._id`<br>`_migrationMeta.sourceCollection = 'Route'` |
| `Trip` | `TripInstance` | `routeId` $\rightarrow$ `templateId`<br>`driverId` $\rightarrow$ `driverId`<br>`status` $\rightarrow$ mapped canonical status | `_migrationMeta.legacyId = Trip._id` |
| `JoinRequest` | `PassengerJourney` | `userId` $\rightarrow$ `passengerId`<br>`routeId` $\rightarrow$ `tripInstanceId`<br>`seats` $\rightarrow$ `seatsBooked`<br>`status` $\rightarrow$ mapped status | `_migrationMeta.legacyId = JoinRequest._id` |
| `Route.clients[]` | `PassengerJourney` | `userId` $\rightarrow$ `passengerId`<br>`status` $\rightarrow$ mapped status | `_migrationMeta.legacyType = 'Route.clients'` |

---

## 2. Idempotent Migration Script Architecture

```javascript
// scripts/migrateV1ToV2.js (dry-run & execution)
// 1. Checks if document already migrated via _migrationMeta.legacyId
// 2. Uses atomic upsert ($setOnInsert)
// 3. Verifies segment capacity initialization for historical routes
// 4. Generates migration audit log with total processed, skipped, and inserted counts
```

---

## 3. Rollback & Audit Strategy

1. **Zero Deletions**: Legacy `routes`, `trips`, and `joinrequests` collections remain read-only during transitional period.
2. **Reversibility**: Any canonical document produced by migration can be identified via `_migrationMeta.sourceCollection`.
