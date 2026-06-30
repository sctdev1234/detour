# Architecture Overview

## High-Level Design
The Detour application operates on a decoupled architecture comprising a mobile frontend (React Native with Expo) and a monolithic backend API (Node.js with Express and MongoDB). The system leverages HTTP for standard CRUD operations and Socket.IO for realtime ride tracking and communication.

## Frontend Architecture (React Native / Expo)
The frontend relies heavily on modern React conventions and state management systems:
- **Navigation:** Handled by Expo Router with distinct segments for `(client)`, `(driver)`, `(auth)`, and `(admin)` to enforce route-based access control.
- **Server-State:** Powered by React Query for optimized caching, deduplication, and automatic retries.
- **Client-State:** Powered by Zustand for lightweight UI and local authentication state without heavy context prop drilling.

## Backend Architecture (Node.js / Express)
The backend enforces a strict separation of concerns via standard Controller-Service-Repository patterns:
- **Routes Layer:** Handles HTTP definitions, middleware application, and rate-limiting.
- **Controller Layer:** Coordinates responses, handles input extraction, and calls the appropriate services.
- **Service Layer:** Executes domain-specific business logic (e.g., verifying user OTPs, calculating ride fares).
- **Repository Layer:** Encapsulates direct database operations, providing a standardized API over Mongoose models.

## Realtime Architecture (Socket.IO)
- **Namespaces:** Realtime events are segregated.
- **Rooms:** Ride tracking uses a room-based design where drivers broadcast telemetry data to specific `tripId` rooms that passengers subscribe to.
- **Connection Management:** Features ping/pong heartbeat tracking to identify disconnects and trigger automatic client-side reconnection attempts.
