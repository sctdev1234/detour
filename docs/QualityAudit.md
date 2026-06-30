# Code Quality Audit

This document fulfills Step 11 of the Deep Dive Audit.

## 1. TODOs and FIXMEs
- A repository-wide scan for `TODO` and `FIXME` yielded very few results (found primarily in `frontend/utils/logger.ts` related to Sentry integration). 
- *Observation:* While the code lacks explicit `TODO` tags, the architectural gaps (missing edge cases, missing awaits) act as implicit technical debt that needs tracking.

## 2. Console Logs & Debugging
- `console.log` statements were previously scattered across the backend. They have mostly been replaced by `winston` via `utils/logger.js`.
- On the frontend, `console.log` statements are still heavily used in React Query hooks (`useTripQueries.ts`, `useAuthQueries.ts`) and socket event handlers. These need to be stripped or wrapped in a development-only logger to prevent memory leaks in production.

## 3. Code Duplication
- **API Fetching:** The frontend utilizes custom wrappers around `fetch` inside `hooks/api/`. However, there is some repetition in how tokens are retrieved from `useAuthStore.getState().token`. A central Axios or Fetch interceptor (`apiClient.ts`) would DRY this up.
- **Form Validation:** The frontend uses React state (`[email, setEmail]`) and manual `if (!email)` checks instead of a robust form library like `react-hook-form` coupled with `zod`. This leads to duplicated validation logic across Login, Signup, and Add Car screens.

## 4. Error Handling
- **Backend:** Now standardized using `errorHandler.js`, but missing a `catchAsync` wrapper, leading to duplicated `try/catch` blocks in controllers.
- **Frontend:** React Query's `onError` handlers correctly pop Toasts using `useUIStore()`. However, the app lacks an `ErrorBoundary` at the root layout (`_layout.tsx`) to catch fatal React render errors gracefully. If a component crashes, the entire app white-screens.
