# ROLE

You are now the Driver Experience Team responsible for delivering a production-grade Driver Application.

You already know this repository.

You MUST inspect the existing implementation before making changes.

Never assume.

Never recreate components that already exist.

Never duplicate business logic.

Always improve the current implementation.

------------------------------------------------------------

MANDATORY PREPARATION

Before writing code:

Read

MASTER_SPEC.md

ARCHITECTURE.md

DESIGN_SYSTEM.md

DATABASE_ARCHITECTURE.md

SOCKET_ARCHITECTURE.md

CHANGELOG.md

KNOWN_ISSUES.md

Read the entire Driver module.

Inspect every imported component.

Inspect every API.

Inspect every socket event.

Inspect every Zustand store.

Inspect every React Query hook.

Inspect every backend endpoint used by the Driver App.

------------------------------------------------------------

STEP 1 — DRIVER AUDIT

Generate a complete audit.

List

Every screen

Every component

Every modal

Every bottom sheet

Every dialog

Every hook

Every API

Every socket event

Every navigation route

Every permission

Every animation

Every missing feature

Every duplicated feature

Every incomplete flow

Every UI inconsistency

Every backend dependency

Give every item a completion percentage.

------------------------------------------------------------

STEP 2 — FEATURE CONTRACT

Before implementing anything generate a Feature Contract.

Purpose

Actors

Driver

Passenger

Admin

Business Rules

Database Collections

API Endpoints

Socket Events

Permissions

Notifications

Analytics Events

Loading States

Empty States

Error States

Offline Behaviour

Accessibility Requirements

Performance Requirements

Definition of Done

Do not continue until the Feature Contract is complete.

------------------------------------------------------------

STEP 3 — DRIVER HOME

Audit and improve.

Online

Offline

Break Mode

Current Earnings

Today's Trips

Upcoming Trips

Heat Map

Demand Zones

Wallet Summary

Quick Actions

Vehicle Status

Unread Notifications

Connection Status

GPS Status

Network Status

Shift Timer

------------------------------------------------------------

STEP 4 — DRIVER STATUS

Support

Online

Offline

Busy

Break

Returning Home

Scheduled Only

Recurring Route Only (future compatible)

Handle transitions safely.

------------------------------------------------------------

STEP 5 — RIDE REQUESTS

Audit request flow.

Support

Incoming Requests

Ride Now

Scheduled Ride

Future Recurring Ride compatibility

Offer Submission

Counter Offer

Reject

Ignore

Timeout

Duplicate Requests

Priority Requests

Offer Expiration

------------------------------------------------------------

STEP 6 — ACTIVE TRIP

Audit

Navigation

Arrival

Waiting

Passenger Pickup

Trip Started

Trip Paused

Trip Resumed

Trip Completed

Multi-stop

Future Multi-passenger compatibility

Live ETA

Driver Notes

Emergency

Lost GPS

Lost Internet

------------------------------------------------------------

STEP 7 — VEHICLE MANAGEMENT

Audit

Vehicle

Insurance

Registration

Photos

Inspection

Seat Count

Vehicle Type

Documents

Expiration Alerts

------------------------------------------------------------

STEP 8 — DRIVER PROFILE

Audit

Identity

Photo

Phone

Language

Documents

Ratings

Reviews

Verification Status

Support

Settings

Delete Account

Logout

------------------------------------------------------------

STEP 9 — DRIVER WALLET

Audit

Balance

Transactions

Withdrawals

Bonuses

Incentives

Commission

Pending Payments

History

------------------------------------------------------------

STEP 10 — DRIVER ANALYTICS

Daily

Weekly

Monthly

Acceptance Rate

Cancellation Rate

Completion Rate

Online Time

Distance

Revenue

Heat Maps

------------------------------------------------------------

STEP 11 — SOCKET REVIEW

Verify every event.

Driver Connected

Driver Online

Driver Offline

Location Updated

Offer Sent

Offer Cancelled

Offer Accepted

Ride Assigned

Ride Cancelled

Trip Started

Trip Completed

Wallet Updated

Reconnect

Duplicate Events

Race Conditions

------------------------------------------------------------

STEP 12 — MAP REVIEW

Driver Marker

Passenger Marker

Route

ETA

Navigation Overlay

Camera

Compass

Arrival Radius

GPS Accuracy

Location Smoothing

Battery Optimisation

------------------------------------------------------------

STEP 13 — PERFORMANCE

Review

Rendering

Sockets

Maps

Queries

Lists

Images

Animations

Memory

Battery

Background Tracking

------------------------------------------------------------

STEP 14 — TESTING

Verify

Online

Offline

Ride Acceptance

Ride Rejection

Offer Timeout

GPS Lost

Internet Lost

Token Expired

Background Mode

Foreground Mode

Phone Call Interruptions

App Restart

------------------------------------------------------------

STEP 15 — DOCUMENTATION

Update

MASTER_SPEC.md

CHANGELOG.md

DriverArchitecture.md

SocketArchitecture.md

API.md

Testing.md

------------------------------------------------------------

STEP 16 — FINAL VERIFICATION

Verify

Every Driver screen works

Every button works

Every API works

Every socket event works

Every animation works

Every loading state exists

Every empty state exists

Every error state exists

No duplicate code

No TypeScript errors

No lint errors

No regressions

Ready for production

Stop only when the Driver App is production-ready.