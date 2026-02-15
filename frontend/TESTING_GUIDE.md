# Detour App: Comprehensive Testing Guide

This document outlines the step-by-step procedures for testing all core functionalities of the Detour application, covering both Client (Passenger) and Driver flows.

## 1. Prerequisites
- **Browser/Environment**: Ensure the application is running locally (`http://localhost:8081`).
- **Data Cleanup**: For clean testing, consider clearing identifying data or creating new accounts if testing registration flow.

---

## 2. Authentication & Onboarding
### 2.1 Registration
1.  Navigate to the **Register** page.
2.  Enter valid details (Name, Email, Password, Phone).
3.  Submit the form.
4.  **Verify**: You are redirected to the Home/Dashboard or Onboarding flow.

### 2.2 Login
1.  Navigate to the **Login** page.
2.  Enter valid credentials (checks for error messages on invalid input).
3.  Submit.
4.  **Verify**: You land on the Dashboard (default is usually Passenger mode).

---

## 3. Profile & Settings
### 3.1 Role Switching
1.  Navigate to the **Profile** tab (User Icon).
2.  Locate the "Switch to Driver Mode" / "Switch to Passenger Mode" button.
3.  Click it.
4.  **Verify**: The interface updates (e.g., specific navigation items for Driver vs Passenger appear).

---

## 4. Driver Flow (The "Navette" Provider)
**Pre-requisite:** Switch to **Driver Mode**.

### 4.1 Car Management
1.  Navigate to **My Cars** (via Profile or Menu).
2.  Click **Add Car**.
3.  Upload required documents (Registration, Insurance) and car photos.
4.  Enter details (Make, Model, Year, Plate).
5.  Submit.
6.  **Verify**: The new car appears in the list.

### 4.2 Creating a Driver Route
1.  Navigate to the **Routes** or **Add Route** page (`/add-route` or `+` icon).
2.  **Map Interaction**:
    - Click to set **Start Point**.
    - Click to set **End Point**.
    - (Optional) Add Waypoints.
3.  **Form Details**:
    - Select **Date/Time** (e.g., Repeated days like Mon-Fri).
    - Set **Seats Available**.
    - (Optional) Set **Price**.
4.  Click **Create Route**.
5.  **Verify**: The route appears in "**My Routes**" list.

### 4.3 Finding Clients
1.  Navigate to **Find Clients** (Discovery Map).
2.  Check the map for Client request markers.
3.  Click on a client marker or list item to view details (Route, Budget).
4.  **Action**: Click **Invite**.
    - **Price Negotiation**: Enter a proposed price (can be different from client's budget).
    - Click **Send Invite**.
5.  **Verify**: Toast message confirms "Invitation Sent".

---

## 5. Client Flow (The Passenger)
**Pre-requisite:** Switch to **Passenger Mode**.

### 5.1 Creating a Route Request
1.  Navigate to **Add Route** / **Request Ride**.
2.  **Map Interaction**:
    - Set **Start** and **End** points.
3.  **Form Details**:
    - Set **Date/Time**.
    - Set **Seats Needed**.
    - Set **Proposed Price** (Budget).
4.  Click **Create Request**.
5.  **Verify**: The request is created and visible in your dashboard/activity list.

### 5.2 Managing Requests & Invites
1.  Navigate to the **Requests** or **Ride Offers** page.
2.  **Verify**: You see the "DRIVER INVITE" sent in step 4.3.
3.  Check the details:
    - **Price**: Does it match the Driver's proposed price?
    - **Driver Info**: Name, Car, Rating.
4.  **Action**: Click **Accept**.
5.  **Verify**: 
    - The request status changes to **Accepted**.
    - A new **Trip** is created.

---

## 6. Trip Lifecycle (Post-Match)
**Pre-requisite:** A match has been made (Client accepted Invite).

### 6.1 Trip Details (Client View)
1.  Navigate to **My Trips**.
2.  Click the active trip.
3.  **Verify**:
    - **Status**: "Active" or "Pending".
    - **Driver**: Correct driver details shown.
    - **Price**: Your specific agreed price is displayed.
    - **Map**: Shows the route.

### 6.2 Trip Details (Driver View)
1.  Switch to **Driver Mode**.
2.  Navigate to **My Trips**.
3.  Click the active trip.
4.  **Verify**:
    - **Passengers List**: Shows the accepted client.
    - **Earnings**: Shows the sum of accepted prices.
    - **Actions**: "Start Trip", "Complete Trip" buttons should be available (if applicable).

---

## 7. Edge Cases & Validation (Advanced Testing)
- **Map Boundaries**: Try creating routes with points very close or very far.
- **Form Validation**: Try submitting empty forms or invalid prices (e.g., negative numbers).
- **Concurrency**: 
    - Login as Driver A and Driver B.
    - Have both invite the same Client.
    - Client accepts Driver A.
    - **Verify**: Driver B's invite should be automatically invalid/rejected (if auto-reject logic is enabled).

---

## 8. Communication & Notifications
### 8.1 Chat
1.  Navigate to **Chat** (via `chat.tsx` or a specific trip).
2.  Select a conversation (active trip participant).
3.  Send a message.
4.  **Verify**: The message appears in the chat history.
5.  (Optional) Login as the recipient to verify receipt.

### 8.2 Notifications
1.  Navigate to **Notifications** (usually a Bell icon or Menu item).
2.  **Verify**: System notifications (e.g., "Request Accepted", "New Invite") appear here.
3.  Click a notification.
4.  **Verify**: It redirects to the relevant context (e.g., Trip Details).

---

## 9. Finance & Wallet
1.  Navigate to **Wallet** / **Finance** (via Profile or Menu).
2.  **Verify**:
    - **Current Balance**: Displays correctly.
    - **Transaction History**: Lists past trips and earnings/payments.
3.  (If applicable) Test "Top Up" or "Withdraw" buttons to ensure UI responsiveness (even if mock).


