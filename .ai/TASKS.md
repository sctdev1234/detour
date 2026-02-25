# TASKS.md — Detour.ma Full Development Task Breakdown

> Generated from [/.ai/PROMPT.md](/.ai/PROMPT.md). Every requirement, rule, constraint, and instruction is included.

---

## SECTION 1: PROJECT SETUP & ARCHITECTURE

### TASK-001: Project Repository Initialization
- **Title**: Initialize monorepo structure
- **Description**: Create the root project repository with three sub-projects: `backend`, `frontend`, `admin-panel`. Configure shared tooling (ESLint, Prettier, Git hooks).
- **Files**: `package.json`, `.gitignore`, `.eslintrc`, `.prettierrc`, `README.md`
- **Dependencies**: None
- **Steps**:
  1. Create root directory `detour-new/`
  2. Initialize `package.json` at root with workspaces for `backend`, `frontend`, `admin-panel`
  3. Add `.gitignore` for Node, Expo, Vite artifacts
  4. Add shared ESLint and Prettier configs
  5. Create `/.ai/PROMPT.md` reference and `logo.png` placeholder

### TASK-002: Backend Project Initialization
- **Title**: Initialize Node.js/Express backend
- **Description**: Set up the backend with Express, MongoDB (Mongoose), Socket.IO, JWT, Google Cloud Storage, Joi validation, and cron job support.
- **Files**: `backend/package.json`, `backend/server.js`, `backend/.env.example`, `backend/config/`
- **Dependencies**: TASK-001
- **Steps**:
  1. `npm init` in `backend/`
  2. Install: `express`, `mongoose`, `socket.io`, `jsonwebtoken`, `@google-cloud/storage`, `joi`, `node-cron`, `bcrypt`, `cors`, `dotenv`, `helmet`, `morgan`
  3. Create `server.js` entry point with Express + Socket.IO setup
  4. Create `config/db.js` for MongoDB connection
  5. Create `config/socket.js` for Socket.IO initialization
  6. Create `config/gcs.js` for Google Cloud Storage
  7. Create `.env.example` with all required env vars (DB_URI, JWT_SECRET, GCS_BUCKET, STRIPE_KEY, PAYPAL_KEY, etc.)

### TASK-003: Frontend Project Initialization
- **Title**: Initialize Expo React Native frontend
- **Description**: Set up the frontend with Expo, React Native, TailwindCSS (NativeWind), React Navigation, Redux Toolkit, Socket.IO client, i18n, and maps (expo-maps for iOS/Android, Leaflet for web).
- **Files**: `frontend/package.json`, `frontend/app.json`, `frontend/App.tsx`, `frontend/tailwind.config.js`
- **Dependencies**: TASK-001
- **Steps**:
  1. Initialize Expo project in `frontend/` with TypeScript template
  2. Install: `nativewind`, `tailwindcss`, `@reduxjs/toolkit`, `react-redux`, `socket.io-client`, `i18next`, `react-i18next`, `expo-location`, `react-native-maps`, `react-leaflet`, `leaflet`, `expo-notifications`, `expo-haptics`
  3. Configure TailwindCSS with NativeWind
  4. Configure Redux Toolkit store
  5. Configure i18n with English (default), French, Arabic support
  6. Configure React Navigation with expo-router

### TASK-004: Admin Panel Project Initialization
- **Title**: Initialize Vite React admin panel
- **Description**: Set up the admin panel with Vite, React, TailwindCSS, Socket.IO client, and Leaflet maps.
- **Files**: `admin-panel/package.json`, `admin-panel/vite.config.ts`, `admin-panel/tailwind.config.js`
- **Dependencies**: TASK-001
- **Steps**:
  1. `npx -y create-vite@latest ./` in `admin-panel/` with React TypeScript template
  2. Install: `tailwindcss`, `postcss`, `autoprefixer`, `socket.io-client`, `react-leaflet`, `leaflet`, `axios`, `react-router-dom`
  3. Configure TailwindCSS
  4. Configure routing with `react-router-dom`
  5. Configure Socket.IO client connection

### TASK-005: Backend Folder Structure
- **Title**: Create backend directory architecture
- **Description**: Establish the backend folder structure with models, controllers, routes, middleware, services, cron, tracking, utils, and config directories.
- **Files**: All directories under `backend/`
- **Dependencies**: TASK-002
- **Steps**:
  1. Create `backend/models/` — Mongoose schemas
  2. Create `backend/controllers/` — Request handlers
  3. Create `backend/routes/` — Express route definitions
  4. Create `backend/middleware/` — Auth (JWT), Validation (Joi)
  5. Create `backend/services/` — Business logic
  6. Create `backend/cron/` — Scheduled tasks
  7. Create `backend/tracking/` — Real-time driver location
  8. Create `backend/utils/` — Helpers (error handling, response formatting)
  9. Create `backend/config/` — DB, Socket, GCS, payment configs
  10. Create `backend/validators/` — Joi validation schemas

### TASK-006: Frontend Folder Structure
- **Title**: Create frontend directory architecture
- **Description**: Establish the Expo frontend folder structure using file-based routing with route groups.
- **Files**: All directories under `frontend/`
- **Dependencies**: TASK-003
- **Steps**:
  1. Create `frontend/app/(onboarding)/` — Onboarding screens
  2. Create `frontend/app/(auth)/` — Auth screens (login, register, forgot-password, reset-password)
  3. Create `frontend/app/(tasks)/` — Task screens (driver/client onboarding tasks)
  4. Create `frontend/app/(client)/` — Client main screens
  5. Create `frontend/app/(driver)/` — Driver main screens (find-clients, cars, verification)
  6. Create `frontend/app/chat/`, `coupons/`, `subscriptions/`, `places/`, `requests/`, `reclamations/`, `notifications/`, `transactions/`, `ratings/`, `reviews/`, `routes/`, `trips/`, `dashboard/`
  7. Create `frontend/app/profile/`, `edit-profile/`, `change-password/`, `delete-account/`
  8. Create `frontend/app/terms-and-conditions/`, `privacy-policy/`, `contact-us/`, `about-us/`, `help/`, `faq/`
  9. Create `frontend/components/` — Reusable components (Map, MapLeaflet, modals, etc.)
  10. Create `frontend/store/` — Redux slices
  11. Create `frontend/hooks/` — Custom hooks (useSocket, useCountdown, etc.)
  12. Create `frontend/services/` — API service layer
  13. Create `frontend/i18n/` — Translation files (en.json, fr.json, ar.json)
  14. Create `frontend/assets/` — Images, fonts, icons

### TASK-007: Admin Panel Folder Structure
- **Title**: Create admin panel directory architecture
- **Description**: Establish the admin panel folder structure with pages, components, services, and utils.
- **Files**: All directories under `admin-panel/`
- **Dependencies**: TASK-004
- **Steps**:
  1. Create `admin-panel/src/pages/` — All admin pages
  2. Create `admin-panel/src/components/` — Reusable components (Sidebar, DataTable, Map, Modal, etc.)
  3. Create `admin-panel/src/services/` — API service layer
  4. Create `admin-panel/src/hooks/` — Custom hooks
  5. Create `admin-panel/src/utils/` — Helpers
  6. Create `admin-panel/src/layouts/` — Admin layout with sidebar

---

## SECTION 2: BACKEND MODELS (CRUDs)

### TASK-008: User Model
- **Title**: Create User Mongoose model
- **Description**: Define User schema with fields for authentication, profile, role (client/driver/admin), wallet balance, ratings, reviews, documents, GPS status, offline contact info, language preference, and account status.
- **Files**: `backend/models/User.js`
- **Dependencies**: TASK-005
- **Steps**:
  1. Define schema fields: `name`, `email`, `password` (hashed), `phone`, `role` (enum: client, driver, admin), `avatar`, `language` (default: 'en'), `walletBalance` (default: 0), `credits` (default: 20 MAD for new users after tasks), `isVerified`, `isApproved` (for drivers), `documents` (CIN front/back, driving license front/back, car registration, face selfie), `gpsEnabled`, `offlineContactInfo`, `rating`, `totalRatings`, `isOnline`, `lastSeen`, `fcmToken`, `createdAt`, `updatedAt`
  2. Add pre-save hook for password hashing with bcrypt
  3. Add method `comparePassword()`
  4. Add method `generateAuthToken()` using JWT
  5. Add indexes on `email`, `phone`, `role`
  6. Implement 20 MAD credits gift logic: after user completes onboarding tasks, credit 20 MAD to `walletBalance`

### TASK-009: Car Model
- **Title**: Create Car Mongoose model
- **Description**: Define Car schema for driver vehicles with make, model, year, color, plate number, seats, photos, and default flag.
- **Files**: `backend/models/Car.js`
- **Dependencies**: TASK-005
- **Steps**:
  1. Define schema fields: `driver` (ref: User), `make`, `model`, `year`, `color`, `plateNumber`, `seats` (number of available places), `photos` (array of GCS URLs), `isDefault` (boolean), `isApproved`, `createdAt`, `updatedAt`
  2. Add validation: driver role must be 'driver'
  3. Add index on `driver`

### TASK-010: Chat Model
- **Title**: Create Chat/Message Mongoose model
- **Description**: Define Chat schema for messaging between drivers and clients, with support for text, images, and system messages.
- **Files**: `backend/models/Chat.js`
- **Dependencies**: TASK-005
- **Steps**:
  1. Define Chat schema: `participants` (array of User refs), `lastMessage`, `updatedAt`
  2. Define Message sub-schema or separate model: `chat` (ref: Chat), `sender` (ref: User), `content`, `type` (text/image/system), `readBy` (array of User refs), `createdAt`
  3. Add indexes on `participants`, `chat`

### TASK-011: Coupon Model
- **Title**: Create Coupon Mongoose model
- **Description**: Define Coupon schema for discount management with code, type (percentage/fixed), value, expiry, usage limits, and applicable users.
- **Files**: `backend/models/Coupon.js`
- **Dependencies**: TASK-005
- **Steps**:
  1. Define schema fields: `code` (unique), `type` (enum: percentage, fixed), `value`, `expiryDate`, `maxUsage`, `currentUsage`, `applicableRoles` (client/driver/all), `isActive`, `createdAt`
  2. Add validation for expiry date and usage limits
  3. Add unique index on `code`

### TASK-012: Request Model
- **Title**: Create Request Mongoose model
- **Description**: Define Request model for driver-to-client ride requests. Driver sends a request to a client's route with a proposed price. Also used for driver-to-admin document approval requests.
- **Files**: `backend/models/Request.js`
- **Dependencies**: TASK-005
- **Steps**:
  1. Define schema fields: `type` (enum: 'trip_request', 'driver_approval'), `sender` (ref: User — driver), `receiver` (ref: User — client or admin), `route` (ref: Route — client's route), `driverRoute` (ref: Route — driver's route), `trip` (ref: Trip), `proposedPrice`, `status` (enum: pending, accepted, rejected, cancelled), `reason` (for rejection/cancellation), `createdAt`, `updatedAt`
  2. Add indexes on `sender`, `receiver`, `route`, `status`
  3. On accept: trigger adding client to trip, change client route status to 'active'

### TASK-013: Notification Model
- **Title**: Create Notification Mongoose model
- **Description**: Define Notification schema for in-app alerts with support for push notifications (vibrate and sound) targeting both online and offline users.
- **Files**: `backend/models/Notification.js`
- **Dependencies**: TASK-005
- **Steps**:
  1. Define schema fields: `user` (ref: User), `title`, `body`, `type` (enum: trip_start, pickup, dropoff, cancellation, payment, system, request, rating, etc.), `data` (mixed — additional context), `isRead`, `createdAt`
  2. Add index on `user`, `isRead`
  3. Implement push notification sending (FCM or Expo Push) that wakes up the user regardless of online/offline status with notification, vibrate, and sound

### TASK-014: Place Model
- **Title**: Create Place Mongoose model
- **Description**: Define Place schema for saved locations/points of interest with name, coordinates, address, and user reference.
- **Files**: `backend/models/Place.js`
- **Dependencies**: TASK-005
- **Steps**:
  1. Define schema fields: `user` (ref: User), `name`, `address`, `location` (GeoJSON Point: `type`, `coordinates` [lng, lat]), `isPublic` (boolean — admin-managed public places), `createdAt`
  2. Add 2dsphere index on `location`
  3. Add index on `user`

### TASK-015: Reclamation Model
- **Title**: Create Reclamation Mongoose model
- **Description**: Define Reclamation schema for user disputes and issues, with subject, description, status, and admin response.
- **Files**: `backend/models/Reclamation.js`
- **Dependencies**: TASK-005
- **Steps**:
  1. Define schema fields: `user` (ref: User), `trip` (ref: Trip, optional), `subject`, `description`, `attachments` (array of GCS URLs), `status` (enum: pending, in_progress, resolved, rejected), `adminResponse`, `createdAt`, `updatedAt`
  2. Add index on `user`, `status`

### TASK-016: Route Model
- **Title**: Create Route Mongoose model
- **Description**: Define Route schema for geographic routes. Both drivers and clients create routes. Client routes have proposed price. Driver routes have additional fields (price type, car assignment, time end). Route status transitions: pending → active → completed/cancelled.
- **Files**: `backend/models/Route.js`
- **Dependencies**: TASK-005
- **Steps**:
  1. Define schema fields: `user` (ref: User), `userRole` (enum: client, driver), `startPoint` (GeoJSON Point + address), `endPoint` (GeoJSON Point + address), `waypoints` (array of GeoJSON Points), `timeStart` (time of day), `timeEnd` (time of day, driver only, optional — used to determine if driver can send requests to new clients or will be late), `daysOfRepeat` (array of enum: Mon-Sun), `proposedPrice` (client sets this), `priceType` (driver only: enum: fixed, per_km), `price` (driver only: fixed price or per-km rate), `car` (ref: Car, driver only — owned car or affected car from another driver), `placesNeeded` (number of seats needed by client), `totalPlaces` (number of available places for driver), `status` (enum: pending, active, completed, cancelled — starts as 'pending'), `trip` (ref: Trip, set when linked), `createdAt`, `updatedAt`
  2. Add 2dsphere indexes on `startPoint.location` and `endPoint.location`
  3. Add indexes on `user`, `status`, `userRole`
  4. When driver creates a route, system auto-creates an empty pending Trip (TASK-019)
  5. When client route status changes to 'active' (request accepted), link to trip

### TASK-017: Subscription Model
- **Title**: Create Subscription Mongoose model
- **Description**: Define Subscription schema for user tiers/plans.
- **Files**: `backend/models/Subscription.js`
- **Dependencies**: TASK-005
- **Steps**:
  1. Define schema fields: `user` (ref: User), `plan` (name/tier), `price`, `startDate`, `endDate`, `status` (enum: active, expired, cancelled), `features` (array or object), `createdAt`
  2. Add index on `user`, `status`

### TASK-018: Transaction Model
- **Title**: Create Transaction Mongoose model
- **Description**: Define Transaction schema for all financial logs: Deposit, Withdrawal, Trip payment, Subscription payment, Coupon payment, Commission payment (10% of driver profits, minimum 2 MAD per place per trip), Refund payment, Penalty payment.
- **Files**: `backend/models/Transaction.js`
- **Dependencies**: TASK-005
- **Steps**:
  1. Define schema fields: `user` (ref: User), `type` (enum: deposit, withdrawal, trip_payment, subscription_payment, coupon_payment, commission_payment, refund, penalty), `amount`, `currency` (default: 'MAD'), `direction` (enum: in, out), `relatedTrip` (ref: Trip, optional), `relatedSubscription` (ref: Subscription, optional), `relatedCoupon` (ref: Coupon, optional), `paymentMethod` (enum: cash, stripe, paypal, bank_transfer, wallet), `status` (enum: pending, completed, failed, refunded), `description`, `createdAt`
  2. Add indexes on `user`, `type`, `status`
  3. Commission logic: 10% of driver profit, minimum 2 MAD per place per trip

### TASK-019: Trip Model
- **Title**: Create Trip Mongoose model
- **Description**: Define Trip schema for active trip execution. Created automatically when driver creates a route. Contains clients array with individual statuses, ratings, pickup/dropoff confirmations. Trip starts regardless of fill status (1+ clients).
- **Files**: `backend/models/Trip.js`
- **Dependencies**: TASK-005, TASK-016
- **Steps**:
  1. Define schema fields: `driver` (ref: User), `driverRoute` (ref: Route), `car` (ref: Car), `totalPlaces` (from driver route), `clients` (array of objects: `{ user (ref: User), route (ref: Route), proposedPrice, agreedPrice, placesBooked, pickupPoint (GeoJSON), dropoffPoint (GeoJSON), pickupStatus (enum: pending, confirmed, cancelled, picked_up, no_show), dropoffStatus (enum: pending, confirmed, cancelled, dropped_off), driverPickupConfirm (boolean), driverDropoffConfirm (boolean), clientPickupConfirm (boolean), clientDropoffConfirm (boolean), pickupRating, dropoffRating, paymentStatus (enum: pending, deducted, refunded), cancellationReason }`), `status` (enum: pending, confirmed, in_progress, completed, cancelled), `occupiedPlaces` (calculated from clients), `scheduledStartTime`, `actualStartTime`, `actualEndTime`, `driverConfirmedReady` (boolean), `driverStartedTrip` (boolean), `optimizedStops` (ordered array of pickup/dropoff points), `cancellationReason`, `createdAt`, `updatedAt`
  2. Add indexes on `driver`, `status`
  3. Auto-create when driver route is created (status: pending, 0 clients)
  4. Trip starts when 1+ clients are present, regardless of total capacity

### TASK-020: Rating Model (Implicit in Users/Trips)
- **Title**: Implement rating logic
- **Description**: Ratings are embedded in trip client entries. Each pickup and dropoff event triggers a rating prompt. Aggregate ratings are stored on User model.
- **Files**: `backend/models/Trip.js`, `backend/models/User.js`, `backend/services/ratingService.js`
- **Dependencies**: TASK-008, TASK-019
- **Steps**:
  1. On each pickup confirm: prompt client to rate driver ("Arrived on time")
  2. On each dropoff confirm: prompt client to rate driver
  3. Driver can rate clients after trip completion
  4. Update User `rating` and `totalRatings` fields with running average
  5. Create `ratingService.js` with `submitRating()` and `calculateAverageRating()`

---

## SECTION 3: BACKEND LOGIC LAYERS

### TASK-021: JWT Authentication Middleware
- **Title**: Implement JWT auth middleware
- **Description**: Create middleware that verifies JWT tokens from request headers, attaches user to request, and handles role-based access control.
- **Files**: `backend/middleware/auth.js`
- **Dependencies**: TASK-008
- **Steps**:
  1. Extract token from `Authorization: Bearer <token>` header
  2. Verify token with `jsonwebtoken`
  3. Attach decoded user to `req.user`
  4. Create `authorize(...roles)` middleware for role-based access
  5. Handle expired/invalid token errors

### TASK-022: Joi Validation Middleware
- **Title**: Implement Joi validation middleware
- **Description**: Create middleware and validation schemas for all request inputs using Joi.
- **Files**: `backend/middleware/validate.js`, `backend/validators/*.js`
- **Dependencies**: TASK-005
- **Steps**:
  1. Create generic `validate(schema)` middleware that validates `req.body`, `req.params`, `req.query`
  2. Create validators for each model: `userValidator.js`, `carValidator.js`, `chatValidator.js`, `couponValidator.js`, `requestValidator.js`, `notificationValidator.js`, `placeValidator.js`, `reclamationValidator.js`, `routeValidator.js`, `subscriptionValidator.js`, `transactionValidator.js`, `tripValidator.js`
  3. Each validator exports schemas for create, update, and query operations

### TASK-023: Cron Jobs — Trip Status Notifications
- **Title**: Implement scheduled cron tasks
- **Description**: Create cron jobs for: (1) Notify driver and clients 10 minutes before trip start. (2) Auto-cancel trip if driver doesn't confirm within 10 minutes after start time. (3) Check for 3 consecutive client cancellations. (4) Check for 3 driver cancellations per month.
- **Files**: `backend/cron/tripCron.js`
- **Dependencies**: TASK-019, TASK-013
- **Steps**:
  1. **10-min pre-trip notification**: Every minute, query trips starting in next 10 minutes, send notifications to driver and all clients
  2. **Auto-cancel unconfirmed trips**: Every minute, query trips that are 10+ minutes past start time where driver hasn't confirmed ready AND started — cancel trip, notify all clients, find new driver for clients (reset client routes to 'pending')
  3. **Client cancellation tracker**: Track consecutive cancellation days per client. If client cancels 3 consecutive days, allow driver to find a new client (remove client from trip, set client route to 'pending')
  4. **Driver cancellation tracker**: Track monthly cancellations per driver. If driver cancels 3 times in a month, cancel the trip definitively — notify all clients, reset all client routes to 'pending', set driver route to 'pending'

### TASK-024: Real-Time Tracking Service
- **Title**: Implement real-time driver location tracking
- **Description**: Use Socket.IO to receive and broadcast driver GPS location updates in real-time during active trips. Force GPS to be enabled while trip is started and not finished.
- **Files**: `backend/tracking/trackingService.js`, `backend/config/socket.js`
- **Dependencies**: TASK-002, TASK-019
- **Steps**:
  1. On Socket.IO connection, authenticate user via JWT
  2. Driver joins trip-specific room when trip starts
  3. Driver emits `location_update` with coordinates every few seconds
  4. Server broadcasts to all clients in the trip room
  5. Calculate distance between driver and next client, emit `distance_update`
  6. Detect when driver is 1 km from client pickup, trigger notification (TASK-013)
  7. Store latest driver location in memory/Redis for quick access
  8. Validate GPS is enabled — if driver disables GPS during active trip, send warning notification

### TASK-025: Socket.IO Event System
- **Title**: Implement comprehensive Socket.IO events
- **Description**: Define all real-time events for trips, requests, chats, notifications, and tracking.
- **Files**: `backend/config/socket.js`, `backend/services/socketService.js`
- **Dependencies**: TASK-002
- **Steps**:
  1. Define events: `request_sent`, `request_accepted`, `request_rejected`, `trip_confirmed`, `trip_started`, `trip_cancelled`, `pickup_confirmed`, `pickup_cancelled`, `dropoff_confirmed`, `dropoff_cancelled`, `trip_completed`, `location_update`, `distance_update`, `chat_message`, `notification`, `client_status_update`, `driver_status_update`, `balance_update`
  2. Implement room management: trip rooms, chat rooms, user rooms
  3. Emit events from services when actions occur
  4. Handle disconnection and reconnection gracefully
  5. Wake up offline users via push notification when Socket.IO events can't reach them

---

## SECTION 4: BACKEND CONTROLLERS, ROUTES & SERVICES

### TASK-026: Auth Controller & Routes
- **Title**: Implement authentication endpoints
- **Description**: Register, login, forgot password, reset password, token refresh, logout. On register driver: must upload documents and wait for admin approval.
- **Files**: `backend/controllers/authController.js`, `backend/routes/authRoutes.js`, `backend/services/authService.js`
- **Dependencies**: TASK-008, TASK-021, TASK-022
- **Steps**:
  1. `POST /api/auth/register` — Create user (client or driver). If driver, set `isApproved: false` and require document upload before full access.
  2. `POST /api/auth/login` — Authenticate, return JWT.
  3. `POST /api/auth/forgot-password` — Send reset email/SMS.
  4. `POST /api/auth/reset-password` — Reset password with token.
  5. `POST /api/auth/logout` — Invalidate token.
  6. Validate all inputs with Joi.

### TASK-027: User Controller & Routes
- **Title**: Implement user CRUD endpoints
- **Description**: Get profile, update profile, delete account, list users (admin), approve driver (admin), upload documents, switch role (client/driver).
- **Files**: `backend/controllers/userController.js`, `backend/routes/userRoutes.js`, `backend/services/userService.js`
- **Dependencies**: TASK-008, TASK-021
- **Steps**:
  1. `GET /api/users/me` — Get current user profile.
  2. `PUT /api/users/me` — Update profile (name, phone, avatar, language, offline contact info).
  3. `DELETE /api/users/me` — Delete account.
  4. `PUT /api/users/me/switch-role` — Switch between client and driver mode.
  5. `POST /api/users/me/documents` — Upload verification documents (CIN front/back, driving license front/back, car registration, face selfie) to GCS.
  6. `GET /api/users` — Admin: list all users with filters.
  7. `PUT /api/users/:id/approve` — Admin: approve driver after document review.
  8. `PUT /api/users/me/change-password` — Change password.

### TASK-028: Car Controller & Routes
- **Title**: Implement car CRUD endpoints
- **Files**: `backend/controllers/carController.js`, `backend/routes/carRoutes.js`
- **Dependencies**: TASK-009, TASK-021
- **Steps**:
  1. `POST /api/cars` — Add car (driver only). Upload photos to GCS.
  2. `GET /api/cars` — List driver's cars.
  3. `GET /api/cars/:id` — Get car details.
  4. `PUT /api/cars/:id` — Edit car.
  5. `DELETE /api/cars/:id` — Delete car.
  6. `PUT /api/cars/:id/default` — Set as default car. Driver must have a default car before creating routes.

### TASK-029: Chat Controller & Routes
- **Title**: Implement chat/messaging endpoints
- **Files**: `backend/controllers/chatController.js`, `backend/routes/chatRoutes.js`
- **Dependencies**: TASK-010, TASK-025
- **Steps**:
  1. `GET /api/chats` — List user's conversations.
  2. `GET /api/chats/:id/messages` — Get messages in a chat (paginated).
  3. `POST /api/chats/:id/messages` — Send message (emit Socket.IO event).
  4. `PUT /api/chats/:id/read` — Mark messages as read.
  5. Real-time message delivery via Socket.IO.

### TASK-030: Coupon Controller & Routes
- **Title**: Implement coupon CRUD endpoints
- **Files**: `backend/controllers/couponController.js`, `backend/routes/couponRoutes.js`
- **Dependencies**: TASK-011, TASK-021
- **Steps**:
  1. `POST /api/coupons` — Admin: create coupon.
  2. `GET /api/coupons` — List available coupons.
  3. `POST /api/coupons/apply` — Apply coupon code, validate expiry/usage limits.
  4. `PUT /api/coupons/:id` — Admin: edit coupon.
  5. `DELETE /api/coupons/:id` — Admin: delete coupon.

### TASK-031: Request Controller & Routes
- **Title**: Implement request endpoints (driver-initiated)
- **Description**: Driver sends request to client's route with proposed price. Client accepts/rejects. On accept: client added to trip, route status → active.
- **Files**: `backend/controllers/requestController.js`, `backend/routes/requestRoutes.js`, `backend/services/requestService.js`
- **Dependencies**: TASK-012, TASK-016, TASK-019, TASK-025
- **Steps**:
  1. `POST /api/requests` — Driver sends request to client route with proposed price. Emit `request_sent` Socket.IO event.
  2. `GET /api/requests` — List requests (sent for driver, received for client).
  3. `PUT /api/requests/:id/accept` — Client accepts request. System adds client to trip, updates trip occupied places, changes client route status to 'active'. Emit `request_accepted`.
  4. `PUT /api/requests/:id/reject` — Client rejects with reason. Emit `request_rejected`.
  5. `PUT /api/requests/:id/cancel` — Cancel pending request.
  6. Validate driver has available places in trip before sending request.

### TASK-032: Notification Controller & Routes
- **Files**: `backend/controllers/notificationController.js`, `backend/routes/notificationRoutes.js`, `backend/services/notificationService.js`
- **Dependencies**: TASK-013, TASK-025
- **Steps**:
  1. `GET /api/notifications` — List user notifications (paginated).
  2. `PUT /api/notifications/:id/read` — Mark as read.
  3. `PUT /api/notifications/read-all` — Mark all as read.
  4. `notificationService.send()` — Create notification record + push notification (FCM/Expo Push) with vibrate & sound, wake up offline users.

### TASK-033: Place Controller & Routes
- **Files**: `backend/controllers/placeController.js`, `backend/routes/placeRoutes.js`
- **Dependencies**: TASK-014, TASK-021
- **Steps**:
  1. `POST /api/places` — Add saved place.
  2. `GET /api/places` — List user's places + public places.
  3. `PUT /api/places/:id` — Edit place.
  4. `DELETE /api/places/:id` — Delete place.
  5. Admin: manage public places.

### TASK-034: Reclamation Controller & Routes
- **Files**: `backend/controllers/reclamationController.js`, `backend/routes/reclamationRoutes.js`
- **Dependencies**: TASK-015, TASK-021
- **Steps**:
  1. `POST /api/reclamations` — Submit reclamation with attachments (GCS upload).
  2. `GET /api/reclamations` — List user's reclamations.
  3. `GET /api/reclamations/:id` — Get reclamation details.
  4. `PUT /api/reclamations/:id` — Admin: update status, add response.

### TASK-035: Route Controller & Routes
- **Description**: Both drivers and clients create routes. On driver route creation, system auto-creates an empty pending Trip.
- **Files**: `backend/controllers/routeController.js`, `backend/routes/routeRoutes.js`, `backend/services/routeService.js`
- **Dependencies**: TASK-016, TASK-019, TASK-021
- **Steps**:
  1. `POST /api/routes` — Create route. If driver: validate default car exists, auto-create Trip with status 'pending' and 0 clients. Client: set proposed price, places needed.
  2. `GET /api/routes` — List user's routes.
  3. `GET /api/routes/find-clients` — Driver: find client routes sorted by least increase in driver route distance, least increase in time, and highest price.
  4. `GET /api/routes/:id` — Get route details.
  5. `PUT /api/routes/:id` — Edit route.
  6. `DELETE /api/routes/:id` — Delete route (cascade to trip if applicable).
  7. Route fields for driver: start/end points, time start, time end (optional), days of repeat, price type (fixed/per_km), price, car (owned or affected from another driver), total places.
  8. Route fields for client: start/end points, time start, days of repeat, proposed price, places needed.

### TASK-036: Subscription Controller & Routes
- **Files**: `backend/controllers/subscriptionController.js`, `backend/routes/subscriptionRoutes.js`
- **Dependencies**: TASK-017, TASK-021
- **Steps**:
  1. `POST /api/subscriptions` — Subscribe to plan.
  2. `GET /api/subscriptions` — List user's subscriptions.
  3. `PUT /api/subscriptions/:id/cancel` — Cancel subscription.
  4. Admin: manage plans and subscriptions.

### TASK-037: Transaction Controller & Routes
- **Files**: `backend/controllers/transactionController.js`, `backend/routes/transactionRoutes.js`, `backend/services/transactionService.js`
- **Dependencies**: TASK-018, TASK-021
- **Steps**:
  1. `GET /api/transactions` — List user's transactions (paginated, filterable by type).
  2. `POST /api/transactions/deposit` — Deposit to wallet via payment method (Cash, Stripe, PayPal, Bank Transfer).
  3. `POST /api/transactions/withdraw` — Request withdrawal.
  4. Internal: `processTrippayment()` — Deduct from client wallet on pickup, credit to driver wallet minus 10% commission (min 2 MAD per place).
  5. Internal: `processRefund()` — Refund on cancellation if applicable.

### TASK-038: Trip Controller & Routes
- **Description**: Full trip lifecycle management including confirmation, start, pickup, dropoff, and completion with all notification flows.
- **Files**: `backend/controllers/tripController.js`, `backend/routes/tripRoutes.js`, `backend/services/tripService.js`
- **Dependencies**: TASK-019, TASK-024, TASK-025, TASK-032, TASK-037
- **Steps**:
  1. `GET /api/trips` — List user's trips with status and client count (e.g., 2/4).
  2. `GET /api/trips/:id` — Get trip with full details (stops, clients, real-time data).
  3. `PUT /api/trips/:id/confirm-ready` — Driver confirms ready 10min before. Notify all clients.
  4. `PUT /api/trips/:id/cancel` — Cancel trip. Ask for reason. Notify all participants. Set routes to 'pending'.
  5. `PUT /api/trips/:id/start` — Driver starts trip. Validate GPS enabled. Notify all clients. Lock driver into trip execution mode.
  6. `PUT /api/trips/:id/pickup/:clientId` — Driver confirms pickup. Deduct payment from client. Notify client. Prompt client to confirm and rate.
  7. `PUT /api/trips/:id/pickup/:clientId/cancel` — Driver cancels pickup. Ask reason. Notify client.
  8. `PUT /api/trips/:id/pickup/:clientId/client-confirm` — Client confirms they were picked up. Rate driver.
  9. `PUT /api/trips/:id/dropoff/:clientId` — Driver confirms dropoff. Notify client. Prompt client to confirm and rate.
  10. `PUT /api/trips/:id/dropoff/:clientId/cancel` — Driver cancels dropoff. Ask reason. Notify client.
  11. `PUT /api/trips/:id/dropoff/:clientId/client-confirm` — Client confirms dropoff. Rate driver.
  12. `PUT /api/trips/:id/complete` — Driver completes trip. Check all pickups/dropoffs done.
  13. `PUT /api/trips/:id/client-confirm-ready/:clientId` — Client confirms ready 10min before driver arrives.
  14. `PUT /api/trips/:id/client-cancel/:clientId` — Client cancels. Ask reason. Notify driver. Track consecutive cancellations.
  15. Implement 1km proximity notification to clients.
  16. Implement 5-minute offline client wait rule: if client offline when driver arrives, wait 5 min, show offline contact info, then cancel and pay driver for distance.

---

## SECTION 5: PAYMENT SYSTEM

### TASK-039: Stripe Integration
- **Files**: `backend/services/paymentService.js`, `backend/config/stripe.js`
- **Dependencies**: TASK-018, TASK-037
- **Steps**:
  1. Configure Stripe SDK with secret key.
  2. Implement `createPaymentIntent()` for deposits.
  3. Implement webhook handler for payment confirmation.
  4. Handle refunds via Stripe.

### TASK-040: PayPal Integration
- **Files**: `backend/services/paymentService.js`, `backend/config/paypal.js`
- **Dependencies**: TASK-018, TASK-037
- **Steps**:
  1. Configure PayPal SDK.
  2. Implement `createOrder()` for deposits.
  3. Implement `capturePayment()` on approval.
  4. Handle refunds via PayPal.

### TASK-041: Bank Transfer Support
- **Files**: `backend/services/paymentService.js`
- **Dependencies**: TASK-018, TASK-037
- **Steps**:
  1. Admin manually confirms bank transfer deposits.
  2. Create pending transaction on user request.
  3. Admin approval endpoint to confirm and credit wallet.

### TASK-042: Commission Calculation Service
- **Title**: Implement 10% commission logic
- **Description**: 10% of driver profits goes to Detour.ma, with a minimum of 2 MAD for every place in every trip.
- **Files**: `backend/services/commissionService.js`
- **Dependencies**: TASK-018, TASK-019
- **Steps**:
  1. On each client pickup payment: calculate `agreedPrice * placesBooked`.
  2. Calculate 10% commission: `Math.max(agreedPrice * 0.10, 2 * placesBooked)`.
  3. Deduct commission from driver credit.
  4. Create commission transaction record.
  5. Credit remaining amount to driver wallet.

---

## SECTION 6: INTERNATIONALIZATION (i18n)

### TASK-043: Backend i18n Support
- **Files**: `backend/utils/i18n.js`, `backend/locales/en.json`, `backend/locales/fr.json`, `backend/locales/ar.json`
- **Dependencies**: TASK-002
- **Steps**:
  1. Create translation files for notification messages, error messages, email templates.
  2. Detect user language from User model `language` field.
  3. Send notifications and responses in user's preferred language.

### TASK-044: Frontend i18n Setup
- **Files**: `frontend/i18n/index.ts`, `frontend/i18n/en.json`, `frontend/i18n/fr.json`, `frontend/i18n/ar.json`
- **Dependencies**: TASK-003
- **Steps**:
  1. Configure `i18next` with `react-i18next`.
  2. Create translation JSON files for all UI strings (English default).
  3. French and Arabic translations.
  4. RTL support for Arabic.
  5. Language switch in settings screen.
  6. Persist language preference in Redux store and User model.

### TASK-045: Admin Panel Language Management
- **Description**: Admin can edit translations and translate the app to any language from the admin panel.
- **Files**: `admin-panel/src/pages/Languages.tsx`, `backend/controllers/languageController.js`
- **Dependencies**: TASK-043, TASK-044
- **Steps**:
  1. Create admin UI for managing translation keys and values.
  2. Backend endpoint to CRUD translation entries.
  3. Allow adding new languages dynamically.
  4. Frontend fetches translations from backend on app load.

---

## SECTION 7: FRONTEND — AUTH, ONBOARDING & TASKS

### TASK-046: Onboarding Screens
- **Description**: Create onboarding flow with animated screens using NanoBanana for images and animation.
- **Files**: `frontend/app/(onboarding)/index.tsx`, related component files
- **Dependencies**: TASK-006
- **Steps**:
  1. Create 3-4 onboarding slides introducing Detour.ma features.
  2. Use NanoBanana for animated illustrations.
  3. Add skip and next buttons.
  4. On completion, navigate to auth flow.
  5. Store onboarding completion flag to skip on subsequent launches.

### TASK-047: Login Screen
- **Description**: Login screen inspired by `/inspiration-login-page.webp`.
- **Files**: `frontend/app/(auth)/login.tsx`
- **Dependencies**: TASK-006, TASK-026
- **Steps**:
  1. Email/phone and password input fields.
  2. Login button → call `POST /api/auth/login`.
  3. Store JWT in secure storage.
  4. "Forgot Password" link → navigate to forgot-password screen.
  5. "Register" link → navigate to register screen.
  6. Social login buttons (optional future).
  7. Match inspiration design from `/inspiration-login-page.webp`.

### TASK-048: Register Screen
- **Files**: `frontend/app/(auth)/register.tsx`
- **Dependencies**: TASK-006, TASK-026
- **Steps**:
  1. Fields: name, email, phone, password, confirm password, role selection (client/driver).
  2. Register button → call `POST /api/auth/register`.
  3. If driver role: show message that document upload is required and admin approval pending.
  4. Navigate to tasks screen after registration.

### TASK-049: Forgot/Reset Password Screens
- **Files**: `frontend/app/(auth)/forgot-password.tsx`, `frontend/app/(auth)/reset-password.tsx`
- **Dependencies**: TASK-006, TASK-026
- **Steps**:
  1. Forgot password: enter email/phone, submit → receive reset code.
  2. Reset password: enter code, new password, confirm → submit.

### TASK-050: Tasks Screens (Onboarding Tasks)
- **Description**: Post-registration tasks that must be completed. On completion grant 20 MAD credits. Driver and client have different task lists.
- **Files**: `frontend/app/(tasks)/index.tsx`, `frontend/app/(tasks)/driver-tasks.tsx`, `frontend/app/(tasks)/client-tasks.tsx`
- **Dependencies**: TASK-006, TASK-027
- **Steps**:
  1. **Driver tasks**: (a) Allow editing system GPS location status, (b) Set default car (required), (c) Upload verification documents (required), (d) Add saved places (optional), (e) Create route (optional).
  2. **Client tasks**: (a) Add saved places (optional), (b) Create route (optional).
  3. Track task completion progress.
  4. On all required tasks complete: credit 20 MAD to user wallet, create transaction record, show success notification.
  5. Allow skipping optional tasks.

---

## SECTION 8: FRONTEND — MAIN SCREENS

### TASK-051: Client Main Screen
- **Description**: Full-screen map with header (profile info left, menu icon right). Notification, chat, and find trips icons in top right corner vertically.
- **Files**: `frontend/app/(client)/index.tsx`, `frontend/components/ClientHeader.tsx`
- **Dependencies**: TASK-006, TASK-044
- **Steps**:
  1. Header: user avatar + name on left, hamburger menu on right.
  2. Full-screen map (expo-maps on native, Leaflet on web).
  3. Floating icons top-right: notifications badge, chat icon, find trips icon.
  4. Display current user location on map.
  5. Show nearby driver routes on map (optional discovery).

### TASK-052: Driver Main Screen
- **Description**: Full-screen map with header (profile info left, menu icon right). Notification, chat, and find clients icons in top right corner vertically.
- **Files**: `frontend/app/(driver)/index.tsx`, `frontend/components/DriverHeader.tsx`
- **Dependencies**: TASK-006, TASK-044
- **Steps**:
  1. Header: user avatar + name on left, hamburger menu on right.
  2. Full-screen map (expo-maps on native, Leaflet on web).
  3. Floating icons top-right: notifications badge, chat icon, find clients icon.
  4. Display current driver location on map.
  5. Show pending client routes nearby.

### TASK-053: Find Clients Screen (Driver)
- **Description**: Driver sees client routes sorted by: least increase in driver route distance, least increase in time, highest price. Driver can send requests with proposed price.
- **Files**: `frontend/app/(driver)/find-clients.tsx`
- **Dependencies**: TASK-035, TASK-031
- **Steps**:
  1. Fetch client routes from `GET /api/routes/find-clients`.
  2. Display list with: client start/end, proposed price, days of repeat, places needed.
  3. Show sorting criteria: route deviation, time increase, price.
  4. Send request button → modal with proposed price input → `POST /api/requests`.
  5. Show map overlay with driver route and client route comparison.

### TASK-054: Cars Screens (Driver)
- **Files**: `frontend/app/(driver)/cars/index.tsx`, `frontend/app/(driver)/cars/add.tsx`, `frontend/app/(driver)/cars/edit.tsx`
- **Dependencies**: TASK-028
- **Steps**:
  1. List all driver's cars with photos, default badge.
  2. Add car form: make, model, year, color, plate number, seats, photos (camera/gallery upload to GCS).
  3. Edit car form: same fields, pre-populated.
  4. Set default car action.
  5. Delete car with confirmation.

### TASK-055: Driver Verification Screen
- **Description**: Documents upload: CIN (Front & Back), Driving License (Front & Back), Car Registration, Face Live Selfie.
- **Files**: `frontend/app/(driver)/verification.tsx`
- **Dependencies**: TASK-027
- **Steps**:
  1. CIN front upload (camera/gallery).
  2. CIN back upload (camera/gallery).
  3. Driving License front upload (camera/gallery).
  4. Driving License back upload (camera/gallery).
  5. Car Registration upload (camera/gallery).
  6. Face Live Selfie capture (live camera, not gallery).
  7. Upload all to GCS via `POST /api/users/me/documents`.
  8. Show approval status: pending, approved, rejected.
  9. If rejected, show reason and allow re-upload.

### TASK-056: Driver Trip Execution Screen
- **Description**: Full-screen map showing trip progress. Inspired by `/inspiration.webp`. Driver is locked into this screen during active trip. Shows current route, all stops, client info, real-time location, distance/duration to next client, and action buttons.
- **Files**: `frontend/app/(driver)/trip-execution.tsx`, `frontend/components/TripProgressBar.tsx`, `frontend/components/TripActionButton.tsx`
- **Dependencies**: TASK-038, TASK-024
- **Steps**:
  1. Full-screen map with route polyline and all stop markers.
  2. Current real-time driver location marker (auto-updating via Socket.IO).
  3. Trip route info panel: live status, current step, next step, distance, time, price.
  4. Client info cards: name, phone, offline contacts, pickup/dropoff locations, status.
  5. Distance and duration between driver and next client (real-time).
  6. **Action: Confirm/Cancel ready** (10min before trip start) → notify all clients "driver is preparing".
  7. **Action: Confirm/Cancel start trip** → notify all clients "driver has started". Validate GPS is on.
  8. **Action: Confirm/Cancel pickup client** → notify client "driver has picked you up". Trigger payment deduction.
  9. **Action: Confirm/Cancel dropoff client** → notify client "driver has dropped you off".
  10. **Action: Confirm/Cancel end trip** → complete trip.
  11. Show client response status (accepted/not), online/offline status, balance sufficiency.
  12. If client offline at pickup: show 5-min countdown timer, show offline contacts, auto-cancel after 5 min.
  13. Cannot navigate away from this screen until trip is completed.

### TASK-057: Client Trip Execution Screen
- **Description**: Full-screen map showing trip progress from client perspective. Shows driver location, route, stops, distance/time to driver, and action buttons.
- **Files**: `frontend/app/(client)/trip-execution.tsx`
- **Dependencies**: TASK-038, TASK-024
- **Steps**:
  1. Full-screen map with route, stops, and driver real-time location.
  2. Trip route info: live status, current step, next step, distance, time, price, driver info.
  3. Real-time driver location tracking on map.
  4. Distance and duration between client and driver.
  5. **Action: Confirm/Cancel ready** (10min before driver arrives) → notify driver "client is preparing".
  6. **Action: Confirm/Cancel picked up** → notify driver "client confirmed pickup". Rate driver.
  7. **Action: Confirm/Cancel dropped off** → notify driver "client confirmed dropoff". Rate driver.
  8. Client cannot cancel after driver has confirmed the trip.
  9. Driver info display: phone, name, offline contacts, car details.

---

## SECTION 9: FRONTEND — SHARED SCREENS

### TASK-058: Chat Screen
- **Files**: `frontend/app/chat/index.tsx`, `frontend/app/chat/[id].tsx`
- **Dependencies**: TASK-029, TASK-025
- **Steps**:
  1. List conversations with last message preview, timestamp, unread badge.
  2. Chat detail: message bubbles, input field, send button, image attachment.
  3. Real-time messages via Socket.IO.
  4. Auto-scroll to latest message.

### TASK-059: Coupons Screen
- **Files**: `frontend/app/coupons/index.tsx`
- **Dependencies**: TASK-030
- **Steps**:
  1. List available/used coupons.
  2. Apply coupon code input.
  3. Show coupon details: code, discount type/value, expiry.

### TASK-060: Subscriptions Screen
- **Files**: `frontend/app/subscriptions/index.tsx`
- **Dependencies**: TASK-036
- **Steps**:
  1. List available plans.
  2. Current subscription status.
  3. Subscribe/cancel actions.

### TASK-061: Places Screens
- **Files**: `frontend/app/places/index.tsx`, `frontend/app/places/add.tsx`, `frontend/app/places/edit.tsx`
- **Dependencies**: TASK-033
- **Steps**:
  1. List saved places on map and as list.
  2. Add place: map picker + name + address input.
  3. Edit place.
  4. Delete place.

### TASK-062: Requests Screen
- **Files**: `frontend/app/requests/index.tsx`
- **Dependencies**: TASK-031
- **Steps**:
  1. Driver view: list sent requests with status (pending/accepted/rejected).
  2. Client view: list received requests with driver info, proposed price, accept/reject buttons.
  3. Real-time updates via Socket.IO.

### TASK-063: Reclamations Screens
- **Files**: `frontend/app/reclamations/index.tsx`, `frontend/app/reclamations/add.tsx`
- **Dependencies**: TASK-034
- **Steps**:
  1. List reclamations with status.
  2. Add reclamation form: subject, description, attachments, related trip (optional).
  3. View reclamation detail with admin response.

### TASK-064: Notifications Screen
- **Files**: `frontend/app/notifications/index.tsx`
- **Dependencies**: TASK-032
- **Steps**:
  1. List notifications with read/unread status, timestamp.
  2. Mark as read on tap.
  3. Mark all as read button.
  4. Navigate to related content on tap.

### TASK-065: Transactions Screen
- **Files**: `frontend/app/transactions/index.tsx`
- **Dependencies**: TASK-037
- **Steps**:
  1. List transactions with type icon, amount, direction (in/out), date.
  2. Filter by type (deposit, withdrawal, trip_payment, commission, refund, penalty, etc.).
  3. Wallet balance display at top.

### TASK-066: Ratings & Reviews Screens
- **Files**: `frontend/app/ratings/index.tsx`, `frontend/app/reviews/index.tsx`
- **Dependencies**: TASK-020
- **Steps**:
  1. Ratings: list ratings received with stars, trip info, date.
  2. Reviews: list written reviews with text, rating, trip info.

### TASK-067: Routes Screens
- **Files**: `frontend/app/routes/index.tsx`, `frontend/app/routes/add.tsx`, `frontend/app/routes/edit.tsx`
- **Dependencies**: TASK-035
- **Steps**:
  1. List user's routes with status, start/end, days, price.
  2. **Add Route form**:
     - Route points (start and end) — map picker.
     - Route time start.
     - Route time end (driver only, optional) — helps determine if driver can send requests or will be late.
     - Route days of repeat (multi-select: Mon-Sun).
     - Route price: proposed price (client) OR price type + price (driver: fixed or per_km).
     - Route car (driver only): select owned car or affected car from another driver.
     - Places needed (client) or total places (driver).
  3. Edit route form: same fields pre-populated.
  4. Delete route with cascade confirmation.
  5. On driver route creation: system auto-creates empty pending trip.
  6. Client route: status starts as 'pending' to receive requests from drivers.

### TASK-068: Trips Screen
- **Files**: `frontend/app/trips/index.tsx`
- **Dependencies**: TASK-038
- **Steps**:
  1. List trips with: status, client count (e.g., 2/4), scheduled time, route summary.
  2. "Go to Trip" button (visible only when trip start is within 10 minutes).
  3. Navigate to trip execution screen.
  4. Show "IN TRIP" status when trip is active.
  5. Real-time countdown timer to trip start.

### TASK-069: Dashboard Screen
- **Files**: `frontend/app/dashboard/index.tsx`
- **Dependencies**: TASK-037, TASK-038
- **Steps**:
  1. Wallet balance.
  2. Active trips count.
  3. Total earnings (driver) / total spent (client).
  4. Recent transactions.
  5. Upcoming trips with countdown timers.

### TASK-070: Profile Screen
- **Description**: Comprehensive profile screen with all navigable sections.
- **Files**: `frontend/app/profile/index.tsx`
- **Dependencies**: TASK-027
- **Steps**:
  1. User info (avatar, name, email, phone, rating).
  2. **Menu items**: My Wallet, My Trips, My Cars (driver only), My Requests, My Notifications, My Transactions, My Ratings, My Reviews, My Routes, My Subscriptions, My Coupons, My Reclamations.
  3. **Info pages**: Terms and Conditions, Privacy Policy, Contact Us, About Us, Help, FAQ.
  4. **Account actions**: Edit Profile, Switch to driver/client mode, Change Password, Logout, Delete Account.
  5. Each item navigates to its respective screen.

### TASK-071: Edit Profile Screen
- **Files**: `frontend/app/edit-profile/index.tsx`
- **Dependencies**: TASK-027
- **Steps**:
  1. Edit name, phone, avatar (upload to GCS), language preference.
  2. Save → `PUT /api/users/me`.

### TASK-072: Change Password Screen
- **Files**: `frontend/app/change-password/index.tsx`
- **Dependencies**: TASK-027
- **Steps**:
  1. Current password, new password, confirm new password fields.
  2. Submit → `PUT /api/users/me/change-password`.

### TASK-073: Delete Account Screen
- **Files**: `frontend/app/delete-account/index.tsx`
- **Dependencies**: TASK-027
- **Steps**:
  1. Confirmation prompt with password verification.
  2. Delete → `DELETE /api/users/me`.
  3. Clear local storage, navigate to auth.

### TASK-074: Static Info Screens
- **Files**: `frontend/app/terms-and-conditions/index.tsx`, `frontend/app/privacy-policy/index.tsx`, `frontend/app/contact-us/index.tsx`, `frontend/app/about-us/index.tsx`, `frontend/app/help/index.tsx`, `frontend/app/faq/index.tsx`
- **Dependencies**: TASK-006
- **Steps**:
  1. Fetch content from backend (admin-managed).
  2. Render rich text/markdown content.
  3. Contact Us: contact form or info display.
  4. FAQ: expandable accordion items.

### TASK-075: Map Components
- **Description**: Dual map implementation — expo-maps for iOS/Android, Leaflet for web.
- **Files**: `frontend/components/Map.tsx`, `frontend/components/MapLeaflet.tsx`
- **Dependencies**: TASK-003
- **Steps**:
  1. `Map.tsx`: react-native-maps wrapper for native platforms.
  2. `MapLeaflet.tsx`: react-leaflet wrapper for web.
  3. Shared props interface: markers, polylines, user location, bounds, zoom.
  4. Platform detection to render correct map.
  5. Trip route visualization with ordered stops.
  6. Real-time driver location marker.
  7. Client pickup/dropoff markers with status colors.
  8. Route polylines with optimized order.

### TASK-076: Redux Store Setup
- **Files**: `frontend/store/index.ts`, `frontend/store/slices/*.ts`
- **Dependencies**: TASK-003
- **Steps**:
  1. Create store with `configureStore`.
  2. Slices: `authSlice` (user, token), `tripSlice` (active trip), `locationSlice` (GPS), `notificationSlice` (unread count), `settingsSlice` (language, theme).
  3. Persist auth state in secure storage.
  4. Type-safe hooks: `useAppDispatch`, `useAppSelector`.

### TASK-077: Socket.IO Client Hook
- **Files**: `frontend/hooks/useSocket.ts`
- **Dependencies**: TASK-025, TASK-076
- **Steps**:
  1. Connect to backend Socket.IO with JWT auth.
  2. Auto-reconnect on disconnect.
  3. Listen for events and dispatch Redux actions.
  4. Invalidate React Query caches on relevant events.
  5. Handle connection status indicator.

### TASK-078: Push Notification Setup
- **Files**: `frontend/services/notificationService.ts`
- **Dependencies**: TASK-003, TASK-032
- **Steps**:
  1. Configure Expo Push Notifications.
  2. Request notification permissions.
  3. Register device token with backend.
  4. Handle foreground, background, and killed-state notifications.
  5. Ensure vibrate and sound for all notifications.
  6. Navigate to relevant screen on notification tap.

---

## SECTION 10: ADMIN PANEL PAGES

### TASK-079: Admin Layout & Navigation
- **Files**: `admin-panel/src/layouts/AdminLayout.tsx`, `admin-panel/src/components/Sidebar.tsx`
- **Dependencies**: TASK-007
- **Steps**:
  1. Sidebar with links to all admin pages.
  2. Top bar with admin profile, notifications, logout.
  3. Responsive layout (collapsible sidebar on mobile).
  4. Protected routes — admin role only.

### TASK-080: Dashboard Home Page
- **Files**: `admin-panel/src/pages/DashboardHome.tsx`
- **Dependencies**: TASK-079
- **Steps**:
  1. Overview statistics: total users, active trips, revenue, pending approvals.
  2. Charts: revenue over time, trips over time, user signups.
  3. Recent activity feed.
  4. Real-time updates via Socket.IO.

### TASK-081: Users Management Page
- **Files**: `admin-panel/src/pages/Users.tsx`
- **Dependencies**: TASK-027, TASK-079
- **Steps**:
  1. DataTable with all users, sortable/filterable by role, status, date.
  2. View user details (profile, documents, trips, transactions).
  3. Approve/reject driver documents.
  4. Edit user, ban/unban user, delete user.

### TASK-082: Roles & Permissions Pages
- **Files**: `admin-panel/src/pages/Roles.tsx`, `admin-panel/src/pages/Permissions.tsx`
- **Dependencies**: TASK-079
- **Steps**:
  1. CRUD for roles (admin, moderator, support, etc.).
  2. Assign permissions to roles.
  3. Permission matrix UI.

### TASK-083: Admin CRUD Pages (Cars, Chats, Coupons, Requests, Notifications, Places, Reclamations, Routes, Subscriptions, Transactions, Ratings, Reviews)
- **Files**: `admin-panel/src/pages/Cars.tsx`, `admin-panel/src/pages/Chats.tsx`, `admin-panel/src/pages/Coupons.tsx`, `admin-panel/src/pages/Requests.tsx`, `admin-panel/src/pages/Notifications.tsx`, `admin-panel/src/pages/Places.tsx`, `admin-panel/src/pages/Reclamations.tsx`, `admin-panel/src/pages/Routes.tsx`, `admin-panel/src/pages/Subscriptions.tsx`, `admin-panel/src/pages/Transactions.tsx`, `admin-panel/src/pages/Ratings.tsx`, `admin-panel/src/pages/Reviews.tsx`
- **Dependencies**: TASK-079, TASK-028 through TASK-038
- **Steps**:
  1. Each page: DataTable with CRUD operations, filters, search, pagination.
  2. Cars: view/approve car registrations.
  3. Chats: monitor conversations (read-only or moderation).
  4. Coupons: create/edit/delete coupons, view usage stats.
  5. Requests: view all driver-client requests, moderate disputes.
  6. Notifications: send system-wide notifications.
  7. Places: manage public places/POIs.
  8. Reclamations: view/respond to user disputes, update status.
  9. Routes: view all routes, filter by status/user.
  10. Subscriptions: manage plans, view subscriber list.
  11. Transactions: view all financial transactions, filter by type/status.
  12. Ratings: view all ratings, moderate inappropriate ratings.
  13. Reviews: view/moderate reviews.

### TASK-084: Trips Monitoring Page (Admin)
- **Description**: Admin trips page with map visualization showing active trips in real-time.
- **Files**: `admin-panel/src/pages/Trips.tsx`
- **Dependencies**: TASK-038, TASK-024, TASK-079
- **Steps**:
  1. DataTable listing all trips with filters.
  2. Leaflet map showing active trips with driver locations.
  3. Click trip to see route, stops, clients, real-time driver position.
  4. Trip detail modal with full lifecycle info.
  5. Admin actions: force-cancel trip, contact driver/client.

### TASK-085: Admin Static Pages Management
- **Description**: Settings, Terms and Conditions, Privacy Policy, Contact Us, About Us, Help, FAQ management.
- **Files**: `admin-panel/src/pages/Settings.tsx`, `admin-panel/src/pages/TermsAndConditions.tsx`, `admin-panel/src/pages/PrivacyPolicy.tsx`, `admin-panel/src/pages/ContactUs.tsx`, `admin-panel/src/pages/AboutUs.tsx`, `admin-panel/src/pages/Help.tsx`, `admin-panel/src/pages/FAQ.tsx`
- **Dependencies**: TASK-079
- **Steps**:
  1. Rich text editor for each static page.
  2. Save content to backend.
  3. Settings: app configuration (commission rate, wait times, cancellation thresholds, etc.).

### TASK-086: Admin Profile Pages
- **Files**: `admin-panel/src/pages/EditProfile.tsx`, `admin-panel/src/pages/ChangePassword.tsx`, `admin-panel/src/pages/DeleteAccount.tsx`, `admin-panel/src/pages/Profile.tsx`
- **Dependencies**: TASK-079, TASK-027
- **Steps**:
  1. Profile: view admin profile info.
  2. Edit Profile: update name, avatar.
  3. Change Password: current + new password.
  4. Delete Account: confirmation with password.

---

## SECTION 11: BUSINESS RULES & EDGE CASES

### TASK-087: GPS Enforcement
- **Description**: Driver cannot start trip if GPS is disabled. Force GPS to be enabled while trip is active and not finished.
- **Files**: `frontend/app/(driver)/trip-execution.tsx`, `backend/controllers/tripController.js`
- **Dependencies**: TASK-024, TASK-056
- **Steps**:
  1. Frontend: check GPS status before trip start action. If disabled, show prompt to enable.
  2. Backend: validate `gpsEnabled` flag on trip start endpoint. Reject if false.
  3. During active trip: periodically check GPS status. If disabled, send warning notification.
  4. If GPS stays disabled for extended period, send escalating warnings.

### TASK-088: Client Cancellation Rules
- **Description**: Client cannot cancel after driver has confirmed the trip. If client cancels 3 consecutive days, allow driver to find a new client.
- **Files**: `backend/services/tripService.js`, `backend/services/cancellationService.js`
- **Dependencies**: TASK-038
- **Steps**:
  1. Block client cancellation after driver confirms trip (trip status: confirmed or in_progress).
  2. Track per-client consecutive cancellation days counter.
  3. On 3 consecutive cancellation days: remove client from trip, set client route status to 'pending', notify driver that client slot is open, allow driver to find new client.
  4. Reset counter on non-cancellation day.

### TASK-089: Driver Cancellation Rules
- **Description**: If driver cancels 3 times in a month, cancel the trip definitively.
- **Files**: `backend/services/tripService.js`, `backend/services/cancellationService.js`
- **Dependencies**: TASK-038
- **Steps**:
  1. Track monthly cancellation count per driver.
  2. On 3rd cancellation in month: cancel trip definitively.
  3. On definitive cancellation: notify all clients, set all client routes to 'pending' to receive requests from other drivers.
  4. Set driver route status to 'pending' to find new clients.

### TASK-090: Trip Definitive Cancellation Flow
- **Description**: When a trip is cancelled definitively, handle all cascading effects.
- **Files**: `backend/services/tripService.js`
- **Dependencies**: TASK-038
- **Steps**:
  1. Notify driver: trip is cancelled, driver lost his clients, trip status → 'cancelled', route status → 'pending'.
  2. Notify all clients: trip is cancelled, trip status → 'cancelled', route status → 'pending' (so they can receive requests from other drivers).
  3. Process any necessary refunds.

### TASK-091: Offline Client at Pickup Rules
- **Description**: If client is offline when driver arrives, driver waits 5 minutes max. Show offline contacts. Auto-cancel and pay driver for distance if client doesn't appear.
- **Files**: `backend/services/tripService.js`, `frontend/app/(driver)/trip-execution.tsx`
- **Dependencies**: TASK-038, TASK-056
- **Steps**:
  1. On driver arrival at pickup: check client online status.
  2. If offline: start 5-minute timer, notify client repeatedly, show driver the client's offline contacts (phone, name).
  3. After 5 minutes: if still offline, cancel client's seat, mark as no-show.
  4. Calculate distance driver travelled to reach pickup, pay driver for that distance.
  5. Create appropriate transaction records.

### TASK-092: Auto-Cancel Unconfirmed Trips
- **Description**: 10 minutes after trip start time, if driver hasn't confirmed ready and started, cancel trip and find new driver for clients.
- **Files**: `backend/cron/tripCron.js`, `backend/services/tripService.js`
- **Dependencies**: TASK-023, TASK-038
- **Steps**:
  1. Cron checks every minute for overdue unconfirmed trips.
  2. Cancel trip if 10+ minutes past start without driver confirmation.
  3. Notify all clients that trip is cancelled due to driver no-show.
  4. Reset client routes to 'pending' for new driver requests.
  5. Mark driver trip as cancelled, record reason.

### TASK-093: Payment on Pickup
- **Description**: Driver is paid when he picks up the client. Money deducted from client balance at pickup confirmation.
- **Files**: `backend/services/tripService.js`, `backend/services/transactionService.js`
- **Dependencies**: TASK-037, TASK-042
- **Steps**:
  1. On driver pickup confirmation: deduct agreed price from client wallet.
  2. Calculate 10% commission (minimum 2 MAD per place).
  3. Credit (price - commission) to driver wallet.
  4. Create three transaction records: client payment out, driver payment in, commission payment.
  5. Notify client of deduction. Notify driver of payment received.
  6. If client has insufficient balance: block pickup, notify driver, show client balance status.

### TASK-094: Route & Trip Creation Rules
- **Description**: Clients and drivers can only create Routes, not Trips. System auto-creates Trip when driver creates a Route.
- **Files**: `backend/services/routeService.js`, `backend/controllers/routeController.js`
- **Dependencies**: TASK-016, TASK-019
- **Steps**:
  1. Enforce: no direct Trip creation endpoint for clients or drivers.
  2. On driver route creation: auto-create Trip with `status: 'pending'`, `totalPlaces` from route, `clients: []`.
  3. Link route ↔ trip bidirectionally.
  4. On client route creation: just create route with `status: 'pending'`, no trip created.

### TASK-095: Trip Start Regardless of Capacity
- **Description**: Trip starts whatever the status — as long as 1+ clients are present.
- **Files**: `backend/services/tripService.js`
- **Dependencies**: TASK-038
- **Steps**:
  1. Trip start validation: require at least 1 client.
  2. Do NOT require trip to be fully booked (e.g., 4/4).
  3. Trip can start with 1/4, 2/4, 3/4, or 4/4 clients.

### TASK-096: Direct Price Negotiation
- **Description**: Support direct negotiation of price between client and driver through the request system.
- **Files**: `backend/services/requestService.js`, `frontend/app/requests/index.tsx`
- **Dependencies**: TASK-031
- **Steps**:
  1. Client sets proposed price when creating route.
  2. Driver sees client's proposed price in find-clients view.
  3. Driver sends request with their own proposed price (can be different from client's).
  4. Client sees both prices, can accept, reject, or counter-offer.
  5. On acceptance: agreed price is recorded in trip client entry.

---

## SECTION 12: TESTING

### TASK-097: Backend Unit Tests
- **Files**: `backend/tests/unit/*.test.js`
- **Dependencies**: All backend tasks
- **Steps**:
  1. Test all Mongoose model validations and methods.
  2. Test service layer business logic (commission calculation, cancellation rules, payment processing).
  3. Test middleware (auth, validation).
  4. Test cron job logic.
  5. Use Jest + mongodb-memory-server.

### TASK-098: Backend Integration Tests
- **Files**: `backend/tests/integration/*.test.js`
- **Dependencies**: TASK-097
- **Steps**:
  1. Test all API endpoints with supertest.
  2. Test full trip lifecycle flow: route creation → request → accept → trip start → pickups → dropoffs → complete.
  3. Test cancellation flows and cascading effects.
  4. Test payment and commission flows.
  5. Test Socket.IO events.

### TASK-099: Frontend Component Tests
- **Files**: `frontend/__tests__/*.test.tsx`
- **Dependencies**: All frontend tasks
- **Steps**:
  1. Test map components render correctly.
  2. Test trip execution screen actions and state transitions.
  3. Test form validations (auth, route, car, etc.).
  4. Test Redux store slices and actions.
  5. Use Jest + React Native Testing Library.

### TASK-100: End-to-End Tests
- **Files**: `e2e/*.test.js`
- **Dependencies**: TASK-097, TASK-098, TASK-099
- **Steps**:
  1. Full user journey: register → create route → receive request → accept → trip execution.
  2. Multi-user scenarios: driver + multiple clients simultaneously.
  3. Cancellation and edge case scenarios.
  4. Payment flow verification.

---

## SECTION 13: PERFORMANCE

### TASK-101: Database Indexing & Optimization
- **Files**: All model files in `backend/models/`
- **Dependencies**: All model tasks
- **Steps**:
  1. Add 2dsphere indexes for geospatial queries (routes, places).
  2. Add compound indexes for frequent queries (user + status, trip + driver).
  3. Use `.lean()` for read-only queries.
  4. Implement pagination on all list endpoints.
  5. Use MongoDB aggregation pipeline for complex queries (find-clients sorting).

### TASK-102: Real-Time Performance
- **Files**: `backend/tracking/trackingService.js`, `backend/config/socket.js`
- **Dependencies**: TASK-024, TASK-025
- **Steps**:
  1. Optimize Socket.IO room management for scalability.
  2. Throttle location updates (max every 3-5 seconds).
  3. Use Redis adapter for Socket.IO in multi-server deployment.
  4. Batch distance calculations.

### TASK-103: Frontend Performance
- **Files**: Various frontend files
- **Dependencies**: All frontend tasks
- **Steps**:
  1. Lazy load screens with React.lazy/Suspense.
  2. Memoize expensive components (maps, lists).
  3. Optimize map rendering (limit markers, cluster if needed).
  4. Image optimization (thumbnails, progressive loading).
  5. Cache API responses with React Query.

---

## SECTION 14: SECURITY

### TASK-104: Authentication Security
- **Files**: `backend/middleware/auth.js`, `backend/services/authService.js`
- **Dependencies**: TASK-021
- **Steps**:
  1. JWT with short expiry + refresh token rotation.
  2. Password hashing with bcrypt (salt rounds ≥ 10).
  3. Rate limiting on auth endpoints (express-rate-limit).
  4. Brute force protection.
  5. HTTPS enforcement.

### TASK-105: Input Validation & Sanitization
- **Files**: `backend/middleware/validate.js`, `backend/validators/*.js`
- **Dependencies**: TASK-022
- **Steps**:
  1. Joi validation on all inputs.
  2. Sanitize HTML/script injection.
  3. Validate file uploads (type, size, content).
  4. Parameterized MongoDB queries (prevent NoSQL injection).

### TASK-106: Payment Security
- **Files**: `backend/services/paymentService.js`
- **Dependencies**: TASK-039, TASK-040
- **Steps**:
  1. Stripe webhook signature verification.
  2. PayPal IPN verification.
  3. Server-side price validation (never trust client-sent amounts).
  4. Transaction atomicity (use MongoDB transactions).
  5. Audit trail for all financial operations.

### TASK-107: Data Privacy
- **Files**: Various backend files
- **Dependencies**: All backend tasks
- **Steps**:
  1. Encrypt sensitive data at rest (documents, payment info).
  2. GDPR compliance: data export, account deletion with full data purge.
  3. Minimal data exposure in API responses (exclude passwords, tokens).
  4. Secure file storage in GCS with signed URLs.
  5. Privacy policy compliance.

---

## SECTION 15: DEPLOYMENT

### TASK-108: Backend Deployment
- **Files**: `backend/Dockerfile`, `backend/docker-compose.yml`, `backend/.env.production`
- **Dependencies**: All backend tasks
- **Steps**:
  1. Create Dockerfile for backend.
  2. Docker Compose with MongoDB, Redis, backend services.
  3. Environment-specific configs (.env.production).
  4. Process manager (PM2) for Node.js.
  5. Deploy to cloud (AWS/GCP/DigitalOcean).
  6. SSL certificate setup.
  7. Domain configuration: api.detour.ma.

### TASK-109: Frontend Deployment
- **Files**: `frontend/app.json`, `frontend/eas.json`
- **Dependencies**: All frontend tasks
- **Steps**:
  1. Configure EAS Build for iOS and Android.
  2. Build production APK/IPA.
  3. Submit to Google Play Store and Apple App Store.
  4. Web build: deploy to Vercel/Netlify with domain detour.ma.
  5. Configure deep linking.
  6. Push notification certificates (APNs for iOS, FCM for Android).

### TASK-110: Admin Panel Deployment
- **Files**: `admin-panel/vite.config.ts`, `admin-panel/Dockerfile`
- **Dependencies**: All admin panel tasks
- **Steps**:
  1. Vite production build.
  2. Deploy to Vercel/Netlify or containerize.
  3. Domain configuration: admin.detour.ma.
  4. Secure with admin-only access.

### TASK-111: CI/CD Pipeline
- **Files**: `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`
- **Dependencies**: TASK-108, TASK-109, TASK-110
- **Steps**:
  1. GitHub Actions: lint, test, build on PR.
  2. Auto-deploy backend on merge to main.
  3. Auto-deploy admin panel on merge to main.
  4. EAS Build triggers for frontend.
  5. Environment variable management.

### TASK-112: Monitoring & Logging
- **Files**: `backend/utils/logger.js`, monitoring config files
- **Dependencies**: TASK-108
- **Steps**:
  1. Structured logging with Winston.
  2. Error tracking (Sentry).
  3. Health check endpoint.
  4. MongoDB monitoring.
  5. Socket.IO connection monitoring.
  6. API response time tracking.
  7. Alerting for critical errors.
