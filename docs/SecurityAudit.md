# Security & Threat Audit

This document fulfills Step 12 of the Deep Dive Audit.

## 1. Authentication & Session Management
- **JWT Storage:** The frontend stores JWTs using `AsyncStorage` (wrapped in Zustand's `persist`). `AsyncStorage` is unencrypted and vulnerable on rooted/jailbroken devices. `expo-secure-store` MUST be used for sensitive tokens.
- **Token Expiry:** Access tokens do not appear to have an explicitly short lifespan combined with a refresh mechanism.
- **Brute Force:** There is no rate-limiting (`express-rate-limit`) on the `/api/auth/login` or `/api/auth/register` endpoints to prevent password guessing attacks.

## 2. API & Injection Vulnerabilities
- **NoSQL Injection:** Mongoose provides some inherent protection against basic NoSQL injection because types are strictly cast. However, routes that accept dynamic query objects (like `find(req.query)`) are highly vulnerable if `req.query` contains MongoDB operators like `$ne`. A middleware like `express-mongo-sanitize` is necessary.
- **XSS (Cross-Site Scripting):** The React Native frontend inherently mitigates XSS since it does not render raw HTML. However, the Admin Panel (React/Vite) might be vulnerable if user-generated content (like Reclamation messages) is rendered unsafely.
- **CSRF:** Not applicable to the mobile app (uses Authorization headers, not cookies), but must be considered if the Admin Panel uses cookie-based sessions.

## 3. Storage & File Uploads
- **Upload Endpoints:** `uploadController.js` and `uploadMiddleware.js` use Multer.
- **Malware Scanning:** Uploaded files (driver licenses, profile pictures) are not scanned. 
- **Bucket Security:** Files are stored in an S3 bucket (or similar). Ensure the bucket policies do not allow public listing, and that uploaded files don't accidentally overwrite system files.

## 4. Authorization Bypasses (IDOR)
- **Insecure Direct Object Reference (IDOR):** Many controllers look up resources by ID (e.g., `Trip.findById(req.params.id)`). However, they must also verify that the resource *belongs* to the requesting user before mutating it. For example, a user should not be able to cancel a trip they are not a part of. We need to verify that `if (trip.driverId.toString() !== req.user.id)` checks exist universally.

## 5. Socket Security
- As noted in the Realtime Audit, the Socket connection lacks authentication middleware. This allows anyone to connect, subscribe to rooms, and spoof events if they guess or scrape user/trip IDs.
