# Driver Production Sprint - Engineering Contracts

This document contains the strict engineering contracts, impact reports, and business rules for the Driver Application Production Sprint. No implementation is considered complete without fulfilling these contracts.

===========================================================
## 1. REPOSITORY IMPACT REPORT
===========================================================
**Files to modify:**
- `backend/models/User.js` (Status schema update)
- `backend/models/Trip.js` (Lifecycle timestamps, commission tracking)
- `backend/services/tripService.js` (Emit events, write stats)
- `backend/controllers/authController.js` (Status validation)
- `frontend/store/useDashboardStore.ts` (Real state binding)
- `frontend/store/useFinanceStore.ts` (API connections)
- `frontend/app/_layout.tsx` (Global socket listeners)
- `frontend/app/(driver)/_layout.tsx` (New hidden screens)
- `frontend/components/DrawerContent.tsx` (Add Wallet and Stats routes)
- `frontend/components/Map.tsx` & `DashboardMap.tsx` (Performance fixes)

**Files to create:**
- `backend/services/walletService.js`
- `backend/services/analyticsService.js`
- `backend/routes/wallet.js`
- `backend/routes/analytics.js`
- `frontend/app/(driver)/wallet.tsx`
- `frontend/app/(driver)/stats.tsx`
- `frontend/store/useAnalyticsStore.ts`

**Files to delete:** None
**Components affected:** `QuickActions`, `FloatingTopBar`, `DashboardBottomSheet`
**Hooks affected:** None directly, using Zustand stores.
**Stores affected:** `useDashboardStore`, `useFinanceStore`
**Services affected:** `tripService.js`, `authService.js`
**API endpoints affected:**
- `PATCH /api/auth/driver/status`
- `POST /api/trip/:id/finish`
- `POST /api/trip/:id/cancel`
**Socket events affected:**
- `wallet:updated` (NEW)
- `driver:status_changed` (NEW)
**Database collections affected:** `users`, `trips`, `transactions`
**Indexes affected:** `users.driverStatus`
**Shared components affected:** `DrawerContent.tsx`
**Breaking-change risk:** Medium (Status enum change from boolean to string may break outdated clients).
**Migration requirements:** Convert existing driver `isOnline: boolean` to `driverStatus: 'ONLINE' | 'OFFLINE'`.
**Rollback strategy:** Revert to previous git commit and reverse MongoDB migration script.
**Estimated implementation risk:** Low-to-Medium.

===========================================================
## 2. FEATURE CONTRACT
===========================================================
**Purpose:** Transform the prototype Driver App into a production-grade system with real status handling, commission tracking, and analytics.
**Actors:** Drivers.
**Business goals:** Enable drivers to earn money, view their performance, and maintain a reliable online status.
**Functional requirements:** Drivers must toggle status, view wallet balances, withdraw funds, and see their stats (Acceptance Rate, etc.).
**Non-functional requirements:** Real-time updates without pull-to-refresh.
**Business rules:** See section 6.
**Offline behaviour:** Offline mode prevents status changes.
**Background behaviour:** Socket maintains connection if backgrounded briefly; gracefully reconnects.
**Analytics events:** `driver_online`, `driver_offline`, `wallet_withdrawn`.
**Accessibility requirements:** Text must contrast with backgrounds; large tap targets for toggles.
**Security requirements:** Wallet operations require Auth token and strict backend DB operations.
**Performance requirements:** Maps must run at 60 FPS without memory leaks (`tracksViewChanges={false}`).

===========================================================
## 3. API CONTRACT
===========================================================
**`GET /api/wallet/driver`**
- **Auth:** Bearer Token (Role: Driver)
- **Response:** `{ balance: number, transactions: [...] }`
- **Validation:** Ensure user is driver.

**`GET /api/analytics/driver/stats`**
- **Auth:** Bearer Token (Role: Driver)
- **Response:** `{ earningsTotal, acceptanceRate, completionRate, tripsCompleted, hoursOnline }`

**`PATCH /api/auth/driver/status`**
- **Body Schema:** `{ status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'BREAK' }`
- **Error Responses:** 400 (Cannot go offline during active trip).

===========================================================
## 4. SOCKET CONTRACT
===========================================================
**`wallet:updated`**
- **Emitter:** Backend (`walletService.js`)
- **Receiver:** Frontend (`_layout.tsx` -> `useFinanceStore`)
- **Payload:** `{ balance: number, newTransaction: object }`
- **Retry policy:** Rely on frontend socket.io auto-reconnect.

**`driver:status_changed`**
- **Emitter:** Backend (`authController` / `tripService`)
- **Payload:** `{ status: string }`

===========================================================
## 5. DATABASE CONTRACT
===========================================================
**Collections:** `users`, `trips`, `transactions`.
**Schema changes:** 
- `users`: Add `driverStatus` Enum. Add `stats.acceptanceRate`, `stats.completionRate`.
- `trips`: Add `commissionAmount`, `driverEarnings`.
- `transactions`: Add type `COMMISSION`, `TRIP_EARNING`.
**Transactions:** MongoDB ACID transactions should be used when `tripService.finishTrip` concurrently updates Wallet and creates a Transaction.

===========================================================
## 6. BUSINESS RULE ENGINE
===========================================================
**Driver Status:**
- Cannot go `ONLINE` if missing car/documents.
- Cannot go `OFFLINE` if assigned to an active, ongoing trip.
- Transitions automatically to `BUSY` when accepting an offer.
- Transitions back to `ONLINE` upon trip completion.

**Wallet:**
- Platform commission is exactly 15%.
- Cannot withdraw more than `balance`.

===========================================================
## 7. STATE MACHINES
===========================================================
**Driver State Machine:**
```
[OFFLINE] <--> [ONLINE]
   |             |
   |---->[BUSY]<--|
```
- `ONLINE` -> `BUSY` (Accepts Offer)
- `BUSY` -> `ONLINE` (Finishes/Cancels Trip)

===========================================================
## 8. OBSERVABILITY
===========================================================
- **Logs:** Emit structured logs on `tripService.finishTrip` success/failure.
- **Analytics:** PostHog/Mixpanel hooks when a driver views their wallet.
- **Exceptions:** Global Error boundary in React Native; Sentry logging for unhandled promises.

===========================================================
## 9. PERFORMANCE
===========================================================
- **Map Performance:** `tracksViewChanges` heavily optimized across `DashboardMap.tsx` and `Map.tsx` to prevent rerender loops.
- **Rendering:** Zustand selectors used in `DashboardBottomSheet` to prevent unnecessary component updates on unrelated state changes.
- **Network:** Sockets prevent HTTP polling.

===========================================================
## 10. TEST MATRIX
===========================================================
- **Happy Path:** Driver goes ONLINE, gets Trip, finishes Trip, views Wallet.
- **Edge Cases:** Driver tries to go offline mid-trip; socket disconnects mid-trip.
- **Offline:** Driver cannot toggle status without network.
- **Background:** GPS continues tracking if active trip; otherwise powers down.

===========================================================
## 11. PRODUCTION CHECKLIST
===========================================================
- [ ] No TypeScript errors
- [ ] No console.log
- [ ] No TODO/FIXME
- [ ] Security: Strict role checks on Wallet APIs
- [ ] Map Performance: `tracksViewChanges` set correctly
- [ ] Backend runs without startup crashes
