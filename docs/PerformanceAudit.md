# Performance & Scalability Audit

This document fulfills Step 13 of the Deep Dive Audit.

## 1. Frontend Performance (React Native / Expo)
- **Renders:** `Map.tsx` has historically been a performance bottleneck in React Native. The migration to use `AnimatedPolyline` with `react-native-reanimated` is a massive win. However, complex UIs stacked on top of the Map (`TripCardsOverlay`, `ActiveTripTracker`) might trigger unnecessary re-renders if their props aren't wrapped in `React.memo()`.
- **Bundle Size & Images:** Images in the `assets/` folder should be optimized (e.g., converted to WebP). The app uses `expo-image`, which is much faster and caches better than the standard `react-native` Image component.
- **State Management:** Zustand is used efficiently for `useAuthStore` and `useUIStore`. React Query is used for server state caching. This split correctly prevents global re-renders that Redux often causes.

## 2. Backend Performance (Node.js / Express)
- **Pagination:** Many endpoints (like `/api/trips`, `/api/users`) return raw arrays without pagination (`limit`, `skip`). This works in development but will crush the server memory when the database hits 10,000+ records. `mongoose-paginate-v2` or native skip/limit with cursors must be implemented.
- **N+1 Query Problem:** `populate()` is used in Mongoose to join collections (e.g., Populating `clients.userId` inside a Trip). If abused in list endpoints, this triggers massive N+1 lookups.
- **Caching:** There is no Redis caching layer. Frequently accessed static data (like configurations, places, or standard route estimates) hits the primary MongoDB instance every time.

## 3. Database Performance (MongoDB)
- **Missing Indexes:** As noted in the Database Audit, the lack of `2dsphere` indexes on geospatial coordinates forces MongoDB to perform full collection scans to find "nearby drivers". This is an $O(N)$ operation that will kill the DB CPU.
- **Connection Pooling:** Ensure `mongoose.connect` options define an appropriate connection pool size (`maxPoolSize: 100`) to handle concurrent bursts of traffic.

## 4. Network Optimization
- **Payload Size:** The backend often returns entire Mongoose documents (`res.json(trip)`), including internal fields like `__v` or `createdAt`, instead of a streamlined DTO (Data Transfer Object). This wastes bandwidth for mobile users on 3G/4G networks.
- **Gzip/Compression:** The Express server lacks the `compression` middleware, meaning JSON payloads are transmitted uncompressed.
