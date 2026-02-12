Implement a mandatory onboarding flow in the Expo app where the **Tasks page becomes a blocking gate** after login or signup.

## 🎯 Core Behavior

1. After successful authentication:

   * Check if the user has completed required onboarding tasks.
   * If NOT completed:

     * Redirect to `/tasks`.
     * Block access to all other routes (home, profile, routes, etc.).
     * Hide or disable bottom tabs / navigation.
     * Prevent deep linking bypass.
   * If completed:

     * Redirect to `/`.
     * If no route exists → redirect to `/add-route`.

The Tasks page must behave like a required onboarding checkpoint.

---

## 👤 Role-Based Task Logic

### Client Tasks

Tasks checklist:

* [Optional] Add at least 2 places in `/places`
* [Optional] Visit and create a Route in `/add-route`

Rules:

* Adding places is skippable.
* Creating at least 1 route is required to unlock the app.
* If no route exists → redirect to `/add-route` when clicking task.
* When route is created → mark onboarding complete.

---

### 🚗 Driver Tasks

Tasks checklist:

* [Required] Upload all required documents
* [Required] Add a car OR receive a car from another driver
* [Required] Wait for admin approval
* [Optional] Create at least 1 route

Rules:

* Documents must be verified as uploaded.
* Car must exist OR assigned to driver.
* Admin approval must be `approved`.
* Only when all conditions are satisfied → unlock app.
* If no route exists → redirect to `/add-route` instade of `/`.

---

## 🧠 Implementation Requirements

* Add a computed field like `onboardingCompleted` (derived, not manual).
* Store onboarding progress in user state (backend-driven).
* Add route middleware / navigation guard:

  * If `!onboardingCompleted` → force `/tasks`
* Tasks page must:

  * Show dynamic checklist with real-time validation
  * Show completion progress bar
  * Disable manual skipping of required tasks
  * Auto-redirect to Home when completed
  * Show a stepper component that displays the onboarding steps step-by-step in a clear sequential flow

---

## 🛡 Edge Cases

* If driver loses approval → lock app again.
* If car is removed → lock app again.
* If route deleted and was required → lock again.
* Prevent navigation through deep links.
* Prevent bypass via tab navigation.

---

## 🎨 UX Improvements

* Make Tasks page visually clean and motivating.
* Show clear status indicators:

  * Pending
  * In Progress
  * Completed
* Add CTA buttons inside each task.
* Animate progress completion.
* Show success screen before redirecting to Home.
* After finishing the required tasks, display in the `Header` component the tasks that are still not done (if any remain optional).

---

## 🏗 Technical Suggestions (Expo + React Navigation)

* Use a root navigator switch:

  ```
  if (!user) → AuthStack
  if (user && !onboardingCompleted) → OnboardingStack
  if (user && onboardingCompleted) → MainAppStack
  ```
* Protect screens with a central guard hook like:
  `useOnboardingGuard()`

---

The final result should feel like a professional onboarding system similar to Uber, InDrive, or Airbnb — fully locked until completion, smooth transitions, no bypass possible.
