# Database Architecture Audit

This document fulfills Step 5 of the Deep Dive Audit.

## 1. Collections & Schema

The MongoDB database currently holds 16 collections:
`Car`, `Chat`, `Coupon`, `JoinRequest`, `Notification`, `Page`, `Place`, `Reclamation`, `Review`, `Route`, `SavedPlace`, `Subscription`, `Transaction`, `Trip`, `User`, `Withdrawal`.

### Schema Design & Findings
- **Data Normalization vs Embedding:** The `Trip` model embeds `clients` directly inside it (as an array of subdocuments containing `userId`, `routeId`, `price`, and `status`). This is generally an efficient read pattern for ride-sharing but requires complex `$set` aggregations to update a specific client's status safely without race conditions.
- **Enums:** Status enums are extensively used (e.g., `['CREATED', 'PENDING', 'FULL', ...]` for Trips). However, these enums are hardcoded directly into the Mongoose schema instead of being exported from a central `constants.js` file, leading to potential mismatches between the DB and the Frontend logic.
- **Soft Deletes:** `isDeleted: { type: Boolean, default: false }` is present in models like `Trip`. However, most queries in controllers (e.g. `Trip.find()`) do not automatically append `{ isDeleted: false }`. This means deleted trips might still appear in list endpoints.

## 2. Indexing Strategy

### Existing Indexes
- `TripSchema.index({ driverId: 1, status: 1 });`
- `TripSchema.index({ 'clients.userId': 1, status: 1 });`

### Missing / Required Indexes
- **Geospatial Indexes:** `Route` and `SavedPlace` models are used for location tracking and searching, but they do NOT have a `2dsphere` index defined natively in Mongoose (`schema.index({ location: "2dsphere" })`). This makes `$near` and `$geoWithin` queries highly inefficient (requiring full collection scans).
- **Unique Constraints:** The `User` model handles authentication, but explicit `unique: true` indexes on `email` and `phone` need to be verified at the MongoDB level to prevent race conditions during concurrent signups.
- **TTL Indexes:** `Notification` and `JoinRequest` models should implement TTL (Time-to-Live) indexes to automatically expire and delete old records, preventing database bloat. Currently, they accumulate forever.

## 3. Data Integrity & Transactions
- **Orphaned Records:** Deleting a `User` does not cascade to delete their `Cars`, `Trips`, or `Routes`. A pre-remove Mongoose hook or background job is required to maintain referential integrity.
- **Transactions:** Financial models (`Transaction`, `Withdrawal`, `Wallet` balances on `User`) are modified across different collections. MongoDB 4.0+ multi-document transactions are NOT being used, creating severe risks of financial data corruption.
