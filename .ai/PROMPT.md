# PROJECT STRUCTURE

## PROJECT INFORMATION
- **Project Name**: Detour
- **Project Domain**: Detour.ma
- **Project Languages**: English, French, Arabic ... (Default: English) use i18n for language management, and the user can switch between languages in the settings, the admin panel can edit the languages and translate the app to any language.
- **Project Currency**: MAD (Moroccan Dirham).
- **Project Description**: Detour.ma is a ride-hailing platform that allows users to find drivers and book rides with them.
It also allows drivers to list their repeated trips with clients, transporting them to their destinations on their way, in exchange for a monthly fee.
The app also provides a platform for clients to search for drivers for their repeated trips.
- **Project Version**: 1.0.0
- **Project Type**: Web&IOS&Android Application
- **Project Payment Methods**: Cash, Stripe, PayPal, Bank Transfer.
- **Project Requirements**: 
  - Backend: Socket, MongoDB, JWT, Google Cloud Storage, 
  - Frontend: Socket, Expo, React Native, TailwindCSS, React Navigation, Redux Toolkit,
  - Admin-Panel: Socket, Vite, React, TailwindCSS.
- **Project Maps**: 
  - Frontend: expo maps in ios and android, leaflet in web
  - Admin-Panel: leaflet
- **Project Prompt**: 
  - [.ai/PROMPT.md](.ai/PROMPT.md)
  - [.ai/[SIBARI]-ENHANCE-PROMPT.md](.ai/[SIBARI]-ENHANCE-PROMPT.md)
- **Project Features**: 
  - direct negotiation of price between [Client] and [Driver]
  - 10% of profit driver profits goes to [Detour.ma] (minimum 2MAD for every place in every trip).
  - on create account driver must upload his documents and wait for admin approval.
  - on user finish tasks got 20MAD credits Gift from the [Detour.ma] (to try the service).
  - force the driver gps to be enabled while the trip is started and not finished yet.
  - wake up the client and driver whatever they are offline or online (notification, vibrate and sound).
  - feedback system for the driver and the client.
  - rating system for the driver and the client.
  - reclamations system for the driver and the client.
  - messages system for the driver and the client.
  


## BACKEND
- **CRUD's (Models)**:
  - `Users`: User profiles and authentication.
  - `Roles`: (Implicit in Users/Logic).
  - `Cars`: Vehicle information for drivers.
  - `Chats`: Messaging system.
  - `Coupons`: Discount management.
  - `Requests`: (User type Driver send request to admin for approve).
  - `Notifications`: In-app alerts.
  - `Places`: Public locations/points of interest.
  - `Reclamations`: User disputes and issues.
  - `Routes`: Geographic routes and paths.
  - `Subscriptions`: User tiers/plans.
  - `Transactions`: Financial logs money in/out (Deposit, Withdrawal, Trip payment, Subscription payment, Coupon payment, Commission payment, Refund payment, Penalty payment ...).
  - `Trips`: Active trip execution, including client statuses and ratings.
  - `Ratings`: (Implicit in Users/Logic).
  - `Reviews`: (Implicit in Users/Logic).

- **Logic Layers**:
  - `Middleware`: Auth (JWT), Validation (Joi)
  - `Cron`: Scheduled tasks (Trip status notifications).
  - `Tracking`: Real-time driver location updates.

## ADMIN-PANEL
- **Pages**:
  - `DashboardHome`: Overview and statistics.
  - `Users`: User management.
  - `Roles`: Role management.
  - `Permissions`: Permission management.
  - `Pages`: Page management.
  - `Cars`: Car management.
  - `Chats`: Chat management.
  - `Coupons`: Coupon management.
  - `Requests`: Request management.
  - `Notifications`: Notification management.
  - `Places`: Place management.
  - `Reclamations`: Reclamation management.
  - `Routes`: Route management.
  - `Subscriptions`: Subscription management.
  - `Transactions`: Transaction management.
  - `Trips`: Trip monitoring and map visualization.
  - `Ratings`: Rating management.
  - `Reviews`: Review management.
  - `Settings`: Settings screen.
  - `Terms-And-Conditions`: Terms and Conditions screen.
  - `Privacy-Policy`: Privacy Policy screen.
  - `Contact-Us`: Contact Us screen.
  - `About-Us`: About Us screen.
  - `Help`: Help screen.
  - `FAQ`: FAQ screen.
  - `Edit-Profile`: Edit Profile screen.
  - `Change-Password`: Change Password screen.
  - `Delete-Account`: Delete Account screen.
  - `Profile`: Profile screen.

## FRONTEND
- **App Structure**:
  - `(onboarding)`: Onboarding screens (use nanobanana for images and animation).

  - `(auth)`: Login, Register, Forgot Password flows.
  - `(auth)/login`: Login screen.
  - `(auth)/register`: Register screen.
  - `(auth)/forgot-password`: Forgot Password screen.
  - `(auth)/reset-password`: Reset Password screen.
  - `(tasks)`: Tasks screens. 
    - Driver tasks ex: 
      - allow to edit system GPS location status
      - default car required
      - documents verification required
      - places optional
      - routes optional
      - ...
    - Client tasks ex: 
      - places optional
      - routes optional
      - ...
  
  - `(client)`: Main Client screens 
    - Header : Profile infos in left and menu icon in right, 
    - FullScreen Map (notifications and chat and find trips icons in top right corner vertically)
  
  - `(driver)`: Main Driver screens 
    - Header : Profile infos in left and menu icon in right, 
    - FullScreen Map (notifications and chat and find trips icons in top right corner vertically)
  
  - `(driver)/find-clients`: Find clients screen.
  - `(driver)/cars`: Cars screen.
  - `(driver)/cars/add`: Add Car screen.
  - `(driver)/cars/edit`: Edit Car screen.
  - `(driver)/verification`: Documents Verification screen : 
    - CIN(Front & Back), 
    - Driving License(Front & Back), 
    - Car Registration, 
    - Face Live Selfie.

  - `/chat`: Chat screen.
  - `/coupons`: Coupons screen.
  - `/subscrip`: Subscriptions screen.
  - `/places`: Places screen.
  - `/places/add`: Add Place screen.
  - `/places/edit`: Edit Place screen.
  - `/requests`: Requests screen.
  - `/reclamations`: Reclamations screen.
  - `/reclamations/add`: Add Reclamation screen.
  - `/notifications`: Notifications screen.
  - `/transactions`: Transactions screen.
  - `/ratings`: Ratings screen.
  - `/reviews`: Reviews screen.
  - `/routes`: Routes screen.
  - `/routes/add`: Add Route screen 
    - route points (start and end points).
    - route time start.
    - route time end (for driver only) (optional) use it to know if the driver can send requests to new clients or he will be late.
    - route days of repeat.
    - route price (for driver only) fix price or price per km.
    - route car (for driver only) owned car or affected car from another driver.
  - `/routes/edit`: Edit Route screen.
  - `/trips`: Trips screen.
  - `/dashboard`: Dashboard screen.
  
  - `/terms-and-conditions`: Terms and Conditions screen.
  - `/privacy-policy`: Privacy Policy screen.
  - `/contact-us`: Contact Us screen.
  - `/about-us`: About Us screen.
  - `/help`: Help screen.
  - `/faq`: FAQ screen.

  - `/edit-profile`: Edit Profile screen.
  - `/change-password`: Change Password screen.
  - `/delete-account`: Delete Account screen.


  - `/profile`: Profile screen 
    - user info, 

    - my wallet, 
    - my trips, 
    - my cars (for driver), 
    - my requests, 
    - my notifications, 
    - my transactions, 
    - my ratings, 
    - my reviews, 
    - my routes, 
    - my subscriptions, 
    - my coupons, 
    - my reclamations,

    - terms and conditions, 
    - privacy policy, 
    - contact us, 
    - about us, 
    - help, 
    - faq, 

    - edit profile, 
    - Switch to driver/client mode, 
    - change password, 
    - logout, 
    - delete account

- **Driver Main (Trip Execution Screen)**
  - Page: 
    - Map (full screen)
    - Current Trip Route infos (Live status, current step, next step, distance, time, price, clients infos)
    - Current Real-time Driver Location
    - show the distance and duration between the driver and next client
    - Actions Button (bottom center)
  - Actions: 
    - confirm or cancel 10min before the trip start (notify all clients: the driver is preparing to start the trip)
    - confirm or cancel start trip (notify all clients: the driver has started the trip)
    - confirm or cancel pickup client (notify the client: the driver has picked you up)
    - confirm or cancel dropoff client (notify the client: the driver has dropped you off)
    - confirm or cancel end trip.

- **Client Main (Trip Execution Screen)**
  - Page: 
    - Map (full screen)
    - Current Trip Route infos (Live status, current step, next step, distance, time, price, driver infos)
    - Current Real-time Driver Location
    - show the distance and duration between the client and the driver
    - Actions Button (bottom center)
  - Actions: 
    - confirm or cancel 10min before the Driver arrive (notify driver: the client is preparing to start the trip)
    - confirm or cancel pickedup (notify driver: the client confirmed that he has been picked up)
    - confirm or cancel dropedoff (notify driver: the client confirmed that he has been dropped off)

## User Experience Example Infos
- [Driver] go from [Casablanca to Tanger] every day [5 days a week] [06:00 AM - 08:30 AM] want [4 places]
- [Client1] want to go from [Casablanca to Rabat] every day [5 days a week] [06:00 AM - 07:00 AM] want [1 place]
- [Client2] want to go from [Mohammedia to Tangier] every day [5 days a week] [06:30 AM - 08:30 AM] want [1 place]
- [Client3] want to go from [Rabat to Kenitra] every day [5 days a week] [07:00 AM - 07:40 AM] want [2 places]

- so the trip steps is:
[Driver start (Casablanca)] 
-> [Client1 start (Casablanca)] 
-> [Client2 start (Mohammedia)] 
-> [Client1 end (Rabat)] 
-> [Client3 start (Rabat)] 
-> [Client3 end (Kenitra)] 
-> [Client2 end (Tangier)] 
-> [Driver end (Tanger)]

## User Experience Success Example
- [Client1] create a route with 1 place [Casablanca to Rabat] and propose price 50DH (route status 'pending')
- [Client2] create a route with 1 place [Mohammedia to Tangier] and propose price 60DH (route status 'pending')
- [Client3] create a route with 2 places [Rabat to Kenitra] and propose price 30DH (route status 'pending')

- [Driver] create a route with 4 places [Casablanca to Tanger] with default Car.
- [System] craete a trip empty pending (0 clients)

- [Driver] see the clients routes (with proposed price) sorted by the routes that will make the less increase of the driver route and the less increase of the time and the higher price.
- [Driver] send a request to the [client1] route with proposed price 51DH
- [Driver] send a request to the [client2] route with proposed price 62DH
- [Driver] send a request to the [client3] route with proposed price 31DH

- [Client1] see the [Driver] requests
- [Client1] accept the [Driver] request (route status change to 'active')
- [System] add the [Client1] to the trip, change the status of the trip to 1/4
- [Client1] see in trips page: the status and the number of clients 1/4 in trip
- [Driver] see in trips page: the status and the number of clients 1/4 in trip

- [Client2] see the [Driver] requests
- [Client2] accept the [Driver] request (route status change to 'active')
- [System] add the [Client2] to the trip, change the status of the trip to 2/4,
- [Client2] see in trips page: the status and the number of clients 2/4 in trip
- [Driver] see in trips page: the status and the number of clients 2/4 in trip

- [Client3] see the [Driver] requests
- [Client3] accept the [Driver] request (route status change to 'active')
- [System] add the [Client3] to the trip, change the status of the trip to 4/4,
- [Client3] see in trips page: the status and the number of clients 4/4 in trip
- [Driver] see in trips page: the status and the number of clients 4/4 in trip 



**Trip Start (what ever the status of the trip is, it will be started if the number of clients is 1 or more)**
- [System] Notify the [Driver] and [Clients] 10 minutes before the trip starts
- [Driver] `confirm` that he is ready for the trip or `cancel` the trip (if he cancel the trip, the system will notify all the clients, and ask the driver why he cancelled the trip)
- [Driver] see the trip route on the map Fullscreen (can't see anything else but the map and the trip route progress) and all stops, [Clients] informations (phone number, name, and offline contacts info)
- [Driver] `confirm` the trip start or `cancel` the trip (if he cancel the trip, the system will notify all the clients, and ask the driver why he cancelled the trip)

- [Clients] `confirm` that ready for the trip or `cancel` the trip (if he cancel the trip, the system will notify the driver, and ask the client why he cancelled the trip)

**pick up client 1 from Casablanca**
- [System] Notify the [Client1] 1Klm before the [Driver] Comes
- [Client1] `confirm` that he is on position waiting for the [Driver] or `cancel` the trip (if he cancel the trip, the system will notify the driver, and ask the client why he cancelled the trip)
- [Client1] see the trip route on the map and all stops (with distance and time), and [Driver]'s informations (phone number, name, and offline contacts info), and see [Driver]'s current location
- [Driver] see the response of the [Client1] and his status (accepted or not), and his (online or offline), and if he has enough balance to pay the trip price.
- [Driver] Arrived to PickUp [Client1]
- [Driver] `confirm` that PickUp Point is done or `cancel` the PickUp (if he cancel the PickUp, the system will notify the client, and ask the driver why he cancelled the PickUp)
- [System] notify the [Client1] that [System] Deducted the money from his balance.
- [System] notify the [Driver] that [System] he received the money from the [Client1].
- [System] notify the [Client1] to `confirm` that he is PickedUp or not (if not, the system will notify the driver, and ask the driver why he didn't PickUp the client). and `rate` the [Driver] Arrived on time
- [System] notify the [Driver] that the [Client1] is PickedUp and rated him.

**pick up client 2 from Mohammedia**
- [System] Notify the [Client2] 1Klm before the [Driver] Comes
- [Client2] `confirm` that he is on position waiting for the [Driver] or `cancel` the trip (if he cancel the trip, the system will notify the driver, and ask the client why he cancelled the trip)
- [Client2] see the trip route on the map and all stops (with distance and time), and [Driver]'s informations (phone number, name, and offline contacts info), and see [Driver]'s current location
- [Driver] see the response of the [Client2] and his status (accepted or not), and his (online or offline), and if he has enough balance to pay the trip price. 
- [Driver] Arrived to PickUp [Client2]
- [Driver] `confirm` that PickUp Point is done or `cancel` the PickUp (if he cancel the PickUp, the system will notify the client, and ask the driver why he cancelled the PickUp)
- [System] notify the [Client2] that [System] Deducted the money from his balance.
- [System] notify the [Driver] that [System] he received the money from the [Client2].
- [System] notify the [Client2] to `confirm` that he is PickedUp or not (if not, the system will notify the driver, and ask the driver why he didn't PickUp the client). and `rate` the [Driver] Arrived on time
- [System] notify the [Driver] that the [Client2] is PickedUp and rated him.

**drop off client 1 in Rabat**
- [Driver] `confirm` that DropOff Point is done or `cancel` the DropOff (if he cancel the DropOff, the system will notify the client, and ask the driver why he cancelled the DropOff)
- [System] notify the [Client1] to `confirm` that he is DropedOff or not (if not, the system will notify the driver, and ask the driver why he didn't DropOff the client). and `rate` the [Driver] Arrived on time
- [System] notify the [Driver] that the [Client1] is DropedOff and rated him.

**pick up client 3 from Rabat**
- [System] Notify the [Client3] 1Klm before the [Driver] Comes
- [Client3] `confirm` that he is on position waiting for the [Driver] or `cancel` the trip (if he cancel the trip, the system will notify the driver, and ask the client why he cancelled the trip)
- [Client3] see the trip route on the map and all stops (with distance and time), and [Driver]'s informations (phone number, name, and offline contacts info), and see [Driver]'s current location
- [Driver] see the response of the [Client3] and his status (accepted or not), and his (online or offline), and if he has enough balance to pay the trip price. 
- [Driver] Arrived to PickUp [Client3]
- [Driver] `confirm` that PickUp Point is done or `cancel` the PickUp (if he cancel the PickUp, the system will notify the client, and ask the driver why he cancelled the PickUp)
- [System] notify the [Client3] that [System] Deducted the money from his balance.
- [System] notify the [Driver] that [System] he received the money from the [Client3].
- [System] notify the [Client3] to `confirm` that he is PickedUp or not (if not, the system will notify the driver, and ask the driver why he didn't PickUp the client). and `rate` the [Driver] Arrived on time
- [System] notify the [Driver] that the [Client3] is PickedUp and rated him.

**drop off client 3 in Kenitra**
- [Driver] `confirm` that DropOff [Client3] or not (if not, the system will notify the client, and ask the driver why he didn't DropOff the client).
- [System] notify the [Client3] to `confirm` that he is DropedOff or not (if not, the system will notify the driver, and ask the driver why he didn't DropOff the client). and `rate` the [Driver] Arrived on time
- [System] notify the [Driver] that the [Client3] is DropedOff and rated him.

**drop off client 2 in Tanger**
- [Driver] `confirm` that DropOff [Client2] or not (if not, the system will notify the client, and ask the driver why he didn't DropOff the client).
- [System] notify the [Client2] to `confirm` that he is DropedOff or not (if not, the system will notify the driver, and ask the driver why he didn't DropOff the client). and `rate` the [Driver] Arrived on time
- [System] notify the [Driver] that the [Client2] is DropedOff and rated him.

**Driver Arrived to Tanger**
- [Driver] Arrived to Tanger
- [System] notify the [Driver] that he Arrived to Tanger

**Finish Trip**
- [Driver] `confirm` that Trip is finished or not (if not, ask the driver why he didn't finish the trip).
- [Driver] can access the application normally after the trip is finished.


# Notes
- the [Driver] can't start the trip if the GPS location status is disabled.
- the [Client] can't cancel the trip after the [Driver] has confirmed the trip.
- if [Client] cenceled the trip 3 consecutive days, allow the [Driver] to find a new client.
- if [Driver] cenceled the trip 3 times at month, then cancel the trip definetly.
- if trip is cancelled definetly, notify the [Clients], and make thear routes status 'pending' to receive requests from other drivers.
- if the [Client] is offline when the [Driver] arrives, the [Driver] should wait for 5 minutes max
  - notify the [Client] that the [Driver] is waiting for him
  - show the [Driver]: the offline contacts info of the [Client] (phone number, name)
  - if the [Client] is still offline, the trip should be cancelled and the [Driver] should be paid for the distance he travelled
- 10 minutes after the trip start if the [Driver] didn't confirm that he is ready and started the trip, the trip should be cancelled, and find a new [Driver] for the [Clients].
- if a trip is cancelled:
  - notify the [Driver] that the trip is cancelled
  - the [Driver] lost his [Clients]
  - the [Driver] trip status should be 'cancelled'
  - the [Driver] route status should be 'pending' to find a new clients for his trip
  - notify the [Clients] that the trip is cancelled
  - the [Clients] trip status should be 'cancelled'
  - the [Clients] route status should be 'pending' to receive requests from other drivers
- the [Driver] should be payed when he picked up the client.
- the [Client] can't create a "Trip", he can only create a "Route"
- the [Driver] can't create a "Trip", he can only create a "Route"
- the system will create an empty "Trip" when the [Driver] create a "Route"
  