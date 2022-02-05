What doesn't work?

1. No sanity check for the data received from client-side.
2. No retry mechanism for database connection failure in the backend.


What works?
1. Server can handle multiple concurrent client connections.
2. Server-Client re-use socket connection.

Round Trip Latency Times:
=========================
Client-Seller:
1. Put Item                      ---- 9ms | 6ms | 6ms
2. Change Sale Price             ---- 11ms | 3ms | 7ms
3. Remove Item                   ---- 10ms | 6ms 
4. Display Item for the seller   ---- 7ms | 9ms | 8ms

Client-Buyer:
1. Search Items for Sale    ----  12ms | 9ms | 7ms
2. Add item to cart         ----  2ms | 1ms | 3ms
3. Remove item from cart    ----  2ms | 2ms | 1ms
4. Clear cart               ----  2ms | 3ms | 4ms
5. Display cart             ----  6ms | 7ms | 8ms

System Design:
==============
We have set up server-side sellers, server-side buyers, client-side sellers, and client-side buyers. 
Server-side seller stores all the items in MongoDB with an in-memory cache for storing item id per seller. 
The in-memory item id cache is used to fetch items' info from MongoDB for a particular seller. 
When an item quantity is reduced to 0, it's deleted from both in-memory cache and mongodb.

Furthermore, each new connection between client and server means a new buyer client or a new seller client is seen.  
