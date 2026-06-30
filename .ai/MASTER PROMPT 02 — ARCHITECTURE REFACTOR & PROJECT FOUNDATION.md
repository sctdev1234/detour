# ROLE

You are the Lead Software Architect responsible for preparing this ride-hailing platform for production.

You are also acting as:

• Senior React Native Engineer
• Senior Node.js Engineer
• Senior MongoDB Architect
• Senior DevOps Engineer
• Senior Security Engineer
• Senior QA Engineer

Your goal is NOT to build new features.

Your goal is to create an architecture capable of supporting a production ride-hailing platform with:

• Passenger App
• Driver App
• Admin Dashboard
• Backend API
• Socket Server
• Notifications
• Wallet
• Payments
• Analytics
• Recurring Rides
• Future Extensions

Everything must be scalable, maintainable and easy to extend.

------------------------------------------------------------

# VERY IMPORTANT

Do NOT rewrite the project from scratch.

Do NOT delete working code.

Do NOT break existing features.

Prefer refactoring over replacing.

Keep existing business logic whenever possible.

If something must change, migrate it safely.

------------------------------------------------------------

# PROJECT GOAL

Prepare the project so future development becomes fast and predictable.

This sprint exists ONLY to improve architecture.

NO major feature implementation.

NO UI redesign.

NO recurring rides implementation.

------------------------------------------------------------

# STEP 1 — Repository Cleanup

Inspect the entire repository.

Find and safely remove or fix:

• duplicate components
• duplicate hooks
• duplicate utilities
• duplicate API services
• duplicate socket handlers
• dead routes
• dead screens
• unused assets
• unused fonts
• unused images
• unused translations
• unused dependencies
• commented legacy code
• temporary code
• TODOs
• FIXMEs
• excessive console.log
• debug helpers

Never remove code that is still referenced.

------------------------------------------------------------

# STEP 2 — Folder Structure

Reorganize only if necessary.

Target architecture should clearly separate:

apps/
    passenger/
    driver/
    admin/

packages/
    ui/
    hooks/
    services/
    api/
    constants/
    utils/
    validation/
    types/
    config/

backend/
    controllers/
    routes/
    middleware/
    models/
    services/
    repositories/
    sockets/
    validators/
    jobs/
    config/
    utils/

Maintain clean boundaries.

------------------------------------------------------------

# STEP 3 — Dependency Audit

Inspect every dependency.

Classify:

Required

Optional

Unused

Deprecated

Risky

Suggest replacements when appropriate.

Remove only confirmed unused packages.

------------------------------------------------------------

# STEP 4 — TypeScript

Enable strict TypeScript.

Remove:

any

implicit any

unsafe casting

duplicate interfaces

duplicate types

Create shared types.

Move common types into packages/types.

------------------------------------------------------------

# STEP 5 — Environment Configuration

Audit:

.env

.env.local

.env.development

.env.staging

.env.production

Separate:

API URLs

Socket URLs

Maps Keys

Storage Keys

JWT secrets

Feature flags

Never hardcode secrets.

Validate environment variables at startup.

------------------------------------------------------------

# STEP 6 — Configuration Layer

Create centralized configuration.

Frontend

Backend

Admin

Socket

Maps

Notifications

Storage

No magic values.

------------------------------------------------------------

# STEP 7 — API Layer

Inspect every API.

Standardize:

Base client

Authentication

Refresh Token

Retries

Timeouts

Pagination

Filtering

Sorting

Request cancellation

Error handling

Response parsing

Logging

------------------------------------------------------------

# STEP 8 — Socket Layer

Create a clean realtime architecture.

Organize:

Socket connection

Authentication

Reconnection

Heartbeat

Namespaces

Rooms

Events

Event validation

Rate limiting

Offline queue

Automatic resubscribe

Connection status

No duplicated listeners.

------------------------------------------------------------

# STEP 9 — State Management

Audit Zustand stores.

Find:

duplicate state

derived state stored unnecessarily

large stores

coupled stores

circular updates

Split where appropriate.

Keep stores small and focused.

------------------------------------------------------------

# STEP 10 — React Query

Audit queries.

Standardize:

query keys

cache time

stale time

optimistic updates

mutations

prefetch

invalidation

retry strategy

offline behavior

------------------------------------------------------------

# STEP 11 — Hooks

Audit custom hooks.

Find:

duplicate logic

memory leaks

expensive rerenders

missing cleanup

dependency mistakes

Extract reusable hooks.

------------------------------------------------------------

# STEP 12 — Component Architecture

Audit components.

Separate:

Presentation

Container

Business Logic

Reusable UI

Map Components

Ride Components

Driver Components

Passenger Components

Admin Components

Avoid huge components.

------------------------------------------------------------

# STEP 13 — Backend Architecture

Review every controller.

Move business logic into services.

Move database logic into repositories.

Controllers should stay thin.

------------------------------------------------------------

# STEP 14 — MongoDB

Audit schemas.

Improve:

indexes

references

validation

timestamps

soft deletes

geospatial indexes

compound indexes

transactions

Future compatibility with recurring rides.

Do NOT implement recurring rides yet.

------------------------------------------------------------

# STEP 15 — Validation

Standardize validation.

Frontend

Backend

Socket events

Forms

Environment variables

Database input

Prefer one validation strategy.

------------------------------------------------------------

# STEP 16 — Error Handling

Standardize.

Create:

Application Errors

Validation Errors

Authentication Errors

Permission Errors

Network Errors

Database Errors

Socket Errors

Unknown Errors

Consistent error responses.

------------------------------------------------------------

# STEP 17 — Logging

Replace development logging.

Backend

Structured logger.

Frontend

Minimal production-safe logging.

Remove debug noise.

------------------------------------------------------------

# STEP 18 — Security Foundation

Verify:

JWT

Refresh Tokens

Password hashing

OTP flow

Authorization

RBAC preparation

Rate limiting

Helmet

CORS

Input sanitization

File upload validation

Storage permissions

Secure local storage

------------------------------------------------------------

# STEP 19 — Performance Foundation

Identify:

large rerenders

expensive maps

large FlatLists

missing memoization

slow queries

missing indexes

duplicate requests

large bundle issues

Create optimization recommendations.

------------------------------------------------------------

# STEP 20 — Testing Foundation

Prepare architecture for:

Unit Tests

Integration Tests

API Tests

Socket Tests

Component Tests

E2E Tests

Do not write full test suites yet.

Prepare the project.

------------------------------------------------------------

# STEP 21 — Documentation

Generate or update:

Architecture.md

FolderStructure.md

Environment.md

APIStandards.md

SocketArchitecture.md

CodingStandards.md

StateManagement.md

DatabaseArchitecture.md

DeploymentChecklist.md

------------------------------------------------------------

# STEP 22 — Code Quality

Run a complete review.

No:

duplicate code

dead code

unused imports

lint issues

TypeScript errors

unreachable code

unsafe promises

missing awaits

missing cleanup

------------------------------------------------------------

# STEP 23 — Acceptance Checklist

Verify:

Application builds successfully.

Passenger app works.

Driver app works.

Admin works.

Backend starts.

Socket server starts.

Authentication still works.

Ride flow still works.

Maps still work.

Storage still works.

No existing feature is broken.

------------------------------------------------------------

# FINAL DELIVERABLE

Produce:

1. Refactoring summary.

2. Files modified.

3. Files created.

4. Architecture diagram.

5. Dependency report.

6. Security report.

7. Performance report.

8. Technical debt removed.

9. Remaining risks.

10. Recommendations for Sprint 3.

Stop after architecture is stable.

Do NOT redesign the UI.

Do NOT add new product features.

Do NOT implement recurring rides yet.

Everything must remain compatible with future recurring rides.