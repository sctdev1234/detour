# ROLE

You are acting as the Authentication Team for a production ride-hailing platform.

You are simultaneously:

• Principal Mobile Engineer
• Principal Backend Engineer
• Security Architect
• Identity Engineer
• MongoDB Architect
• UX Designer
• QA Lead

Your responsibility is to completely audit, refactor, complete and harden the authentication and identity system.

This sprint must produce a production-ready authentication module.

------------------------------------------------------------

# IMPORTANT

Never remove working functionality.

Never rewrite modules unnecessarily.

Prefer refactoring.

Maintain compatibility with previous sprints.

Everything must follow:

Architecture
Design System
Security Standards
Coding Standards

------------------------------------------------------------

# STEP 1

Audit current authentication.

Inspect:

Passenger login

Driver login

Admin login

Registration

OTP

Token handling

Profile creation

Logout

Session handling

Permissions

Password reset

Delete account

Identify:

Broken flows

Missing flows

Security issues

Duplicate code

Poor UX

Missing validations

Missing states

------------------------------------------------------------

# STEP 2

Authentication Providers

Support:

Phone Number + OTP

Google Sign-In

Apple Sign-In (iOS)

Email (optional, configurable)

Guest mode (feature flag)

Admin login

Driver login

Passenger login

Every provider must share a unified architecture.

------------------------------------------------------------

# STEP 3

Passenger Registration

Complete flow:

Welcome

Language

Terms

Privacy

Phone

OTP

Name

Photo

Location Permission

Notification Permission

Home city (optional)

Profile completion

Session creation

Automatic login

Verify every possible interruption.

------------------------------------------------------------

# STEP 4

Driver Registration

Create a production-grade onboarding.

Steps:

Personal information

Phone verification

Identity verification

Driver license

Vehicle information

Vehicle photos

Insurance

Registration documents

Profile photo

Selfie verification

Background check status

Approval pending

Approval rejected

Approval approved

Support document re-upload and partial approvals.

------------------------------------------------------------

# STEP 5

Admin Authentication

Secure login

RBAC preparation

Session expiration

Multi-device policy

Permission preparation

------------------------------------------------------------

# STEP 6

OTP

Audit completely.

Handle:

Wrong OTP

Expired OTP

Resend timer

Maximum attempts

Rate limiting

Network failures

Offline

Duplicate requests

Time synchronization

------------------------------------------------------------

# STEP 7

JWT

Audit:

Access token

Refresh token

Expiration

Refresh flow

Logout

Revocation

Invalid token

Expired token

Multiple devices

------------------------------------------------------------

# STEP 8

Permissions

Handle:

Location

Background Location

Notifications

Camera

Gallery

Microphone (future voice notes)

Storage

Contacts (future emergency contacts)

Gracefully recover when permissions are denied.

------------------------------------------------------------

# STEP 9

Profile Completion

Passenger

Driver

Admin

Completion percentage

Missing information prompts

Profile editing

Avatar upload

Document upload

------------------------------------------------------------

# STEP 10

Account Management

Edit profile

Change phone

Change email

Delete account

Deactivate account

Logout all devices

Change language

Notification preferences

Privacy settings

------------------------------------------------------------

# STEP 11

Security

Validate:

Passwords (if enabled)

Phone numbers

Emails

Documents

Images

JWT

Refresh Tokens

Replay attacks

Brute force protection

Rate limiting

OTP abuse

------------------------------------------------------------

# STEP 12

Backend

Review:

Controllers

Routes

Middleware

Validators

Services

Repositories

Mongo models

Indexes

Audit logs

------------------------------------------------------------

# STEP 13

Frontend

Refactor screens to use the Design System.

Standardize:

Inputs

Buttons

Cards

Loaders

Errors

Snackbars

Bottom Sheets

Dialogs

Animations

------------------------------------------------------------

# STEP 14

Error Handling

Support:

No Internet

Server Error

OTP Expired

OTP Invalid

Blocked User

Pending Driver Approval

Rejected Driver

Maintenance Mode

Token Expired

Account Deleted

Session Conflict

------------------------------------------------------------

# STEP 15

Loading States

Every screen must have:

Skeleton

Spinner

Button loading

Retry

Offline state

------------------------------------------------------------

# STEP 16

Accessibility

Verify:

Screen readers

Keyboard

Dynamic fonts

Contrast

Touch targets

Voice guidance

------------------------------------------------------------

# STEP 17

Testing

Verify every flow.

Passenger

Driver

Admin

OTP

Google

Apple

Refresh token

Logout

Permission denial

Offline

Network recovery

App killed during authentication

------------------------------------------------------------

# STEP 18

Documentation

Update:

Authentication.md

Permissions.md

IdentityFlow.md

Security.md

------------------------------------------------------------

# STEP 19

Acceptance Checklist

Passenger onboarding complete.

Driver onboarding complete.

Admin login secure.

OTP secure.

Sessions stable.

Permissions handled.

Profile editing works.

Logout works.

Delete account works.

No duplicate code.

No TypeScript errors.

No lint errors.

No regressions.

------------------------------------------------------------

# FINAL DELIVERABLE

Produce:

1. Authentication audit.

2. Files modified.

3. Security improvements.

4. UX improvements.

5. Remaining issues.

6. Documentation updates.

7. Test results.

8. Readiness for Sprint 5.

Stop only when authentication is production-ready.