# Backend Architecture Audit

This document fulfills Step 4 of the Deep Dive Audit for `backend/`.

## 1. Controllers & Routes

The backend uses a traditional Express structure. 99 routes are distributed across the following controllers:
- `adminController.js`, `authController.js`, `carController.js`, `chatController.js`, `notificationController.js`, `pageController.js`, `placeController.js`, `reclamationController.js`, `trackingController.js`, `transactionController.js`, `tripController.js`, `uploadController.js`.

### Findings:
- **Fat Controllers:** Despite earlier refactoring attempts, controllers like `tripController.js` and `authController.js` still contain significant business logic mixed with HTTP request extraction (e.g. `req.body`). 
- **Missing Awaits:** Manual inspection of `chatController.js` and `notificationController.js` reveals potential fire-and-forget Promises (e.g., sending a notification but not `await`ing the DB write). This could lead to unhandled promise rejections if the DB drops.
- **Error Propagation:** The central `errorHandler.js` was introduced, and controllers are wrapped in `try/catch` passing `err` to `next(err)`. However, there is no generic `catchAsync` utility wrapper, meaning every single controller function manually repeats `try { ... } catch(err) { next(err) }`.

## 2. Middleware & Validators
- `auth.js`: Verifies JWT tokens successfully. Does not check for token blacklisting (revoked tokens).
- `validate.js`: Implemented to wrap `Zod` schemas. 
- **Missing Validations:** While `validate.js` exists, it is not consistently applied to *every* route in `routes/*.js`. Many routes still implicitly trust `req.body`.
- `uploadMiddleware.js`: Uses Multer. Validates file types but does not scan for malicious payloads.

## 3. Services & Repositories
- **Services:** `placeService.js`, `pageService.js`, `tripService.js`.
  - *Observation:* Services handle core business rules. `tripService.js` correctly encapsulates fare calculation and state machine transitions.
- **Repositories:** `BaseRepository.js` and specialized repos (`TripRepository.js`, `UserRepository.js`).
  - *Observation:* `BaseRepository` provides generic `create`, `findById`, etc. Some controllers completely bypass the Repository layer and use Mongoose models directly (e.g., `User.findOne(...)` in `authController.js`). This defeats the purpose of the abstraction.

## 4. Authentication Flow & Authorization
- **JWT:** Standard access tokens are issued.
- **Refresh Tokens:** `authController.js` handles login, but the ecosystem lacks a robust Refresh Token rotation strategy. Access tokens might be long-lived, which is a security risk.
- **Authorization:** `roleGuard` middleware exists but RBAC (Role-Based Access Control) is very primitive (just `req.user.role === 'admin'`). Fine-grained permissions (e.g., a driver can only update *their* trips) are sometimes checked inside the controller rather than a declarative policy.

## 5. Security & Performance Constraints
- **Unsafe Promises:** Found multiple `.save()` calls without awaits inside looping constructs (e.g., bulk updating records).
- **Transactions:** Complex operations (like starting a trip and deducting balance) are NOT wrapped in MongoDB transactions (`session.withTransaction`). If an error occurs halfway, the database will be left in an inconsistent state.
