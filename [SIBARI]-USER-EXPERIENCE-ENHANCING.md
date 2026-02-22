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

# User Experience Success Example
- [Client1] create a route with 1 place [Casablanca to Rabat] and propose price 50DH
- [Client2] create a route with 1 place [Mohammedia to Tangier] and propose price 60DH
- [Client3] create a route with 2 places [Rabat to Kenitra] and propose price 30DH

- [Driver] create a route with 4 places [Casablanca to Tanger]
- [System] craete a trip empty pending (0 clients)

- [Driver] see the new clients routes
- [Driver] send a request to the [client1] route with proposed price 51DH
- [Driver] send a request to the [client2] route with proposed price 62DH
- [Driver] send a request to the [client3] route with proposed price 31DH

- [Client1] see the driver requests
- [Client1] accept the [Driver] request
- [System] add the [Client1] to the trip, change the status of the trip,
- [Client1] see in trips page: the status and the number of clients 1/4  in trip
- [Driver] see in trips page: the status and the number of clients 1/4  in trip

- [Client2] see the driver requests
- [Client2] accept the [Driver] request
- [System] add the [Client2] to the trip, change the status of the trip,
- [Client2] see in trips page: the status and the number of clients 2/4  in trip
- [Driver] see in trips page: the status and the number of clients 2/4  in trip

- [Client3] see the driver requests
- [Client3] accept the [Driver] request
- [System] add the [Client3] to the trip, change the status of the trip,
- [Client3] see in trips page: the status and the number of clients 4/4  in trip
- [Driver] see in trips page: the status and the number of clients 4/4  in trip 



## Trip Start (what ever the status of the trip is, it will be started if the number of clients is 1 or more)
- [System] Notify the driver 10 minutes before the trip starts
- [Driver] `confirm` that he is ready for the trip or `cancel` the trip (if he cancel the trip, the system will notify all the clients, and ask the driver why he cancelled the trip)
- [Driver] see the trip route on the map Fullscreen (can't see anything else but the map and the trip route progress) and all stops, [Clients] informations (phone number, name, and offline contacts info)
- [Driver] `confirm` the trip start or `cancel` the trip (if he cancel the trip, the system will notify all the clients, and ask the driver why he cancelled the trip)

- [System] Notify the [Clients] 10 minutes before the trip starts
- [Clients] `confirm` that ready for the trip or `cancel` the trip (if he cancel the trip, the system will notify the driver, and ask the client why he cancelled the trip)

## pick up client 1 from Casablanca
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

## pick up client 2 from Mohammedia
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

## drop off client 1 in Rabat
- [Driver] `confirm` that DropOff Point is done or `cancel` the DropOff (if he cancel the DropOff, the system will notify the client, and ask the driver why he cancelled the DropOff)
- [System] notify the [Client1] to `confirm` that he is DropedOff or not (if not, the system will notify the driver, and ask the driver why he didn't DropOff the client). and `rate` the [Driver] Arrived on time
- [System] notify the [Driver] that the [Client1] is DropedOff and rated him.

## pick up client 3 from Rabat
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

## drop off client 3 in Kenitra
- [Driver] `confirm` that DropOff [Client3] or not (if not, the system will notify the client, and ask the driver why he didn't DropOff the client).
- [System] notify the [Client3] to `confirm` that he is DropedOff or not (if not, the system will notify the driver, and ask the driver why he didn't DropOff the client). and `rate` the [Driver] Arrived on time
- [System] notify the [Driver] that the [Client3] is DropedOff and rated him.

## drop off client 2 in Tanger
- [Driver] `confirm` that DropOff [Client2] or not (if not, the system will notify the client, and ask the driver why he didn't DropOff the client).
- [System] notify the [Client2] to `confirm` that he is DropedOff or not (if not, the system will notify the driver, and ask the driver why he didn't DropOff the client). and `rate` the [Driver] Arrived on time
- [System] notify the [Driver] that the [Client2] is DropedOff and rated him.

## Driver Arrived to Tanger
- [Driver] Arrived to Tanger
- [System] notify the [Driver] that he Arrived to Tanger

## Finish Trip
- [Driver] `confirm` that Trip is finished or not (if not, ask the driver why he didn't finish the trip).
- [Driver] can access the application normally after the trip is finished.