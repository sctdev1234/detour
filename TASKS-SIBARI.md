

===========================================================


# Payments Logic
## Clients Payment
Online Payment:
- CashIn to full his Balance. ex : +20DH
use it for payments

Offline Payment:
- the client can pay the driver in cash then the driver should see the payment in his balance - [Deductions]
- the client will see his payment in his payments history page and it's status



## Driver Payment
Online Payment:
- CashIn to full his Balance. ex : +20DH
use it for the Company [Deductions]
- the driver will see the client payment in his payments history page and it's status


# Deductions
- 10% of the trip price goes to the [COMPANY] (minimum 2MAD for every place in the trip)


===========================================================


[ ] - allow the driver to be [EMERGENCY-DRIVER] in offtime like inDrive (earn extra money)
[ ] - allow the client to be [EMERGENCY-CLIENT] in offtime like inDrive (extra payment) 

# abonnement payment logic
- 10% of the trip price goes to the [COMPANY] (minimum 2MAD for every place in the trip)
- 90% of the trip price goes to the [DRIVER]
- the price is set by the driver

# features
- warn the client before the driver came to the place (before 10 minutes) 'your driver is about to arrive'
-- notification with map showing distance between the driver and the client
-- wake the client up if he is sleeping
-- ask the client if he wants to cancel the trip or if he changed the place today

- warn the driver before the trip starts (before 10 minutes) 'your repetetive trip is about to start'
-- notification with map showing the trip route

- if the client is offline when the driver arrives, the driver should wait for 5 minutes max
-- notify the client that the driver is waiting for him
-- show the driver the client's offline contacts info (phone number, name)
-- if the client is still offline, the trip should be cancelled and the driver should be paid for the distance he travelled


- if client cenceled the trip 2-3 consecutive days, find a new client for the driver imergencly and notify the driver about the new client

- if the driver cancelled the trip definetly, find a new driver for the client imergencly and notify the client about the new driver

# system
- force the driver to enable the gps before the trip starts 
- force the driver to confirm the trip before the trip starts 




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
- 10% of the trip price goes to the [COMPANY] (minimum 2MAD for every place in the trip)
- 90% of the trip price goes to the [DRIVER]
- the [DRIVER] get 2MAD credits Gift from the [COMPANY] after signing up (to try the service)
- the [DRIVER] can buy credits (to get more trips or keep renew trips subscription)
- if the [CLIENT] didn't pay the [DRIVER] monthly, the [DRIVER] should cancel the trip and the [CLIENT] should be banned
- if the [DRIVER] didn't show up for 3 consecutive days, the [DRIVER] should be banned and the [CLIENT] should be notified and find a new driver for the [CLIENT] imergencly

