Project Name : Detour
Project Domain : detour.ma
Project Description : An application that allow drivers to offer their repeated trajets to clients, in order to transport them to their destination in his way, in exchange for a monthly profit. and also offer a platform for clients to find drivers for their repeated trajets.
Project Type : Web&IOS&Android Application

Project Stack : 
- Frontend : React Native
- Backend : Node.js
- Database : MongoDB
- Map : expo maps
- Storage : Google Cloud Storage

[ Project instructions ] =======================================
the users of the app is (driver and client):

==> Driver :
- can see the client trajets

- add multiple cars (the first one is the default car, the user can change it)
-- car informations : places, marque, model, year, color ...

- affect car to another driver to work with it, the profits split is configurable by the owner

- configure his trajets : 
-- drawing the way on the map 🗺️ (set two points or more to define the way) using the map of leaflet.
-- setting the time start, ex : 08:00 🕐
-- setting the time arrival, ex : 09:00 🕐
-- setting the days of repeat, ex : [monday, tuesday and thursday]
-- setting the price (fix price or price per km)
-- select a car (owned car or affected car from another driver)

==> Client :
- can see the driver trajets
- configure his trajets: 
-- setting the point of start 📍
-- setting the point of arrival 📍
-- setting the time start or arrival, ex : 08:00 🕐
-- setting the days of repeat, ex : [monday, tuesday and thursday] 📅
-- setting the proposed price (show the price proposed by the driver) 💵

[ System ]============================================
- the system will make corrections on the trajets, in order to make the trajet more profitable for the driver.
- the system will choose the client's that can be included in the trajet, in order to make the trajet more profitable for the driver and the client. and also keep the maximum possible short distance for the all trajets.
- for best calculation system will shows the less driver trajets increase after including the client trajet.
- the system will show the client's the best driver projects that can be included in:
-- example : 
--- 🚗 Driver-point-start
--- 👨 Client(1)-point-start
--- 👩 Client(2)-point-start
--- 👨 Client(1)-point-arrival
--- 👩 Client(2)-point-arrival
--- 🚗 Driver-point-arrival

- show the Driver trajet with the proposed client trajet included in it.(place holder for the client trajet)

- send notification for the client when the driver accept the trajet.
- send notification for the driver when the client accept the trajet.
- send notification for the client when the driver out of house.

- start sound for the driver 5min before the trajet start.
- start sound for the client 5min before the driver arrive.

- show the realtime position of the driver and the client.
- show the distance and duration between the driver and the client.

- feedback system for the driver and the client.
- rating system for the driver and the client.
- reclamations system for the driver and the client.
- messages system for the driver and the client.

