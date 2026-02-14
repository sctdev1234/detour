now we will change the logique of requests proccess and logic

currently (old system) :
- the driver create a route (with proposed price)
- the client create a route
- the system create a trip empty pending (0 client)
- the client see the "Proposed Drivers"
- the client send a request to the driver
- the driver accept or reject the request
- the client see the request status
- the driver see the request status
- if the driver accept the request the client is added to the trip
- if the driver reject the request the client can send a request again to the same driver again

now we want to change it to :
- the client create a route (with proposed price)
- the driver create a route
- the system create a trip empty pending (0 client)
- the driver see the "Proposed Clients"
- the driver send a request to the client (with proposed price)
- the client accept or reject the request
- if the client accept the request he will be added to the trip
- if the client reject the request, the driver will be notified and he can send a request again to the same client again with different price
