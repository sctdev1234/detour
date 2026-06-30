# Production Deployment Checklist

## 1. Environment & Secrets
- [ ] Ensure `NODE_ENV=production` on the backend and frontend build environments.
- [ ] Confirm all strong random secrets (e.g., `JWT_SECRET`) are configured securely in standard secret managers (AWS Secrets Manager, Vercel Env, etc.), avoiding `.env` files checking into source control.
- [ ] Verify Maps API keys (Google Maps / Leaflet endpoints) are restricted by HTTP referrers and App package names.

## 2. Security & Compliance
- [ ] Confirm `helmet` and `cors` are enforcing strict origin policies matching production domains.
- [ ] Validate `express-rate-limit` thresholds are correctly tuned for production traffic.
- [ ] Ensure MongoDB connection URI uses `mongodb+srv://` and points to the production cluster with restricted IP access.

## 3. Performance & Caching
- [ ] Verify React Query default cache and stale times are optimized.
- [ ] Confirm the Expo application is built using EAS Build (`eas build --profile production`) to strip development warnings, console logs, and debug hooks.
- [ ] Ensure MongoDB indexes have been successfully created on production collections.

## 4. Testing & Reliability
- [ ] Execute `npm run type-check` on the frontend.
- [ ] Run automated API test suite (`npm run test`) and verify all passing criteria.
- [ ] Check structured logging (Winston) output in a staging environment to ensure logs parse correctly in standard observability tools.
