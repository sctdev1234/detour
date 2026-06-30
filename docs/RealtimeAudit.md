# Realtime & Sockets Audit

This document fulfills Step 6 of the Deep Dive Audit.

## 1. Socket Architecture & Namespaces
The application initializes a single global Socket.IO instance in `backend/sockets/index.js` and does not utilize separate namespaces (e.g., `/driver`, `/passenger`, `/admin`). All connections hit the root `/` namespace.

**Rooms in use:**
- `reclamationId`: For support chat.
- `user:${userId}`: For direct user notifications (e.g., `driver_approaching`).
- `trip:${tripId}`: For broadcasting trip-wide updates to all passengers in a carpool.

## 2. Event Analysis

### Identified Events:
- `join_reclamation`, `leave_reclamation`
- `join_user`
- `join_trip`, `leave_trip`
- `driver_location_update`: Emitted by the driver's phone continuously. Re-broadcasts to `trip:${tripId}` and calculates proximity to pickup points.

### Missing Events / Edge Cases:
- **Authentication:** Sockets do not use a middleware for authentication (`io.use()`). A malicious actor could theoretically emit `join_user` with any `userId` and listen to that user's private notifications.
- **Offline Queuing:** If a driver loses connection, their `driver_location_update` events drop. There is no queueing or batching mechanism to sync the path once reconnected. The passenger sees the driver teleport.
- **Reconnection Logic:** Standard Socket.IO reconnection is used, but there is no state recovery protocol if a client misses a critical event (like `TRIP_STARTED`) while reconnecting.
- **Background Tracking:** The `driver_location_update` relies on the app being in the foreground. If the driver minimizes the app, the OS will pause the socket connection. Native background location services (like `expo-location` background tasks) are required to hit a REST endpoint or keep the socket alive.
