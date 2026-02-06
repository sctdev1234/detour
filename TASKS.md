- user update image
- user update password
- trips management (the trip becomes trip if the places are great for both the client and the driver)
- coupon logic
- credits and withdraw money logic

# abonnement payment logic
- 10% of the trip price goes to the company
- 90% of the trip price goes to the driver
- minimum is 5 MAD for every place in the trip goes to the company
- the price is set by the driver

# features
- warn the client before the driver came to the place (10 minutes before) 'your driver is about to arrive'
-- notification with map showing distance between the driver and the client
-- wake the client up if he is sleeping
-- ask the client if he wants to cancel the trip or if he changed the place today

- warn the driver before the trip starts (10 minutes before) 'your repetetive trip is about to start'
-- notification with map showing the trip route

- if the client is offline when the driver arrives, the driver should wait for 5 minutes max
-- notify the client that the driver is waiting for him
-- show the driver the client's offline contacts info (phone number, name)
-- if the client is still offline, the trip should be cancelled and the driver should be paid for the distance he travelled


- if client cenceled the trip 2-3 consecutive days, find a new client for the driver imergencly and notify the driver about the new client

- if the driver cancelled the trip definetly, find a new driver for the client imergencly and notify the client about the new driver

# system
- force the driver to enable the gps before the trip starts (10 minutes before)
- force the driver to confirm the trip before the trip starts (10 minutes before)

# tasks page is the first thing to see after signup or login
- if the user complited the tasks, show him the home page
- if the user didn't complited the tasks, show him only the tasks page (no home page, no other pages)

- the client tasks are:
-- select Pickup Point and Destination Point and confirm them
-- select the days of the week he wants to use the service
-- select the time of the trip

- the driver tasks are:
-- select the days of the week he wants to use the service
-- select the time of the trip

# Notes
- the [CLIENT] can be late for 5min max ([DRIVER] should wait for him)
-- afetr 5 min the [DRIVER] become [EMERGENCY-DRIVER] and he "MUST" go to the nearest [EMERGENCY-CLIENT] shosed by the system (if there is no [EMERGENCY-CLIENT] the [DRIVER] go to his next point)
--- notify the [CLIENT] that the [DRIVER] is leaving
--- notify the [EMERGENCY-CLIENT] that the [EMERGENCY-DRIVER] is coming to him
-- the [EMERGENCY-DRIVER] can't refuse the [EMERGENCY-CLIENT]
-- the [EMERGENCY-DRIVER] still be [EMERGENCY-DRIVER] until he got the missed client or finish his route 

- the [DRIVER] can be late for 5min max ([CLIENT] should wait for him)
-- afetr 5 min the [CLIENT] become [EMERGENCY-CLIENT] and have right to get an [EMERGENCY-DRIVER] shosed by the system
--- notify the [DRIVER] that the [CLIENT] is leaving
--- notify the [EMERGENCY-CLIENT] that the [EMERGENCY-DRIVER] is coming to him
-- the [EMERGENCY-CLIENT] can't refuse the [EMERGENCY-DRIVER]

- the [CLIENT] must pay the [DRIVER] monthly (pay first day of the month)
- the [DRIVER] should get paid from the [CLIENT]'s monthly payment
- 10% of the trip price goes to the [COMPANY] and 90% of the trip price goes to the [DRIVER]
- minimum is 5 MAD for every place in the trip goes to the [COMPANY]
- the [DRIVER] get 5DH credits Gift from the [COMPANY] after signing up (to try the service)
- the [DRIVER] can buy credits (to get more trips or keep renew trips subscription)
- if the [CLIENT] didn't pay the [DRIVER] monthly, the [DRIVER] should cancel the trip and the [CLIENT] should be banned
- if the [DRIVER] didn't show up for 3 consecutive days, the [DRIVER] should be banned and the [CLIENT] should be notified and find a new driver for the [CLIENT] imergencly

-----------------------------------------------------
Admin Panel Tasks:
- make the pending aprovals clickable and show the details of the driver and approve or reject the driver
- make the active users clickable and show the details of the driver and ban the driver
- add places pages that show all the places thenfor the clients and the drivers
- abonnement management
- coupon management
- credits and withdraw money management