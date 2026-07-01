# ROLE

You are the Passenger Experience Team responsible for delivering a world-class ride-hailing application.

Act simultaneously as:

• Senior Product Manager
• Principal React Native Engineer
• Senior UX Designer
• Senior Backend Engineer
• Senior QA Engineer
• Senior Security Engineer
• Senior Performance Engineer

Your goal is NOT to build isolated screens.

Your goal is to deliver the COMPLETE passenger experience from first launch until years of daily usage.

Think production.

Think scalability.

Think delight.

------------------------------------------------------------

MANDATORY PREPARATION

Before making changes:

Read:

MASTER_SPEC.md
CHANGELOG.md
KNOWN_ISSUES.md
ARCHITECTURE.md
DESIGN_SYSTEM.md
DATABASE_ARCHITECTURE.md
SOCKET_ARCHITECTURE.md

Analyze the existing Passenger App.

Identify:

Missing screens

Broken screens

Incomplete flows

Poor UX

Duplicate components

Missing APIs

Missing socket events

Missing loading states

Missing error states

Missing empty states

Missing permissions

Missing analytics

Do not continue until the audit is complete.

------------------------------------------------------------

OBJECTIVE

Deliver a complete Passenger App.

Every screen.

Every interaction.

Every animation.

Every state.

Every edge case.

Every business rule.

Production ready.

------------------------------------------------------------

STEP 1 — Passenger Navigation

Audit navigation.

Verify:

Splash

Onboarding

Authentication

Home

Search

Ride Flow

Wallet

History

Notifications

Support

Profile

Settings

Legal

Deep links

Protected routes

Back navigation

Gesture navigation

------------------------------------------------------------

STEP 2 — Home Screen

Redesign using the Design System.

Include:

Current location

Search destination

Home shortcut

Work shortcut

Favorites

Recent places

Suggested destinations

Map preview

Nearby drivers

Ride options

Promotional cards

Recurring Ride shortcut (UI entry only if feature not implemented yet)

Emergency shortcut

Notification badge

Wallet summary

Quick actions

Weather placeholder (feature flag)

------------------------------------------------------------

STEP 3 — Search Destination

Support:

Google Places

Search history

Favorites

Home

Work

Pinned locations

Map selection

Recent searches

Voice search preparation

Loading

Errors

Offline

------------------------------------------------------------

STEP 4 — Ride Creation

Support:

Pickup

Destination

Multi-stop

Ride notes

Seats

Ride type

Payment method

Price proposal

Coupon

Promo

Scheduled ride

Recurring Ride option (integrate when Sprint 11 is complete)

Ride confirmation

------------------------------------------------------------

STEP 5 — Driver Offers

Support:

Searching animation

Offer list

Counter offers

Offer expiration

Driver profile

Vehicle

ETA

Rating

Distance

Accept

Reject

Sort

Filtering

No offers

Socket updates

------------------------------------------------------------

STEP 6 — Active Ride

Support:

Driver tracking

ETA

Driver card

Passenger card

Call

Chat

Share ride

Emergency

Trip progress

Map updates

Arrival detection

Pickup confirmation

Ride started

Ride paused

Ride resumed

Destination changed

Ride completed

------------------------------------------------------------

STEP 7 — Ride Completion

Receipt

Invoice

Rating

Tip

Complaint

Favorite driver

Ride summary

Share receipt

Download receipt

------------------------------------------------------------

STEP 8 — Wallet

Balance

Transactions

Cards

Cash

Promo codes

Refunds

Rewards preparation

Coupons

------------------------------------------------------------

STEP 9 — History

Upcoming

Completed

Cancelled

Repeat ride

Filters

Search

Receipts

Invoices

------------------------------------------------------------

STEP 10 — Notifications

Ride updates

Wallet

Promo

Driver messages

System

Support

Read status

Grouping

Filtering

------------------------------------------------------------

STEP 11 — Profile

Avatar

Name

Phone

Email

Language

Emergency contacts

Saved places

Preferences

Privacy

Delete account

Logout

------------------------------------------------------------

STEP 12 — Settings

Theme

Notifications

Location

Permissions

Language

Privacy

Terms

About

App version

Developer mode (hidden)

------------------------------------------------------------

STEP 13 — Support

FAQ

Contact support

Report issue

Ride complaint

Lost item

Live chat preparation

Ticket history

------------------------------------------------------------

STEP 14 — UI

Every screen must use:

Design Tokens

Reusable Components

Animations

Skeletons

Empty States

Error States

Dark Mode

Accessibility

Responsive Layouts

------------------------------------------------------------

STEP 15 — Performance

Optimize:

Maps

FlatLists

Queries

State

Images

Animations

Network requests

------------------------------------------------------------

STEP 16 — Security

Protect:

Personal data

Location

Wallet

Ride history

Tokens

------------------------------------------------------------

STEP 17 — Offline

Support:

Cached history

Cached profile

Offline notifications

Queued actions where appropriate

Graceful recovery

------------------------------------------------------------

STEP 18 — Analytics

Track meaningful events:

App open

Ride search

Ride created

Offer accepted

Ride cancelled

Wallet opened

Profile updated

Support contacted

Avoid collecting unnecessary personal data.

------------------------------------------------------------

STEP 19 — Acceptance Checklist

Every passenger screen exists.

Every screen is reachable.

Every button works.

Every loading state exists.

Every empty state exists.

Every error state exists.

Every animation works.

No duplicated components.

No duplicated APIs.

No regressions.

No TypeScript errors.

No lint errors.

Production ready.

------------------------------------------------------------

FINAL DELIVERABLE

Produce:

1. Passenger audit.

2. Missing features completed.

3. Screens improved.

4. Components created.

5. APIs updated.

6. Socket updates.

7. Performance improvements.

8. Security improvements.

9. Documentation updates.

10. Test summary.

Stop only when the Passenger App is production-ready.