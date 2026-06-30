# Authentication Audit

This document fulfills Step 8 of the Deep Dive Audit.

## 1. Authentication Strategy
- **Mechanism:** JWT (JSON Web Tokens) via `x-auth-token` headers.
- **Roles:** `passenger`, `driver`, `admin`.

## 2. Token Security & Expiry
- **Missing Refresh Tokens:** The application only issues a single JWT on login. There is no refresh token architecture (`/auth/refresh`). If the token is long-lived, it's a security risk. If short-lived, users will be logged out frequently.
- **No Token Blacklist:** When a user logs out from the frontend, the token is simply deleted from local storage. The backend does not maintain a Redis blacklist for revoked tokens. The token remains technically valid until it expires.

## 3. Middleware Evaluation (`auth.js`)
- **`auth` middleware:** Correctly decodes the JWT and attaches `req.user`.
- **`requireVerification` middleware:** Restricts drivers who are not `verified` (e.g., missing documents).
- **`authAdmin` middleware:** Checks for `req.user.role === 'admin'`. However, it does a full DB lookup (`User.findById(req.user.id)`) on *every* admin request, which is unnecessary if the role is already encoded in the JWT payload.

## 4. Edge Cases
- **OTP/2FA:** There is no 2FA or SMS verification implemented for passenger/driver registration. This makes the platform vulnerable to fake accounts and bots.
- **Role Switching:** The architecture supports a single user toggling between `passenger` and `driver` modes. The JWT needs to accurately reflect this or the `requireVerification` middleware must be extremely precise to not block a driver from taking a passenger ride while their driver profile is pending verification.
