What doesn't work?

1. No sanity check for the data received from client-side.
2. No retry mechanism for database connection failure in the backend.


What works?
1. Server can handle multiple concurrent client connections.
2. Server-Client re-use socket connection.

Round Trip Latency Times:
=========================
Client-Seller:
1. Put Item                      ----
2. Change Sale Price             ----
3. Remove Item                   ----
4. Display Item for the seller   ----

Client-Buyer:
1. Search Items for Sale    ----     
2. Add item to cart         ----
3. Remove item from cart    ----
4. Clear cart               ----
5. Display cart             ----
