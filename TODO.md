[X] - When App Oppen force user to enable location.
[X] - CAR Image? AND DOCUMENTS (CIN, DRIVING LICENSE, CAR REGISTRATION) AND Face recognition for verification.
[ ] - The first car isobligatory default car
[X] - use mongodb
[X] - slide left and right to change the page

[ ] - when chose role Driver require one car at least. the continue
[ ] - Driver abonnement for ex : 10% of profit for each trajet (minimum 5 MAD for every place in the trip).

[ ] - history of driver payments
[ ] - history of driver cashout
[ ] - history of client payments

[ ] - currency logic

---------------------------------------------------------








currently there is a bigg misstake in the project, the "Trip" is not the same as the "Route" :
- the "Route" is an array of the places
- the Client and Driver can create a "Route"


-- the [Client]
--- see his Routes in app/routes page
--- see his Trips in app/trips page
--- create a "Route" in app/(client)/add-route by selecting only the places on the map of his repetitive trajet
--- after creating a "Route" the status is pending in database
--- show the [Client] the proposed [Drivers] for his "Route", and the trajet on map of everyone of them with all the trajets informations.
--- when the [Client] send a request to a [Driver]:
---- save the request in database
---- the [Driver] will see it in his app/(driver)/requests page
---- the [Driver] can accept or reject the request
---- the [Client] see the request status in his app/(client)/requests page
---- if the [Driver] accept the request:
------ the [Client] and [Driver] will see it in his app/trips page (status pending) and the full trajet on map with all the trajet informations.
------ when Trip is full, (the requested places are completed), the [Clients] and [Driver] will see it in his app/trips page (status completed) 


-- the [Driver]
--- see his Routes in app/routes page
--- see his Trips in app/trips page
--- create a "Route" in app/(driver)/add-route by selecting the informations of his repetitive trajet
---- rename app/(driver)/add-trip to app/(driver)/add-route
--- after creating a "Route" the status is pending in database
--- show the [Driver] the [Clients] that joined to his "Route", and the updated trajet on map with all the clients points and the driver points, with all the trajets informations.
--- the [DRIVER] can get infinite requests (not only the requested places) 
but can only the requested places in the trip. the system show him 3 shortest trips by selecting the closest [CLIENTS] to the [DRIVER]'s trip route.
--- when the Trip is full (requested clients), [Driver] can see it in his app/trips page (status pending) and the full trajets on map with all the trajets informations.
--- when the [DRIVER] accept the best proposed trip, then the trip will be (status active) and the [CLIENT] will see it in his app/trips page (status active) and the full trajet on map with all the trajet informations.

--- when Trip is full, (the requested places are completed), the [Clients] and [Driver] will see it in his app/trips page (status completed) 


- the [Client] can't create a "Trip", he can only create a "Route"
- the [Driver] can't create a "Trip", he can only create a "Route"
- the system will create an empty "Trip" when the [Driver] create a "Route"
