

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

# User Experience Infos
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

# User Experience Success
- [Driver] create a route

- [System] craete a trip empty pending (0 client)

- [Client1] create a route
- [Client1] see the nearest trips
- [Client1] send request to the best matching trip (based on the route) his decision

- [Client2] create a route
- [Client2] see the nearest trips
- [Client2] send request to the best matching trip (based on the route) his decision

- [Client3] create a route
- [Client3] see the nearest trips
- [Client3] send request to the best matching trip (based on the route) his decision

- [Driver] see the new clients requests

- [Driver] accept the [client1] request 
- [System] add the [client1] to the trip, change the status of the trip,
- [Driver] see in trips page: the status and the number of clients 1/4  in trip 

- [Driver] accept the [client2] request 
- [System] add the [client2] to the trip, change the status of the trip,
- [Driver] see in trips page: the status and the number of clients 2/4  in trip 

- [Driver] accept the [client3] request 
- [System] add the [client3] to the trip, change the status of the trip,
- [Driver] see in trips page: the status and the number of clients 4/4  in trip 

- [System] Notify the driver 10 minutes before the trip starts
- [Driver] see the trip route on the map and all stops, [Clients] informations (phone number, name, and offline contacts info)
- [Driver] confirm the trip start

- [System] Notify the [Clients] 10 minutes before the trip starts
- [Clients] confirm that ready for the trip

## pick up client 1 from Casablanca
- [System] Notify the [Client1] 1Klm before the [Driver] Comes
- [Client1] confirm that he is on position waiting for the [Driver]
- [Client1] see the trip route on the map and all stops (with distance and time), and [Driver]'s informations (phone number, name, and offline contacts info), and see [Driver]'s current location
- [Driver] see the response of the [Client1] and his status (accepted or not), and his (online or offline), and if he has enough balance to pay the trip price.
- [Driver] Arrived to PickUp [Client1]
- [Driver] confirm that PickUp Point is done 
- [System] notify the [Client1] that [System] Deducted the money from his balance.
- [System] notify the [Driver] that [System] he received the money from the [Client1].
- [System] notify the [Client1] to confirm that he is PickedUp. and rating the [Driver] Arrived on time
- [System] notify the [Driver] that the [Client1] is PickedUp and rated him.

## pick up client 2 from Mohammedia
- [System] Notify the [Client2] 1Klm before the [Driver] Comes
- [Client2] confirm that he is on position waiting for the [Driver]
- [Client2] see the trip route on the map and all stops (with distance and time), and [Driver]'s informations (phone number, name, and offline contacts info), and see [Driver]'s current location
- [Driver] see the response of the [Client2] and his status (accepted or not), and his (online or offline), and if he has enough balance to pay the trip price. 
- [Driver] Arrived to PickUp [Client2]
- [Driver] confirm that PickUp Point is done 
- [System] notify the [Client2] that [System] Deducted the money from his balance.
- [System] notify the [Driver] that [System] he received the money from the [Client2].
- [System] notify the [Client2] to confirm that he is PickedUp. and rating the [Driver] Arrived on time
- [System] notify the [Driver] that the [Client2] is PickedUp and rated him.

## drop off client 1 in Rabat
- [Driver] DropOff [Client1]
- [System] notify the [Client1] to confirm that he is DropedOff. and rating the [Driver] Arrived on time
- [System] notify the [Driver] that the [Client1] is DropedOff and rated him.

## pick up client 3 from Rabat
- [System] Notify the [Client3] 1Klm before the [Driver] Comes
- [Client3] confirm that he is on position waiting for the [Driver]
- [Client3] see the trip route on the map and all stops (with distance and time), and [Driver]'s informations (phone number, name, and offline contacts info), and see [Driver]'s current location
- [Driver] see the response of the [Client3] and his status (accepted or not), and his (online or offline), and if he has enough balance to pay the trip price. 
- [Driver] Arrived to PickUp [Client3]
- [Driver] confirm that PickUp Point is done 
- [System] notify the [Client3] that [System] Deducted the money from his balance.
- [System] notify the [Driver] that [System] he received the money from the [Client3].
- [System] notify the [Client3] to confirm that he is PickedUp. and rating the [Driver] Arrived on time
- [System] notify the [Driver] that the [Client3] is PickedUp and rated him.

## drop off client 3 in Kenitra
- [Driver] DropOff [Client3]
- [System] notify the [Client3] to confirm that he is DropedOff. and rating the [Driver] Arrived on time
- [System] notify the [Driver] that the [Client3] is DropedOff and rated him.

## drop off client 2 in Tanger
- [Driver] DropOff [Client2]
- [System] notify the [Client2] to confirm that he is DropedOff. and rating the [Driver] Arrived on time
- [System] notify the [Driver] that the [Client2] is DropedOff and rated him.

## Driver Arrived to Tanger
- [Driver] Arrived to Tanger
- [System] notify the [Driver] that he Arrived to Tanger


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

